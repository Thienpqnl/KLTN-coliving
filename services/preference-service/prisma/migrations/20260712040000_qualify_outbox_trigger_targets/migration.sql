CREATE OR REPLACE FUNCTION preference.emit_user_preference_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO preference.preference_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES ('USER_PREFERENCE', NEW."userId", 'preference.user-preference.changed', to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION preference.emit_room_interaction_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO preference.preference_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES ('ROOM_INTERACTION', NEW."id", 'preference.room-interaction.changed', to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
