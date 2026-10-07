'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { CheckIcon } from '@/components/ui/icons';
import type { PlaceOrderResult } from '@/lib/orders/place-order';
import { formatPrice } from '@/lib/money';

import {
  EMPTY_VALUES,
  FIELDS,
  addressLine,
  fieldFromPath,
  fieldMessage,
  readSaved,
  stepFields,
  stepOf,
  toPayload,
  validate,
  type CheckoutValues,
  type FieldKey,
  type ProblemMap,
} from './checkout-form';
import { CheckoutSteps, type CheckoutStep } from './CheckoutSteps';
import {
  SummaryLines,
  SummaryTotalsTable,
  type SummaryLine,
  type SummaryTotals,
} from './OrderSummary';

/**
 * The checkout: details, delivery, review - then the order is placed and the
 * shopper is handed to payment.
 *
 * ONE PAGE, THREE STEPS. The steps are views of one form held here, not three
 * routes, so going back never loses a field and the browser's back button
 * leaves the checkout rather than stepping through it. What was typed is kept
 * in sessionStorage for this tab only, so a trip back to the bag does not
 * cost the shopper the address; it is cleared once the order is placed.
 *
 * THE ORDER IS PLACED BY THE SERVER ACTION passed in, which validates
 * everything again, prices the bag from the catalogue and either redirects to
 * /checkout/payment or returns why it could not. Nothing here is a price.
 */

/** Resolves with a reason when refused; on success the server redirects instead. */
type PlaceOrder = (input: unknown) => Promise<Exclude<PlaceOrderResult, { ok: true }> | undefined>;

const STORAGE_KEY = 'jfl-checkout';
/** The step this tab was on, so a reload returns to it (critique 2026-10-06). */
const STEP_KEY = 'jfl-checkout-step';

const FAILURES = {
  changed: 'משהו בסל השתנה מאז שנפתח: פריט הוסר מהקטלוג או אזל. ',
  stock: 'אחד הפריטים אזל בזמן ההזמנה. ',
  failed: 'ההזמנה לא נשמרה. אפשר לנסות שוב.',
} as const;

export function CheckoutFlow({
  lines,
  totals,
  priceNote,
  paymentAvailable,
  placeOrder,
}: {
  lines: readonly SummaryLine[];
  totals: SummaryTotals;
  priceNote: string | null;
  /** Whether a payment provider is configured (src/lib/payments/provider.ts). */
  paymentAvailable: boolean;
  placeOrder: PlaceOrder;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [values, setValues] = useState<CheckoutValues>(EMPTY_VALUES);
  const [problems, setProblems] = useState<ProblemMap>({});
  const [placing, setPlacing] = useState(false);
  const [failure, setFailure] = useState<keyof typeof FAILURES | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  /** A field to focus once its step has rendered, instead of the heading. */
  const focusAfterStep = useRef<string | null>(null);

  // Restore what this tab typed before, once, after hydration - and the step
  // it was on, but only when every step before it still checks out, so a
  // reload never lands past a field that needs correcting.
  useEffect(() => {
    try {
      const saved = readSaved(sessionStorage.getItem(STORAGE_KEY));
      if (!saved) return;
      setValues(saved);

      const savedStep = Number(sessionStorage.getItem(STEP_KEY));
      if (savedStep === 2 || savedStep === 3) {
        const earlier =
          savedStep === 2
            ? stepFields(1, saved)
            : [...stepFields(1, saved), ...stepFields(2, saved)];
        if (Object.keys(validate(saved, earlier)).length === 0) {
          firstRender.current = true;
          setStep(savedStep);
        }
      }
    } catch {
      // Storage refused (private mode, blocked): the form simply starts empty.
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STEP_KEY, String(step));
    } catch {
      // Not saved; a reload starts at the first step.
    }
  }, [step]);

  // A new step is announced by moving focus to its heading - or, when the
  // step was opened to correct something, to the field to correct.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const field = focusAfterStep.current;
    focusAfterStep.current = null;
    (field ? document.getElementById(field) : headingRef.current)?.focus();
  }, [step]);

  function change<K extends keyof CheckoutValues>(key: K, value: CheckoutValues[K]) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Not saved; nothing is lost but the convenience.
      }
      return next;
    });
    setProblems((current) => {
      if (!(key in current)) return current;
      const { [key as FieldKey]: _cleared, ...rest } = current;
      return rest;
    });
    setFailure(null);
  }

  /** Show the problems and put the shopper on the first one. */
  function point(found: ProblemMap) {
    setProblems(found);
    const first = (Object.keys(FIELDS) as FieldKey[]).find((key) => key in found);
    if (!first) return;

    const id = `checkout-${first}`;
    const target = stepOf(first);
    if (target === step) {
      document.getElementById(id)?.focus();
    } else {
      focusAfterStep.current = id;
      setStep(target);
    }
  }

  function next(event: FormEvent) {
    event.preventDefault();
    if (step === 3) return;

    const found = validate(values, stepFields(step, values));
    if (Object.keys(found).length > 0) {
      point(found);
      return;
    }
    setStep(step === 1 ? 2 : 3);
  }

  async function place(event: FormEvent) {
    event.preventDefault();
    if (placing) return;

    const found = validate(values, [...stepFields(1, values), ...stepFields(2, values)]);
    if (Object.keys(found).length > 0) {
      point(found);
      return;
    }

    setPlacing(true);
    setFailure(null);

    try {
      // On success the action redirects to the payment page and this never
      // resumes; the saved form goes with the order it became.
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STEP_KEY);
    } catch {
      // Nothing saved to clear.
    }

    let result: Awaited<ReturnType<PlaceOrder>>;
    try {
      result = await placeOrder(toPayload(values));
    } catch (error) {
      // A redirect is delivered as a navigation, not as a failure; anything
      // else that lands here is a real one.
      if (isRedirect(error)) throw error;
      setPlacing(false);
      setFailure('failed');
      return;
    }

    // Nothing came back: the server redirected and the payment page is on its
    // way. The button stays busy until it arrives.
    if (!result) return;

    setPlacing(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Still in memory; only the convenience is lost.
    }

    if (result.error === 'invalid') {
      const mapped: ProblemMap = {};
      for (const problem of result.problems) {
        const key = fieldFromPath(problem.field, values);
        if (key) mapped[key] = problem.reason;
      }
      point(mapped);
    } else if (result.error === 'empty') {
      router.push('/cart');
    } else {
      setFailure(result.error);
    }
  }

  const goTo = (target: CheckoutStep) => {
    if (target < step) setStep(target as 1 | 2);
  };

  const field = (key: FieldKey, className?: string) => (
    <Field
      key={key}
      name={key}
      value={values[key]}
      problem={problems[key]}
      onChange={(value) => change(key, value)}
      className={className}
    />
  );

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <CheckoutSteps current={step} onSelect={goTo} />

        {/* The order, folded away on a phone so the form comes first. */}
        {step !== 3 && (
          <details className="border-border group mt-8 border-y lg:hidden">
            <summary className="flex h-12 cursor-pointer list-none items-center justify-between gap-4 text-sm [&::-webkit-details-marker]:hidden">
              <span className="font-medium">
                <span className="group-open:hidden">הצגת ההזמנה</span>
                <span className="hidden group-open:inline">הסתרת ההזמנה</span>
              </span>
              <bdi className="font-semibold tabular-nums">{formatPrice(totals.total)}</bdi>
            </summary>
            <div className="pb-5">
              <SummaryLines lines={lines} />
              <SummaryTotalsTable
                totals={totals}
                priceNote={priceNote}
                className="border-border mt-4 border-t pt-3"
              />
            </div>
          </details>
        )}

        {/* What is already answered, each with a way back to change it. */}
        {step > 1 && (
          <dl className="border-border mt-8 border-t text-sm">
            <Answered
              label="פרטים"
              value={[values.customerName, values.email, values.phone].map((part) => part.trim())}
              onEdit={() => setStep(1)}
            />
            {step > 2 && (
              <Answered
                label="משלוח"
                value={[
                  addressLine(values),
                  ...(values.forSomeoneElse
                    ? [
                        `לקבלת המשלוח: ${values.recipientName.trim()}, ${values.recipientPhone.trim()}`,
                      ]
                    : []),
                  ...(values.instructions.trim() ? [values.instructions.trim()] : []),
                ]}
                onEdit={() => setStep(2)}
              />
            )}
          </dl>
        )}

        <form noValidate onSubmit={step === 3 ? place : next} className="mt-8">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display scroll-mt-[calc(var(--header-height)+1.5rem)] text-2xl font-normal tracking-tight outline-none"
          >
            {step === 1 ? 'פרטים ליצירת קשר' : step === 2 ? 'כתובת למשלוח' : 'בדיקה לפני שמירה'}
          </h2>

          {step === 1 && (
            <>
              <p className="text-soft-foreground mt-2 text-sm">
                לאישור ההזמנה ולתיאום המשלוח. אין צורך בהרשמה.{' '}
                <Link
                  href="/legal/privacy"
                  className="decoration-border-strong hover:decoration-accent underline underline-offset-[0.35em]"
                >
                  מדיניות פרטיות
                </Link>
              </p>
              <div className="mt-6 grid grid-cols-12 gap-x-4 gap-y-6">
                {field('customerName', 'col-span-12')}
                {field('email', 'col-span-12 sm:col-span-6')}
                {field('phone', 'col-span-12 sm:col-span-6')}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-soft-foreground mt-2 text-sm">המשלוח חינם.</p>
              <div className="mt-6 grid grid-cols-12 gap-x-4 gap-y-6">
                {field('street', 'col-span-12 sm:col-span-6')}
                {field('houseNumber', 'col-span-6 sm:col-span-3')}
                {field('apartment', 'col-span-6 sm:col-span-3')}
                {field('city', 'col-span-12 sm:col-span-8')}
                {field('postalCode', 'col-span-12 sm:col-span-4')}

                <label className="col-span-12 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={values.forSomeoneElse}
                    onChange={(event) => change('forSomeoneElse', event.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="border-border-field peer-checked:bg-foreground peer-checked:border-foreground text-background peer-focus-visible:outline-ring inline-flex size-5 shrink-0 items-center justify-center border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                  >
                    {values.forSomeoneElse && <CheckIcon className="size-3.5" />}
                  </span>
                  המשלוח מיועד לאדם אחר
                </label>

                {values.forSomeoneElse && (
                  <>
                    {field('recipientName', 'col-span-12 sm:col-span-6')}
                    {field('recipientPhone', 'col-span-12 sm:col-span-6')}
                  </>
                )}

                {field('instructions', 'col-span-12')}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-soft-foreground mt-2 text-sm">
                אלה הפרטים שיישמרו בהזמנה. אפשר לחזור ולשנות כל שלב.
              </p>

              {/* On a phone the side column is folded away; the review shows the order here. */}
              <div className="mt-6 lg:hidden">
                <SummaryLines lines={lines} />
                <SummaryTotalsTable
                  totals={totals}
                  priceNote={priceNote}
                  className="border-border mt-4 border-t pt-3"
                />
              </div>

              {!paymentAvailable && (
                <p className="border-border text-soft-foreground mt-8 border-t pt-4 text-sm">
                  התשלום באתר עדיין לא פעיל. ההזמנה תישמר בלי חיוב, ובעמוד הבא יופיע מספר ההזמנה.
                </p>
              )}
            </>
          )}

          {failure && (
            <p role="alert" className="text-destructive mt-6 text-sm">
              {FAILURES[failure]}
              {failure !== 'failed' && (
                <Link
                  href="/cart"
                  className="decoration-border-strong touch-target font-semibold underline underline-offset-[0.35em]"
                >
                  חזרה לסל
                </Link>
              )}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            aria-busy={placing || undefined}
            className="mt-8 w-full sm:w-auto sm:min-w-64"
          >
            {step === 1
              ? 'להמשך למשלוח'
              : step === 2
                ? 'להמשך לסיכום'
                : placing
                  ? 'שומרים את ההזמנה…'
                  : paymentAvailable
                    ? 'להמשך לתשלום'
                    : 'שמירת ההזמנה'}
          </Button>
        </form>
      </div>

      <aside
        aria-labelledby="checkout-order-heading"
        className="hidden lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:col-span-5 lg:block lg:self-start"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="checkout-order-heading" className="text-base font-medium">
            ההזמנה
          </h2>
          <Link
            href="/cart"
            className="decoration-border-strong hover:decoration-accent touch-target text-sm underline underline-offset-[0.35em]"
          >
            עריכת הסל
          </Link>
        </div>
        <div className="border-border mt-4 border-t pt-4">
          <SummaryLines lines={lines} />
        </div>
        <SummaryTotalsTable
          totals={totals}
          priceNote={priceNote}
          className="border-border mt-4 border-t pt-3"
        />
      </aside>
    </div>
  );
}

function Field({
  name,
  value,
  problem,
  onChange,
  className,
}: {
  name: FieldKey;
  value: string;
  problem: ProblemMap[FieldKey];
  onChange: (value: string) => void;
  className?: string;
}) {
  const spec = FIELDS[name];
  const id = `checkout-${name}`;
  const errorId = `${id}-error`;

  /*
   * UNDERLINES, NOT BOXES (DESIGN.md, Inputs). Numbers and addresses are typed
   * left to right but set flush with the right-hand column, so a phone number
   * lines up with the Hebrew around it. 16px type, so a phone does not zoom
   * into the field on focus.
   */
  const shared = {
    id,
    name,
    value,
    required: spec.required,
    autoComplete: spec.autoComplete ?? 'off',
    'aria-invalid': problem ? true : undefined,
    'aria-describedby': problem ? errorId : undefined,
    dir: spec.ltr ? ('ltr' as const) : undefined,
    className: cn(
      'border-input focus:border-accent mt-1.5 w-full border-b bg-transparent text-base transition-colors',
      spec.ltr && 'text-end',
      problem && 'border-destructive',
    ),
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {spec.label}
        {!spec.required && <span className="text-muted-foreground font-normal"> (לא חובה)</span>}
      </label>

      {spec.multiline ? (
        <textarea
          {...shared}
          rows={2}
          maxLength={spec.max}
          onChange={(event) => onChange(event.target.value)}
          className={cn(shared.className, 'field-sizing-content min-h-11 resize-none py-2.5')}
        />
      ) : (
        <input
          {...shared}
          type={spec.type ?? 'text'}
          inputMode={spec.inputMode}
          onChange={(event) => onChange(event.target.value)}
          className={cn(shared.className, 'h-11')}
        />
      )}

      {problem && (
        <p id={errorId} className="text-destructive mt-1.5 text-sm">
          {fieldMessage(name, problem)}
        </p>
      )}
    </div>
  );
}

/** An answered step, folded to one row. */
function Answered({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: readonly string[];
  onEdit: () => void;
}) {
  return (
    <div className="border-border flex items-start justify-between gap-4 border-b py-4">
      <div className="min-w-0">
        <dt className="font-medium">{label}</dt>
        {value.filter(Boolean).map((line, index) => (
          <dd key={index} className="text-soft-foreground mt-0.5 break-words">
            <bdi>{line}</bdi>
          </dd>
        ))}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="decoration-border-strong hover:decoration-accent touch-target shrink-0 underline underline-offset-[0.35em]"
      >
        שינוי
        <span className="sr-only"> של {label}</span>
      </button>
    </div>
  );
}

/** Next's redirect travels as a thrown error carrying this digest. */
function isRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  );
}
