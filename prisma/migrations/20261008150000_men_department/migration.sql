-- The men's department (D4D.34): a root category "גברים" and four children,
-- holding existing catalogue pieces the owner approved as men's pieces.
--
-- MEMBERSHIP ONLY. Each piece gains a secondary ProductCategory link; its
-- primary category, canonical URL, variants and photographs are untouched.
-- Production still carries the starter slugs with a "demo-" prefix, so each
-- piece is matched by its slug with or without it.
--
-- Pendants for men join when the first men's pendant exists: an empty
-- category is worse than an absent one.

INSERT INTO "Category" ("id", "slug", "nameHe", "descriptionHe", "parentId", "position", "filterConfig", "updatedAt")
VALUES
  ('menroot0000000000001', 'men', 'גברים',
   'טבעות, טבעות נישואין, שרשראות וצמידים לגבר, בזהב 14K. כל תכשיט מיוצר אחרי ההזמנה בסדנה שלנו, ואפשר לבחור גוון זהב, מידה ואורך.',
   NULL, 6,
   '{"facets": ["price", "diamond_type", "style"], "allowedAttributeKeys": ["style"]}', CURRENT_TIMESTAMP),
  ('menrings000000000001', 'men-rings', 'טבעות לגבר',
   'טבעות חותם וטבעות זהב רחבות. אפשר לבקש חריטה על החותם או בתוך הטבעת.',
   'menroot0000000000001', 1,
   '{"facets": ["price", "diamond_type", "diamond_shape", "carat"], "allowedAttributeKeys": ["style"]}', CURRENT_TIMESTAMP),
  ('menwedding0000000001', 'men-wedding-rings', 'טבעות נישואין לגבר',
   'טבעות נישואין בזהב 14K, בגוון ובמידה שלכם. אפשר להזמין זוג תואם.',
   'menroot0000000000001', 2,
   '{"facets": ["price", "diamond_type", "diamond_shape", "carat"], "allowedAttributeKeys": ["style"]}', CURRENT_TIMESTAMP),
  ('mennecklaces00000001', 'men-necklaces', 'שרשראות לגבר',
   'שרשראות זהב לגבר, באורך שתבחרו.',
   'menroot0000000000001', 3,
   '{"facets": ["price", "diamond_type", "pendant_type"], "allowedAttributeKeys": ["style", "pendantType"]}', CURRENT_TIMESTAMP),
  ('menbracelets00000001', 'men-bracelets', 'צמידים לגבר',
   'צמידי חוליות, צמידי חבל וצמידי טניס לגבר.',
   'menroot0000000000001', 4,
   '{"facets": ["price", "diamond_type", "style"], "allowedAttributeKeys": ["style"]}', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductCategory" ("productId", "categoryId", "position")
SELECT p."id", c."id", m.position
FROM (VALUES
  ('signet-ring',     'men-rings',         1),
  ('wide-band-ring',  'men-rings',         2),
  ('wedding-band',    'men-wedding-rings', 1),
  ('comfort-band',    'men-wedding-rings', 2),
  ('milgrain-band',   'men-wedding-rings', 3),
  ('chain-necklace',  'men-necklaces',     1),
  ('bar-necklace',    'men-necklaces',     2),
  ('chain-bracelet',  'men-bracelets',     1),
  ('rope-bracelet',   'men-bracelets',     2),
  ('tennis-bracelet', 'men-bracelets',     3)
) AS m(slug, category, position)
JOIN "Product" p ON p."slug" IN (m.slug, 'demo-' || m.slug)
JOIN "Category" c ON c."slug" = m.category
ON CONFLICT ("productId", "categoryId") DO NOTHING;
