# [Platform Name] Credits Purchase Policy (DRAFT — NOT FOR PUBLICATION)

**⚠️ SUPERSEDED: the Credits system this document describes has been removed from the app.** StudSwap no longer has an internal balance/wallet of any kind — it now charges a flat €25 confirmation fee directly (see Terms of Service, Section 6) and never collects or holds the stay-cost/fairness-difference amount at all. Kept here for historical reference only; not linked from the app and should not be published. See Terms of Service Section 6 and Section 8 for the current, real-money mechanics.

**⚠️ Same status as the Terms of Service / Peer Agreement draft: this is a structural starting point, not reviewed by a lawyer. Do not publish or ask any user to accept this until reviewed.** This document should be read alongside the Terms of Service (Section 6, Credits System), which it expands on.

[PLACEHOLDER — flag for lawyer: prepaid credit/voucher schemes in the EU can intersect with the Consumer Rights Directive's 14-day right of withdrawal for online purchases. There are exceptions (e.g., for services fully performed, or digital content with explicit waiver), but a lawyer needs to confirm whether Credits purchases need a withdrawal-right disclosure, a waiver checkbox at purchase, or are exempt. This affects Sections 2 and 4 below directly — don't assume the "non-refundable" language alone is sufficient without this confirmation.]

---

## 1. What Credits Are

Credits are [Platform Name]'s internal unit of account, used exclusively within the Platform to pay confirmation fees, compensation in a Swap, and any other in-Platform charges. 1 Credit = €1 at time of purchase.

Credits are **not currency, e-money, a financial product, or a store of value outside the Platform.** They represent prepaid access to Platform services only.

## 2. Buying Credits

- Credits are purchased in packs of [X / Y / Z] via [payment processor — Stripe/Mangopay], using standard payment methods (card, etc.).
- Credits are added to your Platform balance immediately upon successful payment.
- All purchases are final at the moment of purchase, subject to the specific exceptions in Section 5 (Refunds) below. [PLACEHOLDER — pending the EU withdrawal-right question above.]

## 3. Non-Cashability (General Rule, With Two Specific Exceptions)

**As a general rule, Credits are not cashable and cannot be freely converted back into money.** Credits are a closed-loop balance for use within the Platform, not a general-purpose financial product. Specifically, at all times:

- Credits cannot be transferred, gifted, sold, or traded to another user.
- Credits have no cash value and cannot be redeemed for cash by [Platform Name], its partners, or any third party, **except in the two specific circumstances defined in Section 5** (statutory withdrawal right, and cancelled-swap refund).
- If your account is closed or suspended for cause (e.g., breach of Terms), any remaining Credit balance is forfeited, subject to any non-waivable legal refund rights.

This remains a deliberate design choice: outside the two defined exceptions below, Credits behave as a closed-loop points system rather than a freely cashable instrument. [PLACEHOLDER — lawyer to confirm that carving out exactly two defined cash-refund rights (rather than zero, or an open-ended "at our discretion") still supports the closed-loop/non-e-money characterization. This is the crux of the PSD2 question and needs explicit sign-off given the policy now includes real refund pathways.]

## 4. Using Credits

- Credits can be used within the Platform for: confirmation fees, Swap compensation payments (Case 1), paid-connection charges (Case 2), and any future in-Platform charges (e.g., deposits, if introduced later).
- Credits do not expire for [X months/years — TBD] from the date of purchase, after which [unused Credits expire / policy TBD]. [PLACEHOLDER — decide an expiry policy; many jurisdictions restrict how quickly prepaid balances can expire, this needs legal input too.]

## 5. Refunds

There are exactly two circumstances in which a user is entitled to a **cash** refund of Credits. Outside these two, cancelled or unused Credits are returned to the user's Platform balance as Credits (Section 5.3), not as cash.

**5.1 — Statutory withdrawal right (14 days, unused Credits).**
Under EU consumer protection law, users purchasing Credits as a distance/online contract generally have the right to withdraw within 14 days of purchase, without giving a reason, and receive a full cash refund. [PLACEHOLDER — lawyer to confirm the exact scope: this right typically does not apply once a service has been "fully performed" with the user's prior express consent and acknowledgment of losing the right, or in some digital-content scenarios. The Platform needs to decide and clearly disclose at checkout whether using any Credits within the 14-day window (e.g., paying a confirmation fee) forfeits this right for the *used* portion, while preserving it for any *unused* portion. This needs to be resolved with a lawyer before launch — do not assume the full 14 days survives any use of Credits without confirming.]
- Practical default proposed here, pending lawyer confirmation: a user may request a cash refund within 14 days of a purchase for the **unused portion** of that specific purchase. Any portion already spent (confirmation fees paid, compensation sent) is not covered by this window and follows Section 5.2 instead if applicable.

**5.2 — Cancelled-on-you refund (the edge case you asked about).**
If a user commits Credits toward a specific Swap or paid connection (e.g., a confirmation fee, a compensation payment) and the **other party** cancels — i.e., this user did not initiate the cancellation — that user may request a **cash refund** for the Credits they had committed to that specific Swap, in addition to (not instead of) any compensation they're owed from the canceller under the Terms of Service cancellation policy.
- This applies regardless of how long ago the original Credits were purchased — it is tied to the cancellation event, not a purchase-date window.
- This does **not** apply if the user themselves is the one who cancelled (their forfeited Credits under the cancellation policy are not refundable — that's the deterrent working as intended) — see Terms of Service cancellation policy.
- [PLACEHOLDER — decide whether this refund is automatic upon a cancellation being logged, or requires the user to submit a request. Automatic is more trustworthy from a user's perspective and avoids support burden; lawyer/product decision, not just legal.]

**5.3 — All other cases: Credits, not cash.**
Outside Sections 5.1 and 5.2 — for example, a Swap simply not being confirmed by anyone, a user changing their mind before committing Credits, or Credits left unused with no associated cancellation — any returned or unused Credits remain in the user's Platform balance as Credits, usable for any future Swap. This is disclosed clearly at the point of purchase (Section 6).

**5.4 — Platform error or platform-caused cancellation.**
If a Swap is cancelled due to a Platform error (e.g., a bug, a wrongful account suspension, a Platform-side payment processing failure), the affected user is entitled to a full cash refund of Credits committed to that Swap, treated the same as Section 5.2 regardless of which "side" the error resembles. [PLACEHOLDER — lawyer to confirm this isn't just a discretionary courtesy but a stated right, given the Platform is at fault in this scenario.]

## 6. Disclosure Requirement at Point of Purchase

Before completing a Credit purchase, the Platform must display, and the user must affirmatively acknowledge (e.g., a checkbox, not just a link), a short-form summary along these lines:

> "You have 14 days to request a full refund on any unused Credits. If a Swap you've paid Credits toward is cancelled by the other person, you can get those Credits refunded as cash. In all other cases, unused or returned Credits stay in your account as Credits for future use — they can't be cashed out or transferred to another user."

[PLACEHOLDER — exact required wording and mechanism (checkbox vs. banner vs. modal) should be confirmed with a lawyer. If Section 5.1's withdrawal right requires an explicit consent/waiver mechanism for the portion of Credits used before 14 days elapse (common in EU digital-content/service contracts), that specific acknowledgment likely needs to sit at the moment Credits are *spent*, not just at the moment they're *purchased* — i.e., you may need two separate disclosure points, not one. Flag this explicitly to the lawyer.]

## 7. Disputes About Credit Balances

If a user believes their Credit balance is incorrect (e.g., due to a bug or an incorrectly-applied cancellation forfeiture), they may raise this via [support contact/process — TBD]. [Platform Name] will investigate and correct genuine errors. This process does not itself create a right to a cash refund beyond what's stated in Section 5.

## 8. Changes to This Policy

[Platform Name] may update this policy from time to time. Material changes will be communicated to users with reasonable notice. Existing Credit balances are not affected by policy changes except as required by law. [PLACEHOLDER — same notice-mechanism question as the ToS.]

---

## Notes for your lawyer consultation (add to the existing list from the ToS/Peer Agreement)

1. **Does spending part of a Credit purchase before 14 days extinguish the statutory withdrawal right for that spent portion**, or does the right survive regardless of use? This determines whether Section 5.1's "unused portion only" framing is correct or overly generous/restrictive.
2. **Is the exact wording and consent mechanism for waiving/limiting the withdrawal right compliant** — does it need to appear at purchase, at the moment of spending, or both?
3. **Does Section 5.2 (cancelled-on-you cash refund) create any new regulatory exposure** by making Credits cashable in a defined circumstance — i.e., does having *any* real, non-discretionary cash-refund pathway change the PSD2/e-money analysis versus a fully closed-loop system?
4. Are there **jurisdiction-specific rules on prepaid balance expiry** that affect whether/when Credits can expire?
5. Does **Credits moving between two users** (forfeiture/compensation transfers under the cancellation policy), combined with the two cash-refund rights now defined, change the e-money licensing analysis versus the original "closed-loop, zero cash-out" design?
6. Should the **Section 5.2 refund be automatic** (triggered when a cancellation is logged) or **request-based** — a product decision with legal implications for how disputes/delays are handled.
