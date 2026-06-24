import { Prisma, PrismaClient, RoomStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CapacityClient = Prisma.TransactionClient | PrismaClient;

export type BookingInterval = {
  startDate: Date;
  endDate: Date;
};

export async function getRoomCapacity(
  db: CapacityClient,
  roomId: string,
  interval?: BookingInterval,
  excludeBookingId?: string
) {
  const confirmedWhere: Prisma.BookingWhereInput = {
    roomId,
    status: "CONFIRMED",
    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    ...(interval
      ? {
          startDate: { lt: interval.endDate },
          endDate: { gt: interval.startDate },
        }
      : { endDate: { gt: new Date() } }),
  };

  const [room, activeOccupants, confirmedReservations] = await Promise.all([
    db.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        currentOccupants: true,
        maxOccupants: true,
      },
    }),
    db.occupancy.count({ where: { roomId, status: "ACTIVE" } }),
    db.booking.count({ where: confirmedWhere }),
  ]);

  if (!room) return null;

  const maxOccupants = Math.max(1, room.maxOccupants ?? 1);
  const currentOccupants = Math.max(activeOccupants, room.currentOccupants ?? 0);
  const usedPlaces = currentOccupants + confirmedReservations;

  return {
    room,
    maxOccupants,
    currentOccupants,
    confirmedReservations,
    availablePlaces: Math.max(0, maxOccupants - usedPlaces),
    isFull: usedPlaces >= maxOccupants,
  };
}

export async function syncRoomOccupancy(
  db: CapacityClient,
  roomId: string
) {
  const [room, activeOccupants] = await Promise.all([
    db.room.findUnique({
      where: { id: roomId },
      select: { status: true, maxOccupants: true },
    }),
    db.occupancy.count({ where: { roomId, status: "ACTIVE" } }),
  ]);

  if (!room) return null;

  const maxOccupants = Math.max(1, room.maxOccupants ?? 1);
  const managesAvailability =
    room.status === RoomStatus.AVAILABLE || room.status === RoomStatus.OCCUPIED;
  const status = managesAvailability
    ? activeOccupants >= maxOccupants
      ? RoomStatus.OCCUPIED
      : RoomStatus.AVAILABLE
    : room.status;

  return db.room.update({
    where: { id: roomId },
    data: { currentOccupants: activeOccupants, status },
  });
}

export async function runSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < maxAttempts;

      if (!shouldRetry) throw error;
    }
  }

  throw new Error("Không thể hoàn tất giao dịch giữ chỗ");
}
