# Devlyn SEO Guidelines

This document defines SEO requirements for all Devlyn blog content. Reference alongside brand-voice.md and devlyn-content-map.md when writing or reviewing any content asset.

Target audience for all Devlyn content: CTOs, technical co-founders, VPs of Engineering at funded startups (Seed → Series B) and scaling companies in US, UK, Australia, Canada, and Europe.

---

## Content Length Requirements

### Target Word Counts by Type

| Content Type | Target Range | Notes |
|---|---|---|
| SEO Blog Posts (standard) | 2,000–3,000 words | Technical audience expects depth |
| Pillar/Comprehensive Guides | 3,000–4,000 words | Cover a topic exhaustively |
| Hiring Guide Posts | 2,500–3,500 words | Include vetting criteria, cost tables, red flags |
| Cost/Rate Content | 2,000–3,000 words | Data-heavy; always include comparison tables |
| Comparison Posts | 2,000–3,000 words | Side-by-side structure, clear verdict |
| Technical How-To Posts | 2,000–2,500 words | Step-by-step, assumes technical literacy |

### Why Depth Matters for Devlyn
- Devlyn's target buyer is a CTO or technical founder who will actually read the full article if it delivers value
- Thin content signals low authority — the opposite of Devlyn's senior engineering positioning
- Long-form content earns more backlinks from developer blogs, startup newsletters, and industry publications
- Depth is required to cover cost tables, vetting criteria, comparison frameworks that Devlyn content targets

### Quality Over Padding
- Every section must deliver standalone value. Cut sections that exist only to hit a word count.
- Practical specifics are more valuable than elaborated generalities. A 2,200-word post with real cost data beats a 3,000-word post with filler.

---

## Keyword Optimization

### Keyword Research — Before Writing Any Devlyn Post
1. Confirm the primary target keyword from devlyn-keywords.md
2. Check search volume and difficulty (Ahrefs / SEMrush)
3. Review top 5 ranking competitor pages for that keyword
4. Identify 3–5 secondary/related keywords to weave in naturally
5. Pull LSI keywords from the semantic field of the topic (e.g., for "hire laravel developer india": PHP, backend, Eloquent, Composer, REST API, offshore, staff augmentation)

### Keyword Density Guidelines
- **Primary keyword**: 1–2% density (in a 2,500-word post: 25–50 natural uses)
- **Secondary keywords**: 0.5–1% each
- **LSI/semantic keywords**: Sprinkle throughout — especially in H3s, body paragraphs, FAQ answers
- Never force repetition. One natural use beats two awkward ones.

### Critical Placement — Primary Keyword Must Appear In:
- [ ] H1 title (as early in the title as possible)
- [ ] First 100 words of the article
- [ ] At least 2 H2 subheadings (as a variation, not identical repetition)
- [ ] Conclusion paragraph
- [ ] Meta title (within first 55 characters)
- [ ] Meta description
- [ ] URL slug
- [ ] At least one image alt text

### Keyword Examples by Content Type

**Hire Developer Posts:**
- Primary: "hire laravel developer india"
- Secondary: "laravel developer cost", "senior laravel developer", "hire dedicated laravel developer", "php developer india"
- LSI: Laravel Forge, Eloquent ORM, PHP 8, API development, REST, backend engineer

**Cost/Rate Posts:**
- Primary: "laravel developer hourly rate 2026"
- Secondary: "laravel developer cost india", "offshore developer rates", "hire developer india vs us cost"
- LSI: staff augmentation, dedicated engagement, hourly vs monthly, time zone overlap

**Solution Posts (MVP, SaaS, etc.):**
- Primary: "build mvp in 6 weeks" or "saas application development company india"
- Secondary: "mvp development cost", "offshore saas development", "startup engineering partner"
- LSI: product roadmap, sprint, agile, product-market fit, MVP scope

---

## Content Structure Requirements

### Heading Hierarchy

**H1 (Title)**
- One H1 per article — never more
- Include primary keyword as early in title as possible
- 60 characters or less for standard SERP display
- Frame as a benefit or answer, not just a topic label
  - ✅ "How to Hire a Senior Laravel Developer from India in 2026"
  - ❌ "Laravel Developer Hiring"

**H2 (Main Sections)**
- 4–7 H2 sections for standard posts
- Include primary keyword variation in at least 2–3 H2s
- H2s should be scannable independently — a reader skimming H2s should understand the article's argument
- Every H2 should deliver a meaningful section, not just a transition label

**H3 (Subsections)**
- Nest under relevant H2 only — never skip hierarchy
- Use to break complex sections: cost breakdowns, comparison criteria, step-by-step processes
- Include keywords where natural

### Standard Article Structure for Devlyn Blog Posts

```
# [H1: Primary Keyword — Benefit-Framed Title with Year]

[Direct answer in 1–2 sentences — answers the query immediately for AI citation]

## Introduction (150–200 words)
- Direct answer or thesis in first sentence
- Stakes: what happens if this decision goes wrong
- Promise: what this post delivers specifically
- Keyword in first 100 words

> **Key Takeaways**
> - [Specific claim or recommendation #1]
> - [Specific claim or recommendation #2]
> - [Specific claim or recommendation #3]
> - [Specific claim or recommendation #4]

## [H2: Section 1 — Frame the Problem / Stakes]
### [H3 if needed]

## [H2: Section 2 — Core Content / Main Answer with Keyword Variation]
### [H3: Subsection — e.g., cost table, comparison, steps]
### [H3: Subsection]

## [H2: Section 3 — Depth / Supporting Content]
### [H3 if needed]

## [H2: Section 4 — Devlyn's Approach / How We Solve This]
[This section positions Devlyn without being overtly promotional — frame as "how the right partner approaches this"]

## [H2: Section 5 — FAQ]
[4–6 questions in natural language — match how CTOs actually ask this in Google/AI tools]

## Conclusion (150–200 words)
- Restate the core takeaway
- Include primary keyword
- CTA: "Book a Strategy Call at devlyn.ai/contact"
```

---

## Meta Elements

### Meta Title
- Length: 50–60 characters (including any branding)
- Must include primary keyword
- Include year for cost, hiring, comparison, and trend content
- Format options:
  - `[Primary Keyword] — [Benefit/Context] | Devlyn`
  - `How to [Goal]: [Year] Guide for CTOs`
  - `[Number] [Topic] [Year]: [Specific promise]`

**Examples:**
- ✅ "Hire Laravel Developer India: 2026 CTO Guide | Devlyn" (53 chars)
- ✅ "Laravel Developer Cost India 2026: Full Breakdown" (50 chars)
- ✅ "How to Build an MVP in 6 Weeks: Devlyn Playbook" (48 chars)
- ❌ "Hiring a Laravel Developer from India" (no year, no benefit, too short)
- ❌ "The Complete Ultimate Guide to Everything You Need to Know About Hiring Laravel Developers from India in 2026" (way too long)

### Meta Description
- Length: 150–160 characters — must not cut off mid-sentence
- Include primary keyword
- State a specific benefit or outcome
- Include a CTA action word (Discover, Learn, See, Get, Compare)
- Directly answer the query — AI tools pull from meta descriptions

**Formula**: `[Query answer in 1 sentence]. [Unique angle or proof point]. [CTA].`

**Examples:**
- ✅ "Laravel developer rates in India range from $25–$55/hour in 2026. Full breakdown by experience, engagement model, and region. Compare before you hire." (155 chars)
- ✅ "Learn how to build an MVP in 6 weeks using AI-accelerated development. Devlyn's proven framework for startups. Book a strategy call." (132 chars)

### URL Slug
- Lowercase, hyphens only
- Include primary keyword
- 3–6 words ideal
- No stop words unless they're part of the exact keyword phrase
- Format: `/blog/[keyword-phrase]`

**Examples:**
- ✅ `/blog/hire-laravel-developer-india`
- ✅ `/blog/laravel-developer-hourly-rate-2026`
- ✅ `/blog/build-mvp-6-weeks`
- ❌ `/blog/how-to-hire-a-great-laravel-developer-from-india-in-2026`

---

## Internal Linking Strategy

### Requirements Per Post
- Minimum: 3 internal links
- Optimal: 4–6 internal links for standard posts, up to 8 for comprehensive guides
- Always use descriptive anchor text — never "click here", never "read more"

### Mandatory Internal Link Rules by Content Type

**For Hire Developer posts** (e.g., "hire laravel developer india"):
- Always link to: `/hire-laravel-developer` (or relevant hire page)
- Always link to: `/cost-and-rate-cards` (for pricing context)
- Always link to: `/interview-checklists` (for vetting context)
- Always link to: `/processes-and-methodology` (for trust/process signal)

**For Solution posts** (e.g., "build mvp", "saas development"):
- Always link to: relevant solution page (`/build-mvp-in-6-weeks`, `/saas-application-development`, etc.)
- Always link to: `/case-studies`
- Always link to: `/build-mvp-in-6-weeks` whenever MVP is mentioned
- Always link to: `/rescue-as-a-service` whenever failed or stalled projects are mentioned

**For Cost/Comparison posts:**
- Always link to: `/cost-and-rate-cards`
- Always link to: `/dedicated-offshore-development-center-odc`
- Always link to: relevant hire page for the technology discussed

**For all posts (universal):**
- Always link to: `/contact` at the end with CTA anchor text "Book a Strategy Call"
- Link "offshore development" → `/dedicated-offshore-development-center-odc`
- Link "CTO support" → `/cto-support-for-startups`
- Link "scale engineering team" → `/team-scaling-for-enterprises`
- Link "rescue" or "failed project" → `/rescue-as-a-service`
- Link "build MVP" → `/build-mvp-in-6-weeks`

### Anchor Text Guidelines
- Descriptive and keyword-relevant
- Use natural variations of the target phrase
- ✅ "hire a senior Laravel developer from India"
- ✅ "Laravel developer hourly rates in 2026"
- ✅ "our dedicated offshore development model"
- ❌ "click here", "read this", "learn more"

---

## External Linking Strategy
- 2–3 external authority links per post
- Link to: Stack Overflow developer surveys, GitHub stats, industry reports, recognized publications (TechCrunch, InfoQ, McKinsey)
- Never link to: direct competitors (Bacancy, Acquaintsoft, ValueCoders, MoonTech, Appinventiv)
- Use `rel="noopener noreferrer"` and open in new tab

---

## AI Search Optimization (GEO / AEO)

AI tools (ChatGPT, Perplexity, Gemini, Claude) are a growing traffic source for B2B services. CTOs increasingly query AI tools before booking a strategy call. These rules maximize Devlyn's citation frequency.

### Direct Answer First
- Answer the query in the first 1–2 sentences — before any narrative hook or storytelling
- AI tools pull from the earliest clear answer on a page
- Never bury the answer behind 200+ words of context

**Before (traditional SEO):**
> Hiring offshore developers has become increasingly popular as companies seek... [300 words later] ...the typical cost for a Laravel developer in India is $25–$55/hour.

**After (AI-optimized):**
> A senior Laravel developer in India costs $25–$55/hour in 2026, depending on experience level and engagement model. Here's what drives that range and how to evaluate the right fit.

### Key Takeaways Block (Required for Every Post)
Place this immediately after the introduction, before the first H2 body section.

```markdown
> **Key Takeaways**
> - [Specific finding or recommendation — complete claim, not a teaser]
> - [Specific finding or recommendation]
> - [Specific finding or recommendation]
> - [Specific finding or recommendation — optional 4th]
```

Rules:
- 3–4 bullets maximum
- Each is a complete, standalone claim with specifics (numbers, names, timelines)
- Not a table of contents — these are the article's actual conclusions surfaced early

### FAQ Section (Required for Every Post)
- 4–6 questions per post
- Write questions in natural language — how a CTO would type it into Google or ChatGPT
- Answer the question directly in the first sentence, then expand
- Target Google's People Also Ask boxes + AI prompt formats

**Example FAQ questions for a Laravel hiring post:**
- "How much does it cost to hire a Laravel developer in India?"
- "What's the difference between hiring a Laravel freelancer vs. a dedicated developer?"
- "How do I vet a Laravel developer before hiring offshore?"
- "Is it safe to hire Laravel developers from India for a production SaaS?"
- "How long does it take to onboard a Laravel developer from Devlyn?"

### Authority Signals for AI Citation
Include in every article:
- **Named author** (not "Devlyn Team")
- **Last updated date** visible on page
- **Year in title** for time-sensitive content
- **Specific data points**: cost ranges, years of experience, timelines — not vague claims

---

## Content Refresh Rules

### When to Update
- Post is 9+ months old (for fast-moving topics like hiring rates, AI tools)
- Statistics or cost data are from prior year
- Ranking has declined by 5+ positions
- A stronger competitor post has emerged on the same keyword

### What to Update
- "Last Updated" date (always)
- All cost/rate data with current year figures
- Internal links to any new pages added since original publish
- Key Takeaways block if advice has shifted
- FAQ section with newly emerging questions

---

## SEO Checklist — Before Publishing Every Devlyn Post

### Content
- [ ] 2,000+ words (appropriate for content type — see table above)
- [ ] Primary keyword confirmed from devlyn-keywords.md
- [ ] Keyword density 1–2% for primary keyword
- [ ] 3–5 secondary keywords naturally integrated
- [ ] LSI/semantic keywords woven throughout
- [ ] Technically accurate — no hallucinated facts, made-up stats, or fake case study numbers
- [ ] Written for CTO/technical founder audience — not beginners

### Structure
- [ ] One H1 with primary keyword early in title
- [ ] 4–7 H2 sections
- [ ] 2–3 H2s include keyword variations
- [ ] Proper H1→H2→H3 hierarchy (no skips)
- [ ] Primary keyword in first 100 words
- [ ] Primary keyword in conclusion
- [ ] Key Takeaways block present after introduction
- [ ] FAQ section with 4–6 questions present

### Meta Elements
- [ ] Meta title 50–60 characters with primary keyword
- [ ] Meta description 150–160 characters with keyword and CTA
- [ ] URL slug is clean, keyword-rich, 3–6 words
- [ ] All meta elements unique (not duplicated from another post)

### Links
- [ ] Minimum 3 internal links with descriptive anchor text
- [ ] Mandatory links for content type included (see internal linking rules above)
- [ ] CTA with "Book a Strategy Call" linking to /contact present at end
- [ ] 2–3 external authority links (no competitors)

### AI Search Optimization
- [ ] Direct answer in first 1–2 sentences
- [ ] Key Takeaways block (3–4 specific bullets)
- [ ] FAQ section with natural-language questions
- [ ] Specific data: cost ranges, timelines, experience levels
- [ ] Named author (not "Devlyn Team")
- [ ] Year included in title for time-sensitive content

### Readability
- [ ] Short paragraphs (2–4 sentences)
- [ ] Subheading every 300–400 words
- [ ] Tables used for cost/comparison data
- [ ] Active voice throughout
- [ ] No banned words (cutting-edge, world-class, passionate, seamless, etc.)

### Quality
- [ ] Brand voice: senior, credible, outcome-first
- [ ] No made-up case study numbers or client names
- [ ] Claims are specific and defensible
- [ ] CTA at end: "Book a Strategy Call" → devlyn.ai/contact

---

## Recommended Tools

- **Keyword Research**: Ahrefs, SEMrush
- **Content Optimization**: Surfer SEO (match heading and semantic coverage)
- **Readability**: Hemingway Editor (aim for Grade 9–11 for technical B2B)
- **Grammar**: Grammarly (Professional setting)
- **Rank Tracking**: Ahrefs, Google Search Console
- **AI Citation Audit**: Perplexity (search for target queries, check which sources appear)

---

**Remember**: Devlyn's SEO is not just about ranking — it's about being the most credible, specific, and useful result a CTO finds when they're researching a hiring or development decision. Rank means nothing without click-through, and click-through means nothing without trust. Write for the CTO first, optimize for the algorithm second.