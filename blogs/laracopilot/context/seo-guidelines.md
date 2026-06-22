# SEO Guidelines for LaraCopilot Content

SEO requirements for all LaraCopilot blog content. The audience is technical (Laravel/PHP developers and founders), so depth, accuracy, and real code matter more than keyword padding.

## Content Length
- **Standard post / comparison / how-to**: 1,500-2,500 words (target ~2,000).
- **Pillar guides**: up to ~3,500 words; split into a series if longer.
- **Reference/cheatsheets**: as long as needed to be complete and scannable.
- Quality over quantity — never pad. A precise 1,800-word comparison beats a 3,000-word ramble.

## Keyword Optimization
- **Primary keyword density**: 1-2%, integrated naturally.
- **Secondary/LSI**: use Laravel ecosystem terms (Eloquent, Artisan, Blade, Livewire, Filament, Forge, Ploi, Pest, multi-tenancy, queues, API Resources).
- **Primary keyword must appear in**: H1, first 100 words, at least 2-3 H2s, the conclusion, the meta title, the meta description, and the URL slug.
- Use natural variations ("Laravel AI code generator" → "AI that writes Laravel" → "Laravel copilot"). Never stuff.

## Structure
- One H1 (under 65 characters, no colon/semicolon).
- 4-7 H2 sections in logical order; 2-3 H2s include keyword variations.
- Proper H1 → H2 → H3 hierarchy (never skip levels).
- Key Takeaways block after the intro.
- Comparison tables for "vs"/"alternative" posts; fenced code blocks (```php, ```bash, ```blade) where they add value.
- FAQ section (4-6 questions) targeting People Also Ask.

## Meta Elements
- **Meta title**: 50-60 characters, primary keyword near the front, compelling. Include the year for tool roundups/pricing pieces.
- **Meta description**: 150-160 characters, primary keyword, directly answers the query, ends with a clear value/CTA.
- **URL slug**: lowercase, hyphenated, primary keyword, 3-5 words, no stop words.

## Internal & External Linking
- **Internal**: 3-5 links per article using descriptive anchors; follow internal-links-map.md (link comparison posts → product pages; "build X" posts → use-case pages; always include one conversion-page link).
- **External**: 2-4 authoritative links (official Laravel docs, PHP RFCs, reputable engineering sources). Cite sources for any statistic. Verify links resolve.

## Readability (developer-friendly)
- Target a clear, technical-but-accessible level; average sentence length under 25 words.
- Short paragraphs (2-4 sentences). Subheadings every ~300-400 words.
- Active voice. Define a Laravel term on first use only if non-obvious.
- Use lists and tables for scannability; keep code snippets short and correct.

## AI Search Optimization (GEO/AICO)
AI engines (ChatGPT, Perplexity, Gemini, Claude) are a major discovery channel for developer tools.
- **Direct-answer-first**: answer the query in the first 1-2 sentences (the "short answer" pattern). Put the answer in the meta description too.
- **Key Takeaways block**: 3-5 specific, standalone bullets after the intro — these get pulled into AI summaries.
- **One idea per section** so individual sections are citable.
- **FAQ in natural prompt language** (how developers actually ask).
- **Authority signals**: named author, last-updated date, year in time-sensitive titles.
- **Comparisons and "alternative" pages** are frequently surfaced by AI for tool-choice prompts — keep them fair and specific.

## E-E-A-T for a Dev Audience
- Demonstrate real Laravel expertise: correct code, correct conventions, accurate version notes (Laravel 9-12).
- Be honest about trade-offs and when a competitor fits better.
- Never present invented benchmarks or user counts as fact. Use only on-site, verifiable claims (see features.md).

## Pre-Publish SEO Checklist
- [ ] 1,500+ words, primary keyword 1-2% density
- [ ] Keyword in H1, first 100 words, 2-3 H2s, conclusion, meta title, meta description, slug
- [ ] Direct answer in first 1-2 sentences + Key Takeaways block
- [ ] At least one useful, correct code example (where relevant)
- [ ] Comparison table (for vs/alternative posts)
- [ ] 3-5 internal links (per internal-links-map.md) + 2-4 external authority links
- [ ] Meta title 50-60 chars, meta description 150-160 chars, slug optimized
- [ ] FAQ (4-6) in natural language
- [ ] No em dashes, no colons/semicolons in headings
- [ ] All claims accurate and verifiable; sources cited

---
**Remember**: SEO serves the developer reading the page. The fastest path to rankings in this niche is genuinely useful, technically correct content that an experienced Laravel dev would bookmark.
