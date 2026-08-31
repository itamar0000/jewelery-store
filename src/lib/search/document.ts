import { normalizeSearchText } from './normalize.ts';

/**
 * `Product.searchDocument` generation.
 *
 * WHAT IT IS. One denormalized, normalized text blob per product, holding the
 * words a shopper might plausibly type to find it. Trigram similarity runs
 * against this single column rather than joining across six tables per query.
 *
 * WHAT GOES IN, and nothing else:
 *   - product name and short description
 *   - the long description, trimmed - see the cap below
 *   - primary category and every additional category, plus their parents
 *   - collection names
 *   - gold colour and karat option labels
 *   - diamond shape, and "יהלום מעבדה" when the stone is lab-grown
 *   - style and pendant-type attribute values, in Hebrew
 *
 * WHAT STAYS OUT. SKUs, prices, stock levels, ids, certificate numbers. Prices
 * and stock change constantly and would make every edit a reindex; SKUs and ids
 * are not words anyone searches for. Stuffing them in would dilute similarity
 * scores against the words that matter, because trigram similarity is
 * proportional to how much of the document the query covers - a longer document
 * scores WORSE, not better. That is the reason for the length cap.
 *
 * HOW IT STAYS FRESH (the honest answer to the freshness question):
 *
 *   1. It is generated in the WRITE PATH. Anything that creates or updates a
 *      product calls `buildSearchDocument` in the same transaction. Today the
 *      only writer is the seed; when the admin lands it calls the same
 *      function, so there is one implementation and no drift.
 *   2. `npm run search:reindex` rebuilds every document from current data. That
 *      covers the case the write path cannot: a CATEGORY or COLLECTION being
 *      renamed changes the documents of every product inside it, and making a
 *      category rename fan out to a thousand product rows synchronously is
 *      worse than a command someone runs after a rename.
 *
 * NO QUEUE, NO BACKGROUND WORKER, NO TRIGGER. A database trigger cannot span
 * the tables this needs without becoming a maintenance liability, and async
 * infrastructure for a hundred products is unjustified (specification
 * section 53). The cost of this choice is stated plainly: between a category
 * rename and the next reindex, search matches the old category name. That is a
 * known, bounded staleness with a one-command fix, not a silent one.
 */

/** Everything the document is built from. Deliberately a plain input type. */
export interface SearchDocumentInput {
  readonly nameHe: string;
  readonly shortDescriptionHe?: string | null;
  readonly descriptionHe?: string | null;
  /** Category names, including parents and additional memberships. */
  readonly categoryNames?: readonly string[];
  readonly collectionNames?: readonly string[];
  /** Option value labels: "זהב לבן", "18 קראט", "45 ס״מ". */
  readonly optionLabels?: readonly string[];
  readonly diamondShapes?: readonly string[];
  readonly isLabGrown?: boolean;
  /** `Product.attributes` values, already mapped to Hebrew where known. */
  readonly attributeLabels?: readonly string[];
}

/**
 * Long descriptions are truncated.
 *
 * Trigram similarity divides by document length, so a 2,000-character marketing
 * paragraph drowns the product name it sits next to and makes every product
 * score about the same. The first ~240 characters carry the distinguishing
 * words; the rest is prose.
 */
const DESCRIPTION_CHARS = 240;

/** Total cap, for the same reason. */
const DOCUMENT_CHARS = 1_200;

export function buildSearchDocument(input: SearchDocumentInput): string {
  const parts: string[] = [
    input.nameHe,
    input.shortDescriptionHe ?? '',
    (input.descriptionHe ?? '').slice(0, DESCRIPTION_CHARS),
    ...(input.categoryNames ?? []),
    ...(input.collectionNames ?? []),
    ...(input.optionLabels ?? []),
    ...(input.diamondShapes ?? []),
    input.isLabGrown ? 'יהלום מעבדה lab grown' : '',
    ...(input.attributeLabels ?? []),
  ];

  const normalized = normalizeSearchText(parts.filter((part) => part.length > 0).join(' '));

  // De-duplicate words: a term repeated across name, category and description
  // inflates nothing useful and lengthens the document, which lowers every
  // similarity score.
  const seen = new Set<string>();
  const words: string[] = [];

  for (const word of normalized.split(' ')) {
    if (word.length === 0 || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }

  return words.join(' ').slice(0, DOCUMENT_CHARS);
}
