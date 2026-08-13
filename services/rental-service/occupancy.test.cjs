const assert = require("node:assert/strict");
const test = require("node:test");
const {
  addOccupant,
  hostOccupancyOverview,
  terminateOccupancy,
} = require("./occupancy.cjs");

test("addOccupant rejects hosts that do not own the room", async () => {
  let created = false;
  const prisma = {
    rentalRoomSnapshot: {
      findUnique: async () => ({
        roomId: "room-1",
        ownerId: "host-1",
        status: "AVAILABLE",
        currentOccupants: 0,
        maxOccupants: 2,
      }),
      update: async () => ({}),
    },
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
    undefined,
    { getUser: async () => ({ id: "renter-1" }) },
  );

  assert.equal(result.status, 403);
  assert.equal(created, false);
});

test("hostOccupancyOverview only returns rooms owned by the host", async () => {
  let ownerFilter;
  const prisma = {
    rentalRoomSnapshot: {
      findMany: async ({ where }) => {
        ownerFilter = where;
        return [{ roomId: "room-1", ownerId: "host-1", maxOccupants: 3, title: "Phòng A" }];
      },
    },
    occupancy: {
      findMany: async () => [
        { id: "occ-1", roomId: "room-1", userId: "renter-1", status: "ACTIVE", joinedAt: new Date() },
      ],
    },
    contract: { findMany: async () => [] },
  };

  const result = await hostOccupancyOverview(
    prisma,
    { userId: "host-1", role: "HOST" },
    { userMap: async () => new Map([["renter-1", { id: "renter-1", fullName: "Nguyễn An" }]]) },
  );

  assert.deepEqual(ownerFilter, { ownerId: "host-1" });
  assert.equal(result.status, 200);
  assert.equal(result.payload.summary.activeMembers, 1);
  assert.equal(result.payload.rooms[0].availableSlots, 2);
  assert.equal(result.payload.rooms[0].members[0].user.fullName, "Nguyễn An");
});

test("terminateOccupancy also terminates the active contract in one transaction", async () => {
  const calls = [];
  const prisma = {
    occupancy: {
      findUnique: async () => ({ id: "occ-1", roomId: "room-1", userId: "renter-1", status: "ACTIVE" }),
      update: async ({ data }) => { calls.push(["occupancy", data]); return { id: "occ-1", roomId: "room-1", userId: "renter-1", ...data }; },
      count: async () => 0,
    },
    rentalRoomSnapshot: {
      findUnique: async () => ({ ownerId: "host-1", maxOccupants: 2, status: "AVAILABLE" }),
      update: async () => ({ currentOccupants: 0 }),
    },
    booking: { count: async () => 0 },
    contract: {
      findFirst: async () => ({ id: "contract-1" }),
      update: async ({ data }) => { calls.push(["contract", data]); return {}; },
    },
    contractEvent: { create: async ({ data }) => { calls.push(["event", data]); return {}; } },
    rentalOutboxEvent: { create: async () => ({}) },
    $transaction: async (operation) => operation(prisma),
  };

  const result = await terminateOccupancy(
    prisma,
    { userId: "host-1", role: "HOST" },
    "occ-1",
    { reason: "Hai bên thống nhất kết thúc thuê" },
    { userMap: async () => new Map([["renter-1", { id: "renter-1" }]]) },
  );

  assert.equal(result.status, 200);
  assert.equal(calls.find(([type]) => type === "contract")[1].status, "TERMINATED");
  assert.equal(calls.find(([type]) => type === "occupancy")[1].status, "INACTIVE");
  assert.equal(calls.find(([type]) => type === "event")[1].type, "CONTRACT_TERMINATED");
});
