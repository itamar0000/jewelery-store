# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hebrew-speaking buyers in Israel, shopping in ILS, reading right to left.

**No single primary audience — confirmed by the owner.** The three real buying
situations carry roughly equal weight, and the site is therefore built around
the catalogue rather than around one funnel:

- **Bridal.** Engagement and wedding rings. The largest sum, the most
  competitive category, and the buyer who needs the most reassurance before
  committing.
- **Gift.** A partner, a mother, a birthday, a holiday. This buyer usually does
  not know diamond terminology and is choosing on feeling and on trust.
- **Self-purchase.** Women buying their own everyday or celebratory piece. Knows
  what she wants and compares design across shops.

A consequence worth stating: no page may assume the visitor knows what VS1,
14K, or a carat bucket means, and no page may talk down to the one who does.

## Product Purpose

Sell gold and diamond jewellery made to order, with genuine per-piece
customisation, directly from the people who manufacture it.

Success is a buyer who understands what they are ordering — metal, stone, size,
engraving — trusts that it will be made properly, and can reach a human before
paying.

## Positioning

**Manufacturer-direct.** Confirmed by the owner as the real advantage, and it is
two facts that only hold together:

1. **Own manufacturing in Israel.** The workshop is theirs, which is why every
   model in the catalogue can actually be altered — karat, gold colour, size,
   length, engraving, stone — rather than only the variants a supplier happens
   to stock.
2. **No retail middleman in the price.** The same piece does not carry a chain
   store's margin.

A reseller can copy the photographs and the catalogue structure. It cannot copy
either of these, because both are consequences of owning the production. Every
claim the site makes about customisation traces back to fact 1; that is what
makes "we can make any of these your way" true rather than marketing.

## Operating Context

- **Made to order is the norm, not an upsell.** Pieces are manufactured after
  the order, so lead time is a real part of the purchase and stock scarcity
  mostly is not.
- **Customisation axes that genuinely exist:** gold karat (14K / 18K), gold
  colour (yellow / white / rose), ring size, chain length, engraving, and stone
  choice.
- **Both natural and lab-grown diamonds are sold.** The catalogue carries both,
  so no site-level text may position the shop as exclusively one or the other.
  Stone type is a per-product fact.
- **Engraved and personalised pieces are a real product line,** not a gimmick:
  initial necklace, name necklace, name bracelet, photo pendant. These are
  ordered with the customer's own letter, name, or photograph.

## Capabilities and Constraints

**Built and working:** catalogue of 51 products across rings, necklaces,
earrings, bracelets and sets; category and product pages; variant selection
across karat, gold colour and size; filtering, sorting and pagination; search;
real product photography (153 images at 2048px); a guest cart and a checkout
that places a real order, awaiting payment, and stops there.

**Undecided or not yet real — must not be presented as settled:**

- **Prices are placeholders.** Every price in the database is fabricated. The
  owner has confirmed this is handled separately. Until real prices land, the
  site is deliberately kept out of search results (`SITE_INDEXABLE=false`), and
  no page may present a price as a figure anyone can act on.
- **No contact channel is live yet.** The owner has no WhatsApp number wired in.
  A site that invites a conversation it cannot receive is worse than one that
  does not invite it, so any contact affordance must be real before it ships.
- **Payment, invoicing, shipping and email providers are all unchosen.** The
  checkout ends on a page that says payment is not active and nothing was
  charged; no page may suggest a purchase was completed.
- **Shipping is free** (owner, 2026-10-05). Delivery times are not yet set.

**Products are representative, and that distinction matters.** The catalogue
pieces are not photographs of existing inventory, but the owner has confirmed
every one of them can actually be manufactured. They are therefore honest
demonstrations of the product, and the site may present them as things it makes.
The prices are the fabricated part, not the jewellery.

## Brand Commitments

- **Name:** "Jewelry for Less", chosen by the owner and replacing the earlier
  placeholder "עדי". It is Latin on a Hebrew page, which is ordinary in this
  market and is handled with a direction isolate wherever it renders.
- **The name makes a price claim, and the catalogue can back it.** "For less"
  is only honest because the shop manufactures its own pieces and carries no
  retail middleman's margin — the positioning above. It follows that the site
  may compare itself on price, and equally that it must not undercut the claim
  by reading as a discounter: the design answer to a value name is a
  confident presentation, not a cheap one.
- **No logo exists.** There is no symbol or mark to incorporate, so the identity
  is the site's to establish. A wordmark is authorable; a pre-existing logo is
  not being ignored.
- **No black-and-gold "luxury" styling.** A standing constraint from the
  project's own specification (section 2): the genre's most common shorthand for
  expensive is explicitly ruled out.
- **Nothing weird.** The owner's own constraint on the redesign: the result must
  read as heavily invested in, not as experimental. Commitment is wanted;
  gimmickry is not.

## Evidence on Hand

- **Real product photography** — 153 images, 2048px, covering every product and
  colourway.
- **Real past customers exist, and they have not been asked yet.** The owner
  confirmed there are people who bought previously and could give a testimonial,
  but no testimonial has been collected. **Nothing may be written as a customer
  quote, star rating, review count, or named reference until the owner supplies
  real ones.** A place for them may be built; words may not be invented for it.
- **No physical shop or studio is confirmed** as a visitable or photographable
  place, so the site may not claim one, show a storefront, or invite a visit.
- **No press, awards, certifications, partner logos, years-in-business figure or
  customer count** has been established. All of these are absent, not merely
  undocumented.

## Product Principles

1. **A price is the one thing a shopper is entitled to rely on.** While the
   prices are placeholders, the site stays out of search and never dresses a
   placeholder as a real figure.
2. **Every customisation claim traces to owning the workshop.** The site may
   promise alteration freely because that freedom is a fact of how the pieces
   are made — and may promise nothing else it cannot trace.
3. **Serve the novice and the knowledgeable in the same layout.** Terminology is
   explained where it appears rather than assumed or removed.
4. **Trust is earned with real material or not at all.** An empty testimonial
   slot is honest; an invented quote is not, and this catalogue's provisional
   prices make fabricated proof especially corrosive.
5. **Made to order sets the rhythm.** Lead time and personalisation are the
   normal path through the site, not an exception handled at checkout.

## Accessibility & Inclusion

Hebrew RTL is the document's native direction, with Latin islands (VS1, 14K,
certificate terms) set LTR inside Hebrew copy. Pinch-zoom is never capped.
Contrast is measured against the surface tokens rather than assumed. The
specific compliance standard remains a legal determination and is undecided.
