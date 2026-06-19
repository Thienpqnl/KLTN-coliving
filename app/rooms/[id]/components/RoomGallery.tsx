'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type GalleryOccupancyInfo = {
  current: number
  max: number
  available: number
  percentage: number
  label: string
  tone: 'available' | 'limited' | 'full'
}

const fallbackImage = 'https://via.placeholder.com/900x600?text=Room'

export function RoomGallery({
  images,
  title,
  postedDate,
  occupancy,
}: {
  images: string[]
  title: string
  postedDate?: string | null
  occupancy?: GalleryOccupancyInfo | null
}) {
  const galleryImages = useMemo(() => (images.length > 0 ? images : [fallbackImage]), [images])
  const featuredImage = galleryImages[0]
  const sideImages = galleryImages.slice(1, 5)
  const thumbnailImages = galleryImages.slice(0, 12)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const selectedImage = selectedIndex === null ? null : galleryImages[selectedIndex]
  const hasMultipleImages = galleryImages.length > 1
  const occupancyTone = occupancy?.tone === 'full'
    ? {
        badge: 'border-rose-200 bg-rose-50 text-rose-800',
        icon: 'bg-rose-100 text-rose-700',
        bar: 'bg-rose-500',
      }
    : occupancy?.tone === 'limited'
      ? {
          badge: 'border-amber-200 bg-amber-50 text-amber-900',
          icon: 'bg-amber-100 text-amber-700',
          bar: 'bg-amber-500',
        }
      : {
          badge: 'border-emerald-200 bg-emerald-50 text-emerald-900',
          icon: 'bg-emerald-100 text-emerald-700',
          bar: 'bg-emerald-500',
        }

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null)
  }, [])

  const showPrevious = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null) return current
      return current === 0 ? galleryImages.length - 1 : current - 1
    })
  }, [galleryImages.length])

  const showNext = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null) return current
      return current === galleryImages.length - 1 ? 0 : current + 1
    })
  }, [galleryImages.length])

  useEffect(() => {
    if (selectedIndex === null) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox()
      if (event.key === 'ArrowLeft' && hasMultipleImages) showPrevious()
      if (event.key === 'ArrowRight' && hasMultipleImages) showNext()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeLightbox, hasMultipleImages, selectedIndex, showNext, showPrevious])

  return (
    <section className="mx-auto mb-10 max-w-7xl px-8">
      <div className={sideImages.length > 0 ? 'grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]' : 'grid'}>
        <button
          type="button"
          onClick={() => setSelectedIndex(0)}
          className="group relative h-[280px] cursor-zoom-in overflow-hidden rounded-[1.5rem] bg-slate-200 text-left shadow-sm md:h-[380px] lg:h-[430px]"
          aria-label="Xem ảnh gốc"
        >
          <img
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            src={featuredImage}
            alt={title}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg backdrop-blur">
            Ảnh nổi bật
          </div>
          <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-xs font-black uppercase tracking-wider text-white opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:opacity-100">
            <span className="material-symbols-outlined text-base">zoom_in</span>
            Xem ảnh
          </div>
        </button>

        {sideImages.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {sideImages.map((image, index) => {
              const imageIndex = index + 1

              return (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  onClick={() => setSelectedIndex(imageIndex)}
                  className="group relative h-[132px] cursor-zoom-in overflow-hidden rounded-2xl bg-slate-200 text-left md:h-[182px] lg:h-[208px]"
                  aria-label={`Xem ảnh ${imageIndex + 1}`}
                >
                  <img
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src={image}
                    alt={`${title} - ảnh ${imageIndex + 1}`}
                  />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
                  {index === 3 && galleryImages.length > 5 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-4">
                      <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg">
                        <span className="material-symbols-outlined text-base">photo_library</span>
                        +{galleryImages.length - 5} ảnh
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {thumbnailImages.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {thumbnailImages.map((image, index) => (
            <button
              type="button"
              key={`thumb-${image}-${index}`}
              onClick={() => setSelectedIndex(index)}
              className="relative h-16 w-24 flex-none cursor-zoom-in overflow-hidden rounded-xl bg-slate-200 ring-1 ring-black/5 transition hover:ring-orange-500 md:h-20 md:w-32"
              aria-label={`Xem ảnh ${index + 1}`}
            >
              <img
                className="h-full w-full object-cover"
                src={image}
                alt={`${title} - thumbnail ${index + 1}`}
              />
              {index === thumbnailImages.length - 1 && galleryImages.length > thumbnailImages.length && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-xs font-black text-white">+{galleryImages.length - thumbnailImages.length}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {(postedDate || occupancy) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
          {postedDate && (
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="material-symbols-outlined text-lg text-orange-700">calendar_month</span>
              <span>Ngày đăng: {postedDate}</span>
            </div>
          )}

          {occupancy && (
            <div className={`flex min-w-[260px] items-center gap-3 rounded-full border px-4 py-2 shadow-sm ${occupancyTone.badge}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${occupancyTone.icon}`}>
                <span className="material-symbols-outlined block translate-y-px text-xl leading-none">
                  groups
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-black">{occupancy.label}</span>
                  <span className="shrink-0 text-xs font-bold opacity-80">
                    {occupancy.current}/{occupancy.max} người
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/80">
                  <div
                    className={`h-full rounded-full ${occupancyTone.bar}`}
                    style={{ width: `${occupancy.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phòng"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Đóng ảnh"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  showPrevious()
                }}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:left-8"
                aria-label="Ảnh trước"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  showNext()
                }}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:right-8"
                aria-label="Ảnh tiếp theo"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </>
          )}

          <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
            {(selectedIndex ?? 0) + 1} / {galleryImages.length}
          </div>

          <img
            src={selectedImage}
            alt={`${title} - ảnh gốc ${(selectedIndex ?? 0) + 1}`}
            className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
