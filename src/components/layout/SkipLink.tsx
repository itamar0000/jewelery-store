/**
 * Skip-to-content link.
 *
 * The first focusable element on the page. A keyboard user landing on the
 * storefront otherwise has to Tab through the entire header - eight primary
 * items plus four utility controls - before reaching the page itself, on every
 * navigation.
 *
 * Visually hidden until focused, which is the point: `sr-only` removes it from
 * the layout, `focus:not-sr-only` brings it back the moment it receives focus.
 * It is not `display: none`, which would make it unfocusable and useless.
 *
 * Pairs with `id="main-content"` on the <main> element in the storefront layout.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="focus:bg-card focus:text-foreground focus:border-border-strong sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-sm focus:border focus:px-4 focus:py-2 focus:text-sm focus:shadow-md"
    >
      דילוג לתוכן הראשי
    </a>
  );
}
