'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { occupancyClient } from '@/lib/services/occupancy-client.service';

interface Props { occupancyId: string; tenantName: string; onClose: () => void; onSuccess?: () => void; }

export function TerminateTenantModal({ occupancyId, tenantName, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 5) return setError('Vui lòng nhập lý do có ít nhất 5 ký tự.');
    setLoading(true); setError('');
    try {
      await occupancyClient.terminateOccupancy(occupancyId, reason.trim());
      setSuccess(true);
      window.setTimeout(() => { onSuccess?.(); onClose(); }, 900);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể kết thúc cư trú');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}>
      <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-wider text-red-600">Quản lý cư trú</p><h2 className="mt-1 text-xl font-black text-slate-950">Xác nhận thành viên rời phòng</h2></div><button onClick={onClose} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="space-y-5 p-6">
          {success ? <div className="py-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><p className="mt-3 font-bold text-slate-900">Đã cập nhật trạng thái cư trú</p></div> : <>
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><p className="text-sm leading-6 text-amber-900">Thành viên <strong>{tenantName}</strong> sẽ được chuyển sang lịch sử. Nếu có hợp đồng đang hiệu lực, hợp đồng cũng được chấm dứt và chỗ trống của phòng được cập nhật trong cùng giao dịch.</p></div>
            <div><label htmlFor="termination-reason" className="mb-2 block text-sm font-bold text-slate-800">Lý do kết thúc cư trú</label><textarea id="termination-reason" value={reason} onChange={(event) => { setReason(event.target.value); setError(''); }} rows={4} placeholder="Ví dụ: Hai bên đã thống nhất kết thúc hợp đồng thuê..." className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
          </>}
        </div>
        {!success && <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4"><button onClick={onClose} disabled={loading} className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700">Hủy</button><button onClick={() => void submit()} disabled={loading || reason.trim().length < 5} className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}Xác nhận rời phòng</button></div>}
      </div>
    </div>
  );
}
