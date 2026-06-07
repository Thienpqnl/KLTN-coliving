-- Add host ownership directly to contracts.
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "hostId" TEXT;

-- Backfill existing contracts from the room owner.
UPDATE "Contract" AS c
SET "hostId" = r."ownerId"
FROM "Room" AS r
WHERE c."roomId" = r."id"
  AND c."hostId" IS NULL
  AND r."ownerId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Contract_hostId_idx" ON "Contract"("hostId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Contract_hostId_fkey'
  ) THEN
    ALTER TABLE "Contract"
      ADD CONSTRAINT "Contract_hostId_fkey"
      FOREIGN KEY ("hostId") REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
