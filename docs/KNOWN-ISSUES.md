# Known issues

Defects that are confirmed and deliberately not fixed in the pass that found
them. Each entry says what is wrong, how to see it, why it was left, and what
the fix is. Delete an entry when its fix lands.

## A11Y-1 — `Container` drops `aria-labelledby`, so four homepage sections have no accessible name

**Found:** 2026-10-04, in the Phase 1 audit. Recorded 2026-10-05 during Phase
1.3 (distill), which was told not to fix it.

**What is wrong.** `Container` (`src/components/ui/Container.tsx`) renders only
`className` and `children` onto its element. Every other attribute is silently
discarded. TypeScript does not catch it, because JSX does not type-check
attribute names that contain a hyphen, so `aria-labelledby="…"` compiles against
props that do not declare it.

Four sections render through `<Container as="section" aria-labelledby="…">`
and lose the label:

| Component                                          | Intended label                                         |
| -------------------------------------------------- | ------------------------------------------------------ |
| `src/components/storefront/CategoryDiscovery.tsx`  | `discovery-heading`                                    |
| `src/components/storefront/FeaturedProducts.tsx`   | its `id` prop (`best-sellers-heading` on the homepage) |
| `src/components/storefront/CollectionsSection.tsx` | `collections-heading`                                  |
| `src/components/storefront/FaqSection.tsx`         | `faq-heading`                                          |

**Effect.** A `<section>` without an accessible name is not exposed as a region
landmark, so screen-reader users cannot jump to these four sections from the
landmarks list. Headings inside them still work, and so does the hero's
`#discovery-heading` link: the `id` sits on the `h2`, not on the `Container`.

**How to see it.** In the rendered homepage HTML,
`aria-labelledby="discovery-heading"` (and the other three) appear zero times,
while the matching `id="…"` appears once. The diamonds panel, which does not use
`Container` as its section, keeps its label.

**Fix.** Let `Container` forward the remaining attributes to its element
(`...rest` typed as `ComponentPropsWithoutRef<'div'>`, or the polymorphic
equivalent), then add a test that renders `<Container as="section"
aria-labelledby="x">` and asserts the attribute reaches the markup. No call site
needs to change.

**Why not fixed yet.** Out of scope for the distill pass by the owner's
instruction; it is a separate accessibility task.
