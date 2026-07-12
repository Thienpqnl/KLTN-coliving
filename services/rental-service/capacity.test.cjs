const assert = require("node:assert/strict");
const test = require("node:test");
const { getRoomCapacity, getRoomsAvailability } = require("./capacity.cjs");

function database(snapshot, activeOccupants = 0, confirmedReservations = 0) {
  return {
    rentalRoomSnapshot: { findUnique: async () => snapshot },
    occupancy: { count: async () => activeOccupants },
    booking: { count: async () => confirmedReservations },
  };
}

test("capacity decisions use the Rental-owned room snapshot", async () => {
  const result = await getRoomCapacity(
    database(
      {
        roomId: "room-1",
        ownerId: "host-1",
        status: "AVAILABLE",
        currentOccupants: 0,
        maxOccupants: 3,
      },
      1,
      1,
    ),
    "room-1",
    { startDate: new Date("2026-08-01"), endDate: new Date("2026-09-01") },
  );

  assert.equal(result.availablePlaces, 1);
  assert.equal(result.isFull, false);
  assert.equal(result.room.ownerId, "host-1");
});

test("availability projection reports full rooms without reading Property tables", async () => {
  const result = await getRoomsAvailability(
    database(
      {
        roomId: "room-1",
        ownerId: "host-1",
        status: "AVAILABLE",
        currentOccupants: 1,
        maxOccupants: 2,
      },
      1,
      1,
    ),
    ["room-1"],
    { startDate: new Date("2026-08-01"), endDate: new Date("2026-09-01") },
  );

  assert.equal(result["room-1"].available, false);
  assert.equal(result["room-1"].availablePlaces, 0);
});
