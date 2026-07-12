const identityClient = require("../shared/identity-client.cjs");

const roomListInclude = {
  amenities: { include: { amenity: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
};

const roomDetailInclude = {
  amenities: { include: { amenity: true } },
  images: { orderBy: { sortOrder: "asc" } },
};

async function withOwners(rooms, clients = identityClient) {
  const owners = await clients.userMap(rooms.map((room) => room.ownerId));
  return rooms.map((room) => ({ ...room, owner: owners.get(room.ownerId) || null }));
}

function formatAreaText(area) {
  const value = area?.trim();
  if (!value || /m\s*(2|²)\b/i.test(value)) return value;
  return /^\d+([.,]\d+)?$/.test(value) ? `${value} m2` : value;
}

function normalizeRoom(room, rentalCapacity) {
  const imageUrls = room.images?.map((image) => image.url) || [];
  const priceValue = room.priceValue == null ? null : Number(room.priceValue);
  const areaValue = room.areaValue == null ? null : Number(room.areaValue);
  const areaText = formatAreaText(room.areaText);
  const now = Date.now();
  const confirmedReservations = rentalCapacity?.confirmedReservations ??
    (room.bookings?.filter(
      (booking) =>
        booking.status === "CONFIRMED" &&
        new Date(booking.endDate).getTime() > now,
    ).length ?? 0);
  const currentOccupants = Math.max(0, room.currentOccupants ?? 0);
  const maxOccupants = Math.max(1, room.maxOccupants ?? 1);

  return {
    ...room,
    areaText,
    priceValue,
    areaValue,
    price: priceValue ?? 0,
    area: areaText || (areaValue == null ? "" : `${areaValue} m2`),
    image: imageUrls,
    confirmedReservations,
    availableOccupantSlots: Math.max(0, maxOccupants - currentOccupants),
  };
}

function queryArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return value ? [String(value)] : [];
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function listRooms(prisma, query, clients = identityClient) {
  const page = Math.max(1, Math.trunc(optionalNumber(query.page) || 1));
  const limit = Math.min(
    100,
    Math.max(1, Math.trunc(optionalNumber(query.limit) || 10)),
  );
  const minPrice = optionalNumber(query.minPrice);
  const maxPrice = optionalNumber(query.maxPrice);
  const search = String(query.search || "").trim();
  const neighborhoods = queryArray(query.neighborhoods);
  const amenities = queryArray(query.amenities);
  const roomTypes = queryArray(query.roomTypes);

  const where = {
    status: "AVAILABLE",
    ...(minPrice !== undefined && { priceValue: { gte: minPrice } }),
    ...(maxPrice !== undefined && { priceValue: { lte: maxPrice } }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(neighborhoods.length > 0 && {
      OR: neighborhoods.flatMap((neighborhood) => [
        { district: { contains: neighborhood, mode: "insensitive" } },
        { address: { contains: neighborhood, mode: "insensitive" } },
      ]),
    }),
    ...(amenities.length > 0 && {
      amenities: {
        some: {
          amenity: { name: { in: amenities, mode: "insensitive" } },
        },
      },
    }),
    ...(roomTypes.length > 0 && {
      description: { in: roomTypes, mode: "insensitive" },
    }),
  };

  let orderBy = { createdAt: "desc" };
  if (query.sortBy === "price-low") orderBy = { priceValue: "asc" };
  if (query.sortBy === "price-high") orderBy = { priceValue: "desc" };
  if (query.sortBy === "area-large") orderBy = { areaValue: "desc" };

  const [total, rooms] = await prisma.$transaction([
    prisma.room.count({ where }),
    prisma.room.findMany({
      where,
      include: roomListInclude,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const hydrated = await withOwners(rooms, clients);
  return { rooms: hydrated.map(normalizeRoom), total, page, limit };
}

async function findAvailableRooms(prisma, startDate, endDate, availabilityByRoom = {}, clients = identityClient) {
  const rooms = await prisma.room.findMany({
    where: { status: "AVAILABLE" },
    include: roomDetailInclude,
  });

  const available = rooms
    .filter((room) => availabilityByRoom[room.id]?.available === true)
  const hydrated = await withOwners(available, clients);
  return hydrated.map((room) => normalizeRoom(room, availabilityByRoom[room.id]));
}

async function findRoomById(prisma, id, identity = {}, clients = identityClient) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: roomDetailInclude,
  });

  const canViewPrivateRoom =
    room &&
    identity.userId &&
    (identity.role === "ADMIN" || room.ownerId === identity.userId);

  if (!room || (room.status !== "AVAILABLE" && !canViewPrivateRoom)) {
    return null;
  }

  const [hydrated] = await withOwners([room], clients);
  return normalizeRoom(hydrated);
}

async function findRoomsByIds(prisma, ids = [], clients = identityClient) {
  const roomIds = Array.isArray(ids)
    ? [...new Set(ids.map(String).filter(Boolean))]
    : [];
  if (roomIds.length === 0) return [];

  const rooms = await prisma.room.findMany({
    where: { id: { in: roomIds }, status: "AVAILABLE" },
    include: roomDetailInclude,
  });
  const order = new Map(roomIds.map((id, index) => [id, index]));
  const hydrated = await withOwners(rooms, clients);
  return hydrated
    .map(normalizeRoom)
    .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

module.exports = {
  findAvailableRooms,
  findRoomById,
  findRoomsByIds,
  listRooms,
  normalizeRoom,
  roomDetailInclude,
};
