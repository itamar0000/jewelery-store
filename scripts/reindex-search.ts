/**
 * Rebuilds every product's search document from current data.
 *
 * WHEN TO RUN IT. The write path generates a document whenever a product is
 * saved, so ordinary product edits need nothing. This covers the case the write
 * path cannot see: renaming a CATEGORY or a COLLECTION changes the document of
 * every product inside it, and fanning that out synchronously across a rename
 * is worse than a command someone runs afterwards.
 *
 * Idempotent and safe to run at any time.
 *
 *   npm run search:reindex
 */
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.ts';
import { reindexSearchDocuments } from '../src/lib/search/reindex.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

// Its own client, like the seed: this runs under plain Node, where the `@/...`
// path alias the application uses does not resolve.
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const written = await reindexSearchDocuments(prisma);
console.log(`Rebuilt ${written} search documents.`);

await prisma.$disconnect();
