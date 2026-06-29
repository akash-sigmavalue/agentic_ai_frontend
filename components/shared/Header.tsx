"use client";

import React from 'react';
import Link from 'next/link';
import { Cpu, LayoutDashboard, Sun, Moon, LogOut, User as UserIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import AgentListDropdown from './AgentListDropdown';

const Header = () => {
  const [isDark, setIsDark] = React.useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  React.useEffect(() => {
    const theme = localStorage.getItem('sigmavalue_theme') === 'dark';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(theme);
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    localStorage.setItem('sigmavalue_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const shellClass = isDark
    ? 'bg-slate-950/85 border-slate-800/70'
    : 'bg-[#f8fafc]/80 border-slate-200/60';
  const titleClass = isDark ? 'text-slate-50' : 'text-[#1a1c3d]';
  const subtitleClass = isDark ? 'text-slate-400' : 'text-slate-400';
  const pillClass = isDark
    ? 'bg-slate-900 border-slate-700 shadow-[0_10px_25px_rgba(0,0,0,0.25)] hover:bg-slate-800'
    : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50';
  const pillTextClass = isDark ? 'text-slate-200' : 'text-slate-700';
  const borderTextClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const toggleClass = isDark
    ? 'bg-slate-900 border-slate-700'
    : 'bg-slate-100 border-slate-200';

  return (
    <header className={`site-header fixed top-0 left-0 z-[1001] flex h-20 w-full items-center justify-between px-10 backdrop-blur-md border-b ${shellClass}`}>
      <Link href="/" className="flex items-center gap-4 cursor-pointer">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#525ceb] shadow-lg shadow-indigo-200">
          <Cpu className="h-7 w-7 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className={`text-xl font-black tracking-tight leading-none mb-1 ${titleClass}`}>Sigmavalue AI Pilot</h1>
          <span className={`text-[10px] font-black tracking-[0.25em] uppercase ${subtitleClass}`}>INTELLIGENT WORKSPACE</span>
        </div>
      </Link>

      <div className="flex items-center gap-8">
        <div className="hidden lg:flex items-center gap-3">
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
          <AgentListDropdown />
        </div>

        <div className={`flex items-center gap-6 pl-8 ${borderTextClass} border-l`}>
          {user && (
            <div className="flex items-center gap-3 mr-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30">
                <UserIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {user.username}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center justify-center p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-rose-500 hover:border-rose-100 dark:hover:border-rose-950 transition-all cursor-pointer shadow-sm hover:shadow-rose-50 dark:hover:shadow-none"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 p-1 rounded-full border transition-all hover:shadow-inner ${toggleClass}`}
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
    </header>
  );
};

export default Header;
