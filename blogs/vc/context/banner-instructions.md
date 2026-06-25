# ViitorCloud — Blog Featured Banner Prompt (Codex image_gen)

This file is the **live** prompt used to generate ViitorCloud blog featured banners via
the Codex CLI `image_gen` skill. `app/src/services/codexImageService.js` reads it at
generation time, so editing the wording below changes the banner — **no code change or
server restart needed** (only the text after the `---PROMPT---` marker is sent to Codex).

Runtime placeholders (substituted before the prompt is sent):
`{{HEADLINE}}` = post title · `{{SUBHEAD}}` = short meta-description subtext ·
`{{WIDTH}}`/`{{HEIGHT}}` = generation size · `{{SAVE_NAME}}` = output filename.

If this file is missing, the code falls back to its built-in default prompt.

---PROMPT---
Use the imagegen skill's built-in image_gen tool to generate ONE professional B2B SaaS blog featured banner. Landscape {{WIDTH}}x{{HEIGHT}}, modern FLAT vector style (not photorealistic, no 3D), generous negative space.
Background: a deep navy-to-blue ViitorCloud brand gradient (from #0B2A5B on the left to #2E6BD6 on the right). Brand accent colour: #FFB14E (amber). Primary text colour: white.
Headline (top-left, large, bold, verbatim): "{{HEADLINE}}". Accent the single most important 1-3 word phrase of the headline in #FFB14E; keep the rest white.
Subhead (smaller, directly below the headline, light grey-white, verbatim): "{{SUBHEAD}}".
RIGHT-SIDE TOPIC ICON (REQUIRED and DYNAMIC): on the right third of the banner, draw a tasteful, modern, minimal FLAT LINE-ART illustration that specifically represents THIS article's topic and title ("{{HEADLINE}}"). Pick the imagery from the actual subject matter, for example: a cloud with a gear for cloud/SaaS engineering, a shield for security, a dashboard with line and bar charts for analytics, a stethoscope or heart-rate line for healthcare, a bank or coins for finance, a robot or neural nodes for AI. The icon MUST visibly change from article to article to match the topic. Render it as clean line-art in #FFB14E and white on the gradient; keep it balanced, not filling the whole right side.
Do NOT draw any logo, brand icon, or wordmark anywhere. Leave the lower-left corner as clean empty background (a real logo is composited there afterward).
Bottom-right corner: the URL "www.viitorcloud.com" as small plain text.
No em-dashes anywhere. Crisp, correctly-spelled text. No watermarks.
Generate the image ONCE with a single image_gen call. Do not iterate, validate, critique, or regenerate. Immediately save the result into the current working directory as "{{SAVE_NAME}}" and stop.
