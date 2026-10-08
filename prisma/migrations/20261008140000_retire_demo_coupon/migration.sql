-- The starter seed's development coupon DEMO10 (10% off) is retired (D4D.33).
-- Until now no shopper could type a code; the bag now has a coupon field, so
-- a live seed coupon would give 10% off to anyone who guessed it. Archived,
-- not deleted, so nothing that refers to it breaks.
UPDATE "Coupon"
SET "isActive" = false, "archivedAt" = COALESCE("archivedAt", CURRENT_TIMESTAMP)
WHERE "codeNormalized" = 'DEMO10';
