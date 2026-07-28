-- Explicit reader tag preferences ("Preferences" in the profile). Empty
-- array means "never set explicitly" — the feed falls back to purely
-- inferred taste (kekere-taste.ts).
ALTER TABLE "User" ADD COLUMN "preferredTagSlugs" TEXT[] NOT NULL DEFAULT '{}';
