import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ProductDetail } from '@/lib/catalog/types';
import { fromShekels } from '@/lib/money';

import { ProductDetailView } from './ProductDetailView';

/**
 * Product page contracts that are about correctness rather than looks.
 *
 * Rendered with `react-dom/server` like the rest of the component suite, so
 * what is asserted is the page's FIRST state - which is exactly where a silent
 * default would live.
 */

const MADE_TO_ORDER = {
  state: 'MADE_TO_ORDER' as const,
  available: 0,
  isLowStock: false,
  prepDays: 14,
  isPurchasable: true,
};

/** A ring with a colour axis, a required size selection and a certified stone. */
const RING: ProductDetail = {
  id: 'p1',
  slug: 'solitaire-ring',
  nameHe: 'טבעת סוליטר',
  descriptionHe: null,
  shortDescriptionHe: null,
  productType: 'RING',
  seoTitle: null,
  seoDescription: null,
  category: { id: 'c1', slug: 'rings', nameHe: 'טבעות', href: '/rings' },
  ancestors: [],
  options: [
    {
      id: 'o-colour',
      code: 'gold_color',
      type: 'GOLD_COLOR',
      nameHe: 'גוון זהב',
      isAxis: true,
      isRequired: true,
      values: [
        { id: 'v-yellow', value: 'YELLOW', labelHe: 'זהב צהוב', hexColor: '#E5C06B' },
        { id: 'v-white', value: 'WHITE', labelHe: 'זהב לבן', hexColor: '#E8E8E6' },
      ],
    },
    {
      id: 'o-size',
      code: 'ring_size',
      type: 'RING_SIZE',
      nameHe: 'מידה',
      isAxis: false,
      isRequired: true,
      values: [
        { id: 's-48', value: '48', labelHe: '48', hexColor: null },
        { id: 's-50', value: '50', labelHe: '50', hexColor: null },
        { id: 's-52', value: '52', labelHe: '52', hexColor: null },
      ],
    },
  ],
  variants: [
    {
      id: 'var-yellow',
      sku: 'SOLITAIRE-YELLOW',
      price: fromShekels(4890),
      compareAtPrice: null,
      optionValueIds: ['v-yellow'],
      availability: MADE_TO_ORDER,
      images: [],
      diamond: null,
    },
    {
      id: 'var-white',
      sku: 'SOLITAIRE-WHITE',
      price: fromShekels(4890),
      compareAtPrice: null,
      optionValueIds: ['v-white'],
      availability: MADE_TO_ORDER,
      images: [],
      diamond: null,
    },
  ],
  images: [],
  diamond: {
    isLabGrown: false,
    totalCaratWeight: '0.50',
    stoneCount: 1,
    color: 'F',
    clarity: 'VS1',
    cut: 'Excellent',
    shape: 'Round',
    certificate: { issuer: 'GIA', number: '2141438172', verifyUrl: null },
  },
  customizationFields: [],
  collections: [],
  priceRange: { min: fromShekels(4890), max: fromShekels(4890) },
};

const markup = renderToStaticMarkup(<ProductDetailView product={RING} />);

/** The `aria-pressed` state of the option button whose label is `label`. */
function pressed(label: string): string | undefined {
  const pattern = new RegExp(`<button[^>]*aria-pressed="(true|false)"[^>]*>${label}</button>`);
  return pattern.exec(markup)?.[1];
}

describe('ProductDetailView', () => {
  describe('ring size', () => {
    /*
     * The page used to open with the first size already pressed, so a shopper
     * who never touched the row ordered a 48. A size is the customer's fact;
     * the page must not supply one.
     */
    it('opens with no size chosen', () => {
      expect(pressed('48')).toBe('false');
      expect(pressed('50')).toBe('false');
      expect(pressed('52')).toBe('false');
    });

    it('says a required size is still to be chosen', () => {
      expect(markup).toMatch(/מידה<span[^>]*>\s*יש לבחור<\/span>/);
    });
  });

  /*
   * A model made in one karat used to draw a row holding one pressed button -
   * a control with nothing to choose. It is stated instead.
   */
  describe('an option with a single value', () => {
    const ONE_KARAT: ProductDetail = {
      ...RING,
      options: [
        ...RING.options,
        {
          id: 'o-karat',
          code: 'gold_karat',
          type: 'GOLD_KARAT',
          nameHe: 'קראט',
          isAxis: true,
          isRequired: true,
          values: [{ id: 'k-18', value: '18K', labelHe: '18 קראט', hexColor: null }],
        },
      ],
      variants: RING.variants.map((variant) => ({
        ...variant,
        optionValueIds: [...variant.optionValueIds, 'k-18'],
      })),
    };
    const page = renderToStaticMarkup(<ProductDetailView product={ONE_KARAT} />);

    it('is stated, not offered as a choice', () => {
      expect(page).toMatch(/קראט<span[^>]*>\s*18 קראט<\/span>/);
      expect(page).not.toMatch(/<button[^>]*>18 קראט<\/button>/);
    });

    it('still lets the other options be chosen', () => {
      expect(page.match(/<fieldset/g)).toHaveLength(2);
    });
  });

  describe('variant axes', () => {
    // Unchanged on purpose: the colour picks the variant whose price and
    // photographs the page shows, and the legend names it.
    it('still opens on the first real variant, named in the legend', () => {
      expect(markup).toMatch(/גוון זהב<span[^>]*>\s*זהב צהוב<\/span>/);
    });

    it('presses exactly one control on arrival - the variant colour, nothing else', () => {
      expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    });
  });

  describe('the purchase control', () => {
    const addToCart = async () => ({ ok: true as const, itemCount: 1 });
    const buyable = renderToStaticMarkup(
      <ProductDetailView product={RING} addToCart={addToCart} />,
    );

    it('is one primary action, enabled, with its outcome line already listening', () => {
      // One in the page, one in the phone's sticky bar - which renders hidden
      // and inert until the page's own button is below the screen.
      expect(buyable.match(/הוספה לסל/g)).toHaveLength(2);
      expect(buyable).toMatch(/aria-hidden="true" inert=""[^>]*fixed inset-x-0 bottom-0/);
      expect(buyable).not.toContain('disabled=""');
      expect(buyable).toMatch(/<p role="status"[^>]*><\/p>/);
    });

    it('is absent without an action - never a control that does nothing', () => {
      // A disabled "add to cart - not active at this stage" stood here once.
      expect(markup).not.toContain('הוספה לסל');
      expect(markup).not.toContain('בשלב');
      expect(markup).not.toContain('disabled=""');
    });

    it('says so in words when the combination cannot be ordered', () => {
      const soldOut: ProductDetail = {
        ...RING,
        variants: RING.variants.map((variant) => ({
          ...variant,
          availability: { ...MADE_TO_ORDER, state: 'OUT_OF_STOCK', isPurchasable: false },
        })),
      };
      const page = renderToStaticMarkup(
        <ProductDetailView product={soldOut} addToCart={addToCart} />,
      );

      expect(page).toContain('השילוב הזה אינו זמין להזמנה.');
      expect(page).not.toContain('הוספה לסל');
    });
  });

  describe('what the page says about itself', () => {
    it('labels the price as an estimate, beside the figure, when told to', () => {
      const labelled = renderToStaticMarkup(
        <ProductDetailView product={RING} priceLabel="מחיר משוער" />,
      );
      expect(labelled).toContain('מחיר משוער');
      expect(markup).not.toContain('מחיר משוער');
    });

    it('invites no conversation unless a contact channel exists', () => {
      expect(markup).not.toContain('שאלות על הדגם');
      expect(markup).not.toContain('href="/contact"');

      const reachable = renderToStaticMarkup(<ProductDetailView product={RING} contactAvailable />);
      expect(reachable).toContain('שאלות על הדגם');
      expect(reachable).toContain('href="/contact"');
    });
  });

  /*
   * Stock counts are seed data (src/lib/inventory/disclosure.ts). The page
   * states a lead time, which rests on configuration, and states stock only
   * once stock is real.
   */
  describe('availability', () => {
    type Availability = ProductDetail['variants'][number]['availability'];

    function withAvailability(availability: Availability, stockLevelsLive?: boolean) {
      const product: ProductDetail = {
        ...RING,
        variants: RING.variants.map((variant) => ({ ...variant, availability })),
      };
      return renderToStaticMarkup(
        <ProductDetailView product={product} stockLevelsLive={stockLevelsLive} />,
      );
    }

    const IN_STOCK = { ...MADE_TO_ORDER, state: 'IN_STOCK' as const, available: 3, prepDays: null };
    const LOW = { ...IN_STOCK, available: 2, isLowStock: true };
    const SOLD_OUT = {
      ...MADE_TO_ORDER,
      state: 'OUT_OF_STOCK' as const,
      prepDays: null,
      isPurchasable: false,
    };

    it('states the lead time of a made-to-order variant', () => {
      expect(markup).toContain('מיוצר בהזמנה');
      expect(markup).toContain('14 ימי עסקים');
    });

    it('says it once - no "בהזמנה אישית" badge above the name as well', () => {
      expect(markup).not.toContain('בהזמנה אישית');
    });

    it('says nothing about stock while stock levels are not live', () => {
      for (const availability of [IN_STOCK, LOW, SOLD_OUT]) {
        const page = withAvailability(availability);

        expect(page).not.toContain('במלאי');
        expect(page).not.toContain('אזל מהמלאי');
        expect(page).not.toContain('נותרו');
      }
    });

    it('states stock once stock levels are live', () => {
      expect(withAvailability(IN_STOCK, true)).toContain('במלאי');
      expect(withAvailability(LOW, true)).toContain('נותרו 2 במלאי');
      expect(withAvailability(SOLD_OUT, true)).toContain('אזל מהמלאי');
    });
  });

  describe('wishlist', () => {
    it('offers no heart while saving does not exist', () => {
      expect(markup).not.toContain('מועדפים');
    });
  });

  describe('personalisation', () => {
    const NAME_NECKLACE: ProductDetail = {
      ...RING,
      customizationFields: [
        {
          id: 'f-name',
          key: 'engraving_text',
          labelHe: 'שם לחריטה',
          fieldType: 'TEXT',
          isRequired: true,
          maxLength: 12,
          helpTextHe: 'עד 12 תווים.',
          priceDelta: fromShekels(90),
          options: null,
        },
        {
          id: 'f-language',
          key: 'engraving_language',
          labelHe: 'שפת החריטה',
          fieldType: 'LANGUAGE',
          isRequired: true,
          maxLength: null,
          helpTextHe: null,
          priceDelta: fromShekels(0),
          options: [
            { value: 'he', labelHe: 'עברית' },
            { value: 'en', labelHe: 'אנגלית' },
          ],
        },
        {
          id: 'f-notes',
          key: 'notes',
          labelHe: 'הערות',
          fieldType: 'TEXTAREA',
          isRequired: false,
          maxLength: 200,
          helpTextHe: null,
          priceDelta: null,
          options: null,
        },
      ],
    };
    const personal = renderToStaticMarkup(<ProductDetailView product={NAME_NECKLACE} />);

    it('asks for each field with a real, labelled input - nothing typed in for the shopper', () => {
      expect(personal).toMatch(/<label for="field-engraving_text"[^>]*>שם לחריטה/);
      expect(personal).toMatch(/<input[^>]*id="field-engraving_text"[^>]*value=""/);
      expect(personal).toMatch(/<textarea[^>]*id="field-notes"/);
      expect(personal).not.toContain('ייבנה');
      expect(personal).not.toContain('data-placeholder');
    });

    it('counts the room left in characters, without cutting typing at a UTF-16 limit', () => {
      // A maxLength attribute counts code units and cut pointed names short.
      expect(personal).not.toMatch(/<input[^>]*maxLength=/);
      expect(personal).toContain('עד 12 תווים.');
      expect(personal).toContain('0/12');
    });

    it('offers a language as choices, none pressed', () => {
      expect(personal).toMatch(/<button[^>]*aria-pressed="false"[^>]*>עברית<\/button>/);
      expect(personal).toMatch(/<button[^>]*aria-pressed="false"[^>]*>אנגלית<\/button>/);
      expect(personal).toMatch(/שפת החריטה<span[^>]*>\s*יש לבחור<\/span>/);
    });

    it('counts a required surcharge in the price, and says it is included', () => {
      // The name cannot be skipped, so ₪90 is part of the price - never "תוספת".
      expect(personal).toContain('כולל החריטה');
      expect(personal).toMatch(/90[^<]*₪<\/bdi> כלולים במחיר/);
      expect(personal).not.toContain('תוספת');
      // "שפת החריטה" costs nothing extra and says nothing about it.
      expect(personal).not.toMatch(/שפת החריטה[^<]*כלולים/);
    });

    it('shows the name back as it is typed, before anything is typed too', () => {
      expect(personal).toContain('כך ייכתב השם.');
      expect(personal).toContain('השם כאן');
    });

    it('marks the optional field rather than the required ones', () => {
      expect(personal).toMatch(/הערות<span[^>]*>\(לא חובה\)<\/span>/);
      expect(personal).not.toContain('(חובה)');
    });
  });

  describe('diamond certificate', () => {
    /*
     * "Issuer number" is one LTR run. As two isolates on an RTL line it
     * rendered number-first, a reference nobody could look up as shown.
     */
    it('renders issuer and number as a single isolated run, in that order', () => {
      expect(markup).toContain(
        '<span dir="ltr" style="unicode-bidi:isolate">GIA 2141438172</span>',
      );
    });

    it('does not isolate the issuer on its own', () => {
      expect(markup).not.toContain('<span dir="ltr" style="unicode-bidi:isolate">GIA</span>');
    });
  });
});

/*
 * Grades as printed on a certificate, each with what it means (clarify pass).
 * The ring fixture's stone is Round, F, VS1, Excellent.
 */
describe('diamond grades', () => {
  it('keeps every grade as printed and says what it means', () => {
    expect(markup).toContain('<span dir="ltr" style="unicode-bidi:isolate">F</span>');
    expect(markup).toContain('חסר צבע');
    expect(markup).toContain('<span dir="ltr" style="unicode-bidi:isolate">VS1</span>');
    expect(markup).toContain('פגמים זעירים, נראים רק בהגדלה');
    expect(markup).toContain('מצוין');
  });

  it('names the shape in Hebrew, with the certificate term beside it', () => {
    expect(markup).toMatch(/עגול<span[^>]*> · <span dir="ltr"[^>]*>Round<\/span>/);
  });
});

describe('ring size', () => {
  it('states the unit and explains how to find a size in place, not a page away', () => {
    expect(markup).toContain('מידה אירופית: היקף פנימי במ״מ.');
    expect(markup).not.toContain('href="/faq#ring-size"');
    expect(markup).toMatch(/<details[^>]*>\s*<summary/);
    expect(markup).toContain('איך יודעים מידה?');
  });

  it('works out the inner diameter of each size, so nobody has to', () => {
    // Size 52 is a 52mm circumference: 52 / pi = 16.6mm across.
    expect(markup).toMatch(/<td[^>]*>52<\/td><td[^>]*>16\.6 מ״מ<\/td>/);
  });
});

/*
 * The listed options are not the limit of what can be made (PRODUCT.md: every
 * model can be altered in karat, gold colour, size and length).
 */
describe('made your way', () => {
  it('names the axes this piece has a reason to mention, and links to a request for this model', () => {
    expect(markup).toContain('רוצים גוון זהב, קראט או מידה אחרים? כל דגם אפשר להזמין גם בהם.');
    // The request starts from this model, made the way it is on screen.
    expect(markup).toMatch(/href="\/custom\/request\?product=[a-z0-9-]+&amp;/);
  });

  it('says length for a chain, and neither for a piece with no size', () => {
    const chain: ProductDetail = {
      ...RING,
      options: RING.options.map((option) =>
        option.code === 'ring_size' ? { ...option, code: 'length', nameHe: 'אורך' } : option,
      ),
    };
    const earrings: ProductDetail = {
      ...RING,
      options: RING.options.filter((option) => option.code !== 'ring_size'),
    };

    expect(renderToStaticMarkup(<ProductDetailView product={chain} />)).toContain(
      'רוצים גוון זהב, קראט או אורך אחרים?',
    );
    expect(renderToStaticMarkup(<ProductDetailView product={earrings} />)).toContain(
      'רוצים גוון זהב או קראט אחרים?',
    );
  });
});
