import { NextRequest } from "next/server";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

const updateContractSchema = z.object({
  endDate: z.string().datetime().optional(),
  monthlyRent: z.number().min(0).optional(),
  notes: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

type ContractAccess = {
  hostId: string | null;
  renterId: string;
  room?: {
    ownerId: string | null;
  } | null;
};

function canAccessContract(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
  contract: ContractAccess
) {
  if (authUser.role === "ADMIN") return true;
  if (authUser.role === "CUSTOMER") return contract.renterId === authUser.userId;
  if (authUser.role === "HOST") return contract.hostId === authUser.userId;
  return false;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    const contract = await contractService.getById(id);
    if (!canAccessContract(authUser, contract)) {
      return successResponse({ error: "Không được phép truy cập" }, 403);
    }

    return successResponse(contract);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    if (authUser.role !== "HOST" && authUser.role !== "ADMIN") {
      return successResponse(
        { error: "Bạn không có quyền cập nhật hợp đồng" },
        403
      );
    }

    const contract = await contractService.getById(id);
    if (!canAccessContract(authUser, contract)) {
      return successResponse({ error: "Không được phép truy cập" }, 403);
    }

    const body = await request.json();
    const data = updateContractSchema.parse(body);

    const updated = await contractService.update(id, {
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      monthlyRent: data.monthlyRent,
      notes: data.notes,
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;

    if (authUser.role !== "HOST" && authUser.role !== "ADMIN") {
      return successResponse(
        { error: "Bạn không có quyền xóa hợp đồng" },
        403
      );
    }

    const contract = await contractService.getById(id);
    if (!canAccessContract(authUser, contract)) {
      return successResponse({ error: "Không được phép truy cập" }, 403);
    }

    await contractService.delete(id);
    return successResponse({ message: "Hợp đồng đã được xóa" });
  } catch (error) {
    return handleApiError(error);
  }
}
