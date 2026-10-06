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
  /*
   * A forgotten variable here does not break anything visibly - it publishes
   * provisional prices to search results, and nobody finds out until the shop
   * is already listed. So the default is asserted rather than assumed.
   */
  it('keeps the site out of search results unless told otherwise', () => {
    expect(parseEnv(VALID).SITE_INDEXABLE).toBe(false);
    expect(parseEnv({ ...VALID, SITE_INDEXABLE: 'false' }).SITE_INDEXABLE).toBe(false);
  });

  it('opens indexing only for the exact string "true"', () => {
    expect(parseEnv({ ...VALID, SITE_INDEXABLE: 'true' }).SITE_INDEXABLE).toBe(true);

    // Anything else is a typo, and a typo must fail loudly rather than be
    // coerced into one of the two answers.
    for (const value of ['TRUE', '1', 'yes', 'on', '']) {
      expect(() => parseEnv({ ...VALID, SITE_INDEXABLE: value })).toThrow();
    }
  });

  /*
   * Same reasoning as indexing: the safe direction is "these are estimates", so
   * that is the default, and only an exact "true" says otherwise.
   */
  it('treats prices as estimates unless told otherwise', () => {
    expect(parseEnv(VALID).PRICES_FINAL).toBe(false);
    expect(parseEnv({ ...VALID, PRICES_FINAL: 'true' }).PRICES_FINAL).toBe(true);
    for (const value of ['TRUE', '1', 'yes', '']) {
      expect(() => parseEnv({ ...VALID, PRICES_FINAL: value })).toThrow();
    }
  });

  describe('contact channels', () => {
    it('configures none by default - nothing is invented', () => {
      const env = parseEnv(VALID);

      expect(env.CONTACT_WHATSAPP).toBeUndefined();
      expect(env.CONTACT_PHONE).toBeUndefined();
      expect(env.CONTACT_EMAIL).toBeUndefined();
    });

    it('treats an empty value as not configured', () => {
      expect(parseEnv({ ...VALID, CONTACT_WHATSAPP: '  ' }).CONTACT_WHATSAPP).toBeUndefined();
    });

    it('accepts real-looking values', () => {
      const env = parseEnv({
        ...VALID,
        CONTACT_WHATSAPP: '+972 50-123-4567',
        CONTACT_PHONE: '03-1234567',
        CONTACT_EMAIL: 'hello@example.com',
      });

      expect(env.CONTACT_WHATSAPP).toBe('+972 50-123-4567');
      expect(env.CONTACT_PHONE).toBe('03-1234567');
      expect(env.CONTACT_EMAIL).toBe('hello@example.com');
    });

    it('rejects values that cannot be a channel', () => {
      expect(() => parseEnv({ ...VALID, CONTACT_WHATSAPP: 'call us' })).toThrow(/CONTACT_WHATSAPP/);
      expect(() => parseEnv({ ...VALID, CONTACT_WHATSAPP: '1234' })).toThrow(/CONTACT_WHATSAPP/);
      expect(() => parseEnv({ ...VALID, CONTACT_PHONE: 'TBD' })).toThrow(/CONTACT_PHONE/);
      expect(() => parseEnv({ ...VALID, CONTACT_EMAIL: 'not-an-email' })).toThrow(/CONTACT_EMAIL/);
    });
  });

  describe('VAT_RATE_BPS', () => {
    it('has no default - the rate is the owner’s fact, never assumed', () => {
      expect(parseEnv({ ...VALID }).VAT_RATE_BPS).toBeUndefined();
      expect(parseEnv({ ...VALID, VAT_RATE_BPS: '  ' }).VAT_RATE_BPS).toBeUndefined();
    });

    it('reads a rate in basis points', () => {
      expect(parseEnv({ ...VALID, VAT_RATE_BPS: '1800' }).VAT_RATE_BPS).toBe(1800);
      expect(parseEnv({ ...VALID, VAT_RATE_BPS: '0' }).VAT_RATE_BPS).toBe(0);
    });

    it('rejects a percentage, a fraction or an impossible rate', () => {
      expect(() => parseEnv({ ...VALID, VAT_RATE_BPS: '18%' })).toThrow(/VAT_RATE_BPS/);
      expect(() => parseEnv({ ...VALID, VAT_RATE_BPS: '0.18' })).toThrow(/VAT_RATE_BPS/);
      expect(() => parseEnv({ ...VALID, VAT_RATE_BPS: '-1' })).toThrow(/VAT_RATE_BPS/);
      expect(() => parseEnv({ ...VALID, VAT_RATE_BPS: '10001' })).toThrow(/VAT_RATE_BPS/);
    });
  });
});
