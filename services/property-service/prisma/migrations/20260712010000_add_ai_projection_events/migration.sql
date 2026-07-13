CREATE OR REPLACE FUNCTION emit_property_room_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO property_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES ('ROOM', NEW."id", 'property.room.changed', to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS property_room_changed_outbox ON "Room";
CREATE TRIGGER property_room_changed_outbox
AFTER INSERT OR UPDATE ON "Room"
FOR EACH ROW EXECUTE FUNCTION emit_property_room_changed();
