---
target: storefront (whole site)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\dev\\אתר חנות תכשיטים\\src\\app\\(storefront)"
timestamp: 2026-10-05T16-19-36Z
slug: src-app-storefront
---
Method: dual-agent (A: design-review sub-agent · B: detector + browser-evidence sub-agent). Both were interrupted once by a usage limit and resumed with progress intact; the dev server, which stopped during the pause, was restarted before the remaining browser passes ran.

Target: whole storefront (src/app/(storefront)), rendered from the working tree after Phase 1 (harden, clarify, distill, adapt, typeset, polish), at 1440x900, 768x1024 and 375x812.

## Design health score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Filter drawer closes after every pick (keyed remount, [category]/page.tsx:88); masthead never marks the current section; page 2 opens scrolled to the bottom (Pagination scroll={false}) |
| 2 | Match system / real world | 2 | Grades and shapes in unexplained Latin (Emerald, G, VS1, Excellent); ring sizes 48–60 with no unit |
| 3 | User control and freedom | 3 | URL filters, clear-all, Escape everywhere; undercut by the collapsing drawer |
| 4 | Consistency and standards | 2 | Edge-aligned titles over centred bodies; "אוסף האירוסין" vs "אוסף הכלה" lead to different sets; boxed bridal band; card headings skip a level |
| 5 | Error prevention | 2 | No counts on filter values; required "יש לבחור" size for an action that does not exist |
| 6 | Recognition rather than recall | 2 | Size and grading help on /faq with no link from the product page; /search has no refine field |
| 7 | Flexibility and efficiency | 2 | Fast keyboard search; no gift or bridal entry; each extra filter costs a reopen |
| 8 | Aesthetic and minimalist design | 3 | Disciplined and coherent; collections take 3,328px of a 9,352px home page |
| 9 | Error recovery | 3 | Zero-result, search and 404 states offer a way out; none uses the made-to-order fact |
| 10 | Help and documentation | 2 | FAQ sends grading back to a product page that does not explain it; no shipping, returns or warranty |
| Total | | 23/40 | Acceptable (previous run 18/40) |

## Design specificity verdict
LLM: the first screen is authored (one edge-to-edge photograph, a 92px Hebrew line on paper, headline and action on screen) and reads like a printed catalogue. Below it the structure is interchangeable with any DTC jewellery brand: category grid, four-up rail, split panels, wide collection images, a boxed banner, an FAQ list. The differentiators barely shape the page: the workshop is one photo in a split panel; made-to-order is one grey line; customisation is one sentence the filters and size lists contradict; the identity is a Latin name in a hairline box that reads as a placeholder logo. About 6/10.

Detector: CLI over src/app + src/components found 1 finding, a false positive (broken-image on a regex literal in ProductGrid.test.tsx:42). Browser overlay on /, /rings, /product/aurora-ring (desktop + 375x812), /faq, /collections/best-sellers. Real, minor: skipped heading level on product grids (ProductCard.tsx:131 hard-codes h3; /rings and best sellers go h1 -> h3); category tiles' hover zoom off the motion system (CategoryDiscovery.tsx:132, 700ms stock ease-out instead of drift on ease-settle). Intentional per DESIGN.md: image hover drift on product and collection images; clipped hero settle (artefact of a hidden pane freezing the animation). False positives: cramped-padding on the masthead nav row and one subcategory chip (spacing from fixed heights); dark-glow #ffba00 (the detector's own overlay styles). Overlay left visible in the browser pane's [Human] tab on /collections/best-sellers.

## Overall impression
The four Phase 1 passes did their job: the site no longer misleads, no longer breaks at the edges, and reads cleanly; the first screen is now genuinely good. What remains: the shop cannot sell yet, its strongest claim (made your way) is contradicted by its own filters, and the lower home page could belong to anyone. Biggest opportunity: make "made to order, your way" the spine of the product page and the catalogue.

## What's working
1. A no-scrim first screen in a Hebrew-capable display face; type on paper so contrast never depends on the photograph.
2. Honest states throughout: "מחיר משוער" beside the price, the estimate said once per grid, lead time stated, lab vs natural stated first, wishlist/account/contact absent rather than faked.
3. A catalogue built on real links: URL filters, sort and pages; clear-all; zero-result escape; correct bidi; keyboard-reachable menus; 44px touch targets.

## Priority issues
- [P0] Product page dead-ends at peak intent: no order or enquiry action at 8,670 ₪ on /product/emerald-cut-ring, a required size for an action that does not exist, and the shopper learns ordering is unavailable only on /cart. Fix: build the planned checkout flow; until then end the page with a stated block (ordering opens soon, made to order in about N days, price confirmed before production) and show sizes as information. Command: /impeccable shape (checkout), /impeccable clarify (interim block).
- [P1] Filters reset after every selection: <Suspense key={JSON.stringify(rawSearchParams)}> in src/app/(storefront)/[category]/page.tsx:88 remounts FilterBar; drawer closes after each tap, grid flashes a skeleton, focus drops to body; no counts per value; pagination uses scroll={false} so page 2 opens at the bottom. Fix: keep open state above the keyed boundary or in the URL, return focus to the tapped value, add counts, scroll to the grid top on page change. Command: /impeccable harden.
- [P1] The catalogue contradicts "any piece, your way": ring size 48 shows 2 of 16 rings (seed sizes 50–56); emerald cut + yellow gold returns "אין מוצרים שתואמים לסינון"; nothing says other sizes or colours can be made. Fix: drop or reword the size facet, add one true line under the options, make the zero-result state say it can be made and link to /custom. Command: /impeccable shape.
- [P1] Jargon unexplained where it appears: Emerald / G / VS1 / Excellent in the diamond table, English shape filter values, "קראט זהב" beside "משקל קראט", the FAQ only names grades. Fix: Hebrew gloss per grade row, Hebrew shape names, unit and sizing link at the size row, distinct names for the two carats. Command: /impeccable clarify.
- [P2] Lower home page is generic and buries bridal: collections take 36% of the page for four links; "רבי מכר" appears twice and its view-all shows the same four; bridal is seventh, small and boxed. Fix: compress collections, give bridal the hero's grammar and move it up, end stronger than a disclaimer. Command: /impeccable layout.

## Persona red flags
- Casey (one-thumb mobile): filter drawer closes after each tap; page 2 leaves her 566px past the first new card; first screen shows one line of a four-line headline, action at 976px; product thumbnails above the main photo.
- Riley (stress tester): "1 מוצרים" / "1 מסננים פעילים" pluralisation; card shows yellow gold, product page opens on rose; switching colour moves the photo 112px (rose has one image, yellow two); emerald-cut description repeats its short description; on /nope the title reverted to the home title after hydration (dev).
- Jordan (first-timer): VS1, F, Excellent unexplained; two different "קראט"; sizes 48–58 with no unit or guide link.
- Bridal buyer: /rings/engagement-rings is four rings and no guidance; nothing on warranty, returns or certification; no way to ask; "אוסף האירוסין" and "אוסף הכלה" lead to different sets.
- Gift buyer: no gift or price-band entry; a required ring size she cannot know; nothing on delivery timing; name-necklace personalisation listed but not enterable.

## Minor observations
- Product grids skip a heading level (ProductCard.tsx:131).
- Category tiles' hover zoom off the motion system; under reduced motion the hover scale snaps instead of being removed.
- Field and checkbox strokes (#b9b6ae on paper) about 1.9:1, below 3:1 for control boundaries (WCAG 1.4.11).
- Desktop product photo capped at 421px with a 235px empty gutter.
- 72px titles over one-sentence pages (cart, search).
- "חיפושים פופולריים" / "אולי התכוונת" present fixed samples as popularity and spelling correction.
- "רבי מכר" stays by owner decision; 2 of its 4 items also carry "חדש".
- Hero line "לאצבע שלך" over a necklace photo.
- /custom step 1 "פנייה" cannot be done; no photo, no action.
- Sticky desktop masthead 129px (14% of 900px).
- Stale comments: FeatureBanner.tsx ("copy laid over it"), ProductCard.tsx ("the one red").

## Questions to consider
1. If the workshop is the moat, why does no page let a shopper watch it work (sketch, casting, setting) as the spine of the story?
2. While ordering does not exist, what should the product page say at the moment of intent? Is silence the most honest answer?
3. Should made-to-order sizes and colours be filter lists at all, or one promise with examples?
4. Is the highest-stakes audience well served as the seventh band, in a frame?
