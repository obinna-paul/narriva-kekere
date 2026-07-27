-- Shared rate-limit windows. The previous limiter was an in-process Map, so
-- it never limited anything across more than one serverless instance.
CREATE TABLE IF NOT EXISTS "RateLimit" (
  "key"       TEXT NOT NULL,
  "count"     INTEGER NOT NULL DEFAULT 0,
  "resetAt"   TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- Every feed read filters on status and orders by publishedAt; neither was
-- indexed. CONCURRENTLY so this doesn't take a write lock on a live table —
-- it cannot run inside a transaction, which is why it's the last statement.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Story_status_publishedAt_idx"
  ON "Story"("status", "publishedAt");
