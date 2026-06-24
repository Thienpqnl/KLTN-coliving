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
  _count: { images: number };
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
  OCCUPIED: "Đã đủ người",
};

export function RoomVerificationPanel({ roomId }: { roomId: string }) {
  const [payload, setPayload] = useState<VerificationPayload | null>(null);
  const [type, setType] = useState<DocumentType>("IDENTITY");
  const [fileUrl, setFileUrl] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [declarations, setDeclarations] = useState({
    informationAccurateConfirmed: false,
    legalResponsibilityAccepted: false,
    verificationConsentAccepted: false,
  });

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
    if (missingRequirements.length > 0) {
      setError(`Chưa thể gửi xét duyệt: ${missingRequirements.join(", ")}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiClient.post(`/host/rooms/${roomId}/submit`, declarations);
      await load();
    } catch (cause) {
      if (cause instanceof ApiError) {
        const details = cause.errors ? Object.values(cause.errors).flat().join("; ") : "";
        setError(details ? `${cause.message}: ${details}` : cause.message);
      } else {
        setError("Không thể gửi xét duyệt");
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center rounded-[2rem] border border-orange-100 bg-white/80 p-8"><Loader2 className="animate-spin text-orange-600" /></div>;
  }

  const editable = payload && ["DRAFT", "NEEDS_REVISION", "REJECTED"].includes(payload.status);
  const reason = payload?.verification?.revisionReason || payload?.verification?.rejectionReason;
  const documentTypes = new Set(payload?.verification?.documents.map((document) => document.type) || []);
  const missingRequirements = [
    ...(payload && payload._count.images < 3 ? [`cần thêm ${3 - payload._count.images} ảnh phòng`] : []),
    ...(!documentTypes.has("IDENTITY") ? ["thiếu minh chứng danh tính"] : []),
    ...(!documentTypes.has("OWNERSHIP") ? ["thiếu minh chứng quyền cho thuê"] : []),
    ...(!documentTypes.has("ROOM_PROOF") ? ["thiếu minh chứng phòng thực tế"] : []),
    ...(!declarations.informationAccurateConfirmed ? ["chưa cam kết thông tin chính xác"] : []),
    ...(!declarations.legalResponsibilityAccepted ? ["chưa chấp nhận trách nhiệm pháp lý"] : []),
    ...(!declarations.verificationConsentAccepted ? ["chưa đồng ý quy trình xác minh"] : []),
  ];

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

      {editable && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-800">Điều kiện gửi xét duyệt</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className={payload && payload._count.images >= 3 ? "text-emerald-700" : "text-red-600"}>• Ảnh phòng: {payload?._count.images || 0}/3 ảnh tối thiểu</li>
            <li className={documentTypes.has("IDENTITY") ? "text-emerald-700" : "text-red-600"}>• Minh chứng danh tính chủ nhà</li>
            <li className={documentTypes.has("OWNERSHIP") ? "text-emerald-700" : "text-red-600"}>• Minh chứng quyền sở hữu hoặc cho thuê</li>
            <li className={documentTypes.has("ROOM_PROOF") ? "text-emerald-700" : "text-red-600"}>• Minh chứng phòng tồn tại thực tế</li>
          </ul>
        </div>
      )}

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

          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-sm font-black text-amber-950">Cam kết của chủ nhà</p>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
              <input
                type="checkbox"
                checked={declarations.informationAccurateConfirmed}
                onChange={(event) => setDeclarations((current) => ({ ...current, informationAccurateConfirmed: event.target.checked }))}
                className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
              />
              <span>Tôi cam kết toàn bộ thông tin, hình ảnh và tài liệu cung cấp là đầy đủ, chính xác và đúng sự thật.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
              <input
                type="checkbox"
                checked={declarations.legalResponsibilityAccepted}
                onChange={(event) => setDeclarations((current) => ({ ...current, legalResponsibilityAccepted: event.target.checked }))}
                className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
              />
              <span>Tôi xác nhận mình có quyền sở hữu hoặc quyền cho thuê hợp pháp và chịu trách nhiệm trước pháp luật về nội dung đã khai báo.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
              <input
                type="checkbox"
                checked={declarations.verificationConsentAccepted}
                onChange={(event) => setDeclarations((current) => ({ ...current, verificationConsentAccepted: event.target.checked }))}
                className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
              />
              <span>Tôi đồng ý để hệ thống và admin kiểm tra, đối chiếu thông tin, tài liệu nhằm phục vụ quy trình xác minh phòng.</span>
            </label>
            <p className="text-xs leading-relaxed text-amber-800">Hệ thống sẽ lưu thời điểm xác nhận, phiên bản cam kết và thông tin kỹ thuật của lần gửi để phục vụ kiểm tra, giải quyết khiếu nại.</p>
          </div>

          <button type="button" onClick={submit} disabled={busy || missingRequirements.length > 0} title={missingRequirements.join(", ")} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-100 hover:from-orange-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gửi admin xét duyệt
          </button>
        </div>
      )}

      <p className="text-xs leading-relaxed text-slate-500">Giấy tờ danh tính và quyền cho thuê phải được lưu trong kho riêng có kiểm soát truy cập. Không dùng liên kết ảnh phòng công khai cho tài liệu nhạy cảm.</p>
    </section>
  );
}
