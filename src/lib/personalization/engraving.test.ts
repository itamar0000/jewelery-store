import { describe, expect, it } from 'vitest';

import { validatePersonalization, type FieldRule } from '@/lib/validation/personalization';

import { graphemeCount, textFieldIssue, textIssueMessage } from './engraving';

const NAME = { fieldType: 'TEXT', maxLength: 12 } as const;

describe('engraving', () => {
  it('counts the characters a person sees', () => {
    expect(graphemeCount('נֹעָה')).toBe(3);
    expect(graphemeCount('Zoé')).toBe(3);
    expect('נֹעָה'.length).toBe(5);
  });

  it('gives a name with niqqud the room it is promised', () => {
    // 12 letters, each pointed: 24 UTF-16 units, 12 characters.
    const pointed = 'אָ'.repeat(12);
    expect(textFieldIssue(pointed, NAME)).toBeNull();
    expect(textFieldIssue(pointed + 'בּ', NAME)).toBe('length');
  });

  it('refuses emoji in an engraving', () => {
    expect(textFieldIssue('נועה ❤️', { ...NAME, language: 'he' })).toBe('emoji');
    expect(textIssueMessage('emoji', '', 12)).toContain('אמוג׳י');
  });

  it('checks the letters against the chosen language, and allows digits and punctuation', () => {
    expect(textFieldIssue('Noa', { ...NAME, language: 'he' })).toBe('script-he');
    expect(textFieldIssue('נועה', { ...NAME, language: 'en' })).toBe('script-en');
    expect(textFieldIssue('נועה 2024', { ...NAME, language: 'he' })).toBeNull();
    expect(textFieldIssue("Noa & Li '24", { ...NAME, language: 'en' })).toBeNull();
    // No language chosen yet: the letters are not judged.
    expect(textFieldIssue('Noa', NAME)).toBeNull();
  });

  it('checks a note for length only', () => {
    expect(textFieldIssue('🙂 תודה', { fieldType: 'TEXTAREA', maxLength: 200 })).toBeNull();
  });
});

describe('the server applies the same rules', () => {
  const rules: FieldRule[] = [
    {
      key: 'name',
      labelHe: 'שם',
      fieldType: 'TEXT',
      isRequired: true,
      maxLength: 12,
      pattern: null,
      options: null,
    },
    {
      key: 'language',
      labelHe: 'שפה',
      fieldType: 'LANGUAGE',
      isRequired: true,
      maxLength: null,
      pattern: null,
      options: [
        { value: 'he', labelHe: 'עברית' },
        { value: 'en', labelHe: 'אנגלית' },
      ],
    },
  ];

  it('accepts a pointed Hebrew name of 12 characters', () => {
    expect(validatePersonalization(rules, { name: 'אָ'.repeat(12), language: 'he' }).ok).toBe(true);
  });

  it('refuses Latin letters under Hebrew, and emoji', () => {
    const latin = validatePersonalization(rules, { name: 'Noa', language: 'he' });
    const emoji = validatePersonalization(rules, { name: 'Noa ❤️', language: 'en' });
    expect(latin.ok).toBe(false);
    expect(emoji.ok).toBe(false);
    if (!latin.ok) expect(latin.errors[0]?.key).toBe('name');
  });
});
