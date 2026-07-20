-- Private admin↔writer editorial comments anchored to a paragraph of a story
-- under review.
CREATE TYPE "EditorialCommentStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "EditorialComment" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "paragraphId" TEXT NOT NULL,
    "authorAdminId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EditorialCommentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EditorialComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EditorialComment_storyId_paragraphId_idx" ON "EditorialComment"("storyId", "paragraphId");
CREATE INDEX "EditorialComment_storyId_status_idx" ON "EditorialComment"("storyId", "status");

ALTER TABLE "EditorialComment" ADD CONSTRAINT "EditorialComment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
