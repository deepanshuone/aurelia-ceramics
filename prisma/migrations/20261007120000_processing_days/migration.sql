-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "processingDays" INTEGER;

-- Existing confirmed orders: count processing from when they were placed.
UPDATE "Order" SET "confirmedAt" = "createdAt" WHERE "status" <> 'PENDING';

-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" TEXT NOT NULL DEFAULT 'store',
    "processingDays" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);
