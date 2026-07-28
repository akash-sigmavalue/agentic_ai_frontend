"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Cpu, ArrowRight, RefreshCw } from 'lucide-react';
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
          throw new Error(data.detail || 'Verification failed. The link may have expired.');
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
        .ve-page {
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
          max-width: 440px;
          opacity: 0;
          transform: translateY(16px) scale(0.97);
          transition: opacity .5s ease, transform .5s ease;
        }
        .ve-wrap.mounted { opacity: 1; transform: translateY(0) scale(1); }
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
          box-shadow: 0 20px 40px rgba(79,70,229,.3);
          margin-bottom: 14px;
        }
        .ve-brand-title { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -.5px; }
        .ve-brand-sub { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: .4em; margin-top: 6px; }
        .ve-card {
          background: rgba(255,255,255,.92);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          border: 1px solid rgba(226,232,240,.8);
          box-shadow: 0 32px 64px rgba(15,23,42,.08), 0 4px 16px rgba(79,70,229,.06);
          overflow: hidden;
          padding: 36px;
          text-align: center;
        }
        .ve-icon-box {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ve-icon-box--green { background: linear-gradient(135deg, #dcfce7, #bbf7d0); }
        .ve-icon-box--red { background: linear-gradient(135deg, #ffe4e6, #fecdd3); }
        .ve-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
        .ve-desc { font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 24px; }
        .ve-btn-primary {
          width: 100%;
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
        .ve-btn-primary:hover { box-shadow: 0 12px 28px rgba(79,70,229,.40); transform: translateY(-1px); }
        .ve-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          font-size: 13px;
          margin-bottom: 12px;
          outline: none;
          box-sizing: border-box;
        }
        .ve-input:focus { border-color: #4f46e5; background: #fff; }
        .ve-footer { margin-top: 24px; text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: .3em; }
      `}</style>

      <div className="ve-page">
        <div className="ve-wrap ${mounted ? 'mounted' : ''}">
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
                <Loader2 style={{ width: 40, height: 40, color: '#4f46e5', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <h2 className="ve-title">Verifying your email...</h2>
                <p className="ve-desc">Please wait while we confirm your email address.</p>
              </div>
            ) : success ? (
              <div>
                <div className="ve-icon-box ve-icon-box--green">
                  <CheckCircle2 style={{ width: 32, height: 32, color: '#16a34a' }} />
                </div>
                <h2 className="ve-title">Email Verified!</h2>
                <p className="ve-desc">Your email address has been verified successfully. You can now sign in to access your account.</p>
                <button className="ve-btn-primary" onClick={() => router.push('/auth')}>
                  Proceed to Sign In <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
            ) : (
              <div>
                <div className="ve-icon-box ve-icon-box--red">
                  <AlertCircle style={{ width: 32, height: 32, color: '#e11d48' }} />
                </div>
                <h2 className="ve-title">Verification Failed</h2>
                <p className="ve-desc">{error}</p>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, marginTop: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
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
                    <button type="submit" disabled={resending} className="ve-btn-primary" style={{ fontSize: 10 }}>
                      {resending ? (
                        <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <><RefreshCw style={{ width: 13, height: 13 }} /> Resend Verification Email</>
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
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, marginTop: 16, cursor: 'pointer' }}
                  onClick={() => router.push('/auth')}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>

          <p className="ve-footer">Powered by Sigmavalue AI Neural Core v1.0</p>
        </div>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
