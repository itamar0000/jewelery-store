'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { personalizationMessage } from '@/lib/cart/messages';
import type { FieldProblem } from '@/lib/cart/types';
import type { CustomizationFieldView } from '@/lib/catalog/types';
import { graphemeCount } from '@/lib/personalization/engraving';
import { formatPrice, toAgorot, type Money } from '@/lib/money';

/**
 * The buying half of the product page: personalisation as real inputs, the
 * one primary action, and the line that says what happened.
 *
 * Stateless. ProductDetailView owns the values, the problems and the status,
 * because the ring-size row it already draws has to show its own problem too,
 * and one owner is the only way the two can never disagree about what is
 * missing.
 */

export type ProblemMap = Readonly<Record<string, FieldProblem['reason']>>;

export type PurchaseStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'added' }
  | { readonly kind: 'refused'; readonly message: string };

/** The attribute a problem's control carries, so the first one can be focused. */
export const PROBLEM_TARGET = 'data-problem-target';

const CHOICE_BUTTON =
  'touch-target inline-flex h-10 min-w-12 items-center justify-center border px-3 text-sm transition-colors';

export function PersonalizationFields({
  fields,
  values,
  problems,
  onChange,
}: {
  fields: readonly CustomizationFieldView[];
  values: Readonly<Record<string, string>>;
  problems: ProblemMap;
  onChange: (key: string, value: string) => void;
}) {
  const languageField = fields.find((field) => field.fieldType === 'LANGUAGE');
  const language = languageField ? (values[languageField.key] ?? null) : null;

  return (
    <section aria-labelledby="personalisation-heading" className="border-border mt-8 border-t pt-6">
      <h2 id="personalisation-heading" className="text-base font-medium">
        התאמה אישית
      </h2>

      <div className="mt-4 space-y-7">
        {fields.map((field) => (
          <PersonalizationField
            key={field.id}
            field={field}
            value={values[field.key] ?? ''}
            language={language}
            problem={problems[field.key]}
            onChange={(value) => onChange(field.key, value)}
          />
        ))}
      </div>
    </section>
  );
}

function PersonalizationField({
  field,
  value,
  language,
  problem,
  onChange,
}: {
  field: CustomizationFieldView;
  value: string;
  language: string | null;
  problem: FieldProblem['reason'] | undefined;
  onChange: (value: string) => void;
}) {
  const inputId = `field-${field.key}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const surcharge =
    field.priceDelta !== null && toAgorot(field.priceDelta) > 0 ? field.priceDelta : null;

  const error = problem && (
    <p id={errorId} className="text-destructive mt-2 text-sm">
      {personalizationMessage(field, problem, value, language)}
    </p>
  );

  /*
   * A CHOICE IS DRAWN LIKE EVERY OTHER CHOICE ON THE PAGE: the same square
   * buttons as the ring size, the chosen value named in the legend. A select
   * menu for two languages would hide one of them behind a tap.
   */
  if ((field.fieldType === 'LANGUAGE' || field.fieldType === 'SELECT') && field.options) {
    const chosen = field.options.find((option) => option.value === value);

    return (
      <fieldset aria-describedby={problem ? errorId : undefined}>
        <legend className="text-base font-medium">
          {field.labelHe}
          <span className="text-muted-foreground me-2 text-sm font-normal">
            {' '}
            {chosen ? chosen.labelHe : field.isRequired ? 'יש לבחור' : '(לא חובה)'}
          </span>
        </legend>

        <div className="mt-3 flex flex-wrap gap-2">
          {field.options.map((option, index) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(active && !field.isRequired ? '' : option.value)}
                {...(index === 0 && { [PROBLEM_TARGET]: field.key })}
                className={cn(
                  CHOICE_BUTTON,
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:border-border-strong hover:bg-muted',
                )}
              >
                {option.labelHe}
              </button>
            );
          })}
        </div>

        {error}
      </fieldset>
    );
  }

  const multiline = field.fieldType === 'TEXTAREA';
  const describedBy = [
    field.helpTextHe || field.maxLength ? helpId : null,
    problem ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ');

  /*
   * UNDERLINES, NOT BOXES (DESIGN.md, Inputs). `dir="auto"` lets an English
   * engraving run left to right as it is typed, inside a right-to-left page.
   *
   * NO `maxLength` ATTRIBUTE. It counts UTF-16 units, so it stopped a name
   * with niqqud short and could cut a character in two. The count beside the
   * help line is in the characters a person sees, turns to the danger colour
   * past the limit, and the add-to-bag check names the overrun in words.
   */
  const control = {
    id: inputId,
    name: field.key,
    value,
    dir: 'auto' as const,
    autoComplete: 'off',
    spellCheck: false,
    'aria-invalid': problem ? true : undefined,
    'aria-describedby': describedBy || undefined,
    [PROBLEM_TARGET]: field.key,
    className: cn(
      'border-input focus:border-accent mt-2 w-full border-b bg-transparent text-base transition-colors',
      problem && 'border-destructive',
    ),
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="flex flex-wrap items-baseline gap-x-2 text-base font-medium"
      >
        {field.labelHe}
        {!field.isRequired && (
          <span className="text-muted-foreground text-sm font-normal">(לא חובה)</span>
        )}
        {surcharge && <Surcharge amount={surcharge} included={field.isRequired} />}
      </label>

      {multiline ? (
        <textarea
          {...control}
          rows={2}
          onChange={(event) => onChange(event.target.value)}
          className={cn(control.className, 'field-sizing-content min-h-11 resize-none py-2.5')}
        />
      ) : (
        <input
          {...control}
          type="text"
          onChange={(event) => onChange(event.target.value)}
          className={cn(control.className, 'h-11')}
        />
      )}

      {(field.helpTextHe || field.maxLength) && (
        <div id={helpId} className="text-muted-foreground mt-2 flex justify-between gap-4 text-xs">
          <span>{field.helpTextHe}</span>
          {field.maxLength && (
            <span
              className={cn(
                'tabular-nums',
                graphemeCount(value.trim()) > field.maxLength && 'text-destructive',
              )}
            >
              <span className="sr-only">נכתבו </span>
              {graphemeCount(value.trim())}/{field.maxLength}
            </span>
          )}
        </div>
      )}

      {error}
    </div>
  );
}

/**
 * A surcharge the shopper can skip is an addition; one they cannot is part of
 * the price, and the price at the top already includes it ("כולל החריטה").
 */
function Surcharge({ amount, included }: { amount: Money; included: boolean }) {
  return (
    <span className="text-muted-foreground text-sm font-normal">
      {included ? (
        <>
          <bdi>{formatPrice(amount)}</bdi>
          {' כלולים במחיר'}
        </>
      ) : (
        <>
          {'תוספת '}
          <bdi>{formatPrice(amount)}</bdi>
        </>
      )}
    </span>
  );
}

/**
 * The one primary action on the page, or a plain statement when there is
 * nothing to buy.
 *
 * NO DISABLED BUTTON. A combination that cannot be ordered says so in words;
 * a greyed-out "add to bag" would announce a control that does nothing, which
 * is what this page used to have and what PRODUCT.md rules out.
 */
export function PurchaseAction({
  purchasable,
  status,
  priceWithPersonalisation,
  onAdd,
}: {
  purchasable: boolean;
  status: PurchaseStatus;
  /** The unit price including a filled-in surcharge; null when there is none. */
  priceWithPersonalisation: Money | null;
  onAdd: () => void;
}) {
  if (!purchasable) {
    return <p className="text-soft-foreground mt-8 text-base">השילוב הזה אינו זמין להזמנה.</p>;
  }

  const pending = status.kind === 'pending';

  return (
    <div className="mt-8">
      {priceWithPersonalisation && (
        <p className="text-soft-foreground mb-3 text-sm">
          {'עם ההתאמה האישית: '}
          <bdi className="text-foreground">{formatPrice(priceWithPersonalisation)}</bdi>
        </p>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={pending ? undefined : onAdd}
        aria-busy={pending || undefined}
      >
        {pending ? 'מוסיפים לסל…' : 'הוספה לסל'}
      </Button>

      {/*
       * One polite live region for every outcome, present from the first
       * render so a screen reader is already listening when it changes. The
       * reserved line height keeps the page from jumping when it fills.
       */}
      <p role="status" className="mt-3 min-h-5 text-sm">
        {status.kind === 'added' && (
          <>
            {'נוסף לסל. '}
            <Link
              href="/cart"
              className="decoration-border-strong hover:decoration-accent touch-target font-semibold underline underline-offset-[0.35em]"
            >
              לסל הקניות
            </Link>
          </>
        )}
        {status.kind === 'refused' && <span className="text-destructive">{status.message}</span>}
      </p>
    </div>
  );
}
