-- AlterTable
ALTER TABLE "User" ADD COLUMN "kekereUsername" TEXT,
ADD COLUMN "currentlyWriting" TEXT,
ADD COLUMN "crossPromotionEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_kekereUsername_key" ON "User"("kekereUsername");

-- AlterTable
ALTER TABLE "Note" ADD COLUMN "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Note_toWriterId_pinnedAt_idx" ON "Note"("toWriterId", "pinnedAt");
