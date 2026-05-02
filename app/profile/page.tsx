'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  avatarUrl?: string;
  createdAt: string;
}

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  room: {
    id: string;
    title: string;
    address: string;
    image: string[];
    price: number;
  };
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    birthDate: '',
    address: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
      fetchBookings();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData({
          fullName: data.fullName || '',
          phone: data.phone || '',
          birthDate: data.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : '',
          address: data.address || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/user/bookings', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditMode(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <>
        <Navigation />
        <main className="pt-20 pb-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600">Đang tải...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navigation />
        <main className="pt-20 pb-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600">Không tìm thấy thông tin hồ sơ</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const activeBooking = bookings.find(b => new Date(b.endDate) > new Date());
  const memberSince = new Date(profile.createdAt).toLocaleString('vi-VN', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-8 pt-24 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="md:col-span-4 lg:col-span-3 space-y-6">
            {/* Profile Card */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col items-center text-center shadow-sm">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-orange-500 shadow-md bg-slate-100 flex items-center justify-center">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-orange-600">
                      {profile.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <button className="absolute bottom-2 right-2 bg-orange-600 text-white p-2 rounded-full shadow-lg hover:bg-orange-700 transition-colors">
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
              </div>

              <div className="mt-6">
                <h1 className="text-2xl font-bold text-slate-900">{profile.fullName}</h1>
                <p className="text-slate-500 text-sm mt-1">Thành viên từ {memberSince}</p>
              </div>

              <div className="w-full mt-6 space-y-3">
                <button className="w-full py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-colors shadow-md">
                  Thay đổi ảnh
                </button>
                <button className="w-full py-3 border border-slate-300 text-slate-700 rounded-full font-semibold hover:bg-slate-50 transition-colors">
                  Xem hồ sơ công khai
                </button>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <a
                href="#personal-info"
                className="flex items-center gap-3 px-4 py-3 bg-orange-50 text-orange-700 rounded-lg font-semibold transition-all"
              >
                <span className="material-symbols-outlined">person</span>
                Thông tin cá nhân
              </a>
              <a
                href="#my-apartment"
                className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-all"
              >
                <span className="material-symbols-outlined">home_work</span>
                Căn hộ đang ở
              </a>
              <a
                href="#security"
                className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-all"
              >
                <span className="material-symbols-outlined">security</span>
                Bảo mật
              </a>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-all"
              >
                <span className="material-symbols-outlined">logout</span>
                Đăng xuất
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            {/* Personal Info Section */}
            <section
              id="personal-info"
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-2">
                    Quản lý tài khoản
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900">Thông tin cá nhân</h2>
                </div>
                {editMode && (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700 transition-colors"
                  >
                    <span className="material-symbols-outlined">save</span>
                    Lưu thay đổi
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Họ và tên
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full bg-transparent border-0 border-b border-slate-300 focus:ring-0 focus:border-orange-600 px-0 py-2 text-lg font-medium disabled:cursor-not-allowed disabled:text-slate-600 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Email (Không thể thay đổi)
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full bg-transparent border-0 border-b border-slate-300 px-0 py-2 text-slate-400 font-medium cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Số điện thoại
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full bg-transparent border-0 border-b border-slate-300 focus:ring-0 focus:border-orange-600 px-0 py-2 text-lg font-medium disabled:cursor-not-allowed disabled:text-slate-600 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ngày sinh
                  </label>
                  <input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full bg-transparent border-0 border-b border-slate-300 focus:ring-0 focus:border-orange-600 px-0 py-2 text-lg font-medium disabled:cursor-not-allowed disabled:text-slate-600 transition-colors"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Địa chỉ hiện tại
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full bg-transparent border-0 border-b border-slate-300 focus:ring-0 focus:border-orange-600 px-0 py-2 text-lg font-medium disabled:cursor-not-allowed disabled:text-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-8 py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Chỉnh sửa thông tin
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-8 py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-colors"
                    >
                      Lưu thay đổi
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-8 py-3 border border-slate-300 text-slate-700 rounded-full font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Hủy
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* Current Apartment Section */}
            {activeBooking && (
              <section
                id="my-apartment"
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-8">
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-2">
                    Hợp đồng hiện tại
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Căn hộ đang ở</h2>

                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    <div className="w-full lg:w-1/2 aspect-video rounded-xl overflow-hidden shadow-md bg-slate-200">
                      {activeBooking.room.image && activeBooking.room.image[0] && (
                        <img
                          src={activeBooking.room.image[0]}
                          alt={activeBooking.room.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="w-full lg:w-1/2 space-y-6">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {activeBooking.room.title}
                        </h3>
                        <p className="text-slate-500 flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-lg">
                            location_on
                          </span>
                          {activeBooking.room.address}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Ngày bắt đầu
                          </p>
                          <p className="font-bold text-slate-900">
                            {new Date(activeBooking.startDate).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Giá thuê
                          </p>
                          <p className="font-bold text-orange-600">
                            {activeBooking.room.price.toLocaleString('vi-VN')} đ/tháng
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button className="flex-1 py-3 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-colors">
                          Chi tiết hợp đồng
                        </button>
                        <button className="px-6 py-3 border border-slate-300 text-slate-700 rounded-full font-semibold hover:bg-slate-50 transition-colors">
                          Thanh toán
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {!activeBooking && (
              <section
                id="my-apartment"
                className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center"
              >
                <span className="material-symbols-outlined text-5xl text-slate-300 block mb-4">
                  home_work
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Chưa có căn hộ đang ở
                </h3>
                <p className="text-slate-500 mb-6">
                  Hãy đặt phòng để bắt đầu cuộc sống mới của bạn
                </p>
                <Link
                  href="/rooms"
                  className="inline-block px-8 py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-colors"
                >
                  Duyệt danh sách phòng
                </Link>
              </section>
            )}

            {/* Security Section */}
            <section
              id="security"
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="mb-8">
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-2">
                  Bảo mật &amp; Quyền riêng tư
                </span>
                <h2 className="text-2xl font-bold text-slate-900">Bảo mật</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-orange-600">
                      <span className="material-symbols-outlined">lock</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Mật khẩu</h4>
                      <p className="text-sm text-slate-500">Đã thay đổi 3 tháng trước</p>
                    </div>
                  </div>
                  <button className="text-orange-600 font-semibold hover:underline transition-colors">
                    Thay đổi
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <span className="material-symbols-outlined">google</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Liên kết Google</h4>
                      <p className="text-sm text-slate-500">
                        Đang hoạt động: {profile.email}
                      </p>
                    </div>
                  </div>
                  <button className="text-slate-400 font-semibold cursor-not-allowed">
                    Hủy liên kết
                  </button>
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                      <span className="material-symbols-outlined">devices</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Quản lý thiết bị</h4>
                      <p className="text-sm text-slate-500">
                        Hiện tại có 1 thiết bị đang đăng nhập
                      </p>
                    </div>
                  </div>
                  <button className="text-orange-600 font-semibold hover:underline transition-colors">
                    Xem tất cả
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
