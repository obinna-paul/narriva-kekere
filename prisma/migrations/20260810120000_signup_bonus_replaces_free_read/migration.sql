-- Replaces the free-first-unlock benefit with a ledgered signup bonus
-- credited straight into every new spending wallet (see grantSignupBonus in
-- lib/economy/cowries.ts). freeReadUsed is fully dead now that unlockStory
-- no longer has a free path.
--
-- Postgres allows ALTER TYPE ... ADD VALUE inside a transaction from 12
-- onward as long as the new value isn't referenced in the same transaction —
-- nothing here does, so this is safe as a single migration.
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'SIGNUP_BONUS';

ALTER TABLE "User" DROP COLUMN "freeReadUsed";
