'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type ReviewUser = {
  id: string
  name?: string | null
  fullName?: string | null
  avatarUrl?: string | null
}

type Review = {
  id: string
  rating: number
  comment?: string | null
  createdAt: string
  user: ReviewUser
}

type ReviewsPayload = {
  reviews: Review[]
  averageRating: number
  totalReviews: number
  eligibility: {
    canReview: boolean
    reason?: string | null
    existingReviewId?: string
  }
}

const ratingLabels: Record<number, string> = {
  1: 'Rất không hài lòng',
  2: 'Chưa hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng',
}

function Stars({
  rating,
  interactive = false,
  onChange,
}: {
  rating: number
  interactive?: boolean
  onChange?: (rating: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => {
        const active = value <= rating
        const className = active ? 'text-orange-500' : 'text-slate-300'

        if (!interactive) {
          return (
            <span key={value} className={`material-symbols-outlined text-xl ${className}`}>
              star
            </span>
          )
        }

        return (
          <button
            key={value}
            type="button"
            aria-label={`Chọn ${value} sao`}
            onClick={() => onChange?.(value)}
            className={`rounded-full p-1 transition hover:bg-orange-50 ${className}`}
          >
            <span className="material-symbols-outlined text-3xl">star</span>
          </button>
        )
      })}
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function RoomReviews({ roomId }: { roomId: string }) {
  const [payload, setPayload] = useState<ReviewsPayload | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const ratingBreakdown = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((value) => ({
      rating: value,
      count: payload?.reviews.filter((review) => review.rating === value).length ?? 0,
    }))

    return counts.map((item) => ({
      ...item,
      percent: payload?.totalReviews ? Math.round((item.count / payload.totalReviews) * 100) : 0,
    }))
  }, [payload])

  useEffect(() => {
    let cancelled = false

    const fetchReviews = async () => {
      setIsLoading(true)
      setMessage(null)

      try {
        const response = await fetch(`/api/rooms/${roomId}/reviews`, {
          credentials: 'include',
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Không thể tải đánh giá phòng')
        }

        if (!cancelled) {
          setPayload(result.data)
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Không thể tải đánh giá phòng')
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
  }, [roomId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/rooms/${roomId}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Không thể gửi đánh giá')
      }

      setPayload({
        reviews: result.data.reviews,
        averageRating: result.data.averageRating,
        totalReviews: result.data.totalReviews,
        eligibility: result.data.eligibility,
      })
      setComment('')
      setRating(5)
      setMessage('Đã gửi đánh giá của bạn.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể gửi đánh giá')
    } finally {
      setIsSubmitting(false)
    }
  }

  const reviews = payload?.reviews ?? []
  const totalReviews = payload?.totalReviews ?? 0
  const averageRating = payload?.averageRating ?? 0
  const canReview = payload?.eligibility.canReview ?? false
  const reason = payload?.eligibility.reason

  return (
    <section className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">
            Cảm nhận thực tế
          </p>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 text-orange-700 shadow-sm ring-1 ring-orange-100">
              <span className="material-symbols-outlined block translate-y-px text-2xl leading-none">
                reviews
              </span>
            </span>
            <div>
              <h3 className="bg-gradient-to-r from-slate-950 via-orange-900 to-slate-700 bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl">
                Trải nghiệm từ người thuê
              </h3>
              <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-orange-600 to-amber-300" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 px-6 py-4 shadow-sm ring-1 ring-orange-100">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-slate-950">{averageRating.toFixed(1)}</span>
            <div>
              <Stars rating={Math.round(averageRating)} />
              <p className="mt-1 text-sm font-medium text-slate-500">{totalReviews} đánh giá</p>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4 text-sm font-semibold text-orange-900">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="space-y-3">
            {ratingBreakdown.map((item) => (
              <div key={item.rating} className="grid grid-cols-[44px_minmax(0,1fr)_42px] items-center gap-3 text-sm">
                <span className="font-bold text-slate-700">{item.rating} sao</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <span className="text-right font-semibold text-slate-500">{item.count}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-5">
            {canReview ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">Đánh giá của bạn</label>
                  <Stars rating={rating} interactive onChange={setRating} />
                  <p className="mt-1 text-sm font-medium text-orange-700">{ratingLabels[rating]}</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">Nhận xét</label>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={500}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    placeholder="Chia sẻ trải nghiệm thực tế của bạn về phòng ở..."
                  />
                  <p className="mt-1 text-right text-xs font-medium text-slate-400">{comment.length}/500</p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                  <span className="material-symbols-outlined text-base">send</span>
                </button>
              </form>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-600">
                {reason || 'Bạn chưa đủ điều kiện để đánh giá phòng này.'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-2xl bg-white p-6 text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
              Đang tải đánh giá...
            </div>
          ) : reviews.length > 0 ? (
            reviews.map((review) => {
              const displayName = review.user.fullName || review.user.name || 'Người thuê'
              const initial = displayName.charAt(0).toUpperCase()

              return (
                <article key={review.id} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {review.user.avatarUrl ? (
                        <img
                          src={review.user.avatarUrl}
                          alt={displayName}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-700">
                          {initial}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-950">{displayName}</h4>
                        <p className="text-xs font-medium text-slate-500">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                    <Stars rating={review.rating} />
                  </div>

                  {review.comment && (
                    <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {review.comment}
                    </p>
                  )}
                </article>
              )
            })
          ) : (
            <div className="rounded-2xl bg-white p-6 text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
              Chưa có đánh giá nào cho phòng này.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
