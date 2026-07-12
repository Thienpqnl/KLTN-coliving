function createDomainOutbox({ delegateName, serviceName }) {
  function delegate(db) {
    const value = db[delegateName];
    if (!value) throw new Error(`Prisma delegate ${delegateName} is unavailable`);
    return value;
  }

  async function enqueueEvent(db, { aggregateType, aggregateId, eventType, payload }) {
    return delegate(db).create({
      data: { aggregateType, aggregateId, eventType, payload },
    });
  }

  async function processOutboxBatch(prisma, publisher, batchSize = 20) {
    const model = delegate(prisma);
    const events = await model.findMany({
      where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });
    for (const event of events) {
      const claimed = await model.updateMany({
        where: { id: event.id, status: "PENDING" },
        data: { status: "PROCESSING" },
      });
      if (claimed.count !== 1) continue;
      try {
        await publisher.publish({
          id: event.id,
          sourceService: serviceName,
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload,
          occurredAt: event.createdAt.toISOString(),
        });
        await model.update({
          where: { id: event.id },
          data: { status: "PUBLISHED", publishedAt: new Date(), lastError: null },
        });
      } catch (error) {
        const attempts = event.attempts + 1;
        await model.update({
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
        console.error(`[${serviceName}] Outbox polling failed`, error);
      } finally {
        running = false;
      }
    }

    void delegate(prisma).updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      data: { status: "PENDING", nextAttemptAt: new Date() },
    }).catch((error) => console.error(`[${serviceName}] Outbox recovery failed`, error));

    const timer = setInterval(processBatch, intervalMs);
    timer.unref?.();
    void processBatch();
    return async function stop() {
      stopped = true;
      clearInterval(timer);
      while (running) await new Promise((resolve) => setTimeout(resolve, 10));
    };
  }

  return { enqueueEvent, processOutboxBatch, startOutboxWorker };
}

module.exports = { createDomainOutbox };
