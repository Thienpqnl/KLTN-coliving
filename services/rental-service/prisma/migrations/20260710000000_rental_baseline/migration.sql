-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rental";
SET search_path TO "rental";

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNSIGNED', 'SIGNED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_HOST_SIGNATURE', 'PENDING_RENTER_SIGNATURE', 'PENDING_DEPOSIT', 'PENDING_HANDOVER', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ContractDepositStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNSIGNED',
    "signature" TEXT,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyRent" DOUBLE PRECISION NOT NULL,
    "depositAmount" DOUBLE PRECISION NOT NULL,
    "renewalCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hostId" TEXT NOT NULL,
    "bookingId" TEXT,
    "contractNumber" TEXT NOT NULL,
    "depositStatus" "ContractDepositStatus" NOT NULL DEFAULT 'PENDING',
    "depositPaidAt" TIMESTAMP(3),
    "depositReference" TEXT,
    "paymentDueDay" INTEGER NOT NULL DEFAULT 5,
    "paymentMethod" TEXT,
    "electricityRate" DOUBLE PRECISION,
    "waterRate" DOUBLE PRECISION,
    "utilitiesNotes" TEXT,
    "noticeDays" INTEGER NOT NULL DEFAULT 30,
    "depositReturnDays" INTEGER NOT NULL DEFAULT 7,
    "houseRules" TEXT,
    "inventory" JSONB,
    "contentSnapshot" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL DEFAULT 'VN-HOUSING-2023-v1',
    "hostSignedAt" TIMESTAMP(3),
    "hostSignatureName" TEXT,
    "hostSignatureIp" TEXT,
    "hostSignatureUserAgent" TEXT,
    "renterSignedAt" TIMESTAMP(3),
    "renterSignatureName" TEXT,
    "renterSignatureIp" TEXT,
    "renterSignatureUserAgent" TEXT,
    "hostHandoverConfirmedAt" TIMESTAMP(3),
    "renterHandoverConfirmedAt" TIMESTAMP(3),
    "handoverNotes" TEXT,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "occupancy" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "notes" TEXT,

    CONSTRAINT "occupancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_room_snapshots" (
    "roomId" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" TEXT NOT NULL,
    "maxOccupants" INTEGER NOT NULL DEFAULT 1,
    "currentOccupants" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "address" TEXT,
    "areaText" TEXT,
    "areaValue" DECIMAL(10,2),
    "city" TEXT,
    "district" TEXT,
    "priceValue" BIGINT,
    "priceText" TEXT,
    "imageUrl" TEXT,
    "images" JSONB,
    "amenities" JSONB,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_room_snapshots_pkey" PRIMARY KEY ("roomId")
);

-- CreateTable
CREATE TABLE "rental_outbox_events" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_bills" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "previousReading" DOUBLE PRECISION,
    "currentReading" DOUBLE PRECISION,
    "electricityUsage" DOUBLE PRECISION,
    "waterUsage" DOUBLE PRECISION,
    "electricityCost" DOUBLE PRECISION,
    "waterCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentProofUrl" TEXT,
    "paymentProofSubmittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utility_bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_roomId_idx" ON "Booking"("roomId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_bookingId_key" ON "Invoice"("bookingId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_invoiceId_key" ON "Payment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_bookingId_key" ON "Contract"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_hostId_idx" ON "Contract"("hostId");

-- CreateIndex
CREATE INDEX "Contract_renterId_idx" ON "Contract"("renterId");

-- CreateIndex
CREATE INDEX "Contract_roomId_idx" ON "Contract"("roomId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "ContractEvent_contractId_createdAt_idx" ON "ContractEvent"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractEvent_actorId_idx" ON "ContractEvent"("actorId");

-- CreateIndex
CREATE INDEX "Occupancy_roomId_idx" ON "occupancy"("roomId");

-- CreateIndex
CREATE INDEX "Occupancy_userId_idx" ON "occupancy"("userId");

-- CreateIndex
CREATE INDEX "Occupancy_status_idx" ON "occupancy"("status");

-- CreateIndex
CREATE INDEX "Occupancy_terminatedAt_idx" ON "occupancy"("terminatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "occupancy_roomId_userId_key" ON "occupancy"("roomId", "userId");

-- CreateIndex
CREATE INDEX "rental_room_snapshots_ownerId_idx" ON "rental_room_snapshots"("ownerId");

-- CreateIndex
CREATE INDEX "rental_room_snapshots_status_idx" ON "rental_room_snapshots"("status");

-- CreateIndex
CREATE INDEX "rental_outbox_events_status_nextAttemptAt_idx" ON "rental_outbox_events"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "rental_outbox_events_aggregateType_aggregateId_idx" ON "rental_outbox_events"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "utility_bills_contractId_idx" ON "utility_bills"("contractId");

-- CreateIndex
CREATE INDEX "utility_bills_status_idx" ON "utility_bills"("status");

-- CreateIndex
CREATE UNIQUE INDEX "utility_bills_contractId_month_year_key" ON "utility_bills"("contractId", "month", "year");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEvent" ADD CONSTRAINT "ContractEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
