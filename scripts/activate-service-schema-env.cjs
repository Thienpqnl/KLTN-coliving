require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

function schemaUrl(base, schema) {
  const url = new URL(base);
  url.searchParams.set("schema", schema);
  url.searchParams.set("connection_limit", "1");
  url.searchParams.set("pool_timeout", "20");
  return url.toString();
}

function pooledPrismaUrl(base) {
  const url = new URL(base);
  url.searchParams.set("connection_limit", "1");
  url.searchParams.set("pool_timeout", "20");
  return url.toString();
}

function postgresClientUrl(base) {
  const url = new URL(base);
  url.searchParams.delete("schema");
  url.searchParams.delete("connection_limit");
  url.searchParams.delete("pool_timeout");
  return url.toString();
}

function upsertEnv(content, values) {
  const remaining = new Map(Object.entries(values));
  const lines = content.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match || !remaining.has(match[1])) return line;
    const value = remaining.get(match[1]);
    remaining.delete(match[1]);
    return `${match[1]}=${JSON.stringify(value)}`;
  });
  if (remaining.size > 0 && lines.at(-1) !== "") lines.push("");
  for (const [name, value] of remaining) lines.push(`${name}=${JSON.stringify(value)}`);
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

function main() {
  const rootEnvPath = path.resolve(".env");
  const aiEnvPath = path.resolve("ai/.env");
  const rootContent = fs.readFileSync(rootEnvPath, "utf8");
  const parsed = dotenv.parse(rootContent);
  if (!parsed.DATABASE_URL) throw new Error("DATABASE_URL is missing from .env");

  const backupDir = path.resolve(".backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  fs.copyFileSync(rootEnvPath, path.join(backupDir, `.env-before-schema-cutover-${stamp}`));
  if (fs.existsSync(aiEnvPath)) {
    fs.copyFileSync(aiEnvPath, path.join(backupDir, `ai.env-before-schema-cutover-${stamp}`));
  }

  const databaseUrl = pooledPrismaUrl(parsed.DATABASE_URL);
  const aiDatabaseUrl = parsed.AI_DATABASE_URL || postgresClientUrl(databaseUrl);
  fs.writeFileSync(rootEnvPath, upsertEnv(rootContent, {
    DATABASE_URL: databaseUrl,
    SCHEMA_SPLIT_DATABASE_URL: parsed.SCHEMA_SPLIT_DATABASE_URL || databaseUrl,
    IDENTITY_DATABASE_URL: schemaUrl(databaseUrl, "identity"),
    PROPERTY_DATABASE_URL: schemaUrl(databaseUrl, "property"),
    RENTAL_DATABASE_URL: schemaUrl(databaseUrl, "rental"),
    COMMUNITY_DATABASE_URL: schemaUrl(databaseUrl, "community"),
    PREFERENCE_DATABASE_URL: schemaUrl(databaseUrl, "preference"),
    AI_DATABASE_URL: aiDatabaseUrl,
    MICROSERVICE_STRICT: "true",
    USE_SERVICE_SCHEMAS: "true",
    AI_USE_PROJECTIONS: "true",
  }));

  if (fs.existsSync(aiEnvPath)) {
    const aiContent = fs.readFileSync(aiEnvPath, "utf8");
    const aiParsed = dotenv.parse(aiContent);
    fs.writeFileSync(aiEnvPath, upsertEnv(aiContent, {
      AI_DATABASE_URL: aiParsed.AI_DATABASE_URL || aiDatabaseUrl,
      USE_SERVICE_SCHEMAS: "true",
      AI_USE_PROJECTIONS: "true",
    }));
  }
  console.log("Service schema database URLs and AI projection cutover activated.");
}

if (require.main === module) main();

module.exports = { pooledPrismaUrl, postgresClientUrl, schemaUrl, upsertEnv };
