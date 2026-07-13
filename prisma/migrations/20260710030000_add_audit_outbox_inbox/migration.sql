CREATE TABLE "property_outbox_events" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "property_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_outbox_events" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_inbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sourceService" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "identity_inbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "property_outbox_events_status_nextAttemptAt_idx"
ON "property_outbox_events"("status", "nextAttemptAt");
CREATE INDEX "property_outbox_events_aggregateType_aggregateId_idx"
ON "property_outbox_events"("aggregateType", "aggregateId");
CREATE INDEX "community_outbox_events_status_nextAttemptAt_idx"
ON "community_outbox_events"("status", "nextAttemptAt");
CREATE INDEX "community_outbox_events_aggregateType_aggregateId_idx"
ON "community_outbox_events"("aggregateType", "aggregateId");
CREATE UNIQUE INDEX "identity_inbox_events_eventId_key"
ON "identity_inbox_events"("eventId");
CREATE INDEX "identity_inbox_events_eventType_processedAt_idx"
ON "identity_inbox_events"("eventType", "processedAt");
