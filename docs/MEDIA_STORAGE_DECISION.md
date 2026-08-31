# Media storage: provider decision

**Decision: S3-compatible object storage, with Cloudflare R2 as the recommended
concrete instance. Image transformation is handled by `next/image`, not by the
storage provider.**

Status: decided (Phase 4A). Resolves TBD.md **I1**.
Not yet provisioned — see [Required external setup](#required-external-setup).

---

## What this project actually needs

The recommendation follows from this project's specifics, not from a general
preference. The relevant facts:

| Fact                                          | Source          | Consequence                                                                                                         |
| --------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| ~100 products, one small Israeli business     | §5, §53         | Storage volume is a few GB at most. Cost differences are small in absolute terms; operational simplicity dominates. |
| **We are building our own Admin**             | §41, Phase 7    | The owner will upload through _our_ interface. A provider's media-library UI is redundant.                          |
| Already on Next.js 15                         | §42             | `next/image` already does responsive sizes, WebP and AVIF.                                                          |
| Custom-request uploads are **customer files** | §17, §48        | Must be private, non-listable, served to admins only through expiring URLs.                                         |
| Docker Compose already runs the local stack   | D1.8            | A faithful local storage service costs one service block.                                                           |
| Database stores **keys, not URLs**            | ARCHITECTURE §8 | Portability is already designed in; the provider choice is genuinely reversible.                                    |

---

## Options evaluated

### Cloudinary

**For:** transformations, CDN and a media library in one product; generous free
tier at this scale; signed upload presets; no image pipeline to build.

**Against, for this project specifically:**

- **The media library is redundant.** Its strongest differentiator is a
  dashboard for non-technical users — but this project is building an Admin
  where the owner manages products, and images are edited beside the product
  they belong to. Sending the owner to a second system to manage the same
  assets is worse, not better.
- **Transformations duplicate `next/image`.** The framework already produces
  responsive `srcset`, WebP and AVIF. Paying a second system to do the same job
  buys nothing here.
- **Private customer uploads are the awkward path.** Authenticated delivery is
  possible but is not the product's centre of gravity, and custom-request
  uploads (§17) are private business correspondence.
- **Credits conflate storage, transformations and bandwidth**, so cost is hard
  to reason about for an image-heavy catalog.
- **Single-vendor URL syntax.** Migration means rewriting every derived URL.

### S3-compatible object storage — **selected**

**For:**

- **A standard, not a vendor.** The same API is implemented by Cloudflare R2,
  AWS S3, Backblaze B2 and MinIO. Portability is real rather than aspirational,
  which matches the existing keys-not-URLs decision.
- **Presigned uploads and presigned reads are native.** Both requirements —
  direct browser upload without exposing credentials, and expiring private
  access for customer uploads — are the API's primary use cases.
- **A faithful local environment.** MinIO speaks the same API in the Docker
  Compose this project already runs, so the storage adapter is exercised
  locally and in CI against a real endpoint. That is a materially better
  development story than pointing at a shared cloud sandbox, and it is what let
  this phase's adapter be integration-tested without any external account.
- **Cost is legible.** R2 charges storage and operations with **no egress
  fees**, which suits a catalog whose main activity is serving images.

**Against:** no transformation service and no media UI. Both are answered:
transformations by `next/image`, media management by our own Admin.

### Why R2 specifically

Among S3-compatible hosts, R2 has zero egress fees and a free tier that covers
this catalog comfortably. Nothing in the code depends on that choice — the
adapter takes an endpoint, and AWS S3 or MinIO work unchanged.

---

## Image delivery strategy

**`next/image` transforms; storage stores.**

- The storage layer returns one canonical URL per stored object.
- `next/image` derives responsive widths and modern formats from it, emitting
  `srcset` with AVIF/WebP where the browser supports them.
- No physical derivative files are created. There is exactly one object per
  image, which is what keeps deletion, re-upload and auditing simple.
- `ProductImage.width`/`height` are captured at upload so `next/image` can
  reserve layout space and avoid cumulative layout shift.

`next.config.ts` must allow the bucket's public host as a remote pattern; that
is the only coupling between the storefront and the provider.

---

## Upload strategy

**Presigned `PUT`, issued by the server, uploaded direct from the browser.**

1. The Admin asks the server for an upload target, supplying content type and
   byte size.
2. The server **validates before signing** — format allowlist, size cap — and
   derives a safe key. Client-supplied filenames never become paths.
3. The server returns a short-lived presigned URL scoped to that one key,
   method and content type.
4. The browser uploads directly. Bytes never pass through the Next.js server,
   which avoids serverless body-size limits.
5. The Admin then records the key, alt text and dimensions on `ProductImage`.

The browser never receives long-lived credentials. A presigned URL grants one
operation, on one key, for a few minutes.

---

## Security

- **Credentials stay server-side.** The access key and secret are read only in
  server modules; no `NEXT_PUBLIC_` variable carries them.
- **Untrusted filenames never become paths.** Keys are built from a random id
  plus a sanitised extension derived from the _validated content type_ — not
  from the uploaded filename. Traversal sequences, absolute paths, control
  characters and Unicode direction overrides cannot survive.
- **SVG is not an accepted format.** SVG is executable markup; serving one from
  the asset origin is a stored-XSS vector. The allowlist is JPEG, PNG, WebP and
  AVIF.
- **Uploaded files cannot execute as application code.** Objects live in a
  bucket, not on the application filesystem, and are served as static bytes
  with the content type recorded at upload.
- **Public and private namespaces are separate.** Product images are public
  catalog content. Custom-request uploads (§17, §48) belong under a private
  prefix served only through short-lived presigned reads — the seam exists in
  the interface now; the custom-request workflow itself is a later phase.

---

## Required external setup

**Nothing is provisioned yet, and the application does not pretend otherwise.**

To enable real uploads, provide:

| Variable                     | Meaning                                                                 |
| ---------------------------- | ----------------------------------------------------------------------- |
| `MEDIA_S3_ENDPOINT`          | S3 endpoint (R2 account endpoint, or `http://localhost:9000` for MinIO) |
| `MEDIA_S3_REGION`            | Region; `auto` for R2                                                   |
| `MEDIA_S3_BUCKET`            | Bucket name                                                             |
| `MEDIA_S3_ACCESS_KEY_ID`     | Access key                                                              |
| `MEDIA_S3_SECRET_ACCESS_KEY` | Secret                                                                  |
| `MEDIA_PUBLIC_BASE_URL`      | Public base URL images are served from                                  |

All are **optional**. Without them the application boots, the catalog renders,
and the storefront falls back to the existing placeholder surface. Any attempt
to actually upload or resolve a URL fails with a legible message naming the
missing variables rather than silently doing nothing.

Locally, `npm run media:up` starts MinIO and `npm run media:init` creates the
bucket, so the full upload path is exercisable with no external account.

---

## What was deliberately not built

No malware scanning, no virus pipeline, no image-processing queue, no CDN
configuration, no derivative pre-generation. At this catalog size those are
weight without benefit, and the brief scopes them out.
