import { CategoryDiscovery } from '@/components/storefront/CategoryDiscovery';
import { CollectionsSection } from '@/components/storefront/CollectionsSection';
import { EditorialPanel } from '@/components/storefront/EditorialPanel';
import { FeaturedProducts } from '@/components/storefront/FeaturedProducts';
import { GuidesSection } from '@/components/storefront/GuidesSection';
import { Hero } from '@/components/storefront/Hero';
import { ReviewsSection } from '@/components/storefront/ReviewsSection';
import { FIXTURE_PRODUCTS } from '@/lib/fixtures/catalog';

/**
 * The homepage.
 *
 * Section order follows MASTER_SPECIFICATION section 31, which explicitly marks
 * the sequence as flexible and to be finalised during UI design. Two of its
 * entries are absent on purpose: "recently viewed" needs a session that does not
 * exist, and the newsletter block needs an email system and a consent decision
 * that is a legal question (section 52).
 *
 * ALL COPY HERE IS PROVISIONAL AND DESCRIPTIVE, NOT MARKETING. The brand name,
 * slogan and voice are TBD (section 2 and 57). Every string below states a
 * fact about the store - what it sells, how it is made - rather than selling
 * it, so that nothing reads as a settled brand decision. Replacing it is a
 * change to this file only; the components take their content as props.
 *
 * DATA IS FIXTURES (placeholder registry `catalog-data`). The fixtures are read
 * HERE, in the route, and passed down - components never import them. Phase 3B
 * swaps this one import for a query.
 */
export default function HomePage() {
  return (
    <>
      <Hero
        title="תכשיטי זהב ויהלומי מעבדה"
        subtitle="עיצוב וייצור בישראל, עם אפשרות התאמה אישית לכל דגם. טקסט זה זמני ויוחלף עם גיבוש שפת המותג."
        primaryAction={{ label: 'לקטלוג', href: '/rings' }}
        secondaryAction={{ label: 'עיצוב אישי', href: '/custom' }}
        imageLabel="תמונת נושא — טרם צולמה"
      />

      <CategoryDiscovery />

      <FeaturedProducts
        id="best-sellers-heading"
        title="רבי מכר"
        description="הדגמים המבוקשים ביותר בקטלוג."
        href="/rings?collection=best-sellers"
        products={FIXTURE_PRODUCTS}
      />

      <EditorialPanel
        id="lab-grown-heading"
        eyebrow="יהלומי מעבדה"
        title="אותו יהלום, מקור אחר"
        body="יהלום מעבדה זהה ליהלום כרוי בהרכב הכימי, במבנה הגבישי ובתכונות האופטיות. ההבדל הוא באופן ההיווצרות, ובמחיר."
        points={[
          'זהה מבחינה פיזיקלית וכימית ליהלום כרוי',
          'תעודה לכל אבן מעל משקל מסוים',
          'מחיר נמוך יותר עבור אותו גודל ואיכות',
        ]}
        action={{ label: 'למדריך המלא', href: '/guides' }}
        imageSide="start"
        tone="muted"
        imageLabel="תהליך היצירה"
      />

      <CollectionsSection />

      <EditorialPanel
        id="custom-heading"
        eyebrow="עיצוב אישי"
        title="תכשיט שנבנה לפי בקשה"
        body="ניתן להזמין תכשיט בעיצוב אישי, לשנות דגם קיים או להוסיף חריטה ושמות. התהליך מתחיל בפנייה, וממשיך בשרטוט ובאישור לפני הייצור."
        action={{ label: 'לפרטים ולפנייה', href: '/custom' }}
        imageSide="end"
        imageLabel="עבודת צורף"
      />

      <EditorialPanel
        id="bridal-heading"
        eyebrow="כלה"
        title="אירוסין ונישואין"
        body="טבעות אירוסין, טבעות נישואין וסטים תואמים. כל דגם ניתן להתאמה לפי משקל קראט, גוון זהב ומידה."
        action={{ label: 'לאוסף הכלה', href: '/sets/bridal' }}
        imageSide="start"
        tone="muted"
        imageLabel="אוסף כלה"
      />

      <ReviewsSection />

      <GuidesSection />
    </>
  );
}
