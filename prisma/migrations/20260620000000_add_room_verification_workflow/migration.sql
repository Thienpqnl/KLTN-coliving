ALTER TYPE "RoomStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "RoomStatus" ADD VALUE IF NOT EXISTS 'NEEDS_REVISION';
ALTER TYPE "RoomStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

COMMIT;

ALTER TABLE "Room" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE TYPE "VerificationDocumentType" AS ENUM ('IDENTITY', 'OWNERSHIP', 'ADDRESS', 'ROOM_PROOF', 'OTHER');
CREATE TYPE "VerificationDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "RoomVerification" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "revisionReason" TEXT,
    "rejectionReason" TEXT,
    "adminNote" TEXT,
    "identityPassed" BOOLEAN NOT NULL DEFAULT false,
    "ownershipPassed" BOOLEAN NOT NULL DEFAULT false,
    "addressPassed" BOOLEAN NOT NULL DEFAULT false,
    "imagesPassed" BOOLEAN NOT NULL DEFAULT false,
    "detailsPassed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomVerification_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX "RoomVerification_roomId_key" ON "RoomVerification"("roomId");
CREATE INDEX "RoomVerification_reviewerId_idx" ON "RoomVerification"("reviewerId");
CREATE INDEX "RoomVerification_submittedAt_idx" ON "RoomVerification"("submittedAt");
CREATE INDEX "RoomVerificationDocument_verificationId_idx" ON "RoomVerificationDocument"("verificationId");
CREATE INDEX "RoomVerificationDocument_type_idx" ON "RoomVerificationDocument"("type");

ALTER TABLE "RoomVerification" ADD CONSTRAINT "RoomVerification_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomVerification" ADD CONSTRAINT "RoomVerification_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoomVerificationDocument" ADD CONSTRAINT "RoomVerificationDocument_verificationId_fkey"
FOREIGN KEY ("verificationId") REFERENCES "RoomVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
