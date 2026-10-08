'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { PURCHASE_MESSAGES, selectionMessage } from '@/lib/cart/messages';
import type { AddToCartRequest, CartMutationResult } from '@/lib/cart/types';
import { choicesFromParams, choicesToParams } from '@/lib/catalog/choice-params';
import {
  clarityGloss,
  colorGloss,
  cutGloss,
  diamondOriginLabel,
  shapeNameHe,
} from '@/lib/catalog/diamond-terms';
import type { ProductDetail, VariantView } from '@/lib/catalog/types';
import { add, formatPrice, fromAgorot, toAgorot } from '@/lib/money';
import { textFieldIssue } from '@/lib/personalization/engraving';
import { Bidi } from '@/lib/rtl/bidi';

import { NamePreview } from './NamePreview';
import { ProductGallery } from './ProductGallery';
import { RingSizeGuide } from './RingSizeGuide';
import { StickyPurchaseBar } from './StickyPurchaseBar';
import {
  PROBLEM_TARGET,
  PersonalizationFields,
  PurchaseAction,
  type ProblemMap,
  type PurchaseStatus,
} from './PurchasePanel';

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
export function ProductDetailView({
  product,
  priceLabel = null,
  contactAvailable = false,
  stockLevelsLive = false,
  addToCart,
  initialChoices = {},
}: {
  product: ProductDetail;
  /**
   * The choices named in the address (`?karat=18k&color=rose&size=52`), as
   * option id -> value id, already matched against this product's options by
   * the route (src/lib/catalog/choice-params.ts).
   */
  initialChoices?: Readonly<Record<string, string>>;
  /**
   * "מחיר משוער" while prices are placeholders, `null` once they are final
   * (src/lib/catalog/price-disclosure.ts). This is the page a shopper acts on,
   * so the qualifier sits beside the figure rather than in the footer.
   */
  priceLabel?: string | null;
  /**
   * Whether any contact channel is configured. Without one the page invites no
   * conversation: PRODUCT.md, "any contact affordance must be real before it
   * ships".
   */
  contactAvailable?: boolean;
  /**
   * Whether the stock counts are real (src/lib/inventory/disclosure.ts). Until
   * they are, the page states lead times only - never "במלאי" or "אזל מהמלאי".
   */
  stockLevelsLive?: boolean;
  /**
   * Puts the configured piece in the bag - the cart's server action, passed
   * in by the route. Without it the page offers no purchase control at all,
   * rather than one that does nothing.
   */
  addToCart?: (request: AddToCartRequest) => Promise<CartMutationResult>;
}) {
  const axisOptions = product.options.filter((option) => option.isAxis);
  const selectionOptions = product.options.filter((option) => !option.isAxis);

  /**
   * Initial selection: the first variant's values, so the page opens on a real
   * combination rather than an impossible one assembled from first-of-each.
   */
  const [axisSelection, setAxisSelection] = useState<Record<string, string>>(() =>
    initialAxisSelection(product, initialChoices),
  );

  /**
   * SELECTIONS START EMPTY - nothing is chosen for the customer.
   *
   * This used to open on the first value of every selection, so a ring page
   * arrived with size 48 already pressed. A ring size or a chain length is a
   * fact about the customer, not a default the shop can supply: a shopper who
   * never looked at the row would have ordered the smallest size in the list.
   * The axis options are different, and keep their opening value - they pick
   * the variant whose price and photographs the page has to show, and the
   * chosen value is named in the legend - but a selection is only ever what
   * the shopper pressed. A required one says so until it is chosen.
   */
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    pick(initialChoices, selectionOptions),
  );

  /*
   * THE CHOICES LIVE IN THE ADDRESS TOO (critique 2026-10-06, P2).
   *
   * They were held only here, so anything that left the page - the size
   * guide, the bag, a link sent to someone - came back to the first variant:
   * 18K turned into 14K and the price changed without a word. Every change is
   * now written to the address with `replaceState` - no navigation, no new
   * history entry, no request - so Back, a reload and a shared link all
   * reopen the piece as it was made.
   *
   * On arrival the address is read once more in the browser. The route reads
   * it as well, but a page restored from the router's cache on Back carries
   * the props of its first visit, before any choice was made.
   */
  const changed = useRef(false);
  /** The purchase action, watched by the phone's sticky bar. */
  const purchaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromAddress = choicesFromParams(
      product.options,
      new URLSearchParams(window.location.search),
    );
    if (Object.keys(fromAddress).length === 0) return;
    setAxisSelection((current) => initialAxisSelection(product, fromAddress, current));
    setSelections((current) => ({ ...current, ...pick(fromAddress, selectionOptions) }));
    // Once, on arrival: the address is the starting point, then the page writes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!changed.current) return;
    const params = choicesToParams(product.options, { ...axisSelection, ...selections });
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, '', next);
    }
  }, [product.options, axisSelection, selections]);

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

  /** Personalisation as typed, keyed by field. Nothing is filled in for the shopper. */
  const [personalization, setPersonalization] = useState<Record<string, string>>({});
  /** Fields to correct, keyed by option code or field key - the server's own keys. */
  const [problems, setProblems] = useState<ProblemMap>({});
  const [status, setStatus] = useState<PurchaseStatus>({ kind: 'idle' });

  /** Any change clears that field's problem, and the line under the button. */
  const touched = (key: string) => {
    setProblems((current) => {
      if (!(key in current)) return current;
      const { [key]: _cleared, ...rest } = current;
      return rest;
    });
    setStatus((current) => (current.kind === 'pending' ? current : { kind: 'idle' }));
  };

  /*
   * A REQUIRED SURCHARGE IS PART OF THE PRICE. The name necklace cannot be
   * ordered without a name, so "₪1,290, plus ₪90 for the name" stated a price
   * nobody could pay (critique 2026-10-06, P2). The price shown is the one the
   * bag will show for the piece as it must be ordered - "כולל החריטה" - and
   * only an OPTIONAL surcharge, once filled in, is added beside the button.
   */
  const surchargeOf = (field: ProductDetail['customizationFields'][number]) =>
    field.priceDelta ? toAgorot(field.priceDelta) : 0;
  const requiredSurchargeAgorot = product.customizationFields
    .filter((field) => field.isRequired)
    .reduce((sum, field) => sum + surchargeOf(field), 0);
  const optionalSurchargeAgorot = product.customizationFields
    .filter((field) => !field.isRequired && (personalization[field.key] ?? '').trim() !== '')
    .reduce((sum, field) => sum + surchargeOf(field), 0);
  const shownPrice =
    requiredSurchargeAgorot > 0 ? add(price, fromAgorot(requiredSurchargeAgorot)) : price;
  const engravingField = product.customizationFields.find(
    (field) => field.fieldType === 'TEXT' && field.isRequired,
  );
  const languageField = product.customizationFields.find((field) => field.fieldType === 'LANGUAGE');

  /**
   * Check, send, report.
   *
   * The same rules the server applies are checked here first, so a missing
   * size is pointed at without a round trip; the server checks again, and its
   * answer is the one that counts. Either way the first field to correct takes
   * focus, so a keyboard or screen-reader user lands on it rather than
   * hearing that something, somewhere, is wrong.
   */
  async function handleAdd() {
    if (!addToCart || !selectedVariant || status.kind === 'pending') return;

    const found: Record<string, 'missing' | 'invalid'> = {};
    for (const option of selectionOptions) {
      if (option.isRequired && !selections[option.id]) found[option.code] = 'missing';
    }
    const language = languageField ? (personalization[languageField.key] ?? null) : null;
    for (const field of product.customizationFields) {
      const value = (personalization[field.key] ?? '').trim();
      if (field.isRequired && value === '') found[field.key] = 'missing';
      else if (textFieldIssue(value, { ...field, language })) found[field.key] = 'invalid';
    }

    if (Object.keys(found).length > 0) {
      refuse(found);
      return;
    }

    setProblems({});
    setStatus({ kind: 'pending' });

    try {
      const result = await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        selections: selectionOptions.flatMap((option) => {
          const value = option.values.find((candidate) => candidate.id === selections[option.id]);
          return value
            ? [
                {
                  optionCode: option.code,
                  optionLabelHe: option.nameHe,
                  value: value.value,
                  valueLabelHe: value.labelHe,
                },
              ]
            : [];
        }),
        personalization,
      });

      if (result.ok) {
        setStatus({ kind: 'added' });
      } else if (result.error === 'needs-choices' && result.problems) {
        refuse(
          Object.fromEntries(result.problems.map((problem) => [problem.field, problem.reason])),
        );
      } else {
        setStatus({ kind: 'refused', message: PURCHASE_MESSAGES[result.error] });
      }
    } catch {
      setStatus({ kind: 'refused', message: PURCHASE_MESSAGES.failed });
    }
  }

  function refuse(found: ProblemMap) {
    setProblems(found);
    setStatus({ kind: 'refused', message: PURCHASE_MESSAGES['needs-choices'] });

    // In page order: the selections are drawn above the personalisation.
    const order = [
      ...selectionOptions.map((option) => option.code),
      ...product.customizationFields.map((field) => field.key),
    ];
    const first = order.find((key) => key in found);
    const target = first
      ? document.querySelector<HTMLElement>(`[${PROBLEM_TARGET}="${first}"]`)
      : null;

    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'center' });
  }

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
       * `top` clears the sticky header by reading its height
       * (`--header-height`, globals.css). It used to assume the desktop
       * header at every width, which left a 90px gap above the gallery on a
       * tablet, where the header is half that height.
       */}
      <div className="md:sticky md:top-[calc(var(--header-height)+1.5rem)] md:col-span-7 md:self-start">
        {/*
         * No wishlist heart until saving is real (src/lib/placeholders.ts). It
         * returns at the inline end - the LEFT of this RTL page - the side the
         * thumbnail rail is not on.
         */}
        <ProductGallery images={images} productName={product.nameHe} />

        {/* The name as typed, under the photograph it belongs to. On a phone
            the photograph is far above the field, so it sits under the field. */}
        {engravingField && (
          <NamePreview
            name={personalization[engravingField.key] ?? ''}
            language={languageField ? (personalization[languageField.key] ?? null) : null}
            className="mt-8 hidden md:block"
          />
        )}
      </div>

      <div className="md:col-span-5">
        {/*
         * THE PRODUCT NAME IS SET LIKE EVERY OTHER PAGE TITLE - the display
         * face at 700 - one step below the category title it was reached from,
         * because it shares a column with the price and the options rather
         * than owning the width of the page. It was regular weight at 36px:
         * the one heading on the site that did not read as a heading.
         */}
        <h1 className="font-display text-3xl font-normal tracking-tight text-balance xl:text-4xl">
          {product.nameHe}
        </h1>

        {/* The stone's origin, stated with the name rather than only in the
            table far below it (D4D.15). Follows the chosen variant. */}
        {diamond && (
          <p className="text-muted-foreground mt-2 text-sm">
            {diamondOriginLabel(diamond.isLabGrown, diamond.stoneCount)}
          </p>
        )}

        {/*
         * WHAT IS READ HERE IS SET TO BE READ: 16px, in soft ink. The
         * descriptions, the lead time and the personalisation list were 14px
         * in the metadata grey, on the page where a shopper reads most
         * closely. Controls stay at the 14px UI size; the SKU and the
         * certificate stay metadata.
         */}
        {product.shortDescriptionHe && (
          <p className="text-soft-foreground mt-3 text-base">{product.shortDescriptionHe}</p>
        )}

        {/*
         * Price at `text-2xl`, up from `text-lg`. It is the single number the
         * page exists to communicate, and at 18px it was competing on equal
         * terms with the SKU line and the option legends.
         */}
        <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn('text-2xl tracking-tight', compareAt && 'text-accent')}>
            {formatPrice(shownPrice)}
          </span>
          {requiredSurchargeAgorot > 0 && (
            <span className="text-soft-foreground text-sm">כולל החריטה</span>
          )}
          {compareAt && (
            <span className="text-muted-foreground text-sm line-through">
              <span className="sr-only">במקום </span>
              {formatPrice(
                requiredSurchargeAgorot > 0
                  ? add(compareAt, fromAgorot(requiredSurchargeAgorot))
                  : compareAt,
              )}
            </span>
          )}
          {priceLabel && <span className="text-muted-foreground text-sm">{priceLabel}</span>}
        </div>
        {/* The live sale, by name, beside the price it lowered (D4D.33). */}
        {selectedVariant?.promotionNameHe && (
          <p className="text-accent mt-1.5 text-sm font-medium">
            מבצע: {selectedVariant.promotionNameHe}
          </p>
        )}

        {availability && (
          <AvailabilityLine availability={availability} stockLevelsLive={stockLevelsLive} />
        )}

        {/* Axis options: change the variant. */}
        {axisOptions.map((option) =>
          /*
           * ONE VALUE IS A FACT, NOT A CHOICE. Many models come in a single
           * karat or a single gold colour, and each drew a row holding one
           * pressed button - a control with nothing to choose. It is stated
           * in the same words the legend uses instead.
           */
          option.values.length === 1 ? (
            <p key={option.id} className="mt-7 text-base font-medium">
              {option.nameHe}
              <span className="text-muted-foreground me-2 text-sm font-normal">
                {' '}
                {labelFor(option.values, axisSelection[option.id])}
              </span>
            </p>
          ) : (
            <fieldset key={option.id} className="mt-7">
              <legend className="text-base font-medium">
                {option.nameHe}
                <span className="text-muted-foreground me-2 text-sm font-normal">
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
                  const select = () => {
                    changed.current = true;
                    setAxisSelection((current) => ({ ...current, [option.id]: value.id }));
                    touched(option.code);
                  };

                  if (value.hexColor) {
                    return (
                      <button
                        key={value.id}
                        type="button"
                        aria-pressed={active}
                        onClick={select}
                        title={value.labelHe}
                        className={cn(
                          'touch-target inline-flex size-9 items-center justify-center rounded-full transition-shadow',
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
                        'touch-target inline-flex h-10 items-center rounded-full border px-4 text-sm transition-colors',
                        active
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-border hover:border-border-strong hover:bg-muted',
                      )}
                    >
                      {value.labelHe}
                    </button>
                  );
                })}
              </div>

              {/*
               * ONE PHOTOGRAPH, SEVERAL SIZES. A piece offered in more than one
               * diamond size is photographed once; the stone in the picture is
               * one of them, not necessarily the one chosen (D4D.24). Said
               * here, beside the choice, where the question arises.
               */}
              {option.code === 'diamond_carat' && (
                <p className="text-muted-foreground mt-2.5 text-sm">
                  התמונות להמחשת העיצוב. גודל היהלום לפי הבחירה, והמשקל המדויק מופיע במפרט.
                </p>
              )}
            </fieldset>
          ),
        )}

        {/*
         * Non-axis options: recorded on the order line, not a variant switch.
         *
         * The legend names the choice once it is made, exactly as the axis
         * legends do; until then a required selection says it is still open,
         * so an unpressed row reads as a question rather than as a default.
         */}
        {selectionOptions.map((option) => {
          const problem = problems[option.code];
          const errorId = `choice-${option.code}-error`;

          return (
            <fieldset
              key={option.id}
              className="mt-7"
              aria-describedby={problem ? errorId : undefined}
            >
              <legend className="text-base font-medium">
                {option.nameHe}
                <span className="text-muted-foreground me-2 text-sm font-normal">
                  {' '}
                  {selections[option.id]
                    ? labelFor(option.values, selections[option.id])
                    : option.isRequired
                      ? 'יש לבחור'
                      : ''}
                </span>
              </legend>

              <div className="mt-3 flex flex-wrap gap-2">
                {option.values.map((value, index) => {
                  const active = selections[option.id] === value.id;

                  return (
                    <button
                      key={value.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        changed.current = true;
                        setSelections((current) => ({ ...current, [option.id]: value.id }));
                        touched(option.code);
                      }}
                      {...(index === 0 && { [PROBLEM_TARGET]: option.code })}
                      className={cn(
                        'touch-target inline-flex h-10 min-w-12 items-center justify-center rounded-full border px-3 text-sm transition-colors',
                        active
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-border hover:border-border-strong hover:bg-muted',
                      )}
                    >
                      {value.labelHe}
                    </button>
                  );
                })}
              </div>

              {/*
               * A RING SIZE IS A NUMBER WITH A UNIT. "52" alone did not say 52
               * of what, and the US and UK scales use other numbers and
               * letters altogether. These are the European scale - the ring's
               * inner circumference in millimetres - and the answer on how to
               * find one's size is one tap away.
               */}
              {option.code === 'ring_size' && (
                <>
                  <p className="text-muted-foreground mt-2.5 text-sm">
                    מידה אירופית: היקף פנימי במ״מ.
                  </p>
                  <RingSizeGuide sizes={option.values.map((value) => value.labelHe)} />
                </>
              )}

              {problem && (
                <p id={errorId} className="text-destructive mt-2 text-sm">
                  {selectionMessage(option.nameHe, problem)}
                </p>
              )}
            </fieldset>
          );
        })}

        {/*
         * PERSONALISATION, AS INPUTS. The fields are the product's own
         * (spec section 18): the server validates the same rules from the
         * same rows, prices the surcharge, and freezes the answers into the
         * order with their labels.
         */}
        {product.customizationFields.length > 0 && (
          <PersonalizationFields
            fields={product.customizationFields}
            values={personalization}
            problems={problems}
            onChange={(key, value) => {
              setPersonalization((current) => ({ ...current, [key]: value }));
              touched(key);
            }}
          />
        )}

        {engravingField && (
          <NamePreview
            name={personalization[engravingField.key] ?? ''}
            language={languageField ? (personalization[languageField.key] ?? null) : null}
            className="mt-6 md:hidden"
          />
        )}

        {/*
         * THE PURCHASE CONTROL. One primary action, enabled whenever the
         * combination can be ordered. It refuses - in words, at the fields -
         * until every required choice above is made, rather than sitting
         * disabled without saying why.
         */}
        {addToCart && (
          <div ref={purchaseRef}>
            <PurchaseAction
              purchasable={selectedVariant?.availability.isPurchasable ?? false}
              status={status}
              priceWithPersonalisation={
                optionalSurchargeAgorot > 0
                  ? add(shownPrice, fromAgorot(optionalSurchargeAgorot))
                  : null
              }
              onAdd={handleAdd}
            />
          </div>
        )}

        {addToCart && selectedVariant?.availability.isPurchasable && (
          <StickyPurchaseBar
            target={purchaseRef}
            price={
              optionalSurchargeAgorot > 0
                ? add(shownPrice, fromAgorot(optionalSurchargeAgorot))
                : shownPrice
            }
            pending={status.kind === 'pending'}
            added={status.kind === 'added'}
            onAdd={handleAdd}
          />
        )}

        {/* After the purchase, not before it: the other way to have this
            model is a second path, and above the button it pushed "הוספה
            לסל" below the fold at 1440x900 (critique 2026-10-06). */}
        <MadeYourWay
          options={product.options}
          requestHref={requestHref(product, { ...axisSelection, ...selections })}
        />

        {contactAvailable && <ConsultationPrompt />}

        {diamond && <DiamondSpecTable diamond={diamond} />}

        {product.descriptionHe && (
          <div className="border-border mt-10 border-t pt-6">
            <h2 className="text-base font-medium">תיאור</h2>
            <p className="text-soft-foreground mt-2 text-base whitespace-pre-line">
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
      <h2 id="consultation-heading" className="text-base font-medium">
        שאלות על הדגם?
      </h2>

      <p className="text-soft-foreground mt-2 text-base">
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

/**
 * Availability, derived on the server and only rendered here.
 *
 * LEAD TIME IS STATED; STOCK ONLY WHEN IT IS REAL. "מיוצר בהזמנה" rests on the
 * variant's configured policy and preparation days. "במלאי", "אזל מהמלאי" and a
 * unit count rest on stock levels, and while those are seed data
 * (`stockLevelsLive` false) the page says nothing rather than repeat them.
 */
function AvailabilityLine({
  availability,
  stockLevelsLive,
}: {
  availability: NonNullable<ProductDetail['variants'][number]['availability']>;
  stockLevelsLive: boolean;
}) {
  if (availability.state === 'MADE_TO_ORDER') {
    return (
      <p className="text-soft-foreground mt-3 text-base">
        מיוצר בהזמנה
        {availability.prepDays !== null && ` — זמן הכנה משוער ${availability.prepDays} ימי עסקים`}
      </p>
    );
  }

  if (!stockLevelsLive) return null;

  if (availability.state === 'OUT_OF_STOCK') {
    return <p className="text-destructive mt-3 text-base">אזל מהמלאי</p>;
  }

  return (
    <p className={cn('mt-3 text-base', availability.isLowStock ? 'text-warning' : 'text-success')}>
      {availability.isLowStock ? `נותרו ${availability.available} במלאי` : 'במלאי'}
    </p>
  );
}

/** Diamond characteristics. Latin grading terms are bidi-isolated (section 49). */
function DiamondSpecTable({ diamond }: { diamond: NonNullable<ProductDetail['diamond']> }) {
  /*
   * EVERY GRADE AS PRINTED, AND WHAT IT MEANS. "G", "VS1" and "Excellent" are
   * the certificate's own words and stay exactly as written - a shopper
   * comparing with a certificate or another shop needs to see them - but on
   * their own they were a code only the trade can read. Each now carries its
   * place on the standard scale, in Hebrew (src/lib/catalog/diamond-terms.ts).
   * A shape leads with its Hebrew name and keeps the certificate's term beside
   * it. A grade off the scale is shown as it is, unglossed.
   */
  const shapeHe = diamond.shape ? shapeNameHe(diamond.shape) : null;
  const rows: readonly { label: string; value: string; gloss?: string | null }[] = [
    ...(diamond.totalCaratWeight
      ? [{ label: 'משקל כולל', value: `${Number(diamond.totalCaratWeight).toFixed(2)} קראט` }]
      : []),
    ...(diamond.stoneCount !== null
      ? [{ label: 'מספר אבנים', value: String(diamond.stoneCount) }]
      : []),
    ...(diamond.shape
      ? [
          shapeHe
            ? { label: 'צורה', value: shapeHe, gloss: diamond.shape }
            : { label: 'צורה', value: diamond.shape },
        ]
      : []),
    ...(diamond.color
      ? [{ label: 'צבע', value: diamond.color, gloss: colorGloss(diamond.color) }]
      : []),
    ...(diamond.clarity
      ? [{ label: 'ניקיון', value: diamond.clarity, gloss: clarityGloss(diamond.clarity) }]
      : []),
    ...(diamond.cut
      ? [{ label: 'חיתוך וליטוש', value: diamond.cut, gloss: cutGloss(diamond.cut) }]
      : []),
  ];

  return (
    <section aria-labelledby="diamond-heading" className="border-border mt-10 border-t pt-6">
      <h2 id="diamond-heading" className="text-base font-medium">
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
       *
       * STATED, NOT BOXED. It sat in a tinted panel with a thick stripe down one
       * side - the one panel and the one heavy rule on a page drawn in
       * hairlines (DESIGN.md: no panels, no fills). Being first, and in full
       * ink at a weight above the rows beneath it, is what sets it apart.
       */}
      <p className="mt-3 text-base font-medium">
        {diamondOriginLabel(diamond.isLabGrown, diamond.stoneCount)}
      </p>

      <dl className="divide-border mt-4 divide-y text-base">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-muted-foreground shrink-0">{row.label}</dt>
            {/* Grading values are Latin runs inside Hebrew copy. */}
            <dd className="text-end">
              <LatinAware text={row.value} />
              {row.gloss && (
                <span className="text-muted-foreground text-sm">
                  {' · '}
                  <LatinAware text={row.gloss} />
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {/*
       * ONE ISOLATE FOR "ISSUER NUMBER", not one each. Two adjacent isolates on
       * an RTL line are laid out right to left like any other neutral pair, so
       * "GIA 2141438172" rendered as "2141438172 GIA" - a certificate reference
       * nobody could type into the issuer's lookup as shown.
       */}
      {diamond.certificate && (
        <p className="text-muted-foreground mt-3 text-xs">
          תעודה: <Bidi>{`${diamond.certificate.issuer} ${diamond.certificate.number}`}</Bidi>
        </p>
      )}
    </section>
  );
}

/**
 * The options above are what can be bought in a click, not the limit of what
 * can be made.
 *
 * ONE TRUE LINE. PRODUCT.md: the workshop is the owner's, so every model can
 * be made in another karat, gold colour, size or length - "the site may
 * promise alteration freely because that freedom is a fact of how the pieces
 * are made". A ring listed in four sizes and two colours was read as a ring
 * that comes in four sizes and two colours. The line names only the axes this
 * piece has a reason to mention - size for a ring, length for a chain - and
 * points to how a custom order works. It promises no price and no lead time.
 */
function MadeYourWay({
  options,
  requestHref,
}: {
  options: ProductDetail['options'];
  requestHref: string;
}) {
  const codes = new Set(options.map((option) => option.code));
  const axes = [
    'גוון זהב',
    'קראט',
    ...(codes.has('ring_size') ? ['מידה'] : codes.has('length') ? ['אורך'] : []),
  ];
  const list = `${axes.slice(0, -1).join(', ')} או ${axes[axes.length - 1]}`;

  return (
    <p className="text-soft-foreground mt-6 text-sm">
      {`רוצים ${list} אחרים? כל דגם אפשר להזמין גם בהם. `}
      <Link
        href={requestHref}
        className="decoration-border-strong hover:decoration-accent touch-target underline underline-offset-[0.35em]"
      >
        לבקשת התאמה לדגם הזה
      </Link>
    </p>
  );
}

/**
 * The custom request for this model, made the way it is on screen: the
 * request page reads the same parameters the product page writes
 * (src/lib/catalog/choice-params.ts) and shows the model beside the form.
 */
function requestHref(product: ProductDetail, chosen: Record<string, string>): string {
  const params = choicesToParams(product.options, chosen);
  return `/custom/request?${new URLSearchParams([['product', product.slug], ...params])}`;
}

/** A Latin run - a grade, a shape's certificate term - isolated inside Hebrew. */
function LatinAware({ text }: { text: string }) {
  return /^[\x20-\x7E]+$/.test(text) ? <Bidi>{text}</Bidi> : <>{text}</>;
}

/**
 * The axis values to open on: those the address names, when together they
 * make a real variant, otherwise the first variant's - so the page never opens
 * on an impossible combination.
 */
function initialAxisSelection(
  product: ProductDetail,
  requested: Readonly<Record<string, string>> = {},
  fallback?: Record<string, string>,
): Record<string, string> {
  const first = product.variants[0];
  if (!first) return {};

  const selection: Record<string, string> = {};

  for (const option of product.options) {
    if (!option.isAxis) continue;
    const match = option.values.find((value) => first.optionValueIds.includes(value.id));
    if (match) selection[option.id] = match.id;
  }

  const base = fallback ?? selection;
  const wanted = {
    ...base,
    ...pick(
      requested,
      product.options.filter((option) => option.isAxis),
    ),
  };
  return findVariant(product.variants, Object.values(wanted)) ? wanted : base;
}

/** The entries of `choices` that belong to `options`. */
function pick(
  choices: Readonly<Record<string, string>>,
  options: readonly { id: string }[],
): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const option of options) {
    const value = choices[option.id];
    if (value) picked[option.id] = value;
  }
  return picked;
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
