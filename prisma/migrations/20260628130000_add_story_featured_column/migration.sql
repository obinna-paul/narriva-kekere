-- Story.featured was added to schema.prisma without a corresponding
-- migration (the column never existed in the database), breaking every
-- Story query. Backfilling it here.
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
