/**
 * A product's choices, in the address: `/product/aurora-ring?karat=18k&color=rose&size=52`.
 *
 * WHY THE ADDRESS. The choices used to live only in the page's memory, so
 * anything that left the page - the size guide, a look at the bag, a shared
 * link - came back to the first variant: 18K became 14K and the price changed
 * without a word (critique 2026-10-06, P2). In the address they survive Back,
 * a reload and a link sent to someone else, and the custom-request form reads
 * the same parameters to know which model, made which way, it starts from.
 *
 * Short names for the four options the catalogue has; any other option is
 * addressed by its own code. Values are written in lower case and matched
 * without regard to case, against the option's own values - an unknown value
 * is simply ignored, never trusted.
 */

const PARAM_BY_CODE: Readonly<Record<string, string>> = {
  gold_karat: 'karat',
  gold_color: 'color',
  ring_size: 'size',
  length: 'length',
  diamond_carat: 'carat',
};

export interface ChoiceOption {
  readonly id: string;
  readonly code: string;
  readonly values: readonly { readonly id: string; readonly value: string }[];
}

type ParamSource =
  | URLSearchParams
  | { readonly get: (name: string) => string | null }
  | Readonly<Record<string, string | string[] | undefined>>;

/** The parameter an option is written under. */
export function paramFor(code: string): string {
  return PARAM_BY_CODE[code] ?? code;
}

function read(source: ParamSource, name: string): string | null {
  if (typeof (source as URLSearchParams).get === 'function') {
    return (source as URLSearchParams).get(name);
  }
  const value = (source as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/** The choices the address names, as option id -> value id. Unknown values are dropped. */
export function choicesFromParams(
  options: readonly ChoiceOption[],
  source: ParamSource,
): Record<string, string> {
  const chosen: Record<string, string> = {};

  for (const option of options) {
    const raw = read(source, paramFor(option.code))?.trim().toLowerCase();
    if (!raw) continue;
    const match = option.values.find((value) => value.value.toLowerCase() === raw);
    if (match) chosen[option.id] = match.id;
  }

  return chosen;
}

/** The address's query for the given choices (option id -> value id), in option order. */
export function choicesToParams(
  options: readonly ChoiceOption[],
  chosen: Readonly<Record<string, string>>,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const option of options) {
    const value = option.values.find((candidate) => candidate.id === chosen[option.id]);
    if (value) params.set(paramFor(option.code), value.value.toLowerCase());
  }

  return params;
}
