ALTER TABLE "rental_room_snapshots"
ADD COLUMN "areaText" TEXT,
ADD COLUMN "areaValue" DECIMAL(10,2),
ADD COLUMN "city" TEXT,
ADD COLUMN "district" TEXT,
ADD COLUMN "priceText" TEXT,
ADD COLUMN "images" JSONB,
ADD COLUMN "amenities" JSONB;

UPDATE "rental_room_snapshots" AS snapshot
SET
    "areaText" = room."areaText",
    "areaValue" = room."areaValue",
    "city" = room."city",
    "district" = room."district",
    "priceText" = room."priceText",
    "images" = COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'url', image."url",
            'alt', image."alt",
            'sortOrder', image."sortOrder"
          )
          ORDER BY image."sortOrder"
        )
        FROM "RoomImage" AS image
        WHERE image."roomId" = room."id"
      ),
      '[]'::jsonb
    ),
    "amenities" = COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', relation."id",
            'amenityId', relation."amenityId",
            'amenity', jsonb_build_object(
              'id', amenity."id",
              'name', amenity."name"
            )
          )
        )
        FROM "RoomAmenity" AS relation
        INNER JOIN "Amenity" AS amenity ON amenity."id" = relation."amenityId"
        WHERE relation."roomId" = room."id"
      ),
      '[]'::jsonb
    )
FROM "Room" AS room
WHERE snapshot."roomId" = room."id";
