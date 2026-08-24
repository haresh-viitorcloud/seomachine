# ViitorX Style Guide

Writing conventions, formatting standards, and editorial rules for all ViitorX content published on viitorx.com.

**What this file is.** The mechanics of *how* a ViitorX article is written: person, sentence style, punctuation, subheading craft, banned constructions. The mechanics of *what* gets optimised (keywords, word count, links, meta, RankMath) live in `context/seo-guidelines.md`. Positioning, offerings, and proof points live in `context/features.md`.

**Authority.** These rules are derived from the standing ViitorX article prompts (research prompt and write prompt) used for every commissioned article. Where this guide and a generic best practice disagree, this guide wins.

**Note on this document's own prose.** The rules below govern *published article copy*. Internal context files like this one use em dashes and longer paragraphs freely. Do not copy the style of this file into an article.

---

## The Non-Negotiables

Ten rules that a draft is rejected for breaking. Everything else in this guide is elaboration.

1. **No em dashes or en dashes anywhere in article copy.** Use a comma, colon, semicolon, full stop, or brackets. This is the single most reliable AI tell.
2. **Never write "I".** The author byline is the CEO or CTO, but the voice is always **"we"**.
3. **No "Not just X, but Y"** and no **"We don't just X; we Y"**. These constructions are banned outright, in every variation.
4. **No metaphors, idioms, or analogies to explain a straightforward thing.** Write literally.
5. **One link per paragraph, maximum.** Never two.
6. **Never cite, name, or use an example or case study from a competitor or a same-level company.** Every example comes from ViitorX's own work.
7. **Never state or imply price** until the Engagement Model section of `context/features.md` is filled in.
8. **Do not name target countries directly.** See *Geography and Audience Signals*.
9. **Bullet lead-ins end with a colon, never a full stop.**
10. **Every claim of capability is backed by a named ViitorX project.** No generic boasting.

---

## Voice and Person

### The "We" Rule

Articles are published from the author account of **Rohit Purohit (Founder & CEO)** or **Vishal Rajpurohit (Co-Founder & CTO)**. The article must read as first-party expertise from the studio, because content that only restates what other authority sites already say does not rank.

- **Always "we"**: "We have delivered 100+ projects." "In our work with Adani, we found that..."
- **Never "I"**: no first-person singular, even though a named individual holds the byline.
- **Never "ViitorX believes"** in the third person about ourselves. We are the ones speaking.
- **Never "one might consider"** or other impersonal hedging.

### Confident and Persuasive, Not Promotional

The article should read like a studio that has done the work 100 times explaining how it actually goes. That means:

- State findings as findings: "Experience centres fail at the content-refresh stage, not the build stage."
- Do not hedge a position we hold: cut "arguably", "it could be said", "in many cases perhaps".
- Do not oversell either: no superlatives about ourselves ("India's leading", "world-class", "unmatched").
- Persuasion comes from specificity. "Adani's mining crews rehearse a roof collapse in VR" persuades. "We deliver cutting-edge immersive solutions" does not.

### Sound Like a Practitioner, Not a Researcher

Google discounts articles that are visibly assembled from other people's authority pages. Two habits fix this:

- **Lead with our own observation, then support it.** Not the other way round.
- **Never signpost research.** Cut "studies show", "according to industry experts", "research suggests" unless it directly precedes one of the two permitted authority citations.

---

## Sentence-Level Style

### Plain English Standard

ViitorX follows the Plain English movement standards.

| Rule | Target |
|---|---|
| Average sentence length | 15 to 18 words |
| Maximum sentence length | 25 words, then break it |
| Active voice | 85% or higher |
| Reading level | Grade 8 to 10 (Flesch-Kincaid) |
| Paragraph length | 2 to 3 sentences, 4 absolute maximum |

### Write Literally

The write prompt is explicit: literal, matter-of-fact, direct actions rather than narrative description.

- Correct: "The headset records how long the trainee took to isolate the valve."
- Wrong: "The headset becomes a silent examiner, watching every hesitation."

- Correct: "Visitors touch the wall and the exhibit responds."
- Wrong: "The wall comes alive under a visitor's fingertips, whispering its story."

### No Contrasting Metaphors for Simple Tasks

Banned pattern: explaining an ordinary operation through an unrelated image.

- Wrong: "Think of the CMS as the beating heart of the experience centre."
- Wrong: "An experience centre without measurement is a symphony with no audience."
- Correct: "The CMS is where the museum's team swaps exhibit content after launch."

### Transitions

Prompt instruction: no dramatic transitions. The repo's scrubber (`data_sources/modules/content_scrubber.py`) also flags a specific set of adverbs as AI filler.

**Do not use**: Moreover, Furthermore, Additionally, Consequently, Nevertheless, Nonetheless, Henceforth, Thereby.

**Do not use**: "But here's the thing:", "And that's where it gets interesting.", "Here's the problem.", "Let that sink in."

**Use instead**: plain connectors where genuinely needed (and, but, so, because, then, that is why), or no connector at all. A short declarative sentence needs no runway.

---

## Banned Constructions and AI Slop

### Structural Bans

| Banned | Why | Write instead |
|---|---|---|
| "Not just X, but Y" | Named in the prompt | State Y directly |
| "We don't just build experience centres; we build memory." | Named in the prompt | "We build experience centres that report their own engagement data." |
| "It's not about X. It's about Y." | Same family | Say what it is about |
| "X isn't a nice-to-have. It's a necessity." | Same family | Say why it is required |
| Rule-of-three flourishes ("engage, inspire, transform") | Reads as generated cadence | One precise verb. Note: "engage, measure and scale" is permitted, it is verbatim site copy |
| Rhetorical question as a subheading opener | Filler | Open with the finding |
| "In conclusion," | Scrubbed automatically | Just start the conclusion |

### Banned Vocabulary

**Auto-replaced by the scrubber, so do not write them**: leverage, utilize, delve into, dive into, "it's important to note that", "in today's fast-paced/digital/modern landscape", "at the end of the day", "without further ado", "this comprehensive guide", "it's worth mentioning".

**Banned on top of that**: game-changer, revolutionise, transformative, unlock, harness, seamless, robust, cutting-edge, state-of-the-art, next-level, elevate, supercharge, empower, holistic, synergy, paradigm shift, tapestry, realm, landscape (figurative), journey (figurative), "navigate the complexities", "testament to", "in the ever-evolving world of", "when it comes to", "the bottom line is".

**Banned intensifiers**: very, really, actually, truly, incredibly, extremely, undoubtedly, literally.

### Scrub Pass

Run `/scrub [file]` on every draft before review. It removes invisible Unicode watermarks, replaces em dashes, and strips the phrase list above. Passing the scrubber is the floor, not the ceiling: it cannot catch banned metaphors, "Not just X but Y", or an "I" that slipped in. Read the draft after scrubbing.

---

## Punctuation and Mechanics

### Dashes

- **Em dash and en dash: banned in article copy.** No exceptions.
- **Hyphen (-)**: correct and expected in compound modifiers (simulation-based learning, projection-mapped surfaces, work-at-height training, AI-personalised).
- Replacement guide when you would have reached for an em dash:
  - Parenthetical aside: use commas or brackets
  - Two joined independent clauses: use a semicolon or two sentences
  - Dramatic pause: use a full stop
  - Attribution or a label before detail: use a colon or comma

### Colons in Bullets

The lead-in phrase of a bullet ends with a **colon**, never a full stop.

```markdown
- **Competency scoring**: every trainee attempt is scored against the same rubric
- **Compliance reporting**: the safety officer gets an auditable record without chasing paperwork
```

Not:

```markdown
- **Competency scoring.** Every trainee attempt is scored.
```

### Other Punctuation Decisions

| Item | Decision |
|---|---|
| Oxford comma | **No.** "concept, build and measurement" matches the site's own copy ("engage, measure and scale") |
| Quotation marks | Straight quotes in markdown source. Do not paste curly quotes from Word |
| Quote punctuation | British placement: punctuation outside the quote unless part of the quotation |
| Exclamation marks | Never in body copy |
| Ellipses | Avoid. Only for genuinely omitted text inside a quotation |
| Ampersand | Only inside proper names ("Event & Brand Activation", "Museum of Art & Photography"). Otherwise "and" |
| Semicolons | Sparingly. Two short sentences usually read better |

### Numbers

- Spell out one to nine; numerals for 10 and above.
- Always numerals for: percentages (92%), money, measurements, counts in stats lines (100+ projects), dimensions, years.
- Comma separator at four digits and above: 1,200 attendees.
- Spell the scale word: 1.2 million, not 1,200,000.
- Round for readability in prose. Exact figures belong in tables.
- Never invent a number. If a figure is not in `context/features.md` with a `[SITE]` or `[PROFILE]` marker, do not publish it.

### Dates and Time

- **Date format**: 24 August 2026 (day, month, year, no ordinal suffix, no comma).
- Never use numeric-only dates in copy (08/24/26 is ambiguous across our audiences).
- **Time**: 24-hour clock where a time is genuinely needed (15:00). Prefer duration over clock time ("within 24 hours").
- Month and year for project timing: "delivered in March 2025".

### Currency

- Content must not state or imply price. When a currency figure is unavoidable and approved, use INR with the symbol and no space for domestic figures and USD for international, and state which.

---

## Spelling and Terminology

### The Spelling Decision

**Body copy uses British-influenced Indian English.** This matches viitorx.com. `context/features.md` deferred this decision to this file; it is now settled.

- centre, not center
- organise, personalise, optimise, prioritise, realise (s, not z)
- programme (an initiative), program (software)
- catalogue, dialogue, analogue
- travelling, modelling, labelled (double l)
- licence (noun), license (verb)
- Prefer "toward", "among", "while" for plainness. Never "whilst".

**The exact-match keyword exception.** Where keyword research targets a US spelling, that spelling is preserved verbatim in the SEO title, URL slug, meta description, and the H2 that carries the keyword. Both "experience centre" (700/mo) and "experience center" (700/mo) are live targets. Do not "correct" a keyword phrase into house spelling; it breaks the exact-match signal. Elsewhere in the article, house spelling applies. See `context/target-keywords.md`.

### Offering Names: Use Them Exactly

These are the section headings on `/offerings/` and the WordPress category names. **Verified against the live page on 24 August 2026.** They use US spelling and plural forms, and they are proper names: reproduce them exactly, including when house spelling elsewhere would say "Centres".

| Correct (verbatim from `/offerings/`) | Do not write |
|---|---|
| **Immersive Experience Centers** | Immersive Experience Centres, experience hubs, XR centres |
| **Simulation-Based Learning** | VR training solutions, simulation training suite |
| **Event & Brand Activations** | Event & Brand Activation (singular), experiential marketing services |
| **Digital Brand Experience** | Digital Experiences, digital solutions, web experiences |

Each offering has three named sub-capabilities on the page. Use these when describing scope:

- **Digital Brand Experience**: Websites, Digital Storytelling, Mobile
- **Immersive Experience Centers**: Space & Narrative Design, Content & Ongoing, Technology & Installations
- **Event & Brand Activations**: Brand & Activation Design, Expo & Event Production, Measurement
- **Simulation-Based Learning**: VR Training Modules, Learning Design, Tracking & Integration

The four industry names on `/industries/` are also proper names: **Museums & Cultural Institutions**, **Events, Expos & Brand Activations**, **Corporate Brand & Visitor Centres**, **Government Heritage & Tourism**. Note that this page spells it "Centres" while `/offerings/` spells it "Centers". Both are correct in their own context because both are proper names. Do not normalise either.

### Capitalisation

- **Headlines, H1, H2, H3**: **Title Case**, capitalising major words. This matches the newspaper-headline requirement below.
- **Body copy**: sentence case.
- **Offering names**: capitalised as proper nouns (see table above).
- **Generic industry terms**: lower case (immersive technology, projection mapping, digital twin, spatial audio, holography, experience centre when generic).
- **Brand**: ViitorX. One word, capital V, capital X. Never Viitorx, VIITORX, or Viitor X. Parent group: ViitorCloud.
- **ALL CAPS**: only for standard acronyms.

### Acronyms

Spell out on first use with the acronym in brackets, then use the acronym.

- VR (Virtual Reality), AR (Augmented Reality), XR (Extended Reality), MR (Mixed Reality)
- CMS (Content Management System), AV (Audio Visual), CV (Computer Vision)
- ISO 27001: never expanded, written as-is
- **No expansion needed**: SEO, URL, CTA, AI, 3D, API, ROI, B2B

**Latin abbreviations**: avoid. Write "for example" not "e.g.", "that is" not "i.e.", and end lists properly rather than with "etc.".

### Preferred Terms

| Say this | Not that |
|---|---|
| experience centre | experience zone, immersive room |
| visitor | user (for physical spaces) |
| trainee / learner | user (for simulation training) |
| enquiry | lead, inquiry |
| project | engagement, deployment |
| build | solution, offering (when describing work) |
| measurement, engagement data | analytics-driven insights |
| brief | requirement gathering |
| on site | onsite |
| team | resources, manpower |

---

## Subheading Craft

This is the highest-leverage section in this guide. The write prompt requires subheadings written **like a headline in The Times of India or The New York Times**: specific, active, carrying real information, and creating enough tension that a reader wants the paragraph underneath.

### The Test

Read the subheading alone. Does it tell you something, and make you want the next line? If it only names a topic, rewrite it.

### Before and After

| Topic label (wrong) | Newspaper headline (right) |
|---|---|
| Benefits of VR Safety Training | The Safety Drill That Costs Nothing When It Goes Wrong |
| What Is an Immersive Experience Centre? | Inside an Immersive Experience Centre, the Building Does the Talking |
| Measuring Engagement | Footfall Is Not Engagement, and Museums Are Learning the Difference |
| Common Challenges | Where Experience Centres Fail: Two Years After the Ribbon Is Cut |
| Choosing the Right Partner | The Question Procurement Committees Ask Third, and Should Ask First |
| Conclusion | What We Would Build Differently Today |

### Rules

- **Title Case**, no full stop at the end.
- **6 to 12 words.** Long enough to say something, short enough to scan.
- **Concrete noun plus active verb.** No gerund-only labels ("Understanding X", "Exploring Y").
- **No question-mark subheadings** except in the FAQ section, where questions are the format.
- **Focus keyword in at least two H2s**, and where it fits, in an H3. The keyword must sit inside a natural headline, not be bolted on. If the keyword will not fit gracefully, use a close variation and put the exact phrase in a different H2.
- **No colons used as a lazy split** ("VR Training: Everything You Need to Know"). A colon is fine when the second half delivers real information, as in the table above.
- **Do not number subheadings** unless the article is genuinely sequential.
- **No clickbait.** The subheading must be honest about what follows. "The One Trick Museums Use" is banned; the newspaper standard means credible, not sensational.

---

## Paragraph and Section Architecture

The write prompt is explicit that the article must not be filled with long paragraphs that bore the reader, and that explanation under a subheading should be concise: bullet points or H3 breakdowns rather than dense prose.

### Paragraph Rules

- 2 to 3 sentences. Four is the hard ceiling.
- One idea per paragraph.
- No paragraph longer than roughly 60 words.
- Vary the opening word. Three consecutive paragraphs starting "We" reads as generated.

### Under Each H2

Choose the shape that fits, and vary it across the article:

- **Short lead paragraph, then a bulleted breakdown**: the default for capability or criteria content
- **Short lead paragraph, then two or three H3 subsections**: for a topic with genuinely distinct parts
- **Two or three short paragraphs**: for narrative or argument sections, used less often than the first two

Do not use the same shape for every section. An article of eight identically structured sections reads as a template.

### H3 Usage

- Use H3 in **some**, not all, H2 sections. Roughly two to four H3s across the article.
- Never skip a level (H2 to H4).
- H3s follow the same newspaper-headline rules, slightly shorter.
- If an H3 has fewer than two sentences under it, it should have been a bullet.

### Bullet Discipline

The prompt says bullets only when needed and only if necessary. A bulleted list earns its place when the items are genuinely parallel and non-sequential.

- 3 to 6 items per list. Two items is a sentence; more than seven is a table.
- Parallel grammar across every item in the list.
- **Bold lead-in plus colon, then the explanation** for capability or criteria lists.
- One line per bullet where possible. Two maximum.
- Never nest more than one level deep.
- Never place two bulleted lists back to back without prose between them.
- Do not bullet the introduction or the conclusion.

**Numbered lists**: only for genuinely sequential steps or a ranked order. Format `1.` with a full stop after the numeral.

---

## Links as Style

Link mechanics and quotas are in `context/seo-guidelines.md`. What belongs here is how a link reads.

### Natural Anchors Only

The anchor is a phrase inside a sentence that was going to be written anyway. Never announce the link.

- Correct: "Crews at the Adani Centre of Excellence rehearse roof-collapse response in VR before they see the pit."
- Wrong: "You can review our Adani case study here."
- Wrong: "Check out our simulation-based learning page to learn more."
- Wrong: "Click here", "read more", "learn more", "this article", "see this page".

### Rules

- **One link per paragraph. Never two.** This applies to internal and external links together, not separately.
- Links spread across different sections. Never clustered in one paragraph or one section.
- Anchor text 2 to 6 words, descriptive, keyword-relevant where natural.
- Never link the same page twice in one article.
- Vary anchor text across articles for the same destination.
- **The problem statement in the opening carries a link.** Prompt requirement: the problem definition at the top should link out, so the reader has somewhere to go from the first idea in the article.

---

## Proof, Evidence and Claims

### Name Real Work

Every capability claim is anchored to a named ViitorX project. There are 33 published case studies at `/case-studies/`. The highest-authority references, in order of institutional weight:

Noida International Airport, Museum of Art & Photography (MAP), CSMVS Mumbai, Adani Centre of Excellence, G20 Culture Working Group, Swachh Bharat Mission, Varanasi Ropeway, Kaziranga National Park.

Match the reference to the audience: museums and government audiences get MAP, CSMVS, G20 and Swachh Bharat; industrial audiences get Adani and DMS; brand audiences get PwC, Clase Azul and Biocon.

### The Competitor Ban

**Never cite, name, quote, or use an example or case study from a competitor or a same-level company.** No Tagbin, no Fusion VR, no peer studio, no "as one leading agency did". This includes:

- Naming them as an example of good or bad practice
- Citing their blog as a source
- Describing their project as an industry illustration

Competitor intelligence in `context/competitor-analysis.md` is for deciding *what to write about and how to beat it*, never for citation in published copy. Illustrations of the wider market should be generic and unattributed, or drawn from our own work.

### Claims That Need Sign-Off

- **Price**: banned entirely until the Engagement Model section of `context/features.md` is completed. Direct cost-intent readers to the contact form.
- **92% client satisfaction and 96% success rate**: marked `[TO CONFIRM]`. Do not publish externally. **Safe to use: "100+ projects" and "10+ years".**
- Any statistic not carrying a `[SITE]` or `[PROFILE]` marker in `context/features.md`.

---

## Geography and Audience Signals

Prompt requirement: **do not directly mention the names of target countries.** Integration should be subtle.

### What This Means

- Wrong: "For manufacturers in the UAE, VR safety training reduces..."
- Wrong: "Museums across Southeast Asia are adopting..."
- Correct: "Regulators increasingly ask for an auditable training record before a high-risk site signs off."
- Correct: "Institutions running heritage sites under public procurement face a specific version of this problem."

Signal the audience through **sector, institution type, regulatory context, scale, and buying process**, not through country names. A procurement officer at a state museum recognises their own situation described accurately; they do not need their country named.

### The Exact-Match Keyword Exception

Some live target keywords contain a geography ("vr companies in india", "ar vr company in india"). Where such a keyword is the article's focus keyword, the phrase is used as-is in the title, slug, meta description and the required keyword placements, because the exact match is what ranks. The prohibition applies to **audience-targeting statements in body copy**, not to a keyword phrase that happens to contain a place name.

> `[TO CONFIRM]` If the intent of the original instruction was to exclude geo-keyword phrases as well, geo-bearing keywords in `context/target-keywords.md` should be dropped from the P1 set. Confirm before the first geo-keyword article is commissioned.

---

## CTA Style

Prompt requirement: a CTA for ViitorX immediately **before the conclusion**, natural, backed by real case-study and capability data, and not reading as a sales pitch.

### Placement

Last section before the conclusion. Never in the introduction, never repeated, never a standalone banner line mid-article.

### Construction

A ViitorX CTA is a short paragraph that does three things in order:

1. **Names a comparable project we have delivered**, specific to the reader's segment.
2. **States the capability plainly**, without adjectives.
3. **Gives the next step as a conversation**, not a purchase.

**Example (museum and heritage audience):**

> We built four interactive experiences for "Networks of the Past" at CSMVS Mumbai and a holographic conservation experience for Kaziranga National Park, both with visitor-engagement reporting handed to the institution's own team. If you are scoping something similar, tell us the brief and we will come back within 24 hours with how we would approach it.

### Rules

- **The next step is an enquiry or a consultation, never a trial or a signup.** ViitorX is a project-based studio.
- Site-verified CTA lines are available in `context/features.md` and are preferred for consistency: "Tell us your idea and we will build the experience." "Let's Create Something Bold."
- The 24-hour response commitment is site-verified and may be stated.
- No urgency manufacture, no scarcity, no "book now before".
- No price, no package, no tier.
- The CTA paragraph follows the one-link rule: one link, and it is usually the contact page or the single most relevant offering page.

---

## Formatting Standards

### Text Emphasis

- **Bold**: key terms on first definition, and bullet lead-ins. Roughly 8 to 12 bold instances in a 1,500-word article. If a paragraph has three bold phrases, it has none.
- *Italics*: sparingly, for titles of works and exhibition names ("Networks of the Past"). Not for emphasis.
- **Underline**: never. Reserved for links.
- No emoji in article copy.

### Images

- One image minimum, with the **focus keyword in the alt text** (RankMath requirement).
- Alt text describes what is shown, 125 characters or fewer, no "image of" or "photo of".
- Descriptive filenames: `immersive-experience-centre-touch-wall.jpg`, never `IMG_4821.jpg`.
- **Captions**: optional, used only when the image needs context the body does not give. Sentence case, full stop only if a complete sentence, placed below the image.
- Placement: after the concept has been explained, not before.

### Callouts

Use a markdown blockquote, sparingly, at most twice per article, for a genuine practitioner note.

```markdown
> In our experience, the content-refresh plan is what separates an experience centre that still works in year three from one that does not.
```

Do not use callouts to restate a paragraph, and do not use them for CTAs.

### Tables

Use a table when comparing three or more things across two or more attributes. Keep to four columns maximum for mobile. Give every column a header. Do not use a table where a short list works.

### Code and Technical Elements

Inline backticks for URLs, filenames and technical identifiers. Fenced blocks with a language identifier for anything multi-line. Rare in ViitorX content.

---

## Accessibility

- Descriptive link text, never "click here".
- Alt text on every image. Note the site's own client logo wall currently ships empty `alt` attributes, flagged as a `[TO CONFIRM]` fix in `context/features.md`.
- Proper heading hierarchy with no skipped levels.
- Define technical terms on first use.
- Gender-neutral language throughout. Use "they" for a person whose pronouns are unknown. Prefer role nouns (the safety officer, the curator, the procurement lead).
- No idioms, which also serves readers across our varied audiences.

---

## Tone by Content Type

The voice does not change. The emphasis does.

| Content type | Emphasis |
|---|---|
| Offering and capability articles | Outcome first, then how it is built, then the measurement layer |
| Industry and segment articles | The buyer's constraint (procurement, safety compliance, footfall targets), then our delivered answer |
| Cost and ROI articles | The business case and what gets measured. **No price.** Cost structure only, and only what is already published |
| Technology explainers | Plain definition, why it matters commercially, one named project |
| Case-study-adjacent articles | Brief, constraint, what we built, what it now reports |

---

## Editing Checklist

Run in order. The first pass is mechanical, the second is judgement.

### Pass 1: Mechanical

- [ ] `/scrub [file]` run and passed
- [ ] Zero em dashes and zero en dashes
- [ ] Zero instances of "I"
- [ ] No "Not just X, but Y" or "We don't just X; we Y" in any variation
- [ ] No banned vocabulary (leverage, seamless, game-changer, delve, elevate, robust, and the rest of the list)
- [ ] No banned transitions (Moreover, Furthermore, Additionally, Consequently, Nevertheless)
- [ ] Every bullet lead-in ends with a colon, not a full stop
- [ ] British-influenced Indian English throughout, except inside exact-match keyword phrases
- [ ] Offering names exactly as in the offering-names table
- [ ] ViitorX spelled correctly everywhere
- [ ] Dates as 24 August 2026
- [ ] No Oxford commas

### Pass 2: Judgement

- [ ] No paragraph over four sentences or roughly 60 words
- [ ] Every subheading passes the newspaper-headline test
- [ ] Section shapes vary; not eight identical sections
- [ ] H3s used in some sections, not all, and never skipping a level
- [ ] Bullets used only where genuinely needed, and parallel in grammar
- [ ] No metaphors or analogies explaining simple things
- [ ] One link per paragraph, maximum, spread across sections
- [ ] The opening problem statement carries a link
- [ ] No anchor text announces itself ("check this", "read more")
- [ ] Every capability claim names a real ViitorX project
- [ ] Zero competitor names, examples or citations
- [ ] No price stated or implied
- [ ] No 92% or 96% figures
- [ ] No target country named in body copy
- [ ] CTA sits immediately before the conclusion, is project-backed, and asks for an enquiry
- [ ] Opening holds the reader; the first two sentences do real work
- [ ] The article has a logical through-line, not a set of standalone sections
- [ ] Reads as our own expertise, not as assembled research

### Pass 3: Handoff

Two more checklists run before publishing:

- **Voice**: `context/brand-voice.md` checks whether the article sounds like a practitioner describing delivered work, leads with outcome over technology, and earns its persuasion through specifics.
- **SEO**: `context/seo-guidelines.md` checks keyword counts, density, RankMath score, meta elements, word count, links, tags and category.

A draft can pass both passes above and still fail the voice check by being mechanically clean but generic. Read the "Not Our Voice" example in `context/brand-voice.md` if a draft feels correct yet says nothing.

---

## Related Files

| File | What it governs |
|---|---|
| `context/seo-guidelines.md` | Keywords, word count, links, meta, RankMath, taxonomy, research workflow |
| `context/features.md` | Offerings, proof points, named work, messaging, what is safe to claim |
| `context/brand-voice.md` | Voice pillars, tone by content type, core messages, value propositions by segment, audience understanding, voice examples |
| `context/target-keywords.md` | Live keyword targets and spellings to preserve |
| `context/competitor-analysis.md` | Strategy input only. Never a citation source |
| `context/internal-links-map.md` | Link targets and anchor inventory |

---

## Maintenance

**Version**: 2.0 (first ViitorX-specific edition, replacing the imported template)
**Last updated**: 24 August 2026
**Derived from**: the standing ViitorX article research and write prompts
**Next review**: when the Engagement Model section of `context/features.md` is completed, which unblocks pricing and cost content

Open items:

- `[TO CONFIRM]` Whether the target-country prohibition also excludes geo-bearing keyword phrases
- Once pricing is approved, add a currency and price-presentation section here

If you hit a style question this guide does not answer, make the call, apply it consistently in the draft, and add it here.
