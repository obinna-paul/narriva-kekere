-- AlterTable
ALTER TABLE "User" DROP COLUMN "currentlyWriting",
ADD COLUMN "currentlyWritingStoryId" TEXT;
