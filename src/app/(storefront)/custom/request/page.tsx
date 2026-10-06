import type { Metadata } from 'next';
import Link from 'next/link';

import { RequestForm } from '@/components/custom/RequestForm';
import { ProductPhoto } from '@/components/product/ProductPhoto';
import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import { CUSTOM_STEPS } from '@/lib/content/custom-process';
import { submitCustomRequestAction } from '@/lib/custom-requests/actions';
import { getBaseModel } from '@/lib/custom-requests/base-model';

export const metadata: Metadata = {
  title: 'בקשת התאמה',
  description: 'בקשה לתכשיט בעיצוב אישי, או לדגם מהקטלוג בגוון, בקראט או במידה אחרים.',
  // A form, not a page anyone searches for; /custom is the page to find.
  robots: { index: false, follow: true },
};

/**
 * The custom request - step one of /custom, made something a visitor can do.
 *
 * `?product=<slug>` and the product page's own choice parameters
 * (src/lib/catalog/choice-params.ts) name the model the request starts from;
 * without them, the request starts from nothing. An unknown slug is not an
 * error: the page simply asks from scratch.
 */
export default async function CustomRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const slug = typeof params.product === 'string' ? params.product : undefined;
  const model = await getBaseModel(slug, params);

  return (
    <>
      <PageHero
        title={model ? 'בקשת התאמה' : 'בקשה לעיצוב אישי'}
        description={
          model
            ? 'כל דגם אפשר להכין בגוון זהב, בקראט, במידה או באורך אחרים, וגם עם אבן אחרת.'
            : 'תכשיט שנבנה מהתחלה: מתארים את הרעיון, ומקבלים הצעת עיצוב ומחיר לאישור.'
        }
        trail={[
          { label: 'דף הבית', href: '/' },
          { label: 'עיצוב אישי', href: '/custom' },
          { label: model ? 'בקשת התאמה' : 'בקשה' },
        ]}
        size="compact"
      />

      <Container className="md:py-section py-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {model && (
            <aside aria-labelledby="request-model-heading" className="lg:order-2 lg:col-span-5">
              <h2 id="request-model-heading" className="text-base font-medium">
                הדגם
              </h2>
              <div className="border-border mt-4 flex gap-5 border-t pt-5">
                {model.image && (
                  <ProductPhoto
                    url={model.image.url}
                    alt={model.image.alt}
                    ratio="portrait"
                    sizes="112px"
                    className="w-24 shrink-0 sm:w-28"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-base font-medium">{model.nameHe}</p>
                  {model.choices.length > 0 && (
                    <dl className="text-soft-foreground mt-2 space-y-1 text-sm">
                      {model.choices.map((choice) => (
                        <div key={choice.labelHe} className="flex gap-2">
                          <dt className="text-muted-foreground">{choice.labelHe}</dt>
                          <dd>{choice.valueHe}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <Link
                    href={model.href}
                    className="decoration-border-strong hover:decoration-accent touch-target mt-3 inline-block text-sm underline underline-offset-[0.35em]"
                  >
                    חזרה לדגם
                  </Link>
                </div>
              </div>
            </aside>
          )}

          <div className="lg:col-span-7">
            <RequestForm model={model} submit={submitCustomRequestAction} />
          </div>

          {!model && (
            <aside aria-labelledby="request-steps-heading" className="lg:col-span-5">
              <h2 id="request-steps-heading" className="text-base font-medium">
                מה קורה אחרי
              </h2>
              <ol className="border-border mt-4 space-y-5 border-t pt-5">
                {CUSTOM_STEPS.map((step, index) => (
                  <li key={step.id}>
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground tabular-nums">{index + 1}. </span>
                      {step.title}
                    </p>
                    <p className="text-soft-foreground mt-1 text-sm">{step.body}</p>
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </div>
      </Container>
    </>
  );
}
