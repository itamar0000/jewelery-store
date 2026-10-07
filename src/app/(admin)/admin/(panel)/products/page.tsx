import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { StatusPill } from '@/components/admin/StatusTabs';
import { resolveImageUrl } from '@/lib/catalog/images';
import { formatAgorot } from '@/lib/admin/format';
import { listProductsForAdmin } from '@/lib/admin/products';
import { requireAdminPage } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'מוצרים' };

export default async function AdminProductsPage() {
  await requireAdminPage();
  const products = await listProductsForAdmin();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">מוצרים</h1>
          <p className="text-muted-foreground mt-1 text-sm">{products.length} מוצרים</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-stamp text-stamp-foreground hover:bg-stamp-hover inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
        >
          מוצר חדש
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
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
              const range =
                product.minPriceAgorot === null
                  ? '—'
                  : product.minPriceAgorot === product.maxPriceAgorot
                    ? formatAgorot(product.minPriceAgorot)
                    : `${formatAgorot(product.minPriceAgorot)} – ${formatAgorot(product.maxPriceAgorot ?? product.minPriceAgorot)}`;
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
                  <td className="py-2 pe-4 whitespace-nowrap tabular-nums">{range}</td>
                  <td className="py-2 pe-4 tabular-nums">{product._count.variants}</td>
                  <td className="py-2">
                    {product.archivedAt ? (
                      <StatusPill label="בארכיון" tone="off" />
                    ) : product.isActive ? (
                      <StatusPill label="מוצג" tone="done" />
                    ) : (
                      <StatusPill label="מוסתר" tone="attention" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
