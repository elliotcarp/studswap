// Shared setup for integration tests that hit the real throwaway test DB
// (see vitest.config.ts / vitest.globalSetup.ts). Not itself a test file
// (no .test. in the name), so Vitest won't try to run it directly.
import { prisma } from "@/lib/prisma";

let counter = 0;
function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

export async function createUserWithProfile(overrides: {
  pricePerDayCents?: number;
  paymentHandle?: string | null;
  paymentMethod?: string | null;
} = {}) {
  const id = uniqueId("user");
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.com`,
      paymentHandle: overrides.paymentHandle ?? null,
      // Defaults to "IBAN" whenever a handle is set (and no explicit method
      // given), matching the confirm route's gate: both fields are
      // required together now, not paymentHandle alone.
      paymentMethod: overrides.paymentMethod ?? (overrides.paymentHandle ? "IBAN" : null),
    },
  });
  await prisma.profile.create({
    data: {
      userId: user.id,
      name: id,
      age: 22,
      university: "Test University",
      program: "Test Program",
      yearOfStudy: "2nd year",
      homeCity: "Paris",
      availableFrom: new Date("2026-01-01"),
      availableTo: new Date("2026-12-31"),
      accommodates: 1,
      pricePerDayCents: overrides.pricePerDayCents ?? 4000,
      smoker: "No",
      pets: "No pets",
      selfPhotoUrls: "[]",
      flatPhotoUrls: "[]",
      prompts: "[]",
    },
  });
  return user;
}

export async function createValidatedMatch(params: {
  userAId: string;
  userBId: string;
  stayFrom: Date;
  stayTo: Date;
  type?: "MUTUAL" | "PAID";
  paidByUserId?: string;
}) {
  return prisma.match.create({
    data: {
      userAId: params.userAId,
      userBId: params.userBId,
      type: params.type ?? "MUTUAL",
      paidByUserId: params.paidByUserId ?? null,
      status: "VALIDATED",
      stayFrom: params.stayFrom,
      stayTo: params.stayTo,
      confirmedByUserA: true,
      confirmedByUserB: true,
      confirmationPaymentIntentIdUserA: `pi_${uniqueId("a")}`,
      confirmationPaymentIntentIdUserB: `pi_${uniqueId("b")}`,
      confirmationChargedAtUserA: new Date(),
      confirmationChargedAtUserB: new Date(),
    },
  });
}

export async function cleanupMatch(matchId: string) {
  await prisma.forfeiturePayout.deleteMany({ where: { matchId } });
  await prisma.cancellationLog.deleteMany({ where: { matchId } });
  await prisma.match.delete({ where: { id: matchId } }).catch(() => {});
}

export async function cleanupUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}
