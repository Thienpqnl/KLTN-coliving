'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/hooks/useAuth';

type FavoriteRoom = {
  id: string;
  roomId: string;
  createdAt: string;
  title: string;
  address: string;
  priceText?: string | null;
  priceValue?: number | string | null;
  imageUrl?: string | null;
};

function formatPrice(room: FavoriteRoom) {
  if (room.priceText) return room.priceText;
  if (room.priceValue) return `${Number(room.priceValue).toLocaleString('vi-VN')} đ/tháng`;
  return 'Liên hệ';
}

export default function FavoritesPage() {
  const { user, token, isLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setLoading(false);
      setFavorites([]);
      return;
    }

    const fetchFavorites = async () => {
      try {
        setLoading(true);
        setError(null);

        const authToken = token || localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch('/api/favorites', {
          headers,
          credentials: 'include',
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || 'Không thể tải danh sách yêu thích.');
        }

        setFavorites(payload?.data || []);
      } catch (err) {
        console.error('Không thể tải danh sách yêu thích:', err);
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách yêu thích.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isLoading, token, user]);

  return (
    <>
      <Navigation />
      <main className="mx-auto min-h-screen max-w-7xl px-4 pb-20 pt-28 sm:px-8">
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-800">
            <span className="material-symbols-outlined text-base">favorite</span>
            Phòng yêu thích
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Danh sách phòng bạn đã lưu
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Theo dõi những phòng phù hợp để quay lại xem chi tiết hoặc đặt phòng khi bạn đã sẵn sàng.
          </p>
        </header>

        {isLoading || loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-96 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : !user ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
            <h2 className="text-2xl font-bold text-slate-950">Bạn cần đăng nhập</h2>
            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Đăng nhập để xem và quản lý danh sách phòng yêu thích của bạn.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full bg-gradient-to-r from-orange-900 to-orange-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white"
            >
              Đăng nhập
            </Link>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-6 text-sm font-semibold text-red-800">{error}</div>
        ) : favorites.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
            <h2 className="text-2xl font-bold text-slate-950">Chưa có phòng yêu thích</h2>
            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Bấm biểu tượng trái tim ở trang chi tiết phòng để lưu lại những lựa chọn bạn quan tâm.
            </p>
            <Link
              href="/rooms"
              className="mt-6 inline-flex rounded-full bg-orange-50 px-6 py-3 text-sm font-bold uppercase tracking-wider text-orange-800 hover:bg-orange-100"
            >
              Khám phá phòng
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((favorite) => (
              <Link key={favorite.id} href={`/rooms/${favorite.roomId}`} className="group block">
                <article className="h-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
                    <img
                      src={favorite.imageUrl || 'https://via.placeholder.com/600x450?text=Room'}
                      alt={favorite.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-red-500 backdrop-blur">
                      Đã yêu thích
                    </div>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <h2 className="line-clamp-2 text-xl font-bold text-slate-950 group-hover:text-orange-700">
                        {favorite.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{favorite.address}</p>
                    </div>
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-2xl font-black text-orange-700">{formatPrice(favorite)}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Giá thuê tham khảo
                      </p>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
