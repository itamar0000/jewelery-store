-- A guest's way back to their own order (docs/DECISIONS.md D4D.8).
--
-- Additive and nullable: existing orders are untouched, and an order created
-- without a token (an admin entry, a test fixture) simply has none. Only the
-- SHA-256 of the token is stored, so reading this column grants nothing.
ALTER TABLE "Order" ADD COLUMN "accessTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_accessTokenHash_key" ON "Order"("accessTokenHash");
