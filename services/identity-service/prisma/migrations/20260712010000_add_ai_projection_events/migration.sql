CREATE TABLE "identity_outbox_events" (
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
  CONSTRAINT "identity_outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "identity_outbox_events_status_nextAttemptAt_idx" ON "identity_outbox_events"("status", "nextAttemptAt");
CREATE INDEX "identity_outbox_events_aggregateType_aggregateId_idx" ON "identity_outbox_events"("aggregateType", "aggregateId");

CREATE OR REPLACE FUNCTION emit_identity_user_changed() RETURNS trigger AS $$
BEGIN
  INSERT INTO identity_outbox_events ("aggregateType", "aggregateId", "eventType", "payload")
  VALUES (
    'USER', NEW."id", 'identity.user.changed',
    jsonb_build_object(
      'userId', NEW."id", 'email', NEW."email", 'fullName', NEW."fullName",
      'role', NEW."role"::text, 'status', NEW."status"::text,
      'updatedAt', NEW."updatedAt"
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS identity_user_changed_outbox ON "User";
CREATE TRIGGER identity_user_changed_outbox
AFTER INSERT OR UPDATE OF "email", "fullName", "role", "status" ON "User"
FOR EACH ROW EXECUTE FUNCTION emit_identity_user_changed();
