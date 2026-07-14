require("dotenv").config();

const express = require("express");
const { PrismaClient } = require("./generated/client");
const { requestIdentity, requireInternalService } = require("./internal-auth.cjs");
const { createPublisher, startConsumer } = require("../shared/rabbitmq.cjs");
const { createObservability } = require("../shared/observability.cjs");
const { startOutboxWorker } = require("./outbox.cjs");
const { updateOccupancyProjection } = require("./occupancy-projection.cjs");
const { getUserPropertyCounts } = require("./identity-access.cjs");
const {
  getCommunityRoomProfile,
  getCommunityRoomProfiles,
  getHostCommunityRooms,
  searchCommunityRoomIds,
} = require("./community-profiles.cjs");
const {
  createAmenity,
  deleteAmenity,
  getAmenityById,
  listAmenities,
  updateAmenity,
} = require("./amenities.cjs");
const { getRoomPublicStats, getRoomStats } = require("./admin-stats.cjs");
const { getRoomReviewStats } = require("./community-client.cjs");
const {
  applyRentalCapacity,
  findAvailableRooms,
  findRoomById,
  findRoomsByIds,
  listRooms,
} = require("./rooms.cjs");
const {
  createRoom,
  deleteRoom,
  listHostRooms,
  updateRoom,
} = require("./room-commands.cjs");
const {
  listManagersWithAreas,
  replaceManagerAreas,
} = require("./community-manager-area.cjs");
const {
  addDocument,
  deleteDocument: deleteVerificationDocument,
  getDetailForAdmin,
  getDetailForCommunityManager,
  getForHost: getVerificationForHost,
  listForAdmin,
  listForCommunityManager,
  reviewByAdmin,
  reviewByCommunityManager,
  submit,
  updateVerificationCheck,
} = require("./room-verification.cjs");
const {
  getAdminRentalStats,
  getAvailability,
  getRoomRentalStats,
  syncRoomSnapshot,
} = require("./rental-client.cjs");

const app = express();
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.PROPERTY_DATABASE_URL || process.env.DATABASE_URL } },
});
const port = Number(process.env.PORT || 4002);
const observability = createObservability("property-service");

app.disable("x-powered-by");
app.use(observability.middleware);
app.use(express.json({ limit: "1mb" }));
app.get("/metrics", observability.metrics);

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "property-service" });
});

app.use("/v1", requireInternalService);

app.post("/v1/internal/identity/user-property-counts", async (request, response) => {
  try {
    return response.json(await getUserPropertyCounts(prisma, request.body?.userIds || []));
  } catch (error) {
    console.error("[property-service] user property counts failed", error);
    return response.status(500).json({ message: "Cannot load user property counts" });
  }
});

app.post("/v1/internal/community/rooms/batch", async (request, response) => {
  try {
    return response.json(
      await getCommunityRoomProfiles(prisma, request.body?.roomIds || []),
    );
  } catch (error) {
    console.error("[property-service] community room batch failed", error);
    return response.status(500).json({ message: "Cannot load room profiles" });
  }
});

app.get("/v1/internal/community/rooms/search", async (request, response) => {
  try {
    return response.json(await searchCommunityRoomIds(prisma, request.query.q));
  } catch (error) {
    console.error("[property-service] community room search failed", error);
    return response.status(500).json({ message: "Cannot search room profiles" });
  }
});

app.get("/v1/internal/community/rooms/:id", async (request, response) => {
  try {
    const room = await getCommunityRoomProfile(prisma, request.params.id);
    return room
      ? response.json(room)
      : response.status(404).json({ message: "Room not found" });
  } catch (error) {
    console.error("[property-service] community room profile failed", error);
    return response.status(500).json({ message: "Cannot load room profile" });
  }
});

app.get("/v1/internal/community/hosts/:hostId/rooms", async (request, response) => {
  try {
    return response.json(await getHostCommunityRooms(prisma, request.params.hostId));
  } catch (error) {
    console.error("[property-service] host community rooms failed", error);
    return response.status(500).json({ message: "Cannot load host rooms" });
  }
});

app.get("/v1/internal/rooms/:id/rental-profile", async (request, response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        ownerId: true,
        status: true,
        maxOccupants: true,
        currentOccupants: true,
        title: true,
        address: true,
        areaText: true,
        areaValue: true,
        city: true,
        district: true,
        priceValue: true,
        priceText: true,
        updatedAt: true,
        images: {
          orderBy: { sortOrder: "asc" },
          select: { url: true, alt: true, sortOrder: true },
        },
        amenities: {
          include: { amenity: { select: { id: true, name: true } } },
        },
      },
    });
    if (!room) return response.status(404).json({ message: "Room not found" });
    return response.json({
      ...room,
      priceValue: room.priceValue == null ? null : String(room.priceValue),
      areaValue: room.areaValue == null ? null : String(room.areaValue),
      imageUrl: room.images[0]?.url || null,
    });
  } catch (error) {
    console.error("[property-service] rental profile failed", error);
    return response.status(500).json({ message: "Cannot load rental room profile" });
  }
});

app.patch("/v1/internal/rooms/:id/occupancy", async (request, response) => {
  const activeOccupants = Number(request.body?.activeOccupants);
  try {
    const result = await updateOccupancyProjection(
      prisma,
      request.params.id,
      activeOccupants,
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] occupancy projection update failed", error);
    return response.status(500).json({ message: "Cannot update room occupancy projection" });
  }
});

app.get("/v1/amenities", async (_request, response) => {
  try {
    const result = await listAmenities(prisma);
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/amenities failed", error);
    return response.status(500).json({ message: "Cannot load amenities" });
  }
});

app.post("/v1/amenities", async (request, response) => {
  try {
    const result = await createAmenity(
      prisma,
      requestIdentity(request),
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] POST /v1/amenities failed", error);
    return response.status(500).json({ message: "Cannot create amenity" });
  }
});

app.get("/v1/amenities/:id", async (request, response) => {
  try {
    const result = await getAmenityById(prisma, request.params.id);
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/amenities/:id failed", error);
    return response.status(500).json({ message: "Cannot load amenity" });
  }
});

app.put("/v1/amenities/:id", async (request, response) => {
  try {
    const result = await updateAmenity(
      prisma,
      requestIdentity(request),
      request.params.id,
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] PUT /v1/amenities/:id failed", error);
    return response.status(500).json({ message: "Cannot update amenity" });
  }
});

app.delete("/v1/amenities/:id", async (request, response) => {
  try {
    const result = await deleteAmenity(
      prisma,
      requestIdentity(request),
      request.params.id,
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] DELETE /v1/amenities/:id failed", error);
    return response.status(500).json({ message: "Cannot delete amenity" });
  }
});

app.get("/v1/rooms/map", async (_request, response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        status: "AVAILABLE",
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        address: true,
        latitude: true,
        longitude: true,
        priceValue: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    });

    response.json(
      rooms.map((room) => ({
        id: room.id,
        title: room.title,
        address: room.address,
        latitude: room.latitude,
        longitude: room.longitude,
        image: room.images[0]?.url || null,
        priceValue: Number(room.priceValue || 0),
      })),
    );
  } catch (error) {
    console.error("[property-service] GET /v1/rooms/map failed", error);
    response.status(500).json({
      error: "PROPERTY_QUERY_FAILED",
      message: "Không thể tải dữ liệu bản đồ phòng",
    });
  }
});

app.get("/v1/rooms", async (request, response) => {
  try {
    response.json(await listRooms(prisma, request.query));
  } catch (error) {
    console.error("[property-service] GET /v1/rooms failed", error);
    response.status(500).json({
      error: "PROPERTY_QUERY_FAILED",
      message: "Cannot load rooms",
    });
  }
});

app.get("/v1/rooms/available", async (request, response) => {
  const startDate = new Date(String(request.query.startDate || ""));
  const endDate = new Date(String(request.query.endDate || ""));

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  ) {
    return response.status(400).json({
      error: "INVALID_DATE_RANGE",
      message: "A valid startDate and endDate are required",
    });
  }

  try {
    const candidates = await prisma.room.findMany({
      where: { status: "AVAILABLE" },
      select: { id: true },
    });
    const availability = await getAvailability(
      candidates.map((room) => room.id),
      startDate,
      endDate,
    );
    return response.json(
      await findAvailableRooms(prisma, startDate, endDate, availability),
    );
  } catch (error) {
    console.error("[property-service] GET /v1/rooms/available failed", error);
    return response.status(500).json({
      error: "PROPERTY_QUERY_FAILED",
      message: "Cannot load available rooms",
    });
  }
});

app.post("/v1/rooms/batch", async (request, response) => {
  try {
    return response.json(await findRoomsByIds(prisma, request.body?.ids || []));
  } catch (error) {
    console.error("[property-service] POST /v1/rooms/batch failed", error);
    return response.status(500).json({
      error: "PROPERTY_QUERY_FAILED",
      message: "Cannot load rooms",
    });
  }
});

app.get("/v1/rooms/:id", async (request, response) => {
  try {
    const room = await findRoomById(
      prisma,
      request.params.id,
      requestIdentity(request),
    );

    if (!room) {
      return response.status(404).json({
        error: "ROOM_NOT_FOUND",
        message: "Room not found",
      });
    }

    const rentalCapacity = await getRoomRentalStats(request.params.id).catch((error) => {
      console.warn("[property-service] Rental capacity unavailable for room detail", error.message);
      return null;
    });

    return response.json(applyRentalCapacity(room, rentalCapacity));
  } catch (error) {
    console.error("[property-service] GET /v1/rooms/:id failed", error);
    return response.status(500).json({
      error: "PROPERTY_QUERY_FAILED",
      message: "Cannot load room details",
    });
  }
});

app.get("/v1/rooms/:id/stats", async (request, response) => {
  try {
    const [rentalStats, reviewStats] = await Promise.all([
      getRoomRentalStats(request.params.id),
      getRoomReviewStats(request.params.id),
    ]);
    const result = await getRoomPublicStats(prisma, request.params.id, rentalStats, reviewStats);
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/rooms/:id/stats failed", error);
    return response.status(500).json({ message: "Cannot load room stats" });
  }
});

app.get("/v1/host/rooms", async (request, response) => {
  try {
    const result = await listHostRooms(prisma, requestIdentity(request));
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/host/rooms failed", error);
    return response.status(500).json({ message: "Cannot load host rooms" });
  }
});

app.post("/v1/rooms", async (request, response) => {
  try {
    const result = await createRoom(
      prisma,
      requestIdentity(request),
      request.body || {},
    );
    if (result.status < 300 && result.payload?.id) {
      await syncRoomSnapshot(result.payload).catch((error) =>
        console.error("[property-service] room snapshot sync failed", error.message),
      );
    }
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] POST /v1/rooms failed", error);
    return response.status(500).json({ message: "Cannot create room" });
  }
});

app.put("/v1/rooms/:id", async (request, response) => {
  try {
    const result = await updateRoom(
      prisma,
      requestIdentity(request),
      request.params.id,
      request.body || {},
    );
    if (result.status < 300 && result.payload?.id) {
      await syncRoomSnapshot(result.payload).catch((error) =>
        console.error("[property-service] room snapshot sync failed", error.message),
      );
    }
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] PUT /v1/rooms/:id failed", error);
    return response.status(500).json({ message: "Cannot update room" });
  }
});

app.delete("/v1/rooms/:id", async (request, response) => {
  try {
    const result = await deleteRoom(
      prisma,
      requestIdentity(request),
      request.params.id,
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] DELETE /v1/rooms/:id failed", error);
    return response.status(500).json({ message: "Cannot delete room" });
  }
});

app.get("/v1/host/rooms/:id/verification", async (request, response) => {
  try {
    const result = await getVerificationForHost(
      prisma,
      requestIdentity(request),
      request.params.id,
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/host/rooms/:id/verification failed", error);
    return response.status(500).json({ message: "Cannot load room verification" });
  }
});

app.post("/v1/host/rooms/:id/verification/documents", async (request, response) => {
  try {
    const result = await addDocument(
      prisma,
      requestIdentity(request),
      request.params.id,
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] POST /v1/host/rooms/:id/verification/documents failed", error);
    return response.status(500).json({ message: "Cannot add verification document" });
  }
});

app.delete("/v1/host/rooms/:id/verification/documents/:documentId", async (request, response) => {
  try {
    const result = await deleteVerificationDocument(
      prisma,
      requestIdentity(request),
      request.params.id,
      request.params.documentId,
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] DELETE /v1/host/rooms/:id/verification/documents/:documentId failed", error);
    return response.status(500).json({ message: "Cannot delete verification document" });
  }
});

app.post("/v1/host/rooms/:id/submit", async (request, response) => {
  try {
    const result = await submit(
      prisma,
      requestIdentity(request),
      request.params.id,
      {
        ...(request.body || {}),
        ipAddress: request.ip,
        userAgent: request.get("user-agent") || undefined,
      },
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] POST /v1/host/rooms/:id/submit failed", error);
    return response.status(500).json({ message: "Cannot submit room verification" });
  }
});

app.get("/v1/community-manager/rooms", async (request, response) => {
  try {
    const result = await listForCommunityManager(
      prisma,
      requestIdentity(request),
      request.query,
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/community-manager/rooms failed", error);
    return response.status(500).json({ message: "Cannot load community manager rooms" });
  }
});

app.get("/v1/community-manager/rooms/:id", async (request, response) => {
  try {
    const result = await getDetailForCommunityManager(
      prisma,
      requestIdentity(request),
      request.params.id,
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/community-manager/rooms/:id failed", error);
    return response.status(500).json({ message: "Cannot load community manager room detail" });
  }
});

app.patch("/v1/community-manager/rooms/:id", async (request, response) => {
  try {
    const result = await reviewByCommunityManager(
      prisma,
      requestIdentity(request),
      request.params.id,
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] PATCH /v1/community-manager/rooms/:id failed", error);
    return response.status(500).json({ message: "Cannot review room as community manager" });
  }
});

app.patch("/v1/community-manager/rooms/:id/checks/:checkId", async (request, response) => {
  try {
    const result = await updateVerificationCheck(
      prisma,
      requestIdentity(request),
      request.params.id,
      request.params.checkId,
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] PATCH /v1/community-manager/rooms/:id/checks/:checkId failed", error);
    return response.status(500).json({ message: "Cannot update verification check" });
  }
});

app.get("/v1/admin/rooms", async (request, response) => {
  try {
    const result = await listForAdmin(prisma, requestIdentity(request), request.query);
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/admin/rooms failed", error);
    return response.status(500).json({ message: "Cannot load admin rooms" });
  }
});

app.get("/v1/admin/rooms/:id", async (request, response) => {
  try {
    const result = await getDetailForAdmin(
      prisma,
      requestIdentity(request),
      request.params.id,
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/admin/rooms/:id failed", error);
    return response.status(500).json({ message: "Cannot load admin room detail" });
  }
});

app.patch("/v1/admin/rooms/:id", async (request, response) => {
  try {
    const result = await reviewByAdmin(
      prisma,
      requestIdentity(request),
      request.params.id,
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] PATCH /v1/admin/rooms/:id failed", error);
    return response.status(500).json({ message: "Cannot review room as admin" });
  }
});

app.get("/v1/admin/stats/rooms", async (request, response) => {
  try {
    const rentalStats = await getAdminRentalStats();
    const result = await getRoomStats(prisma, requestIdentity(request), rentalStats);
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/admin/stats/rooms failed", error);
    return response.status(500).json({ error: "Internal server error" });
  }
});

app.get("/v1/admin/community-manager-areas", async (request, response) => {
  try {
    const result = await listManagersWithAreas(
      prisma,
      requestIdentity(request),
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] GET /v1/admin/community-manager-areas failed", error);
    return response.status(500).json({ message: "Cannot load community manager areas" });
  }
});

app.put("/v1/admin/community-manager-areas/:managerId", async (request, response) => {
  try {
    const result = await replaceManagerAreas(
      prisma,
      requestIdentity(request),
      request.params.managerId,
      request.body?.areas || [],
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[property-service] PUT /v1/admin/community-manager-areas/:managerId failed", error);
    return response.status(500).json({ message: "Cannot update community manager areas" });
  }
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[property-service] listening on port ${port}`);
});

const eventPublisher = createPublisher("property-service");
const stopOutboxWorker = startOutboxWorker(prisma, eventPublisher);

const stopEventConsumer = startConsumer({
  serviceName: "property-service",
  queueName: process.env.PROPERTY_EVENT_QUEUE || "property-service.events",
  bindings: ["rental.occupancy.changed"],
  handler: async (event) => {
    if (event.eventType !== "rental.occupancy.changed") return;
    const roomId = String(event.payload?.roomId || event.aggregateId || "");
    const activeOccupants = Number(event.payload?.activeOccupants);
    const result = await updateOccupancyProjection(prisma, roomId, activeOccupants);
    if (result.status >= 500) throw new Error(result.payload?.message || "Projection failed");
    if (result.status === 404) {
      console.warn(`[property-service] Ignoring occupancy event for missing room ${roomId}`);
    }
  },
});

async function shutdown(signal) {
  console.log(`[property-service] received ${signal}, shutting down`);
  server.close(async () => {
    await stopOutboxWorker();
    await eventPublisher.close();
    await stopEventConsumer();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
