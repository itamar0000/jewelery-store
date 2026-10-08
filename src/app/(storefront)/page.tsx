import { CategoryDiscovery } from '@/components/storefront/CategoryDiscovery';
import { ClosingBand } from '@/components/storefront/ClosingBand';
import { CollectionsSection } from '@/components/storefront/CollectionsSection';
import { EditorialPanel } from '@/components/storefront/EditorialPanel';
import { FeatureBanner } from '@/components/storefront/FeatureBanner';
import { FeaturedProducts } from '@/components/storefront/FeaturedProducts';
import { FaqSection } from '@/components/storefront/FaqSection';
import { Hero } from '@/components/storefront/Hero';
import { OrderSteps } from '@/components/storefront/OrderSteps';
import { BEST_SELLERS_SLUG, getBestSellers } from '@/lib/catalog/best-sellers';
import { getCollections } from '@/lib/catalog/queries';

/**
 * The homepage.
 *
 * Section order follows MASTER_SPECIFICATION section 31, which explicitly marks
 * the sequence as flexible and to be finalised during UI design. Two of its
 * entries are absent on purpose: "recently viewed" needs a session that does not
 * exist, and the newsletter block needs an email system and a consent decision
 * that is a legal question (section 52).
 *
 * COMPOSITION (D4D.26, design A - the atelier). The order and the grammar
 * are the owner's chosen design:
 *
 *   hero          two columns: the line and two pills; the photograph, curved
 *   categories    five arches, names in the serif beneath
 *   best sellers  four pieces on the ivory, packshots seated into it
 *   gifts         personalised pieces, split beside their photograph
 *   workshop      the green field beside the atelier photograph
 *   steps         four numbered steps over one rule
 *   bridal        full-bleed photograph, square; statement and action below
 *   diamonds      split editorial on the recessed ivory, mirrored
 *   collections   wide arches, when two or more remain
 *   FAQ           three questions
 *   close         the workshop line and the catalogue, then the night footer
 *
 * ALL COPY HERE IS PROVISIONAL AND DESCRIPTIVE, NOT MARKETING. The brand name,
 * slogan and voice are TBD (section 2 and 57). Every string below states a
 * fact about the store - what it sells, how it is made - rather than selling
 * it, so that nothing reads as a settled brand decision. Replacing it is a
 * change to this file only; the components take their content as props.
 *
 * DATA COMES FROM THE DATABASE. Best sellers come from one ranking - units
 * sold, then the curated `best-sellers` collection (src/lib/catalog/best-sellers.ts);
 * the collections band lists the real active collections. Both are read HERE,
 * in the route, and passed down - no component queries anything.
 *
 * The best-sellers band is omitted entirely when the ranking is empty, rather
 * than rendering an empty shelf under a heading.
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

/** The rail's length: four, one row at the widest breakpoint. */
const RAIL = 4;

/**
 * Collections that have a band of their own on this page, so the collections
 * row does not list them a second time.
 */
const OWN_BAND = new Set([BEST_SELLERS_SLUG, 'bridal', 'personalized']);

export default async function HomePage() {
  const [ranking, collections] = await Promise.all([getBestSellers(), getCollections()]);
  const bestSellers = ranking.slice(0, RAIL);

  return (
    <>
      {/*
       * The line claims one thing: each piece is made for the buyer, straight
       * from the workshop (PRODUCT.md, manufacturer-direct). No price, no
       * stock, no urgency. The body names the real axes of alteration; karat
       * is altered through a custom request (D4D.25), which is still true.
       */}
      <Hero
        lead="תכשיט שנוצר בשבילך,"
        emphasis="ישירות"
        tail="מהסדנה"
        body="כל דגם אצלנו אפשר לשנות: גוון זהב, מידה, חריטה, וסוג וגודל היהלום. בלי חנות באמצע, ובלי המרווח שלה במחיר."
        primary={{ label: 'לכל הקטגוריות', href: '#discovery-heading' }}
        secondary={{ label: 'עיצוב בהתאמה אישית', href: '/custom' }}
        imageLabel="תמונת נושא"
      />

      <CategoryDiscovery />

      {/*
       * "לצפייה בהכל" only when "all" is more than the rail already shows.
       */}
      <FeaturedProducts
        id="best-sellers-heading"
        title="רבי מכר"
        description="דגמים נבחרים מהקטלוג."
        href={ranking.length > bestSellers.length ? `/collections/${BEST_SELLERS_SLUG}` : undefined}
        products={bestSellers}
      />

      {/*
       * THE GIFT DOOR (D4D.27). Gift buyers are a third of the audience
       * (PRODUCT.md) and had no way in; personalised pieces - the name, the
       * initial, the engraving, the photograph - are the natural gift and the
       * shop's most specific photograph. Every claim is the product line's
       * own: the name necklace shows its letters before ordering.
       */}
      <EditorialPanel
        id="gift-heading"
        title="מתנה עם שם"
        body="שרשרת שם, אות ראשונה, צמיד בחריטה או תליון עם תמונה: התכשיט נעשה עם השם, האות או התמונה שלכם, ובשרשרת השם רואים את האותיות לפני ההזמנה."
        action={{ label: 'לתכשיטים האישיים', href: '/collections/personalized' }}
        imageSide="start"
        assetId="collection-personalized"
        imageLabel="תכשיטים אישיים"
      />

      {/*
       * THE WORKSHOP, ON THE GREEN FIELD. Every fact is PRODUCT.md's: made
       * after the order, in the owner's own workshop in Israel, which is why
       * any detail can change and why no shop's margin is in the price.
       */}
      <EditorialPanel
        id="workshop-heading"
        title="שום דבר לא יושב על מדף"
        body="התכשיט מיוצר אחרי ההזמנה, בסדנה שלנו בישראל. לכן אפשר לשנות כל פרט, ולכן אתם משלמים על התכשיט ולא על חנות."
        action={{ label: 'לעיצוב אישי', href: '/custom' }}
        imageSide="end"
        tone="field"
        assetId="atelier"
        imageLabel="עבודת צורף"
      />

      <OrderSteps />

      <FeatureBanner
        id="bridal-heading"
        title="אירוסין ונישואין"
        body="טבעות אירוסין, טבעות נישואין וסטים תואמים. כל דגם ניתן להתאמה לפי גודל היהלום, גוון הזהב והמידה."
        action={{ label: 'לאוסף הכלה', href: '/collections/bridal' }}
        help={{ label: 'איך יודעים מידת טבעת?', href: '/faq#ring-size' }}
        assetId="bridal"
        imageLabel="אוסף כלה"
      />

      <EditorialPanel
        id="diamonds-heading"
        // BOTH KINDS ARE IN THE CATALOGUE (PRODUCT.md): the band says so and
        // that the type is on every model, rather than casting natural stones
        // as special-order while the best sellers above carry them (D4D.27).
        title="יהלומי מעבדה ויהלומים טבעיים"
        body="בקטלוג יש שני הסוגים, וסוג היהלום כתוב על כל דגם. יהלום מעבדה זהה ליהלום טבעי בהרכב, במבנה ובברק; ההבדל הוא במקור ההיווצרות ובמחיר."
        points={[
          'יהלום מעבדה — מחיר נמוך יותר לאותו גודל ואיכות',
          'כל דגם אפשר לבקש גם עם יהלום טבעי',
        ]}
        action={{ label: 'לשאלות ותשובות', href: '/faq' }}
        actionVariant="secondary"
        imageSide="start"
        tone="muted"
        assetId="diamonds"
        imageLabel="תקריב יהלום"
      />

      <CollectionsSection
        collections={collections.filter((collection) => !OWN_BAND.has(collection.slug))}
      />

      <FaqSection />

      <ClosingBand />
    </>
  );
}
