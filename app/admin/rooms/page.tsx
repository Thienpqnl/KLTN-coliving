"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, CheckCircle2, ExternalLink, Loader2, MapPin, Search, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type RoomStatus = "DRAFT" | "PENDING" | "NEEDS_REVISION" | "AVAILABLE" | "REJECTED" | "HIDDEN" | "OCCUPIED";
type Checklist = {
  identityPassed: boolean;
  ownershipPassed: boolean;
  addressPassed: boolean;
  imagesPassed: boolean;
  detailsPassed: boolean;
};
type RoomDocument = { id: string; type: string; fileUrl: string; status: string; note?: string | null };
type AdminRoom = {
  id: string;
  title: string;
  description: string;
  address: string;
  status: RoomStatus;
  priceValue?: number | string | null;
  areaText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  owner?: { fullName?: string | null; name?: string | null; email: string; phone?: string | null } | null;
  images: { id: string; url: string }[];
  verification?: (Checklist & {
    submittedAt?: string | null;
    reviewedAt?: string | null;
    revisionReason?: string | null;
    rejectionReason?: string | null;
    adminNote?: string | null;
    informationAccurateConfirmed: boolean;
    legalResponsibilityAccepted: boolean;
    verificationConsentAccepted: boolean;
    declarationAcceptedAt?: string | null;
    declarationVersion?: string | null;
    declarationIpAddress?: string | null;
    declarationUserAgent?: string | null;
    documents: RoomDocument[];
  }) | null;
};

const emptyChecklist: Checklist = {
  identityPassed: false,
  ownershipPassed: false,
  addressPassed: false,
  imagesPassed: false,
  detailsPassed: false,
};

const statusLabels: Record<RoomStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Chờ duyệt",
  NEEDS_REVISION: "Cần bổ sung",
  AVAILABLE: "Đã duyệt",
  REJECTED: "Từ chối",
  HIDDEN: "Đang ẩn",
  OCCUPIED: "Đã đủ người",
};

const documentLabels: Record<string, string> = {
  IDENTITY: "Danh tính chủ nhà",
  OWNERSHIP: "Quyền cho thuê",
  ADDRESS: "Địa chỉ",
  ROOM_PROOF: "Phòng thực tế",
  OTHER: "Tài liệu khác",
};

const checklistLabels: Record<keyof Checklist, string> = {
  identityPassed: "Danh tính chủ nhà hợp lệ",
  ownershipPassed: "Có quyền sở hữu hoặc cho thuê",
  addressPassed: "Địa chỉ và tọa độ khớp",
  imagesPassed: "Hình ảnh đúng với phòng",
  detailsPassed: "Giá, diện tích và mô tả hợp lý",
};

export default function AdminRoomsPage() {
  const { token } = useAuth();
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [selected, setSelected] = useState<AdminRoom | null>(null);
  const [status, setStatus] = useState<RoomStatus | "ALL">("PENDING");
  const [search, setSearch] = useState("");
  const [checklist, setChecklist] = useState<Checklist>(emptyChecklist);
  const [reason, setReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadRooms = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (status !== "ALL") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/admin/rooms?${params}`, {
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
  }, [search, status, token]);

  useEffect(() => {
    const timer = window.setTimeout(loadRooms, 250);
    return () => window.clearTimeout(timer);
  }, [loadRooms]);

  const selectRoom = async (roomId: string) => {
    if (!token) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tải chi tiết phòng");
      const room = result.data as AdminRoom;
      setSelected(room);
      setChecklist({
        identityPassed: room.verification?.identityPassed || false,
        ownershipPassed: room.verification?.ownershipPassed || false,
        addressPassed: room.verification?.addressPassed || false,
        imagesPassed: room.verification?.imagesPassed || false,
        detailsPassed: room.verification?.detailsPassed || false,
      });
      setReason(room.verification?.revisionReason || room.verification?.rejectionReason || "");
      setAdminNote(room.verification?.adminNote || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải chi tiết phòng");
    } finally {
      setBusy(false);
    }
  };

  const review = async (action: "approve" | "request_revision" | "reject" | "hide") => {
    if (!selected || !token) return;
    if (action !== "approve" && !reason.trim()) {
      setError("Vui lòng nhập lý do trước khi thực hiện");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/rooms/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ action, reason: reason.trim() || undefined, adminNote: adminNote.trim() || undefined, checklist }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật phòng");
      setSelected(null);
      setReason("");
      setAdminNote("");
      await loadRooms();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật phòng");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo phòng, địa chỉ hoặc chủ nhà" className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-red-100" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value as RoomStatus | "ALL")} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold">
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-secondary/50 px-5 py-4"><h2 className="font-bold">Danh sách phòng</h2></div>
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-600" /></div>
          ) : rooms.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Không có phòng phù hợp</div>
          ) : (
            <div className="divide-y divide-border">
              {rooms.map((room) => (
                <button key={room.id} type="button" onClick={() => selectRoom(room.id)} className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-red-50/50">
                  <div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
                    {room.images[0] ? <img src={room.images[0].url} alt={room.title} className="h-full w-full object-cover" /> : <Building2 className="text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">{room.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{room.owner?.fullName || room.owner?.name || room.owner?.email}</p>
                    <p className="mt-1 text-xs font-semibold text-red-700">{statusLabels[room.status]}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-8 lg:self-start">
          {!selected ? (
            <div className="py-16 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-semibold">Chọn một phòng để xét duyệt</p></div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-black">{selected.title}</h2><span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">{statusLabels[selected.status]}</span></div>
                <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{selected.address}</p>
                <p className="mt-2 text-sm"><strong>Chủ nhà:</strong> {selected.owner?.fullName || selected.owner?.name} · {selected.owner?.email} · {selected.owner?.phone || "Chưa có SĐT"}</p>
                <p className="mt-2 text-sm"><strong>Giá:</strong> {Number(selected.priceValue || 0).toLocaleString("vi-VN")} đ · <strong>Diện tích:</strong> {selected.areaText || "Chưa cập nhật"}</p>
              </div>

              <p className="rounded-xl bg-secondary/60 p-4 text-sm leading-relaxed">{selected.description}</p>

              <div className="grid grid-cols-3 gap-2">
                {selected.images.map((image) => <img key={image.id} src={image.url} alt={selected.title} className="aspect-square w-full rounded-xl object-cover" />)}
              </div>

              <div>
                <h3 className="mb-2 font-bold">Tài liệu minh chứng</h3>
                <div className="space-y-2">
                  {(selected.verification?.documents || []).map((document) => (
                    <a key={document.id} href={document.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-border p-3 text-sm font-semibold hover:bg-secondary">
                      {documentLabels[document.type] || document.type}<ExternalLink className="h-4 w-4" />
                    </a>
                  ))}
                  {!selected.verification?.documents?.length && <p className="text-sm text-red-600">Chưa có tài liệu</p>}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-bold text-amber-950">Cam kết của chủ nhà</h3>
                <ul className="mt-3 space-y-2 text-sm text-amber-900">
                  <li>• Thông tin đúng sự thật: {selected.verification?.informationAccurateConfirmed ? "Đã xác nhận" : "Chưa xác nhận"}</li>
                  <li>• Trách nhiệm pháp lý: {selected.verification?.legalResponsibilityAccepted ? "Đã chấp nhận" : "Chưa chấp nhận"}</li>
                  <li>• Đồng ý xác minh: {selected.verification?.verificationConsentAccepted ? "Đã đồng ý" : "Chưa đồng ý"}</li>
                </ul>
                {selected.verification?.declarationAcceptedAt && (
                  <div className="mt-3 border-t border-amber-200 pt-3 text-xs leading-relaxed text-amber-800">
                    <p>Thời điểm: {new Date(selected.verification.declarationAcceptedAt).toLocaleString("vi-VN")}</p>
                    <p>Phiên bản: {selected.verification.declarationVersion || "Không xác định"}</p>
                    <p>IP: {selected.verification.declarationIpAddress || "Không ghi nhận"}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {Object.entries(checklistLabels).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 hover:bg-secondary/50">
                    <input type="checkbox" checked={checklist[key as keyof Checklist]} onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-red-600" />
                    <span className="text-sm font-semibold">{label}</span>
                  </label>
                ))}
              </div>

              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Lý do khi yêu cầu bổ sung, từ chối hoặc ẩn phòng" className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-red-100" />
              <textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={2} placeholder="Ghi chú nội bộ của admin" className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-red-100" />

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => review("approve")} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Phê duyệt</button>
                <button onClick={() => review("request_revision")} disabled={busy} className="rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-amber-400 disabled:opacity-50">Yêu cầu bổ sung</button>
                <button onClick={() => review("reject")} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"><XCircle className="h-4 w-4" />Từ chối</button>
                <button onClick={() => review("hide")} disabled={busy} className="rounded-xl bg-slate-800 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50">Ẩn phòng</button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
