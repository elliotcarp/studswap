"use client";

// Internal-only dashboard: forfeiture payouts owed (paid by manual bank
// transfer, see ForfeiturePayout model comment), open no-show reports and
// settlement disputes (StudSwap doesn't arbitrate either, just makes sure a
// real complaint has somewhere to land), and the manual "our fault, refund
// everything" trigger. Gated server-side by /admin/page.tsx via
// getAdminEmail() — every fetch here still hits an admin-gated API route
// too, so this page has no elevated access of its own.

import { useEffect, useState } from "react";
import { paymentMethodLabel } from "@/components/PaymentMethodEditor";

interface Payout {
  id: string;
  matchId: string;
  amountCents: number;
  status: "PENDING" | "PAID";
  note: string | null;
  paidReference: string | null;
  createdAt: string;
  paidAt: string | null;
  recipient: {
    name: string;
    email: string;
    paymentMethod: string | null;
    paymentHandle: string | null;
    paymentHandleAccountName: string | null;
  };
}

interface NoShowReport {
  matchId: string;
  stayFrom: string | null;
  reportedByName: string;
  reportedAgainstName: string;
  reportedAt: string | null;
  resolved: boolean;
}

interface SettlementDispute {
  matchId: string;
  amountCents: number;
  reportedByName: string;
  note: string | null;
  reportedAt: string | null;
}

function formatEuros(cents: number) {
  return `€${(cents / 100).toFixed(0)}`;
}

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export default function AdminDashboard() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [noShows, setNoShows] = useState<NoShowReport[]>([]);
  const [disputes, setDisputes] = useState<SettlementDispute[]>([]);
  const [referenceDrafts, setReferenceDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [voidMatchId, setVoidMatchId] = useState("");
  const [voidBusy, setVoidBusy] = useState(false);
  const [voidMessage, setVoidMessage] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/payouts")
      .then((r) => r.json())
      .then((d) => setPayouts(d.payouts ?? []));
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then((d) => {
        setNoShows(d.noShows ?? []);
        setDisputes(d.settlementDisputes ?? []);
      });
  }

  useEffect(load, []);

  async function markPaid(payoutId: string) {
    const reference = (referenceDrafts[payoutId] ?? "").trim();
    if (!reference) return;
    setBusyId(payoutId);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      if (res.ok) load();
    } finally {
      setBusyId(null);
    }
  }

  async function voidOurFault() {
    if (!voidMatchId.trim()) return;
    setVoidBusy(true);
    setVoidMessage(null);
    try {
      const res = await fetch(`/api/admin/matches/${voidMatchId.trim()}/void-our-fault`, { method: "POST" });
      const data = await res.json().catch(() => null);
      setVoidMessage(res.ok ? "Refunded in full. Both sides notified." : data?.error ?? "Could not void this match.");
    } finally {
      setVoidBusy(false);
    }
  }

  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const paidPayouts = payouts.filter((p) => p.status === "PAID");

  return (
    <main className="mx-auto max-w-3xl p-6 pb-16">
      <h1 className="font-display text-2xl font-bold text-gray-900">Admin</h1>
      <p className="mt-1 text-sm text-gray-500">Internal only. Nothing here is exposed to regular users.</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800">Payouts owed ({pendingPayouts.length})</h2>
        <p className="mt-1 text-xs text-gray-500">
          Paid by manual bank transfer to the recipient's payment details, not automatically. Enter the transfer
          reference to mark one as sent.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {pendingPayouts.length === 0 && <p className="text-sm text-gray-400">Nothing pending.</p>}
          {pendingPayouts.map((p) => (
            <div key={p.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">
                  {formatEuros(p.amountCents)} to {p.recipient.name}
                </p>
                <span className="text-xs text-gray-400">Owed since {formatDate(p.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {p.recipient.paymentHandle
                  ? `${paymentMethodLabel(p.recipient.paymentMethod)}: ${p.recipient.paymentHandle}${p.recipient.paymentHandleAccountName ? ` (${p.recipient.paymentHandleAccountName})` : ""}`
                  : "No payment details on file — contact them directly."}
                {" · "}
                {p.recipient.email}
                {p.note ? ` · ${p.note}` : ""}
                {" · match "}
                {p.matchId}
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={referenceDrafts[p.id] ?? ""}
                  onChange={(e) => setReferenceDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                  placeholder="Bank transfer reference"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => markPaid(p.id)}
                  disabled={busyId === p.id || !(referenceDrafts[p.id] ?? "").trim()}
                  className="rounded-lg bg-riviera px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Mark paid
                </button>
              </div>
            </div>
          ))}
        </div>

        {paidPayouts.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500">Paid ({paidPayouts.length})</summary>
            <div className="mt-2 flex flex-col gap-2">
              {paidPayouts.map((p) => (
                <p key={p.id} className="text-xs text-gray-500">
                  {formatEuros(p.amountCents)} to {p.recipient.name}, paid {formatDate(p.paidAt)}
                  {p.paidReference ? ` (ref: ${p.paidReference})` : ""}
                </p>
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-800">No-show reports ({noShows.length})</h2>
        <div className="mt-3 flex flex-col gap-2">
          {noShows.length === 0 && <p className="text-sm text-gray-400">None.</p>}
          {noShows.map((r) => (
            <div key={r.matchId} className="rounded-xl border border-gray-200 p-3 text-sm">
              <p>
                <strong>{r.reportedByName}</strong> reported <strong>{r.reportedAgainstName}</strong> as a no-show
                {" · "}stay started {formatDate(r.stayFrom)} · reported {formatDate(r.reportedAt)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {r.resolved ? "Resolved — compensation payout created." : "Not yet resolved."} Match {r.matchId}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-800">Settlement disputes ({disputes.length})</h2>
        <p className="mt-1 text-xs text-gray-500">
          "They never paid me" style reports. StudSwap doesn't handle this money and can't resolve these — this is
          purely a record.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {disputes.length === 0 && <p className="text-sm text-gray-400">None.</p>}
          {disputes.map((d) => (
            <div key={d.matchId} className="rounded-xl border border-gray-200 p-3 text-sm">
              <p>
                <strong>{d.reportedByName}</strong> flagged the {formatEuros(d.amountCents)} settlement on match{" "}
                {d.matchId} · {formatDate(d.reportedAt)}
              </p>
              {d.note && <p className="mt-1 text-xs text-gray-600">"{d.note}"</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-lg font-semibold text-red-900">Void a match — our fault</h2>
        <p className="mt-1 text-xs text-red-800">
          Full €25 refund to both sides, including the service fee. Only works on a validated match that hasn't
          already had a refund or forfeiture processed.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={voidMatchId}
            onChange={(e) => setVoidMatchId(e.target.value)}
            placeholder="Match ID"
            className="flex-1 rounded-lg border border-red-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={voidOurFault}
            disabled={voidBusy || !voidMatchId.trim()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Refund in full
          </button>
        </div>
        {voidMessage && <p className="mt-2 text-xs text-red-800">{voidMessage}</p>}
      </section>

      <section className="mt-10">
        <a href="/api/admin/export/registrations" className="text-sm font-medium text-riviera underline">
          Export short-term rental registration numbers (CSV)
        </a>
      </section>
    </main>
  );
}
