-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "preference";
SET search_path TO "preference";

-- CreateEnum
CREATE TYPE "SmokingType" AS ENUM ('NO', 'OCCASIONALLY', 'YES');

-- CreateEnum
CREATE TYPE "SleepTime" AS ENUM ('BEFORE_10PM', 'BETWEEN_10_12', 'AFTER_12');

-- CreateEnum
CREATE TYPE "GuestFrequency" AS ENUM ('NEVER', 'SOMETIMES', 'OFTEN');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'CLICK', 'FAVORITE', 'BOOKING_REQ', 'CONTRACT');

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetMinVnd" BIGINT,
    "budgetMaxVnd" BIGINT,
    "preferredDistrict" TEXT,
    "lifestyleArchetype" TEXT,
    "priorityCleanliness" INTEGER DEFAULT 3,
    "prioritySocialEnvironment" INTEGER DEFAULT 3,
    "acceptSmokingRoommates" BOOLEAN DEFAULT false,
    "acceptPets" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lifestyle_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "smoking" "SmokingType",
    "pets" BOOLEAN,
    "petTolerance" BOOLEAN,
    "sleepTime" "SleepTime",
    "wakeupTime" INTEGER,
    "cleanliness" INTEGER,
    "noiseTolerance" INTEGER,
    "sociability" INTEGER,
    "privacyLevel" INTEGER,
    "guestsFrequency" "GuestFrequency",
    "cookingFrequency" INTEGER,
    "budget" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_lifestyle_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "interactionType" "InteractionType" NOT NULL,
    "interactionValue" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "durationSeconds" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_preferences_userId_idx" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_lifestyle_profiles_userId_key" ON "user_lifestyle_profiles"("userId");

-- CreateIndex
CREATE INDEX "RoomInteraction_roomId_idx" ON "RoomInteraction"("roomId");

-- CreateIndex
CREATE INDEX "RoomInteraction_userId_idx" ON "RoomInteraction"("userId");
