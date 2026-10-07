/**
 * Who may sign in to the admin (D4D.24).
 *
 * The admin has no sign-up page: the people who may enter are a short,
 * defined list, kept here.
 *
 *   node scripts/admin-user.ts list
 *   node scripts/admin-user.ts add     --email a@example.com --name "דנה" [--role STAFF]
 *   node scripts/admin-user.ts reset   --email a@example.com
 *   node scripts/admin-user.ts disable --email a@example.com
 *   node scripts/admin-user.ts enable  --email a@example.com
 *
 * `add` and `reset` print a new random password ONCE. Hand it to the person;
 * it is stored only as an Argon2id hash and cannot be shown again. They can
 * change it from the admin after signing in.
 *
 * `reset` and `disable` end every open session of that person at once.
 * Nobody is ever deleted: their name stays on the history they wrote.
 *
 * Roles: ADMIN (the default) and STAFF have the same access today; the
 * distinction is kept for when it matters.
 */
import { randomBytes } from 'node:crypto';

import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function requireEmail(): string {
  const email = flag('email')?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Give a valid --email.');
  }
  return email;
}

/** 16 characters from the URL-safe alphabet: about 96 bits. */
function newPassword(): string {
  return randomBytes(12).toString('base64url');
}

async function findStaff(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    throw new Error(`${email} is not on the admin list.`);
  }
  return user;
}

const command = process.argv[2];

try {
  switch (command) {
    case 'list': {
      const users = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'STAFF'] } },
        orderBy: { createdAt: 'asc' },
      });
      if (users.length === 0) console.log('No one can sign in to the admin yet.');
      for (const user of users) {
        const state = user.disabledAt ? 'disabled' : 'active';
        console.log(
          `${user.email.padEnd(32)} ${user.role.padEnd(6)} ${state.padEnd(9)} ${user.displayName ?? ''}`,
        );
      }
      break;
    }

    case 'add': {
      const email = requireEmail();
      const name = flag('name')?.trim();
      if (!name) throw new Error('Give a --name, as it should appear in the history.');
      const role = (flag('role') ?? 'ADMIN').toUpperCase();
      if (role !== 'ADMIN' && role !== 'STAFF') throw new Error('--role is ADMIN or STAFF.');

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && (existing.role === 'ADMIN' || existing.role === 'STAFF')) {
        throw new Error(`${email} is already on the list. Use reset for a new password.`);
      }
      const password = newPassword();
      const passwordHash = await hash(password);
      await prisma.user.upsert({
        where: { email },
        create: { email, displayName: name, role, passwordHash },
        update: { displayName: name, role, passwordHash, disabledAt: null },
      });
      console.log(`Added ${email} (${role}).`);
      console.log(`Password, shown once: ${password}`);
      break;
    }

    case 'reset': {
      const user = await findStaff(requireEmail());
      const password = newPassword();
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: await hash(password) },
        }),
        prisma.session.deleteMany({ where: { userId: user.id } }),
      ]);
      console.log(`New password for ${user.email}, shown once: ${password}`);
      break;
    }

    case 'disable': {
      const user = await findStaff(requireEmail());
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { disabledAt: new Date() } }),
        prisma.session.deleteMany({ where: { userId: user.id } }),
      ]);
      console.log(`${user.email} can no longer sign in.`);
      break;
    }

    case 'enable': {
      const user = await findStaff(requireEmail());
      await prisma.user.update({ where: { id: user.id }, data: { disabledAt: null } });
      console.log(`${user.email} can sign in again.`);
      break;
    }

    default:
      console.log('Commands: list, add, reset, disable, enable. See the top of this file.');
  }
} finally {
  await prisma.$disconnect();
}
