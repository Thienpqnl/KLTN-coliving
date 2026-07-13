const assert = require("node:assert/strict");
const test = require("node:test");
const { getRoomPublicStats, getRoomStats } = require("./admin-stats.cjs");

test("getRoomStats is admin-only", async () => {
  const result = await getRoomStats({}, { userId: "host-1", role: "HOST" });
  assert.equal(result.status, 403);
});

test("getRoomStats returns room counters and revenue", async () => {
  let countCalls = 0;
  const prisma = {
    room: {
      count: async () => {
        countCalls += 1;
        return countCalls;
      },
    },
    booking: {
      findMany: async () => [
        { invoice: { totalAmount: 1000000 } },
        { invoice: { totalAmount: 250000 } },
        { invoice: null },
      ],
    },
  };

  const result = await getRoomStats(
    prisma,
    { userId: "admin-1", role: "ADMIN" },
    { totalRevenue: 1250000, completedBookings: 3 },
  );

  assert.equal(result.status, 200);
  assert.equal(result.payload.total, 1);
  assert.equal(result.payload.available, 2);
  assert.equal(result.payload.revenue.total, 1250000);
  assert.equal(result.payload.revenue.completedBookings, 3);
});

test("getRoomPublicStats summarizes bookings reviews and revenue", async () => {
  const prisma = {
    room: {
      findUnique: async () => ({
        id: "room-1",
        title: "Studio",
        priceValue: 1000000,
        status: "AVAILABLE",
        bookings: [
          {
            status: "CONFIRMED",
            startDate: new Date("2026-08-01"),
            endDate: new Date("2026-08-03"),
          },
          {
            status: "PENDING",
            startDate: new Date("2026-08-10"),
            endDate: new Date("2026-08-11"),
          },
        ],
        reviews: [{ rating: 4 }, { rating: 5 }],
      }),
    },
  };

  const result = await getRoomPublicStats(prisma, "room-1", {
    totalBookings: 2,
    confirmedBookings: 1,
    pendingBookings: 1,
    totalRevenue: 3000000,
  }, { averageRating: 4.5, totalReviews: 2 });

  assert.equal(result.status, 200);
  assert.equal(result.payload.totalBookings, 2);
  assert.equal(result.payload.confirmedBookings, 1);
  assert.equal(result.payload.pendingBookings, 1);
  assert.equal(result.payload.averageRating, 4.5);
  assert.equal(result.payload.totalRevenue, 3000000);
});
