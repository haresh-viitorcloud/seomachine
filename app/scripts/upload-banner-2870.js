// One-off: replace the featured banner of a LaraCopilot post with a pre-generated WebP.
// Uses the authenticated browser-REST path (login -> editor nonce -> in-browser fetch),
// the same mechanism as scripts/fix-lc-posts.js and rankmath-post-meta.js.
require('dotenv').config();
const fs = require('fs');
const { chromium } = require('playwright');

const POST_ID = 2870;
const WEBP = process.env.BANNER_WEBP
  || 'C:/Users/Devendra Chande/AppData/Local/Temp/claude/C--Users-Devendra-Chande-Desktop-seomachine/6c3f12e2-4746-435e-8194-5c1a3ef76634/scratchpad/new-banner-2870.webp';
const FILENAME = 'laravel-forge-pricing-2026.webp';
const FOCUS_KW = 'laravel forge pricing 2026';
const BLOG_TITLE = 'Laravel Forge Pricing 2026, Plans and Costs Compared';
const META = 'Laravel Forge pricing 2026 runs $12 to $39 per month flat across Hobby, Growth, and Business plans. Full cost breakdown plus Forge vs Cloud pricing inside.';

const cfg = {
  wp_url: process.env.BLOG_LC_WP_URL,
  wp_login_url: process.env.BLOG_LC_WP_LOGIN_URL,
  wp_username: process.env.BLOG_LC_WP_USERNAME,
  wp_password: process.env.BLOG_LC_WP_PASSWORD,
};
const base = cfg.wp_url.replace(/\/$/, '');
const imageBase64 = fs.readFileSync(WEBP).toString('base64');

async function login(page) {
  const loginUrl = cfg.wp_login_url || `${base}/wp-login.php`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (const sel of ['#user_login', 'input[name="log"]']) if (await page.$(sel)) { await page.fill(sel, cfg.wp_username); break; }
  for (const sel of ['#user_pass', 'input[name="pwd"]']) if (await page.$(sel)) { await page.fill(sel, cfg.wp_password); break; }
  for (const sel of ['#wp-submit', 'input[type="submit"]']) if (await page.$(sel)) { await page.click(sel); break; }
  await page.waitForURL(/wp-admin/, { timeout: 120000, waitUntil: 'load' });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    ctx.setDefaultNavigationTimeout(180000); ctx.setDefaultTimeout(180000);
    const page = await ctx.newPage();
    console.log(`Logging in to ${base} as ${cfg.wp_username}...`);
    await login(page);
    await page.goto(`${base}/wp-admin/post-new.php`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => !!(window.wpApiSettings && window.wpApiSettings.nonce), { timeout: 90000 });
    console.log('Logged in; nonce acquired. Uploading banner...');

    const res = await page.evaluate(async ({ base, postId, imageBase64, filename, alt, title, caption, description }) => {
      const nonce = window.wpApiSettings?.nonce || '';
      const bytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'image/webp' });
      const form = new FormData();
      form.append('file', blob, filename);
      const up = await fetch(`${base}/wp-json/wp/v2/media`, {
        method: 'POST', headers: { 'X-WP-Nonce': nonce }, body: form, credentials: 'same-origin',
      });
      if (!up.ok) return { ok: false, stage: 'upload', status: up.status, body: (await up.text()).slice(0, 300) };
      const media = await up.json();
      await fetch(`${base}/wp-json/wp/v2/media/${media.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
        body: JSON.stringify({ alt_text: alt, title, caption, description }), credentials: 'same-origin',
      });
      const setF = await fetch(`${base}/wp-json/wp/v2/posts/${postId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
        body: JSON.stringify({ featured_media: media.id }), credentials: 'same-origin',
      });
      const post = await setF.json().catch(() => ({}));
      return { ok: setF.ok, mediaId: media.id, mediaUrl: media.source_url, featured_media: post.featured_media };
    }, { base, postId: POST_ID, imageBase64, filename: FILENAME, alt: META, title: FOCUS_KW, caption: BLOG_TITLE, description: META });

    console.log('Result:', JSON.stringify(res, null, 2));
    if (res.ok && res.featured_media === res.mediaId) console.log('\nFeatured image replaced and verified.');
    else console.log('\nSomething did not verify — check result above.');
  } finally { await browser.close(); }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
