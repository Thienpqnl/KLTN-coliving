import { NextRequest } from "next/server";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { getRequestMetadata } from "@/lib/request-metadata";

const renewSchema = z.object({
  newEndDate: z.string().datetime(),
  newMonthlyRent: z.number().min(0).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

type ContractAccess = {
  hostId: string | null;
  room?: {
    ownerId: string | null;
  } | null;
};

function canManageContract(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
  contract: ContractAccess
) {
  if (authUser.role === "ADMIN") return true;
  if (authUser.role === "HOST") return contract.hostId === authUser.userId;
  return false;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    if (authUser.role !== "HOST" && authUser.role !== "ADMIN") {
      return successResponse(
        { error: "Bạn không có quyền gia hạn hợp đồng" },
        403
      );
    }

    const contract = await contractService.getById(id);
    if (!canManageContract(authUser, contract)) {
      return successResponse({ error: "Không được phép truy cập" }, 403);
    }

    const body = await request.json();
    const data = renewSchema.parse(body);

    const renewed = await contractService.renew(id, {
      newEndDate: new Date(data.newEndDate),
      newMonthlyRent: data.newMonthlyRent,
      actorId: authUser.userId,
      role: authUser.role,
      ...getRequestMetadata(request),
    });

    return successResponse(renewed);
  } catch (error) {
    return handleApiError(error);
  }
}
