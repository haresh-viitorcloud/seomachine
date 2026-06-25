/**
 * Featured image service.
 *
 * Priority chain:
 *   1. Pollinations.ai — free AI image generation (Flux model), NO API key needed
 *   2. Pexels          — if PEXELS_API_KEY set
 *   3. Unsplash        — if UNSPLASH_ACCESS_KEY set
 *   4. SVG gradient    — always works, zero-dep fallback
 *
 * After any source succeeds, the blog logo is composited top-left. By default it
 * sits on a dark navy semi-transparent rounded backing so logos are readable on
 * any background. ViitorCloud opts out of the backing — its white logo is given a
 * soft drop shadow instead so it integrates into the image naturally.
 *
 * Output dimensions are per-blog (see imageSpecForBlog): ViitorCloud renders at
 * 1520×1008, every other blog at 1200×630. WebP, kept under 100KB.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');

// Seomachine repo root — context_path values in DB are relative to this, not to app/
// e.g. "./blogs/vc/context" resolves to /var/www/seomachine/blogs/vc/context
const APP_DIR = path.join(__dirname, '../../..');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Download an image from any URL and return as Buffer.
 * Follows one redirect. Returns null on failure.
 */
function downloadImage(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : require('http');
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(downloadImage(res.headers.location, timeoutMs));
      }
      if (res.statusCode !== 200) return resolve(null);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

/**
 * Resolve the logo file for a blog from its context_path.
 * Checks for logo.svg, logo.png, logo.webp, logo.jpg in order.
 * Returns the absolute path, or null if not found.
 *
 * Convention for adding a new blog brand:
 *   1. Create blogs/<slug>/context/logo.svg  (SVG preferred — scales without quality loss)
 *   2. Set BLOG_<SLUG>_CONTEXT_PATH=../blogs/<slug>/context in app/.env
 *
 * The logo is composited top-left on every generated featured image (see compositeLogoOnImage).
 * If no logo file is found the image is published without a logo — no error is thrown.
 */
function resolveLogoPath(blog) {
  if (!blog || !blog.context_path) return null;
  const contextDir = path.resolve(APP_DIR, blog.context_path);
  for (const ext of ['svg', 'png', 'webp', 'jpg']) {
    const candidate = path.join(contextDir, `logo.${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Per-blog featured-image spec.
 *   - ViitorCloud uses a 1520×1008 canvas (its theme's featured-image slot expects
 *     that size; delivering the standard 1200×630 made the theme stretch the image).
 *     Its all-white logo also opts OUT of the dark navy backing — a soft drop shadow
 *     is used instead so the logo integrates naturally.
 *   - Every other blog keeps the standard 1200×630 + navy logo backing.
 *
 * VC is detected by slug, with context_path / name fallbacks so it still resolves
 * if a caller passes a partial blog object.
 */
function imageSpecForBlog(blog = {}) {
  const slug = String(blog.slug || '').toLowerCase();
  const ctx  = String(blog.context_path || '').toLowerCase().replace(/\\/g, '/');
  const name = String(blog.name || '').toLowerCase();
  const isVc = slug === 'vc'
    || /\/blogs\/vc(\/|$)/.test(ctx)
    || name.includes('viitorcloud');
  // Brands whose logo integrates naturally (no dark backing pill — a soft drop
  // shadow keeps it legible on the bright hero images). VC + EveryCRED + EveryTicket.
  const naturalLogo = isVc
    || slug === 'everycred'   || /\/blogs\/everycred(\/|$)/.test(ctx)   || name.includes('everycred')
    || slug === 'everyticket' || /\/blogs\/everyticket(\/|$)/.test(ctx) || name.includes('everyticket');
  // LaraCopilot uses a flat-design marketing BANNER (headline + checklist card + real
  // logo) instead of the photoreal hero. Generated via OpenAI gpt-image-1; the real
  // logo.svg is overlaid afterward (the prompt forbids an AI-drawn logo).
  const isLc = slug === 'lc' || slug === 'laracopilot'
    || /\/blogs\/laracopilot(\/|$)/.test(ctx) || name.includes('laracopilot');
  return isVc
    ? { width: 1520, height: 1008, logoBacking: false,        bright: true,  preferStock: false, banner: false }
    : { width: 1200, height: 630,  logoBacking: !naturalLogo, bright: false, preferStock: false, banner: isLc };
}

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source 1 — Pollinations.ai (free AI image generation, no API key required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a photorealistic blog featured image using Pollinations.ai.
 *
 * Pollinations.ai is a free, no-API-key AI image generation service using the
 * Flux model (comparable quality to Midjourney/DALL-E 3). Simply GET a URL with
 * the encoded prompt — no auth, no billing, no setup.
 *
 * Endpoint: https://image.pollinations.ai/prompt/{encoded_prompt}?width=W&height=H&nologo=true&model=flux
 *
 * Returns a width×height WebP Buffer under 100KB, or null on failure.
 *
 * @param {string} imagePrompt - subject description from Claude
 * @param {object} [opts]
 * @param {number} [opts.width=1200]
 * @param {number} [opts.height=630]
 * @param {boolean} [opts.bright=false] - use a bright/airy style + brightness lift
 *   (ViitorCloud) instead of the default dark-cinematic aesthetic.
 */
async function fetchPollinationsImage(imagePrompt, opts = {}) {
  const { width = 1200, height = 630, bright = false } = opts;
  try {
    const topic = (imagePrompt || 'professional technology concept').substring(0, 800);

    // Build a style-augmented prompt: preserve the subject from Claude's image_prompt
    // and append style directives. ViitorCloud uses a bright, clean, airy aesthetic;
    // all other blogs keep the dark-cinematic look.
    const styleDirectives = bright
      ? [
          'ultra clean high-end commercial photograph, crisp razor-sharp focus, high resolution, immaculate detail',
          'real people, modern professionals interacting naturally with confident genuine expressions',
          'accurate realistic human anatomy, natural hands with exactly five fingers per hand holding objects correctly',
          'bright pristine modern environment relevant to the topic (upscale retail or tech office), polished and spotless',
          'professional studio-quality lighting, photorealistic with a clean polished 3D commercial render quality',
          'subtle futuristic glowing soft-blue holographic interface accents, tasteful high-tech atmosphere',
          'vivid yet natural colours, gentle depth of field, sharp and clear',
          'upper left area bright and uncluttered for logo placement',
          'not cartoonish, not blurry, not soft, not low quality, not distorted',
          'no deformed hands, no extra fingers, no extra hands, no extra arms, no extra limbs',
          'no text no words no letters no labels no numbers no watermark no UI text',
        ]
      : [
          'dark cinematic 3D digital illustration',
          'deep navy blue background',
          'dramatic teal electric blue accent lighting',
          'glowing holographic elements',
          'photorealistic render quality',
          'cinematic depth of field',
          'upper left corner visually calm',
          'no text no words no letters no labels',
        ];
    // ViitorCloud: append the requested instruction immediately after Claude's
    // content-derived subject, then the style/no-text directives (the trailing
    // "no text" directive reinforces "Do not add text into it" so the size numbers
    // in the instruction don't get rendered as on-image text).
    const VC_INSTRUCTION = 'based on the blog content, create an image of size 1520 x 1008. Do not add text into it';
    const promptParts = bright
      ? [topic, VC_INSTRUCTION, ...styleDirectives]
      : [topic, ...styleDirectives];
    const fullPrompt = promptParts.join(', ');

    const encoded = encodeURIComponent(fullPrompt);
    // seed makes each article get a unique image; nologo removes Pollinations watermark
    const seed = Math.floor(Math.random() * 9999999);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`;

    console.log('[ImageService] Pollinations.ai generating image (Flux)...');
    const rawBuffer = await downloadImage(url, 90000);  // up to 90s for generation
    if (!rawBuffer || rawBuffer.length < 20000) {
      console.warn('[ImageService] Pollinations returned empty/tiny response');
      return null;
    }

    const sharp = require('sharp');
    // Pollinations' free tier caps output resolution (~0.6 MP), so it returns a
    // smaller image at the requested ASPECT (e.g. 943×625 for a 1520×1008 request).
    // Upscale to the exact target with a high-quality kernel + light sharpening so
    // the result stays crisp (soft upscales read as "stretched"). Aspect is
    // preserved by `cover`, so there is no geometric distortion.
    let pipeline = sharp(rawBuffer)
      .resize(width, height, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 });
    if (bright) pipeline = pipeline.modulate({ brightness: 1.06, saturation: 1.04 });
    // Sharper for the "clean/clear" look the brand wants (counters free-tier upscale softness)
    pipeline = pipeline.sharpen({ sigma: bright ? 1.3 : 1 });
    let buffer = await pipeline.webp({ quality: 82 }).toBuffer();

    if (buffer.length > 100 * 1024) {
      buffer = await sharp(buffer).webp({ quality: 60 }).toBuffer();
    }

    console.log(`[ImageService] Pollinations image: ${buffer.length} bytes`);
    return buffer;

  } catch (err) {
    console.warn('[ImageService] Pollinations image gen failed:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Source 2 — Pexels
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a relevant photo using the Pexels API (free, 200 req/hour).
 * Requires PEXELS_API_KEY in .env — get one free at https://www.pexels.com/api/
 * Returns a Buffer or null.
 */
async function fetchPexelsPhoto(keyword) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const query = encodeURIComponent((keyword || 'technology').substring(0, 60));
  const apiUrl = `https://api.pexels.com/v1/search?query=${query}&per_page=3&orientation=landscape`;

  const data = await new Promise((resolve) => {
    const req = https.get(apiUrl, {
      headers: { Authorization: apiKey },
      timeout: 8000,
    }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(null); } });
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });

  const photos = data?.photos;
  if (!photos?.length) return null;

  const photoUrl = photos[0].src.landscape || photos[0].src.large;
  if (!photoUrl) return null;
  return downloadImage(photoUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// Source 3 — Unsplash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a relevant photo using the Unsplash API (free, 50 req/hour).
 * Requires UNSPLASH_ACCESS_KEY in .env — get one free at https://unsplash.com/developers
 * Returns a Buffer or null.
 */
async function fetchUnsplashPhoto(keyword) {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) return null;

  const query = encodeURIComponent((keyword || 'technology').substring(0, 60));
  const apiUrl = `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${apiKey}`;

  const data = await new Promise((resolve) => {
    const req = https.get(apiUrl, { timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(null); } });
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });

  const photoUrl = data?.urls?.regular;
  if (!photoUrl) return null;
  return downloadImage(photoUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// Source 0 — OpenAI Images (gpt-image-1, with dall-e-3 fallback) — PAID, top quality
// ─────────────────────────────────────────────────────────────────────────────

// Hero-image prompt template (ALL blogs). The model reads the FULL blog content
// (injected at {{BLOG_CONTENT}}) to infer topic/industry/use-case, then renders a
// premium, photorealistic, text-free hero. Size is per-blog via {{SIZE}}
// (ViitorCloud 1520 x 1008; EveryCRED / EveryTicket / LaraCopilot 1200 x 630). The
// brand is adapted automatically from the injected blog content + INDUSTRY ADAPTATION.
const HERO_IMAGE_TEMPLATE = `Create a premium, futuristic, photorealistic editorial blog hero image based on the blog content below.

IMAGE SIZE:
{{SIZE}} px, horizontal landscape hero image.

BLOG CONTENT:
{{BLOG_CONTENT}}

TASK:
First understand the full blog content. Identify:
- The main topic
- The industry
- The target audience
- The core business problem
- The AI / technology solution
- The most visual real-world use case
- The emotional message of the blog, such as confidence, speed, trust, productivity, customer service, automation, growth, or innovation

Then create one powerful hero image that visually represents the blog's central idea.

VISUAL DIRECTION:
The image must feel futuristic, intelligent, premium, and business-focused, while still looking realistic and believable. It should look like a high-end B2B technology blog header, not a generic stock photo.

The scene should show the technology or AI solution being used in a real work environment related to the blog's industry. The image should immediately communicate that AI or advanced digital technology is improving the workflow, decision-making, service experience, or business outcome.

INDUSTRY ADAPTATION:
Adapt the environment, people, devices, and visual cues to the blog content.

Examples:
- Retail blog: a store associate helping a shopper with a futuristic tablet or handheld AI assistant in a modern retail store.
- Healthcare blog: a doctor, nurse, or care team using an AI dashboard in a modern clinical setting.
- Manufacturing blog: engineers using predictive analytics beside advanced machinery or production lines.
- Finance blog: an advisor or analyst using a secure futuristic dashboard in a modern office.
- Logistics blog: a warehouse or supply chain manager using AI visibility tools near inventory, scanners, robots, or delivery operations.
- Education blog: a teacher, student, or administrator using AI learning tools in a modern classroom or campus environment.
- Real estate blog: an agent or client reviewing AI-powered property insights in a sleek office or smart building.
- SaaS / enterprise blog: professionals collaborating around AI dashboards, workflow automation, or data intelligence tools.

PEOPLE:
Include people when they help explain the use case. They should look natural, professional, diverse, and realistic. Their body language should show confidence, collaboration, service, or problem-solving. Avoid staged stock-photo poses.

SCREEN / DEVICE RULE:
If any screen, tablet, phone, laptop, kiosk, dashboard, transparent display, or holographic interface is shown, it must be clearly visible to the audience/viewer.

The screen should face the camera or be shown at a readable 3/4 angle so the viewer can understand that the technology is being used. Do not show screens turned away, hidden, overly blurred, cut off, or unreadable due to perspective.

The screen should be part of the story, not just a prop. It should visually connect to the people and the blog's topic.

SCREEN CONTENT:
Use only clean abstract UI elements:
- Dashboard cards
- Charts
- Graph lines
- Status dots
- Product thumbnails
- Map pins
- Workflow nodes
- Icons
- Data panels
- Search-style interface shapes
- AI assistant-style visual elements

Do not include any readable words, letters, numbers, labels, brand names, logos, captions, or fake UI text. The interface should look understandable visually, but without text.

FUTURISTIC STYLE:
Use a near-future visual style:
- Sleek digital interfaces
- Subtle glowing UI elements
- Premium devices
- Smart workspace details
- Clean architecture
- Advanced but believable technology
- Soft ambient light
- Elegant digital overlays when appropriate

The futuristic elements should feel practical and professional, not fantasy or sci-fi. Avoid excessive neon, cyberpunk styling, unrealistic hologram clutter, or spaceship-like environments unless the blog specifically requires that.

COMPOSITION:
- Horizontal hero image composition.
- Main subject slightly off-center.
- Clear foreground action involving people, technology, or the main business workflow.
- Relevant background environment, softly blurred but recognizable.
- Strong depth of field.
- Clean space in part of the image for possible website layout use.
- Balanced lighting and premium editorial photography style.
- The viewer should understand the industry and use case within seconds.

MOOD:
Confident, innovative, intelligent, helpful, modern, trustworthy, premium, and optimistic.

QUALITY:
Ultra-realistic, cinematic, high-resolution, sharp main subject, realistic skin texture, realistic hands, accurate anatomy, natural expressions, professional lighting, detailed environment, polished commercial photography look.

STRICT NEGATIVE INSTRUCTIONS:
Do not add any text anywhere.
Do not add readable words, letters, numbers, captions, labels, signs, logos, brand names, watermarks, or UI text.
Do not create infographic graphics.
Do not create cartoon, illustration, anime, vector art, low-poly render, or flat design.
Do not make the image look like a cheap stock photo.
Do not show screens facing away from the viewer if screens are included.
Do not show blurry, hidden, cut-off, or unreadable screens.
Do not create distorted hands, extra fingers, duplicated faces, strange eyes, broken devices, messy UI, unrealistic technology, cluttered holograms, or irrelevant objects.

FINAL OUTPUT:
One futuristic, photorealistic blog hero image, {{SIZE}} px, with no text anywhere.`;

// LaraCopilot flat-design marketing BANNER template (gpt-image-1). The AI draws NO logo
// (a real logo.svg is overlaid afterward and aligned to the detected headline edge).
// {{TITLE}} / {{BLOG_CONTENT}} are injected so the headline + checklist are topic-specific.
const LC_BANNER_TEMPLATE = `Create a clean, modern, FLAT-DESIGN blog hero banner, wide 1200 x 630 landscape, for a LaraCopilot blog post. Minimalist premium SaaS marketing style. Solid light off-white/cream background (#F7F5F2) filling the ENTIRE canvas. Brand accent: vivid orange (#F0552A). Primary text near-black (#1A1A1A); secondary text muted grey. Flat vector UI design — NOT photorealistic, NOT 3D, no photographs.

CRITICAL LAYOUT RULES:
- This is a full-bleed banner. Leave EMPTY cream margins inside the canvas as a safe zone: at least 14% at the top and 14% at the bottom (these outer bands may be trimmed, so keep them completely empty), and at least 7% on the left and right. EVERY element — logo space, headline, subheading, button, card, checklist, summary line, and the URL — must sit fully within this safe zone. No letter or shape may touch, be cut off by, or extend past ANY edge.
- Exactly TWO clearly separated columns with a clear empty vertical gutter between them. NOTHING may overlap, touch, or collide. Use lots of whitespace; do not crowd or clutter.
- Do NOT draw any LaraCopilot logo, brand icon, atom/orbital mark, spark, or logo lockup ANYWHERE — a real logo is overlaid afterward. The word "LaraCopilot" may appear ONLY as plain text in the right card header label and on the CTA button.
- TEXT SIZE: use refined, MODERATE font sizes with generous whitespace — make all text noticeably SMALLER than a typical oversized hero (reduce every text size by roughly 2 points). The headline is medium-large but never huge; the subheading, CTA label, card header, and checklist items are small. Leave comfortable empty space around every text block so the layout feels airy and elegant, not text-heavy.

LEFT COLUMN (occupies the left ~45% of the width):
- ALIGNMENT (important): every element in this column — the reserved logo space, the headline, the subheading, and the CTA button — must be LEFT-ALIGNED to the SAME vertical line, about 64px (5%) from the left edge of the canvas. Their left edges must line up exactly; do not indent any of them differently.
- Leave the very top-left empty: a clean blank cream space about 70px tall (starting at that 64px left line) reserved for a logo added separately. Do NOT draw any logo, icon, or wordmark there.
- Below that reserved space, a large bold sans-serif headline derived from the blog title, at most 3 lines, with the single most important phrase in orange and the rest near-black. Left edge on the 64px line. The headline must stay inside the left column and must NOT extend into or overlap the right card.
- One short grey subheading sentence, left edge on the same 64px line.
- A black pill-shaped CTA button reading "Try LaraCopilot", its left edge on the same 64px line.

RIGHT COLUMN (occupies the right ~45% of the width):
- One rounded-corner card with a thin light border on a slightly lighter cream fill, with comfortable inner padding.
- Card header: the bold label "LaraCopilot generates" only. Do NOT add any other tag, label, icon, spark, or text in the header.
- A thin full-width divider line.
- EXACTLY 4 short checklist items relevant to the blog topic, evenly spaced with comfortable line spacing, each starting with a small orange circular checkmark. Keep each item to ONE short line; never let an item wrap or collide with the next.
- A thin divider, then ONE short highlighted summary line.

BOTTOM-RIGHT: "laracopilot.com" in small light grey, placed INSIDE the safe zone (clearly above the bottom margin, never at the very bottom edge).

The result must look airy, balanced, and uncluttered like a high-end product landing-page hero. Absolutely no overlapping elements and no clipped or cut-off text.

Blog title: {{TITLE}}

Blog content:
{{BLOG_CONTENT}}`;

/**
 * Reduce blog HTML to clean plain text for use inside an image prompt: strip tags,
 * decode common entities, collapse whitespace, and cap length (keeps gpt-image-1
 * well within its prompt limit and avoids ballooning input cost).
 */
function stripForPrompt(html, maxChars = 7000) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

/**
 * Build the OpenAI image prompts for a blog.
 *   - richPrompt: ViitorCloud (bright) → the full hero template with the FULL blog
 *     content injected; other blogs → same as condensedPrompt.
 *   - condensedPrompt: short style+scene prompt (used by non-VC and as the dall-e-3
 *     fallback, since dall-e-3 caps prompts at 4000 chars).
 * Exported so the exact prompt can be inspected/logged without an API call.
 */
function buildImagePrompts(imagePrompt, { blogContent = '', title = '', width = 1200, height = 630 } = {}) {
  const topic = (imagePrompt || 'professional business scene').substring(0, 900);
  const size = `${width} x ${height}`;
  // Condensed prompt — dall-e-3 fallback only (4000-char limit; the rich template
  // plus full blog content won't fit there).
  const styleText = `Based on the blog content and title, create an image of size ${size}. Do not add text into the image. Style: tech-themed with technology photography. Do not include any text in the image; maintain a clean and simple design.`;
  const condensedPrompt = `${styleText}\n\nScene: ${topic}.\n\nStrict requirements: absolutely no text, no words, no letters, no numbers, no captions, no watermark, and no logos anywhere in the image.`;
  // Rich hero template — used for ALL blogs, with the blog's own size + full content.
  const blogBlock = `${title ? `Title: ${title}\n\n` : ''}${stripForPrompt(blogContent) || topic}`;
  const richPrompt = HERO_IMAGE_TEMPLATE.replaceAll('{{SIZE}}', size).replace('{{BLOG_CONTENT}}', blogBlock);
  return { richPrompt, condensedPrompt };
}

/**
 * Generate a featured image via the OpenAI Images API. Highest quality source
 * (matches the brand's clean/realistic reference samples). PAID — billed per image.
 *
 * Key is read from OPENAI_API_KEY or OPEN_AI_KEY. If absent, returns null (the
 * pipeline silently falls back to the free sources). Tries gpt-image-1 first, then
 * dall-e-3 (e.g. if the org isn't verified for gpt-image-1). The chosen model and
 * token usage are recorded on fetchOpenAIImage._lastModel / ._lastUsage for cost
 * reporting. The API key is NEVER logged.
 *
 * Returns a raw PNG/image Buffer (caller resizes to the exact target), or null.
 */
async function fetchOpenAIImage(imagePrompt, opts = {}) {
  const { width = 1200, height = 630, bright = false, blogContent = '', title = '' } = opts;
  fetchOpenAIImage._lastModel = null;
  fetchOpenAIImage._lastUsage = null;
  fetchOpenAIImage._lastError = null;

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY;
  if (!apiKey) return null;

  const { richPrompt, condensedPrompt } = buildImagePrompts(imagePrompt, { blogContent, title, width, height });

  const landscape = width >= height;
  const attempts = [
    { model: 'gpt-image-1', prompt: richPrompt,                     payload: { size: landscape ? '1536x1024' : '1024x1536', quality: process.env.OPENAI_IMAGE_QUALITY || 'high' } },
    { model: 'dall-e-3',    prompt: condensedPrompt.slice(0, 3990), payload: { size: landscape ? '1792x1024' : '1024x1792', quality: 'hd', response_format: 'b64_json' } },
  ];

  for (const att of attempts) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: att.model, prompt: att.prompt, n: 1, ...att.payload }),
      });
      if (!res.ok) {
        const txt = await res.text();
        fetchOpenAIImage._lastError = `${att.model}: HTTP ${res.status} ${txt.substring(0, 200)}`;
        console.warn(`[ImageService] OpenAI ${att.model} failed: HTTP ${res.status}`);
        continue;  // fall through to next model
      }
      const json = await res.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) { fetchOpenAIImage._lastError = `${att.model}: no image data in response`; continue; }
      fetchOpenAIImage._lastModel = att.model;
      fetchOpenAIImage._lastUsage = json.usage || null;
      console.log(`[ImageService] OpenAI image generated via ${att.model}`);
      return Buffer.from(b64, 'base64');
    } catch (e) {
      fetchOpenAIImage._lastError = `${att.model}: ${e.message}`;
      console.warn(`[ImageService] OpenAI ${att.model} error: ${e.message}`);
    }
  }
  return null;
}

/**
 * Generate a LaraCopilot flat-design BANNER via OpenAI gpt-image-1, then composite the
 * REAL logo.svg into the top-left (aligned to the detected headline edge). Returns a
 * finished width×height WebP Buffer (logo already in place), or null on failure (no key,
 * billing limit, etc.) so the pipeline can fall back to the free sources.
 *
 * The AI is told NOT to draw a logo; we overlay the real one and align its left edge to
 * the headline's left edge (detected from pixels) since the AI sets its own text margin.
 */
async function fetchOpenAIBanner({ title = '', blogContent = '', logoPath = null, width = 1200, height = 630 } = {}) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY;
  fetchOpenAIImage._lastModel = null;
  fetchOpenAIImage._lastUsage = null;
  fetchOpenAIImage._lastError = null;
  if (!apiKey) return null;

  const sharp = require('sharp');
  const body = stripForPrompt(blogContent) || title || 'a LaraCopilot blog post';
  const prompt = LC_BANNER_TEMPLATE
    .replace('{{TITLE}}', (title || '').slice(0, 200))
    .replace('{{BLOG_CONTENT}}', body);

  let buf;
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1536x1024', quality: process.env.OPENAI_IMAGE_QUALITY || 'high' }),
    });
    if (!res.ok) {
      fetchOpenAIImage._lastError = `banner: HTTP ${res.status} ${(await res.text()).substring(0, 200)}`;
      console.warn(`[ImageService] OpenAI banner failed: HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) { fetchOpenAIImage._lastError = 'banner: no image data'; return null; }
    fetchOpenAIImage._lastModel = 'gpt-image-1';
    fetchOpenAIImage._lastUsage = json.usage || null;
    buf = Buffer.from(b64, 'base64');
    console.log('[ImageService] OpenAI banner generated via gpt-image-1');
  } catch (e) {
    fetchOpenAIImage._lastError = `banner: ${e.message}`;
    console.warn(`[ImageService] OpenAI banner error: ${e.message}`);
    return null;
  }

  // Full-bleed cover to the target (the prompt keeps a >=14% empty top/bottom band, so
  // the crop removes only blank space). No side bars, nothing clipped.
  const base = await sharp(buf).resize(width, height, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  if (!logoPath) return sharp(base).webp({ quality: 90 }).toBuffer();

  // Detect the headline's left edge (the AI sets its own text margin) and align the real
  // logo's left edge to it, so logo + headline + subhead + CTA share one line.
  try {
    const raw = await sharp(base).removeAlpha().raw().toBuffer();
    const yStart = Math.round(height * 0.16), yEnd = Math.round(height * 0.40), xMax = Math.round(width * 0.5);
    let found = width;
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = 12; x < xMax; x++) {
        const i = (y * width + x) * 3;
        if (0.299 * raw[i] + 0.587 * raw[i + 1] + 0.114 * raw[i + 2] < 200) { if (x < found) found = x; break; }
      }
    }
    const leftX = (found < xMax) ? found : Math.round(width * 0.05);
    const logoBuf = await sharp(logoPath, { density: 320 }).resize({ width: Math.round(width * 0.175) }).png().toBuffer();
    return sharp(base)
      .composite([{ input: logoBuf, top: Math.round(height * 0.07), left: Math.max(12, leftX) }])
      .webp({ quality: 90 })
      .toBuffer();
  } catch (e) {
    console.warn(`[ImageService] banner logo overlay failed: ${e.message}`);
    return sharp(base).webp({ quality: 90 }).toBuffer();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Source 4 — SVG gradient fallback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a text-free abstract background as a WebP buffer under 100KB.
 * No text, no titles, no keywords — clean canvas for logo compositing.
 * Uses theme-aware color palettes and abstract geometric shapes.
 */
async function generateFeaturedImage(title, keyword, theme, brandName = '', brandDomain = '', width = 1200, height = 630) {
  const sharp = require('sharp');

  const themes = {
    ai:         { bg1: '#0a0f1e', bg2: '#0d1f3c', bg3: '#1a3a6e', accent: '#3b82f6', accent2: '#06b6d4' },
    ml:         { bg1: '#0a0f1e', bg2: '#120d2e', bg3: '#1e1458', accent: '#6366f1', accent2: '#8b5cf6' },
    cloud:      { bg1: '#050d1a', bg2: '#0c1f35', bg3: '#0e3a5c', accent: '#0ea5e9', accent2: '#38bdf8' },
    software:   { bg1: '#0d0a1e', bg2: '#160f2e', bg3: '#1e1245', accent: '#8b5cf6', accent2: '#a78bfa' },
    enterprise: { bg1: '#0f0a05', bg2: '#1c1205', bg3: '#2d1f0a', accent: '#f59e0b', accent2: '#fbbf24' },
    default:    { bg1: '#080d1a', bg2: '#0f1830', bg3: '#162248', accent: '#6366f1', accent2: '#818cf8' },
  };

  const themeKey = (theme || '').toLowerCase();
  const t = themes[Object.keys(themes).find(k => themeKey.includes(k)) || 'default'];

  // Abstract geometric composition — no text anywhere. The artwork is authored in
  // a fixed 1200×630 coordinate space; viewBox + "slice" scales it up to the target
  // canvas proportionally (fills, never stretches) so VC's 1520×1008 isn't distorted.
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 1200 630" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.bg1}"/>
      <stop offset="50%" stop-color="${t.bg2}"/>
      <stop offset="100%" stop-color="${t.bg3}"/>
    </linearGradient>
    <linearGradient id="glow1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="glow2" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${t.accent2}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${t.accent2}" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur1"><feGaussianBlur stdDeviation="60"/></filter>
    <filter id="blur2"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="blur3"><feGaussianBlur stdDeviation="25"/></filter>
  </defs>

  <!-- Base background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Ambient glow blobs — right side heavy so top-left stays clean for logo -->
  <ellipse cx="950" cy="200" rx="420" ry="320" fill="${t.accent}" opacity="0.28" filter="url(#blur1)"/>
  <ellipse cx="1100" cy="520" rx="300" ry="220" fill="${t.accent2}" opacity="0.22" filter="url(#blur1)"/>
  <ellipse cx="580" cy="560" rx="340" ry="200" fill="${t.accent}" opacity="0.16" filter="url(#blur1)"/>
  <ellipse cx="350" cy="580" rx="200" ry="120" fill="${t.accent2}" opacity="0.10" filter="url(#blur1)"/>

  <!-- Diagonal light sweep -->
  <polygon points="650,0 1200,0 1200,630 450,630" fill="url(#glow1)" opacity="0.30"/>

  <!-- Abstract grid lines — subtle tech feel -->
  <g opacity="0.12" stroke="${t.accent2}" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105"/>
    <line x1="0" y1="210" x2="1200" y2="210"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="420" x2="1200" y2="420"/>
    <line x1="0" y1="525" x2="1200" y2="525"/>
    <line x1="200" y1="0" x2="200" y2="630"/>
    <line x1="400" y1="0" x2="400" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="800" y1="0" x2="800" y2="630"/>
    <line x1="1000" y1="0" x2="1000" y2="630"/>
  </g>

  <!-- Floating geometric circles — decorative, right side -->
  <circle cx="1050" cy="150" r="200" fill="none" stroke="${t.accent}" stroke-width="1.5" opacity="0.25"/>
  <circle cx="1050" cy="150" r="145" fill="none" stroke="${t.accent}" stroke-width="1" opacity="0.18"/>
  <circle cx="1050" cy="150" r="90" fill="${t.accent}" opacity="0.12" filter="url(#blur2)"/>
  <circle cx="1050" cy="150" r="40" fill="${t.accent}" opacity="0.20" filter="url(#blur3)"/>

  <circle cx="820" cy="490" r="140" fill="none" stroke="${t.accent2}" stroke-width="1.2" opacity="0.20"/>
  <circle cx="820" cy="490" r="85" fill="${t.accent2}" opacity="0.10" filter="url(#blur2)"/>

  <circle cx="500" cy="320" r="90" fill="none" stroke="${t.accent}" stroke-width="0.8" opacity="0.14"/>

  <!-- Accent dots — network nodes feel -->
  <circle cx="870" cy="190" r="5" fill="${t.accent}" opacity="0.8"/>
  <circle cx="930" cy="260" r="4" fill="${t.accent2}" opacity="0.7"/>
  <circle cx="790" cy="145" r="3.5" fill="${t.accent}" opacity="0.6"/>
  <circle cx="1030" cy="310" r="4.5" fill="${t.accent2}" opacity="0.7"/>
  <circle cx="960" cy="400" r="3" fill="${t.accent}" opacity="0.6"/>
  <circle cx="700" cy="230" r="3" fill="${t.accent2}" opacity="0.5"/>
  <circle cx="650" cy="450" r="4" fill="${t.accent}" opacity="0.5"/>

  <!-- Connecting lines between nodes -->
  <g opacity="0.20" stroke="${t.accent}" stroke-width="1">
    <line x1="870" y1="190" x2="1050" y2="150"/>
    <line x1="930" y1="260" x2="1050" y2="150"/>
    <line x1="1030" y1="310" x2="1050" y2="150"/>
    <line x1="960" y1="400" x2="820" y2="490"/>
    <line x1="700" y1="230" x2="870" y2="190"/>
  </g>

  <!-- Diagonal accent lines -->
  <line x1="700" y1="0" x2="1200" y2="350" stroke="${t.accent}" stroke-width="0.8" opacity="0.14"/>
  <line x1="820" y1="0" x2="1200" y2="230" stroke="${t.accent2}" stroke-width="0.6" opacity="0.10"/>

  <!-- Bottom glow bar -->
  <rect x="0" y="580" width="1200" height="50" fill="${t.accent}" opacity="0.10" filter="url(#blur3)"/>
</svg>`;

  const buffer = await sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'cover' })
    .webp({ quality: 75, effort: 4 })
    .toBuffer();

  return buffer.length > 100 * 1024
    ? sharp(buffer).webp({ quality: 55, effort: 4 }).toBuffer()
    : buffer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo compositing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composite the blog logo onto the top-left corner of an image.
 *
 * Layout:
 *   - Logo resized to fit within a bounding box, scaled with the canvas so it stays
 *     proportional on the larger ViitorCloud image as well as the standard size.
 *   - Placed with padding from the top-left edges.
 *   - With `backing` on (default): a dark navy semi-transparent rounded pill behind
 *     the logo keeps it readable on any background.
 *   - With `backing` off (ViitorCloud): no pill — a soft drop shadow lets the white
 *     logo integrate naturally while staying legible on lighter patches.
 *
 * @param {Buffer} imageBuffer  - the base image
 * @param {string} logoPath     - resolved logo file path (svg/png/…)
 * @param {object} [opts]
 * @param {boolean} [opts.backing=true] - draw the navy backing pill behind the logo
 *
 * Returns the composited WebP buffer, or the original buffer if the logo
 * file is missing or compositing fails for any reason.
 */
async function compositeLogoOnImage(imageBuffer, logoPath, opts = {}) {
  const { backing = true, quality = 75, maxBytes = 100 * 1024 } = opts;
  if (!logoPath) return imageBuffer;
  try {
    const sharp = require('sharp');

    // Scale logo + padding with the image so the logo stays proportional on the
    // larger ViitorCloud canvas (1520×1008) as well as the standard 1200×630.
    const meta = await sharp(imageBuffer).metadata();
    const scale = (meta.width || 1200) / 1200;
    const PADDING   = Math.round(30 * scale);  // distance from image edges
    const INNER_PAD = Math.round(16 * scale);  // padding inside the backing pill
    const MAX_W     = Math.round(220 * scale);
    const MAX_H     = Math.round(85 * scale);

    // Render logo SVG → PNG, resized to fit within bounding box
    const logoBuffer = await sharp(logoPath)
      .resize(MAX_W, MAX_H, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    const { width: lw, height: lh } = await sharp(logoBuffer).metadata();

    const layers = [];

    if (backing) {
      // Dark navy semi-transparent backing — works for coloured/mixed logos
      // regardless of background. (ViitorCloud opts out; see else branch.)
      const bw = lw + INNER_PAD * 2;
      const bh = lh + INNER_PAD * 2;
      const backingSvg = Buffer.from(
        `<svg width="${bw}" height="${bh}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect width="${bw}" height="${bh}" rx="12" ry="12" fill="#0d1b3e" fill-opacity="0.88"/>` +
        `</svg>`
      );
      const backingBuffer = await sharp(backingSvg).png().toBuffer();
      layers.push({ input: backingBuffer, top: PADDING - INNER_PAD, left: PADDING - INNER_PAD, blend: 'over' });
    } else {
      // No pill — soft drop shadow. Build a faded black silhouette of the logo
      // (dest-in keeps the logo's shape/alpha over a 45%-opaque black canvas),
      // blur it, and lay it slightly offset beneath the crisp logo. This gives
      // depth/legibility without the hard "box" look.
      const blurSigma = Math.max(3, Math.round(5 * scale));
      const offset    = Math.max(1, Math.round(2 * scale));
      const shadow = await sharp({
        create: { width: lw, height: lh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.45 } },
      })
        .composite([{ input: logoBuffer, blend: 'dest-in' }])  // mask black canvas to logo shape
        .blur(blurSigma)
        .png()
        .toBuffer();
      layers.push({ input: shadow, top: PADDING + offset, left: PADDING + offset, blend: 'over' });
    }

    layers.push({ input: logoBuffer, top: PADDING, left: PADDING, blend: 'over' });

    const result = await sharp(imageBuffer)
      .composite(layers)
      .webp({ quality })
      .toBuffer();

    // Re-compress only if it exceeds the (per-source) size ceiling.
    return result.length > maxBytes
      ? sharp(result).webp({ quality: Math.max(50, quality - 20) }).toBuffer()
      : result;

  } catch (err) {
    console.warn('[ImageService] Logo composite failed:', err.message);
    return imageBuffer;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates and saves a featured image for a blog post.
 *
 * Pipeline (first success wins), order depends on the blog's spec:
 *   - preferStock blogs (ViitorCloud): Pexels → Unsplash → Pollinations(AI) → SVG gradient
 *   - all other blogs:                 Pollinations(AI) → Pexels → Unsplash → SVG gradient
 *   Then: logo composited top-left on the winning image.
 *   (Pexels/Unsplash require free API keys; without them those steps are skipped.)
 *
 * @param {string} title        - Post title (used by SVG gradient fallback)
 * @param {string} keyword      - Primary keyword
 * @param {string} theme        - Theme/category for gradient color selection
 * @param {string} imagePrompt  - AI-generated image description from Claude
 * @param {object} blog         - Blog config row (needs context_path, name, domain)
 * @returns {Promise<{path, buffer, size, source}>}
 */
async function saveTempImage(title, keyword, theme, imagePrompt, blog = {}, blogContent = '', meta = '') {
  const sharp = require('sharp');
  let buffer = null;
  let source = 'gradient';

  const logoPath   = resolveLogoPath(blog);
  const spec       = imageSpecForBlog(blog);  // { width, height, logoBacking }

  // Build a clean stock-photo search query: strip DALL-E style directives so only
  // the subject matter remains (e.g. "cloud computing security" not the full prompt).
  const rawSubject = imagePrompt
    ? imagePrompt
        .replace(/ABSOLUTELY NO.*?\./gi, '')
        .replace(/STRICT.*?\./gi, '')
        .replace(/STYLE:.*?\./gi, '')
        .replace(/COMPOSITION:.*?\./gi, '')
        .replace(/Upper-left.*?\./gi, '')
        .replace(/photorealistic|cinematic|depth of field|digital illustration|3[dD] render|accent lighting|navy|holographic/gi, '')
        .replace(/[^a-zA-Z0-9 ,]/g, '')
        .split(',')[0]
        .replace(/\s+/g, ' ')
        .trim()
    : (keyword || theme || 'technology');
  // For real-stock sources (Pexels/Unsplash) keep the subject as-is (real people
  // photos); for the AI/abstract path append "concept" to bias away from text-heavy
  // infographics. preferStock blogs (ViitorCloud) use the people-oriented subject.
  const stockQuery = rawSubject || (keyword || 'business team people');
  const aiQuery    = rawSubject ? `${rawSubject} concept` : 'technology concept';

  // ── Source attempts ──
  // Real photographs via Pexels → Unsplash (need free API keys; commercial-use,
  // no attribution). Genuine photos = correct anatomy, fully photorealistic.
  const tryStock = async () => {
    for (const [name, fetchFn] of [['pexels', fetchPexelsPhoto], ['unsplash', fetchUnsplashPhoto]]) {
      try {
        const rawPhoto = await fetchFn(stockQuery);
        if (rawPhoto && rawPhoto.length > 10000) {
          buffer = await sharp(rawPhoto)
            .resize(spec.width, spec.height, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 })
            .webp({ quality: 82 })
            .toBuffer();
          if (buffer.length > 100 * 1024) buffer = await sharp(buffer).webp({ quality: 60 }).toBuffer();
          source = name;
          return true;
        }
      } catch { /* try next stock provider */ }
    }
    return false;
  };
  // AI generation via Pollinations (free, no key) — the realism-prompted fallback.
  const tryAi = async () => {
    try {
      const aiBuffer = await fetchPollinationsImage(imagePrompt || keyword, { width: spec.width, height: spec.height, bright: spec.bright });
      if (aiBuffer) { buffer = aiBuffer; source = 'pollinations'; return true; }
    } catch { /* fallthrough */ }
    return false;
  };
  // OpenAI (paid, top quality) — used first whenever a key is configured.
  const tryOpenAI = async () => {
    try {
      // LaraCopilot: flat-design marketing banner (real logo overlaid, aligned in-place).
      if (spec.banner) {
        const bannerBuf = await fetchOpenAIBanner({ title, blogContent, logoPath, width: spec.width, height: spec.height });
        if (bannerBuf) { buffer = bannerBuf; source = 'openai-banner'; return true; }
        return false;  // banner failed (e.g. billing limit) → fall back to free sources
      }
      const raw = await fetchOpenAIImage(imagePrompt || keyword, { width: spec.width, height: spec.height, bright: spec.bright, blogContent, title });
      if (raw) {
        buffer = await sharp(raw)
          .resize(spec.width, spec.height, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 })
          .webp({ quality: 92 })
          .toBuffer();
        source = 'openai';
        return true;
      }
    } catch { /* fall through to free sources */ }
    return false;
  };

  // Codex image_gen banner (built-in tool via the Codex CLI, ChatGPT login) — the
  // PRIMARY source for all blogs. Generates a per-brand banner, then composites the
  // real logo.svg. Falls through to the chain below if Codex is unavailable/fails.
  const tryCodex = async () => {
    try {
      const { generateCodexBanner } = require('./codexImageService');
      const b = await generateCodexBanner(title, blog, blogContent, spec, null, meta);
      if (b) { buffer = b; source = 'codex-banner'; return true; }
    } catch { /* fall through to other sources */ }
    return false;
  };

  // Brand banner: composite headline + short meta subtext + real logo over the blog's
  // OWN background image (blogs/{slug}/context/BG/*). Deterministic, no AI, no network.
  // Already includes the logo, so it is excluded from the logo re-composite below.
  const tryBrandBanner = async () => {
    try {
      const { generateBrandBanner } = require('./brandBannerService');
      const b = await generateBrandBanner(title, blog, spec, meta, null);
      if (b) { buffer = b; source = 'brand-banner'; return true; }
    } catch { /* fall through */ }
    return false;
  };

  const blogSlug = String(blog.slug || '').toLowerCase();
  // Brand-banner blogs (default: vc) render STRICTLY over their own BG images — no AI
  // background and no generic-photo fallback. If the BG render fails, the only fallback
  // is the deterministic brand SVG gradient below. Override via BRAND_BANNER_BLOGS.
  const brandBannerBlogs = (process.env.BRAND_BANNER_BLOGS || 'vc')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  // Strict-Codex blogs use ONLY the Codex banner (no generic fallback). Default: none.
  const strictCodexBlogs = (process.env.STRICT_CODEX_BLOGS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  // Order: brand-banner blogs → BG render only; strict-Codex blogs → Codex only;
  // everyone else → Codex banner → OpenAI (if key) → per-blog free sources.
  const hasOpenAI = !!(process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY);
  let order;
  if (brandBannerBlogs.includes(blogSlug)) {
    order = [tryBrandBanner];
  } else if (strictCodexBlogs.includes(blogSlug)) {
    order = [tryCodex];
  } else {
    order = [tryCodex, ...(hasOpenAI ? [tryOpenAI] : []), ...(spec.preferStock ? [tryStock, tryAi] : [tryAi, tryStock])];
  }
  for (const attempt of order) {
    if (!buffer) await attempt();
  }

  // ── Final fallback: SVG gradient (always works, no network/keys) ──
  if (!buffer) {
    if (brandBannerBlogs.includes(blogSlug)) console.warn('[ImageService] Brand-banner blog but BG render failed — using brand SVG gradient.');
    else if (strictCodexBlogs.includes(blogSlug)) console.warn('[ImageService] Strict-Codex blog but Codex failed after retries — using brand SVG gradient (NOT a generic AI image).');
    const brandName  = blog.name ? blog.name.replace(/\s+blog$/i, '').trim() : '';
    const brandDomain = blog.domain || '';
    buffer = await generateFeaturedImage(title, keyword, theme, brandName, brandDomain, spec.width, spec.height);
    source = 'gradient';
  }

  // ── Logo composite: applied to ALL sources EXCEPT banners that already have the
  // real logo overlaid in-place (LaraCopilot OpenAI banner, Codex banner, brand banner). ──
  if (source !== 'openai-banner' && source !== 'codex-banner' && source !== 'brand-banner') {
    // Premium (VC) or any OpenAI-sourced image keeps higher webp quality + a larger
    // size ceiling so the clean detail survives; free/stock sources keep the lean target.
    const premium = spec.bright || source === 'openai';
    const finalQuality  = premium ? 88 : 75;
    const finalMaxBytes = premium ? 240 * 1024 : 100 * 1024;
    buffer = await compositeLogoOnImage(buffer, logoPath, { backing: spec.logoBacking, quality: finalQuality, maxBytes: finalMaxBytes });
  }

  const tmpPath = path.join(os.tmpdir(), `ct-image-${Date.now()}.webp`);
  fs.writeFileSync(tmpPath, buffer);
  return {
    path: tmpPath, buffer, size: buffer.length, source,
    ...(source.startsWith('openai') ? { openaiModel: fetchOpenAIImage._lastModel, openaiUsage: fetchOpenAIImage._lastUsage } : {}),
  };
}

module.exports = { generateFeaturedImage, saveTempImage, buildImagePrompts, compositeLogoOnImage };
