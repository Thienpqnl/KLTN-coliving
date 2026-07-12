CREATE OR REPLACE FUNCTION property.emit_property_room_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO property.property_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES ('ROOM', NEW."id", 'property.room.changed', to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
