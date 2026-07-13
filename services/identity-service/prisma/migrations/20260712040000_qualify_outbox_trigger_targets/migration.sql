CREATE OR REPLACE FUNCTION identity.emit_identity_user_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO identity.identity_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES ('USER', NEW."id", 'identity.user.changed', jsonb_build_object(
    'userId', NEW."id", 'email', NEW."email", 'fullName', NEW."fullName",
    'role', NEW."role"::text, 'status', NEW."status"::text, 'updatedAt', NEW."updatedAt"
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
