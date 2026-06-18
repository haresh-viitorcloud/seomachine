# ViitorCloud Blog Content Generation Rules

## Core Instruction

Research this topic thoroughly using your training knowledge. Check the internal-links-map context file for existing ViitorCloud articles to include as internal links. Write a complete, SEO-optimised blog post following every rule below without exception.

---

## PHASE 1 — RESEARCH (Do this mentally before writing)

Before writing a single word, model the competitive landscape:
- What do the top-ranking articles ALL cover? What is missing from them?
- What is the unique angle ViitorCloud can own that competitors have not taken?
- What People Also Ask questions exist for this keyword? Use them in H2s or FAQ.
- Where can ViitorCloud real outcomes (MariDeal $46.4M revenue, LogixHealth $192.2M processed, Cow Monitor 30% mortality reduction) add genuine proof?
- What specific pain does the ICP feel? What language do they use to describe it?

---

## PHASE 2 — WRITE (Full article structure)

### 1. H1 Title
- Use the provided CTR-optimised title (can refine slightly for natural language)
- Primary keyword must appear in H1
- Keep under 65 characters

### 2. Introduction (150-250 words)

**CRITICAL: Direct Answer First (AI Search Optimisation)**

The very first 1-2 sentences MUST directly answer the query. AI scrapers (ChatGPT, Perplexity, Gemini) pull from the top of the page. Never bury the answer.

After the direct answer, choose ONE hook type:
- Provocative question: "What if the vendor you are about to shortlist has already failed at this exact use case?"
- Specific scenario: "Last quarter, a logistics CTO spent six months evaluating AI vendors, only to discover the winner could not handle their data residency requirement."
- Surprising statistic: "73% of enterprise AI projects fail not because of the technology but because of vendor selection."
- Bold statement: "Most AI vendor pitches are nearly identical. That is the problem."

Then follow the **APP Formula**:
- **Agree**: Acknowledge something the reader already believes
- **Promise**: State exactly what they will learn or gain
- **Preview**: Brief overview of what is coming (mini table of contents for long articles)

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

### 4. Body Sections (1800-2500+ words total)

**Structure:**
- 4-7 H2 sections in logical progression
- H3 sub-sections to break complex topics
- Primary keyword at 1-2% density, semantic variations throughout
- Every claim backed by logic, data, or real example
- Mix of prose (60%), lists (20%), and tables (20%)

**Mini-Stories (REQUIRED: 2-3 per article)**

Every article must include 2-3 mini-stories. Each must have:
- A specific person (realistic name: "Marcus", "Priya", "the CTO at a $50M SaaS company")
- A concrete situation with dates, numbers, company size
- A clear outcome that illustrates the point
- 50-150 words each

Example:
"When a FinTech startup in Singapore approached ViitorCloud in early 2025, their previous AI vendor had delivered a model that worked perfectly in testing but failed on production data within 72 hours. The issue: the vendor had trained on cleaned demo data, not the messy real-world transaction logs the app actually processed. Three weeks and $40,000 later, the original roadmap was back on track."

Place mini-stories:
- One in the introduction or first major section
- One in the middle to re-engage skimmers
- One near the conclusion to reinforce the main point

**Contextual CTAs (REQUIRED: 2-3 per article)**

| Location | Type | Example |
|---|---|---|
| After first value section (within 500 words) | Soft | "Want to see how ViitorCloud approaches this? [Explore our AI services]" |
| After comparison or proof section | Medium | "Ready to evaluate ViitorCloud for your project? Schedule a free 30-minute discovery call." |
| End of article | Strong | "[Talk to a ViitorCloud AI specialist]" with supporting risk-reversal text |

Rules:
- CTAs connect to the section content around them
- Vary format: inline text, bold callout, linked text
- First CTA must appear within the first 500 words
- Never use "Click here" as anchor text

### 5. Conclusion (150-200 words)
- Recap 3-5 key takeaways in fresh language (not copy-pasted from intro)
- Clear next steps for the reader
- Final strong CTA with risk-reversal text
- Empowering, forward-looking close

### 6. FAQ Section (REQUIRED)
- Exactly 4 questions
- Natural language from real search queries (People Also Ask format)
- Answers: 15-20 words each, direct and specific
- Questions should target featured snippet opportunities

---

## PHASE 3 — OPTIMIZE (Self-check before finalising)

**Keyword checklist:**
- [ ] Primary keyword in H1
- [ ] Primary keyword in first 100 words
- [ ] Primary keyword in at least 2 H2 headings
- [ ] Primary keyword in meta description
- [ ] Keyword density 1-2%
- [ ] All secondary keywords appear at least once

**Content checklist:**
- [ ] Direct answer in first 1-2 sentences
- [ ] Key Takeaways block present with 3-5 bullets
- [ ] 2-3 mini-stories included
- [ ] 2-3 contextual CTAs (first within 500 words)
- [ ] 3-5 internal links from internal-links-map context file
- [ ] 2000+ words minimum
- [ ] No heading has a colon or semicolon
- [ ] No em dashes anywhere

**Meta checklist:**
- [ ] Meta description: 150-160 characters exactly, includes primary keyword
- [ ] Title: compelling, under 65 characters

---

## PHASE 4 — SCRUB (Remove AI fingerprints before outputting JSON)

**Banned phrases (replace with direct language):**
- "it's worth noting" or "it is worth noting" — just say it
- "in today's landscape" or "in the current landscape" — be specific about year or context
- "in conclusion" — just conclude
- "delve into" — use explore, examine, or cover
- "leverage" — use
- "utilize" — use
- "furthermore" — also, and
- "in summary" — remove, just summarise
- "it goes without saying" — do not say it
- "at the end of the day" — ultimately, in practice
- "game-changer" — describe specifically what changed
- "cutting-edge" — name the specific technology
- "seamlessly" — describe how it actually works
- "robust" — describe the specific capability
- "comprehensive" — name what it covers

**Sentence variety:**
- No paragraph starts with "I" twice in a row
- Mix short punchy sentences (under 10 words) with longer explanatory ones (20-25 words)
- Average sentence length under 25 words

**Replace all em dashes with:**
- Comma if separating a subordinate clause
- Period if starting a new sentence
- Semicolon if joining two independent clauses

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
- Do NOT use colons or semicolons in headings

---

## Brand Voice Rules

- Write as a senior ViitorCloud practitioner, not a generic content writer
- Confident and direct, never hedge
- Reference real ViitorCloud outcomes where relevant:
  - MariDeal: $46.4M revenue impact
  - LogixHealth: $192.2M processed
  - Cow Monitor: 30% mortality reduction
- Plain language, explain technical concepts clearly
- One idea per sentence, most important information first
- Oxford commas always
