/**
 * Diamond grading terms, said in Hebrew.
 *
 * THE TERMS STAY AS PRINTED. A certificate says "Round", "G", "VS1",
 * "Excellent" (specification section 49), and a shopper comparing a page with
 * a certificate - or with another shop - needs to see exactly those words. So
 * the grade itself is never translated away; it is GLOSSED: a Hebrew name for
 * a shape, a few words for what a grade means.
 *
 * WHAT THE GLOSSES ARE. The standard grading scales as the grading
 * laboratories define them - colour D to Z, clarity FL to I3, cut Excellent to
 * Poor - in plain words. They describe the scale, not any particular stone,
 * and they promise nothing about this shop's stones beyond the grade already
 * on the page. A grade not on the scale gets no gloss rather than a guess.
 */

/** Hebrew names for the shapes, as Israeli jewellers say them. */
const SHAPES: Readonly<Record<string, string>> = {
  round: 'עגול',
  oval: 'אובלי',
  emerald: 'אמרלד',
  pear: 'טיפה',
  princess: 'פרינסס',
  cushion: 'קושן',
  marquise: 'מרקיזה',
  heart: 'לב',
  radiant: 'רדיאנט',
  asscher: 'אשר',
};

/** "עגול" for "Round"; null for a shape this list does not know. */
export function shapeNameHe(shape: string): string | null {
  return SHAPES[shape.trim().toLowerCase()] ?? null;
}

/**
 * Colour, D to Z: how little yellow the stone holds.
 *
 * Grouped as the scale itself groups the letters; a single letter's place
 * inside its group is not glossed, because the difference is not one a
 * shopper can be told in words.
 */
export function colorGloss(grade: string): string | null {
  const letter = grade.trim().toUpperCase();
  if (!/^[D-Z]$/.test(letter)) return null;
  if (letter <= 'F') return 'חסר צבע';
  if (letter <= 'J') return 'כמעט חסר צבע';
  if (letter <= 'M') return 'גוון צהבהב קלוש';
  return 'גוון צהבהב';
}

const CLARITY: Readonly<Record<string, string>> = {
  FL: 'ללא פגמים, גם בהגדלה',
  IF: 'ללא פגמים פנימיים, גם בהגדלה',
  VVS1: 'פגמים זעירים מאוד, קשים לאיתור גם בהגדלה',
  VVS2: 'פגמים זעירים מאוד, קשים לאיתור גם בהגדלה',
  VS1: 'פגמים זעירים, נראים רק בהגדלה',
  VS2: 'פגמים זעירים, נראים רק בהגדלה',
  SI1: 'פגמים קלים, נראים בהגדלה',
  SI2: 'פגמים קלים, נראים בהגדלה',
  I1: 'פגמים שנראים בעין',
  I2: 'פגמים שנראים בעין',
  I3: 'פגמים שנראים בעין',
};

/** Clarity, FL to I3: how few inclusions, and how hard they are to see. */
export function clarityGloss(grade: string): string | null {
  return CLARITY[grade.trim().toUpperCase().replace(/\s+/g, '')] ?? null;
}

const CUT: Readonly<Record<string, string>> = {
  excellent: 'מצוין',
  'very good': 'טוב מאוד',
  good: 'טוב',
  fair: 'סביר',
  poor: 'חלש',
};

/** Cut, Excellent to Poor: how well the stone returns light. */
export function cutGloss(grade: string): string | null {
  return CUT[grade.trim().toLowerCase().replace(/\s+/g, ' ')] ?? null;
}

/**
 * Where the stones come from, in the words every surface uses: the card, the
 * product subtitle, the diamond table and the filter (D4D.15). Plural when the
 * piece carries more than one stone.
 */
export function diamondOriginLabel(isLabGrown: boolean, stoneCount: number | null = 1): string {
  const many = stoneCount !== null && stoneCount > 1;
  if (isLabGrown) return many ? 'יהלומי מעבדה' : 'יהלום מעבדה';
  return many ? 'יהלומים טבעיים' : 'יהלום טבעי';
}
