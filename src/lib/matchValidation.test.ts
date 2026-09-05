import { describe, it, expect } from "vitest";
import { computeSettlement } from "./matchValidation";

// Minimal fake of the Prisma tx client surface computeSettlement actually
// calls (tx.profile.findUnique) — a real DB isn't needed for pure settlement
// math, see the .integration.test.ts suite for the stateful/race scenarios.
function fakeTx(pricesByUserId: Record<string, number>) {
  return {
    profile: {
      findUnique: async ({ where: { userId } }: { where: { userId: string } }) =>
        userId in pricesByUserId ? { pricePerDayCents: pricesByUserId[userId] } : null,
    },
  } as never;
}

const stayFrom = new Date("2026-06-01");
const stayTo = new Date("2026-06-08"); // 7 nights

describe("computeSettlement — MUTUAL", () => {
  it("nobody owes anybody when both flats are priced equally", async () => {
    const tx = fakeTx({ a: 4000, b: 4000 });
    const result = await computeSettlement(tx, {
      userAId: "a",
      userBId: "b",
      type: "MUTUAL",
      paidByUserId: null,
      stayFrom,
      stayTo,
      negotiatedPricePerDayCentsPaid: null,
      negotiatedPricePerDayCentsUserA: null,
      negotiatedPricePerDayCentsUserB: null,
    });
    expect(result).toEqual({ settlementAmountCents: 0, settlementPayerId: null });
  });

  it("charges the difference to whoever occupies the pricier flat, when A is pricier", async () => {
    const tx = fakeTx({ a: 6000, b: 4000 });
    const result = await computeSettlement(tx, {
      userAId: "a",
      userBId: "b",
      type: "MUTUAL",
      paidByUserId: null,
      stayFrom,
      stayTo,
      negotiatedPricePerDayCentsPaid: null,
      negotiatedPricePerDayCentsUserA: null,
      negotiatedPricePerDayCentsUserB: null,
    });
    // A's flat is worth more (7*6000=42000 vs 7*4000=28000) -> B occupies the
    // pricier flat and owes A the 14000 difference.
    expect(result).toEqual({ settlementAmountCents: 14000, settlementPayerId: "b" });
  });

  it("charges the difference the other way when B is pricier", async () => {
    const tx = fakeTx({ a: 4000, b: 6000 });
    const result = await computeSettlement(tx, {
      userAId: "a",
      userBId: "b",
      type: "MUTUAL",
      paidByUserId: null,
      stayFrom,
      stayTo,
      negotiatedPricePerDayCentsPaid: null,
      negotiatedPricePerDayCentsUserA: null,
      negotiatedPricePerDayCentsUserB: null,
    });
    expect(result).toEqual({ settlementAmountCents: 14000, settlementPayerId: "a" });
  });

  it("negotiated prices override listed prices independently per side", async () => {
    const tx = fakeTx({ a: 4000, b: 4000 });
    const result = await computeSettlement(tx, {
      userAId: "a",
      userBId: "b",
      type: "MUTUAL",
      paidByUserId: null,
      stayFrom,
      stayTo,
      negotiatedPricePerDayCentsPaid: null,
      negotiatedPricePerDayCentsUserA: 5000, // negotiated up from listed 4000
      negotiatedPricePerDayCentsUserB: null,
    });
    expect(result).toEqual({ settlementAmountCents: 7000, settlementPayerId: "b" });
  });
});

describe("computeSettlement — PAID (one-directional)", () => {
  it("the payer owes the flat owner's full stay cost", async () => {
    const tx = fakeTx({ owner: 3000 });
    const result = await computeSettlement(tx, {
      userAId: "payer",
      userBId: "owner",
      type: "PAID",
      paidByUserId: "payer",
      stayFrom,
      stayTo,
      negotiatedPricePerDayCentsPaid: null,
      negotiatedPricePerDayCentsUserA: null,
      negotiatedPricePerDayCentsUserB: null,
    });
    expect(result).toEqual({ settlementAmountCents: 21000, settlementPayerId: "payer" });
  });

  it("a negotiated price overrides the owner's listed price", async () => {
    const tx = fakeTx({ owner: 3000 });
    const result = await computeSettlement(tx, {
      userAId: "payer",
      userBId: "owner",
      type: "PAID",
      paidByUserId: "payer",
      stayFrom,
      stayTo,
      negotiatedPricePerDayCentsPaid: 2500,
      negotiatedPricePerDayCentsUserA: null,
      negotiatedPricePerDayCentsUserB: null,
    });
    expect(result).toEqual({ settlementAmountCents: 17500, settlementPayerId: "payer" });
  });
});
