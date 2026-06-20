ALTER TABLE "RoomVerification"
ADD COLUMN "informationAccurateConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "legalResponsibilityAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "verificationConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "declarationAcceptedAt" TIMESTAMP(3),
ADD COLUMN "declarationVersion" TEXT,
ADD COLUMN "declarationIpAddress" TEXT,
ADD COLUMN "declarationUserAgent" TEXT;
