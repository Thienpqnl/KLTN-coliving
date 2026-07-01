ALTER TABLE "Room"
  ADD COLUMN IF NOT EXISTS "provinceCode" TEXT,
  ADD COLUMN IF NOT EXISTS "ward" TEXT,
  ADD COLUMN IF NOT EXISTS "wardCode" TEXT;

ALTER TABLE "CommunityManagerArea"
  ADD COLUMN IF NOT EXISTS "provinceCode" TEXT,
  ADD COLUMN IF NOT EXISTS "ward" TEXT,
  ADD COLUMN IF NOT EXISTS "wardCode" TEXT;

CREATE INDEX IF NOT EXISTS "CommunityManagerArea_provinceCode_idx" ON "CommunityManagerArea"("provinceCode");
CREATE INDEX IF NOT EXISTS "CommunityManagerArea_ward_idx" ON "CommunityManagerArea"("ward");
CREATE INDEX IF NOT EXISTS "CommunityManagerArea_wardCode_idx" ON "CommunityManagerArea"("wardCode");

DO $$ BEGIN
  ALTER TABLE "CommunityManagerArea" DROP CONSTRAINT IF EXISTS "CommunityManagerArea_unique_scope";
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityManagerArea"
    ADD CONSTRAINT "CommunityManagerArea_unique_scope"
    UNIQUE ("managerId", "region", "city", "provinceCode", "ward", "wardCode", "district", "districtId");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
