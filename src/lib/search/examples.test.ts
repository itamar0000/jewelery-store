import { describe, expect, it } from 'vitest';

import { SEARCH_EXAMPLES, SEARCH_EXAMPLES_HEADING, SEARCH_RETRY_HEADING } from './examples';

/*
 * The example searches are examples. No search log exists, so no heading over
 * them may claim popularity, and none may claim a spelling correction.
 */
describe('search examples', () => {
  it('are headed as what they are', () => {
    for (const heading of [SEARCH_EXAMPLES_HEADING, SEARCH_RETRY_HEADING]) {
      expect(heading).not.toMatch(/פופולרי|נפוצ|אולי התכוונת/);
    }
  });

  it('are real Hebrew queries', () => {
    expect(SEARCH_EXAMPLES.length).toBeGreaterThan(0);
    for (const example of SEARCH_EXAMPLES) expect(example).toMatch(/^[֐-׿ ]+$/);
  });
});
