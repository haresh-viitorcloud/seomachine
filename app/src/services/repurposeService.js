/**
 * repurposeService — bulk multi-platform content repurposing.
 *
 * Takes an already-drafted job's generated content and spins it into N unique,
 * platform-specific Markdown variations (Medium, Blogger, ...), scheduled across
 * a date sequence for later manual publishing. Generation-only: this does NOT
 * auto-publish anywhere — it writes ready-to-paste Markdown files plus a manifest
 * a future auto-publish phase can read.
 *
 * Platform styles are read from <seomachine-root>/context/platforms/*.md — adding
 * a new platform is dropping in one file there, no code change needed here.
 *
 * Mirrors seomachineService.js's philosophy: prompt construction here, generation
 * (CLI/SDK spawn) reused as-is from claudeService.
 */
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const claudeService = require('./claudeService');
const seomachineService = require('./seomachineService');
const pythonGate = require('./pythonGate');
const queueService = require('./queueService');
const imageService = require('./imageService');
const { ObjectId } = require('mongodb');

// Blogs (by slug) that manage their own images manually — repurpose covers are
// skipped for them too, same as the main WordPress posting flow (wordpressService.js
// has its own copy of this list keyed off the same env var). Override/extend via env
// IMAGE_GENERATION_DISABLED_BLOGS (comma-separated slugs).
const IMAGE_GENERATION_DISABLED_BLOGS = (process.env.IMAGE_GENERATION_DISABLED_BLOGS || 'viitorx')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const MAX_TITLE_WORDS = 6;
// Two variations of the same platform sharing more than this fraction of 8-word
// shingles are considered too similar — trigger one regeneration attempt.
const OVERLAP_THRESHOLD = 0.45;

function platformsDir(root) {
  return path.join(root || seomachineService.resolveRoot(), 'context', 'platforms');
}

/** Base directory for repurposed output — configurable via .env REPURPOSE_OUTPUT_PATH
 * (relative paths resolve against the seomachine root; absolute paths used as-is).
 * Defaults to "repurposed" at the repo root if unset, matching the original convention. */
function repurposedBaseDir(root) {
  const configured = (process.env.REPURPOSE_OUTPUT_PATH || 'repurposed').trim();
  return path.isAbsolute(configured) ? configured : path.join(root, configured);
}

// External site directory — the single source of truth for the repurpose dropdown.
// Returns { id, name, url, accounts }. Configurable since this is a separate local
// service, not something bundled with this app.
const SITES_API_URL = (process.env.REPURPOSE_SITES_API_URL || 'http://localhost:8000/sites').trim();
const SITES_API_TIMEOUT_MS = 8000;
const SITES_CACHE_TTL_MS = 60000; // avoid hammering the sites API on every page load/click

// A handful of site names don't roundtrip through the default slug rules onto the
// context/platforms/*.md filename we already curated for them before this API existed
// (e.g. "Buy Me a Coffee" -> "buy-me-a-coffee" would miss buymeacoffee.md). Kept as an
// explicit, auditable list rather than a fuzzier heuristic.
const SITE_NAME_ALIASES = {
  'buy me a coffee': 'buymeacoffee',
  'the omni buzz': 'theomnibuzz',
};

// Filesystem-safe id derived from the API's site name — used as the dropdown value,
// the repurposed/{id}/ output folder, and the context/platforms/{id}.md lookup, so all
// three stay in lockstep with no separate mapping table to keep in sync.
function siteIdFromName(name) {
  const norm = String(name || '').trim().toLowerCase();
  if (SITE_NAME_ALIASES[norm]) return SITE_NAME_ALIASES[norm];
  return norm.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site';
}

const CATEGORIES_API_URL = (process.env.REPURPOSE_CATEGORIES_API_URL || 'http://localhost:8000/categories').trim();

/** Raw /categories response — each category embeds its own `sites[]` (siteId,
 * account_count, accounts[]), which is what makes per-category counting possible below.
 * Best-effort: empty list on failure (every site just shows 0 accounts rather than
 * breaking the whole Sites dropdown). */
async function fetchCategoriesRaw() {
  const axios = require('axios');
  try {
    const res = await axios.get(CATEGORIES_API_URL, { timeout: SITES_API_TIMEOUT_MS });
    const list = res.data?.data?.list;
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error(`[repurposeService] Could not load categories from ${CATEGORIES_API_URL}: ${err.message}`);
    return [];
  }
}

/** Brand categories for the Repurpose Category filter. */
async function listCategories() {
  const categories = await fetchCategoriesRaw();
  return [...categories]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((c) => ({ slug: c.slug, name: c.name || c.slug, color: c.color || '', accountCount: c.account_count ?? 0 }));
}

// Raw sites+categories fetch, cached together (one network round-trip pair covers every
// category filter — the account-count math below is pure in-process lookup afterwards,
// no re-fetch per selection).
let rawCache = { sites: null, categories: null, fetchedAt: 0 };

async function fetchRaw() {
  if (rawCache.sites && Date.now() - rawCache.fetchedAt < SITES_CACHE_TTL_MS) {
    return rawCache;
  }

  const axios = require('axios');
  let sites;
  try {
    const res = await axios.get(SITES_API_URL, { timeout: SITES_API_TIMEOUT_MS });
    sites = res.data?.data?.list;
    if (!Array.isArray(sites)) throw new Error('Unexpected response shape (missing data.list)');
  } catch (err) {
    throw new Error(`Could not load sites from ${SITES_API_URL}: ${err.message}`);
  }

  const categories = await fetchCategoriesRaw();
  rawCache = { sites, categories, fetchedAt: Date.now() };
  return rawCache;
}

/** The category's own Mongo _id (as a hex string) — every account under this category
 * in seo_accounts carries the same categoryId, so this one lookup covers the whole
 * batch rather than querying seo_accounts per account. Null if no category given/found. */
async function getCategoryMongoId(categorySlug) {
  if (!categorySlug) return null;
  const { categories } = await fetchRaw();
  return categories.find((c) => c.slug === categorySlug)?.id || null;
}

/** siteId -> { [categorySlug]: [...accounts] }, built from /categories' embedded
 * sites[] arrays. siteId is the real id shared between /sites and /categories'
 * sites[].siteId — a stable join key, unlike matching on site names/slugs. Each account
 * object is the API's own shape: { id, name, platform } — platform here is Blogbot's
 * terse per-account key (e.g. "medium"), used as-is for the targets Mongo field. */
function accountsBySite(categories) {
  const bySite = new Map();
  for (const cat of categories) {
    for (const site of (cat.sites || [])) {
      if (!bySite.has(site.siteId)) bySite.set(site.siteId, {});
      bySite.get(site.siteId)[cat.slug] = site.accounts || [];
    }
  }
  return bySite;
}

/** List available repurpose targets from the external sites API (cached briefly).
 * Falls back to context/platforms/*.md's generic style guide at generation time for
 * any site here that doesn't have its own curated file — see loadPlatformStyle().
 * When categorySlug is given, accountCount/accounts are scoped to that one category's
 * connected accounts on the site; otherwise it's every account across every category
 * (matches "all sites, total accounts" — the same total the site would show with no
 * filter applied). `accounts` (the actual account list, not just the count) is what
 * runRepurposeBatch uses to assign one specific account per generated variation. */
async function listPlatforms(root, categorySlug) {
  const { sites, categories } = await fetchRaw();
  const bySite = accountsBySite(categories);

  return sites
    .map((site) => {
      const perCategory = bySite.get(site.id) || {};
      const accounts = categorySlug ? (perCategory[categorySlug] || []) : Object.values(perCategory).flat();
      return {
        id: siteIdFromName(site.name),
        label: String(site.name || '').trim(),
        url: site.url || '',
        apiId: site.id,
        // Connected accounts for this site (optionally scoped to one category) — drives
        // the auto-calculated Count field (1 variation per connected account; 0 = nothing
        // to generate for it) AND, via `accounts`, which specific account each variation
        // in runRepurposeBatch's loop gets assigned to.
        accountCount: accounts.length,
        accounts,
      };
    })
    .filter((p) => p.label)
    .sort((a, b) => a.label.localeCompare(b.label));
}

const DEFAULT_STYLE_FILE = '_default.md';

// Tries a curated per-site guide first (context/platforms/{id}.md); falls back to the
// generic guide (context/platforms/_default.md) for any site returned by the sites API
// that doesn't have one yet — so every site from that API is generatable immediately,
// not just the handful we've hand-written guides for.
function loadPlatformStyle(platformId, root) {
  const dir = platformsDir(root);
  const file = path.join(dir, `${platformId}.md`);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');

  const fallback = path.join(dir, DEFAULT_STYLE_FILE);
  if (!fs.existsSync(fallback)) throw new Error(`Unknown repurpose platform: ${platformId}`);
  return fs.readFileSync(fallback, 'utf8');
}

/** Short, filesystem-safe slug for filenames — not the article's SEO slug. */
function slugify(title, maxWords = MAX_TITLE_WORDS) {
  const words = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords);
  return words.join('-') || 'post';
}

/**
 * Compute the publish datetime applied to every variation in a batch.
 * mode: 'now' — use the current time for all variations.
 * mode: 'scheduled' — use the single supplied datetime (datetime-local string, e.g.
 * "2026-07-14T09:00") for all variations. Every file still gets a distinct filename via
 * its variation index, even though the timestamp portion is shared across the batch.
 */
function computeSchedule({ mode = 'now', datetime } = {}, count) {
  const dt = (mode === 'scheduled' && datetime && dayjs(datetime).isValid()) ? dayjs(datetime) : dayjs();
  return Array.from({ length: count }, () => dt);
}

function buildFilename(site, slug, dt, index) {
  const idx = String(index).padStart(2, '0');
  return `${site}-${slug}-${dt.format('YYYY-MM-DD')}-${dt.format('HHmm')}-${idx}.md`;
}

// Same naming scheme as buildFilename, so each variation's .md and its cover image
// share one basename and sit side by side in the same repurposed/{site}/ folder —
// unambiguous which image belongs to which post, one-to-one.
function buildImageFilename(site, slug, dt, index) {
  const idx = String(index).padStart(2, '0');
  return `${site}-${slug}-${dt.format('YYYY-MM-DD')}-${dt.format('HHmm')}-${idx}-cover.webp`;
}

// ── Uniqueness guard — cheap 8-word-shingle Jaccard-style overlap check ──
function shingles(text, n = 8) {
  const words = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const set = new Set();
  for (let i = 0; i <= words.length - n; i++) set.add(words.slice(i, i + n).join(' '));
  return set;
}
function overlapRatio(a, b) {
  const sa = shingles(a);
  const sb = shingles(b);
  if (!sa.size || !sb.size) return 0;
  let common = 0;
  for (const s of sa) if (sb.has(s)) common++;
  return common / Math.min(sa.size, sb.size);
}

// Delimiter-based response format — NOT JSON. A full Markdown article body routinely
// contains literal newlines, quotes, and backticks; asking the model to escape all of
// that inside a JSON string value is exactly what breaks claudeService's own JSON
// contract in production (see parseGeneratedContent's HTML-recovery fallback). Since
// this contract is only consumed here, a plain delimited format sidesteps escaping
// entirely instead of reimplementing that same recovery logic for Markdown.
const CONTENT_MARKER = '===CONTENT===';
const END_MARKER = '===END===';

function parseRepurposeResponse(rawText) {
  const text = String(rawText || '');
  const contentStart = text.indexOf(CONTENT_MARKER);
  const contentEnd = text.lastIndexOf(END_MARKER);
  if (contentStart === -1 || contentEnd === -1 || contentEnd <= contentStart) {
    throw new Error(`Repurpose response missing ${CONTENT_MARKER}/${END_MARKER} markers`);
  }
  const header = text.slice(0, contentStart);
  const content = text.slice(contentStart + CONTENT_MARKER.length, contentEnd).trim();

  const grab = (label) => {
    const m = header.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : '';
  };

  const title = grab('TITLE');
  const meta_description = grab('META');
  const slug = grab('SLUG');
  if (!title || !content) throw new Error('Repurpose response missing required TITLE/CONTENT fields');
  return { title, meta_description, slug, content };
}

function buildPrompt({ brand, platformLabel, styleContent, contextContent, sourceTitle, sourceMeta, sourceContent, index, total, extraInstruction }) {
  const system = `You are repurposing an already-published article for ${brand} into a platform-specific variation for ${platformLabel}.

The PLATFORM STYLE GUIDE below is AUTHORITATIVE for tone, structure, and length on this platform. The BRAND CONTEXT below is authoritative for facts, product names, and links — never invent claims, statistics, or URLs that are not present in the source article or brand context.

================= PLATFORM STYLE — ${platformLabel} =================
${styleContent}

================= BRAND CONTEXT — ${brand} =================
${contextContent || '(no brand context available — rely on the source article only)'}

You are writing variation ${index} of ${total} generated from the SAME source article. Every variation must:
- Cover the same core topic and preserve the source's factual claims and data points.
- Use a DIFFERENT opening hook, different paragraph order/sentence structure, and different phrasing than the other variations in this batch — never reuse sentences verbatim across variations.
- Have its own unique title, meta description, and slug.
- End with a short attribution line linking back to the source article.`;

  const addl = extraInstruction ? `\n\nIMPORTANT — REVISION NOTE (highest priority): ${extraInstruction}\n` : '';

  const user = `SOURCE ARTICLE
Title: ${sourceTitle || '(untitled)'}
Meta description: ${sourceMeta || '(none)'}
Content:
${sourceContent}
${addl}
Write variation ${index} of ${total} for ${platformLabel}, following the platform style guide and brand context above.

Respond with ONLY the following format — no other prose before or after, no markdown code fences around the whole response:

TITLE: post title for this platform
META: 150-160 char summary
SLUG: short-hyphenated-slug
${CONTENT_MARKER}
the FULL adapted article body in clean Markdown, written naturally (no need to escape anything — this is not JSON). No frontmatter, no H1 (the TITLE above is the H1).
${END_MARKER}`;

  return { system, user };
}

/** Generate one platform variation via the same CLI/SDK mechanism claudeService uses. */
async function generateOne({ root, brand, platformLabel, styleContent, contextContent, sourceTitle, sourceMeta, sourceContent, index, total, extraInstruction, onProgress }) {
  const { system, user } = buildPrompt({ brand, platformLabel, styleContent, contextContent, sourceTitle, sourceMeta, sourceContent, index, total, extraInstruction });

  const mode = await claudeService.getGenerationMode();
  let rawText;
  if (mode === 'cli') {
    const cliOutput = await claudeService.generateViaCli(system, user, onProgress, root);
    rawText = claudeService.extractCliResult(cliOutput);
  } else {
    rawText = await claudeService.generateViaSdk(system, user, onProgress);
  }

  const parsed = parseRepurposeResponse(rawText);
  if (!parsed.content || !parsed.title) throw new Error('Repurpose response missing required title/content fields');

  // Quality gate — scrub AI watermarks + score (best-effort, never blocks the batch)
  let qualityScore = null;
  try {
    const gate = await pythonGate.scrubAndScore(parsed.content, { root });
    if (gate.ok) {
      if (gate.cleaned) parsed.content = gate.cleaned;
      if (gate.composite_score != null) qualityScore = gate.composite_score;
    }
  } catch { /* best-effort — keep ungated content */ }

  return { ...parsed, quality_score: qualityScore };
}

// In-memory tracker for batches currently running, keyed by job id. This is what lets
// a freshly loaded page (Jobs or Dashboard, after navigation — a full reload that
// starts a brand-new socket connection with no history) reconstruct "is this job
// mid-repurpose?" via GET /api/repurpose/active, instead of only knowing about it
// if it happened to be open receiving 'repurpose:progress' events the whole time.
// Cleared in a `finally` so a crash never leaves a job stuck showing "in progress".
const activeBatches = {};

function setActiveProgress(jobId, site, label, index, total) {
  const state = activeBatches[jobId] || (activeBatches[jobId] = { platforms: {} });
  state.platforms[site] = { label, index, total };
}

/** Snapshot of all batches currently running, for GET /api/repurpose/active. */
function getActiveBatches() {
  const out = {};
  for (const [jobId, state] of Object.entries(activeBatches)) {
    out[jobId] = { platforms: Object.entries(state.platforms).map(([site, s]) => ({ site, ...s })) };
  }
  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readManifest(dir) {
  const file = path.join(dir, '_schedule-manifest.json');
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function writeManifest(dir, entries) {
  const file = path.join(dir, '_schedule-manifest.json');
  fs.writeFileSync(file, JSON.stringify(entries, null, 2), 'utf8');
}

/**
 * Every repurposed variation ever generated for a given job, across all platform
 * folders — read directly from each platform's _schedule-manifest.json (no DB, same
 * file-based source of truth the rest of this feature already uses). Newest first.
 */
async function getHistoryForJob(jobId, root) {
  const resolvedRoot = root || seomachineService.resolveRoot();
  const base = repurposedBaseDir(resolvedRoot);
  if (!fs.existsSync(base)) return [];
  const known = await listPlatforms(resolvedRoot);
  const out = [];
  for (const platform of known) {
    const manifest = readManifest(path.join(base, platform.id));
    for (const entry of manifest) {
      if (entry.source_job_id === jobId) out.push({ ...entry, platformLabel: platform.label });
    }
  }
  out.sort((a, b) => new Date(b.scheduled_publish_date) - new Date(a.scheduled_publish_date));
  return out;
}

/**
 * Read one previously-generated repurpose file's content — but only if it's actually
 * recorded in THIS job's history. Cross-checking against the manifest (not just
 * accepting any filename) plus path.basename() as defense-in-depth is what stops this
 * from becoming an arbitrary-file-read / path-traversal endpoint via the platform/file
 * query params.
 */
async function readHistoryFileContent(jobId, platform, file, root) {
  const resolvedRoot = root || seomachineService.resolveRoot();
  const known = await listPlatforms(resolvedRoot);
  if (!known.some((p) => p.id === platform)) throw new Error('Unknown platform');
  const dir = path.join(repurposedBaseDir(resolvedRoot), platform);
  const manifest = readManifest(dir);
  const entry = manifest.find((m) => m.source_job_id === jobId && m.file === file);
  if (!entry) throw new Error("File not found in this job's repurpose history");
  const filePath = path.join(dir, path.basename(file));
  if (!fs.existsSync(filePath)) throw new Error('File is missing on disk');
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Absolute path to a previously-generated repurpose variation's cover image — same
 * manifest cross-check as readHistoryFileContent (this job actually generated this
 * file, and its recorded `cover` field is what we serve, not attacker-supplied input).
 */
async function readHistoryImagePath(jobId, platform, file, root) {
  const resolvedRoot = root || seomachineService.resolveRoot();
  const known = await listPlatforms(resolvedRoot);
  if (!known.some((p) => p.id === platform)) throw new Error('Unknown platform');
  const dir = path.join(repurposedBaseDir(resolvedRoot), platform);
  const manifest = readManifest(dir);
  const entry = manifest.find((m) => m.source_job_id === jobId && m.file === file);
  if (!entry) throw new Error("File not found in this job's repurpose history");
  if (!entry.cover) throw new Error('This variation has no cover image');
  const dirResolved = path.resolve(dir);
  const imagePath = path.resolve(dir, entry.cover);
  // Defense-in-depth: entry.cover is our own manifest data (only ever written by
  // buildImageFilename above), but never resolve outside the platform's own folder.
  if (!imagePath.startsWith(dirResolved + path.sep)) throw new Error('Invalid cover path');
  if (!fs.existsSync(imagePath)) throw new Error('Cover image is missing on disk');
  return imagePath;
}

// ── MongoDB sync (repurposed_posts collection) ──
//
// Every generated variation is also recorded in MongoDB (field names mirror Blogbot's
// own scheduled_posts shape — see the plan discussion) so another tool can pick up the
// batch by reading this collection. Stores md_path/image_path (absolute paths on this
// server), NOT inline content — the other tool must run on this same machine/have
// filesystem access. Best-effort throughout: any Mongo failure is logged and swallowed,
// never blocks the actual .md/image files (which are the source of truth) from being
// written — losing the DB record for one variation is recoverable, losing the file isn't.

const REPURPOSE_MONGODB_URI = (process.env.REPURPOSE_MONGODB_URI || '').trim();
const REPURPOSE_MONGODB_DB = (process.env.REPURPOSE_MONGODB_DB || 'blogbot').trim();
const REPURPOSE_MONGODB_COLLECTION = 'repurposed_posts';

// Never let a connection-string parse/auth error leak the URI (it embeds credentials)
// into logs — same masking approach as astroGitService.testConnection()'s token redaction.
function maskMongoUri(uri) {
  return uri.replace(/\/\/[^@]+@/, '//***:***@');
}

let mongoClientPromise = null;

async function getRepurposedPostsCollection() {
  if (!REPURPOSE_MONGODB_URI) return null;
  if (!mongoClientPromise) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(REPURPOSE_MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    mongoClientPromise = client.connect().catch((err) => {
      mongoClientPromise = null; // allow a retry on the next call instead of caching a dead connection
      throw new Error(`Could not connect to MongoDB (${maskMongoUri(REPURPOSE_MONGODB_URI)}): ${err.message}`);
    });
  }
  const client = await mongoClientPromise;
  return client.db(REPURPOSE_MONGODB_DB).collection(REPURPOSE_MONGODB_COLLECTION);
}

/** Insert one repurposed_posts document. Never throws — logs a warning and returns on
 * failure, since a missing DB record shouldn't fail (or even flag as an error) a
 * variation whose actual .md/image files were written successfully. */
async function saveRepurposedPostRecord(jobId, doc) {
  try {
    const collection = await getRepurposedPostsCollection();
    if (!collection) return; // not configured — silent no-op, not an error
    await collection.insertOne(doc);
  } catch (err) {
    queueService.addLog(jobId, 'warning', `Repurpose: could not save MongoDB record — ${err.message}`);
  }
}

/**
 * Run a full repurpose batch for one job across one or more platforms, each with
 * its own count. Writes Markdown files to repurposed/{platform}/ plus a manifest, and
 * records each variation in MongoDB (see saveRepurposedPostRecord). Emits
 * 'repurpose:progress' / 'repurpose:done' / 'repurpose:error' socket events and addLog
 * entries so the UI can show live progress (mirrors the process-now pattern).
 */
async function runRepurposeBatch(jobId, platforms, schedule = {}, categorySlug = null) {
  const root = seomachineService.resolveRoot();
  const job = queueService.getJob(jobId);
  if (!job) throw new Error('Job not found');
  if (!job.generated_content || !job.generated_content.trim()) {
    throw new Error('This job has no generated content to repurpose yet.');
  }
  if (!Array.isArray(platforms) || !platforms.length) {
    throw new Error('At least one platform is required.');
  }

  const { db } = require('../config/database');
  const blog = db.prepare('SELECT * FROM blog_configs WHERE id = ?').get(job.blog_id) || {};
  const brand = claudeService.brandFromBlog(blog);
  // Repurposed posts inherit the source article's own tags — no per-variation tag
  // generation exists (parseRepurposeResponse only extracts TITLE/META/SLUG/CONTENT).
  let sourceTags = [];
  try { sourceTags = JSON.parse(job.generated_tags || '[]'); } catch { /* leave empty */ }

  let contextContent = claudeService.loadContextFiles(blog.context_path);
  if (!contextContent || !contextContent.trim()) {
    contextContent = claudeService.loadContextFiles(path.join(root, 'context'));
  }

  // Category-scoped — matches what the UI showed when the user picked each site's count,
  // and gives access to the actual per-account list (platformMeta.accounts) so each
  // variation can be assigned to one specific connected account.
  const known = await listPlatforms(root, categorySlug);
  const knownIds = new Set(known.map((p) => p.id));
  const sourceTitle = job.generated_title || job.title;
  const sourceMeta = job.generated_meta || '';
  const sourceContent = job.generated_content;
  const rawData = JSON.parse(job.raw_data || '{}');
  // Same category for the whole batch — one lookup covers every target below, no need
  // to query seo_accounts per account (every account under this category shares it).
  const categoryMongoId = await getCategoryMongoId(categorySlug);

  const summary = [];

  try {
    for (const req of platforms) {
      const site = String(req.site || '').trim();
      // Count is auto-calculated from the site's connected-account count on the
      // frontend (read-only there) — clamp defensively but never force a 0 (no
      // connected accounts) up to 1; that would generate a variation nothing asked for.
      const count = Math.max(0, Math.min(50, parseInt(req.count, 10) || 0));
      if (!knownIds.has(site)) {
        queueService.addLog(jobId, 'warning', `Repurpose: skipped unknown platform "${site}"`);
        summary.push({ site, requested: count, generated: 0, error: 'Unknown platform' });
        continue;
      }
      if (count <= 0) {
        queueService.addLog(jobId, 'info', `Repurpose: skipped "${site}" — 0 connected accounts, nothing to generate.`);
        summary.push({ site, requested: 0, generated: 0 });
        continue;
      }

      const platformMeta = known.find((p) => p.id === site);
      const styleContent = loadPlatformStyle(site, root);
      const outDir = path.join(repurposedBaseDir(root), site);
      ensureDir(outDir);

      const dates = computeSchedule(schedule, count);
      const manifest = readManifest(outDir);
      const priorContents = [];
      let generated = 0;

      queueService.addLog(jobId, 'info', `Repurpose: starting ${count} ${platformMeta.label} variation${count !== 1 ? 's' : ''} from "${sourceTitle}"`);
      setActiveProgress(jobId, site, platformMeta.label, 0, count);
      queueService.emitEvent('repurpose:progress', { jobId, site, label: platformMeta.label, index: 0, total: count, stage: 'starting' });

      for (let i = 0; i < count; i++) {
        const index = i + 1;
        try {
          let variation = await generateOne({
            root, brand, platformLabel: platformMeta.label, styleContent, contextContent,
            sourceTitle, sourceMeta, sourceContent, index, total: count,
          });

          // Uniqueness guard — one regeneration attempt if too similar to an earlier variation.
          const tooSimilar = priorContents.some((c) => overlapRatio(c, variation.content) > OVERLAP_THRESHOLD);
          if (tooSimilar) {
            queueService.addLog(jobId, 'warning', `Repurpose: ${platformMeta.label} variation ${index} overlapped too much with an earlier one — regenerating once`);
            variation = await generateOne({
              root, brand, platformLabel: platformMeta.label, styleContent, contextContent,
              sourceTitle, sourceMeta, sourceContent, index, total: count,
              extraInstruction: 'Your previous attempt overlapped too much with another variation in this batch. Use a substantially different opening hook, paragraph order, and phrasing this time.',
            });
          }

          priorContents.push(variation.content);

          const dt = dates[i];
          const slug = slugify(variation.title);
          const filename = buildFilename(site, slug, dt, index);

          // Assign this variation to one specific connected account — count is always
          // exactly platformMeta.accounts.length (auto-calculated, read-only in the UI),
          // so index i maps 1:1 onto that account list. Matches Blogbot's own targets
          // shape ({platform, account_id, account_label}), plus two Mongo _id references:
          // category_id (seo_accounts.categoryId, one lookup for the whole batch) and
          // account_mongo_id (the seo_accounts document's own _id — already present on
          // the account object from /categories' embedded accounts[], no extra lookup).
          let categoryObjectId = null;
          if (categoryMongoId) {
            try { categoryObjectId = new ObjectId(categoryMongoId); } catch { /* leave null on a malformed id */ }
          }
          const account = platformMeta.accounts?.[i] || null;
          let accountMongoId = null;
          if (account?._id) {
            try { accountMongoId = new ObjectId(account._id); } catch { /* leave null on a malformed id */ }
          }
          const targets = account
            ? [{
                platform: account.platform,
                account_id: account.id,
                account_label: account.name,
                category_id: categoryObjectId,
                account_mongo_id: accountMongoId,
              }]
            : [];

          // Each variation gets its OWN image (not shared across the batch) — every
          // variation is posted to a different account, so each needs a distinct visual.
          // Stored in an images/ subfolder so a site's folder stays scannable as mostly
          // .md files, not half image blobs. Best-effort: a failed image never fails the
          // variation itself, same as the astro-git pipeline's image handling.
          let coverRelPath = null;
          if (IMAGE_GENERATION_DISABLED_BLOGS.includes(blog.slug)) {
            queueService.addLog(jobId, 'info', `Repurpose: image generation skipped for ${platformMeta.label} ${index}/${count} (manual images for this blog)`);
          } else {
            try {
              const img = await imageService.saveTempImage(
                variation.title,
                rawData.primary_keyword || '',
                rawData.theme || '',
                job.generated_image_prompt || sourceTitle,
                blog,
                variation.content,
                variation.meta_description
              );
              const coverBasename = buildImageFilename(site, slug, dt, index);
              const imagesDir = path.join(outDir, 'images');
              ensureDir(imagesDir);
              fs.writeFileSync(path.join(imagesDir, coverBasename), img.buffer);
              coverRelPath = `images/${coverBasename}`;
              queueService.addLog(jobId, 'info', `Repurpose: image ready for ${platformMeta.label} ${index}/${count} (${img.source}) → repurposed/${site}/${coverRelPath}`);
            } catch (err) {
              queueService.addLog(jobId, 'warning', `Repurpose: image generation skipped for ${platformMeta.label} ${index}/${count} — ${err.message}`);
            }
          }

          const frontmatter = [
            '---',
            `platform: ${site}`,
            `source_job_id: ${jobId}`,
            `variation_index: ${index}`,
            `variation_count: ${count}`,
            `scheduled_publish_date: ${dt.format('YYYY-MM-DDTHH:mm:ss')}`,
            `slug: ${variation.slug || slug}`,
            `meta_description: ${JSON.stringify(variation.meta_description || '')}`,
            variation.quality_score != null ? `quality_score: ${variation.quality_score}` : null,
            coverRelPath ? `cover: ${coverRelPath}` : null,
            '---',
          ].filter(Boolean).join('\n');

          const coverImage = coverRelPath ? `![${variation.title}](./${coverRelPath})\n\n` : '';
          const fileBody = `${frontmatter}\n\n# ${variation.title}\n\n${coverImage}${variation.content}\n`;
          fs.writeFileSync(path.join(outDir, filename), fileBody, 'utf8');

          manifest.push({
            file: filename,
            platform: site,
            title: variation.title,
            slug: variation.slug || slug,
            scheduled_publish_date: dt.format('YYYY-MM-DDTHH:mm:ss'),
            variation_index: index,
            variation_count: count,
            quality_score: variation.quality_score,
            source_job_id: jobId,
            status: 'ready',
            cover: coverRelPath,
          });

          // Absolute paths — the other tool reading this collection needs to resolve
          // these on this same server's filesystem (see the MongoDB sync note above).
          await saveRepurposedPostRecord(jobId, {
            source_job_id: jobId,
            site,
            category: categorySlug || null,
            title: variation.title,
            slug: variation.slug || slug,
            meta_description: variation.meta_description || '',
            md_path: path.join(outDir, filename),
            image_path: coverRelPath ? path.join(outDir, coverRelPath) : null,
            tags: sourceTags,
            targets,
            scheduled_for: dt.toDate(),
            status: 'ready',
            kind: schedule.mode === 'scheduled' ? 'scheduled' : 'now',
            variation_index: index,
            variation_count: count,
            quality_score: variation.quality_score,
            results: [],
            created_at: new Date(),
            started_at: null,
            updated_at: new Date(),
            finished_at: null,
          });

          generated++;
          queueService.addLog(jobId, 'success', `Repurpose: ${platformMeta.label} ${index}/${count} ready — "${variation.title}" → repurposed/${site}/${filename}`);
          setActiveProgress(jobId, site, platformMeta.label, index, count);
          queueService.emitEvent('repurpose:progress', { jobId, site, label: platformMeta.label, index, total: count, stage: 'generated', title: variation.title, file: filename });
        } catch (err) {
          queueService.addLog(jobId, 'error', `Repurpose: ${platformMeta.label} variation ${index}/${count} failed — ${err.message}`);
          setActiveProgress(jobId, site, platformMeta.label, index, count);
          queueService.emitEvent('repurpose:progress', { jobId, site, label: platformMeta.label, index, total: count, stage: 'error', error: err.message });
        }
      }

      writeManifest(outDir, manifest);
      summary.push({ site, requested: count, generated });
    }

    queueService.addLog(jobId, 'info', `Repurpose batch complete: ${summary.map((s) => `${s.generated}/${s.requested} ${s.site}`).join(', ')}`);
    queueService.emitEvent('repurpose:done', { jobId, summary });
    return summary;
  } finally {
    delete activeBatches[jobId];
  }
}

module.exports = {
  listPlatforms,
  listCategories,
  loadPlatformStyle,
  slugify,
  computeSchedule,
  buildFilename,
  runRepurposeBatch,
  getActiveBatches,
  getHistoryForJob,
  readHistoryFileContent,
  readHistoryImagePath,
};
