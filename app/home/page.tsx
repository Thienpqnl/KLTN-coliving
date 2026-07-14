'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import {
  roomClientService,
  Room,
} from '@/lib/services/room-client.service'
import RoomsMap from '../components/GoogleRoomMap';

interface FeaturedRoom {
  id: string;
  title: string;
  address: string;
  priceValue?: number | null;
  price?: number | null;
  areaText?: string | null;
  area?: string | null;
  image?: string | string[] | null;
  images?: Array<{ url: string }>;
  currentOccupants?: number | null;
  maxOccupants?: number | null;
  availableOccupantSlots?: number | null;
}

function getFeaturedRoomImage(room: FeaturedRoom) {
  return room.images?.[0]?.url
    || (Array.isArray(room.image) ? room.image[0] : room.image)
    || '';
}

function getAvailableSlots(room: FeaturedRoom) {
  if (room.availableOccupantSlots != null) {
    return Math.max(0, room.availableOccupantSlots);
  }

  return Math.max(0, (room.maxOccupants ?? 1) - (room.currentOccupants ?? 0));
}

export default function HomePage() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [requiredSlots, setRequiredSlots] = useState('1');
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] =
    useState<Room | null>(null)
  const [featuredRooms, setFeaturedRooms] = useState<FeaturedRoom[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(false);
  const [featuredRetryKey, setFeaturedRetryKey] = useState(0);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (location.trim()) params.set('location', location.trim());
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (requiredSlots) params.set('minAvailableSlots', requiredSlots);

    router.push(`/rooms?${params.toString()}`);
  };
    useEffect(() => {
      const loadRooms =
        async () => {

          try {
            const data =
              await roomClientService
                .getMapRooms()
            setRooms(data)
          } catch {
            setRooms([])
          }
        }

      loadRooms()

    }, [])

    useEffect(() => {
      let active = true;

      const loadFeaturedRooms = async () => {
        setFeaturedLoading(true);
        setFeaturedError(false);

        try {
          const response = await fetch('/api/rooms?limit=6&sortBy=newest&minAvailableSlots=1');
          if (!response.ok) throw new Error('Không thể tải phòng mới');

          const payload = await response.json();
          if (active) setFeaturedRooms(payload.data?.rooms || []);
        } catch {
          if (active) {
            setFeaturedRooms([]);
            setFeaturedError(true);
          }
        } finally {
          if (active) setFeaturedLoading(false);
        }
      };

      void loadFeaturedRooms();
      return () => {
        active = false;
      };
    }, [featuredRetryKey]);

  return (
    <>
      <Navigation />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative h-[870px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              alt="Không gian co-living sang trọng"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhcdk72WCvxNCwMJ1l2loPc7PYpkJv0DAkVeY_Trh_cRRFNf8VphDVngZkSIb0myzjILLuzF5BNy6PboGB1H-l4_dktfGlRcS4v--ItJQd8jUUs7RmLgboUnBKNK6SeYle3bnMW8rkrBG0JAxnRhZqRjp-XeDYBFdmWuaiRyG6pbSJyWrgASN6wInpvm5HCWFmDQ-Nv_6qrHTJUGls-vt8ZN8A8DxNEjiCBCqEgucXjbwzHtJfaE9Ukh_Zhpcg3slBg4yzG4-5Q3Ir"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent"></div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-orange-100 text-orange-900 font-label text-[10px] font-bold tracking-[0.2em] uppercase">
                Tái định nghĩa Không gian sống chung
              </span>
              <h1 className="font-headline text-[3.5rem] leading-[1.1] font-extrabold tracking-tighter text-slate-900 mb-8">
                Nghệ thuật của <span className="text-orange-600 italic">sự gắn kết</span>, được tuyển chọn tinh tế.
              </h1>
            </div>

            {/* Search Bar Floating */}
            <div className="editorial-shadow max-w-6xl rounded-2xl border border-white/80 bg-white/95 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
              <form
                onSubmit={handleSearch}
                className="grid h-[76px] w-full items-stretch"
                style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) 180px' }}
              >
                <label className="group flex min-w-0 items-center gap-3 border-r border-slate-200 px-5 transition hover:bg-slate-50 focus-within:bg-orange-50/50">
                  <span className="material-symbols-outlined shrink-0 text-[25px] text-orange-600">location_on</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">Khu vực muốn ở</span>
                    <input
                      className="min-w-0 border-none bg-transparent p-0 text-[15px] font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-0"
                      placeholder="Nhập tỉnh, thành phố hoặc khu vực"
                      type="search"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </span>
                </label>

                <label className="flex min-w-0 items-center gap-3 border-r border-slate-200 px-5 transition hover:bg-slate-50 focus-within:bg-orange-50/50">
                  <span className="material-symbols-outlined shrink-0 text-[25px] text-sky-700">payments</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">Ngân sách tối đa</span>
                    <select
                      className="min-w-0 cursor-pointer appearance-none border-none bg-transparent p-0 text-[15px] font-semibold text-slate-900 outline-none focus:ring-0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    >
                      <option value="">Không giới hạn</option>
                      <option value="3000000">Dưới 3 triệu</option>
                      <option value="5000000">Dưới 5 triệu</option>
                      <option value="8000000">Dưới 8 triệu</option>
                      <option value="12000000">Dưới 12 triệu</option>
                    </select>
                  </span>
                </label>

                <label className="flex min-w-0 items-center gap-3 px-5 transition hover:bg-slate-50 focus-within:bg-orange-50/50">
                  <span className="material-symbols-outlined shrink-0 text-[25px] text-emerald-700">group</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">Chỗ còn trống</span>
                    <select
                      className="min-w-0 cursor-pointer appearance-none border-none bg-transparent p-0 text-[15px] font-semibold text-slate-900 outline-none focus:ring-0"
                      value={requiredSlots}
                      onChange={(e) => setRequiredSlots(e.target.value)}
                    >
                      <option value="1">Ít nhất 1 chỗ</option>
                      <option value="2">Ít nhất 2 chỗ</option>
                      <option value="3">Ít nhất 3 chỗ</option>
                    </select>
                  </span>
                </label>

                <button
                  type="submit"
                  className="m-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-700 hover:shadow-orange-500/35 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-xl">search</span>
                  <span>Tìm phòng</span>
                </button>
              </form>
            </div>

            {/* Smart Search Button */}
            <div className="mt-6 flex justify-center">
              <Link href="/preferences" className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
                <span className="material-symbols-outlined text-blue-600 group-hover:scale-110 transition-transform">auto_awesome</span>
                <span className="font-bold text-blue-900">Tìm phòng bằng AI thông minh</span>
                <span className="material-symbols-outlined text-blue-600 group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white py-20" aria-labelledby="featured-rooms-title">
          <div className="mx-auto max-w-7xl px-8">
            <div className="mb-10 flex items-end justify-between gap-8">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase text-orange-700">
                  <span className="material-symbols-outlined text-lg">new_releases</span>
                  Cập nhật mới nhất
                </div>
                <h2 id="featured-rooms-title" className="text-4xl font-extrabold text-slate-950">
                  Phòng mới và còn chỗ
                </h2>
                <p className="mt-3 text-base text-slate-600">
                  Những phòng mới đăng, đang sẵn sàng tiếp nhận thành viên.
                </p>
              </div>
              <Link
                href="/rooms"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-orange-500 hover:text-orange-700"
              >
                Xem tất cả phòng
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
            </div>

            {featuredLoading ? (
              <div className="grid grid-cols-3 gap-6" aria-label="Đang tải phòng mới">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="h-56 animate-pulse bg-slate-200" />
                    <div className="space-y-3 p-5">
                      <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredError ? (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-6 py-5">
                <div>
                  <p className="font-bold text-red-900">Chưa thể tải phòng mới</p>
                  <p className="mt-1 text-sm text-red-700">Vui lòng kiểm tra Property Service và thử lại.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFeaturedRetryKey((key) => key + 1)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800"
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  Tải lại
                </button>
              </div>
            ) : featuredRooms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-400">bed</span>
                <p className="mt-3 font-bold text-slate-700">Hiện chưa có phòng mới còn chỗ</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 items-stretch gap-6">
                {featuredRooms.map((room) => {
                  const imageUrl = getFeaturedRoomImage(room);
                  const slots = getAvailableSlots(room);
                  const price = Number(room.priceValue ?? room.price ?? 0);

                  return (
                    <Link
                      key={room.id}
                      href={`/rooms/${room.id}`}
                      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-slate-900/10"
                    >
                      <div className="relative h-56 shrink-0 overflow-hidden bg-slate-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={room.title}
                            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-5xl">image_not_supported</span>
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm backdrop-blur">
                          <span className="material-symbols-outlined text-base">verified</span>
                          Đã xác thực
                        </div>
                        <div className="absolute right-3 top-3 rounded-md bg-slate-950/85 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                          Còn {slots} chỗ
                        </div>
                      </div>

                      <div className="flex min-h-[220px] flex-1 flex-col p-5">
                        <h3 className="line-clamp-2 min-h-14 text-lg font-extrabold leading-7 text-slate-900 transition group-hover:text-orange-700">
                          {room.title}
                        </h3>
                        <p className="mt-2 flex min-h-12 items-start gap-1.5 text-sm leading-6 text-slate-600">
                          <span className="material-symbols-outlined mt-0.5 text-base text-slate-400">location_on</span>
                          <span className="line-clamp-2">{room.address}</span>
                        </p>

                        <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                          <div>
                            <p className="text-xl font-black text-orange-700">
                              {price > 0 ? `${price.toLocaleString('vi-VN')} đ` : 'Liên hệ'}
                            </p>
                            <p className="mt-0.5 text-[10px] font-bold uppercase text-slate-500">Mỗi tháng</p>
                          </div>
                          {(room.areaText || room.area) && (
                            <span className="text-sm font-bold text-slate-600">{room.areaText || room.area}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

{/* Map Section */}
<section className="py-20 bg-slate-50">
  <div className="max-w-7xl mx-auto px-8">

    <div className="text-center mb-12">
      <span
        className="
          inline-block
          px-4
          py-1
          rounded-full
          bg-orange-100
          text-orange-700
          text-xs
          font-bold
          tracking-wider
          uppercase
          mb-4
        "
      >
        Khám phá trên bản đồ
      </span>

      <h2
        className="
          text-4xl
          font-bold
          tracking-tight
          text-slate-900
          mb-3
        "
      >
        Tìm phòng theo vị trí
      </h2>

      <p
        className="
          text-slate-600
          max-w-2xl
          mx-auto
        "
      >
        Chọn một vị trí trên bản đồ để xem nhanh
        thông tin phòng phù hợp với nhu cầu của bạn.
      </p>
    </div>

    <div
      className="
        grid
        lg:grid-cols-12
        gap-6
      "
    >

      {/* MAP */}
      <div
        className="
          lg:col-span-8
          rounded-3xl
          overflow-hidden
          shadow-xl
          border
          bg-white
        "
      >

        <RoomsMap
          rooms={rooms}
          onSelectRoom={setSelectedRoom}
        />

      </div>

      {/* SIDEBAR */}
      <div
        className="
          lg:col-span-4
        "
      >

        {selectedRoom ? (

          <div
            className="
              sticky
              top-24
              rounded-3xl
              overflow-hidden
              bg-white
              border
              shadow-xl
            "
          >

            <img
              src={
                selectedRoom.image ||
                "/images/no-image.jpg"
              }
              alt={selectedRoom.title}
              className="
                h-64
                w-full
                object-cover
              "
            />

            <div className="p-6">

              <h3
                className="
                  text-2xl
                  font-bold
                  text-slate-900
                "
              >
                {selectedRoom.title}
              </h3>

              <p
                className="
                  mt-3
                  text-orange-600
                  text-xl
                  font-bold
                "
              >
                {Number(
                  selectedRoom.priceValue
                ).toLocaleString("vi-VN")}
                đ
              </p>

              <p
                className="
                  mt-4
                  text-slate-600
                  leading-relaxed
                "
              >
                {selectedRoom.address}
              </p>

              <Link
                href={`/rooms/${selectedRoom.id}`}
                className="
                  mt-6
                  flex
                  items-center
                  justify-center
                  rounded-xl
                  bg-orange-500
                  py-3
                  text-white
                  font-semibold
                  hover:bg-orange-600
                  transition-colors
                "
              >
                Xem chi tiết
              </Link>

            </div>

          </div>

        ) : (

          <div
            className="
              h-full
              min-h-[600px]
              rounded-3xl
              border
              bg-white
              shadow-xl
              flex
              flex-col
              items-center
              justify-center
              text-center
              p-8
            "
          >

            <div
              className="
                w-20
                h-20
                rounded-full
                bg-orange-100
                flex
                items-center
                justify-center
                mb-5
              "
            >
              <span className="material-symbols-outlined text-4xl text-orange-600">
                location_on
              </span>
            </div>

            <h3
              className="
                text-xl
                font-bold
                text-slate-900
                mb-2
              "
            >
              Chưa chọn phòng
            </h3>

            <p className="text-slate-500">
              Hãy nhấn vào một marker trên bản đồ để
              xem thông tin chi tiết.
            </p>

          </div>

        )}

      </div>

    </div>

  </div>
</section>
      </main>

      <Footer />
    </>
  );
}
