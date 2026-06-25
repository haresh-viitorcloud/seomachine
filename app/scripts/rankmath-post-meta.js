#!/usr/bin/env node
/**
 * One-off helper: read or write Rank Math SEO meta (title, description, focus keyword) and the
 * URL slug for a single WordPress post, using the same authenticated browser session the app
 * uses for LaraCopilot (Playwright login + in-browser REST with the editor nonce).
 *
 * The site blocks anonymous REST (403), so this MUST run through a logged-in session.
 *
 * Usage (run from app/):
 *   node scripts/rankmath-post-meta.js <blogSlug> <postId> read
 *   node scripts/rankmath-post-meta.js <blogSlug> <postId> write
 *
 * For `write`, the values are taken from env vars:
 *   RM_TITLE, RM_DESC, RM_SLUG, RM_FOCUS
 *
 * Example:
 *   node scripts/rankmath-post-meta.js lc 2947 read
 *   RM_TITLE="..." RM_DESC="..." RM_SLUG="..." RM_FOCUS="..." \
 *     node scripts/rankmath-post-meta.js lc 2947 write
 */
require('dotenv').config();
const { chromium } = require('playwright');

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
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const userSelectors = ['#user_login', 'input[name="log"]', 'input[type="text"][name*="user"]', 'input[type="email"]'];
  const passSelectors = ['#user_pass', 'input[name="pwd"]', 'input[type="password"]'];
  const submitSelectors = ['#wp-submit', 'input[type="submit"]', 'button[type="submit"]'];

  let filled = false;
  for (const sel of userSelectors) {
    if (await page.$(sel)) { await page.fill(sel, cfg.wp_username); filled = true; break; }
  }
  if (!filled) throw new Error(`Could not find username field on login page: ${loginUrl}`);
  for (const sel of passSelectors) {
    if (await page.$(sel)) { await page.fill(sel, cfg.wp_password); break; }
  }
  for (const sel of submitSelectors) {
    if (await page.$(sel)) { await page.click(sel); break; }
  }
  await page.waitForURL(/wp-admin/, { timeout: 20000 });
}

async function openEditor(page, base, postId) {
  const editorUrl = `${base}/wp-admin/post.php?post=${postId}&action=edit`;
  await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait for the REST nonce to be available
  await page.waitForFunction(
    () => !!(window.wpApiSettings && window.wpApiSettings.nonce),
    { timeout: 20000 }
  ).catch(() => {});
}

async function readPost(page, base, postId) {
  return page.evaluate(async ({ base, postId }) => {
    const nonce = window.wpApiSettings?.nonce || '';
    const r = await fetch(`${base}/wp-json/wp/v2/posts/${postId}?context=edit`, {
      headers: { 'X-WP-Nonce': nonce },
      credentials: 'same-origin',
    });
    if (!r.ok) return { error: `GET ${r.status}` };
    const p = await r.json();
    const meta = p.meta || {};
    return {
      id: p.id,
      title: p.title?.raw ?? p.title?.rendered ?? '',
      slug: p.slug,
      link: p.link,
      status: p.status,
      excerpt: (p.excerpt?.raw ?? p.excerpt?.rendered ?? '').replace(/<[^>]+>/g, '').trim(),
      contentText: (p.content?.raw ?? p.content?.rendered ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500),
      rank_math_title: meta.rank_math_title || '',
      rank_math_description: meta.rank_math_description || '',
      rank_math_focus_keyword: meta.rank_math_focus_keyword || '',
      metaKeysPresent: Object.keys(meta).filter(k => k.startsWith('rank_math')),
    };
  }, { base, postId });
}

async function writeMeta(page, base, postId, vals) {
  return page.evaluate(async ({ base, postId, vals }) => {
    const nonce = window.wpApiSettings?.nonce || '';
    const body = { meta: {} };
    if (vals.title) body.meta.rank_math_title = vals.title;
    if (vals.desc) body.meta.rank_math_description = vals.desc;
    if (vals.focus) body.meta.rank_math_focus_keyword = vals.focus;
    if (vals.slug) body.slug = vals.slug;
    const r = await fetch(`${base}/wp-json/wp/v2/posts/${postId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const json = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, savedSlug: json.slug, savedMeta: json.meta };
  }, { base, postId, vals });
}

(async () => {
  const [slug, postIdArg, mode = 'read'] = process.argv.slice(2);
  if (!slug || !postIdArg) {
    console.error('Usage: node scripts/rankmath-post-meta.js <blogSlug> <postId> [read|write]');
    process.exit(1);
  }
  const postId = parseInt(postIdArg, 10);
  const cfg = blogEnv(slug);
  const base = cfg.wp_url.replace(/\/$/, '');

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    console.log(`Logging in to ${base} as ${cfg.wp_username}...`);
    await login(page, cfg);
    console.log('Logged in. Opening editor for post', postId, '...');
    await openEditor(page, base, postId);

    const before = await readPost(page, base, postId);
    console.log('\n=== POST', postId, '(current) ===');
    console.log(JSON.stringify(before, null, 2));

    if (mode === 'write') {
      const vals = {
        title: process.env.RM_TITLE || '',
        desc: process.env.RM_DESC || '',
        slug: process.env.RM_SLUG || '',
        focus: process.env.RM_FOCUS || '',
      };
      console.log('\n=== WRITING ===');
      console.log(JSON.stringify(vals, null, 2));
      const res = await writeMeta(page, base, postId, vals);
      console.log('Write result:', JSON.stringify(res, null, 2));

      // Re-read to verify it actually persisted (proves the MU-plugin is registered)
      const after = await readPost(page, base, postId);
      console.log('\n=== POST', postId, '(after) ===');
      console.log(JSON.stringify({
        slug: after.slug,
        rank_math_title: after.rank_math_title,
        rank_math_description: after.rank_math_description,
        rank_math_focus_keyword: after.rank_math_focus_keyword,
      }, null, 2));

      const persisted = after.rank_math_title === vals.title && (!vals.desc || after.rank_math_description === vals.desc);
      console.log(persisted
        ? '\n✅ VERIFIED: Rank Math meta persisted — MU-plugin is working.'
        : '\n❌ NOT PERSISTED: rank_math_* came back empty/unchanged — the MU-plugin is NOT registering these keys for REST (check it is in wp-content/mu-plugins/ and Rank Math is active).');
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
