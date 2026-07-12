const { listUserBookingCards } = require("./bookings.cjs");

async function getUserProfileBookings(prisma, userId) {
  return listUserBookingCards(prisma, { userId, role: "CUSTOMER" });
}

async function getUserActivityCounts(prisma, userIds) {
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (ids.length === 0) return {};
  const rows = await prisma.booking.groupBy({
    by: ["userId"],
    where: { userId: { in: ids } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((row) => [row.userId, row._count._all]));
}

async function getAccountDeletionPolicy(prisma, userId) {
  const [activeOccupancy, activeContract, openBooking] = await Promise.all([
    prisma.occupancy.findFirst({
      where: { userId, status: "ACTIVE" },
      select: { id: true, roomId: true },
    }),
    prisma.contract.findFirst({
      where: {
        renterId: userId,
        status: { in: ["ACTIVE", "PENDING_HANDOVER", "PENDING_DEPOSIT", "PENDING_RENTER_SIGNATURE"] },
      },
      select: { id: true, status: true },
    }),
    prisma.booking.findFirst({
      where: { userId, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { id: true, status: true },
    }),
  ]);
  const allowed = !activeOccupancy && !activeContract && !openBooking;
  return {
    allowed,
    reason: allowed
      ? null
      : "Tai khoan con booking, hop dong hoac cu tru dang hoat dong",
    activeOccupancy,
    activeContract,
    openBooking,
  };
}

module.exports = {
  getAccountDeletionPolicy,
  getUserActivityCounts,
  getUserProfileBookings,
};
