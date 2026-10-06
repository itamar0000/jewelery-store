-- Data only: the gold-purity option reads "קראט זהב", not "קראט"
-- (docs/DECISIONS.md D4D.10).
--
-- "קראט" alone is also the stone's weight, a few rows below it on the same
-- product page; the filters already call this facet "קראט זהב". Only rows
-- still carrying the original seed label are touched, so a label an editor
-- has since changed is left as they set it.
UPDATE "ProductOption"
   SET "nameHe" = 'קראט זהב',
       "updatedAt" = NOW()
 WHERE "code" = 'gold_karat'
   AND "nameHe" = 'קראט';
