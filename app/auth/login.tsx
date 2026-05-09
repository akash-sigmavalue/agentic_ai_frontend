"use client";

import React, { useState, useEffect } from 'react';
import { EyeOff, Eye, Loader2, Bot, Sparkles, Lock, Cpu, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { API_ROUTES, apiUrl } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(apiUrl(API_ROUTES.authLogin), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed. Please check your credentials.');
      }

      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection to Neural Core failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page relative min-h-screen w-full bg-[#f8fafc] overflow-hidden flex items-center justify-center p-6 pt-28 text-slate-900">
      {/* Background Grid - Matching Image */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.08]" 
           style={{ backgroundImage: 'radial-gradient(#000 1.2px, transparent 1.2px)', backgroundSize: '40px 40px' }} />

      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]" 
           style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '160px 160px' }} />

      <div 
        className={`relative z-10 w-full max-w-[440px] transition-all duration-1000 transform ${
          mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-10 translate-y-[-10px]">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-indigo-600 shadow-2xl shadow-indigo-200 mb-5 animate-in zoom-in-50 duration-700">
            <Cpu className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 text-center">SigmaValue AI Pilot</h1>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.4em] mt-2.5">INTELLIGENT SECURE ACCESS</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[3rem] border border-slate-200/60 p-12 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-50/50 rounded-full blur-3xl translate-x-1/2 translate-y-[-1/2]" />
          
          <div className="mb-10 relative z-10">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Authentication</h2>
            <p className="text-sm font-medium text-slate-400 mt-2">Please enter your credentials to proceed.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold rounded-2xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                <Sparkles className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Secure Identity</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                  <Bot className="h-5 w-5" />
                </div>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ravilesh"
                  required
                  className="w-full pl-14 pr-5 py-4.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all text-sm font-semibold placeholder:text-slate-300 shadow-inner-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access Key</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-14 pr-14 py-4.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all text-sm font-semibold placeholder:text-slate-300 shadow-inner-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                >
                   {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 mb-2">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" className="w-4.5 h-4.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all shadow-sm" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Remember Node</span>
              </label>
              <button type="button" className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest transition-colors hover:underline underline-offset-4">Reset Key?</button>
            </div>

            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-indigo-600 text-white py-5 rounded-[1.25rem] font-black transition-all shadow-xl shadow-indigo-200 hover:bg-slate-900 hover:shadow-slate-300 active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                <div className="relative flex items-center justify-center gap-3">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="uppercase tracking-[0.25em] text-[11px]">Verify & Initiate</span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('admin');
                }}
                className="w-full py-4 rounded-[1.25rem] border border-slate-200 bg-slate-50/30 text-[11px] font-extrabold text-slate-500 uppercase tracking-[0.25em] hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm"
              >
                Quick Demo Access
              </button>
            </div>
          </form>

          <div className="mt-10 flex flex-col items-center">
            <div className="flex items-center w-full gap-5 mb-8">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">External Gateways</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            
            <div className="flex justify-center gap-5">
              {['G', 'O', 'M'].map((letter) => (
                <button 
                  key={letter} 
                  className="h-12 w-12 flex items-center justify-center rounded-2xl border border-slate-200 bg-white hover:border-indigo-600 hover:bg-slate-50 transition-all font-black text-sm text-slate-900 shadow-sm hover:shadow-indigo-100"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] animate-pulse">
          Powered by Sigmavalue AI Neural Core v1.0
        </p>

        <div className="mt-12 flex justify-center opacity-10">
           <Globe className="h-6 w-6 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
