const assert = require("node:assert/strict");
const test = require("node:test");
const {
  enqueueOccupancyChanged,
  processOutboxBatch,
} = require("./outbox.cjs");

test("occupancy event is written through the transaction client", async () => {
  let data;
  const tx = {
    rentalOutboxEvent: {
      create: async (args) => {
        data = args.data;
        return args.data;
      },
    },
  };

  await enqueueOccupancyChanged(tx, "room-1", 2);
  assert.equal(data.eventType, "rental.occupancy.changed");
  assert.deepEqual(data.payload, { roomId: "room-1", activeOccupants: 2 });
});

test("outbox marks an event published only after broker confirmation", async () => {
  const updates = [];
  const event = {
    id: "event-1",
    aggregateType: "ROOM_OCCUPANCY",
    aggregateId: "room-1",
    eventType: "rental.occupancy.changed",
    payload: { roomId: "room-1", activeOccupants: 1 },
    attempts: 0,
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
  };
  const prisma = {
    rentalOutboxEvent: {
      findMany: async () => [event],
      updateMany: async () => ({ count: 1 }),
      update: async (args) => updates.push(args.data),
    },
  };
  let published;
  await processOutboxBatch(prisma, { publish: async (value) => { published = value; } });

  assert.equal(published.id, "event-1");
  assert.equal(updates[0].status, "PUBLISHED");
  assert.ok(updates[0].publishedAt instanceof Date);
});

test("outbox schedules retry when RabbitMQ is unavailable", async () => {
  const updates = [];
  const prisma = {
    rentalOutboxEvent: {
      findMany: async () => [{
        id: "event-2",
        aggregateType: "ROOM_OCCUPANCY",
        aggregateId: "room-1",
        eventType: "rental.occupancy.changed",
        payload: {},
        attempts: 0,
        createdAt: new Date(),
      }],
      updateMany: async () => ({ count: 1 }),
      update: async (args) => updates.push(args.data),
    },
  };
  await processOutboxBatch(prisma, { publish: async () => { throw new Error("offline"); } });

  assert.equal(updates[0].status, "PENDING");
  assert.equal(updates[0].attempts, 1);
  assert.match(updates[0].lastError, /offline/);
});
