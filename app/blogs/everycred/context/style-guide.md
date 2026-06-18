# EveryCRED Style Guide

This guide defines writing conventions, formatting standards, and editorial rules for all EveryCRED blog content. It is derived from the two-prompt article workflow and applies to every article published on everycred.com.

**Last Updated:** May 2026

---

## Writing Philosophy

EveryCRED articles should read like expert commentary from practitioners who have deployed credential systems with real government clients — not like vendor marketing copy. The goal is to inform first, persuade by demonstration, and convert through credibility.

The benchmark for tone and subheading style is **The Times of India** and **The New York Times** — specific, factual, and engaging without being sensationalist or vague.

---

## Voice & Tone

### Core Characteristics
1. **Confident and direct** — state facts, not opinions dressed as facts
2. **Matter-of-fact** — describe what happens, what it means, what to do
3. **Expertise-driven** — write from operational experience, not research summaries
4. **Persuasive through evidence** — let data and outcomes do the convincing

### Tone by Content Type
- **US government / public sector content (primary):** Formal, precise, compliance-aware; reference NIST SP 800-63-4, W3C VC 2.0, GAO fraud statistics, and Carahsoft procurement vehicles. Do not include DPDP Act or India Stack references in US-targeted articles.
- **India government / public sector content (secondary):** Same formal tone; reference DPDP Act, DigiLocker, India Stack, NMC, UGC, and state government context. Do not include NASA SEWP V or US procurement references in India-targeted articles.
- **Enterprise / technical content:** Practical, integration-focused, outcome-oriented
- **Education / healthcare content:** Clear, accessible, outcome-focused; avoid over-technicalizing
- **Thought leadership:** Confident, analytical, forward-looking — never preachy

### "We" Usage Rule
Use "we" to refer to EveryCRED **only in the CTA section** before the conclusion. In all other sections, refer to EveryCRED by name or use third-person. This preserves the thought leadership positioning of the main article body.

---

## Banned Constructions and Phrases

These are hard prohibitions from the EveryCRED writing workflow. Every article must be checked against this list before publishing.

### Banned Sentence Structures
- "Not just X, but Y" — e.g., "Not just a credential issuer, but a trust platform"
- "We don't just X; we Y" — e.g., "We don't just issue credentials; we secure identities"
- Any variation of the above contrastive amplification structure

### Banned Stylistic Elements
- **Em dashes (—)** — do not use anywhere in the article body, headings, or meta elements. Use a comma, colon, or restructure the sentence instead.
- **Contrasting metaphors** — do not use metaphors to explain technical processes. Describe the action directly.
- **Flowery language** — no "groundbreaking," "revolutionary," "game-changing," "transformative," "cutting-edge," "world-class"
- **Dramatic transitions** — no "In today's fast-paced world," "As we look to the future," "In an era of unprecedented change"
- **Marketing-speak** — no "leverage synergies," "holistic approach," "end-to-end solutions," "robust platform," "seamless experience"
- **Idioms** — avoid idioms that may not translate across cultures (India + US audience)
- **Rhetorical questions as hooks** — do not open articles with "Have you ever wondered...?" or "What if you could...?"
- **Filler superlatives** — "very," "really," "truly," "incredibly," "amazingly" (remove or replace with a specific claim)

### Replacement Patterns
| Avoid | Use Instead |
|---|---|
| "Not just X, but Y" | State both things directly in separate sentences |
| Em dash (—) | Comma, colon, or sentence restructure |
| "Groundbreaking technology" | Name the specific capability |
| "Seamless integration" | "Integrates via REST API without front-end changes" |
| "In today's digital world..." | State the specific fact or trend |
| "Streamline your workflow" | "Reduce verification time from 30 minutes to 10 seconds" |
| "Holistic solution" | List the specific components |
| "Cutting-edge platform" | Name the specific standard or feature |

---

## Grammar & Mechanics

### Capitalization

**Headlines and Subheadings:** Title Case for H1 and H2. Sentence case for H3 and below.

**Product Names:**
- EveryCRED: Always capitalized as written
- Trust Credential, Trust Method, Trust Chain: Title case (product line names)
- W3C, NIST, DID, VC, ZKP, API, REST, QR, NFC: Always uppercase acronyms
- DigiLocker: Capital D and L (proper noun)
- Aadhaar: Capital A (proper noun)
- DPDP Act: All caps for DPDP, then "Act"

**Industry Terms:**
- verifiable credentials: lowercase (not a proper noun unless part of "W3C Verifiable Credentials Data Model")
- digital credentials: lowercase
- blockchain: lowercase
- decentralized identity: lowercase
- self-sovereign identity / SSI: lowercase expanded form; SSI uppercase acronym
- eIDAS 2.0: as written (e lowercase, IDAS uppercase)

### Numbers

- Spell out one through nine; use numerals for 10 and above
- Percentages: Always numerals — 85%, 10%
- Money: Always numerals — $95, $2.50, $10.22 million
- Large numbers: $233 billion (not $233,000,000,000); 51.3 crore (India context); 1.9 billion (global context)
- Lists and statistics: Always numerals for scannability
- Do not start a sentence with a numeral — rewrite to place the number mid-sentence

### Punctuation

**Oxford Comma:** Yes — use it. "Issuers, holders, and verifiers" not "Issuers, holders and verifiers."

**Em Dashes:** Banned entirely. See Banned Constructions above.

**Hyphens:** Use for compound modifiers before nouns — "blockchain-anchored credential," "API-first platform," "tamper-proof document." Do not hyphenate when the modifier follows the noun — "the credential is tamper proof."

**Colons:** Use to introduce a list or to expand a statement. Do not use a colon after a verb.

**Semicolons:** Use sparingly. Prefer two short sentences over one semicolon-joined sentence.

**Ellipses:** Avoid. If text needs ellipses, restructure it.

**Quotation Marks:** Straight double quotes for quotations. Single quotes for terms being introduced or defined.

### Abbreviations and Acronyms

- Spell out on first use with acronym in parentheses: "Verifiable Credentials (VCs)"
- Exceptions — use acronym immediately without spelling out: API, URL, QR, NFC, SEO, CTA, PDF, HR
- Common EveryCRED acronyms:
  - W3C: World Wide Web Consortium
  - VC / VCs: Verifiable Credential(s)
  - DID: Decentralized Identifier
  - ZKP: Zero-Knowledge Proof
  - NIST: National Institute of Standards and Technology
  - DPDP: Digital Personal Data Protection (Act, India)
  - eIDAS: Electronic Identification and Trust Services (EU)
  - CCTNS: Crime and Criminal Tracking Network and Systems
  - NAFIS: National Automated Fingerprint Identification System
  - NMC: National Medical Commission

---

## Sentence and Paragraph Structure

### Sentence Length
- **Target:** 12–18 words per sentence
- **Hard maximum:** 22 words — break anything longer into two sentences
- **Variety:** Mix short sentences (8–12 words) with standard sentences — do not write all sentences at the same length
- **Active voice:** 80%+ of all sentences

### Active vs. Passive Voice
- Active: "EveryCRED issues credentials in real time."
- Passive (avoid): "Credentials are issued by EveryCRED in real time."
- Exception: Passive is acceptable when the actor is unknown or irrelevant: "The credential was revoked immediately."

### Paragraph Length
- 2–3 sentences maximum per paragraph
- One idea per paragraph
- Never write a paragraph longer than 60 words
- Use white space — blank lines between paragraphs and before/after lists

---

## Heading Style (Newspaper Standard)

EveryCRED headings should follow the style of The Times of India and The New York Times: specific, informative, and written to make the reader want to continue. They should tell the reader what they will learn, not what the section is about in abstract terms.

### H1 Title Rules
- Must contain the primary keyword
- 60 characters or fewer for SERP display
- Specific and outcome-focused — not generic
- Include a year for time-sensitive articles

**Examples:**
- "Digital ID Cards for Police: Field Deployment Guide" (good)
- "Why Government Agencies Are Replacing Manual Verification in 2026" (good)
- "Verifiable Credentials and Government" (too vague)
- "The Ultimate Guide to Everything About Digital Identity" (too generic)

### H2 Subheading Rules
- Written to engage the reader and signal specific content
- Must be interesting enough to read standalone
- Include keyword variation where natural
- Not generic section labels ("Introduction," "Background," "Overview")

**Examples:**
- "Manual Verification Costs Government Agencies $25 Per Check" (specific, data-backed)
- "How Raigad Police Cut Verification Time by 97%" (outcome-specific, named)
- "Three Integration Points Most Agencies Miss During Deployment" (practical, specific number)
- "What the NIST SP 800-63-4 Update Means for Government Credentials" (timely, specific)

**Avoid:**
- "Benefits of Verifiable Credentials" (generic)
- "Our Solution" (promotional)
- "Overview" or "Background" or "Introduction" as H2 labels

---

## Formatting Standards

### Bold
- Use for: Key terms on first introduction, critical data points, important requirements
- Do not overuse — maximum 2–3 bold instances per section
- Do not bold full sentences

### Italics
- Use for: Regulatory document titles, publication names, terms being defined
- Example: *NIST Special Publication 800-63-4* or *W3C Verifiable Credentials Data Model 2.0*

### Bullet Points
Use bullet points **only when genuinely needed** — not as a default formatting choice.

**Use bullets when:**
- Listing 3 or more parallel items that would be awkward as prose
- Presenting steps in a process (use numbered list instead for sequential steps)
- Showing features, criteria, or specifications for comparison
- Creating a Key Takeaways or FAQ block

**Do not use bullets when:**
- There are only 2 items (write as prose: "X and Y")
- Items are best explained with connective logic (use prose with transition words)
- Consecutive sections both use bullets (alternate with prose for variety)

**Bullet formatting:**
- Sentence case for first word
- Period if the item is a complete sentence; no period if it is a phrase or fragment
- Parallel structure — all items must be grammatically consistent (all sentences, or all fragments)
- Maximum 6 items per list before considering H3 subsections instead

### Numbered Lists
- Use for sequential steps where order matters
- Same punctuation and capitalization rules as bullets
- Do not mix numbered and bulleted lists in the same section

### Tables
- Use for comparisons, pricing, or specification data (3+ columns, 3+ rows)
- Include clear column headers
- Keep cell content brief — one idea per cell

### Callout / Blockquote Blocks
- Use for Key Takeaways block (required per SEO guidelines)
- Use for important warnings or compliance notes
- Format: `> **Label:** Content`

---

## Internal Links (Style Rules)

### Anchor Text Requirements
- **Length:** 2–5 words
- **Natural:** Must fit the surrounding sentence without sounding inserted
- **Descriptive:** Tells the reader what they will find if they click
- **Short:** Never use the full article title as anchor text

**Good anchor text examples:**
- "law enforcement deployments" — links to police digital ID article
- "government grant verification" — links to grants article
- "credential revocation" — links to revocation/management feature page
- "decentralized identity" — links to an explainer article

**Bad anchor text examples:**
- "Digital Credential Software for Police and Law Enforcement Identity Programs" (full title — too long)
- "click here" (generic)
- "you can review this article" (conversational — banned)
- "read our blog post on" (meta-reference — banned)

### Link Placement
- Never in the first or last sentence of a paragraph (looks forced)
- Never more than 2 links in a single paragraph
- Never two links back-to-back
- Spread across different sections — not clustered in introduction or conclusion

---

## CTA Section (Before Conclusion)

The CTA section is a dedicated H2 section immediately before the conclusion. It is the only place where EveryCRED is addressed in first person ("we").

### CTA Rules
- 80–120 words
- Opens with a specific outcome or deployment result
- References a real EveryCRED capability or deployment
- Ends with a natural action prompt (book a demo, contact us, etc.)
- Must connect to the article's topic — not a generic "learn more about EveryCRED"
- No superlatives, no "leading platform," no "industry-best"

### CTA Template
```
[Specific metric or result from a real deployment]. [Explanation of how EveryCRED achieves this — specific feature or method]. [Who this applies to — audience-specific]. [Action prompt with internal link to demo/contact page].
```

**Example (Law Enforcement article):**
"We deployed digital officer credentials for Raigad Police, reducing field verification time from 30 minutes to under 10 seconds. The system integrates with CCTNS and NAFIS via REST API and operates offline for rural deployments. Law enforcement agencies can deploy through existing procurement contracts. [Book a demo] to see a live walkthrough."

---

## Images and Media

### Image Captions
- Optional — only include when the image needs context that is not in the surrounding text
- Sentence case, period at end if complete sentence

### Alt Text
- Describe what is shown, include primary keyword naturally if relevant
- Maximum 125 characters
- Do not start with "Image of" or "Photo of"
- Example: "EveryCRED police credential verification via QR scan in the field"

### Screenshots
- Crop to relevant portion only
- Add annotation arrows or highlights when directing attention to specific elements
- Alt text should describe the specific UI element shown

---

## Statistics and Data

### Citing Sources
- Format: "According to [Source Name], [statistic]." Link the source name.
- Include year of data: "In Q1 2025, synthetic document fraud grew..."
- Use the most recent available data — check publication date

### Presenting Numbers
- Round large numbers: "$10.2 million" not "$10,223,456"
- Use % symbol — never "percent"
- Use $ for USD; use Rs. or INR for Indian Rupee figures
- Commas for thousands: 10,000 not 10000
- Crore for Indian large numbers: 51.3 crore (not 513 million when writing for India audience)

### Approved EveryCRED Statistics
Always prefer these verified deployment statistics over generic industry data:
- "30 minutes to under 10 seconds" (Raigad Police verification time)
- "85% reduction in administrative overhead" (Raigad Police deployment)
- "36-week deployment timeline, pilot by week 20" (statewide rollout)
- "Under $0.10 per verification" (EveryCRED cost per check)
- "$15–$25 per manual check" (industry baseline for comparison)

---

## Competitor References

- **Do not cite, link to, or use examples from direct competitors** in article body: Dock/Truvera, Dhiway, MATTR, SpruceID, walt.id, Sphereon/4sure, Microsoft Entra Verified ID, IBM Digital Credentials, PingOne Neo, Blockcerts, Credly, Accredible
- **Do not use competitor case studies** as reference points — use EveryCRED's own deployments
- Indirect references are acceptable: "other credential platforms" or "legacy certificate systems" without naming
- Comparison articles (EveryCRED vs. Competitor) are a separate content type with different rules — see competitor-analysis.md

---

## Target Keywords

EveryCRED's 28 official target keywords are organized into six clusters in `context/target-keywords.md`. Reference that file when choosing a primary keyword for any new article. This section covers how to use those keywords within EveryCRED's style rules.

### Keyword Usage Rules

- Each article targets one primary keyword and 2–3 supporting keywords from the same cluster
- Every provided keyword must appear at least 4 times in the article — placed naturally, never forced
- Primary keyword must appear in the H1, first 100 words, meta title, meta description, and URL slug

### Confusingly Similar Keywords — Correct Usage

These keyword pairs are frequently confused. Use them as defined:

| Keyword | Correct Usage | Avoid |
|---------|--------------|-------|
| verifiable credentials | Formal W3C-standard credential format; use when discussing the technical standard or platform capability | Do not use interchangeably with "verified credentials" — they have different search intent |
| verified credentials | Use when writing about credentials that have been confirmed or authenticated; broader meaning than "verifiable credentials" | Do not use as a synonym for "W3C Verifiable Credentials Data Model" |
| digital credentials | Broadest term; use for general audience articles about any digital format replacing paper | Do not use to refer specifically to the W3C standard |
| digital certificate | Use specifically when contrasting with verifiable credentials — e.g., "A digital certificate is issued by a CA; a verifiable credential uses a DID" | Do not use as a synonym for "verifiable credential" |
| digital identity | Broad concept — the digital representation of a person or organization; use in thought leadership and definitional articles | Do not use to mean "digital ID card" (which is physical) |
| identity proofing software | Use specifically when discussing government onboarding and identity enrollment (not general verification) | Do not use as a synonym for "digital identity verification" |
| digital trust platform | Use when discussing the infrastructure layer that enables trust between issuers, holders, and verifiers | Do not use as a synonym for "digital credential platform" |
| blockchain credentials | Use when the blockchain-anchoring aspect is the focus — tamper-evidence, immutability, fraud prevention | Do not use in articles where the W3C standards angle is more relevant |
| digital id cards | Use specifically for physical or mobile card formats issued to individuals (police officers, employees, citizens) | Do not use as a synonym for "digital credentials" in the abstract |
| digital badges | Use specifically for the Open Badges standard or micro-credential context — training, professional development, education | Do not use as a synonym for "verifiable credentials" in a government/enterprise context |

### Keyword in Headings

When a target keyword must appear in an H2 subheading, it must still follow newspaper headline style — specific, informative, outcome-oriented. Do not write a heading that is just the keyword restated:

**Correct:**
- "How Digital Credential Platforms Cut Police Verification Time by 97%"
- "Why Government Agencies Are Moving to Blockchain Identity Solutions in 2026"

**Incorrect:**
- "Digital Credential Platforms" (just the keyword — not a heading)
- "About Blockchain Identity Solutions" (generic section label)

---

## Dates and Time

**Date Format:** Month DD, YYYY — May 11, 2026 (not 11 May 2026 or 11/05/2026)

**Year in Titles:** Include year for time-sensitive topics: "Government Credential Deployments in 2026"

**Time:** 12-hour format with a.m./p.m. — 3:00 p.m. EST (US content); 3:00 PM IST (India content)

---

## Editing Checklist

### Before Writing
- [ ] Reviewed existing everycred.com/blog for content overlap
- [ ] Identified distinct angle not covered by existing articles
- [ ] Selected internal link targets from existing blog and service pages

### Writing Phase
- [ ] No em dashes (—) used anywhere
- [ ] No "Not just X, but Y" or "We don't just X; we Y" constructions
- [ ] No flowery language, marketing-speak, idioms, or metaphors
- [ ] Active voice used for 80%+ of sentences
- [ ] Average sentence length 12–18 words
- [ ] Paragraphs are 2–3 sentences maximum
- [ ] Bullet points only used when genuinely needed (3+ items)
- [ ] "We" used only in the CTA section
- [ ] H1 and H2 headings follow newspaper headline style
- [ ] CTA section is capability-backed and references a real deployment

### Grammar and Mechanics
- [ ] Oxford comma used consistently
- [ ] Numbers formatted correctly (spell out 1–9, numerals for 10+)
- [ ] Acronyms spelled out on first use (except universally known)
- [ ] Product names capitalized correctly (EveryCRED, DigiLocker, etc.)
- [ ] Statistics include year and source

### Links
- [ ] Internal links spread across sections (not clustered)
- [ ] Anchor text is 2–5 words, natural, contextual
- [ ] No "click here" or "read more" anchor text
- [ ] Only 1 external link
- [ ] External link does not point to a competitor
- [ ] No 2 links in same paragraph

### Structure and SEO
- [ ] Key Takeaways block present after introduction
- [ ] FAQ section present with 3–5 natural prompt-language questions
- [ ] CTA section before conclusion uses "we"
- [ ] Primary keyword in first 100 words
- [ ] Meta title 50–60 characters
- [ ] Meta description 150–160 characters, answers query directly

---

*This style guide governs all EveryCRED content. Update when the writing workflow changes, new capabilities launch, or new audience segments are added.*
