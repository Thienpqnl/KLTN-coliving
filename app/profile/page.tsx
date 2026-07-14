'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  CalendarX2,
  Camera,
  CreditCard,
  Home,
  Heart,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { uploadImage } from '@/lib/upload';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  fullName: string;
  phone?: string | null;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

interface Booking {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  startDate: string;
  endDate: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancellationActor?: string | null;
  contract?: {
    id: string;
    status: string;
    terminatedAt?: string | null;
  } | null;
  room: {
    id: string;
    title: string;
    address: string;
    image: string[];
    price: number;
  };
}

interface UserOccupancy {
  occupancy: {
    id: string;
    status: string;
    room: {
      id: string;
      title: string;
      address: string;
    };
  } | null;
  ownedRooms: {
    id: string;
    title: string;
    address: string;
  }[];
}

interface UserPreferences {
  id?: string;
  budgetMinVnd?: string | number | null;
  budgetMaxVnd?: string | number | null;
  preferredDistrict?: string | null;
  lifestyleArchetype?: string | null;
  priorityCleanliness?: number | null;
  prioritySocialEnvironment?: number | null;
  acceptSmokingRoommates?: boolean | null;
  acceptPets?: boolean | null;
}

const bookingStatusLabels: Record<Booking['status'], string> = {
  PENDING: 'Đang chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Đã hoàn tất',
};

function bookingStatusClass(status: Booking['status']) {
  if (status === 'PENDING') return 'bg-amber-50 text-amber-800 ring-amber-200';
  if (status === 'CONFIRMED') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (status === 'COMPLETED') return 'bg-blue-50 text-blue-800 ring-blue-200';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function canCancelBooking(booking: Booking) {
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') return false;
  if (!booking.contract) return true;
  return ['DRAFT', 'PENDING_HOST_SIGNATURE', 'PENDING_RENTER_SIGNATURE', 'CANCELLED']
    .includes(booking.contract.status);
}

type FormData = Pick<UserProfile, 'fullName' | 'phone' | 'gender' | 'address'> & {
  birthDate: string;
};

type ChangePasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const emptyForm: FormData = {
  fullName: '',
  phone: '',
  gender: '',
  birthDate: '',
  address: '',
};

const emptyPasswordForm: ChangePasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
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
    gender: profile.gender || '',
    birthDate: toDateInputValue(profile.birthDate),
    address: profile.address || '',
  };
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout, refetch } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [occupancy, setOccupancy] = useState<UserOccupancy | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>(emptyPasswordForm);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationError, setCancellationError] = useState('');
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);

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
        const [profileRes, bookingsRes, occupancyRes, preferencesRes] = await Promise.all([
          fetch('/api/user/profile', {
            credentials: 'include',
            signal: controller.signal,
          }),
          fetch('/api/user/bookings', {
            credentials: 'include',
            signal: controller.signal,
          }),
          fetch('/api/user/occupancy', {
            credentials: 'include',
            signal: controller.signal,
          }),
          fetch('/api/preferences', {
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

        if (occupancyRes.ok) {
          const occupancyData = await occupancyRes.json();
          setOccupancy(occupancyData);
        }

        if (preferencesRes.ok) {
          const preferencesData = (await preferencesRes.json()) as UserPreferences;
          setPreferences(preferencesData.id ? preferencesData : null);
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

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const activeBooking = useMemo(
    () =>
      bookings.find(
        (booking) =>
          booking.contract?.status === 'ACTIVE' &&
          new Date(booking.endDate) > new Date()
      ),
    [bookings]
  );

  const memberSince = profile
    ? new Date(profile.createdAt).toLocaleString('vi-VN', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  const displayName = profile?.fullName || profile?.name || profile?.email || 'Khách hàng';
  const avatarSrc = avatarPreview || (avatarRemoved ? null : profile?.avatarUrl);
  const genderLabel =
    {
      male: 'Nam',
      female: 'Nữ',
      other: 'Khác',
    }[profile?.gender || ''] || 'Chưa cập nhật giới tính';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [id]: value,
    }));
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh hợp lệ.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh đại diện không được vượt quá 5MB.');
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarRemoved(false);
    setEditMode(true);
    setSuccess('');
    setError('');
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
    setEditMode(true);
    setSuccess('');
    setError('');
  };

  const handleCancel = () => {
    if (profile) {
      setFormData(profileToForm(profile));
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(false);
    setSuccess('');
    setError('');
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      let avatarUrl = avatarRemoved ? '' : profile.avatarUrl || '';

      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile);
      }

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          avatarUrl,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Không thể cập nhật hồ sơ.');
      }

      setProfile(data);
      setFormData(profileToForm(data));
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarRemoved(false);
      setEditMode(false);
      setSuccess('Đã lưu thông tin hồ sơ.');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin đổi mật khẩu.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Không thể đổi mật khẩu.');
      }

      setPasswordForm(emptyPasswordForm);
      setPasswordSuccess(data.message || 'Đã đổi mật khẩu thành công.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const requestPhoneOtp = async () => {
    const phone = formData.phone?.trim();
    if (!phone) {
      setOtpMessage('Vui lòng nhập số điện thoại trước khi gửi OTP.');
      return;
    }

    setIsSendingOtp(true);
    setOtpMessage('');
    try {
      const res = await fetch('/api/auth/phone/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Không thể gửi OTP.');
      setOtpMessage(data.data?.devOtp ? `Mã OTP demo: ${data.data.devOtp}` : 'Đã gửi mã OTP đến số điện thoại.');
    } catch (err) {
      setOtpMessage(err instanceof Error ? err.message : 'Không thể gửi OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyPhoneOtp = async () => {
    const phone = formData.phone?.trim();
    if (!phone || otpCode.length !== 6) {
      setOtpMessage('Vui lòng nhập số điện thoại và mã OTP gồm 6 số.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpMessage('');
    try {
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Không thể xác minh OTP.');
      setProfile((current) => current ? { ...current, phone: data.data.phone, phoneVerified: true, phoneVerifiedAt: data.data.phoneVerifiedAt } : current);
      setOtpCode('');
      setOtpMessage('Số điện thoại đã được xác minh.');
      await refetch();
    } catch (err) {
      setOtpMessage(err instanceof Error ? err.message : 'Không thể xác minh OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const openCancellationDialog = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancellationReason('');
    setCancellationError('');
  };

  const closeCancellationDialog = () => {
    if (isCancellingBooking) return;
    setBookingToCancel(null);
    setCancellationReason('');
    setCancellationError('');
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    const reason = cancellationReason.trim();
    if (reason.length < 5) {
      setCancellationError('Vui lòng nhập lý do hủy có ít nhất 5 ký tự.');
      return;
    }

    setIsCancellingBooking(true);
    setCancellationError('');
    try {
      const response = await fetch(`/api/bookings/${bookingToCancel.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Không thể hủy đặt phòng.');
      }

      const updated = (payload?.data || payload) as Booking;
      setBookings((current) => current.map((booking) => (
        booking.id === bookingToCancel.id
          ? {
              ...booking,
              ...updated,
              status: 'CANCELLED',
              cancelledAt: updated?.cancelledAt || new Date().toISOString(),
              cancellationReason: updated?.cancellationReason || reason,
            }
          : booking
      )));
      setSuccess('Đã hủy đặt phòng thành công.');
      setBookingToCancel(null);
      setCancellationReason('');
    } catch (reasonError) {
      setCancellationError(
        reasonError instanceof Error ? reasonError.message : 'Không thể hủy đặt phòng.'
      );
    } finally {
      setIsCancellingBooking(false);
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
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials || <UserRound className="h-10 w-10" />
                  )}
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-950">{displayName}</h2>
                <p className="mt-1 text-sm text-slate-500">Thành viên từ {memberSince}</p>

                <div className="mt-5 flex flex-col gap-2">
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                    disabled={isSaving}
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
                  >
                    <Camera className="h-4 w-4" />
                    Đổi ảnh đại diện
                  </label>
                  {avatarSrc && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa ảnh
                    </button>
                  )}
                  {avatarFile && (
                    <p className="text-xs text-slate-500">
                      Ảnh mới sẽ được cập nhật khi bấm Lưu.
                    </p>
                  )}
                </div>

                <div className="mt-5 space-y-3 text-left text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-orange-600" />
                    <span className="break-all">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-orange-600" />
                    <span>{profile.phone || 'Chưa cập nhật số điện thoại'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <UserRound className="h-4 w-4 text-orange-600" />
                    <span>{genderLabel}</span>
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
                  href="#preferences"
                  className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Heart className="h-4 w-4" />
                  Sở thích phòng
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
                    <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <span className={`text-xs font-bold ${profile.phoneVerified ? 'text-emerald-700' : 'text-orange-700'}`}>
                          {profile.phoneVerified ? 'Số điện thoại đã xác minh' : 'Số điện thoại chưa xác minh'}
                        </span>
                        <button
                          type="button"
                          onClick={requestPhoneOtp}
                          disabled={isSendingOtp || !formData.phone}
                          className="rounded-full bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50"
                        >
                          {isSendingOtp ? 'Đang gửi...' : 'Gửi OTP'}
                        </button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          value={otpCode}
                          onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Nhập mã OTP"
                          className="h-10 flex-1 rounded-lg border border-orange-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                        />
                        <button
                          type="button"
                          onClick={verifyPhoneOtp}
                          disabled={isVerifyingOtp || otpCode.length !== 6}
                          className="rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                          {isVerifyingOtp ? 'Đang xác minh...' : 'Xác minh'}
                        </button>
                      </div>
                      {otpMessage && <p className="mt-2 text-xs font-semibold text-orange-800">{otpMessage}</p>}
                    </div>
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

                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Giới tính
                    </span>
                    <select
                      id="gender"
                      value={formData.gender || ''}
                      onChange={handleInputChange}
                      disabled={!editMode || isSaving}
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 font-medium text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-600"
                    >
                      <option value="">Chưa cập nhật</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
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

                      {occupancy?.occupancy && (
                        <Link
                          href={`/rooms/${activeBooking.room.id}/shared-space`}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-700"
                        >
                          <span className="material-symbols-outlined text-base">apartment</span>
                          Vào Sảnh Chung
                        </Link>
                      )}
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
                id="booking-history"
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
                      Đặt phòng
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-950">Lịch sử đặt phòng</h2>
                  </div>
                  <span className="text-sm font-semibold text-slate-500">
                    {bookings.length} yêu cầu
                  </span>
                </div>

                {bookings.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-bold text-slate-900">Bạn chưa có yêu cầu đặt phòng</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => {
                      const canCancel = canCancelBooking(booking);
                      const hasActiveContract = booking.contract?.status === 'ACTIVE';
                      const contractInProgress = booking.contract && [
                        'PENDING_DEPOSIT',
                        'PENDING_HANDOVER',
                        'ACTIVE',
                        'DISPUTED',
                      ].includes(booking.contract.status);

                      return (
                        <article
                          key={booking.id}
                          className="grid gap-5 rounded-lg border border-slate-200 p-4 transition-colors hover:border-orange-200 md:grid-cols-[128px_minmax(0,1fr)_auto] md:items-center"
                        >
                          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                            {booking.room.image?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={booking.room.image[0]}
                                alt={booking.room.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-slate-300">
                                <Home className="h-8 w-8" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${bookingStatusClass(booking.status)}`}>
                                {bookingStatusLabels[booking.status]}
                              </span>
                              {booking.contract && (
                                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
                                  Có hợp đồng
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/rooms/${booking.room.id}`}
                              className="mt-3 block truncate text-lg font-bold text-slate-950 hover:text-orange-700"
                            >
                              {booking.room.title}
                            </Link>
                            <p className="mt-1 truncate text-sm text-slate-500">{booking.room.address}</p>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="h-4 w-4 text-orange-600" />
                                {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                              </span>
                              {booking.cancelledAt && (
                                <span>Hủy ngày {formatDate(booking.cancelledAt)}</span>
                              )}
                            </div>
                            {booking.status === 'CANCELLED' && booking.cancellationReason && (
                              <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                <span className="font-bold">Lý do:</span> {booking.cancellationReason}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 md:w-36 md:flex-col">
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => openCancellationDialog(booking)}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
                              >
                                <CalendarX2 className="h-4 w-4" />
                                Hủy đặt phòng
                              </button>
                            )}
                            {contractInProgress && (
                              <Link
                                href="/contracts"
                                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-center text-sm font-bold text-white transition-colors hover:bg-slate-800"
                              >
                                {hasActiveContract ? 'Rời phòng' : 'Xem hợp đồng'}
                              </Link>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Host Managed Rooms Section */}
              {occupancy?.ownedRooms && occupancy.ownedRooms.length > 0 && (
                <section
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                      Quản lý
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-950">Phòng bạn quản lý</h2>
                  </div>

                  <div className="space-y-4">
                    {occupancy.ownedRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div>
                          <h3 className="font-bold text-slate-900">{room.title}</h3>
                          <p className="text-sm text-slate-600">{room.address}</p>
                        </div>
                        <Link
                          href={`/rooms/${room.id}/shared-space`}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">apartment</span>
                          Quản lý Sảnh Chung
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section
                id="preferences"
                className="scroll-mt-28 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-6 flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
                      Cá nhân hóa gợi ý
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-950">Sở thích phòng ở</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Những tiêu chí hệ thống đang sử dụng để tìm phòng phù hợp với bạn.
                    </p>
                  </div>
                  <Sparkles className="h-6 w-6 shrink-0 text-orange-600" />
                </div>

                {preferences ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-orange-100 bg-orange-50 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Ngân sách mỗi tháng</p>
                        <p className="mt-2 text-lg font-bold text-slate-950">
                          {preferences.budgetMinVnd && preferences.budgetMaxVnd
                            ? `${Number(preferences.budgetMinVnd).toLocaleString('vi-VN')} - ${Number(preferences.budgetMaxVnd).toLocaleString('vi-VN')} đ`
                            : 'Chưa cập nhật'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Khu vực mong muốn</p>
                        <p className="mt-2 text-lg font-bold text-slate-950">
                          {preferences.preferredDistrict || 'Không ưu tiên khu vực'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border border-slate-200 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Phong cách sống</p>
                        <p className="mt-2 font-bold text-slate-950">{preferences.lifestyleArchetype || 'Chưa chọn'}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ưu tiên sạch sẽ</p>
                        <p className="mt-2 text-xl font-bold text-emerald-700">{preferences.priorityCleanliness || 3}/5</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mức độ giao lưu</p>
                        <p className="mt-2 text-xl font-bold text-blue-700">{preferences.prioritySocialEnvironment || 3}/5</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <span className={`rounded-full px-3 py-1.5 ${preferences.acceptSmokingRoommates ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {preferences.acceptSmokingRoommates ? 'Chấp nhận người hút thuốc' : 'Không ở cùng người hút thuốc'}
                      </span>
                      <span className={`rounded-full px-3 py-1.5 ${preferences.acceptPets ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {preferences.acceptPets ? 'Chấp nhận thú cưng' : 'Không ưu tiên thú cưng'}
                      </span>
                    </div>

                    <div className="flex gap-3 border-t border-slate-200 pt-5">
                      <Link href="/preferences" className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700">
                        Cập nhật sở thích
                      </Link>
                      <Link href="/rooms/recommendations" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                        Xem phòng phù hợp
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <Heart className="mx-auto h-7 w-7 text-orange-600" />
                    <h3 className="mt-3 font-bold text-slate-950">Bạn chưa thiết lập sở thích phòng ở</h3>
                    <p className="mt-1 text-sm text-slate-500">Hoàn thành vài câu hỏi để nhận danh sách phòng phù hợp hơn.</p>
                    <Link href="/preferences" className="mt-5 inline-flex rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700">
                      Thiết lập sở thích
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
                    <span className="text-sm font-semibold text-slate-400">Có hiệu lực ngay</span>
                  </div>

                  <form onSubmit={handleChangePassword} className="py-6">
                    {(passwordError || passwordSuccess) && (
                      <div
                        className={`mb-5 rounded-lg border p-4 text-sm ${
                          passwordError
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {passwordError || passwordSuccess}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Mật khẩu hiện tại
                        </span>
                        <input
                          id="currentPassword"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordInputChange}
                          disabled={isChangingPassword}
                          autoComplete="current-password"
                          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 font-medium text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-600"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Mật khẩu mới
                        </span>
                        <input
                          id="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordInputChange}
                          disabled={isChangingPassword}
                          autoComplete="new-password"
                          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 font-medium text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-600"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Xác nhận mật khẩu mới
                        </span>
                        <input
                          id="confirmPassword"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordInputChange}
                          disabled={isChangingPassword}
                          autoComplete="new-password"
                          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 font-medium text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-600"
                        />
                      </label>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isChangingPassword ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                        Đổi mật khẩu
                      </button>
                    </div>
                  </form>

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
      {bookingToCancel && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-booking-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeCancellationDialog();
          }}
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="cancel-booking-title" className="text-xl font-bold text-slate-950">
                    Hủy đặt phòng
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{bookingToCancel.room.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCancellationDialog}
                disabled={isCancellingBooking}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Booking đã xác nhận sẽ giải phóng chỗ đang giữ. Hợp đồng ở giai đoạn nháp hoặc chờ ký cũng sẽ được hủy cùng yêu cầu này.
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-slate-800">Lý do hủy</span>
              <textarea
                value={cancellationReason}
                onChange={(event) => {
                  setCancellationReason(event.target.value);
                  setCancellationError('');
                }}
                rows={4}
                maxLength={500}
                disabled={isCancellingBooking}
                placeholder="Ví dụ: Tôi thay đổi kế hoạch chuyển đến..."
                className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50"
              />
              <span className="mt-1 block text-right text-xs text-slate-400">
                {cancellationReason.length}/500
              </span>
            </label>

            {cancellationError && (
              <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {cancellationError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCancellationDialog}
                disabled={isCancellingBooking}
                className="min-h-11 rounded-lg border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Giữ đặt phòng
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCancellingBooking || cancellationReason.trim().length < 5}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancellingBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarX2 className="h-4 w-4" />}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
