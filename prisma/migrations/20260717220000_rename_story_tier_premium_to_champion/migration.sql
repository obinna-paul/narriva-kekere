-- Rename the StoryTier enum value PREMIUM -> CHAMPION in place. Postgres
-- enum values are stored by internal id, not label, so this preserves
-- every existing Story row's tier automatically — no data migration needed.
ALTER TYPE "StoryTier" RENAME VALUE 'PREMIUM' TO 'CHAMPION';
