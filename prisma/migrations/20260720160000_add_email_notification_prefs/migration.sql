-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'STREAK_AT_RISK';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unsubscribeToken" TEXT,
ADD COLUMN     "lastStreakReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "lastDigestSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");
