-- Automatic sales, their targets, and the announcement bar (D4D.33).
-- Written from the generated draft with its drift removed: it also proposed
-- dropping the order and request number sequences and hand-made indexes.

-- CreateEnum
CREATE TYPE "PromotionScope" AS ENUM ('ENTIRE_SITE', 'PRODUCT', 'CATEGORY', 'COLLECTION');

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "appliesTo" "PromotionScope" NOT NULL DEFAULT 'ENTIRE_SITE',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionTarget" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "productId" TEXT,
    "categoryId" TEXT,
    "collectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "textHe" TEXT NOT NULL,
    "linkHref" TEXT,
    "linkLabelHe" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_isActive_startsAt_endsAt_idx" ON "Promotion"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PromotionTarget_promotionId_idx" ON "PromotionTarget"("promotionId");

-- CreateIndex
CREATE INDEX "PromotionTarget_productId_idx" ON "PromotionTarget"("productId");

-- CreateIndex
CREATE INDEX "PromotionTarget_categoryId_idx" ON "PromotionTarget"("categoryId");

-- CreateIndex
CREATE INDEX "PromotionTarget_collectionId_idx" ON "PromotionTarget"("collectionId");

-- CreateIndex
CREATE INDEX "Announcement_isActive_startsAt_endsAt_idx" ON "Announcement"("isActive", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A sale is a percentage within 100% or a positive amount; never free shipping.
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_discount_valid"
  CHECK (
    ("discountType" = 'PERCENTAGE' AND "discountValue" BETWEEN 1 AND 10000)
    OR ("discountType" = 'FIXED_AMOUNT' AND "discountValue" > 0)
  );

-- A target names exactly one thing.
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_exactly_one"
  CHECK (num_nonnulls("productId", "categoryId", "collectionId") = 1);

-- The struck-through "compare at" prices came with the starter catalogue and
-- were never prices the shop charged. A struck price is now only ever a
-- piece's regular price beside a live sale, so these go.
UPDATE "Product" SET "compareAtAgorot" = NULL WHERE "compareAtAgorot" IS NOT NULL;
UPDATE "ProductVariant" SET "compareAtAgorot" = NULL WHERE "compareAtAgorot" IS NOT NULL;
