-- Writer-approval gate for admin editorial changes.
ALTER TYPE "StoryStatus" ADD VALUE 'CHANGES_PROPOSED';
ALTER TYPE "NotificationType" ADD VALUE 'EDITS_PROPOSED';

ALTER TABLE "Story" ADD COLUMN "editSummaryNote" TEXT;
ALTER TABLE "Story" ADD COLUMN "editWriterNote" TEXT;
