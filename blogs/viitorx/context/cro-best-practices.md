# CRO Best Practices for ViitorX

Conversion optimisation guidance for viitorx.com pages, landing pages and enquiry flows.

**The conversion event is a qualified enquiry.** ViitorX is a B2B project-based studio selling high-ticket builds to museums, government bodies, enterprises and brands. There is no trial, no signup, no self-serve purchase, and no published price. Almost every standard SaaS CRO tactic either does not apply or actively backfires here.

**What changed from the previous version of this file.** It was written for self-serve SaaS: free trials, "no credit card required", "set up in 5 minutes", G2 star ratings, countdown timers, scarcity prompts and A/B tests needing 100 conversions per variant. All of that has been replaced. The reasoning is in each section, so the reasons survive the next rewrite.

---

## The Conversion Model

### Quality Beats Volume

This is the single most important difference from SaaS CRO. **Raw form-fill rate is the wrong primary metric.** One enquiry from a museum director with a funded project is worth more than fifty from students, job seekers and vendors. Tactics that lift volume while lowering qualification make the studio poorer and the dashboard prettier.

Optimise for **qualified enquiries**, and measure qualification honestly.

### Conversion Hierarchy

| Level | Event | Notes |
|---|---|---|
| **Primary** | Enquiry form submitted with a real project brief | The commercial conversion. Site promises a response within 24 hours `[SITE]` |
| **Primary** | Direct email or phone contact | contact@viitorx.com, (+91) 9274106094. Often higher intent than a form fill |
| **Secondary** | Multiple case studies viewed in one session | The clearest pre-enquiry buying signal for this business |
| **Secondary** | Offerings or industries page reached from a blog article | Content is doing its job |
| **Micro** | Project video watched to completion | |
| **Micro** | Deep scroll on a case study | |
| **Micro** | Return visit within 30 days | Committee buying produces multi-session journeys |

### The Buying Reality

Content and pages must be built for how this purchase actually happens:

- **Committee decision**, not individual. A curator, a finance lead, a procurement officer and a director all have veto power
- **Long consideration**, often quarters, sometimes tied to a budget cycle or tender window
- **The visitor is usually building an internal case**, not buying. Give them material they can forward
- **They cannot evaluate the product before it is built**, so proof of comparable delivery does the work a demo would
- **Multi-session, multi-device.** Expect them to leave, research competitors and come back

**Design implication**: the highest-value thing a page can do is make the visitor confident enough to *start a conversation*, and give them something forwardable to their committee.

---

## Current State: Live Enquiry Form Audit

Audited against the rendered pages on **24 August 2026**. These are verified findings, not assumptions.

### What Is Already Right

- **The same enquiry form (`wpcf7-f113`) is embedded on `/contact-us/`, `/offerings/` and `/industries/`.** Good practice: the visitor never has to hunt for a way to make contact
- **Only five fields.** Appropriately short
- **Phone validated properly** through a dedicated international phone field
- **The 24-hour response promise** is stated near the form, which is the correct risk reversal for this business

### Issues Found

| # | Finding | Impact | Recommendation |
|---|---|---|---|
| 1 | **The submit button reads "Submit"** | The previous version of this very file listed "Submit" as a conversion killer, correctly | Change to a value-carrying label. See CTA section below |
| 2 | **No project-type or offering field exists.** There is no `select`, `radio` or `checkbox` anywhere in the form markup | Every enquiry arrives unqualified on the most useful axis. Routing and response quality both suffer | Add an optional offering selector. This is the highest-value change on the list |
| 3 | **Fields use placeholders instead of visible labels** (`placeholder="Company"`, `placeholder="Message"`) | Placeholder text vanishes on focus, which raises error rates and fails accessibility expectations | Add persistent visible labels above each field |
| 4 | **Phone is a required field** | Real friction at first touch. An institutional buyer researching quietly may abandon rather than hand over a direct line | Make phone optional, or explain why it is needed |
| 5 | **Message is optional** | An enquiry with no brief is barely an enquiry, and is the main source of unqualified submissions | Consider making the brief required while relaxing phone |

> **Resolved against `context/features.md`.** That file previously stated the form "asks which offering the visitor is curious about", marked as site-verified. **No such field exists in the rendered markup**, and `features.md` has been corrected. The form fields are: Name (required), Company (optional), Email (required), Phone (required), Message (optional).
>
> `[TO CONFIRM]` Whether the offering selector was removed at some point or never shipped. Worth knowing before rebuilding it, in case it was dropped for a reason.

**Net recommendation on fields**: swap the friction. Require the brief, relax the phone, add optional project type. That trades a little volume for materially better qualification, which is the correct trade for this business.

---

## Above the Fold

### The Five-Second Test, Rewritten for a Committee Buyer

Within five seconds the visitor should know:

1. **What we build**, in concrete terms
2. **Who we build it for**, so they can recognise themselves
3. **That we have done it at their scale**, which is the real question
4. **How to start a conversation**

Note what is absent: pricing, urgency, and any claim to be the best. A senior institutional buyer is screening for credibility, not being sold.

### Required Elements

| Element | Purpose | Guideline |
|---|---|---|
| Headline | State what we build and for whom | Under 70 characters, literal, no metaphor |
| Subheadline | Add the outcome and the measurement angle | One or two sentences |
| Primary CTA | Start the conversation | Action verb plus object. Never "Submit" |
| Institutional proof | Establish scale immediately | A named client or a credential, not a vague count |

### Do Not

- No carousels or sliders
- No competing CTAs above the fold
- No autoplay audio
- No countdown timers, scarcity counters or urgency devices. Manufactured urgency is prohibited by `context/style-guide.md` and reads as untrustworthy to a procurement audience
- No walls of text

---

## Headlines

Landing page copy follows the same voice rules as articles. Read `context/style-guide.md` first. The bans that most often catch landing pages:

- **No em dashes or en dashes**
- **No "Not just X, but Y"** and no **"We don't just X; we Y"**
- **No "Stop X. Start Y."** The previous version of this file recommended that formula. It is a contrasting construction of exactly the banned family
- **No metaphor or flourish.** "Bring your vision to life" is banned vocabulary
- **No superlatives about ourselves.** "India's leading" is unverifiable
- **Title Case** for headlines

### Formulas That Suit This Business

**Capability plus audience:**
- "Immersive Experience Centres for Museums and Government Bodies"
- "VR Safety Training for High-Hazard Industrial Sites"

**Outcome plus evidence:**
- "Experience Centres That Report Their Own Engagement Data"
- "Training That Produces an Auditable Competency Record"

**Named proof:**
- "The Studio Behind the G20 Holographic Heritage Showcase"
- "Holographic Digital Twins for Noida International Airport"

### Weak Headlines to Avoid

- "Welcome to ViitorX"
- "The Best Immersive Solutions"
- "Bringing Ideas to Life"
- "Everything You Need for Immersive Experiences"
- Anything opening with "Our" or "We"

> **One exception.** The site's own brand line, "Ideas are invisible. Until we make them real." `[SITE]`, is established brand copy and is cleared for use. Do not generate new copy in that register.

---

## Calls to Action

### CTA Text by Goal

| Goal | Use | Avoid |
|---|---|---|
| Enquiry | "Tell Us Your Idea" | "Submit" |
| Enquiry | "Send Us the Brief" | "Contact Us" |
| Enquiry | "Start the Conversation" | "Get in Touch" |
| Consultation | "Book a Scoping Call" | "Request Info" |
| Case study | "See the Adani Build" | "Learn More" |
| Offerings | "See What We Build" | "Click Here" |

**Preferred, because they are verbatim site copy** `[SITE]`: "Tell us your idea and we will build the experience." · "Let's Create Something Bold"

### Rules

- **One primary CTA per page.** A secondary CTA is allowed only if it serves a genuinely different intent, such as viewing proof rather than enquiring
- **Never "Submit".** It describes the visitor's effort, not their gain
- **Never "Contact Us" as the button label.** Too passive for the primary action, though fine as navigation
- **No urgency, no scarcity, no "limited slots"**
- Place the response promise directly beside the button, not buried in the footer

### Placement

For a considered purchase, CTA repetition matters less than proof accumulation. Recommended:

1. **Above the fold**: primary CTA
2. **After the capability section**: proof-oriented CTA, such as a relevant case study
3. **After the proof section**: primary CTA again
4. **Closing**: primary CTA with the response promise

---

## Trust Signals

### Hierarchy for ViitorX

**Strongest.** Named institutional delivery. This is our real advantage and no competitor matches it.
- Noida International Airport, G20 Culture Working Group, Museum of Art & Photography, CSMVS Mumbai, Swachh Bharat Mission, Adani Centre of Excellence, Kaziranga National Park

**Strong.**
- **100+ projects completed** and **10+ years of experience** `[SITE]`, both cleared for external use
- **ISO 27001 certification**, which matters disproportionately in public procurement
- **33 published case studies**, the depth signal
- **ViitorCloud group backing**, which answers brand newness

**Supporting.**
- Founder is VRARA Chapter President for Ahmedabad `[PROFILE]`
- Opezee hardware partnership
- Client logo wall `[SITE]`

### Claims Discipline

Three hard limits, from `context/features.md`:

- **Never publish the 92% client satisfaction or 96% success rate figures** until methodology is confirmed. They currently appear as animated counters on the homepage and `/industries/`, which is a live compliance exposure worth resolving
- **Never state or imply price**
- **Never compare against a named competitor.** Prohibited by `context/style-guide.md`

> `[TO CONFIRM]` The homepage client logo wall ships **empty `alt` attributes**. That is an accessibility failure and it wastes the strongest trust signal on the page, since screen readers and crawlers see nothing. Fix at source.

### What We Cannot Use

Star ratings, review scores, "join 50,000 customers", live signup notifications and user counts. There is no self-serve user base to count. Substituting a vague number for a named institution is a downgrade, not a trust signal.

---

## Risk Reversal

The SaaS toolkit does not transfer. "No credit card required" and "cancel anytime" are meaningless when the next step is a conversation about a project worth many lakhs.

### What Actually Reduces Risk Here

| Concern | Reversal |
|---|---|
| "Will anyone reply?" | **Response within 24 hours** `[SITE]`. Already promised, keep it prominent |
| "Am I committing to something?" | "A scoping conversation, no obligation" |
| "Will I be sold to?" | "If we are not the right fit for this, we will say so" |
| "Is my project confidential?" | ISO 27001 certified. NDA available on request |
| "Will I get a junior?" | Founder and CTO stay close to the work from concept through delivery `[PROFILE]` |
| "Do they understand our governance?" | Delivery for G20, national missions, airports and state museums |

Place the relevant reversal directly beside the CTA. One line, not a list.

---

## Objection Handling

Mapped to the real objections documented in `context/features.md`. Use these on landing pages, in FAQ blocks and in the pre-conclusion CTA.

| Objection | Response |
|---|---|
| "We cannot justify the budget internally" | Measurement is built into every offering. Dwell time, engagement and competency data give the buyer the business case, not just the experience |
| "Immersive tech dates badly" | Post-launch content management and adaptive content are part of the build. The space is designed to be updated, not replaced |
| "Our training is dangerous and expensive to run" | Simulation-based learning reproduces high-risk procedures in VR with competency scoring and compliance reporting. Proven with Adani and DMS |
| "We are a public institution with procurement rules" | ISO 27001 certified, with delivery for G20, Swachh Bharat Mission, national airports and state museums |
| "You are a new brand" | ViitorX launched in 2026 inside the ViitorCloud group, with 10+ years and 100+ projects behind it |
| "Our buyers will never visit a physical centre" | Digital Brand Experience delivers the same narrative through 3D web and product visualization |
| "Will you subcontract this?" | Founder and CTO stay close to the work from concept through on-site delivery |
| **"What will this cost?"** | **No price may be stated.** Direct to the enquiry form and answer with cost *structure* and the business case. Blocked until the Engagement Model section of `context/features.md` is completed |

---

## Enquiry Form Design

### The Field-Count Tradeoff

Generic CRO says every extra field costs conversions, so ask for as little as possible. **That advice is wrong for this business.** A two-field form maximises submissions and fills the inbox with unqualified enquiries. Fields that help the buyer describe their project also help us qualify it, and a serious institutional buyer will complete six fields without complaint.

### Recommended Fields

| Field | Status | Notes |
|---|---|---|
| Name | Required | Currently required. Correct |
| Work email | Required | Currently required. Correct |
| Organisation | Recommended required | Currently optional. It is the strongest single qualification signal |
| Project type | **Add, optional** | The four offering names plus Other. Missing today. Highest-value addition |
| Brief or message | **Change to required** | Currently optional. An enquiry with no brief cannot be answered well |
| Phone | **Change to optional** | Currently required. Real first-touch friction |

Deliberately excluded: budget range and timeline. Neither can be asked credibly while no pricing guidance is published, and both raise abandonment at first touch. Revisit once the engagement model exists.

### Mechanics

- Single column
- **Visible persistent labels above every field.** Placeholder-only labelling is the current pattern and should change
- Inline validation on blur, not on submit
- Correct mobile input types for email and phone
- Confirmation message that restates the 24-hour promise and what happens next
- Never make the visitor scroll past the form to find the submit button

---

## Page Structure Templates

### Offering Landing Page

1. Hero: what we build, for whom, primary CTA
2. The problem in the buyer's terms
3. What is included, as concrete capability groups
4. **Measurement**: what gets reported and to whom. The differentiating section
5. Named proof: two or three relevant case studies
6. Objection handling or FAQ
7. Enquiry CTA with response promise

### Industry Landing Page

1. Hero naming the sector explicitly
2. The constraint that sector actually faces, whether procurement, footfall targets or safety compliance
3. What we have delivered in that sector, named
4. How measurement serves their reporting obligations
5. Sector-specific objections
6. Enquiry CTA

### Case-Study-Led Page

1. Institution, brief, constraint
2. What we built
3. What it now reports
4. What we would tell a similar institution
5. Enquiry CTA

> Landing pages live in `landing-pages/`. Use `/landing-write`, `/landing-audit`, `/landing-research` and `/landing-competitor`. The `cro-analyst` agent reviews against this file.

---

## Performance

### The Tension Worth Naming

ViitorX sells 3D and motion-rich websites. The portfolio has to look impressive, and impressive is heavy. The current site serves `.webm` hero video on inner pages and multiple custom `.woff2` font files. That is a legitimate design choice for a studio whose product is visual richness, and it is also a conversion cost on a mid-range phone on a mobile network.

**Resolve it deliberately rather than by accident:**

- Hold **Core Web Vitals** thresholds: LCP under 2.5s, INP under 200ms, CLS under 0.1
- Never let hero video block first paint. Poster image first, video after
- Serve a static poster instead of video on slow connections and reduced-data preferences
- Subset and preload fonts. Cap custom weights
- Lazy-load everything below the fold
- Compress to WebP or AVIF

Treat measured Core Web Vitals as the constraint. Widely quoted figures like "one second costs seven percent" are directional folklore, so do not build a business case on them.

---

## Mobile

- Design mobile first, then adapt upward
- Tap targets at least 44 by 44 px
- Body text 16 px or larger
- Full-width buttons
- Click-to-call on the phone number, since a genuine institutional enquiry may prefer to phone
- Accordion FAQs
- Front-load the institutional proof. On mobile, the logo wall may be several screens down

**Mobile caveat for this business**: a museum director may discover the site on a phone and return on a desktop to build the internal case. Both journeys must work, and the desktop return is where the enquiry usually happens.

---

## Measurement

### Why A/B Testing Does Not Apply Yet

The previous version of this file required "minimum 100 conversions per variant" and "95% statistical significance". With viitorx.com at DR 0 and 0 organic traffic per `context/target-keywords.md`, and a conversion event measured in enquiries per month rather than per hour, **a conventional A/B test would need many quarters to reach significance.** Running one anyway produces noise that looks like a result.

### Use Instead

- **Session recordings and heatmaps** to see where attention and hesitation actually land
- **Scroll and click depth** on offering and case-study pages
- **Sales-call feedback**, the highest-value input available. Ask every enquirer what page convinced them and what they still could not find
- **Enquiry quality logging.** Record segment, project type and whether it was qualified. This is the metric that matters and nothing currently captures it
- **Five to eight user interviews** with people resembling the buying committee. At this traffic level, qualitative beats quantitative
- **Before-and-after comparison** on clearly reasoned changes, accepting that attribution will be imperfect

Revisit split testing when traffic supports it. Until then, reason from evidence rather than from a test that cannot conclude.

### Instrumentation

GA4 and Search Console are wired up through `data_sources/modules/google_analytics.py` and `google_search_console.py`, and `/performance-review` reports on content performance.

**Track as conversions**: enquiry form submission, email click, phone click, case-study depth, offerings page reached from a blog article.

> `[TO CONFIRM]` Whether enquiry form submissions currently fire a GA4 event at all. Without it, none of the above is measurable. Verify before recommending any further optimisation. See the `analytics-tracking` skill.

### Benchmarks

**Do not import SaaS benchmarks.** Free-trial and demo-request conversion rates describe a different transaction with a different commitment level, and comparing against them will mislead.

Establish an internal baseline over the first two quarters: enquiries per month, share qualified, and enquiry rate by traffic source. Judge changes against that baseline, not an external table.

---

## Psychology That Applies

**Authority.** The strongest lever available. Institutional delivery, ISO 27001, a decade of group history, association leadership.

**Social proof, institutional form.** Named clients and comparable projects, not user counts. A curator is reassured by another museum, not by a subscriber total.

**Reciprocity.** Give away real practitioner detail before asking for anything. This is also the ranking strategy in `context/seo-guidelines.md`, so it pays twice.

**Loss aversion, framed honestly.** The relevant risk is a centre that looks dated in year two, or a training programme that cannot evidence competency. Name the failure mode and show how the build avoids it.

**Consensus across stakeholders.** Give the visitor forwardable material: a case study a finance lead will accept, a measurement section a director can quote.

### Drop Entirely

**Scarcity and urgency.** No limited slots, no countdown timers, no seasonal pressure. Prohibited by `context/style-guide.md`, and with a procurement audience it damages credibility rather than accelerating a decision that is governed by a budget cycle anyway.

---

## Audit Checklist

### Above the Fold
- [ ] What we build and who for, clear in five seconds
- [ ] Institutional proof visible
- [ ] One primary CTA, not "Submit" or "Contact Us"
- [ ] Response promise near the CTA
- [ ] No carousel, no autoplay audio, no countdown

### Copy
- [ ] Passes the `context/style-guide.md` checks: no em dashes, no banned constructions, no metaphor, no superlatives about ourselves
- [ ] Written in "we", never "I"
- [ ] Outcome before technology
- [ ] Measurement addressed where the buyer needs a business case
- [ ] Every capability claim names a real project
- [ ] No price stated or implied
- [ ] No 92% or 96% figures
- [ ] No named competitor

### Proof
- [ ] At least two named, relevant case studies
- [ ] Only cleared statistics used
- [ ] Logo wall images carry real alt text
- [ ] Something forwardable to a committee

### Enquiry Path
- [ ] Form reachable without hunting
- [ ] Visible labels, not placeholder-only
- [ ] Brief captured
- [ ] Project type captured
- [ ] Phone not blocking submission
- [ ] Confirmation restates what happens next

### Technical
- [ ] Core Web Vitals within threshold on mobile
- [ ] Hero media does not block first paint
- [ ] Tap targets and font sizes adequate
- [ ] Click-to-call working
- [ ] Form submission fires a GA4 event

---

## Conversion Killers, ViitorX Edition

1. **"Submit" as the button label.** Currently live
2. **No project-type field**, so every enquiry arrives unqualified. Currently live
3. **Placeholder-only field labels.** Currently live
4. **Required phone at first touch.** Currently live
5. **Optional brief**, which invites empty enquiries. Currently live
6. **Empty alt text on the client logo wall**, wasting the best trust signal. Currently live
7. Generic headlines that could belong to any studio
8. Unnamed proof: "a leading mining conglomerate" instead of Adani
9. Capability lists with no measurement story
10. Heavy hero media that delays first paint on mobile
11. Manufactured urgency in a procurement-governed sale
12. Optimising form-fill volume and calling it success

Items 1 to 6 are verified live findings and are the fastest available wins.

---

## Related Files and Commands

| Resource | Relevance |
|---|---|
| `context/style-guide.md` | Copy mechanics, banned constructions, CTA style, urgency ban |
| `context/brand-voice.md` | Voice pillars, value propositions by segment, audience and objections |
| `context/features.md` | Offerings, proof points, objection answers, claim limits |
| `context/seo-guidelines.md` | Article-level CTA placement and optimisation |
| `context/internal-links-map.md` | Case-study URLs for proof sections |
| `/landing-write`, `/landing-audit`, `/landing-research`, `/landing-competitor` | Landing page workflow |
| `cro-analyst` agent | Reviews pages against this file |
| `page-cro`, `form-cro`, `analytics-tracking` skills | Deeper method for specific problems |

---

## Maintenance

**Version**: 2.0 (first ViitorX-specific edition, replacing the SaaS landing-page template)
**Last updated**: 24 August 2026
**Form audit basis**: rendered `/contact-us/`, `/offerings/` and `/industries/`, 24 August 2026

Open items:

- Six verified live findings listed under *Conversion Killers*, items 1 to 6
- `[TO CONFIRM]` Contradiction between `context/features.md` and the live form regarding a project-type field
- `[TO CONFIRM]` Whether enquiry submissions fire a GA4 event
- `[TO CONFIRM]` Source and methodology for the 92% and 96% counters currently displayed on the homepage and `/industries/`
- Budget and timeline qualification fields stay blocked until the engagement model is defined
- No enquiry-quality log exists, so the primary metric in this file is currently unmeasured
