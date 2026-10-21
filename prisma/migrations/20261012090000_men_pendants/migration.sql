-- Pendants for men (D4D.37): the Star of David, the "חי" and the engraved tag
-- are the department's first pendants, so its pendant category now exists
-- (D4D.34 kept it out while it would have been empty). It sits before the
-- bracelets.
INSERT INTO "Category" ("id", "slug", "nameHe", "descriptionHe", "parentId", "position", "filterConfig", "updatedAt")
SELECT 'menpendants000000001', 'men-pendants', 'תליונים לגבר',
       'מגן דוד, חי ולוחית לחריטה, בזהב 14K.',
       c."id", 4,
       '{"facets": ["price", "diamond_type"], "allowedAttributeKeys": ["style", "pendantType"]}', CURRENT_TIMESTAMP
FROM "Category" c WHERE c."slug" = 'men'
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Category" SET "position" = 5 WHERE "slug" = 'men-bracelets';
