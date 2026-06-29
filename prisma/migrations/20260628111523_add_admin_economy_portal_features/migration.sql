-- CreateEnum
CREATE TYPE "WalletField" AS ENUM ('SPENDING', 'EARNED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REWARDED');

-- CreateEnum
CREATE TYPE "WithdrawalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "IntentLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'BROWSING');

-- CreateEnum
CREATE TYPE "NariLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_DISCUSSION', 'SUBMITTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ProjectTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "KekereContractStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED', 'EXPIRED', 'VOIDED');

-- AlterEnum: add new TransactionType values (additive, existing values kept)
ALTER TYPE "TransactionType" ADD VALUE 'COMPLETION_BONUS';
ALTER TYPE "TransactionType" ADD VALUE 'TIP_SENT';
ALTER TYPE "TransactionType" ADD VALUE 'TIP_RECEIVED';
ALTER TYPE "TransactionType" ADD VALUE 'REFERRAL_REWARD';
ALTER TYPE "TransactionType" ADD VALUE 'EARNINGS_CREDIT';
ALTER TYPE "TransactionType" ADD VALUE 'PLATFORM_EARNINGS';

-- Drop old AuthorProject/Deliverable structures (replaced by the new
-- submissionId-keyed AuthorProject + ProjectDeliverable/Version/Comment
-- models below). AuthorProject and Deliverable have 0 rows in production
-- at the time of this migration, confirmed before writing this script.
ALTER TABLE "AuthorProject" DROP CONSTRAINT "AuthorProject_authorId_fkey";
ALTER TABLE "Deliverable" DROP CONSTRAINT "Deliverable_projectId_fkey";
DROP INDEX "AuthorProject_authorId_idx";
DROP INDEX "AuthorProject_stage_idx";
ALTER TABLE "AuthorProject" DROP COLUMN "authorId",
DROP COLUMN "notes",
DROP COLUMN "stage",
DROP COLUMN "stageNote",
DROP COLUMN "title",
DROP COLUMN "type";
DROP TABLE "Deliverable";
DROP TYPE "DeliverableType";
DROP TYPE "ProjectType";
-- Old enums freed up now that nothing references them; recreated fresh
-- below with the new values needed by AuthorProject/ProjectDeliverable.
DROP TYPE "DeliverableStatus";
DROP TYPE "ProjectStage";

-- CreateEnum (fresh, replacing the old ProjectStage/DeliverableStatus)
CREATE TYPE "ProjectStage" AS ENUM ('ASSESSMENT', 'EDITORIAL', 'DESIGN', 'PRODUCTION', 'LAUNCHED');
CREATE TYPE "DeliverableStatus" AS ENUM ('DRAFT', 'FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED');

-- Drop old NariConversation indexes; replacing the per-message-row schema
-- with one row per conversation. 3 existing rows (with a duplicate
-- sessionId group) are wiped here as part of the agreed full replacement —
-- trivial chat-log data, not financial or account data.
DROP INDEX "NariConversation_classifiedLead_idx";
DROP INDEX "NariConversation_createdAt_idx";
DROP INDEX "NariConversation_sessionId_idx";
DELETE FROM "NariConversation";

-- AlterTable
ALTER TABLE "AuthorProject" ADD COLUMN     "bookTitle" TEXT NOT NULL,
ADD COLUMN     "coverImageRef" TEXT,
ADD COLUMN     "currentStage" "ProjectStage" NOT NULL DEFAULT 'ASSESSMENT',
ADD COLUMN     "expectedPubDate" TIMESTAMP(3),
ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "statusNote" TEXT,
ADD COLUMN     "submissionId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "NariConversation" DROP COLUMN "classifiedLead",
DROP COLUMN "createdAt",
DROP COLUMN "language",
DROP COLUMN "leadSummary",
DROP COLUMN "message",
DROP COLUMN "role",
ADD COLUMN     "durationSecs" INTEGER,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "messages" JSONB NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "StoryCompletion" ADD COLUMN     "bonusCredited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "walletField" "WalletField";

-- AlterTable: split Wallet.balance into spendingBalance/earnedBalance,
-- preserving every existing wallet's balance as spendingBalance before the
-- old column is dropped.
ALTER TABLE "Wallet" ADD COLUMN     "earnedBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "spendingBalance" INTEGER NOT NULL DEFAULT 0;

UPDATE "Wallet" SET "spendingBalance" = "balance";

ALTER TABLE "Wallet" DROP COLUMN "balance";

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "readerId" TEXT NOT NULL,
    "writerId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "tippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "codeUsed" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WriterBankDetails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WriterBankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cowriesAmount" INTEGER NOT NULL,
    "ngnAmount" DOUBLE PRECISION NOT NULL,
    "bankDetailsId" TEXT NOT NULL,
    "status" "WithdrawalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "paystackTransferCode" TEXT,
    "paystackTransferRef" TEXT,
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformEarnings" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "unlockId" TEXT NOT NULL,
    "cowries" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformEarnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NariConversationIntel" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "manuscriptTopic" TEXT,
    "manuscriptStatus" TEXT,
    "wordCount" TEXT,
    "servicesInterest" TEXT[],
    "timelineSignal" TEXT,
    "budgetSignal" TEXT,
    "painPoints" TEXT,
    "competitorMentions" TEXT[],
    "intentLevel" "IntentLevel" NOT NULL DEFAULT 'LOW',
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,

    CONSTRAINT "NariConversationIntel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NariLead" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "manuscriptTopic" TEXT,
    "intentLevel" "IntentLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "NariLeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NariLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDeliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stage" "ProjectStage" NOT NULL,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'DRAFT',
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverableVersion" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileRef" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverableVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverableComment" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isKeyDecision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverableComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fileRef" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "ProjectTaskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KekereContractTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KekereContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KekereContract" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "writerId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "KekereContractStatus" NOT NULL DEFAULT 'PENDING',
    "signedName" TEXT,
    "signedAt" TIMESTAMP(3),
    "signerIp" TEXT,
    "signedPdfRef" TEXT,
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KekereContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tip_readerId_storyId_key" ON "Tip"("readerId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_userId_key" ON "ReferralCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WriterBankDetails_userId_key" ON "WriterBankDetails"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformEarnings_unlockId_key" ON "PlatformEarnings"("unlockId");

-- CreateIndex
CREATE INDEX "PlatformEarnings_storyId_idx" ON "PlatformEarnings"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "NariConversationIntel_conversationId_key" ON "NariConversationIntel"("conversationId");

-- CreateIndex
CREATE INDEX "NariConversationIntel_leadId_idx" ON "NariConversationIntel"("leadId");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_projectId_idx" ON "ProjectDeliverable"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_status_idx" ON "ProjectDeliverable"("status");

-- CreateIndex
CREATE INDEX "DeliverableVersion_deliverableId_idx" ON "DeliverableVersion"("deliverableId");

-- CreateIndex
CREATE INDEX "DeliverableComment_deliverableId_idx" ON "DeliverableComment"("deliverableId");

-- CreateIndex
CREATE INDEX "ProjectMessage_projectId_idx" ON "ProjectMessage"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "ProjectTask_projectId_idx" ON "ProjectTask"("projectId");

-- CreateIndex
CREATE INDEX "KekereContract_writerId_idx" ON "KekereContract"("writerId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorProject_submissionId_key" ON "AuthorProject"("submissionId");

-- CreateIndex
CREATE INDEX "AuthorProject_userId_idx" ON "AuthorProject"("userId");

-- CreateIndex
CREATE INDEX "AuthorProject_currentStage_idx" ON "AuthorProject"("currentStage");

-- CreateIndex
CREATE UNIQUE INDEX "NariConversation_sessionId_key" ON "NariConversation"("sessionId");

-- CreateIndex
CREATE INDEX "NariConversation_userId_idx" ON "NariConversation"("userId");

-- CreateIndex
CREATE INDEX "NariConversation_startedAt_idx" ON "NariConversation"("startedAt");

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriterBankDetails" ADD CONSTRAINT "WriterBankDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_bankDetailsId_fkey" FOREIGN KEY ("bankDetailsId") REFERENCES "WriterBankDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformEarnings" ADD CONSTRAINT "PlatformEarnings_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NariConversation" ADD CONSTRAINT "NariConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NariConversationIntel" ADD CONSTRAINT "NariConversationIntel_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "NariConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NariConversationIntel" ADD CONSTRAINT "NariConversationIntel_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "NariLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorProject" ADD CONSTRAINT "AuthorProject_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "NarrivaSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorProject" ADD CONSTRAINT "AuthorProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AuthorProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableVersion" ADD CONSTRAINT "DeliverableVersion_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "ProjectDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableComment" ADD CONSTRAINT "DeliverableComment_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "ProjectDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableComment" ADD CONSTRAINT "DeliverableComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AuthorProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AuthorProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AuthorProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KekereContract" ADD CONSTRAINT "KekereContract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "KekereContractTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KekereContract" ADD CONSTRAINT "KekereContract_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
