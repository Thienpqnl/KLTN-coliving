require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { postgresClientUrl, upsertEnv } = require("./activate-service-schema-env.cjs");

const ROLE = "ai_service_runtime";

function runtimeUrl(adminUrl, password) {
  const url = new URL(postgresClientUrl(adminUrl));
  const adminUser = decodeURIComponent(url.username);
  const projectRef = adminUser.includes(".") ? adminUser.split(".").slice(1).join(".") : "";
  url.username = projectRef ? `${ROLE}.${projectRef}` : ROLE;
  url.password = password;
  return url.toString();
}

async function expectDenied(client, sql, label) {
  try {
    await client.query(sql);
  } catch (error) {
    if (error.code === "42501") return;
    throw error;
  }
  throw new Error(`${label} unexpectedly succeeded`);
}

async function connectWithRetry(connectionString, attempts = 12) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
  }
  throw lastError;
}

async function main() {
  const rootPath = path.resolve(".env");
  const aiPath = path.resolve("ai/.env");
  const rootContent = fs.readFileSync(rootPath, "utf8");
  const parsed = dotenv.parse(rootContent);
  if (!parsed.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  const adminUrl = postgresClientUrl(parsed.DATABASE_URL);
  const password = crypto.randomBytes(32).toString("hex");
  const escapedPassword = password.replaceAll("'", "''");

  const admin = new Client({ connectionString: adminUrl, connectionTimeoutMillis: 10000 });
  await admin.connect();
  try {
    await admin.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROLE}') THEN
          CREATE ROLE ${ROLE} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
        END IF;
      END $$;
      ALTER ROLE ${ROLE} PASSWORD '${escapedPassword}';
      ALTER ROLE ${ROLE} SET search_path = ai;
      ALTER ROLE ${ROLE} SET statement_timeout = '30s';

      GRANT CONNECT ON DATABASE postgres TO ${ROLE};
      GRANT USAGE ON SCHEMA ai, identity, property, rental, preference TO ${ROLE};
      REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA identity FROM ${ROLE};
      REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA property FROM ${ROLE};
      REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA rental FROM ${ROLE};
      REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA preference FROM ${ROLE};
      GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA ai TO ${ROLE};
      ALTER DEFAULT PRIVILEGES IN SCHEMA ai
        GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO ${ROLE};

      GRANT SELECT ("id", "email", "fullName", "role", "updatedAt")
        ON identity."User" TO ${ROLE};
      GRANT SELECT (
        "userId", "budgetMinVnd", "budgetMaxVnd", "preferredDistrict",
        "lifestyleArchetype", "priorityCleanliness", "prioritySocialEnvironment",
        "acceptSmokingRoommates", "acceptPets", "updatedAt"
      ) ON preference.user_preferences TO ${ROLE};
      GRANT SELECT (
        "id", "userId", "roomId", "interactionType", "interactionValue", "createdAt"
      ) ON preference."RoomInteraction" TO ${ROLE};
      GRANT SELECT (
        "id", "title", "address", "district", "districtId", "priceValue", "ownerId",
        "status", "cleanlinessRequired", "noiseTolerance", "guestPolicy",
        "preferredSleepHabit", "maxOccupants", "currentOccupants", "allowSmoking",
        "allowPets", "updatedAt"
      ) ON property."Room" TO ${ROLE};
      GRANT SELECT ("roomId", "userId", "status", "joinedAt", "terminatedAt")
        ON rental.occupancy TO ${ROLE};
    `);
  } finally {
    await admin.end();
  }

  const aiUrl = runtimeUrl(adminUrl, password);
  const runtime = await connectWithRetry(aiUrl);
  try {
    await runtime.query("SELECT count(*) FROM ai.room_profiles");
    await runtime.query('SELECT "id", "email" FROM identity."User" LIMIT 1');
    await runtime.query("UPDATE ai.room_profiles SET title = title WHERE false");
    await expectDenied(runtime, 'SELECT "password" FROM identity."User" LIMIT 1', "Password read");
    await expectDenied(runtime, 'UPDATE property."Room" SET "title" = "title" WHERE false', "Property write");
  } finally {
    await runtime.end();
  }

  const backupDir = path.resolve(".backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  fs.copyFileSync(rootPath, path.join(backupDir, `.env-before-ai-role-${stamp}`));
  fs.writeFileSync(rootPath, upsertEnv(rootContent, { AI_DATABASE_URL: aiUrl }));
  if (fs.existsSync(aiPath)) {
    const aiContent = fs.readFileSync(aiPath, "utf8");
    fs.copyFileSync(aiPath, path.join(backupDir, `ai.env-before-ai-role-${stamp}`));
    fs.writeFileSync(aiPath, upsertEnv(aiContent, { AI_DATABASE_URL: aiUrl }));
  }
  console.log("AI database role configured and least-privilege checks passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
