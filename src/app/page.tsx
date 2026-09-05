// Landing page: header, hero banner, how-it-works, features, footer.
// The hero and closing CTA keep the cinematic night-skyline treatment; the
// sections in between are bright and colorful (the app's own bloom/riviera/
// spritz gradient family), laid out editorial-style — bold display type,
// hairline dividers instead of cards, scroll-triggered reveals (see
// Reveal.tsx) — rather than a static page.

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CinematicBackdrop from "@/components/landing/CinematicBackdrop";
import ParallaxLayer from "@/components/landing/ParallaxLayer";
import Reveal from "@/components/landing/Reveal";
import CityGlyph from "@/components/landing/CityGlyph";
import LogoutButton from "@/components/LogoutButton";
import FaqSection from "@/components/landing/FaqSection";

const STEPS = [
  {
    title: "Create your profile",
    body: "Add your flat, home city, and the dates you're free to swap.",
  },
  {
    title: "Swipe to discover",
    body: "Browse verified students looking to swap flats for a semester or internship.",
  },
  {
    title: "Match & move",
    body: "When you both like each other's place, chat and lock in the swap.",
  },
];

const FEATURES = [
  {
    icon: "🎓",
    title: "Verified students only",
    body: "Sign-in is gated to university email addresses, so everyone you meet is a real student.",
    wash: "from-bloom/15 to-riviera/15",
  },
  {
    icon: "🗓️",
    title: "Flexible dates",
    body: "Filter by destination and date overlap instead of needing an exact match: a swap works even if your trips don't line up perfectly.",
    wash: "from-riviera/15 to-spritz/15",
  },
  {
    icon: "🤝",
    title: "Matchmaking, not a payment processor",
    body: "We calculate and show the price difference on a swap, or the full stay cost on a one-directional stay, but you and your match settle it directly between yourselves.",
    wash: "from-spritz/15 to-bloom/15",
  },
  {
    icon: "🛡️",
    title: "An optional deposit contract for peace of mind",
    body: "Alongside the Peer Swap Agreement, confirming a swap offers you a ready-to-use Damage Deposit Agreement template, so you and your match can protect yourselves against damage directly between you. StudSwap isn't a party to it.",
    wash: "from-bloom/15 to-spritz/15",
  },
];

// Destinations strip: one seed per city so CityGlyph draws a distinct
// silhouette for each, no photography required. Cycled through the brand
// gradient family so the strip reads as colorful, not monochrome.
const GLYPH_COLORS = ["text-riviera", "text-bloom", "text-spritz"];
const DESTINATIONS = [
  { name: "Berlin", seed: 3 },
  { name: "Barcelona", seed: 11 },
  { name: "Lisbon", seed: 19 },
  { name: "Milan", seed: 27 },
  { name: "Prague", seed: 35 },
  { name: "Lyon", seed: 43 },
  { name: "Vienna", seed: 51 },
  { name: "Porto", seed: 59 },
];

const EDGE_FADE_MASK =
  "linear-gradient(to right, transparent, black 8%, black 92%, transparent)";

export default async function LandingPage() {
  // Already signed in: still show the marketing page (no redirect), just
  // swap the logged-out sign-up/log-in prompts for a single "back into the
  // app" action instead of asking someone who's already a user to sign in
  // again. /swipe itself redirects on to /onboarding if there's no profile
  // yet, so this doesn't need to duplicate that check.
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean((session?.user as { id?: string } | undefined)?.id);

  return (
    // This page owns its own scroll (h-screen + overflow-y-auto) instead of
    // letting the document/html scroll, purely so scrollbar-hide can hide
    // its scrollbar — the landing page is the one place a visible OS
    // scrollbar reads as un-designed against the cinematic hero.
    <div className="scrollbar-hide flex h-screen flex-col overflow-y-auto bg-white">
      {/* Hero banner: full-viewport night skyline, title card anchored low
          in the frame so it reads as one scene, not a text block floating on
          a backdrop. The header floats transparent over the top of it (no
          white chrome bar cropping the scene) and simply scrolls away with
          the rest of the hero, since this page has no other sticky nav.
          See CinematicBackdrop for the layered aurora/skyline/grain, also
          reused (static, no parallax) at the closing CTA. */}
      <section className="relative flex min-h-[100svh] shrink-0 flex-col overflow-hidden bg-[#0B0912]">
        <ParallaxLayer>
          <CinematicBackdrop skylineClassName="h-[68vh] min-h-[380px]" />
        </ParallaxLayer>

        <header className="relative z-20 flex items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-xl font-bold text-white">
            StudSwap
          </Link>
          <nav className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <LogoutButton className="text-sm font-medium text-gray-200 hover:text-white" />
                <Link
                  href="/swipe"
                  className="rounded-full bg-gradient-to-r from-bloom to-riviera px-4 py-2 text-sm font-medium text-white shadow-sm shadow-bloom/30"
                >
                  Back to swiping
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup" className="text-sm font-medium text-gray-200">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-gradient-to-r from-bloom to-riviera px-4 py-2 text-sm font-medium text-white shadow-sm shadow-bloom/30"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>

        <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-24 text-center">
          <h1 className="mb-5 max-w-4xl font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-white text-balance sm:text-6xl md:text-7xl lg:text-8xl">
            Someone else&apos;s{" "}
            <span className="bg-gradient-to-r from-riviera-light via-bloom to-spritz bg-clip-text text-transparent">
              city
            </span>{" "}
            becomes yours.
          </h1>
          <p className="mx-auto mb-9 max-w-xl text-base text-gray-100 md:text-lg">
            {isLoggedIn
              ? "You're signed in. Jump back in to keep swiping, or scroll down for a refresher on how StudSwap works."
              : "Built for your semester abroad. Swipe to find a verified student swapping flats the opposite way, match, and move in. Plan your next trip or semester now."}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isLoggedIn ? (
              <Link
                href="/swipe"
                className="w-full max-w-xs rounded-full bg-gradient-to-r from-bloom to-riviera px-4 py-3 font-medium text-white shadow-lg shadow-bloom/40 sm:w-auto md:px-10 md:py-4 md:text-lg"
              >
                Back to swiping
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="w-full max-w-xs rounded-full bg-gradient-to-r from-bloom to-riviera px-4 py-3 font-medium text-white shadow-lg shadow-bloom/40 sm:w-auto md:px-10 md:py-4 md:text-lg"
                >
                  Get started
                </Link>
                <Link
                  href="/signup"
                  className="w-full max-w-xs rounded-full border border-white/30 px-4 py-3 font-medium text-white sm:w-auto md:px-10 md:py-4 md:text-lg"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Scroll cue, typographic rather than a lone emoji arrow: a small
            tracked label over a line that pulses downward. */}
        <div className="relative z-10 mx-auto mb-8 hidden flex-col items-center gap-2 text-white/40 motion-reduce:[&>span]:animate-none md:flex">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <span className="h-8 w-px animate-bounce bg-white/40" />
        </div>
      </section>

      {/* Blend the hero's near-black straight into white, so the rest of the
          page can be bright and colorful without a hard cut. */}
      <div aria-hidden className="h-10 bg-gradient-to-b from-[#0B0912] to-white md:h-16" />

      {/* How it works: a numbered list, not a card row — big gradient index
          numerals, hairline dividers, each row rising in as it enters view. */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-carbon-text">How it works</p>
            <h2 className="mb-10 max-w-xl font-display text-3xl font-bold text-chalk md:text-4xl">
              Three steps between you and a new city.
            </h2>
          </Reveal>
          <ol className="flex flex-col divide-y divide-carbon-line border-t border-carbon-line">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delayMs={i * 80}>
                <li className="flex flex-col gap-1 py-7 sm:flex-row sm:items-baseline sm:gap-8 md:py-9">
                  <span className="bg-gradient-to-r from-bloom to-riviera bg-clip-text font-mono text-3xl font-bold text-transparent sm:w-20 sm:flex-shrink-0 md:text-4xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold text-chalk md:text-3xl">{step.title}</p>
                    <p className="mt-1.5 max-w-md text-sm text-carbon-text md:text-base">{step.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Destinations strip: a marquee of hand-drawn city glyphs standing in
          for the photography an agency site would use here, since these are
          generated, not photographed. A soft brand-gradient wash keeps it
          colorful rather than another plain white band. */}
      <section className="bg-gradient-to-r from-riviera/10 via-bloom/5 to-spritz/10 py-14 md:py-20">
        <div className="mx-auto mb-8 max-w-3xl px-6">
          <Reveal>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-carbon-text">Where people are swapping</p>
            <h2 className="max-w-xl font-display text-3xl font-bold text-chalk md:text-4xl">
              Your next semester could start in any of these.
            </h2>
          </Reveal>
        </div>
        <p className="sr-only">Popular cities: {DESTINATIONS.map((d) => d.name).join(", ")}.</p>
        <div aria-hidden className="overflow-hidden" style={{ WebkitMaskImage: EDGE_FADE_MASK, maskImage: EDGE_FADE_MASK }}>
          <div className="flex w-max animate-marquee" style={{ animationDuration: "36s" }}>
            {[0, 1].map((rep) => (
              <div key={rep} className="flex flex-shrink-0 items-center">
                {DESTINATIONS.map((d, i) => (
                  <span key={`${rep}-${i}`} className="mx-5 flex flex-shrink-0 items-center gap-3 md:mx-8">
                    <CityGlyph seed={d.seed} className={`h-9 w-14 md:h-11 md:w-16 ${GLYPH_COLORS[i % GLYPH_COLORS.length]}`} />
                    <span className="font-display text-lg font-semibold text-chalk md:text-xl">{d.name}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features: an editorial list, icon-led rather than card-led, each
          row reveals independently as you scroll to it. */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-carbon-text">Why StudSwap</p>
            <h2 className="mb-10 max-w-xl font-display text-3xl font-bold text-chalk md:text-4xl">
              Built for how students actually swap.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delayMs={i * 80}>
                <div className={`flex h-full flex-col gap-4 rounded-3xl bg-gradient-to-br p-6 shadow-sm md:p-8 ${feature.wash}`}>
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                    {feature.icon}
                  </span>
                  <div>
                    <p className="font-display text-xl font-bold text-chalk md:text-2xl">{feature.title}</p>
                    <p className="mt-1.5 text-sm text-carbon-text md:text-base">{feature.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FaqSection />

      {/* Final CTA: closes the film on the same night skyline it opened on.
          shrink-0: this is a flex item in the page's flex-col scroll
          container, and overflow-hidden (needed to clip CinematicBackdrop)
          makes a flex item's automatic minimum size 0 by spec — without
          shrink-0, once total page content exceeds one screen, flexbox
          shrinks this section below its own content height instead of
          letting the container scroll, clipping the text/button at the
          bottom. The hero section has the same overflow-hidden but is
          saved by its min-h-[100svh] giving it a floor; this section had
          no such floor. */}
      <section className="relative shrink-0 overflow-hidden bg-[#0B0912] px-6 py-24 text-center md:py-32">
        {/* Vignette back on (unlike the hero, this section had it off), so
            the aurora glow can't wash out the text under it. */}
        <CinematicBackdrop />
        <div className="relative">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-white">
            {isLoggedIn ? "Welcome back" : "Get started"}
          </p>
          <h2 className="mx-auto mb-4 max-w-lg font-display text-3xl font-bold text-white md:text-5xl">
            {isLoggedIn ? "Ready to keep swiping?" : "Ready to find your swap?"}
          </h2>
          <p className="mb-8 text-white">
            {isLoggedIn ? "Your matches are waiting." : "It only takes a university email to get started."}
          </p>
          <Link
            href={isLoggedIn ? "/swipe" : "/signup"}
            className="inline-block w-full max-w-xs rounded-full bg-gradient-to-r from-bloom to-riviera px-4 py-3 font-medium text-white shadow-lg shadow-bloom/40 sm:w-auto md:px-10 md:py-4 md:text-lg"
          >
            {isLoggedIn ? "Back to swiping" : "Get started"}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-carbon-line px-6 py-8 text-center text-sm text-carbon-text">
        <p className="mb-1 font-semibold text-chalk">StudSwap</p>
        <p>Made for students, by students. © {new Date().getFullYear()} StudSwap.</p>
      </footer>
    </div>
  );
}
