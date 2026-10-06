-- Data only: three category descriptions promised natural and lab-grown
-- stones over categories whose rings are all lab-grown (critique 2026-10-06,
-- P1; docs/DECISIONS.md D4D.15). The new wording claims nothing about the mix:
-- it says the kind is stated on every model, and that natural can be asked for.
-- Only the unedited seed text is replaced; a description the owner has
-- changed is theirs.
UPDATE "Category" SET "descriptionHe" = 'טבעות אירוסין, נישואין וטבעות יומיום. סוג היהלום מצוין בכל דגם, ואפשר לבקש כל טבעת גם עם יהלום טבעי. ניתן להתאים כל דגם לפי קראט, גוון זהב ומידה.', "updatedAt" = NOW()
 WHERE "slug" = 'rings' AND "descriptionHe" = 'טבעות אירוסין, נישואין וטבעות יומיום, ביהלומים טבעיים וביהלומי מעבדה. ניתן להתאים כל דגם לפי קראט, גוון זהב ומידה.';
UPDATE "Category" SET "descriptionHe" = 'טבעות אירוסין בהתאמה אישית מלאה. סוג היהלום מצוין בכל דגם, ואפשר לבקש כל טבעת גם עם יהלום טבעי.', "updatedAt" = NOW()
 WHERE "slug" = 'engagement-rings' AND "descriptionHe" = 'טבעות אירוסין ביהלומים טבעיים וביהלומי מעבדה, בהתאמה אישית מלאה.';
UPDATE "Category" SET "descriptionHe" = 'טבעות משובצות יהלומים. סוג היהלום, מעבדה או טבעי, מצוין בכל דגם.', "updatedAt" = NOW()
 WHERE "slug" = 'diamond-rings' AND "descriptionHe" = 'טבעות משובצות יהלומים, טבעיים או מיהלומי מעבדה.';
