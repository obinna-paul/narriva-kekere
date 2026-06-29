-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
    'STORY_SUBMITTED',
    'STORY_APPROVED',
    'STORY_REVISIONS_REQUESTED',
    'STORY_REJECTED',
    'CONTRACT_RECEIVED',
    'COMPETITION_RESULT',
    'REFERRAL_REWARD_EARNED',
    'WITHDRAWAL_PROCESSED',
    'WITHDRAWAL_REJECTED',
    'VERSION_RESTORED'
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
