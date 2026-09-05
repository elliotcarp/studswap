import { describe, it, expect } from "vitest";
import {
  CANCELLATION_POLICY,
  computeCancellationOutcome,
  confirmationChargeTotalCents,
  daysNotice,
} from "./cancellationPolicy";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("confirmationChargeTotalCents", () => {
  it("is exactly €5 service fee + €20 refundable, never €25 refundable", () => {
    expect(CANCELLATION_POLICY.serviceFeeCents).toBe(500);
    expect(CANCELLATION_POLICY.refundableCents).toBe(2000);
    expect(confirmationChargeTotalCents()).toBe(2500);
  });
});

describe("computeCancellationOutcome boundary", () => {
  const freeCancelDays = CANCELLATION_POLICY.freeCancelDaysBeforeStay;

  it("is REFUNDED just over the cutoff (more than 7 days' notice)", () => {
    const stayFrom = new Date("2026-06-01T00:00:00Z");
    const now = new Date(stayFrom.getTime() - (freeCancelDays * DAY_MS + 1000));
    expect(daysNotice(now, stayFrom)).toBeGreaterThan(freeCancelDays);
    expect(computeCancellationOutcome(now, stayFrom)).toBe("REFUNDED");
  });

  it("is FORFEITED at exactly the cutoff (7.0 days' notice = 7 days or less)", () => {
    const stayFrom = new Date("2026-06-01T00:00:00Z");
    const now = new Date(stayFrom.getTime() - freeCancelDays * DAY_MS);
    expect(daysNotice(now, stayFrom)).toBe(freeCancelDays);
    expect(computeCancellationOutcome(now, stayFrom)).toBe("FORFEITED");
  });

  it("is FORFEITED just under the cutoff", () => {
    const stayFrom = new Date("2026-06-01T00:00:00Z");
    const now = new Date(stayFrom.getTime() - (freeCancelDays * DAY_MS - 1000));
    expect(computeCancellationOutcome(now, stayFrom)).toBe("FORFEITED");
  });

  it("is FORFEITED after the stay has already started (negative notice)", () => {
    const stayFrom = new Date("2026-06-01T00:00:00Z");
    const now = new Date(stayFrom.getTime() + DAY_MS);
    expect(daysNotice(now, stayFrom)).toBeLessThan(0);
    expect(computeCancellationOutcome(now, stayFrom)).toBe("FORFEITED");
  });
});
