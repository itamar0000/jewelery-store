import type { CartLineView } from '@/lib/cart/types';
import type { PlacedOrderView } from '@/lib/orders/read';

import type { SummaryLine } from './OrderSummary';

/**
 * Cart lines and order lines, drawn by the same summary.
 *
 * A cart line links back to its product; an order line does not, because it
 * is a record of what was bought and the product may since have changed or
 * left the catalogue (principle 9).
 */

export function cartLineToSummary(line: CartLineView): SummaryLine {
  return {
    id: line.id,
    name: line.productName,
    href: `/product/${line.productSlug}`,
    imageUrl: line.imageUrl,
    imageAlt: line.imageAlt,
    variantLabel: line.variantLabel,
    details: [...line.selections, ...line.personalization],
    quantity: line.quantity,
    lineTotal: line.lineTotal,
    leadTimeDays: line.leadTimeDays,
  };
}

export function orderLineToSummary(line: PlacedOrderView['lines'][number]): SummaryLine {
  return {
    id: line.id,
    name: line.productName,
    href: null,
    imageUrl: line.imageUrl,
    imageAlt: line.productName,
    variantLabel: line.variantLabel,
    details: line.details,
    quantity: line.quantity,
    lineTotal: line.lineTotal,
    leadTimeDays: line.prepDays,
  };
}
