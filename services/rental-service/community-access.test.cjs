const assert = require("node:assert/strict");
const test = require("node:test");
const { getOccupancyAccess, getReviewEligibility } = require("./community-access.cjs");

test("review eligibility is owned and calculated by Rental", async () => {
  const prisma = {
    booking: { findFirst: async () => ({ id: "booking-1", status: "COMPLETED" }) },
    contract: { findFirst: async () => null },
  };
  const result = await getReviewEligibility(prisma, "user-1", "room-1");
  assert.equal(result.eligible, true);
  assert.equal(result.booking.id, "booking-1");
});

test("occupancy access only accepts active membership", async () => {
  const prisma = {
    occupancy: { findUnique: async () => ({ id: "occ-1", status: "INACTIVE" }) },
  };
  const result = await getOccupancyAccess(prisma, "user-1", "room-1");
  assert.equal(result.active, false);
});
