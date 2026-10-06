---
version: 1
slug: 'src-app-storefront-page-tsx'
primary_target: 'src/app/(storefront)/page.tsx'
related_targets: ['src/styles/tokens.css', 'src/lib/fonts.ts', 'src/components/storefront/Hero.tsx']
---

# Storefront home — surface brief

Scope: the storefront home page and the visual world it establishes for every
other surface. Visitor mode: **Persuade**.

Audience: Hebrew-reading buyers in Israel, in three roughly equal situations
(bridal, gift, self-purchase) — no primary funnel. Job: believe this workshop
can make the piece they want, properly. Action: open the catalogue. Proof on
hand: real product and editorial photography only. Constraints: prices are
placeholders, no testimonial has been collected, no physical shop is confirmed,
no logo exists.

## Direction contract

**THESIS.** The only colour on the site is the jewellery. Paper and ink, and
nothing else — no field colour, no accent hue, no stamp. It refuses the
arrangement this category always ships, a soft-focus model shot under a thin
serif wordmark with a four-up grid; and it equally refuses the two answers this
project already tried and the owner rejected, a saturated blue field and a paper
label carrying a red button.

**OWN-WORLD.** Ground is #fafaf8, barely warm and deliberately not cream, with
#f0efec for recessed bands. Ink is #111110. Two hairlines carry the entire
structure, because nothing is boxed: `--color-card` resolves to the page itself,
so photographs sit flush on paper with no frame, no fill and no shadow. There is
no gold token anywhere — every warm note comes out of a photograph. The one
inversion is the masthead, an ink bar across the top of a very light page.
Miriam Libre 700 for struck display over Assistant for reading, with two display
sizes added for this world (5.75rem and 7.5rem).

**STORY.** The visitor sees the jewellery first, at scale, with nothing laid
over it. They understand within one screen that this is a jeweller rather than a
marketplace, and they open the catalogue. What the workshop can alter for them
is argued further down, where someone already interested is reading.

**FIRST VIEWPORT.** One photograph edge to edge, nothing on top of it, then the
line on paper at the inline start, at a size the old scale could not reach, and
an underlined line of type as the action. No button block, no label, no scrim.
Heights come from the real header (`--header-height`). From 64rem the photograph
takes what the line and action leave, so all three share the first screen (owner
decision, Phase 1.4); below 64rem the photograph fills the screen but for 7rem
and the top of the line breaks the fold. Portrait screens get the portrait
master, landscape screens the wide one.

**FORM.** Editorial gallery: photography at full bleed, type at scale, hairline
rules, and paper left empty. Arrived at after the roll's world (seed **49ffe319**,
the briefke) was built, rejected on a dark ground, rejected again on a pale one,
and replaced on the owner's explicit instruction — light ground, no red, a
proper hero. A brief-pinned direction beats the roll.

Raises carried forward from that work, each still doing its job:

- _From Teletext:_ one strict grid, and one value reserved for exactly one job —
  here it is the ink block, spent only on the primary action.
- _From the moon-shadow bazaar:_ every intangible quality becomes an explicit
  comparable field rather than an adjective.
- _From the park poster:_ the ground owns the viewport at poster scale. It is
  paper now rather than blue, and it still owns it.

Signature: **scale and emptiness.** There is no ornament to carry the identity,
so the composition has to — the size jump between a heading and its body, and
the amount of paper around a photograph, are the brand.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance

## Unresolved

- **Six products have no yellow-gold variant** but the owner has asked for gold
  images of them (pave band, emerald cut, diamond hoops, diamond bangle, bridal
  trio, pear solitaire). The image has nowhere honest to attach until the data
  says the model is sold in yellow. Decision pending.
- **The hero masters were regenerated** with the subject centred (portrait) and
  in the right half (wide), and the focal points now follow them. The registry's
  `master.mobile` still records the old 4:5 size (1280x1600) while the delivered
  file is 1280x2293; re-running the prepare script would crop it back to 4:5.
- **No worn photography exists for necklaces, bracelets or several earrings.**
  The second frame on a product card is the worn shot, and it is missing or wrong
  on eleven products.
- Testimonials are not collected; the slot stays empty. No contact channel is
  live. Prices remain placeholders and the site stays non-indexable.
