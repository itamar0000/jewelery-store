-- ===========================================================================
-- RAW SQL PROLOGUE — extensions and sequences
--
-- Everything in this block must exist BEFORE Prisma's generated CREATE TABLE
-- statements, because those statements reference it in column DEFAULTs.
--
-- This file is hand-edited on purpose. Prisma's schema language cannot express
-- sequences, CHECK constraints, NULLS NOT DISTINCT indexes, or operator-class
-- indexes; all of them are appended in the epilogue at the end of this file.
-- Regenerating this migration would drop them, so it must not be regenerated.
-- See docs/DECISIONS.md D2.6.
-- ===========================================================================

-- Trigram similarity. PostgreSQL ships NO Hebrew text-search configuration, so
-- to_tsvector('hebrew', ...) is not an option and stemming is unavailable.
-- Trigram matching is robust for Hebrew without a stemmer and tolerates partial
-- words and typos (ARCHITECTURE section 9).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Public order reference (D2.2).
--
-- A sequence is the only concurrency-safe option here: it is transactional,
-- never hands the same value to two sessions, and does not depend on reading
-- existing rows. COUNT(*)+1 and MAX(...)+1 both race under concurrent checkout
-- and would issue duplicate order numbers.
--
-- Starts at 100001 so the first order does not read as "order 1". The number is
-- deliberately separate from Order.id, which is a cuid and never exposed.
--
-- Known tradeoff: a monotonic sequence leaks order volume to anyone who places
-- two orders. Accepted for MVP. If that later matters, ALTER SEQUENCE ...
-- INCREMENT BY <n> or a display-format change handles it without touching
-- stored data, because formatting lives in the application.
CREATE SEQUENCE IF NOT EXISTS order_number_seq AS INTEGER START WITH 100001 INCREMENT BY 1;

-- Same strategy for custom jewelry requests, in its own number space.
CREATE SEQUENCE IF NOT EXISTS custom_request_number_seq AS INTEGER START WITH 500001 INCREMENT BY 1;

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('RING', 'EARRINGS', 'NECKLACE', 'BRACELET', 'SET', 'OTHER');

-- CreateEnum
CREATE TYPE "OptionType" AS ENUM ('GOLD_KARAT', 'GOLD_COLOR', 'RING_SIZE', 'LENGTH', 'STYLE', 'PENDANT_TYPE', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'LANGUAGE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "InventoryPolicy" AS ENUM ('DENY', 'MADE_TO_ORDER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InventoryMovementReason" AS ENUM ('INITIAL_STOCK', 'MANUAL_ADJUSTMENT', 'SALE', 'RESERVATION', 'RELEASE', 'RETURN', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderAddressType" AS ENUM ('SHIPPING', 'BILLING');

-- CreateEnum
CREATE TYPE "ItemFulfillment" AS ENUM ('IN_STOCK', 'MADE_TO_ORDER');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('ENTIRE_ORDER', 'COLLECTION', 'PRODUCT', 'CATEGORY');

-- CreateEnum
CREATE TYPE "CouponTargetType" AS ENUM ('PRODUCT', 'COLLECTION', 'CATEGORY');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CustomRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'QUOTE_SENT', 'CUSTOMER_APPROVED', 'PRODUCTION', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "descriptionHe" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "imageKey" TEXT,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "filterConfig" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "descriptionHe" TEXT,
    "shortDescriptionHe" TEXT,
    "primaryCategoryId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "basePriceAgorot" INTEGER NOT NULL,
    "compareAtAgorot" INTEGER,
    "minPriceAgorot" INTEGER,
    "maxPriceAgorot" INTEGER,
    "hasDiamonds" BOOLEAN NOT NULL DEFAULT false,
    "defaultPrepDays" INTEGER,
    "lowStockThreshold" INTEGER,
    "attributes" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "searchDocument" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OptionType" NOT NULL,
    "nameHe" TEXT NOT NULL,
    "isVariantAxis" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionValue" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "labelHe" TEXT NOT NULL,
    "hexColor" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "priceAgorot" INTEGER,
    "compareAtAgorot" INTEGER,
    "prepDays" INTEGER,
    "weightGrams" DECIMAL(8,3),
    "optionSignature" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantOptionValue" (
    "variantId" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,

    CONSTRAINT "VariantOptionValue_pkey" PRIMARY KEY ("variantId","valueId")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "storageKey" TEXT NOT NULL,
    "altHe" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiamondSpec" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "isLabGrown" BOOLEAN NOT NULL DEFAULT true,
    "totalCaratWeight" DECIMAL(6,2),
    "stoneCount" INTEGER,
    "color" TEXT,
    "clarity" TEXT,
    "cut" TEXT,
    "shape" TEXT,
    "notesHe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiamondSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiamondCertificate" (
    "id" TEXT NOT NULL,
    "diamondSpecId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "fileKey" TEXT,
    "verifyUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiamondCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomizationField" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelHe" TEXT NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxLength" INTEGER,
    "options" JSONB,
    "pattern" TEXT,
    "helpTextHe" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "priceDeltaAgorot" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomizationField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "descriptionHe" TEXT,
    "imageKey" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "rules" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollection" (
    "productId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("productId","collectionId")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "policy" "InventoryPolicy" NOT NULL DEFAULT 'MADE_TO_ORDER',
    "lowStockThreshold" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "orderId" TEXT,
    "cartId" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "onHandDelta" INTEGER NOT NULL DEFAULT 0,
    "reservedDelta" INTEGER NOT NULL DEFAULT 0,
    "reason" "InventoryMovementReason" NOT NULL,
    "onHandAfter" INTEGER NOT NULL,
    "reservedAfter" INTEGER NOT NULL,
    "orderId" TEXT,
    "reservationId" TEXT,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "notesInternal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "apartment" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "instructions" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "customerId" TEXT,
    "couponId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "selections" JSONB,
    "customization" JSONB,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL DEFAULT nextval('order_number_seq'),
    "customerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "subtotalAgorot" INTEGER NOT NULL,
    "discountAgorot" INTEGER NOT NULL DEFAULT 0,
    "shippingAgorot" INTEGER NOT NULL DEFAULT 0,
    "totalAgorot" INTEGER NOT NULL,
    "vatRateBps" INTEGER,
    "vatAmountAgorot" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "shippingMethodLabel" TEXT,
    "couponId" TEXT,
    "couponCodeUsed" TEXT,
    "invoiceDocumentId" TEXT,
    "invoiceUrl" TEXT,
    "invoiceIssuedAt" TIMESTAMP(3),
    "notesInternal" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAddress" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderAddressType" NOT NULL DEFAULT 'SHIPPING',
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "apartment" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "instructions" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productNameHe" TEXT NOT NULL,
    "variantLabelHe" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "goldKarat" TEXT,
    "goldColor" TEXT,
    "sizeValue" TEXT,
    "lengthValue" TEXT,
    "imageKey" TEXT,
    "customization" JSONB,
    "selections" JSONB,
    "diamondSnapshot" JSONB,
    "productSnapshot" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceAgorot" INTEGER NOT NULL,
    "personalizationAgorot" INTEGER NOT NULL DEFAULT 0,
    "lineDiscountAgorot" INTEGER NOT NULL DEFAULT 0,
    "lineTotalAgorot" INTEGER NOT NULL,
    "fulfillment" "ItemFulfillment" NOT NULL,
    "prepDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "providerEventId" TEXT,
    "amountAgorot" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeNormalized" TEXT NOT NULL,
    "descriptionHe" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxDiscountAgorot" INTEGER,
    "minOrderAgorot" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "usageLimitTotal" INTEGER,
    "usageLimitPerCustomer" INTEGER,
    "appliesTo" "CouponScope" NOT NULL DEFAULT 'ENTIRE_ORDER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponTarget" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "targetType" "CouponTargetType" NOT NULL,
    "productId" TEXT,
    "collectionId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerEmailNormalized" TEXT NOT NULL,
    "amountAgorot" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" INTEGER NOT NULL DEFAULT nextval('custom_request_number_seq'),
    "customerId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "jewelryType" "ProductType" NOT NULL,
    "description" TEXT NOT NULL,
    "extraDetails" TEXT,
    "budgetAgorot" INTEGER,
    "status" "CustomRequestStatus" NOT NULL DEFAULT 'NEW',
    "quoteAgorot" INTEGER,
    "quoteNotes" TEXT,
    "quotedAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "linkedOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRequestImage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomRequestImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" "CustomRequestStatus",
    "toStatus" "CustomRequestStatus" NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "titleHe" TEXT,
    "bodyHe" TEXT,
    "imageKey" TEXT,
    "orderItemId" TEXT,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedByUserId" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL DEFAULT 'המועדפים שלי',
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_position_idx" ON "Category"("parentId", "position");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_primaryCategoryId_isActive_idx" ON "Product"("primaryCategoryId", "isActive");

-- CreateIndex
CREATE INDEX "Product_isActive_publishedAt_idx" ON "Product"("isActive", "publishedAt");

-- CreateIndex
CREATE INDEX "Product_archivedAt_idx" ON "Product"("archivedAt");

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");

-- CreateIndex
CREATE INDEX "ProductOption_productId_position_idx" ON "ProductOption"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_productId_code_key" ON "ProductOption"("productId", "code");

-- CreateIndex
CREATE INDEX "ProductOptionValue_optionId_position_idx" ON "ProductOptionValue"("optionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionValue_optionId_value_key" ON "ProductOptionValue"("optionId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");

-- CreateIndex
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_optionSignature_key" ON "ProductVariant"("productId", "optionSignature");

-- CreateIndex
CREATE INDEX "VariantOptionValue_valueId_idx" ON "VariantOptionValue"("valueId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductImage_variantId_position_idx" ON "ProductImage"("variantId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DiamondSpec_productId_key" ON "DiamondSpec"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DiamondSpec_variantId_key" ON "DiamondSpec"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "DiamondCertificate_diamondSpecId_key" ON "DiamondCertificate"("diamondSpecId");

-- CreateIndex
CREATE INDEX "DiamondCertificate_issuer_number_idx" ON "DiamondCertificate"("issuer", "number");

-- CreateIndex
CREATE INDEX "CustomizationField_productId_position_idx" ON "CustomizationField"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CustomizationField_productId_key_key" ON "CustomizationField"("productId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_isActive_position_idx" ON "Collection"("isActive", "position");

-- CreateIndex
CREATE INDEX "ProductCollection_collectionId_position_idx" ON "ProductCollection"("collectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_variantId_key" ON "Inventory"("variantId");

-- CreateIndex
CREATE INDEX "InventoryReservation_status_expiresAt_idx" ON "InventoryReservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "InventoryReservation_variantId_status_idx" ON "InventoryReservation"("variantId", "status");

-- CreateIndex
CREATE INDEX "InventoryReservation_orderId_idx" ON "InventoryReservation"("orderId");

-- CreateIndex
CREATE INDEX "InventoryMovement_variantId_createdAt_idx" ON "InventoryMovement"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_reason_createdAt_idx" ON "InventoryMovement"("reason", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE INDEX "Customer_emailNormalized_idx" ON "Customer"("emailNormalized");

-- CreateIndex
CREATE INDEX "Address_customerId_idx" ON "Address"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_token_key" ON "Cart"("token");

-- CreateIndex
CREATE INDEX "Cart_customerId_idx" ON "Cart"("customerId");

-- CreateIndex
CREATE INDEX "Cart_expiresAt_idx" ON "Cart"("expiresAt");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_placedAt_idx" ON "Order"("customerId", "placedAt");

-- CreateIndex
CREATE INDEX "Order_status_placedAt_idx" ON "Order"("status", "placedAt");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAddress_orderId_type_key" ON "OrderAddress"("orderId", "type");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerEventId_key" ON "Payment"("providerEventId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerRef_key" ON "Payment"("provider", "providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_codeNormalized_key" ON "Coupon"("codeNormalized");

-- CreateIndex
CREATE INDEX "Coupon_isActive_startsAt_endsAt_idx" ON "Coupon"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Coupon_codeNormalized_idx" ON "Coupon"("codeNormalized");

-- CreateIndex
CREATE INDEX "CouponTarget_couponId_idx" ON "CouponTarget"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponTarget_couponId_targetType_productId_collectionId_cat_key" ON "CouponTarget"("couponId", "targetType", "productId", "collectionId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_customerId_idx" ON "CouponRedemption"("couponId", "customerId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_customerEmailNormalized_idx" ON "CouponRedemption"("couponId", "customerEmailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRequest_requestNumber_key" ON "CustomRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "CustomRequest_status_createdAt_idx" ON "CustomRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomRequest_customerId_idx" ON "CustomRequest"("customerId");

-- CreateIndex
CREATE INDEX "CustomRequestImage_requestId_position_idx" ON "CustomRequestImage"("requestId", "position");

-- CreateIndex
CREATE INDEX "CustomRequestEvent_requestId_createdAt_idx" ON "CustomRequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_customerId_idx" ON "Review"("customerId");

-- CreateIndex
CREATE INDEX "Wishlist_customerId_idx" ON "Wishlist"("customerId");

-- CreateIndex
CREATE INDEX "WishlistItem_wishlistId_addedAt_idx" ON "WishlistItem"("wishlistId", "addedAt");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "ProductOptionValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiamondSpec" ADD CONSTRAINT "DiamondSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiamondSpec" ADD CONSTRAINT "DiamondSpec_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiamondCertificate" ADD CONSTRAINT "DiamondCertificate_diamondSpecId_fkey" FOREIGN KEY ("diamondSpecId") REFERENCES "DiamondSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomizationField" ADD CONSTRAINT "CustomizationField_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAddress" ADD CONSTRAINT "OrderAddress_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTarget" ADD CONSTRAINT "CouponTarget_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTarget" ADD CONSTRAINT "CouponTarget_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTarget" ADD CONSTRAINT "CouponTarget_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTarget" ADD CONSTRAINT "CouponTarget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_linkedOrderId_fkey" FOREIGN KEY ("linkedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequestImage" ADD CONSTRAINT "CustomRequestImage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CustomRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequestEvent" ADD CONSTRAINT "CustomRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CustomRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequestEvent" ADD CONSTRAINT "CustomRequestEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- RAW SQL EPILOGUE — invariants Prisma cannot express
--
-- The rule: an invariant that must never be violated belongs in the database.
-- Application checks exist to produce good error messages; they are not the
-- guarantee, because they are bypassed by every seed script, admin fix-up,
-- backfill and concurrent request.
--
-- Prisma's schema language expresses unique constraints and foreign keys. It
-- expresses neither CHECK constraints nor NULLS NOT DISTINCT (verified against
-- Prisma 7.10: `@@unique([...], nullsNotDistinct: true)` fails with "No such
-- argument"). Both are therefore written here by hand.
--
-- Every constraint below states WHY it exists. See docs/DECISIONS.md D2.6.
-- ===========================================================================

-- --- Sequence ownership ----------------------------------------------------
-- Ties each sequence's lifetime to its column, so dropping the table drops the
-- sequence rather than leaving an orphan behind.
ALTER SEQUENCE order_number_seq OWNED BY "Order"."orderNumber";
ALTER SEQUENCE custom_request_number_seq OWNED BY "CustomRequest"."requestNumber";

-- --- Wishlist uniqueness (F9) ----------------------------------------------
-- PostgreSQL treats NULLs as DISTINCT in unique indexes by default, so a plain
-- UNIQUE (wishlistId, productId, variantId) lets a product-level favourite
-- (variantId IS NULL) be inserted an unlimited number of times. Verified
-- empirically on PostgreSQL 16.
--
-- NULLS NOT DISTINCT (PostgreSQL 15+) treats two NULLs as equal for uniqueness,
-- which is the intended business semantics: a product may appear on a wishlist
-- once per variant, and once with no variant selected.
--
-- No @@unique is declared in schema.prisma for this, deliberately — declaring
-- one would create a second, broken index alongside this one.
CREATE UNIQUE INDEX "WishlistItem_wishlist_product_variant_key"
  ON "WishlistItem" ("wishlistId", "productId", "variantId") NULLS NOT DISTINCT;

-- --- Search indexes --------------------------------------------------------
-- Trigram index over the denormalised Hebrew search document (ARCHITECTURE 9).
CREATE INDEX "Product_searchDocument_trgm_idx"
  ON "Product" USING GIN ("searchDocument" gin_trgm_ops);

-- Containment queries over the long-tail attribute bag, e.g.
--   "attributes" @> '{"style":"vintage"}'
-- jsonb_path_ops is smaller and faster than the default for containment, which
-- is the only access pattern this column has (D2.5).
CREATE INDEX "Product_attributes_idx"
  ON "Product" USING GIN ("attributes" jsonb_path_ops);

-- Category and collection slugs are looked up on every page render.
CREATE INDEX "Collection_slug_idx" ON "Collection" ("slug");

-- ===========================================================================
-- CHECK CONSTRAINTS
-- ===========================================================================

-- --- Money is never negative -----------------------------------------------
-- A negative price is always a bug or a bad import, never a business case.
-- Refunds are represented as payment/refund records, not negative prices.
ALTER TABLE "Product" ADD CONSTRAINT "Product_basePrice_non_negative"
  CHECK ("basePriceAgorot" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_compareAt_non_negative"
  CHECK ("compareAtAgorot" IS NULL OR "compareAtAgorot" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_price_non_negative"
  CHECK ("priceAgorot" IS NULL OR "priceAgorot" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_compareAt_non_negative"
  CHECK ("compareAtAgorot" IS NULL OR "compareAtAgorot" >= 0);
ALTER TABLE "CustomizationField" ADD CONSTRAINT "CustomizationField_priceDelta_non_negative"
  CHECK ("priceDeltaAgorot" >= 0);

-- A compare-at price at or below the actual price is a data-entry error that
-- would render to the customer as a fake discount.
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_compareAt_above_price"
  CHECK (
    "compareAtAgorot" IS NULL
    OR "priceAgorot" IS NULL
    OR "compareAtAgorot" > "priceAgorot"
  );

-- The denormalised price range must not be inverted.
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_range_ordered"
  CHECK (
    "minPriceAgorot" IS NULL
    OR "maxPriceAgorot" IS NULL
    OR "minPriceAgorot" <= "maxPriceAgorot"
  );

-- --- Quantities are positive -----------------------------------------------
-- A zero-quantity line is a deletion, not a row.
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_positive"
  CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive"
  CHECK ("quantity" > 0);
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_quantity_positive"
  CHECK ("quantity" > 0);

-- --- Inventory can never reach an invalid state (F7) ------------------------
-- These are the backstop behind the atomic conditional UPDATE in
-- src/lib/inventory/reservation.ts. Even if that logic is bypassed by a script,
-- a future refactor or a manual fix-up, the database refuses to record an
-- oversold or negative state.
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_onHand_non_negative"
  CHECK ("onHand" >= 0);
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_reserved_non_negative"
  CHECK ("reserved" >= 0);

-- A DENY variant is unsellable beyond stock, so reservations may never exceed
-- what is physically on hand. MADE_TO_ORDER is deliberately exempt: selling
-- past zero stock is the entire point of made-to-order (spec section 14).
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_deny_cannot_oversell"
  CHECK ("policy" <> 'DENY' OR "reserved" <= "onHand");

-- The ledger records the resulting state, which can never be invalid either.
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_after_non_negative"
  CHECK ("onHandAfter" >= 0 AND "reservedAfter" >= 0);

-- --- Order arithmetic must add up ------------------------------------------
-- The single most valuable constraint in this schema. It is the last line of
-- defence against a pricing bug shipping money out of the door, it costs
-- nothing, and it catches mistakes no unit test anticipated.
--
-- VAT is NOT added here: Israeli consumer prices are displayed VAT-inclusive
-- (ARCHITECTURE 6.2), so vatAmountAgorot is a component OF the total, recorded
-- for the invoice, not an addition to it.
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_consistent"
  CHECK ("totalAgorot" = "subtotalAgorot" - "discountAgorot" + "shippingAgorot");

ALTER TABLE "Order" ADD CONSTRAINT "Order_amounts_non_negative"
  CHECK (
    "subtotalAgorot" >= 0
    AND "discountAgorot" >= 0
    AND "shippingAgorot" >= 0
    AND "totalAgorot" >= 0
  );

-- A discount larger than the goods is a coupon bug; it must never be storable.
ALTER TABLE "Order" ADD CONSTRAINT "Order_discount_not_above_subtotal"
  CHECK ("discountAgorot" <= "subtotalAgorot");

-- VAT rate is basis points: 0-10000.
ALTER TABLE "Order" ADD CONSTRAINT "Order_vat_rate_in_range"
  CHECK ("vatRateBps" IS NULL OR ("vatRateBps" >= 0 AND "vatRateBps" <= 10000));

-- --- Order line arithmetic --------------------------------------------------
-- The canonical line formula, fixed here so every writer agrees:
--   lineTotal = (unitPrice + personalization) * quantity - lineDiscount
-- personalizationAgorot is a PER-UNIT surcharge.
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_line_total_consistent"
  CHECK (
    "lineTotalAgorot"
    = ("unitPriceAgorot" + "personalizationAgorot") * "quantity" - "lineDiscountAgorot"
  );

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_amounts_non_negative"
  CHECK (
    "unitPriceAgorot" >= 0
    AND "personalizationAgorot" >= 0
    AND "lineDiscountAgorot" >= 0
    AND "lineTotalAgorot" >= 0
  );

-- --- Payments ---------------------------------------------------------------
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_non_negative"
  CHECK ("amountAgorot" >= 0);

-- --- Coupons ----------------------------------------------------------------
-- A zero or negative discount is not a coupon.
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_value_positive"
  CHECK ("discountValue" > 0);

-- discountValue is polymorphic: basis points for PERCENTAGE, agorot for
-- FIXED_AMOUNT. Only the percentage case has an upper bound — 10000 bp = 100%.
-- A 150% coupon would pay the customer to shop.
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_percentage_within_range"
  CHECK ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 10000);

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_window_ordered"
  CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "startsAt" < "endsAt");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_thresholds_non_negative"
  CHECK (
    ("minOrderAgorot" IS NULL OR "minOrderAgorot" >= 0)
    AND ("maxDiscountAgorot" IS NULL OR "maxDiscountAgorot" > 0)
  );

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_usage_limits_positive"
  CHECK (
    ("usageLimitTotal" IS NULL OR "usageLimitTotal" > 0)
    AND ("usageLimitPerCustomer" IS NULL OR "usageLimitPerCustomer" > 0)
  );

ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_amount_non_negative"
  CHECK ("amountAgorot" >= 0);

-- A coupon target must point at exactly one thing, matching its declared type.
ALTER TABLE "CouponTarget" ADD CONSTRAINT "CouponTarget_exactly_one_reference"
  CHECK (
    ("productId" IS NOT NULL)::int
    + ("collectionId" IS NOT NULL)::int
    + ("categoryId" IS NOT NULL)::int = 1
  );

ALTER TABLE "CouponTarget" ADD CONSTRAINT "CouponTarget_reference_matches_type"
  CHECK (
    ("targetType" = 'PRODUCT'    AND "productId"    IS NOT NULL)
    OR ("targetType" = 'COLLECTION' AND "collectionId" IS NOT NULL)
    OR ("targetType" = 'CATEGORY'   AND "categoryId"   IS NOT NULL)
  );

-- --- Diamond spec scoping (F6) ---------------------------------------------
-- A spec describes either a product (the default for all its variants) or one
-- variant (an override). Never both, never neither.
ALTER TABLE "DiamondSpec" ADD CONSTRAINT "DiamondSpec_attaches_to_one_level"
  CHECK (("productId" IS NULL) <> ("variantId" IS NULL));

ALTER TABLE "DiamondSpec" ADD CONSTRAINT "DiamondSpec_measurements_positive"
  CHECK (
    ("totalCaratWeight" IS NULL OR "totalCaratWeight" > 0)
    AND ("stoneCount" IS NULL OR "stoneCount" > 0)
  );

-- --- Reviews ----------------------------------------------------------------
-- Spec section 34 is a five-star scale.
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_in_range"
  CHECK ("rating" BETWEEN 1 AND 5);

-- --- Custom requests --------------------------------------------------------
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_amounts_non_negative"
  CHECK (
    ("budgetAgorot" IS NULL OR "budgetAgorot" >= 0)
    AND ("quoteAgorot" IS NULL OR "quoteAgorot" >= 0)
  );

ALTER TABLE "CustomRequestImage" ADD CONSTRAINT "CustomRequestImage_size_positive"
  CHECK ("sizeBytes" > 0);

-- --- Physical measurement ---------------------------------------------------
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_weight_positive"
  CHECK ("weightGrams" IS NULL OR "weightGrams" > 0);
