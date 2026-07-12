ALTER TABLE rental.rental_outbox_events ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE rental.rental_outbox_events ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
