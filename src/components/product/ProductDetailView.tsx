'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import type { ProductDetail, VariantView } from '@/lib/catalog/types';
import { formatPrice } from '@/lib/money';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';
import { Bidi } from '@/lib/rtl/bidi';

import { ProductGallery } from './ProductGallery';
import { WishlistButton } from './WishlistButton';

/**
 * The product page body.
 *
 * A CLIENT COMPONENT, because choosing a gold colour has to re-render without a
 * round trip. It receives a fully-resolved `ProductDetail` from the server and
 * never queries anything - all prices, stock and images were computed on the
 * server from the database (see src/lib/catalog/queries.ts). Nothing here
 * accepts a price from anywhere else, which is what keeps "do not trust
 * client-provided prices" structurally true rather than merely observed.
 *
 * HOW VARIANT RESOLUTION WORKS. Options split in two, exactly as the schema
 * models them:
 *
 *   - AXIS options (gold colour, karat) each pick one value, and the selected
 *     combination identifies ONE variant - matched on the set of option value
 *     ids. That variant supplies the price, the availability and the images.
 *   - NON-AXIS options (ring size, chain length) are SELECTIONS. They are
 *     recorded for the eventual order line and deliberately do NOT change the
 *     variant, because a made-to-order piece is not stocked per size
 *     (TBD.md B11). Selecting one changes nothing on screen but the highlight,
 *     and that is correct.
 *
 * IMAGE RESOLUTION follows the schema's stated rule: a variant's own images
 * when it has any, falling back to the product-level gallery. So switching
 * colour genuinely swaps the gallery when per-colour photography exists.
 *
 * The images themselves are still tonal placeholders - no storage provider is
 * configured (TBD.md I1) - but the ROWS are real, so each one shows its real
 * alt text. Switching colour visibly changes the caption, which is the honest
 * way to demonstrate the wiring without inventing photography.
 */
export function ProductDetailView({ product }: { product: ProductDetail }) {
  const axisOptions = product.options.filter((option) => option.isAxis);
  const selectionOptions = product.options.filter((option) => !option.isAxis);

  /**
   * Initial selection: the first variant's values, so the page opens on a real
   * combination rather than an impossible one assembled from first-of-each.
   */
  const [axisSelection, setAxisSelection] = useState<Record<string, string>>(() =>
    initialAxisSelection(product),
  );
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      selectionOptions.flatMap((option) =>
        option.values[0] ? [[option.id, option.values[0].id]] : [],
      ),
    ),
  );

  const selectedVariant = useMemo(
    () => findVariant(product.variants, Object.values(axisSelection)),
    [product.variants, axisSelection],
  );

  const images =
    selectedVariant && selectedVariant.images.length > 0 ? selectedVariant.images : product.images;

  const price = selectedVariant?.price ?? product.priceRange.min;
  const compareAt = selectedVariant?.compareAtPrice ?? null;
  const availability = selectedVariant?.availability ?? null;
  const diamond = selectedVariant?.diamond ?? product.diamond;

  return (
    /*
     * THE GALLERY IS WIDER THAN THE CONTROLS.
     *
     * The first pass split the page 50/50. On a jewellery product page that is
     * the wrong ratio: half the screen of swatches and size pills against half
     * a screen of photograph makes the page read as a configurator, and the
     * brief is explicit that the image should dominate and that the page must
     * not look like a form. 7 columns of picture to 5 of controls keeps every
     * control comfortably wide while the photograph clearly leads.
     */
    <div className="grid gap-8 md:grid-cols-12 md:gap-12 lg:gap-16">
      {/*
       * THE GALLERY IS STUCK TO THE TOP OF THE COLUMN, NOT TO THE PAGE.
       *
       * `self-start` matters as much as `sticky` here: a grid item stretches
       * to the row's height by default, which makes a sticky child have
       * nothing to move within and quietly do nothing at all.
       *
       * WHY IT STICKS. Below the fold this page is long - options, then the
       * diamond table, then the description - and all of it is text ABOUT the
       * photograph. Scrolling to read a stone's clarity grade with the stone
       * no longer on screen is the exact moment a shopper loses the thread.
       *
       * `top` clears the sticky header rather than guessing: the header is
       * 8.125rem tall on desktop, the same figure the hero's viewport
       * calculation uses.
       */}
      <div className="md:sticky md:top-[calc(8.125rem+1.5rem)] md:col-span-7 md:self-start">
        <div className="relative">
          <ProductGallery images={images} productName={product.nameHe} />

          {/*
           * `end` is the inline end - the LEFT of this RTL page - which is the
           * side the thumbnail rail is NOT on, so the button never lands on a
           * thumbnail.
           */}
          <WishlistButton productName={product.nameHe} className="absolute end-4 top-4 z-10" />
        </div>
      </div>

      <div className="md:col-span-5">
        {availability?.state === 'MADE_TO_ORDER' && (
          <Badge tone="info" className="mb-4">
            בהזמנה אישית
          </Badge>
        )}

        {/*
         * The product name was `text-2xl` - SMALLER than the `text-4xl` title
         * on the category page that links here, so the most important page on
         * the site had the least important heading on it.
         */}
        <h1 className="font-display text-2xl tracking-tight text-balance md:text-3xl">
          {product.nameHe}
        </h1>

        {product.shortDescriptionHe && (
          <p className="text-muted-foreground mt-3 text-sm">{product.shortDescriptionHe}</p>
        )}

        {/*
         * Price at `text-2xl`, up from `text-lg`. It is the single number the
         * page exists to communicate, and at 18px it was competing on equal
         * terms with the SKU line and the option legends.
         */}
        <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn('text-2xl tracking-tight', compareAt && 'text-accent')}>
            {formatPrice(price)}
          </span>
          {compareAt && (
            <span className="text-muted-foreground text-sm line-through">
              {formatPrice(compareAt)}
            </span>
          )}
        </div>

        {availability && <AvailabilityLine availability={availability} />}

        {/* Axis options: change the variant. */}
        {axisOptions.map((option) => (
          <fieldset key={option.id} className="mt-7">
            <legend className="text-sm font-medium">
              {option.nameHe}
              <span className="text-muted-foreground me-2 text-xs font-normal">
                {' '}
                {labelFor(option.values, axisSelection[option.id])}
              </span>
            </legend>

            {/*
             * A COLOUR OPTION RENDERS AS A SWATCH, NOT AS A LABELLED PILL.
             *
             * The first pass drew every axis value the same way: a bordered
             * pill with the name in it and, for gold, a 16px dot beside the
             * text. Selecting one inverted the whole pill to solid black - so
             * choosing a gold colour put a small gold disc on a black
             * rectangle, which is both the black-and-gold cliché the visual
             * direction rejects (section 2) and, worse, the moment the metal
             * itself became the least visible thing in the control.
             *
             * Swatches invert that. The circle is large, it IS the material,
             * and selection is shown by a ring drawn OUTSIDE it, so nothing
             * ever covers or recolours the metal. The chosen value is still
             * named in words - the legend above prints it - so the control does
             * not rely on colour alone to communicate state, which also keeps
             * it usable for a colour-blind shopper.
             */}
            <div className="mt-3.5 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = axisSelection[option.id] === value.id;
                const select = () =>
                  setAxisSelection((current) => ({ ...current, [option.id]: value.id }));

                if (value.hexColor) {
                  return (
                    <button
                      key={value.id}
                      type="button"
                      aria-pressed={active}
                      onClick={select}
                      title={value.labelHe}
                      className={cn(
                        'inline-flex size-9 items-center justify-center rounded-full transition-shadow',
                        // The ring sits outside the swatch via an offset, so
                        // the metal colour is never overlaid.
                        active
                          ? 'ring-foreground ring-offset-background ring-1 ring-offset-2'
                          : 'hover:ring-border-strong hover:ring-offset-background hover:ring-1 hover:ring-offset-2',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: value.hexColor }}
                        className="border-border-strong/70 size-full rounded-full border"
                      />
                      <span className="sr-only">{value.labelHe}</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={value.id}
                    type="button"
                    aria-pressed={active}
                    onClick={select}
                    className={cn(
                      'inline-flex h-10 items-center rounded-sm border px-4 text-sm transition-colors',
                      active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-border-strong hover:bg-muted',
                    )}
                  >
                    {value.labelHe}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {/* Non-axis options: recorded on the order line, not a variant switch. */}
        {selectionOptions.map((option) => (
          <fieldset key={option.id} className="mt-7">
            <legend className="text-sm font-medium">{option.nameHe}</legend>

            <div className="mt-3 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = selections[option.id] === value.id;

                return (
                  <button
                    key={value.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setSelections((current) => ({ ...current, [option.id]: value.id }))
                    }
                    className={cn(
                      'inline-flex h-10 min-w-12 items-center justify-center rounded-sm border px-3 text-sm transition-colors',
                      active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-border-strong hover:bg-muted',
                    )}
                  >
                    {value.labelHe}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {product.customizationFields.length > 0 && (
          <div
            className="border-border mt-7 rounded-sm border border-dashed p-5"
            {...PLACEHOLDER_ATTR}
          >
            <p className="text-sm font-medium">התאמה אישית</p>
            <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
              {product.customizationFields.map((field) => (
                <li key={field.id}>
                  {field.labelHe}
                  {field.isRequired && ' (חובה)'}
                  {field.priceDelta !== null && ` — תוספת ${formatPrice(field.priceDelta)}`}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground/70 text-2xs mt-3">
              טופס ההתאמה האישית ייבנה בשלב הבא. השדות מוצגים כאן מתוך הנתונים בפועל.
            </p>
          </div>
        )}

        <Button variant="primary" size="lg" disabled className="mt-8 w-full" {...PLACEHOLDER_ATTR}>
          הוספה לסל — לא פעיל בשלב זה
        </Button>

        {selectedVariant && (
          <p className="text-muted-foreground/70 text-2xs mt-3 text-center">
            מק״ט <Bidi>{selectedVariant.sku}</Bidi>
          </p>
        )}

        <ConsultationPrompt />

        {diamond && <DiamondSpecTable diamond={diamond} />}

        {product.descriptionHe && (
          <div className="border-border mt-10 border-t pt-6">
            <h2 className="text-sm font-medium">תיאור</h2>
            <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">
              {product.descriptionHe}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The way out of the page that is not the cart.
 *
 * THE GAP THIS FILLS. Reviewed against the reference stores, the most striking
 * thing this product page was missing had nothing to do with styling: every
 * one of them offers a person, and this page offered a button. Malka prints
 * "a sales advisor will contact you to review your order"; Yaniv prints "we
 * will contact you personally"; Cartier declines to show a price on a solitaire
 * at all and offers a phone number and an appointment instead.
 *
 * That is not decoration and it is not upselling. A four-figure piece that is
 * sized to a finger, engraved, or built around a chosen stone is a
 * CONVERSATION, and a page whose only affordance is "add to cart" quietly tells
 * a shopper that the conversation is not on offer - so the ones who need it
 * leave instead of asking.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It promises nothing. No response time, no
 * callback, no "an advisor will contact you", no phone number - every one of
 * those is a service commitment the business has to actually staff, and
 * MASTER_SPECIFICATION section 52 is explicit that this kind of text is not
 * authored here. It also carries no shipping, returns or warranty assurances
 * for the same reason: B4, B5, L2 and L4 are open in TBD.md, and the reference
 * stores' versions of this strip are exactly the promises that register lists.
 *
 * So it routes rather than reassures. Both destinations are real pages that
 * already exist, and "you can ask before ordering" is a fact about the site
 * rather than a policy about the business.
 *
 * When the service decisions land, the assurance lines belong here, above the
 * links, taking their content as props from the route.
 */
function ConsultationPrompt() {
  return (
    <section aria-labelledby="consultation-heading" className="border-border mt-8 border-t pt-6">
      <h2 id="consultation-heading" className="text-sm font-medium">
        שאלות על הדגם?
      </h2>

      <p className="text-muted-foreground mt-2 text-sm">
        אפשר לפנות לפני ההזמנה — לגבי מידה, גוון זהב, או התאמה של הדגם.
      </p>

      {/*
       * Two links, both `secondary` rather than one of them `primary`. The one
       * high-emphasis action on this page is the add-to-cart above; a filled
       * button down here would compete with it and turn a quiet offer of help
       * into a second call to action.
       */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button href="/contact" variant="secondary" size="sm">
          יצירת קשר
        </Button>
        <Button href="/custom" variant="secondary" size="sm">
          עיצוב אישי
        </Button>
      </div>
    </section>
  );
}

/** Availability, derived on the server and only rendered here. */
function AvailabilityLine({
  availability,
}: {
  availability: NonNullable<ProductDetail['variants'][number]['availability']>;
}) {
  if (availability.state === 'OUT_OF_STOCK') {
    return <p className="text-destructive mt-3 text-sm">אזל מהמלאי</p>;
  }

  if (availability.state === 'MADE_TO_ORDER') {
    return (
      <p className="text-muted-foreground mt-3 text-sm">
        מיוצר בהזמנה
        {availability.prepDays !== null && ` — זמן הכנה משוער ${availability.prepDays} ימי עסקים`}
      </p>
    );
  }

  return (
    <p className={cn('mt-3 text-sm', availability.isLowStock ? 'text-warning' : 'text-success')}>
      {availability.isLowStock ? `נותרו ${availability.available} במלאי` : 'במלאי'}
    </p>
  );
}

/** Diamond characteristics. Latin grading terms are bidi-isolated (section 49). */
function DiamondSpecTable({ diamond }: { diamond: NonNullable<ProductDetail['diamond']> }) {
  const rows: readonly { label: string; value: string }[] = [
    ...(diamond.totalCaratWeight
      ? [{ label: 'משקל כולל', value: `${diamond.totalCaratWeight} קראט` }]
      : []),
    ...(diamond.stoneCount !== null
      ? [{ label: 'מספר אבנים', value: String(diamond.stoneCount) }]
      : []),
    ...(diamond.shape ? [{ label: 'צורה', value: diamond.shape }] : []),
    ...(diamond.color ? [{ label: 'צבע', value: diamond.color }] : []),
    ...(diamond.clarity ? [{ label: 'ניקיון', value: diamond.clarity }] : []),
    ...(diamond.cut ? [{ label: 'ליטוש', value: diamond.cut }] : []),
  ];

  return (
    <section aria-labelledby="diamond-heading" className="border-border mt-10 border-t pt-6">
      <h2 id="diamond-heading" className="text-sm font-medium">
        פרטי היהלום
      </h2>

      {/*
       * THE STONE TYPE IS PULLED OUT OF THE TABLE AND STATED FIRST.
       *
       * The store carries both natural and lab-grown diamonds, so "which kind
       * is this?" is now a question every diamond product has to answer
       * plainly. As one row among seven - between carat weight and clarity - it
       * read as another grading attribute, and a shopper scanning the table
       * could easily miss the one line that is not a grade at all.
       *
       * The value comes from `DiamondSpec.isLabGrown` on the selected variant,
       * falling back to the product. It is never asserted anywhere above this
       * component: no page-level or site-level copy claims a type, because the
       * truth is per product and lives in the database.
       */}
      <p className="border-accent/50 bg-muted/40 mt-3 border-s-2 px-4 py-3 text-sm">
        {diamond.isLabGrown ? 'יהלום מעבדה' : 'יהלום טבעי'}
      </p>

      <dl className="divide-border mt-4 divide-y text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">{row.label}</dt>
            {/* Grading values are Latin runs inside Hebrew copy. */}
            <dd>{/^[\x20-\x7E]+$/.test(row.value) ? <Bidi>{row.value}</Bidi> : row.value}</dd>
          </div>
        ))}
      </dl>

      {diamond.certificate && (
        <p className="text-muted-foreground mt-3 text-xs">
          תעודה: <Bidi>{diamond.certificate.issuer}</Bidi> <Bidi>{diamond.certificate.number}</Bidi>
        </p>
      )}
    </section>
  );
}

/** The axis values of the first variant, so the page opens on a real one. */
function initialAxisSelection(product: ProductDetail): Record<string, string> {
  const first = product.variants[0];
  if (!first) return {};

  const selection: Record<string, string> = {};

  for (const option of product.options) {
    if (!option.isAxis) continue;
    const match = option.values.find((value) => first.optionValueIds.includes(value.id));
    if (match) selection[option.id] = match.id;
  }

  return selection;
}

/**
 * The variant whose option values are exactly the selected set.
 *
 * Set equality, not `includes`: a product with two axes has variants that each
 * share one value with several others, so a subset match would return the wrong
 * SKU - and therefore the wrong price and the wrong stock.
 */
function findVariant(
  variants: readonly VariantView[],
  selectedValueIds: readonly string[],
): VariantView | null {
  if (selectedValueIds.length === 0) return variants[0] ?? null;

  const wanted = new Set(selectedValueIds);

  return (
    variants.find(
      (variant) =>
        variant.optionValueIds.length === wanted.size &&
        variant.optionValueIds.every((id) => wanted.has(id)),
    ) ?? null
  );
}

function labelFor(
  values: readonly { id: string; labelHe: string }[],
  selectedId: string | undefined,
): string {
  return values.find((value) => value.id === selectedId)?.labelHe ?? '';
}
