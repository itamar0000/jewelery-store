-- Data only: a "סוג יהלום" filter (lab-grown / natural) joins every category's
-- filters, second after price (docs/DECISIONS.md D4D.15).
--
-- The copy promised a choice between natural and lab-grown stones over
-- categories where every stone is lab-grown. The filter states the truth from
-- DiamondSpec.isLabGrown instead; it hides itself in a category without
-- diamonds, so adding it everywhere is safe. A category that already has it,
-- or has no facets list, is left alone.
UPDATE "Category"
   SET "filterConfig" = jsonb_set(
         "filterConfig",
         '{facets}',
         (SELECT jsonb_agg(facet ORDER BY position)
            FROM (
              SELECT facet, position * 2 AS position
                FROM jsonb_array_elements("filterConfig" -> 'facets') WITH ORDINALITY AS t(facet, position)
              UNION ALL
              -- After "price" when it is first, otherwise at the start.
              SELECT to_jsonb('diamond_type'::text),
                     CASE WHEN "filterConfig" -> 'facets' ->> 0 = 'price' THEN 3 ELSE 1 END
            ) AS merged)
       ),
       "updatedAt" = NOW()
 WHERE jsonb_typeof("filterConfig" -> 'facets') = 'array'
   AND NOT ("filterConfig" -> 'facets') ? 'diamond_type';
