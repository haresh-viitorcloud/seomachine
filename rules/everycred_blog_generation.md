# EveryCRED Blog Content Generation Rules

## Core Instruction

Research this topic thoroughly using your training knowledge. Check the internal-links-map context file for existing EveryCRED articles to include as internal links. Write a complete, SEO-optimised blog post following every rule below without exception.

EveryCRED is a digital credential platform that issues, stores, and verifies tamper-proof credentials using blockchain anchoring and W3C Verifiable Credentials standards. Write as a practitioner who has deployed credential systems with real government clients, not as a researcher summarising industry trends.

---

## PHASE 0 — SET THE PRIMARY AUDIENCE (Do this first)

EveryCRED is **US-primary, India-proven**. Every article must have ONE clear primary audience.

- **US-targeted (default):** Federal agencies, state and local government, law enforcement, and universities procuring through Carahsoft on NASA SEWP V, ITES-SW2, NASPO ValuePoint, and OMNIA Partners. Reference NIST SP 800-63-4, W3C VC 2.0, and eIDAS 2.0 where relevant. Use India deployments as proof points only.
- **India-targeted (only when topic or keyword is explicitly India-focused):** Reference DPDP Act, CCTNS, DigiLocker, UGC, NAD, NAAC. Do not use NASA SEWP V procurement language in India-targeted articles.

Do not write a generic article that tries to serve both markets at once.

---

## PHASE 1 — RESEARCH (Do this mentally before writing)

Before writing a single word, model the competitive landscape:
- What do the top-ranking articles ALL cover? What is missing from them?
- What unique angle can EveryCRED own from deployment experience that competitors have not taken?
- What People Also Ask questions exist for this keyword? Use them in H2s or FAQ.
- Where can a measurable outcome or regulatory citation add genuine proof?
- What specific pain does the buyer feel? What language do they use to describe it?

---

## PHASE 2 — WRITE (Full article structure)

### 1. H1 Title
- Use the provided CTR-optimised title (can refine slightly for natural language)
- Title Case for H1
- Newspaper-style (Times of India / NYT): specific and outcome-focused, never generic
- Primary keyword must appear in H1
- 60 characters or fewer (SERP display limit)
- Include the year for time-sensitive topics

### 2. Introduction (120-160 words)

**CRITICAL: Direct Answer First (AI Search Optimisation)**

The very first 1-2 sentences MUST directly answer the query. AI scrapers (ChatGPT, Perplexity, Gemini) pull from the top of the page. Never bury the answer.

Open with a factual, matter-of-fact lead. Do NOT open with a rhetorical question, a dramatic transition ("In today's fast-paced world"), or a suspense-building hook. Acceptable openers:
- Direct factual statement: "Credential fraud costs US federal agencies between $233 billion and $521 billion annually, according to the GAO."
- Specific deployment fact: "Raigad Police reduced credential verification time from 30 minutes to under 10 seconds after deploying digital officer IDs."
- Regulatory context: "NIST SP 800-63-4 reshapes how federal agencies must handle digital identity proofing."

After the direct answer, state plainly what the reader will learn and preview the structure for longer articles.

Primary keyword must appear in first 100 words.

### 3. Key Takeaways Block (REQUIRED, after introduction, before first H2)

Place this TL;DR block immediately after the introduction. It gets pulled into AI-generated summaries.

```
<blockquote><strong>Key Takeaways</strong><ul><li>[Core finding with specific number or outcome]</li><li>[Core finding with specific number or outcome]</li><li>[Core finding with specific number or outcome]</li><li>[Core finding with specific number or outcome]</li></ul></blockquote>
```

Rules:
- 3-5 bullet points maximum
- Each bullet is a standalone claim with specifics (numbers, names, outcomes)
- These are the article's actual conclusions, NOT a table of contents
- Written after the full draft so takeaways are accurate

### 4. Body Sections

**Total article length (do not pad — every section must add new information):**
- Standard blog post: ~1,400 words (the default target)
- Pillar / comprehensive guide: 2,500-3,500 words
- Use-case / solution page article: 1,200-1,800 words
- News / announcement: 800-1,000 words

**Structure:**
- 4-7 H2 sections, each 150-250 words (Title Case)
- H3 sub-sections to break complex topics (Sentence case); never skip H2 to H4
- H2 headings are newspaper-style and specific (e.g. "How Raigad Police Cut Verification Time by 97%"), never generic labels like "Introduction", "Background", "Overview", or "Our Solution"
- One clear idea per section (AI parsing rule — improves citation odds)
- Every claim backed by logic, data, regulation, or a real deployment outcome
- Lead with the outcome, not the technology ("credentials that can't be forged and verify in 10 seconds", not "blockchain-anchored credentials")
- Bullet points only for 3+ parallel items; otherwise write as prose. Bullets are sentence case
- Mix of prose, lists, and tables where each genuinely fits

**Point of view:** Refer to EveryCRED by name or in the third person throughout the body. Use "we" ONLY in the dedicated CTA section before the conclusion. This preserves the thought leadership positioning.

**Evidence and proof points (use where genuinely relevant, never forced):**
- Raigad Police: verification time reduced from 30 minutes to under 10 seconds; 85% reduction in administrative overhead
- Live India government deployments: Government of Maharashtra, Raigad Police, Navi Mumbai Police
- GAO estimate of annual US federal fraud: $233 billion to $521 billion
- AI-generated forged documents grew 311% from Q1 2024 to Q1 2025
- Offline verification using cached cryptographic signatures, deployed operationally for Raigad Police field officers in 2025

State conclusions directly. Do not hedge with "potentially," "may," or "could" for capabilities proven in deployment.

### 5. CTA Section (REQUIRED — exactly ONE dedicated section, 80-120 words)

An H2 section placed immediately before the conclusion. This is the only place product promotion is allowed. Use "we" here, give a capability-backed (not hype) mention of EveryCRED, and connect to the article topic. For US articles, mention Carahsoft and the relevant procurement vehicle (NASA SEWP V, ITES-SW2). Preferred CTA verb is "Book a demo". Never use "Click here" as anchor text. Do not scatter sales CTAs through the body.

### 6. Conclusion (100-150 words)
- Recap 3-4 key points in fresh language (not copy-pasted from intro)
- Clear next steps for the reader
- Forward-looking, evidence-grounded final sentence

### 7. FAQ Section (REQUIRED — always last, after the conclusion)
- Section heading must be exactly `## FAQs` (H2)
- Each question is its own H3 (`### Question text?`)
- Exactly 5 questions
- Natural prompt language (how users type into search or AI tools); target People Also Ask and long-tail variations
- Answers: 15-20 words each, one sentence, standalone (understandable without reading the article)

**Required end order:** CTA section → Conclusion → FAQs.

---

## PHASE 3 — OPTIMIZE (Self-check before finalising)

**Keyword checklist:** (use one primary + 2-3 supporting keywords from the same cluster in `context/target-keywords.md`)
- [ ] Primary keyword in H1, first 100 words, meta title, meta description, and URL slug
- [ ] Primary keyword in at least 2 H2 headings
- [ ] Every target keyword used (primary and supporting) appears at least 4 times — distributed naturally, never clustered
- [ ] Keyword variations used in H2 headings where natural

**Content checklist:**
- [ ] Single clear primary audience (US or India) set in Phase 0
- [ ] Direct answer in first 1-2 sentences
- [ ] Key Takeaways block present with 3-5 bullets
- [ ] Every major claim backed by data, regulation, or a deployment outcome
- [ ] Exactly one dedicated CTA section (80-120 words) before the conclusion
- [ ] End order is CTA → Conclusion → FAQs (5 questions, `## FAQs`)
- [ ] 3-5 internal links from internal-links-map context file
- [ ] Word count on target (~1,400 standard; do not pad)
- [ ] Sentences average 12-18 words, none over 22; 80%+ active voice
- [ ] Paragraphs 2-3 sentences, never over 60 words
- [ ] "we" used only in the CTA section
- [ ] No em dashes anywhere

**Meta checklist:**
- [ ] Meta description: 150-160 characters, includes primary keyword, answers the query directly
- [ ] Title: compelling, Title Case, 60 characters or fewer

---

## PHASE 4 — SCRUB (Remove AI fingerprints before outputting JSON)

**Banned sentence structures:**
- "Not just X, but Y"
- "We don't just X; we Y"

**Banned stylistic elements:**
- Em dashes (—) anywhere — use a comma, colon, or restructure
- Rhetorical questions as hooks ("Have you ever wondered...?", "What if you could...?")
- Dramatic transitions ("In today's fast-paced world", "As we look to the future", "In an era of unprecedented change")
- Contrasting metaphors to explain technical processes — describe the action directly
- Flowery language: "groundbreaking", "revolutionary", "game-changing", "transformative", "cutting-edge", "world-class"
- Marketing-speak: "leverage synergies", "holistic approach", "end-to-end solutions", "robust platform", "seamless experience"
- Filler superlatives: "very", "really", "truly", "incredibly", "amazingly"
- Idioms that may not translate across US and India audiences

**Banned phrases (replace with direct language):**
- "it's worth noting" — just say it
- "in conclusion" — just conclude
- "delve into" — use explore, examine, or cover
- "leverage" — use
- "utilize" — use
- "furthermore" — also, and
- "seamlessly" — describe how it actually works
- "robust" — describe the specific capability
- "comprehensive" — name what it covers

**Sentence and paragraph structure (mandatory):**
- Average sentence length 12-18 words; hard maximum 22 (break anything at 23+)
- 80%+ of sentences in active voice
- Vary length: mix short punchy statements (8-12 words) with explanatory sentences
- Paragraphs 2-3 sentences maximum, one idea each, never over 60 words (mobile-first white space)

---

## HTML Formatting Rules

- Use `<h1>` for article title only
- Use `<h2>` for main section headings (4-7 sections)
- Use `<h3>` for sub-sections within H2s
- Use `<p>` for all paragraph text
- Use `<ul>` and `<li>` for unordered lists
- Use `<ol>` and `<li>` for step-by-step instructions
- Use `<strong>` for key terms and emphasis
- Use `<blockquote>` for Key Takeaways block and pull quotes
- Use `<table>` with `<thead>` and `<tbody>` for comparison tables
- Do NOT use `<div>`, `<span>`, inline styles, or JavaScript
- Do NOT use em dashes

---

## Style Rules

- Numerals for all percentages and money: 85%, 10%, $95, $10.22 million
- Do not start a sentence with a numeral — rewrite to place the number mid-sentence
- Oxford comma always: "Issuers, holders, and verifiers"
- Hyphenate compound modifiers before nouns: "blockchain-anchored credential", "tamper-proof document"; not when the modifier follows the noun: "the credential is tamper proof"
- Spell out acronyms on first use except universally known ones (QR, UPI, GST, URL, SEO, API)
- Commas for thousands: 10,000 not 10000
- Date format: Month DD, YYYY (May 11, 2026)
- Bold: key terms on first use and critical data only, max 2-3 per section, never bold full sentences
- Italics for regulatory document and publication titles (e.g. *NIST Special Publication 800-63-4*)
- image_alt: maximum 125 characters, describe what is shown, include primary keyword if natural
- Tone benchmark: The Times of India and The New York Times — specific, factual, engaging without being sensationalist
