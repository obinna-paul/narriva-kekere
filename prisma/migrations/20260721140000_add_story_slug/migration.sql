-- Public URL slug for stories, assigned once at publish time. Nullable
-- (unpublished stories have none) but unique when set.
ALTER TABLE "Story" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");
