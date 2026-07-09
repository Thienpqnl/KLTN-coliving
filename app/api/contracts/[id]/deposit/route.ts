import { NextRequest } from "next/server";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { getRequestMetadata } from "@/lib/request-metadata";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

const schema = z.object({
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
  received: z.literal(true, { error: "Bạn phải xác nhận đã nhận đủ tiền cọc" }),
});

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    if (authUser.role !== "HOST" && authUser.role !== "ADMIN") {
      throw new ApiError(403, "Chỉ chủ nhà được xác nhận tiền cọc");
    }
    const { id } = await params;
    const data = schema.parse(await request.json());
    const payload = { reference: data.reference, note: data.note, ...getRequestMetadata(request) };
    const proxied = await tryProxyRentalService({
      identity: authUser,
      path: `/v1/contracts/${id}/deposit`,
      method: "POST",
      body: payload,
      fallbackMessage: "Không thể xác nhận tiền cọc",
    });
    if (proxied) return proxied;

    return successResponse(await contractService.confirmDeposit(id, {
      actorId: authUser.userId,
      role: authUser.role,
      ...payload,
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
