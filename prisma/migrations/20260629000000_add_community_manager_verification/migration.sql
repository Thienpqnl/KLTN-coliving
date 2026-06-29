-- Add Community Manager role and phone verification fields.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COMMUNITY_MANAGER';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "CommunityManagerRecommendation" AS ENUM (
    'PENDING',
    'NEEDS_REVISION',
    'RECOMMEND_APPROVAL',
    'RECOMMEND_REJECTION'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "RoomVerification"
  ADD COLUMN IF NOT EXISTS "assignedManagerId" TEXT,
  ADD COLUMN IF NOT EXISTS "managerAssignedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "managerReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "managerNote" TEXT,
  ADD COLUMN IF NOT EXISTS "inspectionDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "inspectionImages" JSONB,
  ADD COLUMN IF NOT EXISTS "managerRecommendation" "CommunityManagerRecommendation" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "facilityPassed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "safetyPassed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "legalOccupancyPassed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RoomVerification"
  ADD CONSTRAINT "RoomVerification_assignedManagerId_fkey"
  FOREIGN KEY ("assignedManagerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "RoomVerification_assignedManagerId_idx" ON "RoomVerification"("assignedManagerId");
CREATE INDEX IF NOT EXISTS "RoomVerification_managerRecommendation_idx" ON "RoomVerification"("managerRecommendation");

CREATE TABLE IF NOT EXISTS "PhoneOtp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PhoneOtp"
  ADD CONSTRAINT "PhoneOtp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PhoneOtp_userId_idx" ON "PhoneOtp"("userId");
CREATE INDEX IF NOT EXISTS "PhoneOtp_phone_idx" ON "PhoneOtp"("phone");
CREATE INDEX IF NOT EXISTS "PhoneOtp_expiresAt_idx" ON "PhoneOtp"("expiresAt");
