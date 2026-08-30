import { PrismaPg } from '@prisma/adapter-pg';

import { env } from '@/lib/env';

import { PrismaClient } from '@/generated/prisma/client';

/**
 * The database client. Import as `prisma` from `@/lib/db`.
 *
 * ONE CLIENT, ONE PLACE. Constructing `PrismaClient` ad hoc opens a fresh
 * connection pool each time, which exhausts PostgreSQL's connection limit
 * quickly - especially on serverless, where each function instance would carry
 * its own (ARCHITECTURE section 5).
 *
 * Prisma 7 connects through a driver adapter rather than an embedded query
 * engine, so the pool is `pg`'s and the connection string comes from the
 * validated environment - importing `@/lib/env` here is also what makes a
 * missing or malformed DATABASE_URL fail loudly on first database use rather
 * than at the first query.
 *
 * NOT YET USED BY ANY UI. Phase 1 establishes the boundary and the schema has
 * no models; reads and writes arrive in Phase 2.
 */

const createPrismaClient = (): PrismaClient =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),

    // Queries are noisy; warnings and errors are not. Structured logging with
    // no PII arrives with observability work in Phase 9.
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

/**
 * In development, Next.js hot-reloads modules on every edit. Without this the
 * module would re-evaluate and build a new client - and a new pool - on each
 * reload, until PostgreSQL refuses further connections. Caching on `globalThis`
 * survives module reloads; the global is not used in production, where the
 * module is evaluated once.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
