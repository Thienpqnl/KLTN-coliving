const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getAccountDeletionPolicy,
  getUserActivityCounts,
} = require("./identity-access.cjs");

test("account deletion is blocked while rental obligations are active", async () => {
  const prisma = {
    occupancy: { findFirst: async () => ({ id: "occ-1", roomId: "room-1" }) },
    contract: { findFirst: async () => null },
    booking: { findFirst: async () => null },
  };
  const policy = await getAccountDeletionPolicy(prisma, "user-1");
  assert.equal(policy.allowed, false);
  assert.equal(policy.activeOccupancy.id, "occ-1");
});

test("Rental returns booking counts without Identity reading Booking", async () => {
  const prisma = {
    booking: {
      groupBy: async () => [{ userId: "user-1", _count: { _all: 4 } }],
    },
  };
  assert.deepEqual(await getUserActivityCounts(prisma, ["user-1"]), { "user-1": 4 });
});
