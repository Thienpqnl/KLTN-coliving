const { identityClient } = require("./user-composition.cjs");
const { correlationHeaders } = require("../shared/observability.cjs");

function failure(status, message) {
  return { status, payload: { error: message } };
}

function defaultEvaluation(booking, room) {
  return {
    status: "ERROR",
    error_message: "AI service is unavailable. Please try again later.",
    summary: {
      applicant_id: booking.userId,
      applicant_name: booking.user?.fullName || booking.user?.name || "Unknown",
      roomId: booking.roomId,
      room_title: room?.title || "Unknown",
      final_compatibility_score: 0,
      compatibility_level: "Khong xac dinh",
      data_description: "He thong danh gia khong kha dung",
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
    ai_data_report: "Dang cho du lieu tu he thong AI...",
  };
}

async function evaluateApplicant(prisma, identity, bookingId, aiBaseUrl, clients = identityClient) {
  if (!identity?.userId) return failure(401, "Unauthorized");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!booking) return failure(404, "Booking not found");

  const room = await prisma.rentalRoomSnapshot.findUnique({
    where: { roomId: booking.roomId },
  });
  if (!room || (room.ownerId !== identity.userId && identity.role !== "ADMIN")) {
    return failure(403, "Unauthorized");
  }
  const user = await clients.getUser(booking.userId);
  const hydratedBooking = { ...booking, user };

  let evaluation = null;
  try {
    const response = await fetch(
      `${aiBaseUrl}/v1/landlord/evaluate-applicant/${booking.userId}/${booking.roomId}`,
      { method: "GET", headers: correlationHeaders() },
    );
    if (response.ok) {
      const payload = await response.json();
      evaluation = payload.success === false ? null : payload.data ?? payload;
    }
  } catch (error) {
    console.error("[rental-service] AI applicant evaluation failed", error);
  }

  if (!evaluation) evaluation = defaultEvaluation(hydratedBooking, room);

  return {
    status: 200,
    payload: {
      booking: {
        id: booking.id,
        userId: booking.userId,
        roomId: booking.roomId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        fullName: user.fullName,
      },
      room: {
        id: room.roomId,
        title: room.title,
      },
      evaluation,
    },
  };
}

module.exports = { defaultEvaluation, evaluateApplicant };
