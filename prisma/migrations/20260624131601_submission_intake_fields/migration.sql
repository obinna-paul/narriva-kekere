-- AlterTable
ALTER TABLE "NarrivaSubmission" ADD COLUMN     "genre" TEXT,
ADD COLUMN     "manuscriptStage" TEXT,
ADD COLUMN     "supportNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[];
