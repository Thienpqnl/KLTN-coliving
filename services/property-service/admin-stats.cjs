function requireAdmin(identity) {
  if (identity.role !== "ADMIN") {
    return { status: 403, payload: { error: "Forbidden: Admin only" } };
  }
  return null;
}

async function getRoomStats(prisma, identity) {
  const denied = requireAdmin(identity);
  if (denied) return denied;

  const [total, available, occupied, pending, hidden] = await Promise.all([
    prisma.room.count(),
    prisma.room.count({ where: { status: "AVAILABLE" } }),
    prisma.room.count({ where: { status: "OCCUPIED" } }),
    prisma.room.count({ where: { status: "PENDING" } }),
    prisma.room.count({ where: { status: "HIDDEN" } }),
  ]);

  const bookings = await prisma.booking.findMany({
    where: { status: "COMPLETED" },
    include: { invoice: true },
  });
  const totalRevenue = bookings.reduce(
    (sum, booking) => sum + (Number(booking.invoice?.totalAmount) || 0),
    0,
  );

  return {
    status: 200,
    payload: {
      total,
      available,
      occupied,
      pending,
      hidden,
      revenue: {
        total: totalRevenue,
        completedBookings: bookings.length,
      },
    },
  };
}

async function getRoomPublicStats(prisma, roomId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      bookings: true,
      reviews: true,
    },
  });

  if (!room) {
    return { status: 404, payload: { error: "Room not found" } };
  }

  const totalBookings = room.bookings.length;
  const confirmedBookings = room.bookings.filter((booking) => booking.status === "CONFIRMED").length;
  const pendingBookings = room.bookings.filter((booking) => booking.status === "PENDING").length;
  const averageRating = room.reviews.length > 0
    ? Math.round((room.reviews.reduce((sum, review) => sum + review.rating, 0) / room.reviews.length) * 10) / 10
    : 0;
  const totalRevenue = room.bookings.reduce((sum, booking) => {
    const nights = Math.ceil(
      (booking.endDate.getTime() - booking.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return sum + Number(room.priceValue || 0) * nights;
  }, 0);

  return {
    status: 200,
    payload: {
      roomId: room.id,
      title: room.title,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      totalReviews: room.reviews.length,
      averageRating,
      totalRevenue,
      status: room.status,
    },
  };
}

module.exports = { getRoomPublicStats, getRoomStats };
