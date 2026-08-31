# Deploying to Vercel + Neon

A review deployment: enough to browse the real storefront and have it looked
over. Not a production launch — see [What this is not](#what-this-is-not).

---

## Steps only you can do

Three things require your own accounts and credentials. They cannot be done on
your behalf.

### 1. Create the Neon database

1. Sign in at <https://neon.tech> and create a project (region: choose one near
   Israel, e.g. `eu-central-1`).
2. Copy the **pooled** connection string — the host contains `-pooler`. It looks
   like:

   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   **Use the pooled endpoint, not the direct one.** Each serverless invocation
   opens its own connection; the direct endpoint exhausts Neon's connection
   limit under even light traffic, and the failure looks like random 500s rather
   than anything obviously connection-related.

### 2. Connect the repo to Vercel

The code is already on GitHub at
`itamar0000/jewelery-store`, branch `master`.

1. Sign in at <https://vercel.com> and **Add New → Project**.
2. Import that repository. Framework preset: **Next.js** (detected).
3. Leave build settings alone — `vercel-build` in `package.json` is picked up
   automatically and runs migrations before the build.

### 3. Set environment variables

In **Project → Settings → Environment Variables**, add these for
**Production, Preview and Development**:

| Variable               | Value                               |
| ---------------------- | ----------------------------------- |
| `DATABASE_URL`         | the pooled Neon string from step 1  |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app` |

Both **must be set before the first deploy**, for different reasons:

- `DATABASE_URL` — the build imports route modules, which validate the
  environment, so a build without it fails at "Collecting page data" rather
  than at runtime.
- `NEXT_PUBLIC_SITE_URL` — `NEXT_PUBLIC_*` variables are **inlined at build
  time**, not read at runtime. Setting or changing it later has no effect until
  you **redeploy**.

### What `NEXT_PUBLIC_SITE_URL` should be

The **stable production origin**, with no trailing slash:

```
https://<your-project>.vercel.app
```

Not the per-deployment URL. Vercel gives every build its own address like
`https://jewelery-store1-5o5red9xt-ihpt.vercel.app`; that changes on every
deploy, and baking it in would make each build claim a different canonical
origin. Use the stable project alias, and switch it to the real domain when
there is one.

It feeds `metadataBase`, which is what makes canonical tags absolute. With it
wrong, every preview deployment self-canonicalises and can be indexed as a
duplicate of production.

Then deploy.

---

## Seeding the review catalog

A fresh Neon database is empty, so the storefront would render correctly and
show nothing. Seed it once, from your machine, pointing at Neon:

```bash
DATABASE_URL="<pooled Neon URL>" npm run db:seed
```

That creates 51 demo products, 123 variants, 28 categories and 4 collections,
and builds the search documents.

The seed **refuses to run when `NODE_ENV=production`**, which is a deliberate
guard. Run it locally, where `NODE_ENV` is `development`; it is the connection
string that decides which database is written, not where the command runs.

---

## What is deliberately not configured

**Images.** No media bucket is provisioned (`MEDIA_S3_*` unset), so every image
renders as the tonal placeholder surface. That is by design — see
`docs/MEDIA_STORAGE_DECISION.md`. The storefront is fully browsable without it;
only photography is missing. To enable real images later, set the six `MEDIA_*`
variables and redeploy.

**Everything past browsing.** Cart, checkout, payments, authentication, wishlist
persistence and the custom-request workflow are not built. The corresponding
routes render explicit placeholder pages that say so.

---

## Verifying the deployment

```bash
curl -o /dev/null -w "%{http_code}\n" https://<project>.vercel.app/rings
curl -o /dev/null -w "%{http_code}\n" https://<project>.vercel.app/product/nope   # expect 404
```

Worth checking by eye:

- `/` — homepage
- `/rings` and `/rings?goldColor=white&sort=price-asc` — filters and sort
- `/search?q=טבעת` — search
- `/product/demo-aurora-ring` — variant switching
- `/product/nope` — a real 404, not a soft one

---

## Notes for whoever reviews this

- Everything is Hebrew and RTL. `dir="rtl"` is set once on `<html>`.
- Prices are integer agorot throughout; `formatPrice` is the only formatter.
- Placeholder surfaces are intentional and greppable — see
  `src/lib/placeholders.ts` for the registry of what is not yet wired.
- Architectural decisions, including several that were reversed after being
  tried, are recorded in `docs/DECISIONS.md`.

---

## What this is not

This is a review deployment. Before anything resembling a launch:

- a real domain and `NEXT_PUBLIC_SITE_URL`;
- a media bucket and real photography;
- the legal pages (TBD.md L1–L12) — terms, privacy, returns, accessibility;
- the outstanding business decisions in `TBD.md`, notably payment and invoicing
  providers, shipping pricing and the accessibility compliance target.

Neon's free tier suspends a database after inactivity, so the first request
after an idle period is slow. That is the free tier waking up, not the
application.
