import { NextRequest, NextResponse } from "next/server";
import { roomService } from "@/lib/services/room.service";
import { roomFilterSchema } from "@/lib/validation";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const search = searchParams.get("search");

    const filters = roomFilterSchema.parse({
      status: status || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search: search || undefined,
    });

    const rooms = await roomService.getAll(filters);

    return successResponse(rooms);
  } catch (error) {
    return handleApiError(error);
  }
}
