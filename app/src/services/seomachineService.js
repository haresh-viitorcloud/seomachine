/**
 * seomachineService — drives seomachine's content pipeline as the generation engine.
 *
 * The ct-automation app is the product shell (UI, queue, multi-blog, WordPress
 * posting, image, SEO scoring). When GENERATION_ENGINE=seomachine, the article is
 * produced by seomachine's methodology instead of the native 2-call pipeline:
 *
 *   1. Read the LIVE upstream writing methodology (.claude/commands/write.md) so
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

/** Read the LIVE upstream /write methodology. Returns '' if absent (engine still works). */
function loadMethodology(root) {
  const p = path.join(root, '.claude', 'commands', 'write.md');
  try {
    if (!fs.existsSync(p)) return '';
    const txt = fs.readFileSync(p, 'utf8');
    // write.md is ~12KB; guard against an accidentally huge file.
    return txt.length > 40000 ? txt.slice(0, 40000) + '\n…[methodology truncated]…' : txt;
  } catch {
    return '';
  }
}

/**
 * Build the system prompt: writing identity + AUTHORITATIVE per-blog brand context,
 * then seomachine's methodology, then rules + editor feedback.
 * The methodology may name an example brand (e.g. "Castos") — we explicitly override it.
 */
function buildSystemContent({ methodology, contextContent, rulesContent, feedbackSection, brand }) {
  const parts = [];
  parts.push(`You are a senior content strategist and blog writer for ${brand}. You write expert-level, SEO-optimized articles that read like they come from a practitioner with years of hands-on experience.

You will FOLLOW the seomachine WRITING METHODOLOGY below, but the BRAND CONTEXT is AUTHORITATIVE and overrides it in every conflict:
- Use ONLY ${brand}'s name, voice, products, proof points, and internal links from BRAND CONTEXT.
- The METHODOLOGY may reference an example company (e.g. "Castos") and its products/links — IGNORE every brand-specific name, product, case study, statistic, and internal link from the METHODOLOGY.
- Never invent metrics and never borrow another company's case studies or numbers.
- Where the METHODOLOGY and the BRAND CONTEXT (or GENERATION RULES) disagree on word count, FAQ count, voice, or formatting, the BRAND CONTEXT and RULES win.`);

  if (methodology) {
    parts.push(`================= SEOMACHINE WRITING METHODOLOGY (live from .claude/commands/write.md) =================
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
Apply the full seomachine pipeline in this single response: methodology writing (direct answer + hook, Key Takeaways/TL;DR block, 4–7 H2 sections, mini-stories, contextual CTAs distributed through the body, internal + external links, FAQ, conclusion), THEN apply on-page SEO optimization, high-CTR meta creation, strategic internal linking, and keyword mapping/distribution.

CRITICAL OUTPUT FORMAT — respond with ONLY a single valid JSON object. No prose, no markdown code fences. Use EXACTLY these keys:
{
  "title": "H1 post title",
  "seo_title": "50-60 chars, starts with the primary keyword",
  "slug": "keyword-rich-hyphenated-url-slug",
  "meta_description": "150-160 chars, primary keyword within the first 120 chars",
  "content": "FULL article body as clean semantic HTML using <h2>,<h3>,<p>,<ul>,<ol>,<li>,<strong>,<em>,<a href> ONLY. NO markdown. NO <html>/<head>/<body> wrappers. Do NOT include the H1 (it is the title).",
  "image_prompt": "one vivid sentence describing a warm, candid, photorealistic photo of real PEOPLE actively interacting or collaborating (e.g. a professional helping, talking with, or working alongside someone) in a real-world setting directly relevant to the article topic. Name the people, their action, and the environment. Favour human connection over screens/equipment. No charts, no diagrams, no screens-only shots, no text",
  "image_alt": "descriptive alt text that includes the primary keyword",
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
