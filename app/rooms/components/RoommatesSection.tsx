'use client';

import { useEffect, useState } from 'react';
import { useAuth } from "@/lib/hooks/useAuth";
import { roommateService, type RoommateMatch } from '@/lib/services/roommate.service';
import { generateRoommateExplanation } from '@/lib/services/roommateExplainer';

type RoommateExplanation = ReturnType<typeof generateRoommateExplanation>;

interface RoommatesSectionProps {
  roomId: string;
}

export function RoommatesSection({ roomId }: RoommatesSectionProps) {
  // 1. Lấy thông tin user hiện tại từ Context
  const { user, isLoading: authLoading } = useAuth(); 
  
  const [explainedMatches, setExplainedMatches] = useState<{ match: RoommateMatch; explanation: RoommateExplanation }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Nếu đang load auth, đợi
    if (authLoading) {
      console.log("[RoommatesSection] Đang chờ AuthProvider load user...");
      return;
    }

    if (!user?.id || !roomId) {
      console.warn(" [RoommatesSection] Chưa đăng nhập hoặc thiếu RoomId. User:", user, "RoomId:", roomId);
      setLoading(false); // Stop loading nếu không đủ điều kiện
      return;
    }

    const fetchMatches = async () => {
      console.log("[Fetch] Bắt đầu gọi API matching cho User:", user.id, "và Room:", roomId);
      setLoading(true);
      try {
        // 3. Gọi service với userId thật
        const data = await roommateService.getMatches(user.id, roomId);
        console.log(" [Fetch] Nhận được dữ liệu từ Service:", data);
        
        if (!data || data.length === 0) {
          console.log(" [Data] Dữ liệu rỗng.");
          setExplainedMatches([]);
          return;
        }

        // 4. Xử lý dữ liệu hiển thị (generate explanation)
        const processedData = data.map((match: RoommateMatch) => {
            const explanation = generateRoommateExplanation({
                compatibility_score: match.compatibility_score,
                compatibility_reasons: match.compatibility_reasons || []
            });
            return { match, explanation };
        });

        setExplainedMatches(processedData);
      } catch (error) {
        console.error("[Fetch] Lỗi nghiêm trọng:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user?.id, roomId, authLoading]); // Dependency array: chạy lại khi user hoặc roomId hoặc authLoading thay đổi

  // --- PHẦN RENDER GIAO DIỆN ---

  // Trường hợp 1: Đang chờ xác thực người dùng
  if (authLoading) {
    return <div className="p-4 text-center text-slate-500 animate-pulse">Đang tải thông tin xác thực...</div>;
  }

  // Trường hợp 2: Chưa đăng nhập
  if (!user) {
    return (
      <div className="rounded-3xl bg-blue-50 p-8 border border-blue-100 text-center">
        <h3 className="text-xl font-bold mb-2 text-blue-900"> Tính năng dành cho thành viên</h3>
        <p className="text-blue-700">Vui lòng đăng nhập để xem danh sách roommate và độ tương thích AI.</p>
      </div>
    );
  }

  // Trường hợp 3: Đang tải
  if (loading) {
    return <div className="p-4 text-center text-slate-500 animate-pulse">Đang phân tích độ tương thích...</div>;
  }

  // Trường hợp 4: Không có kết quả
  if (explainedMatches.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold mb-2"> Thành viên trong phòng</h3>
        <p className="text-slate-500">Hiện tại chưa có thành viên nào trong phòng này hoặc dữ liệu đang được cập nhật.</p>
      </div>
    );
  }

  // Trường hợp 4: Hiển thị danh sách
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">
          Cộng đồng trong phòng
        </p>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 text-orange-700 shadow-sm ring-1 ring-orange-100">
            <span className="material-symbols-outlined block translate-y-px text-2xl leading-none">
              groups
            </span>
          </span>
          <div>
            <h3 className="bg-gradient-to-r from-slate-950 via-orange-900 to-slate-700 bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl">
              Gợi ý bạn ở cùng phù hợp
            </h3>
            <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-orange-600 to-amber-300" />
          </div>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {explainedMatches.map(({ match, explanation }) => (
          <RoommateCard 
            key={match.roommate_id} 
            match={match} 
            explanation={explanation} 
          />
        ))}
      </div>
    </div>
  );
}

function RoommateCard({ 
  match, 
  explanation 
}: { 
  match: RoommateMatch; 
  explanation: RoommateExplanation 
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-orange-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={match.avatar || '/default-avatar.png'} 
            alt={match.name}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-100 bg-slate-200"
          />
          <div>
            <h4 className="text-lg font-bold text-slate-900">{match.name || "Người dùng ẩn danh"}</h4>
            <p className="text-sm text-slate-500">{match.occupation || "Chưa cập nhật"}</p>
          </div>
        </div>

        {/* Badge điểm số */}
        <div className={`flex flex-col items-end rounded-xl px-3 py-2 border ${explanation.compatibilityPercent >= 75 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <span className="text-2xl font-black text-slate-900">{explanation.compatibilityPercent}%</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            {explanation.emoji} {explanation.compatibilityLevel}
          </span>
        </div>
      </div>

      {/* Lý do phù hợp */}
      <div className="mt-6 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Vì sao phù hợp?</p>
        <ul className="space-y-2">
          {explanation.keyReasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="material-symbols-outlined text-base text-green-500 mt-0.5">check_circle</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>
      
      <button className="mt-6 w-full rounded-xl bg-slate-50 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-orange-50 hover:text-orange-700">
        Xem hồ sơ chi tiết
      </button>
    </div>
  );
}
