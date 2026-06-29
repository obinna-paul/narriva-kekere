-- CreateEnum
CREATE TYPE "AudioGenerationStatus" AS ENUM ('NOT_GENERATED', 'GENERATING', 'GENERATED', 'FAILED');

-- AlterTable
ALTER TABLE "Story" ADD COLUMN "audioRef" TEXT;
ALTER TABLE "Story" ADD COLUMN "audioGeneratedAt" TIMESTAMP(3);
ALTER TABLE "Story" ADD COLUMN "audioDurationSecs" INTEGER;
ALTER TABLE "Story" ADD COLUMN "audioGenerationStatus" "AudioGenerationStatus" NOT NULL DEFAULT 'NOT_GENERATED';
