import { NextRequest } from "next/server";
import { amenityService } from "@/lib/services/amenity.service";
import { amenityCreateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const amenities = await amenityService.getAll();
    return successResponse(amenities);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    await getAuthUser(request);

    const body = await request.json();
    const data = amenityCreateSchema.parse(body);

    const amenity = await amenityService.create(data);

    return successResponse(amenity, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
