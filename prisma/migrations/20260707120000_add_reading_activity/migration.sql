-- CreateTable
CREATE TABLE "ReadingActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingActivity_userId_idx" ON "ReadingActivity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingActivity_userId_date_key" ON "ReadingActivity"("userId", "date");

-- AddForeignKey
ALTER TABLE "ReadingActivity" ADD CONSTRAINT "ReadingActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
