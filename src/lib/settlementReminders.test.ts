import { describe, it, expect } from "vitest";
import { settlementReminderStage } from "./settlementReminders";

const DAY_MS = 24 * 60 * 60 * 1000;
const stayFrom = new Date("2026-06-01T00:00:00Z");

describe("settlementReminderStage", () => {
  it("is null before 24h into the stay", () => {
    expect(settlementReminderStage(new Date(stayFrom.getTime() + DAY_MS - 1000), stayFrom, 1000, false)).toBeNull();
  });

  it("is DUE right at 24h", () => {
    expect(settlementReminderStage(new Date(stayFrom.getTime() + DAY_MS), stayFrom, 1000, false)).toBe("DUE");
  });

  it("escalates to OVERDUE_3D and OVERDUE_7D", () => {
    expect(settlementReminderStage(new Date(stayFrom.getTime() + 3 * DAY_MS), stayFrom, 1000, false)).toBe(
      "OVERDUE_3D"
    );
    expect(settlementReminderStage(new Date(stayFrom.getTime() + 7 * DAY_MS), stayFrom, 1000, false)).toBe(
      "OVERDUE_7D"
    );
  });

  it("is null once both sides have marked it settled", () => {
    expect(settlementReminderStage(new Date(stayFrom.getTime() + 7 * DAY_MS), stayFrom, 1000, true)).toBeNull();
  });

  it("is null when nothing is owed (equal-price swap)", () => {
    expect(settlementReminderStage(new Date(stayFrom.getTime() + 7 * DAY_MS), stayFrom, 0, false)).toBeNull();
  });
});
