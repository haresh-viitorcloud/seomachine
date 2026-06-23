# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack web app that reads a blog calendar spreadsheet, generates complete blog posts using Claude AI, and auto-saves them as WordPress drafts. Supports multiple blogs, a job queue with live socket updates, and both CLI and API-key Claude modes.

## Commands

```bash
bash start.sh              # First-run setup + start (installs deps, Playwright, checks port)
bash start.sh --dev        # Dev mode with auto-reload
bash start.sh --bg         # Run in background via PM2
npm start                  # Start server directly (assumes deps installed)
node --watch src/server.js # Dev mode directly
```

No test suite or linter is configured. Server listens on `APP_PORT` (default 4000). `start.sh` first-run also creates `.env` from `.env.example` and installs Playwright Chromium.

**Claude CLI auth prerequisite**: generation defaults to the Claude CLI, which needs a one-time `claude login` (install via `npm install -g @anthropic-ai/claude-code`). If the CLI isn't authenticated, set `ANTHROPIC_API_KEY` in `.env` to fall back to the SDK. The `/claude-setup` page shows live CLI connection status.

## Architecture

**Backend**: Node.js + Express + Socket.io  
**Database**: SQLite via `better-sqlite3` (synchronous API) — `data/app.db`  
**AI**: Claude CLI (primary, uses user's oauth session) or Anthropic SDK (fallback if `ANTHROPIC_API_KEY` set)  
**WP Automation**: REST API with Application Password (primary) or Playwright browser automation (fallback)  
**Frontend**: Vanilla JS + Bootstrap 5 CDN, served as static HTML from `public/`

## Key Entry Points

- `src/server.js` — Express app, Helmet CSP, Socket.io init, `seedAdminUser()` and `seedBlogConfigsFromEnv()` on startup, `resetStaleJobs()` on startup
- `src/config/database.js` — SQLite init, all table creation and schema migrations
- `src/services/schedulerService.js` — cron worker + `processJob()` pipeline, `_drainMode` flag
- `src/services/queueService.js` — all DB mutations for jobs/logs/queue state, socket emits, feedback
- `src/services/claudeService.js` — 2-call outline+article pipeline, prompt construction, CLI/SDK generation
- `src/services/wordpressService.js` — REST API posting + Playwright browser fallback, `htmlToGutenbergBlocks()`
- `src/services/imageService.js` — WebP featured images (1200×630; AI paths ~100–150KB at q85, the Pexels/Unsplash/SVG paths re-encode under 100KB) via Hugging Face → Pollinations → Pexels API → Unsplash API → SVG gradient fallback; the source actually used is recorded in `jobs.image_source`
- `src/services/seoScoreService.js` — heuristic Rank Math-style SEO score (0–100) computed from a job's persisted fields; surfaced by `dashboardRoutes`

## Request Flow

**Upload → Queue → Generate → Post**

1. `POST /api/upload/parse` — parses xlsx, stores row data in session
2. `POST /api/upload/check-duplicates` — checks row titles against existing jobs (case-insensitive); returns matches so the UI can show per-row Replace/Skip/Keep actions
3. `POST /api/upload/confirm` — creates jobs in DB; accepts `duplicateActions`, `additionalInstructions`, `startMode` (`auto`/`manual`); if auto-start kicks off `processNext()`
4. `schedulerService.runWorker()` — cron fires every minute, picks up only `getDueJobs()` (never auto-drains); chains to next job only if `_drainMode === true`
5. `processJob(job)` — if `generated_content` already exists, skips generation and goes straight to posting
6. `claudeService.generateBlogContent()` — **2-call pipeline**: Call 1 builds a research outline (unique angle, H2 sections with per-section link assignments, FAQ); Call 2 writes the full article using the outline as blueprint
7. `wordpressService.postDraft()` — REST API first (if `wp_app_password` set), else Playwright browser; uses `wp.blocks.parse()` to load content as native Gutenberg blocks
8. Status flow: `pending → generating → posting → drafted | error`

## Critical Non-Obvious Behaviours

**`_drainMode` controls auto/manual**: `_drainMode` is `false` by default. The cron worker (`runWorker`) only picks up `getDueJobs()` and never chains to the next job. Setting `_drainMode = true` (done by `processNext()` and `processJobById()`) enables auto-chaining after each job completes. This is how "Auto" vs "Manual" mode works — `_drainMode` is never set by the cron path.

**2-call generation pipeline**: Call 1 returns a JSON outline with `h2_sections[]` each containing an optional `internal_link` and `external_link` assignment. Call 2 receives this outline and places each link inline within its designated section. This prevents link clustering. If Call 1 fails, generation falls back to single-call.

**Gutenberg content insertion**: In the browser path, `htmlToGutenbergBlocks()` converts HTML to native block markup (`<!-- wp:paragraph -->` etc.). The browser `page.evaluate` then calls `wp.blocks.parse(blockMarkup)` (not `rawHandler`) to load it. `rawHandler` is only used as a fallback with the original raw HTML; `core/freeform` is the last resort. Using `rawHandler` with pre-built block markup causes the "Block contains unexpected or invalid content" error.

**Editor readiness/title via `wp.data`, not DOM**: Newer WordPress renders the block editor inside an iframe (`editor-canvas`), so top-level DOM selectors (`.editor-post-title__input`, `#title`) never match. Posting detects editor readiness via `window.wp.data.select('core/editor').getCurrentPostId()` and sets the title via `wp.data.dispatch('core/editor').editPost({title})` — both iframe-independent. DOM typing is only a fallback for older/non-iframed sites. Reverting to DOM-selector waits reintroduces the false "WordPress editor did not initialize" error.

**Per-blog CTA opt-out**: `config/cta-config.json` has a top-level `"disabled": [slug,...]` list. `ctaService.isCtaEnabled(slug)` gates `injectCtas()` in `wordpressService.js`; disabled blogs get NO `cta-section-modern` banner (so they don't inherit another brand's default banner image/branding) and rely on the inline CTA in the generated article. EveryCRED and EveryTicket are disabled.

**Auto-resume on Claude usage limit**: When generation fails on a usage/token limit, `schedulerService` reschedules the job to `pending` with `scheduled_at = reset time` (no retry burned) instead of erroring; the cron worker then resumes it automatically once due. `claudeService.detectUsageLimit(err)` decides this by matching limit phrases AND cross-checking live `getClaudeUsage()` (a window ≥99% utilized counts as limited even when the CLI only says "exited with code 1"). Falls back to `LIMIT_RESUME_FALLBACK_MIN` minutes (default 30) when no reset time is available.

**Stale job recovery**: On startup `resetStaleJobs()` marks any `generating`/`posting` jobs as `error` to prevent orphaned Claude CLI processes from being re-spawned. Users must manually restart these.

**`processJobById()` blocks on drafted**: If `status === 'drafted'`, it throws immediately with a clear message. Guards against the Start button accidentally re-running a completed job.

**process-now is non-blocking**: `POST /api/jobs/:id/process-now` responds in ~15ms then runs the job via `setImmediate`. Socket events update the UI in real-time.

**Claude CLI uses stdin pipe**: The full prompt is written to `/tmp/ct-prompt-*.txt` and fed as `stdio[0]` to avoid Linux `ARG_MAX` (E2BIG) limit. Cost is extracted from `total_cost_usd` (not `cost_usd`) in the JSONL output.

**`emitEvent()` is the exported socket wrapper**: Internal `emit()` in `queueService.js` is not exported. External callers (schedulerService, dashboardRoutes) must use the exported `emitEvent(event, data)` wrapper.

**WordPress duplicate detection**: Before creating a post, searches WP by slug and title (normalises HTML entities, checks `draft`/`publish`/`any` status). If found, updates the existing post instead of creating a new one.

**WP taxonomy REST bases discovered at runtime**: `setPostMetaViaBrowser()` calls `/wp-json/wp/v2/taxonomies` to get actual REST bases for `post_tag` and `industry` before resolving/creating terms.

**Socket.io client is self-hosted**: All pages use `/socket.io/socket.io.js` (not CDN) to satisfy the `'self'` CSP directive.

**CSP `scriptSrcAttr: 'unsafe-inline'`**: Required for `onclick=` handlers across all HTML pages. Do not remove.

**Test mode**: Stored in `queue_state.test_mode`. Returns mock HTML instantly with no API call. Toggle via `POST /api/queue/test-mode`.

**SEO score is a heuristic preview, not Rank Math**: `seoScoreService.scoreContent()` mirrors the Phase 3 "Rank Math 80–100" checklist but scores ONLY what is persisted on a job (title, seo_title, content HTML, meta, primary/secondary keywords, tags) — it never calls Rank Math. `dashboardRoutes` attaches it to the job-detail response (full `checks[]`) and to the jobs list (compact `{score, grade, color}`), so the admin sees predicted SEO quality before posting.

**Password is env-only**: `seedAdminUser()` overwrites the DB hash from `.env` on every restart. Edit `ADMIN_PASSWORD` in `.env` and restart to change it.

## Multi-Blog System

Blogs configured via `.env` with `BLOG_{SLUG}_*` prefix. `seedBlogConfigsFromEnv()` syncs all credentials to DB on every restart — `.env` is always the source of truth. A blog is detected purely by the presence of `BLOG_{SLUG}_NAME`; WP fields may be left blank, in which case the blog can be selected and generated for but not posted.

Conventions (not enforced by code, follow them anyway):
- Per-domain blog content lives at the **seomachine repo root** (one level up from `app/`): `../blogs/{slug}/context/` and `../rules/{slug}_blog_generation.md`. The repo root also has the default `context/` folder, which the seomachine engine uses as a **fallback** when a blog has no per-domain folder. `CONTEXT_PATH` points at `../blogs/{slug}/context`.
- Each blog's rules are tuned to its own `context/seo-guidelines.md` + `style-guide.md`, so they intentionally differ (word count, FAQ count, sentence length, voice) — do not unify them.

To add a blog: add `BLOG_{SLUG}_*` vars to `app/.env` + create `../blogs/{slug}/context/` + `../rules/{slug}_blog_generation.md` (at the seomachine root) → restart.

`POST /api/configs/:id/test` (`wordpressService.testConnection`) only checks that `/wp-json/wp/v2/` is reachable — it does **not** validate the login. To verify credentials for the browser method, do a real `wp-login.php` check.

## Database Schema

```
users               — admin login (password_hash synced from .env on restart)
blog_configs        — one row per blog, synced from .env
uploads             — one row per spreadsheet upload; holds additional_instructions (batch-level)
jobs                — one row per spreadsheet row; holds generated content (title/seo_title/
                      slug/meta/faq/ctas/image_alt), WP post ID, cost_usd, tokens_in/out,
                      image_source, additional_instructions (job-level)
activity_logs       — timestamped log entries per job (shown in timeline UI)
queue_state         — single row: is_paused, test_mode, claude_model, claude_effort
generation_feedback — editor ratings/notes per job; fed back into future generation prompts
```

Schema migrations run via an array of `ALTER TABLE` statements in `database.js`. New columns are added by appending to that array — the migrations run at startup and ignore already-applied changes via `try/catch`.

## Pages & Routes

| Page | Route | Purpose |
|---|---|---|
| Login | `/` | Guest only |
| Dashboard | `/dashboard` | Pipeline cards, stats, queue controls, Test Mode toggle, model/effort selector |
| All Jobs | `/jobs` | Table view grouped by upload, inline log timeline, bulk actions, blog filter |
| Upload | `/upload` | 4-step flow: (1) Select Blog → (2) Upload File → (3) Review & Select → (4) Queued; duplicate detection, per-row actions, additional instructions, auto/manual toggle |
| Blog Settings | `/settings` | Blog config CRUD (`configRoutes.js`) |
| Claude Setup | `/claude-setup` | CLI connection status, usage limits, model/effort selection |
| Flow 3D | `/flow-3d` | Interactive 3D pipeline visualization (informational only) — **public, served before `authRoutes`, no auth** |
| Pitch Demo | `/pitch-demo` | Animated end-to-end pipeline demo (informational only; `requireAuth`) |

API routes are in `src/routes/`. All protected routes use `requireAuth` middleware. Socket events emitted: `job:created`, `job:updated`, `job:deleted`, `log:new`, `stats:update`, `queue:state`, `batch:complete`.

**Domain/blog filter**: `/api/jobs`, `/api/dashboard`, and `/api/analytics` accept an optional `?blog=<id>` that scopes counts/jobs/analytics server-side (via `blogId` params on `getAllJobs`/`getJobStats`/`getAnalytics`). Dashboard and Jobs share one persisted selection under `localStorage['ct-blog-filter']`, so it survives refresh and carries between the two pages; each page has a Reset control and auto-clears a stored id that no longer exists. The Dashboard's `job:updated` socket handler ignores jobs whose `blog_id` doesn't match the active filter.

**Upload blog selection is Step 1**: The upload page always shows the blog selection step first (visual cards). The active `localStorage['ct-blog-filter']` pre-highlights the matching card but does NOT auto-advance — the user must explicitly click a card to proceed. This prevents jobs from being silently assigned to the wrong blog. The hidden `<select id="blogSelect">` is kept in sync and used by `parseFile()` downstream.

## Shared Frontend Utilities

`public/assets/js/common.js` — `API` (fetch wrapper), `escHtml`, `fmtTime`, `showToast`, `formatDate`, `formatDateShort`. All pages include this before their inline scripts. Do not define these functions inline in HTML pages.

## Content Generation Prompt Structure

**System prompt**: writing identity + brand context (markdown files from `context_path`) + generation rules file + 4-phase instruction (Research / Write / Optimize / Scrub).

**`buildSystemContent` is blog-agnostic**: the prompt is built from the blog's own config + context + rules — NOT hardcoded to any brand. The brand name comes from `brandFromBlog(blog)` (the blog config is threaded through `generateBlogContent`), and word count, FAQ count, voice, proof points, and formatting are declared AUTHORITATIVE from each blog's context/rules (which win over any generic default). Do not reintroduce hardcoded brand names, case studies, or fixed word/FAQ counts here — that contaminates the other blogs.

**Call 1 — Outline** (`buildOutlinePrompt`): Returns JSON with `unique_angle`, `direct_answer`, `h2_sections[]` (each with `key_points`, `has_mini_story`, `internal_link`, `external_link`), `faq[]`, `meta_description`. Links are assigned to specific sections here to enforce distribution.

**Call 2 — Article** (`buildUserPrompt`): Receives the outline and renders each section with its assigned link. The LINK PLACEMENT RULE in the prompt requires each link to appear inline within its section's prose, never clustered.

**Response format**: Single JSON object — `{ title, seo_title, slug, meta_description, content, image_prompt, image_alt, tags[], faq[] }`.

**Spreadsheet column auto-mapping**: `spreadsheetService.js` exports `HEADER_ALIASES` (a map of client column name variants → canonical field names) and `resolveHeaders()`. Client sheets that use `Blog Topic`, `Primary Keywords`, `Ideal Customer Profile`, `Target GEO`, or `Day` are silently remapped to the canonical names. The parse response includes a `mappings` array so the upload UI can show "🔁 Auto-mapped…" notices. Add new aliases to `HEADER_ALIASES` — do not rename the canonical field names.

**Additional instructions**: Merged at generation time — batch-level (`uploads.additional_instructions`) combined with job-level (`jobs.additional_instructions`), job-level taking priority. Injected as highest-priority block in the user prompt.

**Feedback**: `generation_feedback` rows for the blog are loaded before each generation and injected into the system prompt as non-negotiable editor requirements.

## SEO Machine Engine (alternate generation backend)

This app lives at `<seomachine-repo>/app/` as an overlay on the SEO Machine fork. Generation has **two engines**, chosen at runtime by `getActiveEngine()` in `claudeService.js`:

- **`native`** (default) — the 2-call outline+article pipeline described above.
- **`seomachine`** — drives the parent repo's methodology instead.

**Selection precedence** (`getActiveEngine()`): `queue_state.generation_engine` (set from the UI) → env `GENERATION_ENGINE` → `'native'`. The toggle is on the **Claude Setup** page (🧩 Generation Engine), saved via `POST /api/claude/engine` → `queueService.setGenerationEngine()`. The column is added by a `queue_state` migration in `database.js`.

**How the seomachine engine works** (`generateViaSeomachine()` in `claudeService.js`, single-call):
1. `seomachineService.resolveRoot()` finds the parent repo (`path.resolve(__dirname,'../../..')`, override with env `SEOMACHINE_ROOT`).
2. `seomachineService.loadMethodology(root)` reads the **live** `.claude/commands/write.md` — so upstream improvements flow in automatically. Do NOT copy write.md's text into code.
3. Per-domain brand context is loaded with the existing `loadContextFiles(contextPath)` and injected as **AUTHORITATIVE** (this is what makes the single-brand upstream multi-blog). Per-domain content lives at the **seomachine root** — `../blogs/{domain}/context/` (relative to `app/`); if a blog has no per-domain folder, the engine **falls back to the root default `context/`**. The prompt explicitly tells the model to ignore any example brand (e.g. "Castos") from the methodology.
4. Generation reuses the proven `generateViaCli()` (with `cwd = seomachine root`) / `generateViaSdk()` and `parseGeneratedContent()` — so the return contract is identical to native and all downstream stages are unchanged.
5. **Quality gate** (`pythonGate.scrubAndScore()` → `scripts/seomachine_quality_gate.py`): runs the parent repo's `content_scrubber.py` (AI-watermark removal) + `content_scorer.py` (0-100 composite). The score is attached as `result._seoMachineScore`, persisted to `jobs.seomachine_score`, and shown as the `Q <score>` chip in the jobs UI. The gate is **best-effort** — if Python/`textstat` is missing or it errors, generation still succeeds.

**Pull-safe scrubber shim**: `content_scrubber.scrub()` upstream resets `self.stats` without the `ai_phrases_replaced` key (KeyErrors on real articles). `seomachine_quality_gate.py` monkeypatches `_replace_ai_phrases` to `setdefault` the key — the fix lives in OUR script, never in the upstream root file, so `git pull upstream` stays clean. (Candidate upstream PR.)

**WordPress browser-path image source**: `setPostMetaViaBrowser()` returns its `imageSource`; `fillGutenbergEditor()`/`fillClassicEditor()` return it up to `postViaBrowser()`, which captures it into a local `imageSource` used in the return. Do NOT reference `browserImageSource` from `postViaBrowser` (it's scoped to `fillGutenbergEditor`) — that was a bug that crashed the return *after* a successful post.

**Keeping upstream in sync**: from the repo root, `git fetch upstream && git merge upstream/main`. `app/` does not exist upstream, so merges only touch root files. Quality-gate dep: `pip install textstat`.
