-- CreateTable
CREATE TABLE "ParagraphReaction" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "paragraphId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParagraphReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParagraphReaction_storyId_paragraphId_idx" ON "ParagraphReaction"("storyId", "paragraphId");

-- CreateIndex
CREATE UNIQUE INDEX "ParagraphReaction_storyId_paragraphId_userId_key" ON "ParagraphReaction"("storyId", "paragraphId", "userId");

-- AddForeignKey
ALTER TABLE "ParagraphReaction" ADD CONSTRAINT "ParagraphReaction_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphReaction" ADD CONSTRAINT "ParagraphReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
