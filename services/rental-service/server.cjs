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
const {
  checkExpiredContracts,
  confirmDeposit,
  confirmHandover,
  contractStats,
  createContract,
  deleteContract,
  getContract,
  listContracts,
  renewContract,
  signContract,
  terminateContract,
  updateContract,
} = require("./contracts.cjs");
const {
  approveUtilityBill,
  createUtilityBill,
  listUtilityBills,
  submitUtilityBillProof,
} = require("./utility-bills.cjs");

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

app.get("/v1/contracts", async (request, response) => {
  try {
    return sendResult(response, await listContracts(prisma, requestIdentity(request), request.query));
  } catch (error) {
    console.error("[rental-service] GET /v1/contracts failed", error);
    return response.status(500).json({ message: "Cannot load contracts" });
  }
});

app.post("/v1/contracts", async (request, response) => {
  try {
    return sendResult(response, await createContract(prisma, requestIdentity(request), request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/contracts failed", error);
    return response.status(500).json({ message: "Cannot create contract" });
  }
});

app.get("/v1/contracts/:id", async (request, response) => {
  try {
    return sendResult(response, await getContract(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[rental-service] GET /v1/contracts/:id failed", error);
    return response.status(500).json({ message: "Cannot load contract" });
  }
});

app.put("/v1/contracts/:id", async (request, response) => {
  try {
    return sendResult(response, await updateContract(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] PUT /v1/contracts/:id failed", error);
    return response.status(500).json({ message: "Cannot update contract" });
  }
});

app.delete("/v1/contracts/:id", async (request, response) => {
  try {
    return sendResult(response, await deleteContract(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] DELETE /v1/contracts/:id failed", error);
    return response.status(500).json({ message: "Cannot delete contract" });
  }
});

app.post("/v1/contracts/:id/sign", async (request, response) => {
  try {
    return sendResult(response, await signContract(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/contracts/:id/sign failed", error);
    return response.status(500).json({ message: "Cannot sign contract" });
  }
});

app.post("/v1/contracts/:id/deposit", async (request, response) => {
  try {
    return sendResult(response, await confirmDeposit(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/contracts/:id/deposit failed", error);
    return response.status(500).json({ message: "Cannot confirm deposit" });
  }
});

app.post("/v1/contracts/:id/handover", async (request, response) => {
  try {
    return sendResult(response, await confirmHandover(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/contracts/:id/handover failed", error);
    return response.status(500).json({ message: "Cannot confirm handover" });
  }
});

app.post("/v1/contracts/:id/renew", async (request, response) => {
  try {
    return sendResult(response, await renewContract(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/contracts/:id/renew failed", error);
    return response.status(500).json({ message: "Cannot renew contract" });
  }
});

app.post("/v1/contracts/:id/terminate", async (request, response) => {
  try {
    return sendResult(response, await terminateContract(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/contracts/:id/terminate failed", error);
    return response.status(500).json({ message: "Cannot terminate contract" });
  }
});

app.get("/v1/contracts/:id/utility-bills", async (request, response) => {
  try {
    return sendResult(response, await listUtilityBills(prisma, requestIdentity(request), request.params.id));
  } catch (error) {
    console.error("[rental-service] GET /v1/contracts/:id/utility-bills failed", error);
    return response.status(500).json({ message: "Cannot load utility bills" });
  }
});

app.post("/v1/contracts/:id/utility-bills", async (request, response) => {
  try {
    return sendResult(response, await createUtilityBill(prisma, requestIdentity(request), request.params.id, request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/contracts/:id/utility-bills failed", error);
    return response.status(500).json({ message: "Cannot create utility bill" });
  }
});

app.post("/v1/utility-bills/:billId/proof", async (request, response) => {
  try {
    return sendResult(response, await submitUtilityBillProof(prisma, requestIdentity(request), request.params.billId, request.body || {}));
  } catch (error) {
    console.error("[rental-service] POST /v1/utility-bills/:billId/proof failed", error);
    return response.status(500).json({ message: "Cannot submit utility bill proof" });
  }
});

app.put("/v1/utility-bills/:billId/approve", async (request, response) => {
  try {
    return sendResult(response, await approveUtilityBill(prisma, requestIdentity(request), request.params.billId));
  } catch (error) {
    console.error("[rental-service] PUT /v1/utility-bills/:billId/approve failed", error);
    return response.status(500).json({ message: "Cannot approve utility bill" });
  }
});

app.get("/v1/admin/contracts", async (request, response) => {
  try {
    return sendResult(response, await contractStats(prisma, request.query));
  } catch (error) {
    console.error("[rental-service] GET /v1/admin/contracts failed", error);
    return response.status(500).json({ message: "Cannot load contract stats" });
  }
});

app.post("/v1/admin/contracts/check-expiry", async (request, response) => {
  try {
    return sendResult(response, await checkExpiredContracts(prisma, request.get("authorization")));
  } catch (error) {
    console.error("[rental-service] POST /v1/admin/contracts/check-expiry failed", error);
    return response.status(500).json({ message: "Cannot check expired contracts" });
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
