# LaraCopilot Style Guide

Writing conventions and formatting standards for all LaraCopilot content. The reader is a Laravel/PHP developer or technical founder.

## Product & Ecosystem Naming (capitalize exactly)
- **LaraCopilot** — one word, capital L and C. Never "Laracopilot", "Lara Copilot", or "LaraCoPilot".
- **Orivon** — the autonomous AI agent.
- **Laravel**, **PHP**, **Eloquent**, **Artisan**, **Blade**, **Livewire**, **Inertia**, **Sanctum**, **Nova**, **Filament** — capitalized as shown.
- Hosting/tools: **Laravel Cloud**, **Laravel Forge**, **Ploi**, **GitHub**, **GitLab**, **Bitbucket**, **Telegram**, **Stripe**, **Supabase**.
- Testing: **Pest**, **PHPUnit**. Standards: **SOLID**, **PSR**.
- Competitors as branded: **Lovable**, **Bolt.new**, **v0**, **Replit**, **Cursor**, **GitHub Copilot**, **Tabnine**, **Claude Code**, **Django**.

## Grammar & Mechanics
- **Headings**: sentence case. No colons or semicolons in any heading.
- **Oxford comma**: always (A, B, and C).
- **Em dashes**: do not use. Replace with a comma, a period, or (in body text only) a semicolon.
- **Numbers**: spell out one through nine; numerals for 10+. Always numerals for versions, prices, percentages, credits, and stats ($29, 150 credits, Laravel 11, 20%).
- **Quotes**: straight quotes.
- **Voice**: active, present tense, second person ("you") for the reader.

## Code Formatting
- Use fenced blocks with a language hint: ```php, ```bash, ```blade, ```json.
- Inline code for class names, methods, commands, files, and config keys: `User`, `php artisan make:model`, `routes/web.php`, `Eloquent`.
- Keep snippets short, correct, and idiomatic Laravel. Prefer real examples over pseudocode.
- Show before/after when illustrating refactors or improvements.
- Never present fabricated output or fake benchmarks as real.

## Word Choice

**Say this → not that**
- "generate" / "build" → "auto-magically create"
- "production-ready code" → "boilerplate"
- "AI app builder" / "AI coding assistant" → "no-code tool" (LaraCopilot produces real, ownable code)
- "Laravel developer" → "Laravel coder"
- "deploy" → "ship to prod" (fine casually, but "deploy" in formal copy)

**Avoid (AI-tell / hype)**: seamlessly, robust, comprehensive, cutting-edge, game-changer, supercharge, unlock, leverage, utilize, delve, "in today's landscape", "it's worth noting", "in conclusion".

## Formatting Standards
- **Bold** for key terms and takeaways; do not over-bold.
- **Lists**: bullets for non-sequential items, numbered for steps. Parallel structure. Capitalize the first word.
- **Tables**: use for comparisons (tools, plans, features). Always include clear headers.
- **Links**: descriptive, keyword-rich anchors (2-5 words). Never "click here" or "read more".
- **Paragraphs**: 2-4 sentences; one idea each.

## Claims & Accuracy
- Only state product facts found in features.md / on laracopilot.com.
- Do not invent metrics, customer counts, testimonials, pricing, or release dates.
- For competitor facts that change (pricing, features), attribute and date them ("as of 2026…") and prefer linking the source.
- Laravel version support is 9, 10, 11, and 12 — keep version references current.

## Voice & Tone Reminders
1. Senior Laravel engineer talking to a peer.
2. Confident, precise, honest about trade-offs.
3. Outcome first, then the code that proves it.
4. Specific over generic, always.

## Quick Editing Checklist
- [ ] "LaraCopilot" and all ecosystem names capitalized correctly
- [ ] Sentence-case headings, no colons/semicolons
- [ ] No em dashes, no banned hype words
- [ ] Code blocks fenced with language; inline code for identifiers
- [ ] Descriptive link anchors
- [ ] All product claims verifiable; competitor claims dated/sourced
