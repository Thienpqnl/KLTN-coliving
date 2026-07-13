import { NextRequest, NextResponse } from "next/server";
import { prisma }  from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import bcrypt from "bcrypt";
import { z } from "zod";
import { tryProxyIdentityServiceRaw } from "@/lib/microservices/identity-bff";

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  fullName: z.string().min(2),
  adminSecret: z.string(), 
});


const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "your-secret-key";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, fullName, adminSecret } =
      createAdminSchema.parse(body);

   
    if (adminSecret !== ADMIN_SECRET_KEY) {
      throw new ApiError(403, "Invalid admin secret key");
    }

    const proxied = await tryProxyIdentityServiceRaw({
      path: "/v1/admin/create-admin",
      method: "POST",
      body: { email, password, name, fullName, adminSecret },
      fallbackMessage: "Cannot create admin user",
    });
    if (proxied) return proxied;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(400, "User already exists");
    }


    const hashedPassword = await bcrypt.hash(password, 10);

 
    const adminUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        fullName,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });


    const { password: _, ...userWithoutPassword } = adminUser;

    return NextResponse.json(
      {
        message: "Admin user created successfully",
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
