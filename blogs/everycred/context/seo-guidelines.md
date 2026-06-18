# SEO Guidelines for EveryCRED Content

This document outlines SEO best practices and requirements for all EveryCRED blog content to maximize organic search visibility, AI engine citations, and demo/sales conversions.

**Website:** https://www.everycred.com
**Last Updated:** May 2026

---

## Content Length Requirements

### Target Word Counts
- **Standard Blog Post:** 1,400 words (the primary target per writing workflow)
- **Pillar / Comprehensive Guide:** 2,500–3,500 words
- **Use-Case / Solution Page Article:** 1,200–1,800 words
- **News / Announcement:** 800–1,000 words

### Important Length Notes
- The two-prompt workflow targets **1,400 words** for standard articles — do not pad
- Pillar content should be broken into topic clusters (linked articles) rather than one mega-post
- Every section must add new information — no restating points made earlier in the same article
- **Anti-repetition rule:** Before writing, check published blog posts on everycred.com/blog. Each article must offer information not already covered. Avoid recycling the same statistics, frameworks, or case study angles across articles.

---

## Keyword Strategy

### Market Priority

**Primary market: USA** — Most articles should target a US audience (federal agencies, state and local government, law enforcement, universities, healthcare, enterprise). Use NIST, GAO, Carahsoft, and dollar-denominated statistics as the default framing.

**Secondary market: India** — Write India-specific articles when the keyword, topic, or audience is explicitly India-focused. Use DigiLocker, DPDP Act, and India Stack context only in those articles. Do not mix India and US contexts in the same article.

### Official Target Keywords

EveryCRED's 28 target keywords are defined in `context/target-keywords.md`. That file is the authoritative source. All articles must use keywords from that list as primary or supporting keywords. The clusters below summarize the structure — refer to target-keywords.md for full detail.

### Primary Keyword Clusters (from target-keywords.md)

**Cluster 1 — Core Credentials (Tier A priority):**
- verifiable credentials *(pillar)*
- digital credentials
- digital credential platform
- digital credential software
- credential platform
- credentials solutions
- credential management
- verified credentials
- credentials verification

**Cluster 2 — Digital Identity Platform (Tier A/B priority):**
- digital identity *(pillar)*
- digital identity platform
- digital identity verification
- digital identity management solutions
- identity proofing software
- decentralized identity

**Cluster 3 — Blockchain Identity (Tier B priority):**
- blockchain credentials *(pillar)*
- blockchain identity solutions
- blockchain identity verification
- digital identity blockchain

**Cluster 4 — Digital Trust (Tier B/C priority):**
- digital trust *(pillar)*
- digital trust services
- digital trust platform

**Cluster 5 — Government Digital Transformation (Tier B priority):**
- digital government transformation *(pillar)*
- digital government solutions
- digital id cards
- compliance automation software

**Cluster 6 — Supporting Keywords (Tier C priority):**
- digital certificate
- digital badges

### US Government Long-Tail Variations (primary — append to Cluster 1, 2, or 5 keywords)
Use these modifiers for US government-focused articles, which are the default target audience:
- + government agencies / federal agencies / public sector
- digital id cards law enforcement
- police digital identity verification
- contractor access verification
- government workforce credential management
- grant fraud prevention digital credentials

### India-Specific Long-Tail Variations (secondary — append to Cluster 1 or 2 keywords)
Use these modifiers only when the article is explicitly India-focused. Do not use in US-targeted articles:
- + India / Indian / India government
- DigiLocker verifiable credentials
- DPDP Act digital identity
- fake degree detection India
- NMC license verification
- credential fraud prevention India

### Keyword Frequency Rule
Every provided target keyword must appear **at least 4 times** in the article. This is a hard requirement from the writing workflow. Distribute naturally — never cluster in one paragraph.

### Keyword Placement (Required)
Primary keyword MUST appear in:
- [ ] H1 headline (preferably in first half of title)
- [ ] First 100 words of article
- [ ] At least 2 H2 subheadings
- [ ] Last paragraph before conclusion
- [ ] Meta title (within first 60 characters)
- [ ] Meta description
- [ ] URL slug

### Keyword Variation
Use natural variations to avoid repetition:
- "verifiable credentials" → "digital credentials" → "credential verification" → "W3C credentials"
- "government agencies" → "public sector" → "federal agencies" → "state and local government"
- "law enforcement" → "police departments" → "field officers" → "law enforcement agencies"

### Avoid Keyword Stuffing
Every sentence must read naturally. A keyword forced into an awkward sentence hurts readability and E-E-A-T signals.

---

## Content Structure Requirements

### Heading Hierarchy

#### H1 (Title)
- One H1 per article
- Include primary keyword naturally
- 60 characters or less for SERP display
- Written in newspaper headline style (see Style Guide)
- Should create urgency or frame a clear outcome

#### H2 (Main Sections)
- 4–6 H2 sections for a 1,400-word article
- At least 2–3 must include keyword variations
- Each H2 title must be engaging and informative like a newspaper subheading (The Times of India / NYT style)
- H2s should be independently scannable — a reader should understand the article flow from H2s alone

#### H3 (Subsections)
- Used to break complex H2 sections into digestible parts
- Never skip from H2 to H4
- Include keywords where natural

### Article Structure Template

```markdown
# [H1: Keyword-Rich Newspaper-Style Headline — Under 60 Characters]

[Introduction: 120–160 words. Direct answer in first 1–2 sentences. Problem, evidence, promise. Primary keyword in first 100 words.]

> **Key Takeaways**
> - [Specific finding or outcome #1]
> - [Specific finding or outcome #2]
> - [Specific finding or outcome #3]
> - [Specific finding or outcome #4]

## [H2: Engaging Section Heading with Keyword Variation]
[150–250 words. Bullet points or H3 for sub-points. Concise — no long paragraphs per section.]

## [H2: Engaging Section Heading]
[150–250 words]

## [H2: Engaging Section Heading with Keyword Variation]
[150–250 words]

## [H2: Engaging Section Heading]
[150–250 words]

## [H2: EveryCRED Capabilities CTA Section]
[Natural, capability-backed mention of EveryCRED. Use "we". Short — 80–120 words. Before conclusion.]

## Conclusion
[100–150 words. Recap 3–4 key points. Forward-looking final sentence.]

## FAQs

### [Question written in natural prompt language people type into AI tools?]
[15–20 word direct answer.]

### [Question 2?]
[15–20 word direct answer.]

### [Question 3?]
[15–20 word direct answer.]

### [Question 4?]
[15–20 word direct answer.]

### [Question 5?]
[15–20 word direct answer.]
```

**Article end order (required):** CTA section → Conclusion → FAQs. FAQs always last.

### Section Content Rules
- Explanation under each subheading should be in **bullet points or H3 subsections**, not long paragraphs
- Maximum 2–3 sentences per paragraph in prose sections
- Sections must each cover a distinct idea — never restate what a previous section covered
- One embedded YouTube video per article (where it adds context)

---

## Meta Elements

### Meta Title
- **Length:** 50–60 characters (hard maximum: 60)
- **Format options:**
  - `[Primary Keyword]: [Specific Outcome] | EveryCRED`
  - `How [Audience] [Achieves Goal] with [Keyword]`
  - `[Number] Ways [Keyword] [Solves Problem] in [Year]`
- Must include primary keyword
- Include year for time-sensitive topics — write year without square brackets (e.g. `2026` not `[2026]`)

**Examples:**
- "Digital ID Cards for Police: Field Deployment Guide" (50 chars)
- "Verifiable Credentials for Government Agencies 2026" (52 chars)
- "How Blockchain Credentials Stop Credential Fraud India" (55 chars)

### Meta Description
- **Length:** Target exactly 160 characters (acceptable range: 150–160; never cut off mid-sentence)
- Must directly answer the query in the first sentence
- Include primary keyword
- Include a clear action phrase (Learn, Discover, See how, Find out)
- Never cut off mid-sentence

**Formula:**
```
[Direct answer to query]. [Key benefit or differentiator]. [Action phrase].
```

**Examples:**
- "Verifiable credentials for government reduce verification time from 30 minutes to 10 seconds. See how agencies deploy blockchain-based digital IDs." (152 chars)
- "Credential fraud costs India billions annually. Learn how blockchain credentials prevent fake degrees and forged licenses with instant verification." (149 chars)

### URL Slug
- Format: `/blog/[primary-keyword-phrase]`
- Lowercase, hyphens only
- 3–6 words
- Include primary keyword
- No stop words unless essential

**Examples:**
- `/blog/digital-id-cards-police-deployment`
- `/blog/verifiable-credentials-government-agencies`
- `/blog/credential-fraud-prevention-india`

---

## Internal Linking Strategy

### Requirements per Article
- **Minimum:** 3 internal links
- **Optimal:** 4–5 internal links
- **Maximum:** 6 internal links for a 1,400-word article
- Spread throughout the article — never cluster in one section or paragraph

### Internal Link Types

#### 1. EveryCRED Solution/Service Pages (1–2 links)
- Link to relevant product or industry pages on everycred.com
- Only when contextually natural — never promotional-feeling

#### 2. Related Blog Posts (2–3 links)
- Link to existing published articles on related topics
- **Always check everycred.com/blog before writing to identify linkable articles**
- Reinforces topic cluster architecture

#### 3. Case Study / Proof Pages (0–1 link)
- When discussing deployment results, link to the relevant case study

### Anchor Text Rules
- **Short and natural:** 2–5 words that fit into the sentence naturally
- **Never use the full article title as anchor text**
- **Never use:** "click here," "read more," "check this out," "you can review this," "you can check this"
- Anchor text must align with the sentence it sits in — no forced insertions

**Examples:**
- "law enforcement deployments" (not "Digital ID Cards for Police: Field Deployment Guide and Vendor Requirements")
- "credential revocation" (not "Learn about EveryCRED's real-time credential revocation feature here")
- "government grant programs" (not "Read our article on Credentials Solutions for Government Grant and Funding Programs")

### Anti-Clustering Rule
No more than 2 internal links within the same paragraph. Links must be distributed across different sections of the article.

---

## External Linking Strategy

### Requirement per Article
- **Exactly 1 external authority link** per standard 1,400-word article (per writing workflow)
- The one external link must appear naturally in a body paragraph — not in a dedicated "sources" section
- It must not appear in the same paragraph as another link
- Do not link to competitors or same-level companies (Dock, Truvera, Dhiway, MATTR, SpruceID, walt.id, Sphereon, Microsoft Entra, IBM Digital Credentials, PingOne, Blockcerts, Credly, Accredible)

### Approved External Link Sources
- **Government/regulatory bodies:** NIST, W3C, GAO, DPDP Act official sources, NMC, UGC, DigiLocker official, Indian government portals
- **Research institutions:** MIT research, World Economic Forum, McKinsey, Gartner (where publicly available)
- **Established media:** Times of India, Economic Times, The Hindu, Reuters, BBC (for India/global statistics)
- **Standards bodies:** ISO, OpenID Foundation, IETF RFC documents
- **Data sources:** GAO fraud reports, CERT-In, NASSCOM data

### External Link Placement
- Must appear naturally mid-article as a citation for a statistic or claim
- Must support the sentence it's in — never a standalone "further reading" reference
- Prefer sources less than 2 years old for data points

---

## Readability Optimization

### Target Reading Level
- 8th–10th grade (Flesch-Kincaid) for B2B government/enterprise audience
- Technical accuracy maintained without jargon overload

### Sentence Structure (Mandatory)
- **Average length:** 12–18 words per sentence
- **Maximum:** 22 words (break at 23+)
- **Active voice:** 80%+ of sentences
- Vary sentence length — mix short punchy statements with explanatory sentences

### Paragraph Structure
- **Length:** 2–3 sentences per paragraph maximum
- **One idea per paragraph**
- No walls of text — white space is required
- Mobile-first: short paragraphs read better on small screens

### Bullet Points
- Use bullet points **only when needed** — not as a default
- Use when listing 3+ items that would be awkward as prose
- Use when presenting parallel features, steps, or criteria
- Do not use bullets for fewer than 3 items (write as prose instead)
- Each bullet point: sentence case, concise, parallel structure

---

## AI Search Optimization (GEO / LLMO)

EveryCRED content must rank in both traditional Google search AND AI-generated answers (ChatGPT, Perplexity, Gemini, Claude). AI engines are increasingly the first touchpoint for government IT buyers researching credential platforms.

### Direct-Answer-First Rule
- Answer the query in the **first 1–2 sentences** of the article — before any hook or context
- Do not bury the answer behind 150+ words of background
- The meta description must also directly answer the target query

### Key Takeaways Block (Required)
Every article must include a Key Takeaways block immediately after the introduction:

```markdown
> **Key Takeaways**
> - [Specific, standalone claim with a number or outcome]
> - [Specific, standalone claim]
> - [Specific, standalone claim]
> - [Specific, standalone claim]
```

Rules:
- 3–5 bullets maximum
- Each bullet is a complete, standalone claim — not a teaser or table of contents entry
- Use specific numbers, outcomes, or named technologies — never vague summaries

### One Idea Per Section (AI Parsing Rule)
AI models parse content by section. Each H2/H3 must contain one clear idea. This increases the probability of that section being cited in an AI-generated answer.

### FAQ Section (Required)
Every article must end with a FAQ section placed **after the Conclusion**:

- **Section heading:** `## FAQs` (H2, exact text)
- **Each question:** `### Question text?` (H3 — one question per H3 heading)
- **Answer format:** 15–20 words, direct answer in a single sentence immediately below the H3
- **Count:** 5 questions per article
- Write questions in natural prompt language (how real users type into AI tools or search engines)
- Target PAA (People Also Ask) and long-tail variations of the primary keyword
- Answers must be standalone — a reader should understand the answer without reading the article

**Examples of well-formed FAQ questions:**
- "How does EveryCRED verify credentials without an internet connection?"
- "What is the difference between verifiable credentials and digital certificates?"
- "Can government agencies purchase EveryCRED through existing contract vehicles?"
- "How quickly can a credential be revoked using EveryCRED?"

### Authority Signals for AI Citation
Every article must include:
- **Named author** (not "EveryCRED Team")
- **Last updated date** visible on page
- **Year in title** for time-sensitive topics

---

## Thought Leadership vs. Sales Pitch Balance

### Core Principle
EveryCRED articles must read as **expert thought leadership** informed by real deployments — not as product marketing. The goal is to demonstrate expertise through experience, then let readers conclude EveryCRED is the right solution.

### Rules
- Write from EveryCRED's operational experience — reference real deployments (Raigad Police, Maharashtra, Navi Mumbai Police) as evidence, not as self-promotion
- Never make a claim that can't be supported by a specific feature, case study, or statistic
- The article body must be informative and useful even if the reader never contacts EveryCRED
- The CTA section is the only place for direct product promotion

### CTA Section (Before Conclusion — Required)
- Appears as a dedicated H2 section immediately before the conclusion
- 80–120 words maximum
- Use "we" when referring to EveryCRED (only in this section)
- Must be capability-backed — reference a specific feature, deployment, or result
- Must feel natural in context — connect directly to the article's topic
- Do not use "schedule a demo" as the only CTA — make it problem/outcome-specific

**Good CTA example:**
"Raigad Police reduced credential verification time from 30 minutes to under 10 seconds using our digital identity platform. Government agencies facing similar verification delays can deploy our system through existing procurement vehicles including NASA SEWP V and ITES-SW2. [Link: book a demo]"

**Poor CTA example:**
"EveryCRED is the leading digital credential platform. Schedule a demo today to see our amazing features."

---

## No-Repetition Policy

### Pre-Writing Check (Required)
Before starting any article:
1. Browse everycred.com/blog and list all published articles
2. Note what claims, statistics, frameworks, and case study angles each article already covers
3. Ensure the new article covers the same topic from a materially different angle — new data, new use case, new audience perspective, or new level of depth
4. Do not restate the same statistics across multiple articles without adding new context

### Overlap Handling
If an existing article covers part of your topic:
- Link to it (internal link) instead of re-explaining
- Cover only the aspect the existing article does not
- Use the internal link as proof of depth, not as a crutch

---

## Content Quality Standards (E-E-A-T)

### Experience
- Reference EveryCRED's actual deployments as primary evidence
- Use specific metrics: "30 minutes to 10 seconds," "85% reduction in administrative overhead"
- Attribute knowledge to operational context, not general research

### Expertise
- Back all claims with data, specific standards (W3C VC 2.0, NIST SP 800-63-4), or deployment results
- Define technical terms on first use
- Demonstrate command of relevant regulatory context (DPDP Act, eIDAS 2.0, NIST, W3C)

### Authoritativeness
- Cite one authoritative external source per article (GAO, NIST, W3C, etc.)
- Include named author attribution
- Reference standards bodies and regulatory frameworks where relevant

### Trustworthiness
- Never overstate capabilities or results
- Acknowledge complexity honestly — credential deployments require planning and integration
- Cite sources for all statistics
- Update articles when standards or data change

---

## Image Optimization

### Image SEO
- **File names:** Descriptive and keyword-rich: `verifiable-credentials-government-verification.jpg`
- **Alt text:** Describe what image shows + keyword where natural (125 chars max)
- **Placement:** After explaining the concept — never before

### Alt Text Examples
- "EveryCRED dashboard showing credential issuance workflow for government agency"
- "QR code verification for police digital ID card using EveryCRED platform"
- "Blockchain credential verification flow from issuer to holder to verifier"

---

## Featured Snippet Optimization

### Question-Based Snippets
Use H2 or H3 as a question, then answer in 40–60 words immediately below:

```markdown
## What Is a Verifiable Credential?

A verifiable credential is a cryptographically signed digital document that proves a claim about a person or organization. Unlike a paper certificate or PDF, it can be verified instantly by any party with access to the issuer's public key — without contacting the issuer or checking a database.
```

### List-Based Snippets
- 5–8 items per list
- Items concise: 1 sentence each
- Use for step-by-step processes, feature lists, checklist items

### Definition Snippets
- Define term in first sentence after heading
- 40–60 word clear definition
- Expand with context after

---

## SEO Checklist for Every Article

### Pre-Writing
- [ ] Published articles on everycred.com/blog reviewed for overlap
- [ ] Primary keyword and 3–5 secondary keywords identified
- [ ] Target audience confirmed (India government / US government / enterprise / education / healthcare)
- [ ] Internal links identified from existing blog and service pages
- [ ] One authoritative external source identified

### Content
- [ ] 1,400 words (standard article)
- [ ] Every provided keyword appears at least 4 times
- [ ] No keyword stuffing — all integrations feel natural
- [ ] Article covers a distinct angle not already covered on the blog
- [ ] Real EveryCRED deployments referenced (not generic claims)
- [ ] Thought leadership tone — not sales pitch

### Structure
- [ ] One H1 with primary keyword (newspaper headline style)
- [ ] 4–6 H2 sections
- [ ] 2–3 H2s include keyword variations
- [ ] Key Takeaways block after introduction
- [ ] CTA section before conclusion (uses "we", capability-backed)
- [ ] Article end order: CTA section → `## Conclusion` → `## FAQs`
- [ ] `## FAQs` H2 present after Conclusion; each question is an H3; 5 questions; 15–20 word answers
- [ ] Sections use bullet points or H3s — not long paragraphs
- [ ] No single section longer than 250 words
- [ ] Feature/capability lists in CTA section use bullet list with **Bold criterion:** format, not run-on paragraphs

### Meta Elements
- [ ] Meta title 50–60 characters with primary keyword (hard max 60); year written without square brackets
- [ ] Meta description targets exactly 160 characters; answers query directly; includes CTA phrase
- [ ] URL slug includes primary keyword, 3–6 words
- [ ] Draft file uses `**Target Keyword**:` field name (not `Focus Keyphrase` or `Primary Keyword`) for WordPress Yoast integration

### Links
- [ ] 3–5 internal links, spread across sections
- [ ] Anchor text is short (2–5 words), natural, contextual
- [ ] No "click here," "read more," "you can check this" anchor text
- [ ] Exactly 1 external authority link
- [ ] External link does not link to a competitor
- [ ] No 2 links in same paragraph

### Style (Per Writing Workflow)
- [ ] No dashes (—) anywhere in the article
- [ ] No "Not just X, but Y" or "We don't just X; we Y" constructions
- [ ] No contrasting metaphors or flowery language
- [ ] Active voice 80%+ of sentences
- [ ] Average sentence: 12–18 words
- [ ] Bullet points used only when genuinely needed
- [ ] "We" used only in the CTA section
- [ ] No dramatic transitions or marketing-speak

### AI Search Optimization
- [ ] Direct answer in first 1–2 sentences of article
- [ ] Key Takeaways block present (3–5 specific, standalone claims)
- [ ] Meta description directly answers target query
- [ ] FAQ questions written in natural prompt language
- [ ] Named author attribution
- [ ] Last updated date included
- [ ] Year in title for time-sensitive articles

### Quality
- [ ] No spelling or grammar errors
- [ ] Statistics cited with source
- [ ] No broken internal or external links
- [ ] EveryCRED product references are accurate
- [ ] CTA is natural, connected to article topic, capability-backed

---

## Key Statistics to Use in Content

Use these EveryCRED-verified statistics across articles (avoid repeating the same stat in multiple articles — each article should use different supporting data):

- Raigad Police: verification time reduced from 30 minutes to under 10 seconds
- Raigad Police: 85% reduction in administrative overhead
- Statewide police rollout: 36 weeks (pilot operational by week 20)
- US federal fraud (GAO estimate): $233–$521 billion annually
- US FY2025 improper payments: $186 billion
- Manual credential verification cost: $15–$25 per check
- EveryCRED verification cost: under $0.10 per check
- First-year savings potential (500K verifications): $7.4–$12.4 million
- AI-forged document growth: 311% (Q1 2024 to Q1 2025)
- Entry cost for document fraud: under $30
- US average data breach cost: $10.22 million
- DigiLocker users: 51.3 crore; 5.6 billion documents issued
- Decentralized identity market: $1.3B (2025) → $103.3B (2034)

---

*Update this document when new articles are published, new keywords are targeted, or EveryCRED adds new capabilities or case studies.*
