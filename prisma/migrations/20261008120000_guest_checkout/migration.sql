-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutKey" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");

