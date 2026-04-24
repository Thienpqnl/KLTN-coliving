#!/usr/bin/env node

/**
 * Import Script - Convert CSV to JavaScript/CJS version
 * This version doesn't need ts-node
 * Run with: node scripts/import-rooms-cjs.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Parse price format like "1.3 triệu/tháng" to number
function parsePrice(priceStr) {
  const match = priceStr.match(/^([\d.]+)\s*(triệu|nghìn)?/);
  if (!match) return 0;
  
  let price = parseFloat(match[1]);
  if (match[2] === 'triệu') {
    price *= 1_000_000;
  } else if (match[2] === 'nghìn') {
    price *= 1_000;
  }
  return price;
}

// Parse area format like "20 m2" to string
function parseArea(areaStr) {
  return areaStr.trim();
}

// Parse CSV line - handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Read and parse CSV file
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const rooms = dataLines.map(line => {
    const fields = parseCSVLine(line);
    return {
      title: fields[0]?.trim() || '',
      price: fields[1]?.trim() || '0',
      area: fields[2]?.trim() || '0 m2',
      address: fields[3]?.trim() || '',
      phone: fields[4]?.trim() || '',
      image: fields[5]?.trim() || '',
      link: fields[6]?.trim() || '',
    };
  });

  return rooms;
}

async function main() {
  try {
    console.log('📁 Reading CSV file...');
    const csvPath = path.join(process.cwd(), 'phongtro123.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ File not found: ${csvPath}`);
      process.exit(1);
    }

    const rooms = readCSV(csvPath);
    
    console.log(`✅ Found ${rooms.length} rooms to import\n`);

    // Get or create default owner (admin user)
    let owner = await prisma.user.findUnique({
      where: { email: 'admin@coliving.com' },
    });

    if (!owner) {
      console.log('👤 Creating default owner user...');
      owner = await prisma.user.create({
        data: {
          email: 'admin@coliving.com',
          password: 'hashed_password_admin',
          name: 'Admin User',
          fullName: 'Admin User',
          role: 'HOST',
        },
      });
      console.log(`✅ Created owner: ${owner.email}\n`);
    } else {
      console.log(`✅ Using existing owner: ${owner.email}\n`);
    }

    console.log(`📝 Importing ${rooms.length} rooms...`);
    
    let imported = 0;
    let skipped = 0;

    for (const room of rooms) {
      // Skip if title is empty
      if (!room.title) {
        skipped++;
        continue;
      }

      try {
        const priceNum = parsePrice(room.price);
        const areaStr = parseArea(room.area);

        const newRoom = await prisma.room.create({
          data: {
            title: room.title,
            description: `Phòng trọ tại ${room.address}. Liên hệ: ${room.phone}. \nNguồn: ${room.link}`,
            area: areaStr,
            price: priceNum,
            address: room.address,
            image: room.image ? [room.image] : [],
            ownerId: owner.id,
          },
        });

        imported++;
        if (imported % 5 === 0) {
          console.log(`✅ [${imported}/${rooms.length}] Processing...`);
        }
      } catch (error) {
        console.error(`❌ Failed to import: ${room.title.substring(0, 40)}`);
        console.error(`   Error: ${error.message}`);
        skipped++;
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Imported: ${imported} rooms`);
    console.log(`   ⏭️  Skipped: ${skipped} rooms`);
    console.log(`   📦 Total: ${imported + skipped} rows\n`);
    
    if (imported > 0) {
      console.log('🎉 Import completed successfully!');
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
