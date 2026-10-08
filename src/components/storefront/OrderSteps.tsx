import { Container } from '@/components/ui/Container';

/**
 * How an order travels, in four steps (D4D.26, design A).
 *
 * THE NUMBERS CARRY INFORMATION here - it is a sequence the buyer goes
 * through, made to order - so they are set large in the serif, in green, over
 * one rule that runs under all four. Every line is a fact PRODUCT.md
 * establishes: the catalogue and custom requests, the real axes of
 * alteration, manufacture in ten business days in the owner's workshop (D4D.29),
 * and free shipping (owner, 2026-10-05).
 */
const STEPS = [
  { title: 'בוחרים דגם', body: 'מהקטלוג, או מתחילים מבקשה לעיצוב אישי.' },
  { title: 'מתאימים', body: 'גוון זהב, מידה, חריטה ואבן, לפי מה שהדגם מאפשר.' },
  { title: 'מייצרים בסדנה', body: 'עשרה ימי עסקים בסדנה שלנו, מהרגע שההזמנה משולמת.' },
  { title: 'משלוח עד הבית', body: 'המשלוח חינם, עד הדלת.' },
] as const;

export function OrderSteps() {
  return (
    <section aria-labelledby="steps-heading" className="bg-muted py-section md:py-feature">
      <Container width="wide">
        <h2
          id="steps-heading"
          className="font-display text-4xl leading-[1.1] font-normal text-balance md:text-5xl"
        >
          מהבחירה ועד הדלת
        </h2>

        <ol className="border-border-strong/50 mt-12 grid grid-cols-2 gap-x-6 gap-y-10 border-t pt-10 lg:grid-cols-4 lg:gap-x-10">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span
                aria-hidden="true"
                className="font-display text-accent block text-[2.5rem] leading-none"
              >
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-medium">{step.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-[0.9375rem] leading-[1.7] font-light">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
