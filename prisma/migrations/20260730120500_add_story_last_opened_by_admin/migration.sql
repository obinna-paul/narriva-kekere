-- Tracks the last time an admin opened a story's detail view, so the review
-- queue can show "already looked at this" without reopening it.
ALTER TABLE "Story" ADD COLUMN "lastOpenedByAdminId" TEXT;
ALTER TABLE "Story" ADD COLUMN "lastOpenedByAdminAt" TIMESTAMP(3);
