import { SearchIcon } from '@/components/ui/icons';

/**
 * The search, as a field on the results page.
 *
 * /search printed what was searched for ("חיפשת: ...") and offered no way to
 * change it but going back up to the header's overlay (critique 2026-10-06).
 * The term now sits in a field, ready to be edited and sent again.
 *
 * A plain GET form - no script needed, and the address it produces is the
 * same `/search?q=` every other way of searching produces. Underlined, with
 * the icon inline beside the text (DESIGN.md, Inputs).
 */
export function SearchField({ term = '' }: { term?: string }) {
  return (
    <form action="/search" method="get" role="search" className="max-w-xl">
      <label htmlFor="search-page-field" className="sr-only">
        חיפוש באתר
      </label>
      <div className="border-input focus-within:border-accent flex items-center gap-3 border-b transition-colors">
        <SearchIcon aria-hidden="true" className="text-muted-foreground size-5 shrink-0" />
        <input
          id="search-page-field"
          type="search"
          name="q"
          defaultValue={term}
          placeholder="שם דגם, סוג תכשיט, צורת יהלום…"
          autoComplete="off"
          enterKeyHint="search"
          className="placeholder:text-muted-foreground h-12 w-full min-w-0 bg-transparent text-base"
        />
        <button
          type="submit"
          className="decoration-border-strong hover:decoration-foreground touch-target shrink-0 text-sm font-semibold underline underline-offset-[0.4em]"
        >
          חיפוש
        </button>
      </div>
    </form>
  );
}
