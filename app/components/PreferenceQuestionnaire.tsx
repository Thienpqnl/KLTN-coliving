"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function PreferenceQuestionnaire() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  // State khởi tạo
  const [form, setForm] = useState({
    budgetMinVnd: "",
    budgetMaxVnd: "",
    preferredDistrict: "",
    lifestyleArchetype: "",
    priorityCleanliness: 3,
    prioritySocialEnvironment: 3,
    acceptSmokingRoommates: false,
    acceptPets: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences khi component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch("/api/preferences", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            // Populate form với dữ liệu đã lưu
            setForm({
              budgetMinVnd: data.budgetMinVnd ? data.budgetMinVnd.toString() : "",
              budgetMaxVnd: data.budgetMaxVnd ? data.budgetMaxVnd.toString() : "",
              preferredDistrict: data.preferredDistrict || "",
              lifestyleArchetype: data.lifestyleArchetype || "",
              priorityCleanliness: data.priorityCleanliness || 3,
              prioritySocialEnvironment: data.prioritySocialEnvironment || 3,
              acceptSmokingRoommates: data.acceptSmokingRoommates || false,
              acceptPets: data.acceptPets || false,
            });
            console.log("Loaded preferences:", data);
          }
        }
      } catch (error) {
        console.log(" No existing preferences found (first time user)");
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      if (currentStep === totalSteps) {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton && !submitButton.disabled) {
            submitButton.click();
        }
      } else {
        // Nếu chưa phải bước cuối, chuyển sang bước tiếp theo
        handleNext();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Luôn ngăn chặn reload trang

    // Double check: Chỉ cho phép xử lý logic nếu đang ở bước cuối
    if (currentStep !== totalSteps) {
      return; 
    }

    if (isLoading) {
      alert("Đang tải dữ liệu, vui lòng chờ...");
      return;
    }

    setLoading(true);

    try {
      // Validate
      if (!form.budgetMinVnd || !form.budgetMaxVnd) {
        alert("Vui lòng nhập ngân sách");
        setLoading(false);
        return;
      }

      if (!form.lifestyleArchetype) {
        alert(" Vui lòng chọn kiểu lối sống");
        setLoading(false);
        return;
      }

      // Convert to proper types
      const data = {
        budgetMinVnd: form.budgetMinVnd ? parseInt(form.budgetMinVnd) : null,
        budgetMaxVnd: form.budgetMaxVnd ? parseInt(form.budgetMaxVnd) : null,
        preferredDistrict: form.preferredDistrict || null,
        lifestyleArchetype: form.lifestyleArchetype || null,
        priorityCleanliness: form.priorityCleanliness,
        prioritySocialEnvironment: form.prioritySocialEnvironment,
        acceptSmokingRoommates: form.acceptSmokingRoommates,
        acceptPets: form.acceptPets,
      };

      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMsg = "Lỗi khi lưu preferences";
        try {
          const error = await response.json();
          errorMsg = error.error || error.message || errorMsg;
        } catch {
          errorMsg = `Lỗi server: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      alert("Lưu thành công! Đang tìm phòng phù hợp cho bạn...");
      router.push("/rooms/recommendations");
    } catch (error: any) {
      alert(`❌ Lỗi: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      // Cuộn lên đầu form để người dùng dễ nhìn thấy nội dung mới
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStepProgress = () => {
    return ((currentStep - 1) / (totalSteps - 1)) * 100;
  };

  return (
    <>
      <Navigation />
      {isLoading && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 pt-32 pb-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-semibold">Đang tải dữ liệu của bạn...</p>
          </div>
        </div>
      )}
      {!isLoading && (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 mb-4 rounded-full bg-orange-100 text-orange-700 font-bold text-xs tracking-widest uppercase">
              Tìm Không Gian Sống Lý Tưởng
            </span>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Hãy Khám Phá <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500">Phòng Hoàn Hảo</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Trả lời một vài câu hỏi về sở thích của bạn, chúng tôi sẽ giúp bạn tìm được không gian sống phù hợp.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-slate-600">Bước {currentStep}/{totalSteps}</span>
              <span className="text-sm font-semibold text-slate-600">{Math.round(getStepProgress())}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-300"
                style={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>

          {/* Form Container */}
          {/* Thêm onKeyDown vào form để bắt sự kiện Enter toàn cục */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/10 overflow-hidden">
            <form 
              onSubmit={handleSubmit} 
              onKeyDown={handleKeyDown}
              className="p-12"
            >
              {/* Step 1: Budget */}
              {currentStep === 1 && (
                <div className="transition-opacity duration-300 animate-in fade-in slide-in-from-right-4">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">Ngân sách hàng tháng</h2>
                    <p className="text-slate-600 mb-8">Xác định mức giá phòng hợp với tài chính của bạn.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Tối thiểu (VND)</label>
                      <input
                        type="number"
                        value={form.budgetMinVnd}
                        onChange={(e) => setForm({ ...form, budgetMinVnd: e.target.value })}
                        placeholder="3,000,000"
                        className="w-full px-6 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:outline-none transition"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-2">Giá tối thiểu bạn chấp nhận</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Tối đa (VND)</label>
                      <input
                        type="number"
                        value={form.budgetMaxVnd}
                        onChange={(e) => setForm({ ...form, budgetMaxVnd: e.target.value })}
                        placeholder="10,000,000"
                        className="w-full px-6 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:outline-none transition"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-2">Giá tối đa bạn chấp nhận</p>
                    </div>
                  </div>

                  {form.budgetMinVnd && form.budgetMaxVnd && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-8 animate-in fade-in">
                      <p className="text-sm text-orange-700">
                        <span className="font-bold">Khoảng giá:</span> {parseInt(form.budgetMinVnd).toLocaleString('vi-VN')} - {parseInt(form.budgetMaxVnd).toLocaleString('vi-VN')} VND/tháng
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Location & Lifestyle */}
              {currentStep === 2 && (
                <div className="transition-opacity duration-300 animate-in fade-in slide-in-from-right-4 space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">Khu vực ưa thích</h2>
                    <p className="text-slate-600 mb-6">Chọn quận/huyện nơi bạn muốn sống (tùy chọn).</p>
                    
           <select
  value={form.preferredDistrict}
  onChange={(e) => setForm({ ...form, preferredDistrict: e.target.value })}
  className="w-full px-6 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 focus:outline-none transition bg-white"
>
  <option value="">-- Không ưu tiên khu vực --</option>
  
  {/* Các Quận nội thành */}
  <option value="Q1">Quận 1</option>
  <option value="Q3">Quận 3</option>
  <option value="Q4">Quận 4</option>
  <option value="Q5">Quận 5</option>
  <option value="Q6">Quận 6</option>
  <option value="Q7">Quận 7</option>
  <option value="Q8">Quận 8</option>
  <option value="Q10">Quận 10</option>
  <option value="Q11">Quận 11</option>
  <option value="Q12">Quận 12</option>
  
  {/* Các Quận có tên chữ */}
  <option value="BTN">Quận Bình Tân</option>
  <option value="BT">Quận Bình Thạnh</option>
  <option value="GV">Quận Gò Vấp</option>
  <option value="PN">Quận Phú Nhuận</option>
  <option value="TB">Quận Tân Bình</option>
  <option value="TP">Quận Tân Phú</option>
  
  {/* Thành phố trực thuộc */}
  <option value="TĐ">Thành phố Thủ Đức</option>
  
  {/* Các Huyện ngoại thành */}
  <option value="BC">Huyện Bình Chánh</option>
  <option value="CG">Huyện Cần Giờ</option>
  <option value="CC">Huyện Củ Chi</option>
  <option value="HM">Huyện Hóc Môn</option>
  <option value="NB">Huyện Nhà Bè</option>
</select>

                  </div>

                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">Lối sống của bạn</h2>
                    <p className="text-slate-600 mb-6">Chọn cách sống phù hợp với bạn nhất.</p>

                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { value: "Privacy Seeker", label: "Cần riêng tư", desc: "Không ồn ào, ít giao tiếp" },
                        { value: "Remote Worker", label: "Làm việc ở nhà", desc: "Cần không gian yên tĩnh" },
                        { value: "Social Butterfly", label: "Thích giao tiếp", desc: "Vui vẻ, thường có bạn" },
                        { value: "Student", label: "Sinh viên", desc: "Linh hoạt, ít ở nhà" },
                        { value: "Young Professional", label: "Chuyên gia trẻ", desc: "Cân bằng giữa công việc & cuộc sống" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button" // Quan trọng: type="button" để không submit form
                          onClick={() => setForm({ ...form, lifestyleArchetype: option.value })}
                          className={`p-4 rounded-xl border-2 transition text-left ${
                            form.lifestyleArchetype === option.value
                              ? "border-purple-600 bg-purple-50"
                              : "border-slate-200 bg-slate-50 hover:border-purple-300"
                          }`}
                        >
                          <p className="font-bold text-slate-900">{option.label}</p>
                          <p className="text-sm text-slate-600">{option.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Room Preferences */}
              {currentStep === 3 && (
                <div className="transition-opacity duration-300 animate-in fade-in slide-in-from-right-4 space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">Độ sạch sẽ</h2>
                    <p className="text-slate-600 mb-6">Độ sạch sẽ quan trọng đến mức nào với bạn?</p>

                    <div className="bg-slate-50 rounded-xl p-8">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold text-slate-600">Không quan trọng</span>
                        <span className="text-3xl font-extrabold text-orange-600">{form.priorityCleanliness}/5</span>
                        <span className="text-sm font-semibold text-slate-600">Rất quan trọng</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={form.priorityCleanliness}
                        onChange={(e) => setForm({ ...form, priorityCleanliness: parseInt(e.target.value) })}
                        className="w-full h-3 bg-gradient-to-r from-slate-200 to-orange-200 rounded-full appearance-none cursor-pointer accent-orange-600"
                      />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">Môi trường sống</h2>
                    <p className="text-slate-600 mb-6">Bạn thích sống trong môi trường yên tĩnh hay vui vẻ?</p>

                    <div className="bg-slate-50 rounded-xl p-8">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold text-slate-600">Yên tĩnh, ít người</span>
                        <span className="text-3xl font-extrabold text-blue-600">{form.prioritySocialEnvironment}/5</span>
                        <span className="text-sm font-semibold text-slate-600">Vui vẻ, nhiều người</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={form.prioritySocialEnvironment}
                        onChange={(e) => setForm({ ...form, prioritySocialEnvironment: parseInt(e.target.value) })}
                        className="w-full h-3 bg-gradient-to-r from-slate-200 to-blue-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Additional Preferences */}
              {currentStep === 4 && (
                <div className="transition-opacity duration-300 animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-3xl font-bold text-slate-900 mb-3">Tùy chọn khác</h2>
                  <p className="text-slate-600 mb-8">Bạn có chấp nhận những điều kiện sau không?</p>

                  <div className="space-y-4">
                    <label className="flex items-start gap-4 p-6 rounded-xl border-2 border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.acceptSmokingRoommates}
                        onChange={(e) => setForm({ ...form, acceptSmokingRoommates: e.target.checked })}
                        className="w-6 h-6 mt-1 text-orange-600 rounded accent-orange-600"
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-lg">Chấp nhận roommate hút thuốc</p>
                        <p className="text-slate-600 text-sm">Bạn có thể sống với người hút thuốc không?</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-4 p-6 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.acceptPets}
                        onChange={(e) => setForm({ ...form, acceptPets: e.target.checked })}
                        className="w-6 h-6 mt-1 text-blue-600 rounded accent-blue-600"
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-lg">Chấp nhận roommate có thú cưng</p>
                        <p className="text-slate-600 text-sm">Bạn có thể sống với người nuôi thú cưng không?</p>
                      </div>
                    </label>
                  </div>

                  {/* Summary */}
                  <div className="mt-10 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-8 border-2 border-orange-200">
                    <h3 className="font-bold text-slate-900 mb-4">Tóm tắt sở thích của bạn:</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Ngân sách:</span> {form.budgetMinVnd && form.budgetMaxVnd ? `${parseInt(form.budgetMinVnd).toLocaleString('vi-VN')} - ${parseInt(form.budgetMaxVnd).toLocaleString('vi-VN')} VND` : "Chưa chọn"}</p>
                      <p><span className="font-semibold">Khu vực:</span> {form.preferredDistrict || "Không ưu tiên"}</p>
                      <p><span className="font-semibold">Lối sống:</span> {form.lifestyleArchetype || "Chưa chọn"}</p>
                      <p><span className="font-semibold">Độ sạch sẽ:</span> {form.priorityCleanliness}/5</p>
                      <p><span className="font-semibold">Môi trường:</span> {form.prioritySocialEnvironment}/5</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-12 pt-8 border-t border-slate-200">
                <button
                  type="button" // Đảm bảo là button, không submit
                  onClick={handlePrev}
                  disabled={currentStep === 1}
                  className="flex-1 px-6 py-4 rounded-xl font-bold uppercase tracking-wide text-slate-600 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  ← Quay lại
                </button>

                {currentStep < totalSteps ? (
                  <button
                    type="button" // Quan trọng: type="button" để không trigger submit form
                    onClick={handleNext}
                    className="flex-1 px-6 py-4 rounded-xl font-bold uppercase tracking-wide text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition shadow-lg shadow-orange-500/30"
                  >
                    Tiếp tục →
                  </button>
                ) : (
                  <button
                    type="submit" // Chỉ nút cuối cùng mới là type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-4 rounded-xl font-bold uppercase tracking-wide text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-500/30"
                  >
                    {loading ? " Đang lưu..." : " Tìm phòng ngay"}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Tips */}
          <div className="mt-8 p-6 bg-slate-900/5 rounded-xl">
            <p className="text-sm text-slate-600 text-center">
              <span className="font-semibold">Ghi chú:</span> Thông tin này sẽ giúp chúng tôi tìm được phòng phù hợp nhất với bạn. Bạn có thể cập nhật bất cứ lúc nào.
            </p>
          </div>
        </div>
      </div>
      )}
      <Footer />
    </>
  );
}