'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AuthHeader } from '@/components/AuthHeader';

type RegisterForm = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'CUSTOMER' | 'HOST';
  terms: boolean;
};

const initialForm: RegisterForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'CUSTOMER',
  terms: false,
};

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState<RegisterForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = event.target;
    const value =
      target instanceof HTMLInputElement && target.type === 'checkbox'
        ? target.checked
        : target.value;

    setFormData((current) => ({
      ...current,
      [target.id]: value,
    }));
    setErrors((current) => ({ ...current, [target.id]: '' }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Vui lòng nhập họ và tên.';
    }
    if (!formData.email.trim()) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Địa chỉ email không hợp lệ.';
    }
    if (!formData.password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    }
    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp.';
    }
    if (!formData.role) {
      nextErrors.role = 'Vui lòng chọn mục đích sử dụng tài khoản.';
    }
    if (!formData.terms) {
      nextErrors.terms = 'Bạn cần đồng ý với điều khoản và chính sách bảo mật.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          fullName: formData.fullName.trim(),
          role: formData.role,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrors({ submit: payload.message || 'Không thể đăng ký tài khoản.' });
        return;
      }

      if (payload.token) await login(payload.token);
      router.replace(formData.role === 'HOST' ? '/host' : '/');
    } catch {
      setErrors({ submit: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthHeader page="register" />
      <main className="flex min-h-screen flex-col overflow-hidden bg-white pt-16 md:flex-row">
      <section className="relative hidden min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-slate-950 p-12 md:flex md:w-1/2 lg:w-3/5 lg:p-24">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Không gian sống chung hiện đại"
            className="h-full w-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfAu9icIgC2pau7CZT9KXd6v-pI7ev3PB8iSfvcdcZM2_8tnHhk8KP9e0he4yBOChavTyFeyriLkSAPv_VOCDwNfbb-2RiOi7S19hlx5JAbtM270wa1iIJOR0VMdxPgYLhcwpHxuXXiQtZUPmqWJb-40MxH1oyXpuIT88idIvZPFUbOoc2lp5nHsv4i_oAOtMxTCyaQbYQDcoy0KB9MD8AcJRDx8eQ8VvCticGo4qbR43ywRTHypFldeu4WZCc5DS0cydOzJrFOG8S"
          />
          <div className="absolute inset-0 bg-slate-950/55" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/25" />
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          <span className="mb-7 inline-block rounded-full bg-white/95 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-700 shadow-sm">
            The Curated Hearth
          </span>
          <h1 className="max-w-xl font-headline text-5xl font-extrabold leading-[0.95] text-white drop-shadow-lg lg:text-7xl">
            Tìm không gian
            <span className="mt-2 block text-orange-200">thuộc về bạn</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-white/90 drop-shadow-md lg:text-xl">
            Không chỉ là một căn phòng, đây là nơi bạn tìm thấy cộng đồng phù hợp,
            những kết nối chân thành và một nhịp sống mới đầy cảm hứng.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="rounded-lg border border-white/50 bg-white/90 p-6 shadow-xl backdrop-blur-md">
              <Sparkles className="h-7 w-7 text-orange-600" />
              <h2 className="mt-4 font-headline font-bold text-slate-900">
                Không gian tuyển chọn
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Khám phá những nơi ở đã được kiểm duyệt và xác thực.
              </p>
            </div>
            <div className="rounded-lg border border-white/50 bg-white/90 p-6 shadow-xl backdrop-blur-md">
              <Users className="h-7 w-7 text-orange-600" />
              <h2 className="mt-4 font-headline font-bold text-slate-900">
                Kết nối phù hợp
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Gặp gỡ những người bạn ở cùng có lối sống tương đồng.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex flex-1 flex-col items-center justify-center bg-white px-6 py-20 md:px-12 lg:px-20">
        <div className="w-full max-w-lg">
          <header className="mb-9">
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-950">
              Tạo tài khoản
            </h2>
            <p className="mt-2 leading-relaxed text-slate-600">
              Bắt đầu hành trình tìm kiếm không gian sống phù hợp với bạn.
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <FormField label="Họ và tên" error={errors.fullName}>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Nguyễn Văn An"
                value={formData.fullName}
                onChange={handleInputChange}
                disabled={isLoading}
                className="h-14 w-full rounded-full border border-transparent bg-slate-100 px-6 text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </FormField>

            <FormField label="Địa chỉ email" error={errors.email}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nguyenvanan@example.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className="h-14 w-full rounded-full border border-transparent bg-slate-100 px-6 text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </FormField>

            <FormField label="Bạn muốn" error={errors.role}>
              <select
                id="role"
                value={formData.role}
                onChange={handleInputChange}
                disabled={isLoading}
                className="h-14 w-full rounded-full border border-transparent bg-slate-100 px-6 text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
              >
                <option value="CUSTOMER">Tìm và thuê phòng</option>
                <option value="HOST">Đăng phòng cho thuê</option>
              </select>
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Mật khẩu" error={errors.password}>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="h-14 w-full rounded-full border border-transparent bg-slate-100 px-6 text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </FormField>
              <FormField label="Xác nhận mật khẩu" error={errors.confirmPassword}>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="h-14 w-full rounded-full border border-transparent bg-slate-100 px-6 text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </FormField>
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-600">
                <input
                  id="terms"
                  type="checkbox"
                  checked={formData.terms}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span>
                  Tôi đồng ý với{' '}
                  <Link href="#" className="font-semibold text-orange-700 hover:underline">
                    Điều khoản dịch vụ
                  </Link>{' '}
                  và{' '}
                  <Link href="#" className="font-semibold text-orange-700 hover:underline">
                    Chính sách bảo mật
                  </Link>
                  .
                </span>
              </label>
              {errors.terms && <p className="mt-1.5 text-xs text-red-600">{errors.terms}</p>}
            </div>

            {errors.submit && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errors.submit}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-gradient-to-r from-orange-700 to-orange-500 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-800 hover:to-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              {!isLoading && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>

          <p className="mt-8 border-t border-slate-200 pt-7 text-center text-sm text-slate-600">
            Đã có tài khoản?{' '}
            <Link href="/login" className="font-bold text-orange-700 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>

        <footer className="mt-12 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          © 2026 The Curated Hearth. Bảo lưu mọi quyền.
        </footer>
      </section>
      </main>
    </>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="ml-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </span>
      {children}
      {error && <span className="ml-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
