---
target: the whole storefront
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\dev\\אתר חנות תכשיטים\\src\\app\\(storefront)"
timestamp: 2026-10-06T15-44-58Z
slug: src-app-storefront
---
Method: dual-agent (A: design-review agent · B: detector + browser-evidence agent)

Target: whole storefront (src/app/(storefront)), on the local dev server after the six follow-up passes (checkout, harden, clarify, catalogue promise, layout, polish) and the post-launch fixes (404 title, hero crop). Viewports 1440x900, 768x1024, 375x812.

## Design health score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Add-to-bag confirmation, bag count, filter counts, checkout steps, live price and lead time work. Top menu never marks the current section; product choices reset silently after Back. |
| 2 | Match system / real world | 3 | Plain Hebrew, grades glossed, ring-size unit stated. "קראט" still means purity and stone weight on one product page; shapes are words only. |
| 3 | User control and freedom | 3 | Clear filters, chips, Esc, checkout "שינוי", details survive reload. No undo on removing a configured cart line; /custom has no way forward. |
| 4 | Consistency and standards | 2 | Two pages titled "עיצוב אישי" (/custom and /collections/personalized); "טבעות אירוסין" (4) vs "אוסף הכלה" (9) disagree; alignment and action style change band to band. |
| 5 | Error prevention | 2 | Typed price discarded by the phone drawer's main button; size-guide round trip resets 18K to 14K; emoji/Latin accepted under "עברית" and truncated; nothing guards a wrong ring size. |
| 6 | Recognition rather than recall | 3 | Configuration echoed in cart/checkout, breadcrumbs, suggestions. Stone origin invisible on cards; /search has no editable query field. |
| 7 | Flexibility and efficiency | 2 | URL filters, sort, instant search, keyboard menus. No configured-product link, no stone-origin filter, 16 rings paginate 12 + 4. |
| 8 | Aesthetic and minimalist design | 3 | Disciplined paper/ink/hairline system. Noise: SKU on product pages, filter bar on zero-result search, 129px two-row header; add-to-bag below the fold at 1440x900 (detector: first-viewport-column-overflow). |
| 9 | Error recovery | 3 | Specific Hebrew messages with examples at the field, focus moved, work kept. The two silent failures give no message. |
| 10 | Help and documentation | 3 | FAQ plain, honest, deep-linked, separates carat from karat. Nothing on returns, resizing, certificates, warranty, payment methods or delivery time. |
| Total | | 27/40 | Acceptable, top of band (previous run 23/40) |

## Design specificity verdict
LLM: split. Visual language authored (paper and ink with photographed gold as the only warm note; ink masthead and boxed wordmark; hero line on paper; grades glossed beside certificate terms). Best product-specific moves are structural: the filter note that every model can be made in any colour/karat/size/length, and lead time moving with karat. Page structure is still category-standard: stock DTC homepage sequence, stock catalogue template, default packshot-plus-options product page. Made-to-order lives in single lines of copy, not composition. /custom is the least specific page: three generic steps, no photograph, no action.

Detector: CLI 1 finding, false positive (broken-image on a regex literal, ProductGrid.test.tsx:42); nothing suppressed. Browser, 5 pages / 7 passes: real first-viewport-column-overflow on /product/aurora-ring at 1440x900 (add-to-bag at 926-978px, under the 900px fold; agrees with the phone finding of ~1,190px, not sticky); image-hover-transform real but intentional (deliberate drift, off under reduced motion); cramped-padding hits (header nav row, subcategory chip) false positives (text 9-16px inside); dark-glow is the overlay's own outline. A [Human] overlay was left on the homepage tab.

## Overall impression
Score 23 -> 27: filters, wording, checkout and homepage hold up. What remains is trust and promises: the site invites custom orders it cannot receive and claims a natural-or-lab choice the rings do not offer. Biggest opportunity: make "made to order, your way" something a shopper can do, not only read.

## What's working
1. The palette stance is real: photographed gold is the one warm note on every page at 1440 and 375; answers "no black-and-gold, nothing weird" without cream and serif.
2. Product truth built into the interface: made-to-order axes are not filters, lead time moves with karat, grades glossed, FAQ separates carat from karat.
3. Forms and errors: labels above underline fields, right keyboards and direction, specific messages with examples, focus on the first problem, details kept on reload, "חינם" not ₪0.

## Priority issues
- [P0] The customisation promise ends at a wall. Every product page ("רוצים גוון זהב, קראט או מידה אחרים? ... איך מזמינים בהתאמה אישית"), the nav "עיצוב אישי" and the home closing band link to /custom, whose step 1 "פנייה" has no action while no contact channel is set (custom/page.tsx:32,76). No path for an unlisted colour, size or a natural stone. /collections/personalized carries the same title. Fix: save a "בקשת התאמה" to the database like orders, from /custom and inline on the product page with the current choices prefilled; or remove the invitations; rename the collection. Command: /impeccable shape, then /impeccable clarify.
- [P1] Two claims the catalogue cannot back. (a) "טבעי או מעבדה — הבחירה שלך" and "ביהלומים טבעיים וביהלומי מעבדה" on /rings and engagement rings, while all 8 diamond rings are lab-grown (verified in the database; natural only on one stud earring and one tennis bracelet); no origin facet, origin not on cards. (b) "רבי מכר — הדגמים המבוקשים ביותר בקטלוג" with no sales; kept without disclaimer by the owner's earlier decision, so the owner's call. Fix: "סוג יהלום" facet, origin text on cards and product subtitles, literal copy (lab-grown in the catalogue, natural on request). Command: /impeccable clarify.
- [P1] Phone filter drawer silently discards a typed price: the main "הצגת 16 מוצרים" button only closes the drawer (FilterPanel.tsx:214); the range applies only via "עדכון טווח מחירים". Fix: apply a typed range from the main button (or on Enter/blur with a live count) and drop the separate button. Command: /impeccable harden.
- [P2] Ring-size certainty: "איך יודעים מידה?" leaves the page and Back resets 18K to 14K (state in useState, ProductDetailView.tsx:94,110); six sizes, no unsure path, no resizing statement. Fix: in-place size guide, choices in the URL, "לא בטוחים במידה?" once a resizing policy exists. Command: /impeccable harden, then /impeccable clarify.
- [P2] Personalised necklace ordered blind: no preview; required name labelled "תוספת 90 ₪" so ₪1,290 is never payable; emoji/Latin accepted under "עברית" and cut by a UTF-16 maxLength (PurchasePanel.tsx:217). Fix: live preview in the display face, script validation, grapheme counting, "₪1,380 כולל השם". Command: /impeccable delight, then /impeccable harden.

## Persona red flags
- Casey (375x812): drawer discards typed price; first screen shows only "תכשיטי זהב" of the headline; add-to-bag ~1,190px down, not sticky; sizes wrap 5 + 1; reload loses product choices; checkout returns to step 1 on reload.
- Riley: emoji/Latin accepted under "עברית" and cut at 12; "ספרות בלבד" vs dashes accepted; zero-result search still shows filters and "0 מוצרים"; Back from size guide changes price silently; no undo on cart removal.
- Jordan: "עיצוב אישי" in the nav leads to a page with no button; two meanings of "קראט" on one page; shapes without pictures; arithmetic size method; no answers on returns, size, certificate or payment.
- Bridal buyer: engagement rings are 4, all lab-grown, under copy promising both; 1.2ct emerald-cut and princess solitaires in neither bridal entry point; no resizing promise; no certificate statement; checkout ends with payment inactive after a 21-day lead time.
- Gift buyer: no name preview; language asked separately; "תוספת 90 ₪" reads optional; karat never stated yet "a different karat" invited; unknown delivery time; no gift message; no shareable configured link.

## Minor observations
- Alignment drifts (start titles over centred bodies on /rings, /faq, /custom; home "קטגוריות" start vs "רבי מכר"/"אוספים" centred).
- Action style drifts (diamonds panel outlined box beside underlined actions).
- Top menu never marks the current section.
- Drawer chevrons point right (reads as back in RTL).
- Product pages show the internal SKU; tab title differs from the h1.
- Colour swatches are painted discs, the only painted gold.
- Instant search has no thumbnails; /search has no editable field.
- Empty cart is one line and one button.
- Mega-menu feature panel is text only; heading "גילוי" reads translated.
- Bridal photograph is studio-glamour against the natural-light hero and tiles.
- Desktop header 129px sticky (~14% of 900px).
- Price-filter placeholders lack thousands separators ("10530").
- Payment inactivity first stated at checkout step 3, after personal details.
- DESIGN.md still describes the collections band as alternating wide images; it ships as a row of two.
- Hover zoom flagged as advisory; deliberate, respects reduced motion.

## Questions to consider
1. If "any model, your way" is why the shop exists, why is the custom journey the only one with no form, photograph or next step? What if "בקשת התאמה" were the product page's second action?
2. Every ring is lab-grown: is "lab-grown, natural on request" the more honest headline and the stronger price story for "for less"?
3. What would a confident made-to-order product page look like if its 21 days were drawn at size instead of one small grey sentence?
4. Should the checkout say "save the order, no charge" from the cart onward?
