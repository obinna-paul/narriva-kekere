-- AlterTable: add ebookRef as nullable first, backfill, then make NOT NULL
ALTER TABLE "Book" ADD COLUMN "ebookRef" TEXT;
UPDATE "Book" SET "ebookRef" = 'books/' || "slug" || '/content.json';
ALTER TABLE "Book" ALTER COLUMN "ebookRef" SET NOT NULL;

ALTER TABLE "Book" ADD COLUMN "chapterCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Book" ADD COLUMN "wordCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Book" ADD COLUMN "estimatedReadTime" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Book" DROP COLUMN "coverImages";
ALTER TABLE "Book" DROP COLUMN "formats";
ALTER TABLE "Book" DROP COLUMN "stockStatus";

-- AlterTable: remove shipping fields from Order
ALTER TABLE "Order" DROP COLUMN "shippingAddress";
ALTER TABLE "Order" DROP COLUMN "status";
ALTER TABLE "Order" DROP COLUMN "trackingNumber";

-- AlterTable: remove format and quantity from OrderItem
ALTER TABLE "OrderItem" DROP COLUMN "format";
ALTER TABLE "OrderItem" DROP COLUMN "quantity";

-- DropEnum: physical-book enums no longer needed
DROP TYPE IF EXISTS "BookFormat";
DROP TYPE IF EXISTS "BookStockStatus";
DROP TYPE IF EXISTS "OrderStatus";

-- CreateTable
CREATE TABLE "BookPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "currentChapter" INTEGER NOT NULL DEFAULT 1,
    "currentScrollPosition" INTEGER NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "completedChapterIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "BookReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookPurchase_userId_idx" ON "BookPurchase"("userId");

-- CreateIndex
CREATE INDEX "BookPurchase_bookId_idx" ON "BookPurchase"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "BookPurchase_userId_bookId_key" ON "BookPurchase"("userId", "bookId");

-- CreateIndex
CREATE INDEX "BookReadingProgress_userId_idx" ON "BookReadingProgress"("userId");

-- CreateIndex
CREATE INDEX "BookReadingProgress_bookId_idx" ON "BookReadingProgress"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "BookReadingProgress_userId_bookId_key" ON "BookReadingProgress"("userId", "bookId");

-- AddForeignKey
ALTER TABLE "BookPurchase" ADD CONSTRAINT "BookPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPurchase" ADD CONSTRAINT "BookPurchase_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookReadingProgress" ADD CONSTRAINT "BookReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookReadingProgress" ADD CONSTRAINT "BookReadingProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
