import type { Metadata } from "next";
import { Baloo_2, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Three roles, three faces (see design notes): Baloo 2 carries personality on
// headlines and is used sparingly; Instrument Sans is the everyday body/UI
// face; IBM Plex Mono is reserved for genuinely transactional numbers
// (price, dates, settlement amounts) so they read as data, not prose.
const baloo2 = Baloo_2({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-data" });

export const metadata: Metadata = {
  title: "StudSwap",
  description: "Swap flats with verified students for your semester abroad, internship, or exchange.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // prevent pinch-zoom from interfering with swipe gestures
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // No forced phone-frame here: each page controls its own responsive width
  // (narrow + centered for forms/onboarding, wider on desktop for
  // lists/swipe/profile). See Navbar for the mobile bottom-bar / desktop
  // left-sidebar split that this depends on.
  return (
    <html lang="en" className={`${baloo2.variable} ${instrumentSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-white font-sans text-chalk">{children}</body>
    </html>
  );
}
