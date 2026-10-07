'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import {
  CHANGE_AREAS,
  DESCRIPTION_MAX,
  EMAIL_MAX,
  EMPTY_REQUEST,
  FIELD_ORDER,
  JEWELRY_TYPES,
  NAME_MAX,
  PHONE_MAX,
  changeAreaLabel,
  requestMessage,
  toRequestPayload,
  validateRequest,
  type ChangeArea,
  type RequestField,
  type RequestProblems,
  type RequestValues,
} from '@/lib/custom-requests/form';
import type { SubmitRequestResult } from '@/lib/custom-requests/submit';

/**
 * The custom request: what to make, and how to get back to the visitor.
 *
 * TWO STARTING POINTS, ONE FORM. From a product page the model is already
 * known - it is drawn beside the form with the choices that were on screen -
 * so the form asks only what to change. From /custom it asks what kind of
 * piece. Either way the visitor writes the request in their own words; the
 * chips are a quick way to say what it touches, never a substitute for it.
 *
 * ON SUCCESS THE FORM BECOMES ITS RECEIPT: the request's number and what was
 * saved, in the visitor's own words, with focus moved to the heading so a
 * screen reader hears it. Nothing is promised that the system does not do -
 * no reply time, no email - and the receipt says nothing was charged.
 */

export interface RequestModel {
  readonly slug: string;
  readonly nameHe: string;
  readonly productType: string;
  readonly choices: readonly { readonly labelHe: string; readonly valueHe: string }[];
  readonly params: Readonly<Record<string, string>>;
  readonly href: string;
}

type Submit = (input: unknown) => Promise<SubmitRequestResult>;

/** Why a request was not saved, and what to do about it. */
const FAILURES = {
  failed: 'הבקשה לא נשמרה. אפשר לנסות שוב.',
  limit: 'מהפרטים האלה נשלחו כבר כמה בקשות היום, והן אצלנו. אפשר לשלוח בקשה נוספת מחר.',
  busy: 'התקבלו הרבה בקשות בשעה האחרונה. אפשר לנסות שוב בעוד שעה.',
} as const;

export function RequestForm({ model, submit }: { model: RequestModel | null; submit: Submit }) {
  const [values, setValues] = useState<RequestValues>(EMPTY_REQUEST);
  const [problems, setProblems] = useState<RequestProblems>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<keyof typeof FAILURES | null>(null);
  const [saved, setSaved] = useState<{ number: number; values: RequestValues } | null>(null);
  const receiptRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (saved) receiptRef.current?.focus();
  }, [saved]);

  function change<K extends keyof RequestValues>(key: K, value: RequestValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFailed(null);
    setProblems((current) => {
      // A phone or an email answers the "one of the two" problem on the phone field.
      const cleared: RequestField[] =
        key === 'email' && current.phone === 'contact' ? ['email', 'phone'] : [key as RequestField];
      if (!cleared.some((field) => field in current)) return current;
      const next = { ...current };
      for (const field of cleared) delete next[field];
      return next;
    });
  }

  function toggleArea(area: ChangeArea) {
    change(
      'changeAreas',
      values.changeAreas.includes(area)
        ? values.changeAreas.filter((current) => current !== area)
        : [...values.changeAreas, area],
    );
  }

  function point(found: RequestProblems) {
    setProblems(found);
    const first = FIELD_ORDER.find((field) => field in found);
    if (first) document.getElementById(`request-${first}`)?.focus();
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const found = validateRequest(values, model !== null);
    if (Object.keys(found).length > 0) {
      point(found);
      return;
    }

    setSending(true);
    setFailed(null);

    const trap = new FormData(event.currentTarget).get('website');
    let result: SubmitRequestResult;
    try {
      result = await submit({
        ...toRequestPayload(values, model ? { slug: model.slug, choices: model.params } : null),
        website: typeof trap === 'string' ? trap : '',
      });
    } catch {
      result = { ok: false, error: 'failed' };
    }

    setSending(false);
    if (result.ok) setSaved({ number: result.requestNumber, values });
    else if (result.error === 'invalid') point(result.problems);
    else setFailed(result.error);
  }

  if (saved) {
    return <Receipt ref={receiptRef} model={model} number={saved.number} values={saved.values} />;
  }

  const productType = model?.productType ?? null;

  return (
    <form noValidate onSubmit={send} aria-labelledby="request-heading">
      <h2 id="request-heading" className="font-display text-2xl font-normal tracking-tight">
        {model ? 'מה לשנות בדגם' : 'מה להכין'}
      </h2>

      {model ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium">
            מה הבקשה משנה
            <span className="text-muted-foreground font-normal"> (לא חובה, אפשר לבחור כמה)</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {CHANGE_AREAS.map((area) => (
              <Choice
                key={area}
                type="checkbox"
                name="changeAreas"
                checked={values.changeAreas.includes(area)}
                onChange={() => toggleArea(area)}
              >
                {changeAreaLabel(area, productType)}
              </Choice>
            ))}
          </div>
        </fieldset>
      ) : (
        <fieldset
          className="mt-6"
          aria-describedby={problems.jewelryType ? 'request-jewelryType-error' : undefined}
        >
          <legend className="text-sm font-medium">סוג התכשיט</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {JEWELRY_TYPES.map((option, index) => (
              <Choice
                key={option.value}
                id={index === 0 ? 'request-jewelryType' : undefined}
                type="radio"
                name="jewelryType"
                checked={values.jewelryType === option.value}
                onChange={() => change('jewelryType', option.value)}
                invalid={!!problems.jewelryType}
              >
                {option.label}
              </Choice>
            ))}
          </div>
          <Problem field="jewelryType" problem={problems.jewelryType} />
        </fieldset>
      )}

      <div className="mt-8">
        <label htmlFor="request-description" className="text-sm font-medium">
          {model ? 'מה לשנות, ואיך' : 'ספרו לנו על התכשיט'}
        </label>
        <p id="request-description-hint" className="text-muted-foreground mt-1 text-sm">
          {model
            ? `למשל: אותו דגם ב${productType === 'RING' ? 'זהב אדום 18K, במידה 55' : 'זהב אדום 18K, באורך אחר'}.`
            : 'חומר, אבן, סגנון, למי הוא מיועד. אפשר להדביק כאן קישור לתמונה להשראה.'}
        </p>
        <textarea
          id="request-description"
          name="description"
          value={values.description}
          onChange={(event) => change('description', event.target.value)}
          rows={4}
          maxLength={DESCRIPTION_MAX}
          aria-invalid={problems.description ? true : undefined}
          aria-describedby={cn(
            'request-description-hint',
            problems.description && 'request-description-error',
          )}
          className={cn(
            'border-input focus:border-accent mt-2 field-sizing-content min-h-20 w-full resize-none border-b bg-transparent py-2.5 text-base transition-colors',
            problems.description && 'border-destructive',
          )}
        />
        <Problem field="description" problem={problems.description} />
      </div>

      <fieldset className="mt-10">
        <legend className="text-base font-medium">איך לחזור אליך</legend>
        <p className="text-muted-foreground mt-1 text-sm">
          {'טלפון או אימייל: מספיק אחד מהם. הפרטים משמשים רק לטיפול בבקשה. '}
          <Link
            href="/legal/privacy"
            className="decoration-border-strong hover:decoration-accent underline underline-offset-[0.35em]"
          >
            מדיניות פרטיות
          </Link>
        </p>

        <div className="mt-5 grid grid-cols-12 gap-x-4 gap-y-6">
          <TextField
            field="fullName"
            label="שם"
            value={values.fullName}
            problem={problems.fullName}
            onChange={(value) => change('fullName', value)}
            max={NAME_MAX}
            autoComplete="name"
            className="col-span-12"
          />
          <TextField
            field="phone"
            label="טלפון"
            value={values.phone}
            problem={problems.phone}
            onChange={(value) => change('phone', value)}
            max={PHONE_MAX}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            ltr
            className="col-span-12 sm:col-span-6"
          />
          <TextField
            field="email"
            label="אימייל"
            value={values.email}
            problem={problems.email}
            onChange={(value) => change('email', value)}
            max={EMAIL_MAX}
            type="email"
            inputMode="email"
            autoComplete="email"
            ltr
            className="col-span-12 sm:col-span-6"
          />
        </div>
      </fieldset>

      {/*
       * A TRAP FOR SOFTWARE. Out of sight, out of the tab order and hidden from
       * assistive technology, so only a script filling every field fills it;
       * the server then refuses the request without saving it.
       */}
      <div aria-hidden="true" className="absolute -start-[9999px] size-px overflow-hidden">
        <label htmlFor="request-website">אתר</label>
        <input id="request-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="text-soft-foreground border-border mt-10 border-t pt-4 text-sm">
        שליחת הבקשה לא מחייבת ואין בה תשלום. הצעת עיצוב ומחיר מגיעה לאישור לפני שמתחילים לעבוד.
      </p>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        aria-busy={sending || undefined}
        className="mt-6 w-full sm:w-auto sm:min-w-64"
      >
        {sending ? 'שולחים את הבקשה…' : 'שליחת הבקשה'}
      </Button>

      <p role="status" aria-live="polite" className="text-destructive mt-4 min-h-5 text-sm">
        {failed ? FAILURES[failed] : ''}
      </p>
    </form>
  );
}

/** A pill that is a native radio or checkbox underneath, so the keyboard works as expected. */
function Choice({
  id,
  type,
  name,
  checked,
  onChange,
  invalid = false,
  children,
}: {
  id?: string;
  type: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  onChange: () => void;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="touch-target relative cursor-pointer">
      <input
        id={id}
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        aria-invalid={invalid || undefined}
        className="peer sr-only"
      />
      <span
        className={cn(
          'peer-focus-visible:outline-ring inline-flex h-10 items-center rounded-full border px-4 text-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          checked
            ? 'border-accent bg-accent text-accent-foreground'
            : 'border-border hover:border-border-strong hover:bg-muted',
          invalid && !checked && 'border-destructive',
        )}
      >
        {children}
      </span>
    </label>
  );
}

function TextField({
  field,
  label,
  value,
  problem,
  onChange,
  max,
  type = 'text',
  inputMode,
  autoComplete,
  ltr = false,
  className,
}: {
  field: RequestField;
  label: string;
  value: string;
  problem: RequestProblems[RequestField];
  onChange: (value: string) => void;
  max: number;
  type?: 'text' | 'tel' | 'email';
  inputMode?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  ltr?: boolean;
  className?: string;
}) {
  const id = `request-${field}`;

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={field}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        maxLength={max}
        dir={ltr ? 'ltr' : undefined}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'border-input focus:border-accent mt-1.5 h-11 w-full border-b bg-transparent text-base transition-colors',
          ltr && 'text-end',
          problem && 'border-destructive',
        )}
      />
      <Problem field={field} problem={problem} />
    </div>
  );
}

function Problem({
  field,
  problem,
}: {
  field: RequestField;
  problem: RequestProblems[RequestField];
}) {
  if (!problem) return null;
  return (
    <p id={`request-${field}-error`} className="text-destructive mt-1.5 text-sm">
      {requestMessage(field, problem)}
    </p>
  );
}

/** What was saved, in the visitor's words, and what happens next. */
function Receipt({
  ref,
  model,
  number,
  values,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  model: RequestModel | null;
  number: number;
  values: RequestValues;
}) {
  const kind = JEWELRY_TYPES.find((option) => option.value === values.jewelryType)?.label;
  const areas = values.changeAreas.map((area) => changeAreaLabel(area, model?.productType ?? null));
  const contact = [values.phone.trim(), values.email.trim()].filter(Boolean);

  const rows: readonly { label: string; value: string }[] = [
    ...(model ? [{ label: 'הדגם', value: model.nameHe }] : []),
    ...(model && model.choices.length > 0
      ? [{ label: 'כפי שנבחר', value: model.choices.map((choice) => choice.valueHe).join(' · ') }]
      : []),
    ...(!model && kind ? [{ label: 'סוג התכשיט', value: kind }] : []),
    ...(areas.length > 0 ? [{ label: 'הבקשה משנה', value: areas.join(', ') }] : []),
    { label: 'הבקשה', value: values.description.trim() },
    { label: 'חזרה אל', value: [values.fullName.trim(), ...contact].join(' · ') },
  ];

  return (
    <section aria-labelledby="request-saved-heading">
      <h2
        id="request-saved-heading"
        ref={ref}
        tabIndex={-1}
        className="font-display text-2xl font-normal tracking-tight outline-none md:text-3xl"
      >
        הבקשה נשמרה
      </h2>
      <p className="mt-3 text-base">
        מספר הבקשה <bdi className="font-semibold tabular-nums">{number}</bdi>
      </p>

      <dl className="border-border mt-8 border-t text-sm">
        {rows.map((row) => (
          <div key={row.label} className="border-border grid gap-1 border-b py-3 sm:grid-cols-4">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="break-words whitespace-pre-line sm:col-span-3">
              <bdi>{row.value}</bdi>
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-soft-foreground mt-6 text-base">
        נעבור על הבקשה ונחזור אליך עם הצעת עיצוב ומחיר. שום דבר לא מתחיל לפני האישור שלך, ולא בוצע
        שום חיוב.
      </p>

      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
        {model && (
          <Link
            href={model.href}
            className="decoration-border-strong hover:decoration-foreground touch-target text-base font-semibold underline decoration-2 underline-offset-[0.4em]"
          >
            חזרה לדגם
          </Link>
        )}
        <Link
          href="/"
          className="decoration-border-strong hover:decoration-foreground touch-target text-base underline underline-offset-[0.35em]"
        >
          לדף הבית
        </Link>
      </div>
    </section>
  );
}
