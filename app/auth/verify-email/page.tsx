"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Cpu, ArrowRight, RefreshCw, LogIn } from 'lucide-react';
import { apiRequest, API_ROUTES } from '@/lib/api-client';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!token) {
      setLoading(false);
      setError('Invalid or missing verification token.');
      return;
    }

    const doVerify = async () => {
      try {
        const res = await apiRequest(API_ROUTES.authVerifyEmail, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'Verification failed. The link may have expired or is invalid.');
        }
        setSuccess(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Verification failed.');
      } finally {
        setLoading(false);
      }
    };

    doVerify();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResending(true);
    setResendMsg('');
    try {
      const res = await apiRequest(API_ROUTES.authResendVerification, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Could not resend email.');
      }
      setResendMsg(data.message || 'Verification link sent! Check your inbox.');
    } catch (err: unknown) {
      setResendMsg(err instanceof Error ? err.message : 'Failed to resend link.');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ── Light Mode Defaults ── */
        .ve-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(135deg, #f0f4ff 0%, #fafbff 50%, #f5f0ff 100%);
          font-family: var(--font-inter), 'Segoe UI', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
          transition: background 0.3s ease;
        }
        .ve-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(#4f46e5 1.2px, transparent 1.2px);
          background-size: 36px 36px;
          opacity: 0.045;
          pointer-events: none;
        }
        .ve-wrap {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 460px;
          opacity: 0;
          transform: translateY(16px) scale(0.97);
          transition: opacity .4s ease, transform .4s ease;
        }
        .ve-wrap.mounted {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .ve-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
        }
        .ve-brand-icon {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 30px rgba(79, 70, 229, 0.3);
          margin-bottom: 14px;
        }
        .ve-brand-title {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -.5px;
        }
        .ve-brand-sub {
          font-size: 11px;
          font-weight: 700;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: .3em;
          margin-top: 6px;
        }
        .ve-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.08), 0 4px 16px rgba(79, 70, 229, 0.06);
          overflow: hidden;
          padding: 36px;
          text-align: center;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .ve-icon-box {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ve-icon-box--green {
          background: #dcfce7;
          border: 1px solid #bbf7d0;
        }
        .ve-icon-box--red {
          background: #ffe4e6;
          border: 1px solid #fecdd3;
        }
        .ve-title {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 10px;
        }
        .ve-desc {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin: 0 0 24px;
        }
        .ve-btn-primary {
          width: 100%;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .05em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all .2s ease;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
        }
        .ve-btn-primary:hover {
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
          transform: translateY(-2px);
        }
        .ve-btn-secondary {
          width: 100%;
          padding: 12px 20px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all .2s ease;
          margin-top: 16px;
        }
        .ve-btn-secondary:hover {
          background: #f1f5f9;
          color: #0f172a;
          border-color: #cbd5e1;
        }
        .ve-divider {
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
          margin-top: 20px;
        }
        .ve-resend-label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 12px;
        }
        .ve-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          font-size: 13px;
          margin-bottom: 12px;
          outline: none;
          box-sizing: border-box;
        }
        .ve-input:focus {
          border-color: #4f46e5;
          background: #ffffff;
        }
        .ve-loader-icon {
          color: #4f46e5;
          animation: spin 1s linear infinite;
        }
        .ve-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: .1em;
        }

        /* ── Dark Mode Overrides ── */
        html.dark-mode .ve-page,
        [data-theme="dark"] .ve-page {
          background: linear-gradient(135deg, #0b0f19 0%, #111827 50%, #0f172a 100%);
        }
        html.dark-mode .ve-page::before,
        [data-theme="dark"] .ve-page::before {
          background-image: radial-gradient(rgba(99, 102, 241, 0.12) 1.2px, transparent 1.2px);
          opacity: 1;
        }
        html.dark-mode .ve-brand-title,
        [data-theme="dark"] .ve-brand-title {
          color: #f8fafc;
        }
        html.dark-mode .ve-brand-sub,
        [data-theme="dark"] .ve-brand-sub {
          color: #818cf8;
        }
        html.dark-mode .ve-card,
        [data-theme="dark"] .ve-card {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        html.dark-mode .ve-icon-box--green,
        [data-theme="dark"] .ve-icon-box--green {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        html.dark-mode .ve-icon-box--red,
        [data-theme="dark"] .ve-icon-box--red {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        html.dark-mode .ve-title,
        [data-theme="dark"] .ve-title {
          color: #f8fafc;
        }
        html.dark-mode .ve-desc,
        [data-theme="dark"] .ve-desc {
          color: #94a3b8;
        }
        html.dark-mode .ve-btn-secondary,
        [data-theme="dark"] .ve-btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #cbd5e1;
        }
        html.dark-mode .ve-btn-secondary:hover,
        [data-theme="dark"] .ve-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.25);
        }
        html.dark-mode .ve-divider,
        [data-theme="dark"] .ve-divider {
          border-top-color: rgba(255, 255, 255, 0.1);
        }
        html.dark-mode .ve-resend-label,
        [data-theme="dark"] .ve-resend-label {
          color: #cbd5e1;
        }
        html.dark-mode .ve-input,
        [data-theme="dark"] .ve-input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f8fafc;
        }
        html.dark-mode .ve-input:focus,
        [data-theme="dark"] .ve-input:focus {
          border-color: #6366f1;
          background: rgba(15, 23, 42, 0.9);
        }
        html.dark-mode .ve-loader-icon,
        [data-theme="dark"] .ve-loader-icon {
          color: #818cf8;
        }
        html.dark-mode .ve-footer,
        [data-theme="dark"] .ve-footer {
          color: #64748b;
        }
      `}</style>

      <div className="ve-page">
        <div className={`ve-wrap ${mounted ? 'mounted' : ''}`}>
          <div className="ve-brand">
            <div className="ve-brand-icon">
              <Cpu style={{ width: 32, height: 32, color: '#fff' }} />
            </div>
            <h1 className="ve-brand-title">SigmaValue AI Pilot</h1>
            <p className="ve-brand-sub">Intelligent Secure Access</p>
          </div>

          <div className="ve-card">
            {loading ? (
              <div>
                <Loader2 className="ve-loader-icon" style={{ width: 44, height: 44, margin: '0 auto 16px' }} />
                <h2 className="ve-title">Verifying Email...</h2>
                <p className="ve-desc">Please wait while we confirm your email address.</p>
              </div>
            ) : success ? (
              <div>
                <div className="ve-icon-box ve-icon-box--green">
                  <CheckCircle2 style={{ width: 36, height: 36, color: '#16a34a' }} />
                </div>
                <h2 className="ve-title">Email Verified Successfully!</h2>
                <p className="ve-desc">Your email address has been verified. You can now log in to access your account.</p>
                <button className="ve-btn-primary" onClick={() => router.push('/auth')}>
                  <LogIn style={{ width: 16, height: 16 }} /> Go to Login Page <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
            ) : (
              <div>
                <div className="ve-icon-box ve-icon-box--red">
                  <AlertCircle style={{ width: 36, height: 36, color: '#dc2626' }} />
                </div>
                <h2 className="ve-title">Verification Failed</h2>
                <p className="ve-desc">{error}</p>

                <div className="ve-divider">
                  <p className="ve-resend-label">
                    Need a new verification link?
                  </p>
                  <form onSubmit={handleResend}>
                    <input
                      type="email"
                      className="ve-input"
                      placeholder="Enter your registered email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                    />
                    <button type="submit" disabled={resending} className="ve-btn-primary" style={{ fontSize: 12 }}>
                      {resending ? (
                        <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <><RefreshCw style={{ width: 14, height: 14 }} /> Resend Verification Link</>
                      )}
                    </button>
                  </form>
                  {resendMsg && (
                    <p style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, marginTop: 10 }}>
                      {resendMsg}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="ve-btn-secondary"
                  onClick={() => router.push('/auth')}
                >
                  <LogIn style={{ width: 16, height: 16 }} /> Go to Login Page
                </button>
              </div>
            )}
          </div>

          <p className="ve-footer">Powered by SigmaValue AI Neural Core v1.0</p>
        </div>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="ve-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="ve-loader-icon" style={{ width: 32, height: 32 }} />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}


