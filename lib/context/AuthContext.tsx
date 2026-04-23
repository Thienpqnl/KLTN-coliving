"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "../api/client";

interface User {
  id: string;
  email: string;
  role: string;
  fullName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Restore session
  useEffect(() => {
    const fetchMe = async () => {
      try {
        // Try to restore token from localStorage first
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (storedToken) {
          apiClient.setToken(storedToken);
          setToken(storedToken);
        }
        
        const res = await apiClient.get<User>("/auth/me");
        setUser(res);
      } catch (error) {
        // Clear invalid token
        if (typeof window !== 'undefined') {
          localStorage.removeItem("token");
        }
        apiClient.setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);


  // 2. Login
  const login = async (email: string, password: string) => {
    const res = await apiClient.post<any>("/auth/login", {
      email,
      password,
    });

    setToken(res.token);
    setUser(res.user);
    apiClient.setToken(res.token);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem("token", res.token);
    }
  };

  // 3. Register
  const register = async (email: string, password: string, fullName: string, role: string) => {
    const res = await apiClient.post<any>("/auth/register", {
      email,
      password,
      fullName,
      role,
    });

    setToken(res.token);
    setUser(res.user);
    apiClient.setToken(res.token);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem("token", res.token);
    }
  };

  // 4. Logout
  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {})
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setToken(null)
      setUser(null)
      apiClient.setToken(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem("token");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};