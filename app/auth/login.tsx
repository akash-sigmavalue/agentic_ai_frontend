"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  EyeOff, Eye, Loader2, Cpu, Lock, Mail, User, AtSign,
  CheckCircle2, AlertCircle, ArrowLeft, Send, ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { apiUrl, API_ROUTES } from '@/lib/api-client';

// ── Types ──────────────────────────────────────────────────────────────────────
type View = 'login' | 'register' | 'forgot-password' | 'email-sent' | 'register-success';

// ── Email validation ───────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const isValidEmail = (email: string) => EMAIL_REGEX.test(email.trim());

// ── Google SVG Logo ────────────────────────────────────────────────────────────
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

// ── Password strength ──────────────────────────────────────────────────────────
function passwordStrength(pw: string): { score: number; label: string; color: string } {
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
}

// ── Shared input wrapper ───────────────────────────────────────────────────────
function InputField({
  id, label, icon, type = 'text', value, onChange, placeholder,
  autoComplete, rightEl, extraClass = '', error = false,
}: {
  id: string; label: string; icon: React.ReactNode; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
  autoComplete?: string; rightEl?: React.ReactNode; extraClass?: string;
  error?: boolean;
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-input-wrap group">
        <span className="auth-icon">{icon}</span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`auth-input ${error ? 'auth-input--error' : ''} ${extraClass}`}
        />
        {rightEl && <span className="auth-input-right">{rightEl}</span>}
      </div>
    </div>
  );
}

// ── Google OAuth button ────────────────────────────────────────────────────────
function GoogleButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const handleGoogleLogin = () => {
    window.location.href = apiUrl(API_ROUTES.authGoogleLogin);
  };
  return (
    <button
      type="button"
      id="google-oauth-btn"
      onClick={handleGoogleLogin}
      disabled={disabled}
      className="auth-google-btn"
    >
      <GoogleLogo />
      <span>{label}</span>
    </button>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="auth-divider">
      <span className="auth-divider-line" />
      <span className="auth-divider-text">or</span>
      <span className="auth-divider-line" />
    </div>
  );
}

// ── Alert banner ───────────────────────────────────────────────────────────────
function AlertBanner({
  type, message, onSwitchToLogin, onResendVerification,
}: {
  type: 'error' | 'success';
  message: string;
  onSwitchToLogin?: () => void;
  onResendVerification?: () => void;
}) {
  const isError = type === 'error';
  const isConflict = message.startsWith('EMAIL_CONFLICT:') || message.startsWith('USERNAME_CONFLICT:');
  const isUnverified = message.startsWith('EMAIL_NOT_VERIFIED:');
  const clean = message.replace(/^(EMAIL_CONFLICT|USERNAME_CONFLICT|EMAIL_NOT_VERIFIED):/, '');
  return (
    <div className={`auth-alert ${isError ? 'auth-alert--error' : 'auth-alert--success'}`}>
      <span className="auth-alert-icon">
        {isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      </span>
      <div className="flex-1">
        <p className="auth-alert-msg">{clean}</p>
        {isError && isConflict && onSwitchToLogin && (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="auth-alert-action"
          >
            → Switch to Sign In
          </button>
        )}
        {isError && isUnverified && onResendVerification && (
          <button
            type="button"
            onClick={onResendVerification}
            className="auth-alert-action"
            style={{ display: 'block', marginTop: '6px', color: '#4f46e5', fontWeight: 800 }}
          >
            ✉️ Resend Verification Link
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function AuthPage() {
  const router = useRouter();
  const { login, register, forgotPassword, user } = useAuth();

  const [view, setView] = useState<View>('login');
  const [mounted, setMounted] = useState(false);

  // ── Login state ──────────────────────────────────────────────────────────
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // ── Register state ───────────────────────────────────────────────────────
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmailTouched, setRegEmailTouched] = useState(false);
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // ── Forgot password state ────────────────────────────────────────────────
  const [fpEmail, setFpEmail] = useState('');
  const [fpEmailTouched, setFpEmailTouched] = useState(false);

  // ── Shared ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (user) router.push('/'); }, [user, router]);

  const clearMessages = useCallback(() => { setError(''); setSuccessMsg(''); }, []);

  const switchView = (v: View) => {
    setView(v);
    clearMessages();
    setFpEmail('');
    setFpEmailTouched(false);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const strength = passwordStrength(regPassword);
  const regEmailValid = isValidEmail(regEmail);
  const fpEmailValid = isValidEmail(fpEmail);

  // ── Handlers ─────────────────────────────────────────────────────────────
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

  const handleResendVerification = async (emailToUse?: string) => {
    const targetEmail = emailToUse || (loginIdentifier.includes('@') ? loginIdentifier.trim() : regEmail.trim());
    if (!targetEmail || !isValidEmail(targetEmail)) {
      setError('Please enter a valid email address to resend verification.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(API_ROUTES.authResendVerification), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Could not resend email.');
      setSuccessMsg(data.message || 'Verification link sent! Please check your inbox.');
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Resend failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setRegEmailTouched(true);

    if (!regUsername.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (regUsername.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!regEmailValid) {
      setError('Please enter a valid email address.');
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
      switchView('register-success');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setFpEmailTouched(true);
    if (!fpEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(fpEmail.trim());
      switchView('email-sent');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Scoped styles ─────────────────────────────────────────────────── */}
      <style>{`
        /* ── Page ── */
        .auth-page {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #f0f4ff 0%, #fafbff 50%, #f5f0ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        }
        /* dot-grid */
        .auth-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(#4f46e5 1.2px, transparent 1.2px);
          background-size: 36px 36px;
          opacity: 0.045;
          pointer-events: none;
        }
        /* glow blobs */
        .auth-blob-top {
          position: absolute;
          top: -140px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, #c7d2fe 0%, transparent 70%);
          opacity: 0.45;
          pointer-events: none;
          z-index: 0;
        }
        .auth-blob-bottom {
          position: absolute;
          bottom: -120px;
          right: -80px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, #ddd6fe 0%, transparent 70%);
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }

        /* ── Card wrapper ── */
        .auth-card-wrap {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 460px;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .auth-card-wrap.mounted {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .auth-card-wrap:not(.mounted) {
          opacity: 0;
          transform: translateY(16px) scale(0.97);
        }

        /* ── Brand ── */
        .auth-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
        }
        .auth-brand-icon {
          height: 64px;
          width: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          box-shadow: 0 20px 40px rgba(79, 70, 229, 0.30);
          margin-bottom: 14px;
          position: relative;
          overflow: hidden;
        }
        .auth-brand-icon::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
        }
        .auth-brand-title {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #0f172a;
          margin: 0;
        }
        .auth-brand-sub {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          margin-top: 6px;
        }

        /* ── Card ── */
        .auth-card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 32px 64px rgba(15, 23, 42, 0.08), 0 4px 16px rgba(79, 70, 229, 0.06);
          overflow: hidden;
        }
        .auth-card-header {
          padding: 28px 36px 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .auth-card-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .auth-card-subtitle {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }
        .auth-card-body {
          padding: 24px 36px 32px;
        }

        /* ── Form fields ── */
        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }
        .auth-field:last-of-type { margin-bottom: 0; }
        .auth-label {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-left: 2px;
        }
        .auth-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .auth-icon {
          position: absolute;
          left: 14px;
          display: flex;
          align-items: center;
          color: #cbd5e1;
          transition: color 0.2s;
          pointer-events: none;
          z-index: 1;
        }
        .auth-input-wrap:focus-within .auth-icon { color: #4f46e5; }
        .auth-input {
          width: 100%;
          padding: 13px 14px 13px 42px;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          font-size: 13.5px;
          font-weight: 500;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .auth-input::placeholder { color: #cbd5e1; }
        .auth-input:focus {
          background: #fff;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.10);
        }
        .auth-input--error {
          border-color: #fca5a5 !important;
          background: #fff5f5;
        }
        .auth-input--error:focus {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.10) !important;
        }
        .auth-input-right {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .auth-pw-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          color: #cbd5e1;
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }
        .auth-pw-toggle:hover { color: #4f46e5; }

        /* email validation indicator */
        .auth-email-indicator {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Strength bar ── */
        .auth-strength {
          padding: 6px 2px 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .auth-strength-bars {
          display: flex;
          gap: 4px;
        }
        .auth-strength-bar {
          height: 3px;
          flex: 1;
          border-radius: 99px;
          transition: background-color 0.3s;
        }
        .auth-strength-label {
          font-size: 10px;
          font-weight: 700;
        }

        /* ── Google button ── */
        .auth-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .auth-google-btn:hover {
          border-color: #c7d2fe;
          background: #f8faff;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.10);
          transform: translateY(-1px);
        }
        .auth-google-btn:active { transform: translateY(0); }
        .auth-google-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* ── Divider ── */
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0;
        }
        .auth-divider-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }
        .auth-divider-text {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        /* ── Primary button ── */
        .auth-btn-primary {
          width: 100%;
          margin-top: 6px;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: #fff;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.28);
        }
        .auth-btn-primary:hover {
          box-shadow: 0 12px 28px rgba(79, 70, 229, 0.40);
          transform: translateY(-1px);
        }
        .auth-btn-primary:active { transform: translateY(0); }
        .auth-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }

        /* ── Secondary link ── */
        .auth-switch-hint {
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          margin-top: 18px;
        }
        .auth-switch-btn {
          background: none;
          border: none;
          color: #4f46e5;
          font-weight: 700;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
          transition: color 0.15s;
        }
        .auth-switch-btn:hover { color: #4338ca; text-decoration: underline; }

        /* ── Forgot password link ── */
        .auth-forgot-link {
          display: block;
          text-align: right;
          font-size: 11.5px;
          font-weight: 600;
          color: #4f46e5;
          cursor: pointer;
          background: none;
          border: none;
          margin-top: -6px;
          margin-bottom: 4px;
          transition: color 0.15s;
          padding: 0;
        }
        .auth-forgot-link:hover { color: #4338ca; text-decoration: underline; }

        /* ── Back button ── */
        .auth-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          margin-bottom: 20px;
          transition: color 0.15s;
        }
        .auth-back-btn:hover { color: #4f46e5; }

        /* ── Alert ── */
        .auth-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 14px;
          margin-bottom: 16px;
          animation: authSlideIn 0.25s ease;
        }
        @keyframes authSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-alert--error {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
        }
        .auth-alert--success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }
        .auth-alert-icon { flex-shrink: 0; margin-top: 1px; }
        .auth-alert-msg { font-size: 12px; font-weight: 600; margin: 0; }
        .auth-alert-action {
          display: inline-flex;
          align-items: center;
          margin-top: 6px;
          font-size: 11px;
          font-weight: 800;
          color: #4f46e5;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .auth-alert-action:hover { text-decoration: underline; }

        /* ── Success / info state card ── */
        .auth-success-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 8px 0 4px;
          gap: 12px;
        }
        .auth-success-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-success-icon--violet { background: linear-gradient(135deg, #ede9fe, #ddd6fe); }
        .auth-success-icon--green { background: linear-gradient(135deg, #dcfce7, #bbf7d0); }
        .auth-success-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .auth-success-desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
          margin: 0;
        }
        .auth-success-em { font-weight: 700; color: #4f46e5; }

        /* ── Footer ── */
        .auth-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.3em;
        }

        /* form-level spacing */
        .auth-form-space { display: flex; flex-direction: column; gap: 0; }
      `}</style>

      <div className="auth-page">
        <div className="auth-blob-top" />
        <div className="auth-blob-bottom" />

        <div className={`auth-card-wrap ${mounted ? 'mounted' : ''}`}>

          {/* ── Brand ─────────────────────────────────────────────────────── */}
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Cpu style={{ width: 32, height: 32, color: '#fff', position: 'relative', zIndex: 1 }} />
            </div>
            <h1 className="auth-brand-title">SigmaValue AI Pilot</h1>
            <p className="auth-brand-sub">Intelligent Secure Access</p>
          </div>

          {/* ── Card ──────────────────────────────────────────────────────── */}
          <div className="auth-card">

            {/* ══════════════════════════════════════
                LOGIN VIEW
            ══════════════════════════════════════ */}
            {view === 'login' && (
              <>
                <div className="auth-card-header">
                  <h2 className="auth-card-title">Welcome back</h2>
                  <p className="auth-card-subtitle">Sign in to your account to continue</p>
                </div>
                <div className="auth-card-body">
                  {error && (
                    <AlertBanner
                      type="error"
                      message={error}
                      onSwitchToLogin={() => switchView('login')}
                      onResendVerification={() => handleResendVerification()}
                    />
                  )}

                  <GoogleButton label="Continue with Google" disabled={loading} />
                  <OrDivider />

                  <form onSubmit={handleLogin} noValidate>
                    <div className="auth-form-space">
                      <InputField
                        id="login-identifier"
                        label="Username or Email"
                        icon={<AtSign style={{ width: 17, height: 17 }} />}
                        value={loginIdentifier}
                        onChange={setLoginIdentifier}
                        placeholder="username or email@example.com"
                        autoComplete="username"
                      />
                      <div className="auth-field">
                        <label htmlFor="login-password" className="auth-label">Password</label>
                        <div className="auth-input-wrap">
                          <span className="auth-icon"><Lock style={{ width: 17, height: 17 }} /></span>
                          <input
                            id="login-password"
                            type={showLoginPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="auth-input"
                            style={{ paddingRight: '42px' }}
                          />
                          <span className="auth-input-right">
                            <button
                              type="button"
                              id="login-toggle-password"
                              className="auth-pw-toggle"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                            >
                              {showLoginPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="forgot-password-link"
                      className="auth-forgot-link"
                      onClick={() => switchView('forgot-password')}
                    >
                      Forgot password?
                    </button>

                    <button
                      id="login-submit"
                      type="submit"
                      disabled={loading}
                      className="auth-btn-primary"
                    >
                      {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
                    </button>
                  </form>

                  <p className="auth-switch-hint">
                    New here?{' '}
                    <button
                      type="button"
                      id="switch-to-register"
                      className="auth-switch-btn"
                      onClick={() => switchView('register')}
                    >
                      Create an account
                    </button>
                  </p>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════
                REGISTER VIEW
            ══════════════════════════════════════ */}
            {view === 'register' && (
              <>
                <div className="auth-card-header">
                  <h2 className="auth-card-title">Create account</h2>
                  <p className="auth-card-subtitle">Join SigmaValue AI — it only takes a minute</p>
                </div>
                <div className="auth-card-body">
                  {error && (
                    <AlertBanner type="error" message={error} onSwitchToLogin={() => switchView('login')} />
                  )}

                  <GoogleButton label="Sign up with Google" disabled={loading} />
                  <OrDivider />

                  <form onSubmit={handleRegister} noValidate>
                    <div className="auth-form-space">
                      {/* Username */}
                      <InputField
                        id="reg-username"
                        label="Username"
                        icon={<User style={{ width: 17, height: 17 }} />}
                        value={regUsername}
                        onChange={setRegUsername}
                        placeholder="johndoe"
                        autoComplete="username"
                      />

                      {/* Email with validation indicator */}
                      <div className="auth-field">
                        <label htmlFor="reg-email" className="auth-label">Email Address</label>
                        <div className="auth-input-wrap">
                          <span className="auth-icon"><Mail style={{ width: 17, height: 17 }} /></span>
                          <input
                            id="reg-email"
                            type="email"
                            value={regEmail}
                            onChange={(e) => { setRegEmail(e.target.value); setRegEmailTouched(true); }}
                            onBlur={() => setRegEmailTouched(true)}
                            placeholder="john@example.com"
                            autoComplete="email"
                            className={`auth-input ${regEmailTouched && regEmail && !regEmailValid ? 'auth-input--error' : ''}`}
                            style={{ paddingRight: '42px' }}
                          />
                          {regEmailTouched && regEmail && (
                            <span className="auth-input-right">
                              <span className="auth-email-indicator">
                                {regEmailValid
                                  ? <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e' }} />
                                  : <AlertCircle style={{ width: 16, height: 16, color: '#ef4444' }} />
                                }
                              </span>
                            </span>
                          )}
                        </div>
                        {regEmailTouched && regEmail && !regEmailValid && (
                          <p style={{ fontSize: 11, color: '#ef4444', marginLeft: 2, fontWeight: 600 }}>
                            Please enter a valid email (e.g. name@example.com)
                          </p>
                        )}
                      </div>

                      {/* Password with strength */}
                      <div className="auth-field">
                        <label htmlFor="reg-password" className="auth-label">Password</label>
                        <div className="auth-input-wrap">
                          <span className="auth-icon"><Lock style={{ width: 17, height: 17 }} /></span>
                          <input
                            id="reg-password"
                            type={showRegPassword ? 'text' : 'password'}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            autoComplete="new-password"
                            className="auth-input"
                            style={{ paddingRight: '42px' }}
                          />
                          <span className="auth-input-right">
                            <button
                              type="button"
                              id="reg-toggle-password"
                              className="auth-pw-toggle"
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                            >
                              {showRegPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                            </button>
                          </span>
                        </div>
                        {regPassword && (
                          <div className="auth-strength">
                            <div className="auth-strength-bars">
                              {[1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className="auth-strength-bar"
                                  style={{ backgroundColor: i <= strength.score ? strength.color : '#e2e8f0' }}
                                />
                              ))}
                            </div>
                            <span className="auth-strength-label" style={{ color: strength.color }}>
                              {strength.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Confirm password */}
                      <div className="auth-field" style={{ marginBottom: 0 }}>
                        <label htmlFor="reg-confirm" className="auth-label">Confirm Password</label>
                        <div className="auth-input-wrap">
                          <span className="auth-icon"><Lock style={{ width: 17, height: 17 }} /></span>
                          <input
                            id="reg-confirm"
                            type={showRegConfirm ? 'text' : 'password'}
                            value={regConfirm}
                            onChange={(e) => setRegConfirm(e.target.value)}
                            placeholder="Re-enter password"
                            autoComplete="new-password"
                            className={`auth-input ${regConfirm && regConfirm !== regPassword ? 'auth-input--error' : ''}`}
                            style={{ paddingRight: '60px' }}
                          />
                          <span className="auth-input-right" style={{ gap: '6px' }}>
                            {regConfirm && regPassword && (
                              <span className="auth-email-indicator">
                                {regConfirm === regPassword
                                  ? <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e' }} />
                                  : <AlertCircle style={{ width: 16, height: 16, color: '#ef4444' }} />
                                }
                              </span>
                            )}
                            <button
                              type="button"
                              id="reg-toggle-confirm"
                              className="auth-pw-toggle"
                              onClick={() => setShowRegConfirm(!showRegConfirm)}
                              aria-label={showRegConfirm ? 'Hide password' : 'Show password'}
                            >
                              {showRegConfirm ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Terms note */}
                    <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
                      By creating an account you agree to our{' '}
                      <span style={{ color: '#4f46e5', fontWeight: 700 }}>Terms of Service</span>
                      {' '}and{' '}
                      <span style={{ color: '#4f46e5', fontWeight: 700 }}>Privacy Policy</span>
                    </p>

                    <button
                      id="register-submit"
                      type="submit"
                      disabled={loading}
                      className="auth-btn-primary"
                    >
                      {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : 'Create Account'}
                    </button>
                  </form>

                  <p className="auth-switch-hint">
                    Already have an account?{' '}
                    <button
                      type="button"
                      id="switch-to-login"
                      className="auth-switch-btn"
                      onClick={() => switchView('login')}
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════
                FORGOT PASSWORD VIEW
            ══════════════════════════════════════ */}
            {view === 'forgot-password' && (
              <>
                <div className="auth-card-header">
                  <h2 className="auth-card-title">Forgot password?</h2>
                  <p className="auth-card-subtitle">Enter your email and we&apos;ll send a reset link</p>
                </div>
                <div className="auth-card-body">
                  <button
                    type="button"
                    id="back-to-login-from-fp"
                    className="auth-back-btn"
                    onClick={() => switchView('login')}
                  >
                    <ArrowLeft style={{ width: 14, height: 14 }} />
                    Back to Sign In
                  </button>

                  {error && <AlertBanner type="error" message={error} />}

                  <form onSubmit={handleForgotPassword} noValidate>
                    <div className="auth-field">
                      <label htmlFor="fp-email" className="auth-label">Email Address</label>
                      <div className="auth-input-wrap">
                        <span className="auth-icon"><Mail style={{ width: 17, height: 17 }} /></span>
                        <input
                          id="fp-email"
                          type="email"
                          value={fpEmail}
                          onChange={(e) => { setFpEmail(e.target.value); setFpEmailTouched(true); }}
                          onBlur={() => setFpEmailTouched(true)}
                          placeholder="your@email.com"
                          autoComplete="email"
                          className={`auth-input ${fpEmailTouched && fpEmail && !fpEmailValid ? 'auth-input--error' : ''}`}
                          style={{ paddingRight: '42px' }}
                        />
                        {fpEmailTouched && fpEmail && (
                          <span className="auth-input-right">
                            <span className="auth-email-indicator">
                              {fpEmailValid
                                ? <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e' }} />
                                : <AlertCircle style={{ width: 16, height: 16, color: '#ef4444' }} />
                              }
                            </span>
                          </span>
                        )}
                      </div>
                      {fpEmailTouched && fpEmail && !fpEmailValid && (
                        <p style={{ fontSize: 11, color: '#ef4444', marginLeft: 2, fontWeight: 600 }}>
                          Please enter a valid email address
                        </p>
                      )}
                    </div>

                    <button
                      id="fp-submit"
                      type="submit"
                      disabled={loading}
                      className="auth-btn-primary"
                    >
                      {loading
                        ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                        : (<><Send style={{ width: 14, height: 14 }} /> Send Reset Link</>)
                      }
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════
                EMAIL SENT VIEW (after forgot password)
            ══════════════════════════════════════ */}
            {view === 'email-sent' && (
              <div className="auth-card-body">
                <div className="auth-success-wrap">
                  <div className="auth-success-icon auth-success-icon--violet">
                    <Mail style={{ width: 28, height: 28, color: '#7c3aed' }} />
                  </div>
                  <h2 className="auth-success-title">Check your inbox</h2>
                  <p className="auth-success-desc">
                    We&apos;ve sent a password reset link to{' '}
                    <span className="auth-success-em">{fpEmail || 'your email'}</span>.
                    <br /><br />
                    Didn&apos;t receive it? Check your spam folder or{' '}
                    <button
                      type="button"
                      className="auth-switch-btn"
                      style={{ fontSize: 13 }}
                      onClick={() => switchView('forgot-password')}
                    >
                      try again
                    </button>
                    .
                  </p>
                  <button
                    type="button"
                    id="back-to-login-from-sent"
                    className="auth-btn-primary"
                    style={{ maxWidth: 220 }}
                    onClick={() => switchView('login')}
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                REGISTER SUCCESS VIEW
            ══════════════════════════════════════ */}
            {view === 'register-success' && (
              <div className="auth-card-body">
                <div className="auth-success-wrap">
                  <div className="auth-success-icon auth-success-icon--green">
                    <ShieldCheck style={{ width: 28, height: 28, color: '#16a34a' }} />
                  </div>
                  <h2 className="auth-success-title">Account created!</h2>
                  <p className="auth-success-desc">
                    We&apos;ve sent a verification email to{' '}
                    <span className="auth-success-em">{regEmail || 'your email'}</span>.
                    <br /><br />
                    Please verify your email address to activate your account, then sign in below.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', width: '100%' }}>
                    <button
                      type="button"
                      id="go-to-login-after-register"
                      className="auth-btn-primary"
                      style={{ maxWidth: 240 }}
                      onClick={() => switchView('login')}
                    >
                      Go to Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResendVerification(regEmail)}
                      className="auth-switch-btn"
                      style={{ fontSize: 12 }}
                    >
                      Didn&apos;t receive email? Resend verification link
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
          {/* end .auth-card */}

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <p className="auth-footer">Powered by Sigmavalue AI Neural Core v1.0</p>
        </div>
        {/* end .auth-card-wrap */}
      </div>
    </>
  );
}
