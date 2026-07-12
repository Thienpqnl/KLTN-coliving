const OCCUPANCY_CHANGED = "rental.occupancy.changed";

async function enqueueEvent(db, { aggregateType, aggregateId, eventType, payload }) {
  return db.rentalOutboxEvent.create({
    data: { aggregateType, aggregateId, eventType, payload },
  });
}

async function enqueueOccupancyChanged(db, roomId, activeOccupants) {
  return enqueueEvent(db, {
    aggregateType: "ROOM_OCCUPANCY",
    aggregateId: roomId,
    eventType: OCCUPANCY_CHANGED,
    payload: { roomId, activeOccupants },
  });
}

async function processOutboxBatch(prisma, publisher, batchSize = 20) {
  const events = await prisma.rentalOutboxEvent.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });
  for (const event of events) {
    const claimed = await prisma.rentalOutboxEvent.updateMany({
      where: { id: event.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) continue;
    try {
      await publisher.publish({
        id: event.id,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        occurredAt: event.createdAt.toISOString(),
      });
      await prisma.rentalOutboxEvent.update({
        where: { id: event.id },
        data: { status: "PUBLISHED", publishedAt: new Date(), lastError: null },
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      await prisma.rentalOutboxEvent.update({
        where: { id: event.id },
        data: {
          status: attempts >= 10 ? "DEAD" : "PENDING",
          attempts,
          lastError: String(error.message || error).slice(0, 2000),
          nextAttemptAt: new Date(Date.now() + Math.min(60000, 1000 * 2 ** attempts)),
        },
      });
    }
  }
  return events.length;
}

function startOutboxWorker(prisma, publisher, options = {}) {
  const intervalMs = Number(options.intervalMs || process.env.OUTBOX_POLL_INTERVAL_MS || 1000);
  const batchSize = Number(options.batchSize || 20);
  let running = false;
  let stopped = false;

  async function processBatch() {
    if (running || stopped) return;
    running = true;
    try {
      await processOutboxBatch(prisma, publisher, batchSize);
    } catch (error) {
      console.error("[rental-service] Outbox polling failed", error);
    } finally {
      running = false;
    }
  }

  void prisma.rentalOutboxEvent.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    data: { status: "PENDING", nextAttemptAt: new Date() },
  }).catch((error) => console.error("[rental-service] Outbox recovery failed", error));

  const timer = setInterval(processBatch, intervalMs);
  timer.unref?.();
  void processBatch();
  return async function stop() {
    stopped = true;
    clearInterval(timer);
    while (running) await new Promise((resolve) => setTimeout(resolve, 10));
  };
}

module.exports = {
  OCCUPANCY_CHANGED,
  enqueueEvent,
  enqueueOccupancyChanged,
  processOutboxBatch,
  startOutboxWorker,
};
