import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { NOT_FOUND_TITLE, notFoundMetadata } from './not-found';

/**
 * A 404 says so in the tab, and keeps saying so after the page loads.
 *
 * Next streams a page's metadata separately from its HTML, and when a page
 * calls `notFound()` the browser ends up with the PAGE's metadata. A page that
 * returned `{}` for its missing case therefore left every 404's tab reading
 * like the homepage once it hydrated. The cure is per page - each one that can
 * 404 returns `notFoundMetadata` for that case - so this checks every route
 * file that calls `notFound()` does, including the ones added later.
 */
const root = process.cwd();
const appDir = path.join(root, 'src/app');

const routes = readdirSync(appDir, { recursive: true, encoding: 'utf8' })
  .filter((file) => /(^|[\\/])page\.tsx$/.test(file))
  .map((file) => ({ file, text: readFileSync(path.join(appDir, file), 'utf8') }))
  .filter(({ text }) => /\bnotFound\(\)/.test(text));

describe('not-found metadata', () => {
  it('titles a 404 as one', () => {
    expect(notFoundMetadata.title).toBe(NOT_FOUND_TITLE);
    expect(NOT_FOUND_TITLE).toBe('הדף לא נמצא');
  });

  it('is checked against every route that can 404', () => {
    // Product, category, subcategory, collection, account, wishlist - at least.
    expect(routes.length).toBeGreaterThanOrEqual(6);
  });

  for (const { file, text } of routes) {
    it(`${file} returns it for the missing case`, () => {
      expect(text).toContain('notFoundMetadata');
      expect(text).not.toMatch(/return \{\};/);
    });
  }
});
