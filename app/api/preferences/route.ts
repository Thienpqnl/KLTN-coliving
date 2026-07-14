import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userPreferenceSchema } from "@/lib/validation/preference";
import { handleApiError } from "@/lib/api-error";
import { tryProxyPreferenceServiceRaw } from "@/lib/microservices/preference-bff";

type PreferenceRow = {
  id: string;
  userId: string;
  budgetMinVnd: bigint | number | null;
  budgetMaxVnd: bigint | number | null;
  preferredDistrict: string | null;
  lifestyleArchetype: string | null;
  priorityCleanliness: number | null;
  prioritySocialEnvironment: number | null;
  acceptSmokingRoommates: boolean | null;
  acceptPets: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

function toJsonResponse<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, item) =>
      typeof item === "bigint" ? item.toString() : item
    )
  );
}

function nullableNumber(value: number | "" | null | undefined) {
  return value === "" || value === null || value === undefined ? null : value;
}

async function findPreferenceByUserId(userId: string) {
  const rows = await prisma.$queryRaw<PreferenceRow[]>`
    SELECT
      "id",
      "userId",
      "budgetMinVnd",
      "budgetMaxVnd",
      "preferredDistrict",
      "lifestyleArchetype",
      "priorityCleanliness",
      "prioritySocialEnvironment",
      "acceptSmokingRoommates",
      "acceptPets",
      "createdAt",
      "updatedAt"
    FROM "user_preferences"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

// GET - Lay preferences cua user hien tai
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthUser(req);
    if (!payload?.userId) {
      return NextResponse.json(
        { error: "Không được phép truy cập" },
        { status: 401 }
      );
    }

    const proxied = await tryProxyPreferenceServiceRaw({
      identity: { userId: payload.userId, role: payload.role },
      path: "/v1/preferences",
      fallbackMessage: "Cannot load preferences",
    });
    if (proxied) return proxied;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tìm thấy" },
        { status: 404 }
      );
    }

    const preference = await findPreferenceByUserId(user.id);

    return NextResponse.json(toJsonResponse(preference ?? {}));
  } catch (error) {
    return handleApiError(error);
  }
}

// POST/PUT - Luu hoac cap nhat preferences
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

    const proxied = await tryProxyPreferenceServiceRaw({
      identity: { userId: payload.userId, role: payload.role },
      path: "/v1/preferences",
      method: "POST",
      body: validated,
      fallbackMessage: "Cannot update preferences",
    });
    if (proxied) return proxied;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tìm thấy" },
        { status: 404 }
      );
    }

    const budgetMinVnd = nullableNumber(validated.budgetMinVnd);
    const budgetMaxVnd = nullableNumber(validated.budgetMaxVnd);
    const preferredDistrict = validated.preferredDistrict || null;
    const lifestyleArchetype = validated.lifestyleArchetype || null;
    const priorityCleanliness = validated.priorityCleanliness ?? 3;
    const prioritySocialEnvironment =
      validated.prioritySocialEnvironment ?? 3;
    const acceptSmokingRoommates = validated.acceptSmokingRoommates ?? false;
    const acceptPets = validated.acceptPets ?? false;

    const rows = await prisma.$queryRaw<PreferenceRow[]>`
      INSERT INTO "user_preferences" (
        "id",
        "userId",
        "budgetMinVnd",
        "budgetMaxVnd",
        "preferredDistrict",
        "lifestyleArchetype",
        "priorityCleanliness",
        "prioritySocialEnvironment",
        "acceptSmokingRoommates",
        "acceptPets",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${user.id},
        ${budgetMinVnd},
        ${budgetMaxVnd},
        ${preferredDistrict},
        ${lifestyleArchetype},
        ${priorityCleanliness},
        ${prioritySocialEnvironment},
        ${acceptSmokingRoommates},
        ${acceptPets},
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "budgetMinVnd" = EXCLUDED."budgetMinVnd",
        "budgetMaxVnd" = EXCLUDED."budgetMaxVnd",
        "preferredDistrict" = EXCLUDED."preferredDistrict",
        "lifestyleArchetype" = EXCLUDED."lifestyleArchetype",
        "priorityCleanliness" = EXCLUDED."priorityCleanliness",
        "prioritySocialEnvironment" = EXCLUDED."prioritySocialEnvironment",
        "acceptSmokingRoommates" = EXCLUDED."acceptSmokingRoommates",
        "acceptPets" = EXCLUDED."acceptPets",
        "updatedAt" = NOW()
      RETURNING
        "id",
        "userId",
        "budgetMinVnd",
        "budgetMaxVnd",
        "preferredDistrict",
        "lifestyleArchetype",
        "priorityCleanliness",
        "prioritySocialEnvironment",
        "acceptSmokingRoommates",
        "acceptPets",
        "createdAt",
        "updatedAt"
    `;

    return NextResponse.json(
      toJsonResponse({
        message: "Cập nhật thành công",
        preference: rows[0],
      }),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
