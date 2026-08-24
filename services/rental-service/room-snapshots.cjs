const { correlationHeaders } = require("../shared/observability.cjs");

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
  return correlationHeaders(headers);
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

async function deleteRoomSnapshot(prisma, roomId) {
  const result = await prisma.rentalRoomSnapshot.deleteMany({ where: { roomId } });
  return { deleted: result.count };
}

async function findExistingRoomIds(roomIds) {
  const baseUrl = propertyServiceUrl();
  if (!baseUrl) {
    throw new Error("PROPERTY_SERVICE_URL is not configured for Rental Service");
  }
  const payload = await requestJson(`${baseUrl}/v1/internal/rooms/existing-ids`, {
    method: "POST",
    headers: internalHeaders(true),
    body: JSON.stringify({ ids: roomIds }),
  });
  return new Set(Array.isArray(payload?.ids) ? payload.ids.map(String) : []);
}

async function pruneMissingRoomSnapshots(
  prisma,
  ownerId,
  loadExistingRoomIds = findExistingRoomIds,
) {
  const snapshots = await prisma.rentalRoomSnapshot.findMany({
    where: ownerId ? { ownerId } : {},
    select: { roomId: true },
  });
  if (snapshots.length === 0) return { deleted: 0 };

  const existingIds = await loadExistingRoomIds(snapshots.map((room) => room.roomId));
  const missingIds = snapshots
    .map((room) => room.roomId)
    .filter((roomId) => !existingIds.has(roomId));
  if (missingIds.length === 0) return { deleted: 0 };

  const result = await prisma.rentalRoomSnapshot.deleteMany({
    where: { roomId: { in: missingIds } },
  });
  return { deleted: result.count };
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
  deleteRoomSnapshot,
  findExistingRoomIds,
  prepareRoomSnapshot,
  pruneMissingRoomSnapshots,
  refreshRoomSnapshot,
  snapshotData,
  upsertRoomSnapshot,
};
