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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const neighborhoods = searchParams.getAll("neighborhoods");
    const amenities = searchParams.getAll("amenities");
    const roomTypes = searchParams.getAll("roomTypes");
    const sortBy = searchParams.get("sortBy");

    const filters = roomFilterSchema.parse({
      status: status || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search: search || undefined,
    });

    const { rooms, total } = await roomService.getAllPaginated(
      filters, 
      page, 
      limit,
      neighborhoods.length > 0 ? neighborhoods : undefined,
      amenities.length > 0 ? amenities : undefined,
      roomTypes.length > 0 ? roomTypes : undefined,
      sortBy || undefined
    );

    return successResponse({ rooms, total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
