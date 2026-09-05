import { describe, it, expect, vi, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createUserWithProfile, cleanupUser } from "@/lib/testHelpers.integration";

// The brief: "Someone who hasn't given us payment details being unable to
// confirm an arrangement where they'd be paid." This exercises the real
// gate in the confirm route against a real DB (settlement math included),
// mocking only the session (who's calling) and Stripe (never expected to
// be reached in the rejection case).
let sessionUserId: string;
vi.mock("next-auth", () => ({
  getServerSession: () => Promise.resolve({ user: { id: sessionUserId } }),
}));
vi.mock("@/lib/confirmationCharge", () => ({
  createConfirmationCheckoutSession: () => Promise.resolve({ url: "https://stripe.test/checkout" }),
}));

const { POST } = await import("./route");

function fakeRequest() {
  return new Request("http://localhost/api/matches/x/confirm", { method: "POST" });
}

describe("POST /api/matches/[id]/confirm — payee payment-handle gate (real DB)", () => {
  const userIds: string[] = [];
  let matchId: string | undefined;

  afterEach(async () => {
    if (matchId) {
      await prisma.match.delete({ where: { id: matchId } }).catch(() => {});
      matchId = undefined;
    }
    for (const id of userIds.splice(0)) await cleanupUser(id);
  });

  it("rejects confirming when the confirmer would be owed money and has no payment handle", async () => {
    // A's flat (payee once B occupies it) is pricier, so B owes A — A must
    // have a payment handle before A can confirm.
    const a = await createUserWithProfile({ pricePerDayCents: 6000, paymentHandle: null });
    const b = await createUserWithProfile({ pricePerDayCents: 4000 });
    userIds.push(a.id, b.id);

    const match = await prisma.match.create({
      data: {
        userAId: a.id,
        userBId: b.id,
        type: "MUTUAL",
        status: "PENDING",
        stayFrom: new Date("2026-06-01"),
        stayTo: new Date("2026-06-08"),
      },
    });
    matchId = match.id;

    sessionUserId = a.id;
    const res = await POST(fakeRequest(), { params: { id: match.id } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/paid/i);
  });

  it("allows confirming once the payee has added a payment handle", async () => {
    const a = await createUserWithProfile({ pricePerDayCents: 6000, paymentHandle: "iban-a" });
    const b = await createUserWithProfile({ pricePerDayCents: 4000 });
    userIds.push(a.id, b.id);

    const match = await prisma.match.create({
      data: {
        userAId: a.id,
        userBId: b.id,
        type: "MUTUAL",
        status: "PENDING",
        stayFrom: new Date("2026-06-01"),
        stayTo: new Date("2026-06-08"),
      },
    });
    matchId = match.id;

    sessionUserId = a.id;
    const res = await POST(fakeRequest(), { params: { id: match.id } });
    expect(res.status).toBe(200);
  });

  it("never blocks the side who owes money, even without a payment handle", async () => {
    const a = await createUserWithProfile({ pricePerDayCents: 6000 });
    const b = await createUserWithProfile({ pricePerDayCents: 4000, paymentHandle: null });
    userIds.push(a.id, b.id);

    const match = await prisma.match.create({
      data: {
        userAId: a.id,
        userBId: b.id,
        type: "MUTUAL",
        status: "PENDING",
        stayFrom: new Date("2026-06-01"),
        stayTo: new Date("2026-06-08"),
      },
    });
    matchId = match.id;

    sessionUserId = b.id; // B is the payer, not owed anything
    const res = await POST(fakeRequest(), { params: { id: match.id } });
    expect(res.status).toBe(200);
  });
});
