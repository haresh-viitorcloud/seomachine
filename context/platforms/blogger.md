# Blogger — Publishing Guide (for Repurposed Content)

**URL:** https://www.blogger.com
**Type:** Google's free blogging platform. Your blog lives on `[name].blogspot.com` or a custom domain, and **you own and control it**.
**Repurposing verdict:** ⚠️ **You control it, so it's your call.** Blogger auto-sets a canonical to itself and has no simple per-post canonical field. Either treat the copy as genuine original content for this blog, add a canonical via the theme, or post a teaser that links to your site.

---

## Create the blog (one-time)

1. Sign in to **blogger.com** with a Google account.
2. Click **Create New Blog**, choose a **name**, a **URL** (`something.blogspot.com`), and a **theme**.

---

## How to publish a post

1. Sign in → click **New Post**.
2. Add a **title** and write the content (toggle between **Compose** and **HTML** views; the HTML view matters for canonical/tweaks).
3. In the right-hand settings, add **Labels** (your categories/tags — comma-separated).
4. Optionally set a **Search Description** (meta description) and a **jump break** (place cursor, **Insert jump break**, to create a "Read more" cut on the index page).
5. Click **Preview** to check it.
6. **Publish**, or **Save** as a draft, or **schedule**: on the right, next to **Published on**, pick **Set date and time**.

Other handy features: **post templates** (Settings → Posts → Post template), **email-to-post** (Settings → Email), and full HTML editing.

---

## Handling the re-post (canonical takes effort here)

Blogger points the canonical at the Blogger URL by default and offers no one-click per-post canonical. Options, easiest to most technical:

1. **Treat it as original content** for this blog — fine if you're happy for the Blogger copy to be the version Google may rank, or you rewrite it for this audience.
2. **Teaser + link back** — publish an excerpt and link to the full article on your main site, keeping your site as the primary home.
3. **Add a canonical via the theme (advanced)** — edit the theme HTML to conditionally insert `<link rel="canonical" href="...">` pointing to your original. This is a template-level change, not a per-post toggle, so only do it if you're comfortable editing Blogger themes.
4. **Control indexing** — under **Settings → Crawlers and indexing**, you can enable **Custom robots header tags** and, if you specifically want to keep a syndicated copy out of search, set it to `noindex`. Use deliberately.

---

## Site links you'll use

- **New post:** sign in at https://www.blogger.com → **New Post**
- **Create / edit post help (official):** https://support.google.com/blogger/answer/154172
- **Create a blog help (official):** https://support.google.com/blogger/answer/1623800
- **SEO settings (Search Description, Crawlers & indexing):** Blogger dashboard → **Settings**

---

## Blog-writing instructions for Blogger

Treat this as an SEO blog you own — write for search **and** readers:

- Put your **target keyword** in the **title (H1)** and within the first ~100 words.
- Fill in the per-post **Search Description** (meta description, ~150 characters).
- Add descriptive **alt-text** to images and **internal links** to your other posts.
- Use **Labels** as categories.
- **Structure:** compelling title, a hook, scannable subheads (H2/H3), short paragraphs, and at least one image.
- **Length:** ~700–1,500+ words depending on topic and keyword competitiveness.
- Add a **jump break** so the index page shows a clean excerpt + "Read more."
- If this is a syndicated copy, decide your **canonical / robots** approach (see above) before publishing.

---

## Metadata & SEO tags

Blogger gives you real meta control — use it:

- **Turn on search descriptions first:** **Settings → Meta tags → Search description** (toggle on) and set a **blog-level description**. Until this is enabled, the per-post field won't appear.
- **Per-post meta description:** in the post's right-hand **Settings → Search Description** (~150 chars, keyword included).
- **URL slug:** post **Settings → Permalink → Custom Permalink** — set a short, keyword-rich slug **before** publishing.
- **Per-post indexing:** post **Settings → Custom robots tags** (e.g. `noindex` to keep a syndicated copy out of search — use deliberately).
- **Meta / OG title:** your post **title (H1)**.
- **OG image:** your first/featured image — set one for clean social shares.
- **Canonical:** Blogger self-canonicalizes; see the canonical section above if you want it pointing to your own site.

---

## Repurposing checklist for Blogger

- [ ] Post created via **New Post**
- [ ] Decided the mode: original / teaser+link / theme canonical
- [ ] Labels (categories) added
- [ ] Search Description set
- [ ] Jump break added if you want a "Read more" cut
- [ ] Link back to your source where relevant
- [ ] Indexing behavior deliberate (canonical or robots tag) if this is a pure syndication copy
