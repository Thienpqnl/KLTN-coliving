-- Link contracts back to the booking they were created from.
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Contract_bookingId_key"
  ON "Contract"("bookingId")
  WHERE "bookingId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Contract_bookingId_fkey'
  ) THEN
    ALTER TABLE "Contract"
      ADD CONSTRAINT "Contract_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
