-- Editorial review working copy: an admin's in-progress edits to a submitted
-- story, persisted server-side so they can't be lost, kept separate from the
-- writer's original body/hookLine until promoted at publish time.
ALTER TABLE "Story" ADD COLUMN "editedBody" JSONB;
ALTER TABLE "Story" ADD COLUMN "editedHookLine" TEXT;
ALTER TABLE "Story" ADD COLUMN "editedWordCount" INTEGER;
ALTER TABLE "Story" ADD COLUMN "editedReadingTime" INTEGER;
ALTER TABLE "Story" ADD COLUMN "editLastSavedAt" TIMESTAMP(3);
