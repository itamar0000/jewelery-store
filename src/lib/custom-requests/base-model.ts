import { choicesFromParams, choicesToParams } from '@/lib/catalog/choice-params';
import { getProductBySlug } from '@/lib/catalog/queries';

/**
 * The model a request starts from, as the request page shows it: its name, its
 * photograph in the chosen colour, and the choices named in the address -
 * matched against the model's own options, so a made-up value shows nothing.
 */
export interface BaseModel {
  readonly slug: string;
  readonly nameHe: string;
  readonly productType: string;
  readonly image: { readonly url: string | null; readonly alt: string } | null;
  /** "גוון זהב: זהב אדום", in the model's option order. */
  readonly choices: readonly { readonly labelHe: string; readonly valueHe: string }[];
  /** The choices again, as address parameters - sent with the request. */
  readonly params: Readonly<Record<string, string>>;
  /** Back to the model, made the same way. */
  readonly href: string;
}

export async function getBaseModel(
  slug: string | undefined,
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
): Promise<BaseModel | null> {
  if (!slug) return null;
  const product = await getProductBySlug(slug);
  if (!product) return null;

  const chosen = choicesFromParams(product.options, searchParams);
  const params = choicesToParams(product.options, chosen);

  const axisValueIds = product.options.flatMap((option) =>
    option.isAxis && chosen[option.id] ? [chosen[option.id]!] : [],
  );
  const variant =
    product.variants.find((candidate) =>
      axisValueIds.every((id) => candidate.optionValueIds.includes(id)),
    ) ?? product.variants[0];
  const images = variant && variant.images.length > 0 ? variant.images : product.images;
  const image = images.find((candidate) => candidate.isPrimary) ?? images[0] ?? null;

  const query = params.toString();

  return {
    slug: product.slug,
    nameHe: product.nameHe,
    productType: product.productType,
    image: image ? { url: image.url, alt: image.altHe } : null,
    choices: product.options.flatMap((option) => {
      const value = option.values.find((candidate) => candidate.id === chosen[option.id]);
      return value ? [{ labelHe: option.nameHe, valueHe: value.labelHe }] : [];
    }),
    params: Object.fromEntries(params),
    href: `/product/${product.slug}${query ? `?${query}` : ''}`,
  };
}
