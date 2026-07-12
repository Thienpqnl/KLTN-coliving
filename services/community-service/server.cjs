require("dotenv").config();

const express = require("express");
const { PrismaClient } = require("./generated/client");
const { requestIdentity, requireInternalService } = require("../shared/internal-auth.cjs");
const { createPublisher } = require("../shared/rabbitmq.cjs");
const { startOutboxWorker } = require("./outbox.cjs");
const { addFavorite, getFavorite, listFavorites, removeFavorite } = require("./favorites.cjs");
const { getUserProfileReviews, purgeUserPrivateData } = require("./identity-access.cjs");
const { removeDeviceToken, saveDeviceToken } = require("./device-tokens.cjs");
const {
  createReview,
  createRoomReview,
  deleteReview,
  getReviewById,
  getRoomAverageRatingPayload,
  listAdminReviews,
  listHostReviews,
  listUserReviews,
  roomReviewsPayload,
  updateReview,
  updateReviewStatus,
} = require("./reviews.cjs");
const {
  createActivity,
  createHostResource,
  createResourceBooking,
  createRoomResource,
  deleteResource,
  listActivities,
  listResourceBookings,
  updateResourceBooking,
} = require("./shared-resources.cjs");

const app = express();
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.COMMUNITY_DATABASE_URL || process.env.DATABASE_URL } },
});
const port = Number(process.env.PORT || 4004);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "community-service" });
});

app.use("/v1", requireInternalService);

function send(response, result) {
  return response.status(result.status).json(result.payload);
}

app.get("/v1/internal/rooms/:id/review-stats", async (request, response) => {
  try {
    return response.json(await getRoomAverageRatingPayload(prisma, request.params.id));
  } catch (error) {
    console.error("[community-service] room review stats failed", error);
    return response.status(500).json({ message: "Cannot load room review stats" });
  }
});

app.get("/v1/internal/identity/users/:id/profile-reviews", async (request, response) => {
  try {
    return send(response, await getUserProfileReviews(prisma, request.params.id));
  } catch (error) {
    console.error("[community-service] identity profile reviews failed", error);
    return response.status(500).json({ message: "Cannot load profile reviews" });
  }
});

app.delete("/v1/internal/identity/users/:id/private-data", async (request, response) => {
  try {
    return response.json(await purgeUserPrivateData(prisma, request.params.id));
  } catch (error) {
    console.error("[community-service] private data purge failed", error);
    return response.status(500).json({ message: "Cannot purge community private data" });
  }
});

app.get("/v1/favorites", async (request, response) => {
  try {
    return send(response, await listFavorites(prisma, requestIdentity(request)));
  } catch (error) {
    console.error("[community-service] GET /v1/favorites failed", error);
    return response.status(500).json({ message: "Cannot load favorites" });
  }
});

app.get("/v1/favorites/:roomId", async (request, response) => {
  try {
    return send(response, await getFavorite(prisma, requestIdentity(request), request.params.roomId));
  } catch (error) {
    console.error("[community-service] GET /v1/favorites/:roomId failed", error);
    return response.status(500).json({ message: "Cannot load favorite state" });
  }
});

app.post("/v1/favorites/:roomId", async (request, response) => {
  try {
    return send(response, await addFavorite(prisma, requestIdentity(request), request.params.roomId));
  } catch (error) {
    console.error("[community-service] POST /v1/favorites/:roomId failed", error);
    return response.status(500).json({ message: "Cannot add favorite" });
  }
});

app.delete("/v1/favorites/:roomId", async (request, response) => {
  try {
    return send(response, await removeFavorite(prisma, requestIdentity(request), request.params.roomId));
  } catch (error) {
    console.error("[community-service] DELETE /v1/favorites/:roomId failed", error);
    return response.status(500).json({ message: "Cannot remove favorite" });
  }
});

app.post("/v1/device-tokens", async (request, response) => {
  try {
    return send(response, await saveDeviceToken(prisma, requestIdentity(request), request.body || {}));
  } catch (error) {
    console.error("[community-service] POST /v1/device-tokens failed", error);
    return response.status(500).json({ message: "Cannot save device token" });
  }
});

app.delete("/v1/device-tokens", async (request, response) => {
  try {
    return send(response, await removeDeviceToken(prisma, request.body || {}));
  } catch (error) {
    console.error("[community-service] DELETE /v1/device-tokens failed", error);
    return response.status(500).json({ message: "Cannot remove device token" });
  }
});

app.get("/v1/reviews", async (request, response) => {
  try {
    return send(response, await listUserReviews(prisma, requestIdentity(request)));
  } catch (error) {
    console.error("[community-service] GET /v1/reviews failed", error);
    return response.status(500).json({ message: "Cannot load reviews" });
  }
});

app.post("/v1/reviews", async (request, response) => {
  try {
    return send(response, await createReview(prisma, requestIdentity(request), request.body || {}));
  } catch (error) {
    console.error("[community-service] POST /v1/reviews failed", error);
    return response.status(500).json({ message: "Cannot create review" });
  }
});

app.get("/v1/reviews/:id", async (request, response) => {
  try {
    return send(response, await getReviewById(prisma, request.params.id));
  } catch (error) {
    console.error("[community-service] GET /v1/reviews/:id failed", error);
    return response.status(500).json({ message: "Cannot load review" });
  }
});

app.put("/v1/reviews/:id", async (request, response) => {
  try {
    return send(response, await updateReview(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[community-service] PUT /v1/reviews/:id failed", error);
    return response.status(500).json({ message: "Cannot update review" });
  }
});

app.delete("/v1/reviews/:id", async (request, response) => {
  try {
    return send(response, await deleteReview(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[community-service] DELETE /v1/reviews/:id failed", error);
    return response.status(500).json({ message: "Cannot delete review" });
  }
});

app.get("/v1/host/reviews", async (request, response) => {
  try {
    return send(response, await listHostReviews(prisma, requestIdentity(request)));
  } catch (error) {
    console.error("[community-service] GET /v1/host/reviews failed", error);
    return response.status(500).json({ message: "Cannot load host reviews" });
  }
});

app.get("/v1/admin/reviews", async (request, response) => {
  try {
    return send(response, await listAdminReviews(prisma, requestIdentity(request), request.query));
  } catch (error) {
    console.error("[community-service] GET /v1/admin/reviews failed", error);
    return response.status(500).json({ message: "Cannot load admin reviews" });
  }
});

app.patch("/v1/admin/reviews/:id", async (request, response) => {
  try {
    return send(response, await updateReviewStatus(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[community-service] PATCH /v1/admin/reviews/:id failed", error);
    return response.status(500).json({ message: "Cannot moderate review" });
  }
});

app.get("/v1/rooms/:id/reviews", async (request, response) => {
  try {
    return send(response, await roomReviewsPayload(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[community-service] GET /v1/rooms/:id/reviews failed", error);
    return response.status(500).json({ message: "Cannot load room reviews" });
  }
});

app.post("/v1/rooms/:id/reviews", async (request, response) => {
  try {
    return send(response, await createRoomReview(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[community-service] POST /v1/rooms/:id/reviews failed", error);
    return response.status(500).json({ message: "Cannot create room review" });
  }
});

app.post("/v1/host/resources", async (request, response) => {
  try {
    return send(response, await createHostResource(prisma, requestIdentity(request), request.body || {}));
  } catch (error) {
    console.error("[community-service] POST /v1/host/resources failed", error);
    return response.status(500).json({ message: "Cannot create resource" });
  }
});

app.delete("/v1/host/resources/:id", async (request, response) => {
  try {
    return send(response, await deleteResource(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[community-service] DELETE /v1/host/resources/:id failed", error);
    return response.status(500).json({ message: "Cannot delete resource" });
  }
});

app.post("/v1/rooms/:id/shared-resources", async (request, response) => {
  try {
    return send(response, await createRoomResource(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[community-service] POST /v1/rooms/:id/shared-resources failed", error);
    return response.status(500).json({ message: "Cannot create room resource" });
  }
});

app.get("/v1/rooms/:id/shared-resources/bookings", async (request, response) => {
  try {
    return send(response, await listResourceBookings(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[community-service] GET /v1/rooms/:id/shared-resources/bookings failed", error);
    return response.status(500).json({ message: "Cannot load resource bookings" });
  }
});

app.post("/v1/rooms/:id/shared-resources/bookings", async (request, response) => {
  try {
    return send(response, await createResourceBooking(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[community-service] POST /v1/rooms/:id/shared-resources/bookings failed", error);
    return response.status(500).json({ message: "Cannot create resource booking" });
  }
});

app.put("/v1/shared-resources/bookings/:bookingId", async (request, response) => {
  try {
    return send(response, await updateResourceBooking(prisma, requestIdentity(request), request.params.bookingId, request.body || {}));
  } catch (error) {
    console.error("[community-service] PUT /v1/shared-resources/bookings/:bookingId failed", error);
    return response.status(500).json({ message: "Cannot update resource booking" });
  }
});

app.get("/v1/rooms/:id/shared-resources/activities", async (request, response) => {
  try {
    return send(response, await listActivities(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[community-service] GET /v1/rooms/:id/shared-resources/activities failed", error);
    return response.status(500).json({ message: "Cannot load activities" });
  }
});

app.post("/v1/rooms/:id/shared-resources/activities", async (request, response) => {
  try {
    return send(response, await createActivity(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[community-service] POST /v1/rooms/:id/shared-resources/activities failed", error);
    return response.status(500).json({ message: "Cannot create activity" });
  }
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[community-service] listening on port ${port}`);
});

const eventPublisher = createPublisher("community-service");
const stopOutboxWorker = startOutboxWorker(prisma, eventPublisher);

async function shutdown(signal) {
  console.log(`[community-service] received ${signal}, shutting down`);
  server.close(async () => {
    await stopOutboxWorker();
    await eventPublisher.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
