import fs from "fs";
import csv from "csv-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_OWNER_ID = "4fc19467-9b3a-415f-aa7c-ecd1d60c75d1";

function convertPrice(priceStr) {
  if (!priceStr) return 0;

  const num = parseFloat(priceStr.replace(",", "."));
  if (priceStr.includes("triệu")) {
    return num * 1_000_000;
  }
  return num;
}

const results = [];

fs.createReadStream("phongtro123.csv")
  .pipe(csv())
  .on("data", (data) => {
    results.push({
      title: data.title,
      description: data.link || "", // dùng link làm description tạm
      area: data.area,
      price: convertPrice(data.price),
      address: data.address,
      image: data.image ? [data.image] : [], // convert thành array
      status: "AVAILABLE",
      ownerId: DEFAULT_OWNER_ID,
    });
  })
  .on("end", async () => {
    try {
      await prisma.room.createMany({
        data: results,
        skipDuplicates: true,
      });

      console.log(`Import ${results.length} phòng thành công`);
    } catch (err) {
      console.error("Lỗi:", err);
    } finally {
      await prisma.$disconnect();
    }
  });