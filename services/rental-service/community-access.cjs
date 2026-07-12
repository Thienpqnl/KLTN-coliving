const eligibleBookingStatuses = ["CONFIRMED", "COMPLETED"];
const eligibleContractStatuses = ["ACTIVE", "EXPIRED", "TERMINATED"];

async function getReviewEligibility(prisma, userId, roomId) {
  const [booking, contract] = await Promise.all([
    prisma.booking.findFirst({
      where: { userId, roomId, status: { in: eligibleBookingStatuses } },
      select: { id: true, status: true },
    }),
    prisma.contract.findFirst({
      where: { renterId: userId, roomId, status: { in: eligibleContractStatuses } },
      select: { id: true, status: true },
    }),
  ]);
  return {
    eligible: Boolean(booking || contract),
    booking: booking || null,
    contract: contract || null,
  };
}

async function getOccupancyAccess(prisma, userId, roomId) {
  const occupancy = await prisma.occupancy.findUnique({
    where: { Occupancy_room_user_unique: { roomId, userId } },
    select: { id: true, status: true, joinedAt: true },
  });
  return { active: occupancy?.status === "ACTIVE", occupancy: occupancy || null };
}

module.exports = { getOccupancyAccess, getReviewEligibility };
