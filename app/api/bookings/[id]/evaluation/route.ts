import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

const AI_API_BASE_URL = process.env.AI_API_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id: bookingId } = await params;

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: true,
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify user is the host of this room
    const room = await prisma.room.findUnique({
      where: { id: booking.roomId },
    });

    if (!room || room.ownerId !== user.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Call AI API to get landlord evaluation
    let evaluation: unknown = null;
    try {
      const response = await fetch(
        `${AI_API_BASE_URL}/landlord/evaluate-applicant/${booking.userId}/${booking.roomId}`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        evaluation = await response.json();
      } else {
        console.error("AI API error:", response.status, response.statusText);
      }
    } catch (fetchError) {
      console.error("Error calling AI API:", fetchError);
    }

    // Provide default structure if AI API fails
    if (!evaluation) {
      evaluation = {
        status: "ERROR",
        error_message: "AI service is unavailable. Please try again later.",
        summary: {
          applicant_id: booking.userId,
          applicant_name: booking.user?.fullName || booking.user?.name || "Unknown",
          roomId: booking.roomId,
          room_title: room?.title || "Unknown",
          final_compatibility_score: 0,
          compatibility_level: "Không xác định",
          data_description: "Hệ thống đánh giá không khả dụng",
        },
        critical_rules_check: {
          has_critical_conflict: false,
          is_room_overloaded: false,
          smoking_rule_violation: false,
          pet_rule_violation: false,
          list_of_violations: [],
        },
        metric_breakdown_percent: {
          cleanliness_match_rate: 0,
          sleep_habit_match_rate: 0,
          social_environment_match_rate: 0,
          room_policy_compliance_total: 0,
          roommate_social_cohesion_total: 0,
        },
        roommate_impact_analysis: {
          total_existing_roommates: 0,
          highest_similarity_with: "N/A",
          lowest_similarity_with: "N/A",
          individual_roommate_scores: [],
        },
        ai_data_report: "Đang chờ dữ liệu từ hệ thống AI...",
      };
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        userId: booking.userId,
        roomId: booking.roomId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
      },
      user: {
        id: booking.user.id,
        name: booking.user.name,
        email: booking.user.email,
        fullName: booking.user.fullName,
      },
      room: {
        id: booking.room.id,
        title: booking.room.title,
      },
      evaluation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
