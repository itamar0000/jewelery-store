import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { fromShekels } from '@/lib/money';
import type { PlacedOrderView } from '@/lib/orders/read';

import { CheckoutSteps } from './CheckoutSteps';
import { OrderFacts } from './OrderFacts';
import { SummaryTotalsTable } from './OrderSummary';

describe('CheckoutSteps', () => {
  it('marks the current step, and offers a way back only to finished ones', () => {
    const markup = renderToStaticMarkup(<CheckoutSteps current={3} onSelect={() => {}} />);

    expect(markup).toMatch(/<li aria-current="step"[^>]*>.*3.*סיכום/);
    expect(markup.match(/<button/g)).toHaveLength(2);
    // No button whose own content is the payment step.
    expect(markup).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*תשלום/);
  });

  it('is plain text throughout once the order is placed', () => {
    expect(renderToStaticMarkup(<CheckoutSteps current={4} />)).not.toContain('<button');
  });
});

describe('SummaryTotalsTable', () => {
  const totals = {
    itemCount: 2,
    subtotal: fromShekels(2760),
    shipping: fromShekels(0),
    total: fromShekels(2760),
    vat: null,
  };

  it('says shipping is free in words, not as a zero', () => {
    const markup = renderToStaticMarkup(<SummaryTotalsTable totals={totals} />);

    expect(markup).toContain('חינם');
    expect(markup).toContain('2 פריטים');
  });

  it('states VAT only when a rate is configured', () => {
    expect(renderToStaticMarkup(<SummaryTotalsTable totals={totals} />)).not.toContain('מע״מ');
    expect(
      renderToStaticMarkup(<SummaryTotalsTable totals={{ ...totals, vat: fromShekels(421) }} />),
    ).toContain('כולל מע״מ');
  });

  it('carries the estimate note while prices are placeholders', () => {
    expect(
      renderToStaticMarkup(<SummaryTotalsTable totals={totals} priceNote="המחירים משוערים" />),
    ).toContain('המחירים משוערים');
  });
});

describe('OrderFacts', () => {
  const order: PlacedOrderView = {
    orderNumber: '100001',
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    email: 'michal@example.test',
    lines: [],
    itemCount: 1,
    subtotal: fromShekels(1290),
    shipping: fromShekels(0),
    total: fromShekels(1290),
    vat: null,
    vatRateBps: null,
    shipTo: { fullName: 'נועה לוי', city: 'תל אביב' },
  };

  it('states the order as the record has it - awaiting payment, not paid', () => {
    const markup = renderToStaticMarkup(<OrderFacts order={order} />);

    expect(markup).toContain('100001');
    expect(markup).toContain('ממתינה לתשלום');
    expect(markup).not.toContain('שולמה');
    expect(markup).toContain('נועה לוי, תל אביב');
  });
});
