import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // "Exchange Rate" palette — see /legal or design notes. Named for what
        // they are, not what they're for: riviera/bloom/spritz form one warm
        // gradient family (hero washes, primary CTAs, the match reveal);
        // highlighter and carbon are used solo, never in the gradient.
        riviera: {
          DEFAULT: "#2F5FF0", // primary — links, selected states, solid buttons
          strong: "#12328F", // dark end of gradients, chat-bubble-on-dark text
          light: "#8FA9FF", // dark-mode primary
        },
        bloom: {
          DEFAULT: "#FF4F93", // gradient midpoint — fills, never small text
          text: "#C22A6E", // contrast-safe on white (~5:1) for text/links
        },
        spritz: {
          DEFAULT: "#FF6A3D", // price/urgency fills, gradient far end
          text: "#B8431B", // contrast-safe on white for text/focus rings
        },
        highlighter: {
          DEFAULT: "#D4FF3D", // one-off pops: unread dots, "new" badges
          ink: "#2B3300", // text color to put ON highlighter backgrounds
        },
        carbon: {
          DEFAULT: "#8A84A6", // secondary text/icons (rev.2 fix: 3.5:1 -> use -text for body copy)
          text: "#6B6483", // contrast-safe secondary text (~5.5:1)
          line: "#E7E3EF", // borders, dividers
        },
        chalk: "#1C1926", // body text
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-data)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Two deliberate elevation levels (see src/components/ui/Surface.tsx)
      // instead of reaching for stock shadow-sm/md/lg per call site — bigger
      // surfaces read as "thicker" with a deeper, softer shadow (skill
      // .claude/SKILL.md §12), small chips/pills stay at `surface`.
      boxShadow: {
        surface: "0 1px 2px rgba(28, 25, 38, 0.06), 0 1px 1px rgba(28, 25, 38, 0.04)",
        elevated: "0 16px 40px -12px rgba(47, 95, 240, 0.18), 0 4px 12px rgba(28, 25, 38, 0.06)",
      },
      borderRadius: {
        // Named, not just "the app happens to use rounded-2xl/3xl a lot" —
        // `card` is the standard app-surface radius, `pill` for anything
        // fully rounded that isn't literally `rounded-full` (kept distinct
        // so a future radius tweak doesn't also affect true pill shapes).
        card: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
