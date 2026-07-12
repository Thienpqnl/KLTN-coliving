function rentalServiceUrl() {
  return String(process.env.RENTAL_SERVICE_URL || "").replace(/\/+$/, "");
}

function headers(hasBody = false) {
  const result = { accept: "application/json" };
  if (hasBody) result["content-type"] = "application/json";
  if (process.env.INTERNAL_SERVICE_TOKEN) {
    result["x-internal-service-token"] = process.env.INTERNAL_SERVICE_TOKEN;
  }
  return result;
}

async function requestRental(path, options = {}) {
  const baseUrl = rentalServiceUrl();
  if (!baseUrl) throw new Error("RENTAL_SERVICE_URL is not configured for Property Service");
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.MICROSERVICE_TIMEOUT_MS || 3000),
  );
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || `Rental Service returned HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function roomSnapshotPayload(room) {
  return {
    ownerId: room.ownerId || null,
    status: room.status,
    maxOccupants: room.maxOccupants,
    currentOccupants: room.currentOccupants,
    title: room.title,
    address: room.address,
    areaText: room.areaText,
    areaValue: room.areaValue == null ? null : String(room.areaValue),
    city: room.city,
    district: room.district,
    priceValue: room.priceValue == null ? null : String(room.priceValue),
    priceText: room.priceText,
    imageUrl: room.images?.[0]?.url || room.image?.[0] || null,
    images: room.images || (room.image || []).map((url, sortOrder) => ({ url, sortOrder })),
    amenities: room.amenities || [],
    updatedAt: room.updatedAt,
  };
}

async function syncRoomSnapshot(room) {
  return requestRental(
    `/v1/internal/room-snapshots/${encodeURIComponent(room.id)}`,
    {
      method: "PUT",
      headers: headers(true),
      body: JSON.stringify(roomSnapshotPayload(room)),
    },
  );
}

async function getAvailability(roomIds, startDate, endDate) {
  return requestRental("/v1/internal/rooms/availability", {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({
      roomIds,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
  });
}

async function getRoomRentalStats(roomId) {
  return requestRental(`/v1/internal/rooms/${encodeURIComponent(roomId)}/stats`, {
    headers: headers(),
  });
}

async function getAdminRentalStats() {
  return requestRental("/v1/internal/stats/admin", { headers: headers() });
}

module.exports = {
  getAdminRentalStats,
  getAvailability,
  getRoomRentalStats,
  syncRoomSnapshot,
};
