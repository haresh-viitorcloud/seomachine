# EveryCRED — Blog Featured Banner Prompt (Codex image_gen)

This file is the **live** prompt used to generate EveryCRED blog featured banners via the
Codex CLI `image_gen` skill. `app/src/services/codexImageService.js` reads it at generation
time, so editing the wording below changes the banner — **no code change or server restart
needed** (only the text after the `---PROMPT---` marker is sent to Codex).

Runtime placeholders (substituted before the prompt is sent):
`{{HEADLINE}}` = post title · `{{SUBHEAD}}` = short meta-description subtext ·
`{{WIDTH}}`/`{{HEIGHT}}` = generation size · `{{SAVE_NAME}}` = output filename.

Final banner size is **1200×630** (the code resizes the generated image to this). The real
`logo.svg` is composited into the lower-left by code afterward — so the prompt must NOT draw
any logo. If this file is missing, the code falls back to its built-in default prompt.

EveryCRED is a verifiable-credentials / digital-identity platform (tamper-proof digital
certificates, credential wallets, instant verification, blockchain-anchored trust) serving
education, healthcare, and workforce credentialing.

---PROMPT---
Use the imagegen skill's built-in image_gen tool to generate ONE professional, trustworthy B2B SaaS blog featured banner. Landscape {{WIDTH}}x{{HEIGHT}}, modern FLAT vector style (not photorealistic, no 3D), with very generous negative space. The final crop is 1200x630.
Background: a clean, flat, very light cool off-white (#F5F7FB) with at most one faint, subtle pale-blue shape for depth — keep it light, bright and uncluttered. Brand accent colour: deep navy blue #1E4383. Primary text colour: near-black (#111827); line-art colour: navy #1E4383.
Headline (upper-left, large, bold, tight geometric sans-serif, verbatim): "{{HEADLINE}}". Set it on 2-3 lines. Accent the single most important 1-3 word phrase of the headline in #1E4383; keep the rest near-black. Do not change, abbreviate, or re-spell any word.
Subhead (smaller, directly below the headline, medium grey, verbatim): "{{SUBHEAD}}".
RIGHT-SIDE TOPIC DIAGRAM (REQUIRED and DYNAMIC): on the right ~40% of the banner, draw a tasteful minimal "connected diagram" of clean icons that specifically represent THIS article's topic and title ("{{HEADLINE}}") through EveryCRED's world of verifiable credentials and trust. Infer the subject and pick matching imagery, for example: a certificate or diploma with a seal/ribbon, a digital ID card, a verification checkmark badge, a shield or padlock for security, a QR code for instant verification, linked blockchain cubes/nodes for tamper-proof anchoring, a credential wallet, a graduation cap for education, an institution/building, a nurse/medical cross or clipboard for healthcare credentialing. Draw them mostly as thin navy OUTLINE line-art (1.5–2px strokes) with a FEW selective SOLID navy filled accents (e.g. one filled checkmark badge or seal) for emphasis. Arrange 4–7 icons and connect them with THIN DASHED connector lines meeting at small circular node dots, forming a light trust/verification network (often radiating from one central credential). Scatter a few tiny dots and small "+" marks for accent. Keep it airy and balanced — never fill the whole right side, never make it busy or dark. The diagram MUST visibly change from article to article to match the topic.
Do NOT draw any logo, brand icon, wordmark, or the word "EveryCRED" anywhere. Leave the lower-left corner as clean empty background (a real logo is composited there afterward).
Bottom-right corner: the URL "everycred.com" as small plain grey text.
No em-dashes anywhere. Crisp, correctly-spelled text. No watermarks. No photographic elements.
Generate the image ONCE with a single image_gen call. Do not iterate, validate, critique, or regenerate. Immediately save the result into the current working directory as "{{SAVE_NAME}}" and stop.
