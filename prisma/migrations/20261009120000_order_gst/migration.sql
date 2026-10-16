-- GST charged on the order (included in "total"). Older orders had none.
ALTER TABLE "Order" ADD COLUMN "gst" DECIMAL(10,2) NOT NULL DEFAULT 0;
