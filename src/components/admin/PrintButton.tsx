'use client';

/** Opens the browser's print dialog for the page it sits on. */
export function PrintButton({ label = 'הדפסה' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-stamp text-stamp-foreground hover:bg-stamp-hover inline-flex h-12 items-center rounded-full px-7 text-base font-semibold print:hidden"
    >
      {label}
    </button>
  );
}
