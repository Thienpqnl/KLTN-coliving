async function updateOccupancyProjection(prisma, roomId, activeOccupants) {
  if (!Number.isInteger(activeOccupants) || activeOccupants < 0) {
    return { status: 400, payload: { message: "activeOccupants must be a non-negative integer" } };
  }
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { status: true, maxOccupants: true },
  });
  if (!room) return { status: 404, payload: { message: "Room not found" } };
  const managesAvailability = room.status === "AVAILABLE" || room.status === "OCCUPIED";
  const status = managesAvailability
    ? activeOccupants >= Math.max(1, room.maxOccupants || 1)
      ? "OCCUPIED"
      : "AVAILABLE"
    : room.status;
  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { currentOccupants: activeOccupants, status },
    select: { id: true, currentOccupants: true, maxOccupants: true, status: true },
  });
  return { status: 200, payload: updated };
}

module.exports = { updateOccupancyProjection };
