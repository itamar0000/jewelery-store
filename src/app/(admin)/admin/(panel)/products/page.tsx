import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { StatusPill } from '@/components/admin/StatusTabs';
import { INPUT, LABEL } from '@/components/admin/styles';
import { resolveImageUrl } from '@/lib/catalog/images';
import { formatAgorot } from '@/lib/admin/format';
import {
  isProductListState,
  listProductCategoriesForAdmin,
  listProductsForAdmin,
} from '@/lib/admin/products';
import { requireAdminPage } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'מוצרים' };

const STATES = [
  { value: 'all', label: 'הכול' },
  { value: 'visible', label: 'מוצגים באתר' },
  { value: 'hidden', label: 'מוסתרים' },
  { value: 'archived', label: 'בארכיון' },
] as const;

function priceRange(min: number | null, max: number | null): string {
  if (min === null) return '—';
  if (max === null || min === max) return formatAgorot(min);
  return `${formatAgorot(min)} – ${formatAgorot(max)}`;
}

function StatePill({ archivedAt, isActive }: { archivedAt: Date | null; isActive: boolean }) {
  if (archivedAt) return <StatusPill label="בארכיון" tone="off" />;
  return isActive ? (
    <StatusPill label="מוצג" tone="done" />
  ) : (
    <StatusPill label="מוסתר" tone="attention" />
  );
}

/**
 * Every product, found by name, SKU or address, and narrowed by category and
 * by whether it is on the site. The filter is the URL, so a search survives
 * going into a product and coming back.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; state?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? '';
  const state = isProductListState(params.state) ? params.state : 'all';
  const categories = await listProductCategoriesForAdmin();
  const categoryId = categories.some((category) => category.id === params.category)
    ? params.category
    : undefined;
  const products = await listProductsForAdmin({ query, categoryId, state });
  const filtered = Boolean(query || categoryId || state !== 'all');

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">מוצרים</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {products.length} מוצרים{filtered ? ' מתאימים' : ''}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-stamp text-stamp-foreground hover:bg-stamp-hover inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold"
        >
          מוצר חדש
        </Link>
      </div>

      <form
        role="search"
        className="mt-6 grid gap-3 sm:grid-cols-[1fr_12rem_12rem_auto] sm:items-end"
      >
        <div>
          <label htmlFor="product-search" className={LABEL}>
            חיפוש
          </label>
          <input
            id="product-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="שם, מק״ט או כתובת"
            className={`${INPUT} mt-1.5 min-h-11`}
          />
        </div>
        <div>
          <label htmlFor="product-category" className={LABEL}>
            קטגוריה
          </label>
          <select
            id="product-category"
            name="category"
            defaultValue={categoryId ?? ''}
            className={`${INPUT} mt-1.5 min-h-11`}
          >
            <option value="">כל הקטגוריות</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameHe}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="product-state" className={LABEL}>
            מצב
          </label>
          <select
            id="product-state"
            name="state"
            defaultValue={state}
            className={`${INPUT} mt-1.5 min-h-11`}
          >
            {STATES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="border-border-field hover:border-accent min-h-11 flex-1 border px-5 text-sm font-medium"
          >
            הצגה
          </button>
          {filtered && (
            <Link
              href="/admin/products"
              className="text-muted-foreground inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-4"
            >
              ניקוי
            </Link>
          )}
        </div>
      </form>

      {products.length === 0 ? (
        <p className="text-muted-foreground mt-10">
          לא נמצאו מוצרים. נסו מילה אחרת או נקו את הסינון.
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-2 md:hidden">
            {products.map((product) => {
              const image = product.images[0]
                ? resolveImageUrl(product.images[0].storageKey)
                : null;
              return (
                <li key={product.id}>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="border-border hover:border-border-strong flex items-center gap-3 border p-3"
                  >
                    <div className="bg-muted relative size-14 shrink-0 overflow-hidden">
                      {image && (
                        <Image src={image} alt="" fill sizes="56px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-semibold">{product.nameHe}</p>
                      <p className="text-muted-foreground">{product.primaryCategory.nameHe}</p>
                      <p className="whitespace-nowrap tabular-nums">
                        {priceRange(product.minPriceAgorot, product.maxPriceAgorot)}
                      </p>
                    </div>
                    <StatePill archivedAt={product.archivedAt} isActive={product.isActive} />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b">
                  <th className="py-2 pe-4 text-start font-medium">
                    <span className="sr-only">תמונה</span>
                  </th>
                  <th className="py-2 pe-4 text-start font-medium">מוצר</th>
                  <th className="py-2 pe-4 text-start font-medium">קטגוריה</th>
                  <th className="py-2 pe-4 text-start font-medium">מחיר</th>
                  <th className="py-2 pe-4 text-start font-medium">גרסאות</th>
                  <th className="py-2 text-start font-medium">מצב</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const image = product.images[0]
                    ? resolveImageUrl(product.images[0].storageKey)
                    : null;
                  return (
                    <tr key={product.id} className="border-border hover:bg-muted/50 border-b">
                      <td className="py-2 pe-4">
                        <div className="bg-muted relative size-12 overflow-hidden">
                          {image && (
                            <Image src={image} alt="" fill sizes="48px" className="object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="py-2 pe-4">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-semibold underline-offset-4 hover:underline"
                        >
                          {product.nameHe}
                        </Link>
                      </td>
                      <td className="text-muted-foreground py-2 pe-4">
                        {product.primaryCategory.nameHe}
                      </td>
                      <td className="py-2 pe-4 whitespace-nowrap tabular-nums">
                        {priceRange(product.minPriceAgorot, product.maxPriceAgorot)}
                      </td>
                      <td className="py-2 pe-4 tabular-nums">{product._count.variants}</td>
                      <td className="py-2">
                        <StatePill archivedAt={product.archivedAt} isActive={product.isActive} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
