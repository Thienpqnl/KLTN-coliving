-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "property";
SET search_path TO "property";

-- CreateEnum
CREATE TYPE "ServiceRegion" AS ENUM ('NORTH', 'CENTRAL', 'SOUTH');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'PENDING', 'HIDDEN', 'DRAFT', 'NEEDS_REVISION', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM ('IDENTITY', 'OWNERSHIP', 'ADDRESS', 'ROOM_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommunityManagerRecommendation" AS ENUM ('PENDING', 'NEEDS_REVISION', 'RECOMMEND_APPROVAL', 'RECOMMEND_REJECTION');

-- CreateEnum
CREATE TYPE "VerificationCheckType" AS ENUM ('OWNER_PHONE', 'OWNER_IDENTITY_DOCUMENT', 'OWNERSHIP_DOCUMENT', 'ROOM_ADDRESS', 'MAP_LOCATION', 'ROOM_IMAGES', 'LEGAL_DECLARATION', 'ROOM_DETAILS');

-- CreateEnum
CREATE TYPE "VerificationCheckStatus" AS ENUM ('PENDING', 'MATCHED', 'MISMATCHED', 'NEEDS_REVIEW', 'UNVERIFIABLE');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "provinceCode" TEXT,
    "ward" TEXT,
    "wardCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "allowPets" BOOLEAN DEFAULT false,
    "allowSmoking" BOOLEAN DEFAULT false,
    "areaText" TEXT,
    "areaValue" DECIMAL(10,2),
    "cleanlinessRequired" TEXT,
    "curfewPolicy" TEXT,
    "currentOccupants" INTEGER DEFAULT 0,
    "district" TEXT,
    "districtId" TEXT,
    "expired_date" TEXT,
    "guestPolicy" TEXT,
    "maxOccupants" INTEGER DEFAULT 1,
    "noiseTolerance" TEXT,
    "ownerId" TEXT,
    "posted_date" TEXT,
    "preferredGender" TEXT,
    "preferredOccupation" TEXT,
    "preferredSleepHabit" TEXT,
    "priceText" TEXT,
    "priceValue" BIGINT,
    "roomId" TEXT,
    "sourceUrl" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'DRAFT',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomAmenity" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "RoomAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomImage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomVerification" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "assignedManagerId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "managerAssignedAt" TIMESTAMP(3),
    "managerReviewedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "revisionReason" TEXT,
    "rejectionReason" TEXT,
    "adminNote" TEXT,
    "managerNote" TEXT,
    "inspectionDate" TIMESTAMP(3),
    "inspectionImages" JSONB,
    "managerRecommendation" "CommunityManagerRecommendation" NOT NULL DEFAULT 'PENDING',
    "identityPassed" BOOLEAN NOT NULL DEFAULT false,
    "ownershipPassed" BOOLEAN NOT NULL DEFAULT false,
    "addressPassed" BOOLEAN NOT NULL DEFAULT false,
    "imagesPassed" BOOLEAN NOT NULL DEFAULT false,
    "detailsPassed" BOOLEAN NOT NULL DEFAULT false,
    "facilityPassed" BOOLEAN NOT NULL DEFAULT false,
    "safetyPassed" BOOLEAN NOT NULL DEFAULT false,
    "legalOccupancyPassed" BOOLEAN NOT NULL DEFAULT false,
    "informationAccurateConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "legalResponsibilityAccepted" BOOLEAN NOT NULL DEFAULT false,
    "verificationConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "declarationAcceptedAt" TIMESTAMP(3),
    "declarationVersion" TEXT,
    "declarationIpAddress" TEXT,
    "declarationUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCheck" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "type" "VerificationCheckType" NOT NULL,
    "status" "VerificationCheckStatus" NOT NULL DEFAULT 'PENDING',
    "sourceValue" TEXT,
    "targetValue" TEXT,
    "note" TEXT,
    "checkedById" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityManagerArea" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "region" "ServiceRegion",
    "city" TEXT,
    "provinceCode" TEXT,
    "ward" TEXT,
    "wardCode" TEXT,
    "district" TEXT,
    "districtId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityManagerArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomVerificationDocument" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "type" "VerificationDocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "VerificationDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomVerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_outbox_events" (
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

    CONSTRAINT "property_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Room_ownerId_idx" ON "Room"("ownerId");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_name_key" ON "Amenity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoomAmenity_roomId_amenityId_key" ON "RoomAmenity"("roomId", "amenityId");

-- CreateIndex
CREATE INDEX "RoomImage_roomId_idx" ON "RoomImage"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomVerification_roomId_key" ON "RoomVerification"("roomId");

-- CreateIndex
CREATE INDEX "RoomVerification_reviewerId_idx" ON "RoomVerification"("reviewerId");

-- CreateIndex
CREATE INDEX "RoomVerification_assignedManagerId_idx" ON "RoomVerification"("assignedManagerId");

-- CreateIndex
CREATE INDEX "RoomVerification_managerRecommendation_idx" ON "RoomVerification"("managerRecommendation");

-- CreateIndex
CREATE INDEX "RoomVerification_submittedAt_idx" ON "RoomVerification"("submittedAt");

-- CreateIndex
CREATE INDEX "VerificationCheck_verificationId_idx" ON "VerificationCheck"("verificationId");

-- CreateIndex
CREATE INDEX "VerificationCheck_type_idx" ON "VerificationCheck"("type");

-- CreateIndex
CREATE INDEX "VerificationCheck_status_idx" ON "VerificationCheck"("status");

-- CreateIndex
CREATE INDEX "VerificationCheck_checkedById_idx" ON "VerificationCheck"("checkedById");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCheck_verificationId_type_key" ON "VerificationCheck"("verificationId", "type");

-- CreateIndex
CREATE INDEX "CommunityManagerArea_managerId_idx" ON "CommunityManagerArea"("managerId");

-- CreateIndex
CREATE INDEX "CommunityManagerArea_region_idx" ON "CommunityManagerArea"("region");

-- CreateIndex
CREATE INDEX "CommunityManagerArea_city_idx" ON "CommunityManagerArea"("city");

-- CreateIndex
CREATE INDEX "CommunityManagerArea_provinceCode_idx" ON "CommunityManagerArea"("provinceCode");

-- CreateIndex
CREATE INDEX "CommunityManagerArea_ward_idx" ON "CommunityManagerArea"("ward");

-- CreateIndex
CREATE INDEX "CommunityManagerArea_wardCode_idx" ON "CommunityManagerArea"("wardCode");

-- CreateIndex
CREATE INDEX "CommunityManagerArea_district_idx" ON "CommunityManagerArea"("district");

-- CreateIndex
CREATE INDEX "CommunityManagerArea_districtId_idx" ON "CommunityManagerArea"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityManagerArea_managerId_region_city_provinceCode_war_key" ON "CommunityManagerArea"("managerId", "region", "city", "provinceCode", "ward", "wardCode", "district", "districtId");

-- CreateIndex
CREATE INDEX "RoomVerificationDocument_verificationId_idx" ON "RoomVerificationDocument"("verificationId");

-- CreateIndex
CREATE INDEX "RoomVerificationDocument_type_idx" ON "RoomVerificationDocument"("type");

-- CreateIndex
CREATE INDEX "property_outbox_events_status_nextAttemptAt_idx" ON "property_outbox_events"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "property_outbox_events_aggregateType_aggregateId_idx" ON "property_outbox_events"("aggregateType", "aggregateId");

-- AddForeignKey
ALTER TABLE "RoomAmenity" ADD CONSTRAINT "RoomAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAmenity" ADD CONSTRAINT "RoomAmenity_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomImage" ADD CONSTRAINT "RoomImage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomVerification" ADD CONSTRAINT "RoomVerification_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCheck" ADD CONSTRAINT "VerificationCheck_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "RoomVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomVerificationDocument" ADD CONSTRAINT "RoomVerificationDocument_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "RoomVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
