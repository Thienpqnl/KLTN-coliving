"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ExternalLink, Loader2, MapPin, Search, XCircle } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type RoomStatus = "PENDING" | "NEEDS_REVISION" | "AVAILABLE" | "REJECTED" | "HIDDEN" | "DRAFT" | "OCCUPIED";
type Checklist = {
  identityPassed: boolean;
  ownershipPassed: boolean;
  addressPassed: boolean;
  imagesPassed: boolean;
  detailsPassed: boolean;
  facilityPassed: boolean;
  safetyPassed: boolean;
  legalOccupancyPassed: boolean;
};
type RoomDocument = { id: string; type: string; fileUrl: string; status: string; note?: string | null };
type VerificationCheckStatus = "PENDING" | "MATCHED" | "MISMATCHED" | "NEEDS_REVIEW" | "UNVERIFIABLE";
type VerificationCheck = {
  id: string;
  type: string;
  status: VerificationCheckStatus;
  sourceValue?: string | null;
  targetValue?: string | null;
  note?: string | null;
  checkedAt?: string | null;
};
type ManagedRoom = {
  id: string;
  title: string;
  description: string;
  address: string;
  status: RoomStatus;
  priceValue?: number | string | null;
  areaText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  owner?: { fullName?: string | null; name?: string | null; email: string; phone?: string | null; phoneVerified?: boolean } | null;
  images: { id: string; url: string }[];
  verification?: (Checklist & {
    managerRecommendation?: string;
    managerNote?: string | null;
    inspectionDate?: string | null;
    inspectionImages?: string[] | null;
    documents: RoomDocument[];
    checks?: VerificationCheck[];
  }) | null;
};

const emptyChecklist: Checklist = {
  identityPassed: false,
  ownershipPassed: false,
  addressPassed: false,
  imagesPassed: false,
  detailsPassed: false,
  facilityPassed: false,
  safetyPassed: false,
  legalOccupancyPassed: false,
};

const checklistLabels: Record<keyof Checklist, string> = {
  identityPassed: "Danh tính/chủ thể cho thuê hợp lệ",
  ownershipPassed: "Có giấy tờ chứng minh quyền cho thuê",
  addressPassed: "Địa chỉ và vị trí bản đồ khớp thực tế",
  imagesPassed: "Ảnh phòng đúng với hiện trạng",
  detailsPassed: "Giá, diện tích và mô tả hợp lý",
  facilityPassed: "Cơ sở vật chất đạt yêu cầu",
  safetyPassed: "Không gian an toàn, sạch sẽ",
  legalOccupancyPassed: "Việc chia sẻ/cho thuê là hợp pháp",
};

const documentLabels: Record<string, string> = {
  IDENTITY: "Danh tính chủ nhà",
  OWNERSHIP: "Quyền cho thuê",
  ADDRESS: "Địa chỉ",
  ROOM_PROOF: "Phòng thực tế",
  OTHER: "Tài liệu khác",
};

const checkLabels: Record<string, string> = {
  OWNER_PHONE: "Số điện thoại chủ nhà",
  OWNER_IDENTITY_DOCUMENT: "Danh tính chủ nhà",
  OWNERSHIP_DOCUMENT: "Quyền cho thuê/sở hữu",
  ROOM_ADDRESS: "Địa chỉ phòng",
  MAP_LOCATION: "Vị trí bản đồ",
  ROOM_IMAGES: "Ảnh phòng",
  LEGAL_DECLARATION: "Cam kết pháp lý",
  ROOM_DETAILS: "Thông tin phòng",
};

const checkStatusLabels: Record<VerificationCheckStatus, string> = {
  PENDING: "Chờ kiểm tra",
  MATCHED: "Khớp",
  MISMATCHED: "Không khớp",
  NEEDS_REVIEW: "Cần xem xét",
  UNVERIFIABLE: "Không xác minh được",
};

export default function CommunityManagerPage() {
  const { token } = useAuth();
  const [rooms, setRooms] = useState<ManagedRoom[]>([]);
  const [selected, setSelected] = useState<ManagedRoom | null>(null);
  const [checklist, setChecklist] = useState<Checklist>(emptyChecklist);
  const [search, setSearch] = useState("");
  const [managerNote, setManagerNote] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionImagesText, setInspectionImagesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingCheckId, setSavingCheckId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const inspectionImages = useMemo(
    () => inspectionImagesText.split("\n").map((url) => url.trim()).filter(Boolean),
    [inspectionImagesText]
  );

  const loadRooms = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", status: "PENDING" });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/community-manager/rooms?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tải danh sách phòng");
      setRooms(result.data?.rooms || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải danh sách phòng");
    } finally {
      setLoading(false);
    }
  }, [search, token]);

  useEffect(() => {
    const timer = window.setTimeout(loadRooms, 250);
    return () => window.clearTimeout(timer);
  }, [loadRooms]);

  const selectRoom = async (roomId: string) => {
    if (!token) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/community-manager/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tải chi tiết phòng");
      const room = result.data as ManagedRoom;
      setSelected(room);
      setChecklist({
        identityPassed: room.verification?.identityPassed || false,
        ownershipPassed: room.verification?.ownershipPassed || false,
        addressPassed: room.verification?.addressPassed || false,
        imagesPassed: room.verification?.imagesPassed || false,
        detailsPassed: room.verification?.detailsPassed || false,
        facilityPassed: room.verification?.facilityPassed || false,
        safetyPassed: room.verification?.safetyPassed || false,
        legalOccupancyPassed: room.verification?.legalOccupancyPassed || false,
      });
      setManagerNote(room.verification?.managerNote || "");
      setInspectionDate(room.verification?.inspectionDate ? room.verification.inspectionDate.slice(0, 10) : "");
      setInspectionImagesText((room.verification?.inspectionImages || []).join("\n"));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải chi tiết phòng");
    } finally {
      setBusy(false);
    }
  };

  const review = async (action: "recommend_approval" | "request_revision" | "recommend_rejection") => {
    if (!selected || !token) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/community-manager/rooms/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({
          action,
          checklist,
          managerNote: managerNote.trim() || undefined,
          inspectionDate: inspectionDate || undefined,
          inspectionImages: inspectionImages.length ? inspectionImages : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật kết quả xác minh");
      setSelected(null);
      setManagerNote("");
      setInspectionDate("");
      setInspectionImagesText("");
      await loadRooms();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật kết quả xác minh");
    } finally {
      setBusy(false);
    }
  };

  const updateCheck = (checkId: string, patch: Partial<VerificationCheck>) => {
    setSelected((current) => {
      if (!current?.verification) return current;
      return {
        ...current,
        verification: {
          ...current.verification,
          checks: (current.verification.checks || []).map((check) =>
            check.id === checkId ? { ...check, ...patch } : check
          ),
        },
      };
    });
  };

  const saveCheck = async (check: VerificationCheck) => {
    if (!selected || !token) return;
    setSavingCheckId(check.id);
    try {
      const response = await fetch(`/api/community-manager/rooms/${selected.id}/checks/${check.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ status: check.status, note: check.note || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật tiêu chí đối khớp");
      updateCheck(check.id, result.data as VerificationCheck);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật tiêu chí đối khớp");
    } finally {
      setSavingCheckId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo phòng, địa chỉ hoặc chủ nhà"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.9fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-black">Hồ sơ chờ xác minh</h2>
          </div>
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-orange-600" /></div>
          ) : rooms.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">Không có hồ sơ phù hợp</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rooms.map((room) => (
                <button key={room.id} type="button" onClick={() => selectRoom(room.id)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-orange-50/50">
                  <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                    {room.images[0] ? <img src={room.images[0].url} alt={room.title} className="h-full w-full object-cover" /> : <Building2 className="text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{room.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{room.owner?.fullName || room.owner?.name || room.owner?.email}</p>
                    <p className="mt-1 text-xs font-bold text-orange-700">{room.verification?.managerRecommendation || "PENDING"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-8 xl:self-start">
          {!selected ? (
            <div className="py-16 text-center text-slate-500">Chọn một hồ sơ để xác minh</div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black">{selected.title}</h2>
                <p className="mt-2 flex gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 shrink-0" />{selected.address}</p>
                <p className="mt-2 text-sm"><strong>Chủ nhà:</strong> {selected.owner?.fullName || selected.owner?.name} - {selected.owner?.phone || "Chưa có SĐT"} {selected.owner?.phoneVerified ? "(đã xác minh SĐT)" : "(chưa xác minh SĐT)"}</p>
              </div>

              <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed">{selected.description}</p>

              <div className="grid grid-cols-3 gap-2">
                {selected.images.map((image) => <img key={image.id} src={image.url} alt={selected.title} className="aspect-square w-full rounded-xl object-cover" />)}
              </div>

              <div>
                <h3 className="mb-2 font-black">Giấy tờ minh chứng</h3>
                <div className="space-y-2">
                  {(selected.verification?.documents || []).map((document) => (
                    <a key={document.id} href={document.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-bold hover:bg-slate-50">
                      {documentLabels[document.type] || document.type}<ExternalLink className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-black">Tra cứu & đối khớp hồ sơ</h3>
                <div className="space-y-3">
                  {(selected.verification?.checks || []).map((check) => (
                    <div key={check.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-900">{checkLabels[check.type] || check.type}</p>
                          <p className="mt-1 text-xs text-slate-500">Nguồn: {check.sourceValue || "Chưa có dữ liệu"}</p>
                          <p className="mt-1 text-xs text-slate-500">Đối chiếu: {check.targetValue || "Chưa có dữ liệu"}</p>
                        </div>
                        <select
                          value={check.status}
                          onChange={(event) => updateCheck(check.id, { status: event.target.value as VerificationCheckStatus })}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100"
                        >
                          {Object.entries(checkStatusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={check.note || ""}
                        onChange={(event) => updateCheck(check.id, { note: event.target.value })}
                        rows={2}
                        placeholder="Ghi chú kết quả đối khớp"
                        className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => saveCheck(check)}
                          disabled={savingCheckId === check.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingCheckId === check.id && <Loader2 className="h-3 w-3 animate-spin" />}
                          Lưu đối khớp
                        </button>
                      </div>
                    </div>
                  ))}
                  {(selected.verification?.checks || []).length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                      Chưa có tiêu chí đối khớp cho hồ sơ này.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                {Object.entries(checklistLabels).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                    <input type="checkbox" checked={checklist[key as keyof Checklist]} onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-orange-600" />
                    <span className="text-sm font-bold">{label}</span>
                  </label>
                ))}
              </div>

              <input type="date" value={inspectionDate} onChange={(event) => setInspectionDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
              <textarea value={inspectionImagesText} onChange={(event) => setInspectionImagesText(event.target.value)} rows={3} placeholder="URL ảnh xác minh thực địa, mỗi dòng một ảnh" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
              <textarea value={managerNote} onChange={(event) => setManagerNote(event.target.value)} rows={4} placeholder="Ghi chú kiểm tra hồ sơ, giấy tờ, thực địa và hướng dẫn cư dân/chủ nhà" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-orange-100" />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button onClick={() => review("recommend_approval")} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Đề xuất duyệt</button>
                <button onClick={() => review("request_revision")} disabled={busy} className="rounded-xl bg-amber-500 px-3 py-3 text-sm font-black text-white hover:bg-amber-400 disabled:opacity-50">Cần bổ sung</button>
                <button onClick={() => review("recommend_rejection")} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-black text-white hover:bg-red-500 disabled:opacity-50"><XCircle className="h-4 w-4" />Đề xuất từ chối</button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
