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
  const value = grade.trim().toUpperCase();
  // A range, as the shop states its stones ("D-F", D4D.30): glossed when
  // both ends fall in the same group, since then the group is the fact.
  const range = /^([D-Z])\s*[-–]\s*([D-Z])$/.exec(value);
  if (range) {
    const from = colorGroup(range[1]!);
    return from === colorGroup(range[2]!) ? from : null;
  }
  if (!/^[D-Z]$/.test(value)) return null;
  return colorGroup(value);
}

function colorGroup(letter: string): string {
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

/** The same scale, in the short form a range is read in. */
const CLARITY_SHORT: Readonly<Record<string, string>> = {
  FL: 'ללא פגמים',
  IF: 'ללא פגמים פנימיים',
  VVS1: 'פגמים זעירים מאוד',
  VVS2: 'פגמים זעירים מאוד',
  VS1: 'פגמים זעירים שנראים רק בהגדלה',
  VS2: 'פגמים זעירים שנראים רק בהגדלה',
  SI1: 'פגמים קלים',
  SI2: 'פגמים קלים',
  I1: 'פגמים שנראים בעין',
  I2: 'פגמים שנראים בעין',
  I3: 'פגמים שנראים בעין',
};

/**
 * Clarity, FL to I3: how few inclusions, and how hard they are to see. A
 * range, as the shop states its standard ("IF-VS1", D4D.31), reads from its
 * best end to its worst.
 */
export function clarityGloss(grade: string): string | null {
  const value = grade.trim().toUpperCase().replace(/\s+/g, '');
  const range = /^([A-Z0-9]+)[-–]([A-Z0-9]+)$/.exec(value);
  if (range) {
    const from = CLARITY_SHORT[range[1]!];
    const to = CLARITY_SHORT[range[2]!];
    return from && to ? `${from} עד ${to}` : null;
  }
  return CLARITY[value] ?? null;
}

const CUT: Readonly<Record<string, string>> = {
  excellent: 'מצוין',
  'very good': 'טוב מאוד',
  good: 'טוב',
  fair: 'סביר',
  poor: 'חלש',
};

/**
 * The shop's stated finish ranges (D4D.31): a round stone graded on cut,
 * polish and symmetry together ("Triple"), a fancy shape on polish and
 * symmetry, which is all a fancy shape is graded on.
 */
const FINISH_RANGES: Readonly<Record<string, string>> = {
  'triple vg – triple ex': 'חיתוך, ליטוש וסימטריה: טוב מאוד עד מצוין',
  'vg/vg – ex/ex': 'ליטוש וסימטריה: טוב מאוד עד מצוין',
};

/** Cut, Excellent to Poor: how well the stone returns light. */
export function cutGloss(grade: string): string | null {
  const value = grade
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–]\s*/, ' – ');
  return FINISH_RANGES[value] ?? CUT[value] ?? null;
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
