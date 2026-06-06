import { NextRequest, NextResponse } from "next/server";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { z } from "zod";

const renewSchema = z.object({
  newEndDate: z.string().datetime(),
  newMonthlyRent: z.number().min(0).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
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

    const body = await request.json();
    const data = renewSchema.parse(body);

    const renewed = await contractService.renew(id, {
      newEndDate: new Date(data.newEndDate),
      newMonthlyRent: data.newMonthlyRent,
    });

    return successResponse(renewed);
  } catch (error) {
    return handleApiError(error);
  }
}
