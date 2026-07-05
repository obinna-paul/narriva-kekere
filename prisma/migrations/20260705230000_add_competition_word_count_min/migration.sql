-- AlterTable: add optional wordCountMin to Competition, for competitions
-- with a word-count range (e.g. 1,000-1,500 words) instead of a single limit.
ALTER TABLE "Competition" ADD COLUMN "wordCountMin" INTEGER;
