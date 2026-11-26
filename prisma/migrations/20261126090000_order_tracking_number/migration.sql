-- The courier tracking number, typed by staff when an order ships.
ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT;
