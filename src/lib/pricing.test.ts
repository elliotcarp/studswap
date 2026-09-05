import { describe, it, expect } from "vitest";
import {
  estimateDayRateFromMonthlyRentCents,
  estimateSuggestedDepositCents,
  stayDurationDays,
  totalStayPriceCents,
} from "./pricing";

describe("stayDurationDays", () => {
  it("counts exact-day spans without an off-by-one", () => {
    expect(stayDurationDays(new Date("2026-06-01"), new Date("2026-06-08"))).toBe(7);
  });

  it("never returns less than 1 night, even for a same-day span", () => {
    expect(stayDurationDays(new Date("2026-06-01T10:00:00Z"), new Date("2026-06-01T14:00:00Z"))).toBe(1);
  });

  it("rounds a fractional day (DST-ish edge) to the nearest whole night", () => {
    // 6.9 days -> 7
    const from = new Date("2026-06-01T00:00:00Z");
    const to = new Date(from.getTime() + 6.9 * 24 * 60 * 60 * 1000);
    expect(stayDurationDays(from, to)).toBe(7);
  });
});

describe("totalStayPriceCents", () => {
  it("multiplies price/day by nights", () => {
    expect(totalStayPriceCents(4000, new Date("2026-06-01"), new Date("2026-06-08"))).toBe(28000);
  });
});

describe("estimateDayRateFromMonthlyRentCents", () => {
  it("divides rent by a 30-day month, matching the long-stay proration", () => {
    expect(estimateDayRateFromMonthlyRentCents(90000)).toBe(3000);
  });

  it("never returns zero for a very low rent", () => {
    expect(estimateDayRateFromMonthlyRentCents(10)).toBe(1);
  });
});

describe("estimateSuggestedDepositCents", () => {
  it("scales with a few nights' rent", () => {
    expect(estimateSuggestedDepositCents(3000)).toBe(9000);
  });

  it("floors at the minimum for a very cheap flat", () => {
    expect(estimateSuggestedDepositCents(500)).toBe(5000);
  });

  it("caps at the maximum for an expensive flat", () => {
    expect(estimateSuggestedDepositCents(20000)).toBe(30000);
  });
});
