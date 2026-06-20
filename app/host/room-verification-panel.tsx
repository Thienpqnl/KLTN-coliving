"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, Loader2, Send, Trash2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";

type RoomStatus = "DRAFT" | "PENDING" | "NEEDS_REVISION" | "AVAILABLE" | "REJECTED" | "HIDDEN" | "OCCUPIED";
type DocumentType = "IDENTITY" | "OWNERSHIP" | "ADDRESS" | "ROOM_PROOF" | "OTHER";

type VerificationDocument = {
  id: string;
  type: DocumentType;
  fileUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note?: string | null;
};

type VerificationPayload = {
  status: RoomStatus;
  verification?: {
    revisionReason?: string | null;
    rejectionReason?: string | null;
    documents: VerificationDocument[];
  } | null;
};

const documentLabels: Record<DocumentType, string> = {
  IDENTITY: "Giấy tờ xác minh danh tính",
  OWNERSHIP: "Giấy tờ chứng minh quyền cho thuê",
  ADDRESS: "Minh chứng địa chỉ",
  ROOM_PROOF: "Minh chứng phòng thực tế",
  OTHER: "Tài liệu khác",
};

const statusLabels: Record<RoomStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Đang chờ admin duyệt",
  NEEDS_REVISION: "Cần bổ sung",
  AVAILABLE: "Đã duyệt và công khai",
  REJECTED: "Đã từ chối",
  HIDDEN: "Đang bị ẩn",
  OCCUPIED: "Đã thuê",
};

export function RoomVerificationPanel({ roomId }: { roomId: string }) {
  const [payload, setPayload] = useState<VerificationPayload | null>(null);
  const [type, setType] = useState<DocumentType>("IDENTITY");
  const [fileUrl, setFileUrl] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setPayload(await apiClient.get<VerificationPayload>(`/host/rooms/${roomId}/verification`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải hồ sơ xác minh");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const addDocument = async () => {
    if (!fileUrl.trim()) return setError("Vui lòng nhập URL tài liệu");
    setBusy(true);
    try {
      await apiClient.post(`/host/rooms/${roomId}/verification/documents`, {
        type,
        fileUrl: fileUrl.trim(),
        note: note.trim() || undefined,
      });
      setFileUrl("");
      setNote("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể thêm tài liệu");
    } finally {
      setBusy(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    setBusy(true);
    try {
      await apiClient.delete(`/host/rooms/${roomId}/verification/documents/${documentId}`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa tài liệu");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await apiClient.post(`/host/rooms/${roomId}/submit`, {});
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không thể gửi xét duyệt");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center rounded-[2rem] border border-orange-100 bg-white/80 p-8"><Loader2 className="animate-spin text-orange-600" /></div>;
  }

  const editable = payload && ["DRAFT", "NEEDS_REVISION", "REJECTED"].includes(payload.status);
  const reason = payload?.verification?.revisionReason || payload?.verification?.rejectionReason;

  return (
    <section className="space-y-5 rounded-[2rem] border border-orange-100 bg-white/90 p-6 shadow-xl shadow-orange-100/60">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
          <FileCheck2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black text-slate-950">Xác minh và xét duyệt</h2>
          <p className="mt-1 text-sm font-semibold text-orange-700">{payload ? statusLabels[payload.status] : "Chưa có dữ liệu"}</p>
        </div>
      </div>

      {reason && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Phản hồi từ admin:</strong> {reason}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="space-y-2">
        {(payload?.verification?.documents || []).map((document) => (
          <div key={document.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <a href={document.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 hover:text-orange-700">
              {documentLabels[document.type]}
            </a>
            {editable && (
              <button type="button" onClick={() => deleteDocument(document.id)} disabled={busy} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Xóa tài liệu">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {editable && (
        <div className="space-y-3 border-t border-orange-100 pt-5">
          <select value={type} onChange={(event) => setType(event.target.value as DocumentType)} className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100">
            {Object.entries(documentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="URL tài liệu trong kho lưu trữ riêng" className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú tài liệu (không bắt buộc)" className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
          <button type="button" onClick={addDocument} disabled={busy} className="w-full rounded-full border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-50">Thêm minh chứng</button>
          <button type="button" onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-100 hover:from-orange-500 hover:to-amber-400 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gửi admin xét duyệt
          </button>
        </div>
      )}

      <p className="text-xs leading-relaxed text-slate-500">Giấy tờ danh tính và quyền cho thuê phải được lưu trong kho riêng có kiểm soát truy cập. Không dùng liên kết ảnh phòng công khai cho tài liệu nhạy cảm.</p>
    </section>
  );
}
