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
  const currentOccupants = Math.max(
    0,
    rentalCapacity?.currentOccupants ?? room.currentOccupants ?? 0,
  );
  const maxOccupants = Math.max(
    1,
    rentalCapacity?.maxOccupants ?? room.maxOccupants ?? 1,
  );
  const usedOccupantSlots = Math.min(
    maxOccupants,
    currentOccupants + confirmedReservations,
  );

  return {
    ...room,
    areaText,
    priceValue,
    areaValue,
    price: priceValue ?? 0,
    area: areaText || (areaValue == null ? "" : `${areaValue} m2`),
    image: imageUrls,
    currentOccupants,
    maxOccupants,
    confirmedReservations,
    usedOccupantSlots,
    availableOccupantSlots: Math.max(0, maxOccupants - usedOccupantSlots),
  };
}

function applyRentalCapacity(room, rentalCapacity) {
  if (!room || !rentalCapacity) return room;
  const currentOccupants = Math.max(
    0,
    Number(rentalCapacity.currentOccupants ?? room.currentOccupants ?? 0),
  );
  const confirmedReservations = Math.max(
    0,
    Number(rentalCapacity.confirmedReservations ?? 0),
  );
  const maxOccupants = Math.max(
    1,
    Number(rentalCapacity.maxOccupants ?? room.maxOccupants ?? 1),
  );
  const usedOccupantSlots = Math.min(
    maxOccupants,
    currentOccupants + confirmedReservations,
  );

  return {
    ...room,
    currentOccupants,
    confirmedReservations,
    maxOccupants,
    usedOccupantSlots,
    availableOccupantSlots: Math.max(0, maxOccupants - usedOccupantSlots),
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

function optionalBoolean(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function distanceInKilometers(originLat, originLng, destinationLat, destinationLng) {
  if (![originLat, originLng, destinationLat, destinationLng].every(Number.isFinite)) {
    return null;
  }

  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(destinationLat - originLat);
  const longitudeDelta = toRadians(destinationLng - originLng);
  const startLatitude = toRadians(originLat);
  const endLatitude = toRadians(destinationLat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) *
    Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
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
  const location = String(query.location || "").trim();
  const neighborhoods = queryArray(query.neighborhoods);
  const amenities = queryArray(query.amenities);
  const roomTypes = queryArray(query.roomTypes);
  const originLat = optionalNumber(query.originLat);
  const originLng = optionalNumber(query.originLng);
  const maxDistanceKm = optionalNumber(query.maxDistanceKm);
  const minAvailableSlots = Math.max(0, Math.trunc(optionalNumber(query.minAvailableSlots) || 0));
  const allowPets = optionalBoolean(query.allowPets);
  const allowSmoking = optionalBoolean(query.allowSmoking);
  const cleanlinessRequired = String(query.cleanlinessRequired || "").trim();
  const noiseTolerance = String(query.noiseTolerance || "").trim();
  const guestPolicy = String(query.guestPolicy || "").trim();
  const preferredSleepHabit = String(query.preferredSleepHabit || "").trim();
  const hasDistanceFilter =
    originLat !== undefined && originLng !== undefined && maxDistanceKm !== undefined;
  const needsPostFilter = hasDistanceFilter || minAvailableSlots > 0;

  const andConditions = [];
  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (location) {
    andConditions.push({
      OR: [
        { address: { contains: location, mode: "insensitive" } },
        { city: { contains: location, mode: "insensitive" } },
        { district: { contains: location, mode: "insensitive" } },
        { ward: { contains: location, mode: "insensitive" } },
      ],
    });
  }
  if (neighborhoods.length > 0) {
    andConditions.push({
      OR: neighborhoods.flatMap((neighborhood) => [
        { district: { contains: neighborhood, mode: "insensitive" } },
        { address: { contains: neighborhood, mode: "insensitive" } },
      ]),
    });
  }

  const where = {
    status: "AVAILABLE",
    ...(minPrice !== undefined && { priceValue: { gte: minPrice } }),
    ...(maxPrice !== undefined && { priceValue: { lte: maxPrice } }),
    ...(allowPets !== undefined && { allowPets }),
    ...(allowSmoking !== undefined && { allowSmoking }),
    ...(cleanlinessRequired && { cleanlinessRequired }),
    ...(noiseTolerance && { noiseTolerance }),
    ...(guestPolicy && { guestPolicy }),
    ...(preferredSleepHabit && { preferredSleepHabit }),
    ...(hasDistanceFilter && {
      latitude: { not: null },
      longitude: { not: null },
    }),
    ...(andConditions.length > 0 && { AND: andConditions }),
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

  if (needsPostFilter) {
    const candidates = await prisma.room.findMany({
      where,
      include: roomListInclude,
      orderBy,
    });
    const filtered = candidates
      .map((room) => {
        const normalized = normalizeRoom(room);
        const distanceKm = hasDistanceFilter
          ? distanceInKilometers(originLat, originLng, room.latitude, room.longitude)
          : null;
        return { ...normalized, distanceKm };
      })
      .filter((room) => {
        if (minAvailableSlots > 0 && room.availableOccupantSlots < minAvailableSlots) {
          return false;
        }
        return !hasDistanceFilter || (room.distanceKm !== null && room.distanceKm <= maxDistanceKm);
      });

    if (query.sortBy === "distance" && hasDistanceFilter) {
      filtered.sort((left, right) => left.distanceKm - right.distanceKm);
    }

    const total = filtered.length;
    const pagedRooms = filtered.slice((page - 1) * limit, page * limit);
    const hydrated = await withOwners(pagedRooms, clients);
    return { rooms: hydrated, total, page, limit };
  }

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
  applyRentalCapacity,
  findAvailableRooms,
  findRoomById,
  findRoomsByIds,
  listRooms,
  normalizeRoom,
  distanceInKilometers,
  roomDetailInclude,
};
