'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { fromShekels, toAgorot } from '@/lib/money';

import { createProduct, createProductSchema, type CreateProductInput } from './create-product';
import {
  addProductImage,
  countProductImages,
  moveProductImage,
  removeProductImage,
  setImageSimulation,
} from './images';
import type { ActionState } from './panel-actions';
import {
  addDiamondSize,
  normalizeCarat,
  removeDiamondSize,
  setMenDepartment,
  setProductArchived,
  updateProductDetails,
  updateVariantPrices,
} from './products';
import { requireAdminAction } from './session';

/**
 * Admin mutations for products. Each re-checks the session (ARCHITECTURE 6);
 * prices are parsed and validated here, on the server, and never trusted from
 * the form as numbers.
 */

function field(form: FormData, name: string, max: number): string {
  return String(form.get(name) ?? '')
    .trim()
    .slice(0, max);
}

/** "4,890" / "₪4890" / "4890.50" -> agorot; null when it is not an amount. */
function parseShekels(raw: string, { allowNegative = false } = {}): number | null {
  const cleaned = raw.replace(/[,₪\s]/g, '');
  if (!cleaned) return null;
  const negative = cleaned.startsWith('-');
  if (negative && !allowNegative) return null;
  try {
    const agorot = toAgorot(fromShekels(negative ? cleaned.slice(1) : cleaned));
    return negative ? -agorot : agorot;
  } catch {
    return null;
  }
}

function refresh(productId: string, slug: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');
  revalidatePath(`/product/${slug}`);
}

export async function saveProductDetailsAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'productId', 40);
  const slug = field(form, 'slug', 200);
  const nameHe = field(form, 'nameHe', 120);
  if (!id) return { ok: false, message: 'המוצר לא נמצא.' };
  if (nameHe.length < 2) return { ok: false, message: 'שם המוצר קצר מדי.' };

  const visible = form.get('visible') === 'on';
  if (visible && (await countProductImages(id)) === 0) {
    return { ok: false, message: 'כדי להציג מוצר באתר צריך להעלות לפחות תמונה אחת.' };
  }

  await updateProductDetails(id, {
    nameHe,
    shortDescriptionHe: field(form, 'shortDescriptionHe', 300) || null,
    descriptionHe: field(form, 'descriptionHe', 5000) || null,
    visible,
  });
  refresh(id, slug);
  return { ok: true, message: 'נשמר.' };
}

/** The men's department membership (D4D.34). */
export async function saveMenDepartmentAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'productId', 40);
  const slug = field(form, 'slug', 200);
  if (!id) return { ok: false, message: 'המוצר לא נמצא.' };
  const choice = field(form, 'menCategory', 40);
  try {
    await setMenDepartment(id, choice || null);
  } catch {
    return { ok: false, message: 'הקטגוריה הזו אינה במחלקת הגברים.' };
  }
  refresh(id, slug);
  revalidatePath('/men', 'layout');
  return { ok: true, message: choice ? 'הדגם מופיע במחלקת הגברים.' : 'הדגם הוסר ממחלקת הגברים.' };
}

export async function savePricesAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'productId', 40);
  const slug = field(form, 'slug', 200);
  if (!id) return { ok: false, message: 'המוצר לא נמצא.' };

  const prices: { variantId: string; priceAgorot: number }[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith('price:')) continue;
    const agorot = parseShekels(String(value));
    if (agorot === null || agorot <= 0) {
      return {
        ok: false,
        message: `מחיר לא תקין: "${String(value)}". כתבו מספר בשקלים, למשל 4890.`,
      };
    }
    prices.push({ variantId: key.slice('price:'.length), priceAgorot: agorot });
  }
  if (prices.length === 0) return { ok: false, message: 'אין מחירים לשמור.' };

  await updateVariantPrices(id, prices);
  refresh(id, slug);
  return { ok: true, message: 'המחירים נשמרו.' };
}

export async function archiveProductAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'productId', 40);
  const slug = field(form, 'slug', 200);
  const archive = form.get('archive') === 'true';
  if (!id) return { ok: false, message: 'המוצר לא נמצא.' };

  await setProductArchived(id, archive);
  refresh(id, slug);
  return {
    ok: true,
    message: archive ? 'המוצר הועבר לארכיון.' : 'המוצר שוחזר. הוא מוסתר עד שתסמנו "מוצג באתר".',
  };
}

export async function addDiamondSizeAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'productId', 40);
  const slug = field(form, 'slug', 200);
  const carat = normalizeCarat(field(form, 'carat', 10));
  if (!id) return { ok: false, message: 'המוצר לא נמצא.' };
  if (!carat) return { ok: false, message: 'גודל לא תקין. כתבו משקל בקראט, למשל 0.70.' };

  const difference = parseShekels(field(form, 'difference', 20), { allowNegative: true });
  if (difference === null) {
    return {
      ok: false,
      message: 'כתבו את הפרש המחיר בשקלים (0 אם אין הפרש, מינוס לגודל קטן יותר).',
    };
  }

  const result = await addDiamondSize({ productId: id, carat, priceDifferenceAgorot: difference });
  if (!result.ok) {
    const messages = {
      'no-diamond': 'למוצר הזה אין משקל יהלום רשום, ולכן אי אפשר להוסיף גדלים.',
      exists: `הגודל ${carat} כבר קיים.`,
      'no-variants': 'למוצר אין גרסאות פעילות.',
      negative: 'עם ההפרש הזה המחיר של אחת הגרסאות יורד מתחת לאפס.',
    } as const;
    return { ok: false, message: messages[result.reason] };
  }
  refresh(id, slug);
  return {
    ok: true,
    message: `נוסף גודל ${carat} קראט (${result.created} גרסאות). אפשר לדייק כל מחיר בטבלה.`,
  };
}

export async function removeDiamondSizeAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'productId', 40);
  const slug = field(form, 'slug', 200);
  const valueId = field(form, 'valueId', 40);
  if (!id || !valueId) return { ok: false, message: 'הגודל לא נמצא.' };

  const result = await removeDiamondSize(id, valueId);
  if (result === 'base') {
    return { ok: false, message: 'זה הגודל הבסיסי של המוצר, ואי אפשר להסיר אותו.' };
  }
  if (result === 'missing') return { ok: false, message: 'הגודל לא נמצא.' };
  refresh(id, slug);
  return { ok: true, message: 'הגודל הוסר מהאתר.' };
}

// ------------------------------------------------------------------ images

const UPLOAD_ERRORS = {
  type: 'הקובץ אינו תמונת JPG, PNG או WEBP.',
  size: 'התמונה גדולה מדי גם אחרי הקטנה. נסו תמונה אחרת.',
  group: 'הקבוצה לא נמצאה. רעננו את הדף ונסו שוב.',
  storage: 'אחסון התמונות לא מוגדר בשרת, ולכן אי אפשר להעלות.',
  upload: 'ההעלאה לאחסון נכשלה. נסו שוב.',
} as const;

/** One photograph, already downscaled by the browser. Called once per file. */
export async function uploadProductImageAction(form: FormData): Promise<ActionState> {
  await requireAdminAction();
  const productId = field(form, 'productId', 40);
  const slug = field(form, 'slug', 200);
  const group = field(form, 'group', 20);
  const file = form.get('file');
  if (!productId || !group || !(file instanceof Blob)) {
    return { ok: false, message: UPLOAD_ERRORS.group };
  }
  const dimension = (name: string) => {
    const value = Number(form.get(name));
    return Number.isInteger(value) && value > 0 && value <= 20_000 ? value : null;
  };

  const result = await addProductImage({
    productId,
    group,
    bytes: new Uint8Array(await file.arrayBuffer()),
    simulated: form.get('simulated') === 'true',
    width: dimension('width'),
    height: dimension('height'),
  });
  if (!result.ok) return { ok: false, message: UPLOAD_ERRORS[result.reason] };
  refresh(productId, slug);
  return { ok: true, message: null };
}

export async function imageCommandAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const productId = field(form, 'productId', 40);
  const slug = field(form, 'slug', 200);
  const group = field(form, 'group', 20);
  const storageKey = field(form, 'storageKey', 512);
  const command = field(form, 'command', 20);
  if (!productId || !group || !storageKey) return { ok: false, message: 'התמונה לא נמצאה.' };

  switch (command) {
    case 'earlier':
    case 'later':
      await moveProductImage(productId, group, storageKey, command);
      break;
    case 'simulation-on':
    case 'simulation-off':
      await setImageSimulation(productId, group, storageKey, command === 'simulation-on');
      break;
    case 'remove':
      await removeProductImage(productId, group, storageKey);
      break;
    default:
      return { ok: false, message: 'פעולה לא מוכרת.' };
  }
  refresh(productId, slug);
  return { ok: true, message: null };
}

// ------------------------------------------------------------- new product

export async function createProductAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const price = parseShekels(field(form, 'price', 20));
  if (price === null || price <= 0) {
    return { ok: false, message: 'כתבו מחיר בשקלים, למשל 2490.' };
  }
  const prepDays = Number(field(form, 'prepDays', 4) || '10');

  const caratRaw = field(form, 'carat', 10);
  let diamond: CreateProductInput['diamond'] = null;
  if (caratRaw) {
    const carat = normalizeCarat(caratRaw);
    if (!carat) return { ok: false, message: 'משקל היהלום לא תקין. כתבו בקראט, למשל 0.50.' };
    const stones = field(form, 'stoneCount', 4);
    diamond = {
      carat,
      isLabGrown: field(form, 'origin', 10) !== 'natural',
      shape: field(form, 'shape', 20),
      stoneCount: stones ? Number(stones) : null,
      color: field(form, 'color', 10).toUpperCase(),
      clarity: field(form, 'clarity', 10).toUpperCase(),
      // Empty takes the shop's standard for the shape (D4D.31).
      cut:
        field(form, 'cut', 30) ||
        (field(form, 'shape', 20) === 'Round' ? 'Triple VG – Triple EX' : 'VG/VG – EX/EX'),
    };
  }

  const parsed = createProductSchema.safeParse({
    nameHe: field(form, 'nameHe', 120),
    slug: field(form, 'slug', 60),
    categoryId: field(form, 'categoryId', 40),
    shortDescriptionHe: field(form, 'shortDescriptionHe', 300),
    descriptionHe: field(form, 'descriptionHe', 5000),
    colours: form.getAll('colours').map(String),
    priceAgorot: price,
    prepDays,
    diamond,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'יש שדה לא תקין.' };
  }

  const result = await createProduct(parsed.data);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath('/admin/products');
  redirect(`/admin/products/${result.productId}?created=1`);
}
