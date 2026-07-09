import { NextResponse } from "next/server";

// External integration gateway: this endpoint intentionally stays in the BFF
// because it proxies Mapbox and does not own domain data.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return NextResponse.json(
      { error: "Mapbox token is not configured" },
      { status: 500 },
    );
  }

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing lat or lng parameters" },
      { status: 400 },
    );
  }

  try {
    const encodedLng = encodeURIComponent(lng);
    const encodedLat = encodeURIComponent(lat);
    const encodedToken = encodeURIComponent(mapboxToken);
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${encodedLng}&latitude=${encodedLat}&access_token=${encodedToken}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    const address = data.features?.[0]?.properties?.full_address || "";

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return NextResponse.json(
      { error: "Failed to get address", address: "" },
      { status: 500 },
    );
  }
}
