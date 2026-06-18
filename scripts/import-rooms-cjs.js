#!/usr/bin/env node

require('dotenv/config');

const { PrismaClient } = require('@prisma/client');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const shouldReset = process.argv.includes('--reset');
const fileArg = process.argv.find((arg) => arg.startsWith('--file='));

function cleanRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/^\uFEFF/, '').trim(),
      typeof value === 'string' ? value.trim() : value,
    ]),
  );
}

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(cleanRow(row)))
      .on('error', reject)
      .on('end', () => resolve(rows));
  });
}

function nullableText(value) {
  return value && value.trim() ? value.trim() : null;
}

function parseBigInt(value) {
  const normalized = nullableText(value);
  if (!normalized) return null;

  const digits = normalized.replace(/[^\d]/g, '');
  return digits ? BigInt(digits) : null;
}

function parseDecimalString(value) {
  const normalized = nullableText(value);
  if (!normalized) return null;

  const match = normalized.replace(',', '.').match(/\d+(\.\d+)?/);
  return match ? match[0] : null;
}

function parseFloatValue(value) {
  const normalized = nullableText(value);
  if (!normalized) return null;

  const parsed = Number.parseFloat(normalized.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function splitPipe(value) {
  return Array.from(
    new Set(
      (value || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getImageUrls(value) {
  return splitPipe(value).filter((url) => {
    if (!/^https?:\/\//i.test(url)) return false;
    if (url.includes('track.static123.com/session')) return false;
    return true;
  });
}

async function importRoom(row) {
  const title = nullableText(row.title);
  const sourceUrl = nullableText(row.url);

  if (!title) {
    return { status: 'skipped', reason: 'missing title' };
  }

  const amenities = splitPipe(row.amenities);
  const images = getImageUrls(row.images);
  const roomData = {
    title,
    description: nullableText(row.description) || title,
    priceText: nullableText(row.price_text),
    priceValue: parseBigInt(row.price_value),
    areaText: nullableText(row.area_text),
    areaValue: parseDecimalString(row.area_value),
    address: nullableText(row.address) || '',
    district: nullableText(row.district),
    city: nullableText(row.city),
    roomId: nullableText(row.post_id),
    posted_date: nullableText(row.posted_date),
    expired_date: nullableText(row.expired_date),
    latitude: parseFloatValue(row.latitude),
    longitude: parseFloatValue(row.longitude),
    sourceUrl,
  };

  if (sourceUrl) {
    const existingRoom = await prisma.room.findFirst({
      where: { sourceUrl },
      select: { id: true },
    });

    if (existingRoom) {
      await prisma.$transaction([
        prisma.roomImage.deleteMany({ where: { roomId: existingRoom.id } }),
        prisma.roomAmenity.deleteMany({ where: { roomId: existingRoom.id } }),
        prisma.room.update({
          where: { id: existingRoom.id },
          data: {
            ...roomData,
            amenities: {
              create: amenities.map((name) => ({
                amenity: {
                  connectOrCreate: {
                    where: { name },
                    create: { name },
                  },
                },
              })),
            },
            images: {
              create: images.map((url, index) => ({
                url,
                alt: title,
                sortOrder: index,
              })),
            },
          },
        }),
      ]);

      return {
        status: 'updated',
        amenityCount: amenities.length,
        imageCount: images.length,
      };
    }
  }

  await prisma.room.create({
    data: {
      ...roomData,
      amenities: {
        create: amenities.map((name) => ({
          amenity: {
            connectOrCreate: {
              where: { name },
              create: { name },
            },
          },
        })),
      },
      images: {
        create: images.map((url, index) => ({
          url,
          alt: title,
          sortOrder: index,
        })),
      },
    },
  });

  return {
    status: 'imported',
    amenityCount: amenities.length,
    imageCount: images.length,
  };
}

async function main() {
  const csvFile = fileArg ? fileArg.slice('--file='.length) : 'phongtro123_update.csv';
  const csvPath = path.isAbsolute(csvFile)
    ? csvFile
    : path.join(process.cwd(), csvFile);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`File not found: ${csvPath}`);
  }

  await prisma.$connect();

  if (shouldReset) {
    console.log('Resetting room data...');
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.contract.deleteMany(),
      prisma.booking.deleteMany(),
      prisma.review.deleteMany(),
      prisma.favoriteRoom.deleteMany(),
      prisma.occupancy.deleteMany(),
      prisma.roomInteraction.deleteMany(),
      prisma.roomImage.deleteMany(),
      prisma.roomAmenity.deleteMany(),
      prisma.room.deleteMany(),
      prisma.amenity.deleteMany(),
    ]);
    console.log('Room data reset complete');
  }

  console.log(`Reading CSV: ${csvPath}`);
  const rows = await readCsv(csvPath);
  console.log(`Found ${rows.length} rows`);

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let roomImages = 0;
  let roomAmenities = 0;

  for (const [index, row] of rows.entries()) {
    try {
      const result = await importRoom(row);

      if (result.status === 'imported') {
        imported += 1;
        roomImages += result.imageCount;
        roomAmenities += result.amenityCount;
      } else if (result.status === 'updated') {
        updated += 1;
        roomImages += result.imageCount;
        roomAmenities += result.amenityCount;
      } else {
        skipped += 1;
      }

      if ((index + 1) % 25 === 0 || index + 1 === rows.length) {
        console.log(`Processed ${index + 1}/${rows.length}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`Failed row ${index + 1}: ${row.title || '(no title)'}`);
      console.error(error.message);
    }
  }

  const amenityCount = await prisma.amenity.count();

  console.log('');
  console.log('Import summary');
  console.log(`Rooms imported: ${imported}`);
  console.log(`Rooms updated: ${updated}`);
  console.log(`Rooms skipped: ${skipped}`);
  console.log(`Rows failed: ${failed}`);
  console.log(`RoomImage rows created: ${roomImages}`);
  console.log(`RoomAmenity rows created: ${roomAmenities}`);
  console.log(`Total amenities in database: ${amenityCount}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Import failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
