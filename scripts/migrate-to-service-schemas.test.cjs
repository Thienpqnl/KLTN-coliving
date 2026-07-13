const assert = require("node:assert/strict");
const test = require("node:test");
const {
  administrativeDatabaseUrl,
  databaseUrlForSchema,
  quoteIdentifier,
} = require("./migrate-to-service-schemas.cjs");

test("schema split URLs preserve Supabase connection options", () => {
  const base = "postgresql://user:pass@db.example.com:5432/postgres?sslmode=require&schema=public";
  const serviceUrl = new URL(databaseUrlForSchema(base, "identity"));
  const adminUrl = new URL(administrativeDatabaseUrl(base));

  assert.equal(serviceUrl.searchParams.get("schema"), "identity");
  assert.equal(serviceUrl.searchParams.get("sslmode"), "require");
  assert.equal(adminUrl.searchParams.has("schema"), false);
  assert.equal(adminUrl.searchParams.get("sslmode"), "require");
});

test("schema split quotes PostgreSQL identifiers", () => {
  assert.equal(quoteIdentifier('Room"Archive'), '"Room""Archive"');
});
