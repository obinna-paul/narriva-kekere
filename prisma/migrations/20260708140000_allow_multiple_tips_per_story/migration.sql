-- Readers can now tip the same story more than once, so a reader/story pair
-- is no longer unique — replace the unique index with a plain one (queries
-- still filter on readerId+storyId to count a reader's tips on a story).
DROP INDEX "Tip_readerId_storyId_key";

CREATE INDEX "Tip_readerId_storyId_idx" ON "Tip"("readerId", "storyId");
