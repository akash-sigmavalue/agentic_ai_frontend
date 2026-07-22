"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch, apiRequest, API_ROUTES } from '@/lib/api-client';

export interface TokenBalance {
  total_allocated_tokens: number;
  available_tokens: number;
  used_tokens: number;
  status: 'NOT_REQUESTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface User {
  id: number;
  username: string;
  email?: string | null;
  role: 'ADMIN' | 'FREE' | 'PAID';
  is_active?: boolean;
  created_at?: string;
  token_balance?: TokenBalance | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Pages that don't require authentication */
const PUBLIC_PATHS = ['/login', '/auth', '/register', '/maharera_agent'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkUser = async () => {
    try {
      const data = await apiFetch<User>(API_ROUTES.profileMe);
      setUser(data);
    } catch {
      setUser(null);
      if (!PUBLIC_PATHS.includes(pathname)) {
        router.push('/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  /** Refresh just the profile without triggering redirect on error. */
  const refreshProfile = async () => {
    try {
      const data = await apiFetch<User>(API_ROUTES.profileMe);
      setUser(data);
    } catch {
      // silently ignore — user session may be valid but brief network hiccup
    }
  };

  useEffect(() => {
    checkUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /**
   * Login with username OR email + password.
   * The backend accepts either in the `username` form field.
   */
  const login = async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', identifier);
      formData.append('password', password);

      const response = await apiRequest(API_ROUTES.authLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Incorrect username/email or password');
      }

      // Fetch full profile (includes role + token_balance)
      await checkUser();
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register a new account and auto-login (session cookie set by backend).
   */
  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiRequest(API_ROUTES.authRegister, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Registration failed. Please try again.');
      }

      // Fetch full profile after registration
      await checkUser();
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiRequest(API_ROUTES.authLogout, { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      setUser(null);
      setLoading(false);
      router.push('/auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
