import { describe, expect, it } from 'vitest';

import { EnvironmentError, parseEnv } from './schema';

const VALID = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://jewelry:jewelry_local_dev@localhost:5432/jewelry?schema=public',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
} as const;

describe('parseEnv', () => {
  it('accepts a valid environment', () => {
    const env = parseEnv({ ...VALID });

    expect(env.NODE_ENV).toBe('development');
    expect(env.DATABASE_URL).toBe(VALID.DATABASE_URL);
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('defaults the optional variables', () => {
    const env = parseEnv({ DATABASE_URL: VALID.DATABASE_URL });

    expect(env.NODE_ENV).toBe('development');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('rejects a missing DATABASE_URL rather than falling back to a default', () => {
    expect(() => parseEnv({})).toThrow(EnvironmentError);
    expect(() => parseEnv({ DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it('rejects an empty DATABASE_URL', () => {
    expect(() => parseEnv({ ...VALID, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('rejects a DATABASE_URL that is not a PostgreSQL connection string', () => {
    expect(() => parseEnv({ ...VALID, DATABASE_URL: 'mysql://localhost/jewelry' })).toThrow(
      /PostgreSQL/,
    );
  });

  it('accepts both postgresql:// and postgres:// schemes', () => {
    expect(parseEnv({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' }).DATABASE_URL).toContain(
      'postgres://',
    );
  });

  it('rejects an invalid NEXT_PUBLIC_SITE_URL', () => {
    expect(() => parseEnv({ ...VALID, NEXT_PUBLIC_SITE_URL: 'not-a-url' })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => parseEnv({ ...VALID, NODE_ENV: 'staging' })).toThrow(EnvironmentError);
  });

  it('reports every problem at once', () => {
    let message = '';
    try {
      parseEnv({ NODE_ENV: 'staging', NEXT_PUBLIC_SITE_URL: 'not-a-url' });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('NODE_ENV');
    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('NEXT_PUBLIC_SITE_URL');
  });

  it('never puts a variable value in the error message', () => {
    // DATABASE_URL carries a password; this text reaches logs and crash
    // reports (MASTER_SPECIFICATION section 48).
    const secret = 'mysql://admin:sup3rs3cret@db.example.com/jewelry';

    let message = '';
    try {
      parseEnv({ ...VALID, DATABASE_URL: secret });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('DATABASE_URL');
    expect(message).not.toContain('sup3rs3cret');
    expect(message).not.toContain(secret);
  });
});
