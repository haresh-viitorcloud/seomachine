# SEO Guidelines for ViitorX Content

SEO requirements for every article published on viitorx.com. The goal is stated plainly in the standing prompts: **rank in AI search engines and in Google results**, and convert readers into qualified project enquiries.

**What this file is.** The optimisation mechanics: research workflow, keyword targets, word count, link quotas, meta elements, RankMath scoring, taxonomy, and the pre-publish checklist. Writing mechanics (voice, punctuation, subheading craft, banned constructions) live in `context/style-guide.md`. Offerings and proof points live in `context/features.md`. Linkable URLs live in `context/internal-links-map.md`.

**Authority.** Derived from the standing ViitorX research prompt and write prompt. Where a generic SEO best practice conflicts with these rules, these rules win.

**Business model.** ViitorX is a B2B project-based studio, not a self-serve SaaS product. The conversion event is a **qualified enquiry or consultation booking**, never a trial or signup. Optimise for that.

---

## The Two-Phase Workflow

Every ViitorX article is produced in two distinct passes. **Do not merge them.** Phase 1 ends by stopping and reporting; writing begins only after the brief is approved.

### Phase 1: Research and Outline

Deliverable: a research brief. No article prose.

1. Pull the top 10 Google results for the primary keyword.
2. Read all 10. Record what each one covers and, more importantly, **what all of them miss**.
3. Name the content gap explicitly. This gap is the article's reason to exist.
4. Pull supporting keyword data from Ahrefs (volume, difficulty, CPC, related terms, matching terms).
5. Confirm search intent, and the industry and segment the article speaks to.
6. Select internal links from `context/internal-links-map.md`.
7. Select external authority sources.
8. Build the outline: H1, H2s, H3s, and the CTA placement.
9. **Stop. Report the brief and wait for the go-ahead to write.**

The research brief must state:

- **Primary or focus keyword**, with volume, KD and CPC
- **Secondary keywords** to cover, each with its required mention count
- **The content gap**: what the top 10 do not give the reader, in one or two sentences
- **Search intent** and target segment
- **Internal links**: specific URLs, with the section each will sit in
- **External links**: exactly 2 authority URLs, with the section each will sit in
- **Proposed outline**: every heading, written to the newspaper-headline standard in `context/style-guide.md`
- **Category** (one of four) and **5 tags**
- **The named ViitorX projects** that will back each capability claim

### Phase 2: Write

Only after the brief is approved. Follow the approved outline, improving a heading where it clearly helps reading. Do not silently change the keyword strategy or the link plan; the prompt is explicit that the research strategy and the writing must not conflict.

### Every Article Is Independent

Do not reuse the structure, phrasing, opening device or section pattern of a previous ViitorX article. Each brief starts from its own SERP analysis. Two articles that share a skeleton read as templated to both Google and readers.

---

## Phase 1 in Detail: SERP Gap Analysis

The competitive method is fixed: **beat the top 10 by finding what they all omit**, not by writing longer.

### Record This for Each of the Top 10

| Field | Why |
|---|---|
| URL and domain | Identify who is competing |
| Word count | Establish the real length benchmark, not a guessed one |
| Heading structure | See how the topic is conventionally organised |
| What it covers well | Do not lose table-stakes coverage |
| What it omits | The gap |
| Content format | Guide, listicle, comparison, tool page |
| Search intent served | Informational, commercial, transactional |
| Freshness | Last updated date |

### Then Answer

- What question does the searcher still have after reading all 10?
- Which of them is weakest, and why does it still rank?
- What can ViitorX say from delivered work that none of them can say at all?

That last question is the wedge. The prompt requires the article to read as our own expertise rather than assembled research, and first-party delivery detail is the one thing a competitor cannot copy.

### Keyword Expansion

Use Ahrefs to widen the target set: matching terms, related terms, search suggestions, and the SERP overview. The repo also has `research_serp_analysis.py` and `research_competitor_gaps.py`, and Ahrefs MCP tools are available in-session.

### The Competitor Citation Ban

**Never cite, name, quote, or use an example or case study from a competitor or a same-level company in published copy.** Competitor research decides what to write and how to beat it. It never becomes a citation. See `context/competitor-analysis.md` for the named competitors to keep out of copy, and `context/style-guide.md` for the full rule.

---

## Content Length

The write prompt gives a target of 1,500 words, and RankMath asks for 1,000 to 1,500.

| Content type | Target |
|---|---|
| **Standard article** | **1,400 to 1,500 words** |
| Pillar or comprehensive guide | 1,800 to 2,200, only when the brief justifies it |
| News or brand update | 700 to 1,000 |

**Rules:**

- **1,500 is the working target for a standard article.** Do not drift to 2,500.
- Never pad to hit a number. Every section earns its place.
- If the topic genuinely needs more, split it into a cluster and interlink. See `/cluster`.
- The SERP benchmark from Phase 1 overrides the default if the top 10 are all substantially longer. Report that in the brief rather than silently expanding.

---

## Keyword Strategy

### Coverage Requirement

**Every keyword supplied in the brief must appear at least 5 times in the article.** This is an explicit prompt instruction and it is checked before publishing.

- Count each keyword's occurrences before submitting.
- Close variants and plural forms count toward natural reading, but **hit 5 exact-match uses** of each supplied keyword.
- Where 5 exact uses cannot be made to read naturally, flag it in the draft rather than forcing them. Forced repetition fails the readability bar in `context/style-guide.md`.

### Density

- **Focus keyword: 1% to 2% density.** In a 1,500-word article that is roughly **15 to 30 uses**.
- Secondary keywords: 0.5% to 1% each, with the 5-use floor above.
- Run `data_sources/modules/keyword_analyzer.py` to verify density and detect stuffing.

### Focus Keyword Placement

The focus keyword must appear in all of these:

- [ ] **SEO title, near the beginning**
- [ ] **SEO meta description**
- [ ] **URL slug**
- [ ] **The opening**, within the first sentence or two
- [ ] **At least 2 H2 subheadings**, and one H3 where it fits
- [ ] **One image's alt text**
- [ ] The conclusion

### Natural Integration

- Vary the form: "immersive experience centre", "experience centre design", "centres like this".
- Use question phrasings that match how people actually search and prompt.
- Support with semantically related terms, which is how AI systems judge topical depth.
- **Preserve exact-match spelling in keyword phrases**, including US spellings, even though body copy uses British-influenced Indian English. See `context/style-guide.md` and `context/target-keywords.md`.

### Stuffing

Wrong:

> Exhibition stall design matters. Good exhibition stall design attracts footfall. Our exhibition stall design team delivers exhibition stall design for exhibition stall design needs.

Right:

> Exhibition stall design decides whether a visitor stops walking. The layout, the sightlines and the first interaction all do measurable work, and most stands get the first three seconds wrong.

---

## RankMath Content Score Checklist

The prompt lists these explicitly. Verify every one before publishing.

| # | Requirement | Check |
|---|---|---|
| 1 | Focus keyword in the SEO title | [ ] |
| 2 | Focus keyword **near the beginning** of the SEO title | [ ] |
| 3 | Focus keyword in the SEO meta description | [ ] |
| 4 | Focus keyword in the URL | [ ] |
| 5 | Focus keyword at the beginning of the content | [ ] |
| 6 | Focus keyword used throughout the content as specified above | [ ] |
| 7 | Content 1,000 to 1,500 words | [ ] |
| 8 | Focus keyword in subheadings (H2, H3, H4) | [ ] |
| 9 | An image with the focus keyword as alt text | [ ] |
| 10 | Keyword density 1% to 2% | [ ] |
| 11 | Internal links present in the content | [ ] |
| 12 | External links present in the content | [ ] |

---

## Structure

### Heading Hierarchy

**H1**: one per article. Contains the focus keyword near the start. 60 characters or fewer.

**H2**: 5 to 7 for a 1,500-word article. At least 2 carry the focus keyword. Every H2 written to the newspaper-headline standard.

**H3**: 2 to 4 across the article, used in some H2 sections and not others. Never skip from H2 to H4.

Heading craft is governed by `context/style-guide.md`. It is the difference between a template and an article, so read that section before outlining.

### The Opening

The prompt sets three requirements that all apply to the first paragraph or two:

1. **A strong start that holds the reader.** The first two sentences do real work.
2. **Begin from the problem statement**, defined plainly.
3. **The problem statement carries a link.**

The focus keyword sits inside that opening. So does the direct answer, for AI search reasons below. In practice the opening is roughly 60 to 90 words: state the problem, resolve the core question, link once, move on. No throat-clearing, no scene-setting, no "in today's landscape".

### Section Shape

Under each H2, use a short lead paragraph followed by either a bulleted breakdown or two or three H3s. Vary the shape between sections. Long unbroken paragraphs are a rejection condition. Details in `context/style-guide.md`.

### FAQ Section

Include 4 to 6 questions where the topic supports it.

- Write questions the way people actually type them into Google and into ChatGPT.
- Answer in the first sentence, then expand in one or two more.
- Source questions from People Also Ask, search suggestions, Reddit and real enquiry questions. `context/features.md` has a Common Questions and Objections section to draw from.

### The CTA

One CTA, in the section immediately **before the conclusion**. Backed by a named project and real capability, asking for an enquiry rather than a purchase. Construction rules and an example are in `context/style-guide.md`.

---

## Meta Elements

### SEO Title

- **50 to 60 characters.**
- Focus keyword included, **near the beginning**.
- Written to earn the click, accurate to the content, unique across the site.
- No em dashes.
- Include the current year only for genuinely time-sensitive topics.
- "| ViitorX" only if it fits inside 60 characters, which it usually will not. The keyword matters more.

Good: "Immersive Experience Centre Design: What It Really Costs"
Bad: "Everything You Need to Know About Designing an Immersive Experience Centre in 2026" (too long, keyword buried)

### Meta Description

- **150 to 160 characters.**
- Focus keyword included.
- **Directly answers the target query.** This text is frequently what an AI system surfaces, so it should carry the answer, not tease it.
- Ends as a complete thought. Never cut off.
- Action verb where it fits naturally.

Formula: `[Direct answer to the query]. [Specific supporting detail]. [What the reader gets.]`

### URL Slug

- Lowercase, hyphens, no underscores.
- Contains the focus keyword.
- 3 to 6 words. Drop stop words.
- Format: `/blog/[focus-keyword-phrase]/`
- **Never change a published slug** without a 301 redirect.

---

## Internal Linking

Full URL inventory, per-URL guidance and an anchor-text bank are in `context/internal-links-map.md`. Read it before outlining.

### Quotas

- **4 to 6 internal links** in a 1,500-word article.
- **One link per paragraph, maximum.** This counts internal and external links together. Two links in one paragraph is a rejection condition.
- **Spread across sections.** Never clustered in one paragraph or one section.
- Never link the same URL twice in one article.
- The opening problem statement carries one of them.

### The Structural Constraint

The site has **no per-service pages**. `/offerings/` and `/industries/` are single pages with no section anchor IDs, so there are only two service URLs available and each can be used once. **Most internal links must therefore be case studies and blog posts.** A case study is usually the stronger choice anyway, because it proves the claim in the sentence around it.

Recommended mix:

| Link type | Count |
|---|---|
| Case studies proving named claims | 2 to 3 |
| Related blog posts in the same cluster | 1 to 2 |
| `/offerings/` or `/industries/` | 1 |
| `/contact-us/`, inside the CTA | 1 |

### Anchor Text

Descriptive, 2 to 6 words, natural inside a sentence that was going to be written anyway. Never "click here", "read more", "you can review this". Never announce the link. See `context/style-guide.md`.

---

## External Linking

### Quotas

- **Exactly 2 external authority links** per article.
- They must sit in **different paragraphs and different sections**. Never together.
- Neither may share a paragraph with an internal link, because of the one-link-per-paragraph rule.

> Note: the research prompt asks for 1 authority link at brief stage and the write prompt asks for 2 in the final article. **2 is correct for the published piece.** Identify at least 2 during Phase 1.

### What Qualifies as Authority

- Government, regulatory and standards bodies
- Academic and research institutions, and peer-reviewed studies
- Recognised industry associations, for example VRARA
- Established national and international media, and major industry analysts
- Original sources for any statistic cited

### What Does Not Qualify

- **Any competitor or same-level company.** Absolute rule.
- Content marketing from a peer studio or agency
- Aggregators, scraped-content sites, unattributed statistics pages
- Anything behind a paywall the reader cannot get past
- Sources older than 2 years for data-driven claims

### Placement

Each external link supports a specific factual claim in the sentence around it. Do not cluster citations, do not add a sources list at the end, and do not signpost with "according to research" beyond what the sentence needs.

---

## Images

- At least one image, with the **focus keyword in the alt text**.
- Alt text describes the image, 125 characters or fewer, no "image of".
- Descriptive filenames with keywords: `immersive-experience-centre-touch-wall.jpg`.
- Compressed for load speed. Core Web Vitals are a ranking input.
- Prefer real project photography over stock. It reinforces the first-party expertise signal.

> `[TO CONFIRM]` The client logo wall on the homepage ships empty `alt` attributes. Worth fixing at source. Flagged in `context/features.md`.

---

## AI Search Optimisation

The prompts name AI search engines as a primary ranking goal alongside Google. AI systems select sources differently from a classic ranking algorithm, so a few things are non-optional.

### Answer the Query Immediately

AI systems weight content near the top of the page. Resolve the target query within the first one or two sentences, inside the same opening that states the problem. Do not bury the answer behind 200 words of context.

This is compatible with the required problem-statement opening: define the problem, then answer it in the same breath.

### One Idea Per Section

AI systems cite at section level. A section built around a single clear idea, with structured formatting inside it, is far more likely to be quoted than a section that blends three topics into flowing prose. This is the same discipline the readability rules already demand.

### Question Formats as Prompt Targets

FAQ headings and question-shaped H2s match how people prompt AI tools. Phrase them in natural language, not SEO-speak, and answer in the first sentence.

### Authority Signals

- **Named author**: articles publish under Rohit Purohit (Founder & CEO) or Vishal Rajpurohit (Co-Founder & CTO), never a generic "Team" byline.
- **Visible last-updated date** on the page.
- Credentials that support the topic: ISO 27001 certification, VRARA chapter presidency, the 10+ year ViitorCloud delivery heritage, 100+ completed projects.
- Year in the title for time-sensitive topics.

### First-Party Expertise Is the Ranking Strategy

The prompt is explicit that an article which merely restates information from other authority sites may not rank. The counter is delivered work: named projects, what the constraint was, what was built, what it now measures. This is both the E-E-A-T play and the AI citation play, and it is why the competitor citation ban matters. Only ViitorX can write ViitorX's delivery detail.

### Key Takeaways Block

**Optional, not default.** A short takeaways block near the top helps AI summarisation, but it competes with the 1,500-word budget and with the instruction to use bullets only where needed. Use it when the topic is genuinely list-shaped. Skip it otherwise, and rely on the direct answer in the opening.

### Repurposing

AI systems pull from surfaces beyond viitorx.com. `/repurpose` adapts an article for LinkedIn, Medium, Reddit and Quora. More surfaces carrying attribution back to the site raises citation probability. See `context/ai-citation-targets.md` and `/research-ai-citations`.

---

## Readability

| Metric | Target |
|---|---|
| Reading level | Grade 8 to 10 (Flesch-Kincaid) |
| Average sentence length | 15 to 18 words |
| Maximum sentence length | 25 words |
| Paragraph length | 2 to 3 sentences, 4 maximum |
| Active voice | 85% or higher |
| Subheading frequency | Every 200 to 300 words |

Verify with `data_sources/modules/readability_scorer.py`.

**Transitions**: the prompt bans dramatic transitions, and the repo scrubber flags "Moreover", "Furthermore", "Additionally", "Consequently" and "Nevertheless" as AI filler. Do not use them. Use plain connectors or none.

---

## Taxonomy: Category and Tags

Set on every article before publishing.

### Category: Choose Exactly One

The four WordPress categories, matching the offering section headings on `/offerings/`:

- **Digital brand experience**
- **Event & brand activations**
- **Immersive experience centers**
- **Simulation-based learning**

Note the capitalisation difference: these are the **category labels** as they appear in WordPress. When the same offering is named inside article prose it takes its proper-noun form (Digital Brand Experience, Event & Brand Activations, Immersive Experience Centers, Simulation-Based Learning), including the US "Centers" spelling. See `context/style-guide.md`.

One category per article. If an article spans two, pick the one matching the primary search intent and the CTA.

### Tags: Exactly Five

Five tags per article. Build them from:

- The focus keyword
- One or two secondary keywords from the brief
- The technology involved, for example VR training, holography, projection mapping, digital twin
- The segment served, for example museums, mining, real estate

Rules: lowercase unless a proper noun, reuse existing tags rather than creating near-duplicates, and no tag identical to the category.

---

## Deliverables

| Output | Location |
|---|---|
| Research brief (Phase 1) | `research/` |
| Article draft (Phase 2) | `drafts/` |
| **Word document** of the final article | Delivered alongside the draft, per prompt requirement |
| Published article | `published/`, and WordPress via `/publish-draft` |

The prompt asks for the finished article as a Word document. Produce the markdown draft in `drafts/` as the working file, then export the `.docx` for handoff. WordPress publishing uses the REST API with Yoast fields exposed by `wordpress/seo-machine-yoast-rest.php`; note that the scoring target in the prompts is **RankMath**, so confirm which plugin is live on the site before relying on the Yoast field mapping.

> `[TO CONFIRM]` The repo's publisher targets Yoast SEO fields while these guidelines target RankMath scoring. Confirm which SEO plugin viitorx.com actually runs, and align `wordpress_publisher.py` if it is RankMath.

---

## Pre-Publish Checklist

### Research
- [ ] Top 10 SERP analysed and recorded
- [ ] Content gap named explicitly
- [ ] Ahrefs data pulled
- [ ] Search intent confirmed
- [ ] Brief approved before writing began

### Keywords
- [ ] Focus keyword identified
- [ ] **Every supplied keyword used at least 5 times**
- [ ] Focus keyword density 1% to 2%
- [ ] Focus keyword at the start of the content
- [ ] Focus keyword in 2+ H2s and one H3
- [ ] Exact-match spellings preserved

### Length and Structure
- [ ] 1,400 to 1,500 words
- [ ] One H1 with the keyword near the front
- [ ] 5 to 7 H2s, 2 to 4 H3s, no skipped levels
- [ ] Every heading passes the newspaper-headline test
- [ ] Section shapes vary
- [ ] Opening states the problem, answers the query, and carries a link
- [ ] FAQ section included where appropriate
- [ ] CTA immediately before the conclusion

### Meta
- [ ] SEO title 50 to 60 chars, keyword near the beginning
- [ ] Meta description 150 to 160 chars, keyword included, answers the query
- [ ] Slug lowercase, hyphenated, contains the keyword
- [ ] All three unique across the site

### Links
- [ ] 4 to 6 internal links
- [ ] Exactly 2 external authority links, in different sections
- [ ] **One link per paragraph, maximum**
- [ ] Links spread across sections, not clustered
- [ ] No URL linked twice
- [ ] All anchors natural and descriptive
- [ ] **Zero competitor links, citations or examples**
- [ ] Every link resolves

### Images
- [ ] At least one image
- [ ] Focus keyword in one alt text
- [ ] Descriptive filenames
- [ ] Compressed

### AI Search
- [ ] Query answered in the first one or two sentences
- [ ] Meta description answers the query directly
- [ ] One idea per section
- [ ] FAQ questions phrased as people prompt
- [ ] Named author (CEO or CTO)
- [ ] Last-updated date present

### Taxonomy and Output
- [ ] One category from the four
- [ ] Exactly five tags
- [ ] Word document produced

### Compliance
- [ ] No price stated or implied
- [ ] No 92% or 96% figures
- [ ] No target country named in body copy
- [ ] Every capability claim backed by a named ViitorX project
- [ ] `/scrub` run: no em dashes, no watermarks, no banned phrases
- [ ] Style checklist in `context/style-guide.md` completed
- [ ] Voice checklist in `context/brand-voice.md` completed

---

## Tools

### In this repo
- `research_serp_analysis.py`, `research_competitor_gaps.py`, `research_quick_wins.py`
- `data_sources/modules/keyword_analyzer.py` for density and stuffing
- `data_sources/modules/readability_scorer.py` for reading level
- `data_sources/modules/seo_quality_rater.py` for a 0 to 100 score
- `data_sources/modules/content_length_comparator.py` for the SERP length benchmark
- `data_sources/modules/content_scrubber.py`, run via `/scrub`

### External
- **Ahrefs** for keyword and SERP data. MCP tools are available in-session. Monetary values return in USD cents, so divide by 100.
- **RankMath** for on-page scoring, which is the target in the prompts
- **Google Search Console** for impressions and position tracking

---

## Related Files

| File | What it governs |
|---|---|
| `context/style-guide.md` | Punctuation, sentence mechanics, subheading craft, banned constructions, CTA style |
| `context/brand-voice.md` | Voice pillars, tone, core messages, value propositions by segment, audience |
| `context/features.md` | Offerings, proof points, named work, what is safe to claim |
| `context/target-keywords.md` | Live keyword targets, volumes, priorities |
| `context/internal-links-map.md` | Every linkable URL and its anchor guidance |
| `context/competitor-analysis.md` | Strategy input only, never a citation source |
| `context/ai-citation-targets.md` | Surfaces where ViitorX should be cited by AI tools |

---

## Maintenance

**Version**: 2.0 (first ViitorX-specific edition, replacing the imported template)
**Last updated**: 24 August 2026
**Derived from**: the standing ViitorX article research and write prompts

Open items:

- **Every published article is currently authored by "SEO Admin"** in its structured data, not by a named person. This breaks the named-author requirement above and the first-party expertise strategy the standing prompt is built on. Verified across six live articles on 24 August 2026; see `context/writing-examples.md`. Reassign to Rohit Purohit or Vishal Rajpurohit
- `[TO CONFIRM]` Whether viitorx.com runs RankMath or Yoast, and whether `wordpress_publisher.py` needs realigning
- `[TO CONFIRM]` Whether the target-country prohibition also excludes geo-bearing keyword phrases
- Pricing content stays blocked until the Engagement Model section of `context/features.md` is completed

---

**Remember**: SEO serves the reader. The ranking strategy here is not keyword mechanics, it is delivered work described precisely. The mechanics are the floor.
