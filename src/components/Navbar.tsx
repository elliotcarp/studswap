"use client";

// Responsive nav: fixed bottom tab bar on mobile, fixed left sidebar on
// desktop (md+) so the app feels native on a wide screen instead of a phone
// tab bar stranded in the middle of empty space.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NotificationCounts } from "@/types";
import { ArrowRightLeftIcon, FlameIcon, HeartHandshakeIcon, HeartIcon, UserShieldIcon } from "./icons";

const POLL_INTERVAL_MS = 15000;

// Each icon keeps its own color regardless of active/inactive state (the
// active tab's label/background still switches, see below) so the icon
// itself reads as that tab's identity: flame=spritz (fire), heart=bloom
// (love), handshake=riviera (a deal), swap arrows=emerald (exchange),
// shield=violet (protected/verified).
const TABS = [
  { href: "/swipe", label: "Swipe", Icon: FlameIcon, iconColor: "text-spritz" },
  { href: "/liked", label: "Liked", Icon: HeartIcon, iconColor: "text-bloom" },
  { href: "/matches", label: "Matches", Icon: HeartHandshakeIcon, iconColor: "text-riviera" },
  { href: "/swaps", label: "Swaps", Icon: ArrowRightLeftIcon, iconColor: "text-emerald-600" },
  { href: "/profile", label: "Profile", Icon: UserShieldIcon, iconColor: "text-violet-600" },
] as const;

function badgeCountFor(href: (typeof TABS)[number]["href"], counts: NotificationCounts | null) {
  if (!counts) return 0;
  if (href === "/liked") return counts.likedCount;
  if (href === "/matches") return counts.unreadMatchCount;
  return 0;
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-spritz px-1 text-[10px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<NotificationCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch("/api/notifications")
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          if (!cancelled) setCounts(data);
        })
        .catch(() => {
          // Best-effort: badges just won't update on a transient failure.
        });
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {/* Mobile: bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t bg-white py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium ${
                active ? "text-chalk" : "text-gray-400"
              }`}
            >
              <span className="relative inline-flex">
                <tab.Icon className={`h-6 w-6 ${tab.iconColor}`} />
                <Badge count={badgeCountFor(tab.href, counts)} />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: fixed left sidebar */}
      <nav className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-white p-4 md:flex">
        <Link href="/" className="mb-8 px-2 font-display text-xl font-bold text-chalk">
          StudSwap
        </Link>
        <div className="flex flex-col gap-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-chalk/10 text-chalk" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span className="relative inline-flex">
                  <tab.Icon className={`h-5 w-5 ${tab.iconColor}`} />
                  <Badge count={badgeCountFor(tab.href, counts)} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
