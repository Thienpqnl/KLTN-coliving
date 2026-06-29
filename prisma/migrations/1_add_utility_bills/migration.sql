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
CREATE INDEX "utility_bills_contractId_idx" ON "utility_bills"("contractId");

-- CreateIndex
CREATE INDEX "utility_bills_status_idx" ON "utility_bills"("status");

-- CreateIndex
CREATE UNIQUE INDEX "utility_bills_contractId_month_year_key" ON "utility_bills"("contractId", "month", "year");

-- AddForeignKey
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

