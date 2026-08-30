import { describe, expect, it } from 'vitest';

import { SITE_DIR, SITE_LANG, SITE_LOCALE } from './site';

describe('site locale contract', () => {
  it('serves a Hebrew, right-to-left document', () => {
    expect(SITE_LANG).toBe('he');
    expect(SITE_DIR).toBe('rtl');
  });

  it('exposes a locale that Intl accepts for Israeli shekel formatting', () => {
    expect(SITE_LOCALE).toBe('he-IL');

    const formatted = new Intl.NumberFormat(SITE_LOCALE, {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(1234);

    expect(formatted).toContain('₪');
    expect(formatted).toContain('1,234');
  });
});
