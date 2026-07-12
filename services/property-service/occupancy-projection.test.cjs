const assert = require("node:assert/strict");
const test = require("node:test");
const { updateOccupancyProjection } = require("./occupancy-projection.cjs");

test("occupancy projection marks a full public room occupied", async () => {
  let updateData;
  const prisma = {
    room: {
      findUnique: async () => ({ status: "AVAILABLE", maxOccupants: 2 }),
      update: async (args) => {
        updateData = args.data;
        return { id: "room-1", ...args.data, maxOccupants: 2 };
      },
    },
  };
  const result = await updateOccupancyProjection(prisma, "room-1", 2);

  assert.equal(result.status, 200);
  assert.deepEqual(updateData, { currentOccupants: 2, status: "OCCUPIED" });
});

test("occupancy projection preserves verification workflow statuses", async () => {
  let updateData;
  const prisma = {
    room: {
      findUnique: async () => ({ status: "PENDING", maxOccupants: 2 }),
      update: async (args) => {
        updateData = args.data;
        return { id: "room-1", ...args.data };
      },
    },
  };
  await updateOccupancyProjection(prisma, "room-1", 2);
  assert.equal(updateData.status, "PENDING");
});
