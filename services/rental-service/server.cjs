const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requestIdentity, requireInternalService } = require("../shared/internal-auth.cjs");
const {
  bookingStats,
  cancelBooking,
  createBooking,
  getBookingById,
  listHostBookings,
  listRoomBookings,
  listUserBookingCards,
  listUserBookings,
  updateBooking,
} = require("./bookings.cjs");
const {
  addOccupant,
  getOccupantDetails,
  listRoomOccupants,
  occupancyHistory,
  occupancyStats,
  terminateOccupancy,
  userOccupancy,
} = require("./occupancy.cjs");

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4003);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "rental-service" });
});

app.use("/v1", requireInternalService);

function sendResult(response, result) {
  return response.status(result.status).json(result.payload);
}

app.get("/v1/bookings", async (request, response) => {
  try {
    return sendResult(response, await listUserBookings(prisma, requestIdentity(request)));
  } catch (error) {
    console.error("[rental-service] GET /v1/bookings failed", error);
    return response.status(500).json({ message: "Cannot load bookings" });
  }
});

app.get("/v1/user/bookings", async (request, response) => {
  try {
    return sendResult(response, await listUserBookingCards(prisma, requestIdentity(request)));
  } catch (error) {
    console.error("[rental-service] GET /v1/user/bookings failed", error);
    return response.status(500).json({ message: "Cannot load user booking cards" });
  }
});

app.post("/v1/bookings", async (request, response) => {
  try {
    return sendResult(response, await createBooking(prisma, requestIdentity(request), request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/bookings failed", error);
    return response.status(500).json({ message: "Cannot create booking" });
  }
});

app.get("/v1/bookings/stats", async (request, response) => {
  try {
    return sendResult(response, await bookingStats(prisma, request.query));
  } catch (error) {
    console.error("[rental-service] GET /v1/bookings/stats failed", error);
    return response.status(500).json({ message: "Cannot load booking stats" });
  }
});

app.get("/v1/bookings/:id", async (request, response) => {
  try {
    return sendResult(response, await getBookingById(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[rental-service] GET /v1/bookings/:id failed", error);
    return response.status(500).json({ message: "Cannot load booking" });
  }
});

app.put("/v1/bookings/:id", async (request, response) => {
  try {
    return sendResult(response, await updateBooking(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] PUT /v1/bookings/:id failed", error);
    return response.status(500).json({ message: "Cannot update booking" });
  }
});

app.delete("/v1/bookings/:id", async (request, response) => {
  try {
    return sendResult(response, await cancelBooking(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[rental-service] DELETE /v1/bookings/:id failed", error);
    return response.status(500).json({ message: "Cannot cancel booking" });
  }
});

app.get("/v1/host/bookings", async (request, response) => {
  try {
    return sendResult(response, await listHostBookings(prisma, requestIdentity(request)));
  } catch (error) {
    console.error("[rental-service] GET /v1/host/bookings failed", error);
    return response.status(500).json({ message: "Cannot load host bookings" });
  }
});

app.get("/v1/room-bookings", async (request, response) => {
  try {
    return sendResult(response, await listRoomBookings(prisma, request.query));
  } catch (error) {
    console.error("[rental-service] GET /v1/room-bookings failed", error);
    return response.status(500).json({ message: "Cannot load room bookings" });
  }
});

app.get("/v1/host/occupancy", async (request, response) => {
  try {
    return sendResult(response, await occupancyStats(prisma, requestIdentity(request), request.query));
  } catch (error) {
    console.error("[rental-service] GET /v1/host/occupancy failed", error);
    return response.status(500).json({ message: "Cannot load occupancy stats" });
  }
});

app.post("/v1/host/occupancy", async (request, response) => {
  try {
    return sendResult(response, await addOccupant(prisma, requestIdentity(request), request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/host/occupancy failed", error);
    return response.status(500).json({ message: "Cannot add occupant" });
  }
});

app.get("/v1/host/occupancy/rooms/:id", async (request, response) => {
  try {
    return sendResult(response, await listRoomOccupants(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[rental-service] GET /v1/host/occupancy/rooms/:id failed", error);
    return response.status(500).json({ message: "Cannot load occupants" });
  }
});

app.get("/v1/host/occupancy/rooms/:id/history", async (request, response) => {
  try {
    return sendResult(response, await occupancyHistory(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[rental-service] GET /v1/host/occupancy/rooms/:id/history failed", error);
    return response.status(500).json({ message: "Cannot load occupancy history" });
  }
});

app.get("/v1/host/occupancy/occupants/:id", async (request, response) => {
  try {
    return sendResult(response, await getOccupantDetails(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[rental-service] GET /v1/host/occupancy/occupants/:id failed", error);
    return response.status(500).json({ message: "Cannot load occupant" });
  }
});

app.put("/v1/host/occupancy/occupants/:id", async (request, response) => {
  try {
    return sendResult(response, await terminateOccupancy(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] PUT /v1/host/occupancy/occupants/:id failed", error);
    return response.status(500).json({ message: "Cannot terminate occupancy" });
  }
});

app.get("/v1/user/occupancy", async (request, response) => {
  try {
    return sendResult(response, await userOccupancy(prisma, requestIdentity(request)));
  } catch (error) {
    console.error("[rental-service] GET /v1/user/occupancy failed", error);
    return response.status(500).json({ message: "Cannot load user occupancy" });
  }
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[rental-service] listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`[rental-service] received ${signal}, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
