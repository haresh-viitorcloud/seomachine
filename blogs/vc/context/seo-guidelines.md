# SEO Guidelines for ViitorCloud Content

This document outlines SEO best practices and requirements for all ViitorCloud blog content to maximize organic search visibility and rankings on Google and AI search engines.

## Content Length Requirements

### Target Word Counts
- **Standard Blog Post**: 1,200-1,500 words
- **Pillar Content / Comprehensive Guides**: 2,000-3,000 words
- **How-To Guides**: 1,200-1,800 words
- **News / Updates**: 800-1,200 words (exception to standard)

### Important Length Guidelines
- **Standard articles**: Stay within 1,200-1,500 words
- **Maximum for pillar content**: 3,000 words
- If a topic requires more than the maximum, break it into a series of related articles
- Aim for the lower end of ranges when possible — concise, focused content often performs better
- Do not pad articles to hit word counts; every sentence must earn its place

### Quality Over Quantity
- Every section must provide genuine value
- No filler content, redundant explanations, or repeated points
- Check that no currently published ViitorCloud article already covers the same information before writing
- Better to have 1,300 sharp words than 1,500 padded words

## Keyword Optimization

### Keyword Research Requirements
Before writing any article:
1. **If primary and secondary keywords are provided with the article topic, treat them as the definitive keyword set** — use the provided primary keyword as the focus keyword and all provided secondary keywords as supporting keywords
2. **Additionally, check `context/target-keywords.md`** for any relevant keywords from the matching service cluster and incorporate them naturally alongside the provided keywords
3. If no keywords are provided, identify the primary focus keyword from `context/target-keywords.md` based on the article topic and cluster
4. Research search volume and difficulty for any keywords not already in the target list
5. List LSI (Latent Semantic Indexing) keywords to support topical coverage

### Keyword Frequency Rules (RankMath Standard)
- **All provided keywords**: Must appear at least **5 times each** in the article
- **Primary Focus Keyword density**: Target ~1% (e.g., 13-15 times in a 1,300-word article)
- **Secondary Keywords**: 0.5-1% density each
- Natural integration is mandatory — never force keywords into awkward positions

### Critical Keyword Placement (RankMath Checklist)
Primary keyword MUST appear in:
- [ ] H1 headline — place it near the beginning of the title
- [ ] SEO title — focus keyword near the beginning
- [ ] SEO meta description
- [ ] URL slug
- [ ] First 100 words of the article (opening paragraph)
- [ ] At least 2-3 H2 or H3 subheadings
- [ ] Last paragraph / conclusion
- [ ] Alt text of at least one image

### Keyword Integration Best Practices
- **Natural language first**: Write for humans, optimize for search engines
- **Use variations**: Do not repeat exact phrase robotically
  - Example: "AI development company" → "AI development firm" → "custom AI development"
- **Question formats**: Include conversational variations that match how users search
- **Semantic keywords**: Use related terms to support topical authority

### Keyword Stuffing (Avoid)
"AI development company is the best. AI development company services help businesses. Our AI development company offers AI development company solutions."

Correct: "AI development is transforming how businesses operate. Companies that invest in custom AI solutions gain a measurable edge in operational efficiency and decision-making speed."

## Content Structure Requirements

### Heading Hierarchy

#### H1 (Title)
- **Only one H1 per article**
- Include primary keyword naturally, near the beginning
- 60 characters or less for SERP display
- Journalistic and engaging — write it like a New York Times or Times of India headline
- Must make the reader want to read the article
- **Do not use colons, semicolons, or em dashes in the H1 title**

#### H2 (Main Sections)
- **4-7 H2 sections** for standard articles
- At least **2-3 should include keyword variations**
- Write H2s like newspaper section headlines — they should make the reader curious about what's underneath
- A reader should be able to scan just the H2s and understand the article's full scope
- **Do not use colons, semicolons, or em dashes in any H2 heading**

#### H3 (Subsections)
- Nested under H2s (never skip from H2 to H4)
- Use H3s to break complex sections into digestible chunks instead of writing long paragraphs
- Include keywords where natural
- **Do not use colons, semicolons, or em dashes in any H3 heading**

### Subheading Style Rule
Subheadings must be written to engage the reader to continue reading — not as dry labels.

- Write subheadings that create curiosity, imply a finding, or state a benefit
- Model: The Times of India and The New York Times article section titles
- Avoid generic labels like "Benefits of AI" — prefer "Why Businesses That Ignore AI Are Already Behind"
- **No colons, semicolons, or em dashes in H1, H2, or H3 headings** — rewrite the heading as a clean phrase or question instead
- The explanation under each subheading should not be a long paragraph; use bullet points or H3 breakdowns for concise presentation

### Article Structure Template

```markdown
# [H1: Engaging, Keyword-Rich Headline — Journalistic Style]

[Opening paragraph — primary keyword in first sentence or two]

## [H2: Engaging Section Title with Keyword Variation]
[2-3 short sentences OR bullet points — not a wall of text]

### [H3: Subsection if needed]
- Bullet point or short explanation
- Keep concise

## [H2: Engaging Section Title]
[Short paragraph or bullets]

## [H2: Section with keyword variation]
[Short paragraph or bullets / H3 breakdown]

## [H2: ViitorCloud CTA Section — before conclusion]
[Natural, case study and data-backed reference to ViitorCloud capabilities — not a sales pitch]

## [H2: Conclusion]
[Wrap up — include keyword — 100-150 words max]

## [H2: Frequently Asked Questions]
### [H3: Question 1 written in natural prompt language]
[40-60 word direct answer]

### [H3: Question 2]
[40-60 word direct answer]
```

**Section order rule**: FAQs always go at the very end of the article, after the conclusion. Not before the CTA, not before the conclusion. The conclusion closes the narrative; the FAQ block then captures People Also Ask queries and AI-engine prompts on the way out.

## Meta Elements

### Meta Title (RankMath)
**Requirements**:
- **Length**: 50-60 characters
- **Focus keyword**: Must be included — placed near the beginning
- **Compelling**: Should encourage clicks from SERP
- **Unique**: Different from all other ViitorCloud page titles
- **Accurate**: Must match page content

**Format Options**:
- `[Primary Keyword]: [Benefit/Promise]`
- `How to [Goal] — [Qualifier]`
- `[Number] Ways to [Achieve Benefit]`
- `[Topic] for [Audience] | ViitorCloud`

### Meta Description (RankMath)
**Requirements**:
- **Length**: 150-160 characters
- **Focus keyword**: Include naturally
- **Value proposition**: Clear benefit to reader
- **Call-to-action**: Action phrase (Learn, Discover, Find out, etc.)
- **Must directly answer the target query** — AI engines pull from meta descriptions
- Must not cut off mid-sentence

**Formula**:
```
[Problem/Question]? [Solution/Benefit]. [Unique angle or proof point]. [CTA].
```

### URL Slug (RankMath)
**Requirements**:
- Include primary focus keyword
- Lowercase letters only
- Hyphens between words (no underscores)
- Short and descriptive (3-5 words ideal)
- No stop words unless necessary

**Format**: `/blog/[primary-keyword-phrase]`

## Internal Linking Strategy

### Requirements
- **Minimum**: 3 internal links per article
- **Optimal**: 4-5 internal links
- **Maximum**: 6 internal links for standard-length articles

### Critical Rule: Spread Links Throughout the Article
Internal links must be distributed across the full article — do not cluster multiple links in a single section or paragraph. Space them across different H2 sections.

### Link Types to Include

#### 1. ViitorCloud Service Pages (1-2 links)
- Link to relevant service or capability pages on viitorcloud.com
- Only when directly relevant to the topic being discussed
- Natural anchor text — do not use "click here" or "you can review this" or "you can check this"
- The anchor should be a natural phrase that links to the resource without drawing attention to the link itself

#### 2. ViitorCloud Blog Posts (2-3 links)
- Link to published ViitorCloud blog articles on related subtopics
- Check `context/internal-links-map.md` for available linking targets
- Ensures we do not repeat information already covered in other articles

#### 3. Resource / Case Study Pages (0-1 link)
- Only when contextually relevant

### Internal Linking Best Practices

**Anchor Text**:
- Descriptive and natural — reads as part of the sentence, not as a link label
- Keyword-rich where possible
- Never: "click here", "read more", "you can review this", "check this out"
- Always: Natural phrase that tells the reader where they're going via context

**Placement**:
- Within body paragraphs (most valuable)
- Never more than 1-2 links per paragraph
- Distributed throughout the article — not all in one section

## External Linking Strategy

### Requirements
- **Exactly 2 external authority links per article** (standard)
- Must be placed in **different paragraphs and different sections** — never in the same paragraph or consecutive sections
- Purpose: Add credibility and support factual claims

### What to Link Externally
- Statistics and data sources — always cite where numbers come from
- Research and studies — link to original research
- Industry authorities — expert opinions or recognized industry publications

### External Link Quality Standards
- **Authority**: Link to well-established, credible sources only
  - Government or academic sources
  - Major industry publications
  - Research institutions
  - Established media outlets
  - Never: random blogs, low-authority sites, competitor sites
- **Relevance**: Links must directly support content claims
- **Freshness**: Prefer recent sources (within 1-2 years for data)

### Competitor Link Rule
**Never cite, mention, link to, or use examples from competitors or same-level IT companies.** This includes case studies, statistics, or any reference that could send traffic to or implicitly endorse a competing firm.

## CTA Guidelines

### Placement
- CTA for ViitorCloud must appear **before the conclusion** — not at the very end
- It should feel like a natural part of the article flow

### Tone and Style
- Must not read as a sales pitch
- Must be backed by real ViitorCloud capabilities, case studies, or data points from actual projects
- Write it as an expert sharing a relevant recommendation, not as a promotional insert
- Reference specific numbers, results, or capabilities where appropriate (draw from `context/features.md`)

### What to Avoid
- Generic phrases like "Contact us today" or "We can help you"
- Overly promotional language
- A CTA that feels disconnected from the article content

### Good CTA Example Structure
Naturally mention that ViitorCloud has solved a related problem for clients — cite a real metric or capability — then provide a contextually relevant service or contact link.

## Readability Optimization

### Target Reading Level
- **Goal**: 8th-10th grade reading level (Flesch-Kincaid)
- Makes content accessible to a wider professional audience
- Easier to scan and understand quickly

### Sentence Structure
- **Average length**: 15-20 words per sentence
- **Maximum**: 25 words (break longer sentences into two)
- **Variety**: Mix short punchy sentences with longer explanatory ones
- **Active voice**: Required (80%+ active voice throughout)
- Plain English standard: keep sentences short, active, and jargon-free

### Paragraph Structure
- **Length**: 2-4 sentences per paragraph maximum
- **One idea per paragraph**: Never blend multiple concepts
- **No walls of text**: Long paragraphs reduce engagement and SEO performance
- **Mobile-friendly**: Short paragraphs scan better on phones
- If a section needs more than 4 sentences to explain something, use bullet points or an H3 breakdown instead

### Formatting for Scannability
- **Subheadings**: Every 250-350 words (tighter than standard due to 1200-1500 word target)
- **Bullet points**: Use when listing 3+ related items, steps, or features — not as padding
- **Bold**: Emphasize key terms or statistics
- **H3 within sections**: Use instead of long paragraphs where content can be structured

## Content Quality Standards

### Expertise, Authoritativeness, Trustworthiness (E-E-A-T)

#### Experience & Expertise
- Articles are published from an expert author account using first-person "I" voice
- Write as an experienced practitioner sharing direct knowledge — not as a content researcher
- The article should reflect ViitorCloud's own experience, capabilities, and client work
- Do not write as though the content was researched from external sources; write confidently from expertise

#### Authoritativeness
- Back claims with real ViitorCloud data, project outcomes, and capabilities
- Reference industry facts where needed with proper source attribution
- Draw on the case studies and metrics in `context/features.md`

#### Trustworthiness
- Be direct and factual — no exaggeration or unverifiable claims
- Cite sources for external statistics
- Do not overpromise results

### Content Originality and Duplication Avoidance
- Before writing, verify that no existing ViitorCloud blog article covers the same information
- Every article must add new information, angle, or depth
- Never repeat the same examples, stats, or explanations across multiple articles
- If a related article exists, reference it via internal link rather than re-explaining it

### Factual Accuracy
- Verify all statistics and data points
- Ensure all ViitorCloud product and service references are accurate
- Use only current, up-to-date information

## Image Optimization (RankMath)

### Image SEO
**File Names**:
- Descriptive and keyword-rich
- Example: `ai-development-company-workflow.jpg`

**Alt Text**:
- Include the focus keyword naturally in at least one image's alt text
- Describe what the image shows
- 125 characters or less

**Placement**:
- Place images to break up long text sections
- After explaining the concept the image illustrates

## Featured Snippet Optimization

### Question-Based Snippets
- Include question as an H2 or H3 heading where appropriate
- Answer concisely in 40-60 words immediately after the heading
- Use clear, direct language

### List-Based Snippets
- Use numbered or bulleted lists
- Keep items concise (1-2 sentences each)
- 5-8 items is the optimal range

### Definition Snippets
- Define a key term in the first sentence after a heading
- 40-60 word concise definition
- Expand with additional detail after

## AI Search Optimization (GEO/AICO)

AI search engines (ChatGPT, Perplexity, Gemini, Claude) are now a primary research and recommendation channel. These guidelines ensure content performs in both traditional Google search and AI-generated answers.

### Direct-Answer-First Principle
AI scrapers prioritize content near the top of the page. Answer the query directly in the first 1-2 sentences before any narrative or context.

- State the core answer or thesis immediately
- Put the core answer in the meta description too
- Do not bury the answer behind 200+ words of context or definitions

### Key Takeaways Block
Every article should include a Key Takeaways block after the introduction, before the first H2 body section. This gets pulled into AI-generated summaries.

```markdown
> **Key Takeaways**
> - [Core finding or recommendation #1]
> - [Core finding or recommendation #2]
> - [Core finding or recommendation #3]
> - [Core finding or recommendation #4 if needed]
```

- 3-5 bullet points maximum
- Each bullet is a complete, standalone claim — not a teaser
- Use specific numbers, names, or outcomes

### Authority Signaling for AI
- **Named author**: Articles published from an expert author account (use "I" voice)
- **Last updated date**: Visible on the page
- **Year in titles**: Include current year for time-sensitive topics

### One Idea Per Section
Each H2/H3 section must focus on a single clear idea. This increases the chance of being cited as a source in AI answers.

### FAQ Sections as Prompt Targets
FAQ sections target Google's People Also Ask and match question-answer formats that AI users type directly.

- **Placement**: FAQs always go at the very end of the article, after the conclusion. Never before the CTA, never before the conclusion.
- Write FAQ questions in natural prompt language
- Answer each question directly in the first sentence, then expand
- Include 4-6 questions per article

### Content Repurposing for AI Citation Surface
AI tools pull from surfaces beyond your website: Medium, LinkedIn, Reddit, Quora, YouTube. Repurpose articles across platforms to maximize citation chances. Use the `/repurpose` command after publishing.

## Content Refresh Strategy

### When to Update Content
- Article is 12+ months old
- Statistics or data are outdated
- Processes or best practices have changed
- Rankings have declined
- New ViitorCloud capabilities or case studies are available to reference

### What to Update
- Publication / "Last Updated" date
- Statistics with current data
- Internal links to newer ViitorCloud content
- Examples with more recent ViitorCloud project outcomes

## SEO Checklist for Every Article (RankMath Aligned)

Before publishing, verify:

### Content
- [ ] 1,200-1,500 words (standard articles)
- [ ] Primary focus keyword identified
- [ ] Focus keyword used at least 5 times (all provided keywords used 5+ times each)
- [ ] Keyword density approximately 1%
- [ ] 3-5 secondary keywords included
- [ ] LSI keywords naturally integrated
- [ ] No content duplicated from existing ViitorCloud articles
- [ ] Factually accurate and current
- [ ] No competitor examples, case studies, or references

### Structure
- [ ] One H1 with primary keyword — journalistic headline style
- [ ] No colons, semicolons, or em dashes in H1, H2, or H3 headings
- [ ] 4-7 H2 sections — engaging, curiosity-driven titles
- [ ] 2-3 H2s/H3s include keyword variations
- [ ] Proper H1>H2>H3 hierarchy
- [ ] Focus keyword in first 100 words
- [ ] Focus keyword in conclusion
- [ ] No long paragraphs — bullet points or H3 used instead

### Meta Elements (RankMath)
- [ ] Focus keyword in SEO title — near the beginning
- [ ] Focus keyword in SEO meta description
- [ ] Focus keyword in URL slug
- [ ] Meta title 50-60 characters
- [ ] Meta description 150-160 characters with CTA
- [ ] All meta elements unique

### Links
- [ ] 3-5 internal links — distributed across article, not clustered
- [ ] Natural anchor text (no "click here", "review this", "check this")
- [ ] Exactly 2 external authority links — in different sections/paragraphs
- [ ] All links functional
- [ ] No competitor links

### Readability & Style
- [ ] 8th-10th grade reading level
- [ ] Average sentence length 15-20 words
- [ ] Paragraphs 2-4 sentences maximum
- [ ] No walls of text
- [ ] Bullet points and H3 used for concise section presentation
- [ ] Subheadings every 250-350 words
- [ ] Active voice (80%+ of sentences)
- [ ] No em dashes (—) in the article
- [ ] No "Not just X, but Y" or "We don't just X; we Y" structures
- [ ] No flowery language, idioms, or metaphors
- [ ] No contrasting metaphors to explain simple concepts
- [ ] No marketing-speak or dramatic transitions
- [ ] Written in first-person "I" voice (expert author account)

### Images
- [ ] At least one image with focus keyword in alt text
- [ ] Descriptive file names
- [ ] Images optimized for web

### CTA
- [ ] CTA placed before the conclusion
- [ ] Backed by real ViitorCloud capabilities or project data
- [ ] Does not read as a sales pitch
- [ ] Natural and contextually integrated

### AI Search Optimization
- [ ] Direct answer in first 1-2 sentences
- [ ] Key Takeaways block after introduction
- [ ] Meta description directly answers the target query
- [ ] FAQ section placed at the end of the article, after the conclusion
- [ ] FAQ questions written in natural prompt language
- [ ] Author attribution (named expert, not generic "Team")
- [ ] Last updated date included
- [ ] Year in title for time-sensitive topics

### Quality
- [ ] No spelling or grammar errors
- [ ] Sources cited for all external statistics
- [ ] Brand voice maintained
- [ ] Provides actionable, expert-level value
- [ ] Confident and persuasive — reads as practitioner insight, not research summary

## WordPress Publishing Format

All articles are published to WordPress as drafts using the `/publish-draft` workflow. Two publishing rules apply to every article:

- **SEO plugin**: RankMath. Meta title, meta description, and focus keyword are written into RankMath fields (`rank_math_title`, `rank_math_description`, `rank_math_focus_keyword`) automatically by the publisher. Do not duplicate these fields into Yoast.
- **Editor format**: Articles are published as native Gutenberg block markup, so the draft opens in WP admin as proper Gutenberg blocks (paragraph, heading, list, quote, table) without anyone clicking "Convert to Blocks". The publisher emits `<!-- wp:paragraph -->`, `<!-- wp:heading -->`, `<!-- wp:list -->` with `<!-- wp:list-item -->` children, `<!-- wp:quote -->`, and `<!-- wp:table -->` markers automatically. Writers do not need to add any block markup in the markdown draft; the publisher handles the conversion. Controlled by `WP_BLOCK_MODE=gutenberg` (the default). Classic Editor and the `wp:freeform` Classic-block wrapper are not used.

## SEO Tools & Resources

### Recommended Tools
- **Keyword Research**: Ahrefs, SEMrush, Google Keyword Planner
- **SEO Scoring**: RankMath (primary scoring tool for all ViitorCloud articles)
- **Content Analysis**: Clearscope, Surfer SEO
- **Readability**: Hemingway Editor
- **Technical SEO**: Google Search Console, Screaming Frog
- **Rank Tracking**: Ahrefs, SEMrush, Google Search Console

### Reference Resources
- Google's Search Quality Evaluator Guidelines
- RankMath Documentation
- Search Engine Journal
- Ahrefs Blog

---

**Remember**: Write every article as a confident expert sharing hard-won knowledge — not as a content writer summarizing research. ViitorCloud's credibility comes from real project experience and measurable outcomes. Let that come through in every article.
