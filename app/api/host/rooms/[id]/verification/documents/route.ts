import { NextRequest } from "next/server";
import { z } from "zod";
import { VerificationDocumentType } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { roomVerificationService } from "@/lib/services/room-verification.service";

const documentSchema = z.object({
  type: z.nativeEnum(VerificationDocumentType),
  fileUrl: z.string().url("URL tài liệu không hợp lệ"),
  note: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "HOST") throw new ApiError(403, "Chỉ chủ nhà được truy cập");
    const { id } = await params;
    const data = documentSchema.parse(await request.json());
    return successResponse(await roomVerificationService.addDocument(id, user.userId, data), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
