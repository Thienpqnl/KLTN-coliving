'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, type, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không trùng khớp';
    }

    if (!formData.terms) {
      newErrors.terms = 'Vui lòng đồng ý với điều khoản';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (response.ok) {
        window.location.href = '/login';
      } else {
        const data = await response.json();
        setErrors({ submit: data.message || 'Đăng ký thất bại' });
      }
    } catch (error) {
      setErrors({ submit: 'Đã xảy ra lỗi. Vui lòng thử lại.' });
    } finally {
      setIsLoading(false);
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
              Tìm gia đình <br />
              <span className="text-orange-200">của bạn</span>
            </h1>
            <p className="text-white/90 text-lg lg:text-xl font-light leading-relaxed max-w-lg mb-12">
              Không chỉ là một phòng. Một hệ sinh thái được tuyển chọn được thiết kế cho những câu chuyện chia sẻ, sự phát triển sáng tạo và ấm áp của một lò sưởi hiện đại.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/60 backdrop-blur-md p-6 rounded-xl border border-white/20">
              <span className="material-symbols-outlined text-orange-600 mb-3 block text-3xl">auto_awesome</span>
              <h3 className="font-headline font-bold text-slate-900">Không gian Tuyển chọn</h3>
              <p className="text-sm text-slate-700 mt-1">Các môi trường được thiết kế đầy cảm hứng.</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md p-6 rounded-xl border border-white/20">
              <span className="material-symbols-outlined text-orange-600 mb-3 block text-3xl">group</span>
              <h3 className="font-headline font-bold text-slate-900">Kết nối Thực sự</h3>
              <p className="text-sm text-slate-700 mt-1">Các cộng đồng được kiểm duyệt cẩn thận.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side - Registration Form */}
      <section className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-12 lg:px-24 bg-white relative">
        <div className="absolute top-8 left-8 md:hidden">
          <span className="font-headline text-xl font-bold tracking-tighter text-orange-900">
            The Curated Hearth
          </span>
        </div>

        <div className="w-full max-w-md">
          <header className="mb-10">
            <h2 className="font-headline text-3xl font-bold text-slate-900 tracking-tight mb-2">
              Tạo tài khoản
            </h2>
            <p className="text-slate-600 font-light">
              Tham gia một cộng đồng được xây dựng trên các giá trị chia sẻ.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                className="font-label text-[10px] font-semibold text-slate-600 uppercase tracking-wider ml-1 block"
                htmlFor="fullName"
              >
                Họ và Tên
              </label>
              <input
                className="w-full h-14 px-6 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all placeholder:text-slate-400 outline-none"
                id="fullName"
                placeholder="Evelyn Thorne"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-xs text-red-600 ml-1">{errors.fullName}</p>
              )}
            </div>

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
                placeholder="evelyn@hearth.com"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-xs text-red-600 ml-1">{errors.email}</p>
              )}
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  className="font-label text-[10px] font-semibold text-slate-600 uppercase tracking-wider ml-1 block"
                  htmlFor="password"
                >
                  Mật khẩu
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all outline-none"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-xs text-red-600 ml-1">{errors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  className="font-label text-[10px] font-semibold text-slate-600 uppercase tracking-wider ml-1 block"
                  htmlFor="confirmPassword"
                >
                  Xác nhận
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all outline-none"
                  id="confirmPassword"
                  placeholder="••••••••"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 ml-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-3 py-2">
              <input
                className="rounded text-orange-600 focus:ring-orange-500 border-slate-300 h-4 w-4 mt-0.5"
                id="terms"
                type="checkbox"
                checked={formData.terms}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <label className="text-xs text-slate-600 leading-relaxed" htmlFor="terms">
                Tôi đồng ý với{' '}
                <Link href="#" className="text-orange-600 font-medium hover:underline">
                  Điều khoản dịch vụ
                </Link>{' '}
                và{' '}
                <Link href="#" className="text-orange-600 font-medium hover:underline">
                  Chính sách bảo mật
                </Link>
                .
              </label>
            </div>
            {errors.terms && (
              <p className="text-xs text-red-600 ml-1">{errors.terms}</p>
            )}

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              className="w-full h-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-label text-xs font-bold uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isLoading}
            >
              <span>{isLoading ? 'Đang tạo tài khoản...' : 'Bắt đầu Hành trình'}</span>
              {!isLoading && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-orange-600 font-bold ml-1 hover:underline">
                Đăng nhập
              </Link>
            </p>
          </div>

          {/* Partner Logos */}
          <div className="mt-12 flex justify-center gap-6 grayscale opacity-40">
            <img alt="Partner Logo" className="h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkPk7jeBxQ18AIg-suV9cAmLLCSzl3YynCujV5hEQO4OWamPVoAvKu7XYRfzfkSf_05qbO0vnt_w495pG74NZKkW8c3ek2Tfb3ZQWfKJzsVJkM3cL2lMfBmdni0I7odQkPyv-y6ab_b_0osdEOlhZ9J7PkEhBq8j27Qoz9l2VaLNLXjhSSvJwOE4_5tSRVmk0itjmR-XdlbNkdnReyfmCEt4vqFbJgFVmHDeQYrBGK44waHu5ViByrHC0trN95nARDonvricJ3V1pB" />
            <img alt="Partner Logo" className="h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEBClqmdTSnZOY9u-aWcc9sWaUSM1Cc13FlkMXKSKzaLtGVqir7w6jfExyrBvIV4u3PfkIOfdMxaql_gkYFCx6demFeZozRfn5aP1UeyHb7Z8FgR-CVHd2FU3C8s51eOHbOA_o5qvlWVuBkCY6YPfV52Mr0y2xS1vkgCMdsmGBhIT0T6dp6toycPekgW5R5rXyzjfPVBtvb5gf_gnQ2jRPLRqP5Zy1dqtBbS3K4laI9p4rYy0me_5i80sSoACITW8guIpbEvLpGrgX" />
            <img alt="Partner Logo" className="h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRNHtqU-w2PT20lHobiJrMXyqZbJh2sAiwRNh_iWGzGlw42DZ4gEwSh3uSUrfh6n0iBNkaiCFShkltqhyOinte9vQfUP-09-KYx1Ss5ccwFtuENf2qhJgdbRb9OWle_D5jrN6kCwk_RqSjqKDkJ7rEMuVOQCakg0kMahD_L_cZfU68TtPudbg0nIe6uMoy3B81BoLH0ILTnYr-b7FGzz3-o-P4fs3rB-xF8NTMoCXmxFYWhUYhGJoMFObSBdgASI5tyC-uVk7unPX_" />
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
