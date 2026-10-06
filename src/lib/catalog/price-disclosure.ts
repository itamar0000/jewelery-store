import { env } from '@/lib/env';

/**
 * How the storefront speaks about prices that are not final.
 *
 * PRODUCT.md, principle 1: a price is the one thing a shopper is entitled to
 * rely on, and every price in the catalogue is a placeholder until PRICES_FINAL
 * says otherwise. The storefront therefore states it IN WORDS, once per view -
 * beside the price on the product page, once above or below a grid of cards -
 * rather than with a glyph on every card. The "≈" this replaces read as a typo
 * to most shoppers, explained itself only in the footer, and was missing on the
 * product page, the one place a shopper acts on a price.
 *
 * SERVER ONLY (it reads the environment). Client components receive the text
 * as a prop, or `null` once prices are final.
 */
export const pricesAreEstimates = !env.PRICES_FINAL;

/** Beside a single price: the product page. */
export const ESTIMATED_PRICE_LABEL = 'מחיר משוער';

/** Once per view of several prices: a grid, a suggestion list. */
export const ESTIMATED_PRICES_NOTE = 'המחירים משוערים';

/** The label for a single price, or null once prices are final. */
export const estimatedPriceLabel: string | null = pricesAreEstimates ? ESTIMATED_PRICE_LABEL : null;

/** The note for a view of several prices, or null once prices are final. */
export const estimatedPricesNote: string | null = pricesAreEstimates ? ESTIMATED_PRICES_NOTE : null;
