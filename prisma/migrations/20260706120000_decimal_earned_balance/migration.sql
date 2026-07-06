-- AlterTable: earnedBalance (and everything that records it) becomes a
-- Decimal(10,2) instead of Int, so a writer's 70% share of a story unlock
-- isn't rounded away (e.g. 70% of 1 cowrie is exactly 0.70, not 0 or 1).
-- spendingBalance is untouched — top-ups and story costs are always whole
-- cowries, so it stays an Int.
ALTER TABLE "Wallet" ALTER COLUMN "earnedBalance" SET DEFAULT 0,
ALTER COLUMN "earnedBalance" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amountCowries" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "WithdrawalRequest" ALTER COLUMN "cowriesAmount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "PlatformEarnings" ALTER COLUMN "cowries" SET DATA TYPE DECIMAL(10,2);
