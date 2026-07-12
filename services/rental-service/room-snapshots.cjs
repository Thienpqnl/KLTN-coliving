function failure(status, message, code = "ROOM_SNAPSHOT_ERROR") {
  return { status, payload: { error: code, message } };
}

function propertyServiceUrl() {
  return String(process.env.PROPERTY_SERVICE_URL || "").replace(/\/+$/, "");
}

function internalHeaders(hasBody = false) {
  const headers = { accept: "application/json" };
  if (hasBody) headers["content-type"] = "application/json";
  if (process.env.INTERNAL_SERVICE_TOKEN) {
    headers["x-internal-service-token"] = process.env.INTERNAL_SERVICE_TOKEN;
  }
  return headers;
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.MICROSERVICE_TIMEOUT_MS || 3000),
  );
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function snapshotData(profile) {
  return {
    ownerId: profile.ownerId || null,
    status: String(profile.status || "DRAFT"),
    maxOccupants: Math.max(1, Number(profile.maxOccupants || 1)),
    currentOccupants: Math.max(0, Number(profile.currentOccupants || 0)),
    title: profile.title || null,
    address: profile.address || null,
    areaText: profile.areaText || null,
    areaValue: profile.areaValue == null ? null : profile.areaValue,
    city: profile.city || null,
    district: profile.district || null,
    priceValue: profile.priceValue == null ? null : BigInt(profile.priceValue),
    priceText: profile.priceText || null,
    imageUrl: profile.imageUrl || null,
    images: Array.isArray(profile.images) ? profile.images : [],
    amenities: Array.isArray(profile.amenities) ? profile.amenities : [],
    sourceUpdatedAt: profile.updatedAt ? new Date(profile.updatedAt) : null,
  };
}

async function upsertRoomSnapshot(prisma, roomId, profile) {
  const data = snapshotData(profile);
  return prisma.rentalRoomSnapshot.upsert({
    where: { roomId },
    create: { roomId, ...data },
    update: data,
  });
}

async function refreshRoomSnapshot(prisma, roomId) {
  const baseUrl = propertyServiceUrl();
  if (!baseUrl) {
    throw new Error("PROPERTY_SERVICE_URL is not configured for Rental Service");
  }
  const profile = await requestJson(
    `${baseUrl}/v1/internal/rooms/${encodeURIComponent(roomId)}/rental-profile`,
    { headers: internalHeaders() },
  );
  return upsertRoomSnapshot(prisma, roomId, profile);
}

async function prepareRoomSnapshot(prisma, roomId) {
  if (!roomId) return failure(400, "roomId is required", "ROOM_ID_REQUIRED");
  try {
    await refreshRoomSnapshot(prisma, roomId);
    return null;
  } catch (error) {
    if (error.status === 404) {
      return failure(404, "Khong tim thay phong", "ROOM_NOT_FOUND");
    }
    return failure(
      503,
      `Property Service chua san sang: ${error.message}`,
      "PROPERTY_SERVICE_UNAVAILABLE",
    );
  }
}

module.exports = {
  prepareRoomSnapshot,
  refreshRoomSnapshot,
  snapshotData,
  upsertRoomSnapshot,
};
