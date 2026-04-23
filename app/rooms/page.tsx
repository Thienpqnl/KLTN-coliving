'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Room {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  address: string;
  city: string;
  roomType: string;
  capacity: number;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/rooms');
        if (!response.ok) throw new Error('Failed to fetch rooms');
        const data = await response.json();
        setRooms(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm dark:shadow-none">
        <div className="flex justify-between items-center px-8 h-20 max-w-screen-2xl mx-auto font-['Manrope'] tracking-tight">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-orange-900 dark:text-orange-100">
            The Curated Hearth
          </Link>
          <div className="hidden md:flex items-center space-x-10">
            <Link href="/" className="text-slate-600 dark:text-slate-400 font-medium hover:text-orange-600 dark:hover:text-orange-300 transition-colors">
              Trang chủ
            </Link>
            <Link href="/rooms" className="text-orange-700 dark:text-orange-400 font-semibold border-b-2 border-orange-500 transition-colors">
              Danh sách phòng
            </Link>
            <Link href="#" className="text-slate-600 dark:text-slate-400 font-medium hover:text-orange-600 dark:hover:text-orange-300 transition-colors">
              Cộng đồng
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/login" className="text-slate-600 dark:text-slate-400 font-medium hover:text-orange-600 transition-colors">
              Đăng nhập
            </Link>
            <Link href="/register" className="bg-gradient-to-r from-orange-600 to-orange-400 text-white px-6 py-2.5 rounded-full font-label text-xs uppercase tracking-widest font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all">
              Đăng ký
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-8">
          {/* Header */}
          <div className="mb-16">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
              Danh sách phòng cho thuê
            </h1>
            <p className="text-lg text-slate-600">
              Khám phá những không gian sống chung cao cấp tại các thành phố lớn
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <p className="text-red-800 font-medium">Lỗi: {error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && rooms.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-600 text-lg">Không có phòng nào có sẵn</p>
            </div>
          )}

          {/* Rooms Grid */}
          {!loading && !error && rooms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="group relative overflow-hidden rounded-xl editorial-shadow hover:shadow-2xl transition-all duration-300"
                >
                  {/* Image Container */}
                  <div className="relative h-72 overflow-hidden bg-slate-200">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>

                    {/* Room Type Badge */}
                    <div className="absolute top-4 right-4">
                      <span className="inline-block bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {room.roomType}
                      </span>
                    </div>

                    {/* City Badge */}
                    <div className="absolute bottom-4 left-4">
                      <span className="inline-block bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {room.city}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 bg-white">
                    {/* Title */}
                    <h3 className="font-headline text-xl font-bold text-slate-900 mb-2 line-clamp-2">
                      {room.title}
                    </h3>

                    {/* Address */}
                    <div className="flex items-start gap-2 mb-4">
                      <span className="material-symbols-outlined text-orange-600 text-5 mt-0.5 flex-shrink-0">
                        location_on
                      </span>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {room.address}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {room.description}
                    </p>

                    {/* Capacity */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-orange-600 text-5">
                        groups
                      </span>
                      <p className="text-sm text-slate-600">
                        Tối đa {room.capacity} người
                      </p>
                    </div>

                    {/* Price and CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
                          Giá / Tháng
                        </p>
                        <p className="text-2xl font-extrabold text-orange-600">
                          ₫{room.price.toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <button className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white px-4 py-3 rounded-full transition-all shadow-lg shadow-orange-500/20 font-bold">
                        <span className="material-symbols-outlined text-lg">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 w-full pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 max-w-7xl mx-auto font-['Inter'] leading-relaxed text-sm">
          <div className="col-span-1 md:col-span-1">
            <div className="text-lg font-black text-slate-900 dark:text-white mb-6">
              The Curated Hearth
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Trải nghiệm sống chung cao cấp cho cộng đồng chuyên nghiệp và sáng tạo tại các thành phố lớn.
            </p>
            <div className="flex space-x-4">
              <a className="text-orange-800 dark:text-orange-300 opacity-80 hover:opacity-100 transition-opacity" href="#">
                Instagram
              </a>
              <a className="text-orange-800 dark:text-orange-300 opacity-80 hover:opacity-100 transition-opacity" href="#">
                Facebook
              </a>
            </div>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-[10px]">
              Về Chúng Tôi
            </h5>
            <ul className="space-y-4">
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Giới thiệu
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Liên hệ
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Tuyển dụng
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-[10px]">
              Chính Sách
            </h5>
            <ul className="space-y-4">
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Điều khoản dịch vụ
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Hỏi đáp
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-[10px]">
              Địa Điểm
            </h5>
            <ul className="space-y-4">
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Hà Nội
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Đà Nẵng
                </a>
              </li>
              <li>
                <a className="text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors" href="#">
                  Thành phố Hồ Chí Minh
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-12 mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 text-center md:text-left">
          <p className="text-slate-400 text-xs">
            © 2024 The Curated Hearth. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
