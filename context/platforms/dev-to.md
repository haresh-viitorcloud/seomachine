# DEV (dev.to) — Publishing Guide (for Repurposed Content)

**URL:** https://dev.to
**Type:** Developer-focused community. Markdown-based editor using Jekyll-style **front matter**.
**Repurposing verdict:** ✅ **Excellent.** DEV supports a `canonical_url`, so republished posts point search engines back to your original and boost its ranking rather than competing with it.

---

## Account

Sign up at dev.to (GitHub, Google, Apple, email, etc.). Free.

## Choose your editor first

DEV has two editors — check/switch at **`/settings/customization`**:
- **Rich + Markdown** — visual, with a settings panel.
- **Basic Markdown** — everything (including publish state and canonical) lives in the front matter.

---

## How to publish

1. Click **Create Post**.
2. Add a **title**, write the **body** in Markdown, add **tags**, and set a **cover image**.
3. Save with **Save draft**, or publish.
   - **Rich + Markdown:** click **Publish**.
   - **Basic Markdown:** set `published: true` in the front matter, then save.

### Set the canonical URL (do this every time you republish)

- **Rich + Markdown:** click the **gear icon** next to "Save draft" → enter your original post's URL in the **Canonical URL** field.
- **Basic Markdown:** add `canonical_url:` to the front matter (see below).

### Front matter template (Basic Markdown)

```markdown
---
title: Your Post Title
published: true
description: A one-line summary used in previews and cards
tags: tag1, tag2, tag3, tag4
canonical_url: https://yourblog.com/original-post-url
cover_image: https://yourblog.com/images/cover.png
---

Your article body in Markdown starts here.
```

- `canonical_url`, `cover_image`, `series`, and `date` are optional but you should always set `canonical_url` for re-posts.
- `series:` groups related posts (keep it identical across a series).

---

## Formatting rules specific to DEV

- **Headings:** the title is the H1. Start body sections at **H2 (`##`)** and step down from there — don't use a second H1.
- **Tags:** up to **4**.
- **Embeds:** native Liquid tags plus custom ones — e.g. `{% embed https://... %}` for tweets, GitHub, CodePen, etc.
- Inline HTML mostly works.
- Draft links are shareable for review ("public but secret") and don't appear in feeds until published.

---

## Optional: bulk import via RSS

**Settings → Extensions → "Publishing to DEV from RSS"** lets you feed your blog's RSS in. Tick **"Mark the RSS source as canonical URL by default"** so imported posts automatically carry the correct canonical. (If importing from a Medium RSS feed, tweet/YouTube/Gist links convert to Liquid embeds.)

---

## Content rules to respect

- Set a `canonical_url` on re-posts — DEV explicitly wants this and says it protects/boosts your original's ranking.
- **Don't post purely promotional content**; it can be removed under the Content Policy.
- If posting several old articles, **drip them out** (a few per week) rather than dumping them all at once — better visibility and less feed-spam.

---

## Site links you'll use

- **New post:** https://dev.to/new
- **Choose / switch editor:** https://dev.to/settings/customization
- **Bulk import from RSS:** https://dev.to/settings/extensions
- **Editor guide (Markdown, Liquid, front matter):** https://dev.to/p/editor_guide
- **Writing / editing / scheduling help:** https://dev.to/help/writing-editing-scheduling
- **Your dashboard (drafts, analytics):** https://dev.to/dashboard

---

## Blog-writing instructions for DEV

- **Audience:** developers. Favor practical, hands-on "here's how I did X / what I learned" pieces over abstract marketing.
- **Don't bury the lede:** state up front what the reader will be able to do or understand by the end.
- **Headings:** the title is the H1 — start body sections at **H2** and step down from there.
- **Code:** use fenced code blocks with a language hint (e.g. ```js). For polished code images use carbon.now.sh; embed gists/tweets with `{% embed URL %}`.
- **Cover image:** **1000 × 420 px** (ratio 100:42). Keep any text centered — content near the right edge can get cropped in the social card.
- **Length:** enough to be genuinely useful — tutorials commonly run ~800–2,000 words. Add a short **TL;DR** at the top for longer pieces.
- **Tags:** up to **4** relevant tags; use `series:` to link multi-part posts.
- **Voice:** friendly, first-person, authentic. Devs value working examples, gotchas, and clear takeaways.
- Keep it **non-promotional** — purely promotional posts can be removed.

---

## Metadata & SEO tags

All of DEV's meta lives in the **front matter**:

- **Canonical:** `canonical_url:` (see above) — the key meta tag for re-posts.
- **Meta description:** the **`description:`** field is your search + social-card description. If you omit it, DEV auto-generates from the opening text — so set it deliberately (one sentence, keyword included).
- **Meta / OG title:** taken from `title:`.
- **OG image (social card):** `cover_image:` at **1000 × 420**; keep text centered so it isn't cropped.
- **URL slug:** DEV builds the slug from your title (and may append characters) — there's no full custom-slug field, so put your keyword in the title.

```markdown
title: Keyword-rich title
description: One-sentence summary with your keyword
canonical_url: https://yourblog.com/original
cover_image: https://yourblog.com/cover.png
```

---

## Repurposing checklist for DEV

- [ ] Confirmed which editor you're in (`/settings/customization`)
- [ ] `canonical_url` set to your original (gear icon or front matter)
- [ ] `published: true` (Basic Markdown) or hit Publish (Rich)
- [ ] Body starts at H2, not a second H1
- [ ] Up to 4 relevant tags
- [ ] Cover image set
- [ ] Spacing out multiple re-posts over time
