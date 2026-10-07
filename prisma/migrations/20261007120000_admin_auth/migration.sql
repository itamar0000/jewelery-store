-- Admin sign-in (D4D.24).
--
-- Written by hand: `migrate dev --create-only` also proposed dropping the
-- order and request number sequences and three hand-made indexes, which the
-- schema file cannot express. Only the additions below belong here.

-- A staff member's display name, and a way to revoke one without deleting
-- the history they wrote.
ALTER TABLE "User" ADD COLUMN "displayName" TEXT,
ADD COLUMN "disabledAt" TIMESTAMP(3);

-- Sign-in attempts, kept to rate-limit password guessing.
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "ipHash" TEXT,
    "succeeded" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginAttempt_emailNormalized_createdAt_idx" ON "LoginAttempt"("emailNormalized", "createdAt");
CREATE INDEX "LoginAttempt_ipHash_createdAt_idx" ON "LoginAttempt"("ipHash", "createdAt");
