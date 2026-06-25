# WordPress Integration Files

These files enable the SEO Machine tool to set SEO plugin meta fields (Focus Keyword, SEO Title, Meta Description) via the REST API. WordPress core silently drops any `meta` key that isn't registered with `show_in_rest => true`, so the SEO plugin's fields must be registered for REST before the tool can write them.

**Install the plugin that matches your site's SEO plugin:**

| Your SEO plugin | Install this file |
|---|---|
| Yoast SEO | `seo-machine-yoast-rest.php` (or the `functions-snippet.php` equivalent) |
| Rank Math | `seo-machine-rankmath-rest.php` |

Each file is gated on its SEO plugin being active, so installing both is safe (the inactive one is a no-op). **LaraCopilot uses Rank Math, so it needs `seo-machine-rankmath-rest.php` installed** — without it, the `rank_math_title` / `rank_math_description` / `rank_math_focus_keyword` writes the tool makes are discarded and the meta title/description never appear in Rank Math.

For Yoast you may instead **choose ONE option** - the mu-plugin OR the functions.php snippet. They do the same thing.

---

## Option A: MU-Plugin (Recommended)

**File:** `seo-machine-yoast-rest.php`

**Installation:**
1. Upload to: `wp-content/mu-plugins/seo-machine-yoast-rest.php`
2. Create the `mu-plugins` folder if it doesn't exist
3. Done - mu-plugins auto-activate, no enabling required

**Pros:**
- Won't be lost during theme updates
- Can't be accidentally deactivated
- Clean separation from theme code

---

## Option B: Functions.php Snippet

**File:** `functions-snippet.php`

**Installation:**
1. Copy the contents of this file
2. Paste at the end of your theme's `functions.php`
3. Or use a code snippets plugin (WPCode, Code Snippets, etc.)

**Pros:**
- No new files to manage
- Works with code snippet plugins

**Cons:**
- Lost if theme is changed/updated (unless using child theme)

---

## What This Code Does

**Yoast** (`seo-machine-yoast-rest.php` / snippet): registers the `_yoast_wpseo_*` meta keys for REST and a grouped `yoast_seo` field:

- `focus_keyphrase` → `_yoast_wpseo_focuskw`
- `seo_title` → `_yoast_wpseo_title`
- `meta_description` → `_yoast_wpseo_metadesc`

**Rank Math** (`seo-machine-rankmath-rest.php`): registers the `rank_math_*` meta keys for REST and a grouped `rank_math_seo` field:

- `focus_keyword` → `rank_math_focus_keyword`
- `seo_title` → `rank_math_title`
- `meta_description` → `rank_math_description`

The SEO Machine tool writes the raw `meta` keys directly (e.g. `{ "meta": { "rank_math_title": "..." } }`); registering them above is what lets WordPress persist them. The URL slug is set via the post's core `slug` field, which Rank Math reads as the permalink — no extra registration needed.

---

## Security

- Requires authentication (Application Password)
- User must have `edit_post` capability
- All inputs are sanitized with `sanitize_text_field()`
