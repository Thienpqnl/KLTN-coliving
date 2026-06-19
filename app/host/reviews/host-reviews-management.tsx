"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { MessageSquareText, Star, Home, TrendingUp, Search } from "lucide-react"

type HostReview = {
  id: string
  roomId: string
  rating: number
  comment?: string | null
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
    priceText?: string | null
    priceValue?: number | string | null
  }
}

type HostReviewsPayload = {
  reviews: HostReview[]
  stats: {
    totalReviews: number
    averageRating: number
    reviewedRooms: number
    ratingDistribution: Array<{
      rating: number
      count: number
    }>
  }
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

function StatCard({
  icon,
  label,
  value,
  tone = "orange",
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone?: "orange" | "blue" | "green"
}) {
  const toneClass = {
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
  }[tone]

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass} ring-1 ring-white/70`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}

export function HostReviewsManagement() {
  const [payload, setPayload] = useState<HostReviewsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [ratingFilter, setRatingFilter] = useState("all")

  useEffect(() => {
    let cancelled = false

    const fetchReviews = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/host/reviews", {
          credentials: "include",
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể tải đánh giá")
        }

        if (!cancelled) {
          setPayload(result.data)
        }
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Không thể tải đánh giá")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchReviews()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredReviews = useMemo(() => {
    const reviews = payload?.reviews ?? []
    const normalizedSearch = search.trim().toLowerCase()

    return reviews.filter((review) => {
      const reviewerName = review.user.fullName || review.user.name || review.user.email || ""
      const matchesSearch =
        !normalizedSearch ||
        review.room.title.toLowerCase().includes(normalizedSearch) ||
        reviewerName.toLowerCase().includes(normalizedSearch) ||
        (review.comment || "").toLowerCase().includes(normalizedSearch)

      const matchesRating = ratingFilter === "all" || review.rating === Number(ratingFilter)

      return matchesSearch && matchesRating
    })
  }, [payload, ratingFilter, search])

  const stats = payload?.stats
  const totalReviews = stats?.totalReviews ?? 0

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-slate-950 via-orange-800 to-sky-800 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-4xl">
            Đánh giá phòng
          </h1>
        </div>

        <Link
          href="/room-management"
          className="inline-flex items-center justify-center rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
        >
          Xem phòng của tôi
        </Link>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Điểm trung bình"
          value={(stats?.averageRating ?? 0).toFixed(1)}
        />
        <StatCard
          icon={<MessageSquareText className="h-5 w-5" />}
          label="Tổng đánh giá"
          value={totalReviews}
          tone="blue"
        />
        <StatCard
          icon={<Home className="h-5 w-5" />}
          label="Phòng có đánh giá"
          value={stats?.reviewedRooms ?? 0}
          tone="green"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <h2 className="font-bold text-foreground">Phân bố số sao</h2>
          </div>

          <div className="space-y-3">
            {(stats?.ratingDistribution ?? [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 }))).map((item) => {
              const percent = totalReviews ? Math.round((item.count / totalReviews) * 100) : 0

              return (
                <div key={item.rating} className="grid grid-cols-[48px_minmax(0,1fr)_40px] items-center gap-3 text-sm">
                  <span className="font-semibold text-foreground">{item.rating} sao</span>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="text-right font-semibold text-muted-foreground">{item.count}</span>
                </div>
              )
            })}
          </div>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-xl shadow-slate-200/60 backdrop-blur md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo phòng, người thuê hoặc nội dung..."
                className="h-11 w-full rounded-2xl border border-orange-100 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <select
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
              className="h-11 rounded-2xl border border-orange-100 bg-white px-3 text-sm font-medium outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            >
              <option value="all">Tất cả số sao</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>
          </div>

          {isLoading ? (
            <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 text-center text-sm font-medium text-muted-foreground shadow-xl shadow-slate-200/60">
              Đang tải đánh giá...
            </div>
          ) : filteredReviews.length > 0 ? (
            filteredReviews.map((review) => {
              const reviewerName = review.user.fullName || review.user.name || review.user.email || "Người thuê"
              const initial = reviewerName.charAt(0).toUpperCase()

              return (
                <article key={review.id} className="rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                      {review.room.image ? (
                        <img
                          src={review.room.image}
                          alt={review.room.title}
                          className="h-20 w-24 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-24 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                          <Home className="h-5 w-5" />
                        </div>
                      )}

                      <div>
                        <Link href={`/rooms/${review.room.id}`} className="font-bold text-foreground hover:text-orange-600">
                          {review.room.title}
                        </Link>
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{review.room.address}</p>
                        <div className="mt-3 flex items-center gap-2">
                          {review.user.avatarUrl ? (
                            <img
                              src={review.user.avatarUrl}
                              alt={reviewerName}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                              {initial}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{reviewerName}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Stars rating={review.rating} />
                  </div>

                  {review.comment && (
                    <p className="mt-4 whitespace-pre-line rounded-2xl bg-orange-50/70 p-4 text-sm leading-relaxed text-slate-700">
                      {review.comment}
                    </p>
                  )}
                </article>
              )
            })
          ) : (
            <div className="rounded-[2rem] border border-white/80 bg-white/85 p-8 text-center shadow-xl shadow-slate-200/60">
              <p className="font-semibold text-foreground">Chưa có đánh giá phù hợp</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Khi người thuê đánh giá phòng của bạn, đánh giá sẽ hiển thị tại đây.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
