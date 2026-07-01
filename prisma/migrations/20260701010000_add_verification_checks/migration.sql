DO $$ BEGIN
  CREATE TYPE "VerificationCheckType" AS ENUM (
    'OWNER_PHONE',
    'OWNER_IDENTITY_DOCUMENT',
    'OWNERSHIP_DOCUMENT',
    'ROOM_ADDRESS',
    'MAP_LOCATION',
    'ROOM_IMAGES',
    'LEGAL_DECLARATION',
    'ROOM_DETAILS'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "VerificationCheckStatus" AS ENUM (
    'PENDING',
    'MATCHED',
    'MISMATCHED',
    'NEEDS_REVIEW',
    'UNVERIFIABLE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "VerificationCheck" (
  "id" TEXT NOT NULL,
  "verificationId" TEXT NOT NULL,
  "type" "VerificationCheckType" NOT NULL,
  "status" "VerificationCheckStatus" NOT NULL DEFAULT 'PENDING',
  "sourceValue" TEXT,
  "targetValue" TEXT,
  "note" TEXT,
  "checkedById" TEXT,
  "checkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VerificationCheck_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "VerificationCheck"
    ADD CONSTRAINT "VerificationCheck_verificationId_fkey"
    FOREIGN KEY ("verificationId") REFERENCES "RoomVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "VerificationCheck"
    ADD CONSTRAINT "VerificationCheck_checkedById_fkey"
    FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "VerificationCheck"
    ADD CONSTRAINT "VerificationCheck_verificationId_type_key"
    UNIQUE ("verificationId", "type");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "VerificationCheck_verificationId_idx" ON "VerificationCheck"("verificationId");
CREATE INDEX IF NOT EXISTS "VerificationCheck_type_idx" ON "VerificationCheck"("type");
CREATE INDEX IF NOT EXISTS "VerificationCheck_status_idx" ON "VerificationCheck"("status");
CREATE INDEX IF NOT EXISTS "VerificationCheck_checkedById_idx" ON "VerificationCheck"("checkedById");
