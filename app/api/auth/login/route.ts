import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        // 1. Validate
        if (!email || !password) {
            return NextResponse.json(
                { message: "Missing fields" },
                { status: 400 }
            );
        }

        // 2. Check user
        const user = await prisma.user.findUnique({
            where: { email },
        });
        
        if (!user) {
            return NextResponse.json(
                { message: "Email không tồn tại" },
                { status: 400 }
            );
        }

        // 3. Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return NextResponse.json(
                { message: "Sai mật khẩu" },
                { status: 400 }
            );
        }

        // 4. Check JWT_SECRET
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing");
        }

        // 5. Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
            },
            token,
        });

    } catch (error: any) {
        console.error(error);

        return NextResponse.json(
            {
                message: "Server error",
                error: error.message,
            },
            { status: 500 }
        );
    }
}