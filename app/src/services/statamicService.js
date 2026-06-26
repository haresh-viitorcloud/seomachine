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

    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

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
    await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await _fillLogin(page, username, password);
    await page.waitForURL(url => !url.href.includes('/auth/login'), { timeout: 20000 });
    log('Login successful.');

    // ── Step 2: Generate featured image ──
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

    // ── Step 3: Navigate directly to create form ──
    // Correct Statamic v4 create URL: /collections/{col}/entries/create/{site}?blueprint={blueprint}
    // e.g. /collections/blogs/entries/create/default?blueprint=article
    const blueprint = (blogConfig.statamic_blueprint || 'article').trim();
    const site      = (blogConfig.statamic_site || 'default').trim();
    const createUrl = `${baseUrl}/collections/${encodeURIComponent(collection)}/entries/create/${site}?blueprint=${blueprint}`;

    log(`Navigating to create form: ${createUrl}`);
    await page.goto(createUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // let Vue hydrate the form

    // Wait for the Title* input (input.input-text — first text input on the form)
    await page.waitForSelector('input.input-text', { timeout: 20000 });
    log('Entry form loaded.');

    // ── Step 4: Fill Title* field ──
    // First input.input-text on the page is the Title field (as shown in screenshot)
    const titleInput = await page.$('input.input-text');
    await titleInput.click({ clickCount: 3 });
    await titleInput.fill(generatedContent.title);
    log(`Title set: "${generatedContent.title}"`);

    // ── Step 5: Fill Excerpt field (textarea above Content) ──
    // Excerpt is the first textarea visible on the form
    try {
      const excerptArea = await page.$('textarea');
      if (excerptArea && await excerptArea.isVisible()) {
        await excerptArea.fill(generatedContent.meta_description || '');
        log('Excerpt set.');
      }
    } catch (e) {
      log(`Excerpt skipped: ${e.message}`);
    }

    // ── Step 6: Fill Content (Bard rich-text editor) ──
    await _fillContent(page, generatedContent, log);

    // ── Step 7: Upload Cover Image if available ──
    if (imageBuffer) {
      await _uploadFeaturedImage(page, imageBuffer, generatedContent.title, log);
    }

    // ── Step 8: Toggle "Published" OFF → saves as Draft ──
    // Right sidebar shows "Published" toggle (green/ON by default).
    // Clicking button[role="switch"] when aria-checked="true" turns it OFF → draft.
    try {
      const publishToggle = await page.$('button[role="switch"]');
      if (publishToggle) {
        const checked = await publishToggle.getAttribute('aria-checked');
        if (checked === 'true') {
          await publishToggle.click();
          await page.waitForTimeout(400);
          log('Published toggled OFF — entry will be saved as draft.');
        } else {
          log('Published already OFF — will save as draft.');
        }
      } else {
        log('Published toggle not found — proceeding with save.');
      }
    } catch (e) {
      log(`Draft toggle skipped: ${e.message}`);
    }

    // ── Step 9: Save ──
    log('Saving draft entry...');
    const saved = await _saveEntry(page, log);
    if (!saved) log('Save button not found — trying keyboard shortcut...');

    // Wait for URL to update with entry ID
    try {
      await page.waitForURL(url => /entries\/[^/]+\/edit/.test(url.href) || /entries\/[^/]+$/.test(url.href), { timeout: 15000 });
    } catch { /* URL may already be on entry page */ }

    const finalUrl = page.url();
    const idMatch = finalUrl.match(/entries\/([^/?#]+)(?:\/edit)?/) ;
    const entryId = idMatch ? idMatch[1] : null;

    const editUrl = entryId
      ? `${baseUrl}/collections/${collection}/entries/${entryId}/edit`
      : `${baseUrl}/collections/${collection}/entries`;

    log(`Draft saved. Entry ID: ${entryId || 'unknown'}`);

    return {
      post_id:      entryId || finalUrl,
      post_url:     `${baseUrl}/collections/${collection}/entries`,
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

  // 1. Bard editor (ProseMirror contenteditable div)
  const bardEditor = await page.$('.bard-editor .ProseMirror, [data-fieldtype="bard"] .ProseMirror, .ProseMirror[contenteditable="true"]');
  if (bardEditor) {
    await bardEditor.click();
    // Set content via ProseMirror — insert as plain text via the clipboard API
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
  // Cover Image field in Statamic v4: has "Browse Assets" button and a drag-drop area.
  // Use the hidden file input directly with setInputFiles — more reliable than clicking UI.
  try {
    const os   = require('os');
    const path = require('path');
    const tmpPath = path.join(os.tmpdir(), `statamic-cover-${Date.now()}.webp`);
    fs.writeFileSync(tmpPath, imageBuffer);

    // Trigger the file chooser by clicking "Browse Assets" or "choose a file" link,
    // then intercept with setInputFiles on the file input that Statamic opens.
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser({ timeout: 8000 }).catch(() => null),
      page.click('button:has-text("Browse Assets"), a:has-text("choose a file"), label:has-text("Cover Image") ~ * button').catch(() => {}),
    ]);

    if (fileChooser) {
      await fileChooser.setFiles(tmpPath);
      await page.waitForTimeout(4000); // wait for upload to complete
      log('Cover image uploaded via file chooser.');
    } else {
      // Fallback: find any hidden file input and set directly
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(tmpPath);
        await page.waitForTimeout(4000);
        log('Cover image uploaded via file input.');
      } else {
        log('Cover image upload skipped — no file input found.');
      }
    }
    fs.unlink(tmpPath, () => {});
  } catch (err) {
    log(`Cover image upload skipped: ${err.message.substring(0, 100)}`);
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

async function _saveEntry(page, log) {
  // Statamic v4 save button is "Save & Publish" (top right of form).
  // When Published toggle is OFF it still saves, but as a draft.
  const saveSelectors = [
    'button:has-text("Save & Publish")',
    'button:has-text("Save and publish")',
    'button:has-text("Save entry")',
    'button.btn-primary:has-text("Save")',
    'button[type="submit"]:has-text("Save")',
    'button:has-text("Save")',
  ];

  for (const sel of saveSelectors) {
    const btn = await page.$(sel);
    if (btn && await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(3000);
      log('Entry saved.');
      return true;
    }
  }

  // Fallback: keyboard shortcut
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(3000);
  return false;
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

module.exports = { testConnection, postDraft };
