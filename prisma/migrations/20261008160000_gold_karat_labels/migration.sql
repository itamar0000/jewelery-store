-- Karat and carat stop sharing a word (critique 2026-10-08). Hebrew uses
-- "קראט" for both the purity of gold and the weight of a diamond; the site
-- keeps "קראט" for diamond weight only and writes gold the way it is stamped:
-- "זהב 14K". The product page read "קראט זהב 14 קראט", and the bag
-- "14 קראט · זהב צהוב". Labels only: codes, values, variants and order
-- snapshots are untouched.
UPDATE "ProductOption" SET "nameHe" = 'זהב' WHERE "code" = 'gold_karat';
UPDATE "ProductOptionValue" v
SET "labelHe" = 'זהב ' || v."value"
FROM "ProductOption" o
WHERE v."optionId" = o."id" AND o."code" = 'gold_karat' AND v."value" IN ('14K', '18K', '9K', '22K');
