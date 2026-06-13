"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  Eye,
  EyeOff,
  MessageSquareText,
  RotateCcw,
  Search,
  Star,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"

type ReviewStatus = "VISIBLE" | "HIDDEN" | "DELETED"
type ReviewAction = "hide" | "restore" | "delete"

interface AdminReview {
  id: string
  rating: number
  comment?: string | null
  status: ReviewStatus
  createdAt: string
  user: {
    id: string
    name?: string | null
    fullName?: string | null
    email?: string | null
    avatarUrl?: string | null
  }
  room: {
    id: string
    title: string
    address: string
    image?: string | null
    owner?: {
      id: string
      name?: string | null
      fullName?: string | null
      email?: string | null
    } | null
  }
}

interface AdminReviewResponse {
  data: AdminReview[]
  stats: {
    total: number
    visible: number
    hidden: number
    deleted: number
    averageRating: number
  }
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const statusLabels: Record<ReviewStatus, string> = {
  VISIBLE: "Đang hiển thị",
  HIDDEN: "Đã ẩn",
  DELETED: "Đã xóa",
}

const statusClasses: Record<ReviewStatus, string> = {
  VISIBLE: "bg-emerald-100 text-emerald-800",
  HIDDEN: "bg-orange-100 text-orange-800",
  DELETED: "bg-slate-200 text-slate-700",
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-4 w-4 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
        />
      ))}
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

export default function AdminReviewsPage() {
  const { token } = useAuth()
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [stats, setStats] = useState<AdminReviewResponse["stats"]>({
    total: 0,
    visible: 0,
    hidden: 0,
    deleted: 0,
    averageRating: 0,
  })
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [ratingFilter, setRatingFilter] = useState("")
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null)
  const [actionType, setActionType] = useState<ReviewAction | null>(null)
  const [actionReason, setActionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const fetchReviews = useCallback(async (page = 1) => {
    if (!token) return

    try {
      setLoading(true)
      setError("")
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(ratingFilter && { rating: ratingFilter }),
      })

      const response = await fetch(`/api/admin/reviews?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Không thể tải danh sách đánh giá")
      }

      const payload: AdminReviewResponse = await response.json()
      setReviews(payload.data)
      setStats(payload.stats)
      setPagination(payload.pagination)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tải danh sách đánh giá")
    } finally {
      setLoading(false)
    }
  }, [ratingFilter, search, statusFilter, token])

  useEffect(() => {
    if (token) {
      const timeout = window.setTimeout(() => fetchReviews(1), 250)
      return () => window.clearTimeout(timeout)
    }
  }, [fetchReviews, token])

  const actionCopy = useMemo(() => {
    if (actionType === "hide") {
      return {
        title: "Ẩn đánh giá",
        description: "Đánh giá sẽ không còn hiển thị công khai và không được tính vào điểm trung bình.",
        button: "Ẩn đánh giá",
      }
    }
    if (actionType === "restore") {
      return {
        title: "Khôi phục đánh giá",
        description: "Đánh giá sẽ hiển thị lại công khai và được tính vào điểm trung bình.",
        button: "Khôi phục",
      }
    }
    return {
      title: "Xóa đánh giá",
      description: "Đánh giá sẽ được đánh dấu đã xóa và không hiển thị trong hệ thống công khai.",
      button: "Xóa đánh giá",
    }
  }, [actionType])

  const openActionModal = (review: AdminReview, action: ReviewAction) => {
    setSelectedReview(review)
    setActionType(action)
    setActionReason("")
  }

  const handleAction = async () => {
    if (!selectedReview || !actionType || !token) return

    try {
      setActionLoading(true)
      setError("")
      const response = await fetch(`/api/admin/reviews/${selectedReview.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Không thể cập nhật đánh giá")
      }

      setSelectedReview(null)
      setActionType(null)
      setActionReason("")
      await fetchReviews(pagination.page)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể cập nhật đánh giá")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Tổng đánh giá</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Điểm trung bình</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.averageRating.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Đang hiển thị</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.visible}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Đã ẩn/xóa</p>
          <p className="mt-2 text-2xl font-bold text-orange-700">{stats.hidden + stats.deleted}</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Search className="h-5 w-5" />
          Tìm kiếm & lọc
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo phòng, người thuê, chủ nhà hoặc nội dung"
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="VISIBLE">Đang hiển thị</option>
            <option value="HIDDEN">Đã ẩn</option>
            <option value="DELETED">Đã xóa</option>
          </select>
          <select
            value={ratingFilter}
            onChange={(event) => setRatingFilter(event.target.value)}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tất cả số sao</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-secondary">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Đánh giá</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Phòng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Người thuê</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Chủ nhà</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                    Đang tải đánh giá...
                  </td>
                </tr>
              ) : reviews.length > 0 ? (
                reviews.map((review) => {
                  const renterName = review.user.fullName || review.user.name || review.user.email || "Người thuê"
                  const hostName = review.room.owner?.fullName || review.room.owner?.name || review.room.owner?.email || "Chủ nhà"

                  return (
                    <tr key={review.id} className="align-top transition-colors hover:bg-secondary/50">
                      <td className="max-w-md px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Stars rating={review.rating} />
                          <span className="text-xs font-semibold text-muted-foreground">{formatDate(review.createdAt)}</span>
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground">
                          {review.comment || "Không có nội dung nhận xét"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {review.room.image ? (
                            <img
                              src={review.room.image}
                              alt={review.room.title}
                              className="h-12 w-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                              <MessageSquareText className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <Link href={`/rooms/${review.room.id}`} className="font-medium text-foreground hover:text-red-600">
                              {review.room.title}
                            </Link>
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{review.room.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{renterName}</p>
                        <p className="text-xs text-muted-foreground">{review.user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{hostName}</p>
                        <p className="text-xs text-muted-foreground">{review.room.owner?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[review.status]}`}>
                          {statusLabels[review.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {review.status === "VISIBLE" && (
                            <button
                              onClick={() => openActionModal(review, "hide")}
                              className="inline-flex items-center gap-1 rounded bg-orange-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600"
                            >
                              <EyeOff className="h-3 w-3" />
                              Ẩn
                            </button>
                          )}
                          {review.status !== "VISIBLE" && (
                            <button
                              onClick={() => openActionModal(review, "restore")}
                              className="inline-flex items-center gap-1 rounded bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Khôi phục
                            </button>
                          )}
                          {review.status !== "DELETED" && (
                            <button
                              onClick={() => openActionModal(review, "delete")}
                              className="inline-flex items-center gap-1 rounded bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                              Xóa
                            </button>
                          )}
                          <Link
                            href={`/rooms/${review.room.id}`}
                            className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
                          >
                            <Eye className="h-3 w-3" />
                            Xem
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                    Chưa có đánh giá phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Hiển thị {(pagination.page - 1) * pagination.limit + 1} đến{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số{" "}
          {pagination.total} đánh giá
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => fetchReviews(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
          >
            Trước
          </button>
          <button
            onClick={() => fetchReviews(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </div>

      {selectedReview && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl">
            <h3 className="text-lg font-semibold">{actionCopy.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{actionCopy.description}</p>

            <textarea
              value={actionReason}
              onChange={(event) => setActionReason(event.target.value)}
              placeholder="Lý do kiểm duyệt"
              rows={3}
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
            />

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setSelectedReview(null)
                  setActionType(null)
                  setActionReason("")
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? "Đang xử lý..." : actionCopy.button}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
