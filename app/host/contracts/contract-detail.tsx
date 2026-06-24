"use client";

import { useState } from "react";
import Link from "next/link";
import { ContractStatus } from "@prisma/client";
import { AlertCircle, CalendarDays, Check, Circle, FileCheck2, Handshake, KeyRound, Loader2, MapPin, Printer, ReceiptText, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contractClient, ContractData } from "@/lib/services/contract-client.service";
import { formatRoomArea } from "@/lib/format-room-area";

interface ContractDetailProps {
  contract: ContractData;
  isHost: boolean;
  onRenew?: () => void;
  onTerminate?: () => void;
  onChanged?: (contract: ContractData) => void;
}

const statusLabels: Record<ContractStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_HOST_SIGNATURE: "Chờ chủ nhà ký",
  PENDING_RENTER_SIGNATURE: "Chờ người thuê ký",
  PENDING_DEPOSIT: "Chờ xác nhận cọc",
  PENDING_HANDOVER: "Chờ bàn giao",
  ACTIVE: "Đang hiệu lực",
  EXPIRED: "Đã hết hạn",
  TERMINATED: "Đã chấm dứt",
  CANCELLED: "Đã hủy",
  DISPUTED: "Đang tranh chấp",
};

const eventLabels: Record<string, string> = {
  CONTRACT_CREATED: "Tạo bản nháp hợp đồng",
  DRAFT_UPDATED: "Cập nhật bản nháp",
  HOST_SIGNED: "Chủ nhà đã ký",
  RENTER_SIGNED: "Người thuê đã ký",
  DEPOSIT_CONFIRMED: "Đã xác nhận tiền cọc",
  HOST_HANDOVER_CONFIRMED: "Chủ nhà xác nhận bàn giao",
  RENTER_HANDOVER_CONFIRMED: "Người thuê xác nhận nhận phòng",
  RENEWAL_RECORDED: "Ghi nhận gia hạn",
  CONTRACT_TERMINATED: "Chấm dứt hợp đồng",
  RENTER_LEFT_ROOM: "Người thuê đã rời phòng",
};

const flow: ContractStatus[] = [
  ContractStatus.DRAFT,
  ContractStatus.PENDING_RENTER_SIGNATURE,
  ContractStatus.PENDING_DEPOSIT,
  ContractStatus.PENDING_HANDOVER,
  ContractStatus.ACTIVE,
];

function formatDate(value?: string | null) {
  if (!value) return "Chưa xác nhận";
  return new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

export function ContractDetail({ contract, isHost, onRenew, onTerminate, onChanged }: ContractDetailProps) {
  const [signatureName, setSignatureName] = useState("");
  const [citizenId, setCitizenId] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [informationConfirmed, setInformationConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canHostSign = isHost && (contract.status === ContractStatus.DRAFT || contract.status === ContractStatus.PENDING_HOST_SIGNATURE);
  const canRenterSign = !isHost && contract.status === ContractStatus.PENDING_RENTER_SIGNATURE;
  const canConfirmDeposit = isHost && contract.status === ContractStatus.PENDING_DEPOSIT;
  const canConfirmHandover = contract.status === ContractStatus.PENDING_HANDOVER && (isHost ? !contract.hostHandoverConfirmedAt : !contract.renterHandoverConfirmedAt);
  const flowIndex = contract.status === ContractStatus.PENDING_HOST_SIGNATURE ? 0 : flow.indexOf(contract.status);
  const roomArea = formatRoomArea(contract.room.areaValue, contract.room.areaText);

  async function runAction(action: () => Promise<ContractData>) {
    setError("");
    setIsSubmitting(true);
    try {
      const updated = await action();
      setSignatureName("");
      setCitizenId("");
      setAcceptedTerms(false);
      setInformationConfirmed(false);
      setReference("");
      setActionNote("");
      onChanged?.(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thực hiện thao tác");
    } finally {
      setIsSubmitting(false);
    }
  }

  const cardClass = "rounded-lg border border-slate-200 bg-white p-5";

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 via-white to-sky-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Hợp đồng thuê nhà ở</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{contract.contractNumber}</h2>
            <p className="mt-2 text-sm text-slate-500">Phiên bản điều khoản {contract.termsVersion}</p>
          </div>
          <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">{statusLabels[contract.status]}</span>
        </div>
        <Link href={`/contracts/${contract.id}/print`} className="mt-5 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-orange-300 hover:text-orange-700"><Printer className="h-4 w-4" />Xem bản hợp đồng để in</Link>
      </header>

      {flowIndex >= 0 && (
        <section className={cardClass}>
          <div className="grid grid-cols-5 gap-2">
            {flow.map((status, index) => {
              const done = index <= flowIndex;
              return (
                <div key={status} className="min-w-0 text-center">
                  <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>{done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}</div>
                  <p className="mt-2 hidden text-xs font-semibold text-slate-600 sm:block">{statusLabels[status]}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><UserRound className="h-5 w-5 text-orange-600" />Các bên tham gia</h3>
          <div className="space-y-4 text-sm">
            <div><p className="text-slate-500">Bên cho thuê</p><p className="font-semibold text-slate-900">{contract.host.fullName}</p><p className="text-slate-600">{contract.host.phone || contract.host.email}</p></div>
            <div><p className="text-slate-500">Bên thuê</p><p className="font-semibold text-slate-900">{contract.renter.fullName}</p><p className="text-slate-600">{contract.renter.phone || contract.renter.email}</p></div>
          </div>
        </div>
        <div className={cardClass}>
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><MapPin className="h-5 w-5 text-orange-600" />Nhà ở cho thuê</h3>
          <p className="font-semibold text-slate-900">{contract.room.title}</p>
          <p className="mt-1 text-sm text-slate-600">{contract.room.address}</p>
          <p className="mt-3 text-sm text-slate-500">Mục đích: thuê để ở{roomArea ? ` • ${roomArea}` : ""}</p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><CalendarDays className="h-5 w-5 text-sky-600" />Thời hạn</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-500">Bắt đầu</dt><dd className="mt-1 font-semibold">{formatDate(contract.startDate)}</dd></div><div><dt className="text-slate-500">Kết thúc</dt><dd className="mt-1 font-semibold">{formatDate(contract.endDate)}</dd></div><div><dt className="text-slate-500">Báo trước</dt><dd className="mt-1 font-semibold">{contract.noticeDays} ngày</dd></div></dl>
        </div>
        <div className={cardClass}>
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><ReceiptText className="h-5 w-5 text-emerald-600" />Tài chính</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-500">Tiền thuê</dt><dd className="mt-1 font-semibold">{formatCurrency(contract.monthlyRent)}</dd></div><div><dt className="text-slate-500">Tiền cọc</dt><dd className="mt-1 font-semibold">{formatCurrency(contract.depositAmount)}</dd></div><div><dt className="text-slate-500">Hạn thanh toán</dt><dd className="mt-1 font-semibold">Ngày {contract.paymentDueDay} hàng tháng</dd></div><div><dt className="text-slate-500">Hoàn cọc</dt><dd className="mt-1 font-semibold">Trong {contract.depositReturnDays} ngày</dd></div></dl>
        </div>
      </section>

      <section className={cardClass}>
        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><FileCheck2 className="h-5 w-5 text-orange-600" />Điều khoản sử dụng và bàn giao</h3>
        <div className="grid gap-5 text-sm md:grid-cols-2">
          <div><p className="font-semibold text-slate-700">Điện, nước và dịch vụ</p><p className="mt-2 whitespace-pre-wrap leading-6 text-slate-600">Điện: {contract.electricityRate ? `${formatCurrency(contract.electricityRate)}/kWh` : "theo thỏa thuận"}<br />Nước: {contract.waterRate ? formatCurrency(contract.waterRate) : "theo thỏa thuận"}<br />{contract.utilitiesNotes}</p></div>
          <div><p className="font-semibold text-slate-700">Nội quy</p><p className="mt-2 whitespace-pre-wrap leading-6 text-slate-600">{contract.houseRules || "Không có nội quy bổ sung."}</p></div>
        </div>
        {!!contract.inventory?.length && <div className="mt-5 border-t border-slate-100 pt-5"><p className="mb-2 font-semibold text-slate-700">Tài sản bàn giao</p><ul className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">{contract.inventory.map((item, index) => <li key={`${item.name}-${index}`}>{item.name} • {item.quantity} • {item.condition || "Chưa ghi tình trạng"}</li>)}</ul></div>}
      </section>

      <section className={cardClass}>
        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-emerald-600" />Xác nhận của các bên</h3>
        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div className="border-l-4 border-orange-400 pl-4"><p className="font-semibold">Chủ nhà</p><p className="text-slate-600">{contract.hostSignatureName || "Chưa ký"}</p><p className="text-xs text-slate-500">{formatDate(contract.hostSignedAt)}</p></div>
          <div className="border-l-4 border-sky-400 pl-4"><p className="font-semibold">Người thuê</p><p className="text-slate-600">{contract.renterSignatureName || "Chưa ký"}</p><p className="text-xs text-slate-500">{formatDate(contract.renterSignedAt)}</p></div>
        </div>
        <p className="mt-5 break-all border-t border-slate-100 pt-4 font-mono text-xs text-slate-400">SHA-256: {contract.contentHash}</p>
      </section>

      {(canHostSign || canRenterSign) && (
        <section className="rounded-lg border border-orange-200 bg-orange-50 p-5">
          <h3 className="font-bold text-slate-900">Ký xác nhận hợp đồng</h3>
          <input className="mt-4 w-full rounded-lg border border-orange-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200" value={signatureName} onChange={(event) => setSignatureName(event.target.value)} placeholder="Nhập đúng họ và tên trên tài khoản" />
          <input className="mt-3 w-full rounded-lg border border-orange-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200" inputMode="numeric" maxLength={12} value={citizenId} onChange={(event) => setCitizenId(event.target.value.replace(/\D/g, ""))} placeholder="Số căn cước công dân (12 chữ số)" />
          <label className="mt-4 flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={informationConfirmed} onChange={(event) => setInformationConfirmed(event.target.checked)} />Tôi xác nhận thông tin các bên, phòng, giá thuê và thời hạn là chính xác.</label>
          <label className="mt-3 flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />Tôi đã đọc, hiểu và tự nguyện đồng ý toàn bộ điều khoản hợp đồng.</label>
          <Button className="mt-4 bg-orange-600 text-white hover:bg-orange-700" disabled={isSubmitting || !signatureName || citizenId.length !== 12 || !acceptedTerms || !informationConfirmed} onClick={() => runAction(() => contractClient.sign(contract.id, { signatureName, citizenId, acceptedTerms: true, informationConfirmed: true }))}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ký hợp đồng</Button>
        </section>
      )}

      {canConfirmDeposit && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-bold text-slate-900">Xác nhận đã nhận tiền cọc</h3>
          <p className="mt-1 text-sm text-slate-600">Số tiền cần xác nhận: {formatCurrency(contract.depositAmount)}</p>
          <input className="mt-4 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Mã giao dịch hoặc số biên nhận" />
          <Button className="mt-4 bg-emerald-700 text-white hover:bg-emerald-800" disabled={isSubmitting} onClick={() => runAction(() => contractClient.confirmDeposit(contract.id, { received: true, reference: reference || undefined }))}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Xác nhận tiền cọc</Button>
        </section>
      )}

      {canConfirmHandover && (
        <section className="rounded-lg border border-sky-200 bg-sky-50 p-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-900"><KeyRound className="h-5 w-5" />{isHost ? "Xác nhận đã bàn giao phòng" : "Xác nhận đã nhận phòng"}</h3>
          <textarea className="mt-4 w-full resize-none rounded-lg border border-sky-200 bg-white px-3 py-2.5 text-sm" rows={3} value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Ghi chỉ số điện nước, tình trạng phòng hoặc lưu ý bàn giao" />
          <Button className="mt-4 bg-sky-700 text-white hover:bg-sky-800" disabled={isSubmitting} onClick={() => runAction(() => contractClient.confirmHandover(contract.id, { confirmed: true, note: actionNote || undefined }))}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Xác nhận bàn giao</Button>
        </section>
      )}

      {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

      {!!contract.events?.length && (
        <section className={cardClass}>
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Handshake className="h-5 w-5 text-slate-600" />Lịch sử hợp đồng</h3>
          <div className="space-y-4 border-l border-slate-200 pl-5">{contract.events.map((event) => <div key={event.id}><p className="text-sm font-semibold text-slate-800">{eventLabels[event.type] || event.type}</p><p className="text-xs text-slate-500">{event.actor?.fullName || "Hệ thống"} • {formatDate(event.createdAt)}</p>{event.note && <p className="mt-1 text-sm text-slate-600">{event.note}</p>}</div>)}</div>
        </section>
      )}

      {contract.status === ContractStatus.ACTIVE && onTerminate && (
        <div className="flex flex-wrap gap-3">
          {isHost && onRenew && <Button variant="outline" onClick={onRenew}>Gia hạn</Button>}
          <Button className="bg-red-600 text-white hover:bg-red-700" onClick={onTerminate}>
            {isHost ? "Chấm dứt hợp đồng" : "Rời phòng"}
          </Button>
        </div>
      )}
    </div>
  );
}
