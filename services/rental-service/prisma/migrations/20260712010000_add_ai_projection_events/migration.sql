CREATE OR REPLACE FUNCTION emit_rental_occupancy_profile_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO rental_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES (
    'OCCUPANCY', NEW."id", 'rental.occupancy-profile.changed',
    jsonb_build_object(
      'occupancyId', NEW."id", 'roomId', NEW."roomId", 'userId', NEW."userId",
      'status', NEW."status", 'joinedAt', NEW."joinedAt",
      'terminatedAt', NEW."terminatedAt"
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS rental_occupancy_profile_changed_outbox ON occupancy;
CREATE TRIGGER rental_occupancy_profile_changed_outbox
AFTER INSERT OR UPDATE ON occupancy
FOR EACH ROW EXECUTE FUNCTION emit_rental_occupancy_profile_changed();
