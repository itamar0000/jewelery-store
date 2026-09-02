/**
 * One-off data fix: remove "lab-grown only" wording from category descriptions.
 *
 * WHY THIS EXISTS AS A SCRIPT RATHER THAN A SEED CHANGE.
 *
 * The store now sells both natural and lab-grown diamonds. The site-level copy
 * that claimed otherwise lives in two different places, and only one of them
 * ships with a deploy:
 *
 *   - CODE - the document description, the mega-menu feature, the homepage
 *     panel, the FAQ. Fixed in commit 49912e2 and live as soon as it deploys.
 *   - DATA - `Category.descriptionHe`, rendered as the introduction on every
 *     category page. These are rows in Postgres. `prisma/seed.ts` was corrected
 *     in the same commit, but the seed only builds a fresh development
 *     database; it is never run against production, and `vercel-build` runs
 *     `prisma migrate deploy && next build` and nothing else. So the rows keep
 *     the old wording until something updates them. That is this script.
 *
 * The worst of them is on /rings, which still reads
 * "כל היהלומים הם יהלומי מעבדה" - a factual claim about the catalogue that is
 * no longer true.
 *
 * SAFETY. Three properties, in order of how much they matter:
 *
 *   1. DRY RUN BY DEFAULT. Nothing is written without `--apply`. The default
 *      run prints exactly which rows it would touch and stops.
 *   2. IT ONLY REPLACES THE EXACT OLD STRING. Each row is matched on its slug
 *      AND on its current description being the known seeded text. If anyone
 *      has since edited a description through the admin, this leaves it alone
 *      and says so. It cannot overwrite someone's work.
 *   3. IDEMPOTENT. A second run finds every row already correct and writes
 *      nothing, so re-running it is harmless.
 *
 * Writes go through a single transaction: either all eight land or none do.
 *
 * NO REINDEX IS NEEDED AFTERWARDS. Search documents are built from category
 * NAMES, not descriptions (see src/lib/search/document.ts), and no name
 * changes here.
 *
 *   node scripts/fix-diamond-copy.ts            # dry run - shows the plan
 *   node scripts/fix-diamond-copy.ts --apply    # writes
 *
 * Point DATABASE_URL at the database you mean to change. Against Neon that is
 * the production connection string, so read the dry run before adding --apply.
 */
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const APPLY = process.argv.includes('--apply');

/**
 * The eight rows the corrected seed changed, as exact before/after pairs.
 *
 * `from` is the literal text the original seed wrote. It is the guard, not just
 * documentation: a row whose description no longer equals this is skipped.
 */
const FIXES: readonly { slug: string; from: string; to: string }[] = [
  {
    slug: 'rings',
    from: 'טבעות אירוסין, נישואין וטבעות יומיום. כל היהלומים הם יהלומי מעבדה, וניתן להתאים כל דגם לפי קראט, גוון זהב ומידה.',
    to: 'טבעות אירוסין, נישואין וטבעות יומיום, ביהלומים טבעיים וביהלומי מעבדה. ניתן להתאים כל דגם לפי קראט, גוון זהב ומידה.',
  },
  {
    slug: 'engagement-rings',
    from: 'טבעות אירוסין ביהלומי מעבדה, בהתאמה אישית מלאה.',
    to: 'טבעות אירוסין ביהלומים טבעיים וביהלומי מעבדה, בהתאמה אישית מלאה.',
  },
  {
    slug: 'diamond-rings',
    from: 'טבעות משובצות יהלומי מעבדה.',
    to: 'טבעות משובצות יהלומים, טבעיים או מיהלומי מעבדה.',
  },
  {
    slug: 'earrings',
    from: 'עגילים צמודים, חישוקים ועגילים תלויים בזהב ובשילוב יהלומי מעבדה.',
    to: 'עגילים צמודים, חישוקים ועגילים תלויים בזהב ובשילוב יהלומים.',
  },
  {
    slug: 'tennis-bracelets',
    from: 'צמידי טניס משובצים יהלומי מעבדה.',
    to: 'צמידי טניס משובצים יהלומים.',
  },
  {
    slug: 'colored-diamond-rings',
    from: 'טבעות משובצות יהלומי מעבדה בגוונים.',
    to: 'טבעות משובצות יהלומים צבעוניים.',
  },
  {
    slug: 'diamond-earrings',
    from: 'עגילים משובצים יהלומי מעבדה.',
    to: 'עגילים משובצים יהלומים.',
  },
  {
    slug: 'diamond-bracelets',
    from: 'צמידים משובצים יהלומי מעבדה.',
    to: 'צמידים משובצים יהלומים.',
  },
];

type Outcome = 'pending' | 'already-correct' | 'edited-elsewhere' | 'missing';

async function main(): Promise<void> {
  const host = new URL(connectionString!).host;
  console.log(`\ndatabase: ${host}`);
  console.log(APPLY ? 'mode:     APPLY (this will write)\n' : 'mode:     dry run (no writes)\n');

  const planned: { slug: string; to: string }[] = [];
  const counts: Record<Outcome, number> = {
    pending: 0,
    'already-correct': 0,
    'edited-elsewhere': 0,
    missing: 0,
  };

  for (const fix of FIXES) {
    const row = await prisma.category.findUnique({
      where: { slug: fix.slug },
      select: { descriptionHe: true },
    });

    let outcome: Outcome;
    if (row === null) {
      outcome = 'missing';
    } else if (row.descriptionHe === fix.to) {
      outcome = 'already-correct';
    } else if (row.descriptionHe === fix.from) {
      outcome = 'pending';
      planned.push({ slug: fix.slug, to: fix.to });
    } else {
      outcome = 'edited-elsewhere';
    }

    counts[outcome] += 1;

    console.log(`${fix.slug}`);
    console.log(`  ${outcome}`);
    if (outcome === 'pending') {
      console.log(`  from: ${fix.from}`);
      console.log(`  to:   ${fix.to}`);
    } else if (outcome === 'edited-elsewhere') {
      // Left alone deliberately - someone changed this after it was seeded, and
      // this script must not silently discard that.
      console.log(`  current: ${row?.descriptionHe ?? '(null)'}`);
      console.log('  SKIPPED - differs from the seeded text, so it was edited. Fix by hand.');
    }
    console.log('');
  }

  console.log('---');
  console.log(
    `to update: ${counts.pending} | already correct: ${counts['already-correct']} | ` +
      `edited (skipped): ${counts['edited-elsewhere']} | missing: ${counts.missing}`,
  );

  if (planned.length === 0) {
    console.log('\nNothing to do.');
    return;
  }

  if (!APPLY) {
    console.log(
      `\nDry run - nothing written. Re-run with --apply to update ${planned.length} row(s).`,
    );
    return;
  }

  // All or nothing: a partial fix would leave the catalogue half-corrected.
  await prisma.$transaction(
    planned.map(({ slug, to }) =>
      prisma.category.update({ where: { slug }, data: { descriptionHe: to } }),
    ),
  );

  console.log(`\nUpdated ${planned.length} row(s).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
