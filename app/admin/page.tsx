"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  EyeOff,
  Loader2,
  LockKeyhole,
  MapPinned,
  RefreshCw,
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

type DashboardStats = {
  users: UserStats
  rooms: RoomStats
}

const numberFormatter = new Intl.NumberFormat("vi-VN")
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
})

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number)
  if (!year || !month) return value
  return new Intl.DateTimeFormat("vi-VN", { month: "short", year: "2-digit" })
    .format(new Date(year, month - 1, 1))
    .replace("thg ", "T")
}

function percent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)))
}

const RETRYABLE_STATUSES = new Set([502, 503, 504])

async function wait(milliseconds: number, signal?: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, milliseconds)
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timeout)
      reject(new DOMException("Request aborted", "AbortError"))
    }, { once: true })
  })
}

export default function AdminDashboard() {
  const { token, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const fetchStats = useCallback(async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError("")

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const loadResponses = () => Promise.all([
        fetch("/api/admin/stats/users", { headers, credentials: "include", signal }),
        fetch("/api/admin/stats/rooms", { headers, credentials: "include", signal }),
      ])
      let responses = await loadResponses()

      if (responses.some((response) => RETRYABLE_STATUSES.has(response.status))) {
        await wait(700, signal)
        responses = await loadResponses()
      }

      const [userRes, roomRes] = responses

      const [userData, roomData] = await Promise.all([
        userRes.json().catch(() => null),
        roomRes.json().catch(() => null),
      ])
      if (!userRes.ok || !roomRes.ok) {
        throw new Error(
          userData?.message || userData?.error || roomData?.message || roomData?.error ||
          "Không thể tải số liệu dashboard"
        )
      }

      setStats({ users: userData as UserStats, rooms: roomData as RoomStats })
      setUpdatedAt(new Date())
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return
      setError(reason instanceof Error ? reason.message : "Không thể tải số liệu dashboard")
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
    fetchStats(controller.signal)
    return () => controller.abort()
  }, [authLoading, fetchStats])

  const monthlyData = useMemo(() => stats?.users.byMonth.slice(-6) ?? [], [stats])
  const maxMonthlyUsers = Math.max(1, ...monthlyData.map((item) => item.count))
  const activeUsers = stats
    ? Math.max(0, stats.users.total - stats.users.locked - stats.users.deleted)
    : 0
  const adminUsers = stats
    ? Math.max(0, activeUsers - stats.users.tenants - stats.users.landlords - stats.users.communityManagers)
    : 0
  const roomUtilization = stats
    ? percent(stats.rooms.occupied, stats.rooms.available + stats.rooms.occupied)
    : 0
  const currentMonth = monthlyData.at(-1)?.count ?? 0
  const previousMonth = monthlyData.at(-2)?.count ?? 0
  const growthRate = previousMonth > 0
    ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100)
    : currentMonth > 0 ? 100 : 0

  if (loading || authLoading) return <DashboardSkeleton />

  if (!stats) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-700">
            <AlertCircle className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-950">Không thể tải dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => fetchStats(undefined, true)}
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  const roomSegments = [
    { label: "Còn trống", value: stats.rooms.available, color: "bg-emerald-500", text: "text-emerald-700" },
    { label: "Đã đủ người", value: stats.rooms.occupied, color: "bg-blue-500", text: "text-blue-700" },
    { label: "Chờ duyệt", value: stats.rooms.pending, color: "bg-amber-500", text: "text-amber-700" },
    { label: "Đang ẩn", value: stats.rooms.hidden, color: "bg-slate-400", text: "text-slate-600" },
  ]

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-slate-800">Hệ thống đang hoạt động</p>
            <p className="text-xs">
              {updatedAt ? `Cập nhật lúc ${updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : "Dữ liệu mới nhất"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchStats(undefined, true)}
          disabled={refreshing}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Làm mới dữ liệu
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}. Đang hiển thị dữ liệu gần nhất.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số tổng quan">
        <KpiCard
          label="Người dùng"
          value={numberFormatter.format(stats.users.total)}
          detail={`${numberFormatter.format(stats.users.newThisMonth)} tài khoản mới tháng này`}
          icon={<Users className="h-5 w-5" />}
          tone="blue"
        />
        <KpiCard
          label="Phòng còn chỗ"
          value={numberFormatter.format(stats.rooms.available)}
          detail={`${numberFormatter.format(stats.rooms.total)} phòng trên toàn hệ thống`}
          icon={<Building2 className="h-5 w-5" />}
          tone="emerald"
        />
        <KpiCard
          label="Hồ sơ chờ duyệt"
          value={numberFormatter.format(stats.rooms.pending)}
          detail={stats.rooms.pending > 0 ? "Cần xử lý trong hàng đợi" : "Không có hồ sơ tồn đọng"}
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />
        <KpiCard
          label="Doanh thu dự kiến/tháng"
          value={currencyFormatter.format(stats.rooms.revenue.projectedMonthly)}
          detail={`${numberFormatter.format(stats.rooms.revenue.activeContracts)} hợp đồng hoạt động · Đã thu ${currencyFormatter.format(stats.rooms.revenue.total)}`}
          icon={<Banknote className="h-5 w-5" />}
          tone="rose"
          compactValue
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Tăng trưởng</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Người dùng mới trong 6 tháng</h2>
            </div>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${growthRate >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              <TrendingUp className={`h-3.5 w-3.5 ${growthRate < 0 ? "rotate-180" : ""}`} />
              {growthRate >= 0 ? "+" : ""}{growthRate}% so với tháng trước
            </div>
          </div>

          <div className="mt-8 grid h-64 grid-cols-6 items-end gap-3 border-b border-slate-200 px-1 sm:gap-5" aria-label="Biểu đồ người dùng mới">
            {monthlyData.map((item) => {
              const height = Math.max(8, Math.round((item.count / maxMonthlyUsers) * 100))
              return (
                <div key={item.month} className="flex h-full min-w-0 flex-col justify-end">
                  <div className="mb-2 text-center text-xs font-bold text-slate-700">{item.count}</div>
                  <div className="group relative flex h-[190px] items-end overflow-hidden rounded-t-md bg-slate-100">
                    <div
                      className="w-full rounded-t-md bg-blue-600 transition-colors group-hover:bg-blue-700"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <div className="h-9 truncate pt-2 text-center text-[11px] font-semibold text-slate-500 sm:text-xs">
                    {monthLabel(item.month)}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Cơ cấu tài khoản</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Người dùng đang hoạt động</h2>
          <div className="mt-6 flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-4xl font-black text-slate-950">{numberFormatter.format(activeUsers)}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">tài khoản hoạt động</p>
            </div>
            <UserRoundCheck className="h-10 w-10 text-blue-600" />
          </div>
          <div className="mt-5 space-y-4">
            <AccountRow label="Người thuê" value={stats.users.tenants} total={activeUsers} color="bg-blue-500" />
            <AccountRow label="Chủ nhà" value={stats.users.landlords} total={activeUsers} color="bg-orange-500" />
            <AccountRow label="Community Manager" value={stats.users.communityManagers} total={activeUsers} color="bg-emerald-500" />
            <AccountRow label="Quản trị viên" value={adminUsers} total={activeUsers} color="bg-violet-500" />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Nguồn cung</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Trạng thái phòng</h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-950">{roomUtilization}%</p>
              <p className="text-xs font-semibold text-slate-500">tỷ lệ khai thác</p>
            </div>
          </div>

          <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {roomSegments.map((segment) => (
              <div
                key={segment.label}
                className={segment.color}
                style={{ width: `${percent(segment.value, stats.rooms.total)}%` }}
                title={`${segment.label}: ${segment.value}`}
              />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
            {roomSegments.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-600">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${segment.color}`} />
                  <span className="truncate">{segment.label}</span>
                </span>
                <span className={`font-black ${segment.text}`}>{numberFormatter.format(segment.value)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Cần xử lý</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Hàng đợi vận hành</h2>
          <div className="mt-5 divide-y divide-slate-100">
            <ActionRow
              href="/admin/rooms"
              icon={<BadgeCheck className="h-5 w-5" />}
              iconClass="bg-amber-50 text-amber-700"
              label="Hồ sơ phòng chờ duyệt"
              value={stats.rooms.pending}
              urgent={stats.rooms.pending > 0}
            />
            <ActionRow
              href="/admin/users"
              icon={<LockKeyhole className="h-5 w-5" />}
              iconClass="bg-red-50 text-red-700"
              label="Tài khoản đang bị khóa"
              value={stats.users.locked}
            />
            <ActionRow
              href="/admin/rooms"
              icon={<EyeOff className="h-5 w-5" />}
              iconClass="bg-slate-100 text-slate-700"
              label="Phòng đang ẩn"
              value={stats.rooms.hidden}
            />
            <ActionRow
              href="/admin/community-managers"
              icon={<MapPinned className="h-5 w-5" />}
              iconClass="bg-blue-50 text-blue-700"
              label="Nhân viên quản lý cộng đồng"
              value={stats.users.communityManagers}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  detail,
  icon,
  tone,
  compactValue = false,
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
  tone: "blue" | "emerald" | "amber" | "rose"
  compactValue?: boolean
}) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-bold text-slate-600">{label}</p>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-5 font-black tracking-tight text-slate-950 ${compactValue ? "text-2xl" : "text-3xl"}`}>
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
    </article>
  )
}

function AccountRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="font-black text-slate-900">{numberFormatter.format(value)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent(value, total)}%` }} />
      </div>
    </div>
  )
}

function ActionRow({
  href,
  icon,
  iconClass,
  label,
  value,
  urgent = false,
}: {
  href: string
  icon: React.ReactNode
  iconClass: string
  label: string
  value: number
  urgent?: boolean
}) {
  return (
    <Link href={href} className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800 group-hover:text-red-700">{label}</p>
        <p className={`mt-0.5 text-xs font-semibold ${urgent ? "text-amber-700" : "text-slate-500"}`}>
          {urgent ? "Đang chờ xử lý" : "Xem danh sách chi tiết"}
        </p>
      </div>
      <span className="font-black text-slate-950">{numberFormatter.format(value)}</span>
      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-red-600" />
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-7" aria-label="Đang tải dashboard">
      <div className="h-14 rounded-lg bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 rounded-lg bg-slate-100" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.75fr]">
        <div className="h-96 rounded-lg bg-slate-100" />
        <div className="h-96 rounded-lg bg-slate-100" />
      </div>
    </div>
  )
}
