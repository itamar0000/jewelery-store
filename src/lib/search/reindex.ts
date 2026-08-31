import { buildSearchDocument } from './document.ts';

/**
 * Rebuilding `Product.searchDocument`, in one implementation.
 *
 * THREE CALLERS, ONE BODY: the seed, the `search:reindex` command, and the
 * provider's `reindex`. An earlier draft had the seed build documents inline
 * and the provider build them again, which is exactly how a seeded catalog
 * ends up indexed differently from a production one.
 *
 * TAKES THE CLIENT AS A PARAMETER, structurally typed. The seed and the CLI
 * construct their own `PrismaClient` against `DATABASE_URL` and run under plain
 * Node, where the `@/...` path alias does not resolve; the application passes
 * the shared singleton. Depending on a structural shape rather than importing
 * `@/lib/db` is what lets all three share this file.
 */

/**
 * The narrow slice of Prisma this needs.
 *
 * `findMany` is declared as returning `unknown[]` rather than the row type:
 * Prisma's real signature is generic over the `select`, so a structural
 * interface that promised the selected shape would not accept the actual
 * client. The rows are asserted once, below, against REINDEX_SELECT - which is
 * the only thing that determines their shape.
 */
export interface ReindexClient {
  product: {
    findMany(args: { where: object; select: object }): Promise<unknown[]>;
    update(args: { where: { id: string }; data: { searchDocument: string } }): Promise<unknown>;
  };
}

export interface IndexableProduct {
  id: string;
  nameHe: string;
  shortDescriptionHe: string | null;
  descriptionHe: string | null;
  attributes: unknown;
  primaryCategory: { nameHe: string; parent: { nameHe: string } | null };
  categories: { category: { nameHe: string; parent: { nameHe: string } | null } }[];
  collections: { collection: { nameHe: string } }[];
  options: { values: { labelHe: string }[] }[];
  diamondSpec: { shape: string | null; isLabGrown: boolean } | null;
  variants: { diamondSpec: { shape: string | null; isLabGrown: boolean } | null }[];
}

/** Everything a document is built from, selected once. */
export const REINDEX_SELECT = {
  id: true,
  nameHe: true,
  shortDescriptionHe: true,
  descriptionHe: true,
  attributes: true,
  primaryCategory: { select: { nameHe: true, parent: { select: { nameHe: true } } } },
  categories: {
    select: { category: { select: { nameHe: true, parent: { select: { nameHe: true } } } } },
  },
  collections: { select: { collection: { select: { nameHe: true } } } },
  options: { select: { values: { select: { labelHe: true } } } },
  diamondSpec: { select: { shape: true, isLabGrown: true } },
  variants: { select: { diamondSpec: { select: { shape: true, isLabGrown: true } } } },
} as const;

/**
 * Rebuilds documents for the given products, or for all of them.
 *
 * Returns how many rows were written. Idempotent: running it twice produces the
 * same documents, which is what makes it safe to run after any rename.
 */
export async function reindexSearchDocuments(
  client: ReindexClient,
  productIds?: readonly string[],
): Promise<number> {
  const rows = await client.product.findMany({
    where: productIds ? { id: { in: [...productIds] } } : {},
    select: REINDEX_SELECT,
  });

  // The one assertion, and it is safe by construction: the rows were selected
  // with REINDEX_SELECT immediately above, which is exactly IndexableProduct.
  const products = rows as IndexableProduct[];

  let written = 0;

  for (const product of products) {
    await client.product.update({
      where: { id: product.id },
      data: { searchDocument: documentFor(product) },
    });
    written += 1;
  }

  return written;
}

/** The document for one already-selected product row. */
export function documentFor(product: IndexableProduct): string {
  const categoryNames = [
    product.primaryCategory.nameHe,
    product.primaryCategory.parent?.nameHe ?? '',
    ...product.categories.flatMap((link) => [
      link.category.nameHe,
      link.category.parent?.nameHe ?? '',
    ]),
  ].filter((name) => name.length > 0);

  const specs = [
    product.diamondSpec,
    ...product.variants.map((variant) => variant.diamondSpec),
  ].filter((spec): spec is { shape: string | null; isLabGrown: boolean } => spec !== null);

  return buildSearchDocument({
    nameHe: product.nameHe,
    shortDescriptionHe: product.shortDescriptionHe,
    descriptionHe: product.descriptionHe,
    categoryNames,
    collectionNames: product.collections.map((link) => link.collection.nameHe),
    optionLabels: product.options.flatMap((option) => option.values.map((value) => value.labelHe)),
    diamondShapes: specs.flatMap((spec) => (spec.shape ? [spec.shape] : [])),
    isLabGrown: specs.some((spec) => spec.isLabGrown),
    attributeLabels: attributeValues(product.attributes),
  });
}

/** String values from `Product.attributes`, so "קלאסי" is searchable. */
function attributeValues(attributes: unknown): string[] {
  if (attributes === null || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return [];
  }

  return Object.values(attributes as Record<string, unknown>).filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}
