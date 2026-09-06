// In-memory rate limiter, keyed by an arbitrary caller-chosen string (IP,
// email, domain, etc). Resets per serverless instance/cold start, so this is
// a best-effort throttle rather than a hard distributed limit — enough to
// blunt casual scripted abuse (credential stuffing, signup spam, running up
// the AI domain-check bill) without adding a new piece of infra (Redis/
// Upstash) to a project this size. If StudSwap ever needs a real distributed
// limiter, swap the internals here for one — call sites don't need to change.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Forget expired buckets once the map gets large, so a long-lived warm
// instance doesn't grow this unbounded.
const MAX_BUCKETS = 50_000;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > MAX_BUCKETS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// Best-effort client IP for serverless routes behind Vercel's proxy.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
