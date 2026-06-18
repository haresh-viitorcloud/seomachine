# CT Automation — Project Flow & Architecture

> Use this document to build an animated 3D flowchart that showcases the full system to clients.
> Each section maps to a visual layer, node, or animation sequence.

---

## LAYER 1 — INPUT (User Entry Points)

```
[ Admin User ]
     │
     ├──► [ Login Page ]  ──────────────────────► [ Session Auth ]
     │
     ├──► [ Upload Page ]  ─────────────────────► [ Spreadsheet File (.xlsx / .csv) ]
     │         │
     │         ├── Step 1: Select Blog (card picker)
     │         ├── Step 2: Upload File (drag & drop)
     │         ├── Step 3: Review Rows (duplicate detection, per-row actions)
     │         └── Step 4: Queued ✓
     │
     └──► [ Settings Page ]  ──────────────────► [ Blog Configurations (DB) ]
```

---

## LAYER 2 — PARSING & QUEUE CREATION

```
[ Spreadsheet File ]
     │
     ▼
[ Spreadsheet Parser ]  ─── HEADER_ALIASES auto-map client column names
     │
     ├── Extracts: Title · Primary Keyword · Secondary Keywords · Date
     │             Theme · Blog Type · Funnel Stage · ICP · Industry
     │             Pain Points · AEO/SEO Strategy · Target Location
     │
     ▼
[ Duplicate Check ]  ─── Compares titles against existing jobs (case-insensitive)
     │                     User chooses: Replace / Skip / Keep per row
     ▼
[ Job Queue (SQLite) ]
     │
     └── Each spreadsheet row → 1 Job record
         Status: PENDING
         Linked to: Upload Batch · Blog Config · Raw Row Data
```

---

## LAYER 3 — QUEUE ENGINE (The Brain)

```
                    ┌─────────────────────────────────┐
                    │       QUEUE STATE (SQLite)       │
                    │  is_paused · test_mode · model   │
                    └─────────────────────────────────┘
                                    │
          ┌─────────────────────────┼──────────────────────────┐
          │                         │                          │
   [ Cron Worker ]          [ Manual Trigger ]        [ Auto-Start ]
   Fires every 60s          "Start" button            On upload confirm
   Picks up due jobs        Process single job        _drainMode = true
          │                         │                          │
          └─────────────────────────┼──────────────────────────┘
                                    │
                                    ▼
                         [ Scheduler Service ]
                          processJob(job)
```

**_drainMode Flag:**
- `false` (default) → Cron picks up due jobs, stops after each one (Manual mode)
- `true` (explicit trigger) → Jobs chain automatically one after another (Auto mode)

---

## LAYER 4 — JOB PIPELINE (Core Flow)

```
Job Status: PENDING
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│                    GENERATION PHASE                            │
│  Status: GENERATING                                            │
│                                                                │
│  [ Claude Service ]                                            │
│       │                                                        │
│       ├── CALL 1 — Research Outline                           │
│       │     Input:  Raw row data + Context files + Rules      │
│       │     Output: JSON outline                              │
│       │             ├── unique_angle                          │
│       │             ├── direct_answer                         │
│       │             ├── h2_sections[] (each with links)       │
│       │             ├── faq[]                                 │
│       │             └── meta_description                      │
│       │                                                        │
│       └── CALL 2 — Full Article                               │
│             Input:  Outline + Blog rules + Editor feedback    │
│             Output: Complete HTML article                     │
│                     ├── title + seo_title + slug              │
│                     ├── meta_description                      │
│                     ├── content (HTML with Gutenberg blocks)  │
│                     ├── image_prompt + image_alt              │
│                     ├── tags[]                                 │
│                     └── faq[]                                 │
└────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│                    POSTING PHASE                               │
│  Status: POSTING                                               │
│                                                                │
│  [ Image Service ]                                             │
│       Pexels API → Unsplash API → SVG Gradient fallback       │
│       Output: 30KB WebP featured image                        │
│                                                                │
│  [ WordPress Service ]                                         │
│       Method A — REST API (if App Password set)               │
│       Method B — Playwright Browser Automation                │
│           ├── Navigate to wp-login.php                        │
│           ├── Login with credentials                          │
│           ├── Open New Post                                   │
│           ├── Set title via wp.data (iframe-safe)             │
│           ├── Insert Gutenberg blocks (wp.blocks.parse)       │
│           ├── Set categories / tags / industry taxonomy       │
│           ├── Upload featured image                           │
│           ├── Set Rank Math SEO fields                        │
│           └── Save as Draft                                   │
└────────────────────────────────────────────────────────────────┘
     │
     ▼
Job Status: DRAFTED ✓
WordPress Post ID saved · Edit URL stored
```

---

## LAYER 5 — STATUS STATES (Animated Nodes)

```
                          ┌─────────┐
                          │ PENDING │  ◄── Waiting in queue / scheduled
                          └────┬────┘
                               │ Start
                               ▼
                       ┌───────────────┐
                       │  GENERATING   │  ◄── Claude AI writing (2 calls)
                       └───────┬───────┘
                               │ Success
                               ▼
                       ┌───────────────┐
                       │   POSTING     │  ◄── WordPress upload
                       └───────┬───────┘
                               │ Success
                               ▼
                       ┌───────────────┐
                       │   DRAFTED  ✓  │  ◄── Live in WordPress as draft
                       └───────────────┘

           Error paths:
           GENERATING ──► ERROR  (retry up to 3x, then permanent error)
           POSTING    ──► ERROR  (content saved, can re-post without re-generating)

           Special states:
           PENDING + future scheduled_at ──► ⏳ LIMIT WAIT  (usage limit auto-resume)
           PAUSED  ──► manually held, won't auto-start
           SKIPPED ──► excluded by user during upload review
```

---

## LAYER 6 — INTELLIGENT FEATURES

### Auto-Resume on Claude Usage Limit
```
[ Generation Fails ]
     │
     ▼
[ detectUsageLimit() ]
     ├── Matches limit error phrases
     └── Cross-checks live getClaudeUsage() (window ≥99% = limited)
          │
          ▼
     [ Rescheduled to PENDING ]
     scheduled_at = reset time (from API or +30 min fallback)
          │
          ▼
     [ Cron picks up automatically when due ] ──► Resume
```

### Duplicate Detection
```
[ Upload Row ] ──► [ Check by title + slug in WP ] ──► Found?
                                                         │
                    ┌────────────────────────────────────┤
                    │                                    │
               [ UPDATE existing post ]          [ CREATE new post ]
```

### Editor Feedback Loop
```
[ Drafted Post ] ──► [ Editor rates / annotates ]
                              │
                              ▼
                     [ generation_feedback table ]
                              │
                              ▼
                     [ Injected into next generation ]
                     as non-negotiable requirements
```

### Per-Blog CTA Control
```
[ Blog Config ]
     │
     └── CTA enabled? ──► YES → inject cta-section-modern banner
                      ──► NO  → inline CTA from generated article only
                                (EveryCRED, EveryTicket = disabled)
```

---

## LAYER 7 — REAL-TIME UI (Socket.io Events)

```
[ Server ]  ──Socket.io──►  [ Browser ]

Events emitted:
  job:created    → New job appears in Jobs list
  job:updated    → Status badge + log timeline updates live
  job:deleted    → Row disappears instantly
  log:new        → Activity timeline entry added
  stats:update   → Dashboard counters refresh
  queue:state    → Pause/resume indicator updates
  batch:complete → Success banner + optional webhook notification
```

---

## LAYER 8 — MULTI-BLOG SYSTEM

```
[ .env file ]  ─── source of truth ───►  seedBlogConfigsFromEnv()
                                               │
                                               ▼
                                     [ blog_configs table ]
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
             [ ViitorCloud ]           [ EveryCRED ]             [ EveryTicket ]
             blogs/vc/context/    blogs/everycred/context/  blogs/everyticket/context/
             rules/vc_blog_       rules/everycred_blog_     rules/everyticket_blog_
             generation.md        generation.md             generation.md
                    │                          │                          │
             WP: browser          WP: browser               WP: browser
             viitorcloud.com      stg.everycred.com         everyticket.in
```

---

## LAYER 9 — CONTENT GENERATION PROMPT STRUCTURE

```
SYSTEM PROMPT
├── Writing Identity  (from blog config)
├── Brand Context     (markdown files from context_path/)
│     ├── brand-overview.md
│     ├── seo-guidelines.md
│     ├── style-guide.md
│     ├── target-audience.md
│     └── ... (up to 11 files)
├── Generation Rules  (rules/{slug}_blog_generation.md)
│     ├── Word count targets
│     ├── FAQ count & format
│     ├── Voice & tone
│     └── Formatting rules
├── 4-Phase Instructions
│     ├── Phase 1: RESEARCH  — identify unique angle, source data
│     ├── Phase 2: WRITE     — draft H2 sections with inline links
│     ├── Phase 3: OPTIMIZE  — SEO, readability, keyword density
│     └── Phase 4: SCRUB     — remove fluff, enforce word count
└── Editor Feedback   (non-negotiable requirements from past reviews)

USER PROMPT
├── Additional Instructions (batch-level + job-level merged)
├── Call 1: Build outline JSON
└── Call 2: Write full article from outline
```

---

## LAYER 10 — DATA ARCHITECTURE

```
SQLite: data/app.db

┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│    users     │     │ blog_configs │     │       uploads        │
│─────────────│     │──────────────│     │──────────────────────│
│ username    │     │ name / slug  │     │ blog_id (FK)         │
│ password    │     │ domain       │     │ filename             │
│ (from .env) │     │ wp_url       │     │ row_count            │
└──────────────┘     │ wp_creds     │     │ additional_instruct. │
                     │ context_path │     └──────────┬───────────┘
                     │ rules_path   │                │ 1:many
                     └──────────────┘                ▼
                                            ┌──────────────────────┐
                                            │         jobs         │
                                            │──────────────────────│
                                            │ upload_id (FK)       │
                                            │ blog_id (FK)         │
                                            │ title / raw_data     │
                                            │ status               │
                                            │ generated_content    │
                                            │ wp_post_id / url     │
                                            │ cost_usd / tokens    │
                                            │ scheduled_at         │
                                            └──────────┬───────────┘
                                                       │ 1:many
                                 ┌─────────────────────┴────────────────────┐
                                 │                                           │
                      ┌──────────────────────┐              ┌───────────────────────────┐
                      │    activity_logs      │              │   generation_feedback     │
                      │──────────────────────│              │───────────────────────────│
                      │ job_id (FK)          │              │ blog_id (FK)              │
                      │ level (info/warn/err) │              │ rating / notes            │
                      │ message              │              │ injected into prompts     │
                      └──────────────────────┘              └───────────────────────────┘
```

---

## ANIMATION SEQUENCE SUGGESTION (for 3D Visualization)

**Scene 1 — Input**
User uploads a spreadsheet → rows fly out as individual cards

**Scene 2 — Parsing**
Cards fan out → auto-mapped columns highlight → duplicate check → cards enter the queue as glowing orbs

**Scene 3 — Queue**
Orbs orbit a central Queue Engine node → cron clock ticks → one orb gets pulled in

**Scene 4 — Generation (2-Call AI Pipeline)**
Orb enters Claude AI node → splits into Call 1 (Outline) and Call 2 (Article) → merges into a document

**Scene 5 — Image**
Document connects to Image Service → image thumbnail attaches

**Scene 6 — WordPress Posting**
Document + image travel to WordPress node → Playwright browser opens → blocks insert → saved as Draft

**Scene 7 — Live Updates**
Socket.io lightning bolts pulse from server to browser UI → status badges flip in real-time

**Scene 8 — Multi-Blog**
Three WordPress nodes (VC, EveryCRED, EveryTicket) orbit the system, each with their own color/brand

**Scene 9 — Feedback Loop**
Editor annotation on a drafted post → feedback arrow curves back into Claude node for next generation

---

## KEY NUMBERS (for infographic callouts)

- **2 AI calls** per article (Outline → Full Article)
- **4 phases** in every generation (Research → Write → Optimize → Scrub)
- **4 steps** to upload (Blog → File → Review → Queue)
- **7 job statuses** (Pending, Generating, Posting, Drafted, Error, Paused, Skipped)
- **3 image sources** (Pexels → Unsplash → SVG fallback)
- **3 WordPress methods** (REST API → Playwright Browser → Gutenberg block insert)
- **Real-time** via 7 Socket.io event types
- **Auto-resume** when Claude usage limit resets
- **Per-blog** rules, context, CTA control, and WordPress credentials
