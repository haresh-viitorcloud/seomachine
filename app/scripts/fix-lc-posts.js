#!/usr/bin/env node
/**
 * One-off fixer for already-published LaraCopilot posts that went out BEFORE the
 * table + CTA publishing fixes landed. For each target post it:
 *   1. Converts every legacy `cta-section-modern` box (theme-class markup that renders as
 *      unstyled, non-clickable raw text on laracopilot.com) into the standard self-contained,
 *      inline-styled, CLICKABLE <a>-based CTA — white text, red pill, linking to the register
 *      URL — preserving the box's own contextual heading/description/button copy.
 *   2. Wraps every bare <table> in a scrollable, inline-styled Custom-HTML block, identical to
 *      what segmentToBlock()/styleTableHtml() now emit for new posts (theme-independent).
 *
 * Auth: laracopilot.com blocks anonymous REST (403), so this runs through the same
 * authenticated browser session the app uses — Playwright login, then in-browser fetch to the
 * REST API with the editor nonce (same mechanism as scripts/rankmath-post-meta.js). Content is
 * updated via POST /wp-json/wp/v2/posts/:id { content } — surgical, leaves title/slug/meta/
 * featured image/categories untouched, and keeps the post published.
 *
 * Usage (run from app/):
 *   DRY_RUN=1 node scripts/fix-lc-posts.js     # inspect transforms, write nothing
 *   node scripts/fix-lc-posts.js               # apply the fixes
 *
 * Targets (override with SLUGS="a,b,c"):
 *   laravel-forge-pricing-2026, laravel-vs-hugging-face, laravel-saas-app-with-ai
 */
require('dotenv').config();
const { chromium } = require('playwright');

const SLUG = 'lc';
const CTA_LINK = 'https://builder.laracopilot.com/register';
const TARGET_SLUGS = (process.env.SLUGS
  || 'laravel-forge-pricing-2026,laravel-vs-hugging-face,laravel-saas-app-with-ai')
  .split(',').map(s => s.trim()).filter(Boolean);
const DRY = !!process.env.DRY_RUN;

// ── Brand CTA styling (mirrors ctaService.buildInlineCtaHtml) ──
const CTA = { bg: '#1A1A1A', text: '#FBFAF7', btnBg: '#F53003', btnText: '#FFFFFF' };

function buildInlineCta({ heading, description, button }) {
  const h = (heading || 'Build your Laravel app with AI').trim();
  const d = (description || '').trim();
  const b = (button || 'Get started free').trim();
  const descP = d
    ? `\n<p style="color:${CTA.text};opacity:0.85;font-size:16px;line-height:1.6;margin:0 0 24px;">${d}</p>`
    : '';
  // Wrapped as a WordPress "Custom HTML" block so the editor keeps it intact and it renders
  // identically regardless of theme CSS. The <a> makes it clickable everywhere.
  return `<!-- wp:html -->
<div style="background:${CTA.bg};border-radius:16px;padding:40px 32px;margin:32px 0;text-align:center;">
<p style="color:${CTA.text};font-size:24px;font-weight:700;line-height:1.3;margin:0 0 12px;">${h}</p>${descP}
<a href="${CTA_LINK}" style="display:inline-block;background:${CTA.btnBg};color:${CTA.btnText};font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">${b}</a>
</div>
<!-- /wp:html -->`;
}

// ── Table styling (identical to wordpressService.styleTableHtml) ──
function styleTableHtml(html) {
  const T  = 'width:100%;border-collapse:collapse;margin:24px 0;font-size:15px;line-height:1.5;';
  const TH = 'border:1px solid #E5E2DC;padding:10px 14px;text-align:left;background:#F7F5F2;color:#1A1A1A;font-weight:700;';
  const TD = 'border:1px solid #E5E2DC;padding:10px 14px;text-align:left;vertical-align:top;color:#1A1A1A;';
  return String(html)
    .replace(/<table\b((?:(?!style=)[^>])*)>/gi, `<table$1 style="${T}">`)
    .replace(/<th\b((?:(?!style=)[^>])*)>/gi,    `<th$1 style="${TH}">`)
    .replace(/<td\b((?:(?!style=)[^>])*)>/gi,    `<td$1 style="${TD}">`);
}

function extract(block, re, fallback) {
  const m = block.match(re);
  return m ? m[1].trim() : fallback;
}

// Convert legacy CTA boxes → inline clickable CTA. Handles both the wp:html-wrapped form and a
// bare div, collapsing either into one clean wp:html block. Returns [newHtml, count].
function fixCtas(raw) {
  let count = 0;
  const rebuild = (block) => {
    count++;
    const heading = extract(block, /class="cta-headings"[^>]*>([\s\S]*?)<\/p>/i, '');
    const description = extract(block, /class="cta-descriptions"[^>]*>([\s\S]*?)<\/p>/i, '');
    const button = extract(block, /class="cta-button-modern"[^>]*>([\s\S]*?)<\/button>/i, 'Get started free');
    return buildInlineCta({ heading, description, button });
  };
  const DIV = `<div class="cta-section-modern"[\\s\\S]*?<\\/div>\\s*<\\/div>`;
  // A) wp:html-wrapped legacy CTA → replace the whole block
  let out = raw.replace(new RegExp(`<!--\\s*wp:html\\s*-->\\s*${DIV}\\s*<!--\\s*/wp:html\\s*-->`, 'gi'), rebuild);
  // B) any remaining bare CTA div
  out = out.replace(new RegExp(DIV, 'gi'), rebuild);
  return [out, count];
}

// Wrap + inline-style every bare <table>. Idempotent: skips tables already styled/wrapped.
function fixTables(raw) {
  let count = 0;
  const out = raw.replace(/<table\b[\s\S]*?<\/table>/gi, (tbl) => {
    if (/width:100%;border-collapse/.test(tbl)) return tbl; // already our styled table
    count++;
    return `<div style="overflow-x:auto;">${styleTableHtml(tbl)}</div>`;
  });
  return [out, count];
}

function transform(raw) {
  const [afterCta, ctaCount] = fixCtas(raw);
  const [afterTables, tableCount] = fixTables(afterCta);
  return { html: afterTables, ctaCount, tableCount, changed: afterTables !== raw };
}

// ── Browser session helpers (same pattern as rankmath-post-meta.js) ──
function blogEnv(slug) {
  const S = slug.toUpperCase();
  const cfg = {
    wp_url: process.env[`BLOG_${S}_WP_URL`],
    wp_login_url: process.env[`BLOG_${S}_WP_LOGIN_URL`],
    wp_username: process.env[`BLOG_${S}_WP_USERNAME`],
    wp_password: process.env[`BLOG_${S}_WP_PASSWORD`],
  };
  if (!cfg.wp_url || !cfg.wp_username || !cfg.wp_password) {
    throw new Error(`Missing BLOG_${S}_WP_URL / _WP_USERNAME / _WP_PASSWORD in .env`);
  }
  return cfg;
}

async function login(page, cfg) {
  const base = cfg.wp_url.replace(/\/$/, '');
  const loginUrl = cfg.wp_login_url || `${base}/wp-login.php`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (const sel of ['#user_login', 'input[name="log"]', 'input[type="text"][name*="user"]', 'input[type="email"]']) {
    if (await page.$(sel)) { await page.fill(sel, cfg.wp_username); break; }
  }
  for (const sel of ['#user_pass', 'input[name="pwd"]', 'input[type="password"]']) {
    if (await page.$(sel)) { await page.fill(sel, cfg.wp_password); break; }
  }
  for (const sel of ['#wp-submit', 'input[type="submit"]', 'button[type="submit"]']) {
    if (await page.$(sel)) { await page.click(sel); break; }
  }
  await page.waitForURL(/wp-admin/, { timeout: 120000, waitUntil: 'load' });
}

// Get a REST nonce by loading an admin page (post-new gives us wpApiSettings.nonce).
async function ensureNonce(page, base) {
  await page.goto(`${base}/wp-admin/post-new.php`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!(window.wpApiSettings && window.wpApiSettings.nonce), { timeout: 90000 });
}

async function apiGet(page, base, path) {
  return page.evaluate(async ({ base, path }) => {
    const nonce = window.wpApiSettings?.nonce || '';
    const r = await fetch(`${base}${path}`, { headers: { 'X-WP-Nonce': nonce }, credentials: 'same-origin' });
    return { ok: r.ok, status: r.status, body: r.ok ? await r.json() : await r.text() };
  }, { base, path });
}

async function apiUpdateContent(page, base, postId, content) {
  return page.evaluate(async ({ base, postId, content }) => {
    const nonce = window.wpApiSettings?.nonce || '';
    const r = await fetch(`${base}/wp-json/wp/v2/posts/${postId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
      credentials: 'same-origin',
      body: JSON.stringify({ content }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, renderedLen: (j.content?.rendered || '').length };
  }, { base, postId, content });
}

(async () => {
  const cfg = blogEnv(SLUG);
  const base = cfg.wp_url.replace(/\/$/, '');
  console.log(`Mode: ${DRY ? 'DRY RUN (no writes)' : 'APPLY'} | CTA link: ${CTA_LINK}`);
  console.log(`Targets: ${TARGET_SLUGS.join(', ')}\n`);

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    ctx.setDefaultNavigationTimeout(180000);
    ctx.setDefaultTimeout(180000);
    const page = await ctx.newPage();

    console.log(`Logging in to ${base} as ${cfg.wp_username}...`);
    await login(page, cfg);
    await ensureNonce(page, base);
    console.log('Logged in; REST nonce acquired.\n');

    for (const slug of TARGET_SLUGS) {
      console.log(`── ${slug} ──`);
      // Resolve slug → id and pull the EDITABLE (raw block markup) content.
      const list = await apiGet(page, base, `/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&status=publish,draft&context=edit&_fields=id,slug,content`);
      if (!list.ok || !Array.isArray(list.body) || !list.body.length) {
        console.log(`  ⚠ not found (status ${list.status}) — skipping\n`); continue;
      }
      const post = list.body[0];
      const raw = post.content?.raw || '';
      const { html, ctaCount, tableCount, changed } = transform(raw);
      console.log(`  post id ${post.id} | CTA boxes converted: ${ctaCount} | tables styled: ${tableCount} | changed: ${changed}`);

      if (!changed) { console.log('  nothing to change — skipping\n'); continue; }

      if (DRY) {
        const i = html.indexOf('builder.laracopilot.com');
        if (i !== -1) console.log('  new CTA snippet:\n   ', html.slice(Math.max(0, i - 180), i + 90).replace(/\s+/g, ' '));
        const t = html.indexOf('overflow-x:auto');
        if (t !== -1) console.log('  new table snippet:\n   ', html.slice(t - 20, t + 180).replace(/\s+/g, ' '));
        console.log('');
        continue;
      }

      const res = await apiUpdateContent(page, base, post.id, html);
      console.log(`  update -> ${res.ok ? 'OK' : 'FAILED'} (status ${res.status}, rendered ${res.renderedLen} chars)`);
      // Verify persistence: re-read raw and check markers.
      const verify = await apiGet(page, base, `/wp-json/wp/v2/posts/${post.id}?context=edit&_fields=content`);
      const vraw = verify.body?.content?.raw || '';
      const okCta = vraw.includes('builder.laracopilot.com/register');
      const okNoLegacy = !/cta-section-modern/.test(vraw);
      const okTables = tableCount === 0 || /overflow-x:auto/.test(vraw);
      console.log(`  verify -> register link:${okCta} | legacy CTA gone:${okNoLegacy} | tables wrapped:${okTables}\n`);
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
