-- Extend the contract lifecycle without removing existing contract data.
ALTER TABLE "Contract" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "ContractStatus" RENAME TO "ContractStatus_old";
CREATE TYPE "ContractStatus" AS ENUM (
  'DRAFT',
  'PENDING_HOST_SIGNATURE',
  'PENDING_RENTER_SIGNATURE',
  'PENDING_DEPOSIT',
  'PENDING_HANDOVER',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
  'CANCELLED',
  'DISPUTED'
);
ALTER TABLE "Contract"
  ALTER COLUMN "status" TYPE "ContractStatus"
  USING ("status"::text::"ContractStatus");
DROP TYPE "ContractStatus_old";

CREATE TYPE "ContractDepositStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FORFEITED'
);

ALTER TABLE "Contract"
  ADD COLUMN "contractNumber" TEXT,
  ADD COLUMN "depositStatus" "ContractDepositStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "depositPaidAt" TIMESTAMP(3),
  ADD COLUMN "depositReference" TEXT,
  ADD COLUMN "paymentDueDay" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "electricityRate" DOUBLE PRECISION,
  ADD COLUMN "waterRate" DOUBLE PRECISION,
  ADD COLUMN "utilitiesNotes" TEXT,
  ADD COLUMN "noticeDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "depositReturnDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "houseRules" TEXT,
  ADD COLUMN "inventory" JSONB,
  ADD COLUMN "contentSnapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "termsVersion" TEXT NOT NULL DEFAULT 'VN-HOUSING-2023-v1',
  ADD COLUMN "hostSignedAt" TIMESTAMP(3),
  ADD COLUMN "hostSignatureName" TEXT,
  ADD COLUMN "hostSignatureIp" TEXT,
  ADD COLUMN "hostSignatureUserAgent" TEXT,
  ADD COLUMN "renterSignedAt" TIMESTAMP(3),
  ADD COLUMN "renterSignatureName" TEXT,
  ADD COLUMN "renterSignatureIp" TEXT,
  ADD COLUMN "renterSignatureUserAgent" TEXT,
  ADD COLUMN "hostHandoverConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "renterHandoverConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "handoverNotes" TEXT,
  ADD COLUMN "activatedAt" TIMESTAMP(3);

UPDATE "Contract" AS c
SET "hostId" = r."ownerId"
FROM "Room" AS r
WHERE c."roomId" = r."id"
  AND c."hostId" IS NULL
  AND r."ownerId" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Contract" WHERE "hostId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate contracts: existing contract has no hostId';
  END IF;
END $$;

ALTER TABLE "Contract" ALTER COLUMN "hostId" SET NOT NULL;
ALTER TABLE "Contract" DROP CONSTRAINT IF EXISTS "Contract_hostId_fkey";
ALTER TABLE "Contract"
  ADD CONSTRAINT "Contract_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Contract_bookingId_key";
CREATE UNIQUE INDEX "Contract_bookingId_key" ON "Contract"("bookingId");

UPDATE "Contract"
SET
  "contractNumber" = 'HD-' || TO_CHAR("createdAt", 'YYYY') || '-' || UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 8)),
  "contentHash" = MD5("id" || ':' || "createdAt"::text),
  "depositStatus" = CASE
    WHEN "depositAmount" <= 0 THEN 'NOT_REQUIRED'::"ContractDepositStatus"
    ELSE 'PAID'::"ContractDepositStatus"
  END,
  "activatedAt" = "createdAt"
WHERE "contractNumber" IS NULL;

ALTER TABLE "Contract"
  ALTER COLUMN "contractNumber" SET NOT NULL,
  ALTER COLUMN "contentHash" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");
CREATE INDEX "Contract_renterId_idx" ON "Contract"("renterId");
CREATE INDEX "Contract_roomId_idx" ON "Contract"("roomId");
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

CREATE TABLE "ContractEvent" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" TEXT NOT NULL,
  "fromStatus" "ContractStatus",
  "toStatus" "ContractStatus",
  "note" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractEvent_contractId_createdAt_idx" ON "ContractEvent"("contractId", "createdAt");
CREATE INDEX "ContractEvent_actorId_idx" ON "ContractEvent"("actorId");

ALTER TABLE "ContractEvent"
  ADD CONSTRAINT "ContractEvent_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractEvent"
  ADD CONSTRAINT "ContractEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
