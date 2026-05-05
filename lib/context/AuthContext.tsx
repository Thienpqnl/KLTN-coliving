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
  isLoading: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  login: (token: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
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
    <AuthContext.Provider value={{ user, isLoading, logout, refetch, login }}>
      {children}
    </AuthContext.Provider>
  );
}
