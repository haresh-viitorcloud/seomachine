/**
 * SEO score service — predicts a Rank Math-style score (0-100) for generated content.
 *
 * This mirrors the Phase 3 "Rank Math 80-100 checklist" the generation prompt targets,
 * scoring only what is persisted on a job: generated_title, generated_content (HTML),
 * generated_meta, primary_keyword, secondary_keywords, and tags. It does NOT call Rank Math —
 * it is a heuristic preview so the admin sees SEO quality before posting.
 *
 * Returns { score, grade, color, wordCount, keywordDensity, internalLinks, externalLinks, checks[] }
 * where each check is { id, label, passed: true|false|'partial', weight, earned, detail }.
 */

function stripTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = haystack.match(new RegExp(escaped, 'gi'));
  return matches ? matches.length : 0;
}

function extractHeadings(html, level) {
  const re = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(stripTags(m[1]));
  return out;
}

function hostOf(url) {
  try {
    if (/^\/\//.test(url)) return new URL('https:' + url).host.toLowerCase();
    return new URL(url).host.toLowerCase();
  } catch { return null; }
}

// The brand label of a host — the most significant non-TLD label.
// viitorcloud.stgviitor.com -> "viitorcloud"; viitorcloud.com -> "viitorcloud".
// Lets links to the same brand (e.g. a production domain referenced from a staging
// site) count as internal, matching how Rank Math scores on the real domain.
function brandLabel(host) {
  if (!host) return null;
  const parts = String(host).replace(/^www\./i, '').split('.').filter(Boolean);
  return parts.length ? parts[0].toLowerCase() : null;
}

function classifyLinks(html, siteUrl) {
  const siteHost = siteUrl ? hostOf(siteUrl) : null;
  const siteBrand = brandLabel(siteHost);
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let internal = 0, external = 0, m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    if (/^(mailto:|tel:|#)/i.test(href)) continue;
    if (/^\//.test(href) && !/^\/\//.test(href)) { internal++; continue; } // relative path
    const host = hostOf(href);
    if (!host) continue;
    if (siteHost && (host === siteHost || host.endsWith('.' + siteHost) ||
        (siteBrand && brandLabel(host) === siteBrand))) internal++;
    else external++;
  }
  return { internal, external };
}

/**
 * @param {object} input
 * @param {string} input.title           - generated_title (used as H1)
 * @param {string} input.content         - generated_content HTML
 * @param {string} input.meta            - generated_meta (meta description)
 * @param {string} input.primaryKeyword  - focus keyword
 * @param {string[]} [input.secondaryKeywords]
 * @param {string} [input.siteUrl]       - blog wp_url/domain, to classify internal vs external links
 */
function scoreContent(input) {
  const title = String(input.title || '').trim();
  // Rank Math scores the SEO title (rank_math_title), not the H1/post title. Fall back
  // to the post title when no dedicated SEO title was generated.
  const seoTitle = String(input.seoTitle || input.title || '').trim();
  const html = String(input.content || '');
  const meta = String(input.meta || '').trim();
  const kw = String(input.primaryKeyword || '').trim();
  const kwLower = kw.toLowerCase();
  const kwWordCount = kw ? kw.split(/\s+/).length : 0;

  const plain = stripTags(html);
  const plainLower = plain.toLowerCase();
  const words = plain ? plain.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const h2s = extractHeadings(html, 2);
  const kwOccurrences = kw ? countOccurrences(plainLower, kwLower) : 0;
  // Rank Math-style density: (occurrences * keyword word length / total words) * 100
  const density = wordCount > 0 && kwWordCount > 0
    ? +(((kwOccurrences * kwWordCount) / wordCount) * 100).toFixed(2)
    : 0;

  const { internal: internalLinks, external: externalLinks } = classifyLinks(html, input.siteUrl);

  // First 10% of the body (min 150 chars) — where the focus keyword should appear early
  const head = plainLower.slice(0, Math.max(150, Math.floor(plainLower.length * 0.1)));
  const h2WithKw = kw ? h2s.filter(h => h.toLowerCase().includes(kwLower)).length : 0;
  const hasList = /<(ul|ol)\b/i.test(html);
  const hasKeyTakeaways = /key\s+takeaways/i.test(plain);
  const hasFaq = /frequently asked questions|\bfaq\b/i.test(plain) || extractHeadings(html, 3).length >= 3;
  const metaHead = meta.slice(0, 120).toLowerCase();

  // weight = max points; earned = points awarded (supports partial credit)
  const checks = [
    {
      id: 'kw-title', label: 'Focus keyword in SEO title', weight: 10,
      ...(kw && seoTitle.toLowerCase().includes(kwLower)
        ? { passed: true, earned: 10, detail: 'Found in SEO title' }
        : { passed: false, earned: 0, detail: kw ? 'Not in SEO title' : 'No focus keyword set' }),
    },
    {
      id: 'kw-intro', label: 'Keyword early (first 10%)', weight: 10,
      ...(kw && head.includes(kwLower)
        ? { passed: true, earned: 10, detail: 'Appears near the top' }
        : { passed: false, earned: 0, detail: 'Not found in the opening' }),
    },
    {
      id: 'kw-h2', label: 'Keyword in subheadings (H2)', weight: 10,
      ...(h2WithKw >= 2
        ? { passed: true, earned: 10, detail: `${h2WithKw} H2s contain it` }
        : h2WithKw === 1
        ? { passed: 'partial', earned: 5, detail: '1 H2 contains it (aim for 2+)' }
        : { passed: false, earned: 0, detail: 'No H2 contains the keyword' }),
    },
    {
      id: 'kw-density', label: 'Keyword density 0.5–2.5%', weight: 10,
      ...((density >= 0.8 && density <= 2.0)
        ? { passed: true, earned: 10, detail: `${density}% (ideal)` }
        : (density >= 0.5 && density <= 2.5)
        ? { passed: 'partial', earned: 6, detail: `${density}% (acceptable)` }
        : { passed: false, earned: 0, detail: `${density}% — ${density > 2.5 ? 'too high' : 'too low'} (${kwOccurrences}×)` }),
    },
    {
      id: 'meta-kw', label: 'Keyword in meta description', weight: 8,
      ...(kw && metaHead.includes(kwLower)
        ? { passed: true, earned: 8, detail: 'In first 120 chars' }
        : { passed: false, earned: 0, detail: meta ? 'Not in first 120 chars' : 'No meta description' }),
    },
    {
      id: 'meta-len', label: 'Meta description 140–160 chars', weight: 8,
      ...((meta.length >= 140 && meta.length <= 160)
        ? { passed: true, earned: 8, detail: `${meta.length} chars` }
        : (meta.length >= 120 && meta.length <= 175)
        ? { passed: 'partial', earned: 5, detail: `${meta.length} chars (aim 140–160)` }
        : { passed: false, earned: 0, detail: `${meta.length} chars` }),
    },
    {
      id: 'title-len', label: 'SEO title 50–60 chars', weight: 6,
      ...((seoTitle.length >= 50 && seoTitle.length <= 60)
        ? { passed: true, earned: 6, detail: `${seoTitle.length} chars` }
        : (seoTitle.length >= 40 && seoTitle.length <= 65)
        ? { passed: 'partial', earned: 3, detail: `${seoTitle.length} chars (aim 50–60)` }
        : { passed: false, earned: 0, detail: `${seoTitle.length} chars` }),
    },
    {
      id: 'word-count', label: 'Word count ≥ 1500', weight: 12,
      ...((wordCount >= 1500)
        ? { passed: true, earned: 12, detail: `${wordCount} words` }
        : (wordCount >= 1000)
        ? { passed: 'partial', earned: 7, detail: `${wordCount} words (aim 1500+)` }
        : { passed: false, earned: 0, detail: `${wordCount} words (too short)` }),
    },
    {
      id: 'internal-links', label: 'Internal links (3–5)', weight: 8,
      ...((internalLinks >= 3)
        ? { passed: true, earned: 8, detail: `${internalLinks} internal links` }
        : (internalLinks >= 1)
        ? { passed: 'partial', earned: 4, detail: `${internalLinks} (aim 3+)` }
        : { passed: false, earned: 0, detail: 'No internal links' }),
    },
    {
      id: 'external-links', label: 'External link (≥ 1)', weight: 6,
      ...((externalLinks >= 1)
        ? { passed: true, earned: 6, detail: `${externalLinks} external link${externalLinks > 1 ? 's' : ''}` }
        : { passed: false, earned: 0, detail: 'No external link' }),
    },
    {
      id: 'has-list', label: 'Has a bulleted / numbered list', weight: 4,
      ...(hasList
        ? { passed: true, earned: 4, detail: 'List present' }
        : { passed: false, earned: 0, detail: 'No list found' }),
    },
    {
      id: 'key-takeaways', label: 'Key Takeaways block', weight: 4,
      ...(hasKeyTakeaways
        ? { passed: true, earned: 4, detail: 'Present' }
        : { passed: false, earned: 0, detail: 'Missing' }),
    },
    {
      id: 'faq', label: 'FAQ section', weight: 4,
      ...(hasFaq
        ? { passed: true, earned: 4, detail: 'Present' }
        : { passed: false, earned: 0, detail: 'Missing' }),
    },
  ];

  const score = Math.round(checks.reduce((sum, c) => sum + (c.earned || 0), 0));

  // Rank Math colour bands: 0-50 poor (red), 51-80 ok (orange), 81-100 good (green)
  const grade = score >= 81 ? 'Good' : score >= 51 ? 'Needs work' : 'Poor';
  const color = score >= 81 ? '#22c55e' : score >= 51 ? '#f59e0b' : '#ef4444';

  return {
    score, grade, color,
    wordCount, keywordDensity: density,
    internalLinks, externalLinks,
    keywordOccurrences: kwOccurrences,
    primaryKeyword: kw,
    checks,
  };
}

module.exports = { scoreContent };
