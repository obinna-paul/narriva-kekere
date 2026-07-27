import { prisma } from "@/lib/db/prisma";

/**
 * Fixed-window rate limiter backed by Postgres.
 *
 * This used to be a process-local Map, with a comment promising it was
 * "correct and sufficient" for a single Node process and should be swapped
 * out if the app ever ran serverless. It has been running serverless — which
 * means every invocation got its own empty Map, the real ceiling was the
 * configured limit multiplied by however many instances happened to be warm,
 * and the whole thing reset on every deploy. It wasn't limiting anything.
 *
 * Postgres rather than Redis, deliberately: the database is already a hard
 * dependency, a check is a single upsert on a primary key, and the
 * alternative is a new service, new credentials and a new network hop for
 * something that has to be up for the app to work at all.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch ms — callers put this in the Retry-After header. */
  resetAt: number;
}

interface WindowRow {
  count: number;
  resetAt: Date;
}

export async function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const nextReset = new Date(Date.now() + windowMs);

  try {
    // One statement, so the read-modify-write can't interleave between two
    // concurrent invocations: ON CONFLICT takes a row lock, and the CASE
    // rolls an expired window over in place rather than needing a separate
    // delete. Counting past the limit is intentional and harmless — it keeps
    // this to a single round trip, and the window still ends on schedule.
    const rows = await prisma.$queryRaw<WindowRow[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
      VALUES (${key}, 1, ${nextReset}, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "count"     = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt"   = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN ${nextReset} ELSE "RateLimit"."resetAt" END,
        "updatedAt" = NOW()
      RETURNING "count", "resetAt"
    `;

    const row = rows[0];
    if (!row) return openResult(limit, nextReset);

    const resetAt = row.resetAt.getTime();
    return {
      allowed: row.count <= limit,
      remaining: Math.max(0, limit - row.count),
      resetAt,
    };
  } catch (error) {
    // Fail open. If the database is unreachable the request is going to fail
    // on its own merits a moment later; turning a limiter outage into a
    // blanket 429 for everyone would be a worse failure than briefly not
    // limiting.
    console.error("[rate-limit] check failed, allowing request:", error);
    return openResult(limit, nextReset);
  }
}

function openResult(limit: number, nextReset: Date): RateLimitResult {
  return { allowed: true, remaining: limit - 1, resetAt: nextReset.getTime() };
}

/** Drops windows that closed a while ago. Nothing depends on this for
 *  correctness — an expired row is already treated as absent — it just stops
 *  the table growing forever from one-off keys. */
export async function sweepExpiredRateLimits(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const { count } = await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: cutoff } } });
  return count;
}
