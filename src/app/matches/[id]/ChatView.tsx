"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MessageData, ProfileCardData } from "@/types";
import TripDetails from "./TripDetails";
import ProfileCard from "@/components/ProfileCard";
import MatchStatusPill from "@/components/MatchStatusPill";
import { paymentMethodLabel } from "@/lib/paymentMethods";

const POLL_INTERVAL_MS = 3000;

export default function ChatView({
  matchId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherProfile,
  matchType,
  isPayer,
  myPaymentMethod,
  myPaymentHandle,
  myPaymentHandleAccountName,
}: {
  matchId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherProfile: ProfileCardData | null;
  matchType: "MUTUAL" | "PAID";
  isPayer: boolean;
  // From the current user's own profile (set in onboarding/profile), used
  // only to compose the optional "share my payment info" chat message below
  // — never sent or shown anywhere else in this component.
  myPaymentMethod: string | null;
  myPaymentHandle: string | null;
  myPaymentHandleAccountName: string | null;
}) {
  const [tab, setTab] = useState<"chat" | "profile">("chat");
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      fetch(`/api/matches/${matchId}/messages`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          if (!cancelled) setMessages(data.messages);
        })
        .catch(() => {
          // Best-effort: keep showing the last known messages on a transient failure.
        });
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // postMessage is shared by the draft-typed send flow and sharePaymentInfo
  // below, so a payment-info message goes through the exact same endpoint
  // and lands in the same list, rather than being special-cased locally.
  const postMessage = async (body: string) => {
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const message: MessageData = await res.json();
        setMessages((prev) => [...prev, message]);
      }
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    await postMessage(body);
  };

  // Pulls the current user's own payment destination (set once in
  // onboarding/profile, see PaymentMethodEditor) straight into the chat as
  // a normal message, so they don't have to retype it by hand. Hidden
  // entirely when it isn't set yet (see the button below) rather than
  // nagging about it here.
  const sharePaymentInfo = async () => {
    if (!myPaymentMethod || !myPaymentHandle) return;
    const body = `Here's how to pay me. ${paymentMethodLabel(myPaymentMethod)}: ${myPaymentHandle}${
      myPaymentHandleAccountName ? ` (${myPaymentHandleAccountName})` : ""
    }`;
    await postMessage(body);
  };

  return (
    <main className="flex h-screen justify-center bg-gray-50">
    <div className="flex h-full w-full max-w-2xl flex-col bg-white md:shadow-sm">
      {/* Translucent material (skill §12) with a soft fade at the bottom
          edge instead of a hard 1px border. Not position:sticky — this
          header already sits outside the messages list's own scroll
          container (only that list scrolls, see below), so it never
          scrolls away in the first place. */}
      <header className="glass-sheet glass-edge-fade-bottom flex items-center gap-2 p-4">
        <Link
          href="/matches"
          aria-label="Back to matches"
          className="text-xl transition-transform active:scale-90"
        >
          ←
        </Link>
        <Link href={`/profile/${otherUserId}`} className="min-w-0 flex-1 truncate text-lg font-semibold">
          {otherUserName}
        </Link>
        <MatchStatusPill matchType={matchType} isPayer={isPayer} />
      </header>

      <div className="flex border-b text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab("chat")}
          className={`flex-1 py-2.5 ${tab === "chat" ? "border-b-2 border-riviera text-riviera" : "text-gray-500"}`}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => setTab("profile")}
          className={`flex-1 py-2.5 ${tab === "profile" ? "border-b-2 border-riviera text-riviera" : "text-gray-500"}`}
        >
          Profile
        </button>
      </div>

      {tab === "profile" ? (
        <div className="relative flex-1 overflow-hidden">
          {otherProfile ? (
            <ProfileCard profile={otherProfile} showAddress ratingDisplay="full" />
          ) : (
            <p className="p-4 text-center text-sm text-gray-400">This person hasn&apos;t set up their profile yet.</p>
          )}
        </div>
      ) : (
        <>
          <TripDetails matchId={matchId} />

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.map((message) => {
              const mine = message.senderId === currentUserId;
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <p
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      mine ? "bg-riviera text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {message.body}
                  </p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {myPaymentMethod && myPaymentHandle && (
            <div className="px-3 pt-2">
              <button
                type="button"
                onClick={sharePaymentInfo}
                disabled={sending}
                className="text-xs font-medium text-riviera disabled:opacity-50"
              >
                💳 Share my payment info
              </button>
            </div>
          )}

          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="rounded-full bg-riviera px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95 disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
    </main>
  );
}
