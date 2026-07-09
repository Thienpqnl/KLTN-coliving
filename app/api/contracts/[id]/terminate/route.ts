import { NextRequest } from "next/server";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { getRequestMetadata } from "@/lib/request-metadata";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

const terminateSchema = z.object({
  terminationReason: z.string().min(5, "Lý do chấm dứt phải có ít nhất 5 ký tự"),
});

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    if (authUser.role !== "HOST" && authUser.role !== "CUSTOMER" && authUser.role !== "ADMIN") {
      throw new ApiError(403, "Bạn không có quyền rời phòng hoặc chấm dứt hợp đồng");
    }
    const { id } = await params;
    const data = terminateSchema.parse(await request.json());
    const payload = { ...data, ...getRequestMetadata(request) };
    const proxied = await tryProxyRentalService({
      identity: authUser,
      path: `/v1/contracts/${id}/terminate`,
      method: "POST",
      body: payload,
      fallbackMessage: "Không thể chấm dứt hợp đồng",
    });
    if (proxied) return proxied;

    const contract = await contractService.getById(id);
    const canAccess = authUser.role === "ADMIN" || contract.hostId === authUser.userId || contract.renterId === authUser.userId;
    if (!canAccess) throw new ApiError(403, "Không được phép truy cập hợp đồng này");
    return successResponse(await contractService.terminate(id, {
      terminationReason: data.terminationReason,
      actorId: authUser.userId,
      role: authUser.role,
      ...getRequestMetadata(request),
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
