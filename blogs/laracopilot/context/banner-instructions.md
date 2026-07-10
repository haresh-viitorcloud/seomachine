# LaraCopilot — Blog Featured Banner Prompt (Codex image_gen)

This file is the **live** prompt used to generate LaraCopilot blog featured banners via the
Codex CLI `image_gen` skill. `app/src/services/codexImageService.js` reads it at generation
time, so editing the wording below changes the banner — **no code change or server restart
needed** (only the text after the `---PROMPT---` marker is sent to Codex).

Runtime placeholders (substituted before the prompt is sent):
`{{HEADLINE}}` = post title · `{{SUBHEAD}}` = short meta-description subtext ·
`{{WIDTH}}`/`{{HEIGHT}}` = generation size · `{{SAVE_NAME}}` = output filename.

Final banner size is **1200×630** (the code resizes the generated image to this). The real
`logo.svg` is composited into the lower-left by code afterward — so the prompt must NOT draw
any logo. If this file is missing, the code falls back to its built-in default prompt.

Reference banners that define this style: posts 2962, 2972, 2981 (LaraCopilot blog).

---PROMPT---
Use the imagegen skill's built-in image_gen tool to generate ONE professional B2B SaaS blog featured banner. Landscape {{WIDTH}}x{{HEIGHT}}, modern FLAT vector style (not photorealistic, no 3D, no gradients), with very generous negative space. The final crop is 1200x630.
Background: a clean, flat, light warm-cream solid colour (#F7F5F2), edge to edge. Brand accent colour: vivid red-orange #F53003. Primary text and line-art colour: near-black (#1A1A1A).
Headline (upper-left, large, bold, tight geometric sans-serif, verbatim): "{{HEADLINE}}". Set it on 2-3 lines. Accent the single most important 1-3 word phrase of the headline in #F53003; keep the rest near-black. Do not change, abbreviate, or re-spell any word.
Subhead (smaller, directly below the headline, medium grey, verbatim): "{{SUBHEAD}}".
RIGHT-SIDE TOPIC DIAGRAM (REQUIRED and DYNAMIC): on the right ~40% of the banner, draw a tasteful minimal "connected diagram" built only from THIN OUTLINE LINE-ART icons (1.5–2px even strokes, no fills, no shadows). The icons must specifically represent THIS article's topic and title ("{{HEADLINE}}") — infer the subject and pick matching imagery, for example: a browser window or storefront for web apps, a terminal/command box and `</>` code brackets or `{ }` braces for coding, a brain or microchip labelled "AI" for AI/LLM topics, a friendly robot head for agents, stacked cubes for packages/modules, a checklist for tests, a database cylinder for data, a credit card or cart for ecommerce/payments. Arrange 4–7 of these icons and connect them with THIN DASHED connector lines that meet at small circular node dots, forming a light network/flow graph (often radiating from one central element). Scatter a few tiny 4-point sparkle stars and small "+" marks for accent. Draw everything in near-black outline with selective #F53003 accents (a few strokes, dots, or one filled element in red). Keep it airy and balanced — never fill the whole right side, never make it busy or dark. The diagram MUST visibly change from article to article to match the topic.
Do NOT draw any logo, brand icon, wordmark, or the word "LaraCopilot" anywhere. Leave the lower-left corner as clean empty cream background (a real logo is composited there afterward).
Bottom-right corner: the URL "laracopilot.com" as small plain grey text.
No em-dashes anywhere. Crisp, correctly-spelled text. No watermarks. No photographic elements.
Generate the image ONCE with a single image_gen call. Do not iterate, validate, critique, or regenerate. Immediately save the result into the current working directory as "{{SAVE_NAME}}" and stop.
