-- Data only: karat, gold colour, ring size and chain length leave the
-- catalogue filters (docs/DECISIONS.md D4D.11).
--
-- Every model is made to order and can be made in any of them (PRODUCT.md,
-- "Manufacturer-direct"), so as filters they answered the wrong question:
-- which models happen to LIST a value, not which ones can be MADE in it.
-- Filtering for rose gold hid 43 of 50 products; ring size 48 showed 2 of 18
-- rings. The facets that describe what a piece is - price, stone shape, carat,
-- style, pendant type - stay. Order is preserved; nothing else in the config
-- is touched; a category without a facets list is left alone.
UPDATE "Category"
   SET "filterConfig" = jsonb_set(
         "filterConfig",
         '{facets}',
         COALESCE(
           (SELECT jsonb_agg(facet ORDER BY position)
              FROM jsonb_array_elements("filterConfig" -> 'facets') WITH ORDINALITY AS t(facet, position)
             WHERE facet #>> '{}' NOT IN ('gold_karat', 'gold_color', 'ring_size', 'length')),
           '[]'::jsonb
         )
       ),
       "updatedAt" = NOW()
 WHERE jsonb_typeof("filterConfig" -> 'facets') = 'array';
