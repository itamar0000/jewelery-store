---
name: Jewelry for Less
description: A Hebrew RTL fine-jewellery storefront set in paper and ink only — type at scale, photography edge to edge, hairline rules, and one ink masthead. The only colour on the site is the jewellery.
colors:
  paper: '#fafaf8'
  paper-deep: '#f0efec'
  ink: '#111110'
  ink-soft: '#46443f'
  ink-muted: '#6e6b64'
  line: '#dedcd6'
  line-strong: '#8c8881'
  stamp-hover: '#2b2a27'
  danger: '#8c2f22'
  success: '#2a5c46'
  warning: '#7a5c1f'
  placeholder: '#dcd9d2'
  placeholder-ink: '#56534c'
typography:
  display:
    fontFamily: 'Miriam Libre, Assistant, Segoe UI, system-ui, Noto Sans Hebrew, sans-serif'
    fontSize: '5.75rem'
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: '-0.02em'
  headline:
    fontFamily: 'Miriam Libre, Assistant, Segoe UI, system-ui, Noto Sans Hebrew, sans-serif'
    fontSize: '4.5rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '-0.02em'
  title:
    fontFamily: 'Miriam Libre, Assistant, Segoe UI, system-ui, Noto Sans Hebrew, sans-serif'
    fontSize: '1.75rem'
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: '-0.02em'
  body:
    fontFamily: 'Assistant, Segoe UI, system-ui, Noto Sans Hebrew, Arial Hebrew, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: '0em'
  body-small:
    fontFamily: 'Assistant, Segoe UI, system-ui, Noto Sans Hebrew, Arial Hebrew, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: '0em'
  label:
    fontFamily: 'Assistant, Segoe UI, system-ui, Noto Sans Hebrew, Arial Hebrew, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: '-0.01em'
rounded:
  none: '0px'
  xs: '0.125rem'
  sm: '0.25rem'
  full: '9999px'
spacing:
  base: '0.25rem'
  tight: '3rem'
  section: '4.5rem'
  feature: '7rem'
  finale: '9rem'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    rounded: '{rounded.none}'
    padding: '0 1.5rem'
    height: '2.75rem'
    typography: '{typography.body-small}'
  button-primary-hover:
    backgroundColor: '{colors.stamp-hover}'
    textColor: '{colors.paper}'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: 'inherit'
    rounded: '{rounded.none}'
    padding: '0 1.5rem'
    height: '2.75rem'
    typography: '{typography.body-small}'
  button-secondary-hover:
    backgroundColor: '{colors.paper-deep}'
  button-link:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '0'
    typography: '{typography.body-small}'
  badge-neutral:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.xs}'
    padding: '0.125rem 0.5rem'
    typography: '{typography.label}'
  input-search:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.none}'
    padding: '0 0 0.75rem 0'
    typography: '{typography.body}'
  masthead:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    rounded: '{rounded.none}'
    padding: '0 1.5rem'
    height: '4rem'
---

# Design System: Jewelry for Less

## Overview

**Creative North Star: "The Only Colour Is the Jewellery"**

The site is paper and ink, and nothing else. There is no accent hue, no field
colour, no stamp colour, and — deliberately — no gold token anywhere in the
palette. Every warm note on every page comes out of a photograph, which is the
whole point: gold reads as gold because it is the only gold there is. This is a
position, not a restriction, and it is the load-bearing decision of the system.

Because the palette spends nothing, the distinction is carried by four things
that are not colours: type at scale, photography that runs edge to edge,
hairline rules, and the amount of paper left empty. That is what keeps a
near-white page from collapsing back into "cream plus a serif" — the generic
light shop this site wore once already. The paper (#fafaf8) is a hair off
neutral, warm enough that gold photography does not go cold on it, and well
short of ivory stationery. Nothing is boxed, shadowed or framed: photographs sit
directly on the sheet, and the only things that ever separate two pieces of
content are a hairline and empty space.

Two earlier worlds were rejected by the owner and must not be revived. The first
was a saturated trade blue owning the viewport — "does not read as a jewellery
house". The second went pale but kept a blue ink and a red stamp, and landed as
the same generic light shop it was meant to replace; the paper label with its
red button was "hideous". Both are gone from the code. The product's name makes a
price claim ("for less"), and the design answer to a value name is restraint
rather than discount signalling: no burst, no sticker, no shout.

**Key Characteristics:**

- Paper and ink only; every warm tone on the page is photographic
- Type at scale as the primary expressive device (display to 5.75rem)
- Photography full-bleed and flush — never boxed, never scrimmed, never labelled over
- Hairlines carry the entire structure; no panels, no fills
- One inversion: an ink masthead across a very light page
- Emphasis is a darker value, never a hue
- Hebrew-first RTL, with both faces carrying Hebrew and Latin

## Colors

A two-material palette — a barely warm sheet and a near-black ink — with two
hairline greys between them and nothing else.

### Primary

- **Ink** (`{colors.ink}`): Body text, headings, the wordmark, the masthead
  field, the focus ring (everywhere except on the ink masthead, where it is
  paper), the caret, and the primary action's block. Emphasis of every kind is
  this colour or a step toward it.
- **Ink Hover** (`{colors.stamp-hover}`): The only state colour in the system —
  the primary action's hover, one step off ink. Not a hue shift.

### Neutral

- **Paper** (`{colors.paper}`): The page, and also the card surface, the ring
  offset, and the type colour on ink. Barely warm, never cream.
- **Recessed Paper** (`{colors.paper-deep}`): Bands used to pace the scroll
  rather than to group things, the muted hover ground, the scrollbar track.
- **Soft Ink** (`{colors.ink-soft}`, `text-soft-foreground`): Secondary prose
  where full ink would be too heavy across a long measure and muted ink too faint
  to read at length — product descriptions, the lead-time line, FAQ answers.
- **Muted Ink** (`{colors.ink-muted}`): Descriptions, captions, metadata,
  resting nav and footer links, scrollbar thumb on hover.
- **Hairline** (`{colors.line}`): The default rule — under a page title, between
  sections, above a collection name, beneath a category label.
- **Strong Hairline** (`{colors.line-strong}`): Field strokes, input underlines,
  link underline decoration at rest, selection background. The heavier of the
  two rules, used where a line has to read as a control - and so held at 3:1
  against both paper grounds, the contrast a control's outline needs (WCAG
  1.4.11). An empty field is nothing but its underline.

### Tertiary

Status colours only, desaturated toward ink so a system message does not become
the most saturated object on the page: **Danger** (`{colors.danger}`),
**Success** (`{colors.success}`), **Warning** (`{colors.warning}`). All three
take paper as their foreground.

`{colors.placeholder}` / `{colors.placeholder-ink}` are a temporary development
surface for routes that still lack photography. They are not part of the
palette and are scheduled for deletion with the placeholder component.

### Named Rules

**The Only Colour Is the Jewellery Rule.** No hue enters the interface. If a new
surface seems to need a colour, it needs a photograph, a larger size, or more
empty paper instead. A gold, brass or champagne token is specifically excluded:
gold appears only as photographed metal.

**The Darker, Not Different Rule.** Every emphasis state — hover, active nav
item, link, primary action — is a change in value, never in hue. `accent`
resolves to ink by design.

**The State Your Value Rule.** Because `accent` resolves to ink, anything drawn
on the ink masthead must name its light value explicitly (paper-coloured type at
full or 65% strength). Inheriting or reaching for `accent` there ships ink on
ink, which has already happened once. The focus ring is drawn on the masthead
too, so on the bar it is paper (`--focus-ring` set on the header); everywhere
else it stays ink.

The rule runs both ways. A paper surface rendered inside the masthead (the mega
menu, the mobile drawer, the search overlay) inherits the bar's paper type, so
it must name its own ink foreground and set the focus ring back to ink, or it
ships paper on paper. That has also happened once, and
`src/components/navigation/surface-contrast.test.tsx` now measures it.

## Typography

**Display Font:** Miriam Libre (400/700 only, with Assistant then the system
Hebrew stack behind it)
**Body Font:** Assistant (variable, with Segoe UI / system-ui / Noto Sans Hebrew
behind it)

**Character:** Miriam Libre is squarish and flat-terminalled — letters that look
cut rather than written — and at size it reads as printed matter rather than as
boutique display type. Assistant carries every line that is read rather than
struck: prose, product names, navigation, and all measurements, at an unusually
even colour. Neither face is a serif, and that is deliberate: a high-contrast
serif over a warm light ground is the single most common shape a generated
storefront takes, and this site shipped it once.

### Hierarchy

- **Display** (700, 3rem → 4.5rem → 5.75rem, line-height 0.95, tracking -0.02em):
  The home page's one line, beneath the hero photograph. A top step of 7.5rem
  (line-height 0.92) exists in the scale for a statement larger than anything
  currently shipped.
- **Headline** (700, 2.25rem → 3.75rem → 4.5rem, line-height 1–1.05): The single
  `<h1>` on an inner page, set typographically over a rule. The product page
  takes a smaller `<h1>` — the same face and weight at 2.25rem → 3rem — because
  it shares a column with the price and the options; so do the pages that are a
  sentence rather than a place (search, the 404, the cart and the checkout),
  where a 4.5rem title over one line of text outweighed everything under it.
- **Title** (700, 1.75rem → 2.25rem, line-height 1.3): Section headings and
  collection names. Display face.
- **Body** (400, 1rem, line-height 1.7): Prose that is meant to be read, at the
  reading measure (`--measure-reading`, 30em): about 74 characters a line,
  because Assistant's Hebrew runs about 0.41em a character and the 40rem prose
  container holds nearly 100 at this size. The container stays for cards and
  one-line intros, which are not read at length.
- **Body Small** (400, 0.875rem, line-height 1.6): The working size of the UI —
  product names, prices, nav, filters, footer.
- **Label** (500, 0.75rem, tracking -0.01em, sentence case): Badges, section
  labels and the smallest metadata. Never uppercase.

### Named Rules

**The 12px Floor Rule.** Nothing is set below 0.75rem. Hebrew at 11px loses the
strokes that tell ד from ר and ה from ח, and the 11px step that existed ended up
setting sentences and a product's SKU — so it was removed from the scale, and
`src/styles/type-floor.test.ts` keeps it out. Text that is read is also never
set in a translucent ink: the 70% muted grey measured 2.8:1.

**The Display-First Fallback Rule.** The display face must stay ahead of
Assistant in `--font-display` and the order cannot be reversed. Font fallback is
per glyph: Assistant covers Latin as well as Hebrew, so listing it first wins
every character and the display face silently never renders — a failure that
looks exactly like the font failing to load.

**The No Positive Tracking Rule.** Hebrew is never letter-spaced positively; it
breaks glyph joins and legibility. The tracking scale runs tight-to-normal only
(-0.02em, -0.01em, 0). There is no uppercase, wide-tracked type anywhere in the
system.

**The Two Weights Rule.** Miriam Libre ships 400 and 700 and nothing between.
Hierarchy comes from size and from the difference between the struck display
face and the written body face — not from weight steps. A layout that needs a
third weight has an undecided hierarchy.

**The Isolated Wordmark Rule.** "Jewelry for Less" is Latin on a Hebrew page and
is wrapped in `<bdi>` in both the masthead and the footer, so the bidi algorithm
cannot reorder it. Any Latin name, price or copyright line mixed into an RTL
line gets the same treatment.

## Layout

Mobile is the base state and every breakpoint is min-width: 40rem / 48rem /
64rem / 80rem / 96rem. Content sits in one of four containers — 40rem prose,
48rem narrow (forms), 72rem content (default), 90rem wide (full-bleed galleries
and the hero's type) — with gutters of 1.5rem rising to 2rem and 3rem. Direction
and language are attributes on `<html>`, never a CSS `direction` declaration, and
every inset is logical (`ms-`/`me-`/`ps-`/`pe-`) so the layout mirrors correctly.

Spacing derives from a single 0.25rem base, and vertical rhythm is a named tier
scale rather than one value repeated: tight (3rem) for a rail sitting under the
band above it, section (4.5rem) for the default band, feature (7rem) for a
section that should stop the scroll, finale (9rem) for the closing statement.
The tiers exist because an earlier pass gave every band identical padding, and
nine sections of equal weight read as a list of blocks rather than a
composition.

The product grid is two columns on phones, three at 48rem, four at 64rem, with
generous vertical gutters (3rem, rising to 4rem) and tighter horizontal ones —
the asymmetry lets a column of photographs breathe without the row breaking into
separate objects. The homepage rail of four is the one variation: two across until
64rem, then four - never a row of three and an orphan, and from 64rem one row,
as every category grid already is. The
collections band is one row of landscape stills - two across, or three when
three collections are shown - each with its name on a rule beneath it.

**The Start Edge Rule.** Every heading begins at the inline start: page titles,
the hero line, the home page's section headings, the steps on /custom, and the
notes beneath a grid. The home page's section headings were centred while the
bands around them began at the start, so the page changed alignment from band
to band. Centring is kept for one thing - a line set as an object, like the
engraved-name preview - never for a heading over copy that starts at the edge.

**The First Viewport Rule.** The home page opens on one photograph, full bleed,
with nothing laid over it, and the display line begins where the image ends.
Every height is measured from the real sticky header (`--header-height`), never
from a figure of its own. From 64rem the first screen holds the photograph, the
line and its action together: the photograph takes whatever height the line
leaves, so the page says what it is before anyone scrolls, at any height down to
about 620px. Under 50rem of height (the `short:` variant) the rhythm tightens and
the display steps down one size. Below 64rem the photograph fills the screen but
for 7rem, and the top of the line breaks the fold beneath it. The photograph
switches crops by orientation, not width: every portrait screen gets the
portrait master.

**The 44px Rule.** Every control takes at least a 44px tap area. Where the
drawn control is smaller — an underlined line of type, a 36px swatch, a 40px
size button — the `touch-target` utility grows an invisible box around it, so
nothing drawn changes size. Tightly stacked lists (the footer, filter values)
cannot grow outward without overlapping, so under a touch pointer
(`pointer-coarse:`) their rows become 44px, and under a mouse they keep their
compact rhythm. Text fields are 16px under a touch pointer, so iOS does not zoom
into them on focus.

## Elevation & Depth

This system is flat. There are no panels and no card surface — `card` resolves to
the page itself so any component still asking for one renders flush — and
photographs sit directly on the paper. Depth is conveyed by tonal bands
(recessed paper), hairlines, and emptiness.

The shadow scale exists and is re-weighted for a pale ground, where the values
tuned for a dark field read as smudges. It is almost entirely unused: a shadow
means "this genuinely floats above the page" and is reserved for the scrolled
masthead, the filter drawer and dialogs.

### Shadow Vocabulary

- **Hairline lift** (`0 1px 2px 0 rgb(6 20 34 / 0.05)` / `0 1px 3px 0 rgb(6 20 34 / 0.06), 0 1px 2px -1px rgb(6 20 34 / 0.05)`): The faintest separation; effectively unused.
- **Sticky edge** (`0 4px 12px -2px rgb(6 20 34 / 0.08), 0 2px 4px -2px rgb(6 20 34 / 0.05)`): The masthead once the page has scrolled past 8px.
- **Floating panel** (`0 12px 28px -6px rgb(6 20 34 / 0.1), 0 4px 8px -4px rgb(6 20 34 / 0.06)` / `0 24px 48px -12px rgb(6 20 34 / 0.13)`): Drawers and dialogs, which genuinely sit above the sheet.

### Named Rules

**The Shadow Means Floating Rule.** A shadow is never an interactive affordance
and never a hierarchy device. A shadow under a product image is how a gallery
turns into a template.

## Shapes

Square by default. The action language is struck, printed and ruled, and none of
those processes produce a soft corner: buttons, images, bands and the masthead
all have zero radius. The radius scale is available for the few surfaces that
earn one — 0.125rem on a badge, 0.25rem on a drawer control, an empty-state
frame or an editorial image, and a full round only on the decorative swatch dots
and list markers, where the shape is the meaning.

Structure is drawn with 1px rules, not with fills or boxes: a rule closes a page
header, opens a filter row, carries a collection or category name, and divides a
footer. Inputs are underlines rather than boxes — a single strong hairline that
darkens to ink on focus-within. Empty states are the one dashed rule in the
system, which is what marks them as provisional rather than designed.

## Components

### Buttons

- **Shape:** Square (0 radius), fixed heights of 2.25rem / 2.75rem / 3.25rem.
- **Primary:** A block of ink with paper-coloured type and a paper hairline set
  inset inside it (25% strength). One per view; a view with two has not decided
  what it wants the visitor to do.
- **Hover / Focus:** Primary darkens one step (240ms on the house curve). All
  variants keep the global 2px focus ring at 2px offset: ink on paper, paper on
  the ink masthead.
- **Secondary (default):** A ruled field — a single strong hairline, transparent
  ground, and **inherited** foreground. The inheritance is load-bearing: a named
  foreground goes invisible on an inverted surface, and the class joiner has no
  conflict resolution, so a call-site override cannot fix it.
- **Ghost:** No stroke, recessed-paper ground on hover, inherited foreground.
- **Link:** Ink type underlined at 0.35em offset, the rule starting as a strong
  hairline and going to ink on hover.

**The Underlined Action Rule.** The highest-value actions on the editorial
surfaces — the hero's call to the catalogue, a collection's "view", every
editorial panel's action — are an underlined line of type, not a filled block or
a ruled box. A filled block next to a
photograph pulls the eye off the thing it is meant to serve. It still has to
read as the next thing to do: the hero's is semibold at 1.125rem → 1.375rem →
1.75rem with a 2px rule, so a 5.75rem line above it does not turn it into a
caption.

### Chips

- **Style:** A hairline-bordered chip at 0.75rem, 0.125rem radius, sentence
  case. Neutral takes paper on paper with a strong hairline; muted takes recessed
  paper with no border; over a photograph it takes paper at 85% with a small
  backdrop blur.
- **State:** A product card carries at most one badge, in the over-image tone.
  Only "new" qualifies today: best-seller and made-to-order were removed as
  redundant (docs/DECISIONS.md D4D.4). Never stack badges, and never split them
  by colour — on a photograph two badges, or two badge colours, read as
  stickers rather than as information.

### Cards / Containers

- **Corner Style:** Square. Product cards are not cards — no background, no
  border, no shadow.
- **Background:** The page. `card` resolves to paper on purpose.
- **Shadow Strategy:** None. See Elevation & Depth.
- **Border:** None. A product photograph is followed by name, price and swatches
  on the open sheet, separated by space alone.
- **Internal Padding:** None around the photograph; 1rem above the name block.

### Inputs / Fields

- **Style:** Transparent ground, no radius, a single strong hairline as an
  underline with the icon inline beside the text.
- **Focus:** The underline darkens to ink on `focus-within`, plus the global
  focus ring on the field itself (ink, as fields sit on paper).
- **Choices:** Filter options are hairline circles and small squares at
  0.25rem, labelled in body-small; the row itself sits between two rules.
  A form's checkbox is a square 1.25rem on a strong hairline, filled with ink
  and a drawn check when ticked.
- **Errors:** One line under the field in the danger colour, naming the
  problem and the way out ("מיקוד הוא 5 עד 7 ספרות."), tied to the field with
  `aria-describedby`; the underline takes the same colour. On submit the first
  field to correct takes focus.
- **Labels:** Above the field, always - never a placeholder standing in for
  one. An optional field says "(לא חובה)"; required is the default and is not
  marked.

### Navigation

- **Masthead:** The one inversion in the system — an ink bar across a very light
  page, sticky, square, with a shadow only once scrolled. The owner asked for a
  different colour on the navbar and got a different _value_, for the palette
  reason above. The wordmark sits in a hairline-boxed link at 50% paper, going
  to full paper on hover; icons and links are paper at 65%, going to full paper.
  The focus ring on the bar is paper. The paper panels the masthead owns (mega
  menu, mobile drawer, search overlay) state their own ink foreground and an ink
  focus ring; see the State Your Value Rule.
  The bag carries its count as a numeral in full paper beside the icon - not a
  disc on its corner - and nothing at all when the bag is empty.
- **Desktop nav:** A centred row of body-small links on the ink bar, separated
  from the masthead row by a hairline, always visible from 64rem up. The
  masthead row is 4rem and the navigation row 2.75rem - 109px in all, down from
  129px, about 12% of a 900px screen rather than 14%. The section
  the visitor is in - its page or any page under it - takes full paper and the
  same hairline an open menu draws, with `aria-current`; the drawer marks it
  underlined and semibold. A drawer row that opens a list in place carries a
  downward chevron, never a sideways one: sideways says "another screen", and in
  RTL it pointed back.
- **Mobile:** A hamburger opens a drawer; the drawer and the search overlay are
  the two surfaces allowed to float.
- **Footer:** Recessed paper at 40%, opened by a hairline, a column per group of
  body-small links at muted ink going to full ink: Shop and Services today, with
  About, Legal and Contact joining as their pages exist (five in all), packed
  from the inline start.

### Checkout

- **Steps:** Four ruled cells - details, delivery, review, payment. Each rule
  is a hairline until the step is reached and a 2px ink rule from then on, so
  the row reads as a docket being filled in rather than as a progress bar.
  Finished steps are underlined buttons back to themselves.
- **Ledger:** What is being bought is drawn like an invoice: lines separated by
  hairlines, the figure at the inline end of each, the total under a 1px ink
  rule at 1.25rem semibold. No cards, no row fills. Free shipping is the word
  "חינם", never "₪0".
- **Within reach on a phone:** while the product page's own "הוספה לסל" is
  still below the screen, a paper bar with the price and the same action sits at
  the bottom, ruled by a hairline; it leaves when the button comes into view and
  does not return once it is passed. Never on a desktop, where it would sit over
  the gallery.
- **Undo, not a dialog:** removing a line from the bag says what went and offers
  "ביטול", above the lines, surviving even the bag becoming empty.
- **Outcome line:** Under the one primary action, a polite live region present
  from the first render, so what happened ("נוסף לסל.") is announced where it
  is read.
- **The payment boundary** carries none of the signs of a finished purchase -
  no check mark, no thanks - while no payment exists. A success state is
  earned by a paid order and nothing else. That payment is not live is said in
  the bag, under the way on to the checkout, before any details are asked.

### Custom request

- **One form, two starts.** From a product page the model sits beside the form
  - photograph, name, the choices that were on screen - and the form asks only
    what to change; from /custom it asks what kind of piece. The visitor writes
    the request in their own words; the change chips are pills over native
    checkboxes, a shortcut, never a substitute for the words.
- **One way back is enough:** a phone or an email, said above the two fields.
- **The receipt** replaces the form: "הבקשה נשמרה", the number, what was saved
  in the visitor's words, and what happens next. Unlike the payment boundary
  it is a finished act - a request saved is the whole of what was asked - but
  it promises no reply time, because none has been decided.

### Engraving

- **The name, set back at size:** the typed name in the display face, ink on
  paper, centred as an object under the photograph (under the field on a
  phone), its direction following the chosen language. The caption says it is
  the lettering, not a rendering of the pendant.
- **A required surcharge is part of the price:** "₪1,380 כולל החריטה" at the
  top and "₪90 כלולים במחיר" at the field - never "תוספת" for something that
  cannot be skipped. Length is counted in the characters a person sees.

### Editorial Bands (signature)

Four recurring bands carry the home page and they share one rule: the
photograph is never captioned over.

- **Hero:** One full-bleed photograph, then the display line on paper, then an
  underlined action. Nothing is laid over the picture — no scrim, no floating
  panel, no button. Type on paper has a contrast ratio that does not depend on
  what the photographer put behind it.
- **Category discovery:** A five-tile grid (the lead tile spanning two columns
  and two rows) of photographs, each with its name on a hairline rule _beneath_
  the image. No scrim and no label over the picture.
- **Collections:** One row of landscape stills (two, or three), mapped to
  collections by slug rather than by position, each with its name and
  description on a rule beneath and an underlined "view" at the far end.
- **Editorial panel:** A half-and-half image-and-text band, the image at 4:5, the
  copy stepping up to body size because it is the one place on the home page
  meant to be read rather than scanned. Optional recessed-paper ground. Its
  action is an underlined line, a size larger on the finale. The same 4:5
  photograph-beside-steps carries /custom, with the workshop at the bench.
- **Page header:** Typographic by default — title at size on paper, over a rule
  — with an optional photograph band (21:9, capped at 26rem) only for pages that
  genuinely have one. It previously rendered an unconditional grey rectangle on
  contact, custom, FAQ, search, not-found and every collection page; a grey
  rectangle is not a neutral wait.

**The No Scrim Rule.** A photograph is never darkened, tinted or overlaid to make
type legible on it. The type goes on the paper beneath.

### Motion

Two easing curves and four durations, with the house curve installed as
Tailwind's default so every existing transition inherits it. `settle`
(`cubic-bezier(0.4, 0.9, 0.3, 1)`) is asymmetric on purpose — it leaves fast and
arrives slowly — and that asymmetry is the difference between motion that reads
as expensive and motion that reads as an app responding. `exit` mirrors it for
departures. Durations are 240ms for UI feedback, 500ms for something the eye
follows, 700ms for entrances, 1400ms for ambient drift (the slow push on a
product image under the cursor). Three named animations exist: copy rising a few
pixels on first paint, a gallery frame fading up from a 1.2% over-scale, and the
hero photograph releasing from a 4% over-scale over two seconds — the one purely
atmospheric movement on the site, and the only place worth spending it. All
animations collapse to 0.01ms under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:

- **Do** let every warm tone on a page come out of a photograph. Paper (#fafaf8)
  and ink (#111110) are the only materials the interface itself owns.
- **Do** express emphasis as a darker value — `accent` resolves to ink and is
  meant to.
- **Do** state the light value explicitly (paper, or paper at 65%) on anything
  drawn on the ink masthead, the focus ring included.
- **Do** state the ink foreground, and reset the focus ring to ink, on any paper
  surface rendered inside the masthead.
- **Do** run photography edge to edge and flush on the paper, with its label on a
  hairline rule beneath it.
- **Do** reach for size and empty paper when a surface needs more presence. The
  scale goes to 7.5rem for exactly this reason.
- **Do** keep the display face ahead of Assistant in `--font-display`.
- **Do** wrap Latin names, prices and mixed-script lines in `<bdi>`.
- **Do** pick a named rhythm tier (tight / section / feature / finale) by the
  band's role, so the page reads as a composition rather than a list.
- **Do** use logical properties for every inset, margin and border side.

### Don't:

- **Don't** introduce an accent hue, a field colour, or a gold/champagne token.
  There is no gold in the palette on purpose.
- **Don't** box, frame, tint or shadow a photograph, and don't lay type or a
  scrim over one.
- **Don't** add a shadow to convey interactivity or hierarchy; a shadow means the
  element genuinely floats (drawer, dialog, scrolled masthead).
- **Don't** letter-space Hebrew positively, and don't set uppercase wide-tracked
  type — neither the language nor the scale supports it.
- **Don't** put a filled button beside a hero or collection photograph where an
  underlined line of type does the job.
- **Don't** reintroduce a high-contrast display serif over the light ground; that
  pairing is the shape this redesign exists to escape.
- **Don't** ship a grey placeholder rectangle as a page header or band. A
  typographic header is a finished state; a stand-in is not.
- **Don't** name a raw `--ref-*` value or a literal hex in a component. Components
  consume the semantic layer only, so the palette stays a single-file change.
- **Don't** give an action a rounded corner. Radius is for the few surfaces that
  earn one (badge, drawer control, editorial image), never for a button.
