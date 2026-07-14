ALTER TABLE "Booking"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledById" TEXT,
ADD COLUMN "cancellationActor" TEXT,
ADD COLUMN "cancellationReason" TEXT;

CREATE INDEX "Booking_cancelledById_idx" ON "Booking"("cancelledById");
