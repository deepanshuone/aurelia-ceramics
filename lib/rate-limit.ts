// Fixed-window rate limiter kept in server memory.
//
// Limits are per server instance: on serverless hosting (Vercel) each
// instance counts separately, so this slows down brute-force attempts rather
// than giving a hard global cap. For strict limits, back this with a shared
// store such as Upstash Redis.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  // Drop expired buckets occasionally so memory stays bounded.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

/**
 * Counts one attempt for `key`. Returns whether it is allowed and, if not,
 * how many seconds until the window resets.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count++;
  const allowed = bucket.count <= limit;
  return { allowed, retryAfter: allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000) };
}

/** Best-effort client IP (Vercel and most proxies set x-forwarded-for). */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
