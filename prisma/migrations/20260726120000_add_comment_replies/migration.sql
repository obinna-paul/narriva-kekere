-- AlterTable
ALTER TABLE "ParagraphComment" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "ParagraphComment_parentId_idx" ON "ParagraphComment"("parentId");

-- AddForeignKey
ALTER TABLE "ParagraphComment" ADD CONSTRAINT "ParagraphComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParagraphComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
