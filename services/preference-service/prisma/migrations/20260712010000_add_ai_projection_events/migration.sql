CREATE TABLE "preference_outbox_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "preference_outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "preference_outbox_events_status_nextAttemptAt_idx" ON "preference_outbox_events"("status", "nextAttemptAt");
CREATE INDEX "preference_outbox_events_aggregateType_aggregateId_idx" ON "preference_outbox_events"("aggregateType", "aggregateId");

CREATE OR REPLACE FUNCTION emit_user_preference_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO preference_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES ('USER_PREFERENCE', NEW."userId", 'preference.user-preference.changed', to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS user_preference_changed_outbox ON user_preferences;
CREATE TRIGGER user_preference_changed_outbox
AFTER INSERT OR UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION emit_user_preference_changed();

CREATE OR REPLACE FUNCTION emit_room_interaction_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO preference_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES ('ROOM_INTERACTION', NEW."id", 'preference.room-interaction.changed', to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS room_interaction_changed_outbox ON "RoomInteraction";
CREATE TRIGGER room_interaction_changed_outbox
AFTER INSERT OR UPDATE ON "RoomInteraction"
FOR EACH ROW EXECUTE FUNCTION emit_room_interaction_changed();
