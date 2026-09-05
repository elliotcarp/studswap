import { describe, it, expect } from "vitest";
import { confirmIdempotencyKey } from "./confirmationCharge";

describe("confirmIdempotencyKey", () => {
  it("is identical for the same match/side within the same short window (double-click / two tabs)", () => {
    const now = new Date("2026-06-01T10:00:00Z");
    const a = confirmIdempotencyKey("match1", "A", now);
    const b = confirmIdempotencyKey("match1", "A", new Date(now.getTime() + 5000));
    expect(a).toBe(b);
  });

  it("differs between side A and side B for the same match", () => {
    const now = new Date("2026-06-01T10:00:00Z");
    expect(confirmIdempotencyKey("match1", "A", now)).not.toBe(confirmIdempotencyKey("match1", "B", now));
  });

  it("differs between different matches", () => {
    const now = new Date("2026-06-01T10:00:00Z");
    expect(confirmIdempotencyKey("match1", "A", now)).not.toBe(confirmIdempotencyKey("match2", "A", now));
  });

  it("differs once enough time has passed (so an expired checkout can be retried later)", () => {
    const now = new Date("2026-06-01T10:00:00Z");
    const later = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(confirmIdempotencyKey("match1", "A", now)).not.toBe(confirmIdempotencyKey("match1", "A", later));
  });
});
