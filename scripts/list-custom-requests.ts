/**
 * Print the custom requests waiting for an answer.
 *
 * Until there is an admin screen and an email provider, this is how the
 * workshop reads what visitors sent from /custom/request: the site saves each
 * request with a number and notifies nobody (docs/DECISIONS.md D4D.14).
 *
 * READ ONLY. It changes nothing; moving a request along is still done by hand.
 *
 *   npm run requests:list            # requests with status NEW
 *   npm run requests:list -- --all   # every request, newest first
 *
 * Point DATABASE_URL at the database to read - production's, to see real ones.
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

const ALL = process.argv.includes('--all');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const requests = await prisma.customRequest.findMany({
    where: ALL ? {} : { status: 'NEW' },
    orderBy: { createdAt: 'desc' },
  });

  if (requests.length === 0) {
    console.log(ALL ? 'No custom requests yet.' : 'No new custom requests.');
  }

  for (const request of requests) {
    const snapshot = request.productSnapshot as {
      nameHe?: string;
      slug?: string;
      choices?: { labelHe: string; valueHe: string }[];
    } | null;

    console.log(
      `\n#${request.requestNumber}  ${request.status}  ${request.createdAt.toISOString()}`,
    );
    console.log(
      `  ${request.fullName}  ${[request.phone, request.email].filter(Boolean).join('  ')}`,
    );
    console.log(`  type: ${request.jewelryType}`);
    if (snapshot?.nameHe) {
      const choices = (snapshot.choices ?? []).map((c) => `${c.labelHe}: ${c.valueHe}`).join(', ');
      console.log(
        `  model: ${snapshot.nameHe} (/product/${snapshot.slug})${choices ? ` - ${choices}` : ''}`,
      );
    }
    if (request.changeAreas.length > 0) console.log(`  changes: ${request.changeAreas.join(', ')}`);
    console.log(`  ${request.description.replace(/\n/g, '\n  ')}`);
  }
} finally {
  await prisma.$disconnect();
}
