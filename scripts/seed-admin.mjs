import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@coliving.vn";
const ADMIN_PASSWORD = "admin@123456";

async function main() {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: hashedPassword,
      name: "Quản trị viên",
      fullName: "Quản trị viên hệ thống",
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: "Quản trị viên",
      fullName: "Quản trị viên hệ thống",
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
    },
  });

  console.log("Default admin account is ready:");
  console.log(admin);
}

main()
  .catch((error) => {
    console.error("Failed to seed default admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
