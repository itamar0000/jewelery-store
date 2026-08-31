'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { cn } from '@/components/ui/cn';
import type { ProductDetail, VariantView } from '@/lib/catalog/types';
import { formatPrice } from '@/lib/money';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';
import { Bidi } from '@/lib/rtl/bidi';

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
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <div>
        <div className="relative">
          <PlaceholderImage
            key={images[0]?.id ?? 'fallback'}
            ratio="square"
            label={images[0]?.altHe ?? product.nameHe}
            className="rounded-sm"
          />
          <WishlistButton productName={product.nameHe} className="absolute end-4 top-4 z-10" />
        </div>

        {images.length > 1 && (
          <ul className="mt-3 grid grid-cols-4 gap-3">
            {images.slice(1, 5).map((image) => (
              <li key={image.id}>
                <PlaceholderImage ratio="square" label={image.altHe} className="rounded-sm" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {availability?.state === 'MADE_TO_ORDER' && (
          <Badge tone="info" className="mb-4">
            בהזמנה אישית
          </Badge>
        )}

        <h1 className="text-2xl tracking-tight">{product.nameHe}</h1>

        {product.shortDescriptionHe && (
          <p className="text-muted-foreground mt-2 text-sm">{product.shortDescriptionHe}</p>
        )}

        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn('text-lg font-medium', compareAt && 'text-accent')}>
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

            <div className="mt-3 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = axisSelection[option.id] === value.id;

                return (
                  <button
                    key={value.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setAxisSelection((current) => ({ ...current, [option.id]: value.id }))
                    }
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-sm border px-3 text-sm transition-colors',
                      active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-border-strong hover:bg-muted',
                    )}
                  >
                    {value.hexColor && (
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: value.hexColor }}
                        className="border-border-strong size-4 rounded-full border"
                      />
                    )}
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
    diamond.isLabGrown
      ? { label: 'מקור', value: 'יהלום מעבדה' }
      : { label: 'מקור', value: 'יהלום כרוי' },
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

      <dl className="divide-border mt-3 divide-y text-sm">
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
