require("dotenv").config();

const { spawnSync } = require("node:child_process");
const { Pool } = require("pg");

const verifyOnly = process.argv.includes("--verify-only");
const sourceSchema = "public";
const services = [
  {
    name: "identity",
    schema: "identity",
    prismaSchema: "services/identity-service/prisma/schema.prisma",
    tables: ["User", "PhoneOtp", "AdminLog", "identity_inbox_events"],
  },
  {
    name: "property",
    schema: "property",
    prismaSchema: "services/property-service/prisma/schema.prisma",
    tables: [
      "Room",
      "Amenity",
      "RoomAmenity",
      "RoomImage",
      "RoomVerification",
      "VerificationCheck",
      "CommunityManagerArea",
      "RoomVerificationDocument",
      "property_outbox_events",
    ],
  },
  {
    name: "rental",
    schema: "rental",
    prismaSchema: "services/rental-service/prisma/schema.prisma",
    tables: [
      "Booking",
      "Invoice",
      "Payment",
      "Contract",
      "ContractEvent",
      "occupancy",
      "rental_room_snapshots",
      "utility_bills",
      "rental_outbox_events",
    ],
  },
  {
    name: "community",
    schema: "community",
    prismaSchema: "services/community-service/prisma/schema.prisma",
    tables: [
      "UserDeviceToken",
      "FavoriteRoom",
      "Review",
      "shared_resources",
      "resource_bookings",
      "shared_space_activities",
      "community_outbox_events",
    ],
  },
  {
    name: "preference",
    schema: "preference",
    prismaSchema: "services/preference-service/prisma/schema.prisma",
    tables: ["user_preferences", "user_lifestyle_profiles", "RoomInteraction"],
  },
];

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function databaseUrlForSchema(value, schema) {
  const url = new URL(value);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function administrativeDatabaseUrl(value) {
  const url = new URL(value);
  url.searchParams.delete("schema");
  return url.toString();
}

function runPrismaMigrateDeploy(service, baseUrl) {
  const prismaCli = require.resolve("prisma/build/index.js");
  const result = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "deploy", "--schema", service.prismaSchema],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrlForSchema(baseUrl, service.schema),
      },
      encoding: "utf8",
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    throw new Error(`Prisma migrate deploy failed for ${service.name}`);
  }
}

async function tableExists(client, schema, table) {
  const result = await client.query("SELECT to_regclass($1) AS name", [`${schema}.${quoteIdentifier(table)}`]);
  return Boolean(result.rows[0]?.name);
}

async function copyTable(client, targetSchema, table) {
  if (!(await tableExists(client, sourceSchema, table))) {
    console.warn(`[schema-split] Skip missing source ${sourceSchema}.${table}`);
    return;
  }
  if (!(await tableExists(client, targetSchema, table))) {
    throw new Error(`Target table ${targetSchema}.${table} was not created`);
  }

  const metadata = await client.query(
    `
      SELECT
        target_attribute.attname AS column_name,
        target_type.typtype AS type_kind,
        target_type.typname AS type_name,
        target_type_namespace.nspname AS type_schema
      FROM pg_attribute target_attribute
      JOIN pg_class target_table ON target_table.oid = target_attribute.attrelid
      JOIN pg_namespace target_namespace ON target_namespace.oid = target_table.relnamespace
      JOIN pg_type target_type ON target_type.oid = target_attribute.atttypid
      JOIN pg_namespace target_type_namespace ON target_type_namespace.oid = target_type.typnamespace
      WHERE target_namespace.nspname = $1
        AND target_table.relname = $2
        AND target_attribute.attnum > 0
        AND NOT target_attribute.attisdropped
        AND EXISTS (
          SELECT 1
          FROM pg_attribute source_attribute
          JOIN pg_class source_table ON source_table.oid = source_attribute.attrelid
          JOIN pg_namespace source_namespace ON source_namespace.oid = source_table.relnamespace
          WHERE source_namespace.nspname = $3
            AND source_table.relname = $2
            AND source_attribute.attname = target_attribute.attname
            AND source_attribute.attnum > 0
            AND NOT source_attribute.attisdropped
        )
      ORDER BY target_attribute.attnum
    `,
    [targetSchema, table, sourceSchema],
  );
  if (metadata.rows.length === 0) throw new Error(`No common columns found for ${table}`);

  const columns = metadata.rows.map((row) => quoteIdentifier(row.column_name));
  const expressions = metadata.rows.map((row) => {
    const source = `source.${quoteIdentifier(row.column_name)}`;
    return row.type_kind === "e"
      ? `${source}::text::${quoteIdentifier(row.type_schema)}.${quoteIdentifier(row.type_name)}`
      : source;
  });
  const result = await client.query(`
    INSERT INTO ${quoteIdentifier(targetSchema)}.${quoteIdentifier(table)} (${columns.join(", ")})
    SELECT ${expressions.join(", ")}
    FROM ${quoteIdentifier(sourceSchema)}.${quoteIdentifier(table)} AS source
    ON CONFLICT DO NOTHING
  `);
  console.log(`[schema-split] ${targetSchema}.${table}: copied ${result.rowCount} row(s)`);
}

async function backfillRentalRoomSnapshots(client) {
  const result = await client.query(`
    INSERT INTO rental.rental_room_snapshots (
      "roomId", "ownerId", "status", "maxOccupants", "currentOccupants",
      "title", "address", "areaText", "areaValue", "city", "district",
      "priceValue", "priceText", "imageUrl", "images", "amenities",
      "sourceUpdatedAt", "createdAt", "updatedAt"
    )
    SELECT
      room."id",
      room."ownerId",
      room."status"::text,
      GREATEST(COALESCE(room."maxOccupants", 1), 1),
      GREATEST(COALESCE(room."currentOccupants", 0), 0),
      room."title",
      room."address",
      room."areaText",
      room."areaValue",
      room."city",
      room."district",
      room."priceValue",
      room."priceText",
      (
        SELECT image."url"
        FROM public."RoomImage" AS image
        WHERE image."roomId" = room."id"
        ORDER BY image."sortOrder", image."createdAt"
        LIMIT 1
      ),
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'url', image."url",
              'alt', image."alt",
              'sortOrder', image."sortOrder"
            )
            ORDER BY image."sortOrder", image."createdAt"
          )
          FROM public."RoomImage" AS image
          WHERE image."roomId" = room."id"
        ),
        '[]'::jsonb
      ),
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', relation."id",
              'amenityId', relation."amenityId",
              'amenity', jsonb_build_object('id', amenity."id", 'name', amenity."name")
            )
          )
          FROM public."RoomAmenity" AS relation
          JOIN public."Amenity" AS amenity ON amenity."id" = relation."amenityId"
          WHERE relation."roomId" = room."id"
        ),
        '[]'::jsonb
      ),
      room."updatedAt",
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM public."Room" AS room
    ON CONFLICT ("roomId") DO UPDATE SET
      "ownerId" = EXCLUDED."ownerId",
      "status" = EXCLUDED."status",
      "maxOccupants" = EXCLUDED."maxOccupants",
      "currentOccupants" = EXCLUDED."currentOccupants",
      "title" = EXCLUDED."title",
      "address" = EXCLUDED."address",
      "areaText" = EXCLUDED."areaText",
      "areaValue" = EXCLUDED."areaValue",
      "city" = EXCLUDED."city",
      "district" = EXCLUDED."district",
      "priceValue" = EXCLUDED."priceValue",
      "priceText" = EXCLUDED."priceText",
      "imageUrl" = EXCLUDED."imageUrl",
      "images" = EXCLUDED."images",
      "amenities" = EXCLUDED."amenities",
      "sourceUpdatedAt" = EXCLUDED."sourceUpdatedAt",
      "updatedAt" = CURRENT_TIMESTAMP
  `);
  console.log(`[schema-split] rental.rental_room_snapshots: synchronized ${result.rowCount} room(s)`);
}

async function counts(client, schema, table) {
  if (!(await tableExists(client, schema, table))) return null;
  const result = await client.query(
    `SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`,
  );
  return Number(result.rows[0].count);
}

async function verify(client) {
  let valid = true;
  for (const service of services) {
    for (const table of service.tables) {
      const sourceCount = await counts(client, sourceSchema, table);
      if (sourceCount == null) continue;
      const targetCount = await counts(client, service.schema, table);
      const status = targetCount != null && targetCount >= sourceCount ? "OK" : "MISMATCH";
      if (status !== "OK") valid = false;
      console.log(
        `[schema-split] ${status} ${table}: public=${sourceCount}, ${service.schema}=${targetCount ?? "missing"}`,
      );
    }
  }
  const publicRooms = await counts(client, sourceSchema, "Room");
  const rentalSnapshots = await counts(client, "rental", "rental_room_snapshots");
  const snapshotStatus = rentalSnapshots != null && rentalSnapshots >= publicRooms ? "OK" : "MISMATCH";
  if (snapshotStatus !== "OK") valid = false;
  console.log(
    `[schema-split] ${snapshotStatus} rental room projection: public.Room=${publicRooms}, rental.rental_room_snapshots=${rentalSnapshots ?? "missing"}`,
  );
  if (!valid) throw new Error("Schema split verification failed");
}

async function main() {
  const baseUrl = process.env.SCHEMA_SPLIT_DATABASE_URL || process.env.DATABASE_URL;
  if (!baseUrl) throw new Error("SCHEMA_SPLIT_DATABASE_URL or DATABASE_URL is required");
  if (!verifyOnly && process.env.CONFIRM_SCHEMA_SPLIT !== "true") {
    throw new Error("Set CONFIRM_SCHEMA_SPLIT=true before creating and copying service schemas");
  }

  const pool = new Pool({
    connectionString: administrativeDatabaseUrl(baseUrl),
    application_name: "coliving-schema-split",
    max: 1,
  });
  const client = await pool.connect();
  try {
    if (!verifyOnly) {
      for (const service of services) {
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(service.schema)}`);
        runPrismaMigrateDeploy(service, baseUrl);
        await client.query("BEGIN");
        try {
          for (const table of service.tables) await copyTable(client, service.schema, table);
          if (service.name === "rental") await backfillRentalRoomSnapshots(client);
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
    }
    await verify(client);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[schema-split] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  administrativeDatabaseUrl,
  databaseUrlForSchema,
  quoteIdentifier,
};
