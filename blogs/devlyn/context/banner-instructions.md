# Devlyn blog banner — Codex image_gen instructions

This file is loaded LIVE by `app/src/services/codexImageService.js` (`loadBannerPrompt()`)
whenever a devlyn post's featured image is generated — no code change or server restart
needed to edit it. Only the text after the `---PROMPT---` marker below is sent to Codex.

Devlyn is configured as a **strict-Codex** blog (`STRICT_CODEX_BLOGS=devlyn` in `app/.env`):
Codex `image_gen` is the ONLY source tried; if it fails, the pipeline falls back straight
to the plain SVG gradient (no Pollinations/stock/OpenAI in between).

Style reference: the existing hand-picked covers in `devlyn-site/src/assets/blog-covers/`
— monochrome, cinematic, photoreal 3D-render office/dashboard scenes, no visible title
text baked into the image (the site renders the real title as HTML separately).

Placeholders substituted at generation time: `{{HEADLINE}}`, `{{WIDTH}}`, `{{HEIGHT}}`,
`{{SAVE_NAME}}`. (`{{SUBHEAD}}` is deliberately unused — this style has no text overlay.)

---PROMPT---
Use the imagegen skill's built-in image_gen tool to generate ONE professional B2B SaaS blog featured banner, landscape {{WIDTH}}x{{HEIGHT}}.
Style: ultra-dark, near-black cinematic scene, photorealistic 3D-render / product-render quality, moody low-key studio lighting with dramatic rim/edge lighting picking out silhouettes and panel edges against the black background.
Palette: strictly monochrome — black, deep charcoal, mid-gray, and soft off-white/cream highlights — EXCEPT one clearly visible soft mint/sage-green glow accent, which is REQUIRED, not optional: light up one key UI panel, its connecting line(s), and its checkmark icon in this green glow. Every other element stays grayscale.
Article topic (do not render this text anywhere in the image — use it only to pick the scene below): "{{HEADLINE}}"

CRITICAL — pick ONE scene archetype from this list that best fits the topic above, and commit to it fully. Do NOT default to the same composition every time: a genuinely different topic must produce a genuinely different scene, not just different icons dropped into the same layout.
- Hiring / staffing / talent / recruiting → a wall or floating stack of resume/candidate cards with person-silhouette avatars and short abstract line placeholders; optionally a hand or silhouette reviewing them, or two silhouettes in an interview/screen-share moment.
- Engineering / coding / developer tools / technical how-to → a close, intimate framing of one person's silhouette at a single monitor showing an abstract code editor (line-number gutter, syntax-block shapes) — no wall of extra panels.
- Global / remote team / offshore / distributed work → a person facing a large wall panel or hologram showing a world map with glowing connection dots and arcing lines between regions.
- Data / analytics / metrics / reporting → a close-up of one or two large abstract charts (bar, line, radar) rendered as glowing panels, minimal or no human figure.
- AI / automation / workflow / process topics specifically → a left-to-right sequence of 3-6 connected dark panels/nodes linked by thin lines with small checkmark circles between them, suggesting a pipeline — reserve this for topics actually about automation/workflows, not as a generic default.
- Business strategy / leadership / culture / growth → a single silhouette looking out at a dark city skyline through a window, or alone at a long table — convey scale and vision, not a dashboard.
- Security / compliance / risk → a shield or lock icon rendered large and glowing, integrated into a dark panel or vault-like structure.
- Cost / pricing / ROI / budget → an abstract balance/scale motif or a small stack of glowing block shapes next to one simple chart panel.
If none of these fit, invent a scene that visually represents the specific topic rather than falling back to a generic tech-office composition.
Ground the scene with realistic desk props ONLY where a desk/person is actually part of the chosen scene: an open notebook, a pen, a coffee mug, a small potted plant, a laptop, or stacked books/blocks.
Composition: wide cinematic framing, generous negative space, key subject roughly centered or slightly off-center, uncluttered enough to read clearly at banner size.
Absolutely NO visible text, words, letters, numbers, or labels anywhere in the image — all UI mockup "text" must be abstract line/block placeholders, never real characters. No watermarks.
Do NOT draw any logo, brand icon, or wordmark anywhere.
Generate the image ONCE with a single image_gen call. Do not iterate, validate, critique, or regenerate. Immediately save the result into the current working directory as "{{SAVE_NAME}}" and stop.
