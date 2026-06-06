import { NextRequest, NextResponse } from "next/server";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { z } from "zod";

const createContractSchema = z.object({
  roomId: z.string().min(1, "Phòng là bắt buộc"),
  renterId: z.string().min(1, "Người thuê là bắt buộc"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  monthlyRent: z.number().min(0, "Tiền thuê phải lớn hơn 0"),
  depositAmount: z.number().min(0, "Tiền cọc phải lớn hơn hoặc bằng 0"),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as any;
    const roomId = searchParams.get("roomId");
    const renterId = searchParams.get("renterId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // For renters, only show their own contracts
    const filters = {
      status: status || undefined,
      roomId,
      renterId:
        authUser.role === "CUSTOMER"
          ? authUser.userId
          : renterId || undefined,
      page,
      limit,
    };

    const result = await contractService.getAll(filters);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    // Only HOST and ADMIN can create contracts
    if (authUser.role !== "HOST" && authUser.role !== "ADMIN") {
      return successResponse(
        { error: "Bạn không có quyền tạo hợp đồng" },
        403
      );
    }

    const body = await request.json();
    const data = createContractSchema.parse(body);

    const contract = await contractService.create({
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });

    return successResponse(contract, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
