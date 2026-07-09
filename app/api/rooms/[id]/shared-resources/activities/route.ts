import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { tryProxyCommunityService } from "@/lib/microservices/community-bff";

const activityCreateSchema = z.object({
  type: z.enum(["ANNOUNCEMENT", "ISSUE"]),
  title: z.string().min(1, "Tiêu đề không được để trống"),
  content: z.string().optional(),
  eventDate: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    const { id: roomId } = await params;
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: `/v1/rooms/${roomId}/shared-resources/activities`,
      fallbackMessage: "Không thể tải hoạt động không gian chung",
    });
    if (proxied) return proxied;

    const activities = await prisma.sharedSpaceActivity.findMany({
      where: { roomId },
      include: {
        assignee: { select: { fullName: true } },
        creator: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(activities);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    const { id: roomId } = await params;
    const validatedData = activityCreateSchema.parse(await request.json());
    const proxied = await tryProxyCommunityService({
      identity: user,
      path: `/v1/rooms/${roomId}/shared-resources/activities`,
      method: "POST",
      body: validatedData,
      successStatus: 201,
      fallbackMessage: "Không thể tạo hoạt động không gian chung",
    });
    if (proxied) return proxied;

    const isOccupant = await prisma.occupancy.findUnique({
      where: { Occupancy_room_user_unique: { roomId, userId: user.userId } },
    });
    if (!isOccupant || isOccupant.status !== "ACTIVE") {
      throw new ApiError(403, "Bạn không có quyền tạo hoạt động trong không gian chung này");
    }
    const newActivity = await prisma.sharedSpaceActivity.create({
      data: {
        roomId,
        creatorId: user.userId,
        ...validatedData,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : null,
      },
      include: { creator: { select: { fullName: true } } },
    });
    return successResponse(newActivity, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
