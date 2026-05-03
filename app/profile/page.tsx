'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  CreditCard,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  fullName: string;
  phone?: string | null;
  birthDate?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
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

type FormData = Pick<UserProfile, 'fullName' | 'phone' | 'address'> & {
  birthDate: string;
};

const emptyForm: FormData = {
  fullName: '',
  phone: '',
  birthDate: '',
  address: '',
};

function formatDate(date?: string | null) {
  if (!date) return 'Chưa cập nhật';

  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function toDateInputValue(date?: string | null) {
  if (!date) return '';

  return new Date(date).toISOString().split('T')[0];
}

function profileToForm(profile: UserProfile): FormData {
  return {
    fullName: profile.fullName || profile.name || '',
    phone: profile.phone || '',
    birthDate: toDateInputValue(profile.birthDate),
    address: profile.address || '',
  };
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout, refetch } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.id) return;

    const controller = new AbortController();

    async function loadProfilePage() {
      setIsLoading(true);
      setError('');

      try {
        const [profileRes, bookingsRes] = await Promise.all([
          fetch('/api/user/profile', {
            credentials: 'include',
            signal: controller.signal,
          }),
          fetch('/api/user/bookings', {
            credentials: 'include',
            signal: controller.signal,
          }),
        ]);

        if (profileRes.status === 401 || bookingsRes.status === 401) {
          router.replace('/login');
          return;
        }

        if (!profileRes.ok) {
          throw new Error('Không thể tải thông tin hồ sơ.');
        }

        const profileData = (await profileRes.json()) as UserProfile;
        setProfile(profileData);
        setFormData(profileToForm(profileData));

        if (bookingsRes.ok) {
          const bookingsData = (await bookingsRes.json()) as Booking[];
          setBookings(bookingsData);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProfilePage();

    return () => controller.abort();
  }, [user?.id, router]);

  const activeBooking = useMemo(
    () => bookings.find((booking) => new Date(booking.endDate) > new Date()),
    [bookings]
  );

  const memberSince = profile
    ? new Date(profile.createdAt).toLocaleString('vi-VN', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  const displayName = profile?.fullName || profile?.name || profile?.email || 'Khách hàng';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleCancel = () => {
    if (profile) {
      setFormData(profileToForm(profile));
    }

    setSuccess('');
    setError('');
    setEditMode(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Không thể cập nhật hồ sơ.');
      }

      setProfile(data);
      setFormData(profileToForm(data));
      setEditMode(false);
      setSuccess('Đã lưu thông tin hồ sơ.');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen px-6 pt-28 pb-20">
          <div className="mx-auto flex max-w-5xl items-center justify-center rounded-lg border border-slate-200 bg-white p-10 text-slate-600 shadow-sm">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-orange-600" />
            Đang tải hồ sơ khách hàng...
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error && !profile) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen px-6 pt-28 pb-20">
          <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <h1 className="text-xl font-bold text-red-800">Không tải được hồ sơ</h1>
            <p className="mt-2 text-red-700">{error}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800"
            >
              Đăng nhập lại
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!profile) return null;

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-slate-50 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-lg border border-orange-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
              Hồ sơ khách hàng
            </p>
            <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                  Xin chào, {displayName}
                </h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Quản lý thông tin cá nhân, phòng đang ở và cài đặt bảo mật cho tài khoản của bạn.
                </p>
              </div>
              <Link
                href="/rooms"
                className="inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-700"
              >
                Tìm phòng mới
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <aside className="space-y-6 lg:col-span-4 xl:col-span-3">
              <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-orange-500 bg-orange-50 text-3xl font-extrabold text-orange-700">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials || <UserRound className="h-10 w-10" />
                  )}
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-950">{displayName}</h2>
                <p className="mt-1 text-sm text-slate-500">Thành viên từ {memberSince}</p>

                <div className="mt-5 space-y-3 text-left text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-orange-600" />
                    <span className="break-all">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-orange-600" />
                    <span>{profile.phone || 'Chưa cập nhật số điện thoại'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-orange-600" />
                    <span>{profile.address || 'Chưa cập nhật địa chỉ'}</span>
                  </div>
                </div>
              </section>

              <nav className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                <a
                  href="#personal-info"
                  className="flex items-center gap-3 rounded-md bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700"
                >
                  <UserRound className="h-4 w-4" />
                  Thông tin cá nhân
                </a>
                <a
                  href="#current-room"
                  className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Home className="h-4 w-4" />
                  Phòng đang ở
                </a>
                <a
                  href="#security"
                  className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Bảo mật
                </a>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </nav>
            </aside>

            <div className="space-y-6 lg:col-span-8 xl:col-span-9">
              <section
                id="personal-info"
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
                      Quản lý tài khoản
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-950">Thông tin cá nhân</h2>
                  </div>

                  {!editMode ? (
                    <button
                      onClick={() => {
                        setSuccess('');
                        setError('');
                        setEditMode(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                      Chỉnh sửa
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Lưu
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                        Hủy
                      </button>
                    </div>
                  )}
                </div>

                {(error || success) && (
                  <div
                    className={`mt-5 rounded-lg border p-4 text-sm ${
                      error
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {error || success}
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Họ và tên
                    </span>
                    <input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      disabled={!editMode || isSaving}
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 font-medium text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-600"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Email
                    </span>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="h-12 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 font-medium text-slate-500"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Số điện thoại
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      disabled={!editMode || isSaving}
                      placeholder="Nhập số điện thoại"
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 font-medium text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-600"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Ngày sinh
                    </span>
                    <input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                      disabled={!editMode || isSaving}
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 font-medium text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-600"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Địa chỉ hiện tại
                    </span>
                    <input
                      id="address"
                      type="text"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      disabled={!editMode || isSaving}
                      placeholder="Nhập địa chỉ"
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 font-medium text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-600"
                    />
                  </label>
                </div>
              </section>

              <section
                id="current-room"
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
                    Lưu trú
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Phòng đang ở</h2>
                </div>

                {activeBooking ? (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-100">
                      {activeBooking.room.image?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeBooking.room.image[0]}
                          alt={activeBooking.room.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <Home className="h-12 w-12" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between gap-6">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-950">
                          {activeBooking.room.title}
                        </h3>
                        <p className="mt-2 flex items-start gap-2 text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 text-orange-600" />
                          {activeBooking.room.address}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 p-4">
                          <CalendarDays className="h-5 w-5 text-orange-600" />
                          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                            Bắt đầu
                          </p>
                          <p className="mt-1 font-bold text-slate-950">
                            {formatDate(activeBooking.startDate)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-4">
                          <CalendarDays className="h-5 w-5 text-orange-600" />
                          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                            Kết thúc
                          </p>
                          <p className="mt-1 font-bold text-slate-950">
                            {formatDate(activeBooking.endDate)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-4">
                          <CreditCard className="h-5 w-5 text-orange-600" />
                          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                            Giá thuê
                          </p>
                          <p className="mt-1 font-bold text-orange-700">
                            {activeBooking.room.price.toLocaleString('vi-VN')} đ/tháng
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <Home className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-lg font-bold text-slate-950">
                      Chưa có phòng đang ở
                    </h3>
                    <p className="mt-2 text-slate-600">
                      Khi đặt phòng thành công, thông tin phòng hiện tại sẽ xuất hiện tại đây.
                    </p>
                    <Link
                      href="/rooms"
                      className="mt-5 inline-flex items-center rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
                    >
                      Duyệt danh sách phòng
                    </Link>
                  </div>
                )}
              </section>

              <section
                id="security"
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
                    Bảo mật
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Tài khoản</h2>
                </div>

                <div className="divide-y divide-slate-200">
                  <div className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-orange-700">
                        <KeyRound className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-950">Mật khẩu</h3>
                        <p className="text-sm text-slate-500">
                          Tài khoản đang đăng nhập bằng email và mật khẩu.
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-400">Sắp có</span>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-950">Phiên đăng nhập</h3>
                        <p className="text-sm text-slate-500">
                          Hồ sơ này chỉ hiển thị sau khi đăng nhập thành công.
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Đang hoạt động
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
