"use client";

import React, { useState, useEffect } from 'react';
import {
  EyeOff, Eye, Loader2, Cpu, Lock, Mail, User, AtSign, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

type Tab = 'login' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const { login, register, user } = useAuth();

  const [tab, setTab] = useState<Tab>('login');
  const [mounted, setMounted] = useState(false);

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // If already authenticated redirect to home
  useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  const clearMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    clearMessages();
  };

  // ── Password strength indicator ────────────────────────────────────────────
  const passwordStrength = (pw: string): { score: number; label: string; color: string } => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
    if (score <= 2) return { score, label: 'Fair', color: '#f97316' };
    if (score <= 3) return { score, label: 'Good', color: '#eab308' };
    return { score, label: 'Strong', color: '#22c55e' };
  };

  const strength = passwordStrength(regPassword);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await login(loginIdentifier.trim(), loginPassword);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!regUsername.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (regUsername.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await register(regUsername.trim(), regEmail.trim(), regPassword);
      setSuccessMsg('Account created! Redirecting…');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      if (msg.toLowerCase().includes('email')) {
        setError('EMAIL_CONFLICT:' + msg);
      } else if (msg.toLowerCase().includes('username') || msg.toLowerCase().includes('taken')) {
        setError('USERNAME_CONFLICT:' + msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="auth-page relative min-h-screen w-full bg-[#f8fafc] overflow-hidden flex items-center justify-center p-6 pt-20">

      {/* Background dot grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(#4f46e5 1.2px, transparent 1.2px)', backgroundSize: '36px 36px' }}
      />
      {/* Background line grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '160px 160px' }}
      />
      {/* Soft glow blobs */}
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-100 blur-[120px] opacity-40 pointer-events-none z-0" />

      <div
        className={`relative z-10 w-full max-w-[460px] transition-all duration-700 transform ${
          mounted ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}
      >
        {/* ── Logo / Brand ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-indigo-600 shadow-2xl shadow-indigo-200 mb-4">
            <Cpu className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">SigmaValue AI Pilot</h1>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.4em] mt-2">
            Intelligent Secure Access
          </p>
        </div>

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/70 shadow-2xl shadow-slate-200/60 overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-slate-100">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                id={`auth-tab-${t}`}
                type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-200 ${
                  tab === t
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="p-10">

            {/* ── Error / Success banners ──────────────────────────────────── */}
            {error && (() => {
              const isEmailConflict = error.startsWith('EMAIL_CONFLICT:');
              const isUsernameConflict = error.startsWith('USERNAME_CONFLICT:');
              const isConflict = isEmailConflict || isUsernameConflict;
              const cleanMsg = error.replace(/^(EMAIL_CONFLICT|USERNAME_CONFLICT):/, '');
              return (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-rose-600">{cleanMsg}</p>
                      {isConflict && (
                        <button
                          type="button"
                          onClick={() => switchTab('login')}
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-2 transition-colors"
                        >
                          → Switch to Sign In
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold rounded-2xl flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}


            {/* ════════════════════════════════════════════════════════════════
                LOGIN TAB
            ════════════════════════════════════════════════════════════════ */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5" noValidate>

                {/* Username / Email field */}
                <div className="space-y-1.5">
                  <label htmlFor="login-identifier" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Username or Email
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                      <AtSign className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="login-identifier"
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="your username or email@example.com"
                      required
                      autoComplete="username"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/8 outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/8 outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      id="login-toggle-password"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                </button>

                {/* Switch hint */}
                <p className="text-center text-[11px] text-slate-400 pt-2">
                  New here?{' '}
                  <button
                    type="button"
                    id="switch-to-register"
                    onClick={() => switchTab('register')}
                    className="text-indigo-600 font-bold hover:underline underline-offset-2 transition-colors"
                  >
                    Create an account
                  </button>
                </p>
              </form>
            )}

            {/* ════════════════════════════════════════════════════════════════
                REGISTER TAB
            ════════════════════════════════════════════════════════════════ */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4" noValidate>

                {/* Username */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-username" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Username
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="reg-username"
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="johndoe"
                      required
                      autoComplete="username"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/8 outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-email" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/8 outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-password" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      autoComplete="new-password"
                      className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/8 outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      id="reg-toggle-password"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {regPassword && (
                    <div className="px-1 pt-1 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor: i <= strength.score
                                ? strength.color
                                : '#e2e8f0',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] font-bold" style={{ color: strength.color }}>
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-confirm" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="reg-confirm"
                      type={showRegConfirm ? 'text' : 'password'}
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      autoComplete="new-password"
                      className={`w-full pl-12 pr-12 py-3.5 rounded-2xl border bg-slate-50/50 focus:bg-white focus:ring-4 outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300 ${
                        regConfirm && regConfirm !== regPassword
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/8'
                      }`}
                    />
                    <button
                      type="button"
                      id="reg-toggle-confirm"
                      onClick={() => setShowRegConfirm(!showRegConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
                      aria-label={showRegConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showRegConfirm ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                    {/* Match indicator */}
                    {regConfirm && regPassword && (
                      <div className="absolute right-11 top-1/2 -translate-y-1/2">
                        {regConfirm === regPassword
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <AlertCircle className="h-4 w-4 text-rose-400" />
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="register-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                </button>

                {/* Switch hint */}
                <p className="text-center text-[11px] text-slate-400 pt-2">
                  Already have an account?{' '}
                  <button
                    type="button"
                    id="switch-to-login"
                    onClick={() => switchTab('login')}
                    className="text-indigo-600 font-bold hover:underline underline-offset-2 transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.35em]">
          Powered by Sigmavalue AI Neural Core v1.0
        </p>
      </div>
    </div>
  );
}
