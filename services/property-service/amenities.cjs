function validateAmenityCreate(payload) {
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  if (name.length < 2) {
    return { ok: false, message: "Amenity name must be at least 2 characters" };
  }
  return { ok: true, data: { name } };
}

function validateAmenityUpdate(payload) {
  if (!payload || typeof payload !== "object") return { ok: true, data: {} };
  if (payload.name === undefined) return { ok: true, data: {} };

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (name.length < 2) {
    return { ok: false, message: "Amenity name must be at least 2 characters" };
  }
  return { ok: true, data: { name } };
}

async function listAmenities(prisma) {
  const amenities = await prisma.amenity.findMany({
    include: { rooms: true },
    orderBy: { name: "asc" },
  });

  return { status: 200, payload: amenities };
}

async function getAmenityById(prisma, id) {
  const amenity = await prisma.amenity.findUnique({
    where: { id },
    include: {
      rooms: {
        include: { room: true },
      },
    },
  });

  if (!amenity) {
    return { status: 404, payload: { message: "Amenity not found" } };
  }

  return { status: 200, payload: amenity };
}

async function createAmenity(prisma, identity, payload) {
  if (!identity.userId) {
    return { status: 401, payload: { message: "Unauthorized" } };
  }

  const validated = validateAmenityCreate(payload);
  if (!validated.ok) {
    return { status: 400, payload: { message: validated.message } };
  }

  const amenity = await prisma.amenity.create({
    data: { name: validated.data.name },
    include: { rooms: true },
  });

  return { status: 201, payload: amenity };
}

async function updateAmenity(prisma, identity, id, payload) {
  if (!identity.userId) {
    return { status: 401, payload: { message: "Unauthorized" } };
  }

  const existing = await getAmenityById(prisma, id);
  if (existing.status !== 200) return existing;

  const validated = validateAmenityUpdate(payload);
  if (!validated.ok) {
    return { status: 400, payload: { message: validated.message } };
  }

  const amenity = await prisma.amenity.update({
    where: { id },
    data: validated.data,
    include: { rooms: true },
  });

  return { status: 200, payload: amenity };
}

async function deleteAmenity(prisma, identity, id) {
  if (!identity.userId) {
    return { status: 401, payload: { message: "Unauthorized" } };
  }

  const existing = await getAmenityById(prisma, id);
  if (existing.status !== 200) return existing;

  await prisma.roomAmenity.deleteMany({ where: { amenityId: id } });
  await prisma.amenity.delete({ where: { id } });

  return { status: 200, payload: { message: "Amenity deleted successfully" } };
}

module.exports = {
  createAmenity,
  deleteAmenity,
  getAmenityById,
  listAmenities,
  updateAmenity,
};
