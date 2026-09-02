import { CategoryDiscovery } from '@/components/storefront/CategoryDiscovery';
import { CollectionsSection } from '@/components/storefront/CollectionsSection';
import { EditorialPanel } from '@/components/storefront/EditorialPanel';
import { FeatureBanner } from '@/components/storefront/FeatureBanner';
import { FeaturedProducts } from '@/components/storefront/FeaturedProducts';
import { FaqSection } from '@/components/storefront/FaqSection';
import { Hero } from '@/components/storefront/Hero';
import { getCollection, getCollections, getProductsByCollection } from '@/lib/catalog/queries';

/**
 * The homepage.
 *
 * Section order follows MASTER_SPECIFICATION section 31, which explicitly marks
 * the sequence as flexible and to be finalised during UI design. Two of its
 * entries are absent on purpose: "recently viewed" needs a session that does not
 * exist, and the newsletter block needs an email system and a consent decision
 * that is a legal question (section 52).
 *
 * COMPOSITION: PEAKS AND VALLEYS, NOT A STACK OF EQUALS.
 *
 * The page is deliberately NOT a run of same-weight bands. Reviewed as rendered
 * output, its worst fault was that three consecutive sections - categories,
 * best sellers, collections - were built identically: a centred heading, one
 * row of things, captions underneath. Nothing was allowed to be the high point,
 * so nothing was.
 *
 * Each band now states itself differently, and they alternate in weight:
 *
 *   hero          PEAK    full-viewport image, no competing content
 *   categories    high    asymmetric grid, lead tile, labels ON the images
 *   best sellers  valley  centred heading, four products, captions below
 *   diamonds      mid     split editorial on a muted ground
 *   bridal        PEAK    full-bleed campaign banner
 *   custom        mid     split editorial, mirrored from the diamonds panel
 *   collections   high    tall portrait tiles, copy over the frame
 *   FAQ           valley  three questions in a narrow column
 *
 * Two sections were REMOVED rather than restyled. Reviews is gone entirely -
 * three empty testimonial cards read as broken product cards, and no real
 * reviews exist to put in them (see the git history of ReviewsSection.tsx for
 * why fabricating them was never an option). The FAQ band shrank from four
 * topics with a full section heading to three questions in a narrow column: the
 * homepage is a shopping experience, not a help centre.
 *
 * Collections moved AFTER the two editorial panels. It had been a third browse
 * band stacked directly onto the first two; landing it late gives the lower
 * half of the page an image-led moment of its own and separates the two
 * editorial panels from each other.
 *
 * The resulting arc is: look - browse - understand - aspire - commission -
 * discover - reassure.
 *
 * ALL COPY HERE IS PROVISIONAL AND DESCRIPTIVE, NOT MARKETING. The brand name,
 * slogan and voice are TBD (section 2 and 57). Every string below states a
 * fact about the store - what it sells, how it is made - rather than selling
 * it, so that nothing reads as a settled brand decision. Replacing it is a
 * change to this file only; the components take their content as props.
 *
 * DATA COMES FROM THE DATABASE. Best sellers are the products in the
 * `best-sellers` collection, in the curator's order; the collections band lists
 * the real active collections. Both are read HERE, in the route, and passed
 * down - no component queries anything.
 *
 * The best-sellers band is omitted entirely when the collection is empty or
 * missing, rather than rendering an empty shelf under a heading.
 */
/**
 * Rendered per request, not prerendered.
 *
 * Without this Next prerenders the homepage at BUILD time, baking the
 * best-seller list and the collection names into static HTML. The owner edits
 * the catalog through the admin, so a build-time snapshot would go stale the
 * moment they did, and stay stale until the next deploy. The category,
 * subcategory, collection and product routes are dynamic for the same reason.
 *
 * A cache policy - incremental revalidation with a sensible window - is a
 * deliberate decision that belongs with the rest of the caching work, not an
 * accident of what Next could statically analyse.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [bestSellers, collections] = await Promise.all([
    getCollection('best-sellers').then((collection) =>
      collection ? getProductsByCollection(collection.id, { limit: 4 }) : [],
    ),
    getCollections(),
  ]);

  return (
    <>
      <Hero
        title="תכשיטי זהב ויהלומים"
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
        href="/collections/best-sellers"
        products={bestSellers}
      />

      <EditorialPanel
        id="diamonds-heading"
        eyebrow="יהלומים"
        title="טבעי או מעבדה — הבחירה שלך"
        body="בקטלוג יש תכשיטים המשובצים ביהלומים טבעיים ותכשיטים המשובצים ביהלומי מעבדה. שני הסוגים זהים בהרכב הכימי, במבנה הגבישי ובתכונות האופטיות; ההבדל הוא במקור ההיווצרות ובמחיר."
        points={[
          'סוג היהלום מצוין במפורש בעמוד כל מוצר',
          'תעודה לכל אבן מעל משקל מסוים',
          'יהלום מעבדה — מחיר נמוך יותר לאותו גודל ואיכות',
        ]}
        action={{ label: 'לשאלות ותשובות', href: '/faq' }}
        imageSide="start"
        tone="muted"
        imageLabel="תהליך היצירה"
      />

      <FeatureBanner
        id="bridal-heading"
        eyebrow="כלה"
        title="אירוסין ונישואין"
        body="טבעות אירוסין, טבעות נישואין וסטים תואמים. כל דגם ניתן להתאמה לפי משקל קראט, גוון זהב ומידה."
        action={{ label: 'לאוסף הכלה', href: '/collections/bridal' }}
        imageLabel="אוסף כלה"
      />

      <EditorialPanel
        id="custom-heading"
        eyebrow="עיצוב אישי"
        title="תכשיט שנבנה לפי בקשה"
        body="ניתן להזמין תכשיט בעיצוב אישי, לשנות דגם קיים או להוסיף חריטה ושמות. התהליך מתחיל בפנייה, וממשיך בשרטוט ובאישור לפני הייצור."
        action={{ label: 'לפרטים ולפנייה', href: '/custom' }}
        imageSide="end"
        imageLabel="עבודת צורף"
      />

      <CollectionsSection collections={collections} />

      <FaqSection />
    </>
  );
}
