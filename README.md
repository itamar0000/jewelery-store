# Jewelry E‑Commerce

Hebrew, RTL, Israel‑only jewelry storefront.

**Current state: Phase 0 — repository scaffold.**
There is no storefront, no catalog, no cart, no checkout, no admin and no
database. This repository currently contains a type‑safe, lint‑clean, tested
and buildable empty Next.js application, plus the specification documents.

## Documents

| Document                                           | Role                                                          |
| -------------------------------------------------- | ------------------------------------------------------------- |
| [MASTER_SPECIFICATION.md](MASTER_SPECIFICATION.md) | **Source of truth.** Product and business requirements.       |
| [ARCHITECTURE.md](ARCHITECTURE.md)                 | Technical architecture proposal.                              |
| [DATA_MODEL.md](DATA_MODEL.md)                     | Entity design.                                                |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)   | Phased delivery plan.                                         |
| [TBD.md](TBD.md)                                   | Every unresolved decision. Nothing is invented to fill a gap. |
| [docs/DECISIONS.md](docs/DECISIONS.md)             | Decisions taken during implementation.                        |

## Requirements

- Node.js ≥ 20.9 (developed on 24.14.1)
- npm (the project's package manager — see TBD.md I5)

## Getting started

```bash
npm install
cp .env.example .env.local   # nothing reads these yet; see .env.example
npm run dev
```

Then open <http://localhost:3000>.

## Scripts

| Script                                    | What it does                                         |
| ----------------------------------------- | ---------------------------------------------------- |
| `npm run dev`                             | Development server                                   |
| `npm run build`                           | Production build                                     |
| `npm run start`                           | Serve the production build                           |
| `npm run lint`                            | ESLint                                               |
| `npm run typecheck`                       | `tsc --noEmit`                                       |
| `npm test`                                | Vitest, single run                                   |
| `npm run test:watch`                      | Vitest, watch mode                                   |
| `npm run format` / `npm run format:check` | Prettier                                             |
| `npm run verify`                          | lint → typecheck → test → build. **The phase gate.** |

Per IMPLEMENTATION_PLAN "Validation is a gate, not a step": a phase is not
complete while `npm run verify` fails.

## Layout

```
.
├── docs/DECISIONS.md        # implementation decisions
├── src/
│   ├── app/                 # App Router routes only
│   │   ├── globals.css      # Tailwind v4 entry + @theme
│   │   ├── layout.tsx       # <html lang="he" dir="rtl">
│   │   └── page.tsx         # Phase 0 placeholder
│   └── lib/                 # business logic; `app/` orchestrates, `lib/` decides
│       └── config/site.ts   # locale / direction contract
└── .github/workflows/ci.yml
```

The fuller target structure (`components/`, `lib/money`, `lib/pricing`,
`lib/integrations`, `server/actions`, …) is specified in ARCHITECTURE §3.4 and
is created as each phase fills it — empty directories are not committed.

Path alias: `@/*` → `src/*`, honoured by TypeScript, Next.js and Vitest.

## Conventions that later phases must hold

- **Money is integer agorot.** Never a float. See
  [docs/DECISIONS.md](docs/DECISIONS.md) D0.1.
- **RTL is structural.** `dir="rtl"` is set once on `<html>`. Customer‑facing
  code uses CSS logical utilities only (`ms-*`, `pe-*`, `start-*`,
  `text-start`), never physical ones (`ml-*`, `pr-*`, `left-*`, `text-left`).
- **The server is authoritative.** Price, discount, inventory and availability
  are recomputed server‑side; client‑submitted values are never trusted.
- **No fake integrations.** A port with no chosen provider gets no
  implementation that pretends to succeed.
- **`any` requires a written justification** at the point of use. ESLint errors
  on it otherwise.

## Environment variables

`.env.example` is committed; every other `.env*` file is git‑ignored. **No
secret belongs in this repository.** Phase 0 reads no environment variables at
all — the fail‑fast zod environment schema is Phase 1 work.

## Note on OneDrive

The working copy lives at `C:\dev\אתר חנות תכשיטים`, outside the OneDrive
root, which is deliberate: OneDrive syncing `node_modules/` and `.next/` causes
file locking and rebuild stalls on Windows. **Keep it outside OneDrive.**

A byte‑identical copy of the specification documents still exists at
`C:\Users\olete\OneDrive\Desktop\אתר חנות תכשיטים`. It is not this repository
and will silently go stale. Deleting it once you are satisfied that `C:\dev` is
the working copy is recommended, but that is your call — nothing here has
touched it.
