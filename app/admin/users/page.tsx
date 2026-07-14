"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"

type Role = "CUSTOMER" | "HOST" | "ADMIN" | "COMMUNITY_MANAGER"
type UserStatus = "ACTIVE" | "LOCKED" | "DELETED"
type ActionType = "lock" | "unlock" | "delete" | "update_role"
type CreateUserRole = Exclude<Role, "ADMIN">

interface CreateUserForm {
  fullName: string
  email: string
  phone: string
  password: string
  role: CreateUserRole
}

const emptyCreateUserForm: CreateUserForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "CUSTOMER",
}

interface ManagedUser {
  id: string
  email: string
  name: string
  fullName: string
  phone?: string | null
  role: Role
  status: UserStatus
  createdAt: string
  updatedAt: string
  _count: { bookings: number; rooms: number }
}

interface PaginatedResponse {
  data: ManagedUser[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

interface UserStats {
  total: number
  tenants: number
  landlords: number
  communityManagers: number
  locked: number
  deleted: number
  newThisMonth: number
}

const roleLabels: Record<Role, string> = {
  CUSTOMER: "Người thuê",
  HOST: "Chủ nhà",
  ADMIN: "Quản trị viên",
  COMMUNITY_MANAGER: "Community Manager",
}

const statusLabels: Record<UserStatus, string> = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  DELETED: "Đã xóa",
}

const actionContent: Record<ActionType, { title: string; confirm: string }> = {
  lock: { title: "Khóa tài khoản", confirm: "Khóa tài khoản" },
  unlock: { title: "Mở khóa tài khoản", confirm: "Mở khóa" },
  delete: { title: "Xóa tài khoản", confirm: "Xóa tài khoản" },
  update_role: { title: "Thay đổi vai trò", confirm: "Lưu vai trò" },
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const data = payload as { error?: unknown; message?: unknown }
    if (typeof data.error === "string") return data.error
    if (typeof data.message === "string") return data.message
  }
  return fallback
}

function getPageItems(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b)
  const result: Array<number | "ellipsis"> = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("ellipsis")
    result.push(page)
  })
  return result
}

export default function UserManagement() {
  const { token, user: currentUser, isLoading: authLoading } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [actionType, setActionType] = useState<ActionType | null>(null)
  const [actionReason, setActionReason] = useState("")
  const [newRole, setNewRole] = useState<Role>("CUSTOMER")
  const [actionLoading, setActionLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreateUserForm)
  const [createLoading, setCreateLoading] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, roleFilter, statusFilter])

  const requestHeaders = useMemo(
    () => token ? { Authorization: `Bearer ${token}` } : undefined,
    [token],
  )

  const loadStats = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/stats/users", {
      headers: requestHeaders,
      credentials: "include",
      signal,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(getErrorMessage(payload, "Không thể tải thống kê người dùng"))
    setStats(payload as UserStats)
  }, [requestHeaders])

  const loadUsers = useCallback(async (signal?: AbortSignal, manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (roleFilter) params.set("role", roleFilter)
      if (statusFilter) params.set("status", statusFilter)

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: requestHeaders,
        credentials: "include",
        signal,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getErrorMessage(payload, "Không thể tải danh sách người dùng"))
      const result = payload as PaginatedResponse
      setUsers(result.data)
      setPagination(result.pagination)
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách người dùng")
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [debouncedSearch, page, requestHeaders, roleFilter, statusFilter])

  useEffect(() => {
    if (authLoading) return
    const controller = new AbortController()
    void Promise.allSettled([loadUsers(controller.signal), loadStats(controller.signal)])
    return () => controller.abort()
  }, [authLoading, loadStats, loadUsers, reloadVersion])

  const refreshAll = async () => {
    setSuccess("")
    await Promise.allSettled([loadUsers(undefined, true), loadStats()])
  }

  const clearFilters = () => {
    setSearch("")
    setDebouncedSearch("")
    setRoleFilter("")
    setStatusFilter("")
    setPage(1)
  }

  const openAction = (managedUser: ManagedUser, type: ActionType) => {
    setSelectedUser(managedUser)
    setActionType(type)
    setActionReason("")
    setNewRole(managedUser.role)
    setError("")
  }

  const closeAction = () => {
    if (actionLoading) return
    setSelectedUser(null)
    setActionType(null)
    setActionReason("")
  }

  const handleAction = async () => {
    if (!selectedUser || !actionType) return
    setActionLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...requestHeaders },
        credentials: "include",
        body: JSON.stringify({
          action: actionType,
          reason: actionReason.trim() || undefined,
          ...(actionType === "update_role" ? { newRole } : {}),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getErrorMessage(payload, "Không thể thực hiện thao tác"))

      const message = actionType === "lock"
        ? "Đã khóa tài khoản"
        : actionType === "unlock"
          ? "Đã mở khóa tài khoản"
          : actionType === "delete"
            ? "Đã đánh dấu tài khoản là đã xóa"
            : "Đã cập nhật vai trò người dùng"
      setSelectedUser(null)
      setActionType(null)
      setActionReason("")
      setSuccess(message)
      await Promise.allSettled([loadUsers(), loadStats()])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thực hiện thao tác")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateUser = async () => {
    setCreateLoading(true)
    setError("")
    setSuccess("")
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...requestHeaders },
        credentials: "include",
        body: JSON.stringify(createForm),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getErrorMessage(payload, "Không thể tạo người dùng"))

      setCreateOpen(false)
      setCreateForm(emptyCreateUserForm)
      setShowCreatePassword(false)
      clearFilters()
      setSuccess("Đã tạo tài khoản người dùng mới")
      setReloadVersion((version) => version + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo người dùng")
    } finally {
      setCreateLoading(false)
    }
  }

  const activeFilters = Boolean(search || roleFilter || statusFilter)
  const activeUsers = stats
    ? Math.max(0, stats.total - stats.locked - stats.deleted)
    : 0

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Thống kê người dùng">
        <StatCard label="Tổng tài khoản" value={stats?.total ?? 0} icon={<Users className="h-5 w-5" />} tone="blue" />
        <StatCard label="Đang hoạt động" value={activeUsers} icon={<ShieldCheck className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Đang bị khóa" value={stats?.locked ?? 0} icon={<Lock className="h-5 w-5" />} tone="amber" />
        <StatCard label="Mới trong tháng" value={stats?.newThisMonth ?? 0} icon={<UserPlus className="h-5 w-5" />} tone="rose" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Tìm kiếm người dùng</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, email hoặc số điện thoại"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[420px]">
            <FilterSelect label="Vai trò" value={roleFilter} onChange={setRoleFilter}>
              <option value="">Tất cả vai trò</option>
              <option value="CUSTOMER">Người thuê</option>
              <option value="HOST">Chủ nhà</option>
              <option value="COMMUNITY_MANAGER">Community Manager</option>
              <option value="ADMIN">Quản trị viên</option>
            </FilterSelect>
            <FilterSelect label="Trạng thái" value={statusFilter} onChange={setStatusFilter}>
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
              <option value="DELETED">Đã xóa</option>
            </FilterSelect>
          </div>
          <div className="flex gap-2">
            {activeFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Xóa lọc
              </button>
            )}
            <button
              type="button"
              onClick={refreshAll}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </section>

      {error && <Message tone="error" text={error} />}
      {success && <Message tone="success" text={success} />}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-950">Danh sách tài khoản</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{pagination.total} kết quả phù hợp</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateForm(emptyCreateUserForm)
              setCreateOpen(true)
              setError("")
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            Thêm người dùng
          </button>
        </div>

        {loading ? (
          <UserListSkeleton />
        ) : users.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Users className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-bold text-slate-900">Không tìm thấy người dùng</h3>
            <p className="mt-1 text-sm text-slate-500">Thử thay đổi từ khóa hoặc bộ lọc hiện tại.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="w-[29%] px-5 py-3">Người dùng</th>
                  <th className="w-[16%] px-5 py-3">Vai trò</th>
                  <th className="w-[15%] px-5 py-3">Trạng thái</th>
                  <th className="w-[16%] px-5 py-3">Hoạt động</th>
                  <th className="w-[13%] px-5 py-3">Ngày tham gia</th>
                  <th className="w-[11%] px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((managedUser) => (
                  <UserTableRow
                    key={managedUser.id}
                    user={managedUser}
                    isCurrent={managedUser.id === currentUser?.id}
                    onAction={openAction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!loading && pagination.totalPages > 1 && (
        <Pagination current={pagination.page} total={pagination.totalPages} onChange={setPage} />
      )}

      {selectedUser && actionType && (
        <ActionDialog
          user={selectedUser}
          type={actionType}
          reason={actionReason}
          newRole={newRole}
          loading={actionLoading}
          onReasonChange={setActionReason}
          onRoleChange={setNewRole}
          onClose={closeAction}
          onConfirm={handleAction}
        />
      )}

      {createOpen && (
        <CreateUserDialog
          form={createForm}
          loading={createLoading}
          showPassword={showCreatePassword}
          onChange={(field, value) => setCreateForm((current) => ({ ...current, [field]: value }))}
          onTogglePassword={() => setShowCreatePassword((visible) => !visible)}
          onClose={() => {
            if (createLoading) return
            setCreateOpen(false)
            setCreateForm(emptyCreateUserForm)
            setShowCreatePassword(false)
          }}
          onSubmit={handleCreateUser}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "blue" | "emerald" | "amber" | "rose" }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
  }
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold text-slate-500 sm:text-sm">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-black text-slate-950 sm:text-3xl">{value.toLocaleString("vi-VN")}</p>
    </article>
  )
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  )
}

function UserIdentity({ user, isCurrent }: { user: ManagedUser; isCurrent: boolean }) {
  const displayName = user.fullName || user.name || "Người dùng"
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
        {displayName.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
          {isCurrent && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Bạn</span>}
        </div>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
        {user.phone && <p className="mt-0.5 text-xs text-slate-400">{user.phone}</p>}
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: Role }) {
  const classes: Record<Role, string> = {
    ADMIN: "bg-red-50 text-red-700 ring-red-100",
    HOST: "bg-blue-50 text-blue-700 ring-blue-100",
    CUSTOMER: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    COMMUNITY_MANAGER: "bg-violet-50 text-violet-700 ring-violet-100",
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${classes[role]}`}>{roleLabels[role]}</span>
}

function StatusBadge({ status }: { status: UserStatus }) {
  const classes: Record<UserStatus, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    LOCKED: "bg-amber-50 text-amber-700",
    DELETED: "bg-slate-100 text-slate-600",
  }
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${classes[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabels[status]}</span>
}

function UserActions({ user, isCurrent, onAction }: { user: ManagedUser; isCurrent: boolean; onAction: (user: ManagedUser, type: ActionType) => void }) {
  if (isCurrent) return <span className="text-xs font-semibold text-slate-400">Tài khoản hiện tại</span>
  if (user.status === "DELETED") return <span className="text-xs font-semibold text-slate-400">Không có thao tác</span>
  return (
    <div className="flex items-center justify-end gap-1.5">
      <IconAction label="Đổi vai trò" onClick={() => onAction(user, "update_role")} icon={<UserCog className="h-4 w-4" />} />
      {user.status === "LOCKED" ? (
        <IconAction label="Mở khóa" onClick={() => onAction(user, "unlock")} icon={<Unlock className="h-4 w-4" />} tone="success" />
      ) : (
        <IconAction label="Khóa tài khoản" onClick={() => onAction(user, "lock")} icon={<Lock className="h-4 w-4" />} tone="warning" />
      )}
      <IconAction label="Xóa tài khoản" onClick={() => onAction(user, "delete")} icon={<Trash2 className="h-4 w-4" />} tone="danger" />
    </div>
  )
}

function IconAction({ label, onClick, icon, tone = "default" }: { label: string; onClick: () => void; icon: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const classes = {
    default: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    success: "text-emerald-700 hover:bg-emerald-50",
    warning: "text-amber-700 hover:bg-amber-50",
    danger: "text-red-700 hover:bg-red-50",
  }
  return <button type="button" onClick={onClick} title={label} aria-label={label} className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${classes[tone]}`}>{icon}</button>
}

function UserTableRow({ user, isCurrent, onAction }: { user: ManagedUser; isCurrent: boolean; onAction: (user: ManagedUser, type: ActionType) => void }) {
  return (
    <tr data-user-row={user.id} className="transition hover:bg-slate-50/80">
      <td className="px-5 py-4"><UserIdentity user={user} isCurrent={isCurrent} /></td>
      <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
      <td className="px-5 py-4"><StatusBadge status={user.status} /></td>
      <td className="px-5 py-4 text-sm text-slate-600">
        <span className="font-bold text-slate-900">{user._count.bookings}</span> booking · <span className="font-bold text-slate-900">{user._count.rooms}</span> phòng
      </td>
      <td className="px-5 py-4 text-sm font-semibold text-slate-500">
        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
      </td>
      <td className="px-5 py-4">
        <UserActions user={user} isCurrent={isCurrent} onAction={onAction} />
      </td>
    </tr>
  )
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Phân trang người dùng">
      <button type="button" onClick={() => onChange(current - 1)} disabled={current === 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></button>
      {getPageItems(current, total).map((item, index) => item === "ellipsis" ? (
        <span key={`ellipsis-${index}`} className="flex h-9 w-8 items-center justify-center text-sm text-slate-400">…</span>
      ) : (
        <button key={item} type="button" onClick={() => onChange(item)} aria-current={item === current ? "page" : undefined} className={`h-9 min-w-9 rounded-lg px-2 text-sm font-bold ${item === current ? "bg-slate-950 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>{item}</button>
      ))}
      <button type="button" onClick={() => onChange(current + 1)} disabled={current === total} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></button>
    </nav>
  )
}

function ActionDialog({ user, type, reason, newRole, loading, onReasonChange, onRoleChange, onClose, onConfirm }: { user: ManagedUser; type: ActionType; reason: string; newRole: Role; loading: boolean; onReasonChange: (value: string) => void; onRoleChange: (value: Role) => void; onClose: () => void; onConfirm: () => void }) {
  const destructive = type === "lock" || type === "delete"
  const reasonRequired = destructive
  const confirmDisabled = loading || (reasonRequired && reason.trim().length < 5) || (type === "update_role" && newRole === user.role)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="user-action-title">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${destructive ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}><UserCog className="h-5 w-5" /></span>
            <div><h2 id="user-action-title" className="font-bold text-slate-950">{actionContent[type].title}</h2><p className="text-sm text-slate-500">{user.fullName || user.name}</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X className="h-4 w-4" /></button>
        </div>

        {type === "delete" && <p className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-800">Tài khoản sẽ bị vô hiệu hóa và không thể đăng nhập. Thao tác được lưu vào nhật ký quản trị.</p>}
        {type === "update_role" && (
          <label className="mt-5 block"><span className="mb-2 block text-xs font-bold uppercase text-slate-500">Vai trò mới</span><select value={newRole} onChange={(event) => onRoleChange(event.target.value as Role)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        )}
        <label className="mt-5 block"><span className="mb-2 block text-xs font-bold uppercase text-slate-500">Lý do {reasonRequired ? "*" : "(không bắt buộc)"}</span><textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} rows={3} placeholder="Ghi rõ lý do để lưu trong nhật ký quản trị" className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />{reasonRequired && reason.length > 0 && reason.trim().length < 5 && <span className="mt-1 block text-xs font-semibold text-red-600">Lý do cần ít nhất 5 ký tự.</span>}</label>
        <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} disabled={loading} className="h-11 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Hủy</button><button type="button" onClick={onConfirm} disabled={confirmDisabled} className={`h-11 rounded-lg text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-slate-950 hover:bg-slate-800"}`}>{loading ? "Đang xử lý..." : actionContent[type].confirm}</button></div>
      </div>
    </div>
  )
}

function CreateUserDialog({ form, loading, showPassword, onChange, onTogglePassword, onClose, onSubmit }: {
  form: CreateUserForm
  loading: boolean
  showPassword: boolean
  onChange: (field: keyof CreateUserForm, value: string) => void
  onTogglePassword: () => void
  onClose: () => void
  onSubmit: () => void
}) {
  const valid = form.fullName.trim().length >= 2
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    && form.password.length >= 8
    && (!form.phone.trim() || /^\+?[0-9\s.-]{9,20}$/.test(form.phone.trim()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
      <form
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid && !loading) onSubmit()
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><UserPlus className="h-5 w-5" /></span>
            <div>
              <h2 id="create-user-title" className="font-bold text-slate-950">Thêm người dùng</h2>
              <p className="text-sm text-slate-500">Tạo tài khoản mới trên hệ thống</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <CreateField label="Họ và tên" className="sm:col-span-2">
            <input autoFocus value={form.fullName} onChange={(event) => onChange("fullName", event.target.value)} placeholder="Nguyễn Văn An" className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </CreateField>
          <CreateField label="Địa chỉ email" className="sm:col-span-2">
            <input type="email" value={form.email} onChange={(event) => onChange("email", event.target.value)} placeholder="nguyenvanan@example.com" className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </CreateField>
          <CreateField label="Số điện thoại (không bắt buộc)">
            <input type="tel" value={form.phone} onChange={(event) => onChange("phone", event.target.value)} placeholder="0901234567" className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </CreateField>
          <CreateField label="Vai trò">
            <select value={form.role} onChange={(event) => onChange("role", event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="CUSTOMER">Người thuê</option>
              <option value="HOST">Chủ nhà</option>
              <option value="COMMUNITY_MANAGER">Community Manager</option>
            </select>
          </CreateField>
          <CreateField label="Mật khẩu" className="sm:col-span-2">
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => onChange("password", event.target.value)} placeholder="Tối thiểu 8 ký tự" className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-11 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <button type="button" onClick={onTogglePassword} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            <span className="mt-1.5 block text-xs text-slate-500">Sử dụng từ 8 đến 72 ký tự.</span>
          </CreateField>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="h-11 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Hủy</button>
          <button type="submit" disabled={!valid || loading} className="h-11 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Đang tạo..." : "Tạo tài khoản"}</button>
        </div>
      </form>
    </div>
  )
}

function CreateField({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={className}><span className="mb-2 block text-xs font-bold uppercase text-slate-500">{label}</span>{children}</label>
}

function Message({ tone, text }: { tone: "error" | "success"; text: string }) {
  const success = tone === "success"
  return <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{success ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}{text}</div>
}

function UserListSkeleton() {
  return <div className="animate-pulse divide-y divide-slate-100">{Array.from({ length: 6 }, (_, index) => <div key={index} className="flex items-center gap-4 px-5 py-5"><div className="h-10 w-10 rounded-full bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-3 w-40 rounded bg-slate-100" /><div className="h-3 w-56 rounded bg-slate-100" /></div><div className="hidden h-8 w-24 rounded bg-slate-100 sm:block" /><div className="h-8 w-24 rounded bg-slate-100" /></div>)}</div>
}
