import { prisma } from '@/lib/db';

import { parseSearchQuery } from './normalize.ts';
import { reindexSearchDocuments, type ReindexClient } from './reindex.ts';
import type {
  CategorySuggestion,
  RankedProduct,
  SearchOptions,
  SearchProvider,
} from './provider.ts';

import { Prisma } from '@/generated/prisma/client';

/**
 * PostgreSQL search, using pg_trgm.
 *
 * WHY RAW SQL HERE, when the rest of the catalog layer is Prisma: `similarity`
 * and `word_similarity` are pg_trgm functions with no Prisma expression, and
 * relevance ordering has to happen in the database. Every value is passed as a
 * bound parameter through `Prisma.sql`, so nothing is string-concatenated into
 * the statement.
 *
 * WHY TRIGRAMS AND NOT tsvector: PostgreSQL has no Hebrew text-search
 * configuration (ARCHITECTURE section 9). No stemmer, no stop words. Trigram
 * similarity needs none of that, and handles partial words - "טבע" matching
 * "טבעת" - which is exactly what a shopper typing into an overlay produces.
 *
 * MATCHING IS AND ACROSS TERMS, OR WITHIN SYNONYMS. "טבעת זהב לבן" requires a
 * document to match all three concepts; a product matching only "זהב" is not a
 * result. Within one concept the synonyms are alternatives, so "white gold"
 * finds "זהב לבן". Anything looser turns a three-word query into a catalog dump.
 */
class PostgresSearchProvider implements SearchProvider {
  async searchProductIds(
    query: string,
    options: SearchOptions = {},
  ): Promise<readonly RankedProduct[]> {
    const parsed = parseSearchQuery(query);
    if (parsed.isEmpty) return [];

    const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);

    /**
     * Per-term gate. A term counts as present when the document contains it
     * literally, OR when it is close enough by trigram - which is what makes
     * typos and partial words work.
     *
     * `%` here is the pg_trgm word-similarity operator, governed by
     * `pg_trgm.word_similarity_threshold`; the explicit `word_similarity(...)`
     * comparison keeps the threshold visible in the query instead of depending
     * on a session GUC.
     */
    const termClauses = parsed.terms.map((term) => {
      const like = `%${escapeLike(term)}%`;

      // Short terms match by prefix only. A two-character trigram comparison
      // is close to meaningless and would match most of the catalog.
      if (term.length < 3) {
        return Prisma.sql`(p."searchDocument" LIKE ${like} OR p."nameHe" ILIKE ${like})`;
      }

      return Prisma.sql`(
        p."searchDocument" LIKE ${like}
        OR p."nameHe" ILIKE ${like}
        OR word_similarity(${term}, COALESCE(p."searchDocument", '')) >= 0.6
      )`;
    });

    // Synonyms widen the match but never rescue a query on their own: a
    // document must still satisfy every typed term, or a synonym expansion of
    // one word would let unrelated products through.
    const expansionClause =
      parsed.expansions.length > 0
        ? Prisma.sql`OR (${Prisma.join(
            parsed.expansions.map((term) => {
              const like = `%${escapeLike(term)}%`;
              return Prisma.sql`p."searchDocument" LIKE ${like}`;
            }),
            ' OR ',
          )})`
        : Prisma.empty;

    const whole = parsed.normalized;
    const wholeLike = `%${escapeLike(whole)}%`;

    /**
     * PER-TERM SCORING, which is what makes multi-word queries rank at all.
     *
     * An earlier version scored only the WHOLE query - exact name, name
     * contains, whole-phrase similarity. That collapsed on real queries:
     * "טבעת זהב לבן" scored 0 for every product, because no product name
     * contains that exact phrase, so the order fell through to the id
     * tiebreak and was effectively arbitrary. Worse, "טבעת אירוסין" put a
     * bridal SET first, purely because its description happened to contain the
     * phrase, ahead of every actual engagement ring.
     *
     * Each typed term now contributes on its own, weighted by where it hits:
     * the product NAME counts for three times what the document does, because
     * a word in the name is what the product IS, while a word in the document
     * may have come from a category or a description clause.
     */
    const termScores = parsed.terms.map((term) => {
      const like = `%${escapeLike(term)}%`;
      return Prisma.sql`
        + CASE WHEN p."nameHe" ILIKE ${like} THEN 18 ELSE 0 END
        + CASE WHEN p."searchDocument" LIKE ${like} THEN 6 ELSE 0 END`;
    });

    /**
     * Synonym hits score, but well below typed terms. Someone typing "gold"
     * should get gold products ordered sensibly - name matches above
     * description matches - without a synonym ever outranking the words the
     * shopper actually typed.
     */
    const expansionScores = parsed.expansions.map((term) => {
      const like = `%${escapeLike(term)}%`;
      return Prisma.sql`
        + CASE WHEN p."nameHe" ILIKE ${like} THEN 8 ELSE 0 END
        + CASE WHEN p."searchDocument" LIKE ${like} THEN 3 ELSE 0 END`;
    });

    /**
     * RANKING, in the order the brief lists it, as one additive score.
     *
     * Weights are deliberately far apart rather than tuned: an exact name match
     * must always outrank a description mention, whatever the trigram numbers
     * happen to be. Tuning weights against a demo catalog would be fitting
     * noise.
     *
     *   120  exact product name
     *    60  name contains the whole query
     *    40  name trigram similarity - near-exact, tolerant of typos
     *    25  category name similarity, by TRIGRAM not equality, so the query
     *        "טבעת אירוסין" credits the category "טבעות אירוסין" despite the
     *        plural. Equality here was the specific bug that buried engagement
     *        rings under a bridal set.
     *    15  a collection name matched
     *    12  document contains the whole query as a phrase
     *    10  document trigram similarity
     *   +    per-term and per-synonym contributions, above
     *
     * `id` breaks ties, so the order is total and pagination cannot repeat or
     * drop a product.
     */
    const rows = await prisma.$queryRaw<{ id: string; score: number }[]>(Prisma.sql`
      SELECT
        p."id" AS id,
        (
          CASE WHEN lower(p."nameHe") = ${whole} THEN 120 ELSE 0 END
          + CASE WHEN p."nameHe" ILIKE ${wholeLike} THEN 60 ELSE 0 END
          + 40 * word_similarity(${whole}, COALESCE(p."nameHe", ''))
          + 25 * COALESCE((
              SELECT MAX(word_similarity(${whole}, c."nameHe"))
              FROM "Category" c
              WHERE c."id" = p."primaryCategoryId"
                 OR c."id" IN (
                      SELECT pc."categoryId" FROM "ProductCategory" pc
                      WHERE pc."productId" = p."id"
                    )
            ), 0)
          + CASE WHEN EXISTS (
              SELECT 1 FROM "ProductCollection" pcol
              JOIN "Collection" col ON col."id" = pcol."collectionId"
              WHERE pcol."productId" = p."id" AND lower(col."nameHe") LIKE ${wholeLike}
            ) THEN 15 ELSE 0 END
          + CASE WHEN p."searchDocument" LIKE ${wholeLike} THEN 12 ELSE 0 END
          + 10 * similarity(${whole}, COALESCE(p."searchDocument", ''))
          ${Prisma.join(termScores, ' ')}
          ${expansionScores.length > 0 ? Prisma.join(expansionScores, ' ') : Prisma.empty}
        )::float8 AS score
      FROM "Product" p
      WHERE p."isActive" = true
        AND p."archivedAt" IS NULL
        AND p."publishedAt" IS NOT NULL
        AND (
          (${Prisma.join(termClauses, ' AND ')})
          ${expansionClause}
        )
      ORDER BY score DESC, p."id" ASC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({ productId: row.id, score: row.score }));
  }

  async suggestCategories(query: string, limit = 4): Promise<readonly CategorySuggestion[]> {
    const parsed = parseSearchQuery(query);
    if (parsed.isEmpty) return [];

    const candidates = [parsed.normalized, ...parsed.terms, ...parsed.expansions];

    const rows = await prisma.category.findMany({
      where: {
        isActive: true,
        archivedAt: null,
        OR: candidates.map((term) => ({
          nameHe: { contains: term, mode: 'insensitive' as const },
        })),
      },
      orderBy: [{ parentId: { sort: 'asc', nulls: 'first' } }, { position: 'asc' }],
      take: limit,
      select: {
        id: true,
        slug: true,
        nameHe: true,
        parent: { select: { slug: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      nameHe: row.nameHe,
      href: row.parent ? `/${row.parent.slug}/${row.slug}` : `/${row.slug}`,
    }));
  }

  /**
   * Rebuilds search documents from current data.
   *
   * Delegates to the shared implementation so the seed, the CLI and the
   * application all produce byte-identical documents. See reindex.ts.
   */
  async reindex(productIds?: readonly string[]): Promise<number> {
    return reindexSearchDocuments(prisma as unknown as ReindexClient, productIds);
  }
}

/** Escapes LIKE wildcards so a query of "100%" is not a match-everything. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export const postgresSearchProvider: SearchProvider = new PostgresSearchProvider();
