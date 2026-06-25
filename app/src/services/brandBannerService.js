/**
 * brandBannerService — render a featured banner by compositing the post headline,
 * a short meta-description subtext, and the real logo over one of the blog's brand
 * background images (blogs/{slug}/context/BG/*.png|jpg|webp). Fully deterministic
 * (sharp + SVG text), no AI model and no network. Returns a WebP Buffer, or null if
 * no BG image is available (caller then falls back).
 *
 * This is the strict renderer for "brand banner" blogs (e.g. ViitorCloud) that must
 * use their own approved background gradients rather than an AI-generated background.
 */
const fs = require('fs');
const path = require('path');
const { brandForBlog, resolveLogo } = require('./codexImageService');

// Resolve BG dir under either path convention ("./blogs/..." root-relative or
// "../blogs/..." app-relative), mirroring resolveLogo.
const REPO_ROOT = path.join(__dirname, '../../..');
const APP_ROOT = path.join(__dirname, '../..');
const IMG_RE = /\.(png|jpe?g|webp)$/i;

function resolveBgDir(blog) {
  if (!blog || !blog.context_path) return null;
  for (const base of [REPO_ROOT, APP_ROOT]) {
    const dir = path.resolve(base, blog.context_path, 'BG');
    try { if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir; } catch { /* ignore */ }
  }
  return null;
}

// List the BG image files in the blog's BG folder (absolute paths).
function listBgImages(blog) {
  const dir = resolveBgDir(blog);
  if (!dir) return [];
  try { return fs.readdirSync(dir).filter(f => IMG_RE.test(f)).sort().map(f => path.join(dir, f)); }
  catch { return []; }
}

function escapeXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Greedy word-wrap to at most maxLines lines of ~maxChars chars; appends an ellipsis
// to the last line if the text was truncated.
function wrap(text, maxChars, maxLines) {
  const norm = String(text || '').replace(/\s+/g, ' ').trim();
  if (!norm) return [];
  const words = norm.split(' ');
  const lines = [];
  let cur = '';
  let used = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!cur) { cur = w; }
    else if ((cur + ' ' + w).length <= maxChars) { cur += ' ' + w; }
    else {
      lines.push(cur); cur = w;
      if (lines.length === maxLines) break;
    }
    used = i + 1;
  }
  if (lines.length < maxLines && cur) { lines.push(cur); used = words.length; }
  if (used < words.length && lines.length) {
    let last = lines[lines.length - 1];
    if (last.length > maxChars - 1) last = last.slice(0, maxChars - 1);
    lines[lines.length - 1] = last.replace(/[\s,;:.]+$/, '') + '…';
  }
  return lines;
}

/**
 * Render a brand banner. Returns a WebP Buffer or null (no BG available / error).
 * @param {string} title          post headline
 * @param {object} blog           blog config (slug/name/context_path/domain)
 * @param {object} spec           { width, height } target dimensions
 * @param {string} [metaDescription] subtext source (kept short — 2 lines)
 * @param {function} [onProgress]
 */
async function generateBrandBanner(title, blog = {}, spec = {}, metaDescription = '', onProgress = null) {
  const sharp = require('sharp');
  const W = spec.width || 1200, H = spec.height || 630;
  const bgs = listBgImages(blog);
  if (!bgs.length) { if (onProgress) onProgress('No brand BG image found — falling back'); return null; }
  // Vary the background per generation for visual variety across posts.
  const bgPath = bgs[Math.floor(Math.random() * bgs.length)];
  const brand = brandForBlog(blog);
  const light = brand.dark === false;

  try {
    if (onProgress) onProgress(`Rendering brand banner over ${path.basename(bgPath)}…`);
    const s = H / 1008;                       // type scale (designed against 1008px tall)
    const padX = Math.round(96 * (W / 1520));
    const hlSize = Math.round(64 * s), hlLine = Math.round(78 * s);
    const subSize = Math.round(27 * s), subLine = Math.round(37 * s);
    const urlSize = Math.round(22 * s);
    const textColor = light ? '#10243F' : '#FFFFFF';
    const subColor = light ? '#33475B' : '#E7EEF7';

    // Headline: wrap to the left ~64% of the canvas, up to 5 lines.
    const hlMaxChars = Math.max(12, Math.round((W * 0.64) / (hlSize * 0.56)));
    const hlLines = wrap(title, hlMaxChars, 5);
    // Subtext: keep it SHORT — 2 lines max over ~52% width (meta is otherwise too long).
    const subMaxChars = Math.max(20, Math.round((W * 0.52) / (subSize * 0.52)));
    const subLines = wrap(metaDescription, subMaxChars, 2);

    const topY = Math.round(150 * s);                              // baseline of first headline line
    const accentY = topY - Math.round(hlSize * 1.05);              // accent bar sits above headline
    const accent = `<rect x="${padX}" y="${accentY}" width="${Math.round(70 * s)}" height="${Math.round(6 * s)}" rx="${Math.round(3 * s)}" fill="${brand.accent}"/>`;
    const hlText = hlLines.map((ln, i) =>
      `<text x="${padX}" y="${topY + i * hlLine}" font-family="Arial, Helvetica, sans-serif" font-size="${hlSize}" font-weight="700" fill="${textColor}">${escapeXml(ln)}</text>`).join('');
    const subY = topY + hlLines.length * hlLine + Math.round(30 * s);
    const subText = subLines.map((ln, i) =>
      `<text x="${padX}" y="${subY + i * subLine}" font-family="Arial, Helvetica, sans-serif" font-size="${subSize}" font-weight="400" fill="${subColor}">${escapeXml(ln)}</text>`).join('');
    const urlText = brand.url
      ? `<text x="${W - padX}" y="${H - Math.round(52 * s)}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${urlSize}" fill="${subColor}">${escapeXml(brand.url)}</text>`
      : '';
    // Subtle left scrim so white text stays legible over lighter parts of a gradient.
    const scrim = light ? '' :
      `<defs><linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#06122A" stop-opacity="0.40"/><stop offset="0.62" stop-color="#06122A" stop-opacity="0"/></linearGradient></defs><rect x="0" y="0" width="${W}" height="${H}" fill="url(#scrim)"/>`;

    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${scrim}${accent}${hlText}${subText}${urlText}</svg>`;

    let base = await sharp(bgPath).resize(W, H, { fit: 'cover', position: 'centre' }).png().toBuffer();
    base = await sharp(base).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();

    const logoPath = resolveLogo(blog);
    if (logoPath) {
      try {
        const logoH = Math.round(52 * (H / 1024));
        const logo = await sharp(logoPath, { density: 384 }).resize({ height: logoH }).png().toBuffer();
        base = await sharp(base)
          .composite([{ input: logo, left: Math.round(72 * (W / 1536)), top: H - logoH - Math.round(60 * (H / 1024)) }])
          .png().toBuffer();
      } catch (e) { if (onProgress) onProgress(`brand banner logo overlay failed: ${e.message}`); }
    }
    let out = await sharp(base).webp({ quality: 86 }).toBuffer();
    if (out.length > 180 * 1024) out = await sharp(base).webp({ quality: 72 }).toBuffer();
    if (onProgress) onProgress(`Brand banner ready: ${Math.round(out.length / 1024)}KB (${path.basename(bgPath)})`);
    return out;
  } catch (e) {
    if (onProgress) onProgress(`Brand banner render failed: ${e.message}`);
    return null;
  }
}

module.exports = { generateBrandBanner, resolveBgDir, listBgImages };
