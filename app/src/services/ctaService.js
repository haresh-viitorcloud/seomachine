/**
 * CTA service — builds the theme's "cta-section-modern" call-to-action blocks.
 *
 * Background images are configured per blog in config/cta-config.json as RELATIVE paths;
 * the blog's own domain (wp_url) is prepended at build time, so the same config resolves
 * to staging or production automatically. Categories can be added/updated/removed there.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config/cta-config.json');

// Categories the generator may assign; must match keys in cta-config.json.
const VALID_CATEGORIES = [
  'ai', 'cloud', 'digital_transformation', 'data',
  'technology_consulting', 'digital_experience', 'default',
];

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    // Minimal fallback so generation never breaks if the file is missing/invalid
    return { default: { categories: { default: '/wp-content/uploads/2024/09/vc-tech-cta-scaled.webp' } } };
  }
}

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Whether the modern CTA banner should be injected for this blog. Blogs listed in
// the config's "disabled" array opt out (e.g. brands that don't have their own CTA
// banner asset and should not inherit another brand's default image).
function isCtaEnabled(blogSlug) {
  const cfg = loadConfig();
  const disabled = Array.isArray(cfg.disabled) ? cfg.disabled : [];
  return !disabled.includes(blogSlug);
}

// Resolve the relative image path for a blog + category, with sensible fallbacks.
function getImagePath(blogSlug, category) {
  const cfg = loadConfig();
  const cat = VALID_CATEGORIES.includes(category) ? category : 'default';
  const blogCats = (cfg[blogSlug] && cfg[blogSlug].categories) || {};
  const defCats = (cfg.default && cfg.default.categories) || {};
  return blogCats[cat] || defCats[cat] || blogCats.default || defCats.default || '';
}

// Full image URL — relative path resolved against the blog's own domain (stg/prod auto).
function getImageUrl(blogSlug, category, siteUrl) {
  const p = getImagePath(blogSlug, category);
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p; // allow absolute overrides in config
  return String(siteUrl || '').replace(/\/$/, '') + p;
}

// Builds one CTA block using the theme's exact markup. Used by blogs whose theme
// actually ships the cta-* CSS classes (e.g. viitorcloud.com). For blogs without that
// CSS, use the self-contained inline CTA below (see getStandardCta/buildInlineCtaHtml).
function buildCtaHtml(cta, imageUrl) {
  const bg = imageUrl ? `background: url('${imageUrl}') no-repeat center center/cover;` : '';
  return `<div class="cta-section-modern" style="${bg}">
<div class="cta-content-modern">
<p class="cta-headings">${escapeHtml(cta.heading)}</p>
<p class="cta-descriptions">${escapeHtml(cta.description)}</p>
<button class="cta-button-modern">${escapeHtml(cta.button)}</button>
</div>
</div>`;
}

// Returns the fixed "standard" CTA config for a blog (from cta-config.json → standard[slug]),
// or null. Blogs with a standard CTA get ONE self-contained inline CTA appended per post.
function getStandardCta(blogSlug) {
  const cfg = loadConfig();
  const std = cfg.standard && cfg.standard[blogSlug];
  return std && std.link ? std : null;
}

// Builds a fully self-contained, inline-styled CTA with a clickable <a> link. It carries
// ALL its own styling, so it renders identically regardless of theme CSS (no dependency on
// theme classes) and the <a> makes it clickable everywhere. The leading comment marks it as
// a WordPress "Custom HTML" block; htmlToGutenbergBlocks() wraps any <div> in <!-- wp:html -->.
function buildInlineCtaHtml(std) {
  const bg = std.bg || '#1A1A1A';
  const text = std.text || '#FBFAF7';
  const btnBg = std.buttonBg || '#F53003';
  const btnText = std.buttonText || '#FFFFFF';
  const heading = escapeHtml(std.heading || '');
  const description = escapeHtml(std.description || '');
  const button = escapeHtml(std.button || 'Get started free');
  const href = escapeHtml(std.link);
  return `<!-- CTA — WordPress "Custom HTML" block; self-contained inline styles, no theme-CSS dependency -->
<div style="background:${bg};border-radius:16px;padding:40px 32px;margin:32px 0;text-align:center;">
<p style="color:${text};font-size:24px;font-weight:700;line-height:1.3;margin:0 0 12px;">${heading}</p>
<p style="color:${text};opacity:0.85;font-size:16px;line-height:1.6;margin:0 0 24px;">${description}</p>
<a href="${href}" style="display:inline-block;background:${btnBg};color:${btnText};font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">${button}</a>
</div>`;
}

module.exports = { getImagePath, getImageUrl, buildCtaHtml, isCtaEnabled, VALID_CATEGORIES, getStandardCta, buildInlineCtaHtml };
