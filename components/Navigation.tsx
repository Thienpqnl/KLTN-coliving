'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

export function Navigation() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;
  const accountName = user?.fullName || user?.name || user?.email || 'Tài khoản';
  const initials = accountName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const closeAccountMenu = () => setIsAccountMenuOpen(false);

  return (
    <nav className="fixed top-0 z-50 flex h-20 w-full items-center bg-white/75 shadow-sm backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-screen-2xl grid-cols-[minmax(0,1fr)_auto] items-center px-4 md:grid-cols-3 md:px-8">
        <div className="flex items-center">
          <Link
            href="/"
            className="whitespace-nowrap font-headline text-xl font-bold tracking-tighter text-orange-900 md:text-2xl"
          >
            The Curated Hearth
          </Link>
        </div>

        <div className="hidden items-center justify-center gap-8 font-headline tracking-tight md:flex">
          <Link
            href="/"
            className={`border-b-2 font-semibold transition-colors ${
              isActive('/') || isActive('/home')
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-slate-600 hover:text-orange-600'
            }`}
          >
            Trang chủ
          </Link>
          <Link
            href="/rooms"
            className={`border-b-2 font-medium transition-colors ${
              isActive('/rooms')
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-slate-600 hover:text-orange-600'
            }`}
          >
            Danh sách phòng
          </Link>
          <Link
            href="/#community"
            className="font-medium text-slate-600 transition-colors hover:text-orange-600"
          >
            Cộng đồng
          </Link>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 md:gap-4">
          {isLoading ? (
            <div className="h-10 w-36 animate-pulse rounded-full bg-slate-100" />
          ) : user ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition hover:border-orange-200 hover:bg-orange-50/60 focus:outline-none focus:ring-2 focus:ring-orange-200 sm:gap-3 sm:pr-4"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-xs font-black text-orange-800">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials || <UserRound className="h-4 w-4" />
                  )}
                </span>
                <span className="hidden max-w-44 truncate text-sm font-bold text-slate-800 sm:block">
                  {accountName}
                </span>
                <ChevronDown
                  className={`hidden h-4 w-4 shrink-0 text-slate-500 transition-transform sm:block ${
                    isAccountMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isAccountMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.75rem)] w-64 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
                >
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="truncate text-sm font-bold text-slate-900">{accountName}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
                  </div>

                  <div className="py-2">
                    {user.role === 'ADMIN' && (
                      <AccountMenuLink
                        href="/admin"
                        icon={<LayoutDashboard className="h-4 w-4" />}
                        label="Dashboard admin"
                        onClick={closeAccountMenu}
                      />
                    )}
                    {user.role === 'HOST' && (
                      <AccountMenuLink
                        href="/host"
                        icon={<LayoutDashboard className="h-4 w-4" />}
                        label="Dashboard chủ nhà"
                        onClick={closeAccountMenu}
                      />
                    )}
                    {user.role === 'COMMUNITY_MANAGER' && (
                      <AccountMenuLink
                        href="/community-manager"
                        icon={<LayoutDashboard className="h-4 w-4" />}
                        label="Dashboard cộng đồng"
                        onClick={closeAccountMenu}
                      />
                    )}
                    <AccountMenuLink
                      href="/profile"
                      icon={<UserRound className="h-4 w-4" />}
                      label="Trang cá nhân"
                      onClick={closeAccountMenu}
                    />
                    {user.role === 'CUSTOMER' && (
                      <>
                        <AccountMenuLink
                          href="/favorites"
                          icon={<Heart className="h-4 w-4" />}
                          label="Phòng yêu thích"
                          onClick={closeAccountMenu}
                        />
                        <AccountMenuLink
                          href="/contracts"
                          icon={<FileText className="h-4 w-4" />}
                          label="Hợp đồng của tôi"
                          onClick={closeAccountMenu}
                        />
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeAccountMenu();
                        void logout();
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-orange-800 transition-colors hover:bg-orange-50 md:px-6"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="hidden rounded-full bg-gradient-to-r from-orange-900 to-orange-500 px-6 py-2 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 sm:inline-flex"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function AccountMenuLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-orange-50 hover:text-orange-800"
    >
      <span className="text-slate-500">{icon}</span>
      {label}
    </Link>
  );
}
