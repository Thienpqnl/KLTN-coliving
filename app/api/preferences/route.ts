import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userPreferenceSchema } from "@/lib/validation/preference";
import { handleApiError } from "@/lib/api-error";

// GET - Lấy preferences của user hiện tại
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthUser(req);
    if (!payload?.userId) {
      return NextResponse.json(
        { error: "Không được phép truy cập" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { preference: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tìm thấy" },
        { status: 404 }
      );
    }

   const responseData = JSON.parse(
  JSON.stringify(user.preference || {}, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  )
);

return NextResponse.json(responseData);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST/PUT - Lưu hoặc cập nhật preferences
export async function POST(req: NextRequest) {
  try {
    const payload = await getAuthUser(req);
    if (!payload?.userId) {
      return NextResponse.json(
        { error: "Không được phép truy cập" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const validated = userPreferenceSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tìm thấy" },
        { status: 404 }
      );
    }

    // Upsert (cập nhật nếu tồn tại, tạo mới nếu không)
const preference = await prisma.userPreference.upsert({      where: { userId: user.id },
      update: {
        budgetMinVnd: validated.budgetMinVnd || null,
        budgetMaxVnd: validated.budgetMaxVnd || null,
        preferredDistrict: validated.preferredDistrict || null,
        lifestyleArchetype: validated.lifestyleArchetype || null,
        priorityCleanliness: validated.priorityCleanliness,
        prioritySocialEnvironment: validated.prioritySocialEnvironment,
        acceptSmokingRoommates: validated.acceptSmokingRoommates,
        acceptPets: validated.acceptPets,
      },
      create: {
        userId: user.id,
        budgetMinVnd: validated.budgetMinVnd || null,
        budgetMaxVnd: validated.budgetMaxVnd || null,
        preferredDistrict: validated.preferredDistrict || null,
        lifestyleArchetype: validated.lifestyleArchetype || null,
        priorityCleanliness: validated.priorityCleanliness || 3,
        prioritySocialEnvironment: validated.prioritySocialEnvironment || 3,
        acceptSmokingRoommates: validated.acceptSmokingRoommates || false,
        acceptPets: validated.acceptPets || false,
      },
    });

    return NextResponse.json(
  JSON.parse(
    JSON.stringify(
      { message: "Cập nhật thành công", preference },
      (_, value) =>
        typeof value === "bigint"
          ? value.toString()
          : value
    )
  ),
  { status: 200 }
);
  } catch (error) {
    return handleApiError(error);
  }
}
