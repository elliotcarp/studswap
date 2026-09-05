# StudSwap — Privacy Policy

**Version:** 1.0 (DRAFT — NOT FOR PUBLICATION)
**Last updated:** [DATE] · **Effective from:** [DATE]

> ⚠️ **Not reviewed by a lawyer.** A compliant privacy notice is mandatory before the first user signs up, and anything inaccurate here is directly enforceable against you from your own published page. **Check every statement against what the code actually does before publishing** — describing processing you don't do, or omitting processing you do, is itself a breach.

---

## 1. Who is responsible

`[ENTITY NAME]`, `[ADDRESS]`, `[RCS number]` is the controller of the personal data described here.

Privacy contact: `[EMAIL — must be real and monitored]`

**Data protection officer:** `[DECISION — a DPO is required under Article 37 GDPR only in specific cases, and probably not at launch. State either who it is, or "we have not appointed a DPO because [reason]".]`

**Lead supervisory authority:** the CNIL (France), `www.cnil.fr`.

`[LEGAL] ⚠️ Serving the UK and Switzerland has consequences here. UK GDPR may require a UK representative under Article 27, and the Swiss FADP may require a Swiss representative under Article 14 for controllers outside Switzerland processing Swiss residents' data on a large scale. Confirm whether either applies at your size — and if so, budget for it. Both are ongoing costs for what may be very few users.`

## 2. What we collect

### 2.1 Account data
Your university email address, used for sign-in and checked against a domain allow-list. If you set a password, a salted hash of it — never the password itself. Sign-in timestamps, and the device and browser used.

### 2.2 Profile and listing data — **visible to other users**
Name, age, university, field of study, year of study, home city, availability dates, capacity of your accommodation, nightly price, smoking and pet preferences, photographs of yourself and of your accommodation, short descriptions of both, and your answers to a few prompts.

**Assume everything here is public to other students on the Platform.** Don't put anything in a free-text field or a photograph that you wouldn't want another user to see, screenshot, or keep.

### 2.3 Address data
The full address of your accommodation. **Not** shown while browsing. Disclosed to the other party only once an arrangement is confirmed, because they need it to get there.

`[DECISION] Confirm this matches the app. If the address, or a map pin precise enough to identify the building, is visible before confirmation, this section is wrong — and the product should probably change rather than the policy.`

### 2.4 Payment handle
The bank or payment details you give us so another user can pay you — IBAN, Revolut tag, PayPal address or similar, and the account holder name.

**We do not use this to pay you for a stay.** We show it to the other party after an arrangement is confirmed so they can pay you directly. We also use it to pay you compensation if someone cancels on you. It is never public and is never shown before confirmation.

### 2.5 Activity data
Who you swipe on and which way, your matches, messages within a match, proposals, confirmations, cancellations, whether a settlement was marked paid, and the ratings and reviews you give and receive.

### 2.6 Our own payment data
Records of the €25 we charge you and any refund or compensation.

**We do not receive or store your card details.** Payment is taken by `[Stripe Payments Europe, Ltd.]`, who process your card data directly. We receive a transaction ID, amount, currency, outcome, card brand, last four digits, and card country. Their privacy notice governs what they do with it: `[link]`.

**We never see or handle the money you pay another user.**

### 2.7 Technical data
IP address, approximate location derived from it, browser and device type, and log data — to keep the Service working and secure.

`[DECISION] Confirm exactly what is logged and for how long, including at the hosting layer. Vercel and Neon both retain logs; those periods belong in Section 5.`

### 2.8 What we do not collect
Government ID, proof-of-enrolment documents, precise GPS location, or special categories of data (health, religion, political opinions, sexual orientation, ethnicity). Please don't volunteer any of these in free-text fields.

`[DECISION] If ID verification, proof of landlord permission, or short-term-rental registration numbers are added — all under consideration — Sections 2, 3 and 5 need rewriting before that ships.`

## 3. Why we process it

| What | Why | Legal basis |
|---|---|---|
| Email, password hash | Creating and securing your account | Contract |
| University domain check | Confirming eligibility for a students-only service | Contract |
| Profile and listing data | Showing you to other users; the core matching feature | Contract |
| Photographs of you | Letting users see who they'd be swapping with | `[LEGAL — see below]` |
| Accommodation address | Letting a confirmed arrangement actually happen | Contract |
| Payment handle | Letting the other party pay you; paying you compensation | Contract |
| Swipes, matches, messages | Operating matching and chat | Contract |
| Our fee and refund records | Charging and refunding you; accounting | Contract; legal obligation for retention |
| Ratings and reviews | Helping users judge who to swap with | Legitimate interests |
| Fraud and duplicate-account prevention | Keeping the Platform trustworthy | Legitimate interests |
| Security logs, IP addresses | Protecting the Service | Legitimate interests |
| Handling reports of illegal content | Digital Services Act compliance | Legal obligation |
| Tax and accounting records | Statutory record-keeping | Legal obligation |

Where we rely on legitimate interests we've weighed them against your rights. You can ask for that assessment, and you can object (Section 7).

`[LEGAL] Photographs are the weakest row. Contract is arguable since the product doesn't work without them, but several supervisory authorities read "necessary for the contract" strictly, and photographs of identifiable people are sensitive in practice. Confirm whether consent is the correct basis — and note that if it is, it must be withdrawable, which means the product has to work for someone who withdraws it.`

`[LEGAL] Confirm whether the matching/ranking logic that decides which profiles a user sees is automated decision-making under Article 22, and whether Article 27 DSA (recommender transparency) applies. If profiles are ordered by anything beyond randomness or simple filters, a short plain-language explanation probably belongs here.`

## 4. Who we share it with

**Other users.** Your profile is shown to other students. Messages are visible only to the other person in that match. Your address and payment handle are shared only after an arrangement is confirmed. Your ratings are shown to other users.

Once another user has seen your information, we cannot retrieve it. They agree, under Section 8 of the [Peer Swap Agreement](/peer-agreement), to use it only for that arrangement — but we cannot enforce that on your behalf.

**Service providers processing data for us**, under written data processing agreements:

| Provider | Purpose | Location |
|---|---|---|
| `[Vercel Inc.]` | Hosting | `[region — confirm]` |
| `[Neon Inc.]` | Database | `[region — confirm]` |
| `[Vercel Blob]` | Photograph storage | `[region — confirm]` |
| `[Resend / SMTP provider]` | Sign-in links and notifications | `[region]` |
| `[Stripe Payments Europe, Ltd.]` | Charging our fee | `[region]` |

`[DECISION] ⚠️ This table must be accurate and complete before launch, and updated whenever a provider changes. Note Stripe acts as an independent controller for some purposes (fraud prevention, regulatory compliance) rather than purely as our processor — a lawyer should confirm how to describe that. Vercel, Neon and Stripe are all US-parented; see Section 6.`

**Authorities.** Where legally required — a court, supervisory authority, tax authority, or law enforcement acting on a valid legal basis.

`[LEGAL] If Regulation (EU) 2024/1028 applies (Terms of Service, Section 4), monthly reporting of host and activity data to Member State authorities becomes a legal obligation and must be disclosed here. If DAC7 applies, tax reporting must be disclosed too. Both are currently missing because both are unresolved.`

**We do not sell your personal data** and do not share it with advertisers or data brokers.

## 5. How long we keep it

| Data | Retention |
|---|---|
| Account and profile data | While your account is active |
| Photographs | While your account is active, or until you delete them |
| Messages | `[DECISION — proposal: kept while both accounts exist; deleted when either party deletes, since chat contains both parties' data]` |
| Arrangement records | `[DECISION — proposal: X years after the stay, as dispute evidence. This is a legitimate-interests retention and needs justifying]` |
| Payment handle | Until you change or remove it, or delete your account |
| Our fee and refund records | `[6–10 years, set by French accounting and tax law]` |
| Security and access logs | `[DECISION — proposal: 30–90 days]` |
| Backups | `[DECISION — state the rotation period; deleted data persists in backups until they roll over, and that must be disclosed]` |
| Records of a ban | `[DECISION — needed to stop a banned user returning; justify under legitimate interests, keep minimal]` |
| Inactive accounts | `[DECISION — proposal: delete or anonymise after X months of inactivity, after a warning email]` |

When you delete your account we delete or anonymise your profile, photographs and listings. Some data must be kept: our own transaction records for tax purposes, and a minimal record of any ban.

`[DECISION] ⚠️ Do not publish a promise the product cannot keep. If in-app account deletion isn't built, say plainly that deletion is by request to a named address and is actioned within one month — that is fully compliant. What is not compliant is describing a self-serve flow that doesn't exist.`

## 6. International transfers

`[PLACEHOLDER — cannot be written until hosting regions are confirmed. For each provider in Section 4, determine: (a) the region where data is actually stored; (b) whether support or engineering access happens from outside the EU/EEA, which is itself a transfer; (c) the transfer mechanism — adequacy decision, Standard Contractual Clauses, or the EU-US Data Privacy Framework — and whether the provider is certified. State the mechanism and offer to provide the safeguards on request. Vercel, Neon and Stripe are all US-parented, so it's very unlikely no transfer occurs.]`

`[LEGAL] Data flowing to and from UK and Swiss users adds transfer questions in both directions. The UK and Switzerland both currently benefit from EU adequacy decisions, but confirm the current position and what the UK and Swiss regimes require of us as an EU-established controller.`

## 7. Your rights

You have the right to **access** your data and get a copy, **correct** it, **delete** it, **restrict** processing while a dispute is resolved, **port** it in a machine-readable format, **object** to processing based on legitimate interests, **withdraw consent** where we rely on it, and **not be subject** to solely automated decisions with legal or similarly significant effects.

To exercise any of these, contact `[EMAIL]`. We reply within one month, extendable by two more for complex requests — we'll tell you if we need it. No charge unless a request is manifestly unfounded or excessive.

**You can also complain to a supervisory authority.** Ours is the CNIL in France. You may also complain to the authority in the country where you live, work, or where the problem occurred — for UK users, the ICO; for Swiss users, the FDPIC.

## 8. Children

The Service is for users aged 18 and over. We don't knowingly collect data from anyone younger. If you think we have, contact `[EMAIL]` and we'll delete it.

## 9. Cookies

`[PLACEHOLDER — MISSING AND REQUIRED. The ePrivacy Directive (and its national implementations, plus the CNIL's own guidance which is stricter than most) requires consent for any non-essential storage on a user's device. This is enforced independently of, and often more aggressively than, the GDPR — the CNIL has issued substantial fines on cookie compliance alone.`

`Determine: (a) exactly which cookies and local storage keys the app sets; (b) which are strictly necessary (session, auth, CSRF) and which are not; (c) whether any analytics are in use. If everything is strictly necessary you need a short cookie notice but no consent banner. If anything isn't, you need a compliant consent mechanism with a genuine reject option, refusing as easy as accepting, and nothing loading before consent. Settle this before launch.]`

## 10. Security

We protect your data by `[DECISION — state what you actually do: HTTPS, encryption at rest where the provider offers it, hashed passwords, access controls, no production data on local machines]`. No system is completely secure. If a breach is likely to result in a high risk to your rights we'll tell you without undue delay, and notify the supervisory authority within 72 hours where required.

`[DECISION] You need a written incident response plan before launch, even one page. The 72-hour clock under Article 33 GDPR runs from awareness, not from when you work out what to do.`

## 11. Changes

We may update this policy as the product changes. For changes materially affecting how we use your data, we'll notify you by email and in the app at least `[30]` days beforehand, consistent with Section 20 of the [Terms of Service](/terms). The version and date at the top always reflect the current version.

## 12. Contact

`[ENTITY NAME]`, `[ADDRESS]`
Privacy: `[EMAIL]`
Supervisory authority: CNIL, 3 Place de Fontenoy, 75007 Paris, `www.cnil.fr`
