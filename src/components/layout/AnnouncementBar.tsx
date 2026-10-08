'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CloseIcon } from '@/components/ui/icons';
import type { ActiveAnnouncement } from '@/lib/announcements/active';

/**
 * The announcement line above the header (D4D.33).
 *
 * A BAR, NOT A POP-UP. A window over the page on a phone hides the shop,
 * is penalised in search and is hard to make accessible; one line of news on
 * the atelier green says the same thing and leaves the page usable.
 *
 * Dismissed per announcement: closing it hides this one in this browser,
 * and the next announcement shows again. Storage can be unavailable; then it
 * simply stays.
 */

const STORAGE_KEY = 'jfl_announcement_dismissed';

export function AnnouncementBar({ announcement }: { announcement: ActiveAnnouncement }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === announcement.id) setHidden(true);
    } catch {
      // Private mode or blocked storage: the bar stays.
    }
  }, [announcement.id]);

  if (hidden) return null;

  return (
    <section
      aria-label="הודעה"
      className="bg-field text-field-foreground relative [--focus-ring:var(--color-field-foreground)]"
    >
      <p className="mx-auto max-w-(--container-wide) px-12 py-2.5 text-center text-sm leading-relaxed">
        {announcement.textHe}
        {announcement.linkHref && (
          <>
            {' '}
            <Link
              href={announcement.linkHref}
              className="touch-target font-medium underline underline-offset-[0.3em]"
            >
              {announcement.linkLabelHe || 'לפרטים'}
            </Link>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(STORAGE_KEY, announcement.id);
          } catch {
            // Hidden for this page view only.
          }
        }}
        className="text-field-foreground/80 hover:text-field-foreground absolute end-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center"
      >
        <CloseIcon className="size-4" />
        <span className="sr-only">סגירת ההודעה</span>
      </button>
    </section>
  );
}
