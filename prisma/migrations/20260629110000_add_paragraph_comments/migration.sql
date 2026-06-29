-- CreateTable
CREATE TABLE "ParagraphComment" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "paragraphId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParagraphComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParagraphComment_storyId_paragraphId_idx" ON "ParagraphComment"("storyId", "paragraphId");

-- CreateIndex
CREATE INDEX "ParagraphComment_storyId_createdAt_idx" ON "ParagraphComment"("storyId", "createdAt");

-- AddForeignKey
ALTER TABLE "ParagraphComment" ADD CONSTRAINT "ParagraphComment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParagraphComment" ADD CONSTRAINT "ParagraphComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
