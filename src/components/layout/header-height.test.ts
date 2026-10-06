import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `--header-height` (globals.css) is how the hero, the product gallery and
 * anchor scrolling clear the sticky header. It is a figure written down beside
 * the header rather than measured from it, so this test holds the two together:
 * change a row's height in Header.tsx or DesktopNav.tsx and it fails until the
 * token follows. The figures it replaced had drifted - the hero still allowed
 * for a 4rem header after the desktop one grew a navigation row.
 */
const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

const css = read('src/app/globals.css');
const header = read('src/components/layout/Header.tsx');
const nav = read('src/components/navigation/DesktopNav.tsx');

/** Tailwind's spacing scale: `h-16` is 16 x 0.25rem. */
const rem = (step: string | undefined) => Number(step) * 0.25;

const masthead = /className="flex h-(\d+) items-center gap-4 lg:h-(\d+)"/.exec(header);
const navRow = /inline-flex h-(\d+) items-center px-3/.exec(nav);

describe('--header-height', () => {
  it('finds the rows it is checked against', () => {
    expect(masthead).not.toBeNull();
    expect(navRow).not.toBeNull();
  });

  it('is the masthead row below lg', () => {
    const base = /--header-height:\s*([\d.]+)rem;/.exec(css);

    expect(Number(base?.[1])).toBe(rem(masthead?.[1]));
  });

  it('is the masthead row, a hairline and the navigation row from lg', () => {
    const desktop = /--header-height:\s*calc\(([\d.]+)rem \+ 1px\)/.exec(css);

    expect(Number(desktop?.[1])).toBe(rem(masthead?.[2]) + rem(navRow?.[1]));
    // The 1px is the navigation row's top rule.
    expect(header).toContain('relative hidden border-t lg:block');
  });
});
