import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Bidi } from './bidi';

/**
 * Rendered with `react-dom/server` rather than a DOM testing library: the
 * contract under test is the emitted markup, which needs no browser
 * environment and therefore no jsdom dependency.
 */
describe('Bidi', () => {
  it('marks its content as left-to-right', () => {
    expect(renderToStaticMarkup(<Bidi>14K</Bidi>)).toContain('dir="ltr"');
  });

  it('isolates the run, so neighbouring punctuation cannot be reordered', () => {
    // The `dir` attribute alone is not sufficient; the isolate is what stops
    // bidi drift (MASTER_SPECIFICATION section 49).
    expect(renderToStaticMarkup(<Bidi>VS1</Bidi>)).toContain('unicode-bidi:isolate');
  });

  it('renders its children unchanged', () => {
    expect(renderToStaticMarkup(<Bidi>Rose Gold</Bidi>)).toContain('Rose Gold');
  });

  it('stays inline, so it can sit inside a Hebrew sentence', () => {
    const markup = renderToStaticMarkup(<Bidi>18K</Bidi>);
    expect(markup.startsWith('<span')).toBe(true);
    expect(markup).not.toContain('<div');
  });
});
