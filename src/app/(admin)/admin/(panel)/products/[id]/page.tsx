import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionForm } from '@/components/admin/ActionForm';
import { ImageManager } from '@/components/admin/ImageManager';
import { StatusPill } from '@/components/admin/StatusTabs';
import { INPUT, LABEL } from '@/components/admin/styles';
import { resolveImageUrl } from '@/lib/catalog/images';
import {
  addDiamondSizeAction,
  archiveProductAction,
  removeDiamondSizeAction,
  saveMenDepartmentAction,
  savePricesAction,
  saveProductDetailsAction,
} from '@/lib/admin/product-actions';
import { listImageGroups } from '@/lib/admin/images';
import { getMenDepartment, getProductForAdmin } from '@/lib/admin/products';
import { getAdminUser, requireAdminPage } from '@/lib/admin/session';
import { notFoundMetadata } from '@/lib/seo/not-found';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!(await getAdminUser())) return { title: 'ניהול' };
  const { id } = await params;
  const product = await getProductForAdmin(id);
  return product ? { title: product.nameHe } : notFoundMetadata;
}

function shekels(agorot: number): string {
  return Number.isInteger(agorot / 100) ? String(agorot / 100) : (agorot / 100).toFixed(2);
}

export default async function AdminProductPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const product = await getProductForAdmin(id);
  if (!product) notFound();
  const imageGroups = (await listImageGroups(product.id)).map((group) => ({
    ...group,
    images: group.images.map((image) => ({ ...image, url: resolveImageUrl(image.storageKey) })),
  }));

  const men = await getMenDepartment(product.id);
  const image = product.images[0] ? resolveImageUrl(product.images[0].storageKey) : null;
  const baseCarat = product.diamondSpec?.totalCaratWeight
    ? Number(product.diamondSpec.totalCaratWeight).toFixed(2)
    : null;
  const sizes = product.sizeOption?.values.filter((value) => value.isActive) ?? [];
  const hidden = (
    <>
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="slug" value={product.slug} />
    </>
  );

  return (
    <>
      <Link href="/admin/products" className="text-muted-foreground text-sm hover:underline">
        → כל המוצרים
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="bg-muted relative size-16 overflow-hidden">
          {image && <Image src={image} alt="" fill sizes="64px" className="object-cover" />}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{product.nameHe}</h1>
            {product.archivedAt ? (
              <StatusPill label="בארכיון" tone="off" />
            ) : product.isActive ? (
              <StatusPill label="מוצג באתר" tone="done" />
            ) : (
              <StatusPill label="מוסתר" tone="attention" />
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {product.primaryCategory.nameHe}
            {product.isActive && !product.archivedAt && (
              <>
                {' · '}
                <Link
                  href={`/product/${product.slug}`}
                  target="_blank"
                  className="underline underline-offset-4"
                >
                  לצפייה באתר
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {(await searchParams).created && (
        <p role="status" className="bg-muted mt-6 p-4 text-sm">
          המוצר נוצר והוא מוסתר. העלו תמונות, בדקו את הפרטים, ואז סמנו &quot;מוצג באתר&quot;.
        </p>
      )}

      <section aria-labelledby="images-heading" className="mt-10">
        <h2 id="images-heading" className="text-lg font-bold">
          תמונות
        </h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          התמונה הראשונה בכל קבוצה היא הראשית. תמונות של גוון מוצגות כשהלקוח בוחר אותו; התמונות
          הכלליות מוצגות בכרטיס המוצר ובכל גוון שאין לו תמונות משלו.
        </p>
        <ImageManager productId={product.id} slug={product.slug} groups={imageGroups} />
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className="text-lg font-bold">
            פרטים
          </h2>
          <ActionForm action={saveProductDetailsAction} submitLabel="שמירה" className="mt-3">
            {hidden}
            <label htmlFor="nameHe" className={LABEL}>
              שם
            </label>
            <input
              id="nameHe"
              name="nameHe"
              defaultValue={product.nameHe}
              maxLength={120}
              required
              className={`${INPUT} mt-1.5`}
            />
            <label htmlFor="shortDescriptionHe" className={`${LABEL} mt-4 block`}>
              תיאור קצר
            </label>
            <input
              id="shortDescriptionHe"
              name="shortDescriptionHe"
              defaultValue={product.shortDescriptionHe ?? ''}
              maxLength={300}
              className={`${INPUT} mt-1.5`}
            />
            <label htmlFor="descriptionHe" className={`${LABEL} mt-4 block`}>
              תיאור מלא
            </label>
            <textarea
              id="descriptionHe"
              name="descriptionHe"
              defaultValue={product.descriptionHe ?? ''}
              rows={5}
              maxLength={5000}
              className={`${INPUT} mt-1.5`}
            />
            {!product.archivedAt && (
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="visible"
                  defaultChecked={product.isActive}
                  className="size-4"
                />
                מוצג באתר
              </label>
            )}
          </ActionForm>
        </section>

        <section aria-labelledby="prices-heading">
          <h2 id="prices-heading" className="text-lg font-bold">
            מחירים
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">מחיר לכל גרסה, בשקלים, כולל מע״מ.</p>
          <ActionForm action={savePricesAction} submitLabel="שמירת מחירים" className="mt-3">
            {hidden}
            <table className="w-full text-sm">
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id} className="border-border border-b">
                    <td className="py-2 pe-3">
                      <label htmlFor={`price-${variant.id}`}>{variant.label}</label>
                      <div className="text-muted-foreground text-xs">
                        <bdi dir="ltr">{variant.sku}</bdi>
                      </div>
                    </td>
                    <td className="w-32 py-2">
                      <div className="flex items-center gap-1">
                        <span aria-hidden>₪</span>
                        <input
                          id={`price-${variant.id}`}
                          name={`price:${variant.id}`}
                          defaultValue={shekels(variant.priceAgorot)}
                          inputMode="decimal"
                          dir="ltr"
                          required
                          className={`${INPUT} tabular-nums`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ActionForm>
        </section>
      </div>

      {baseCarat && (
        <section aria-labelledby="sizes-heading" className="border-border mt-12 border p-5">
          <h2 id="sizes-heading" className="text-lg font-bold">
            גדלי יהלום
          </h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            הלקוח בוחר את גודל היהלום בעמוד המוצר, והמחיר משתנה בהתאם. התמונות נשארות אותן תמונות
            ומוצגות כהמחשה של העיצוב. כשמוסיפים גודל, כל הגרסאות שלו נוצרות עם הפרש המחיר שרשמתם,
            ואפשר לדייק כל מחיר בטבלת המחירים.
          </p>

          <ul className="mt-4 flex flex-wrap gap-3">
            {(sizes.length > 0 ? sizes : [{ id: 'base', value: baseCarat }]).map((size) => (
              <li
                key={size.id}
                className="border-border flex items-center gap-3 border px-3 py-2 text-sm"
              >
                <span className="font-semibold tabular-nums">{size.value} קראט</span>
                {size.value === baseCarat ? (
                  <span className="text-muted-foreground">בסיס</span>
                ) : (
                  <ActionForm
                    action={removeDiamondSizeAction}
                    submitLabel="הסרה"
                    className="[&_button]:h-8 [&_button]:px-3"
                  >
                    {hidden}
                    <input type="hidden" name="valueId" value={size.id} />
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>

          <ActionForm
            action={addDiamondSizeAction}
            submitLabel="הוספת גודל"
            className="mt-6 max-w-xl"
          >
            {hidden}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="carat" className={LABEL}>
                  גודל (קראט)
                </label>
                <input
                  id="carat"
                  name="carat"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0.70"
                  required
                  className={`${INPUT} mt-1.5`}
                />
              </div>
              <div>
                <label htmlFor="difference" className={LABEL}>
                  הפרש מחיר מול {baseCarat} קראט (₪)
                </label>
                <input
                  id="difference"
                  name="difference"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="1200"
                  required
                  className={`${INPUT} mt-1.5`}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  מינוס לגודל קטן יותר, למשל ‎-800
                </p>
              </div>
            </div>
          </ActionForm>
        </section>
      )}

      {men.choices.length > 0 && (
        <section aria-labelledby="men-heading" className="mt-12 max-w-xl">
          <h2 id="men-heading" className="text-lg font-bold">
            מחלקת גברים
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            הדגם יופיע גם בעמודי הגברים, בקטגוריה שתבחרו. הקטגוריה הראשית שלו, הכתובת והתמונות לא
            משתנות.
          </p>
          <ActionForm action={saveMenDepartmentAction} submitLabel="שמירה" className="mt-3">
            {hidden}
            <label htmlFor="menCategory" className={LABEL}>
              קטגוריה במחלקת הגברים
            </label>
            <select
              id="menCategory"
              name="menCategory"
              defaultValue={men.currentId ?? ''}
              className={`${INPUT} mt-1.5`}
            >
              <option value="">לא מופיע במחלקת הגברים</option>
              {men.choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.nameHe}
                </option>
              ))}
            </select>
          </ActionForm>
        </section>
      )}

      <section aria-labelledby="archive-heading" className="mt-12">
        <h2 id="archive-heading" className="text-lg font-bold">
          {product.archivedAt ? 'שחזור מהארכיון' : 'העברה לארכיון'}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {product.archivedAt
            ? 'המוצר יחזור לרשימה כמוסתר, ותוכלו להציג אותו באתר כשתרצו.'
            : 'המוצר יוסר מהאתר ומהחיפוש. הזמנות קודמות שלו נשמרות, ואפשר לשחזר אותו בכל עת.'}
        </p>
        <ActionForm
          action={archiveProductAction}
          submitLabel={product.archivedAt ? 'שחזור' : 'העברה לארכיון'}
        >
          {hidden}
          <input type="hidden" name="archive" value={product.archivedAt ? 'false' : 'true'} />
        </ActionForm>
      </section>
    </>
  );
}
