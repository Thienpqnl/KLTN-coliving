'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-xl shadow-sm h-20 flex items-center">
      <div className="grid grid-cols-3 items-center px-8 w-full max-w-screen-2xl mx-auto">
        {/* Logo Section */}
        <div className="flex items-center">
          <span className="text-2xl font-bold tracking-tighter text-orange-900 font-headline whitespace-nowrap">The Curated Hearth</span>
        </div>
        
        {/* Centered Menu Section */}
        <div className="flex justify-center items-center gap-8 font-headline tracking-tight">
          <Link 
            href="/" 
            className={`font-semibold border-b-2 transition-colors ${
              isActive('/') || isActive('/home')
                ? 'text-orange-700 border-orange-500 hover:text-orange-600'
                : 'text-slate-600 border-transparent hover:text-orange-600'
            }`}
          >
            Trang chủ
          </Link>
          <Link 
            href="/rooms" 
            className={`font-medium transition-colors ${
              isActive('/rooms')
                ? 'text-orange-700 border-b-2 border-orange-500'
                : 'text-slate-600 hover:text-orange-600'
            }`}
          >
            Danh sách phòng
          </Link>
          <Link 
            href="#" 
            className="text-slate-600 font-medium hover:text-orange-600 transition-colors"
          >
            Cộng đồng
          </Link>
        </div>
        
        {/* Auth Buttons Section */}
        <div className="flex items-center justify-end gap-4">
          <Link 
            href="/login" 
            className="px-6 py-2 rounded-full font-label text-xs font-bold uppercase tracking-wider text-orange-800 hover:bg-orange-50 transition-all"
          >
            Đăng nhập
          </Link>
          <Link 
            href="/register" 
            className="px-6 py-2 rounded-full font-label text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 transition-all" 
            style={{ background: 'linear-gradient(135deg, #944a00 0%, #f28c38 100%)' }}
          >
            ĐĂNG KÝ
          </Link>
        </div>
      </div>
    </nav>
  );
}
