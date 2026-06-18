# CT Automation — Content Auto-Draft Tool

Automatically generates SEO-optimized blog posts using Claude AI and saves them as WordPress drafts — driven by a spreadsheet content calendar.

---

## Features

- **Spreadsheet Upload** — 4-step flow: select blog → upload file → review & select rows → queued. Blog must be chosen first to prevent wrong-blog assignments. Column names are auto-mapped from client sheet variants (e.g. `Blog Topic`, `Primary Keywords`, `Target GEO`) to canonical field names. Choose Auto-start or Manual queue mode per batch
- **Claude AI Generation** — 2-call pipeline (research outline → full article) applying a 4-phase prompt: Research → Write → Optimize → Scrub. Links are assigned per H2 section in the outline so they don't cluster. Produces complete HTML with title, body, meta, FAQ, and image
- **Auto-resume on Usage Limit** — When Claude's rolling usage limit is hit, the job is rescheduled to the reset time instead of failing; the cron worker resumes it automatically with no retry burned
- **Test Mode** — Instant mock content with no API calls for pipeline testing without spending tokens
- **WordPress Auto-Draft** — Posts via Playwright browser automation. Sets categories, tags, industries, featured image, and Rank Math SEO fields. Updates existing posts instead of creating duplicates
- **Featured Image** — Auto-generated 30KB WebP gradient banner per post via `sharp`
- **All Jobs Table** — Upload batches grouped with per-row status, inline log timeline, and actions
- **Live Dashboard** — Real-time status via Socket.io: Pending → Generating → Posting → Drafted
- **Queue Controls** — Pause, resume, restart (clears all data), delete, or start any job immediately
- **Multi-Blog Support** — Multiple WordPress sites, each with separate credentials, context files, and rules
- **Domain Filter** — Scope the Dashboard and All Jobs views (stats, list, analytics) to a single blog; selection persists across refresh and between pages, with a Reset control
- **Editor Feedback Loop** — Rate/annotate drafted posts; notes are stored per blog and injected into future generations as non-negotiable requirements
- **Activity Timeline** — Full audit log with timestamps per job, viewable inline

---

## Quick Start

```bash
bash start.sh
```

That's it. On first run `start.sh` installs npm dependencies, installs Playwright Chromium, creates `.env` from `.env.example`, and starts the server. Open `http://localhost:4000`.

```bash
bash start.sh --dev    # auto-reload on file changes
bash start.sh --bg     # background via PM2
```

---

## Configuration

Edit `.env` after first run:

```env
APP_PORT=4000
APP_SECRET=change-this-to-a-random-64-char-string

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Claude AI — uses Claude CLI session by default (no API key needed)
# Set ANTHROPIC_API_KEY only as fallback if Claude CLI is not authenticated
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-sonnet-4-6

# Blog configuration — repeat BLOG_{SLUG}_* for each blog
BLOG_VC_NAME=ViitorCloud Blog
BLOG_VC_DOMAIN=viitorcloud.com
BLOG_VC_WP_URL=https://yoursite.com
BLOG_VC_WP_LOGIN_URL=https://yoursite.com/wp-login.php
BLOG_VC_WP_USERNAME=wp-username
BLOG_VC_WP_PASSWORD=wp-password
BLOG_VC_WP_METHOD=browser
BLOG_VC_WP_APP_PASSWORD=
BLOG_VC_WP_CATEGORY=1
BLOG_VC_WP_AUTHOR_ID=1
BLOG_VC_CONTEXT_PATH=./blogs/vc/context
BLOG_VC_RULES_PATH=./rules/vc_blog_generation.md
```

**Admin password** is controlled entirely by `.env`. Changing it in the UI is not supported — edit `ADMIN_PASSWORD` and restart.

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `APP_PORT` | Server port (default: 4000) | No |
| `APP_SECRET` | Session secret — use a random 64-char string | Yes |
| `ADMIN_USERNAME` | Admin login username | Yes |
| `ADMIN_PASSWORD` | Admin login password | Yes |
| `ANTHROPIC_API_KEY` | Fallback API key if Claude CLI not authenticated | No |
| `CLAUDE_MODEL` | Claude model (default: claude-sonnet-4-6) | No |
| `BLOG_{SLUG}_NAME` | Blog display name | Yes (per blog) |
| `BLOG_{SLUG}_WP_URL` | WordPress site URL | Yes (per blog) |
| `BLOG_{SLUG}_WP_LOGIN_URL` | Custom WP login URL (if not `/wp-login.php`) | No |
| `BLOG_{SLUG}_WP_USERNAME` | WordPress username | Yes (per blog) |
| `BLOG_{SLUG}_WP_PASSWORD` | WordPress password | Yes (per blog) |
| `BLOG_{SLUG}_WP_METHOD` | `browser` or `api` (default: browser) | No |
| `BLOG_{SLUG}_WP_APP_PASSWORD` | Application Password (only for `api` method) | For api mode |
| `BLOG_{SLUG}_WP_CATEGORY` | Default category ID | No |
| `BLOG_{SLUG}_WP_AUTHOR_ID` | Post author ID | No |
| `BLOG_{SLUG}_CONTEXT_PATH` | Path to context markdown files folder | Recommended |
| `BLOG_{SLUG}_RULES_PATH` | Path to generation rules file | Recommended |

---

## Claude Setup

**Primary — Claude CLI (recommended, no API key needed):**
```bash
# Install once
npm install -g @anthropic-ai/claude-code

# Authenticate once (opens browser OAuth)
claude
```
After authentication, CT Automation uses your CLI session for all content generation automatically.

**Fallback — API Key:**
Set `ANTHROPIC_API_KEY` in `.env`. Used automatically if CLI is not authenticated.

---

## WordPress Setup

**Browser automation (default, works on any WP install):**

Set `BLOG_{SLUG}_WP_METHOD=browser` and provide `WP_USERNAME` + `WP_PASSWORD`. Playwright handles login, Gutenberg editor, and all metadata via the WP JavaScript API and in-browser REST calls (no Application Password needed).

If your site has a custom login URL (e.g. for security plugins), set `BLOG_{SLUG}_WP_LOGIN_URL`.

**REST API method (optional):**

Set `BLOG_{SLUG}_WP_METHOD=api` and generate an Application Password:
1. WP Admin → Users → Profile → Application Passwords
2. Enter name → Add New → copy the generated password
3. Set `BLOG_{SLUG}_WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx`

---

## Adding a New Blog

1. Create context folder: `./blogs/myblog/context/` with brand/SEO markdown files
2. Create rules file: `./rules/myblog_blog_generation.md` (default path is `./rules/{slug}_blog_generation.md`)
3. Add `BLOG_MYBLOG_*` variables to `.env` (including `BLOG_MYBLOG_CONTEXT_PATH=./blogs/myblog/context`)
4. Restart — the blog config is auto-seeded from `.env`

All blog context lives under the single `blogs/` parent so the repo root stays clean as blogs are added.

Alternatively: **Settings → Add Blog** in the UI.

---

## Spreadsheet Format

| Column | Description |
|---|---|
| `Date` | Publication date |
| `Blog Topic (CTR-Optimised)` | Article title |
| `Primary Keyword` | Main SEO keyword |
| `Secondary Keywords` | Comma-separated |
| `Theme / Pillar` | Content category (used for WP category) |
| `Blog Type` | Comparison, Guide, How-To, etc. |
| `Funnel Stage` | TOFU / MOFU / BOFU |
| `Pain Points Addressed` | Reader problems |
| `ICP Seeking Solutions For` | What the ideal customer needs |
| `Ideal Customer Profile (ICP)` | Target audience |
| `Target Industry` | Industry focus (used for WP industry taxonomy) |
| `Outcome` | Desired business outcome |
| `Intent` | Informational / Transactional / Commercial |
| `CTR Hook & Title Strategy` | Title optimization notes |
| `AEO Rank Strategy` | Answer Engine Optimization notes |
| `SEO Rank Strategy` | SEO strategy notes |
| `Target location` | Geographic targets (referenced discreetly in content) |

Column names are auto-mapped from common client variants — `Blog Topic`, `Primary Keywords`, `Ideal Customer Profile`, `Target GEO`, and `Day` are accepted in addition to the canonical names above. The upload UI shows a notice for each remapped column.

---

## Project Structure

```
ct-automation/
├── src/
│   ├── server.js                  # Express app, Socket.io, startup seeding
│   ├── config/database.js         # SQLite schema + init
│   ├── middleware/authMiddleware.js
│   ├── services/
│   │   ├── claudeService.js       # Claude CLI/SDK generation, 4-phase prompt
│   │   ├── wordpressService.js    # Playwright posting + in-browser REST API
│   │   ├── imageService.js        # WebP featured image generation (sharp)
│   │   ├── spreadsheetService.js  # Excel parsing
│   │   ├── queueService.js        # Job CRUD, activity logs, socket emits
│   │   └── schedulerService.js    # Cron worker, job pipeline
│   └── routes/
│       ├── authRoutes.js
│       ├── uploadRoutes.js
│       ├── dashboardRoutes.js
│       ├── configRoutes.js
│       └── claudeRoutes.js
├── public/
│   ├── dashboard.html             # Pipeline, queue controls, test mode toggle
│   ├── jobs.html                  # All jobs table with inline log timelines
│   ├── upload.html                # 4-step upload: blog select → file → review → queued
│   ├── settings.html              # Blog config management
│   ├── claude-setup.html          # Claude connection status, model/effort selector
│   ├── flow-3d.html               # 3D pipeline visualization (informational)
│   └── assets/js/common.js       # Shared: API, escHtml, fmtTime, showToast
├── rules/                         # One generation-rules file per blog ({slug}_blog_generation.md)
│   ├── vc_blog_generation.md
│   ├── everycred_blog_generation.md
│   └── everyticket_blog_generation.md
├── skills/
│   └── content_generation_skill.md # Generation prompt documentation
├── blogs/                         # Per-blog brand context, one subfolder per blog
│   ├── vc/context/                # ViitorCloud brand context files (11 .md files)
│   ├── everycred/context/         # EveryCRED brand context files
│   └── everyticket/context/       # EveryTicket brand context files
├── start.sh                       # One-command setup + start
├── data/                          # SQLite database
├── uploads/                       # Uploaded spreadsheet files
├── .env                           # Environment config (not in git)
└── .env.example                   # Config template
```

---

## Running as a Service

### PM2 (recommended)
```bash
npm install -g pm2
pm2 start src/server.js --name ct-automation
pm2 save && pm2 startup
```

Or simply: `bash start.sh --bg`

### systemd
```ini
[Unit]
Description=CT Automation
After=network.target

[Service]
WorkingDirectory=/var/www/html/blogs-CT/ct-automation
ExecStart=/usr/bin/node src/server.js
Restart=always
User=haresh
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## Security

- Set `APP_SECRET` to a random 64-character string in `.env`
- Use a strong `ADMIN_PASSWORD` — changed by editing `.env` and restarting
- Never commit `.env` to version control (it is in `.gitignore`)
- All routes require session authentication
- The server resets any interrupted jobs to `error` on startup — manual restart required
