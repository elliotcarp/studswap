import { describe, it, expect, vi, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createUserWithProfile,
  cleanupUser,
} from "@/lib/testHelpers.integration";

// Stripe webhooks are only trustworthy once signature-verified — real
// signature verification needs a live secret, so this test bypasses it by
// mocking stripe.webhooks.constructEvent to just return whatever event the
// test handed it, and exercises the route's actual DB-idempotency logic
// (the part the brief specifically asks to be tested: "Stripe telling us
// about the same event twice, and it only counting once").
let nextEvent: unknown;
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: () => nextEvent,
    },
  },
}));

const { POST } = await import("./route");

function fakeRequest(body: unknown) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "test" },
    body: JSON.stringify(body),
  });
}

describe("Stripe webhook — checkout.session.completed idempotency (real DB)", () => {
  const userIds: string[] = [];
  let matchId: string | undefined;

  afterEach(async () => {
    if (matchId) {
      await prisma.match.delete({ where: { id: matchId } }).catch(() => {});
      matchId = undefined;
    }
    for (const id of userIds.splice(0)) await cleanupUser(id);
  });

  it("only flips confirmedByUserA once, even if the same event is delivered twice", async () => {
    const a = await createUserWithProfile();
    const b = await createUserWithProfile();
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

    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { purpose: "confirmation_charge", matchId: match.id, side: "A" },
          payment_intent: "pi_test_a",
        },
      },
    };

    nextEvent = event;
    const res1 = await POST(fakeRequest(event));
    expect(res1.status).toBe(200);

    const afterFirst = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(afterFirst.confirmedByUserA).toBe(true);
    expect(afterFirst.confirmationPaymentIntentIdUserA).toBe("pi_test_a");

    // Redeliver the identical event (Stripe does this) — must be a no-op.
    nextEvent = event;
    const res2 = await POST(fakeRequest(event));
    expect(res2.status).toBe(200);

    const afterSecond = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(afterSecond.confirmedByUserA).toBe(true);
    expect(afterSecond.confirmationPaymentIntentIdUserA).toBe("pi_test_a");
    // Still PENDING — B never confirmed, so redelivery must not validate it.
    expect(afterSecond.status).toBe("PENDING");
  });

  it("validates the match and freezes payment-handle snapshots once both sides have confirmed", async () => {
    const a = await createUserWithProfile({ paymentHandle: "iban-a" });
    const b = await createUserWithProfile({ paymentHandle: "iban-b" });
    userIds.push(a.id, b.id);

    const match = await prisma.match.create({
      data: {
        userAId: a.id,
        userBId: b.id,
        type: "MUTUAL",
        status: "PENDING",
        stayFrom: new Date("2026-06-01"),
        stayTo: new Date("2026-06-08"),
        confirmedByUserA: true,
        confirmationPaymentIntentIdUserA: "pi_test_a",
      },
    });
    matchId = match.id;

    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { purpose: "confirmation_charge", matchId: match.id, side: "B" },
          payment_intent: "pi_test_b",
        },
      },
    };
    nextEvent = event;
    await POST(fakeRequest(event));

    const after = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(after.status).toBe("VALIDATED");
    expect(after.paymentMethodSnapshotUserA).toBe("IBAN");
    expect(after.paymentHandleSnapshotUserA).toBe("iban-a");
    expect(after.paymentMethodSnapshotUserB).toBe("IBAN");
    expect(after.paymentHandleSnapshotUserB).toBe("iban-b");
  });
});
