'use client';

import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  phone?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  avatarUrl?: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  login: (token: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggingOut = useRef(false);

  const fetchUser = async () => {
    try {
      const storedToken = localStorage.getItem('token');

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (isLoggingOut.current) return;

      if (response.ok) {
        const userData = await response.json();
        setToken(storedToken);
        setUser(userData);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } else {
        const errorText = await response.text();
        console.warn('[AuthContext] /api/auth/me failed:', response.status, errorText);
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.warn('[AuthContext] fetchUser error:', error);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token' && !event.newValue) {
        setToken(null);
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const logout = async () => {
    isLoggingOut.current = true;
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Không thể xóa phiên đăng nhập trên máy chủ');
      }

      window.location.replace('/');
    } catch (error) {
      console.error('Logout failed:', error);
      isLoggingOut.current = false;
    }
  };

  const refetch = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  const login = async (token: string) => {
    setIsLoading(true);
    try {
      localStorage.setItem('token', token);
      setToken(token);
      await fetchUser();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, logout, refetch, login }}>
      {children}
    </AuthContext.Provider>
  );
}
