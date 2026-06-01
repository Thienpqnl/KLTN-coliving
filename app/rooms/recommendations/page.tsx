import RecommendedRooms from "@/app/components/RecommendedRooms";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

export const metadata = {
  title: "Phòng Đề Xuất - KLTN Coliving",
  description: "Danh sách phòng được đề xuất dựa trên sở thích của bạn",
};

export default function RecommendationsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header with back button */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/preferences"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              ← Chỉnh sửa tiêu chí
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">KLTN Coliving</h1>
            <div className="w-24"></div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <RecommendedRooms />
        </div>
      </div>
    </ProtectedRoute>
  );
}
