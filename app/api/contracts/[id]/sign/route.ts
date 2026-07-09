import { NextRequest } from "next/server";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { getRequestMetadata } from "@/lib/request-metadata";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

const schema = z.object({
  signatureName: z.string().trim().min(2, "Vui lòng nhập đầy đủ họ tên"),
  citizenId: z.string().regex(/^\d{12}$/, "Số căn cước công dân phải gồm đúng 12 chữ số"),
  acceptedTerms: z.literal(true, { error: "Bạn phải đồng ý toàn bộ điều khoản hợp đồng" }),
  informationConfirmed: z.literal(true, { error: "Bạn phải xác nhận thông tin là chính xác" }),
});

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    if (authUser.role !== "HOST" && authUser.role !== "CUSTOMER") {
      throw new ApiError(403, "Tài khoản này không phải bên ký hợp đồng");
    }
    const { id } = await params;
    const data = schema.parse(await request.json());
    const payload = {
      signatureName: data.signatureName,
      citizenId: data.citizenId,
      ...getRequestMetadata(request),
    };
    const proxied = await tryProxyRentalService({
      identity: authUser,
      path: `/v1/contracts/${id}/sign`,
      method: "POST",
      body: payload,
      fallbackMessage: "Không thể ký hợp đồng",
    });
    if (proxied) return proxied;

    return successResponse(await contractService.sign(id, {
      actorId: authUser.userId,
      role: authUser.role,
      ...payload,
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
