CREATE TABLE "rental_room_snapshots" (
    "roomId" TEXT NOT NULL,
    "ownerId" TEXT,
    "status" TEXT NOT NULL,
    "maxOccupants" INTEGER NOT NULL DEFAULT 1,
    "currentOccupants" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "address" TEXT,
    "priceValue" BIGINT,
    "imageUrl" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_room_snapshots_pkey" PRIMARY KEY ("roomId")
);

CREATE INDEX "rental_room_snapshots_ownerId_idx"
ON "rental_room_snapshots"("ownerId");

CREATE INDEX "rental_room_snapshots_status_idx"
ON "rental_room_snapshots"("status");

INSERT INTO "rental_room_snapshots" (
    "roomId",
    "ownerId",
    "status",
    "maxOccupants",
    "currentOccupants",
    "title",
    "address",
    "priceValue",
    "sourceUpdatedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    room."id",
    room."ownerId",
    room."status"::text,
    GREATEST(COALESCE(room."maxOccupants", 1), 1),
    GREATEST(COALESCE(room."currentOccupants", 0), 0),
    room."title",
    room."address",
    room."priceValue",
    room."updatedAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Room" AS room
ON CONFLICT ("roomId") DO NOTHING;
