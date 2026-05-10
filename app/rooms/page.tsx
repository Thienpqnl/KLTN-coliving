'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

interface Room {
  id: string;
  title: string;
  description: string;
  address: string;
  district?: string | null;
  city?: string | null;
  price: number;
  priceText?: string | null;
  area: string;
  areaText?: string | null;
  image?: string | string[];
  images?: { url: string }[];
  status: string;
  owner?: {
    name: string;
    fullName: string;
  } | null;
}

function firstImage(room: Room) {
  return room.images?.[0]?.url || (Array.isArray(room.image) ? room.image[0] : room.image) || '';
}

function RoomCard({ room }: { room: Room }) {
  const imageUrl = firstImage(room);
  const price = room.priceText || (room.price ? `${room.price.toLocaleString('vi-VN')} đ/tháng` : 'Liên hệ');
  const area = room.areaText || room.area;
  const ownerName = room.owner?.fullName || room.owner?.name || 'Phongtro123';

  return (
    <article className="group flex h-full flex-col">
      <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-xl bg-gray-200">
        <img
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={imageUrl || 'https://via.placeholder.com/400x500?text=Room'}
          alt={room.title}
        />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-orange-600 backdrop-blur">
          {room.status === 'AVAILABLE' ? 'Còn trống' : 'Tạm ẩn'}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="mb-3 flex-1">
          <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-gray-900 transition-colors group-hover:text-orange-600">
            {room.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-600">
            {room.address}
          </p>
        </div>

        <div className="space-y-3 border-t border-gray-200 pt-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-black text-orange-600">{price}</p>
              <p className="text-[10px] font-bold uppercase text-gray-500">Giá thuê</p>
            </div>
            <div className="text-right text-sm font-semibold text-gray-700">{area}</div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {ownerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-600">{ownerName}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy, priceRange]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          sortBy,
        });

        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        if (priceRange[0] > 0) params.set('minPrice', priceRange[0].toString());
        if (priceRange[1] < 10000000) params.set('maxPrice', priceRange[1].toString());

        const response = await fetch(`/api/rooms?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch rooms');

        const payload = await response.json();
        setRooms(payload.data?.rooms || []);
        setTotal(payload.data?.total || 0);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Không thể tải danh sách phòng');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [page, searchTerm, sortBy, priceRange]);

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-8">
        <div className="mb-10">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Khám phá phòng thuê phù hợp
          </h1>
          <p className="max-w-2xl text-lg text-gray-600">
            Danh sách phòng được cập nhật từ Phongtro123, có giá thuê, diện tích và hình ảnh rõ ràng.
          </p>
        </div>

        <div className="mb-8 grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_220px]">
          <input
            type="text"
            placeholder="Tìm theo tên phòng hoặc địa chỉ"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="newest">Mới nhất</option>
            <option value="price-low">Giá thấp đến cao</option>
            <option value="price-high">Giá cao đến thấp</option>
            <option value="area-large">Diện tích lớn nhất</option>
          </select>
          <select
            value={priceRange[1]}
            onChange={(event) => setPriceRange([0, Number(event.target.value)])}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value={10000000}>Mọi mức giá</option>
            <option value={3000000}>Dưới 3 triệu</option>
            <option value={5000000}>Dưới 5 triệu</option>
            <option value={7000000}>Dưới 7 triệu</option>
          </select>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <h3 className="text-xl font-semibold text-gray-900">Đang tải danh sách phòng...</h3>
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <h3 className="text-xl font-semibold text-gray-900">{error}</h3>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">{total} phòng tìm thấy</h2>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border px-3 py-1 text-sm font-semibold disabled:opacity-50"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page === 1}
                >
                  Trang trước
                </button>
                <span className="px-2 py-1 text-sm">{page} / {totalPages}</span>
                <button
                  className="rounded border px-3 py-1 text-sm font-semibold disabled:opacity-50"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page === totalPages}
                >
                  Trang sau
                </button>
              </div>
            </div>

            {rooms.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <h3 className="mb-2 text-xl font-semibold text-gray-900">Không tìm thấy phòng</h3>
                <p className="text-gray-600">Thử điều chỉnh từ khóa hoặc bộ lọc giá.</p>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
