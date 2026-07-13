/**
 * codexImageService — generate blog featured images via the OpenAI Codex CLI's
 * built-in `image_gen` skill, then composite the blog's real logo.svg on top.
 *
 * Flow (per image):
 *   1. Build a per-brand prompt from the article (headline from title, subhead from
 *      content/meta, brand accent + background + URL). The prompt explicitly tells
 *      Codex NOT to draw any logo/wordmark and to leave the lower-left empty.
 *   2. Run `codex exec` (non-interactive, uses the user's ChatGPT login — no API key)
 *      to generate the banner into a temp dir.
 *   3. Composite the real per-domain logo.svg into the lower-left (deterministic, so
 *      the brand mark is pixel-accurate, never AI-drawn).
 *
 * Returns a WebP Buffer, or null on any failure (caller falls back to other sources).
 * Disabled by setting CODEX_IMAGE_DISABLED=1, or auto-disabled when the codex binary
 * or login is unavailable (e.g. headless servers).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const spawn = require('cross-spawn');

// Repo root + app dir — used to resolve per-domain logos under either context_path
// convention ("./blogs/..." repo-root-relative or "../blogs/..." app-relative).
const REPO_ROOT = path.join(__dirname, '../../..');
const APP_ROOT = path.join(__dirname, '../..');

// Per-brand visual config. Detected by blog slug/name/context_path; unknown blogs
// get a sensible dark-tech default.
// `autoBg: true` makes Codex pick a topic-appropriate background per article instead
// of a fixed brand colour (the real logo is still overlaid afterward — never AI-drawn).
const BRANDS = {
  vc:          { accent: '#FFB14E', bg: 'a deep teal-to-blue gradient', dark: true,  url: 'www.viitorcloud.com' },
  lc:          { accent: '#F53003', bg: 'a clean light cream background (#F7F5F2)', dark: false, url: 'laracopilot.com' },
  everycred:   { accent: '#1E4383', bg: 'a clean light off-white background', dark: false, autoBg: true, url: 'everycred.com' },
  everyticket: { accent: '#D50355', bg: 'a clean light off-white background', dark: false, autoBg: true, url: 'everyticket.in' },
};

function brandForBlog(blog = {}) {
  const slug = String(blog.slug || '').toLowerCase();
  const name = String(blog.name || '').toLowerCase();
  const ctx  = String(blog.context_path || '').toLowerCase().replace(/\\/g, '/');
  const hit = (k, re) => slug === k || re.test(name) || re.test(ctx);
  if (hit('vc', /viitorcloud|\/blogs\/vc(\/|$)/)) return { key: 'vc', ...BRANDS.vc };
  if (slug === 'lc' || /laracopilot/.test(name) || /\/blogs\/laracopilot(\/|$)/.test(ctx)) return { key: 'lc', ...BRANDS.lc };
  if (hit('everycred', /everycred/)) return { key: 'everycred', ...BRANDS.everycred };
  if (hit('everyticket', /everyticket/)) return { key: 'everyticket', ...BRANDS.everyticket };
  // Default: dark tech banner using the blog's own domain.
  return { key: 'default', accent: '#3B82F6', bg: 'a deep navy-to-blue gradient', dark: true, url: blog.domain || '' };
}

// Load the blog's LIVE banner prompt from blogs/{slug}/context/banner-instructions.md
// (only the text after a `---PROMPT---` marker, if present). Returns null if absent, so
// the caller falls back to the built-in buildPrompt(). Editing that file changes the
// prompt with no code change/restart.
function loadBannerPrompt(blog) {
  if (!blog || !blog.context_path) return null;
  for (const base of [REPO_ROOT, APP_ROOT]) {
    const p = path.resolve(base, blog.context_path, 'banner-instructions.md');
    try {
      if (!fs.existsSync(p)) continue;
      let t = fs.readFileSync(p, 'utf8');
      const marker = t.indexOf('---PROMPT---');
      if (marker !== -1) t = t.slice(marker + '---PROMPT---'.length);
      t = t.trim();
      return t || null;
    } catch { /* try next base */ }
  }
  return null;
}

// Resolve the blog's logo.svg under either path convention.
function resolveLogo(blog) {
  if (!blog || !blog.context_path) return null;
  for (const base of [REPO_ROOT, APP_ROOT]) {
    const dir = path.resolve(base, blog.context_path);
    for (const ext of ['svg', 'png', 'webp']) {
      const p = path.join(dir, `logo.${ext}`);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

// Locate the codex binary: env override → Windows standalone install → PATH.
function resolveCodexBin() {
  if (process.env.CODEX_BIN && fs.existsSync(process.env.CODEX_BIN)) return process.env.CODEX_BIN;
  const home = process.env.USERPROFILE || os.homedir();
  const win = path.join(home, '.codex', 'packages', 'standalone', 'current', 'bin', 'codex.exe');
  if (fs.existsSync(win)) return win;
  return 'codex'; // rely on PATH (linux/mac)
}

// First clean sentence from the article HTML, for the subhead/support line.
function firstSentence(html, maxLen = 110) {
  let text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
  text = text.replace(/\s+([,.;:!?])/g, '$1'); // drop stray spaces before punctuation ("foo :" -> "foo:")
  if (!text) return '';
  let s = (text.split(/(?<=[.!?])\s/)[0] || text).trim();
  if (s.length > maxLen) {
    s = s.slice(0, maxLen);
    const cut = s.lastIndexOf(' ');
    s = (cut > 40 ? s.slice(0, cut) : s).trim().replace(/[,;:]$/, '') + '…'; // word boundary
  }
  return s;
}

// Clip a ready-made line (e.g. the meta description) to a banner-friendly length,
// trimming on a word boundary. Used for the subhead.
function clip(text, maxLen = 116) {
  let s = String(text || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > maxLen) {
    s = s.slice(0, maxLen);
    const cut = s.lastIndexOf(' ');
    s = (cut > 40 ? s.slice(0, cut) : s).trim().replace(/[,;:]$/, '') + '…';
  }
  return s;
}

// gpt-image size (multiple of 16, ratio <= 3:1) closest to the blog's target aspect.
function codexSize(width, height) {
  const ratio = width / height;
  return ratio < 1.7 ? { w: 1536, h: 1024 } : { w: 1536, h: 800 };
}

function buildPrompt({ title, subhead, brand, w, h, saveName }) {
  const textColor = brand.dark ? 'white' : 'near-black';
  // autoBg brands: let Codex choose a background that fits the article topic (inferred
  // from the headline) instead of a fixed brand colour. Kept light/uncluttered so the
  // near-black text stays legible and the real logo (composited later) reads cleanly.
  const bgLine = brand.autoBg
    ? `Background: automatically choose a clean, modern, professional background that visually fits the article topic (infer the subject from the headline) — a subtle gradient, soft abstract shapes, or a light topical scene. Keep it light, bright and uncluttered with generous negative space so the ${textColor} text and accents stay clearly readable; do NOT make it busy or dark. Brand accent colour: ${brand.accent}. Primary text colour: ${textColor}.`
    : `Background: ${brand.bg}. Brand accent colour: ${brand.accent}. Primary text colour: ${textColor}.`;
  const lines = [
    `Use the imagegen skill's built-in image_gen tool to generate ONE professional B2B SaaS blog featured banner. Landscape ${w}x${h}, generous negative space.`,
    bgLine,
    `Headline (top-left, large, verbatim): "${title}". Accent the single most important 1-3 word phrase of the headline in ${brand.accent}; keep the rest ${textColor}.`,
    subhead ? `Subhead (smaller, ${textColor}, verbatim): "${subhead}".` : '',
    `Add a tasteful, minimal motif on the right side that fits the article topic, in ${brand.accent} and ${textColor} flat line-art.`,
    `Do NOT draw any logo, brand icon, or wordmark anywhere. Leave the lower-left corner as clean empty background (a real logo is composited there afterward).`,
    brand.url ? `Bottom-right corner: the URL "${brand.url}" as small plain text.` : '',
    `No em-dashes anywhere. Crisp, correctly-spelled text. No watermarks.`,
    `Generate the image ONCE with a single image_gen call. Do not iterate, validate, critique, or regenerate. Immediately save the result into the current working directory as "${saveName}" and stop.`,
  ];
  return lines.filter(Boolean).join('\n');
}

function runCodex(codexBin, prompt, cwd, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
    let proc;
    try {
      // NOTE: 'danger-full-access' (not 'workspace-write') — in this environment,
      // workspace-write's bubblewrap sandbox fails to set up loopback networking
      // ("bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted"), so Codex
      // generates the image but can never save it to disk. This trades away Codex's
      // own sandboxing for the file-save step; the model is still only asked to run
      // one image_gen call + save the result, but there's no OS-level containment if
      // it did something else. Revisit if the underlying sandbox/container issue gets
      // fixed at the infra level.
      proc = spawn(codexBin, ['exec', '-s', 'danger-full-access', '--skip-git-repo-check', '-C', cwd], {
        cwd, env: { ...process.env, NO_COLOR: '1' },
      });
    } catch { return finish(false); }
    // Drain stdout/stderr so the pipe buffer never fills (Codex is verbose). We don't
    // need the text — success = exit code 0 + the saved file. NB: stdio 'ignore'
    // makes Codex hang on Windows, so we must pipe and actively drain instead.
    if (proc.stdout) proc.stdout.on('data', () => {});
    if (proc.stderr) proc.stderr.on('data', () => {});
    const timer = setTimeout(() => {
      try { if (process.platform === 'win32' && proc.pid) spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F']); else proc.kill('SIGKILL'); } catch { /* ignore */ }
      finish(false);
    }, timeoutMs);
    proc.on('error', () => { clearTimeout(timer); finish(false); });
    proc.on('close', (code) => { clearTimeout(timer); finish(code === 0); });
    try { proc.stdin.write(prompt); proc.stdin.end(); } catch { /* ignore */ }
  });
}

// Read the first bytes of a file (for magic-number sniffing). Returns null on error.
function readMagic(p, n = 12) {
  try { const fd = fs.openSync(p, 'r'); const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, 0); fs.closeSync(fd); return b; }
  catch { return null; }
}

// True if the bytes are a raster image sharp can decode (PNG/JPEG/GIF/WebP).
function isRasterImage(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf.slice(0, 4).toString('hex') === '89504e47') return true;                 // PNG
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;                              // JPEG
  if (buf.slice(0, 3).toString('latin1') === 'GIF') return true;                   // GIF
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return true; // WebP
  return false;
}

// Find Codex's actual output image. Codex saves the image via an agentic shell copy
// to `preferredName`, which occasionally leaves a non-image (text/HTML/truncated) at
// that name while the real image sits elsewhere. So: take the preferred file when it's
// a valid raster image, otherwise the newest valid raster image anywhere under `dir`.
function findGeneratedImage(dir, preferredName) {
  const all = [];
  const walk = (d) => {
    let entries; try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else all.push(p);
    }
  };
  walk(dir);
  const pref = path.join(dir, preferredName);
  if (all.includes(pref) && isRasterImage(readMagic(pref))) return pref;
  const images = all
    .filter(p => isRasterImage(readMagic(p)))
    .map(p => { let m = 0; try { m = fs.statSync(p).mtimeMs; } catch { /* ignore */ } return { p, m }; })
    .sort((a, b) => b.m - a.m);
  return images.length ? images[0].p : null;
}

/**
 * Generate a Codex banner for a blog post. Returns a WebP Buffer or null.
 * Retries on transient Codex flakiness (the agentic save step is non-deterministic).
 * @param {string} title       post title (headline)
 * @param {object} blog        blog config (slug/name/context_path/domain)
 * @param {string} blogContent article HTML (subhead fallback if no meta description)
 * @param {object} spec        { width, height } target dimensions
 * @param {function} [onProgress]
 * @param {string} [metaDescription] post meta description — preferred subhead source
 */
async function generateCodexBanner(title, blog = {}, blogContent = '', spec = {}, onProgress = null, metaDescription = '') {
  if (process.env.CODEX_IMAGE_DISABLED === '1') return null;
  const sharp = require('sharp');
  const W = spec.width || 1200, H = spec.height || 630;
  const brand = brandForBlog(blog);
  const codexBin = resolveCodexBin();
  const { w, h } = codexSize(W, H);
  const saveName = 'banner.png';
  // Subhead: use the crafted meta description when present, else fall back to the
  // article's first sentence. (Meta reads better on a banner than the raw opener.)
  const subhead = (metaDescription && metaDescription.trim()) ? clip(metaDescription) : firstSentence(blogContent);
  // Prompt: prefer the blog's LIVE banner-instructions.md (editable, includes the
  // dynamic topic-icon rule); fall back to the built-in buildPrompt if absent.
  const tmpl = loadBannerPrompt(blog);
  const prompt = tmpl
    ? tmpl.replace(/\{\{HEADLINE\}\}/g, title || '')
          .replace(/\{\{SUBHEAD\}\}/g, subhead || '')
          .replace(/\{\{WIDTH\}\}/g, String(w))
          .replace(/\{\{HEIGHT\}\}/g, String(h))
          .replace(/\{\{SAVE_NAME\}\}/g, saveName)
    : buildPrompt({ title, subhead, brand, w, h, saveName });
  const timeoutMs = parseInt(process.env.CODEX_IMAGE_TIMEOUT_MS) || 360000;
  const attempts = Math.max(1, parseInt(process.env.CODEX_IMAGE_RETRIES) || 3);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codexbanner-'));
    try {
      if (onProgress) onProgress(`Codex image_gen generating banner (${brand.key}, attempt ${attempt}/${attempts})…`);
      const ok = await runCodex(codexBin, prompt, tmpDir, timeoutMs);
      const genPath = ok ? findGeneratedImage(tmpDir, saveName) : null;
      if (!genPath) {
        if (onProgress) onProgress(`Codex produced no usable image (attempt ${attempt}/${attempts}) — ${ok ? 'no valid image file found' : 'codex exited non-zero'}`);
        continue; // retry
      }

      // Validate the output decodes before relying on it (guards the flaky save step).
      let base;
      try {
        base = await sharp(genPath).resize(W, H, { fit: 'cover', position: 'centre' }).png().toBuffer();
      } catch (e) {
        if (onProgress) onProgress(`Codex output not decodable (attempt ${attempt}/${attempts}): ${e.message}`);
        continue; // retry
      }

      // Composite the real logo bottom-left.
      const logoPath = resolveLogo(blog);
      if (logoPath) {
        try {
          const logoH = Math.round(52 * (H / 1024));
          const logo = await sharp(logoPath, { density: 384 }).resize({ height: logoH }).png().toBuffer();
          base = await sharp(base)
            .composite([{ input: logo, left: Math.round(72 * (W / 1536)), top: H - logoH - Math.round(60 * (H / 1024)) }])
            .png().toBuffer();
        } catch (e) { if (onProgress) onProgress(`Codex banner logo overlay failed: ${e.message}`); }
      }
      const out = await sharp(base).webp({ quality: 90 }).toBuffer();
      if (onProgress) onProgress(`Codex banner ready: ${Math.round(out.length / 1024)}KB (attempt ${attempt}/${attempts})`);
      return out;
    } catch (e) {
      if (onProgress) onProgress(`Codex image generation error (attempt ${attempt}/${attempts}): ${e.message}`);
      // fall through to retry
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
  if (onProgress) onProgress(`Codex image_gen failed after ${attempts} attempt(s)`);
  return null;
}

module.exports = { generateCodexBanner, brandForBlog, resolveLogo, resolveCodexBin };
