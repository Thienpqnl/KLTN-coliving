const assert = require("node:assert/strict");
const test = require("node:test");
const { snapshotData } = require("./room-snapshots.cjs");

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
