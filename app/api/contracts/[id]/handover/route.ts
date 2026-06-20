import { NextRequest } from "next/server";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { getRequestMetadata } from "@/lib/request-metadata";

const schema = z.object({
  confirmed: z.literal(true, { error: "Bạn phải xác nhận việc bàn giao phòng" }),
  note: z.string().trim().max(2000).optional(),
});

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    if (authUser.role !== "HOST" && authUser.role !== "CUSTOMER") {
      throw new ApiError(403, "Tài khoản này không phải bên bàn giao hợp đồng");
    }
    const { id } = await params;
    const data = schema.parse(await request.json());
    const contract = await contractService.confirmHandover(id, {
      actorId: authUser.userId,
      role: authUser.role,
      note: data.note,
      ...getRequestMetadata(request),
    });
    return successResponse(contract);
  } catch (error) {
    return handleApiError(error);
  }
}
