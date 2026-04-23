-- Drop old image column and recreate as TEXT
ALTER TABLE "Room" DROP COLUMN "image";
ALTER TABLE "Room" ADD COLUMN "image" TEXT NOT NULL DEFAULT '';

-- Add ownerId column as nullable first
ALTER TABLE "Room" ADD COLUMN "ownerId" TEXT;

-- Get the first user's ID to use as default for existing rooms
-- This ensures we have a valid ownerId for all existing rooms
DO $$
DECLARE
  first_user_id TEXT;
BEGIN
  SELECT id INTO first_user_id FROM "User" LIMIT 1;
  IF first_user_id IS NOT NULL THEN
    UPDATE "Room" SET "ownerId" = first_user_id WHERE "ownerId" IS NULL;
  END IF;
END $$;

-- Make the column required
ALTER TABLE "Room" ALTER COLUMN "ownerId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "Room" ADD CONSTRAINT "Room_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;

