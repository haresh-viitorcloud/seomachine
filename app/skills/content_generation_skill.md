# Content Generation Skill

## Skill: blog-content

**Purpose**: Generate a complete, SEO-optimized blog post for a ViitorCloud blog entry based on spreadsheet row data, then post it to WordPress as a draft with categories, tags, industries, featured image, and Rank Math SEO meta.

**Trigger**: Called by `claudeService.generateBlogContent()` for each queued job in `schedulerService.processJob()`.

---

## Generation Modes

| Mode | Behaviour |
|---|---|
| **Normal** | Calls Claude CLI (`claude --print --output-format json`) via stdin pipe. Full context + rules + prompt ~300KB. |
| **Test Mode** | Returns instant mock HTML with no API call. Toggle via `POST /api/queue/test-mode`. Stored in `queue_state.test_mode`. |

Test mode is for pipeline/WP integration testing without burning tokens. WP posting runs identically in both modes.

---

## System Prompt Structure

1. **Identity** — senior ViitorCloud practitioner, confident, plain language, no hedging
2. **Brand/editorial context** — all `.md` files from `BLOG_{SLUG}_CONTEXT_PATH` (loaded alphabetically)
3. **Generation rules** — `BLOG_{SLUG}_RULES_PATH` (e.g. `./rules/vc_blog_generation.md`)
4. **Four-phase process** — Research → Write → Optimize → Scrub (see below)
5. **Output format** — strict JSON only, no markdown wrappers

### Phase Instructions Embedded in Prompt

**Phase 1 — Research**: Model the SERP landscape mentally. Identify what all top-10 articles cover, what is missing, what unique angle ViitorCloud can own. Extract PAA questions for H2s/FAQ.

**Phase 2 — Write**: Direct answer first (AI scraper optimisation). Use APP formula for intro (Agree → Promise → Preview). Minimum 1800 words, target 2500+.

**Phase 3 — Optimize**: Primary keyword in H1, first paragraph, ≥2 H2s, meta description. 3–5 internal links from `internal-links-map.md`. Meta description exactly 150–160 chars.

**Phase 4 — Scrub**: No em-dashes (—). No banned phrases: "it's worth noting", "in today's landscape", "delve into", "leverage", "utilize", "in conclusion". Vary sentence length. No invisible Unicode.

---

## User Prompt Fields (from spreadsheet row)

`title`, `primary_keyword`, `secondary_keywords[]`, `blog_type`, `theme`, `target_industry`, `funnel_stage`, `intent`, `icp`, `icp_solutions`, `pain_points`, `outcome`, `seo_strategy`, `aeo_strategy`, `ctr_strategy`, `target_location`, `aeo_geo_strategy`

---

## Context Files — VC Blog (`./blogs/vc/context/`)

Loaded alphabetically. All 11 files embedded in every generation request:

| File | Role |
|---|---|
| `ai-citation-targets.md` | Off-page citation strategy |
| `brand-voice.md` | Core tone and voice rules |
| `competitor-analysis.md` | Differentiation angles |
| `cro-best-practices.md` | CTA and conversion copy |
| `features.md` | ViitorCloud service capabilities |
| `internal-links-map.md` | Existing articles for internal linking |
| `reddit-strategy.md` | Community tone reference |
| `seo-guidelines.md` | SEO technical requirements |
| `style-guide.md` | Grammar, punctuation, formatting |
| `target-keywords.md` | Priority keyword targets |
| `writing-examples.md` | Reference quality examples |

---

## Output Format

```json
{
  "title": "Final SEO-optimized article title",
  "meta_description": "150-160 character meta description with primary keyword",
  "content": "<h1>Title</h1><p>Intro...</p><h2>Section 1</h2>...",
  "image_prompt": "Detailed featured image description",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "faq": [
    { "question": "Question 1?", "answer": "15-20 word direct answer here." },
    { "question": "Question 2?", "answer": "15-20 word direct answer here." },
    { "question": "Question 3?", "answer": "15-20 word direct answer here." },
    { "question": "Question 4?", "answer": "15-20 word direct answer here." }
  ]
}
```

---

## WordPress Posting (after generation)

`wordpressService.postDraft()` handles all WP interactions via Playwright browser automation:

1. **Duplicate detection** — searches WP by title before creating. If found, updates existing post instead of creating a new one.
2. **Content insertion** — uses `wp.data.dispatch('core/block-editor').resetBlocks()` JS API (not keyboard typing).
3. **Taxonomy** — resolves categories (`theme`, `target_industry`), tags (`secondary_keywords` + generated tags), and industries (`target_industry`) from spreadsheet against WP REST API via authenticated browser session. Auto-discovers REST bases (site uses `post_tag` not `tags`). Creates missing terms.
4. **Featured image** — generates 30KB WebP gradient banner using `sharp` + SVG, uploads to WP media library.
5. **Rank Math SEO** — sets `rank_math_focus_keyword` and `rank_math_description` via WP REST API post meta.

---

## Adding a New Blog

1. Create context folder: `./xyz_blog/context/` with brand/SEO markdown files
2. Create rules file: `./rules/xyz_blog_generation.md`
3. Add `.env` vars: `BLOG_XYZ_NAME`, `BLOG_XYZ_WP_URL`, `BLOG_XYZ_WP_USERNAME`, `BLOG_XYZ_WP_PASSWORD`, `BLOG_XYZ_WP_METHOD=browser`, `BLOG_XYZ_CONTEXT_PATH=./xyz_blog/context`, `BLOG_XYZ_RULES_PATH=./rules/xyz_blog_generation.md`
4. Restart server — `seedBlogConfigsFromEnv()` creates the DB record automatically
