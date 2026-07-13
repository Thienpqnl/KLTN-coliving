CREATE OR REPLACE FUNCTION rental.emit_rental_occupancy_profile_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO rental.rental_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES ('OCCUPANCY', NEW."id", 'rental.occupancy-profile.changed', jsonb_build_object(
    'occupancyId', NEW."id", 'roomId', NEW."roomId", 'userId', NEW."userId",
    'status', NEW."status", 'joinedAt', NEW."joinedAt", 'terminatedAt', NEW."terminatedAt"
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
