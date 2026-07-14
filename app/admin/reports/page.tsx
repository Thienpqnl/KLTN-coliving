"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileBarChart,
  Loader2,
  LockKeyhole,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserRoundCheck,
  Users,
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"

interface UserStats {
  total: number
  tenants: number
  landlords: number
  communityManagers: number
  locked: number
  deleted: number
  newThisMonth: number
  byMonth: Array<{ month: string; count: number }>
}

interface RoomStats {
  total: number
  available: number
  occupied: number
  pending: number
  hidden: number
  revenue: {
    total: number
    completedBookings: number
    projectedMonthly: number
    activeContracts: number
  }
}

interface ReportData {
  users: UserStats
  rooms: RoomStats
}

const numberFormatter = new Intl.NumberFormat("vi-VN")
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
})
const retryableStatuses = new Set([502, 503, 504])

function percent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)))
}

function formatMonth(value: string, includeYear = false) {
  const [year, month] = value.split("-").map(Number)
  if (!year || !month) return value
  return new Intl.DateTimeFormat("vi-VN", includeYear
    ? { month: "long", year: "numeric" }
    : { month: "short" })
    .format(new Date(year, month - 1, 1))
    .replace("tháng", "Tháng")
    .replace("thg ", "T")
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const data = payload as { error?: unknown; message?: unknown }
    if (typeof data.error === "string") return data.error
    if (typeof data.message === "string") return data.message
  }
  return fallback
}

async function wait(milliseconds: number, signal?: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, milliseconds)
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timeout)
      reject(new DOMException("Request aborted", "AbortError"))
    }, { once: true })
  })
}

export default function Reports() {
  const { token, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<ReportData | null>(null)
  const [period, setPeriod] = useState<6 | 12>(6)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const loadReport = useCallback(async (signal?: AbortSignal, manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    setError("")

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const requestStats = () => Promise.all([
        fetch("/api/admin/stats/users", { headers, credentials: "include", signal }),
        fetch("/api/admin/stats/rooms", { headers, credentials: "include", signal }),
      ])
      let responses = await requestStats()
      if (responses.some((response) => retryableStatuses.has(response.status))) {
        await wait(700, signal)
        responses = await requestStats()
      }

      const [userResponse, roomResponse] = responses
      const [users, rooms] = await Promise.all([
        userResponse.json().catch(() => null),
        roomResponse.json().catch(() => null),
      ])
      if (!userResponse.ok || !roomResponse.ok) {
        throw new Error(
          errorMessage(users, errorMessage(rooms, "Không thể tải dữ liệu báo cáo")),
        )
      }

      setData({ users: users as UserStats, rooms: rooms as RoomStats })
      setUpdatedAt(new Date())
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return
      setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu báo cáo")
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [token])

  useEffect(() => {
    if (authLoading) return
    const controller = new AbortController()
    void loadReport(controller.signal)
    return () => controller.abort()
  }, [authLoading, loadReport])

  const monthlyData = useMemo(
    () => data?.users.byMonth.slice(-period) ?? [],
    [data, period],
  )
  const maxMonthly = Math.max(1, ...monthlyData.map((item) => item.count))
  const activeAccounts = data
    ? Math.max(0, data.users.total - data.users.locked - data.users.deleted)
    : 0
  const adminAccounts = data
    ? Math.max(0, activeAccounts - data.users.tenants - data.users.landlords - data.users.communityManagers)
    : 0
  const rentableRooms = data ? data.rooms.available + data.rooms.occupied : 0
  const occupancyRate = data ? percent(data.rooms.occupied, rentableRooms) : 0
  const currentGrowth = monthlyData.at(-1)?.count ?? 0
  const previousGrowth = monthlyData.at(-2)?.count ?? 0
  const growthRate = previousGrowth > 0
    ? Math.round(((currentGrowth - previousGrowth) / previousGrowth) * 100)
    : currentGrowth > 0 ? 100 : 0

  const exportCsv = () => {
    if (!data) return
    const rows: Array<Array<string | number>> = [
      ["BÁO CÁO HỆ THỐNG NHÀHỢP"],
      ["Thời điểm xuất", new Date().toLocaleString("vi-VN")],
      [],
      ["CHỈ SỐ NGƯỜI DÙNG"],
      ["Tổng tài khoản", data.users.total],
      ["Tài khoản hoạt động", activeAccounts],
      ["Người thuê", data.users.tenants],
      ["Chủ nhà", data.users.landlords],
      ["Community Manager", data.users.communityManagers],
      ["Quản trị viên", adminAccounts],
      ["Tài khoản bị khóa", data.users.locked],
      ["Tài khoản đã xóa", data.users.deleted],
      [],
      ["NGƯỜI DÙNG MỚI THEO THÁNG"],
      ["Tháng", "Số tài khoản mới"],
      ...monthlyData.map((item) => [item.month, item.count]),
      [],
      ["CHỈ SỐ PHÒNG VÀ HỢP ĐỒNG"],
      ["Tổng phòng", data.rooms.total],
      ["Phòng còn chỗ", data.rooms.available],
      ["Phòng đủ người", data.rooms.occupied],
      ["Phòng chờ duyệt", data.rooms.pending],
      ["Phòng đang ẩn", data.rooms.hidden],
      ["Tỷ lệ khai thác", `${occupancyRate}%`],
      ["Hợp đồng hoạt động", data.rooms.revenue.activeContracts],
      ["Doanh thu dự kiến mỗi tháng", data.rooms.revenue.projectedMonthly],
      ["Doanh thu đã thanh toán", data.rooms.revenue.total],
      ["Booking hoàn tất", data.rooms.revenue.completedBookings],
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\r\n")
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `bao-cao-nhaho-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading || authLoading) return <ReportSkeleton />

  if (!data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-700"><AlertCircle className="h-6 w-6" /></span>
          <h2 className="mt-4 text-lg font-bold text-slate-950">Không thể tải báo cáo</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button type="button" onClick={() => loadReport(undefined, true)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" />Thử lại</button>
        </div>
      </div>
    )
  }

  const accountSegments = [
    { label: "Người thuê", value: data.users.tenants, color: "bg-blue-500" },
    { label: "Chủ nhà", value: data.users.landlords, color: "bg-orange-500" },
    { label: "Community Manager", value: data.users.communityManagers, color: "bg-emerald-500" },
    { label: "Quản trị viên", value: adminAccounts, color: "bg-violet-500" },
  ]
  const roomSegments = [
    { label: "Còn chỗ", value: data.rooms.available, color: "bg-emerald-500" },
    { label: "Đủ người", value: data.rooms.occupied, color: "bg-blue-500" },
    { label: "Chờ duyệt", value: data.rooms.pending, color: "bg-amber-500" },
    { label: "Đang ẩn", value: data.rooms.hidden, color: "bg-slate-400" },
  ]

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FileBarChart className="h-5 w-5" /></span>
          <div>
            <p className="font-bold text-slate-900">Báo cáo vận hành tổng hợp</p>
            <p className="text-xs font-semibold text-slate-500">{updatedAt ? `Cập nhật lúc ${updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : "Dữ liệu mới nhất"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1" aria-label="Khoảng thời gian báo cáo">
            {([6, 12] as const).map((value) => <button key={value} type="button" onClick={() => setPeriod(value)} className={`h-8 rounded-md px-3 text-xs font-bold ${period === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{value} tháng</button>)}
          </div>
          <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Xuất CSV</button>
          <button type="button" onClick={() => loadReport(undefined, true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Làm mới</button>
        </div>
      </section>

      {error && <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"><AlertCircle className="h-5 w-5" />{error}. Đang hiển thị dữ liệu gần nhất.</div>}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Chỉ số báo cáo chính">
        <MetricCard label="Tài khoản hoạt động" value={numberFormatter.format(activeAccounts)} detail={`${data.users.newThisMonth} tài khoản mới tháng này`} icon={<Users className="h-5 w-5" />} tone="blue" />
        <MetricCard label="Tỷ lệ khai thác" value={`${occupancyRate}%`} detail={`${data.rooms.occupied}/${rentableRooms} phòng có thể cho thuê`} icon={<Building2 className="h-5 w-5" />} tone="emerald" />
        <MetricCard label="Doanh thu dự kiến/tháng" value={currencyFormatter.format(data.rooms.revenue.projectedMonthly)} detail={`${data.rooms.revenue.activeContracts} hợp đồng hoạt động`} icon={<Banknote className="h-5 w-5" />} tone="rose" compact />
        <MetricCard label="Hồ sơ chờ duyệt" value={numberFormatter.format(data.rooms.pending)} detail={data.rooms.pending ? "Cần xử lý trong hàng đợi" : "Không có hồ sơ tồn đọng"} icon={<Clock3 className="h-5 w-5" />} tone="amber" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Tăng trưởng</p><h2 className="mt-1 text-xl font-bold text-slate-950">Người dùng mới theo tháng</h2></div>
            <span className={`inline-flex w-fit items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold ${growthRate >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{growthRate >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}{growthRate >= 0 ? "+" : ""}{growthRate}%</span>
          </div>
          <div className={`mt-8 grid h-64 items-end gap-2 border-b border-slate-200 ${period === 6 ? "grid-cols-6 sm:gap-5" : "grid-cols-12"}`}>
            {monthlyData.map((item) => {
              const height = Math.max(6, Math.round((item.count / maxMonthly) * 100))
              return <div key={item.month} className="flex h-full min-w-0 flex-col justify-end"><span className="mb-2 text-center text-[10px] font-bold text-slate-600 sm:text-xs">{item.count}</span><div className="flex h-[190px] items-end overflow-hidden rounded-t bg-slate-100"><div className="w-full rounded-t bg-blue-600" style={{ height: `${height}%` }} /></div><span className="h-8 truncate pt-2 text-center text-[10px] font-semibold text-slate-500 sm:text-xs">{formatMonth(item.month)}</span></div>
            })}
          </div>
        </section>

        <DistributionCard title="Cơ cấu tài khoản" total={activeAccounts} segments={accountSegments} icon={<UserRoundCheck className="h-8 w-8" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DistributionCard title="Trạng thái nguồn cung" total={data.rooms.total} segments={roomSegments} icon={<Building2 className="h-8 w-8" />} />
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Tài chính và hợp đồng</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Giá trị đang ghi nhận</h2>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <FinanceItem label="Dự kiến mỗi tháng" value={currencyFormatter.format(data.rooms.revenue.projectedMonthly)} accent="text-rose-700" />
            <FinanceItem label="Đã thanh toán" value={currencyFormatter.format(data.rooms.revenue.total)} accent="text-emerald-700" />
            <FinanceItem label="Hợp đồng hoạt động" value={numberFormatter.format(data.rooms.revenue.activeContracts)} accent="text-blue-700" />
            <FinanceItem label="Booking hoàn tất" value={numberFormatter.format(data.rooms.revenue.completedBookings)} accent="text-violet-700" />
          </div>
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs font-semibold leading-5 text-slate-500">Doanh thu đã thanh toán chỉ tính các payment có trạng thái PAID. Giá trị dự kiến được tổng hợp từ tiền thuê hàng tháng của hợp đồng đang hoạt động.</p>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-950">Chi tiết tăng trưởng người dùng</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">So sánh theo từng tháng trong kỳ báo cáo</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px]"><thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500"><tr><th className="px-5 py-3">Tháng</th><th className="px-5 py-3">Tài khoản mới</th><th className="px-5 py-3">Thay đổi</th><th className="px-5 py-3">Tỷ trọng trong kỳ</th></tr></thead><tbody className="divide-y divide-slate-100">{monthlyData.map((item, index) => { const previous = monthlyData[index - 1]?.count; const change = previous === undefined ? null : item.count - previous; const periodTotal = monthlyData.reduce((sum, row) => sum + row.count, 0); return <tr key={item.month} className="hover:bg-slate-50"><td className="px-5 py-3 text-sm font-bold text-slate-900">{formatMonth(item.month, true)}</td><td className="px-5 py-3 text-sm font-black text-slate-900">{item.count}</td><td className={`px-5 py-3 text-sm font-bold ${change === null || change === 0 ? "text-slate-500" : change > 0 ? "text-emerald-700" : "text-red-700"}`}>{change === null ? "-" : `${change > 0 ? "+" : ""}${change}`}</td><td className="px-5 py-3"><div className="flex items-center gap-3"><div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${percent(item.count, periodTotal)}%` }} /></div><span className="text-xs font-bold text-slate-500">{percent(item.count, periodTotal)}%</span></div></td></tr> })}</tbody></table></div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <OperationalItem icon={<LockKeyhole className="h-5 w-5" />} label="Tài khoản bị khóa" value={data.users.locked} tone="red" />
        <OperationalItem icon={<AlertCircle className="h-5 w-5" />} label="Phòng đang ẩn" value={data.rooms.hidden} tone="slate" />
        <OperationalItem icon={<CheckCircle2 className="h-5 w-5" />} label="Phòng còn chỗ" value={data.rooms.available} tone="emerald" />
      </section>
    </div>
  )
}

function MetricCard({ label, value, detail, icon, tone, compact = false }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: "blue" | "emerald" | "amber" | "rose"; compact?: boolean }) {
  const tones = { blue: "border-blue-100 bg-blue-50 text-blue-700", emerald: "border-emerald-100 bg-emerald-50 text-emerald-700", amber: "border-amber-100 bg-amber-50 text-amber-700", rose: "border-rose-100 bg-rose-50 text-rose-700" }
  return <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold text-slate-500 sm:text-sm">{label}</p><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tones[tone]}`}>{icon}</span></div><p className={`mt-4 font-black text-slate-950 ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>{value}</p><p className="mt-2 text-xs font-semibold text-slate-500">{detail}</p></article>
}

function DistributionCard({ title, total, segments, icon }: { title: string; total: number; segments: Array<{ label: string; value: number; color: string }>; icon: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Phân bổ</p><div className="mt-1 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">{title}</h2><p className="mt-3 text-3xl font-black text-slate-950">{numberFormatter.format(total)}</p></div><span className="text-blue-600">{icon}</span></div><div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100">{segments.map((segment) => <span key={segment.label} className={segment.color} style={{ width: `${percent(segment.value, total)}%` }} title={`${segment.label}: ${segment.value}`} />)}</div><div className="mt-6 grid grid-cols-2 gap-4">{segments.map((segment) => <div key={segment.label} className="flex items-center justify-between gap-2 text-sm"><span className="flex min-w-0 items-center gap-2 font-semibold text-slate-600"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${segment.color}`} /><span className="truncate">{segment.label}</span></span><strong className="text-slate-950">{numberFormatter.format(segment.value)}</strong></div>)}</div></section>
}

function FinanceItem({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className={`mt-2 break-words text-xl font-black ${accent}`}>{value}</p></div>
}

function OperationalItem({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "red" | "slate" | "emerald" }) {
  const tones = { red: "bg-red-50 text-red-700", slate: "bg-slate-100 text-slate-700", emerald: "bg-emerald-50 text-emerald-700" }
  return <article className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</span><div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-0.5 text-xl font-black text-slate-950">{numberFormatter.format(value)}</p></div></article>
}

function ReportSkeleton() {
  return <div className="animate-pulse space-y-6" aria-label="Đang tải báo cáo"><div className="h-20 rounded-lg bg-slate-100" /><div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-36 rounded-lg bg-slate-100" />)}</div><div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.75fr]"><div className="h-96 rounded-lg bg-slate-100" /><div className="h-96 rounded-lg bg-slate-100" /></div></div>
}
