/**
 * seomachineService — drives seomachine's content pipeline as the generation engine.
 *
 * The ct-automation app is the product shell (UI, queue, multi-blog, WordPress
 * posting, image, SEO scoring). When GENERATION_ENGINE=seomachine, the article is
 * produced by seomachine's methodology instead of the native 2-call pipeline:
 *
 *   1. Read the LIVE upstream methodology as the ordered 4-command pipeline
 *      (.claude/commands/research.md → write.md → optimize.md → scrub.md) so
 *      `git pull upstream` improvements flow in automatically.
 *   2. Inject the PER-BLOG brand context (blogs/{slug}/context/*) as authoritative
 *      — this is what makes the single-brand upstream multi-blog.
 *   3. Ask the model to return ct-automation's exact JSON contract (so the proven
 *      parseGeneratedContent + downstream posting/image/scoring are reused as-is).
 *   4. Run seomachine's Python quality gate (scrub + score) via pythonGate.
 *
 * This module owns ONLY prompt construction + root resolution + the gate hand-off.
 * The CLI spawn, parsing, and context loading are reused from claudeService.
 */
const fs = require('fs');
const path = require('path');
const pythonGate = require('./pythonGate');

// Allowed CTA categories — kept in sync with claudeService.parseGeneratedContent.
const CTA_CATEGORIES = ['ai', 'cloud', 'digital_transformation', 'data', 'technology_consulting', 'digital_experience', 'default'];

/** Resolve the seomachine repo root (parent of app/). Robust to cwd via __dirname. */
function resolveRoot() {
  if (process.env.SEOMACHINE_ROOT) return path.resolve(process.env.SEOMACHINE_ROOT);
  // __dirname = <root>/app/src/services  →  up 3 = <root>
  return path.resolve(__dirname, '..', '..', '..');
}

// The seomachine article pipeline, in mandatory order. Each entry maps to a slash
// command in .claude/commands/. Generation must follow this exact sequence every time.
const METHODOLOGY_COMMANDS = ['research.md', 'write.md', 'optimize.md', 'scrub.md'];

/**
 * Read the LIVE upstream article methodology as the ordered 4-command pipeline
 * (/research → /write → /optimize → /scrub) from .claude/commands/*. Reading them
 * live means `git pull upstream` improvements flow in automatically. Returns '' if
 * none are present (engine still works from brand context alone).
 */
function loadMethodology(root) {
  const dir = path.join(root, '.claude', 'commands');
  const PER_FILE_CAP = 20000; // guard against an accidentally huge command file
  const sections = [];
  for (const file of METHODOLOGY_COMMANDS) {
    const p = path.join(dir, file);
    try {
      if (!fs.existsSync(p)) continue;
      let txt = fs.readFileSync(p, 'utf8');
      if (txt.length > PER_FILE_CAP) txt = txt.slice(0, PER_FILE_CAP) + '\n…[truncated]…';
      const cmd = '/' + file.replace(/\.md$/, '');
      sections.push(`----- PHASE ${sections.length + 1}: ${cmd} (live from .claude/commands/${file}) -----\n${txt}`);
    } catch {
      /* skip this command, keep the rest */
    }
  }
  return sections.join('\n\n');
}

/**
 * Build the system prompt: writing identity + AUTHORITATIVE per-blog brand context,
 * then seomachine's methodology, then rules + editor feedback.
 * The methodology may name an example brand (e.g. "Castos") — we explicitly override it.
 */
function buildSystemContent({ methodology, contextContent, rulesContent, feedbackSection, brand }) {
  const parts = [];
  parts.push(`You are a senior content strategist and blog writer for ${brand}. You write expert-level, SEO-optimized articles that read like they come from a practitioner with years of hands-on experience.

You will FOLLOW the seomachine ARTICLE PIPELINE below — the four phases /research → /write → /optimize → /scrub, executed IN THAT ORDER within this single response. Do not skip or reorder a phase. The BRAND CONTEXT is AUTHORITATIVE and overrides the methodology in every conflict:
- Use ONLY ${brand}'s name, voice, products, proof points, and internal links from BRAND CONTEXT.
- The METHODOLOGY may reference an example company (e.g. "Castos") and its products/links — IGNORE every brand-specific name, product, case study, statistic, and internal link from the METHODOLOGY.
- Never invent metrics and never borrow another company's case studies or numbers.
- Where the METHODOLOGY and the BRAND CONTEXT (or GENERATION RULES) disagree on word count, FAQ count, voice, or formatting, the BRAND CONTEXT and RULES win.`);

  if (methodology) {
    parts.push(`================= SEOMACHINE ARTICLE PIPELINE — /research → /write → /optimize → /scrub (live from .claude/commands/) =================
Run all four phases in order: RESEARCH the SERP/intent and pick internal links, then WRITE the full draft, then OPTIMIZE on-page SEO, then SCRUB AI fingerprints and banned phrasing.
${methodology}`);
  }

  if (contextContent) {
    parts.push(`================= BRAND CONTEXT — ${brand} (AUTHORITATIVE) =================
${contextContent}`);
  }

  if (rulesContent) {
    parts.push(`================= GENERATION RULES — ${brand} (AUTHORITATIVE) =================
${rulesContent}`);
  }

  if (feedbackSection) parts.push(feedbackSection);

  return parts.join('\n\n');
}

/** Compact render of the spreadsheet row — only fields that are present. */
function renderRow(row = {}) {
  const sec = Array.isArray(row.secondary_keywords)
    ? row.secondary_keywords.join(', ')
    : (row.secondary_keywords || '');
  const fields = [
    ['TOPIC / TITLE', row.title],
    ['PRIMARY KEYWORD', row.primary_keyword],
    ['SECONDARY KEYWORDS', sec],
    ['BLOG TYPE', row.blog_type],
    ['THEME', row.theme],
    ['TARGET INDUSTRY', row.target_industry],
    ['FUNNEL STAGE', row.funnel_stage],
    ['SEARCH INTENT', row.intent],
    ['IDEAL CUSTOMER PROFILE', row.icp],
    ['ICP SOLUTIONS', row.icp_solutions],
    ['PAIN POINTS', row.pain_points],
    ['DESIRED OUTCOME', row.outcome],
    ['TARGET LOCATION', row.target_location],
    ['SEO STRATEGY', row.seo_strategy],
    ['AEO STRATEGY', row.aeo_strategy],
    ['CTR STRATEGY', row.ctr_strategy],
    ['AEO/GEO STRATEGY', row.aeo_geo_strategy],
  ];
  return fields
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${String(v).trim()}`)
    .join('\n');
}

/**
 * Build the user prompt: the article brief + additional instructions + the STRICT
 * JSON output contract that parseGeneratedContent expects.
 */
function buildUserPrompt({ row = {}, additionalInstructions = '' }) {
  const brief = renderRow(row);
  const addl = additionalInstructions && String(additionalInstructions).trim()
    ? `\n================= ADDITIONAL INSTRUCTIONS (HIGHEST PRIORITY) =================\n${String(additionalInstructions).trim()}\n`
    : '';

  return `Write a complete, SEO-optimized blog article using the methodology and brand context above.

================= ARTICLE BRIEF =================
${brief}
${addl}
Apply the full seomachine pipeline in this single response, in order:
1. /research — model the SERP/intent, choose the unique angle, and select the internal links to use (ONLY URLs that appear verbatim in the brand context's internal-links-map; never invent a URL).
2. /write — the draft: direct answer + hook, Key Takeaways/TL;DR block, 4–7 H2 sections, mini-stories, contextual CTAs distributed through the body, internal + external links placed inline in different sections, FAQ, conclusion.
3. /optimize — on-page SEO: keyword placement/density, high-CTR meta + SEO title, slug, distributed (never clustered) internal/external links.
4. /scrub — remove AI fingerprints, invisible Unicode, and banned filler phrasing; vary sentence length.

CRITICAL OUTPUT FORMAT — respond with ONLY a single valid JSON object. No prose, no markdown code fences. Use EXACTLY these keys:
{
  "title": "H1 post title",
  "seo_title": "50-60 chars, starts with the primary keyword",
  "slug": "keyword-rich-hyphenated-url-slug",
  "meta_description": "150-160 chars, primary keyword within the first 120 chars",
  "content": "FULL article body as clean semantic HTML using <h2>,<h3>,<p>,<ul>,<ol>,<li>,<strong>,<em>,<a href> ONLY. NO markdown. NO <html>/<head>/<body> wrappers. Do NOT include the H1 (it is the title).",
  "image_prompt": "one vivid sentence describing a warm, candid, photorealistic photo of real PEOPLE actively interacting or collaborating (e.g. a professional helping, talking with, or working alongside someone) in a real-world setting directly relevant to the article topic. Name the people, their action, and the environment. Favour human connection over screens/equipment. No charts, no diagrams, no screens-only shots, no text",
  "image_alt": "descriptive alt text that includes the primary keyword",
  "category": "the single most relevant WordPress blog category for this post; if the brand context/rules list the site's existing categories, pick the closest match by its EXACT name, otherwise use one concise conventional category",
  "tags": ["tag1","tag2","tag3"],
  "faq": [{"question":"...","answer":"..."}],
  "cta_category": "one of: ${CTA_CATEGORIES.join(', ')}",
  "ctas": [{"heading":"...","description":"...","button":"..."}]
}
Return 3-5 FAQ items and exactly 3 ctas. All strings must be valid JSON (escape quotes/newlines inside HTML). Output the JSON object and nothing else.`;
}

/** Run the Python quality gate (scrub + score). Delegates to pythonGate (best-effort). */
function runQualityGate(content, { root, onProgress } = {}) {
  if (onProgress) onProgress('Running seomachine quality gate (scrub + score)…');
  return pythonGate.scrubAndScore(content, { root: root || resolveRoot() });
}

module.exports = {
  resolveRoot,
  loadMethodology,
  buildSystemContent,
  buildUserPrompt,
  runQualityGate,
  CTA_CATEGORIES,
};
