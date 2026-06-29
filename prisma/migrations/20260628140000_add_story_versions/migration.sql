-- AlterTable
ALTER TABLE "Story" ADD COLUMN "lastSavedAt" TIMESTAMP(3);
ALTER TABLE "Story" ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "StoryVersion" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryVersion_storyId_savedAt_idx" ON "StoryVersion"("storyId", "savedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryVersion_storyId_versionNumber_key" ON "StoryVersion"("storyId", "versionNumber");

-- AddForeignKey
ALTER TABLE "StoryVersion" ADD CONSTRAINT "StoryVersion_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
