// FAQ section for the landing page: native <details>/<summary> accordion
// (no client JS needed, keyboard/screen-reader accessible by default),
// styled to match the editorial hairline-divider language used by the
// "How it works" section on the same page.

const FAQS = [
  {
    q: "Who can use StudSwap?",
    a: "Sign-up is gated to university email addresses, so everyone you match with is a verified student.",
  },
  {
    q: "How does a swap actually work?",
    a: "Browse profiles, swipe on flats you'd want to stay in. When you both like each other's place, that's a match: chat, propose dates, and confirm once you're both happy with the plan.",
  },
  {
    q: "Does StudSwap handle payment for the stay itself?",
    a: "No. StudSwap is matchmaking only. For a mutual swap, we calculate and show any price difference between the two flats; for a one-directional stay, we show the full cost. Either way, you and your match settle that directly between yourselves, by whatever means you choose. StudSwap never collects, holds, or moves that money.",
  },
  {
    q: "What does StudSwap actually charge?",
    a: "A flat €25 per person, once both sides confirm: €5 is StudSwap's service fee (non-refundable), and €20 is refunded to you automatically once the stay has been underway for a day.",
  },
  {
    q: "Can I cancel a confirmed swap?",
    a: "Yes. Since your €20 auto-refunds a day into the stay anyway, cancelling only matters before that: more than 7 days before the stay starts, it refunds your €20 to you; closer to the date, that €20 is forfeited to the other side instead. Either way your €5 service fee is never refunded. Details are in the Peer Agreement.",
  },
  {
    q: "What if my match cancels on me?",
    a: "Your own €20 is refunded to you regardless. It was never at risk. If they cancelled late, their €20 is forfeited to you instead of refunded to them.",
  },
] as const;

export default function FaqSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-carbon-text">FAQ</p>
        <h2 className="mb-10 max-w-xl font-display text-3xl font-bold text-chalk md:text-4xl">
          Common questions.
        </h2>
        <div className="flex flex-col divide-y divide-carbon-line border-t border-carbon-line">
          {FAQS.map((item) => (
            <details key={item.q} className="group py-5 md:py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-chalk marker:content-none md:text-xl">
                {item.q}
                <span
                  aria-hidden
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-bloom to-riviera text-sm font-bold text-white transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2.5 max-w-2xl text-sm text-carbon-text md:text-base">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
