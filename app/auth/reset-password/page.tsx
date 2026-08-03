"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Cpu, ArrowLeft } from 'lucide-react';
import { apiRequest, API_ROUTES } from '@/lib/api-client';
import { useTheme } from '@/hooks/use-theme';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  useTheme();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!token) {
    return (
      <div className="rp-card" style={{ textAlign: 'center', padding: '40px 36px' }}>
        <AlertCircle style={{ width: 40, height: 40, color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Invalid Link</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
          This password reset link is missing a token. Please request a new one.
        </p>
        <button className="rp-btn-primary" onClick={() => router.push('/auth')}>
          Back to Sign In
        </button>
      </div>
    );
  }

  const passwordStrength = (pw: string) => {
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
  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await apiRequest(API_ROUTES.authResetPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Reset failed. The link may have expired.');
      }
      setDone(true);
      setTimeout(() => router.push('/auth'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .rp-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(135deg, #f0f4ff 0%, #fafbff 50%, #f5f0ff 100%);
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .rp-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(#4f46e5 1.2px, transparent 1.2px);
          background-size: 36px 36px;
          opacity: 0.045;
          pointer-events: none;
        }
        .rp-blob {
          position: absolute;
          top: -140px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, #c7d2fe 0%, transparent 70%);
          opacity: 0.4;
          pointer-events: none;
        }
        .rp-wrap {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          opacity: 0;
          transform: translateY(16px) scale(0.97);
          transition: opacity .5s ease, transform .5s ease;
        }
        .rp-wrap.mounted { opacity: 1; transform: translateY(0) scale(1); }
        .rp-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
        }
        .rp-brand-icon {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 40px rgba(79,70,229,.3);
          margin-bottom: 14px;
        }
        .rp-brand-title { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -.5px; }
        .rp-brand-sub { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: .4em; margin-top: 6px; }
        .rp-card {
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          border: 1px solid rgba(226,232,240,.8);
          box-shadow: 0 32px 64px rgba(15,23,42,.08), 0 4px 16px rgba(79,70,229,.06);
          overflow: hidden;
        }
        .rp-card-header { padding: 28px 36px 0; }
        .rp-card-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -.3px; }
        .rp-card-subtitle { font-size: 12px; color: #64748b; margin: 0; }
        .rp-card-body { padding: 24px 36px 32px; }
        .rp-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .rp-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: .2em; margin-left: 2px; }
        .rp-input-wrap { position: relative; display: flex; align-items: center; }
        .rp-icon { position: absolute; left: 14px; color: #cbd5e1; pointer-events: none; display: flex; transition: color .2s; }
        .rp-input-wrap:focus-within .rp-icon { color: #4f46e5; }
        .rp-input {
          width: 100%;
          padding: 13px 44px 13px 42px;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          font-size: 13.5px;
          font-weight: 500;
          color: #0f172a;
          outline: none;
          transition: all .2s;
          box-sizing: border-box;
        }
        .rp-input::placeholder { color: #cbd5e1; }
        .rp-input:focus { background: #fff; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.10); }
        .rp-toggle { position: absolute; right: 12px; background: none; border: none; color: #cbd5e1; cursor: pointer; display: flex; transition: color .2s; }
        .rp-toggle:hover { color: #4f46e5; }
        .rp-strength { padding: 6px 2px 0; }
        .rp-strength-bars { display: flex; gap: 4px; margin-bottom: 4px; }
        .rp-strength-bar { height: 3px; flex: 1; border-radius: 99px; transition: background-color .3s; }
        .rp-strength-label { font-size: 10px; font-weight: 700; }
        .rp-alert {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 16px; border-radius: 14px; margin-bottom: 16px;
          background: #fff1f2; border: 1px solid #fecdd3; color: #be123c;
          animation: rpSlideIn .25s ease;
        }
        @keyframes rpSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .rp-alert-icon { flex-shrink: 0; margin-top: 1px; }
        .rp-alert-msg { font-size: 12px; font-weight: 600; margin: 0; }
        .rp-btn-primary {
          width: 100%;
          margin-top: 6px;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .2em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all .2s;
          box-shadow: 0 8px 20px rgba(79,70,229,.28);
        }
        .rp-btn-primary:hover { box-shadow: 0 12px 28px rgba(79,70,229,.40); transform: translateY(-1px); }
        .rp-btn-primary:disabled { opacity: .55; cursor: not-allowed; transform: none; box-shadow: none; }
        .rp-back-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; color: #64748b; font-size: 12px;
          font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 20px; transition: color .15s;
        }
        .rp-back-btn:hover { color: #4f46e5; }
        .rp-success-wrap { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8px 0 4px; gap: 12px; }
        .rp-success-icon { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg,#dcfce7,#bbf7d0); display: flex; align-items: center; justify-content: center; }
        .rp-footer { margin-top: 24px; text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: .3em; }

        /* ── Dark Mode Overrides ── */
        html.dark-mode .rp-page, html[data-theme="dark"] .rp-page {
          background: linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%);
          color: #f8fafc;
        }
        html.dark-mode .rp-page::before, html[data-theme="dark"] .rp-page::before {
          background-image: radial-gradient(#818cf8 1.2px, transparent 1.2px);
          opacity: 0.08;
        }
        html.dark-mode .rp-blob, html[data-theme="dark"] .rp-blob {
          background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
          opacity: 0.5;
        }
        html.dark-mode .rp-brand-title, html[data-theme="dark"] .rp-brand-title {
          color: #f8fafc;
        }
        html.dark-mode .rp-brand-sub, html[data-theme="dark"] .rp-brand-sub {
          color: #64748b;
        }
        html.dark-mode .rp-card, html[data-theme="dark"] .rp-card {
          background: rgba(15, 23, 42, 0.88);
          border-color: rgba(51, 65, 85, 0.8);
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(79, 70, 229, 0.2);
        }
        html.dark-mode .rp-card-title, html[data-theme="dark"] .rp-card-title {
          color: #f8fafc;
        }
        html.dark-mode .rp-card-subtitle, html[data-theme="dark"] .rp-card-subtitle {
          color: #94a3b8;
        }
        html.dark-mode .rp-label, html[data-theme="dark"] .rp-label {
          color: #94a3b8;
        }
        html.dark-mode .rp-icon, html[data-theme="dark"] .rp-icon {
          color: #64748b;
        }
        html.dark-mode .rp-input-wrap:focus-within .rp-icon, html[data-theme="dark"] .rp-input-wrap:focus-within .rp-icon {
          color: #818cf8;
        }
        html.dark-mode .rp-input, html[data-theme="dark"] .rp-input {
          border-color: #334155;
          background: #0f172a;
          color: #f8fafc;
        }
        html.dark-mode .rp-input::placeholder, html[data-theme="dark"] .rp-input::placeholder {
          color: #475569;
        }
        html.dark-mode .rp-input:focus, html[data-theme="dark"] .rp-input:focus {
          background: #1e293b;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
        }
        html.dark-mode .rp-toggle, html[data-theme="dark"] .rp-toggle {
          color: #64748b;
        }
        html.dark-mode .rp-toggle:hover, html[data-theme="dark"] .rp-toggle:hover {
          color: #818cf8;
        }
        html.dark-mode .rp-alert, html[data-theme="dark"] .rp-alert {
          background: rgba(225, 29, 72, 0.15);
          border-color: rgba(225, 29, 72, 0.35);
          color: #fda4af;
        }
        html.dark-mode .rp-back-btn, html[data-theme="dark"] .rp-back-btn {
          color: #94a3b8;
        }
        html.dark-mode .rp-back-btn:hover, html[data-theme="dark"] .rp-back-btn:hover {
          color: #818cf8;
        }
        html.dark-mode .rp-success-icon, html[data-theme="dark"] .rp-success-icon {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3));
        }
        html.dark-mode .rp-footer, html[data-theme="dark"] .rp-footer {
          color: #475569;
        }
      `}</style>

      <div className="rp-page">
        <div className="rp-blob" />
        <div className={`rp-wrap ${mounted ? 'mounted' : ''}`}>
          <div className="rp-brand">
            <div className="rp-brand-icon">
              <Cpu style={{ width: 32, height: 32, color: '#fff' }} />
            </div>
            <h1 className="rp-brand-title">SigmaValue AI Pilot</h1>
            <p className="rp-brand-sub">Intelligent Secure Access</p>
          </div>

          <div className="rp-card">
            {done ? (
              <div className="rp-card-body">
                <div className="rp-success-wrap">
                  <div className="rp-success-icon">
                    <CheckCircle2 style={{ width: 30, height: 30, color: '#16a34a' }} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Password Updated!</h2>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                    Your password has been reset successfully.
                    <br />Redirecting you to Sign In…
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="rp-card-header">
                  <h2 className="rp-card-title">Set new password</h2>
                  <p className="rp-card-subtitle">Choose a strong password for your account</p>
                </div>
                <div className="rp-card-body">
                  <button type="button" className="rp-back-btn" onClick={() => router.push('/auth')}>
                    <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Sign In
                  </button>

                  {error && (
                    <div className="rp-alert">
                      <span className="rp-alert-icon"><AlertCircle style={{ width: 16, height: 16 }} /></span>
                      <p className="rp-alert-msg">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
                    {/* New password */}
                    <div className="rp-field">
                      <label htmlFor="rp-password" className="rp-label">New Password</label>
                      <div className="rp-input-wrap">
                        <span className="rp-icon"><Lock style={{ width: 17, height: 17 }} /></span>
                        <input
                          id="rp-password"
                          type={showPw ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          autoComplete="new-password"
                          className="rp-input"
                        />
                        <button type="button" className="rp-toggle" onClick={() => setShowPw(!showPw)}>
                          {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                        </button>
                      </div>
                      {password && (
                        <div className="rp-strength">
                          <div className="rp-strength-bars">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="rp-strength-bar"
                                style={{ backgroundColor: i <= strength.score ? strength.color : '#e2e8f0' }} />
                            ))}
                          </div>
                          <span className="rp-strength-label" style={{ color: strength.color }}>{strength.label}</span>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div className="rp-field" style={{ marginBottom: 0 }}>
                      <label htmlFor="rp-confirm" className="rp-label">Confirm Password</label>
                      <div className="rp-input-wrap">
                        <span className="rp-icon"><Lock style={{ width: 17, height: 17 }} /></span>
                        <input
                          id="rp-confirm"
                          type={showConfirm ? 'text' : 'password'}
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                          className="rp-input"
                          style={{
                            borderColor: confirm && confirm !== password ? '#fca5a5' : undefined,
                          }}
                        />
                        <button type="button" className="rp-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                          {showConfirm ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="rp-submit"
                      type="submit"
                      disabled={loading}
                      className="rp-btn-primary"
                    >
                      {loading
                        ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                        : 'Reset Password'
                      }
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>

          <p className="rp-footer">Powered by Sigmavalue AI Neural Core v1.0</p>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
