# EveryCRED Features & Benefits

This document outlines EveryCRED's key features, benefits, and differentiators to inform content creation that drives demo bookings and customer acquisition across India and US public sector markets.

**Website:** https://www.everycred.com
**Parent Company:** ViitorCloud Technologies
**US Distribution Partner:** Carahsoft Technology Corp (ViitorCloud@carahsoft.com | 703-581-6680)

---

## Core Value Propositions

### 1. Cryptographically Signed, Tamper-Proof Credentials
- **Feature:** Every credential is cryptographically signed using SHA-512 blockchain anchoring and W3C Verifiable Credentials Data Model 2.0, making them mathematically impossible to forge or alter.
- **Benefit:** Eliminates credential fraud at its root — fake degrees, forged licenses, and synthetic identity documents are instantly detectable.
- **Conversion Angle:** "Issue credentials that are impossible to fake and verifiable in under 10 seconds — without calling anyone or checking a database."

### 2. One-Click Instant Verification (QR + NFC)
- **Feature:** QR code and NFC-based scanning triggers instant cryptographic signature validation in milliseconds. No database lookup, no phone call, no manual review.
- **Benefit:** Transforms 30-minute manual verification workflows into sub-10-second field checks — proven with Raigad Police deployment (30 min → under 10 sec).
- **Conversion Angle:** "From 30 minutes to 10 seconds: Give your team verification they can trust in the field."

### 3. Offline Verification Capability
- **Feature:** Cached cryptographic signatures stored locally on the device allow credential verification without internet connectivity.
- **Benefit:** Field officers, border checkpoints, and rural deployments can verify credentials even with zero network coverage.
- **Conversion Angle:** "Works in the field without Wi-Fi — cryptographic proof doesn't need a server to be trusted."

### 4. Real-Time Credential Revocation
- **Feature:** Credentials can be revoked within seconds of a status change (suspension, termination, expiry, disqualification). Revocation registry checks happen automatically at every verification.
- **Benefit:** Eliminates the "ghost credential" problem — an officer who was suspended yesterday cannot show a valid ID today.
- **Conversion Angle:** "When status changes, credentials change with it — revoke in seconds, not days."

### 5. Selective Disclosure / Privacy-Preserving Verification
- **Feature:** Zero-knowledge proof (zk-SNARK) enabled selective disclosure — verifiers see only the data they need (e.g., "Is this person over 18?" or "Is this license valid?") without accessing the full credential.
- **Benefit:** Meets DPDP Act (India) and NIST SP 800-63-4 (US) data minimization requirements; reduces PII exposure risk.
- **Conversion Angle:** "Prove what matters without revealing what doesn't — privacy-first verification built in."

### 6. API-First Integration with Legacy Systems
- **Feature:** REST API architecture connects to existing HR systems, ERPs, grant portals, and government databases without requiring front-end interface changes. Zero re-platforming needed.
- **Benefit:** Deploy in weeks, not years. EveryCRED integrates with what agencies already use.
- **Conversion Angle:** "Plug verifiable credentials into your existing systems in 36 weeks — no rip-and-replace required."

### 7. Three-Sided Trust Platform (Issuer + Holder + Verifier)
- **Feature:** Complete credential lifecycle management: Issuer portal (issue and manage credentials), Holder wallet (citizen/employee app for secure storage), Verifier tools (automated verification workflows for organizations).
- **Benefit:** One platform covers the entire ecosystem — no patchwork of separate tools for each role.
- **Conversion Angle:** "One platform. Every role. Issue, hold, and verify in a single trust ecosystem."

### 8. Immutable Audit Trails
- **Feature:** Every credential issuance, presentation, and verification event is logged to an immutable blockchain record with timestamp and actor identity.
- **Benefit:** Mathematically provable accountability for regulatory audits, compliance reviews, and fraud investigations.
- **Conversion Angle:** "Every verification is a permanent record — audit-ready from day one."

---

## Technical Features

### Credential Standards & Compliance
- **W3C VC Data Model 2.0:** Full compliance — credentials interoperable across any W3C-compliant platform globally
- **DID v1.1:** Decentralized Identifier support for self-sovereign identity management
- **NIST SP 800-63 Rev. 4:** Authentication assurance levels met for US government deployments (finalized July 2025)
- **zk-SNARKs / Zero-Knowledge Proofs:** Privacy-preserving selective disclosure without revealing raw data
- **SHA-512 Blockchain Anchoring:** Cryptographic hash anchoring for tamper evidence and permanent provenance

### Verification & Authentication
- **QR Code Verification:** One-scan field verification for physical and digital checkpoints
- **NFC Verification:** Near-field communication scanning for contactless credential checks
- **Offline Verification:** Cached cryptographic signatures for zero-connectivity environments
- **Liveness Detection:** Biometric liveness checks during enrollment to prevent spoofing
- **Biometric Matching:** Match against government records during identity proofing
- **Bot-Attack Prevention:** Automated detection of automated fraud attempts during verification
- **Revocation Registry:** Real-time status checks at every verification event

### Issuance & Management
- **Bulk Credential Issuance:** Issue credentials at scale (university batches, police force rollouts, government programs)
- **Real-Time Revocation:** Revoke individual or batch credentials within seconds
- **Custom Credential Templates:** Configurable credential schemas per use case and vertical
- **Branded QR Codes:** Custom QR code design with organizational branding
- **Email Branding & Templates:** White-label email delivery with custom subject lines and templates
- **Custom Landing Pages:** Per-credential or per-program verification landing pages

### Wallet & Holder Experience
- **EveryCRED Wallet:** Secure mobile application for credential storage on iOS and Android
- **Whitelabel Wallet:** Custom-branded wallet deployable under client's own brand ($5,000 one-time)
- **Portable Credentials:** Holder-controlled, shareable credentials — "verify once, trust everywhere"
- **Cross-Platform Storage:** Credentials accessible from any device via wallet app

### Integration & APIs
- **REST API:** Full programmatic access for credential issuance, verification, and management
- **India Stack Integrations:** DigiLocker and Aadhaar ecosystem awareness and integration roadmap
- **Law Enforcement System Integrations:** CCTNS, NAFIS, Dial 112 (India police systems)
- **HR System Integrations:** State HR databases, ERP systems, workforce management platforms
- **Grant Portal Integration:** API-based connection to government grant and benefit disbursement portals
- **Zero Front-End Changes:** Credential layer added via API without modifying existing interfaces

### Analytics & Reporting
- **Basic Dashboard:** Credential issuance and verification activity overview (Professional+)
- **Advanced Analytics:** Detailed credential lifecycle reporting, verification frequency, revocation rates (Enterprise+)
- **Immutable Audit Log:** Permanent, tamper-proof record of all credential events for compliance

---

## Product Lines

### Trust Credential
Verifiable credential issuance, management, and verification across credential types and verticals. The core EveryCRED platform.

### Trust Method
Decentralized Identity creation and management — DID provisioning, identity proofing, and enrollment workflows for individuals and organizations.

### Trust Chain
Supply chain credential verification — vendor authentication, contractor compliance tracking, and provenance verification throughout procurement and logistics chains.

---

## Integrations & Ecosystem

### Government System Integrations (India)
- **DigiLocker:** India's national digital document repository (51.3 crore users)
- **CCTNS:** Crime and Criminal Tracking Network and Systems (police)
- **NAFIS:** National Automated Fingerprint Identification System
- **Dial 112:** Emergency response and police dispatch systems
- **State HR Systems:** Government employee HR and payroll platforms

### US Government Procurement Vehicles (via Carahsoft)
- **NASA SEWP V** — Contract NNG15SC03B/NNG15SC27B (through Sept 2026)
- **ITES-SW2** — Contract W52P1J-20-D-0042 (through Aug 2030)
- **NASPO ValuePoint** — Contract AR2472 (through Sept 2026)
- **OMNIA Partners** — Contract R240303 (through Dec 2027)
- **Dallas ISD / Region 4** — Contract 207331 (through Dec 2027)
- **Fairfax County / Cobb County** — Contract 4400012235 (through Apr 2027)
- **Clark County School District** — Contract JU 25-16 (through Apr 2027)

### Technology Standards Ecosystem
- **W3C Verifiable Credentials Working Group** — standards-compliant
- **OpenID Foundation** — OID4VC protocol alignment
- **NIST NCCoE** — SP 800-63-4 authentication framework compliance

---

## Competitive Differentiators

### vs. Dock/Truvera (Global SaaS)
- **India-native + US government certified** (Dock has zero India presence; not on US government contract vehicles)
- **Live government deployments** (Maharashtra, Raigad Police, Navi Mumbai Police — Dock has no government clients)
- **India Stack integration** (DigiLocker, CCTNS, NAFIS — Dock has none)
- **Carahsoft procurement access** (US government can purchase via existing contract vehicles — Dock cannot)
- **Price-competitive for India** (Dock's $499/month Build tier is prohibitive for Indian universities; EveryCRED starts at $95/month)

### vs. Microsoft Entra Verified ID
- **No Azure dependency** (EveryCRED works without Microsoft 365/Entra ID ecosystem)
- **DPDP Act-compliant data architecture** (Microsoft's India data sovereignty position is unresolved)
- **India Stack-native** (DigiLocker integration; Microsoft has none)
- **Accessible pricing for India** (Microsoft requires Entra ID P1 + Entra Suite at $12/user/month — cost-prohibitive for state governments and universities)
- **On-ground India support** (India-based implementation team for government deployments)

### vs. Dhiway (India competitor)
- **Live government proof** (EveryCRED has deployed with Raigad Police and Navi Mumbai Police; Dhiway claims partnerships)
- **Multi-vertical coverage** (EveryCRED covers all 7 verticals; Dhiway focuses on DPI/government)
- **Published pricing** (EveryCRED has transparent self-serve tiers; Dhiway is enterprise-only/undisclosed)
- **US market access** (EveryCRED is on US government contract vehicles via Carahsoft; Dhiway is India-only)
- **Broader standards compliance** (W3C VC 2.0, NIST SP 800-63-4, OID4VC)

### vs. Blockcerts / Legacy Blockchain Certificates
- **Modern standards** (W3C VC 2.0 + OID4VC vs. Blockcerts' pre-standard schema)
- **Selective disclosure / ZKPs** (Blockcerts has none)
- **Credential revocation** (Blockcerts base standard has no revocation mechanism)
- **REST API and SaaS** (Blockcerts requires self-implementation; EveryCRED is turnkey)
- **Active enterprise support** (Blockcerts stagnated after Hyland acquisition)

---

## Use Cases by Customer Segment

### US Federal & State Government Agencies
- Contractor access validation and security clearance credential verification
- License-based automated access control for sensitive government functions
- Grant and benefit eligibility verification (prevent $233–521B in annual federal fraud)
- Inter-agency credential exchange across jurisdictions without manual review
- Workforce certification tracking for training and compliance programs
- Procurement available through NASA SEWP V, ITES-SW2, NASPO ValuePoint, OMNIA Partners

### Law Enforcement & Public Safety
- Digital officer ID cards replacing paper credentials (deployed: Raigad Police, Navi Mumbai Police)
- Field verification via QR code or NFC — no connectivity required
- Instant revocation on suspension, transfer, or retirement
- Integration with CCTNS, NAFIS, Dial 112
- Statewide rollout in 36 weeks (pilot operational by week 20)
- Proven result: verification time reduced from 30 minutes to under 10 seconds; 85% reduction in administrative overhead

### Education Institutions
- Degree, diploma, and certificate issuance (universities, colleges, professional training)
- Alumni credential portability — graduates carry credentials in their wallet forever
- Laravel Certification Platform (live reference deployment)
- Batch issuance for graduation ceremonies
- Fraud prevention: cryptographic proof replaces paper certificates that can be forged for under $30

### Healthcare Organizations
- Medical license and NMC registration credential verification
- Hospital staff and nursing credential management
- Continuing medical education (CME) certification issuance
- Patient-facing credential wallets for health records sharing
- Pharmaceutical supply chain verification (Trust Chain)

### Supply Chain & Enterprises
- Vendor authentication throughout procurement (Trust Chain product)
- Contractor compliance credentials for regulated industries
- Textile, pharma, and food supply chain traceability
- Cross-border credential interoperability for global supply chains
- Whitelabel wallet for partner ecosystems ($5,000 one-time)

### Finance & KYC
- Reusable KYC credentials — verify once, reuse across institutions
- Digital identity for account onboarding (reduce friction 12x vs. manual)
- AML/CFT compliance credential workflows
- Selective disclosure for data minimization in financial verification

---

## Pricing & Plan Benefits

### Basic — $95/month (or $100/month annual)
- Up to 25 credentials/month ($2.50 per additional)
- 500 active users
- Email branding
- Email support
- Analytics and API access available as add-ons

### Professional — $225/month (or $250/month annual)
- Up to 75 credentials/month ($2.50 per additional)
- 2,500 active users
- 10 custom landing pages
- Basic dashboard
- Standard API access add-on: $200/month
- Custom QR code add-on: $100/month

### Enterprise — $425/month (or $500/month annual)
- Up to 200 credentials/month ($2.00 per additional)
- Unlimited active users
- 25 custom landing pages
- Advanced analytics and reporting dashboard
- Standard API access included
- Priority support

### Custom / Enterprise Plus — Contact Sales
- Unlimited credentials on custom terms
- 50+ custom landing pages
- Dedicated account manager
- 24/7 support with SLA guarantee
- Whitelabel wallet: $5,000 one-time
- Onboarding & training: $1,500 one-time
- Fully customized deployment

---

## Key Messaging for Conversions

### Demo / Trial CTA Messages
- "See how Raigad Police cut verification time from 30 minutes to 10 seconds — book a demo."
- "Issue your first tamper-proof credential in under an hour. Schedule a live walkthrough."
- "Available on NASA SEWP V, ITES-SW2, and NASPO ValuePoint — procurement made simple."
- "Talk to our expert and get a credential deployment roadmap for your agency."

### Pain Point Solutions
- **"We can't afford another vendor integration project"** → Zero front-end changes required — EveryCRED adds a credential layer via REST API without modifying existing systems
- **"Our credentials get forged or misused after issuance"** → SHA-512 blockchain anchoring + real-time revocation makes forgery mathematically impossible and stale credentials auto-invalidate
- **"We operate in areas with poor connectivity"** → Offline-capable QR and NFC verification using cached cryptographic signatures — works without any network connection
- **"We have strict data privacy requirements"** → zk-SNARK selective disclosure reveals only what's needed; DPDP Act (India) and NIST SP 800-63-4 (US) compliant by design
- **"Government procurement is too complicated"** → Available through Carahsoft on NASA SEWP V, ITES-SW2, NASPO ValuePoint, and OMNIA Partners — use contracts your agency already has

### Social Proof Elements
- Government of Maharashtra — live credential deployment
- Raigad Police — 85% reduction in administrative overhead; 30 min → 10 sec verification
- Navi Mumbai Police — digital ID card deployment
- Laravel Certification Platform — technology sector credential issuance
- Carahsoft partner — trusted US government IT distributor with 300+ manufacturer partners
- US government procurement vehicles: NASA SEWP V, ITES-SW2, NASPO ValuePoint, OMNIA Partners

---

## Common Questions & Objections

### "How is EveryCRED different from just issuing PDF certificates?"
**Answer:** PDF certificates can be forged for under $30 using AI tools. EveryCRED credentials are cryptographically signed and blockchain-anchored — any alteration breaks the signature, making forgery instantly detectable. PDFs also can't be revoked; EveryCRED credentials can be revoked in seconds.

### "Do recipients need a special app to use their credentials?"
**Answer:** Recipients store credentials in the EveryCRED Wallet (iOS/Android). For organizations needing a branded experience, a whitelabel wallet can be deployed under their own brand for a one-time fee. Verification requires only a QR code scanner — no app needed for the verifier.

### "Can EveryCRED work with our existing HR / ERP / grant management system?"
**Answer:** Yes — EveryCRED is API-first. It integrates via REST API with existing systems without requiring any front-end changes. Proven integrations include CCTNS, NAFIS, DigiLocker (India) and major HR platforms.

### "How does EveryCRED handle credential revocation for employees who leave?"
**Answer:** Credentials can be revoked within seconds from the admin portal. Every subsequent verification of that credential will show it as invalid — even on credentials already saved in the holder's wallet.

### "Can US government agencies purchase EveryCRED without a new procurement process?"
**Answer:** Yes. EveryCRED (via ViitorCloud through Carahsoft) is available on NASA SEWP V, ITES-SW2, NASPO ValuePoint, and OMNIA Partners contract vehicles. Contact Carahsoft at ViitorCloud@carahsoft.com or (703) 581-6680.

### "Does EveryCRED work offline?"
**Answer:** Yes. Field officers and remote deployments use cached cryptographic signatures stored locally, enabling full credential verification without any internet connectivity.

### "What compliance standards does EveryCRED meet?"
**Answer:** W3C VC Data Model 2.0, DID v1.1, NIST SP 800-63 Rev. 4 (finalized July 2025), zk-SNARK selective disclosure for DPDP Act compliance (India). eIDAS 2.0 alignment in roadmap for EU-facing deployments.

---

## Content Creation Guidelines

When writing about EveryCRED:

1. **Lead with outcomes, not technology:** Don't say "blockchain-anchored credentials" — say "credentials that can't be forged and take 10 seconds to verify"
2. **Use the Raigad Police proof point:** 30 minutes → 10 seconds and 85% admin overhead reduction is the most powerful concrete stat we have — use it in government-facing content
3. **US market angle:** For US content, always mention Carahsoft partnership and contract vehicle access; procurement friction is the #1 barrier for government buyers
4. **India Stack advantage:** For India content, always reference DigiLocker compatibility and DPDP Act compliance — no international competitor can match this
5. **Fraud cost angle:** $233–521B annual federal fraud (GAO), $10.22M average US breach cost, 311% growth in AI-forged documents — these stats give urgency to government prospects
6. **Cost comparison:** Manual verification costs $15–$25 per check; EveryCRED costs under $0.10 per check — $7.4–$12.4M first-year savings at 500K verifications/year
7. **Competitor comparison:** EveryCRED is the only platform with live India government deployments AND US government contract vehicles — no competitor has both
8. **Three audiences:** Tailor messaging — Government IT teams (compliance + procurement), Operations/HR leaders (efficiency + fraud), Security teams (auditability + revocation)

---

*Last updated: May 2026. Update when new features launch, case studies are published, pricing changes, or new contract vehicles are added.*
