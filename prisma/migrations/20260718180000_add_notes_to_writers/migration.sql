-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NOTE_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'NOTE_REPLIED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "notesEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toWriterId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyBody" TEXT,
    "repliedAt" TIMESTAMP(3),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "reportedAt" TIMESTAMP(3),

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteBlock" (
    "id" TEXT NOT NULL,
    "writerId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_toWriterId_read_idx" ON "Note"("toWriterId", "read");

-- CreateIndex
CREATE INDEX "Note_fromUserId_idx" ON "Note"("fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Note_fromUserId_storyId_key" ON "Note"("fromUserId", "storyId");

-- CreateIndex
CREATE INDEX "NoteBlock_blockedUserId_idx" ON "NoteBlock"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteBlock_writerId_blockedUserId_key" ON "NoteBlock"("writerId", "blockedUserId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_toWriterId_fkey" FOREIGN KEY ("toWriterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteBlock" ADD CONSTRAINT "NoteBlock_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteBlock" ADD CONSTRAINT "NoteBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
