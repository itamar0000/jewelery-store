import { describe, expect, it } from 'vitest';

import { choicesFromParams, choicesToParams, paramFor } from './choice-params';

const options = [
  {
    id: 'karat',
    code: 'gold_karat',
    values: [
      { id: 'k14', value: '14K' },
      { id: 'k18', value: '18K' },
    ],
  },
  {
    id: 'colour',
    code: 'gold_color',
    values: [
      { id: 'yellow', value: 'YELLOW' },
      { id: 'rose', value: 'ROSE' },
    ],
  },
  { id: 'size', code: 'ring_size', values: [{ id: 's52', value: '52' }] },
];

describe('choice parameters', () => {
  it('writes short names and lower-case values, in option order', () => {
    expect(choicesToParams(options, { size: 's52', colour: 'rose', karat: 'k18' }).toString()).toBe(
      'karat=18k&color=rose&size=52',
    );
  });

  it('reads them back without regard to case, from either source shape', () => {
    const expected = { karat: 'k18', colour: 'rose', size: 's52' };
    expect(choicesFromParams(options, new URLSearchParams('karat=18K&color=Rose&size=52'))).toEqual(
      expected,
    );
    expect(choicesFromParams(options, { karat: '18k', color: ['rose'], size: '52' })).toEqual(
      expected,
    );
  });

  it('ignores a value the model does not have', () => {
    expect(choicesFromParams(options, { karat: '24k', color: 'blue' })).toEqual({});
  });

  it('addresses an unknown option by its code', () => {
    expect(paramFor('pendant_type')).toBe('pendant_type');
  });
});
