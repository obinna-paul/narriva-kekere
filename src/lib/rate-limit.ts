/**
 * In-memory fixed-window rate limiter — chosen over Upstash Redis because
 * Redis isn't part of this stack yet, and adding it (new account, new env
 * vars, new network hop) is a lot of setup cost for one endpoint. This app
 * runs as a single Node process, so a process-local Map is a correct and
 * sufficient limiter today.
 *
 * Tradeoff, stated explicitly: this resets on every server restart/deploy
 * and does NOT share state across multiple instances. If this app is ever
 * deployed behind a multi-instance/serverless setup, swap this for a real
 * shared store (Redis, or a Postgres-backed counter table) — the call site
 * (`checkRateLimit`) is the only thing that would need to change.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}
