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

// Builds one CTA block using the theme's exact markup.
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

module.exports = { getImagePath, getImageUrl, buildCtaHtml, isCtaEnabled, VALID_CATEGORIES };
