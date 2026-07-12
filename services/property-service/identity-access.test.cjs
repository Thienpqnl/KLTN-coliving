const assert = require("node:assert/strict");
const test = require("node:test");
const { getUserPropertyCounts } = require("./identity-access.cjs");

test("Property returns host room counts for Identity composition", async () => {
  const prisma = {
    room: {
      groupBy: async () => [{ ownerId: "host-1", _count: { _all: 2 } }],
    },
  };
  assert.deepEqual(await getUserPropertyCounts(prisma, ["host-1"]), { "host-1": 2 });
});
