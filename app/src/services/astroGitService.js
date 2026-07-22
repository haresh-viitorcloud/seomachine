/**
 * Astro/git publishing service — writes a blog post into a managed local clone of
 * devlyn-site (an Astro Content Collections site deployed via Cloudflare's native git
 * integration), runs the site's own QA gate, then commits and pushes to a dedicated
 * long-lived branch (never `main` — a human merges that branch to go live).
 *
 * Same calling convention as statamicService.js/wordpressService.js:
 *   testConnection(config) -> { ok, branch, headSha } | { ok: false, error }
 *   postDraft(blogConfig, generatedContent, rawData, logFn) -> { post_id, post_url, edit_url, image_source }
 */

const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { execFile } = require('child_process');
const imageService = require('./imageService');

const APP_DIR = path.resolve(__dirname, '../..');
const DEFAULT_BRANCH = 'feature/blog-automation';
const DEFAULT_CONTENT_DIR = 'src/content/blog';
const DEFAULT_COVERS_DIR = 'src/assets/blog-covers';
const DEFAULT_AUTHOR_NAME = 'devlyn-content-bot';
const DEFAULT_AUTHOR_EMAIL = 'content-bot@devlyn.ai';

// Per-job staging area for the review gate — lives OUTSIDE the shared git clone so a
// later job's ensureRepoReady() (which hard-resets that clone) can never wipe a post
// that's staged and waiting for a human to click Commit.
const PENDING_DIR = path.join(APP_DIR, 'data', 'pending-posts');

function stagingDir(jobId) {
  return path.join(PENDING_DIR, String(jobId));
}

// Read-only lookup for routes: is there a staged review for this job, where's its cover
// image, and what's the staged body (Markdown, straight from post.md — this is what the
// edit form shows, since generated_content in the DB is HTML and these are genuinely
// different representations, not just possibly-out-of-sync copies). Centralizes the
// staging path convention so callers never construct it.
function getStagingInfo(jobId) {
  const dir = stagingDir(jobId);
  const coverPath = path.join(dir, 'cover.png');
  const postMdPath = path.join(dir, 'post.md');
  const metaPath = path.join(dir, 'meta.json');
  let body = null;
  if (fs.existsSync(postMdPath)) {
    try { body = splitPostMdBody(fs.readFileSync(postMdPath, 'utf8')); } catch { /* ignore */ }
  }
  // Staged frontmatter `date` (YYYY-MM-DD) — lets the preview route show the admin the
  // date that will actually be committed, so a post staged on a now-past date can be
  // edited forward before Commit & Push.
  let date = null;
  if (fs.existsSync(metaPath)) {
    try { date = JSON.parse(fs.readFileSync(metaPath, 'utf8')).date || null; } catch { /* ignore */ }
  }
  return {
    exists: fs.existsSync(metaPath),
    coverPath: fs.existsSync(coverPath) ? coverPath : null,
    body,
    date,
  };
}

// Safe no-op if nothing is staged for this job — used by queueService on delete/restart.
function cleanupStaging(jobId) {
  try { fs.rmSync(stagingDir(jobId), { recursive: true, force: true }); } catch { /* ignore */ }
}

// ── Shell helpers ──

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 64, windowsHide: true, ...opts }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

function git(repoPath, args, opts = {}) {
  return run('git', ['-C', repoPath, ...args], opts);
}

// Never persist a token into .git/config — build the authed URL only for the exact
// command that needs it (clone/push/ls-remote) and keep it out of any error rethrow.
function authedUrl(repoUrl, token) {
  if (!token) return repoUrl;
  return repoUrl.replace(/^https:\/\//, `https://x-access-token:${encodeURIComponent(token)}@`);
}

function resolveRepoPath(config) {
  const p = (config.astro_repo_path || './data/repos/devlyn-site').trim();
  return path.isAbsolute(p) ? p : path.resolve(APP_DIR, p);
}

// ── Connection test ──

/**
 * Lightweight, side-effect-free check: confirms the token can read the repo and the
 * target branch exists, without a full clone.
 */
async function testConnection(config) {
  const repoUrl = (config.astro_repo_url || '').trim();
  const branch = (config.astro_branch || DEFAULT_BRANCH).trim();
  const token = (config.astro_git_token || '').trim();

  if (!repoUrl) return { ok: false, error: 'Astro repo URL is not configured.' };
  if (!token) return { ok: false, error: 'Astro git token is not configured.' };

  try {
    const url = authedUrl(repoUrl, token);
    const { stdout } = await run('git', ['ls-remote', '--heads', url, branch], { timeout: 30000 });
    const headSha = stdout.trim().split(/\s+/)[0] || null;
    return { ok: true, branch, headSha, branchExists: !!headSha };
  } catch (err) {
    const msg = (err.stderr || err.message || 'ls-remote failed').replace(new RegExp(token, 'g'), '***');
    return { ok: false, error: msg.trim().substring(0, 300) };
  }
}

// ── Repo state management ──

/**
 * Ensures a bot-owned local clone exists and is hard-reset to the latest state of
 * `astro_branch` (creating that branch off the sync branch if it doesn't exist yet).
 * This clone is app-managed state (app/data/repos/*) — never point it at a human's
 * own working checkout.
 */
async function ensureRepoReady(config, log) {
  const repoPath = resolveRepoPath(config);
  const repoUrl = (config.astro_repo_url || '').trim();
  const branch = (config.astro_branch || DEFAULT_BRANCH).trim();
  const token = (config.astro_git_token || '').trim();
  // The branch we sync FROM (base for new branches, and merged in before every job) is
  // independent of the branch we publish TO — configurable via BLOG_DEVLYN_ASTRO_SYNC_BRANCH
  // so switching astro_branch later (e.g. to "main") doesn't require a code change, and so
  // the two can never silently be forced to the same hardcoded value.
  const syncBranch = (config.astro_sync_branch || 'main').trim();

  if (!repoUrl) throw new Error('Astro repo URL is not configured for this blog.');
  if (!token) throw new Error('Astro git token is not configured for this blog.');

  const url = authedUrl(repoUrl, token);

  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    log(`Cloning devlyn-site into managed working copy (${repoPath})...`);
    fs.mkdirSync(path.dirname(repoPath), { recursive: true });
    // Clone with the authed URL — devlyn-site is private, an unauthenticated clone
    // fails with a credential prompt (no TTY). Reset origin back to the plain URL
    // right after so the token is never persisted to .git/config on disk; every
    // subsequent fetch/push below passes the authed URL explicitly instead.
    await run('git', ['clone', url, repoPath]);
    await git(repoPath, ['remote', 'set-url', 'origin', repoUrl]);
  }

  // Ensure a git committer identity on the managed clone. The sync merge below creates a
  // merge commit once `branch` and `syncBranch` diverge, which fails with "Committer identity
  // unknown" when no user.name/user.email is configured (global is usually unset on servers,
  // and the content commit sets only its own author, not the committer). Idempotent — runs on
  // every call, so a freshly cloned repo is covered too.
  await git(repoPath, ['config', 'user.name', (config.astro_git_author_name || DEFAULT_AUTHOR_NAME).trim()]);
  await git(repoPath, ['config', 'user.email', (config.astro_git_author_email || DEFAULT_AUTHOR_EMAIL).trim()]);

  log('Fetching latest from origin...');
  await git(repoPath, ['fetch', url, '+refs/heads/*:refs/remotes/origin/*']);

  const { stdout: remoteBranch } = await git(repoPath, ['ls-remote', '--heads', url, branch]);
  const branchExistsRemotely = !!remoteBranch.trim();
  const baseRef = branchExistsRemotely ? `origin/${branch}` : `origin/${syncBranch}`;

  if (!branchExistsRemotely) {
    log(`Branch "${branch}" doesn't exist on origin yet — creating it off origin/${syncBranch}.`);
  }

  await git(repoPath, ['checkout', '-B', branch, baseRef]);
  await git(repoPath, ['reset', '--hard', baseRef]);
  await git(repoPath, ['clean', '-fd']);

  // Keep the automation branch from drifting behind the sync branch: merge (not rebase —
  // this branch may already be pushed, and rebasing would force-push/rewrite it) before any
  // new content is staged/committed. Skipped when branch === syncBranch (e.g. astro_branch
  // is itself set to "main") — merging a branch into itself is a meaningless no-op and would
  // just print a confusing log line. Also skipped when the branch was just created off the
  // sync branch above (nothing to merge yet). Runs on every ensureRepoReady() call, i.e.
  // before generation (prepareForReview) AND again right before commit (commitStaged), so
  // the sync branch's latest state rides along automatically with the next push either way.
  if (branchExistsRemotely && branch !== syncBranch) {
    const { stdout: syncRemote } = await git(repoPath, ['ls-remote', '--heads', url, syncBranch]);
    if (!syncRemote.trim()) {
      log(`Sync branch "${syncBranch}" not found on origin — skipping sync.`);
    } else {
      log(`Syncing "${branch}" with origin/${syncBranch} before continuing...`);
      try {
        await git(repoPath, ['merge', `origin/${syncBranch}`, '--no-edit']);
      } catch (err) {
        await git(repoPath, ['merge', '--abort']).catch(() => {});
        throw new Error(
          `Automatic sync with origin/${syncBranch} failed — a merge conflict occurred on "${branch}". ` +
          `A human needs to resolve this manually in the managed clone (${repoPath}) or on GitHub ` +
          `before this job can continue. Original error: ${(err.stderr || err.message || '').trim()}`
        );
      }
    }
  }

  log(`Repo ready on branch "${branch}", synced with origin.`);
  return { repoPath, branch, branchExistsRemotely };
}

// ── Content helpers ──

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80)
    .replace(/-+$/, '');
}

function buildSlug(generatedContent, contentDirAbs) {
  // Prefer the actual article title over Claude's `slug` field — the title is always a
  // full, descriptive representation of the post, whereas `slug` is sometimes just the
  // primary keyword (e.g. Test Mode's mock content), which produces filenames/cover
  // images like "ai.md"/"ai-cover.png" that don't reflect the post at all.
  const base = slugify(generatedContent.title || generatedContent.slug) || `post-${Date.now()}`;
  let slug = base;
  let n = 2;
  // Avoid clobbering an unrelated existing post on the shared feature branch — the
  // branch accumulates commits across runs rather than starting fresh each time.
  while (fs.existsSync(path.join(contentDirAbs, `${slug}.md`)) || fs.existsSync(path.join(contentDirAbs, `${slug}.mdx`))) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function computeReadTime(html) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

// Small hand-rolled Levenshtein distance — the category set is tiny (a handful of
// strings), so no dependency is warranted.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

const normalizeCategory = (s) => s.trim().replace(/\s+/g, ' ').toUpperCase();

// Scans a content directory's frontmatter for `cat:` values. Returns a Map of
// normalized (trimmed/collapsed/uppercased) -> original casing, so callers can both
// look up an exact/near match (resolveCategory) and list every distinct value
// (listCategories, for the review-form dropdown).
function scanExistingCategories(contentDirAbs) {
  const existing = new Map();
  let files = [];
  try { files = fs.readdirSync(contentDirAbs).filter(f => /\.(md|mdx)$/.test(f)); } catch { /* dir may not exist yet */ }
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(contentDirAbs, file), 'utf8');
      const m = raw.match(/^cat:\s*"?([^"\n]+?)"?\s*$/m);
      if (m) existing.set(normalizeCategory(m[1]), m[1].trim());
    } catch { /* skip unreadable file */ }
  }
  return existing;
}

/**
 * Resolves a candidate category against the categories already in use on the branch,
 * so a typo/casing difference doesn't silently fragment devlyn-site's category pages
 * (there's no canonical category list in that repo — it's purely derived from posts).
 */
function resolveCategory(rawCat, contentDirAbs, log) {
  const candidate = String(rawCat || '').trim();
  if (!candidate) return { category: 'GENERAL', matched: false };

  const normCandidate = normalizeCategory(candidate);
  const existing = scanExistingCategories(contentDirAbs);

  if (existing.has(normCandidate)) {
    const matchedCat = existing.get(normCandidate);
    log(`Category resolved: "${matchedCat}" (exact match).`);
    return { category: matchedCat, matched: true };
  }

  let best = null, bestDist = Infinity;
  for (const [norm, original] of existing) {
    const d = levenshtein(normCandidate, norm);
    if (d < bestDist) { bestDist = d; best = original; }
  }

  if (best && bestDist <= 3) {
    log(`WARNING: category "${candidate}" does not exactly match any existing category. Closest: "${best}" (distance ${bestDist}). Using closest match — verify this is correct.`);
    return { category: best, matched: false, nearMiss: best };
  }

  log(`WARNING: category "${candidate}" is not close to any existing category (${[...existing.values()].join(', ') || 'none found'}). This will create a brand-new category page — verify this is intentional.`);
  return { category: candidate.toUpperCase(), matched: false, novel: true };
}

/**
 * Lists the distinct categories already in use, for populating the review-form category
 * dropdown. Reads whatever's already in the managed local clone — does NOT fetch/reset
 * (that's a git network operation; this is just for a UI dropdown, so it favors being
 * cheap/instant over perfectly fresh). Returns [] if the clone doesn't exist yet.
 */
// Junk/placeholder category values that shouldn't ever appear in the dropdown, even if
// a stray test post on the branch happens to carry one.
const EXCLUDED_CATEGORIES = new Set(['TEST', 'CUSTOM']);

function listCategories(blogConfig) {
  const repoPath = resolveRepoPath(blogConfig);
  const contentDir = (blogConfig.astro_content_dir || DEFAULT_CONTENT_DIR).trim();
  const contentDirAbs = path.join(repoPath, contentDir);
  const existing = scanExistingCategories(contentDirAbs);
  return [...existing.values()]
    .filter(c => !EXCLUDED_CATEGORIES.has(normalizeCategory(c)))
    .sort((a, b) => a.localeCompare(b));
}

function yamlString(s) {
  return `"${String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

function buildFrontmatter({ title, cat, read, excerpt, date, author, coverBasename, featured = false, noindex = false }) {
  const lines = [
    '---',
    `title: ${yamlString(title)}`,
    `cat: ${yamlString(cat)}`,
    `read: ${yamlString(read)}`,
    `excerpt: ${yamlString(excerpt)}`,
    `date: ${yamlString(date)}`,
    `featured: ${featured ? 'true' : 'false'}`,
    'order: 100',
    `author: ${yamlString(author)}`,
    ...(coverBasename ? [`cover: "/images/blogs/generated/${coverBasename}"`] : []),
    `noindex: ${noindex ? 'true' : 'false'}`,
    '---',
    '',
  ];
  return lines.join('\n');
}

async function htmlToMarkdown(html) {
  try {
    const TurndownService = require('turndown');
    const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', hr: '---' });
    return turndown.turndown(html || '');
  } catch {
    // turndown missing/failed — Astro passes raw HTML through markdown bodies fine
    // (existing legacy posts already mix raw <img> tags into .md files), so this is
    // a safe degrade, just less clean than converted Markdown.
    return html || '';
  }
}

// ── QA gate ──

// devlyn-site requires Node >= 22.12 (Astro 7), which may be newer than the Node
// version running this app itself. Rather than assume the ambient PATH has a
// compatible `node`/`npm`, look for an nvm-installed v22+ and prepend its bin dir
// to PATH for just the QA-gate child processes — the app server's own Node version
// is left untouched.
function resolveCompatibleNodeEnv(log) {
  const nvmDir = process.env.NVM_DIR || path.join(require('os').homedir(), '.nvm');
  const versionsDir = path.join(nvmDir, 'versions', 'node');
  let versions = [];
  try {
    versions = fs.readdirSync(versionsDir)
      .filter(v => /^v(2[2-9]|[3-9]\d)\./.test(v)) // v22+
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch { /* nvm not installed / no versions dir */ }

  if (!versions.length) {
    log('WARNING: no Node >=22 found via nvm — falling back to the ambient PATH. ' +
      'devlyn-site (Astro 7) requires Node >=22.12; install one with `nvm install 22` if the QA gate fails on a Node-version error.');
    return process.env;
  }
  const nodeBin = path.join(versionsDir, versions[versions.length - 1], 'bin');
  return { ...process.env, PATH: `${nodeBin}:${process.env.PATH}` };
}

// devlyn-site's own `npm run qa` is build + typecheck + validate:schema + validate:links +
// check:placeholders + test:a11y. test:a11y is deliberately EXCLUDED here (by explicit
// request) — it needs a Playwright browser binary installed in this environment, which
// isn't set up and isn't wanted as part of this pipeline. The remaining five scripts
// are the actual content-quality gates (schema/links/placeholders/build), so this still
// catches the failure modes that matter for auto-generated content.
const QA_SCRIPTS = ['build', 'typecheck', 'validate:schema', 'validate:links', 'check:placeholders'];

/**
 * Runs devlyn-site's content-quality gates (everything in npm run qa except test:a11y)
 * inside the managed clone. Throws with the failing script + tail of output on failure.
 */
async function runQaGate(repoPath, log) {
  if (process.env.ASTRO_SKIP_QA === '1') {
    log('QA gate SKIPPED (ASTRO_SKIP_QA=1) — staging/committing without the local Astro build/validate; rely on the repo PR/CI on the feature branch.');
    return;
  }
  const env = resolveCompatibleNodeEnv(log);
  const nodeModulesPath = path.join(repoPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('Installing devlyn-site dependencies (npm ci)...');
    await run('npm', ['ci'], { cwd: repoPath, env, timeout: 10 * 60000 });
  }

  for (const script of QA_SCRIPTS) {
    log(`Running devlyn-site QA step: npm run ${script}...`);
    try {
      await run('npm', ['run', script], { cwd: repoPath, env, timeout: 15 * 60000 });
    } catch (err) {
      const tail = (err.stdout || '') + (err.stderr || '');
      const err2 = new Error(`devlyn-site QA gate failed at "npm run ${script}". Last output:\n${tail.slice(-4000)}`);
      err2.qaFailure = true;
      throw err2;
    }
  }
  log('QA gate passed (build, typecheck, validate:schema, validate:links, check:placeholders — test:a11y skipped).');
}

// ── Commit & push ──

async function commitAndPush(repoPath, branch, slug, title, config, log) {
  const authorName = (config.astro_git_author_name || DEFAULT_AUTHOR_NAME).trim();
  const authorEmail = (config.astro_git_author_email || DEFAULT_AUTHOR_EMAIL).trim();
  const token = (config.astro_git_token || '').trim();
  const url = authedUrl((config.astro_repo_url || '').trim(), token);

  await git(repoPath, ['add', '-A']);
  await git(repoPath, [
    '-c', `user.name=${authorName}`,
    '-c', `user.email=${authorEmail}`,
    'commit', '-m', `post: ${title} (${slug})`,
  ]);

  log(`Pushing to origin/${branch}...`);
  try {
    await run('git', ['-C', repoPath, 'push', url, `HEAD:${branch}`]);
  } catch (err) {
    log('Push rejected (branch moved since last fetch) — retrying once after rebase...');
    await run('git', ['-C', repoPath, 'fetch', url, branch]);
    await git(repoPath, ['rebase', 'FETCH_HEAD']);
    await runQaGate(repoPath, log); // re-validate after rebase before retrying the push
    await run('git', ['-C', repoPath, 'push', url, `HEAD:${branch}`]);
  }
  log(`Pushed to feature branch "${branch}". This branch is NOT auto-deployed — a human must merge it into main for Cloudflare to publish it.`);
}

// ── Main entry points ──

/**
 * Phase A of the review gate. Writes generatedContent + cover image into the managed
 * devlyn-site clone and runs the QA gate exactly as a direct publish would — but stops
 * short of committing/pushing. Instead, the exact reviewed bytes (post.md, cover.png,
 * and the metadata needed to re-place them later) are copied into a per-job staging
 * folder outside the git clone, so a later job's ensureRepoReady() reset can't touch
 * them while a human reviews the post. Returns { slug, title, image_source }.
 */
async function prepareForReview(jobId, blogConfig, generatedContent, rawData, logFn) {
  const log = logFn || (() => {});

  const { repoPath, branch } = await ensureRepoReady(blogConfig, log);

  const contentDir = (blogConfig.astro_content_dir || DEFAULT_CONTENT_DIR).trim();
  const coversDir = (blogConfig.astro_covers_dir || DEFAULT_COVERS_DIR).trim();
  const contentDirAbs = path.join(repoPath, contentDir);
  const coversDirAbs = path.join(repoPath, coversDir);
  fs.mkdirSync(contentDirAbs, { recursive: true });
  fs.mkdirSync(coversDirAbs, { recursive: true });

  const slug = buildSlug(generatedContent, contentDirAbs);
  const { category } = resolveCategory(generatedContent.category, contentDirAbs, log);
  const readTime = computeReadTime(generatedContent.content);
  const date = dayjs().format('YYYY-MM-DD');

  // ── Featured image: reuse imageService as-is (codex-first pipeline, unchanged) ──
  let coverBasename = null;
  let imageSource = '';
  let coverBuffer = null;
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
    imageSource = img.source;
    const sharp = require('sharp');
    coverBuffer = await sharp(img.buffer).png().toBuffer();
    coverBasename = `${slug}-cover.png`;
    log(`Image ready: ${img.source} → ${coverBasename} (${Math.round(coverBuffer.length / 1024)}KB)`);
  } catch (err) {
    log(`Image generation skipped: ${err.message}`);
  }

  const frontmatter = buildFrontmatter({
    title: generatedContent.title,
    cat: category,
    read: readTime,
    excerpt: generatedContent.meta_description,
    date,
    author: 'Devlyn',
    coverBasename,
  });
  const body = await htmlToMarkdown(generatedContent.content);
  const postMd = frontmatter + body + '\n';

  const filePath = path.join(contentDirAbs, `${slug}.md`);
  fs.writeFileSync(filePath, postMd);
  log(`Wrote post: ${path.join(contentDir, `${slug}.md`)}`);

  if (coverBasename && coverBuffer) {
    // Guard the one invariant that fails silently at build time: the frontmatter
    // cover basename must exactly match the file actually written to coversDir.
    fs.writeFileSync(path.join(coversDirAbs, coverBasename), coverBuffer);
    const written = fs.existsSync(path.join(coversDirAbs, coverBasename));
    if (!written) throw new Error(`Cover image mismatch: expected ${coverBasename} in ${coversDir}, but it was not written.`);
  }

  await runQaGate(repoPath, log);

  // ── Stage the exact reviewed bytes outside the shared clone ──
  const stageDir = stagingDir(jobId);
  fs.mkdirSync(stageDir, { recursive: true });
  fs.writeFileSync(path.join(stageDir, 'post.md'), postMd);
  if (coverBasename && coverBuffer) {
    fs.writeFileSync(path.join(stageDir, 'cover.png'), coverBuffer);
  }
  fs.writeFileSync(path.join(stageDir, 'meta.json'), JSON.stringify({
    slug, coverBasename, contentDir, coversDir, branch,
    // Full frontmatter baseline — updateStagedPost() merges admin edits into this.
    title: generatedContent.title, cat: category, excerpt: generatedContent.meta_description,
    date, author: 'Devlyn', featured: false, noindex: false, read: readTime,
  }, null, 2));

  log(`Staged for review: ${slug} — click Commit to push to feature branch "${branch}".`);

  return { slug, title: generatedContent.title, image_source: imageSource };
}

/**
 * Phase B of the review gate. Re-syncs the managed clone to the latest branch state,
 * restores the EXACT staged bytes from prepareForReview (not recomputed — what was
 * reviewed is what gets published), re-runs the QA gate as a safety net (the branch may
 * have moved since review), then commits and pushes. Cleans up the staging folder on
 * success. Returns { post_id, post_url, edit_url }.
 */
async function commitStaged(jobId, blogConfig, logFn) {
  const log = logFn || (() => {});

  const stageDir = stagingDir(jobId);
  const metaPath = path.join(stageDir, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    throw new Error(`No staged post found for this job (expected ${metaPath}). It may have already been committed or discarded.`);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const { slug, coverBasename, contentDir, coversDir, branch, title } = meta;

  // Use the branch that was actually reviewed, even if the blog config's default has
  // since changed — what gets pushed must match what was staged.
  const { repoPath } = await ensureRepoReady({ ...blogConfig, astro_branch: branch }, log);

  const contentDirAbs = path.join(repoPath, contentDir);
  const coversDirAbs = path.join(repoPath, coversDir);
  fs.mkdirSync(contentDirAbs, { recursive: true });
  fs.mkdirSync(coversDirAbs, { recursive: true });

  const postMd = fs.readFileSync(path.join(stageDir, 'post.md'), 'utf8');
  fs.writeFileSync(path.join(contentDirAbs, `${slug}.md`), postMd);
  log(`Restored staged post: ${path.join(contentDir, `${slug}.md`)}`);

  const coverStagedPath = path.join(stageDir, 'cover.png');
  if (coverBasename && fs.existsSync(coverStagedPath)) {
    fs.copyFileSync(coverStagedPath, path.join(coversDirAbs, coverBasename));
    log(`Restored staged cover image: ${path.join(coversDir, coverBasename)}`);
  }

  // Safety net: re-validate against the CURRENT branch state — it may have moved since
  // review (e.g. another post committed in between could introduce a category clash).
  await runQaGate(repoPath, log);
  await commitAndPush(repoPath, branch, slug, title, blogConfig, log);

  cleanupStaging(jobId);
  log('Staging folder cleaned up — the reviewed draft is now committed and pushed.');

  const domain = (blogConfig.domain || 'devlyn.ai').replace(/\/+$/, '');
  const repoWebUrl = (blogConfig.astro_repo_url || '').replace(/\.git$/, '');

  return {
    post_id: slug,
    post_url: `https://${domain}/blog/${slug}`,
    edit_url: `${repoWebUrl}/blob/${branch}/${contentDir}/${slug}.md`,
  };
}

// Returns everything after the frontmatter's closing "---" line. Robust against the body
// itself containing a literal "---" line (rejoins any extra split pieces with it back).
function splitPostMdBody(postMd) {
  const parts = postMd.split(/^---\s*$/m);
  return parts.slice(2).join('---').replace(/^\n+/, '');
}

/**
 * Lets an admin edit a staged (not-yet-committed) post's frontmatter fields and/or body
 * before deciding to commit. Only overwrites the fields actually present in `fields`
 * (title, cat, excerpt, author, featured, noindex, content) — everything else keeps its
 * previously staged value. Rewrites post.md in the staging folder only; the shared git
 * clone is never touched here (that only happens at commit time). Returns { slug, title }.
 *
 * `fields.content`, when provided, is already Markdown (the edit form shows/collects
 * Markdown, not HTML — see getStagingInfo()'s `body`) — it's used as the post body
 * as-is, NOT run through htmlToMarkdown() again.
 */
async function updateStagedPost(jobId, fields = {}) {
  const stageDir = stagingDir(jobId);
  const metaPath = path.join(stageDir, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    throw new Error('No staged post found for this job — nothing to edit.');
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  const merged = { ...meta };
  for (const key of ['title', 'cat', 'excerpt', 'author']) {
    if (fields[key] !== undefined) merged[key] = String(fields[key]);
  }
  if (fields.date !== undefined) {
    const date = String(fields.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date — expected YYYY-MM-DD.');
    merged.date = date;
  }
  for (const key of ['featured', 'noindex']) {
    if (fields[key] !== undefined) merged[key] = !!fields[key];
  }

  let body;
  if (fields.content !== undefined) {
    body = String(fields.content);
    merged.read = computeReadTime(fields.content);
  } else {
    const existingMd = fs.readFileSync(path.join(stageDir, 'post.md'), 'utf8');
    body = splitPostMdBody(existingMd);
  }

  const frontmatter = buildFrontmatter({
    title: merged.title, cat: merged.cat, read: merged.read, excerpt: merged.excerpt,
    date: merged.date, author: merged.author, coverBasename: merged.coverBasename,
    featured: merged.featured, noindex: merged.noindex,
  });
  const postMd = frontmatter + body + (body.endsWith('\n') ? '' : '\n');

  fs.writeFileSync(path.join(stageDir, 'post.md'), postMd);
  fs.writeFileSync(metaPath, JSON.stringify(merged, null, 2));

  return { slug: merged.slug, title: merged.title };
}

/**
 * One-shot convenience wrapper (review + commit back-to-back, no human gate) — kept for
 * ad-hoc/manual testing. The scheduler calls prepareForReview() and commitStaged()
 * separately so a human can review between the two. Returns
 * { post_id, post_url, edit_url, image_source }.
 */
async function postDraft(blogConfig, generatedContent, rawData, logFn) {
  const jobId = `adhoc-${Date.now()}`;
  const { image_source } = await prepareForReview(jobId, blogConfig, generatedContent, rawData, logFn);
  const result = await commitStaged(jobId, blogConfig, logFn);
  return { ...result, image_source };
}

module.exports = {
  testConnection, postDraft, prepareForReview, commitStaged, updateStagedPost, cleanupStaging, getStagingInfo,
  resolveCategory, listCategories, buildSlug, computeReadTime,
};
