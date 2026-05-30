import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";

type FavoriteRow = {
  id: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { roomId } = await params;

    const favorite = await prisma.$queryRaw<FavoriteRow[]>`
      SELECT "id"
      FROM "FavoriteRoom"
      WHERE "userId" = ${user.userId} AND "roomId" = ${roomId}
      LIMIT 1
    `;

    return successResponse({ favorited: favorite.length > 0 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { roomId } = await params;

    const room = await prisma.$queryRaw<FavoriteRow[]>`
      SELECT "id"
      FROM "Room"
      WHERE "id" = ${roomId}
      LIMIT 1
    `;

    if (room.length === 0) {
      throw new ApiError(404, "Room not found");
    }

    await prisma.$executeRaw`
      INSERT INTO "FavoriteRoom" ("id", "userId", "roomId")
      VALUES (${randomUUID()}, ${user.userId}, ${roomId})
      ON CONFLICT ("userId", "roomId") DO NOTHING
    `;

    return successResponse({ favorited: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { roomId } = await params;

    await prisma.$executeRaw`
      DELETE FROM "FavoriteRoom"
      WHERE "userId" = ${user.userId} AND "roomId" = ${roomId}
    `;

    return successResponse({ favorited: false });
  } catch (error) {
    return handleApiError(error);
  }
}
