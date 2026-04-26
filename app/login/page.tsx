'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/lib/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Đăng nhập thất bại');
        return;
      }

      localStorage.setItem('token', data.token);
      router.push('/home');
    } catch (err) {
      setError('Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-white">
      {/* Left Side - Hero Section */}
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 relative bg-blue-100 items-center justify-center p-12 lg:p-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Không gian co-living sang trọng"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfAu9icIgC2pau7CZT9KXd6v-pI7ev3PB8iSfvcdcZM2_8tnHhk8KP9e0he4yBOChavTyFeyriLkSAPv_VOCDwNfbb-2RiOi7S19hlx5JAbtM270wa1iIJOR0VMdxPgYLhcwpHxuXXiQtZUPmqWJb-40MxH1oyXpuIT88idIvZPFUbOoc2lp5nHsv4i_oAOtMxTCyaQbYQDcoy0KB9MD8AcJRDx8eQ8VvCticGo4qbR43ywRTHypFldeu4WZCc5DS0cydOzJrFOG8S"
          />
          <div className="absolute inset-0 bg-orange-600/20 mix-blend-multiply"></div>
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          <div className="mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-white/60 backdrop-blur-md text-orange-600 font-label text-[10px] tracking-[0.2em] uppercase mb-6">
              The Curated Hearth
            </span>
            <h1 className="font-headline text-5xl lg:text-7xl font-extrabold text-white tracking-tighter leading-[0.9] mb-8 drop-shadow-sm">
              Chào mừng <br />
              <span className="text-orange-200">Trở lại</span>
            </h1>
            <p className="text-white/90 text-lg lg:text-xl font-light leading-relaxed max-w-lg mb-12">
              Đăng nhập vào tài khoản của bạn và khám phá lối sống được tuyển chọn đặc biệt cho bạn. Hành trình của bạn tiếp tục ở đây.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/60 backdrop-blur-md p-6 rounded-xl border border-white/20">
              <span className="material-symbols-outlined text-orange-600 mb-3 block text-3xl">verified_user</span>
              <h3 className="font-headline font-bold text-slate-900">Truy cập An toàn</h3>
              <p className="text-sm text-slate-700 mt-1">Dữ liệu của bạn được mã hóa và bảo vệ.</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md p-6 rounded-xl border border-white/20">
              <span className="material-symbols-outlined text-orange-600 mb-3 block text-3xl">thumb_up</span>
              <h3 className="font-headline font-bold text-slate-900">Truy cập Nhanh</h3>
              <p className="text-sm text-slate-700 mt-1">Trải nghiệm đăng nhập mượt mà.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side - Login Form */}
      <section className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-12 lg:px-24 bg-white relative">
        <div className="absolute top-8 left-8 md:hidden">
          <span className="font-headline text-xl font-bold tracking-tighter text-orange-900">
            The Curated Hearth
          </span>
        </div>

        <div className="w-full max-w-md">
          <header className="mb-10">
            <h2 className="font-headline text-3xl font-bold text-slate-900 tracking-tight mb-2">
              Đăng nhập
            </h2>
            <p className="text-slate-600 font-light">
              Tiếp tục hành trình của bạn cùng chúng tôi.
            </p>
          </header>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                className="font-label text-[10px] font-semibold text-slate-600 uppercase tracking-wider ml-1 block"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className="w-full h-14 px-6 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all placeholder:text-slate-400 outline-none"
                id="email"
                placeholder="your@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="font-label text-[10px] font-semibold text-slate-600 uppercase tracking-wider ml-1"
                  htmlFor="password"
                >
                  Mật khẩu
                </label>
                <Link
                  href="#"
                  className="font-label text-[10px] font-semibold text-orange-600 uppercase tracking-wider hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <input
                className="w-full h-14 px-6 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all outline-none"
                id="password"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              className="w-full h-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-label text-xs font-bold uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
              {!loading && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="text-orange-600 font-bold ml-1 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-8 text-[10px] font-label tracking-widest text-slate-500 uppercase">
          © 2024 The Curated Hearth. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
