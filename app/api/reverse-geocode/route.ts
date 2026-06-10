import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  // Lấy token Mapbox từ biến môi trường
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return NextResponse.json(
      { error: "Mapbox token is not configured" },
      { status: 500 }
    );
  }

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing lat or lng parameters" },
      { status: 400 }
    );
  }

  try {
    // Gọi Mapbox Reverse Geocoding API v6
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${mapboxToken}`
    );

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();

    // Mapbox v6 trả về full_address trong properties
    const address = data.features?.[0]?.properties?.full_address || "";

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return NextResponse.json(
      { error: "Failed to get address", address: "" },
      { status: 500 }
    );
  }
}