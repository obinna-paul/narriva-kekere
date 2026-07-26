-- Two new reasons for Kemi to open a conversation.
--
-- Postgres allows ALTER TYPE ... ADD VALUE inside a transaction from 12
-- onward as long as the new value isn't referenced in the same transaction —
-- nothing here does, so this is safe as a single migration.
ALTER TYPE "KemiNudgeKind" ADD VALUE IF NOT EXISTS 'STREAK_SAVE';
ALTER TYPE "KemiNudgeKind" ADD VALUE IF NOT EXISTS 'FOLLOWED_WRITER_PUBLISHED';

-- Snapshotted writer name, for the same reason the story title already is:
-- the delivered message must still read correctly if the account is renamed
-- or deleted between the publish and the reader opening the chat.
ALTER TABLE "KemiNudge" ADD COLUMN IF NOT EXISTS "writerName" TEXT;
