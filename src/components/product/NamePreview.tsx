import { useId } from 'react';

import { cn } from '@/components/ui/cn';

/**
 * The name, as it is typed, set at size - "כך ייכתב השם".
 *
 * A personalised necklace used to be ordered blind: the name went into a
 * 12-character field and nothing showed it back (critique 2026-10-06, P2). A
 * gift buyer's real question is "did I spell it right, and will it read the
 * right way round", and a name at 14px in an input answers neither. Here it is
 * set in the display face, right to left for Hebrew and left to right for
 * English, the moment it is typed.
 *
 * WHAT IT DOES NOT CLAIM. This is the lettering of the name, not a rendering
 * of the pendant: the shape of the letters in gold is the one in the
 * photograph, and the caption says so rather than letting a font stand in for
 * the workshop's hand. Ink on paper, not a gold tint - the only colour on the
 * site is the jewellery itself (DESIGN.md), and a pale gold on paper would be
 * the one illegible line on the page.
 */
export function NamePreview({
  name,
  language,
  className,
}: {
  name: string;
  /** "he" or "en" when chosen; the direction follows it, or the text itself. */
  language: string | null;
  className?: string;
}) {
  const captionId = useId();
  const text = name.trim();
  const dir = language === 'en' ? 'ltr' : language === 'he' ? 'rtl' : 'auto';

  return (
    <figure aria-labelledby={captionId} className={cn('border-border border-t pt-5', className)}>
      <p
        dir={dir}
        // Announced as it changes, politely: a screen-reader user hears the
        // name they typed read back as one word.
        aria-live="polite"
        className={cn(
          'font-display min-h-[1.2em] text-center text-4xl leading-tight font-bold tracking-tight break-words md:text-5xl',
          text ? 'text-foreground' : 'text-muted-foreground/60',
        )}
      >
        {text || (language === 'en' ? 'Your name' : 'השם כאן')}
      </p>
      <figcaption
        id={captionId}
        className="text-muted-foreground mt-3 text-center text-xs text-pretty"
      >
        כך ייכתב השם. צורת האותיות בזהב כמו בתכשיט שבתמונה.
      </figcaption>
    </figure>
  );
}
