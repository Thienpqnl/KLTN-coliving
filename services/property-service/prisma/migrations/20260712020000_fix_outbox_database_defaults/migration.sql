ALTER TABLE property_outbox_events ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE property_outbox_events ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
