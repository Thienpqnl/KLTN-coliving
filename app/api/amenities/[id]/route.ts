import { NextRequest } from "next/server";
import { amenityService } from "@/lib/services/amenity.service";
import { amenityUpdateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const amenity = await amenityService.getById(params.id);
    return successResponse(amenity);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    await getAuthUser(request);

    const body = await request.json();
    const data = amenityUpdateSchema.parse(body);

    const amenity = await amenityService.update(params.id, data);
    return successResponse(amenity);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    await getAuthUser(request);

    await amenityService.delete(params.id);
    return successResponse({ message: "Amenity deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
