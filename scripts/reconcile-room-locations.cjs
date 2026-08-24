#!/usr/bin/env node

require("dotenv/config");

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("../services/property-service/generated/client");
const {
  buildLocationChanges,
  isSuspiciousDistrict,
  loadPreferenceLocationCatalog,
  normalizeRoomLocation,
} = require("./lib/room-location-normalizer.cjs");

const args = new Set(process.argv.slice(2));
const applyChanges = args.has("--apply");
const includeLowConfidence = args.has("--include-low-confidence");
const roomIdArg = process.argv.find((arg) => arg.startsWith("--room-id="));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const rollbackArg = process.argv.find((arg) => arg.startsWith("--rollback="));
const roomId = roomIdArg?.slice("--room-id=".length) || null;
const limit = limitArg ? Number.parseInt(limitArg.slice("--limit=".length), 10) : null;
const rollbackFile = rollbackArg?.slice("--rollback=".length) || null;
const databaseUrl = process.env.PROPERTY_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Thiếu PROPERTY_DATABASE_URL hoặc DATABASE_URL");
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function reportPath() {
  const directory = path.resolve(".tmp");
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, `room-location-reconciliation-${timestamp()}.json`);
}

function canApply(item) {
  return item.changeCount > 0 && (
    item.confidence === "HIGH" ||
    item.confidence === "MEDIUM" ||
    (includeLowConfidence && item.confidence === "LOW")
  );
}

async function rollback() {
  const inputPath = path.resolve(rollbackFile);
  const report = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const appliedRoomIds = new Set(
    report.appliedRoomIds || report.items.filter(canApply).map((item) => item.roomId),
  );
  const items = report.items.filter((item) => appliedRoomIds.has(item.roomId));

  for (let index = 0; index < items.length; index += 25) {
    const batch = items.slice(index, index + 25);
    await prisma.$transaction(
      batch.map((item) => prisma.room.update({
        where: { id: item.roomId },
        data: item.before,
      })),
    );
  }

  console.log(`Đã hoàn tác ${items.length} phòng từ backup ${inputPath}`);
}

async function main() {
  if (rollbackFile) {
    await rollback();
    return;
  }

  const catalog = loadPreferenceLocationCatalog();
  const rooms = await prisma.room.findMany({
    where: roomId ? { id: roomId } : undefined,
    orderBy: { createdAt: "asc" },
    take: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    select: {
      id: true,
      title: true,
      address: true,
      city: true,
      provinceCode: true,
      ward: true,
      wardCode: true,
      district: true,
      districtId: true,
      latitude: true,
      longitude: true,
      updatedAt: true,
    },
  });

  const items = rooms.map((room) => {
    const normalized = normalizeRoomLocation(room, catalog);
    const changes = buildLocationChanges(room, normalized);
    return {
      roomId: room.id,
      title: room.title,
      address: room.address,
      suspiciousDistrict: isSuspiciousDistrict(room.district),
      confidence: normalized.confidence,
      reason: normalized.reason,
      changeCount: Object.keys(changes).length,
      before: {
        city: room.city,
        provinceCode: room.provinceCode,
        ward: room.ward,
        wardCode: room.wardCode,
        district: room.district,
        districtId: room.districtId,
      },
      proposed: normalized.matched ? normalized.location : null,
      changes,
    };
  });

  const applicable = items.filter(canApply);
  const unresolved = items.filter((item) => item.confidence === "UNRESOLVED");
  const report = {
    generatedAt: new Date().toISOString(),
    mode: applyChanges ? "APPLY" : "DRY_RUN",
    filters: { roomId, limit, includeLowConfidence },
    summary: {
      scanned: items.length,
      suspiciousDistricts: items.filter((item) => item.suspiciousDistrict).length,
      highConfidence: items.filter((item) => item.confidence === "HIGH").length,
      mediumConfidence: items.filter((item) => item.confidence === "MEDIUM").length,
      lowConfidence: items.filter((item) => item.confidence === "LOW").length,
      unresolved: unresolved.length,
      applicable: applicable.length,
      applied: 0,
    },
    items,
  };

  const outputPath = reportPath();
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

  console.table(applicable.slice(0, 25).map((item) => ({
    roomId: item.roomId,
    confidence: item.confidence,
    oldDistrict: item.before.district,
    newDistrict: item.proposed?.district,
    city: item.proposed?.city,
  })));
  console.log("Tổng hợp:", report.summary);
  console.log("Báo cáo/backup:", outputPath);

  if (!applyChanges) {
    console.log("Đây là dry-run, database chưa bị thay đổi.");
    return;
  }

  for (let index = 0; index < applicable.length; index += 25) {
    const batch = applicable.slice(index, index + 25);
    await prisma.$transaction(
      batch.map((item) => prisma.room.update({
        where: { id: item.roomId },
        data: item.changes,
      })),
    );
  }
  report.summary.applied = applicable.length;
  report.appliedRoomIds = applicable.map((item) => item.roomId);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Đã cập nhật ${applicable.length} phòng. Backup trước thay đổi nằm tại ${outputPath}`);
}

main()
  .catch((error) => {
    console.error("Không thể đối soát vị trí phòng:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
