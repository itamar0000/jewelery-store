/**
 * How to find a ring size, opened in place beside the sizes.
 *
 * IN PLACE, NOT A LINK AWAY. "איך יודעים מידה?" used to lead to the FAQ, and
 * Back reset the page's choices - 18K became 14K and the price changed
 * (critique 2026-10-06, P2). A disclosure keeps the shopper, and everything
 * they chose, where they are. The FAQ keeps its own answer for anyone who
 * arrives there.
 *
 * NO ARITHMETIC LEFT TO THE SHOPPER. The sizes are the European scale - the
 * inner circumference in millimetres - so the inner diameter of each is the
 * size divided by pi. The table works it out for the sizes this ring is made
 * in, so measuring a ring that already fits is a matter of reading a row.
 */
export function RingSizeGuide({ sizes }: { sizes: readonly string[] }) {
  const rows = sizes
    .map((size) => ({ size, mm: Number.parseFloat(size) }))
    .filter((row) => Number.isFinite(row.mm));

  return (
    <details className="group mt-2.5">
      <summary className="decoration-border-strong hover:decoration-accent touch-target text-soft-foreground inline cursor-pointer list-none text-sm underline underline-offset-[0.35em] [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">איך יודעים מידה?</span>
        <span className="hidden group-open:inline">סגירת ההסבר על המידות</span>
      </summary>

      <div className="border-border mt-3 border-t pt-3 text-sm">
        <p className="text-soft-foreground text-pretty">
          הדרך המדויקת היא מדידה אצל צורף. אפשר גם למדוד את הקוטר הפנימי של טבעת שמתאימה לאותה אצבע,
          ולמצוא אותו בטבלה. כדאי למדוד בסוף היום ולא בקור: היקף האצבע משתנה במהלך היום.
        </p>

        {rows.length > 0 && (
          <table className="mt-3 w-full max-w-72 text-start tabular-nums">
            <thead>
              <tr className="text-muted-foreground border-border border-b">
                <th scope="col" className="py-1.5 text-start font-normal">
                  מידה
                </th>
                <th scope="col" className="py-1.5 text-start font-normal">
                  קוטר פנימי
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((row) => (
                <tr key={row.size}>
                  <td className="py-1.5">{row.size}</td>
                  <td className="py-1.5">{(row.mm / Math.PI).toFixed(1)} מ״מ</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}
