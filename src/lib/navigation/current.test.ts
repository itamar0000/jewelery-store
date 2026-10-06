import { describe, expect, it } from 'vitest';

import { isCurrentSection } from './current';

describe('isCurrentSection', () => {
  it('marks a section on its page and the pages under it', () => {
    expect(isCurrentSection('/rings', '/rings')).toBe(true);
    expect(isCurrentSection('/rings', '/rings/engagement-rings')).toBe(true);
    expect(isCurrentSection('/custom', '/custom/request')).toBe(true);
  });

  it('does not mark a section that only shares a prefix, or the home page', () => {
    expect(isCurrentSection('/rings', '/ringsets')).toBe(false);
    expect(isCurrentSection('/', '/')).toBe(false);
    expect(isCurrentSection('/rings', null)).toBe(false);
  });
});
