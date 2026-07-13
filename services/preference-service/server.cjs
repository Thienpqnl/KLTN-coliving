require("dotenv").config();

const express = require("express");
const { PrismaClient } = require("./generated/client");
const { requestIdentity, requireInternalService } = require("../shared/internal-auth.cjs");
const { createPublisher } = require("../shared/rabbitmq.cjs");
const { createObservability } = require("../shared/observability.cjs");
const { startOutboxWorker } = require("./outbox.cjs");
const { deletePreference, getPreference, upsertPreference } = require("./preferences.cjs");

const app = express();
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.PREFERENCE_DATABASE_URL || process.env.DATABASE_URL } },
});
const port = Number(process.env.PORT || 4005);
const observability = createObservability("preference-service");

app.disable("x-powered-by");
app.use(observability.middleware);
app.use(express.json({ limit: "1mb" }));
app.get("/metrics", observability.metrics);

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "preference-service" });
});

app.use("/v1", requireInternalService);

function sendResult(response, result) {
  return response.status(result.status).json(result.payload);
}

app.delete("/v1/internal/identity/users/:id/preferences", async (request, response) => {
  try {
    return sendResult(response, await deletePreference(prisma, request.params.id));
  } catch (error) {
    console.error("[preference-service] DELETE user preferences failed", error);
    return response.status(500).json({ error: "Internal server error" });
  }
});

app.get("/v1/preferences", async (request, response) => {
  try {
    return sendResult(response, await getPreference(prisma, requestIdentity(request)));
  } catch (error) {
    console.error("[preference-service] GET /v1/preferences failed", error);
    return response.status(500).json({ error: "Internal server error" });
  }
});

app.post("/v1/preferences", async (request, response) => {
  try {
    return sendResult(response, await upsertPreference(prisma, requestIdentity(request), request.body || {}));
  } catch (error) {
    console.error("[preference-service] POST /v1/preferences failed", error);
    return response.status(500).json({ error: "Internal server error" });
  }
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[preference-service] listening on port ${port}`);
});

const eventPublisher = createPublisher("preference-service");
const stopOutboxWorker = startOutboxWorker(prisma, eventPublisher);

async function shutdown(signal) {
  console.log(`[preference-service] received ${signal}, shutting down`);
  server.close(async () => {
    await stopOutboxWorker();
    await eventPublisher.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
