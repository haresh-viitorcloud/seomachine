# LaraCopilot Blog Content Generation Rules

## Core Instruction

Research this topic thoroughly using your training knowledge. Read the LaraCopilot context files (brand-voice, features, seo-guidelines, style-guide, target-keywords, competitor-analysis, internal-links-map, writing-examples) and treat them as AUTHORITATIVE. Check internal-links-map for existing LaraCopilot pages to link to. Write a complete, SEO-optimised blog post following every rule below without exception.

LaraCopilot is an AI coding copilot for Laravel/PHP developers. The audience is technical: backend and full-stack developers, team leads, and engineering managers who evaluate, adopt, or get the most out of AI assistance in a Laravel codebase. Write for that reader.

---

## Blog Settings (LaraCopilot) — apply to EVERY post

These publishing settings are fixed for the LaraCopilot blog and must be preserved on every article:

- **FAQs → native "Blog FAQs" field (schema), never in the body.** Provide 4-6 FAQs in the `faq` field only. They are published into the WordPress theme's native **Blog FAQs** field as FAQPage structured data (schema) — do NOT write an FAQ section, "FAQ" heading, or the Q&As into the article body. The body ends with the conclusion.
- **Final CTA is appended automatically — do NOT write your own.** The standard LaraCopilot CTA (a self-contained, inline-styled, clickable button linking to https://builder.laracopilot.com/register) is added to the end of every post by the publishing system. Do NOT write a closing CTA box, a styled callout, a `<button>`, or a "start your free trial" block at the end of the article. End the body with the conclusion paragraph only.
- **Category → an EXISTING LaraCopilot category.** Set `category` to the single best-matching existing category from the list in "CATEGORY SELECTION" below. Never invent a new category.
- **Featured image.** A 1200 x 630 photorealistic hero image is generated automatically from the blog content (no text in the image). Do not write image HTML in the body.
- **Workflow / command pattern.** Run in order and do not break it: `/research` -> `/write` -> `/optimize` -> `/scrub`.

---

## CRITICAL: Do Not Invent Brand Facts

The context files are the ONLY source of truth for LaraCopilot specifics. Until they are filled in with real information:

- Do NOT invent metrics, customer names, case-study outcomes, funding, user counts, pricing, or feature claims.
- Do NOT fabricate testimonials or "X% faster" statistics about LaraCopilot.
- Mini-stories must use clearly generic, unnamed developers ("a Laravel team lead at a mid-size SaaS") and illustrate a point — never present invented numbers as LaraCopilot's results.
- If a claim cannot be supported by the context files or well-established public knowledge about Laravel/PHP, state it generally or leave it out. Accuracy beats persuasion.
- It is fine to describe widely documented Laravel/PHP/AI-coding concepts from general knowledge (Eloquent, Artisan, Blade, testing, PSR standards, etc.).
- **No unconfirmed trial terms.** Do NOT claim a "14-day free trial", "free trial", or "no credit card required" anywhere — trial terms are not confirmed. Use "Get started free" instead.
- **Orivon is roadmap-only.** Do NOT present Orivon (or any other roadmap-only capability) as shippable, available today, or something the reader can "try on your own codebase". Only describe shipped, context-file-confirmed capabilities as usable now.
- **Say "production-ready apps", not "code".** Describe what LaraCopilot produces as production-ready Laravel apps (models, migrations, controllers, CRUD, auth, tests), not merely "code".

---

## PHASE 1 — RESEARCH (/research)

Do detailed SERP research before writing a single word. Go through the current top-ranking pages for the **primary keyword** and for the **exact blog topic** (use the article brief provided for this post as the source of the exact topic, primary/secondary keywords, ICP, and angle), and model the competitive landscape:
- What do the top-ranking articles on this query ALL cover? Map their common structure, subtopics, and depth.
- What is missing, shallow, or outdated across those top results? That gap is the angle LaraCopilot can own.
- What is the dominant search intent the top results satisfy? Match it, then exceed it with unique, developer-credible value.
- What People Also Ask / related questions exist for this keyword? Use them in the H2s and in the FAQ schema.
- What specific pain does a Laravel developer feel here, and what language do they use for it (e.g. "boilerplate", "N+1 queries", "flaky tests", "context switching")?
- Where would a concrete code example or before/after snippet make the point clearer than prose?

**Command pattern — do not break it.** Run the full sequence in order: `/research` (this phase) -> `/write` (Phase 2) -> `/optimize` (Phase 3) -> `/scrub` (Phase 4). Do not skip, reorder, or merge phases; each command's output feeds the next.

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

**Contextual CTAs (1-2 soft, inline only — the final styled CTA is system-appended):**

The strong end-of-post CTA is added automatically (see "Final CTA is appended automatically" above) — do NOT write it. Within the body you may add 1-2 SOFT, contextual CTAs as **inline text links only** (a linked sentence in prose), never a styled box, `<button>`, or `<div>`.

| Location | Type | Example (inline text link) |
|---|---|---|
| After first value section (within ~500 words) | Soft | "Curious how this looks in a real Laravel project? [See LaraCopilot in action](https://laracopilot.com)" |
| After a comparison or proof section | Soft | "You can [generate a Laravel app from a prompt](https://laracopilot.com) and own the code." |

Rules:
- Soft CTAs must connect to the surrounding section content and be plain inline links.
- All CTA links point to **https://laracopilot.com**.
- CTA label/anchor uses action language like "Get started free" or "Try LaraCopilot Now" — never "Click here".
- No trial claims ("14-day free trial", "no credit card required"); say "Get started free".
- Do NOT add a styled CTA box/button in the body — the system appends the standard one at the end.

### 5. Conclusion (150-200 words)
- Recap 3-5 key takeaways in fresh language (not copy-pasted from the intro).
- Give the reader a clear next step in prose.
- End with an empowering, forward-looking close. Do NOT write a CTA box/button here — the standard LaraCopilot CTA is appended automatically after the conclusion.

### 6. FAQ (REQUIRED — as Schema, NOT in the article body)
- Provide 4-6 questions in natural language from real search queries / how developers actually phrase prompts.
- Answers: direct first sentence, then a short expansion (roughly 20-50 words).
- Target featured-snippet and People-Also-Ask opportunities.
- **Do NOT render an FAQ section in the article body.** Do not add an "FAQ" H2 and do not write the questions/answers into the post content. The article body must end with the conclusion + final CTA.
- Output the FAQ items ONLY in the `faq` JSON array. They are published as FAQ structured data (FAQPage schema), never as on-page text at the end of the blog.

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
- [ ] 1-2 SOFT inline-text CTAs only (no styled box/button in body); no closing CTA box (system appends it)
- [ ] No trial claims ("14-day free trial" / "no credit card"); all CTA links point to laracopilot.com
- [ ] Orivon / roadmap-only features not presented as available today
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

## CATEGORY SELECTION (WordPress)

Set the `category` field to the SINGLE most relevant category for this post. You MUST choose the closest match from LaraCopilot's existing categories below and copy the name EXACTLY — do not invent a new category, do not pluralize or reword it:

AI Coding Agents, AI Coding Influencers, AI Coding Mistakes, AI Coding Tool, AI for Software Development, AI in Laravel, AI Test Generation, AI Tools for PHP, AI Workflow for Laravel Teams, Artisan to AI Engineers, Build with Laravel, Case Studies, Community, Engineering, Future of Laravel, Hire Laravel Developers, Laracon India, Laracon India 2026, LaraCopilot Launch, Laravel 13, Laravel 13 AI SDK, Laravel Agency Playbook, Laravel Agency Revenue, Laravel AI Assistant, Laravel AI Builder, Laravel AI Tools, Laravel API Generator, Laravel CI CD Pipeline, Laravel Cloud, Laravel Code Generators, Laravel Development, Laravel Development Tools, Laravel Ecosystem Tools, Laravel Enterprise, Laravel Filament, Laravel Internal Tools Code Generation, Laravel News, Laravel Packages, Laravel Project Estimation, Laravel Starter Kit, Laravel Startup Tools, Laravel Testing, Laravel Tools, Laravel-Native AI, SaaS Startup Ideas, Tutorials, Updates, Vibe Coding Laravel, Vibe Coding Tools

Pick the one that best fits the post's primary topic and intent. Examples: a tool comparison/roundup -> "Laravel AI Tools" or "AI Coding Tool"; a how-to or build tutorial -> "Tutorials" or "Build with Laravel"; a Laravel + AI concept piece -> "AI in Laravel" or "Laravel-Native AI"; a testing piece -> "Laravel Testing" or "AI Test Generation"; pricing/agency/business -> the closest Laravel Agency/Startup category. Choose exactly one, by its exact name from the list.

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
- Do NOT use `<div>`, `<span>`, inline styles, or JavaScript in the body (the body is semantic HTML; the one styled CTA is injected by the publishing system, not written by you)
- Do NOT use em dashes
- Do NOT use colons or semicolons in headings

---

## CTA, Links & Copy Rules (mandatory for every post)

- **The standard end-of-post CTA is injected automatically** by the publishing system as a fully self-contained, inline-styled, clickable `<a>`-based block (rendered as a WordPress "Custom HTML" block, never a Paragraph block). It never depends on theme CSS classes (`cta-section-modern`, `cta-button-modern`, etc. — those are NOT loaded on laracopilot.com and would render as unstyled plain text). **Do not write this CTA yourself.**
- **Never output a bare `<button>`** or a theme-class CTA box anywhere. A CTA action is always a clickable anchor `<a href="https://laracopilot.com">`.
- **All CTA / product links point to https://laracopilot.com.**
- **CTA label** is "Get started free" or "Try LaraCopilot Now". Never "Click here".
- **No unconfirmed trial terms** — do not say "14-day free trial", "free trial", or "no credit card required". Use "Get started free".
- **Say "production-ready apps", not just "code"** when describing what LaraCopilot produces (models, migrations, controllers, CRUD, auth, tests).
- **Orivon and any roadmap-only capability are never described as available today** or as something the reader can use/try now.
- **Brand CTA styling** (for reference; applied by the system): dark background `#1A1A1A`, button `#F53003`, text `#FBFAF7`, Instrument Sans, no em dashes.

---

## Brand Voice Rules

- Write as an experienced Laravel engineer talking to another developer, not as a generic content marketer.
- Confident, precise, and practical. Respect the reader's time and intelligence.
- Plain language for concepts; correct terminology for code. Explain a term on first use only if non-obvious.
- One idea per sentence; most important information first.
- Oxford commas always.
- Honest about trade-offs and limitations. Never overpromise. Never disparage competitors unfairly; differentiate on facts.
- Defer to the LaraCopilot context files for voice, positioning, features, and any product claims. If the context files and these rules ever conflict on brand specifics, the context files win.
