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
const BRANDS = {
  vc:          { accent: '#FFB14E', bg: 'a deep teal-to-blue gradient', dark: true,  url: 'www.viitorcloud.com' },
  lc:          { accent: '#F53003', bg: 'a clean light cream background (#F7F5F2)', dark: false, url: 'laracopilot.com' },
  everycred:   { accent: '#1E4383', bg: 'a clean light off-white background', dark: false, url: 'everycred.com' },
  everyticket: { accent: '#D50355', bg: 'a clean light off-white background', dark: false, url: 'everyticket.in' },
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

// gpt-image size (multiple of 16, ratio <= 3:1) closest to the blog's target aspect.
function codexSize(width, height) {
  const ratio = width / height;
  return ratio < 1.7 ? { w: 1536, h: 1024 } : { w: 1536, h: 800 };
}

function buildPrompt({ title, subhead, brand, w, h, saveName }) {
  const textColor = brand.dark ? 'white' : 'near-black';
  const lines = [
    `Use the imagegen skill's built-in image_gen tool to generate ONE professional B2B SaaS blog featured banner. Landscape ${w}x${h}, generous negative space.`,
    `Background: ${brand.bg}. Brand accent colour: ${brand.accent}. Primary text colour: ${textColor}.`,
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
      proc = spawn(codexBin, ['exec', '-s', 'workspace-write', '--skip-git-repo-check', '-C', cwd], {
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

/**
 * Generate a Codex banner for a blog post. Returns a WebP Buffer or null.
 * @param {string} title       post title (headline)
 * @param {object} blog        blog config (slug/name/context_path/domain)
 * @param {string} blogContent article HTML (for the subhead)
 * @param {object} spec        { width, height } target dimensions
 * @param {function} [onProgress]
 */
async function generateCodexBanner(title, blog = {}, blogContent = '', spec = {}, onProgress = null) {
  if (process.env.CODEX_IMAGE_DISABLED === '1') return null;
  const sharp = require('sharp');
  const W = spec.width || 1200, H = spec.height || 630;
  const brand = brandForBlog(blog);
  const codexBin = resolveCodexBin();

  const { w, h } = codexSize(W, H);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codexbanner-'));
  const saveName = 'banner.png';
  const prompt = buildPrompt({ title, subhead: firstSentence(blogContent), brand, w, h, saveName });

  try {
    if (onProgress) onProgress(`Codex image_gen generating banner (${brand.key})…`);
    const ok = await runCodex(codexBin, prompt, tmpDir, parseInt(process.env.CODEX_IMAGE_TIMEOUT_MS) || 360000);
    const genPath = path.join(tmpDir, saveName);
    if (!ok || !fs.existsSync(genPath)) {
      if (onProgress) onProgress('Codex image_gen produced no file — falling back');
      return null;
    }

    // Resize/cover to the blog's exact spec, then composite the real logo bottom-left.
    let img = sharp(genPath).resize(W, H, { fit: 'cover', position: 'centre' });
    let base = await img.png().toBuffer();
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
    if (onProgress) onProgress(`Codex banner ready: ${Math.round(out.length / 1024)}KB`);
    return out;
  } catch (e) {
    if (onProgress) onProgress(`Codex image generation failed: ${e.message}`);
    return null;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

module.exports = { generateCodexBanner, brandForBlog, resolveLogo, resolveCodexBin };
