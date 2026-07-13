const assert = require("node:assert/strict");
const test = require("node:test");
const {
  attachBookingUsers,
  attachContractUsers,
  attachOccupancyUsers,
} = require("./user-composition.cjs");

function clients(users) {
  return {
    userMap: async (ids) => new Map(
      users.filter((user) => ids.includes(user.id)).map((user) => [user.id, user]),
    ),
  };
}

test("Rental composes booking and occupancy users through Identity profiles", async () => {
  const identity = clients([{ id: "user-1", fullName: "Nguyen Lan" }]);
  const [booking] = await attachBookingUsers([{ id: "booking-1", userId: "user-1" }], identity);
  const occupancy = await attachOccupancyUsers({ id: "occupancy-1", userId: "user-1" }, identity);

  assert.equal(booking.user.fullName, "Nguyen Lan");
  assert.equal(occupancy.user.fullName, "Nguyen Lan");
});

test("Contract parties remain frozen in snapshot while event actors come from Identity", async () => {
  const contract = await attachContractUsers({
    id: "contract-1",
    contentSnapshot: {
      parties: {
        host: { id: "host-1", fullName: "Host at signing" },
        renter: { id: "renter-1", fullName: "Renter at signing" },
      },
    },
    events: [{ id: "event-1", actorId: "admin-1" }],
  }, clients([{ id: "admin-1", fullName: "Admin" }]));

  assert.equal(contract.host.fullName, "Host at signing");
  assert.equal(contract.renter.fullName, "Renter at signing");
  assert.equal(contract.events[0].actor.fullName, "Admin");
});
