/**
 * Utility function to generate human-readable explanations for room recommendations
 * based on AI similarity scores
 */

export interface RecommendationScores {
  location_similarity: number;
  budget_similarity: number;
  smoking_match: number;
  pet_match: number;
  sleep_group_similarity: number;
  cleanliness_group_similarity: number;
  social_group_similarity: number;
  guest_group_similarity: number;
  sleep_similarity: number;
  cleanliness_similarity: number;
  social_similarity: number;
  guest_similarity: number;
  occupancy_ratio: number;
}

export interface RecommendationExplanation {
  topReasons: string[];
  matchPercentage: number;
  details: {
    location: string;
    budget: string;
    lifestyle: string;
    community: string;
  };
}

/**
 * Convert a score (0-1) to a descriptive label
 */
function scoreToLabel(score: number): { label: string; emoji: string } {
  if (score >= 0.9) return { label: "Hoàn hảo", emoji: "⭐⭐⭐" };
  if (score >= 0.8) return { label: "Rất tốt", emoji: "⭐⭐" };
  if (score >= 0.7) return { label: "Tốt", emoji: "⭐" };
  if (score >= 0.5) return { label: "Vừa phải", emoji: "👍" };
  return { label: "Thấp", emoji: "⚠️" };
}

/**
 * Generate human-readable explanation based on similarity scores
 */
export function generateRecommendationExplanation(
  scores: Partial<RecommendationScores>,
  matchPercentage: number
): RecommendationExplanation {
  const topReasons: string[] = [];
  const details = {
    location: "",
    budget: "",
    lifestyle: "",
    community: "",
  };

  // Location analysis
  if (scores.location_similarity && scores.location_similarity > 0.7) {
    topReasons.push(" Vị trí phù hợp với sở thích của bạn");
    details.location = `Khu vực này rất gần với vị trí ưu tiên của bạn`;
  } else if (scores.location_similarity && scores.location_similarity > 0.4) {
    details.location = `Khu vực có thể phù hợp với nhu cầu của bạn`;
  }

  // Budget analysis
  if (scores.budget_similarity && scores.budget_similarity > 0.8) {
    topReasons.push(" Giá cả phù hợp với ngân sách của bạn");
    details.budget = `Giá thuê nằm trong tầm ngân sách bạn đề xuất`;
  } else if (scores.budget_similarity && scores.budget_similarity > 0.6) {
    details.budget = `Giá cả nằm gần mức ngân sách bạn mong muốn`;
  }

  // Lifestyle and sleep habits
  if (scores.sleep_group_similarity && scores.sleep_group_similarity > 0.7) {
    topReasons.push(" Lối sống phù hợp với các cư dân khác");
    details.lifestyle = `Giờ sinh hoạt và giờ ngủ phù hợp với roommate`;
  } else if (
    scores.cleanliness_group_similarity &&
    scores.cleanliness_group_similarity > 0.7
  ) {
    topReasons.push(" Tiêu chuẩn vệ sinh phù hợp");
    details.lifestyle = `Tiêu chuẩn vệ sinh được duy trì theo sở thích của bạn`;
  }

  // Community and social environment
  if (scores.social_group_similarity && scores.social_group_similarity > 0.7) {
    topReasons.push(" Môi trường xã hội phù hợp");
    details.community = `Không gian xã hội khớp với sở thích của bạn`;
  }

  // Pet and guest policies
  if (
    (scores.pet_match && scores.pet_match > 0.8) ||
    (scores.guest_similarity && scores.guest_similarity > 0.7)
  ) {
    topReasons.push(" Chính sách linh hoạt với khách và thú cưng");
    details.community =
      details.community ||
      `Phòng cho phép khách thăm và thú cưng theo chính sách của bạn`;
  }

  // Occupancy ratio
  if (scores.occupancy_ratio && scores.occupancy_ratio < 0.7) {
    topReasons.push("Chưa quá đông, còn không gian cá nhân");
    details.community =
      details.community || `Phòng còn chỗ trống, bạn sẽ có không gian riêng`;
  }

  // Limit to top 3 reasons
  if (topReasons.length === 0) {
    topReasons.push(" Phù hợp chung với sở thích của bạn");
  }

  return {
    topReasons: topReasons.slice(0, 3),
    matchPercentage,
    details,
  };
}

/**
 * Get detailed explanation text for each criteria
 */
export function getDetailedExplanation(scores: Partial<RecommendationScores>) {
  const explanations = [];

  // Budget
  if (scores.budget_similarity !== undefined) {
    const { label, emoji } = scoreToLabel(scores.budget_similarity);
    explanations.push({
      title: "Ngân sách",
      score: scores.budget_similarity,
      label,
      emoji,
      description: `Giá thuê ${label.toLowerCase()} so với ngân sách của bạn`,
    });
  }

  // Lifestyle
  if (scores.sleep_group_similarity !== undefined) {
    const { label, emoji } = scoreToLabel(scores.sleep_group_similarity);
    explanations.push({
      title: "Lối sống",
      score: scores.sleep_group_similarity,
      label,
      emoji,
      description: `Nhịp sinh hoạt ${label.toLowerCase()} so với lối sống của bạn`,
    });
  }

  // Cleanliness
  if (scores.cleanliness_group_similarity !== undefined) {
    const { label, emoji } = scoreToLabel(
      scores.cleanliness_group_similarity
    );
    explanations.push({
      title: "Vệ sinh",
      score: scores.cleanliness_group_similarity,
      label,
      emoji,
      description: `Tiêu chuẩn vệ sinh ${label.toLowerCase()} phù hợp với bạn`,
    });
  }

  // Social environment
  if (scores.social_group_similarity !== undefined) {
    const { label, emoji } = scoreToLabel(scores.social_group_similarity);
    explanations.push({
      title: "Cộng đồng",
      score: scores.social_group_similarity,
      label,
      emoji,
      description: `Môi trường xã hội ${label.toLowerCase()} phù hợp với bạn`,
    });
  }

  return explanations;
}
