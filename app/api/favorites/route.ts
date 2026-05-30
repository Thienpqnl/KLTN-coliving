import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

type FavoriteRoomRow = {
  id: string;
  roomId: string;
  createdAt: Date;
  title: string;
  address: string;
  priceText: string | null;
  priceValue: bigint | null;
  imageUrl: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const favorites = await prisma.$queryRaw<FavoriteRoomRow[]>`
      SELECT
        f."id",
        f."roomId",
        f."createdAt",
        r."title",
        r."address",
        r."priceText",
        r."priceValue",
        (
          SELECT ri."url"
          FROM "RoomImage" ri
          WHERE ri."roomId" = r."id"
          ORDER BY ri."sortOrder" ASC
          LIMIT 1
        ) AS "imageUrl"
      FROM "FavoriteRoom" f
      INNER JOIN "Room" r ON r."id" = f."roomId"
      WHERE f."userId" = ${user.userId}
      ORDER BY f."createdAt" DESC
    `;

    return successResponse(favorites);
  } catch (error) {
    return handleApiError(error);
  }
}
