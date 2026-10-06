import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * NOTHING ON THE SITE IS SET BELOW 12px.
 *
 * The type scale had an 11px step, and it ended up carrying sentences, section
 * labels and a product's SKU - in Hebrew, where letters that differ by a single
 * stroke stop being distinguishable at that size. The step was removed from
 * tokens.css; this keeps it removed. A deleted Tailwind size does not fail the
 * build - `text-2xs` would simply stop setting a size and the text would
 * inherit its parent's - so the source is checked as well as the scale.
 */
const root = process.cwd();
const FLOOR_REM = 0.75;

const tokens = readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');

const sources = readdirSync(path.join(root, 'src'), { recursive: true, encoding: 'utf8' })
  .filter((file) => /\.(tsx|ts|css)$/.test(file) && !file.includes('generated'))
  .filter((file) => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'))
  .map((file) => ({ file, text: readFileSync(path.join(root, 'src', file), 'utf8') }));

describe('the 12px floor', () => {
  it('has no step in the type scale below 0.75rem', () => {
    const steps = [...tokens.matchAll(/--text-([a-z0-9]+):\s*([\d.]+)rem;/g)];

    expect(steps.length).toBeGreaterThan(5);
    for (const [, name, size] of steps) {
      expect(Number(size), `--text-${name}`).toBeGreaterThanOrEqual(FLOOR_REM);
    }
  });

  it('uses no removed or arbitrary size below the floor', () => {
    const offenders = sources.flatMap(({ file, text }) => {
      const removed = text.includes('text-2xs') ? [`${file}: text-2xs`] : [];
      const arbitrary = [...text.matchAll(/text-\[(\d+(?:\.\d+)?)(px|rem)\]/g)]
        .filter(([, value, unit]) => (unit === 'px' ? Number(value) < 12 : Number(value) < 0.75))
        .map(([match]) => `${file}: ${match}`);

      return [...removed, ...arbitrary];
    });

    expect(offenders).toEqual([]);
  });
});
