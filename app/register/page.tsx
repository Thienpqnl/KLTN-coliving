'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from 'next/navigation';
export default function RegisterPage() {
  const { refetch } = useAuth();
const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER',
    terms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, type, value, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lÃ²ng nháº­p há» tÃªn';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lÃ²ng nháº­p email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email khÃ´ng há»£p lá»‡';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lÃ²ng nháº­p máº­t kháº©u';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 8 kÃ½ tá»±';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Máº­t kháº©u khÃ´ng trÃ¹ng khá»›p';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    if (!formData.terms) {
      newErrors.terms = 'Vui lÃ²ng Ä‘á»“ng Ã½ vá»›i Ä‘iá»u khoáº£n';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (!validateForm()) return;

  setIsLoading(true);

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
      }),
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok) {
      setErrors({ submit: data.message || 'ÄÄƒng kÃ½ tháº¥t báº¡i' });
      return;
    }

    // LÆ°u token vÃ o localStorage
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    await refetch();

    // Redirect based on role
    if (formData.role === 'HOST') {
      router.push('/host');
    } else {
      router.push('/home');
    }
  } catch {
    setErrors({ submit: 'Đăng ký thất bại' });
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
            alt="KhÃ´ng gian co-living sang trá»ng"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfAu9icIgC2pau7CZT9KXd6v-pI7ev3PB8iSfvcdcZM2_8tnHhk8KP9e0he4yBOChavTyFeyriLkSAPv_VOCDwNfbb-2RiOi7S19hlx5JAbtM270wa1iIJOR0VMdxPgYLhcwpHxuXXiQtZUPmqWJb-40MxH1oyXpuIT88idIvZPFUbOoc2lp5nHsv4i_oAOtMxTCyaQbYQDcoy0KB9MD8AcJRDx8eQ8VvCticGo4qbR43ywRTHypFldeu4WZCc5DS0cydOzJrFOG8S"
          />
          <div className="absolute inset-0 bg-slate-950/45"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/20"></div>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/70 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          <div className="mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-white/95 backdrop-blur-md text-orange-700 font-label text-[10px] tracking-[0.2em] uppercase mb-6 shadow-sm">
              The Curated Hearth
            </span>
            <h1 className="font-headline text-5xl lg:text-7xl font-extrabold text-white tracking-tighter leading-[0.9] mb-8 drop-shadow-[0_3px_18px_rgba(0,0,0,0.65)]">
              TÃ¬m gia Ä‘Ã¬nh <br />
              <span className="text-orange-200">cá»§a báº¡n</span>
            </h1>
            <p className="text-white text-lg lg:text-xl font-medium leading-relaxed max-w-lg mb-12 drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]">
              KhÃ´ng chá»‰ lÃ  má»™t phÃ²ng. Má»™t há»‡ sinh thÃ¡i Ä‘Æ°á»£c tuyá»ƒn chá»n Ä‘Æ°á»£c thiáº¿t káº¿ cho nhá»¯ng cÃ¢u chuyá»‡n chia sáº», sá»± phÃ¡t triá»ƒn sÃ¡ng táº¡o vÃ  áº¥m Ã¡p cá»§a má»™t lÃ² sÆ°á»Ÿi hiá»‡n Ä‘áº¡i.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl border border-white/60 shadow-xl shadow-black/20">
              <span className="material-symbols-outlined text-orange-600 mb-3 block text-3xl">auto_awesome</span>
              <h3 className="font-headline font-bold text-slate-900">KhÃ´ng gian Tuyá»ƒn chá»n</h3>
              <p className="text-sm text-slate-700 mt-1">CÃ¡c mÃ´i trÆ°á»ng Ä‘Æ°á»£c thiáº¿t káº¿ Ä‘áº§y cáº£m há»©ng.</p>
            </div>
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl border border-white/60 shadow-xl shadow-black/20">
              <span className="material-symbols-outlined text-orange-600 mb-3 block text-3xl">group</span>
              <h3 className="font-headline font-bold text-slate-900">Káº¿t ná»‘i Thá»±c sá»±</h3>
              <p className="text-sm text-slate-700 mt-1">CÃ¡c cá»™ng Ä‘á»“ng Ä‘Æ°á»£c kiá»ƒm duyá»‡t cáº©n tháº­n.</p>
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
              Táº¡o tÃ i khoáº£n
            </h2>
            <p className="text-slate-600 font-light">
              Tham gia má»™t cá»™ng Ä‘á»“ng Ä‘Æ°á»£c xÃ¢y dá»±ng trÃªn cÃ¡c giÃ¡ trá»‹ chia sáº».
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                className="font-label text-[10px] font-semibold text-slate-600 uppercase tracking-wider ml-1 block"
                htmlFor="fullName"
              >
                Há» vÃ  TÃªn
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

            {/* Role Selection */}
            <div className="space-y-1.5">
              <label
                className="font-label text-[10px] font-semibold text-slate-600 uppercase tracking-wider ml-1 block"
                htmlFor="role"
              >
                I want to
              </label>
              <select
                className="w-full h-14 px-6 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
                id="role"
                value={formData.role}
                onChange={handleInputChange}
                disabled={isLoading}
              >
                <option value="CUSTOMER">Rent a room (Tenant)</option>
                <option value="HOST">Host a room (Landlord)</option>
              </select>
              {errors.role && (
                <p className="text-xs text-red-600 ml-1">{errors.role}</p>
              )}
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  className="font-label text-[10px] font-semibold text-slate-600 uppercase tracking-wider ml-1 block"
                  htmlFor="password"
                >
                  Máº­t kháº©u
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all outline-none"
                  id="password"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                  XÃ¡c nháº­n
                </label>
                <input
                  className="w-full h-14 px-6 rounded-full bg-slate-100 border-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all outline-none"
                  id="confirmPassword"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                TÃ´i Ä‘á»“ng Ã½ vá»›i{' '}
                <Link href="#" className="text-orange-600 font-medium hover:underline">
                  Äiá»u khoáº£n dá»‹ch vá»¥
                </Link>{' '}
                vÃ {' '}
                <Link href="#" className="text-orange-600 font-medium hover:underline">
                  ChÃ­nh sÃ¡ch báº£o máº­t
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
              <span>{isLoading ? 'Äang táº¡o tÃ i khoáº£n...' : 'Báº¯t Ä‘áº§u HÃ nh trÃ¬nh'}</span>
              {!isLoading && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              ÄÃ£ cÃ³ tÃ i khoáº£n?{' '}
              <Link href="/login" className="text-orange-600 font-bold ml-1 hover:underline">
                ÄÄƒng nháº­p
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
          Â© 2024 The Curated Hearth. All rights reserved.
        </footer>
      </section>
    </main>
  );
}

