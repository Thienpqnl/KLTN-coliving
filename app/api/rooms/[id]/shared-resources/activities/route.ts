import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { z } from "zod";

const activityCreateSchema = z.object({
  type: z.enum(["ANNOUNCEMENT", "ISSUE"]),
  title: z.string().min(1, "Tiêu đề không được để trống"),
  content: z.string().optional(),
  eventDate: z.string().optional(),
  imageUrl: z.string().optional(),
});

// GET: Lấy toàn bộ Lịch trực nhật (DUTY) & Bảng tin (ANNOUNCEMENT, ISSUE) của phòng
export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    await getAuthUser(request);
    const activities = await prisma.sharedSpaceActivity.findMany({
      where: { roomId: params.roomId },
      include: {
        assignee: { select: { fullName: true } },
        creator: { select: { fullName: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return successResponse(activities);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Tạo mới hoạt động (Thông báo hoặc Báo sự cố)
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const user = await getAuthUser(request);
    const roomId = params.roomId;
    
    // Kiểm tra user có phải thành viên đang ở phòng này không
    const isOccupant = await prisma.occupancy.findUnique({
      where: {
        Occupancy_room_user_unique: { roomId, userId: user.userId }
      }
    });
    if (!isOccupant || isOccupant.status !== "ACTIVE") {
      throw new ApiError(403, "Bạn không có quyền tạo hoạt động trong không gian chung này");
    }

    const body = await request.json();
    const validatedData = activityCreateSchema.parse(body);
    
    const newActivity = await prisma.sharedSpaceActivity.create({
      data: {
        roomId,
        creatorId: user.userId,
        ...validatedData,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : null,
      },
      include: {
        creator: { select: { fullName: true } }
      }
    });
    
    return successResponse(newActivity, 201);
  } catch (error) {
    return handleApiError(error);
  }
}