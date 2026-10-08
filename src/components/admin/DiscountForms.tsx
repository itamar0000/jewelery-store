import { israelDateValue, type TargetChoices } from '@/lib/admin/discounts';
import {
  archiveCouponAction,
  archivePromotionAction,
  deleteAnnouncementAction,
  saveAnnouncementAction,
  saveCouponAction,
  savePromotionAction,
} from '@/lib/admin/discount-actions';

import { ActionForm } from './ActionForm';
import { INPUT, LABEL } from './styles';
import { TargetPicker } from './TargetPicker';

/**
 * The forms for sales, coupons and announcements (D4D.33). Server-rendered;
 * each posts to an action that re-checks the session and validates.
 */

const HINT = 'text-muted-foreground mt-1 text-xs';

type Targets = {
  productId: string | null;
  categoryId: string | null;
  collectionId: string | null;
}[];

function selectedOf(targets: Targets) {
  return {
    products: targets.flatMap((t) => (t.productId ? [t.productId] : [])),
    categories: targets.flatMap((t) => (t.categoryId ? [t.categoryId] : [])),
    collections: targets.flatMap((t) => (t.collectionId ? [t.collectionId] : [])),
  };
}

function valueField(kind: string, value: number) {
  return kind === 'PERCENTAGE' ? String(value / 100) : String(value / 100);
}

function DiscountFields({ kind, value }: { kind: string; value: number | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="kind" className={LABEL}>
          סוג ההנחה
        </label>
        <select id="kind" name="kind" defaultValue={kind} className={`${INPUT} mt-1.5`}>
          <option value="PERCENTAGE">אחוז הנחה</option>
          <option value="FIXED_AMOUNT">סכום קבוע בשקלים</option>
        </select>
      </div>
      <div>
        <label htmlFor="value" className={LABEL}>
          גובה ההנחה
        </label>
        <input
          id="value"
          name="value"
          inputMode="decimal"
          dir="ltr"
          required
          defaultValue={value === null ? '' : valueField(kind, value)}
          placeholder="20"
          className={`${INPUT} mt-1.5`}
        />
        <p className={HINT}>באחוזים (למשל 20) או בשקלים (למשל 200), לפי הסוג.</p>
      </div>
    </div>
  );
}

function WindowFields({ startsAt, endsAt }: { startsAt: Date | null; endsAt: Date | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="startsOn" className={LABEL}>
          מתחיל ב־ <span className="text-muted-foreground font-normal">(ריק = מעכשיו)</span>
        </label>
        <input
          id="startsOn"
          name="startsOn"
          type="date"
          dir="ltr"
          defaultValue={israelDateValue(startsAt)}
          className={`${INPUT} mt-1.5`}
        />
      </div>
      <div>
        <label htmlFor="endsOn" className={LABEL}>
          נגמר בסוף יום <span className="text-muted-foreground font-normal">(ריק = בלי סוף)</span>
        </label>
        <input
          id="endsOn"
          name="endsOn"
          type="date"
          dir="ltr"
          defaultValue={israelDateValue(endsAt)}
          className={`${INPUT} mt-1.5`}
        />
      </div>
    </div>
  );
}

function ActiveToggle({ active, label }: { active: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name="active" defaultChecked={active} className="size-4" />
      {label}
    </label>
  );
}

// ------------------------------------------------------------------- sales

export interface PromotionRecord {
  id: string;
  nameHe: string;
  discountType: string;
  discountValue: number;
  appliesTo: string;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  targets: Targets;
}

export function PromotionForm({
  promotion,
  choices,
}: {
  promotion: PromotionRecord | null;
  choices: TargetChoices;
}) {
  return (
    <>
      <ActionForm
        action={savePromotionAction}
        submitLabel="שמירה"
        className="mt-6 max-w-2xl space-y-6"
      >
        {promotion && <input type="hidden" name="id" value={promotion.id} />}
        <div>
          <label htmlFor="nameHe" className={LABEL}>
            שם המבצע{' '}
            <span className="text-muted-foreground font-normal">(מוצג ללקוחות ליד המחיר)</span>
          </label>
          <input
            id="nameHe"
            name="nameHe"
            required
            maxLength={80}
            defaultValue={promotion?.nameHe ?? ''}
            placeholder="20% על כל העגילים"
            className={`${INPUT} mt-1.5`}
          />
        </div>
        <DiscountFields
          kind={promotion?.discountType ?? 'PERCENTAGE'}
          value={promotion?.discountValue ?? null}
        />
        <TargetPicker
          scopes={[
            { value: 'ENTIRE_SITE', label: 'כל האתר' },
            { value: 'CATEGORY', label: 'קטגוריות' },
            { value: 'COLLECTION', label: 'אוספים' },
            { value: 'PRODUCT', label: 'דגמים מסוימים' },
          ]}
          defaultScope={promotion?.appliesTo ?? 'ENTIRE_SITE'}
          choices={choices}
          selected={selectedOf(promotion?.targets ?? [])}
        />
        <WindowFields startsAt={promotion?.startsAt ?? null} endsAt={promotion?.endsAt ?? null} />
        <ActiveToggle active={promotion?.isActive ?? true} label="המבצע פעיל" />
        <p className={HINT}>
          אם כמה מבצעים חלים על אותו דגם, הלקוח מקבל את הגבוה מביניהם, לא את שניהם. המחיר המחוק הוא
          תמיד המחיר הרגיל של הדגם.
        </p>
      </ActionForm>
      {promotion && (
        <ActionForm action={archivePromotionAction} submitLabel="מחיקת המבצע" className="mt-10">
          <input type="hidden" name="id" value={promotion.id} />
        </ActionForm>
      )}
    </>
  );
}

// ----------------------------------------------------------------- coupons

export interface CouponRecord {
  id: string;
  code: string;
  descriptionHe: string | null;
  discountType: string;
  discountValue: number;
  minOrderAgorot: number | null;
  maxDiscountAgorot: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimitTotal: number | null;
  usageLimitPerCustomer: number | null;
  appliesTo: string;
  isActive: boolean;
  targets: Targets;
}

const shekelsOf = (agorot: number | null) => (agorot === null ? '' : String(agorot / 100));

export function AdminCouponForm({
  coupon,
  choices,
}: {
  coupon: CouponRecord | null;
  choices: TargetChoices;
}) {
  return (
    <>
      <ActionForm
        action={saveCouponAction}
        submitLabel="שמירה"
        className="mt-6 max-w-2xl space-y-6"
      >
        {coupon && <input type="hidden" name="id" value={coupon.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="code" className={LABEL}>
              קוד הקופון
            </label>
            <input
              id="code"
              name="code"
              required
              dir="ltr"
              maxLength={32}
              defaultValue={coupon?.code ?? ''}
              placeholder="SUMMER10"
              className={`${INPUT} mt-1.5 uppercase`}
            />
            <p className={HINT}>אותיות באנגלית, ספרות, מקף. הלקוח מקליד אותו בסל.</p>
          </div>
          <div>
            <label htmlFor="descriptionHe" className={LABEL}>
              תיאור פנימי <span className="text-muted-foreground font-normal">(לא חובה)</span>
            </label>
            <input
              id="descriptionHe"
              name="descriptionHe"
              maxLength={200}
              defaultValue={coupon?.descriptionHe ?? ''}
              placeholder="קופון ללקוחות חוזרים"
              className={`${INPUT} mt-1.5`}
            />
          </div>
        </div>
        <DiscountFields
          kind={coupon?.discountType ?? 'PERCENTAGE'}
          value={coupon?.discountValue ?? null}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="minOrder" className={LABEL}>
              סכום הזמנה מינימלי (₪){' '}
              <span className="text-muted-foreground font-normal">(לא חובה)</span>
            </label>
            <input
              id="minOrder"
              name="minOrder"
              inputMode="decimal"
              dir="ltr"
              defaultValue={shekelsOf(coupon?.minOrderAgorot ?? null)}
              className={`${INPUT} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="maxDiscount" className={LABEL}>
              תקרת הנחה (₪){' '}
              <span className="text-muted-foreground font-normal">(לאחוזים בלבד, לא חובה)</span>
            </label>
            <input
              id="maxDiscount"
              name="maxDiscount"
              inputMode="decimal"
              dir="ltr"
              defaultValue={shekelsOf(coupon?.maxDiscountAgorot ?? null)}
              className={`${INPUT} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="usageTotal" className={LABEL}>
              מספר שימושים כולל{' '}
              <span className="text-muted-foreground font-normal">(ריק = ללא הגבלה)</span>
            </label>
            <input
              id="usageTotal"
              name="usageTotal"
              inputMode="numeric"
              dir="ltr"
              defaultValue={coupon?.usageLimitTotal ?? ''}
              className={`${INPUT} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="usagePerCustomer" className={LABEL}>
              שימושים ללקוח{' '}
              <span className="text-muted-foreground font-normal">(ריק = ללא הגבלה)</span>
            </label>
            <input
              id="usagePerCustomer"
              name="usagePerCustomer"
              inputMode="numeric"
              dir="ltr"
              defaultValue={coupon?.usageLimitPerCustomer ?? ''}
              className={`${INPUT} mt-1.5`}
            />
          </div>
        </div>
        <TargetPicker
          scopes={[
            { value: 'ENTIRE_ORDER', label: 'כל ההזמנה' },
            { value: 'CATEGORY', label: 'קטגוריות' },
            { value: 'COLLECTION', label: 'אוספים' },
            { value: 'PRODUCT', label: 'דגמים מסוימים' },
          ]}
          defaultScope={coupon?.appliesTo ?? 'ENTIRE_ORDER'}
          choices={choices}
          selected={selectedOf(coupon?.targets ?? [])}
        />
        <WindowFields startsAt={coupon?.startsAt ?? null} endsAt={coupon?.endsAt ?? null} />
        <ActiveToggle active={coupon?.isActive ?? true} label="הקופון פעיל" />
        <p className={HINT}>הקופון נוסף על מבצע אם יש: הוא מחושב מהמחיר שכבר במבצע.</p>
      </ActionForm>
      {coupon && (
        <ActionForm action={archiveCouponAction} submitLabel="מחיקת הקופון" className="mt-10">
          <input type="hidden" name="id" value={coupon.id} />
        </ActionForm>
      )}
    </>
  );
}

// ----------------------------------------------------------- announcements

export interface AnnouncementRecord {
  id: string;
  textHe: string;
  linkHref: string | null;
  linkLabelHe: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
}

export function AnnouncementForm({ announcement }: { announcement: AnnouncementRecord | null }) {
  return (
    <>
      <ActionForm
        action={saveAnnouncementAction}
        submitLabel="שמירה"
        className="mt-6 max-w-2xl space-y-6"
      >
        {announcement && <input type="hidden" name="id" value={announcement.id} />}
        <div>
          <label htmlFor="textHe" className={LABEL}>
            ההודעה
          </label>
          <input
            id="textHe"
            name="textHe"
            required
            maxLength={160}
            defaultValue={announcement?.textHe ?? ''}
            placeholder="20% הנחה על כל העגילים עד יום ראשון"
            className={`${INPUT} mt-1.5`}
          />
          <p className={HINT}>שורה אחת, עד 160 תווים. מוצגת בפס ירוק מעל הכותרת של האתר.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="linkHref" className={LABEL}>
              קישור <span className="text-muted-foreground font-normal">(לא חובה)</span>
            </label>
            <input
              id="linkHref"
              name="linkHref"
              dir="ltr"
              maxLength={300}
              defaultValue={announcement?.linkHref ?? ''}
              placeholder="/earrings"
              className={`${INPUT} mt-1.5`}
            />
            <p className={HINT}>עמוד באתר, למשל /earrings או /collections/bridal.</p>
          </div>
          <div>
            <label htmlFor="linkLabelHe" className={LABEL}>
              טקסט הקישור
            </label>
            <input
              id="linkLabelHe"
              name="linkLabelHe"
              maxLength={40}
              defaultValue={announcement?.linkLabelHe ?? ''}
              placeholder="למבצע"
              className={`${INPUT} mt-1.5`}
            />
          </div>
        </div>
        <WindowFields
          startsAt={announcement?.startsAt ?? null}
          endsAt={announcement?.endsAt ?? null}
        />
        <ActiveToggle active={announcement?.isActive ?? true} label="ההודעה פעילה" />
        <p className={HINT}>אם כמה הודעות פעילות באותו זמן, מוצגת החדשה ביותר.</p>
      </ActionForm>
      {announcement && (
        <ActionForm action={deleteAnnouncementAction} submitLabel="מחיקת ההודעה" className="mt-10">
          <input type="hidden" name="id" value={announcement.id} />
        </ActionForm>
      )}
    </>
  );
}
