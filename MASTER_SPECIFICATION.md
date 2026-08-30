# JEWELRY E-COMMERCE — MASTER SPECIFICATION

## Version 1.0

**Status:** Draft / Source of Truth
**Market:** Israel
**Language:** Hebrew
**Direction:** Modern Luxury Boutique + Accessible Pricing
**Primary Business Model:** Gold jewelry with lab-grown diamonds, primarily made-to-order with available inventory.

---

# 1. Project Vision

Build a premium Hebrew e-commerce jewelry website for a jewelry business focused on:

* Gold jewelry
* Lab-grown diamonds
* Personalized jewelry
* Accessible pricing
* Primarily female customers
* Israel-only sales
* A combination of ready-to-ship inventory and Made-to-Order products

The website should feel like a **modern boutique jewelry brand**, not like a generic marketplace.

The desired customer reaction:

1. Immediate visual "WOW"
2. Perception of quality and craftsmanship
3. Easy discovery of beautiful products
4. Clear, trustworthy product information
5. Strong perception of value
6. Frictionless purchase experience

Pricing is strategically important, but the website should **not look cheap** or aggressively communicate "cheap prices."

The product quality and visual presentation create the premium perception; the actual price creates the value surprise.

---

# 2. Brand Direction

## Current brand direction

**Working concept:** Jewelry with personalized design / custom jewelry.

Brand name: `TBD`

Logo: `TBD`

Typography: `TBD`

Photography direction: `TBD`

Final brand identity: `TBD`

## Visual direction

Initial design direction:

* White
* Warm cream
* Pearl / off-white tones
* Black typography
* Minimal visual clutter
* Modern luxury
* Boutique feeling
* High-quality product photography
* Generous whitespace

Avoid:

* Excessive black + gold "luxury" styling
* Cheap marketplace aesthetics
* Excessive promotional badges
* Visually noisy layouts
* Excessive animations
* Aggressive discount presentation

---

# 3. Target Audience

Primary audience:

**Women**

Including:

* Women buying jewelry for themselves
* Brides
* Women preparing for weddings
* Women looking for gifts
* Women looking for personalized jewelry
* Women looking for everyday luxury

The website should primarily speak to women.

The website should not be designed primarily around men buying gifts, even though men may naturally purchase products.

---

# 4. Geographic Scope

Initial market:

**Israel only**

Language:

**Hebrew**

Currency:

**Israeli Shekel (₪ / ILS)**

Shipping:

**Home delivery**

Exact shipping provider, pricing and SLA: `TBD`

International shipping: **Not required for MVP**

---

# 5. Product Catalog

Estimated launch catalog:

**~100 products**

Product categories:

## Rings

* All Rings
* Engagement Rings
* Diamond Rings
* Wedding Rings
* Gold Rings
* Rings with Colored Diamonds

## Earrings

* All Earrings
* Diamond Earrings
* Hoop Earrings
* Drop Earrings
* Stud Earrings

## Necklaces

* All Necklaces
* Gold Necklaces
* Diamond Necklaces
* Pendants
* Name Necklaces
* Photo Necklaces

## Bracelets

* All Bracelets
* Tennis Bracelets
* Diamond Bracelets
* Gold Bracelets
* Delicate Bracelets
* Link Bracelets

## Sets

* All Sets
* Ring + Earrings
* Necklace + Earrings
* Bridal Sets
* Gift Sets

## Additional discovery areas

* All Jewelry
* Gifts
* New Arrivals
* Best Sellers
* Bridal
* Personalized / Custom Jewelry
* Guides / FAQ

Additional collections can be added later.

---

# 6. Navigation Architecture

## Desktop

Desktop must use visible navigation.

**Do NOT use a hamburger menu on desktop.**

Primary navigation:

* Rings
* Earrings
* Necklaces
* Bracelets
* Sets
* Gifts
* Custom Jewelry
* Guides / FAQ

Right-side utilities:

* Search
* Wishlist
* Cart
* Account

## Mega Menu

Main product categories should use Mega Menus.

Example:

Rings:

### Categories

* Engagement Rings
* Diamond Rings
* Wedding Rings
* Gold Rings
* Colored Diamond Rings

### Additional discovery

* New Arrivals
* Best Sellers
* Relevant collections

Mega Menu design should remain clean and visually premium.

Do not overload the navigation with every available filter.

---

# 7. Mobile Navigation

Mobile may use a hamburger menu.

Primary mobile controls:

* Menu
* Search
* Cart

The mobile menu should expose:

* Main categories
* Subcategories
* Gifts
* Custom Jewelry
* Guides / FAQ
* Account
* Wishlist

Navigation must remain easy to scan.

---

# 8. Category Navigation vs Filters

These are separate concepts.

## Navigation

Used to answer:

> "What type of product am I looking for?"

Example:

Rings → Engagement Rings

## Filters

Used to answer:

> "Which exact product is right for me?"

Example:

Engagement Rings:

* Price
* Gold karat
* Gold color
* Diamond shape
* Carat
* Size
* Style

Both systems should exist.

---

# 9. Category Pages

Every main category should have:

1. Breadcrumbs
2. Category title
3. Short category introduction
4. Subcategory navigation
5. Filter controls
6. Sort controls
7. Product count
8. Product grid
9. Pagination or infinite loading
10. Relevant SEO content where appropriate

Example:

```text
Rings

[All] [Engagement] [Diamond] [Wedding] [Gold] [Colored Diamonds]

24 products

[Filter]                              [Sort]

PRODUCT GRID
```

---

# 10. Filtering System

Filters should be **category-aware**.

Do not display irrelevant filters.

## General filters

Potential shared filters:

* Price
* Gold karat
* Gold color
* Style
* Availability

## Ring filters

* Ring size
* Diamond shape
* Carat
* Diamond color
* Diamond clarity
* Cut

## Necklace filters

* Length
* Gold color
* Gold karat
* Pendant type
* Personalization

## Bracelet filters

* Length
* Gold color
* Gold karat
* Style

## Earrings

* Gold color
* Gold karat
* Style
* Diamond characteristics

Final filter list: `TBD` during implementation.

---

# 11. Product Architecture

Important architectural principle:

**Product != SKU**

A product can have multiple variants.

Example:

### Product

`Aurora Ring`

### Variants

* 14K Yellow Gold
* 14K White Gold
* 14K Rose Gold
* 18K Yellow Gold
* 18K White Gold
* 18K Rose Gold

Each variant may have:

* SKU
* Price
* Inventory
* Images
* Availability
* Possibly different technical specifications

---

# 12. Gold Options

Gold options:

## Karat

* 14K
* 18K

## Color

* Yellow Gold
* White Gold
* Rose Gold

Gold selection must be reflected clearly in the product UI.

Changing the selected gold option may change:

* Product images
* Price
* SKU
* Inventory
* Availability
* Technical information

The UX should feel like a normal e-commerce variant selector.

---

# 13. Inventory

Each variant should support inventory independently.

Inventory status:

* In Stock
* Made to Order
* Out of Stock

The website should not constantly display low-stock messaging.

Low-stock messaging should appear only when inventory is genuinely low.

Example:

> Only 2 left

Threshold: `TBD`

---

# 14. Made-to-Order

Made-to-Order is a major part of the business.

Many products may be produced after purchase.

Products should support:

* In-stock fulfillment
* Made-to-Order fallback

When an item is not available in stock but can be produced:

Display a clear option such as:

> Made to Order

with the relevant preparation time.

Preparation time may vary by product.

Therefore the system must support:

**Per-product / per-variant preparation time**

Exact wording and durations: `TBD`

---

# 15. Ring Sizes

Ring products must support size selection.

UX should include:

* Size selector
* Clear available sizes
* Unavailable sizes
* Size guide

Required feature:

**"How do I know my ring size?"**

This opens a clear ring-size guide.

If a required size does not exist as a standard selection, the system should support a custom-order path.

---

# 16. Necklace Lengths

Necklace products may support standard lengths.

Example structure:

* 40cm
* 45cm
* 50cm

Exact available lengths vary by product.

---

# 17. Bracelet Lengths

Bracelets may support standard lengths.

Example:

* 16cm
* 17cm
* 18cm
* 19cm

Exact available lengths vary by product.

---

# 18. Personalized Products

Personalized products may include fields such as:

* Name
* Text
* Language
* Style
* Length
* Other product-specific customization

The system must support **dynamic customization fields per product**.

Do not hard-code all customization fields globally.

Example:

```text
Name:
[____________]

Language:
[ Hebrew / English ]

Text / notes:
[____________]
```

The customized information must be saved with the cart item and order.

---

# 19. Custom Jewelry Requests

Dedicated section:

**Custom Jewelry / Design Your Own Jewelry**

Purpose:

Allow a customer to submit an idea for a new piece that may not exist in the catalog.

Customer can provide:

* Jewelry type
* Uploaded image
* Description
* Additional details
* Potential budget (optional / TBD)
* Contact information

Example flow:

```text
Custom Jewelry

Have an idea for a piece?

[ Upload Image ]

Jewelry Type
[ Ring / Necklace / Bracelet / Earrings / Other ]

Describe your idea
[....................]

Additional Details
[....................]

[ Submit Request ]
```

After submission:

```text
Request received

We will review your idea and contact you with a quote.
```

Admin workflow:

* New
* Reviewing
* Quote Sent
* Customer Approved
* Production
* Completed
* Rejected / Cancelled

---

# 20. Product Page

Product page is one of the most important pages in the system.

Required structure:

## Top area

Left:

* Product gallery
* Main image
* Additional images
* Variant-specific images
* Video support if available

Right:

* Product name
* Rating / reviews
* Price
* Gold options
* Karat options
* Size / length options
* Customization fields
* Availability
* Made-to-Order information
* Add to Cart
* Wishlist

## Information sections

* Description
* Product details
* Gold details
* Diamond details
* Certificate information
* Size guide
* Shipping
* Returns
* Warranty
* Reviews

## Related content

* You may also like
* Similar products
* Recently viewed

---

# 21. Diamond Information

Products containing diamonds should support:

* Lab-grown diamond identification
* Carat
* Color
* Clarity
* Cut
* Shape
* Certificate

The data model must allow these fields to be optional when they are not relevant.

Certificate support should be flexible.

Certificate issuer/type: `TBD`

---

# 22. Shopping Cart

Cart must support:

* Product image
* Product name
* Variant
* Gold color
* Gold karat
* Size / length
* Personalization
* Quantity
* Price
* Remove item
* Update quantity

Cart summary:

* Subtotal
* Shipping
* Discounts
* Total

Coupon input must be supported.

---

# 23. Checkout

Checkout must support:

### Customer information

* Full name
* Email
* Phone

### Shipping

* Address
* City
* Street
* House number
* Apartment
* Postal code
* Additional instructions if needed

### Payment

Israeli payment provider.

Specific provider: `TBD`

### Order completion

After successful payment:

* Show confirmation page
* Generate order number
* Send confirmation email
* Trigger invoice/receipt workflow
* Store order details

---

# 24. Guest Checkout

Customers must be able to purchase without creating an account.

However, account creation should be strongly encouraged.

Example:

```text
Create an account

✓ Track your orders
✓ Save your favorites
✓ Faster checkout next time

[ Create Account ]

-----------------

Continue without registration
```

"Continue without registration" should remain available in smaller secondary styling.

The experience should **never force account creation**.

---

# 25. Authentication

Initial supported authentication:

* Google
* Email + Password

Future providers may be added.

---

# 26. Wishlist

Users can favorite products.

Wishlist icon:

♡

Logged-in users:

* Favorites persist to account

Unauthenticated users:

When clicking wishlist, show a lightweight prompt:

> Log in to save this item to your favorites.

Do not unnecessarily interrupt browsing.

---

# 27. Search

Search should be designed as a **smart e-commerce search system**.

It should eventually understand queries such as:

* טבעת זהב לבן
* צמיד טניס
* עגילי יהלום
* שרשרת שם
* טבעת עד 3000

MVP may begin with standard product search, but the architecture should allow future semantic / intelligent search.

Search UX should include:

* Search overlay
* Popular searches
* Live suggestions
* Products
* Categories
* Relevant collections

---

# 28. Collections

Collections should exist independently from the core product categories.

Examples:

* New Arrivals
* Best Sellers
* Bridal
* Everyday
* Personalized
* Diamond Collection
* Seasonal collections

A product can belong to multiple collections.

Collections should be manageable through Admin.

---

# 29. Gifts

Gift discovery should exist as a separate discovery layer.

Exact navigation structure is `TBD`.

Potential groupings:

* Birthday
* Anniversary
* Engagement
* Wedding
* Self-gift
* By budget

Do not lock final copy or segmentation yet.

---

# 30. Bridal Section

The site should support a dedicated bridal discovery experience.

Potential content:

* Bridal rings
* Bridal earrings
* Bridal necklaces
* Bridal bracelets
* Bridal sets
* Wedding-oriented collections

This may initially be a Homepage section / landing page rather than a primary product category.

---

# 31. Homepage

Homepage structure is intentionally flexible at this stage.

Current planned sequence:

```text
HEADER
↓
HERO
↓
CATEGORY DISCOVERY
↓
BEST SELLERS / FEATURED PRODUCTS
↓
LAB-GROWN DIAMOND / VALUE EDUCATION
↓
FEATURED COLLECTIONS
↓
CUSTOM JEWELRY
↓
BRIDAL SECTION
↓
REVIEWS / SOCIAL PROOF
↓
RECENTLY VIEWED / PERSONALIZED CONTENT
↓
FAQ / EDUCATIONAL CONTENT
↓
NEWSLETTER / CONTACT
↓
FOOTER
```

Exact section order and visual treatment will be finalized during UI design.

Hero visual concept:

**TBD**

Possible direction:
Craftsmanship / jewelry setting / creation process / close-up product imagery.

---

# 32. Product Discovery on Homepage

Primary discovery mechanism:

**Category cards**

Main categories:

* Rings
* Earrings
* Necklaces
* Bracelets
* Sets

The first product discovery area should prioritize clear navigation rather than overwhelming the user.

---

# 33. Educational Content

The site should include educational content.

Potential areas:

### Lab-Grown Diamonds

* What is a lab-grown diamond?
* Carat
* Color
* Clarity
* Cut
* Diamond shapes
* Certificates

### Jewelry Guides

* Ring sizing
* 14K vs 18K
* Gold colors
* Jewelry care
* How to choose jewelry

The site should have a combined **Guides / FAQ** discovery area.

Long-form content can later expand into a blog / guides system.

---

# 34. Reviews

The system should support:

* Star rating
* Written review
* Customer name
* Optional image
* Product association

Review moderation must exist in Admin.

---

# 35. Instagram / Social

Instagram integration is **not required initially**.

Architecture should allow future addition.

Do not make Instagram a core dependency.

---

# 36. WhatsApp

The site should provide access to a business WhatsApp contact.

Potential placements:

* Header / contact area
* Product page
* Custom jewelry page
* Footer
* Floating WhatsApp button

The exact placement and number are `TBD`.

WhatsApp should support the business without overpowering the e-commerce experience.

---

# 37. Discounts and Coupons

The system must support:

## Coupons

* Coupon code
* Percentage discount
* Fixed amount discount
* Start date
* End date
* Usage limits
* Minimum order amount if needed

## Promotions

Support occasional promotional campaigns.

Examples:

* Percentage discount
* Product/collection discount
* Bundle offer
* Free shipping campaign

No permanent aggressive discounting.

Countdown timers and artificial urgency are **not required for MVP**.

---

# 38. Accounts

Customer account area should eventually include:

* Profile
* Orders
* Order details
* Favorites
* Saved information

Account creation must never be required for purchase.

---

# 39. Order Management

Admin must support:

* View orders
* Payment status
* Order status
* Customer details
* Product details
* Variant details
* Personalization details
* Shipping information
* Internal notes

Suggested order lifecycle:

```text
Pending Payment
→ Paid
→ Processing
→ Ready / Fulfilled
→ Shipped
→ Delivered
→ Completed
```

Exact statuses may be refined.

---

# 40. Admin Dashboard

Admin is required.

## Dashboard

Show useful business metrics such as:

* Sales
* Orders
* Average order value
* Best-selling products
* Low-stock products
* Pending custom requests
* Recent orders

## Products

* Create
* Edit
* Archive
* Manage variants
* Manage inventory
* Manage images
* Manage categories
* Manage collections
* Manage pricing

## Orders

* View
* Filter
* Update status
* Add notes

## Customers

* View customers
* View order history

## Custom requests

* Review submitted requests
* View images
* Communicate status
* Add quote
* Track progress

## Coupons

* Create
* Edit
* Activate
* Deactivate

## Reviews

* Approve
* Reject
* Moderate

## Content

* Homepage sections
* Collections
* FAQ
* Guides

---

# 41. Product Management UX

Adding a product should be straightforward for a non-technical business owner.

Product creation should support:

### General

* Name
* Description
* Category
* Collections

### Pricing

* Price
* Compare-at price if needed
* Variant-specific pricing

### Gold

* Karat
* Color

### Jewelry specifications

Category-specific fields

### Diamonds

* Carat
* Color
* Clarity
* Cut
* Shape
* Certificate

### Inventory

* Stock
* SKU
* Made-to-Order
* Preparation time

### Media

* Images
* Variant-specific images
* Video

### Personalization

* Custom fields

---

# 42. Technical Architecture

Preferred initial direction:

## Frontend

* Next.js
* TypeScript
* Tailwind CSS

## Backend

Next.js backend/API or dedicated application layer as appropriate.

## Database

* PostgreSQL

## ORM

* Prisma

## Authentication

* Google OAuth
* Email + Password

## Hosting

* Vercel

## Image / Media storage

`TBD`

Possible:

* Cloudinary
* S3-compatible object storage

## Email

`TBD`

Possible:

* Resend

## Payments

Israeli payment provider supporting:

* Credit cards
* Relevant Israeli payment methods as available

Provider: `TBD`

## Invoice / Receipt

Use an external Israeli accounting/invoicing service.

Do not build legal invoice infrastructure from scratch unless explicitly required later.

Provider: `TBD`

---

# 43. Data Model Principles

Important principles:

1. Product and Variant are separate entities.
2. Inventory belongs at the variant level.
3. Images may belong to a product or variant.
4. Pricing may vary by variant.
5. Product attributes must support category-specific fields.
6. Customization fields must be configurable.
7. Collections must be independent from categories.
8. Orders must preserve the exact product configuration purchased.
9. Historical order data must not change when a product is later edited.
10. Pricing at time of purchase must be stored in the order item.
11. Personalization submitted by a customer must be immutable within the finalized order record.
12. Archive rather than destructively deleting products referenced by historical orders.

---

# 44. SEO

The website should be built SEO-first.

Requirements:

* Clean URLs
* Metadata per page
* Product metadata
* Category metadata
* Open Graph
* Canonical URLs
* Sitemap
* Robots.txt
* Structured data
* Product schema
* Breadcrumb schema where appropriate
* Hebrew SEO
* Fast loading
* Optimized images

Potential URL structure:

```text
/rings
/rings/engagement-rings
/product/aurora-ring
/earrings
/necklaces
/bracelets
/custom
/guides
```

Final URL conventions: `TBD`

---

# 45. Analytics

Architecture should support:

* Google Analytics
* Google Tag Manager
* Meta Pixel

Track at minimum:

* Page views
* Product views
* Search
* Add to cart
* Begin checkout
* Purchase
* Wishlist
* Coupon usage
* Custom jewelry request
* Sign up

Analytics provider configuration: `TBD`

---

# 46. Performance

The website should prioritize:

* Fast initial load
* Optimized images
* Responsive images
* Lazy loading where appropriate
* Minimal JavaScript where unnecessary
* Good Core Web Vitals
* Mobile performance

Luxury design must not come at the cost of performance.

---

# 47. Accessibility

The website must include:

* Keyboard navigation
* Accessible labels
* Sufficient contrast
* Semantic HTML
* Accessible forms
* Accessible dialogs
* Screen-reader-friendly controls
* RTL support

Accessibility compliance requirements: `TBD`

---

# 48. Security

Required:

* Secure authentication
* Password hashing
* Secure sessions
* Input validation
* Server-side authorization
* Payment-provider security
* Protection against common web vulnerabilities
* Secure file uploads
* Rate limiting where appropriate
* No sensitive payment data stored unnecessarily

The application must never trust client-side pricing or inventory data.

---

# 49. RTL

The entire customer-facing experience is RTL.

Requirements:

* Hebrew typography
* RTL layout
* Correct icon positioning
* Correct responsive behavior
* Proper numeric handling
* Proper prices and currency formatting

English may appear in product specifications where relevant, such as:

* Round
* Oval
* VS1
* 14K
* 18K
* Rose Gold

---

# 50. Mobile

Mobile is a first-class experience.

Must support:

* Mobile menu
* Mobile filters
* Swipeable product galleries
* Sticky Add to Cart where appropriate
* Touch-friendly controls
* Easy checkout
* Responsive variant selectors
* Responsive custom request form

Do not treat mobile as a reduced desktop version.

---

# 51. Footer

Footer should include:

### Shop

* Rings
* Earrings
* Necklaces
* Bracelets
* Sets
* Gifts

### Services

* Custom Jewelry
* Shipping
* Returns
* Warranty
* FAQ

### About

* About Us
* Guides

### Legal

* Terms
* Privacy
* Accessibility
* Cookies, if applicable

### Contact

* WhatsApp
* Email
* Phone
* Social media when available

---

# 52. Legal / Business Items

The following are required before launch and must be finalized based on the actual business setup and professional advice:

* Terms and conditions
* Returns / cancellations policy
* Shipping policy
* Warranty policy
* Privacy policy
* Accessibility statement
* Cookie/consent requirements where applicable
* Invoice / receipt workflow
* Payment terms

Legal text must not be invented by the development model as legal advice.

---

# 53. Explicit Non-Goals for MVP

Do NOT over-engineer the initial version with:

* International shipping
* Complex loyalty program
* Subscription
* Advanced CRM
* Large marketplace functionality
* Complex referral systems
* Artificial countdown marketing
* Excessive discount mechanics
* Full social network
* Multi-vendor support

Build the core business well first.

---

# 54. MVP Priority

## P0 — Must Work

* Homepage
* Desktop navigation
* Mobile navigation
* Categories
* Subcategories
* Product listing
* Filters
* Search
* Product page
* Variants
* Inventory
* Made-to-Order
* Size selection
* Length selection
* Personalization fields
* Cart
* Guest checkout
* Account creation
* Google login
* Email/password login
* Wishlist
* Coupon
* Payment
* Order confirmation
* Email confirmation
* Admin
* Product management
* Order management
* Custom jewelry requests

## P1 — Important

* Guides
* FAQ
* Reviews
* Collections
* Best Sellers
* New Arrivals
* Bridal section
* Recently viewed
* Advanced search

## P2 — Later

* Instagram integration
* Advanced recommendation engine
* Advanced personalization
* Additional payment methods
* Advanced customer segmentation
* Marketing automation
* Loyalty program

---

# 55. Development Rules for Claude Code

Claude Code must follow these rules.

## Rule 1 — Source of Truth

This document is the primary specification.

Do not silently change business requirements.

If implementation requires a decision not defined here:

1. Identify the missing decision.
2. Mark it as `TBD`.
3. Choose the safest reversible technical implementation where possible.
4. Do not invent business rules.

## Rule 2 — Small Phases

Never attempt the entire application in a single implementation step.

Build in phases.

## Rule 3 — Validate Every Phase

After every major implementation:

* Run type checks
* Run lint
* Run tests
* Run build
* Check database migrations
* Check affected user flows
* Fix errors before moving on

## Rule 4 — Do Not Break Existing Features

Before changing existing code:

* Understand the relevant architecture.
* Identify affected features.
* Make the smallest safe change.
* Re-run validation.

## Rule 5 — No Fake Functionality

Do not implement fake payments, fake inventory, fake successful checkout, or fake production integrations and present them as complete.

Mock integrations must be explicitly marked as mocks.

## Rule 6 — Preserve Historical Data

Orders must retain historical:

* Product name
* Variant
* Price
* Discount
* Gold selection
* Size
* Personalization
* Diamond specifications where relevant

Changing the current product must not alter old orders.

## Rule 7 — Production Thinking

Every feature must be designed with production deployment in mind.

---

# 56. Development Phases

## Phase 1 — Foundation

* Project setup
* Next.js
* TypeScript
* Tailwind
* Database
* Prisma
* Environment configuration
* Base architecture
* RTL foundation
* Design tokens

## Phase 2 — Data Model + Admin Foundation

* Product
* Variant
* Category
* Collection
* Inventory
* Customer
* Order
* Custom Request
* Coupon
* Review

Build admin foundation.

## Phase 3 — Storefront

* Header
* Navigation
* Mega Menus
* Homepage
* Category pages
* Product cards
* Search
* Filters

## Phase 4 — Product Experience

* Product page
* Variants
* Gallery
* Gold selection
* Sizes
* Lengths
* Personalization
* Inventory
* Made-to-Order

## Phase 5 — Cart + Accounts

* Cart
* Wishlist
* Auth
* Guest checkout foundation

## Phase 6 — Checkout + Payment

* Customer information
* Shipping
* Payment provider
* Order creation
* Confirmation
* Emails

## Phase 7 — Custom Jewelry

* Custom request form
* File upload
* Admin workflow
* Request tracking

## Phase 8 — Content + Discovery

* Collections
* Guides
* FAQ
* Reviews
* Bridal
* Recently Viewed

## Phase 9 — Production Readiness

* SEO
* Analytics
* Performance
* Security
* Accessibility
* Error handling
* Monitoring

## Phase 10 — Full QA

Test:

* Desktop
* Mobile
* Different browsers
* Product variations
* Inventory
* Checkout
* Coupon logic
* Guest checkout
* Login
* Wishlist
* Custom requests
* Admin
* Error states
* Empty states
* Edge cases

---

# 57. Current Open Decisions / TBD

These must not be guessed prematurely:

* Brand name
* Logo
* Exact typography
* Final color palette
* Hero creative
* Final homepage copy
* Product pricing ranges
* Shipping provider
* Shipping price
* Delivery SLA
* Payment provider
* Invoice/receipt provider
* Certificate provider
* Image storage provider
* Email provider
* Exact legal policies
* Exact warranty policy
* Exact return policy
* Exact low-stock threshold
* Final ring-size range
* Exact necklace lengths
* Exact bracelet lengths
* Exact customization fields by product
* Exact filters
* Exact collection taxonomy

---

# 58. Core UX Principle

The website should feel:

**Beautiful → Clear → Trustworthy → Easy → Valuable**

Not:

**Cheap → Discount-heavy → Complicated**

The visual system should create the premium feeling.

The product information should create trust.

The price should create the value perception.

The customization functionality should create differentiation.

The checkout should remove friction.

---

# 59. Final Product Philosophy

This is not merely a jewelry catalog.

The website is:

1. A premium jewelry storefront
2. A product discovery engine
3. A personalized jewelry service
4. A direct sales channel
5. A lead-generation channel for custom work
6. A lightweight operational system for the business

Every technical and UX decision should support those six goals.
