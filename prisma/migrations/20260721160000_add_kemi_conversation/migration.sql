-- CreateTable
CREATE TABLE "KemiConversation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KemiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KemiConversation_sessionId_key" ON "KemiConversation"("sessionId");

-- CreateIndex
CREATE INDEX "KemiConversation_userId_idx" ON "KemiConversation"("userId");

-- CreateIndex
CREATE INDEX "KemiConversation_lastMessageAt_idx" ON "KemiConversation"("lastMessageAt");

-- AddForeignKey
ALTER TABLE "KemiConversation" ADD CONSTRAINT "KemiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
