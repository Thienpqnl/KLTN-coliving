-- Rebuild the cached occupant count from active occupancy records.
-- AVAILABLE means the approved room still has capacity; OCCUPIED means it is full.
UPDATE "Room" AS room
SET
  "currentOccupants" = (
    SELECT COUNT(*)::INTEGER
    FROM "occupancy" AS occupancy
    WHERE occupancy."roomId" = room."id"
      AND occupancy."status" = 'ACTIVE'
  ),
  "status" = CASE
    WHEN room."status" IN ('AVAILABLE', 'OCCUPIED') THEN
      CASE
        WHEN (
          SELECT COUNT(*)
          FROM "occupancy" AS occupancy
          WHERE occupancy."roomId" = room."id"
            AND occupancy."status" = 'ACTIVE'
        ) >= GREATEST(COALESCE(room."maxOccupants", 1), 1)
          THEN 'OCCUPIED'::"RoomStatus"
        ELSE 'AVAILABLE'::"RoomStatus"
      END
    ELSE room."status"
  END;
