/**
 * Featured image service.
 *
 * Priority chain:
 *   1. Pollinations.ai — free AI image generation (Flux model), NO API key needed
 *   2. Pexels          — if PEXELS_API_KEY set
 *   3. Unsplash        — if UNSPLASH_ACCESS_KEY set
 *   4. SVG gradient    — always works, zero-dep fallback
 *
 * After any source succeeds, the blog logo is composited top-left (30px padding)
 * with a dark navy semi-transparent rounded backing so logos are readable on any
 * background (critical for all-white logos like ViitorCloud).
 *
 * Output: 1200×630 WebP under 100KB.
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
 * Returns a 1200×630 WebP Buffer under 100KB, or null on failure.
 */
async function fetchPollinationsImage(imagePrompt) {
  try {
    const topic = (imagePrompt || 'professional technology concept').substring(0, 800);

    // Build a style-augmented prompt: preserve the subject from Claude's image_prompt
    // and append dark-tech style directives that match the desired sample aesthetic.
    const fullPrompt = [
      topic,
      'dark cinematic 3D digital illustration',
      'deep navy blue background',
      'dramatic teal electric blue accent lighting',
      'glowing holographic elements',
      'photorealistic render quality',
      'cinematic depth of field',
      'upper left corner visually calm',
      'no text no words no letters no labels',
    ].join(', ');

    const encoded = encodeURIComponent(fullPrompt);
    // seed makes each article get a unique image; nologo removes Pollinations watermark
    const seed = Math.floor(Math.random() * 9999999);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=630&nologo=true&model=flux&seed=${seed}`;

    console.log('[ImageService] Pollinations.ai generating image (Flux)...');
    const rawBuffer = await downloadImage(url, 90000);  // up to 90s for generation
    if (!rawBuffer || rawBuffer.length < 20000) {
      console.warn('[ImageService] Pollinations returned empty/tiny response');
      return null;
    }

    const sharp = require('sharp');
    let buffer = await sharp(rawBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80 })
      .toBuffer();

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
// Source 4 — SVG gradient fallback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a text-free abstract background as a WebP buffer under 100KB.
 * No text, no titles, no keywords — clean canvas for logo compositing.
 * Uses theme-aware color palettes and abstract geometric shapes.
 */
async function generateFeaturedImage(title, keyword, theme, brandName = '', brandDomain = '') {
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

  // Abstract geometric composition — no text anywhere
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
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
    .resize(1200, 630)
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
 *   - Logo resized to fit within 180×75px (aspect ratio preserved)
 *   - Placed at 50px from top-left edges
 *   - Semi-transparent white rounded backing (opacity 0.82) ensures the logo
 *     reads clearly on any generated background color
 *
 * Returns the composited WebP buffer, or the original buffer if the logo
 * file is missing or compositing fails for any reason.
 */
async function compositeLogoOnImage(imageBuffer, logoPath) {
  if (!logoPath) return imageBuffer;
  try {
    const sharp = require('sharp');
    const PADDING   = 30;  // distance from image edges
    const INNER_PAD = 16;  // padding inside the backing pill
    const MAX_W     = 220;
    const MAX_H     = 85;

    // Render logo SVG → PNG, resized to fit within bounding box
    const logoBuffer = await sharp(logoPath)
      .resize(MAX_W, MAX_H, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    const { width: lw, height: lh } = await sharp(logoBuffer).metadata();

    // Dark navy semi-transparent backing — works for all logos regardless of
    // whether they use white, coloured, or mixed-colour paths. White backings
    // make all-white logos (e.g. Viitor Cloud) invisible.
    const bw = lw + INNER_PAD * 2;
    const bh = lh + INNER_PAD * 2;
    const backingSvg = Buffer.from(
      `<svg width="${bw}" height="${bh}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${bw}" height="${bh}" rx="12" ry="12" fill="#0d1b3e" fill-opacity="0.88"/>` +
      `</svg>`
    );
    const backingBuffer = await sharp(backingSvg).png().toBuffer();

    const result = await sharp(imageBuffer)
      .composite([
        { input: backingBuffer, top: PADDING - INNER_PAD, left: PADDING - INNER_PAD, blend: 'over' },
        { input: logoBuffer,    top: PADDING,             left: PADDING,             blend: 'over' },
      ])
      .webp({ quality: 75 })
      .toBuffer();

    return result.length > 100 * 1024
      ? sharp(result).webp({ quality: 55 }).toBuffer()
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
 * Pipeline:
 *   Pollinations.ai (Flux) → Pexels → Unsplash → SVG gradient  (first success wins)
 *   Then: logo composited top-left on the winning image
 *
 * @param {string} title        - Post title (used by SVG gradient fallback)
 * @param {string} keyword      - Primary keyword
 * @param {string} theme        - Theme/category for gradient color selection
 * @param {string} imagePrompt  - AI-generated image description from Claude
 * @param {object} blog         - Blog config row (needs context_path, name, domain)
 * @returns {Promise<{path, buffer, size, source}>}
 */
async function saveTempImage(title, keyword, theme, imagePrompt, blog = {}) {
  const sharp = require('sharp');
  let buffer = null;
  let source = 'gradient';

  const logoPath   = resolveLogoPath(blog);

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
  // Append "concept" so Pexels/Unsplash favours abstract/conceptual images over
  // text-heavy infographics and presentation screenshots
  const searchQuery = rawSubject ? `${rawSubject} concept` : 'technology concept';

  // ── Priority 1: Pollinations.ai (free Flux model, no API key needed) ──
  try {
    const aiBuffer = await fetchPollinationsImage(imagePrompt || keyword);
    if (aiBuffer) { buffer = aiBuffer; source = 'pollinations'; }
  } catch { /* fallthrough */ }

  // ── Priority 2: Pexels ──
  if (!buffer) {
    try {
      const rawPhoto = await fetchPexelsPhoto(searchQuery);
      if (rawPhoto && rawPhoto.length > 10000) {
        buffer = await sharp(rawPhoto)
          .resize(1200, 630, { fit: 'cover', position: 'centre' })
          .webp({ quality: 75 })
          .toBuffer();
        if (buffer.length > 100 * 1024) buffer = await sharp(buffer).webp({ quality: 55 }).toBuffer();
        source = 'pexels';
      }
    } catch { /* fallthrough */ }
  }

  // ── Priority 3: Unsplash ──
  if (!buffer) {
    try {
      const rawPhoto = await fetchUnsplashPhoto(searchQuery);
      if (rawPhoto && rawPhoto.length > 10000) {
        buffer = await sharp(rawPhoto)
          .resize(1200, 630, { fit: 'cover', position: 'centre' })
          .webp({ quality: 75 })
          .toBuffer();
        if (buffer.length > 100 * 1024) buffer = await sharp(buffer).webp({ quality: 55 }).toBuffer();
        source = 'unsplash';
      }
    } catch { /* fallthrough */ }
  }

  // ── Priority 4: SVG gradient (always works) ──
  if (!buffer) {
    const brandName  = blog.name ? blog.name.replace(/\s+blog$/i, '').trim() : '';
    const brandDomain = blog.domain || '';
    buffer = await generateFeaturedImage(title, keyword, theme, brandName, brandDomain);
    source = 'gradient';
  }

  // ── Logo composite: applied to ALL sources ──
  buffer = await compositeLogoOnImage(buffer, logoPath);

  const tmpPath = path.join(os.tmpdir(), `ct-image-${Date.now()}.webp`);
  fs.writeFileSync(tmpPath, buffer);
  return { path: tmpPath, buffer, size: buffer.length, source };
}

module.exports = { generateFeaturedImage, saveTempImage };
