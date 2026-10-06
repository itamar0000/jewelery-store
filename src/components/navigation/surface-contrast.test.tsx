import { readFileSync } from 'node:fs';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Header } from '@/components/layout/Header';
import { INITIAL_MENU_STATE } from '@/lib/navigation/menu-state';
import { PRIMARY_NAV } from '@/lib/navigation/taxonomy';

import { MegaMenu } from './MegaMenu';
import { MobileNav } from './MobileNav';
import { SearchOverlay } from './SearchOverlay';

/**
 * Readability of the paper panels that live INSIDE the ink masthead.
 *
 * WHY THIS FILE EXISTS. The masthead went to ink and set paper-coloured type
 * for everything beneath it. The mega menu, the mobile drawer and the search
 * overlay are rendered inside it and paint a paper sheet - so, inheriting that
 * type, every link, the typed query and both close buttons rendered paper on
 * paper at 1:1. Nothing failed: the markup was right, the colour was wrong, and
 * no test looked at colour.
 *
 * So this one does. There is no CSS engine here, but there does not need to be:
 * the colours are the design tokens, and the panels name them with utilities.
 * Each panel's background and its EFFECTIVE text colour - its own declaration,
 * or else the masthead's paper type it would inherit - are resolved through
 * src/styles/tokens.css to real hex values and measured against WCAG. Delete a
 * panel's foreground and this fails at 1:1, which is the bug, not a proxy for it.
 *
 * The focus ring is held the same way: the masthead sets `--focus-ring` to the
 * paper value so the ring shows on ink, and each paper panel must set it back,
 * or the ring would be paper on paper too.
 */

// Client components reach for the App Router; there is none under Vitest.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {} }),
  usePathname: () => '/',
}));

// ------------------------------------------------- tokens, as real colours

const TOKENS = readFileSync(path.join(process.cwd(), 'src/styles/tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

const REF = new Map(
  [...TOKENS.matchAll(/--(ref-[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1]!, m[2]!]),
);

/** `card-foreground` -> `#111110`, resolved through the reference layer. */
const COLOR = new Map<string, string>();
for (const match of TOKENS.matchAll(/--color-([\w-]+):\s*([^;]+);/g)) {
  const value = match[2]!.trim();
  const ref = /^var\(--(ref-[\w-]+)\)$/.exec(value)?.[1];
  if (ref !== undefined && REF.has(ref)) COLOR.set(match[1]!, REF.get(ref)!);
  else if (/^#[0-9a-f]{6}$/i.test(value)) COLOR.set(match[1]!, value);
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

// ------------------------------------------------- reading the markup

/** The class list of the first opening tag matching `root`. */
function classesOf(markup: string, root: RegExp): string[] {
  const tag = root.exec(markup)?.[0];
  if (tag === undefined) throw new Error(`no element matching ${root} in the rendered markup`);
  return (/class="([^"]*)"/.exec(tag)?.[1] ?? '').split(/\s+/).filter(Boolean);
}

/**
 * The colour a `bg-*` or `text-*` utility on THIS element resolves to.
 * State variants (`hover:`) and opacity modifiers (`/65`) are not the resting
 * colour and are skipped; `text-sm` and friends simply resolve to nothing.
 */
function colourOf(classes: readonly string[], prefix: 'bg' | 'text'): string | undefined {
  for (const name of classes) {
    if (name.includes(':') || name.includes('/') || !name.startsWith(`${prefix}-`)) continue;
    const colour = COLOR.get(name.slice(prefix.length + 1));
    if (colour !== undefined) return colour;
  }
  return undefined;
}

/** The colour this element sets `--focus-ring` to, if it sets it. */
function focusRingOf(classes: readonly string[]): string | undefined {
  for (const name of classes) {
    const token = /^\[--focus-ring:var\(--color-([\w-]+)\)\]$/.exec(name)?.[1];
    if (token !== undefined) return COLOR.get(token);
  }
  return undefined;
}

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

// ------------------------------------------------- the masthead

const masthead = classesOf(renderToStaticMarkup(<Header />), /<header\b[^>]*>/);
const mastheadGround = colourOf(masthead, 'bg');
const mastheadType = colourOf(masthead, 'text');
const mastheadRing = focusRingOf(masthead) ?? COLOR.get('ring');

describe('the ink masthead', () => {
  it('resolves its colours from the token file', () => {
    expect(mastheadGround).toBeDefined();
    expect(mastheadType).toBeDefined();
    expect(mastheadRing).toBeDefined();
  });

  it('sets type that reads on the ink bar', () => {
    expect(contrast(mastheadType!, mastheadGround!)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('sets a focus ring that shows on the ink bar', () => {
    // The global ring is ink; left alone, it is ink on ink here.
    expect(contrast(mastheadRing!, mastheadGround!)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

// ------------------------------------------------- the panels inside it

const noop = () => {};

const PANELS = [
  ...PRIMARY_NAV.filter((item) => item.columns !== undefined).map((item) => ({
    name: `mega menu "${item.label}"`,
    markup: renderToStaticMarkup(<MegaMenu item={item} labelledBy={`trigger-${item.id}`} />),
    root: /<section\b[^>]*>/,
  })),
  {
    name: 'mobile drawer',
    markup: renderToStaticMarkup(
      <MobileNav
        items={PRIMARY_NAV}
        state={{ ...INITIAL_MENU_STATE, mobileMenuOpen: true }}
        dispatch={noop}
      />,
    ),
    root: /<div\b[^>]*role="dialog"[^>]*>/,
  },
  {
    name: 'search overlay',
    markup: renderToStaticMarkup(
      <SearchOverlay state={{ ...INITIAL_MENU_STATE, searchOpen: true }} dispatch={noop} />,
    ),
    root: /<div\b[^>]*role="dialog"[^>]*>/,
  },
];

describe.each(PANELS)('$name, opened inside the masthead', ({ markup, root }) => {
  const classes = classesOf(markup, root);
  const ground = colourOf(classes, 'bg');

  // What the reader actually sees: the panel's own type, or the masthead's
  // paper type it inherits when it declares none.
  const type = colourOf(classes, 'text') ?? mastheadType!;
  const ring = focusRingOf(classes) ?? mastheadRing!;

  it('paints its own surface', () => {
    expect(ground).toBeDefined();
  });

  it('keeps its text readable on that surface (WCAG AA, 4.5:1)', () => {
    expect(contrast(type, ground!)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('keeps keyboard focus visible on that surface (3:1)', () => {
    expect(contrast(ring, ground!)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('does not set the masthead paper type on anything inside it', () => {
    // Close buttons and links inherit the panel's ink. A control that named the
    // masthead's paper colour would be invisible again, on its own.
    // Variants count too: `hover:text-background` would vanish on hover.
    expect(markup).not.toMatch(/[\s":]text-background(?=[\s"/])/);
  });
});
