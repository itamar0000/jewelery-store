/**
 * Whether stock levels are real enough to show a shopper.
 *
 * FALSE, because they are not. Every unit count in the catalogue came from the
 * development seed (prisma/seed.ts, "STOCK LEVELS are invented"), and the
 * business makes pieces to order (PRODUCT.md, "stock scarcity mostly is not").
 * A line reading "נותרו 2 במלאי" built from an invented 2 is a scarcity claim the
 * shop cannot stand behind - the kind of pressure the brief rules out.
 *
 * While false, no unit count reaches a shopper anywhere: not on a card, not on
 * the product page. The mechanism stays intact and tested (`toProductCard`
 * takes the policy as an option), because the specification asks for low-stock
 * messaging once inventory is real.
 *
 * TURN IT ON WITH REAL INVENTORY, which arrives with the admin's stock
 * workflow - a code change in any case, so this is a constant rather than an
 * environment variable. Prices, which the owner can make real with data entry
 * alone, have one instead (PRICES_FINAL).
 */
export const STOCK_LEVELS_ARE_LIVE = false;
