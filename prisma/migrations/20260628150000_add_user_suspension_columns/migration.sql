-- User.suspended/suspensionReason/suspendedUntil were added to
-- schema.prisma without a corresponding migration, breaking every User
-- query. Backfilling them here.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3);
