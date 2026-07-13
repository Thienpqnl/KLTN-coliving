import { NextRequest } from "next/server";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { getRequestMetadata } from "@/lib/request-metadata";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

const renewSchema = z.object({
  newEndDate: z.string().datetime(),
  newMonthlyRent: z.number().min(0).optional(),
});

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    if (authUser.role !== "HOST" && authUser.role !== "ADMIN") {
      throw new ApiError(403, "Bạn không có quyền gia hạn hợp đồng");
    }
    const { id } = await params;
    const data = renewSchema.parse(await request.json());
    const payload = { ...data, ...getRequestMetadata(request) };
    const proxied = await tryProxyRentalService({
      identity: authUser,
      path: `/v1/contracts/${id}/renew`,
      method: "POST",
      body: payload,
      fallbackMessage: "Không thể gia hạn hợp đồng",
    });
    if (proxied) return proxied;

    const contract = await contractService.getById(id);
    if (authUser.role !== "ADMIN" && contract.hostId !== authUser.userId) {
      throw new ApiError(403, "Không được phép truy cập");
    }
    return successResponse(await contractService.renew(id, {
      newEndDate: new Date(data.newEndDate),
      newMonthlyRent: data.newMonthlyRent,
      actorId: authUser.userId,
      role: authUser.role,
      ...getRequestMetadata(request),
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
