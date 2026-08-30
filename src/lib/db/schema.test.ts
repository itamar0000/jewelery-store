import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * The Prisma schema is checked by the Prisma CLI itself rather than by
 * re-implementing its rules here.
 *
 * This catches the failure mode that a type check cannot: a schema that is
 * syntactically fine but semantically broken - an unknown provider, a
 * malformed generator block, a relation that does not resolve. Phase 2 adds
 * the entity model, and this test starts guarding it from the moment the first
 * model lands.
 *
 * No database connection is made. `prisma validate` parses the schema and
 * resolves the datasource configuration; it does not connect.
 */

// Supplied explicitly so the test does not depend on a local .env file, which
// is git-ignored and absent in CI. The value is never connected to.
const TEST_DATABASE_URL = 'postgresql://validate:validate@localhost:5432/validate?schema=public';

// `execSync` rather than `execFileSync`: npx is a shell script on POSIX and a
// .cmd shim on Windows, so the command needs a shell either way, and passing a
// single string avoids Node's DEP0190 warning about unescaped shell arguments.
// The command is a fixed literal with no interpolated input.
function runPrisma(command: string): string {
  return execSync(`npx --no-install prisma ${command}`, {
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}

// Spawning the Prisma CLI is slow relative to a unit test, and slower still on
// a cold CI runner.
const CLI_TIMEOUT_MS = 60_000;

describe('prisma schema', () => {
  it(
    'is valid',
    () => {
      expect(runPrisma('validate')).toContain('is valid');
    },
    CLI_TIMEOUT_MS,
  );

  it('declares PostgreSQL as the datasource provider', () => {
    // MASTER_SPECIFICATION section 42 mandates PostgreSQL. Switching provider
    // silently would break every raw query and Postgres-specific index added
    // from Phase 2 onward.
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    expect(schema).toMatch(/datasource\s+db\s*\{[^}]*provider\s*=\s*"postgresql"/);
  });

  it('still declares no business models', () => {
    // Phase 1 is datasource and generator only; the entity design in
    // DATA_MODEL.md lands in Phase 2 together with the first migration. When
    // that happens this expectation is the one to delete - deliberately, not
    // by accident.
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    expect(schema).not.toMatch(/^\s*model\s+\w+/m);
  });
});
