/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `UserPreference` will be added. If there are existing rows, this will fail.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "cleanlinessRequired" TEXT,
ADD COLUMN     "noiseTolerance" TEXT,
ADD COLUMN     "guestPolicy" TEXT,
ADD COLUMN     "preferredSleepHabit" TEXT,
ADD COLUMN     "preferredOccupation" TEXT,
ADD COLUMN     "curfewPolicy" TEXT,
ADD COLUMN     "maxOccupants" INTEGER DEFAULT 1,
ADD COLUMN     "currentOccupants" INTEGER DEFAULT 0,
ADD COLUMN     "preferredGender" TEXT,
ADD COLUMN     "allowSmoking" BOOLEAN DEFAULT false,
ADD COLUMN     "allowPets" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "UserPreference" (
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

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_preference" FOREIGN KEY ("preferenceId") REFERENCES "UserPreference"("id") ON DELETE SET NULL;
