const assert = require("node:assert/strict");
const test = require("node:test");
const { addOccupant } = require("./occupancy.cjs");

test("addOccupant rejects hosts that do not own the room", async () => {
  let created = false;
  const prisma = {
    room: {
      findUnique: async () => ({
        id: "room-1",
        ownerId: "host-1",
        status: "AVAILABLE",
        currentOccupants: 0,
        maxOccupants: 2,
      }),
      update: async () => ({}),
    },
    user: { findUnique: async () => ({ id: "renter-1" }) },
    occupancy: {
      count: async () => 0,
      findUnique: async () => null,
      create: async () => {
        created = true;
        return {};
      },
    },
    booking: { count: async () => 0 },
    $transaction: async (operation) => operation(prisma),
  };

  const result = await addOccupant(
    prisma,
    { userId: "host-2", role: "HOST" },
    { roomId: "room-1", userId: "renter-1" },
  );

  assert.equal(result.status, 403);
  assert.equal(created, false);
});
