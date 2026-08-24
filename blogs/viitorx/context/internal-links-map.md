# ViitorX Internal Links Map

The complete inventory of linkable viitorx.com URLs, with guidance on when to link to each and what anchor text to use.

**Source**: live crawl of `https://viitorx.com/sitemap_index.xml` and its three child sitemaps (`page-sitemap.xml`, `post-sitemap.xml`, `case_study-sitemap.xml`), plus the rendered `/offerings/` and `/industries/` pages. Pulled **24 August 2026**.

**Inventory**: 5 pages, 29 blog posts, 32 case studies plus the `/case-studies/` archive.

**Companion files**: `context/seo-guidelines.md` for link quotas and placement rules, `context/style-guide.md` for how anchor text must read.

---

## The Linking Rules That Apply Here

From the standing write prompt. These are hard constraints, not preferences.

1. **One link per paragraph. Never two.** Internal and external links count together.
2. **Spread links across different sections.** Never cluster them in one paragraph or section.
3. **The opening problem statement carries a link.**
4. **Natural anchors only.** Never "you can review this", "check this out", "read more", "click here".
5. **Never link the same URL twice** in one article.
6. **Target 4 to 6 internal links** in a 1,500-word article, plus exactly 2 external authority links.
7. **Never link to a competitor.** See `context/competitor-analysis.md` for who they are.

---

## Structural Constraint: There Are No Service Sub-Pages

**This is the single most important fact in this file.** The write prompt asks for "links from ViitorX services", but the site does not have per-service pages.

- `page-sitemap.xml` contains exactly **5 URLs**: `/`, `/offerings/`, `/blog/`, `/industries/`, `/contact-us/`.
- The four offerings are H2 sections on the single `/offerings/` page.
- The four industries are H2 sections on the single `/industries/` page.
- **Neither page has anchor IDs on its section headings**, so `/offerings/#simulation-based-learning` does not work. Verified in the rendered HTML.

**What this means in practice.** There is one service URL to link to, and the no-duplicate-links rule means you can use it once per article. Therefore **the bulk of internal linking must come from case studies and blog posts**. A case study is usually the better link anyway: it is specific, it proves the claim being made, and it satisfies the prompt's requirement that the article demonstrate our own delivered work rather than researched information.

**Recommended link mix for a 1,500-word article:**

| Link type | Count | Source |
|---|---|---|
| Case study proving a named claim | 2 to 3 | `/case-studies/...` |
| Related blog post (topic cluster sibling) | 1 to 2 | `/blog/...` |
| Service or industry page | 1 | `/offerings/` or `/industries/` |
| Contact page, in the CTA before the conclusion | 1 | `/contact-us/` |

> `[TO CONFIRM]` **Recommended site fix**: add anchor IDs to the four offering sections and the four industry sections (`/offerings/#simulation-based-learning`, `/industries/#museums-cultural-institutions`, and so on). That would turn 2 linkable service URLs into 10 and materially improve internal link distribution. Until then, the constraint above stands.

---

## Core Pages

### Homepage
**URL**: `https://viitorx.com/`
**Last modified**: 17 August 2026

- **When to link**: brand-level mentions, or when referring to the studio as a whole. Use sparingly. In most articles the homepage is a weaker choice than a case study.
- **Anchor examples**: "the studio we built for immersive work", "ViitorX"
- **Note**: the site's own positioning line is "ViitorX designs immersive experience centres, VR training, 3D websites and event activations that engage, measure and scale."

### Offerings
**URL**: `https://viitorx.com/offerings/`
**Last modified**: 13 July 2026
**Page heading**: "Worlds We Build For You"

The only service page. Covers all four offerings and their twelve sub-capabilities.

- **When to link**: once per article, when the reader needs the full capability picture rather than one project.
- **Anchor examples**: "the four offerings we build across", "our simulation-based learning work", "immersive experience centre builds", "brand activation production"
- **Contains**: Digital Brand Experience (Websites, Digital Storytelling, Mobile) · Immersive Experience Centers (Space & Narrative Design, Content & Ongoing, Technology & Installations) · Event & Brand Activations (Brand & Activation Design, Expo & Event Production, Measurement) · Simulation-Based Learning (VR Training Modules, Learning Design, Tracking & Integration)

### Industries
**URL**: `https://viitorx.com/industries/`
**Last modified**: 22 June 2026
**Page heading**: "Where We Belong"

- **When to link**: segment-specific articles, where the reader wants to see we work in their sector.
- **Anchor examples**: "the sectors we build for", "our museum and cultural institution work", "government heritage and tourism projects"
- **Contains**: Museums & Cultural Institutions · Events, Expos & Brand Activations · Corporate Brand & Visitor Centres · Government Heritage & Tourism
- **Gap**: there is no industry section for enterprise or industrial training, despite deep proof in mining, healthcare and safety. Flagged in `context/features.md` as a landing-page opportunity.

### Case Studies Archive
**URL**: `https://viitorx.com/case-studies/`
**Last modified**: 14 August 2026

- **When to link**: when referencing the breadth of delivered work rather than one project. Prefer an individual case study when making a specific claim.
- **Anchor examples**: "the projects we have delivered", "our published project work"
- **Note**: 32 individual case studies sit beneath this.

### Blog
**URL**: `https://viitorx.com/blog/`
**Last modified**: 29 June 2026

- **When to link**: rarely. An individual post is almost always the better target.

### Contact
**URL**: `https://viitorx.com/contact-us/`
**Last modified**: 22 June 2026

- **When to link**: the CTA section immediately before the conclusion. Once per article.
- **Anchor examples**: "tell us the brief", "send us the scope", "start the conversation"
- **Site-verified commitment**: response within 24 hours. The contact form's project-type options are the four offering names.
- **Never**: link this more than once, or use it as a mid-article interruption.

---

## Case Studies by Offering

32 case studies. **Always prefer a case study over a generic capability claim.** Grouped by the offering they best support.

### Simulation-Based Learning

| Case study | URL slug | Link when writing about |
|---|---|---|
| DMS VR mining training simulator | `/case-studies/dms-vr-training-mining-simulator/` | Mining safety, high-risk procedural training, industrial VR |
| Adani immersive mining training | `/case-studies/immersive-mining-training-adani/` | Enterprise training at scale, phygital learning, mining education |
| Work-at-height VR safety training | `/case-studies/work-at-height-vr-safety-training/` | Fall-risk training, safety compliance, construction |
| PEG-tube VR medical training | `/case-studies/peg-tube-vr-medical-training-simulation/` | Clinical skills, medical procedural training, healthcare |
| VR teacher simulation training | `/case-studies/vr-training-teacher-simulation/` | Soft-skills training, education sector, classroom simulation |
| Haircut simulator VR training | `/case-studies/vr-training-haircut-simulator/` | Vocational training, skills certification |
| Hard-braking driving simulator | `/case-studies/hard-braking-driving-simulator/` | Driver safety, transport training, reflex training |
| JNI immersive learning health experiences | `/case-studies/jni-immersive-learning-health-experiences/` | Public health education, immersive learning design |
| Sutra VR collaboration platform | `/case-studies/sutra-virtual-reality-collaboration-platform/` | Remote collaboration, virtual meeting spaces |
| Real Assist AR remote assistance | `/case-studies/real-assist-augmented-reality-remote-assistance/` | AR field support, remote expert guidance, maintenance |

### Immersive Experience Centers

| Case study | URL slug | Link when writing about |
|---|---|---|
| Holographic digital twin, Noida International Airport | `/case-studies/holographic-digital-twin-nia/` | Digital twins, infrastructure planning, large-scale visualization. **Highest institutional authority** |
| CSMVS Mumbai digital experiences | `/case-studies/digital-experiences-csmvs/` | Museum interactives, "Networks of the Past", cultural institutions |
| Dhari Experience Centre, Gir Forest | `/case-studies/dhari-experience-centre-gir-forest/` | Forest and conservation centres, government-led experience centres |
| Varanasi Ropeway VR experience | `/case-studies/varanasi-ropeway-vr-experience/` | Infrastructure storytelling, tourism, civic projects |
| Gwalior Airport holographic digital twin | `/case-studies/gwalior-airport-holographic-digital-twin/` | Airport and transport hubs, holographic twins |
| CSCL water conservation experience | `/case-studies/cscl-water-conservation-experience/` | Smart city, civic awareness, sustainability |
| My Sari My Pride interactive museum | `/case-studies/my-sari-my-pride-interactive-museum/` | Textile and craft heritage, interactive exhibits |
| MAP interactive kiosk launcher | `/case-studies/map-interactive-kiosk-launcher-application/` | Museum kiosks, visitor-facing software |
| Shape and pattern search art installation | `/case-studies/shape-pattern-search-interactive-art-installation/` | AI draw-to-search, art discovery, gallery interactives |
| Museum digital gallery content configurator | `/case-studies/museum-digital-gallery-content-configurator/` | Post-launch content management, curator tooling |
| Museum digital greeting card app | `/case-studies/museum-digital-greeting-card-app/` | Visitor take-home engagement, museum apps |

### Event & Brand Activations

| Case study | URL slug | Link when writing about |
|---|---|---|
| Clase Azul experiential marketing | `/case-studies/clase-azul-experiential-marketing/` | Luxury brand activation, sensor-driven installations |
| PwC HoloSelfie | `/case-studies/pwc-holoselfie-hologram-employee-experience/` | Corporate events, employee experience, holographic engagement |
| Biocon tree plantation experience | `/case-studies/biocon-tree-plantation-environmental-awareness/` | Sustainability activations, LED experiences, CSR events |
| G20 Khajuraho holographic heritage | `/case-studies/g20-khajuraho-holographic-heritage/` | State pavilions, diplomatic showcases, heritage storytelling. **High authority** |
| Swachh Bharat HoloLens mixed reality | `/case-studies/swachh-bharat-hololens-mixed-reality/` | National missions, mixed reality, public campaigns. **High authority** |
| Virtual lamp-lighting ceremony, MAP | `/case-studies/virtual-lamp-lighting-ceremony-map/` | Inauguration experiences, ceremonial activations |
| Rasna Chhota Bheem quiz game | `/case-studies/rasna-chhota-bheem-quiz-game/` | Consumer brand engagement, gamified activation |

### Digital Brand Experience

| Case study | URL slug | Link when writing about |
|---|---|---|
| SoReal 3D real-estate visualization | `/case-studies/soreal-3d-visualization-real-estate-app/` | 3D product visualization, real estate, B2B sales tooling |
| Signature Global holographic real-estate marketing | `/case-studies/signature-global-holographic-real-estate-marketing/` | Property marketing, holographic showrooms |
| Cuenect digital experience platform | `/case-studies/cuenect-digital-experience-platform/` | Digital experience platforms, event tech |
| Rolefinity gamified productivity app | `/case-studies/rolefinity-gamified-productivity-app/` | Product design, gamification, app development |

---

## Blog Posts by Cluster

29 posts. Use these for topic-cluster interlinking. When writing a new article, link to the two or three siblings closest to its subject, and add a link back from the pillar where relevant.

### Experience centres cluster

| Post | URL slug |
|---|---|
| What is an immersive experience centre, benefits | `/blog/what-is-an-immersive-experience-centre-benefits/` |
| What is an immersive experience | `/blog/what-is-an-immersive-experience/` |
| Experience centre design, B2B playbook | `/blog/experience-centre-design-b2b-playbook/` |
| Experience centre cost | `/blog/experience-centre-cost/` |
| Corporate brand experience centre ROI | `/blog/corporate-brand-experience-centre-roi/` |
| Government tourism immersive centre | `/blog/government-tourism-immersive-centre/` |
| Immersive showroom design company | `/blog/immersive-showroom-design-company/` |

**Pillar candidate**: `/blog/what-is-an-immersive-experience-centre-benefits/`. Target keywords "experience centre" and "experience center" (700/mo each, KD 0).

**Caution**: `/blog/experience-centre-cost/` discusses cost structures. Content must not state or imply price beyond what that post already publishes. See `context/features.md`.

### Museums cluster

| Post | URL slug |
|---|---|
| Museum design | `/blog/museum-design/` |
| What is a digital museum | `/blog/what-is-a-digital-museum/` |
| Interactive museum exhibits | `/blog/interactive-museum-exhibits/` |
| How to increase museum footfall | `/blog/how-to-increase-museum-footfall/` |
| AR in museums | `/blog/ar-in-museums/` |
| AI in museums | `/blog/ai-in-museums/` |

**Pillar candidate**: `/blog/museum-design/`. Targets "museum design" (150/mo IN, 1,500 global, KD 9) and "digital museum" (150/mo IN, KD 7).

### VR, AR and simulation cluster

| Post | URL slug |
|---|---|
| Virtual reality development | `/blog/virtual-reality-development/` |
| VR training benefits, use cases, ROI | `/blog/vr-training-benefits-use-cases-roi/` |
| How VR safety training reduces risk in high-hazard industries | `/blog/how-vr-safety-training-reduces-risk-in-high-hazard-industries/` |
| Immersive technology, AR VR MR explained | `/blog/immersive-technology-ar-vr-mr-explained/` |

**Priority**: `/blog/virtual-reality-development/` targets "virtual reality development" (2,300/mo, KD 4), identified in `context/target-keywords.md` as the single biggest and most weakly defended prize on the board. Link to it from any VR-adjacent article.

### Exhibitions and events cluster

| Post | URL slug |
|---|---|
| Exhibition stall design, a complete guide to winning footfall | `/blog/exhibition-stall-design-a-complete-guide-to-winning-footfall/` |
| 3D exhibition stall design | `/blog/3d-exhibition-stall-design/` |
| What is experiential marketing | `/blog/what-is-experiential-marketing/` |
| 10 experiential marketing examples | `/blog/10-experiential-marketing-examples/` |
| What is brand activation, a practical guide for marketers | `/blog/what-is-brand-activation-a-practical-guide-for-marketers/` |

**Priority**: the exhibition cluster is the best opening move per `context/target-keywords.md`, roughly 3,500 searches/mo at KD 0 to 3.

### Holography, 3D and digital twins cluster

| Post | URL slug |
|---|---|
| What is a 3D hologram | `/blog/what-is-a-3d-hologram/` |
| What is a digital twin | `/blog/what-is-a-digital-twin/` |
| Projection mapping for monuments | `/blog/projection-mapping-for-monuments/` |
| Projection mapping monuments | `/blog/projection-mapping-monuments/` |
| 3D website design to increase brand engagement | `/blog/3d-website-design-to-increase-brand-engagement/` |
| 3D product visualization shortens B2B sales cycles | `/blog/3d-product-visualization-shortens-b2b-sales-cycles/` |

### Other

| Post | URL slug |
|---|---|
| Welcome to ViitorX, this is what we have built | `/blog/welcome-to-viitorx-this-what-we-have-build/` |

Brand announcement post. Low linking value. Note the slug contains a grammatical error ("this what we have build").

---

## Flagged Issues Found in the Crawl

Three problems worth fixing at source. All were found in the 24 August 2026 sitemap pull.

### 1. Keyword cannibalisation: duplicate projection-mapping posts

`/blog/projection-mapping-for-monuments/` (3 August 2026) and `/blog/projection-mapping-monuments/` (13 July 2026) are near-identical slugs targeting the same query. Two pages competing for one keyword split the ranking signal.

> `[TO CONFIRM]` **Recommended**: keep the stronger post, 301-redirect the other into it, and consolidate the content. Decide which before writing anything new on projection mapping, and link only to the survivor.

### 2. Possible overlap: immersive experience posts

`/blog/what-is-an-immersive-experience-centre-benefits/` and `/blog/what-is-an-immersive-experience/` are distinct topics in principle, the centre versus the concept. Worth an audit to confirm they are not competing for "experience centre" variants. Run `/analyze-existing` on both.

### 3. Slug error in the brand post

`/blog/welcome-to-viitorx-this-what-we-have-build/` is grammatically wrong. Low traffic value, but fix it with a redirect if the post is ever refreshed.

---

## Anchor Text Bank

Vary anchor text across articles pointing at the same URL. Repeating an identical anchor to the same destination looks manufactured.

### For case studies

Pattern: name the client or the project inside a sentence about the work.

- "the mining simulator we built for DMS"
- "crews at the Adani Centre of Excellence"
- "the holographic digital twin at Noida International Airport"
- "four interactive experiences for Networks of the Past at CSMVS"
- "the holographic heritage showcase for the G20 Culture Working Group"
- "the sensor-driven installation we produced for Clase Azul"

### For blog posts

Pattern: name the subject, not the article.

- "how VR safety training changes a high-hazard site"
- "what an experience centre actually costs to run"
- "the way museums measure footfall against engagement"
- "3D product visualization in a long B2B sale"

### Never use

- "click here", "read more", "learn more", "this article", "our blog post"
- "you can review this", "check this out", "as discussed here"
- The bare URL as anchor text
- The exact same anchor twice in one article

---

## Maintenance

**Version**: 2.0 (first ViitorX-specific edition, replacing the imported template)
**Last updated**: 24 August 2026
**Source of truth**: `https://viitorx.com/sitemap_index.xml`

**Re-crawl the sitemaps when**: new case studies or posts ship, any page is renamed or redirected, or the offering and industry pages gain anchor IDs.

Re-pull command:

```bash
for s in page-sitemap post-sitemap case_study-sitemap; do
  curl -sSL "https://viitorx.com/$s.xml" -o "$s.xml"
done
```

Open items:

- `[TO CONFIRM]` Add anchor IDs to offering and industry sections to expand the service-link inventory
- `[TO CONFIRM]` Resolve the duplicate projection-mapping posts
- No dedicated enterprise or industrial-training industry page exists, despite the deepest proof being in that segment
