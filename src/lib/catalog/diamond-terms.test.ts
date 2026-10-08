import { describe, expect, it } from 'vitest';

import { clarityGloss, colorGloss, cutGloss, shapeNameHe } from './diamond-terms';

describe('shapeNameHe', () => {
  it('names the shapes the catalogue carries, whatever the case', () => {
    expect(shapeNameHe('Round')).toBe('עגול');
    expect(shapeNameHe('oval')).toBe('אובלי');
    expect(shapeNameHe('Emerald')).toBe('אמרלד');
    expect(shapeNameHe('Pear')).toBe('טיפה');
    expect(shapeNameHe('Princess')).toBe('פרינסס');
  });

  it('does not guess at a shape it does not know', () => {
    expect(shapeNameHe('Trillion')).toBeNull();
  });
});

describe('colorGloss', () => {
  it('places a letter in its group on the D-to-Z scale', () => {
    expect(colorGloss('D')).toBe('חסר צבע');
    expect(colorGloss('F')).toBe('חסר צבע');
    expect(colorGloss('G')).toBe('כמעט חסר צבע');
    expect(colorGloss('J')).toBe('כמעט חסר צבע');
    expect(colorGloss('K')).toBe('גוון צהבהב קלוש');
    expect(colorGloss('S')).toBe('גוון צהבהב');
  });

  it('glosses a range when both ends share a group', () => {
    expect(colorGloss('D-F')).toBe('חסר צבע');
    expect(colorGloss('d – f')).toBe('חסר צבע');
    expect(colorGloss('G-J')).toBe('כמעט חסר צבע');
    expect(colorGloss('E-H')).toBeNull();
  });

  it('says nothing about a value that is not a colour grade', () => {
    expect(colorGloss('Fancy Pink')).toBeNull();
    expect(colorGloss('')).toBeNull();
  });
});

describe('clarityGloss', () => {
  it('explains the grades the catalogue carries', () => {
    expect(clarityGloss('VS1')).toBe('פגמים זעירים, נראים רק בהגדלה');
    expect(clarityGloss('VS2')).toBe('פגמים זעירים, נראים רק בהגדלה');
    expect(clarityGloss('vvs2')).toBe('פגמים זעירים מאוד, קשים לאיתור גם בהגדלה');
  });

  it('says nothing about a grade off the scale', () => {
    expect(clarityGloss('VS3')).toBeNull();
  });
});

describe('cutGloss', () => {
  it('translates the cut scale', () => {
    expect(cutGloss('Excellent')).toBe('מצוין');
    expect(cutGloss('Very Good')).toBe('טוב מאוד');
    expect(cutGloss('very  good')).toBe('טוב מאוד');
  });
});

describe('the shop standard as ranges (D4D.31)', () => {
  it('reads a clarity range from its best end to its worst', () => {
    expect(clarityGloss('IF-VS1')).toBe('ללא פגמים פנימיים עד פגמים זעירים שנראים רק בהגדלה');
    expect(clarityGloss('IF-XX')).toBeNull();
  });

  it('names what each finish range grades', () => {
    expect(cutGloss('Triple VG – Triple EX')).toBe('חיתוך, ליטוש וסימטריה: טוב מאוד עד מצוין');
    expect(cutGloss('VG/VG-EX/EX')).toBe('ליטוש וסימטריה: טוב מאוד עד מצוין');
    expect(cutGloss('Excellent')).toBe('מצוין');
  });
});
