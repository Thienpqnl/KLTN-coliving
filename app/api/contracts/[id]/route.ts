import { NextRequest } from "next/server";
import { z } from "zod";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { getRequestMetadata } from "@/lib/request-metadata";

const updateContractSchema = z.object({
  endDate: z.string().datetime().optional(),
  monthlyRent: z.number().min(0).optional(),
  depositAmount: z.number().min(0).optional(),
  paymentDueDay: z.number().int().min(1).max(28).optional(),
  paymentMethod: z.string().max(100).nullable().optional(),
  electricityRate: z.number().min(0).nullable().optional(),
  waterRate: z.number().min(0).nullable().optional(),
  utilitiesNotes: z.string().max(1000).nullable().optional(),
  noticeDays: z.number().int().min(0).max(180).optional(),
  depositReturnDays: z.number().int().min(0).max(60).optional(),
  houseRules: z.string().max(5000).nullable().optional(),
  inventory: z.array(z.object({ name: z.string().min(1), quantity: z.number().int().min(1), condition: z.string().optional() })).optional(),
  notes: z.string().max(5000).nullable().optional(),
});

interface Params { params: Promise<{ id: string }> }

function canAccess(authUser: Awaited<ReturnType<typeof getAuthUser>>, contract: { hostId: string; renterId: string }) {
  return authUser.role === "ADMIN" || contract.hostId === authUser.userId || contract.renterId === authUser.userId;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    const contract = await contractService.getById(id);
    if (!canAccess(authUser, contract)) throw new ApiError(403, "Không được phép truy cập hợp đồng này");
    return successResponse(contract);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    if (authUser.role !== "HOST" && authUser.role !== "ADMIN") throw new ApiError(403, "Bạn không có quyền cập nhật hợp đồng");
    const { id } = await params;
    const data = updateContractSchema.parse(await request.json());
    const updated = await contractService.update(id, {
      ...data,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    }, {
      actorId: authUser.userId,
      role: authUser.role,
      ...getRequestMetadata(request),
    });
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    if (authUser.role !== "HOST" && authUser.role !== "ADMIN") throw new ApiError(403, "Bạn không có quyền xóa hợp đồng");
    const { id } = await params;
    await contractService.delete(id, {
      actorId: authUser.userId,
      role: authUser.role,
      ...getRequestMetadata(request),
    });
    return successResponse({ message: "Đã xóa bản nháp hợp đồng" });
  } catch (error) {
    return handleApiError(error);
  }
}
