-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "capacity" TEXT,
ADD COLUMN     "careInstructions" TEXT,
ADD COLUMN     "colour" TEXT,
ADD COLUMN     "dimensions" TEXT,
ADD COLUMN     "dishwasherSafe" BOOLEAN,
ADD COLUMN     "finish" TEXT,
ADD COLUMN     "foodSafe" BOOLEAN,
ADD COLUMN     "material" TEXT,
ADD COLUMN     "microwaveSafe" BOOLEAN,
ADD COLUMN     "returnable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weight" TEXT,
ADD COLUMN     "whatsIncluded" TEXT;

-- CreateTable
CREATE TABLE "ReviewPhoto" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewPhoto_reviewId_idx" ON "ReviewPhoto"("reviewId");

-- AddForeignKey
ALTER TABLE "ReviewPhoto" ADD CONSTRAINT "ReviewPhoto_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
