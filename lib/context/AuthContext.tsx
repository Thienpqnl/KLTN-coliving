'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  phone?: string;
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

  const fetchUser = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      setToken(storedToken);
      
      console.log('🔍 [AuthContext] fetchUser - Token từ localStorage:', storedToken ? 'có' : 'không');
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      console.log('📡 [AuthContext] /api/auth/me response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ [AuthContext] User data nhận được:', userData?.id);
        setUser(userData);
      } else {
        const errorText = await response.text();
        console.error('❌ [AuthContext] /api/auth/me failed:', response.status, errorText);
        setUser(null);
      }
    } catch (error) {
      console.error('❌ [AuthContext] fetchUser error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // Only fetch on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refetch = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  const login = async (token: string) => {
    setIsLoading(true);
    try {
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
