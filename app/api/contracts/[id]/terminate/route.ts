import { NextRequest, NextResponse } from "next/server";
import { contractService } from "@/lib/services/contract.service";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { z } from "zod";

const terminateSchema = z.object({
  terminationReason: z.string().min(5, "Lý do chấm dứt phải có ít nhất 5 ký tự"),
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
        { error: "Bạn không có quyền chấm dứt hợp đồng" },
        403
      );
    }

    const body = await request.json();
    const data = terminateSchema.parse(body);

    const terminated = await contractService.terminate(id, {
      terminationReason: data.terminationReason,
    });

    return successResponse(terminated);
  } catch (error) {
    return handleApiError(error);
  }
}
