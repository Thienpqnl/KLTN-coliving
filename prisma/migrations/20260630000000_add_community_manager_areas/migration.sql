DO $$ BEGIN
  CREATE TYPE "ServiceRegion" AS ENUM ('NORTH', 'CENTRAL', 'SOUTH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CommunityManagerArea" (
  "id" TEXT NOT NULL,
  "managerId" TEXT NOT NULL,
  "region" "ServiceRegion",
  "city" TEXT,
  "district" TEXT,
  "districtId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommunityManagerArea_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "CommunityManagerArea"
    ADD CONSTRAINT "CommunityManagerArea_managerId_fkey"
    FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "CommunityManagerArea_managerId_idx" ON "CommunityManagerArea"("managerId");
CREATE INDEX IF NOT EXISTS "CommunityManagerArea_region_idx" ON "CommunityManagerArea"("region");
CREATE INDEX IF NOT EXISTS "CommunityManagerArea_city_idx" ON "CommunityManagerArea"("city");
CREATE INDEX IF NOT EXISTS "CommunityManagerArea_district_idx" ON "CommunityManagerArea"("district");
CREATE INDEX IF NOT EXISTS "CommunityManagerArea_districtId_idx" ON "CommunityManagerArea"("districtId");

DO $$ BEGIN
  ALTER TABLE "CommunityManagerArea"
    ADD CONSTRAINT "CommunityManagerArea_unique_scope"
    UNIQUE ("managerId", "region", "city", "district", "districtId");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
