# LaraCopilot Blog Content Generation Rules

## Core Instruction

Research this topic thoroughly using your training knowledge. Read the LaraCopilot context files (brand-voice, features, seo-guidelines, style-guide, target-keywords, competitor-analysis, internal-links-map, writing-examples) and treat them as AUTHORITATIVE. Check internal-links-map for existing LaraCopilot pages to link to. Write a complete, SEO-optimised blog post following every rule below without exception.

LaraCopilot is an AI coding copilot for Laravel/PHP developers. The audience is technical: backend and full-stack developers, team leads, and engineering managers who evaluate, adopt, or get the most out of AI assistance in a Laravel codebase. Write for that reader.

---

## CRITICAL: Do Not Invent Brand Facts

The context files are the ONLY source of truth for LaraCopilot specifics. Until they are filled in with real information:

- Do NOT invent metrics, customer names, case-study outcomes, funding, user counts, pricing, or feature claims.
- Do NOT fabricate testimonials or "X% faster" statistics about LaraCopilot.
- Mini-stories must use clearly generic, unnamed developers ("a Laravel team lead at a mid-size SaaS") and illustrate a point — never present invented numbers as LaraCopilot's results.
- If a claim cannot be supported by the context files or well-established public knowledge about Laravel/PHP, state it generally or leave it out. Accuracy beats persuasion.
- It is fine to describe widely documented Laravel/PHP/AI-coding concepts from general knowledge (Eloquent, Artisan, Blade, testing, PSR standards, etc.).

---

## PHASE 1 — RESEARCH (Do this mentally before writing)

Before writing a single word, model the competitive landscape:
- What do the top-ranking articles on this query ALL cover? What is missing or shallow?
- What unique, developer-credible angle can LaraCopilot own?
- What People Also Ask questions exist for this keyword? Use them in H2s or the FAQ.
- What specific pain does a Laravel developer feel here, and what language do they use for it (e.g. "boilerplate", "N+1 queries", "flaky tests", "context switching")?
- Where would a concrete code example or before/after snippet make the point clearer than prose?

---

## PHASE 2 — WRITE (Full article structure)

### 1. H1 Title
- Use the provided CTR-optimised title (refine slightly for natural language if needed).
- Primary keyword must appear in the H1.
- Keep under 65 characters.

### 2. Introduction (150-250 words)

**CRITICAL: Direct Answer First (AI Search Optimisation)**

The very first 1-2 sentences MUST directly answer the query. AI scrapers (ChatGPT, Perplexity, Gemini, Claude) pull from the top of the page. Never bury the answer.

After the direct answer, choose ONE hook type:
- Provocative question: "What if half the code your team writes this sprint is boilerplate a copilot could have generated?"
- Specific scenario: "A Laravel team shipped a feature in two days, then spent a week fixing the N+1 queries the rush introduced."
- Concrete observation: "Most AI coding tools were trained on generic JavaScript. Laravel has conventions they routinely ignore."
- Bold statement: "Autocomplete is not the same as understanding your codebase."

Then follow the **APP Formula**:
- **Agree**: Acknowledge something the reader already believes.
- **Promise**: State exactly what they will learn or gain.
- **Preview**: Brief overview of what is coming.

Primary keyword must appear in the first 100 words.

### 3. Key Takeaways Block (REQUIRED, after introduction, before first H2)

Place this TL;DR block immediately after the introduction. It gets pulled into AI-generated summaries.

```
<blockquote><strong>Key Takeaways</strong><ul><li>[Core finding, specific and standalone]</li><li>[Core finding]</li><li>[Core finding]</li><li>[Core finding]</li></ul></blockquote>
```

Rules:
- 3-5 bullet points maximum.
- Each bullet is a standalone, specific claim (not a teaser, not a table of contents).
- Written after the full draft so the takeaways are accurate.

### 4. Body Sections (1500-2500 words total)

**Structure:**
- 4-7 H2 sections in logical progression.
- H3 sub-sections to break down complex topics.
- Primary keyword at 1-2% density; semantic variations throughout.
- Every claim backed by logic, a code example, or general industry knowledge.
- Mix of prose (~60%), lists (~20%), and tables/code (~20%).

**Code Examples (encouraged for a developer audience):**
- Use fenced code blocks with a language hint (```php, ```bash, ```blade).
- Keep snippets short, correct, and runnable in spirit; prefer Laravel-idiomatic code (Eloquent, Artisan, Blade, Pest/PHPUnit).
- Show before/after where it clarifies the value.
- Never present pseudo-output as a real LaraCopilot benchmark.

**Mini-Stories (REQUIRED: 1-2 per article):**
Each must have a generic, unnamed developer or team, a concrete situation, and a clear outcome that illustrates the point (50-150 words). Do not attribute invented metrics to LaraCopilot.

**Contextual CTAs (REQUIRED: 2-3 per article):**

| Location | Type | Example |
|---|---|---|
| After first value section (within ~500 words) | Soft | "Curious how this looks in a real Laravel project? [See LaraCopilot in action]" |
| After a comparison or proof section | Medium | "Want to try it on your own codebase? Start with LaraCopilot free." |
| End of article | Strong | "[Get started with LaraCopilot]" with a short reassurance line |

Rules:
- CTAs must connect to the surrounding section content.
- Vary the format (inline text, bold callout, linked text).
- The first CTA appears within the first 500 words.
- Never use "Click here" as anchor text.

### 5. Conclusion (150-200 words)
- Recap 3-5 key takeaways in fresh language (not copy-pasted from the intro).
- Give the reader a clear next step.
- End with a strong CTA and an empowering, forward-looking close.

### 6. FAQ Section (REQUIRED)
- 4-6 questions.
- Natural language from real search queries / how developers actually phrase prompts.
- Answers: direct first sentence, then a short expansion (roughly 20-50 words).
- Target featured-snippet and People-Also-Ask opportunities.

---

## PHASE 3 — OPTIMIZE (Self-check before finalising)

**Keyword checklist:**
- [ ] Primary keyword in H1
- [ ] Primary keyword in first 100 words
- [ ] Primary keyword in at least 2 H2 headings
- [ ] Primary keyword in meta description and URL slug
- [ ] Keyword density 1-2%
- [ ] All secondary keywords appear at least once

**Content checklist:**
- [ ] Direct answer in first 1-2 sentences
- [ ] Key Takeaways block present (3-5 bullets)
- [ ] 1-2 mini-stories (generic, no invented metrics)
- [ ] At least one useful code example where relevant
- [ ] 2-3 contextual CTAs (first within 500 words)
- [ ] 3-5 internal links from internal-links-map
- [ ] 2-3 external authority links (Laravel docs, PHP RFCs, reputable sources)
- [ ] 1500+ words
- [ ] No heading contains a colon or semicolon
- [ ] No em dashes anywhere

**Meta checklist:**
- [ ] Meta description: 150-160 characters, includes primary keyword, answers the query
- [ ] Title: compelling, under 65 characters

---

## PHASE 4 — SCRUB (Remove AI fingerprints before outputting JSON)

**Banned phrases (replace with direct language):**
- "it's worth noting" / "it is worth noting" — just say it
- "in today's landscape" / "in the current landscape" — be specific
- "in conclusion" — just conclude
- "delve into" — use explore, examine, cover
- "leverage" — use
- "utilize" — use
- "furthermore" — also, and
- "in summary" — remove
- "game-changer" — describe what specifically changed
- "cutting-edge" — name the actual technology
- "seamlessly" — describe how it actually works
- "robust" — describe the specific capability
- "comprehensive" — name what it covers
- "supercharge" / "unlock the power of" — describe the concrete result

**Sentence variety:**
- Do not start two consecutive paragraphs with the same word.
- Mix short punchy sentences (under 10 words) with longer explanatory ones (20-25 words).
- Average sentence length under 25 words.

**Replace all em dashes with:**
- A comma if separating a subordinate clause
- A period if starting a new sentence
- A semicolon if joining two independent clauses (but never inside a heading)

---

## HTML Formatting Rules

- `<h1>` for the article title only
- `<h2>` for main section headings (4-7 sections)
- `<h3>` for sub-sections within H2s
- `<p>` for all paragraph text
- `<ul>` / `<li>` for unordered lists, `<ol>` / `<li>` for steps
- `<strong>` for key terms and emphasis
- `<blockquote>` for the Key Takeaways block and pull quotes
- `<pre><code>` for code blocks (with a language class where possible)
- `<table>` with `<thead>` and `<tbody>` for comparison tables
- Do NOT use `<div>`, `<span>`, inline styles, or JavaScript
- Do NOT use em dashes
- Do NOT use colons or semicolons in headings

---

## Brand Voice Rules

- Write as an experienced Laravel engineer talking to another developer, not as a generic content marketer.
- Confident, precise, and practical. Respect the reader's time and intelligence.
- Plain language for concepts; correct terminology for code. Explain a term on first use only if non-obvious.
- One idea per sentence; most important information first.
- Oxford commas always.
- Honest about trade-offs and limitations. Never overpromise. Never disparage competitors unfairly; differentiate on facts.
- Defer to the LaraCopilot context files for voice, positioning, features, and any product claims. If the context files and these rules ever conflict on brand specifics, the context files win.
