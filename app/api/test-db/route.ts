import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "disabled",
      message:
        "Route kiểm tra DB trực tiếp đã được tắt trong kiến trúc microservice. Hãy kiểm tra /health của từng service.",
      services: {
        identity: process.env.IDENTITY_SERVICE_URL || null,
        property: process.env.PROPERTY_SERVICE_URL || null,
        rental: process.env.RENTAL_SERVICE_URL || null,
        community: process.env.COMMUNITY_SERVICE_URL || null,
        preference: process.env.PREFERENCE_SERVICE_URL || null,
        ai: process.env.AI_SERVICE_URL || null,
      },
    },
    { status: 410 },
  );
}
