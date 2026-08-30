# Development fixtures

**Everything in this directory is fake, and none of it may reach production.**

Phase 3A builds the storefront shell before the catalog is wired to the
database. These modules exist so layout, grid density, badge placement and long
Hebrew labels can be reviewed against realistic shapes.

## Rules

1. **Never import these from a component.** Fixtures are passed in from a route
   (a server component), so replacing them later is a change to the route only.
   No component in `src/components/**` imports from here.
2. **Never present fixture stock as real inventory.** The product fixtures carry
   no `lowStock` values. Availability is a database fact
   (`src/lib/inventory`), and a fabricated "only 2 left" is a lie to a customer.
3. **Delete this directory when the real catalog queries land.** It has no
   purpose after that, and a stale fixture that silently shadows real data is a
   worse bug than a missing one.

Prices are real `Money` values in agorot, built through `@/lib/money`, so the
formatting path under test is the production one.
