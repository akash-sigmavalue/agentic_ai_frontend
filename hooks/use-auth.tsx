"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch, apiRequest, API_ROUTES } from '@/lib/api-client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ActiveOrg {
  org_id: number;
  org_name: string;
  org_role: 'OWNER' | 'EMPLOYEE';
  org_token_balance: number;
  org_status: 'ACTIVE' | 'SUSPENDED';
}

export interface User {
  id: number;
  username: string;
  email?: string | null;
  role: 'ADMIN' | 'FREE' | 'PAID';
  account_type?: 'INDIVIDUAL' | 'ENTERPRISE' | null;
  /** Personal wallet — 10,000 granted on signup, grows with individual token purchases */
  personal_token_balance: number;
  is_active?: boolean;
  is_email_verified?: boolean;
  created_at?: string;
  /** Set when the user has an ACTIVE enterprise org membership */
  active_org?: ActiveOrg | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Pages that don't require authentication */
const PUBLIC_PATHS = ['/', '/login', '/auth', '/register', '/auth/reset-password', '/pricing', '/office/invite', '/payment', '/valuation'];


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
      const isPublic = PUBLIC_PATHS.some(p => p === '/' ? pathname === '/' : pathname.startsWith(p));
      if (!isPublic) {
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
      // silently ignore — session may be briefly invalid
    }
  };

  useEffect(() => {
    checkUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

      await checkUser();
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    const response = await apiRequest(API_ROUTES.authForgotPassword, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Could not send reset email. Please try again.');
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkUser, refreshProfile, forgotPassword }}>
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
