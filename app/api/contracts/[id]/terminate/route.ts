import { NextRequest } from "next/server";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { getRequestMetadata } from "@/lib/request-metadata";

const terminateSchema = z.object({
  terminationReason: z
    .string()
    .min(5, "Lý do chấm dứt phải có ít nhất 5 ký tự"),
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
        { error: "Bạn không có quyền chấm dứt hợp đồng" },
        403
      );
    }

    const contract = await contractService.getById(id);
    if (!canManageContract(authUser, contract)) {
      return successResponse({ error: "Không được phép truy cập" }, 403);
    }

    const body = await request.json();
    const data = terminateSchema.parse(body);

    const terminated = await contractService.terminate(id, {
      terminationReason: data.terminationReason,
      actorId: authUser.userId,
      role: authUser.role,
      ...getRequestMetadata(request),
    });

    return successResponse(terminated);
  } catch (error) {
    return handleApiError(error);
  }
}
