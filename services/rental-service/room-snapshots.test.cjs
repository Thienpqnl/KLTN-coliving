const assert = require("node:assert/strict");
const test = require("node:test");
const {
  deleteRoomSnapshot,
  pruneMissingRoomSnapshots,
  snapshotData,
} = require("./room-snapshots.cjs");

test("snapshotData keeps only the Property fields Rental needs", () => {
  const result = snapshotData({
    ownerId: "host-1",
    status: "AVAILABLE",
    maxOccupants: 0,
    currentOccupants: -1,
    title: "Studio",
    address: "Thu Duc",
    priceValue: "2500000",
    imageUrl: "room.jpg",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ignored: "not copied",
  });

  assert.equal(result.maxOccupants, 1);
  assert.equal(result.currentOccupants, 0);
  assert.equal(result.priceValue, 2500000n);
  assert.equal("ignored" in result, false);
});

test("deleteRoomSnapshot removes the Rental read model only", async () => {
  let where;
  const result = await deleteRoomSnapshot({
    rentalRoomSnapshot: {
      deleteMany: async (args) => {
        where = args.where;
        return { count: 1 };
      },
    },
  }, "room-1");

  assert.deepEqual(where, { roomId: "room-1" });
  assert.deepEqual(result, { deleted: 1 });
});

test("pruneMissingRoomSnapshots removes snapshots absent from Property Service", async () => {
  let lookupIds;
  let deletedWhere;
  const prisma = {
    rentalRoomSnapshot: {
      findMany: async ({ where }) => {
        assert.deepEqual(where, { ownerId: "host-1" });
        return [{ roomId: "room-1" }, { roomId: "room-deleted" }];
      },
      deleteMany: async ({ where }) => {
        deletedWhere = where;
        return { count: 1 };
      },
    },
  };

  const result = await pruneMissingRoomSnapshots(
    prisma,
    "host-1",
    async (roomIds) => {
      lookupIds = roomIds;
      return new Set(["room-1"]);
    },
  );

  assert.deepEqual(lookupIds, ["room-1", "room-deleted"]);
  assert.deepEqual(deletedWhere, { roomId: { in: ["room-deleted"] } });
  assert.deepEqual(result, { deleted: 1 });
});
