-- AlterTable: make password nullable for unclaimed placeholder accounts
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: add account claim fields
ALTER TABLE "User" ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'CLAIMED';
ALTER TABLE "User" ADD COLUMN "claimToken" TEXT;
ALTER TABLE "User" ADD COLUMN "claimTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "createdByAdminId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_claimToken_key" ON "User"("claimToken");

-- AlterTable: add story provenance fields
ALTER TABLE "Story" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Story" ADD COLUMN "authoredByAdminId" TEXT;
