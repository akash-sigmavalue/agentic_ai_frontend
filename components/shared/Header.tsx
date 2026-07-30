"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Cpu, LayoutDashboard, Sun, Moon, LogOut, User as UserIcon, Shield, Lock, Zap, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import AgentListDropdown from './AgentListDropdown';

const THEME_STORAGE_KEY = 'sigmavalue_theme';
const THEME_CHANGE_EVENT = 'sigmavalue-theme-change';

const getThemeSnapshot = () => localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
const getServerThemeSnapshot = () => false;

const subscribeToTheme = (onStoreChange: () => void) => {
  const handleChange = () => {
    const isDark = getThemeSnapshot();
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    onStoreChange();
  };

  window.addEventListener('storage', handleChange);
  window.addEventListener(THEME_CHANGE_EVENT, handleChange);
  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(THEME_CHANGE_EVENT, handleChange);
  };
};

const Header = () => {
  const [mounted, setMounted] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDarkSnapshot = React.useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const isDark = mounted ? isDarkSnapshot : false;
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const toggleTheme = () => {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'light' : 'dark');
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  const shellClass = isDark
    ? 'bg-slate-950/90 border-slate-800/80 text-slate-100'
    : 'bg-[#f8fafc]/90 border-slate-200/80 text-slate-900';
  const titleClass = isDark ? 'text-slate-50' : 'text-[#1a1c3d]';
  const subtitleClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const pillClass = isDark
    ? 'bg-slate-900 border-slate-700 shadow-md hover:bg-slate-800'
    : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50';
  const pillTextClass = isDark ? 'text-slate-200' : 'text-slate-700';
  const borderTextClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const toggleClass = isDark
    ? 'bg-slate-900 border-slate-700'
    : 'bg-slate-100 border-slate-200';

  return (
    <header className={`site-header fixed top-0 left-0 z-[1001] flex h-20 w-full items-center justify-between px-4 sm:px-8 lg:px-10 backdrop-blur-md border-b transition-colors ${shellClass}`}>
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-3 sm:gap-4 cursor-pointer shrink-0">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#525ceb] shadow-lg shadow-indigo-500/20">
          <Cpu className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className={`text-base sm:text-xl font-black tracking-tight leading-none mb-0.5 sm:mb-1 ${titleClass}`}>
            Sigmavalue AI Pilot
          </h1>
          <span className={`text-[8px] sm:text-[10px] font-black tracking-[0.2em] uppercase ${subtitleClass}`}>
            INTELLIGENT WORKSPACE
          </span>
        </div>
      </Link>

      {/* Desktop Navigation Links */}
      <div className="hidden lg:flex items-center gap-6">
        <div className="flex items-center gap-3">
          {user?.role === 'ADMIN' ? (
            <Link
              href="/portfolio-management"
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${
                pathname === '/portfolio-management'
                  ? isDark
                    ? 'bg-indigo-950 border-indigo-800'
                    : 'bg-indigo-50 border-indigo-200'
                  : pillClass
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 transition-colors ${pathname === '/portfolio-management' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${pathname === '/portfolio-management' ? (isDark ? 'text-indigo-300' : 'text-indigo-700') : pillTextClass}`}>SOLUTION</span>
            </Link>
          ) : (
            <div className="relative group/tooltip">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-not-allowed select-none opacity-40 ${pillClass}`}>
                <Lock className="h-4 w-4 text-slate-400" />
                <span className={`text-[10px] font-black uppercase tracking-widest ${pillTextClass}`}>SOLUTION</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 w-52 scale-95 opacity-0 pointer-events-none group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 transition-all duration-200 z-[1002] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 p-3 shadow-xl backdrop-blur-md text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 font-bold text-center">
                <span className="text-[#525ceb] block mb-1 font-extrabold tracking-wider">ADMINISTRATOR ONLY</span>
                Please contact your administrator to request access to the Solution Workspace.
              </div>
            </div>
          )}

          <Link
            href="/pricing"
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${
              pathname === '/pricing'
                ? isDark
                  ? 'bg-amber-950/60 border-amber-800'
                  : 'bg-amber-50 border-amber-200 shadow-sm'
                : pillClass
            }`}
          >
            <Zap className={`h-4 w-4 transition-colors ${pathname === '/pricing' ? 'text-amber-500' : 'text-slate-400 group-hover:text-amber-500'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${pathname === '/pricing' ? (isDark ? 'text-amber-300' : 'text-amber-700') : pillTextClass}`}>PRICING</span>
          </Link>

          <AgentListDropdown />

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${
                pathname === '/admin'
                  ? 'bg-violet-50 border-violet-200'
                  : 'bg-white border-slate-200 shadow-sm hover:bg-violet-50 hover:border-violet-200'
              }`}
            >
              <Shield className={`h-4 w-4 transition-colors ${pathname === '/admin' ? 'text-violet-600' : 'text-slate-400 group-hover:text-violet-600'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${pathname === '/admin' ? 'text-violet-700' : pillTextClass}`}>ADMIN</span>
            </Link>
          )}
        </div>

        {/* User Profile & Theme Toggle */}
        <div className={`flex items-center gap-4 pl-6 ${borderTextClass} border-l`}>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100/50 transition-all"
                title="My Profile"
              >
                <UserIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {user.username}
                </span>
                {user.role === 'ADMIN' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[9px] font-black uppercase">
                    ADMIN
                  </span>
                )}
                {user.role === 'FREE' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-black uppercase">
                    FREE
                  </span>
                )}
              </Link>
              <button
                onClick={logout}
                className="flex items-center justify-center p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-rose-500 transition-all cursor-pointer shadow-sm"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <UserIcon className="h-3.5 w-3.5 text-white" />
              Sign In
            </Link>
          )}

          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 p-1 rounded-full border transition-all hover:shadow-inner ${toggleClass}`}
          >
            <div className={`p-1.5 rounded-full ${!isDark ? 'bg-white shadow-sm' : ''}`}>
              <Sun className={`h-3.5 w-3.5 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>
            <div className={`p-1.5 rounded-full ${isDark ? 'bg-slate-800 shadow-sm' : ''}`}>
              <Moon className={`h-3.5 w-3.5 ${isDark ? 'text-blue-400' : 'text-slate-400'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Header Controls (Right side for mobile) */}
      <div className="flex lg:hidden items-center gap-3">
        <button
          onClick={toggleTheme}
          className={`flex items-center p-1 rounded-full border ${toggleClass}`}
        >
          <div className={`p-1 rounded-full ${!isDark ? 'bg-white shadow-sm' : ''}`}>
            <Sun className={`h-3.5 w-3.5 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className={`p-1 rounded-full ${isDark ? 'bg-slate-800 shadow-sm' : ''}`}>
            <Moon className={`h-3.5 w-3.5 ${isDark ? 'text-blue-400' : 'text-slate-400'}`} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 shadow-sm"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-20 left-0 w-full max-h-[calc(100vh-5rem)] overflow-y-auto bg-slate-950/95 text-slate-100 border-b border-slate-800 p-6 flex flex-col gap-5 shadow-2xl backdrop-blur-2xl lg:hidden z-[1000] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Navigation</div>
            
            {/* Agent List Selector */}
            <div className="w-full">
              <AgentListDropdown />
            </div>

            {/* Pricing link */}
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-xs"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Pricing Plans</span>
            </Link>

            {/* Solution Workspace */}
            {user?.role === 'ADMIN' ? (
              <Link
                href="/portfolio-management"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-950/50 border border-indigo-900 text-indigo-300 font-bold text-xs"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>Solution Workspace</span>
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-500 font-bold text-xs opacity-60">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Solution Workspace (Admin Only)</span>
              </div>
            )}

            {/* Admin Panel */}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-violet-950/50 border border-violet-900 text-violet-300 font-bold text-xs"
              >
                <Shield className="w-4 h-4 text-violet-400" />
                <span>Admin Dashboard</span>
              </Link>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
            {user ? (
              <div className="flex items-center justify-between bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{user.username}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black">{user.role} ROLE</div>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold text-xs tracking-wider uppercase text-center shadow-lg shadow-indigo-600/20"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
