---
target: home page
total_score: 24
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 3
target_identity: "file:C:\\dev\\אתר חנות תכשיטים\\src\\app\\(storefront)\\page.tsx"
target_fingerprint: "sha256:7b0330f40341bc0b502eb5ecfb7f7d390126878724d09df73b021817f952104c"
target_path: "C:\\dev\\אתר חנות תכשיטים\\src\\app\\(storefront)\\page.tsx"
timestamp: 2026-10-07T20-46-04Z
slug: src-app-storefront-page-tsx
---
Method: dual-agent (A: design review · B: detector + Playwright browser evidence)

## Design Health Score — 24/36 (67%, Acceptable, at the edge of Good). H7 n/a (Persuade surface).

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | No statement of what happens after ordering |
| 2 | Match system / real world | 2 | "קראט" means karat and carat; "לצפייה בקטלוג" only scrolls |
| 3 | User control | 3 | Mega-menus open on keyboard focus, ~10 links per item |
| 4 | Consistency | 2 | FAQ centred vs start edge; three link styles |
| 5 | Error prevention | 2 | Hero promises karat changes; PDP is 14K only |
| 6 | Recognition | 3 | Arches and FAQ clear |
| 7 | Flexibility | n/a | Persuade surface |
| 8 | Aesthetic/minimal | 3 | Alteration list repeated 5x; double band padding |
| 9 | Error recovery | 3 | Empty bands omitted |
| 10 | Help | 3 | Ring-size help not near bridal |

Specificity: ~70% authored (Frank Ruhl at regular weight, single green, field band, careful RTL), ~30% genre (ivory/arch/serif atelier idiom; middle bands generic). Most ownable image (Hebrew letter pendant) buried in collections.
Detector: CLI exit 0, 2 advisories (wordmark sizes 2rem Footer.tsx:42, 1.625rem Header.tsx:154 not on ramp). Browser: cream-palette, heading-rhythm x2, cramped-padding = false positives/intentional; image-hover-transform x9 real but undocumented. Contrast all AA (tightest muted on recessed 4.86). No overflow. Small tap targets: card titles 26px, desktop footer links 21px.

## Priority issues
- [P1] Mobile: no action in first viewport (h1 at y=619, pills at ~920–1020 on 390x844). Cap photo ~46svh, tighten gaps. /impeccable adapt
- [P1] Contradictory product truth: diamonds headline "וטבעיים לפי בקשה" vs 2 of 4 best sellers natural; hero karat promise vs 14K-only; karat/carat collision. /impeccable clarify
- [P1] No reassurance or strong close: page ends on FAQ secondary pill; bridal band lacks post-order info and ring-size help. /impeccable layout
- [P2] Rhythm/consistency drift: double padding, FAQ centred, h2 scale vs DESIGN.md, diamonds primary pill to FAQ. /impeccable polish
- [P2] Repetition and missing gift entry; personalised pieces buried. /impeccable layout

## Persona red flags
Jordan: karat ambiguity, scrolling "catalogue", detached price note, no lead time/human. Casey: no first-screen CTA, ~9,200px page, lone "סטים" arch, cart/search top-left. Riley: diamond headline contradiction, karat promise, "חדש" inside "רבי מכר", demand claim pre-launch.

## Minor
Footer "אודות" holds only privacy; green "ישירות" 1.54:1 vs ink barely reads as emphasis; header wordmark font-medium vs Regular Serif rule; earrings menu image shows rings; hover zoom undocumented.

## Questions
1. Show what "for less" means honestly before real prices? 2. Why bridal gets a band and gift nothing? 3. End on the workshop rather than questions? 4. Is Hebrew personalisation made in Israel the more ownable identity?
