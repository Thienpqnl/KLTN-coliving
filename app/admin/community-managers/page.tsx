"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Plus, Save, Trash2, UsersRound } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type ServiceRegion = "NORTH" | "CENTRAL" | "SOUTH";

type ManagerArea = {
  id?: string;
  region?: ServiceRegion | null;
  city?: string | null;
  provinceCode?: string | null;
  ward?: string | null;
  wardCode?: string | null;
  district?: string | null;
  districtId?: string | null;
  isActive: boolean;
};

type CommunityManager = {
  id: string;
  name?: string | null;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  status: string;
  communityManagerAreas: ManagerArea[];
  _count?: { managedRoomVerifications: number };
};

const regionLabels: Record<ServiceRegion, string> = {
  NORTH: "Miền Bắc",
  CENTRAL: "Miền Trung",
  SOUTH: "Miền Nam",
};

const provincesByRegion: Record<ServiceRegion, string[]> = {
  NORTH: [
    "Hà Nội",
    "Lai Châu",
    "Điện Biên",
    "Sơn La",
    "Cao Bằng",
    "Lạng Sơn",
    "Quảng Ninh",
    "Tuyên Quang",
    "Lào Cai",
    "Thái Nguyên",
    "Phú Thọ",
    "Bắc Ninh",
    "Hưng Yên",
    "Hải Phòng",
    "Ninh Bình",
  ],
  CENTRAL: [
    "Thanh Hóa",
    "Nghệ An",
    "Hà Tĩnh",
    "Quảng Trị",
    "Huế",
    "Đà Nẵng",
    "Quảng Ngãi",
    "Gia Lai",
    "Khánh Hòa",
    "Lâm Đồng",
    "Đắk Lắk",
  ],
  SOUTH: [
    "Hồ Chí Minh",
    "Đồng Nai",
    "Tây Ninh",
    "Cần Thơ",
    "Vĩnh Long",
    "Đồng Tháp",
    "Cà Mau",
    "An Giang",
  ],
};

const vietnamProvinces = Object.values(provincesByRegion).flat();

const emptyArea = (): ManagerArea => ({
  region: null,
  city: "",
  provinceCode: "",
  ward: "",
  wardCode: "",
  district: "",
  districtId: "",
  isActive: true,
});

export default function CommunityManagersPage() {
  const { token } = useAuth();
  const [managers, setManagers] = useState<CommunityManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const loadManagers = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/community-manager-areas", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không thể tải danh sách nhân viên");
        setManagers(result.data || []);
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không thể tải danh sách nhân viên");
      } finally {
        setLoading(false);
      }
    };

    loadManagers();
  }, [token]);

  const updateArea = (managerId: string, index: number, patch: Partial<ManagerArea>) => {
    setManagers((current) =>
      current.map((manager) =>
        manager.id === managerId
          ? {
              ...manager,
              communityManagerAreas: manager.communityManagerAreas.map((area, areaIndex) =>
                areaIndex === index ? { ...area, ...patch } : area
              ),
            }
          : manager
      )
    );
  };

  const addArea = (managerId: string) => {
    setManagers((current) =>
      current.map((manager) =>
        manager.id === managerId
          ? { ...manager, communityManagerAreas: [...manager.communityManagerAreas, emptyArea()] }
          : manager
      )
    );
  };

  const removeArea = (managerId: string, index: number) => {
    setManagers((current) =>
      current.map((manager) =>
        manager.id === managerId
          ? {
              ...manager,
              communityManagerAreas: manager.communityManagerAreas.filter((_, areaIndex) => areaIndex !== index),
            }
          : manager
      )
    );
  };

  const saveAreas = async (manager: CommunityManager) => {
    if (!token) return;
    setSavingId(manager.id);
    setMessage("");
    setError("");
    try {
      const areas = manager.communityManagerAreas.map((area) => ({
        region: area.region || null,
        city: area.city?.trim() || null,
        provinceCode: area.provinceCode?.trim() || null,
        ward: area.ward?.trim() || null,
        wardCode: area.wardCode?.trim() || null,
        district: area.district?.trim() || null,
        districtId: area.districtId?.trim() || null,
        isActive: area.isActive,
      }));

      const response = await fetch(`/api/admin/community-manager-areas/${manager.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ areas }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể lưu khu vực phụ trách");

      setManagers((current) =>
        current.map((item) =>
          item.id === manager.id
            ? { ...item, communityManagerAreas: result.data?.communityManagerAreas || [] }
            : item
        )
      );
      setMessage("Đã cập nhật khu vực phụ trách");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu khu vực phụ trách");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-sky-50 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
            <UsersRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900">Phân vùng nhân viên quản lý cộng đồng</h2>
            <p className="text-sm text-slate-600">Mỗi nhân viên chỉ xử lý hồ sơ thuộc khu vực được phân công.</p>
          </div>
        </div>
      </div>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {managers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có tài khoản Community Manager.
        </div>
      ) : (
        <div className="space-y-4">
          {managers.map((manager) => (
            <section key={manager.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{manager.fullName || manager.name || manager.email}</h3>
                  <p className="text-sm text-slate-500">{manager.email}{manager.phone ? ` - ${manager.phone}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {manager.status}
                  </span>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                    {manager._count?.managedRoomVerifications || 0} hồ sơ đang xử lý
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {manager.communityManagerAreas.map((area, index) => {
                  const provinceOptions = area.region ? provincesByRegion[area.region] : vietnamProvinces;

                  return (
                  <div key={area.id || index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Vùng miền</span>
                        <select
                          value={area.region || ""}
                          onChange={(event) => updateArea(manager.id, index, {
                            region: (event.target.value || null) as ServiceRegion | null,
                            city: "",
                            provinceCode: "",
                          })}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                        >
                          <option value="">Toàn quốc</option>
                          {Object.entries(regionLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tỉnh/Thành phố</span>
                        <select
                          value={area.city || ""}
                          onChange={(event) => updateArea(manager.id, index, { city: event.target.value })}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                        >
                          <option value="">Chọn tỉnh/thành</option>
                          {provinceOptions.map((province) => (
                            <option key={province} value={province}>
                              {province}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Phường/Xã/Đặc khu</span>
                        <input
                          value={area.ward || ""}
                          onChange={(event) => updateArea(manager.id, index, { ward: event.target.value })}
                          placeholder="Nhập phường/xã"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái</span>
                        <span className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
                          <input
                            type="checkbox"
                            checked={area.isActive}
                            onChange={(event) => updateArea(manager.id, index, { isActive: event.target.checked })}
                            className="accent-orange-600"
                          />
                          Đang áp dụng
                        </span>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mã tỉnh/thành</span>
                        <input
                          value={area.provinceCode || ""}
                          onChange={(event) => updateArea(manager.id, index, { provinceCode: event.target.value })}
                          placeholder="Không bắt buộc"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mã phường/xã</span>
                        <input
                          value={area.wardCode || ""}
                          onChange={(event) => updateArea(manager.id, index, { wardCode: event.target.value })}
                          placeholder="Không bắt buộc"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Quận/Huyện cũ</span>
                        <input
                          value={area.district || ""}
                          onChange={(event) => updateArea(manager.id, index, { district: event.target.value })}
                          placeholder="Dữ liệu cũ"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mã quận/huyện cũ</span>
                        <input
                          value={area.districtId || ""}
                          onChange={(event) => updateArea(manager.id, index, { districtId: event.target.value })}
                          placeholder="Không bắt buộc"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeArea(manager.id, index)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-3 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa khu vực
                      </button>
                    </div>
                  </div>
                  );
                })}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => addArea(manager.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-100"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm khu vực
                  </button>
                  <button
                    type="button"
                    onClick={() => saveAreas(manager)}
                    disabled={savingId === manager.id}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingId === manager.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Lưu phân công
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Khi chủ nhà gửi phòng xét duyệt, hệ thống ưu tiên khớp theo mã phường/xã, phường/xã,
            mã tỉnh/thành, tỉnh/thành rồi đến vùng Bắc/Trung/Nam. Quận/huyện cũ chỉ dùng làm dữ liệu
            tương thích khi Google Maps hoặc phòng cũ vẫn trả về địa chỉ theo mô hình cũ.
          </p>
        </div>
      </div>
    </div>
  );
}
