# Launch photo audit — what to check, what to create

2026-10-16. Companion to [../LAUNCH_PLAN.md](../LAUNCH_PLAN.md). Evidence: the local DB (100 live
products, 614 image rows), every product page crawled per gold colour, visual spot-checks of
new and old models, and the production site's R2 photos (1–2 per colour on the old 50).

**Ruling from the owner:** the photographs now on the site are the production photographs. They
ship **without** the "הדמיה" label (plan A2 removes it; C10 clears the flag on 323 images).

That ruling raises the bar rather than lowering it: once the label is gone, a picture that shows a
different piece from the one sold is a misleading presentation. So the audit below is mostly
**checking**, not shooting.

---

## 1. What exists (measured)

| Fact                                        | Number                                      |
| ------------------------------------------- | ------------------------------------------- |
| Live products locally                       | 100 (50 original + 50 new 2026 models)      |
| Image rows                                  | 614 — **323 carry the simulation flag**     |
| New models whose photos are _all_ generated | 50 of 50 (each has 3–5 images)              |
| Source resolution                           | mix of 1024², 1536², 2048² (all square)     |
| Original 50 on **production** (R2)          | 1–2 photos per gold colour, no worn shots   |
| Local lead-colour (yellow) photos per model | 2–3                                         |
| Local white / rose photos per model         | usually **1** (the colour's main shot only) |

Colour-correct photos are served per selected colour (checked: marquise solitaire in yellow and
rose show the right metal).

## 2. Blocking checks (must pass before `SITE_INDEXABLE=true`)

These are review tasks on existing images; fix by regenerating that single image only if it fails.

**2.1 Fidelity pass on all 323 flagged images** — 20 s each, ≈ 2 hours. Open each product page at
the lead colour and every other offered colour. For each image answer **yes/no**:

1. Same piece as the description (shape, number of stones, setting, band width)? D4D.37 already
   rewrote descriptions to match pictures for ten models — re-read those against the picture:
   the oval and elongated-cushion rings, east-west emerald, knife-edge band, bezel station ring,
   station necklace, Star of David, huggies, three-stone ring.
2. Stone **size true to scale**? (Generators inflate stones. A ring finger is ~17 mm wide, an earlobe
   ~20 mm. A 0.5 ct round is ~5 mm.)
3. Gold colour matches the variant (yellow / white / rose), including prongs and bezel metal?
4. Hands, ears, necks anatomically correct (finger count, ear shape, no merged jewellery)?
5. No stray text, hallmark, watermark, brand mark, or invented engraving? **Name / initial / engraved
   tag / photo pendant / Star of David / hamsa / "חי"** are the highest-risk: Hebrew lettering and
   religious symbols must be exact.
6. Same woman / same man across the catalogue (D4D.38 refs)? One face that changes is a trust issue.
7. Clean, same light-neutral background and the same crop/margins across a product's colours? Spot
   check: marquise solitaire rose has a darker, textured background and larger frame than yellow.
8. Not obviously AI-artefacted at 2× zoom (melted prongs, double chain links, asymmetric earrings)?

Output: a one-line-per-failure list `slug | colour | position | reason`. Failures are regenerated
(Gemini from the product's own packshot, as in D4D.38) or **deleted** — a missing worn shot is better
than a wrong one. A product may not go live with zero passing photos.

**2.2 High-value pieces with thin galleries.** Never launch a ≥ ₪8,000 item on a single image.
Currently: `marquise-tennis-necklace` (₪15,900, 1 white photo + shared), `marquise-tennis-bracelet`
(₪11,900, yellow has 1), `bridal-trio` (₪17,460), `bridal-set` (₪11,400), `colored-diamond-ring`
(₪10,530), `east-west-emerald-ring` (₪8,390), `marquise-eternity-ring` (₪8,490),
`bezel-tennis-bracelet` (₪8,490), `marquise-bridal-set` (₪8,990). Each needs **≥ 4** photos on its
lead colour: packshot, close-up of the setting, scale-on-body, and a second angle.

**2.3 Production's 50 original models** carry only main + detail per colour. Run plan step C7 with
the existing manifests (`photo-kit/fix/out*`, `photo-kit/new-models/gemini/manifest-worn.json`,
`photo-kit/place/manifest.json`) so production reaches the same galleries as local — _after_ 2.1
passes for the worn images in those manifests (86 entries).

## 3. Assets to create (nothing exists today)

| #   | Asset                                                                                                                               | Spec                                                                                            | Why                                                                                                                                                                                   | Source                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| P1  | **Favicon + app icons** from the wordmark/monogram: `src/app/icon.png` 512², `apple-icon.png` 180², `favicon.ico` 32/48             | Dark green `#2F4A3D`-family on ivory, readable at 16 px (a monogram "J", not the full wordmark) | Tabs, bookmarks, Google results show no icon today (verified: no `<link rel=icon>`)                                                                                                   | design (can be vector → export)            |
| P2  | **Open Graph image** 1200×630, `/public/og.jpg`                                                                                     | Hero woman + wordmark + tagline, text ≥ 56 px, < 300 KB                                         | Every shared link (WhatsApp, Facebook) is blank today — WhatsApp is how this shop is shared                                                                                           | derive from `hero-desktop.jpg`             |
| P3  | **Email header logo** PNG @2×, 600 px wide, transparent                                                                             | wordmark only                                                                                   | Order/request emails (plan A7)                                                                                                                                                        | design                                     |
| P4  | **Workshop / "about" set**, 4–6 **real** photographs: the bench, hands setting a stone, tools, packaging being closed, the owner(s) | 3:2, ≥ 2400 px wide, natural light, no faces required                                           | The whole claim of the shop is "made in our workshop in Israel". `atelier.jpg` is the only one. **Do not generate these**: AI pictures of a workshop would make a factual claim false | **real shoot (phone is fine in daylight)** |
| P5  | **Unboxing / packaging photo(s)**: the box, pouch, certificate card, polishing cloth                                                | 1:1 and 3:2                                                                                     | Shipping page and checkout reassurance; also what gets reviewed when something arrives                                                                                                | real                                       |
| P6  | **14K stamp close-up** on a real piece (macro of the "585/14K" hallmark + maker mark)                                               | macro, sharp, neutral background                                                                | Backs the "14K" claim visually; goes on FAQ + shipping page                                                                                                                           | real                                       |
| P7  | **Ring-size guide illustration** (finger + string/ring-measure method, mm→EU size)                                                  | SVG, brand colours                                                                              | `RingSizeGuide` is text only; sizing is the #1 return cause for rings                                                                                                                 | design                                     |
| P8  | **Product OG fallback**: confirm each product page's `og:image` uses its lead photo (plan A8); if not, wire it                      | —                                                                                               | Shared product links preview as the ring                                                                                                                                              | code                                       |

## 4. Recommended (not blocking), in value order

1. **Third image for every lead colour** where only 2 exist (about 50 new models: packshot + one
   other). Priority: engagement rings, tennis pieces, studs, name
   necklaces.
2. **White and rose second shots** (detail close-up) for rings, since colour is the customisation axis
   buyers compare most.
3. **Upscale or regenerate 1024² sources** that are the only resolution a product has: chunky-solitaire,
   bridal-trio, chain-necklace, figaro-chain, chai-pendant, cuban-bracelet, paperclip-bracelet. On a
   retina laptop the PDP zoom starts to look soft above ~940 px. Target 2048² for main shots.
4. **One unified background tone** pass: normalise new vs original packshots so a category grid does not
   show two ivory tones side by side.
5. **Men's worn set**: `public/images/men-worn` has 4 images; add 2–3 more worn shots (wrist, neck)
   so the men's page isn't one hand.
6. **Alt text review**: composed alt text is "name + colour". Fine for SEO; for the 10 most-visited
   products add a descriptive alt ("טבעת סוליטר מרקיזה בזהב אדום על כף יד").

## 5. Execution order (≈ 1 working day for one person)

1. P1–P3 (a morning of design work; unblocks Phase A8/A7).
2. §2.1 fidelity pass → failure list → regenerate/delete.
3. §2.2 extra shots for the nine high-value pieces.
4. §2.3 / plan C7 placement on the rehearsal branch, re-check one product per category visually.
5. Schedule P4–P6 as a half-day real shoot; the About page ships when they arrive (it is not a launch
   blocker, but the footer's "אודות" column should stay without a dead link until then).
