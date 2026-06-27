"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch, apiRequest, API_ROUTES } from '@/lib/api-client';

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkUser = async () => {
    try {
      const data = await apiFetch<User>(API_ROUTES.authMe);
      setUser(data);
    } catch (err) {
      setUser(null);
      // Redirect to login if we are not already on the login page
      if (pathname !== '/login' && pathname !== '/auth') {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, [pathname]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await apiRequest(API_ROUTES.authLogin, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Incorrect username or password');
      }

      const data = await response.json();
      if (data.user) {
        setUser(data.user);
        router.push('/');
      } else {
        await checkUser();
      }
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
      localStorage.removeItem('token'); // Keep compatibility
      setLoading(false);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkUser }}>
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
