/**
 * Statamic CP browser automation service.
 * Uses Playwright to log into the Statamic Control Panel and create draft entries,
 * the same way wordpressService uses browser automation for WordPress.
 */

const fs = require('fs');
const imageService = require('./imageService');

const SYSTEM_CHROME = '/usr/bin/google-chrome';
const CHROME_EXECUTABLE = process.platform === 'linux' && fs.existsSync(SYSTEM_CHROME)
  ? SYSTEM_CHROME
  : undefined;

/**
 * Test Statamic CP connectivity — launches a browser and attempts login.
 */
async function testConnection(config) {
  const { chromium } = require('playwright');
  const baseUrl  = (config.statamic_url || '').trim().replace(/\/$/, '');
  const username = (config.statamic_cp_username || '').trim();
  const password = (config.statamic_api_token || '').trim(); // stored in api_token field

  if (!baseUrl)   return { ok: false, error: 'Statamic URL is not configured.' };
  if (!username)  return { ok: false, error: 'Statamic CP username is not configured.' };
  if (!password)  return { ok: false, error: 'Statamic CP password is not configured.' };

  const browser = await chromium.launch({
    headless: true,
    ...(CHROME_EXECUTABLE ? { executablePath: CHROME_EXECUTABLE } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    // baseUrl already contains the custom CP path (e.g. /vr-studio)
    const loginUrl = `${baseUrl}/auth/login`;

    const loginResp = await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Confirm the CP login page actually rendered a form before trying to log in — a
    // moved/removed CP returns 404 (blank page). _assertLoginForm throws a clear message.
    await _assertLoginForm(page, loginResp, loginUrl);

    // Fill login form
    await _fillLogin(page, username, password);

    // Wait for redirect away from the login page
    try {
      await page.waitForURL(url => !url.href.includes('/auth/login'), { timeout: 15000 });
    } catch (waitErr) {
      // Check for error message on login page
      const errEl = await page.$('.alert-danger, .error, [data-testid="error"]');
      const errText = errEl ? await errEl.textContent() : null;
      return { ok: false, error: (errText || waitErr.message || 'Login redirect did not happen').trim().substring(0, 200) };
    }

    // Get site name from CP
    const siteName = await page.evaluate(() => {
      const el = document.querySelector('.logo-text, .site-name, h1.logo, .nav-logo');
      return el ? el.textContent.trim() : document.title || 'Statamic CP';
    });

    return { ok: true, name: siteName };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    await browser.close();
  }
}

/**
 * Post a blog entry as a draft to Statamic via CP browser automation.
 * Returns { post_id, post_url, edit_url, image_source }
 */
async function postDraft(blogConfig, generatedContent, rawData, logFn) {
  const { chromium } = require('playwright');
  const log = logFn || (() => {});

  const baseUrl    = (blogConfig.statamic_url || '').trim().replace(/\/$/, '');
  const username   = (blogConfig.statamic_cp_username || '').trim();
  const password   = (blogConfig.statamic_api_token || '').trim();
  const collection = (blogConfig.statamic_collection || 'articles').trim();

  if (!baseUrl)  throw new Error('Statamic URL is not configured for this blog.');
  if (!username) throw new Error('Statamic CP username is not configured for this blog.');
  if (!password) throw new Error('Statamic CP password is not configured for this blog.');

  // ── Preflight: confirm the CP login page is reachable BEFORE the expensive image
  // generation + browser launch. If the Control Panel URL has changed or the CP is down,
  // the server returns 404 — fail fast here with a clear message instead of spending
  // minutes on image generation and then hanging on a blank login form (waitForURL timeout).
  const loginUrl = `${baseUrl}/auth/login`;
  await _preflightCpReachable(loginUrl, log);

  // ── Generate featured image BEFORE launching browser ──
  // imageService has long retry chains (Codex → HF → gradient) that can take several minutes.
  // Generating first keeps the browser session short and prevents auth/navigation timeouts.
  let imageBuffer = null;
  let imageSource = '';
  try {
    log('Generating featured image...');
    const img = await imageService.saveTempImage(
      generatedContent.title,
      rawData?.primary_keyword || '',
      rawData?.theme || '',
      generatedContent.image_prompt || generatedContent.title,
      blogConfig,
      generatedContent.content,
      generatedContent.meta_description
    );
    imageBuffer = img.buffer;
    imageSource = img.source;
    log(`Image ready: ${img.source} (${Math.round(img.size / 1024)}KB)`);
  } catch (err) {
    log(`Image generation skipped: ${err.message}`);
  }

  log('Launching browser for Statamic CP automation...');

  const browser = await chromium.launch({
    headless: true,
    ...(CHROME_EXECUTABLE ? { executablePath: CHROME_EXECUTABLE } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page    = await context.newPage();

    // ── Step 1: Login ──
    // baseUrl already contains the custom CP path (e.g. http://host:8080/vr-studio)
    log('Logging into Statamic CP...');
    // Retry once — server may need a warm-up request after being idle
    let loginResp = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        loginResp = await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        break;
      } catch (e) {
        if (attempt === 2) throw new Error(`Statamic server unreachable after 2 attempts: ${e.message}`);
        log(`Login page load timed out (attempt ${attempt}) — retrying...`);
        await page.waitForTimeout(3000);
      }
    }
    // Confirm the login page actually rendered a form. A moved/removed CP returns a 404
    // (blank page) with no fields — without this, _fillLogin fills nothing and the code
    // hangs on waitForURL for the full 30s, failing with a cryptic timeout.
    await _assertLoginForm(page, loginResp, loginUrl);
    await _fillLogin(page, username, password);
    await page.waitForURL(url => !url.href.includes('/auth/login'), { timeout: 30000 });
    log('Login successful.');

    // ── Step 2: Navigate directly to create form ──
    // Correct Statamic v4 create URL: /collections/{col}/entries/create/{site}?blueprint={blueprint}
    // e.g. /collections/blogs/entries/create/default?blueprint=article
    const blueprint = (blogConfig.statamic_blueprint || 'article').trim();
    const site      = (blogConfig.statamic_site || 'default').trim();
    const createUrl = `${baseUrl}/collections/${encodeURIComponent(collection)}/entries/create/${site}?blueprint=${blueprint}`;

    log(`Navigating to create form: ${createUrl}`);
    await page.goto(createUrl, { waitUntil: 'networkidle', timeout: 60000 });
    // Wait for Vue to finish mounting
    await page.waitForSelector('input[name="title"]', { state: 'visible', timeout: 40000 });
    log('Entry form loaded.');

    // ── Step 3.5: Dismiss any modal dialogs (e.g. Statamic Pro licensing alert) ──
    // The licensing alert traps keyboard focus — if open, keyboard.type() goes to the modal
    // instead of the form fields, leaving content/category empty.
    await _dismissModals(page, log);

    // ── Step 4: Fill Title* field ──
    // Use locator (re-queries on each retry) so clicks survive Vue re-renders
    await page.locator('input[name="title"]').fill(generatedContent.title);
    log(`Title set: "${generatedContent.title}"`);
    await page.waitForTimeout(800); // let Statamic auto-generate the slug from the title

    // ── Step 4.5: Fill Meta sidebar — Slug* and Date* ──
    // Capture the slug so we can include it in the PATCH (Statamic requires slug in PATCH).
    const formSlug = await _fillMetaSidebar(page, generatedContent, log);

    // ── Step 5: Fill Excerpt field ──
    try {
      const excerptLocator = page.locator('textarea[name="excerpt"]');
      if (await excerptLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
        await excerptLocator.fill(generatedContent.meta_description || '');
        log('Excerpt set.');
      }
    } catch (e) {
      log(`Excerpt skipped: ${e.message}`);
    }

    // ── Step 5.5: Category ──
    // Set via the post-save CP-API PATCH (blog_categories), NOT the form dropdown — the
    // dropdown only ever picked the first option and the selection did not persist.
    // The category is configured per-blog in .env (statamic_category).

    // ── Step 5.6: Select Author (if field exists) ──
    await _selectAuthor(page, log);

    // ── Step 6: Content ──
    // Set via the post-save CP-API PATCH (content as a Bard node array), NOT by typing.
    // Typing a long article into ProseMirror took ~7 min and never persisted (Bard stores
    // a structured node array, not keystrokes). See _htmlToBardNodes + patchPayload.content.

    // ── Step 7: Upload Cover Image if available ──
    if (imageBuffer) {
      await _uploadFeaturedImage(page, imageBuffer, generatedContent.title, log);
    }

    // ── Step 8: Ensure Published is OFF (draft) ──
    // Read the actual toggle state and only click it if it is currently ON.
    // Never click it when it is already OFF — that would flip it back to Published.
    try {
      const toggleResult = await page.evaluate(() => {
        const sw = document.querySelector('button[role="switch"]');
        if (!sw) return 'not-found';
        const isOn = sw.getAttribute('aria-checked') === 'true'
                  || sw.classList.contains('bg-green')
                  || sw.classList.contains('on');
        if (isOn) { sw.click(); return 'toggled-off'; }
        return 'already-off';
      });
      await page.waitForTimeout(300);
      log(`Published toggle: ${toggleResult} → entry will save as draft.`);
    } catch (e) {
      log(`Draft toggle skipped: ${e.message}`);
    }

    // ── Step 8.5: Dismiss modals, take screenshot ──
    await _dismissModals(page, log);

    const screenshotDir = require('path').join(__dirname, '../../public/assets/debug');
    require('fs').mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = require('path').join(screenshotDir, 'statamic-before-save.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    const appPort = process.env.APP_PORT || 4000;
    log(`Screenshot: http://localhost:${appPort}/assets/debug/statamic-before-save.png`);

    // ── Step 9: Save as Draft ──
    log('Saving as draft...');
    const createUrlSnapshot = page.url();

    const saveApiLog = [];
    const saveRespHandler = async (resp) => {
      try {
        const method = resp.request().method();
        if (['POST', 'PATCH', 'PUT'].includes(method) && resp.url().includes('/entries')) {
          const status = resp.status();
          const body = await resp.text().catch(() => '');
          saveApiLog.push(`HTTP ${status} ← ${method} /entries: ${body.substring(0, 600)}`);
        }
      } catch {}
    };

    // Intercept the entry creation POST at network level and force published:false.
    // "Save & Publish" always submits published:true — we override it before the request
    // reaches the server so the entry is always created as Draft, no post-save patching needed.
    // Use a function predicate (more reliable than glob strings which can fail on query strings).
    const _routeUrlPredicate = (url) =>
      url.href.includes(`/${collection}/entries`) && !url.href.includes('/create') && !url.href.includes('/edit');

    const forcePostHandler = async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body) {
            const was = body.published;
            body.published = false;
            // Log whether cover_image was captured in the form submission
            const ci = body.cover_image ?? body.values?.cover_image;
            log(`[intercept] POST to ${req.url().split('/').slice(-3).join('/')} — published ${was} → false | cover_image: ${ci ? JSON.stringify(ci).substring(0, 80) : 'MISSING'}`);
            await route.continue({ postData: JSON.stringify(body) });
            return;
          } else {
            log('[intercept] POST body is not JSON — passing through unchanged');
          }
        } catch (e) {
          log(`[intercept] POST body parse error — passing through (${e.message.substring(0, 60)})`);
        }
      }
      await route.continue();
    };
    await page.route(_routeUrlPredicate, forcePostHandler);

    page.on('response', saveRespHandler);

    await _saveAsDraft(page, log);

    // Wait for any URL change away from the create URL (lenient — any redirect counts)
    try {
      await page.waitForURL(url => url.href !== createUrlSnapshot, { timeout: 20000 });
    } catch { /* check below */ }

    page.off('response', saveRespHandler);
    await page.unroute(_routeUrlPredicate, forcePostHandler).catch(() => {});

    // Parse Statamic's 422 validation JSON from the save API response and log field errors clearly
    let validationFields = [];
    for (const l of saveApiLog) {
      log(`[save API] ${l}`);
      try {
        const jsonStart = l.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(l.substring(jsonStart));
          if (parsed.errors) {
            validationFields = Object.entries(parsed.errors).map(([k, v]) => `${k}: ${[].concat(v).join(', ')}`);
          }
        }
      } catch {}
    }
    if (validationFields.length) {
      log(`[save API] Validation errors — ${validationFields.join(' | ')}`);
    }

    const finalUrl = page.url();

    // Success: URL changed away from the create page
    if (finalUrl !== createUrlSnapshot && !finalUrl.includes('/entries/create')) {
      log('Entry URL changed — save succeeded.');
    } else if (finalUrl.includes('/entries/create')) {
      // URL didn't change — form save was blocked. Try the CP REST API as fallback.
      log('Form save blocked — trying direct CP API fallback...');
      const apiResult = await _apiSave(page, context, baseUrl, collection, blueprint, site, generatedContent, blogConfig, rowData, log);
      if (apiResult) {
        log(`Draft saved via API. Entry ID: ${apiResult.entryId || 'unknown'}`);
        return {
          post_id:      apiResult.entryId || 'unknown',
          post_url:     `${baseUrl}/collections/${collection}`,
          edit_url:     apiResult.editUrl || `${baseUrl}/collections/${collection}`,
          image_source: imageSource,
        };
      }
      const failDetail = validationFields.length
        ? `Required fields missing: ${validationFields.map(f => f.split(':')[0]).join(', ')}`
        : 'Check [save API] log lines above for details.';
      throw new Error(`Save failed — entry was not created. ${failDetail}`);
    }

    // Extract entry ID from the redirect URL
    const idMatch = finalUrl.match(/\/entries\/(?!create\b)([a-zA-Z0-9_-]{8,})(?:\/edit)?/);
    let entryId = idMatch ? idMatch[1] : null;

    // Fallback: extract UUID from the API response captured in saveApiLog.
    // After "Save & Publish" the browser may redirect to the collection list (no ID in URL),
    // but the POST /entries response body always contains the entry's UUID.
    if (!entryId) {
      const uuidPat = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      for (const l of saveApiLog) {
        const m = l.match(uuidPat);
        if (m) { entryId = m[0]; log(`Entry ID from API response: ${entryId}`); break; }
      }
    }

    const editUrl = entryId
      ? `${baseUrl}/collections/${collection}/entries/${entryId}/edit`
      : `${baseUrl}/collections/${collection}`;

    // ── Safety net: navigate to the entry edit page, then PATCH with published:false ──
    // After "Save & Publish" Statamic may redirect to the collection list (not the edit page),
    // so the page in the browser after saving is unpredictable.  Navigate explicitly to the
    // edit URL so we have a known Statamic CP page with <meta name="csrf-token"> in its HTML.
    if (entryId) {
      const editNavUrl = `${baseUrl}/collections/${collection}/entries/${entryId}/edit`;
      log(`Navigating to entry edit page for PATCH/image: ${editNavUrl}`);
      await page.goto(editNavUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(800); // allow Vue to mount and populate the CSRF meta tag
    } else {
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    }

    // ── Upload cover image via CP API (most reliable: bypasses Vue file-input issues) ──
    // Now that we are on the edit page (which always has <meta name="csrf-token">), upload
    // the image using the authenticated browser session. Include the asset path in the PATCH.
    let coverImageAssetPath = null;
    if (imageBuffer && entryId) {
      const imgSlug = (generatedContent.title || 'cover').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
      coverImageAssetPath = await _uploadAssetViaApi(
        context, page, baseUrl, imageBuffer, imgSlug, log
      );
    }

    if (entryId) {
      try {
        // Statamic's CP PATCH endpoint requires:
        //   slug  — from the Slug rule in updateRules
        //   date  — the date fieldtype's validation only accepts "YYYY-MM-DDTHH:mm:ss.mmmZ"
        //           (DateFieldtype::validDateFormat uses format 'Y-m-d\TH:i:s.v\Z')
        //           Plain "Y-m-d" fails; omitting date entirely also fails ("date required").
        //   cover_image — must be full asset ID "container::path" (e.g. "images::blogs/file.png")
        //           because Assets.process() calls Asset::findOrFail($id) on each value.
        //           Bare path "blogs/file.png" throws AssetNotFoundException.
        const _now = new Date();
        const _pad = (n) => String(n).padStart(2, '0');
        const dateIso = `${_now.getFullYear()}-${_pad(_now.getMonth()+1)}-${_pad(_now.getDate())}T00:00:00.000Z`;

        // Body content as a Bard node array (the Bard fieldtype won't accept HTML/plain text).
        let bardDoc = [{ type: 'paragraph', attrs: { textAlign: null } }];
        try { bardDoc = await _htmlToBardNodes(page, generatedContent.content || ''); }
        catch (e) { log(`Bard conversion failed (${e.message.split('\n')[0]}) — saving empty body.`); }

        const patchPayload = {
          published: false,
          title:     generatedContent.title,
          slug:      formSlug || (generatedContent.slug || generatedContent.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 180),
          date:      dateIso,
          content:   bardDoc,
          // Basic SEO panel: "Page Title" (≤60) + "Meta Description" (≤160), keyword-aware
          // (the generated values already weave in the primary keyword).
          seo_title:       _clip(generatedContent.seo_title || generatedContent.title || '', 60),
          seo_description: _clip(generatedContent.meta_description || '', 160),
        };
        // Blog category — "auto" (per-blog .env → statamic_category) picks the best-matching
        // of Devlyn's 7 taxonomy terms for this article; a fixed value forces one category.
        const termId = _resolveCategoryTermId(blogConfig, generatedContent, rawData);
        if (termId) patchPayload.blog_categories = [termId];
        log(`PATCH fields: content(${bardDoc.length} blocks), seo_title(${patchPayload.seo_title.length}c), seo_description(${patchPayload.seo_description.length}c), category(${termId || 'none'})`);
        // Assets fieldtype stores the full ID array; max_files:1 still uses array form for PATCH.
        if (coverImageAssetPath) patchPayload.cover_image = [coverImageAssetPath];
        const patchResult = await page.evaluate(async (p) => {
          // Statamic v4 CSRF is in window.StatamicConfig.csrfToken, NOT <meta name="csrf-token">
          const csrf = window.StatamicConfig?.csrfToken ||
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
          if (!csrf) return { ok: false, note: 'no CSRF' };
          try {
            const resp = await fetch(p.url, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' },
              body: JSON.stringify(p.payload),
            });
            const body = await resp.text().catch(() => '');
            return { ok: resp.ok, status: resp.status, body: body.substring(0, 200) };
          } catch (err) {
            return { ok: false, note: err.message };
          }
        }, { url: `${baseUrl}/collections/${collection}/entries/${entryId}`, payload: patchPayload });
        log(`Safety-net PATCH ${patchResult.status || '?'}: ${patchResult.ok ? 'OK (entry is now Draft)' : (patchResult.body || patchResult.note || 'failed')}`);
        if (patchResult.ok) {
          // PATCH succeeded — skip collection-list navigation
          log(`Draft saved. Entry ID: ${entryId}`);
          return {
            post_id:  entryId,
            post_url: `${baseUrl}/collections/${collection}`,
            edit_url: editUrl,
            image_source: imageSource,
          };
        }
      } catch {}
    }

    // ── Last resort: navigate to entry edit page and use the dropdown "Save as Draft" ──
    // The entry edit page shows "Save as Draft" in the caret dropdown when the entry is Published.
    await _setSavedEntryToDraft(page, baseUrl, collection, entryId, log);

    log(`Draft saved. Entry ID: ${entryId || 'unknown'}`);

    return {
      post_id:      entryId || `${baseUrl}/collections/${collection}`,
      post_url:     `${baseUrl}/collections/${collection}`,
      edit_url:     editUrl,
      image_source: imageSource,
    };
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────

// Lightweight reachability check (no browser) — used before the expensive image
// generation + browser launch. A moved/removed CP returns 404/410 here, so we fail fast
// with a clear message. Ambiguous statuses (e.g. a Cloudflare bot challenge on plain
// fetch) are NOT treated as fatal — the browser path handles those.
async function _preflightCpReachable(loginUrl, log) {
  try {
    const resp = await fetch(loginUrl, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (resp.status === 404 || resp.status === 410) {
      throw new Error(
        `Statamic Control Panel not found at ${loginUrl} (HTTP ${resp.status}). ` +
        `The CP URL has likely changed or the Control Panel is down — verify the site's CP is reachable in a browser ` +
        `and update this blog's Statamic URL (BLOG_DEVLYN_STATAMIC_URL / Blog Settings).`
      );
    }
  } catch (err) {
    // Re-throw our own clear error; only swallow genuine network-probe noise.
    if (/Control Panel not found/.test(err.message)) throw err;
    log?.(`CP preflight inconclusive (${err.message.substring(0, 80)}) — continuing to browser login.`);
  }
}

// Assert the login page rendered an actual login form. Guards against a 404/blank page
// (CP moved/removed) that would otherwise cause _fillLogin to fill nothing and the code
// to hang on waitForURL for the full timeout, failing with a cryptic message.
async function _assertLoginForm(page, response, loginUrl) {
  const status = response ? response.status() : 0;
  const hasForm = await page.evaluate(() =>
    !!document.querySelector('input[type="password"], input[name="password"], #password')
  ).catch(() => false);
  if (status >= 400 || !hasForm) {
    throw new Error(
      `Statamic CP login page not available at ${loginUrl} (HTTP ${status || 'unknown'}, ` +
      `login form ${hasForm ? 'present' : 'missing'}). The Control Panel URL may have changed or the CP is down — ` +
      `verify it in a browser and update this blog's Statamic URL.`
    );
  }
}

async function _fillLogin(page, username, password) {
  // Statamic login uses email + password
  const emailSelectors = ['input[name="email"]', 'input[type="email"]', '#email', 'input[name="username"]'];
  const passSelectors  = ['input[name="password"]', 'input[type="password"]', '#password'];

  for (const sel of emailSelectors) {
    const el = await page.$(sel);
    if (el) { await el.fill(username); break; }
  }
  for (const sel of passSelectors) {
    const el = await page.$(sel);
    if (el) { await el.fill(password); break; }
  }

  const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Login")'];
  for (const sel of submitSelectors) {
    const el = await page.$(sel);
    if (el) { await el.click(); break; }
  }
}

async function _fillContent(page, generatedContent, log) {
  // Statamic uses Bard (ProseMirror/Tiptap) or Markdown editors.
  // Try Bard first, then Markdown textarea, then any visible textarea.

  // 1. Bard editor — confirmed selector: .ProseMirror[contenteditable="true"]
  const bardEditor = await page.$('.ProseMirror[contenteditable="true"]');
  if (bardEditor) {
    // Statamic renders a permanent portal backdrop (div.fixed.inset-0) that intercepts pointer events.
    // title/excerpt fills work via Playwright's accessibility path; contenteditable needs force: true
    // to dispatch the click directly to the element, bypassing the overlay.
    await bardEditor.scrollIntoViewIfNeeded();
    await bardEditor.click({ force: true });
    await page.waitForTimeout(300);
    const plainText = _htmlToPlainText(generatedContent.content || '');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(plainText, { delay: 0 });
    log('Content inserted into Bard editor.');
    return;
  }

  // 2. Markdown textarea
  const markdownArea = await page.$('[data-fieldtype="markdown"] textarea, textarea[name="content"], textarea.markdown-field');
  if (markdownArea) {
    const md = _htmlToMarkdown(generatedContent.content || '');
    await markdownArea.fill(md);
    log('Content inserted into Markdown field.');
    return;
  }

  // 3. Any visible textarea
  const anyTextarea = await page.$('textarea:visible');
  if (anyTextarea) {
    await anyTextarea.fill(generatedContent.content || '');
    log('Content inserted into textarea fallback.');
    return;
  }

  log('Content field not found — title only saved.');
}

async function _fillMetaField(page, metaDescription, log) {
  if (!metaDescription) return;
  // Look for a meta_description or seo_description field
  const metaSelectors = [
    'textarea[name="meta_description"]',
    'input[name="meta_description"]',
    '[data-handle="meta_description"] textarea',
    '[data-handle="meta_description"] input',
    '[data-handle="seo_description"] textarea',
  ];
  for (const sel of metaSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.fill(metaDescription);
      log('Meta description set.');
      return;
    }
  }
}

async function _uploadFeaturedImage(page, imageBuffer, title, log) {
  try {
    const os   = require('os');
    const path = require('path');
    const slugTitle = (title || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
    const tmpPath = path.join(os.tmpdir(), `${slugTitle}.webp`);
    fs.writeFileSync(tmpPath, imageBuffer);

    // ── Method 1: File-chooser API (most reliable — triggers a real trusted event) ──
    // Click the "choose a file" link in the Cover Image field, intercept the native
    // file-picker dialog, and inject our file.  This goes through the exact same code
    // path as a manual upload, so Statamic's Vue Uploader component reacts correctly.
    let uploaded = false;
    try {
      // Narrow the search to the Cover Image field area
      const chooseSels = [
        '[data-handle="cover_image"] a',
        '.assets-fieldtype a',
        'a:has-text("choose a file")',
      ];
      let chooseEl = null;
      for (const sel of chooseSels) {
        const el = await page.$(sel);
        if (el && await el.isVisible({ timeout: 500 }).catch(() => false)) { chooseEl = el; break; }
      }

      if (chooseEl) {
        const fcPromise = page.waitForEvent('filechooser', { timeout: 5000 });
        await chooseEl.click({ force: true });
        const fc = await fcPromise;
        await fc.setFiles(tmpPath);
        // Wait for the AJAX upload to complete
        await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
        log('Cover image uploaded via file chooser (trusted event).');
        uploaded = true;
      }
    } catch (e) {
      log(`File-chooser method failed (${e.message.substring(0, 80)}) — trying setInputFiles fallback.`);
    }

    // ── Method 2: setInputFiles fallback ──
    // Less reliable for Vue SPAs (the change event may not be "trusted"), but works
    // on some Statamic versions.  Add a 1.5 s delay before networkidle so Vue has time
    // to enqueue the upload AJAX call before we check for idle.
    if (!uploaded) {
      let fileInput = null;
      let fileInputSel = '';
      for (const sel of [
        '[data-handle="cover_image"] input[type="file"]',
        '[data-handle="cover_image"] .uploader input[type="file"]',
        '[data-fieldtype="assets"] input[type="file"]',
        '.assets-fieldtype input[type="file"]',
        'input[type="file"]',
      ]) {
        fileInput = await page.$(sel);
        if (fileInput) { fileInputSel = sel; break; }
      }
      if (fileInput) {
        log(`Cover image setInputFiles (${fileInputSel})...`);
        await fileInput.setInputFiles(tmpPath);
        await page.waitForTimeout(1500); // let Vue queue the upload XHR
        await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
        log('Cover image setInputFiles done (networkidle wait completed).');
      } else {
        log('Cover image upload skipped — no file input found in the form.');
      }
    }

    fs.unlink(tmpPath, () => {});
  } catch (err) {
    log(`Cover image upload skipped: ${err.message.substring(0, 100)}`);
  }
}

// Upload image to Statamic's asset container via the CP REST API.
// Uses the Playwright browser context (authenticated session + CSRF) so no extra
// credentials are needed.  Returns the asset path (e.g. "blogs/my-title.webp") on
// success, or null on failure.
async function _uploadAssetViaApi(context, page, baseUrl, imageBuffer, slug, log) {
  try {
    // Statamic v4 CP pages inject CSRF into window.StatamicConfig.csrfToken (JavascriptComposer).
    // <meta name="csrf-token"> only exists on the /auth/login page — not on any post-login page.
    const csrf = await page.evaluate(() =>
      window.StatamicConfig?.csrfToken ||
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
      ''
    ).catch(() => '');

    if (!csrf) {
      log('Cover image CP-API upload: CSRF token not available — skipping.');
      return null;
    }

    // Detect actual format from magic bytes — the buffer may be PNG (Devlyn overlay) or WebP.
    // Sending the wrong extension causes Statamic's ImageGenerator to reject with HTTP 500.
    const buf = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
    const isPNG  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    const fileExt  = isPNG ? 'png' : 'webp';
    const mimeType = isPNG ? 'image/png' : 'image/webp';
    const filename = `${slug}-cover.${fileExt}`;
    log(`Uploading cover image via CP API: blogs/${filename} (${mimeType})`);

    // Strategy: try 'overwrite' first to keep the clean filename.
    // 'overwrite' calls reupload() which works correctly when the asset is already
    // in Stache (exists()=true → generateMeta() writes full mime_type → ImageGenerator OK).
    // On first upload the asset isn't in Stache yet, so reupload() writes empty meta
    // and ImageGenerator throws HTTP 500. In that case fall back to 'timestamp' which
    // routes through upload() → save() → Stache updated → correct meta → HTTP 200.
    // After that first 'timestamp' upload the asset lives in Stache, so every subsequent
    // 'overwrite' (retry) succeeds with the same clean filename and no timestamp suffix.
    const _uploadWithOption = async (option) => context.request.post(`${baseUrl}/assets`, {
      headers: {
        'X-CSRF-TOKEN': csrf,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
      },
      multipart: {
        container: 'images',
        folder: 'blogs',
        option,
        file: { name: filename, mimeType, buffer: buf },
      },
    });

    let response = await _uploadWithOption('overwrite');
    if (response.status() === 500) {
      log('Cover image upload: overwrite failed (asset not in Stache yet) — retrying with timestamp option');
      response = await _uploadWithOption('timestamp');
    }

    const status = response.status();
    const bodyText = await response.text().catch(() => '');
    log(`CP-API asset upload: HTTP ${status} — ${bodyText.substring(0, 300)}`);

    if (!response.ok()) return null;

    // Parse the returned asset ID.
    // Statamic returns { data: { id: "images::blogs/…", path: "blogs/…" } }
    // The assets fieldtype process() calls Asset::findOrFail($id) on each value in the PATCH,
    // so we must send the full "container::path" ID, not the bare path.
    try {
      const data = JSON.parse(bodyText);
      const id = data?.data?.id || `images::blogs/${filename}`;
      log(`Cover image asset ID: ${id}`);
      return id;
    } catch {
      // Body wasn't parseable JSON; derive ID from known container + folder + filename
      log(`CP-API response was not JSON — using derived ID: images::blogs/${filename}`);
      return `images::blogs/${filename}`;
    }
  } catch (err) {
    log(`Cover image CP-API upload error: ${err.message.substring(0, 120)}`);
    return null;
  }
}

async function _setDraftStatus(page, log) {
  // Statamic v4: status toggle or "Save as draft" option in save button dropdown
  const draftSelectors = [
    'button:has-text("Save as draft")',
    '[data-status="draft"]',
    '.status-toggle button:has-text("Draft")',
  ];

  for (const sel of draftSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click();
      log('Status set to draft.');
      return;
    }
  }

  // Try the publish toggle — if it shows "Published", click to set to draft
  const publishToggle = await page.$('.publish-toggle, [data-testid="status-toggle"], .status-bar__status');
  if (publishToggle) {
    const text = (await publishToggle.textContent() || '').toLowerCase();
    if (text.includes('publish') && !text.includes('draft')) {
      await publishToggle.click();
      await page.waitForTimeout(300);
      log('Status toggled to draft.');
      return;
    }
  }

  log('Draft status toggle not found — entry will be saved with default status.');
}

// Save the entry as a Draft.
// With default_publish_state:false the Published toggle starts OFF, so clicking the main
// "Save & Publish" button submits with published=false → saved as Draft.
// We never touch the dropdown caret — opening it and pressing Escape corrupts Vue form state.
async function _saveAsDraft(page, log) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // ── Strategy 1: click the main save button (toggle is already OFF = Draft) ──
  const saveSelectors = [
    'button:has-text("Save as draft")',
    'button:has-text("Save as Draft")',
    'button:has-text("Save & Publish")',
    'button:has-text("Save and publish")',
    'button:has-text("Save entry")',
    'button.btn-primary:has-text("Save")',
    'button[type="submit"]:has-text("Save")',
    'button:has-text("Save")',
  ];
  for (const sel of saveSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn && await btn.isVisible()) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ force: true });
        await page.waitForTimeout(3000);
        const label = (await btn.textContent().catch(() => sel)).trim();
        log(`Save button clicked: "${label}" (toggle OFF → entry saves as Draft).`);
        return true;
      }
    } catch {}
  }

  // ── Strategy 2: keyboard shortcut fallback ──
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(3000);
  log('Entry save attempted via Ctrl+S.');
  return false;
}

async function _saveEntry(page, log) {
  return _saveAsDraft(page, log);
}

// Fill required Meta sidebar fields: Slug* and Date*
// Returns the slug string that was set (needed by PATCH payload).
async function _fillMetaSidebar(page, generatedContent, log) {
  let usedSlug = null;

  // ── Slug ──
  try {
    const slugSelectors = [
      'input[name="slug"]',
      '[data-handle="slug"] input',
      'input[id*="slug"]',
    ];
    for (const sel of slugSelectors) {
      const el = await page.$(sel);
      if (el) {
        // Append a 6-digit epoch-second suffix to guarantee uniqueness on every submission.
        // Use keyboard.type() (not fill) so Vue's v-model reactive state is updated correctly.
        const _uid = Math.floor(Date.now() / 1000).toString().slice(-6);
        const slug = (generatedContent.slug || generatedContent.title || '')
          .toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 180) + `-${_uid}`;
        await page.locator(sel).click({ force: true });
        await page.waitForTimeout(150);
        await page.keyboard.press('Control+a');  // select auto-generated slug
        await page.waitForTimeout(50);
        await page.keyboard.type(slug, { delay: 10 });  // real keystrokes → Vue state updates
        await page.waitForTimeout(500);
        log(`Slug set: ${slug}`);
        usedSlug = slug;
        break;
      }
    }
  } catch (e) {
    log(`Slug skipped: ${e.message}`);
  }

  // ── Date ── (required field in the Meta section, must have a value)
  try {
    const dateSelectors = [
      'input[name="date"]',
      '[data-handle="date"] input',
      'input[id*="date"]',
      '.date-fieldtype input',
    ];
    for (const sel of dateSelectors) {
      const el = await page.$(sel);
      if (el) {
        const current = await el.inputValue().catch(() => '');
        if (!current) {
          // Date is empty — fill with today's date (Statamic expects M/D/YYYY)
          const now = new Date();
          // ISO format works for type="date" inputs; keyboard fallback for custom Vue date pickers
          const isoDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
          await el.click({ force: true });
          await page.waitForTimeout(200);
          try {
            await el.fill(isoDate);
            await page.keyboard.press('Escape');
            log(`Date set: ${isoDate}`);
          } catch {
            const usDate = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
            await page.keyboard.type(usDate, { delay: 50 });
            await page.keyboard.press('Enter');
            log(`Date set via keyboard: ${usDate}`);
          }
        }
        break;
      }
    }
  } catch (e) {
    log(`Date skipped: ${e.message}`);
  }

  return usedSlug;
}

// Select a category in Statamic's relationship/terms fieldtype.
async function _selectCategory(page, preferredCategory, log) {
  try {
    const catSels = ['[data-handle="blog_categories"] input', 'input[placeholder="Choose..."]'];
    let catInput = null;
    for (const s of catSels) { catInput = await page.$(s); if (catInput) break; }
    if (!catInput) { log?.('Category field not found — skipping.'); return; }

    // Open the dropdown
    await catInput.click({ force: true });
    await page.waitForTimeout(1200);

    // Type to filter if a preferred category name is configured
    if (preferredCategory) {
      await page.keyboard.type(preferredCategory, { delay: 30 });
      await page.waitForTimeout(600);
    }

    // Wait for dropdown items to appear in the DOM
    await page.waitForSelector(
      '[role="option"], .vs__dropdown-option, [role="listbox"] li',
      { state: 'visible', timeout: 5000 }
    ).catch(() => {});

    // Method 1: Playwright locator with force:true (works through portal overlay)
    const optSel = preferredCategory
      ? `[role="option"]:has-text("${preferredCategory}"), li:has-text("${preferredCategory}")`
      : '[role="option"], .vs__dropdown-option, [role="listbox"] li';
    try {
      const optLoc = page.locator(optSel).first();
      if (await optLoc.count() > 0) {
        await optLoc.click({ force: true });
        await page.waitForTimeout(400);
        const picked = await optLoc.textContent().catch(() => '');
        log?.(`Category selected: "${picked.trim()}"`);
        return;
      }
    } catch {}

    // Method 2: JS dispatchEvent (fallback — works even when locator count returns 0)
    const selected = await page.evaluate((preferred) => {
      const sels = ['[role="option"]', '.vs__dropdown-option', '[role="listbox"] li', 'li[id*="option"]', 'li'];
      for (const s of sels) {
        for (const item of document.querySelectorAll(s)) {
          const text = (item.textContent || '').trim();
          if (text.length < 2) continue;
          if (preferred && !text.toLowerCase().includes(preferred.toLowerCase())) continue;
          ['mousedown', 'mouseup', 'click'].forEach(t =>
            item.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
          );
          return text;
        }
      }
      return null;
    }, preferredCategory || '');

    if (selected) {
      log?.(`Category selected (JS): "${selected}"`);
      await page.waitForTimeout(300);
      return;
    }

    // Method 3: Keyboard ArrowDown + Enter
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    log?.('Category selection attempted via keyboard fallback.');
  } catch (e) {
    log?.(`Category selection error: ${e.message}`);
  }
}

// Auto-select the first available author in the Author relationship field.
// The field uses the same dropdown pattern as Category.
async function _selectAuthor(page, log) {
  try {
    const authorSels = [
      '[data-handle="author"] input',
      '[data-handle="authors"] input',
    ];
    let authorInput = null;
    for (const s of authorSels) { authorInput = await page.$(s); if (authorInput) break; }
    if (!authorInput) return; // field not present in this blueprint — skip silently

    // Check if already has a value (tag/chip shown inside field)
    const hasValue = await page.evaluate((sels) => {
      for (const s of sels) {
        const field = document.querySelector(s.replace(' input', ''));
        if (field && field.querySelector('[class*="tag"], [class*="badge"], [class*="pill"]')) return true;
      }
      return false;
    }, authorSels);
    if (hasValue) { log?.('Author already set.'); return; }

    // Open dropdown
    await authorInput.click({ force: true });
    await page.waitForTimeout(1000);

    // Wait for items to appear
    await page.waitForSelector('[role="option"], .vs__dropdown-option', { state: 'visible', timeout: 5000 }).catch(() => {});

    // Method 1: locator force-click first option
    try {
      const optLoc = page.locator('[role="option"], .vs__dropdown-option').first();
      if (await optLoc.count() > 0) {
        const picked = await optLoc.textContent().catch(() => '');
        await optLoc.click({ force: true });
        await page.waitForTimeout(400);
        log?.(`Author selected: "${picked.trim()}"`);
        return;
      }
    } catch {}

    // Method 2: JS dispatchEvent
    const selected = await page.evaluate(() => {
      for (const s of ['[role="option"]', '.vs__dropdown-option', '[role="listbox"] li']) {
        const item = document.querySelector(s);
        if (item) {
          const text = (item.textContent || '').trim();
          ['mousedown', 'mouseup', 'click'].forEach(t =>
            item.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
          );
          return text;
        }
      }
      return null;
    });
    if (selected) { log?.(`Author selected (JS): "${selected}"`); return; }

    // Method 3: keyboard
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    log?.('Author selection attempted via keyboard fallback.');
  } catch (e) {
    log?.(`Author selection skipped: ${e.message}`);
  }
}

// Save the entry directly via Statamic's CP REST endpoint using Playwright's APIRequestContext.
// context.request shares cookies with the browser session, so CSRF tokens are valid.
async function _apiSave(page, context, baseUrl, collection, blueprint, site, generatedContent, blogConfig, rowData, log) {
  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const dateSuffix = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const slug = (generatedContent.slug || generatedContent.title || '')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 180) + `-${dateSuffix}`;

    let bardDoc = [{ type: 'paragraph', attrs: { textAlign: null } }];
    try { bardDoc = await _htmlToBardNodes(page, generatedContent.content || ''); } catch {}
    const termId = _resolveCategoryTermId(blogConfig, generatedContent, rowData || {});

    const saveUrl = `${baseUrl}/collections/${collection}/entries`;
    const payload = {
      title:      generatedContent.title,
      slug,
      published:  false,
      date:       dateStr,
      excerpt:    generatedContent.meta_description || '',
      content:    bardDoc,
      seo_title:       _clip(generatedContent.seo_title || generatedContent.title || '', 60),
      seo_description: _clip(generatedContent.meta_description || '', 160),
      _blueprint: blueprint,
      _site:      site,
    };
    if (termId) payload.blog_categories = [termId];

    // Use fetch() with the CSRF token from the page's meta tag.
    // fetch() is always available; window.axios may not be globally exposed in Statamic CP.
    const result = await page.evaluate(async (p) => {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      if (!csrf) return { status: 0, ok: false, error: 'CSRF token meta tag not found' };
      try {
        const resp = await fetch(p.saveUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrf,
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(p.payload),
        });
        const data = await resp.json().catch(() => null);
        return { status: resp.status, ok: resp.ok, data };
      } catch (err) {
        return { status: 0, ok: false, error: err.message || 'fetch failed' };
      }
    }, { saveUrl, payload });

    log(`[API save] HTTP ${result.status}: ${result.ok ? 'OK' : result.error}`);

    if (result.ok && result.data) {
      const json = result.data;
      const entryId = json?.data?.id || json?.id || null;
      const editUrl = json?.data?.edit_url
        ? `${baseUrl.replace(/https?:\/\/[^/]+/, '')}${json.data.edit_url}`.replace(/^\/\//, '/')
        : (json?.redirect ? `${baseUrl.split('/').slice(0, 3).join('/')}${json.redirect}` : null);
      return { entryId, editUrl };
    }

    log(`[API save] Failed — server returned ${result.status}: ${result.error || ''}`);
    return null;
  } catch (e) {
    log(`[API save] Error: ${e.message}`);
    return null;
  }
}

// Dismiss any blocking modal dialogs (e.g. Statamic Pro licensing alert).
// When open, a modal traps keyboard focus — keyboard.type() goes into the void instead of form fields.
async function _dismissModals(page, log) {
  const dismissBtns = [
    'button:has-text("Snooze")',
    'button:has-text("Dismiss")',
    'button:has-text("Got it")',
    '[role="dialog"] button:has-text("Close")',
    '[class*="modal"] button:has-text("Close")',
  ];
  for (const sel of dismissBtns) {
    try {
      const btn = await page.$(sel);
      if (btn && await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(600);
        log?.(`Modal dismissed (${sel}).`);
        return true;
      }
    } catch {}
  }
  return false;
}

// Wait for Statamic's portal overlay (modal backdrop / relationship-field loader) to clear.
// The overlay is a div.fixed.inset-0 with backdrop-blur that blocks all pointer events.
async function _waitForOverlayClear(page, log) {
  const OVERLAY_SEL = 'div.fixed.inset-0[class*="backdrop"]';
  const hasOverlay = await page.$(OVERLAY_SEL).catch(() => null);
  if (!hasOverlay) return;

  if (log) log('Waiting for portal overlay to clear...');
  const cleared = await page.waitForFunction(
    (sel) => !document.querySelector(sel),
    OVERLAY_SEL,
    { timeout: 15000 }
  ).catch(() => false);

  if (!cleared) {
    if (log) log('Overlay still present — pressing Escape to dismiss...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  }
}

// Strip HTML tags to plain text for Bard editor keyboard input
function _htmlToPlainText(html) {
  return String(html || '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Convert HTML to basic Markdown for Markdown fields
function _htmlToMarkdown(html) {
  return String(html || '')
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '_$1_')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Convert generated HTML into a Statamic Bard (ProseMirror) node array, using the
// browser's real DOMParser. Typing the article into the Bard editor (the old approach)
// took ~7 min for a long post AND did not persist — the Bard fieldtype stores a
// structured node array, so we build that array here and PATCH it via the CP API.
// Node schema matches what live Devlyn entries use:
//   paragraph {attrs:{textAlign:null}}, heading {attrs:{textAlign:null,level}},
//   bulletList/orderedList → listItem → paragraph, marks: bold/italic/code/link.
async function _htmlToBardNodes(page, html) {
  if (!html) return [{ type: 'paragraph', attrs: { textAlign: null } }];
  return page.evaluate((rawHtml) => {
    const doc = new DOMParser().parseFromString(`<div id="__root">${rawHtml}</div>`, 'text/html');
    const root = doc.getElementById('__root');
    const REL = 'noopener noreferrer nofollow';

    const inline = (el, marks) => {
      marks = marks || [];
      const out = [];
      el.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          const text = child.textContent;
          if (text) out.push(marks.length ? { type: 'text', marks: marks.slice(), text } : { type: 'text', text });
        } else if (child.nodeType === 1) {
          const tag = child.tagName.toLowerCase();
          const m = marks.slice();
          if (tag === 'strong' || tag === 'b') m.push({ type: 'bold' });
          else if (tag === 'em' || tag === 'i') m.push({ type: 'italic' });
          else if (tag === 'code') m.push({ type: 'code' });
          else if (tag === 'a') m.push({ type: 'link', attrs: { href: child.getAttribute('href') || '', target: '_blank', rel: REL, title: null } });
          else if (tag === 'br') { out.push({ type: 'text', text: ' ' }); return; }
          out.push(...inline(child, m));
        }
      });
      return out;
    };
    const para = (el) => {
      const content = inline(el);
      return content.length ? { type: 'paragraph', attrs: { textAlign: null }, content } : null;
    };
    const listItems = (listEl) => {
      const items = [];
      listEl.querySelectorAll(':scope > li').forEach((li) => {
        const content = inline(li);
        items.push({ type: 'listItem', content: [content.length ? { type: 'paragraph', attrs: { textAlign: null }, content } : { type: 'paragraph', attrs: { textAlign: null } }] });
      });
      return items;
    };

    const nodes = [];
    root.childNodes.forEach((el) => {
      if (el.nodeType === 3) {
        const t = el.textContent.trim();
        if (t) nodes.push({ type: 'paragraph', attrs: { textAlign: null }, content: [{ type: 'text', text: t }] });
        return;
      }
      if (el.nodeType !== 1) return;
      const tag = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        let level = parseInt(tag[1], 10); if (level < 2) level = 2;
        nodes.push({ type: 'heading', attrs: { textAlign: null, level }, content: inline(el) });
      } else if (tag === 'p') {
        const p = para(el); if (p) nodes.push(p);
      } else if (tag === 'ul') {
        const items = listItems(el); if (items.length) nodes.push({ type: 'bulletList', attrs: {}, content: items });
      } else if (tag === 'ol') {
        const items = listItems(el); if (items.length) nodes.push({ type: 'orderedList', attrs: { start: 1, type: null }, content: items });
      } else if (tag === 'blockquote') {
        const inner = [];
        el.querySelectorAll(':scope > p').forEach((p) => { const pp = para(p); if (pp) inner.push(pp); });
        if (!inner.length) { const c = inline(el); if (c.length) inner.push({ type: 'paragraph', attrs: { textAlign: null }, content: c }); }
        nodes.push({ type: 'blockquote', content: inner.length ? inner : [{ type: 'paragraph', attrs: { textAlign: null } }] });
      } else {
        const p = para(el); if (p) nodes.push(p);
      }
    });
    return nodes.length ? nodes : [{ type: 'paragraph', attrs: { textAlign: null } }];
  }, html);
}

// Devlyn's "Blog Categories" taxonomy — verified term IDs (slugs are NOT plain kebab-case:
// "Cloud & Modernizations"→cloud, "Software Development"→software-dev) plus the distinctive
// keywords used to auto-pick the best-matching category per article. Order matters only as a
// tie-break (earlier = slightly preferred). Keep keywords distinctive to avoid false hits.
const DEVLYN_BLOG_CATEGORIES = [
  { id: 'blog_categories::artificial-intelligence', title: 'Artificial Intelligence',
    kw: ['llm', 'rag', 'agent', 'agents', 'agentic', 'gpt', 'claude', 'langchain', 'llamaindex',
         'machine learning', 'voice ai', 'voice agent', 'chatbot', 'fine-tun', 'fine tun', 'prompt',
         'multi-agent', 'vapi', 'retell', 'bland ai', 'hallucinat', 'generative', 'token cost', 'genai'] },
  { id: 'blog_categories::hiring-outsourcing', title: 'Hiring & Outsourcing',
    kw: ['hir', 'outsourc', 'offshore', 'staff augmentation', 'staff aug', 'recruit', 'contractor',
         'dedicated developer', 'developer cost', 'dev cost', 'candidate', 'interview', 'onboard',
         'agency', 'agencies', 'capacity', 'augmentation', ' pod', 'vendor'] },
  { id: 'blog_categories::cloud', title: 'Cloud & Modernizations',
    kw: ['cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'devops', 'migrat', 'moderniz',
         'microservice', 'octane', 'infrastructure', 'serverless', 'n8n', 'zapier', 'make.com',
         'automation', 'workflow'] },
  { id: 'blog_categories::startup-mvp', title: 'Startup & MVP',
    kw: ['startup', 'mvp', 'founder', 'product-market', 'bootstrap', 'early-stage', 'early stage',
         'non-technical', 'go-to-market'] },
  { id: 'blog_categories::app-development', title: 'App Development',
    kw: ['mobile app', 'ios', 'android', 'frontend', 'booking system', 'e-commerce', 'ecommerce',
         'saas app', 'build an app', 'build a saas'] },
  { id: 'blog_categories::software-dev', title: 'Software Development',
    kw: ['laravel', 'php', 'symfony', 'codebase', 'refactor', 'rest api', 'backend', 'framework',
         'crud', 'django', 'fastapi', 'python', 'code quality', 'monolith', 'queue', 'eloquent'] },
  { id: 'blog_categories::business-intelligence', title: 'Business Intelligence',
    kw: ['business intelligence', 'analytics', 'data warehouse', 'dashboard', 'reporting', 'kpi'] },
];

// Score each category against the article (title + primary keyword weigh heavily, body lightly)
// and return the best-matching term id. Used when statamic_category is "auto" or blank.
function _autoPickCategoryTermId(generatedContent, rawData) {
  const title = (generatedContent.title || '').toLowerCase();
  const kw = String((rawData && rawData.primary_keyword) || generatedContent.primary_keyword || '').toLowerCase();
  const body = _htmlToPlainText(generatedContent.content || '').toLowerCase().slice(0, 4000);
  const strong = ` ${title} ${title} ${kw} ${kw} `;   // title/keyword weighted ×2 by repetition
  const full = ` ${strong} ${body} `;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const count = (hay, term) => (hay.match(new RegExp(`\\b${esc(term)}`, 'g')) || []).length;
  let best = '', bestScore = 0;
  for (const cat of DEVLYN_BLOG_CATEGORIES) {
    let score = 0;
    for (const t of cat.kw) score += count(strong, t) * 5 + count(full, t);
    if (score > bestScore) { bestScore = score; best = cat.id; }
  }
  return best || 'blog_categories::software-dev'; // sensible default for this dev-led brand
}

// Resolve the blog_categories PATCH value. "auto"/blank → pick best per article; a full term id
// (contains "::") → use as-is; a known display name → its verified id; else kebab-case fallback.
function _resolveCategoryTermId(blogConfig, generatedContent, rawData) {
  const raw = String((blogConfig && blogConfig.statamic_category) || '').trim();
  if (!raw || raw.toLowerCase() === 'auto') return _autoPickCategoryTermId(generatedContent, rawData);
  if (raw.includes('::')) return raw;
  const byName = DEVLYN_BLOG_CATEGORIES.find((c) => c.title.toLowerCase() === raw.toLowerCase());
  if (byName) return byName.id;
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug ? `blog_categories::${slug}` : '';
}

// Clip an SEO string to a max length on a word boundary (no mid-word cuts).
function _clip(str, max) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-]+$/, '');
}

// Navigate to the entry EDIT page and use the save-button dropdown to "Save as Draft".
// This is the most reliable last-resort method: we're on the entry page (not the list), so the
// "Save as Draft" option is always reachable via the caret next to "Save & Publish".
async function _setSavedEntryToDraft(page, baseUrl, collection, entryId, log) {
  if (!entryId) { log('_setSavedEntryToDraft: no entryId — skipping.'); return false; }
  try {
    const editUrl = `${baseUrl}/collections/${collection}/entries/${entryId}/edit`;
    log(`Navigating to entry edit page to force Draft status: ${editUrl}`);
    await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // Vue component mount time

    // Check if already Draft (toggle aria-checked="false" or not bg-green)
    const alreadyDraft = await page.evaluate(() => {
      const sw = document.querySelector('button[role="switch"]');
      if (!sw) return false; // can't tell — proceed anyway
      const on = sw.getAttribute('aria-checked') === 'true' || sw.classList.contains('bg-green') || sw.classList.contains('on');
      return !on;
    }).catch(() => false);
    if (alreadyDraft) { log('Entry is already Draft on edit page.'); return true; }

    // The entry is Published. Open the caret dropdown (the small button AFTER "Save & Publish")
    // — in that state the dropdown shows "Save as Draft".
    const caretClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(b => /save\s*(&|and)\s*publish/i.test((b.textContent || '').trim()));
      if (!saveBtn) return false;

      // Walk up to the nearest container that holds MORE than one button
      let container = saveBtn.parentElement;
      for (let i = 0; i < 4 && container; i++) {
        if (container.querySelectorAll('button').length > 1) break;
        container = container.parentElement;
      }
      if (!container) return false;

      const siblings = Array.from(container.querySelectorAll('button'));
      for (const btn of siblings) {
        if (btn === saveBtn) continue;
        const txt = (btn.textContent || '').trim();
        // Caret button: no visible text, OR a single arrow/chevron glyph, OR it contains an SVG
        if (txt.length === 0 || /^[▾▼⌄›>v]$/.test(txt) || btn.querySelector('svg')) {
          btn.click();
          return true;
        }
      }

      // Last resort: click the element right after "Save & Publish"
      const next = saveBtn.nextElementSibling;
      if (next && next.tagName === 'BUTTON') { next.click(); return true; }
      return false;
    });

    if (!caretClicked) { log('Could not open caret dropdown on edit page.'); return false; }
    await page.waitForTimeout(700);

    const draftBtn = await page.$(
      'button:has-text("Save as draft"), button:has-text("Save as Draft"), [role="menuitem"]:has-text("Save as draft"), li:has-text("Save as draft")'
    );
    if (!draftBtn) {
      await page.keyboard.press('Escape');
      log('Caret dropdown opened but "Save as Draft" option not found.');
      return false;
    }
    await draftBtn.click({ force: true });
    await page.waitForTimeout(3000);
    log('Entry saved as Draft via dropdown "Save as Draft" option.');
    return true;
  } catch (e) {
    log(`_setSavedEntryToDraft failed: ${e.message.substring(0, 120)}`);
    return false;
  }
}

module.exports = { testConnection, postDraft, _autoPickCategoryTermId, _resolveCategoryTermId, _htmlToBardNodes, _clip };
