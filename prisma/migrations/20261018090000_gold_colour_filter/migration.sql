-- Gold colour returns to the catalogue filters (docs/DECISIONS.md D4D.39).
--
-- D4D.11 took it out because every model could be made in any colour and a
-- filter only told which models LISTED one. Since D4D.38 each model is offered
-- in the colours that suit it, each with its own photographs, so the filter now
-- answers a real question and the cards show the chosen colour. Karat (14K
-- only), ring size and length stay off. Data only; added right after "price";
-- a category that already has it, or has no facets list, is left alone.
UPDATE "Category"
   SET "filterConfig" = jsonb_set(
         "filterConfig",
         '{facets}',
         (SELECT jsonb_agg(facet ORDER BY ord)
            FROM (
              SELECT facet, ord
                FROM jsonb_array_elements("filterConfig" -> 'facets') WITH ORDINALITY AS t(facet, ord)
              UNION ALL
              SELECT to_jsonb('gold_color'::text), 1.5
            ) merged)
       ),
       "updatedAt" = NOW()
 WHERE jsonb_typeof("filterConfig" -> 'facets') = 'array'
   AND "filterConfig" -> 'facets' @> '["price"]'::jsonb
   AND NOT ("filterConfig" -> 'facets' @> '["gold_color"]'::jsonb);
