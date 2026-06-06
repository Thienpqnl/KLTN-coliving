"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Role, UserStatus } from "@prisma/client"
import { Search, Lock, Unlock, Trash2, Shield, AlertCircle } from "lucide-react"

interface User {
  id: string
  email: string
  name: string
  fullName: string
  phone?: string
  role: Role
  status: UserStatus
  createdAt: string
  updatedAt: string
  _count: {
    bookings: number
    rooms: number
  }
}

interface PaginatedResponse {
  data: User[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function UserManagement() {
  const { token, user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionModal, setActionModal] = useState(false)
  const [actionType, setActionType] = useState<
    "lock" | "unlock" | "delete" | "update_role" | null
  >(null)
  const [actionReason, setActionReason] = useState("")
  const [newRole, setNewRole] = useState<Role | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
      })

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error("Không thể tải danh sách người dùng")

      const data: PaginatedResponse = await res.json()
      setUsers(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError("Không thể tải danh sách người dùng")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchUsers(1)
    }
  }, [token])

  useEffect(() => {
    if (token && pagination.page > 0) {
      fetchUsers(1)
    }
  }, [search, roleFilter, statusFilter])

  const handleAction = async () => {
    if (!selectedUser || !actionType) return

    try {
      setActionLoading(true)
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason,
          ...(actionType === "update_role" && { newRole }),
        }),
      })

      if (!res.ok) throw new Error("Thao tác thất bại")

      setActionModal(false)
      setActionReason("")
      setNewRole(null)
      setActionType(null)
      setSelectedUser(null)
      await fetchUsers(pagination.page)
    } catch (err) {
      setError("Không thể thực hiện thao tác")
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const openActionModal = (user: User, type: typeof actionType) => {
    setSelectedUser(user)
    setActionType(type)
    setActionModal(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Search className="h-5 w-5" />
          Tìm kiếm & lọc
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Tìm theo tên, email hoặc số điện thoại"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tất cả vai trò</option>
            <option value="CUSTOMER">Người thuê</option>
            <option value="HOST">Chủ nhà</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
            <option value="DELETED">Đã xóa</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Người dùng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Vai trò</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Booking</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Phòng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Ngày tham gia</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{user.name}</p>
                        {user.id === currentUser?.id && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            Tài khoản hiện tại
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === "ADMIN"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : user.role === "HOST"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      }`}
                    >
                      {user.role === "ADMIN" ? "Admin" : user.role === "HOST" ? "Chủ nhà" : "Người thuê"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : user.status === "LOCKED"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                      }`}
                    >
                      {user.status === "ACTIVE" ? "Đang hoạt động" : user.status === "LOCKED" ? "Đã khóa" : "Đã xóa"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-foreground font-medium">{user._count.bookings}</td>
                  <td className="px-6 py-4 text-center text-foreground font-medium">{user._count.rooms}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4">
                    {user.id === currentUser?.id ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        Không thể tự khóa
                      </span>
                    ) : (
                    <div className="flex gap-2">
                      {user.status === "ACTIVE" && (
                        <button
                          onClick={() => openActionModal(user, "lock")}
                          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1.5 rounded transition-colors flex items-center gap-1"
                        >
                          <Lock className="h-3 w-3" />
                          Khóa
                        </button>
                      )}
                      {user.status === "LOCKED" && (
                        <button
                          onClick={() => openActionModal(user, "unlock")}
                          className="text-xs bg-green-500 hover:bg-green-600 text-white px-2.5 py-1.5 rounded transition-colors flex items-center gap-1"
                        >
                          <Unlock className="h-3 w-3" />
                          Mở khóa
                        </button>
                      )}
                      <button
                        onClick={() => openActionModal(user, "delete")}
                        className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Xóa
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Hiển thị {(pagination.page - 1) * pagination.limit + 1} đến{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số{" "}
          {pagination.total} người dùng
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => fetchUsers(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-border rounded-lg bg-background hover:bg-secondary transition-colors disabled:opacity-50 text-sm font-medium"
          >
            Trước
          </button>
          <button
            onClick={() => fetchUsers(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 border border-border rounded-lg bg-background hover:bg-secondary transition-colors disabled:opacity-50 text-sm font-medium"
          >
            Sau
          </button>
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl ring-1 ring-black/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Xác nhận thao tác</h3>
            </div>
            <p className="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {actionType === "lock" && `Khóa tài khoản của ${selectedUser.name}?`}
              {actionType === "unlock" && `Mở khóa tài khoản của ${selectedUser.name}?`}
              {actionType === "delete" && `Xóa tài khoản của ${selectedUser.name}? Tài khoản sẽ được đánh dấu là đã xóa.`}
            </p>

            {actionType === "lock" && (
              <textarea
                placeholder="Lý do khóa tài khoản"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                rows={3}
              />
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setActionModal(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {actionLoading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
