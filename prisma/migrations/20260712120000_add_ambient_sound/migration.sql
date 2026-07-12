-- CreateTable
CREATE TABLE "AmbientSound" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audioRef" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbientSound_pkey" PRIMARY KEY ("id")
);
