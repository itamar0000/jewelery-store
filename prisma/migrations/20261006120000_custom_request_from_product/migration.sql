-- A custom request needs one way back to the visitor - a phone or an email,
-- not both (D4D.14) - and may start from a model in the catalogue.

ALTER TABLE "CustomRequest" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "CustomRequest" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_contact_present"
  CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);

ALTER TABLE "CustomRequest" ADD COLUMN "productId" TEXT;
ALTER TABLE "CustomRequest" ADD COLUMN "productSnapshot" JSONB;
ALTER TABLE "CustomRequest" ADD COLUMN "changeAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "CustomRequest_productId_idx" ON "CustomRequest"("productId");

ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
