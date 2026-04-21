"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "../api/client";

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Restore session
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      apiClient.setToken(storedToken);
    }

    setLoading(false);
  }, []);

  // 2. Login
  const login = async (email: string, password: string) => {
    const res = await apiClient.post<any>("/auth/login", {
      email,
      password,
    });

    setToken(res.token);
    setUser(res.user);

    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));

    apiClient.setToken(res.token);
  };

  // 3. Register
  const register = async (email: string, password: string, fullName: string) => {
    const res = await apiClient.post<any>("/auth/register", {
      email,
      password,
      fullName,
    });

    setToken(res.token);
    setUser(res.user);

    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));

    apiClient.setToken(res.token);
  };

  // 4. Logout
  const logout = () => {
    setToken(null);
    setUser(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    apiClient.setToken(null);
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