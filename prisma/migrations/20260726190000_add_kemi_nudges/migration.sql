-- CreateEnum
CREATE TYPE "KemiNudgeKind" AS ENUM ('STORY_COMPLETED', 'FIRST_STORY_FINISHED', 'DRAFT_STARTED', 'STORY_PUBLISHED');

-- CreateTable
CREATE TABLE "KemiNudge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "KemiNudgeKind" NOT NULL,
    "storyTitle" TEXT,
    "storySlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "KemiNudge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KemiNudge_userId_deliveredAt_idx" ON "KemiNudge"("userId", "deliveredAt");

-- AddForeignKey
ALTER TABLE "KemiNudge" ADD CONSTRAINT "KemiNudge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
