# Worn images and missing photographs — prompt sheet

For generating, with an AI image tool, the images the catalogue is missing:

1. **Worn images** — each piece on a hand, an ear, a neck or a wrist, generated
   from the product's own image. They go on the product page as the third
   image and are labelled **"הדמיה"** there automatically (D4D.21).
2. **The cross pendant's packshots** — the one product with no image at all.
3. **A new bridal photograph** for the home page, in the natural style of the
   category photographs instead of the current studio-glamour one.

Everything you need is in the `photo-kit/` folder at the project root (kept out
of git):

- `photo-kit/source/` — the main image of each product below, named by product.
  **Upload the product's image together with the prompt**, so the tool keeps
  the exact piece instead of inventing a similar one.
- `photo-kit/style-reference/` — the site's own photographs. Upload the
  matching one as a style reference: `worn-style-rings.jpg` for rings and
  bracelets, `worn-style-earrings.jpg` for earrings,
  `worn-style-necklaces.jpg` for necklaces, `packshot-style.jpg` for the cross
  pendant.

When you have images, send them to me with the product name for each. I place
them with `scripts/place-product-images.ts` (role `worn`), which marks them as
simulations.

---

## The rules every image must keep

**The piece is the product, exactly.** Same shape, same number of stones, same
prongs and clasp, same gold colour. If the tool changes the design, discard the
image: a worn image of a different piece misleads the buyer.

**True size.** This is the most important rule, and AI tools break it. They
make stones bigger. Every prompt below gives the real size; check it against
the finger, ear or wrist before keeping an image. A reference: an adult ring
finger is about 17 mm wide, an earlobe about 20 mm tall.

| Stone                       | Real size (approx.) | Against a 17 mm finger                   |
| --------------------------- | ------------------- | ---------------------------------------- |
| Round 0.20 ct               | 3.8 mm across       | under a quarter of the finger's width    |
| Round 0.40 ct               | 4.7 mm              | just over a quarter                      |
| Round 0.50 ct               | 5.1 mm              | under a third                            |
| Round 0.70 ct               | 5.7 mm              | about a third                            |
| Oval 0.30 ct                | 5.5 × 3.8 mm        | —                                        |
| Oval 0.60 ct                | 7 × 5 mm            | under half the finger's width (long way) |
| Pear 0.90 ct                | 8 × 5.5 mm          | about half (long way)                    |
| Tennis stones, 0.07 ct each | 2.7 mm              | a fine line of small stones              |

**One look for the whole site.** Warm natural daylight from a window, soft
shadows, skin with real texture (no airbrushing), short natural nails in a
nude tone or bare, no heavy make-up, clothes in plain linen or knit in cream,
oat or sand. Backgrounds: cream linen, warm plaster wall, soft beige. No black,
no glitter, no bokeh lights, no props, no other jewellery competing with the
piece. Square format, 2048 × 2048, the piece sharp and the skin around it
slightly softer.

**Never:** a recognisable real person, a celebrity, text or logos, a hand with
the wrong number of fingers. Check fingers before keeping an image.

### Style block — paste at the end of every prompt

> Natural window daylight, warm and soft, gentle shadows. Real skin texture,
> no retouching look. Short natural nails, nude or bare. Plain cream linen or
> warm plaster background, muted beige palette. Editorial, calm, minimal, like a
> fine-jewellery catalogue shot on film. Square 1:1, high resolution, piece in
> sharp focus. No text, no logos, no extra jewellery, no props. Keep the
> jewellery exactly as in the reference image: same design, same stones, same
> gold colour, true real-world size.

---

## Worn images, one per product

Upload: the product image from `photo-kit/source/` + the style reference.
Then paste the prompt and the style block.

### Rings — use `worn-style-rings.jpg`

**aurora-ring — טבעת אורורה סוליטר** (`aurora-ring.jpg`)

> A woman's relaxed hand resting on cream linen, wearing this exact solitaire
> ring on the ring finger. One round diamond of 0.50 carat, 5 mm across —
> under a third of the finger's width — in a four-prong setting on a thin
> yellow-gold band. Three-quarter view from above, the stone catching the light.

**halo-ring — טבעת הילה יהלומים** (`halo-ring.jpg`)

> A woman's hand, fingers slightly curved, wearing this exact halo ring on the
> ring finger: a round centre diamond surrounded by a ring of small diamonds,
> 0.70 carat in total. The whole face of the ring is about 8 mm across — half
> the finger's width. Yellow gold. Hand resting on a soft beige knit sleeve.

**three-stone-ring — טבעת שלוש אבנים** (`three-stone-ring.jpg`)

> A woman's hand laid flat on cream linen, wearing this exact three-stone ring
> on the ring finger: three oval diamonds side by side, 1.10 carat in total,
> the centre oval about 6.5 × 4.5 mm, the side stones smaller. The row of stones
> spans about two thirds of the finger's width. Yellow gold.

**pear-solitaire — טבעת סוליטר טיפה** (`pear-solitaire.jpg`)

> A close view of a woman's hand, wearing this exact pear-shaped solitaire on
> the ring finger, the point of the pear toward the fingertip. Pear diamond of
> 0.90 carat, about 8 × 5.5 mm — half the finger's width along its length.
> White gold band. Hand holding the edge of a cream linen cloth.

**pave-band — טבעת פאווה יהלומים** (`pave-band.jpg`)

> A woman's hand, wearing this exact white-gold band set with a row of small
> diamonds across its top, 0.45 carat in total, each stone tiny (under 2 mm).
> The band is slim, about 2 mm wide. Worn alone on the ring finger, hand
> resting on warm plaster-coloured fabric.

### Earrings — use `worn-style-earrings.jpg`

**stud-earrings — עגילי יהלום צמודים** (`stud-earrings.jpg`)

> Profile of a woman's ear and jaw, hair tucked back, wearing this exact
> diamond stud on the earlobe. One round diamond of 0.20 carat, 3.8 mm across —
> a small, delicate point of light, a fifth of the earlobe's height. Yellow-gold
> four-prong setting. Cream knit collar, warm plaster wall behind.

**drop-earrings — עגילים תלויים יהלום** (`drop-earrings.jpg`)

> Profile of a woman's ear and neck, hair in a low knot, wearing this exact drop
> earring: a small gold ball stud, a short gold bar, and one oval diamond
> hanging below. The oval is 0.30 carat, about 5.5 × 3.8 mm — small and
> delicate, NOT large. The whole earring hangs about 25 mm below the lobe.
> Yellow gold.
>
> Note: the product image itself shows the ovals much larger than 0.30 carat
> each. Size the stones from these numbers, not from the image — and see the
> note at the end of this sheet.

**diamond-hoops — עגילי חישוק יהלומים** (`diamond-hoops.jpg`)

> Three-quarter view of a woman's ear, wearing this exact white-gold hoop set
> with small diamonds along its front, 0.75 carat in total. Keep the hoop the
> size it is in the reference image relative to its stones; do not enlarge it.
> Soft daylight from the side.

### Necklaces — use `worn-style-necklaces.jpg`

**solitaire-pendant — תליון סוליטר יהלום** (`solitaire-pendant.jpg`)

> A woman's collarbone and neckline, plain cream linen top with an open neck,
> wearing this exact pendant: one round diamond of 0.40 carat, 4.7 mm across, in
> a small yellow-gold setting on a fine chain. The chain is 45 cm, so the
> pendant rests just below the hollow of the throat. Small and delicate.

**tennis-necklace — שרשרת טניס יהלומים** (`tennis-necklace.jpg`)

> A woman's neckline and collarbones, bare shoulders or a simple cream top,
> wearing this exact tennis necklace: a continuous line of small round diamonds,
> each about 2 mm, 2.50 carat in total, set in yellow gold. 40 cm long, sitting
> close at the base of the neck. Elegant, not flashy.

**name-necklace — שרשרת שם בעיצוב אישי** (`name-necklace.jpg`)

> A woman's neckline in a cream knit top, wearing this exact name necklace: the
> Hebrew name "רות" cut from yellow gold, the letters about 8 mm tall, on a fine
> chain, 45 cm, resting below the hollow of the throat. The Hebrew letters must
> be correct, crisp and readable right to left — discard any image where they
> are not.

### Bracelets — use `worn-style-rings.jpg`

**tennis-bracelet — צמיד טניס יהלומים** (`tennis-bracelet.jpg`)

> A woman's wrist and the back of her hand, resting on cream linen, wearing this
> exact tennis bracelet: 42 round diamonds in a continuous line, each about
> 2.7 mm, 3.00 carat in total, yellow gold. 18 cm, sitting loosely just above
> the wrist bone. A fine, even line of light.

---

## The cross pendant — packshots (no image exists yet)

**cross-pendant — תליון צלב זהב.** Make two images, in the same look as every
other product: upload `packshot-style.jpg` as the style reference.

Main, one for each gold colour (yellow, white):

> Product photograph of a small solid yellow-gold cross pendant on a fine chain,
> the cross about 15 mm tall, simple polished arms, centred on a warm off-white
> background (#F6F3EE) with a soft shadow beneath. Studio product shot, even
> soft light, the gold warm and realistic. Square 1:1, 2048 × 2048. Match the
> lighting, background and framing of the reference image exactly. No text.

Close-up: the same prompt, "close-up of the cross, filling most of the frame,
showing the polished edges".

Then the same two for white gold: replace "yellow-gold" with "white-gold
(rhodium-bright, cool silver tone)".

---

## A new bridal photograph for the home page

Replaces `public/images/editorial/bridal/` — two images, the same scene.

> A bride's hand and forearm in natural window light, resting on the soft folds
> of an ivory silk or linen dress, wearing a solitaire engagement ring (one round
> diamond, 5 mm across, yellow gold) and a thin matching wedding band. Warm,
> quiet, intimate, editorial — not a studio glamour shot, no visible face, no
> heavy make-up. Cream and ivory palette, soft shadows. Plenty of calm empty
> space on the left side of the frame.

- **Desktop:** wide, 2400 × 960 (5:2), the hand in the right third.
- **Mobile:** portrait, 1200 × 1500 (4:5), the hand in the lower half.

Upload `worn-style-rings.jpg` as the style reference.

---

## Before you send them

For each image, check:

- [ ] It is the same piece as the product image: shape, stones, setting, colour.
- [ ] The stone is the size in the table, not bigger.
- [ ] Five fingers, a real-looking ear, no strange skin.
- [ ] No text, no logo, no other jewellery.
- [ ] Hebrew letters (the name necklace) correct and readable.

**A note on the drop earrings.** The current product image shows the oval
stones much larger than the listed 0.60 carat for the pair (0.30 each, about
5.5 mm). Either the image or the listed weight is wrong, and the buyer sees
both. Worth checking with the workshop; I'll correct whichever is wrong.
