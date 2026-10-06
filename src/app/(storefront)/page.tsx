import { CategoryDiscovery } from '@/components/storefront/CategoryDiscovery';
import { CollectionsSection } from '@/components/storefront/CollectionsSection';
import { EditorialPanel } from '@/components/storefront/EditorialPanel';
import { FeatureBanner } from '@/components/storefront/FeatureBanner';
import { FeaturedProducts } from '@/components/storefront/FeaturedProducts';
import { FaqSection } from '@/components/storefront/FaqSection';
import { Hero } from '@/components/storefront/Hero';
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
 * COMPOSITION: PEAKS AND VALLEYS, NOT A STACK OF EQUALS.
 *
 * The page is deliberately NOT a run of same-weight bands. Reviewed as rendered
 * output, its worst fault was that three consecutive sections - categories,
 * best sellers, collections - were built identically: a centred heading, one
 * row of things, captions underneath. Nothing was allowed to be the high point,
 * so nothing was.
 *
 * Each band states itself differently, and they alternate in weight:
 *
 *   hero          PEAK    one photograph edge to edge, the line beneath it
 *   categories    high    asymmetric grid, lead tile, names on a rule below
 *   best sellers  valley  centred heading, four products, captions below
 *   diamonds      mid     split editorial on a muted ground
 *   collections   high    wide alternating bands, name on a rule below
 *   atelier       mid     split editorial, mirrored from the diamonds panel
 *   bridal        PEAK    full-bleed campaign banner, the closing image
 *   FAQ           valley  three questions in a narrow column
 *
 * ORDER CHANGED IN THE EDITORIAL PASS. Bridal and the atelier panel swapped
 * places, and collections moved up between the two editorial panels. The
 * reason is that bridal is now a full-bleed campaign frame rather than another
 * split panel: as the last image before the FAQ it closes the page on its
 * strongest picture, where in the middle it competed with the hero. Collections
 * landing between the two split panels also stops those panels sitting back to
 * back, which was the mirrored-layout repetition the previous pass had been
 * trying to avoid by other means.
 *
 * Two sections were REMOVED rather than restyled. Reviews is gone entirely -
 * three empty testimonial cards read as broken product cards, and no real
 * reviews exist to put in them (see the git history of ReviewsSection.tsx for
 * why fabricating them was never an option). The FAQ band shrank from four
 * topics with a full section heading to three questions in a narrow column: the
 * homepage is a shopping experience, not a help centre.
 *
 * The resulting arc is: look - browse - understand - discover - commission -
 * aspire - reassure.
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
const OWN_BAND = new Set([BEST_SELLERS_SLUG, 'bridal']);

export default async function HomePage() {
  const [ranking, collections] = await Promise.all([getBestSellers(), getCollections()]);
  const bestSellers = ranking.slice(0, RAIL);

  return (
    <>
      {/*
       * THE PAGE OPENS ON THE JEWELLERY, NOT ON THE OFFER.
       *
       * An earlier version opened on the personalisation offer - the headline
       * and the only action were both about altering a model. The owner's
       * judgement was that this pushes the service before the visitor has seen
       * a single piece, and the page now leads with the photography. The
       * mechanism - their own workshop, any model alterable - has not been
       * dropped; it moved to the custom band below, where a visitor arrives
       * already interested.
       *
       * The line is the only claim in this viewport, and it claims one thing:
       * what the shop sells and who makes it. No price, no stock, no urgency.
       */}
      <Hero
        title="תכשיטי זהב ויהלומים, ישר מהסדנה שלנו"
        /*
         * The label says where it goes. It read "לקטלוג המלא" and opened
         * /rings: there is no all-products page, so the honest destination for
         * "the catalogue" is the five categories directly below.
         */
        action={{ label: 'לכל הקטגוריות', href: '#discovery-heading' }}
        imageLabel="תמונת נושא"
      />

      <CategoryDiscovery />

      {/*
       * "לצפייה בהכל" only when "all" is more than the rail already shows. The
       * collection holds exactly the four on screen, so the link opened the
       * same four on a page of their own.
       */}
      <FeaturedProducts
        id="best-sellers-heading"
        title="רבי מכר"
        description="הדגמים המבוקשים ביותר בקטלוג."
        href={ranking.length > bestSellers.length ? `/collections/${BEST_SELLERS_SLUG}` : undefined}
        products={bestSellers}
      />

      {/*
       * BRIDAL IS FOURTH, NOT SEVENTH, and in the hero's grammar: the one
       * occasion the catalogue is built around, given the page's second
       * full-bleed photograph instead of a framed box near the end of the page
       * (FeatureBanner).
       */}
      <FeatureBanner
        id="bridal-heading"
        title="אירוסין ונישואין"
        body="טבעות אירוסין, טבעות נישואין וסטים תואמים. כל דגם ניתן להתאמה לפי משקל קראט, גוון זהב ומידה."
        action={{ label: 'לאוסף הכלה', href: '/collections/bridal' }}
        assetId="bridal"
        imageLabel="אוסף כלה"
      />

      <EditorialPanel
        id="diamonds-heading"
        // LITERAL, NOT A CHOICE THE CATALOGUE CANNOT BACK. This said "natural
        // or lab - your choice" while all but two pieces were lab-grown; it now
        // says what the shelves hold and how to ask for the other (D4D.15).
        title="יהלומי מעבדה, וטבעיים לפי בקשה"
        body="רוב התכשיטים בקטלוג משובצים ביהלומי מעבדה. יהלום מעבדה זהה ליהלום טבעי בהרכב הכימי, במבנה הגבישי ובתכונות האופטיות; ההבדל הוא במקור ההיווצרות ובמחיר."
        points={[
          'סוג היהלום כתוב על כל דגם, ואפשר לסנן לפיו',
          'יהלום מעבדה — מחיר נמוך יותר לאותו גודל ואיכות',
          'כל דגם אפשר לבקש גם עם יהלום טבעי',
        ]}
        action={{ label: 'לשאלות ותשובות', href: '/faq' }}
        imageSide="start"
        tone="muted"
        assetId="diamonds"
        imageLabel="תקריב יהלום"
      />

      <CollectionsSection
        collections={collections.filter((collection) => !OWN_BAND.has(collection.slug))}
      />

      <FaqSection />

      {/*
       * THE PAGE ENDS ON THE WORKSHOP. It used to end on three FAQ links and
       * then the footer's line that prices are estimates - a disclaimer as the
       * last word. The close is now the shop's one real advantage (PRODUCT.md:
       * their own workshop, so any model can be made another way), at the
       * finale spacing tier with the line a size up.
       */}
      <EditorialPanel
        id="custom-heading"
        title="תכשיט שנבנה לפי בקשה"
        body="ניתן להזמין תכשיט בעיצוב אישי, לשנות דגם קיים או להוסיף חריטה ושמות. התהליך מתחיל בפנייה, וממשיך בשרטוט ובאישור לפני הייצור."
        // The close leads straight to the request form: requests are saved
        // with a number whether or not a contact channel exists (D4D.14).
        action={{ label: 'לשליחת בקשה', href: '/custom/request' }}
        imageSide="end"
        assetId="atelier"
        imageLabel="עבודת צורף"
        finale
      />
    </>
  );
}
