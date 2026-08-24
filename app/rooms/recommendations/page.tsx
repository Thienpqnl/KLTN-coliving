import RecommendedRooms from "@/app/components/RecommendedRooms";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RecommendationsHeader } from "./recommendations-header";

export const metadata = {
  title: "Phòng đề xuất",
  description: "Danh sách phòng được đề xuất dựa trên sở thích của bạn",
};

export default function RecommendationsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <RecommendationsHeader />

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <RecommendedRooms />
        </div>
      </div>
    </ProtectedRoute>
  );
}
