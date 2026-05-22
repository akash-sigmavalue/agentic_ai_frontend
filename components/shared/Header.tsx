"use client";

import React from 'react';
import Link from 'next/link';
import { Network, Map, Cpu, LayoutDashboard, Sun, Moon, SlidersHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';
import AgentListDropdown from './AgentListDropdown';

const Header = () => {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sigmavalue_theme') === 'dark';
  });
  const pathname = usePathname();

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDark);
    localStorage.setItem('sigmavalue_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const shellClass = isDark
    ? 'bg-slate-950/85 border-slate-800/70'
    : 'bg-[#f8fafc]/80 border-slate-200/60';
  const titleClass = isDark ? 'text-slate-50' : 'text-[#1a1c3d]';
  const subtitleClass = isDark ? 'text-slate-400' : 'text-slate-400';
  const pillClass = isDark
    ? 'bg-slate-900 border-slate-700 shadow-[0_10px_25px_rgba(0,0,0,0.25)] hover:bg-slate-800'
    : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50';
  const pillTextClass = isDark ? 'text-slate-200' : 'text-slate-600';
  const borderTextClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const toggleClass = isDark
    ? 'bg-slate-900 border-slate-700'
    : 'bg-slate-100 border-slate-200';

  return (
    <header className={`fixed top-0 left-0 z-[1001] flex h-20 w-full items-center justify-between px-10 backdrop-blur-md border-b ${shellClass}`}>
      {/* Brand Section */}
      <Link href="/" className="flex items-center gap-4 cursor-pointer">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#525ceb] shadow-lg shadow-indigo-200">
          <Cpu className="h-7 w-7 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className={`text-xl font-black tracking-tight leading-none mb-1 ${titleClass}`}>Sigmavalue AI Pilot</h1>
          <span className={`text-[10px] font-black tracking-[0.25em] uppercase ${subtitleClass}`}>INTELLIGENT WORKSPACE</span>
        </div>
      </Link>

      {/* Navigation & User Section */}
      <div className="flex items-center gap-8">
        {/* Navigation Pills */}
        <div className="hidden lg:flex items-center gap-3">
          {/* <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${pillClass}`}>
            <SlidersHorizontal className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            <span className={`text-[10px] font-black uppercase tracking-widest ${pillTextClass}`}>GPT-4O MINI</span>
          </div> */}
          {/* <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${pillClass}`}>
            <Network className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            <span className={`text-[10px] font-black uppercase tracking-widest ${pillTextClass}`}>WORKFLOW</span>
          </div> */}
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
          {/* <div 
            onClick={handleLogout}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer group ${isDark ? 'bg-slate-900/80 border-slate-700 hover:bg-slate-800' : 'bg-[#cbd5e1]/40 border-slate-300 hover:bg-slate-200'}`}
          >
            <Map className="h-4 w-4 text-[#525ceb] group-hover:scale-110 transition-transform" />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>MAP</span>
          </div> */}
        </div>

        {/* User Controls */}
        <div className={`flex items-center gap-6 pl-8 ${borderTextClass} border-l`}>
          {/* Theme Toggle Button */}
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

          <div className="flex items-center gap-4">
            {/* <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 font-bold text-slate-500 text-sm shadow-sm transition-transform hover:scale-105">
              R
            </div> */}
            {/* <div className="flex flex-col">
                <span className="text-[11px] font-black text-[#1a1c3d] tracking-widest uppercase">RAVILESH</span>
                <button 
                  onClick={handleLogout}
                  className="text-[9px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-[0.2em] text-left transition-colors"
                >
                  LOGOUT
                </button>
             </div> */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
