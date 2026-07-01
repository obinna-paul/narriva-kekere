-- AlterTable: add freeReadUsed to User for the first-story-free benefit
ALTER TABLE "User" ADD COLUMN "freeReadUsed" BOOLEAN NOT NULL DEFAULT false;
