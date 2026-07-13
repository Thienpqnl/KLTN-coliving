CREATE TABLE "rental_outbox_events" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "rental_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rental_outbox_events_status_nextAttemptAt_idx"
ON "rental_outbox_events"("status", "nextAttemptAt");

CREATE INDEX "rental_outbox_events_aggregateType_aggregateId_idx"
ON "rental_outbox_events"("aggregateType", "aggregateId");
