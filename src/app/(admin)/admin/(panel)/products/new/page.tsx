import type { Metadata } from 'next';
import Link from 'next/link';

import { ActionForm } from '@/components/admin/ActionForm';
import { INPUT, LABEL } from '@/components/admin/styles';
import { DIAMOND_SHAPES, GOLD_COLOURS, listCategoryChoices } from '@/lib/admin/create-product';
import { createProductAction } from '@/lib/admin/product-actions';
import { requireAdminPage } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'מוצר חדש' };

const HINT = 'text-muted-foreground mt-1 text-xs';

export default async function NewProductPage() {
  await requireAdminPage();
  const categories = await listCategoryChoices();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="text-muted-foreground text-sm hover:underline">
        → כל המוצרים
      </Link>
      <h1 className="mt-3 text-2xl font-bold">מוצר חדש</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        המוצר נוצר מוסתר, ב-14 קראט. בשלב הבא מעלים תמונות, ואז מסמנים &quot;מוצג באתר&quot;.
      </p>

      <ActionForm action={createProductAction} submitLabel="יצירת המוצר" className="mt-8 space-y-6">
        <div>
          <label htmlFor="nameHe" className={LABEL}>
            שם המוצר
          </label>
          <input id="nameHe" name="nameHe" required maxLength={120} className={`${INPUT} mt-1.5`} />
        </div>

        <div>
          <label htmlFor="categoryId" className={LABEL}>
            קטגוריה
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue=""
            className={`${INPUT} mt-1.5`}
          >
            <option value="" disabled>
              בחרו קטגוריה
            </option>
            {categories.map((root) => (
              <optgroup key={root.nameHe} label={root.nameHe}>
                {root.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.nameHe}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className={HINT}>טבעת מקבלת את המידות הרגילות של האתר, שרשרת וצמיד את האורכים.</p>
        </div>

        <fieldset>
          <legend className={LABEL}>גווני זהב</legend>
          <div className="mt-2 flex flex-wrap gap-5 text-sm">
            {GOLD_COLOURS.map((colour) => (
              <label key={colour.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="colours"
                  value={colour.value}
                  defaultChecked
                  className="size-4"
                />
                <span
                  aria-hidden
                  className="border-border-strong size-4 rounded-full border"
                  style={{ backgroundColor: colour.hexColor }}
                />
                {colour.labelHe}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className={LABEL}>
              מחיר (₪, כולל מע״מ)
            </label>
            <input
              id="price"
              name="price"
              inputMode="decimal"
              dir="ltr"
              required
              className={`${INPUT} mt-1.5`}
            />
            <p className={HINT}>אותו מחיר לכל הגוונים. אפשר לשנות לכל גוון אחר כך.</p>
          </div>
          <div>
            <label htmlFor="prepDays" className={LABEL}>
              זמן הכנה (ימי עסקים)
            </label>
            <input
              id="prepDays"
              name="prepDays"
              inputMode="numeric"
              dir="ltr"
              defaultValue="21"
              className={`${INPUT} mt-1.5`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="shortDescriptionHe" className={LABEL}>
            תיאור קצר
          </label>
          <input
            id="shortDescriptionHe"
            name="shortDescriptionHe"
            maxLength={300}
            className={`${INPUT} mt-1.5`}
          />
          <p className={HINT}>
            שורה אחת שמופיעה מתחת לשם, למשל &quot;טבעת סוליטר עם יהלום מעבדה.&quot;
          </p>
        </div>

        <div>
          <label htmlFor="descriptionHe" className={LABEL}>
            תיאור מלא
          </label>
          <textarea
            id="descriptionHe"
            name="descriptionHe"
            rows={4}
            maxLength={5000}
            className={`${INPUT} mt-1.5`}
          />
        </div>

        <fieldset className="border-border border p-4">
          <legend className="px-1 text-sm font-medium">יהלומים (רק אם יש)</legend>
          <p className={HINT}>משאירים את המשקל ריק אם בתכשיט אין יהלומים.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="carat" className={LABEL}>
                משקל כולל (קראט)
              </label>
              <input
                id="carat"
                name="carat"
                inputMode="decimal"
                dir="ltr"
                placeholder="0.50"
                className={`${INPUT} mt-1.5`}
              />
            </div>
            <div>
              <label htmlFor="origin" className={LABEL}>
                סוג היהלום
              </label>
              <select id="origin" name="origin" className={`${INPUT} mt-1.5`}>
                <option value="lab">יהלום מעבדה</option>
                <option value="natural">יהלום טבעי</option>
              </select>
            </div>
            <div>
              <label htmlFor="shape" className={LABEL}>
                צורה
              </label>
              <select id="shape" name="shape" defaultValue="Round" className={`${INPUT} mt-1.5`}>
                {DIAMOND_SHAPES.map((shape) => (
                  <option key={shape.value} value={shape.value}>
                    {shape.labelHe}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="stoneCount" className={LABEL}>
                מספר אבנים
              </label>
              <input
                id="stoneCount"
                name="stoneCount"
                inputMode="numeric"
                dir="ltr"
                placeholder="1"
                className={`${INPUT} mt-1.5`}
              />
            </div>
            <div>
              <label htmlFor="color" className={LABEL}>
                צבע <span className="text-muted-foreground font-normal">(למשל G)</span>
              </label>
              <input
                id="color"
                name="color"
                dir="ltr"
                maxLength={10}
                className={`${INPUT} mt-1.5`}
              />
            </div>
            <div>
              <label htmlFor="clarity" className={LABEL}>
                ניקיון <span className="text-muted-foreground font-normal">(למשל VS1)</span>
              </label>
              <input
                id="clarity"
                name="clarity"
                dir="ltr"
                maxLength={10}
                className={`${INPUT} mt-1.5`}
              />
            </div>
            <div>
              <label htmlFor="cut" className={LABEL}>
                ליטוש <span className="text-muted-foreground font-normal">(למשל Excellent)</span>
              </label>
              <input id="cut" name="cut" dir="ltr" maxLength={20} className={`${INPUT} mt-1.5`} />
            </div>
          </div>
        </fieldset>

        <div>
          <label htmlFor="slug" className={LABEL}>
            כתובת באנגלית <span className="text-muted-foreground font-normal">(לא חובה)</span>
          </label>
          <input
            id="slug"
            name="slug"
            dir="ltr"
            maxLength={60}
            placeholder="oval-solitaire-ring"
            className={`${INPUT} mt-1.5`}
          />
          <p className={HINT}>
            הסוף של כתובת העמוד, למשל /product/oval-solitaire-ring. אם ריק, תיווצר כתובת אוטומטית.
          </p>
        </div>
      </ActionForm>
    </div>
  );
}
