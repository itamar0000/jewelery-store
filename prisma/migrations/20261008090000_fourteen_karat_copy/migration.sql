-- The shop sells 14K only; another karat is a custom request (D4D.25, D4D.28).
-- The rings category still offered karat as an alteration of every model.
-- Replaces that one sentence, and only while it still reads as written.
UPDATE "Category"
   SET "descriptionHe" = replace(
         "descriptionHe",
         'ניתן להתאים כל דגם לפי קראט, גוון זהב ומידה.',
         'כל הטבעות מיוצרות בזהב 14K, ואפשר לבחור גוון זהב ומידה.'
       ),
       "updatedAt" = NOW()
 WHERE "descriptionHe" LIKE '%ניתן להתאים כל דגם לפי קראט, גוון זהב ומידה.%';
