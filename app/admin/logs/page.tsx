"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { FileText, AlertCircle } from "lucide-react"

interface AdminLog {
  id: string
  adminId: string
  admin: {
    id: string
    name: string
    email: string
  }
  action: string
  targetId?: string
  targetType: string
  targetUser?: {
    id: string
    name: string
    email: string
  }
  oldValue?: string
  newValue?: string
  description?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

interface PaginatedResponse {
  data: AdminLog[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function AuditLogs() {
  const { token } = useAuth()
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [targetTypeFilter, setTargetTypeFilter] = useState("")

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(actionFilter && { action: actionFilter }),
        ...(targetTypeFilter && { targetType: targetTypeFilter }),
      })

      const res = await fetch(`/api/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error("Failed to fetch logs")

      const data: PaginatedResponse = await res.json()
      setLogs(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError("Failed to load audit logs")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchLogs(1)
    }
  }, [token])

  useEffect(() => {
    if (token && pagination.page > 0) {
      fetchLogs(1)
    }
  }, [actionFilter, targetTypeFilter])

  const getActionBadgeColor = (action: string) => {
    if (action.includes("lock")) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
    if (action.includes("unlock")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    if (action.includes("delete")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    if (action.includes("create")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    if (action.includes("update")) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
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
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Filter Logs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Actions</option>
            <option value="lock_user">Lock User</option>
            <option value="unlock_user">Unlock User</option>
            <option value="delete_user">Delete User</option>
            <option value="update_user_role">Update Role</option>
          </select>
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Target Types</option>
            <option value="user">User</option>
            <option value="room">Room</option>
            <option value="booking">Booking</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Admin</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Action</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Target</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">{log.admin.name}</p>
                      <p className="text-xs text-muted-foreground">{log.admin.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionBadgeColor(log.action)}`}
                    >
                      {log.action.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      {log.targetUser ? (
                        <>
                          <p className="font-medium text-foreground">
                            {log.targetUser.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.targetUser.email}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {log.targetType} ({log.targetId})
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {log.description || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
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
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total} logs
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => fetchLogs(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-border rounded-lg bg-background hover:bg-secondary transition-colors disabled:opacity-50 text-sm font-medium"
          >
            Previous
          </button>
          <button
            onClick={() => fetchLogs(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 border border-border rounded-lg bg-background hover:bg-secondary transition-colors disabled:opacity-50 text-sm font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
