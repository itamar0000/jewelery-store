-- Every diamond the shop sets is colour D-F, colourless (owner, 2026-10-08;
-- D4D.30). Product-level and variant-level records alike.
--
-- NOT the coloured-diamond ring: its stone is a yellow fancy colour by design,
-- which the D-to-Z scale does not describe; it waits for the owner's grade.
UPDATE "DiamondSpec" d
   SET "color" = 'D-F', "updatedAt" = NOW()
 WHERE NOT EXISTS (
         SELECT 1 FROM "Product" p
          WHERE p."slug" = 'colored-diamond-ring'
            AND (p."id" = d."productId"
                 OR p."id" = (SELECT v."productId" FROM "ProductVariant" v WHERE v."id" = d."variantId"))
       );
