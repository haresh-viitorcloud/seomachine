/**
 * WordPress posting service.
 * Primary method: WordPress REST API with Application Password (reliable, no browser needed).
 * Fallback method: Playwright browser automation (works with any WP install).
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const imageService = require('./imageService');
const ctaService = require('./ctaService');

/**
 * Posts a blog draft to WordPress using the configured method.
 *
 * @param {object} config - Blog configuration (wp_url, wp_username, wp_password, etc.)
 * @param {object} content - Generated content { title, content, meta_description, tags, faq }
 * @param {object} rowData - Original spreadsheet row data
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{ post_id: number, post_url: string, edit_url: string }>}
 */
async function postDraft(config, content, rowData, onProgress) {
  const method = config.wp_method || 'api';

  if (method === 'api' && config.wp_app_password) {
    return postViaRestApi(config, content, rowData, onProgress);
  } else {
    return postViaBrowser(config, content, rowData, onProgress);
  }
}

// ─────────────────────────────────────────────────────────────
// REST API method
// ─────────────────────────────────────────────────────────────

/**
 * Posts a draft via WordPress REST API using Application Password.
 * Requires WP 5.6+ with Application Passwords enabled.
 */
async function postViaRestApi(config, content, rowData, onProgress) {
  const apiBase = `${config.wp_url.replace(/\/$/, '')}/wp-json/wp/v2`;

  const credentials = Buffer.from(
    `${config.wp_username}:${config.wp_app_password}`
  ).toString('base64');

  const headers = {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };

  if (onProgress) onProgress('Authenticating with WordPress REST API...');

  // Verify auth
  try {
    await axios.get(`${apiBase}/users/me`, { headers, timeout: 15000 });
  } catch (err) {
    throw new Error(`WordPress API auth failed: ${err.response?.data?.message || err.message}`);
  }

  // ── Check for existing post by same author — update instead of creating duplicate ──
  if (onProgress) onProgress('Checking for existing post...');
  const existingId = await findExistingPostApi(apiBase, headers, content.title, parseInt(config.wp_author_id) || 1);
  if (existingId) {
    if (onProgress) onProgress(`Found existing post ID ${existingId} — updating instead of creating new`);
  } else {
    if (onProgress) onProgress('No existing post found — creating new draft...');
  }

  // Discover the real taxonomy REST bases (this install uses post_tag + a custom industry taxonomy)
  const taxBases = await discoverTaxonomyBases(apiBase, headers);

  // Resolve category IDs from sheet data (theme / target_industry) + fallback to config default
  if (onProgress) onProgress('Resolving categories, tags and industries...');
  const categoryIds = await resolveCategories(apiBase, headers, rowData, config);

  // Resolve or create tags from both sheet secondary_keywords + generated tags
  const tagIds = await resolveTags(apiBase, headers, content, rowData, taxBases.tag);

  // Resolve or create the custom industry taxonomy term (parity with the browser path)
  const industryIds = await resolveTermsInTaxonomy(
    apiBase, headers, taxBases.industry, [rowData.target_industry].filter(Boolean)
  );

  // Build FAQ HTML and convert full content to native Gutenberg blocks
  const fullContent = htmlToGutenbergBlocks(composeContentHtml(content, { siteUrl: config.wp_url, blogSlug: config.slug }));

  // Generate and upload featured image
  let featuredMediaId = null;
  let imageSource = '';
  try {
    if (onProgress) onProgress('Generating featured image...');
    const img = await imageService.saveTempImage(content.title, rowData.primary_keyword, rowData.theme, content.image_prompt, config);
    imageSource = img.source || '';
    if (onProgress) onProgress(`Featured image created via ${imageSource} (${Math.round(img.size / 1024)}KB) — uploading...`);

    const form = new FormData();
    // Use the in-memory buffer (saveTempImage returns it) rather than a read stream —
    // a stream 'error' event can escape this try/catch and crash the process.
    form.append('file', img.buffer, {
      filename: `${slugify(content.title)}.webp`,
      contentType: 'image/webp',
    });
    const mediaRes = await axios.post(`${apiBase}/media`, form, {
      headers: { ...headers, ...form.getHeaders() },
      timeout: 30000,
    });
    featuredMediaId = mediaRes.data.id;
    fs.unlink(img.path, () => {});
    if (onProgress) onProgress(`Featured image uploaded — Media ID: ${featuredMediaId}`);
  } catch (imgErr) {
    if (onProgress) onProgress(`Featured image skipped: ${imgErr.message}`);
  }

  // Set the featured image alt text (Rank Math: "focus keyword in image alt")
  if (featuredMediaId && (content.image_alt || rowData.primary_keyword)) {
    try {
      await axios.post(`${apiBase}/media/${featuredMediaId}`,
        { alt_text: content.image_alt || rowData.primary_keyword },
        { headers, timeout: 15000 });
    } catch { /* non-fatal */ }
  }

  const seoTitle = content.seo_title || content.title;
  const postPayload = {
    title: content.title,
    content: fullContent,
    excerpt: content.meta_description || '',
    status: 'draft',
    categories: categoryIds,
    // WP assigns terms via the taxonomy's rest_base-named property
    ...(tagIds.length ? { [taxBases.tag]: tagIds } : {}),
    ...(industryIds.length ? { [taxBases.industry]: industryIds } : {}),
    author: parseInt(config.wp_author_id) || 1,
    ...((content.slug || rowData.primary_keyword) ? { slug: content.slug || slugify(rowData.primary_keyword) } : {}),
    ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
    meta: {
      // Rank Math
      rank_math_title: seoTitle,
      rank_math_focus_keyword: rowData.primary_keyword || '',
      rank_math_description: content.meta_description || '',
      // Yoast fallback
      _yoast_wpseo_title: seoTitle,
      _yoast_wpseo_metadesc: content.meta_description || '',
      _yoast_wpseo_focuskw: rowData.primary_keyword || '',
    },
  };

  // Create new or update existing
  const response = existingId
    ? await axios.post(`${apiBase}/posts/${existingId}`, postPayload, { headers, timeout: 30000 })
    : await axios.post(`${apiBase}/posts`, postPayload, { headers, timeout: 30000 });

  const post = response.data;
  return {
    post_id: post.id,
    post_url: post.link,
    edit_url: `${config.wp_url.replace(/\/$/, '')}/wp-admin/post.php?post=${post.id}&action=edit`,
    image_source: imageSource,
  };
}

// ─────────────────────────────────────────────────────────────
// Browser automation method (Playwright)
// ─────────────────────────────────────────────────────────────

/**
 * Posts a draft via browser automation using Playwright.
 * Handles both Gutenberg and Classic Editor.
 */
async function postViaBrowser(config, content, rowData, onProgress) {
  const { chromium } = require('playwright');

  if (onProgress) onProgress('Launching browser for WordPress automation...');

  const browser = await chromium.launch({
    headless: true,
    // Use system-installed Chrome when Playwright's own Chromium cache is absent.
    // Falls back to Playwright's bundled binary if the system path doesn't exist.
    ...(process.platform === 'linux' && require('fs').existsSync('/usr/bin/google-chrome')
      ? { executablePath: '/usr/bin/google-chrome' }
      : {}),
    // --no-sandbox is required on Linux when running as root/in containers
    args: process.platform === 'linux' ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    // ── Login — support custom login URL ──
    if (onProgress) onProgress('Logging in to WordPress...');
    const loginUrl = config.wp_login_url
      || `${config.wp_url.replace(/\/$/, '')}/wp-login.php`;
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Fill login form — try multiple selectors for non-standard login pages
    const userSelectors = ['#user_login', 'input[name="log"]', 'input[type="text"][name*="user"]', 'input[type="email"]'];
    const passSelectors = ['#user_pass', 'input[name="pwd"]', 'input[type="password"]'];
    const submitSelectors = ['#wp-submit', 'input[type="submit"]', 'button[type="submit"]'];

    let filled = false;
    for (const sel of userSelectors) {
      if (await page.$(sel)) { await page.fill(sel, config.wp_username); filled = true; break; }
    }
    if (!filled) throw new Error(`Could not find username field on login page: ${loginUrl}`);

    for (const sel of passSelectors) {
      if (await page.$(sel)) { await page.fill(sel, config.wp_password); break; }
    }
    for (const sel of submitSelectors) {
      if (await page.$(sel)) { await page.click(sel); break; }
    }
    await page.waitForURL(/wp-admin/, { timeout: 20000 });

    if (onProgress) onProgress('Navigating to editor...');

    // ── Navigate to post-new.php first — this loads wpApiSettings (needed for nonce) ──
    const newPostUrl = `${config.wp_url.replace(/\/$/, '')}/wp-admin/post-new.php`;
    await page.goto(newPostUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // ── Now check for existing post by same author (nonce is available after editor loads) ──
    const wpBase = `${config.wp_url.replace(/\/$/, '')}/wp-json/wp/v2`;
    const authorId = parseInt(config.wp_author_id) || 1;
    const existingPostId = await findExistingPostBrowser(page, content.title, wpBase, authorId);

    if (existingPostId) {
      if (onProgress) onProgress(`Found existing post ID ${existingPostId} — updating instead of creating new`);
      // Navigate to the existing post editor
      const editorUrl = `${config.wp_url.replace(/\/$/, '')}/wp-admin/post.php?post=${existingPostId}&action=edit`;
      await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } else {
      if (onProgress) onProgress('No existing post found — creating new...');
      // Already on post-new.php — no redirect needed
    }

    // Wait for the editor to fully initialize — Gutenberg JS loads asynchronously.
    // Newer WordPress renders the editor inside an iframe (editor-canvas), so top-level
    // DOM selectors like .editor-post-title__input are absent. Detect readiness via the
    // wp.data store instead (present on the top frame regardless of the iframe).
    let isGutenberg = false;
    try {
      await page.waitForFunction(
        () => !!(window.wp?.data?.select('core/editor')?.getCurrentPostId?.() && window.wp?.blocks?.parse),
        { timeout: 20000 }
      );
      isGutenberg = true;
    } catch {
      // Not Gutenberg (or data store unavailable) — wait for Classic Editor
      try {
        await page.waitForSelector('#title', { timeout: 10000 });
        isGutenberg = false;
      } catch {
        throw new Error('WordPress editor did not initialize. Check site accessibility and login status.');
      }
    }

    let imageSource = '';
    if (isGutenberg) {
      imageSource = (await fillGutenbergEditor(page, content, rowData, config, onProgress)) || '';
    } else {
      imageSource = (await fillClassicEditor(page, content, rowData, config, onProgress)) || '';
    }

    // ── Get post ID — wait for Gutenberg to update the URL after first save ──
    try {
      await page.waitForURL(/post=\d+/, { timeout: 8000 });
    } catch { /* URL may already contain post ID or save happened silently */ }

    const currentUrl = page.url();
    let postId = null;
    const postIdMatch = currentUrl.match(/post=(\d+)/);
    if (postIdMatch) {
      postId = parseInt(postIdMatch[1]);
    } else if (isGutenberg) {
      // Gutenberg: try reading post ID from the editor's internal data store
      postId = await page.evaluate(() => {
        try { return window.wp?.data?.select('core/editor')?.getCurrentPostId?.() || null; } catch { return null; }
      });
    }

    return {
      post_id: postId,
      post_url: postId ? `${config.wp_url.replace(/\/$/, '')}/?p=${postId}` : '',
      edit_url: currentUrl,
      image_source: imageSource,
    };
  } finally {
    await browser.close();
  }
}

async function fillGutenbergEditor(page, content, rowData, config, onProgress) {
  if (onProgress) onProgress('Filling Gutenberg editor title...');

  // Set the title via the editor data store — robust across WP versions and works even
  // when the title field is inside the editor-canvas iframe (newer WordPress).
  const titleSet = await page.evaluate((title) => {
    try {
      const ed = window.wp?.data?.dispatch('core/editor');
      if (ed?.editPost) { ed.editPost({ title }); return true; }
    } catch { /* fall through to DOM */ }
    return false;
  }, content.title);

  if (!titleSet) {
    // Fallback: type into the title field directly (older Gutenberg / non-iframed)
    const titleSelectors = [
      '.editor-post-title__input',
      'h1.wp-block-post-title',
      '[aria-label="Add title"]',
      '.wp-block-post-title',
      '.edit-post-visual-editor__post-title-wrapper h1',
    ];

    let titleFilled = false;
    for (const sel of titleSelectors) {
      try {
        // Wait up to 8s per selector — Gutenberg JS initializes asynchronously
        await page.waitForSelector(sel, { timeout: 8000 });
        const el = await page.$(sel);
        if (el) {
          await el.click();
          // Use triple-click to select existing text, then type replacement
          await el.click({ clickCount: 3 });
          await page.keyboard.type(content.title);
          titleFilled = true;
          break;
        }
      } catch { continue; }
    }
    if (!titleFilled) throw new Error('Could not find Gutenberg title field after waiting for all known selectors');
  }

  // Insert content via WordPress JS API (instantaneous — no UI interaction needed)
  if (onProgress) onProgress('Inserting content...');
  await page.keyboard.press('Escape');

  // FAQ goes into the theme's native "Blog FAQs" ACF field, so strip it from the body.
  // Keep a with-FAQ version as a fallback if the ACF field turns out to be unavailable.
  const faqItems = getFaqItems(content);
  const useAcfFaq = faqItems.length > 0;
  const rawHtml = composeContentHtml(content, { stripFaq: useAcfFaq, siteUrl: config.wp_url, blogSlug: config.slug });
  const rawHtmlWithFaq = composeContentHtml(content, { siteUrl: config.wp_url, blogSlug: config.slug });

  // Convert plain HTML to native Gutenberg block markup.
  // This lets the post open as proper editable blocks — not a single raw HTML block.
  const gutenbergContent = htmlToGutenbergBlocks(rawHtml);

  // Primary: use wp.data / wp.blocks API to set content programmatically
  const contentInserted = await page.evaluate(({ blockMarkup, fallbackHtml }) => {
    try {
      if (!window.wp?.data || !window.wp?.blocks) return false;

      let blocks;

      // wp.blocks.parse() is correct for pre-built block markup with <!-- wp:... --> comments
      if (window.wp.blocks.parse) {
        try { blocks = window.wp.blocks.parse(blockMarkup); } catch { /* try next */ }
      }

      // Fallback: rawHandler with the original raw HTML (not block markup)
      if (!blocks || !blocks.length) {
        if (window.wp.blocks.rawHandler) {
          try { blocks = window.wp.blocks.rawHandler({ HTML: fallbackHtml }); } catch { /* try next */ }
        }
      }

      // Last resort: classic freeform block (renders HTML without block-level errors)
      if (!blocks || !blocks.length) {
        blocks = [window.wp.blocks.createBlock('core/freeform', { content: fallbackHtml })];
      }

      window.wp.data.dispatch('core/block-editor').resetBlocks(blocks);
      window.wp.data.dispatch('core/editor')?.editPost?.({ content: undefined });
      return true;
    } catch { return false; }
  }, { blockMarkup: gutenbergContent, fallbackHtml: rawHtml });

  if (!contentInserted) {
    // Fallback: Code Editor textarea — insert pre-built block markup directly
    if (onProgress) onProgress('WP API unavailable — using code editor fallback...');

    let codeEditorOpen = false;
    for (const sel of ['button[aria-label="Options"]', 'button[aria-label="More tools & options"]', 'button[aria-label="Editor options"]']) {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click(); await page.waitForTimeout(400);
        const codeBtn = await page.$('button:has-text("Code editor"), a:has-text("Code editor")');
        if (codeBtn) { await codeBtn.click(); await page.waitForTimeout(800); codeEditorOpen = true; }
        break;
      }
    }
    if (!codeEditorOpen) {
      await page.keyboard.press('Control+Shift+Alt+KeyM');
      await page.waitForTimeout(800);
    }

    const codeTextarea = await page.$('.editor-post-text-editor, textarea.editor-post-text-editor__body');
    if (codeTextarea) {
      await codeTextarea.fill(gutenbergContent);
    } else {
      if (onProgress) onProgress('Content insertion skipped — no usable editor found');
    }
  }

  // ── Initial save as draft to get post ID ──
  if (onProgress) onProgress('Saving draft...');
  await gutenbergSaveDraft(page);

  // ── Wait for URL to contain post ID ──
  try { await page.waitForURL(/post=\d+/, { timeout: 8000 }); } catch { /* ok */ }

  // Read post ID from URL or wp.data
  let postId = null;
  const urlMatch = page.url().match(/post=(\d+)/);
  if (urlMatch) {
    postId = parseInt(urlMatch[1]);
  } else {
    postId = await page.evaluate(() => {
      try { return window.wp?.data?.select('core/editor')?.getCurrentPostId?.() || null; } catch { return null; }
    });
  }

  // ── Set all post meta via in-browser REST API (uses authenticated session) ──
  let browserImageSource = '';
  if (postId) {
    browserImageSource = await setPostMetaViaBrowser(page, postId, content, rowData, config, onProgress) || '';
  }

  // ── Populate the theme's native "Blog FAQs" ACF field ──
  if (useAcfFaq) {
    const acfOk = await fillBlogFaqAcf(page, faqItems, onProgress);
    if (!acfOk) {
      // ACF field unavailable — fall back to an inline FAQ in the content so the FAQ isn't lost
      if (onProgress) onProgress('Falling back to inline FAQ in content');
      const fallbackBlocks = htmlToGutenbergBlocks(rawHtmlWithFaq);
      await page.evaluate((markup) => {
        try {
          if (window.wp?.blocks?.parse) {
            window.wp.data.dispatch('core/block-editor').resetBlocks(window.wp.blocks.parse(markup));
          }
        } catch { /* keep stripped content */ }
      }, fallbackBlocks);
    }
  }

  // ── Final save ──
  if (onProgress) onProgress('Final save...');
  await gutenbergSaveDraft(page);
  await page.waitForTimeout(1500);

  // ── Write SEO meta LAST ──
  // Rank Math runs its own save during the editor save above, using its (blank on a new
  // post) panel state — which clobbers any focus keyword/title set earlier via REST. So we
  // set the SEO meta as the final write, after that save, so it sticks.
  if (postId) {
    await writeSeoMetaLast(page, postId, content, rowData, config, onProgress);
  }

  return browserImageSource;
}

// Final REST write of Rank Math + Yoast SEO meta (focus keyword, title, description) so it
// is the LAST thing written and survives Rank Math's own on-save handler.
async function writeSeoMetaLast(page, postId, content, rowData, config, onProgress) {
  const wpUrl = config.wp_url.replace(/\/$/, '');
  const payload = {
    seoTitle: content.seo_title || content.title || '',
    focusKeyword: rowData.primary_keyword || '',
    metaDescription: content.meta_description || '',
  };
  const ok = await page.evaluate(async ({ wpUrl, postId, p }) => {
    try {
      const nonce = window.wpApiSettings?.nonce || '';
      const r = await fetch(`${wpUrl}/wp-json/wp/v2/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
        credentials: 'same-origin',
        body: JSON.stringify({
          meta: {
            rank_math_title: p.seoTitle,
            rank_math_focus_keyword: p.focusKeyword,
            rank_math_description: p.metaDescription,
            _yoast_wpseo_title: p.seoTitle,
            _yoast_wpseo_focuskw: p.focusKeyword,
            _yoast_wpseo_metadesc: p.metaDescription,
          },
        }),
      });
      return r.ok;
    } catch { return false; }
  }, { wpUrl, postId, p: payload });
  if (onProgress) onProgress(ok
    ? `SEO meta finalized (focus keyword: "${payload.focusKeyword}")`
    : 'SEO meta finalize skipped');
}

/**
 * Populates the theme's native "Blog FAQs" ACF field (repeater of question/answer rows,
 * plus heading level + main heading) instead of an inline FAQ in the content.
 * Targets fields by ACF data-name so it survives field-key changes.
 * Returns true if the repeater was found and filled.
 */
async function fillBlogFaqAcf(page, items, onProgress) {
  if (!items || !items.length) return false;
  try {
    const repeater = page.locator('.acf-field[data-name="faq"]').first();
    if (!(await repeater.count())) {
      if (onProgress) onProgress('Blog FAQs ACF field not found — leaving FAQ inline');
      return false;
    }
    // Expand the metabox if collapsed
    const postbox = page.locator('.postbox:has(.acf-field[data-name="faq"])').first();
    if (await postbox.count() && (await postbox.getAttribute('class') || '').includes('closed')) {
      await postbox.locator('.hndle, .postbox-header').first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
    await repeater.scrollIntoViewIfNeeded().catch(() => {});

    // Heading level + main heading
    const headingSel = page.locator('.acf-field[data-name="choose_heading"] select').first();
    if (await headingSel.count()) await headingSel.selectOption('h2').catch(() => {});
    const mainInput = page.locator('.acf-field[data-name="main_heading"] input').first();
    if (await mainInput.count()) await mainInput.fill('Frequently Asked Questions').catch(() => {});

    const rowsLoc = () => repeater.locator('.acf-row:not(.acf-clone)');
    // The real "Add Row" button (not the hidden per-row .acf-icon.-plus in the clone template)
    const addBtn = repeater.locator('a.acf-repeater-add-row[data-event="add-row"]').first();

    // Add rows until there are at least as many as we have items. We fill in place rather
    // than clear-then-add, so the hover-only remove control is only touched to trim extras.
    let addGuard = 0;
    while ((await rowsLoc().count()) < items.length && addGuard++ < items.length + 3) {
      await addBtn.click({ timeout: 8000 });
      await page.waitForTimeout(250);
    }

    // Best-effort trim of extra rows (bounded, force-click, stops on no-progress → never hangs).
    let prev = -1;
    while ((await rowsLoc().count()) > items.length) {
      const n = await rowsLoc().count();
      if (n === prev) break;
      prev = n;
      try {
        const last = rowsLoc().nth(n - 1);
        await last.hover({ timeout: 1500 }).catch(() => {});
        await last.locator('a.acf-icon.-minus[data-event="remove-row"]').first().click({ timeout: 3000, force: true });
        const confirm = page.locator('.acf-tooltip a[data-event="confirm"], .acf-tooltip .-confirm').first();
        if (await confirm.count()) await confirm.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(200);
      } catch { break; }
    }

    // Fill each row in place (overwrites any previous values).
    for (let i = 0; i < items.length; i++) {
      const row = rowsLoc().nth(i);
      const qInput = row.locator('.acf-field[data-name="question"] input').first();
      const aInput = row.locator('.acf-field[data-name="answer"] textarea').first();
      if (await qInput.count()) await qInput.fill(items[i].question, { timeout: 8000 });
      if (await aInput.count()) await aInput.fill(items[i].answer, { timeout: 8000 });
    }
    if (onProgress) onProgress(`Blog FAQs populated: ${items.length} Q&A row${items.length !== 1 ? 's' : ''}`);
    return true;
  } catch (e) {
    if (onProgress) onProgress(`Blog FAQs fill skipped: ${e.message.slice(0, 80)}`);
    return false;
  }
}

/**
 * Uses the browser's logged-in session to set categories, tags, Rank Math SEO,
 * and featured image via the WP REST API (no Application Password needed).
 */
async function setPostMetaViaBrowser(page, postId, content, rowData, config, onProgress) {
  const wpUrl = config.wp_url.replace(/\/$/, '');

  // Generate featured image buffer
  let imageBase64 = null;
  let imageFilename = 'featured.webp';
  let imageSource = '';
  try {
    const img = await imageService.saveTempImage(content.title, rowData.primary_keyword, rowData.theme, content.image_prompt, config);
    imageBase64 = img.buffer.toString('base64');
    imageFilename = img.path.split('/').pop();
    imageSource = img.source || '';
    fs.unlink(img.path, () => {});
    if (onProgress) onProgress(`Featured image ready: ${imageSource} (${Math.round(img.size / 1024)}KB)`);
  } catch (e) {
    imageSource = '';
    if (onProgress) onProgress(`Featured image generation failed: ${e.message.substring(0, 60)}`);
  }

  const allTags = [
    ...(Array.isArray(rowData.secondary_keywords) ? rowData.secondary_keywords : []),
    ...(Array.isArray(content.tags) ? content.tags : []),
  ].filter(Boolean).slice(0, 8);

  const categoryNames = [rowData.theme, rowData.target_industry].filter(Boolean);

  // Run all REST API operations inside the browser (uses the existing WP session)
  const result = await page.evaluate(async ({ wpUrl, postId, categoryNames, tags, industryNames, focusKeyword, metaDescription, seoTitle, slug, imageAlt, imageBase64, imageFilename }) => {
    const log = [];
    try {
      // Get nonce for REST API
      const nonce = window.wpApiSettings?.nonce || window.wp?.apiFetch?.nonceMiddleware?.nonce || '';
      const base = `${wpUrl}/wp-json/wp/v2`;
      const headers = { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce };

      const api = async (method, endpoint, body) => {
        const opts = { method, headers, credentials: 'same-origin' };
        if (body) opts.body = JSON.stringify(body);
        const r = await fetch(`${base}${endpoint}`, opts);
        if (!r.ok) throw new Error(`${method} ${endpoint}: ${r.status}`);
        return r.json();
      };

      // Helper: resolve or create a term in any taxonomy
      const resolveTerm = async (restBase, name) => {
        const search = await fetch(`${base}/${restBase}?search=${encodeURIComponent(name)}&per_page=5`, { headers, credentials: 'same-origin' }).then(r => r.json()).catch(() => []);
        const exact = Array.isArray(search) ? search.find(t => t.name.toLowerCase() === name.toLowerCase()) : null;
        if (exact) return { id: exact.id, action: 'matched', displayName: exact.name };
        if (!Array.isArray(search) || !search.length) {
          // Not found — create it
          try {
            const created = await api('POST', `/${restBase}`, { name });
            return { id: created.id, action: 'created', displayName: name };
          } catch (e) {
            const errBody = e.message;
            return { id: null, action: 'failed', displayName: name, error: errBody };
          }
        }
        return { id: search[0].id, action: 'matched', displayName: search[0].name };
      };

      // ── Discover taxonomy REST bases ──
      let tagBase = 'post_tag'; // default for WP installs that use non-standard rest_base
      let industryBase = 'industry';
      try {
        const taxR = await fetch(`${base}/taxonomies`, { headers, credentials: 'same-origin' }).then(r => r.json()).catch(() => ({}));
        if (taxR.post_tag?.rest_base) tagBase = taxR.post_tag.rest_base;
        if (taxR.industry?.rest_base) industryBase = taxR.industry.rest_base;
      } catch { /* use defaults */ }

      // ── Resolve categories ──
      const categoryIds = [];
      for (const name of categoryNames) {
        try {
          const term = await resolveTerm('categories', name);
          if (term.id) { categoryIds.push(term.id); log.push(`Category ${term.action}: ${term.displayName}`); }
          else log.push(`Category failed: ${term.displayName}`);
        } catch (e) { log.push(`Category error: ${e.message}`); }
      }

      // ── Resolve / create tags (using discovered rest base) ──
      const tagIds = [];
      for (const name of tags) {
        try {
          const term = await resolveTerm(tagBase, name);
          if (term.id) tagIds.push(term.id);
        } catch { /* skip tag */ }
      }
      if (tags.length) log.push(`Tags: ${tagIds.length}/${tags.length} resolved (base: ${tagBase})`);

      // ── Resolve / create industries ──
      const industryIds = [];
      for (const name of industryNames) {
        try {
          const term = await resolveTerm(industryBase, name);
          if (term.id) { industryIds.push(term.id); log.push(`Industry ${term.action}: ${term.displayName}`); }
        } catch { /* skip */ }
      }

      // ── Upload featured image ──
      let featuredMediaId = null;
      if (imageBase64) {
        try {
          const bytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: 'image/webp' });
          const form = new FormData();
          form.append('file', blob, imageFilename);
          const mediaRes = await fetch(`${base}/media`, {
            method: 'POST',
            headers: { 'X-WP-Nonce': nonce },
            body: form,
            credentials: 'same-origin',
          });
          if (mediaRes.ok) {
            const media = await mediaRes.json();
            featuredMediaId = media.id;
            log.push(`Featured image uploaded: Media ID ${featuredMediaId}`);
            // Set alt text on the media (Rank Math: focus keyword in image alt)
            if (imageAlt) {
              try {
                await fetch(`${base}/media/${featuredMediaId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                  body: JSON.stringify({ alt_text: imageAlt }),
                  credentials: 'same-origin',
                });
              } catch { /* non-fatal */ }
            }
          } else {
            log.push(`Image upload failed: ${mediaRes.status}`);
          }
        } catch (e) { log.push(`Image upload error: ${e.message}`); }
      }

      // ── Update post: categories, tags, industries, featured image, Rank Math meta ──
      const updatePayload = {
        ...(categoryIds.length ? { categories: categoryIds } : {}),
        ...(tagIds.length ? { [tagBase]: tagIds } : {}),
        ...(industryIds.length ? { [industryBase]: industryIds } : {}),
        ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
        ...(slug ? { slug } : {}),
        meta: {
          rank_math_title: seoTitle || '',
          rank_math_focus_keyword: focusKeyword || '',
          rank_math_description: metaDescription || '',
          _yoast_wpseo_title: seoTitle || '',
          _yoast_wpseo_focuskw: focusKeyword || '',
          _yoast_wpseo_metadesc: metaDescription || '',
        },
      };

      await api('POST', `/posts/${postId}`, updatePayload);
      log.push(`Post updated — ${categoryIds.length} categories, ${tagIds.length} tags, ${industryIds.length} industries${featuredMediaId ? ', featured image' : ''}, Rank Math meta set`);

    } catch (e) {
      log.push(`Error: ${e.message}`);
    }
    return log;
  }, { wpUrl, postId, categoryNames, tags: allTags, industryNames: [rowData.target_industry].filter(Boolean), focusKeyword: rowData.primary_keyword, metaDescription: content.meta_description, seoTitle: content.seo_title || content.title, slug: content.slug || slugify(rowData.primary_keyword || ''), imageAlt: content.image_alt || rowData.primary_keyword || '', imageBase64, imageFilename });

  // Log each result message
  if (result && Array.isArray(result)) {
    for (const msg of result) {
      if (onProgress) onProgress(msg);
    }
  }

  return imageSource;
}

async function gutenbergSaveDraft(page) {
  const selectors = [
    'button[aria-label="Save draft"]',
    'button:has-text("Save draft")',
    'button.editor-post-save-draft',
  ];
  for (const sel of selectors) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      try { await page.waitForSelector('.editor-post-saved-state, .components-snackbar', { timeout: 8000 }); } catch { /* ok */ }
      await page.waitForTimeout(1000);
      return true;
    }
  }
  // Try keyboard shortcut as last resort
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(2000);
  return false;
}

async function ensureDocumentSidebarOpen(page) {
  // Open sidebar if it's not visible
  const sidebar = await page.$('.editor-sidebar, .interface-complementary-area');
  if (!sidebar) {
    const settingsBtn = await page.$('button[aria-label="Settings"], button[aria-label="Toggle settings sidebar"]');
    if (settingsBtn) { await settingsBtn.click(); await page.waitForTimeout(600); }
  }

  // Switch to "Post" tab (not "Block") so categories/tags/featured image are visible
  const postTab = page.locator(
    '.components-button[data-label="Post"], button[data-tab-id="document"], .edit-post-sidebar__panel-tabs button:last-child, button:has-text("Post")'
  ).filter({ hasNot: page.locator('.block-editor') }).first();

  // Try known aria-label selectors for the Post/Document tab
  const docTabSelectors = [
    'button[aria-label="Post"]',
    'button[data-label="Post"]',
    '.edit-post-sidebar__panel-tabs button:nth-child(2)',
    '.interface-interface-skeleton__sidebar button[aria-selected="false"]',
  ];
  for (const sel of docTabSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        const text = await el.textContent();
        if (/post|document/i.test(text || '')) {
          await el.click();
          await page.waitForTimeout(400);
          break;
        }
      }
    } catch { /* try next */ }
  }
}

async function setGutenbergCategory(page, categoryName, onProgress) {
  try {
    // Find Categories panel in sidebar — may need to expand it
    const catPanel = page.locator('.components-panel__body').filter({ hasText: /categor/i }).first();
    if (await catPanel.count()) {
      // Expand if collapsed
      const header = catPanel.locator('.components-panel__body-title button').first();
      const isExpanded = await header.getAttribute('aria-expanded');
      if (isExpanded === 'false') await header.click();
      await page.waitForTimeout(300);

      // Search for the category
      const searchInput = catPanel.locator('input[type="search"], input[type="text"]').first();
      if (await searchInput.count()) {
        await searchInput.fill(categoryName);
        await page.waitForTimeout(800);

        // Check if a matching item appeared — if so, click it
        const matchItem = catPanel.locator(`label:has-text("${categoryName.split(' ')[0]}")`).first();
        if (await matchItem.count()) {
          const checkbox = await matchItem.locator('input[type="checkbox"]').first();
          if (!await checkbox.isChecked()) await checkbox.click();
          if (onProgress) onProgress(`Category set: ${categoryName}`);
          return;
        }

        // Not found — add new category
        const addLink = catPanel.locator('button:has-text("Add New Category"), a:has-text("Add New")').first();
        if (await addLink.count()) {
          await addLink.click();
          await page.waitForTimeout(400);
          const newCatInput = catPanel.locator('input[placeholder*="New category name"], input[type="text"]').last();
          if (await newCatInput.count()) {
            await newCatInput.fill(categoryName);
            await page.waitForTimeout(200);
            const addBtn = catPanel.locator('button:has-text("Add New Category")').last();
            if (await addBtn.count()) await addBtn.click();
            if (onProgress) onProgress(`Category created and set: ${categoryName}`);
          }
        }
      }
    }
  } catch (e) {
    if (onProgress) onProgress(`Category set skipped: ${e.message.substring(0, 80)}`);
  }
}

async function setGutenbergTags(page, tags, onProgress) {
  try {
    const tagsPanel = page.locator('.components-panel__body').filter({ hasText: /^tags$/i }).first();
    if (!await tagsPanel.count()) return;

    // Expand if collapsed
    const header = tagsPanel.locator('.components-panel__body-title button').first();
    if (await header.count()) {
      const isExpanded = await header.getAttribute('aria-expanded');
      if (isExpanded === 'false') await header.click();
      await page.waitForTimeout(300);
    }

    const tagInput = tagsPanel.locator('input[type="text"]').first();
    if (!await tagInput.count()) return;

    for (const tag of tags) {
      await tagInput.fill(tag);
      await page.waitForTimeout(400);
      // Press Enter or comma to add the tag
      await tagInput.press('Enter');
      await page.waitForTimeout(200);
    }
    if (onProgress) onProgress(`Tags set: ${tags.slice(0, 4).join(', ')}${tags.length > 4 ? '...' : ''}`);
  } catch (e) {
    if (onProgress) onProgress(`Tags set skipped: ${e.message.substring(0, 80)}`);
  }
}

async function setRankMathSeo(page, focusKeyword, metaDescription, onProgress) {
  try {
    // Look for Rank Math sidebar tab/icon (it may be a button in the top bar)
    const rmTabSelectors = [
      'button[aria-label*="Rank Math"]',
      'button.rank-math-toolbar-icon',
      '#rank-math-editor-btn',
    ];
    let rmOpened = false;
    for (const sel of rmTabSelectors) {
      const el = await page.$(sel);
      if (el) { await el.click(); await page.waitForTimeout(600); rmOpened = true; break; }
    }

    // With timeout: 4000ms — if element not found, skip gracefully
    const FILL_TIMEOUT = 4000;

    // Set focus keyword
    if (focusKeyword) {
      const focusSelectors = [
        'input[placeholder*="focus keyword"]',
        'input[placeholder*="Focus Keyword"]',
        '.rank-math-focus-keyword input',
        'input[id*="focus_keyword"]',
        'input[name*="focus_keyword"]',
      ];
      for (const sel of focusSelectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: FILL_TIMEOUT }).catch(() => false)) {
            await el.fill(focusKeyword, { timeout: FILL_TIMEOUT });
            if (onProgress) onProgress(`Rank Math focus keyword: ${focusKeyword}`);
            break;
          }
        } catch { /* try next selector */ }
      }
    }

    // Set meta description
    if (metaDescription) {
      const metaSelectors = [
        'textarea[placeholder*="meta description"]',
        'textarea[placeholder*="Meta Description"]',
        '.rank-math-description textarea',
        'textarea[id*="rank_math_description"]',
      ];
      for (const sel of metaSelectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: FILL_TIMEOUT }).catch(() => false)) {
            await el.fill(metaDescription, { timeout: FILL_TIMEOUT });
            break;
          }
        } catch { /* try next */ }
      }
    }
  } catch (e) {
    if (onProgress) onProgress(`Rank Math skipped: ${e.message.substring(0, 80)}`);
  }
  return imageSource;
}

async function setFeaturedImage(page, content, rowData, onProgress) {
  let tmpPath = null;
  try {
    // Generate the image
    const img = await imageService.saveTempImage(content.title, rowData.primary_keyword, rowData.theme, content.image_prompt, {});
    tmpPath = img.path;
    if (onProgress) onProgress(`Featured image ready: ${img.source} (${Math.round(img.size / 1024)}KB)`);

    // Find the Featured Image panel — try multiple approaches
    let setBtn = null;

    // Try direct button first (panel may already be expanded)
    const directBtn = page.locator('button:has-text("Set featured image")').first();
    if (await directBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      setBtn = directBtn;
    } else {
      // Find and expand the featured image panel
      const featPanel = page.locator('.components-panel__body').filter({ hasText: /featured image/i }).first();
      if (await featPanel.count()) {
        const header = featPanel.locator('.components-panel__body-title button').first();
        if (await header.count()) {
          const isExpanded = await header.getAttribute('aria-expanded');
          if (isExpanded === 'false') { await header.click(); await page.waitForTimeout(400); }
        }
        setBtn = featPanel.locator('button:has-text("Set featured image")').first();
      }
    }

    if (!setBtn || !await setBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (onProgress) onProgress('Featured image panel not found — skipping');
      return;
    }
    await setBtn.click();
    await page.waitForTimeout(1500);

    // Media library dialog opens — click "Upload files" tab
    const uploadTab = page.locator('button:has-text("Upload files")').first();
    if (await uploadTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await uploadTab.click();
      await page.waitForTimeout(500);
    }

    // Find the file input and upload
    const fileInput = page.locator('input[type="file"]').last();
    if (await fileInput.count()) {
      await fileInput.setInputFiles(tmpPath);
      await page.waitForTimeout(3000); // Wait for upload to complete

      // Click "Set featured image" confirmation button in media dialog
      const confirmBtn = page.locator('button:has-text("Set featured image")').last();
      if (await confirmBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
        if (onProgress) onProgress('Featured image set successfully');
      }
    }
  } catch (e) {
    if (onProgress) onProgress(`Featured image skipped: ${e.message.substring(0, 100)}`);
  } finally {
    if (tmpPath) fs.unlink(tmpPath, () => {});
  }
}

async function fillClassicEditor(page, content, rowData, config, onProgress) {
  if (onProgress) onProgress('Filling Classic editor...');

  await page.fill('#title', content.title);

  // Switch to HTML tab in content editor
  const htmlTab = await page.$('#content-html');
  if (htmlTab) await htmlTab.click();

  const fullContent = composeContentHtml(content, { siteUrl: config.wp_url, blogSlug: config.slug });
  await page.fill('#content', fullContent);

  // Set excerpt/meta description
  const excerptField = await page.$('#excerpt');
  if (excerptField && content.meta_description) {
    await excerptField.fill(content.meta_description);
  }

  if (onProgress) onProgress('Saving as draft...');
  await page.click('#save-post');
  await page.waitForTimeout(3000);

  return ''; // classic editor path does not set a featured image source
}

// ─────────────────────────────────────────────────────────────
// REST API helpers: categories, tags, slugify
// ─────────────────────────────────────────────────────────────

async function resolveCategories(apiBase, headers, rowData, config) {
  const defaultId = parseInt(config.wp_category) || 1;
  const candidates = [rowData.theme, rowData.target_industry].filter(Boolean);
  const ids = new Set([defaultId]);

  for (const name of candidates) {
    try {
      const res = await axios.get(`${apiBase}/categories?search=${encodeURIComponent(name)}&per_page=5`, { headers, timeout: 10000 });
      if (res.data && res.data.length > 0) {
        // Pick the closest match (case-insensitive includes)
        const match = res.data.find(c => c.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]))
          || res.data[0];
        ids.add(match.id);
      } else {
        // Create new category
        try {
          const created = await axios.post(`${apiBase}/categories`, { name }, { headers, timeout: 10000 });
          ids.add(created.data.id);
        } catch { /* slug collision or other — skip */ }
      }
    } catch { /* skip on network error */ }
  }

  return [...ids];
}

/**
 * Discovers the actual REST bases for tag and industry taxonomies.
 * This WP install uses `post_tag` (not `tags`) and a custom `industry` taxonomy;
 * hardcoding `/tags` makes every tag call 404 and silently drop all tags.
 * Mirrors the browser path's runtime discovery so both posting methods behave identically.
 */
async function discoverTaxonomyBases(apiBase, headers) {
  const bases = { tag: 'post_tag', industry: 'industry' };
  try {
    const res = await axios.get(`${apiBase}/taxonomies`, { headers, timeout: 10000 });
    const tax = res.data || {};
    if (tax.post_tag?.rest_base) bases.tag = tax.post_tag.rest_base;
    if (tax.industry?.rest_base) bases.industry = tax.industry.rest_base;
  } catch { /* use defaults */ }
  return bases;
}

/** Resolve (or create) term IDs for a list of names in any taxonomy REST base. */
async function resolveTermsInTaxonomy(apiBase, headers, restBase, names) {
  const ids = [];
  for (const name of names) {
    if (!name) continue;
    try {
      const res = await axios.post(`${apiBase}/${restBase}`, { name }, { headers, timeout: 10000 });
      ids.push(res.data.id);
    } catch {
      try {
        const search = await axios.get(`${apiBase}/${restBase}?search=${encodeURIComponent(name)}&per_page=3`, { headers, timeout: 10000 });
        if (Array.isArray(search.data) && search.data.length > 0) ids.push(search.data[0].id);
      } catch { /* skip this term */ }
    }
  }
  return ids;
}

async function resolveTags(apiBase, headers, content, rowData, tagBase = 'post_tag') {
  const tagNames = [
    ...(Array.isArray(content.tags) ? content.tags : []),
    ...(Array.isArray(rowData.secondary_keywords) ? rowData.secondary_keywords : []),
  ].filter(Boolean).slice(0, 8);
  return resolveTermsInTaxonomy(apiBase, headers, tagBase, tagNames);
}

function slugify(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
}

/**
 * Searches for an existing post by title/slug for the given author via REST API (Basic Auth).
 * Returns post ID if found, null otherwise.
 */
async function findExistingPostApi(apiBase, headers, title, authorId) {
  const slug = slugify(title);
  try {
    // Search by slug first — most reliable
    const bySlug = await axios.get(`${apiBase}/posts?slug=${encodeURIComponent(slug)}&status=any&per_page=5`, {
      headers, timeout: 10000,
    });
    if (bySlug.data?.length) {
      const match = authorId
        ? bySlug.data.find(p => p.author === authorId) || bySlug.data[0]
        : bySlug.data[0];
      if (match) return match.id;
    }

    // Fallback: search by title text
    const byTitle = await axios.get(
      `${apiBase}/posts?search=${encodeURIComponent(title.substring(0, 60))}&status=any&author=${authorId}&per_page=10`,
      { headers, timeout: 10000 }
    );
    if (byTitle.data?.length) {
      const exact = byTitle.data.find(
        p => (p.title?.rendered || '').toLowerCase().replace(/&#[0-9]+;/g, '').replace(/&amp;/g, '&') === title.toLowerCase()
      );
      if (exact) return exact.id;
    }
  } catch { /* not found or API error — proceed with new post */ }
  return null;
}

/**
 * Searches for an existing post by title using the browser's authenticated session.
 * Called from within Playwright after navigating to the post editor (ensures wpApiSettings is loaded).
 * Returns post ID if found, null otherwise.
 */
async function findExistingPostBrowser(page, title, wpBase, authorId) {
  try {
    return await page.evaluate(async ({ wpBase, title }) => {
      const nonce = window.wpApiSettings?.nonce || '';
      const headers = { 'X-WP-Nonce': nonce };

      // Normalize WP title HTML entities for comparison
      const norm = s => String(s || '')
        .replace(/&#8211;|&#8212;/g, '-')
        .replace(/&#8216;|&#8217;|&#x27;/g, "'")
        .replace(/&#8220;|&#8221;/g, '"')
        .replace(/&#038;|&amp;/g, '&')
        .replace(/&[a-z]+;/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim();

      const normTitle = norm(title);
      // Use first 50 chars of title as search term (WP full-text search)
      const searchTerm = title.replace(/[^\w\s]/g, ' ').trim().substring(0, 50);

      // Search across both draft and publish statuses
      for (const status of ['draft', 'publish', 'any']) {
        const url = `${wpBase}/posts?search=${encodeURIComponent(searchTerm)}&status=${status}&per_page=20`;
        const results = await fetch(url, { headers, credentials: 'same-origin' })
          .then(r => r.ok ? r.json() : []).catch(() => []);

        if (!Array.isArray(results)) continue;

        // Exact title match only. A fuzzy prefix match is unsafe here: the caller
        // OVERWRITES the matched post, so two different articles sharing a prefix
        // (e.g. "...for beginners" vs "...for enterprises") would clobber each other.
        const exact = results.find(p => norm(p.title?.rendered) === normTitle);
        if (exact) return exact.id;
      }
      return null;
    }, { wpBase, title });
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────
// Content helpers
// ─────────────────────────────────────────────────────────────

// Escape text that came from the LLM/spreadsheet before interpolating into HTML.
// Prevents stray <, >, & from breaking the markup (and the downstream Gutenberg block parse).
function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Emit the FAQ as a heading followed by H3/paragraph pairs.
// NOT an <ol> with nested <p> — a <p> inside a list item is invalid Gutenberg
// list-item content and triggers the "Block contains unexpected or invalid content"
// recovery prompt in the editor.
function buildFaqHtml(faq) {
  if (!faq || faq.length === 0) return '';
  const items = faq
    .map(item => `<h3>${escapeHtml(item.question)}</h3>\n<p>${escapeHtml(item.answer)}</p>`)
    .join('\n');
  return `<h2>Frequently Asked Questions</h2>\n${items}`;
}

// True if the article body already contains an FAQ section. Claude is prompted to
// include the FAQ inside the article, so appending buildFaqHtml(faq) on top would
// duplicate it. Detects an FAQ heading specifically (not a stray mention in prose).
function contentHasFaq(html) {
  return /<h[1-4][^>]*>\s*(?:frequently asked questions|faqs?)\b/i.test(String(html || ''));
}

// Removes a leading heading from the body when it duplicates the post title.
// The AI writes the H1 into the article, but WordPress also renders content.title as
// the post title, so the body's first heading would show the title twice.
function stripLeadingTitleHeading(html, title) {
  if (!html || !title) return html;
  const norm = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/gi, '&')
    .replace(/&#0*39;|&#x27;|&rsquo;|&lsquo;/gi, "'").replace(/\s+/g, ' ').trim().toLowerCase();
  const t = norm(title);
  const m = html.match(/^\s*<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>\s*/i);
  if (m && norm(m[2]) === t) return html.slice(m[0].length);
  return html;
}

function textOnly(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/&amp;/gi, '&')
    .replace(/&#0*39;|&#x27;|&rsquo;|&lsquo;/gi, "'").replace(/&quot;|&#0*34;/gi, '"')
    .replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Splits the body into { body, section } at the FAQ heading. `section` is the FAQ block
// (everything from the FAQ heading until the next same-or-higher heading); `body` is the
// article with that section removed.
function splitFaqSection(html) {
  const m = /<h([1-3])[^>]*>\s*(?:frequently asked questions|faqs?)\s*<\/h\1>/i.exec(String(html || ''));
  if (!m) return { body: String(html || ''), section: '' };
  const start = m.index;
  const after = html.slice(start + m[0].length);
  const lvl = parseInt(m[1], 10);
  const nextRe = new RegExp(`<h[1-${lvl}]\\b`, 'i');
  const nextIdx = after.search(nextRe);
  const section = nextIdx === -1 ? after : after.slice(0, nextIdx);
  const body = html.slice(0, start) + (nextIdx === -1 ? '' : after.slice(nextIdx));
  return { body: body.trim(), section };
}

// Parses Q&A pairs out of an inline FAQ section (h3/strong question followed by a paragraph).
function parseFaqFromHtml(html) {
  const { section } = splitFaqSection(html);
  if (!section) return [];
  const items = [];
  const qa = /<(?:h[3-6]|strong)[^>]*>([\s\S]*?)<\/(?:h[3-6]|strong)>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = qa.exec(section)) !== null) {
    const q = textOnly(m[1]), a = textOnly(m[2]);
    if (q) items.push({ question: q, answer: a });
  }
  return items;
}

// Returns the FAQ items for a post: the structured faq[] array if present, else parsed
// from the article's inline FAQ section.
function getFaqItems(content) {
  if (Array.isArray(content.faq) && content.faq.length) {
    return content.faq.filter(f => f && f.question)
      .map(f => ({ question: textOnly(f.question), answer: textOnly(f.answer) }));
  }
  return parseFaqFromHtml(content.content || '');
}

// Rewrites absolute links that point to the same brand (e.g. the production domain
// referenced from a staging site) to the site you're actually publishing on, so they
// register as internal links in Rank Math. Same-host links and third-party/authority
// links (different brand) are left untouched. On production (link host === site host)
// this is a no-op.
function rewriteInternalLinks(html, siteUrl) {
  if (!html || !siteUrl) return String(html || '');
  let siteHost;
  try { siteHost = new URL(siteUrl).host.toLowerCase(); } catch { return html; }
  const brand = siteHost.replace(/^www\./, '').split('.')[0];
  return String(html).replace(/href=(["'])(https?:\/\/)([^/"']+)([^"']*)\1/gi, (m, q, scheme, host, rest) => {
    const hl = host.toLowerCase();
    if (hl === siteHost) return m;
    if (hl.replace(/^www\./, '').split('.')[0] === brand) return `href=${q}https://${siteHost}${rest}${q}`;
    return m;
  });
}

// Distributes the generated CTA blocks across the article — before evenly spread H2
// sections (never the very first H2, and skipping the FAQ heading). Leftovers go at the end.
function injectCtas(html, content, opts) {
  // Blogs opted out in cta-config.json get no modern CTA banner (avoids inheriting
  // another brand's default image/branding); the inline CTA in the article is used.
  if (!ctaService.isCtaEnabled(opts.blogSlug)) return html;
  const ctas = Array.isArray(content.ctas) ? content.ctas : [];
  if (!ctas.length) return html;
  const imageUrl = ctaService.getImageUrl(opts.blogSlug, content.cta_category, opts.siteUrl);
  const blocks = ctas.map(c => ctaService.buildCtaHtml(c, imageUrl));
  const segs = splitTopLevelElements(String(html).replace(/>\s+</g, '><'));
  const h2idx = [];
  segs.forEach((s, i) => {
    if (i > 0 && /^<h2\b/i.test(s) && !/frequently asked questions|faqs?/i.test(s)) h2idx.push(i);
  });
  const positions = [];
  const n = blocks.length, m = h2idx.length;
  if (m >= n) { for (let k = 0; k < n; k++) positions.push(h2idx[Math.floor((k + 1) * m / (n + 1))]); }
  else positions.push(...h2idx);
  const posSet = new Set(positions);
  const result = [];
  let ci = 0;
  for (let i = 0; i < segs.length; i++) {
    if (posSet.has(i) && ci < blocks.length) result.push(blocks[ci++]);
    result.push(segs[i]);
  }
  while (ci < blocks.length) result.push(blocks[ci++]); // any leftover at the end
  return result.join('\n');
}

// Composes the final article HTML: strips a leading heading that duplicates the post title,
// rewrites same-brand links to the publishing domain, and injects the CTA blocks. opts.stripFaq
// removes the inline FAQ section entirely (used when the FAQ is rendered via the theme's native
// ACF "Blog FAQs" field). Otherwise appends the structured FAQ only when the body has none.
function composeContentHtml(content, opts = {}) {
  let body = stripLeadingTitleHeading(content.content || '', content.title);
  body = rewriteInternalLinks(body, opts.siteUrl);
  body = injectCtas(body, content, opts);
  if (opts.stripFaq) return splitFaqSection(body).body;
  if (contentHasFaq(body)) return body;
  const faqHtml = buildFaqHtml(content.faq);
  return body + (faqHtml ? `\n\n${faqHtml}` : '');
}

// Finds the index just past the matching close tag for the element that opens at
// startIdx, accounting for same-tag nesting (e.g. <ul> inside <ul>). Returns -1 if
// unbalanced. This lets us treat a whole block-level element as one atomic segment
// instead of regex-splitting and tearing containers apart.
function findMatchingClose(s, startIdx, tag) {
  const re = new RegExp(`<(/?)${tag}(?:\\s[^>]*)?>`, 'gi');
  re.lastIndex = startIdx;
  let depth = 0, m;
  while ((m = re.exec(s)) !== null) {
    if (m[1] === '/') { depth--; if (depth === 0) return m.index + m[0].length; }
    else depth++;
  }
  return -1;
}

// Splits HTML into top-level segments: each block-level element (balanced) or text node.
function splitTopLevelElements(s) {
  const segs = [];
  const n = s.length;
  let i = 0;
  while (i < n) {
    while (i < n && /\s/.test(s[i])) i++;
    if (i >= n) break;
    if (s[i] !== '<') {
      let j = s.indexOf('<', i);
      if (j === -1) j = n;
      const txt = s.slice(i, j).trim();
      if (txt) segs.push(txt);
      i = j;
      continue;
    }
    const m = s.slice(i).match(/^<([a-z][a-z0-9]*)\b[^>]*?(\/?)>/i);
    if (!m) { // stray '<' or comment — skip past the next '>'
      const j = s.indexOf('>', i);
      if (j === -1) { const rest = s.slice(i).trim(); if (rest) segs.push(rest); break; }
      i = j + 1;
      continue;
    }
    const tag = m[1].toLowerCase();
    if (m[2] === '/' || ['hr', 'br', 'img'].includes(tag)) { // void / self-closed
      segs.push(s.slice(i, i + m[0].length));
      i += m[0].length;
      continue;
    }
    const end = findMatchingClose(s, i, tag);
    if (end === -1) { const rest = s.slice(i).trim(); if (rest) segs.push(rest); break; }
    segs.push(s.slice(i, end).trim());
    i = end;
  }
  return segs.filter(Boolean);
}

// Inline-level tags — bare inline content at block level is wrapped in a paragraph.
const INLINE_TAG = /^(?:strong|em|b|i|u|a|span|code|mark|small|sub|sup|abbr|cite|q|time|s|del|ins|kbd|samp|var)$/i;

// Converts a single top-level segment into one (possibly nested) Gutenberg block.
function segmentToBlock(seg) {
  seg = seg.trim();
  if (!seg) return '';
  const m = seg.match(/^<([a-z][a-z0-9]*)\b/i);
  const tag = m ? m[1].toLowerCase() : null;

  // Bare text node → paragraph
  if (!tag) return `<!-- wp:paragraph -->\n<p>${seg}</p>\n<!-- /wp:paragraph -->`;

  if (/^h[1-6]$/.test(tag)) {
    let level = parseInt(tag[1], 10);
    let inner = seg;
    // core/heading does not allow level 1 in body content — downgrade <h1> to <h2>
    if (level === 1) { level = 2; inner = inner.replace(/^<h1\b([^>]*)>/i, '<h2$1>').replace(/<\/h1>\s*$/i, '</h2>'); }
    // Block attrs must match the markup; core/heading defaults to level 2.
    const levelAttr = level !== 2 ? ` {"level":${level}}` : '';
    return `<!-- wp:heading${levelAttr} -->\n${inner}\n<!-- /wp:heading -->`;
  }

  if (tag === 'p') return `<!-- wp:paragraph -->\n${seg}\n<!-- /wp:paragraph -->`;

  if (tag === 'ul' || tag === 'ol') {
    const inner = seg.replace(/^<(?:ul|ol)\b[^>]*>/i, '').replace(/<\/(?:ul|ol)>\s*$/i, '');
    // True nested list or other block-level child can't be a flat native list — keep raw.
    if (/<(?:ul|ol|table|blockquote|h[1-6])\b/i.test(inner)) {
      return `<!-- wp:html -->\n${seg}\n<!-- /wp:html -->`;
    }
    // List items hold inline content only — convert any <p> the model put inside <li>
    // into line breaks (a <p> inside <li> is invalid core/list content).
    const cleaned = seg
      .replace(/<p\b[^>]*>/gi, '<br>')          // each paragraph start → line break
      .replace(/<\/p>/gi, '')                    // drop closing tags
      .replace(/<li(\s[^>]*)?>\s*<br>\s*/gi, '<li$1>'); // strip a leading <br> after <li>
    const orderedAttr = tag === 'ol' ? ' {"ordered":true}' : '';
    const withItems = cleaned
      .replace(/<li(\s[^>]*)?>/gi, '<!-- wp:list-item -->\n<li$1>')
      .replace(/<\/li>/gi, '</li>\n<!-- /wp:list-item -->');
    return `<!-- wp:list${orderedAttr} -->\n${withItems}\n<!-- /wp:list -->`;
  }

  if (tag === 'blockquote') {
    // Recurse: convert the quote's children into proper inner blocks (paragraph, list,
    // heading...) so a "Key Takeaways" callout becomes an editable quote, not raw HTML.
    const inner = seg.replace(/^<blockquote\b[^>]*>/i, '').replace(/<\/blockquote>\s*$/i, '').trim();
    const innerBlocks = convertHtmlToBlocks(inner) || '<!-- wp:paragraph -->\n<p></p>\n<!-- /wp:paragraph -->';
    return `<!-- wp:quote -->\n<blockquote class="wp-block-quote">\n${innerBlocks}\n</blockquote>\n<!-- /wp:quote -->`;
  }

  if (tag === 'hr') {
    return `<!-- wp:separator -->\n<hr class="wp-block-separator"/>\n<!-- /wp:separator -->`;
  }

  // Bare inline content at the block level → wrap in a paragraph (renders, stays editable)
  if (INLINE_TAG.test(tag)) return `<!-- wp:paragraph -->\n<p>${seg}</p>\n<!-- /wp:paragraph -->`;

  // table / pre / figure / div / anything else — keep as a valid raw-HTML block.
  // (core/table markup is too strict to hand-roll; these are rare in generated content.)
  return `<!-- wp:html -->\n${seg}\n<!-- /wp:html -->`;
}

// Converts an HTML fragment into a sequence of Gutenberg blocks (used at top level and
// recursively for container children like blockquote).
function convertHtmlToBlocks(html) {
  if (!html || !html.trim()) return '';
  // Collapse whitespace between tags so segmentation is clean (does not touch text content)
  const text = html.trim().replace(/>\s+</g, '><');
  return splitTopLevelElements(text).map(segmentToBlock).filter(Boolean).join('\n\n');
}

/**
 * Converts plain HTML to native Gutenberg block markup.
 *
 * WordPress opens native block markup directly in the editor without any
 * "Convert to Blocks" step. Paragraphs, headings, lists (including <li> with <p>),
 * and quotes (recursively, so a quote can contain a list) all become native, editable
 * blocks. Only structures that can't be represented natively (nested lists, tables,
 * figures) fall back to a valid <!-- wp:html --> block, so the editor never shows
 * "Block contains unexpected or invalid content".
 *
 * Uses balanced-tag tokenization (not regex splitting) so a container is never torn
 * apart at a child boundary.
 */
function htmlToGutenbergBlocks(html) {
  return convertHtmlToBlocks(html);
}

/**
 * Tests connectivity to a WordPress site.
 * Returns { ok: boolean, version?: string, error?: string }
 */
async function testConnection(config) {
  try {
    const url = `${config.wp_url.replace(/\/$/, '')}/wp-json/wp/v2/`;
    const response = await axios.get(url, { timeout: 10000 });
    return {
      ok: true,
      name: response.data.name,
      description: response.data.description,
      wpVersion: response.headers['x-wp-version'],
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { postDraft, testConnection, htmlToGutenbergBlocks, buildFaqHtml, composeContentHtml };
