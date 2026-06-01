'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react';

interface CompatibilityScore {
  location_similarity: number;
  budget_similarity: number;
  smoking_match: number;
  pet_match: number;
  sleep_similarity: number;
  cleanliness_similarity: number;
  social_similarity: number;
  guest_similarity: number;
  occupancy_ratio: number;
  roommate_compatibility: number;
}

interface CompatibilityDetail {
  user_id: string;
  room_id: string;
  user_info: {
    id: string;
    name: string;
    email: string;
    preferences: {
      budgetMin: number;
      budgetMax: number;
      preferredDistrict: string;
      lifestyleArchetype: string;
      priorityCleanliness: number;
      prioritySocialEnvironment: number;
      acceptSmokingRoommates: boolean;
      acceptPets: boolean;
    };
  };
  room_info: {
    id: string;
    title: string;
    price: number;
    district: string;
    requirements: {
      cleanlinessRequired: string;
      noiseTolerance: string;
      guestPolicy: string;
      preferredSleepHabit: string;
      allowSmoking: boolean;
      allowPets: boolean;
      currentOccupants: number;
      maxOccupants: number;
    };
  };
  scores: CompatibilityScore;
  reasons: string[];
  overall_score: number;
}

interface RoomCompatibilityProps {
  roomId: string;
  isUserLoggedIn: boolean;
}

const ScoreBar = ({ score, label }: { score: number; label: string }) => {
  const percentage = score * 100;
  let color = 'bg-red-500';

  if (percentage >= 75) {
    color = 'bg-green-500';
  } else if (percentage >= 50) {
    color = 'bg-yellow-500';
  } else if (percentage >= 25) {
    color = 'bg-orange-500';
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">
          {(percentage).toFixed(0)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export function RoomCompatibility({
  roomId,
  isUserLoggedIn,
}: RoomCompatibilityProps) {
  const [compatibility, setCompatibility] =
    useState<CompatibilityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoggedIn) {
      setLoading(false);
      return;
    }

    const fetchCompatibility = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/rooms/${roomId}/compatibility`,
          {
            credentials: 'include',
          }
        );

        if (response.status === 401) {
          setError('Vui lòng đăng nhập để xem chi tiết tương đồng');
          return;
        }

        if (!response.ok) {
          throw new Error('Không thể tải dữ liệu tương đồng');
        }

        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setCompatibility(data);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Đã có lỗi xảy ra'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompatibility();
  }, [roomId, isUserLoggedIn]);

  if (!isUserLoggedIn) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-lg font-bold text-slate-950">
          Vui lòng đăng nhập
        </h3>
        <p className="mt-2 text-slate-600">
          Đăng nhập để xem chi tiết so sánh sở thích của bạn với phòng.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <p className="text-slate-600">Đang tính toán độ tương đồng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
          <div>
            <h3 className="font-bold text-red-900">Lỗi</h3>
            <p className="mt-2 text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!compatibility) {
    return null;
  }

  const {
    scores,
    reasons,
    overall_score,
    user_info,
    room_info,
  } = compatibility;

  const scoreLabels: Record<keyof CompatibilityScore, string> = {
    location_similarity: 'Vị trí địa lý',
    budget_similarity: 'Ngân sách',
    smoking_match: 'Thói quen hút thuốc',
    pet_match: 'Thú cưng',
    sleep_similarity: 'Thói quen ngủ',
    cleanliness_similarity: 'Độ sạch sẽ',
    social_similarity: 'Hòa đồng xã hội',
    guest_similarity: 'Chính sách khách',
    occupancy_ratio: 'Tỷ lệ sinh viên',
    roommate_compatibility: 'Tương thích roommate',
  };

  return (
    <section className="space-y-8">
      {/* Overall Score */}
      <div className="rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-8">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
              Độ tương đồng
            </p>
            <h3 className="mt-2 text-3xl font-extrabold text-orange-900">
              Với sở thích của bạn
            </h3>
          </div>
          <div className="relative h-32 w-32 flex-shrink-0">
            <svg
              className="h-full w-full transform -rotate-90"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-orange-200"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${(overall_score / 100) * (54 * 2 * Math.PI)} ${54 * 2 * Math.PI}`}
                className="text-orange-600 transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-orange-900">
                {overall_score.toFixed(0)}
              </span>
              <span className="text-xs font-semibold text-orange-700">
                / 100
              </span>
            </div>
          </div>
        </div>

        {/* Score Interpretation */}
        <div className="mt-6 rounded-lg bg-white/60 p-4 backdrop-blur">
          <p className="text-sm font-semibold text-slate-900">
            {overall_score >= 75
              ? '✓ Phòng rất phù hợp với sở thích của bạn'
              : overall_score >= 50
                ? '◐ Phòng khá phù hợp, nhưng có một số điểm khác biệt'
                : overall_score >= 25
                  ? '⚠ Phòng có một số điểm không phù hợp với sở thích'
                  : '✗ Phòng chưa phù hợp với sở thích của bạn'}
          </p>
        </div>
      </div>

      {/* Detailed Scores */}
      <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Chi tiết so sánh
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Từng khía cạnh tương đồng
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Object.entries(scoreLabels).map(([key, label]) => (
            <ScoreBar
              key={key}
              score={scores[key as keyof CompatibilityScore]}
              label={label}
            />
          ))}
        </div>
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-8">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <h3 className="font-bold text-blue-900">
                Lý do cho điểm này
              </h3>
            </div>
          </div>

          <ul className="space-y-2">
            {reasons.map((reason, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-sm text-blue-800"
              >
                <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* User vs Room Comparison */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            So sánh chi tiết
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">
            Sở thích của bạn vs Yêu cầu phòng
          </h3>
        </div>

        <div className="space-y-4">
          {/* Budget */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Ngân sách</p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600">Sở thích của bạn</p>
                <p className="text-sm font-bold text-slate-900">
                  {(user_info.preferences.budgetMin / 1000000).toFixed(1)}M -{' '}
                  {(user_info.preferences.budgetMax / 1000000).toFixed(1)}M
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Giá phòng</p>
                <p className="text-sm font-bold text-slate-900">
                  {(room_info.price / 1000000).toFixed(1)}M VND/tháng
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Khu vực</p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600">Sở thích của bạn</p>
                <p className="text-sm font-bold text-slate-900">
                  {user_info.preferences.preferredDistrict || 'Không ưu tiên'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Khu vực phòng</p>
                <p className="text-sm font-bold text-slate-900">
                  {room_info.district}
                </p>
              </div>
            </div>
          </div>

          {/* Lifestyle */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Lối sống</p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600">
                  Kiểu tính cách của bạn
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {user_info.preferences.lifestyleArchetype}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">
                  Thói quen ngủ ưa thích
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {room_info.requirements.preferredSleepHabit}
                </p>
              </div>
            </div>
          </div>

          {/* Cleanliness */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Độ sạch sẽ</p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600">Mức ưu tiên của bạn</p>
                <p className="text-sm font-bold text-slate-900">
                  {user_info.preferences.priorityCleanliness}/5
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Yêu cầu phòng</p>
                <p className="text-sm font-bold text-slate-900">
                  {room_info.requirements.cleanlinessRequired === 'high'
                    ? 'Cao'
                    : room_info.requirements.cleanlinessRequired === 'low'
                      ? 'Thấp'
                      : 'Trung bình'}
                </p>
              </div>
            </div>
          </div>

          {/* Social Environment */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Môi trường xã hội</p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600">
                  Mức ưu tiên của bạn
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {user_info.preferences.prioritySocialEnvironment}/5
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">
                  Chính sách khách của phòng
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {room_info.requirements.guestPolicy === 'no_guests'
                    ? 'Không cho khách'
                    : room_info.requirements.guestPolicy === 'frequently'
                      ? 'Thường xuyên'
                      : 'Thỉnh thoảng'}
                </p>
              </div>
            </div>
          </div>

          {/* Occupancy */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Số lượng ở trong phòng</p>
            <div className="mt-3">
              <p className="text-xs text-slate-600">Tỷ lệ chiếm dụng</p>
              <p className="text-sm font-bold text-slate-900">
                {room_info.requirements.currentOccupants}/
                {room_info.requirements.maxOccupants} người
                ({(
                  (room_info.requirements.currentOccupants /
                    room_info.requirements.maxOccupants) *
                  100
                ).toFixed(0)}
                %)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
