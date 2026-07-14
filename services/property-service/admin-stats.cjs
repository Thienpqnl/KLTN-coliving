function requireAdmin(identity) {
  if (identity.role !== "ADMIN") {
    return { status: 403, payload: { error: "Forbidden: Admin only" } };
  }
  return null;
}

async function getRoomStats(prisma, identity, rentalStats = {}) {
  const denied = requireAdmin(identity);
  if (denied) return denied;

  const [total, available, occupied, pending, hidden] = await Promise.all([
    prisma.room.count(),
    prisma.room.count({ where: { status: "AVAILABLE" } }),
    prisma.room.count({ where: { status: "OCCUPIED" } }),
    prisma.room.count({ where: { status: "PENDING" } }),
    prisma.room.count({ where: { status: "HIDDEN" } }),
  ]);

  return {
    status: 200,
    payload: {
      total,
      available,
      occupied,
      pending,
      hidden,
      revenue: {
        total: Number(rentalStats.totalRevenue || 0),
        completedBookings: Number(rentalStats.completedBookings || 0),
        projectedMonthly: Number(rentalStats.projectedMonthlyRevenue || 0),
        activeContracts: Number(rentalStats.activeContracts || 0),
      },
    },
  };
}

async function getRoomPublicStats(prisma, roomId, rentalStats = {}, reviewStats = {}) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    return { status: 404, payload: { error: "Room not found" } };
  }

  const totalBookings = Number(rentalStats.totalBookings || 0);
  const confirmedBookings = Number(rentalStats.confirmedBookings || 0);
  const pendingBookings = Number(rentalStats.pendingBookings || 0);
  const averageRating = Number(reviewStats.averageRating || 0);
  const totalReviews = Number(reviewStats.totalReviews || 0);
  const totalRevenue = Number(rentalStats.totalRevenue || 0);

  return {
    status: 200,
    payload: {
      roomId: room.id,
      title: room.title,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      totalReviews,
      averageRating,
      totalRevenue,
      status: room.status,
    },
  };
}

module.exports = { getRoomPublicStats, getRoomStats };
