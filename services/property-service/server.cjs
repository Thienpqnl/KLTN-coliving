const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requestIdentity, requireInternalService } = require("./internal-auth.cjs");
const { findAvailableRooms, findRoomById, listRooms } = require("./rooms.cjs");
const {
  createRoom,
  deleteRoom,
  listHostRooms,
  updateRoom,
} = require("./room-commands.cjs");
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

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4002);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "property-service" });
});

app.use("/v1", requireInternalService);

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
    return response.json(await findAvailableRooms(prisma, startDate, endDate));
  } catch (error) {
    console.error("[property-service] GET /v1/rooms/available failed", error);
    return response.status(500).json({
      error: "PROPERTY_QUERY_FAILED",
      message: "Cannot load available rooms",
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

    return response.json(room);
  } catch (error) {
    console.error("[property-service] GET /v1/rooms/:id failed", error);
    return response.status(500).json({
      error: "PROPERTY_QUERY_FAILED",
      message: "Cannot load room details",
    });
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

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[property-service] listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`[property-service] received ${signal}, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
