// Computes the informational settlement snapshot for a match, once both
// sides have paid their €25 confirmation charge (see
// /api/stripe/webhook). StudSwap calculates, displays, and records this
// amount — it never charges, holds, or transfers it. The two users settle
// it directly between themselves, by whatever means they choose (see
// User.paymentHandle).
//
// MUTUAL: the two flats' total stay values (agreed days x each side's
// per-day price, negotiable independently via chat — see
// negotiatedPricePerDayCentsUserA/B) are compared. Each side occupies the
// OTHER side's flat, so whoever's own flat is worth more is the one giving
// up more value — that side is owed the difference by the side occupying
// the pricier flat.
// PAID: the payer (paidByUserId) owes the flat owner's total stay price, at
// the owner's listed rate or a negotiated one (negotiatedPricePerDayCentsPaid).

import type { Prisma, PrismaClient } from "@prisma/client";
import { totalStayPriceCents } from "./pricing";

type TxClient = Prisma.TransactionClient | PrismaClient;

interface MatchForSettlement {
  userAId: string;
  userBId: string;
  type: string;
  paidByUserId: string | null;
  stayFrom: Date;
  stayTo: Date;
  negotiatedPricePerDayCentsPaid: number | null;
  negotiatedPricePerDayCentsUserA: number | null;
  negotiatedPricePerDayCentsUserB: number | null;
}

export async function computeSettlement(
  tx: TxClient,
  match: MatchForSettlement
): Promise<{ settlementAmountCents: number; settlementPayerId: string | null }> {
  if (match.type === "PAID") {
    const payerId = match.paidByUserId;
    if (!payerId) throw new Error("PAID match missing paidByUserId");
    const ownerId = payerId === match.userAId ? match.userBId : match.userAId;
    const owner = await tx.profile.findUnique({
      where: { userId: ownerId },
      select: { pricePerDayCents: true },
    });
    if (!owner) throw new Error("Flat owner's profile not found");

    const pricePerDay = match.negotiatedPricePerDayCentsPaid ?? owner.pricePerDayCents;
    const total = totalStayPriceCents(pricePerDay, match.stayFrom, match.stayTo);
    return { settlementAmountCents: total, settlementPayerId: payerId };
  }

  const [profileA, profileB] = await Promise.all([
    tx.profile.findUnique({ where: { userId: match.userAId }, select: { pricePerDayCents: true } }),
    tx.profile.findUnique({ where: { userId: match.userBId }, select: { pricePerDayCents: true } }),
  ]);
  const rateA = match.negotiatedPricePerDayCentsUserA ?? profileA?.pricePerDayCents ?? null;
  const rateB = match.negotiatedPricePerDayCentsUserB ?? profileB?.pricePerDayCents ?? null;
  const totalA = rateA != null ? totalStayPriceCents(rateA, match.stayFrom, match.stayTo) : 0;
  const totalB = rateB != null ? totalStayPriceCents(rateB, match.stayFrom, match.stayTo) : 0;
  const diff = totalA - totalB;
  // The side whose OWN flat is worth more is owed the difference: the other
  // side occupies that pricier flat while only offering their cheaper one
  // in return.
  const compensatedUserId = diff > 0 ? match.userAId : diff < 0 ? match.userBId : null;
  if (!compensatedUserId) return { settlementAmountCents: 0, settlementPayerId: null };

  const payerId = compensatedUserId === match.userAId ? match.userBId : match.userAId;
  return { settlementAmountCents: Math.abs(diff), settlementPayerId: payerId };
}
