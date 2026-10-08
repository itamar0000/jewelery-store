-- Every piece is made in 10 business days (owner, 2026-10-08; D4D.29).
-- One figure on the product, none on the variants, so every variant inherits
-- it and a later change is one edit. Archived rows are left as they were.
UPDATE "Product"
   SET "defaultPrepDays" = 10, "updatedAt" = NOW()
 WHERE "archivedAt" IS NULL;

UPDATE "ProductVariant" v
   SET "prepDays" = NULL, "updatedAt" = NOW()
  FROM "Product" p
 WHERE p."id" = v."productId" AND p."archivedAt" IS NULL AND v."prepDays" IS NOT NULL;
