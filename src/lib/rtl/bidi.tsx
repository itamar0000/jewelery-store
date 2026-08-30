import type { ReactNode } from 'react';

/**
 * An explicitly left-to-right island inside right-to-left Hebrew copy.
 *
 * MASTER_SPECIFICATION section 49 states that English terms appear inside
 * Hebrew product copy - `Round`, `Oval`, `VS1`, `14K`, `18K`, `Rose Gold`. Left
 * alone, the Unicode bidi algorithm resolves neutral characters next to those
 * runs against the surrounding paragraph direction, so trailing punctuation
 * drifts to the wrong end:
 *
 *     ...משקל היהלום הוא 0.5 carat.   renders the full stop before "0.5"
 *
 * The fix is a real isolate, not a `dir` attribute alone. `unicode-bidi:
 * isolate` (which `display: inline` + `dir` does NOT imply on its own in every
 * engine) tells the algorithm to treat the run as a single neutral object, so
 * neither the run nor the surrounding text can reorder each other.
 *
 * Use it for embedded Latin terms, model numbers and certificate identifiers.
 * Do NOT use it for prices - `formatPrice` in `@/lib/money` already emits the
 * correct directional marks.
 */
export function Bidi({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
      {children}
    </span>
  );
}
