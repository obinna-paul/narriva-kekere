-- CreateTable
CREATE TABLE "StoryRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "scrollFraction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryRating_userId_storyId_key" ON "StoryRating"("userId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryCompletion_userId_storyId_key" ON "StoryCompletion"("userId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryReadingProgress_userId_storyId_key" ON "StoryReadingProgress"("userId", "storyId");

-- AddForeignKey
ALTER TABLE "StoryRating" ADD CONSTRAINT "StoryRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryRating" ADD CONSTRAINT "StoryRating_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCompletion" ADD CONSTRAINT "StoryCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCompletion" ADD CONSTRAINT "StoryCompletion_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReadingProgress" ADD CONSTRAINT "StoryReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReadingProgress" ADD CONSTRAINT "StoryReadingProgress_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
