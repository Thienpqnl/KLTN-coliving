/**
 * Utility functions to generate human-readable explanations for roommate compatibility
 */

export interface RoommateCompatibilityData {
  compatibility_score: number;
  compatibility_reasons: string[];
}

export interface RoommatePreferences {
  priority_cleanliness?: number;
  priority_social_environment?: number;
  lifestyle_archetype?: string;
  accept_smoking_roommates?: boolean;
  accept_pets?: boolean;
}

export interface RoommateExplanation {
  compatibilityPercent: number;
  compatibilityLevel: string;
  emoji: string;
  keyReasons: string[];
  detailedAnalysis: {
    title: string;
    description: string;
    status: 'compatible' | 'neutral' | 'incompatible';
  }[];
}

/**
 * Map compatibility score to readable level
 */
function getCompatibilityLevel(
  score: number
): { level: string; emoji: string; color: string } {
  if (score >= 0.9) {
    return {
      level: "Cực kỳ phù hợp",
      emoji: "💚",
      color: "bg-green-50 border-green-200 text-green-900",
    };
  }
  if (score >= 0.75) {
    return {
      level: "Rất phù hợp",
      emoji: "💚",
      color: "bg-green-50 border-green-200 text-green-900",
    };
  }
  if (score >= 0.6) {
    return {
      level: "Phù hợp",
      emoji: "👍",
      color: "bg-blue-50 border-blue-200 text-blue-900",
    };
  }
  if (score >= 0.45) {
    return {
      level: "Còn được",
      emoji: "🤝",
      color: "bg-amber-50 border-amber-200 text-amber-900",
    };
  }
  return {
    level: "Cần cân nhắc",
    emoji: "⚠️",
    color: "bg-orange-50 border-orange-200 text-orange-900",
  };
}

/**
 * Convert AI reasons to user-friendly explanations
 */
function normalizeReasons(reasons: string[]): string[] {
  const reasonMap: Record<string, string> = {
    "Same smoking preference": "Cùng sở thích về hút thuốc",
    "Same pet preference": "Cùng sở thích về nuôi thú cưng",
    "Very similar cleanliness habits": "Thói quen vệ sinh rất giống nhau",
    "Very compatible social preferences": "Sở thích xã hội rất tương thích",
    "Similar cleanliness habits": "Thói quen vệ sinh giống nhau",
    "Compatible social preferences": "Sở thích xã hội tương thích",
  };

  return reasons.map((reason) => reasonMap[reason] || reason);
}

/**
 * Generate detailed compatibility explanation
 */
export function generateRoommateExplanation(
  compatibility: RoommateCompatibilityData,
  preferences?: RoommatePreferences
): RoommateExplanation {
  const score = compatibility.compatibility_score;
  const percent = Math.round(score * 100);
  const { level, emoji, color } = getCompatibilityLevel(score);
  const normalizedReasons = normalizeReasons(compatibility.compatibility_reasons);

  // Generate key reasons (first 2 or 3)
  const keyReasons =
    normalizedReasons.length > 0
      ? normalizedReasons.slice(0, 3)
      : [
          percent >= 75
            ? "Nhìn chung hai bạn khá tương thích"
            : percent >= 60
            ? "Các yếu tố cơ bản phù hợp"
            : "Có thể sống chung được nhưng cần điều chỉnh",
        ];

  // Generate detailed analysis based on score and reasons
  const detailedAnalysis = generateDetailedAnalysis(
    score,
    normalizedReasons,
    preferences
  );

  return {
    compatibilityPercent: percent,
    compatibilityLevel: level,
    emoji,
    keyReasons,
    detailedAnalysis,
  };
}

/**
 * Generate detailed compatibility analysis items
 */
function generateDetailedAnalysis(
  score: number,
  reasons: string[],
  preferences?: RoommatePreferences
): Array<{ title: string; description: string; status: "compatible" | "neutral" | "incompatible" }> {
  const analysis: Array<{ title: string; description: string; status: "compatible" | "neutral" | "incompatible" }> = [];

  // Cleanliness analysis
  if (
    reasons.some(
      (r) =>
        r.includes("vệ sinh") || r.includes("Cleanliness") || r.includes("cleanliness")
    )
  ) {
    analysis.push({
      title: "✨ Vệ sinh & Sạch sẽ",
      description: "Tiêu chuẩn vệ sinh của bạn khá giống nhau",
      status: "compatible",
    });
  } else if (preferences?.priority_cleanliness !== undefined) {
    analysis.push({
      title: "✨ Vệ sinh & Sạch sẽ",
      description:
        "Có thể có chút khác biệt về tiêu chuẩn vệ sinh, nhưng có thể thương lượng",
      status: "neutral",
    });
  }

  // Social environment analysis
  if (
    reasons.some(
      (r) =>
        r.includes("xã hội") || r.includes("Social") || r.includes("social")
    )
  ) {
    analysis.push({
      title: "👥 Môi trường xã hội",
      description: "Sở thích về không gian xã hội rất tương thích",
      status: "compatible",
    });
  } else if (preferences?.priority_social_environment !== undefined) {
    analysis.push({
      title: "👥 Môi trường xã hội",
      description:
        "Sở thích xã hội có khác biệt nhưng vẫn chấp nhận được",
      status: "neutral",
    });
  }

  // Smoking analysis
  if (
    reasons.some(
      (r) =>
        r.includes("hút thuốc") || r.includes("smoking") || r.includes("Smoking")
    )
  ) {
    analysis.push({
      title: "🚭 Hút thuốc",
      description: "Cả hai cùng chấp nhận hoặc cùng không chấp nhận hút thuốc",
      status: "compatible",
    });
  } else if (preferences?.accept_smoking_roommates !== undefined) {
    analysis.push({
      title: "🚭 Hút thuốc",
      description:
        "Sở thích về hút thuốc có khác biệt - cần thương lượng",
      status: "incompatible",
    });
  }

  // Pet analysis
  if (
    reasons.some(
      (r) => r.includes("thú cưng") || r.includes("pet") || r.includes("Pet")
    )
  ) {
    analysis.push({
      title: "🐾 Thú cưng",
      description: "Cả hai cùng chấp nhận hoặc cùng không chấp nhận thú cưng",
      status: "compatible",
    });
  } else if (preferences?.accept_pets !== undefined) {
    analysis.push({
      title: "🐾 Thú cưng",
      description:
        "Sở thích về thú cưng có khác biệt - cần thương lượng",
      status: "incompatible",
    });
  }

  // Overall compatibility note
  if (analysis.length === 0) {
    if (score >= 0.75) {
      analysis.push({
        title: "✅ Đánh giá chung",
        description:
          "Bạn và roommate này có điểm chung về phong cách sống, sẽ là đôi bạn tốt",
        status: "compatible",
      });
    } else if (score >= 0.6) {
      analysis.push({
        title: "✅ Đánh giá chung",
        description: "Có vài điểm khác biệt nhưng vẫn có thể sống chung tốt",
        status: "neutral",
      });
    } else {
      analysis.push({
        title: "⚠️ Đánh giá chung",
        description:
          "Có một số khác biệt đáng kể, nên gặp gỡ và trao đổi trước",
        status: "incompatible",
      });
    }
  }

  return analysis;
}

/**
 * Get lifestyle archetype label
 */
export function getLifestyleLabel(archetype?: string): string {
  const archetypeMap: Record<string, string> = {
    morning_person: "Người thức sớm",
    night_owl: "Người thức khuya",
    independent: "Độc lập",
    social_butterfly: "Xã hội & thân thiện",
    homebody: "Ít ra ngoài",
    active: "Năng động",
  };

  return archetypeMap[archetype || ""] || "Không xác định";
}

/**
 * Format preference score to text
 */
export function formatPreferenceScore(score?: number): string {
  if (score === undefined) return "Không xác định";
  if (score <= 2) return "Thấp";
  if (score <= 3) return "Trung bình";
  if (score <= 4) return "Cao";
  return "Rất cao";
}
