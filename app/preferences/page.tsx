import PreferenceQuestionnaire from "@/app/components/PreferenceQuestionnaire";
import ProtectedRoute from "@/components/ProtectedRoute";

export const metadata = {
  title: "Cập nhật sở thích",
  description: "Điền thông tin sở thích và tìm phòng phù hợp với bạn",
};

export default function PreferencesPage() {
  return (
    <ProtectedRoute>
      <PreferenceQuestionnaire />
    </ProtectedRoute>
  );
}
