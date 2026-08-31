/**
 * Hebrew query normalization and a curated synonym set.
 *
 * WHY THIS EXISTS AT ALL. PostgreSQL ships no Hebrew text-search
 * configuration - no stemmer, no stop words, no lemmatizer (ARCHITECTURE
 * section 9). So `to_tsvector('hebrew', ...)` is not available and trigram
 * similarity does the matching instead. Trigrams are tolerant of typos and
 * partial words but completely literal about vocabulary: a shopper typing
 * "טבעות" gets no trigram credit for a product named "טבעת", and one typing
 * "white gold" gets none for "זהב לבן".
 *
 * That gap is closed here, and at this catalog size this is where Hebrew search
 * quality is actually won.
 *
 * NORMALIZATION IS DELIBERATELY CONSERVATIVE. Over-normalizing Hebrew damages
 * real product searches: stripping the definite article ה turns "הלו" into
 * "לו", and removing final-letter forms breaks words where they are medial.
 * So this does four safe things and stops:
 *
 *   1. collapses whitespace
 *   2. strips punctuation that shoppers type but products never contain
 *   3. removes niqqud (vowel points), which shoppers rarely type and product
 *      copy never carries - so leaving them in would guarantee a miss
 *   4. normalizes Hebrew geresh/gershayim to ASCII quotes, because "14 ק״ג"
 *      and `14 ק"ג` are the same query typed on different keyboards
 *
 * It does NOT stem, does NOT strip prefixes, and does NOT transliterate.
 */

/** Hebrew niqqud and cantillation, which product copy never carries. */
const NIQQUD = /[֑-ׇ]/g;

/** Geresh/gershayim, typed inconsistently across keyboards. */
const HEBREW_QUOTES = /[׳‘’]/g;
const HEBREW_DOUBLE_QUOTES = /[״“”]/g;

/**
 * Punctuation a shopper types that never appears inside a product term.
 * The hyphen is deliberately absent: "14K-לבן" and carat ranges use it.
 */
const NOISE_PUNCTUATION = /[.,;:!?()[\]{}"'`~@#$%^&*_=+|\\/<>]/g;

/** Normalizes a raw query or a document fragment for comparison. */
export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFKC')
    .replace(NIQQUD, '')
    .replace(HEBREW_DOUBLE_QUOTES, '"')
    .replace(HEBREW_QUOTES, "'")
    .replace(NOISE_PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * The curated synonym set.
 *
 * DATA, NOT CLEVERNESS. Each entry maps one canonical concept to the words a
 * shopper might type for it. Expansion is one-directional at query time: typing
 * any listed term also searches for every other term in that group, so
 * "white gold" finds "זהב לבן" and vice versa.
 *
 * RULES FOR ADDING ENTRIES, because an over-broad synonym set is worse than
 * none - it makes every query match everything:
 *
 *   - only add terms a customer plausibly types;
 *   - never map two DIFFERENT products together ("טבעת" must not reach
 *     "צמיד"), because that destroys precision;
 *   - English terms belong here when they appear on certificates or in common
 *     use (specification section 49 keeps Round, Oval, VS1, 14K in English).
 *
 * The set is intentionally small and flat so a non-engineer can read it. When
 * the business wants to edit it without a deploy, this moves to a table; the
 * shape is already row-like for that reason.
 */
export interface SynonymGroup {
  readonly id: string;
  readonly terms: readonly string[];
}

export const SYNONYM_GROUPS: readonly SynonymGroup[] = [
  // --- product types ---
  { id: 'ring', terms: ['טבעת', 'טבעות', 'ring', 'rings'] },
  { id: 'earrings', terms: ['עגיל', 'עגילים', 'earring', 'earrings'] },
  { id: 'necklace', terms: ['שרשרת', 'שרשראות', 'necklace', 'necklaces'] },
  { id: 'pendant', terms: ['תליון', 'תליונים', 'pendant'] },
  { id: 'bracelet', terms: ['צמיד', 'צמידים', 'bracelet', 'bracelets'] },
  { id: 'set', terms: ['סט', 'סטים', 'set', 'sets'] },

  // --- specific pieces ---
  { id: 'engagement', terms: ['אירוסין', 'engagement'] },
  { id: 'wedding', terms: ['נישואין', 'חתונה', 'wedding'] },
  { id: 'tennis', terms: ['טניס', 'tennis'] },
  { id: 'hoop', terms: ['חישוק', 'חישוקים', 'hoop', 'hoops'] },
  { id: 'stud', terms: ['צמוד', 'צמודים', 'stud', 'studs'] },
  { id: 'solitaire', terms: ['סוליטר', 'solitaire'] },
  { id: 'eternity', terms: ['איטרניטי', 'eternity'] },
  { id: 'name-jewellery', terms: ['שם', 'חריטה', 'name', 'engraved'] },

  // --- materials ---
  { id: 'gold', terms: ['זהב', 'gold'] },
  { id: 'yellow-gold', terms: ['זהב צהוב', 'צהוב', 'yellow gold', 'yellow'] },
  { id: 'white-gold', terms: ['זהב לבן', 'לבן', 'white gold', 'white'] },
  { id: 'rose-gold', terms: ['זהב אדום', 'זהב ורוד', 'אדום', 'rose gold', 'rose'] },
  { id: 'diamond', terms: ['יהלום', 'יהלומים', 'diamond', 'diamonds'] },
  { id: 'lab-grown', terms: ['מעבדה', 'lab grown', 'lab-grown'] },

  // --- karat ---
  { id: '14k', terms: ['14k', '14 קראט', '14קראט'] },
  { id: '18k', terms: ['18k', '18 קראט', '18קראט'] },

  // --- diamond shapes, as printed on certificates ---
  { id: 'round', terms: ['round', 'עגול'] },
  { id: 'oval', terms: ['oval', 'אובל'] },
  { id: 'princess', terms: ['princess', 'פרינסס'] },
  { id: 'emerald', terms: ['emerald', 'אמרלד'] },
  { id: 'pear', terms: ['pear', 'טיפה'] },

  // --- occasions and audiences ---
  { id: 'bridal', terms: ['כלה', 'bridal'] },
  { id: 'gift', terms: ['מתנה', 'מתנות', 'gift'] },
  { id: 'personalized', terms: ['אישי', 'בהתאמה אישית', 'personalized', 'custom'] },
];

/** Term to group ids, built once. Multi-word terms are matched by phrase. */
const TERM_TO_GROUPS = (() => {
  const map = new Map<string, string[]>();

  for (const group of SYNONYM_GROUPS) {
    for (const term of group.terms) {
      const key = normalizeSearchText(term);
      map.set(key, [...(map.get(key) ?? []), group.id]);
    }
  }

  return map;
})();

const GROUP_BY_ID = new Map(SYNONYM_GROUPS.map((group) => [group.id, group]));

/**
 * A parsed query: the terms actually searched for.
 *
 * `terms` are what the shopper typed (normalized). `expansions` are the extra
 * words their synonyms bring in. They are kept apart because they score
 * differently - a document matching what was literally typed should outrank one
 * matching only a synonym.
 */
export interface ParsedQuery {
  /** The normalized query, whitespace-collapsed. */
  readonly normalized: string;
  /** Individual words the shopper typed. */
  readonly terms: readonly string[];
  /** Synonym-derived alternatives, excluding the typed terms themselves. */
  readonly expansions: readonly string[];
  /** True when the query has nothing searchable in it. */
  readonly isEmpty: boolean;
}

/** Longest multi-word synonym, so phrase lookup does not scan unboundedly. */
const MAX_PHRASE_WORDS = 3;

/**
 * Normalizes a raw query and expands it through the synonym set.
 *
 * PHRASES ARE MATCHED BEFORE SINGLE WORDS, so "זהב לבן" resolves to the
 * white-gold group rather than to the separate "gold" and "white" groups. That
 * matters: white gold is a specific material, not the intersection of two
 * loosely related words.
 *
 * Expansion is capped. A three-word query hitting three large groups could
 * otherwise produce dozens of terms, and every extra term makes the result set
 * broader and the ranking mushier.
 */
export function parseSearchQuery(raw: string, maxExpansions = 12): ParsedQuery {
  const normalized = normalizeSearchText(raw);

  if (normalized.length === 0) {
    return { normalized: '', terms: [], expansions: [], isEmpty: true };
  }

  const words = normalized.split(' ').filter((word) => word.length > 0);
  const groupIds = new Set<string>();
  const consumed = new Set<number>();

  // Longest phrase first.
  for (let size = MAX_PHRASE_WORDS; size >= 1; size -= 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      const indexes = Array.from({ length: size }, (_, offset) => start + offset);
      if (indexes.some((index) => consumed.has(index))) continue;

      const phrase = words.slice(start, start + size).join(' ');
      const groups = TERM_TO_GROUPS.get(phrase);
      if (!groups) continue;

      for (const id of groups) groupIds.add(id);
      for (const index of indexes) consumed.add(index);
    }
  }

  const typed = new Set(words);
  const expansions: string[] = [];

  for (const id of groupIds) {
    for (const term of GROUP_BY_ID.get(id)?.terms ?? []) {
      const candidate = normalizeSearchText(term);
      if (candidate.length === 0 || typed.has(candidate)) continue;
      if (expansions.includes(candidate)) continue;

      expansions.push(candidate);
      if (expansions.length >= maxExpansions) break;
    }
    if (expansions.length >= maxExpansions) break;
  }

  return {
    normalized,
    terms: words,
    expansions,
    // A query of only punctuation normalizes to nothing searchable.
    isEmpty: words.length === 0,
  };
}
