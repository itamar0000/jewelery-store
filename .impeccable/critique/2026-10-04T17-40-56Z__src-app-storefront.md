---
target: storefront (whole site)
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 3
p1_count: 8
target_identity: "file:C:\\dev\\אתר חנות תכשיטים\\src\\app\\(storefront)"
timestamp: 2026-10-04T17-40-56Z
slug: src-app-storefront
closed: true
---
Method: dual-agent (A: design-review sub-agent · B: detector + browser-evidence sub-agent), synthesised and spot-checked in a third tab.

Target: whole storefront (src/app/(storefront)), rendered from the uncommitted working tree at 1440x900, 1366x768, 768x1024, 375x812.

## Verdict
The system is authored (paper/ink, no gold token, Miriam Libre at scale, native RTL) but the content it frames is category stock (AI-generated lifestyle, plaster still lifes, hand/ear/neck crops, CG-clean packshots). The brand's real differentiators — own workshop, Hebrew name jewellery, natural/lab choice — are generated, malformed, and well explained respectively. Today it does not work as a shop: menus and search invisible, "נתוני הדגמה בלבד — לא מוצר אמיתי" on every product page, every ask/buy path ends at "יעודכן".

Deterministic scan: CLI detect over src/app + src/components (64 files): 1 finding, false positive (regex literal in ProductGrid.test.tsx:42). Browser overlay on 5 views: 3 valid findings on /contact (11px muted sentence, 11px h2, 123-char line); cramped-padding x6 false positives; image-hover-transform and oversized-h1 intentional per DESIGN.md; first-viewport-column-overflow false positive (sticky). Detector missed all critical issues (scans resting pages; contrast only over images). Overlays left in the [Human] tab.

## Design health score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 1 | Search hides typed query/results; hearts show saved but nothing saves |
| 2 | Match system / real world | 2 | Developer copy, English grades, "≈", "קראט" for karat and carat |
| 3 | User control and freedom | 1 | Mobile search/menu: invisible close, no Escape on touch |
| 4 | Consistency and standards | 2 | "≈" on cards only; 4 CTA styles; mixed radii; alternating headings |
| 5 | Error prevention | 2 | Ring size pre-selected at 48, no guide |
| 6 | Recognition rather than recall | 2 | Invisible subcategories; "≈" explained only in footer |
| 7 | Flexibility and efficiency | 2 | Filters/sort/search exist; search unusable; 12 per page |
| 8 | Aesthetic and minimalist design | 2 | Palette/type excellent; 10.8-screen home, badges, placeholders |
| 9 | Error recovery | 2 | Good 404/empty search; contact dead-ends |
| 10 | Help and documentation | 2 | Strong FAQ not linked from PDP; policies "טרם נקבע" |
| Total | | 18/40 | Poor — four cheap defects cost most points |

## Executive summary
1. Mega menu, mobile drawer, search overlay render paper-on-paper (1:1) — regression from uncommitted ink masthead (Header.tsx:98).
2. Demo/dev content visible: demo notice on all 51 products (prisma/seed.ts:34), DEMO SKUs/certificate/slugs, "ייבנה בשלב 5/6", "לא פעיל בשלב זה", "יעודכן" x6, "טרם נקבע" x3.
3. No way to buy, no way to reach a person; every ask routes to "יעודכן".
4. Jewellery not the hero: desktop first viewport has no text (H1 9-21px below fold at every desktop height), ~3% jewellery in frame; tablet hero = blurry empty wall; 240px card images, 416px PDP image at 1440.
5. All 9 editorial images AI-generated (fal-ai/flux-2-pro); atelier hands tangled; personalised still life with malformed Hebrew.
6. "For less" never explained (own workshop, no middleman).
7. Unbacked signals: "נותרו 2 במלאי" from seed inventory on made-to-order, "חדש"+"רב מכר" together, 3 badges, "≈" + agorot, "≈" missing on PDP.
8. PDP: small gallery, no scale shots, hover zoom with no extra detail, size pre-selected, grades unexplained, no policies, no related.
9. Header focus ring ink on ink.
10. Home 9,687px with 4 products; collections ~3,300px for 4 links; duplicated themes.

## Priority issues (register)
- [P0] #1 Invisible nav/search/menu (MegaMenu.tsx:30, MobileNav.tsx:91, SearchOverlay.tsx:172 inherit text-background). Fix: text-foreground on panel roots + regression test. Impact 10, effort Low. → /impeccable harden
- [P0] #2 Demo data, developer copy, non-working features visible (seed demo notice, DEMO SKUs/cert/slugs, phase copy, hearts that don't save). Fix: strip/reseed, hide non-working affordances. Impact 9. → /impeccable clarify
- [P0] #3 No purchase path, no human (disabled CTA, placeholder cart, contact "יעודכן" x3, four invitations to ask). Fix: one live channel (likely WhatsApp/phone), PDP order-request action carrying options; remove invitations if no channel. Impact 10, effort High (business). → /impeccable shape
- [P1] #4 Unbacked merchandising signals (stock counts from seed on made-to-order, new+best-seller, best-seller badge in best-seller rail, availability flips by colour). Fix: remove until real, max one badge, lead time as default availability language. → /impeccable distill
- [P1] #5 Desktop first viewport has no message (Hero.tsx:55 + :71 vs 129px header); tablet hero 768x325 upscaled 2.6x, model cropped out. Fix: real header math, portrait/tablet crop below 64rem, sizes. → /impeccable adapt
- [P1] #6 AI imagery substitutes for real proof (atelier, personalised lettering, bridal, hero, sets tile). Fix: real workshop photos first, real name-necklace packshot, jewellery-first hero, real bridal. → /impeccable shape
- [P1] #7 Value story missing (no supporting line, no About, footer About = Contact only). Fix: one line by the H1, how-we-make-it band, About page, PDP provenance note. → /impeccable shape
- [P1] #8 PDP gallery too small/thin/detached (ProductGallery.tsx:162 cap 416px; single images; 62px jump; heart 125px off photo; zoom 1.6x of ~640px source). Fix: fill 7 columns, 4+ frames incl. worn, lightbox with 2048 master, mobile swipe, anchored heart. → /impeccable layout
- [P1] #9 PDP purchase questions unanswered (size pre-selected, no guide, English/unexplained grades, karat/carat ambiguity, no policies, no related, no price deltas, trio data mismatch). → /impeccable clarify
- [P1] #10 Price presentation inconsistent (≈ cards only, agorot, no "from", weight). Fix: one price component, words not glyph, whole shekels, "החל מ־". → /impeccable clarify
- [P1] #11 Header focus ring invisible (globals.css:39 ink outline on ink bar). Fix: paper focus ring inside header. → /impeccable harden
- [P2] #12 Home long/product-light/repetitive; hero CTA "לקטלוג המלא" → /rings. → /impeccable distill
- [P2] #13 Cards: overlays, 240px images (72rem container), 10px swatches, close-up hover not worn. → /impeccable distill
- [P2] #14 Personalised line: listed fields, no inputs, ₪0 lines, dev note. → /impeccable shape
- [P2] #15 Bridal band boxed (FeatureBanner.tsx:72), smallest image, stock beauty. → /impeccable layout
- [P2] #16 System-voice copy (CategoryDiscovery.tsx:72, CollectionsSection.tsx:53), vague certificate threshold. → /impeccable clarify
- [P2] #17 Grey PlaceholderImage in every mega menu (MegaMenu.tsx:86). → /impeccable distill
- [P2] #18 Type hierarchy: 92px H1 vs 18px CTA; alternating H2s; PDP H1 36/400 vs category 72/700; 11px sentences. → /impeccable typeset
- [P2] #19 Nav: 8 items incl. FAQ/contact; no bridal/gift/all entries; 129px sticky header; no legal footer. → /impeccable shape
- [P2] #20 muted/70 text 2.77-2.83:1 at 11-12px; 11px sentences; 123-char line. → /impeccable typeset
- [P2] #21 Touch targets (hearts 32, CTA 83x27, view-all 86x22, pills 36, sizes 40 tall); mobile PDP action at y≈1121, no sticky bar. → /impeccable adapt
- [P3] #22 Components contradict DESIGN.md (rounded pills, 4px radii, boxed inputs, contact cards, side-stripe callout, 4 CTA styles, unused hero-settle, 4-col footer). → /impeccable polish, /impeccable document
- [P3] #23 Wordmark in a hairline box reads as placeholder. → /impeccable shape
- [P3] #24 Listing details: 3+1 orphan 768-1279, 12/page, relevance sort on categories, raw price inputs, FAQ teasers not deep-linked. → /impeccable polish
- [P3] #25 RTL: certificate issuer/number reversed (ProductDetailView.tsx:458), English values, native blue ×, unformatted chip. → /impeccable harden
- [P3] #26 Home preloads 4 below-fold product images (ProductGrid.tsx:95); no editorial placeholder tone. → /impeccable optimize

## Persona red flags
- Casey (mobile): blank menu; invisible search with no visible close; 83x27 CTA; first product ~2,240px down; hearts don't save; buy action below fold; size pre-selected.
- Riley (stress): hearts vs /wishlist; "full catalogue" → rings; FAQ teasers land at top; availability flips + 62px jump; ₪7,292.40 under "≈"; trio photo vs copy; relevance sort on categories; certificate reversed.
- Jordan (first-timer): "14 קראט" vs "0.5 קראט"; F/VS1/Round/Excellent/"≈" unexplained; sizes 48-58 meaningless; transliterated jargon; FAQ not linked.
- Bridal buyer: engagement link invisible; boxed stock bridal band; "not a real product", "DEMO-LAB"; no warranty/insurance/returns; nobody to call; size pre-selected.
- Gift buyer: no gift entry; no exchange/resize policy; lead times only on PDP; jargon spec table.

## Minor observations
- 404 keeps the home title; "demo" in shareable URLs/SKUs; "לאצבע שלך" frames everything as rings; rise-in plays below the fold; stray scrollbar under mobile pills; single-option controls on the trio; MobileNav doc comment says left, behaviour correctly right.

## Questions to consider
- Would one honest photo of the bench do more for trust than every other image combined?
- What one sentence proves "for less", and why isn't it on the first screen?
- For a made-to-order bridal piece, should the primary action be "order this piece" through a conversation rather than "add to cart"?
- Would the site sell more with half the home page and twice the product?
