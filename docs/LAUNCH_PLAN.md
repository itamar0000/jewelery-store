# Launch plan — Jewelry for Less

Written 2026-10-16 from an audit of the local build (`fix/launch-blockers`, DB with 100 products)
and of production (`https://jewelery-store1.vercel.app`, checked live in Chrome).
Photo work is in [photography/LAUNCH_PHOTO_AUDIT.md](photography/LAUNCH_PHOTO_AUDIT.md).

**Owner decisions already given (not re-opened here):** the current photographs are final and
ship without the "הדמיה" label; 14K only; shipping free; production Postgres is Neon, media is
Cloudflare R2, hosting is Vercel (fra1).

---

## 1. Where things stand

### Code (local) — healthy

`npm run verify` was run on 2026-10-16: lint, typecheck, prettier, **825 tests in 66 files**, and
`next build` all pass. But **23 modified files and 6 untracked paths are uncommitted** (two
migrations, `scripts/add-new-models.ts`, `scripts/data/`, two tests). Production cannot receive
any of it until it is committed, pushed and merged.

### Production — a demo, not a shop

Measured on the live site today:

| Finding                                                                                                                                                                      | Evidence                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Every one of the 50 products says **"נתוני הדגמה בלבד — לא מוצר אמיתי"** and has a `demo-` slug (`/product/demo-aurora-ring`); 2 carry invented certificate numbers `DEMO-…` | crawl of all 50 product pages: 50/50 flagged, 2 `תעודה:` |
| **18K still offered** on 20 products (the shop is 14K only)                                                                                                                  | crawl                                                    |
| Two products claim stock ("במלאי") the data can't back                                                                                                                       | `demo-nova-bracelet`, `demo-wedding-band`                |
| Whole site is **blocked from search**: `robots.txt` = `Disallow: /`, every page `noindex, nofollow, nocache`, no sitemap advertised                                          | `SITE_INDEXABLE` unset                                   |
| Catalogue is the old **50**; the local launch catalogue is **100** (50 new models missing)                                                                                   | sitemap: 50 product URLs                                 |
| No contact channel anywhere; `/contact` is a 404                                                                                                                             | `CONTACT_*` unset                                        |
| Every price labelled "משוער"; footer says prices are a preliminary estimate                                                                                                  | `PRICES_FINAL` unset                                     |
| **No favicon / app icon**, no `og:image`, no structured data, no canonical on `/` and `/faq`                                                                                 | HTML inspected                                           |
| Photos exist on R2 (1–2 per gold colour, no worn shots)                                                                                                                      | crawl                                                    |

Good news: the production **announcement bar is empty** — the "bwb" text I saw is only in the local
DB (`Announcement` row, active). Production migrations apply automatically on deploy
(`vercel-build` = `prisma migrate deploy && next build`); the _data_ scripts do not, which is why
production still looks like the old seed.

### Things that do not exist yet (real gaps, not polish)

1. **Payment.** `getPaymentProvider()` returns `null`. No gateway, no webhook. Checkout ends on a page
   that says "payment is not active". (TBD B1.)
2. **Invoices / receipts.** None. Israeli law requires a tax invoice/receipt per sale. (TBD B2.)
3. **Email.** No email at all: customers get no confirmation; the workshop is not notified of orders or
   custom requests — they must watch `/admin`. (TBD I2.)
4. **Legal pages.** Only `/legal/privacy`. No terms, returns/cancellation, shipping, accessibility
   statement, business details. (TBD L1–L4, L6.)
5. **A way to reach a human** (WhatsApp/phone/email) — PRODUCT.md's own success measure.
6. **A "mark as paid" path** if payment is not live on day 1 (`changeOrderStatus` does not touch
   `paymentStatus`, and the confirmation page keys on it).
7. **Monitoring / analytics / backups** (TBD I7, I8; Neon free tier suspends and has short history).

---

## 2. What I need from the owner (cannot be invented)

None of these can be guessed by the build. Each has a **default** so work isn't blocked; replace
the default when the real value arrives. Everything marked ⛔ blocks go-live.

| #   | Input                                                                                             | Default I'll use until supplied                         |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| O1  | ⛔ Payment provider account (terminal + API credentials)                                          | **Cardcom** (see §4.3)                                  |
| O2  | ⛔ Legal business name, ח.פ./ע.מ., address, VAT status                                            | none — footer/terms stay unlaunched                     |
| O3  | ⛔ WhatsApp number, phone, email shown to customers                                               | none — nothing shown                                    |
| O4  | ⛔ Production domain + DNS access                                                                 | `jewelery-store1.vercel.app`                            |
| O5  | ⛔ Lawyer-approved terms, returns/cancellation, shipping, accessibility statement, privacy update | structure + draft headings only (§4.4)                  |
| O6  | ⛔ Final prices (all 100) — export is the review workbook in `photo-kit/catalog/`                 | current prices, labelled "משוער" (`PRICES_FINAL=false`) |
| O7  | Neon + R2 credentials for the data/photo move                                                     | —                                                       |
| O8  | Email sending domain (e.g. orders@domain) + provider account                                      | **Resend**                                              |
| O9  | Natural vs lab per new model (script chose; D4D.37 says "the owner's to confirm")                 | script's choice                                         |
| O10 | Delivery promise: courier + days after the 10 business days of production (TBD B3/B5)             | "משלוח חינם" with no day count                          |
| O11 | VAT rate: `VAT_RATE_BPS` (1800 = 18%) if the business is a licensed dealer (עוסק מורשה)           | unset → VAT not stated                                  |

---

## 3. Critical path

Payment onboarding (business verification) and the lawyer are the long poles — **start both on
day 0**; everything else fits inside their wait.

```
Day 0  ─┬─ O1 apply for payment account ──────────────────────────────┐
        ├─ O5 send lawyer the §4.4 brief ─────────────────────────────┤
        └─ Phase A (code & data prep, below) ─ Phase B (staging) ─────┴─ Phase C (cut-over) ─ Phase D (open)
```

---

## 4. Plan

### Phase A — Make the code launchable (branch `launch/final` off `fix/launch-blockers`)

**A1. Save the work.** Commit the 23 modified + 6 untracked paths in logical commits (WIP
features / the two migrations / scripts+data / tests). Re-run `npm run verify`. Open a PR to `master`
(CI runs the same verify with a Postgres service).

**A2. Remove the "הדמיה" label for good** (owner decision).

- `src/components/product/ProductGallery.tsx` (~line 173): delete the `active?.isSimulation && <Badge …>הדמיה</Badge>` block.
- `src/components/admin/ImageManager.tsx` (lines ~157, 188, 236): remove the badge, the "סימון כהדמיה" toggle and the checkbox copy, so the label cannot come back by accident. Leave the `isSimulation` column in the schema (no migration needed).
- Update `ProductGallery.test.tsx` / `ProductDetailView.test.tsx` expectations; add a test that no "הדמיה" text renders for an image with `isSimulation: true`.
- Data side is Phase C (set the 323 flagged images to `false`).
- ⚠️ One honest risk to accept knowingly: Israeli consumer-protection law forbids misleading
  presentation. Every generated image must show the piece accurately (stone count, shape, true
  scale, correct gold colour). The photo audit lists the checks; keep the worn shots to the ones
  that pass.

**A3. Contact.** Nothing to code — set `CONTACT_WHATSAPP/PHONE/EMAIL` (Phase C). Then verify: nav item,
footer column, product-page prompt and `/contact` appear. Add the business details block (O2) to
`Footer.tsx`.

**A4. Legal pages** (content from O5; build the shells now):
`/legal/terms`, `/legal/returns`, `/legal/shipping`, `/legal/accessibility`, each linked from the
footer ("מידע") and from checkout. Add a **required consent checkbox** at checkout step 3 ("קראתי
ואני מאשר/ת את התקנון ומדיניות הביטולים") stored on the order (add a column + migration; keep the
accepted-terms version string). Update `/legal/privacy` for payment, email and any analytics
(it currently says "no analytics, no payment") and for the new processors.

**A5. Payment + invoice** (the big item; ~2–4 days once credentials exist).
Implement `PaymentProvider` in `src/lib/payments/` exactly as the port's own comment prescribes:

1. `cardcom.ts`: create a hosted-page session (Cardcom "Low Profile") with the order number, total in
   agorot→ILS, customer name/email, return URL, **and a document (tax invoice/receipt) attached** so
   Cardcom issues the invoice with the charge. Card data never touches our server (PCI SAQ-A).
2. `src/app/api/payments/cardcom/route.ts`: server-to-server notification handler. **Never trust the
   browser redirect.** Re-query the transaction result from Cardcom with the low-profile id, verify
   amount == `order.totalAgorot` and order number, then in one transaction: insert `Payment`, set
   `paymentStatus=PAID` + `status=PAID`, write an `OrderStatusEvent`, `consumeReservation` for each
   hold. Idempotent (the notification will arrive more than once).
3. Add `CARDCOM_TERMINAL`, `CARDCOM_API_NAME`, `CARDCOM_API_PASSWORD` (optional, never defaulted) to
   `src/lib/env/schema.ts` and `.env.example`; `getPaymentProvider()` returns the provider only when set.
4. Integration test against the gateway's **test terminal** (a shared test terminal is reported in
   third-party docs — confirm in Cardcom's own V11 docs and with the vendor) + unit tests for amount
   mismatch, duplicate notification, tampered return.
5. Refunds: done by the owner in the Cardcom dashboard; add an admin "החזר בוצע" status event so the
   order record matches.

_If the owner prefers PayPlus (its payment-page API supports IPN carrying transaction + invoice
data and can generate a document automatically per transaction), the same four steps apply — only
`cardcom.ts` and the env names change. Tranzila is the weakest fit here: its invoicing story was not
clear in public docs._ Confirm fees and invoice features with the vendor; published fee figures
conflict between sources.

**A6. Fallback if payment isn't approved by launch day** (≈½ day, keeps the date): ship "order
request" mode — the order is saved, the shopper sees "we'll send a secure payment link on WhatsApp
within one business day", the owner takes payment through the provider's dashboard payment-link and
presses a new admin button "סמן כשולם" (sets `paymentStatus=PAID` and consumes the reservation).
Copy on cart/checkout/payment pages changes from "payment not active" to this flow. Do **not** launch
with the current "payment is not active, nothing charged" page.

**A7. Email** (Resend or equivalent; domain DNS: SPF/DKIM/DMARC).
`src/lib/email/` with a port like payments: (a) customer: order received + order paid (with invoice
link from the gateway); (b) **owner: new order, new custom request** (replaces the CLI
`requests:list`); (c) customer: custom-request received. Plain, RTL, Hebrew, sent from the
verified domain. Fail soft (never block an order on email) but log failures. Env: `EMAIL_API_KEY`,
`EMAIL_FROM`, `ORDER_NOTIFY_TO`.

**A8. SEO & sharing.**
`src/app/icon.png` + `apple-icon.png` (from the wordmark, see photo audit), `og:image` 1200×630 in
`layout.tsx` (+ `twitter:card=summary_large_image`), canonical for `/` and `/faq`, `Product` JSON-LD
(name, image, price in ILS, availability `PreOrder`/`InStock` as made-to-order dictates, brand),
`Organization` + `WebSite` JSON-LD on the home page. Keep `/search`, cart, checkout, order,
admin out of the sitemap (already so).

**A9. Product copy.** 46 of 100 products have a one-line description (list in §7). Write 35–60
word Hebrew descriptions: what it is, stones, finish, what can be customised. A draft for all 46
can be generated and then approved by the owner in one pass.

**A10. Admin hygiene.** Confirm `/admin` is not linkable from the storefront; confirm login
throttling (it exists — `LoginAttempt`) with a test against the real sign-in; create the real admin
accounts with `npm run admin:user -- add` (Phase C) and delete the local one.

**A11. Monitoring.** Add Vercel Analytics or Plausible (consent-free, update privacy text) and
Sentry (or Vercel's log drain) for server errors; set an uptime check on `/` and `/rings`.

### Phase B — Rehearse on a staging copy (never touch production first)

**B1. Back up production.** Neon console → create a **branch** `pre-launch-backup` of the production
DB (instant, free). Also `pg_dump` it locally:

```bash
pg_dump "<pooled Neon URL minus -pooler for direct>" --format=custom --file=prod-before-launch.dump
```

**B2. Make a rehearsal branch** `launch-rehearsal` from production in Neon, and a Vercel preview
deployment of `launch/final` whose `DATABASE_URL` points at it. All of Phase C runs here first.

### Phase C — Data and photo cut-over (project-sanctioned scripts, all idempotent, dry-run first)

Per D4D.37/38 the data does **not** ride on the deploy. Run these in order, first against the
rehearsal branch, then against production. Always `DIRECT` env var form:
`DATABASE_URL="<neon url>" node scripts/<script>.ts` (dry run), then add `--apply`.

| #   | Command                                                                                                                                                                                 | Why                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | (deploy `launch/final`; `prisma migrate deploy` runs in the build)                                                                                                                      | gets migrations `…gold_karat_labels`, `…men_department`, `…men_pendants`, promotions                                                                                                                                                                                     |
| C2  | `remove-demo-markers.ts` → `--apply`                                                                                                                                                    | drops `demo-` slugs, the disclaimer, the invented `DEMO-` certificates, false stock lines                                                                                                                                                                                |
| C3  | `fix-diamond-copy.ts` → `--apply`                                                                                                                                                       | removes the "lab-grown only" category text (still present on `/rings`)                                                                                                                                                                                                   |
| C4  | `fourteen-karat-only.ts` → `--apply`                                                                                                                                                    | archives the 18K variants. **Prints the list of ex-18K-only prices — owner reviews (O6)**                                                                                                                                                                                |
| C5  | `add-yellow-gold-variants.ts` → `--apply`                                                                                                                                               | yellow option for the six white/rose-only pieces                                                                                                                                                                                                                         |
| C6  | `add-new-models.ts` → `--apply`                                                                                                                                                         | creates the 50 new models, **hidden**                                                                                                                                                                                                                                    |
| C7  | `place-product-images.ts --dir <folder> --manifest <file>` **`--dry-run` first** for each manifest in `photo-kit/` (`fix/out`, `fix/out2`, `place`, `new-models/gemini/manifest*.json`) | uploads to R2 and attaches the photos; needs `MEDIA_*` + `DATABASE_URL` for production. Slots are matched on (variant, position), so re-running overwrites rather than duplicates. Compare the dry-run against production first: some old-model photos are already there |
| C8  | `add-new-models.ts --sync-colours`, then `--publish`                                                                                                                                    | offers each colour only where it has its photograph; shows models that have one                                                                                                                                                                                          |
| C9  | `prune-unservable-images.ts` → `--delete`                                                                                                                                               | removes seed placeholder rows that render as grey frames                                                                                                                                                                                                                 |
| C10 | SQL: `UPDATE "ProductImage" SET "isSimulation" = false WHERE "isSimulation";`                                                                                                           | owner decision: no "הדמיה". Expect **323** rows on the local data; count on production                                                                                                                                                                                   |
| C11 | Cleanup SQL: delete test rows — `Announcement` ("bwb" is local only; check prod is empty), coupons `DEMO10`/`QATEST10`, any test orders/requests                                        | nothing test-flavoured goes live                                                                                                                                                                                                                                         |
| C12 | `npm run search:reindex`                                                                                                                                                                | rebuilds search documents                                                                                                                                                                                                                                                |
| C13 | `npm run admin:user -- add --email … --name …` (twice: owner + one backup)                                                                                                              | real admin accounts; password printed once; change it at first sign-in                                                                                                                                                                                                   |

**Verify the rehearsal** (same as §6 smoke tests) before touching production. Expected end state:
100 live products, 0 `demo-` slugs, 0 pages containing "הדגמה"/"DEMO", 0 mentions of 18K as an
orderable option, 0 images with `isSimulation`, every product ≥3 photos for its lead colour
(gaps → photo audit).

### Phase D — Configure and open

**D1. Vercel environment variables (Production):**

| Variable                                                                                   | Value                                                               |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `DATABASE_URL`                                                                             | Neon **pooled** URL (host contains `-pooler`)                       |
| `NEXT_PUBLIC_SITE_URL`                                                                     | the real origin, no trailing slash (**build-time**: redeploy after) |
| `SITE_INDEXABLE`                                                                           | `true` — **last step, only after §6 passes**                        |
| `PRICES_FINAL`                                                                             | `true` once O6 is signed off                                        |
| `CONTACT_WHATSAPP` / `CONTACT_PHONE` / `CONTACT_EMAIL`                                     | O3                                                                  |
| `VAT_RATE_BPS`                                                                             | `1800` if VAT-registered (O11)                                      |
| `MEDIA_S3_ENDPOINT/REGION/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL` | already set — confirm all six                                       |
| `CARDCOM_*`, `EMAIL_*`, `ORDER_NOTIFY_TO`                                                  | from A5/A7                                                          |

**D2. Neon:** move off the free tier (it suspends on idle → slow first request; limited restore
window). Keep a daily backup (`pg_dump` cron or Neon point-in-time restore on a paid plan).

**D3. Domain:** add domain in Vercel → set DNS → set `NEXT_PUBLIC_SITE_URL` → redeploy. Redirect
`www`↔apex. Confirm HTTPS + HSTS.

**D4. Open to search:** set `SITE_INDEXABLE=true` → redeploy → confirm `robots.txt` shows `Allow: /` and a
`Sitemap:` line and that pages no longer carry `noindex`. Submit `/sitemap.xml` in Google Search
Console and verify the domain.

---

## 5. Rollback

- **Code:** Vercel → Deployments → previous production deployment → Promote (instant).
- **Data:** every C-step is idempotent and the scripts only archive, never delete (except
  demo certificates and unservable image rows). Full reset: restore the Neon branch
  `pre-launch-backup` (B1).
- **Money:** if payment misbehaves, set `CARDCOM_*` empty → site falls back to A6 mode without a deploy
  of new code (the provider returns `null`).
- **Search exposure:** `SITE_INDEXABLE=false` + redeploy re-closes the site to crawlers (already-indexed
  pages drop over days via `noindex`).

---

## 6. Go-live acceptance checklist (run on rehearsal, then on production)

Automated (re-run `node` crawl used in this audit; expected values in brackets):

- [ ] `/sitemap.xml`: 100 product URLs, every one returns 200 [100/100]
- [ ] No page text contains `הדגמה`, `DEMO`, `bwb`, `18 קראט` as an orderable option, `הדמיה`
- [ ] No `demo-` in any URL; `/product/aurora-ring` is 200, `/product/demo-aurora-ring` is 404 (or add a 301 for any shared old links)
- [ ] `robots.txt` allows `/`, disallows `/cart /checkout /order /admin /search /api/`, advertises sitemap
- [ ] Each page: one `h1`, `lang=he dir=rtl`, canonical, `og:image` present; JSON-LD valid (Google Rich Results test) on 3 products
- [ ] Footer shows business details, contact channels, privacy/terms/returns/shipping/accessibility
- [ ] Favicon + apple-touch icon load; share link preview shows the OG image

Manual (desktop + 390px phone; Chrome + Safari iOS):

- [ ] Add ring (size) → cart → coupon → checkout → pay with the provider's **test card** → confirmation page → emails (customer + owner) → invoice link → admin shows order PAID
- [ ] Failed card / abandoned payment → order stays awaiting payment, stock released after expiry
- [ ] Duplicate gateway notification does not double-consume stock or duplicate the Payment row
- [ ] Custom request with an image upload → saved → owner email → visible in `/admin/requests`
- [ ] Name-necklace / engraving flows preview correctly (Hebrew letters)
- [ ] Mega-menu, search overlay, filters, sort, pagination, wishlist; 404 page
- [ ] Keyboard-only pass on home → PDP → checkout; screen-reader landmarks (A11Y-1 fixed)
- [ ] Lighthouse mobile on `/`, `/rings`, one PDP: Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95. If LCP is slow, check hero/PDP image `sizes` and R2 caching
- [ ] A real order placed with a real card at 1 ₪–minimum, refunded, to prove the live terminal

---

## 7. Appendix

**Products with a one-line description (46) — copy to write in A9:**
ring-earring-set, solitaire-pendant, stud-earrings, bridal-trio, diamond-bangle, diamond-hoops,
emerald-cut-ring, pave-band, pear-solitaire, tennis-necklace, three-stone-ring, wide-band-ring,
chain-necklace, colored-diamond-ring, comfort-band, halo-ring, gift-set-delicate, heart-pendant,
huggie-earrings, initial-necklace, drop-earrings, name-bracelet, necklace-earring-set, photo-pendant,
princess-ring, rope-bracelet, princess-studs, nova-bracelet, hoop-earrings, pearl-studs,
paperclip-bracelet, chain-bracelet, charm-bracelet, climber-earrings, diamond-pendant,
bangle-bracelet, bar-necklace, large-hoops, layered-necklace, milgrain-band, signet-ring,
slim-tennis, stacking-ring, threader-earrings, twist-ring, wedding-band.

**Legal brief to send the lawyer (O5)** — obligations I could not verify against the statutes
and which the lawyer must confirm:

- Terms of sale and the **14-day consumer cancellation right** (Consumer Protection Law) and whether
  goods **made to the customer's specification** (engraved, custom-sized) are exempt, and the exact
  fee/refund rules.
- Required business disclosures on the site and in the order confirmation; tax invoice/receipt timing.
- **Accessibility statement** — Regulation 35 of the accessibility regulations (IS 5568 / WCAG 2.0 AA).
  Secondary sources say a statement is required even for businesses exempt by turnover, and
  that statutory damages without proof of loss are claimed in practice. A reform to Regulation 35 was
  reported as approved — confirm what applies on launch day. The site is built to WCAG 2.1 AA practices; ask whether a formal
  audit/accessibility coordinator is needed.
- Disclosure wording for **lab-grown vs natural diamonds** and for **gold fineness marking
  (14K / 585 stamp)** on products sold in Israel (TBD L11).
- Privacy policy update (payment processor, email provider, analytics, retention — TBD L10/I11).

**Out of scope for launch (post-launch backlog):** customer accounts, reviews, newsletter
(`marketingOptIn` stays false), WhatsApp notifications (owner preference, TBD I2), 3D/AR, a
printable ring sizer.
