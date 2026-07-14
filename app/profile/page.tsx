"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon, Mail, Shield, Coins, Clock, CheckCircle2,
  XCircle, AlertCircle, Loader2, Edit3, Save, X, Trash2, LogOut,
  RefreshCw, Zap, ChevronRight, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiFetch, apiRequest, apiUrl, API_ROUTES } from '@/lib/api-client';

// ── Token status helpers ───────────────────────────────────────────────────────

function TokenStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    NOT_REQUESTED: { label: 'Not Requested', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Clock className="h-3 w-3" /> },
    PENDING:       { label: 'Pending Approval', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertCircle className="h-3 w-3" /> },
    APPROVED:      { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
    REJECTED:      { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> },
  };
  const cfg = configs[status] ?? configs['NOT_REQUESTED'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, string> = {
    ADMIN: 'bg-violet-50 text-violet-700 border-violet-200',
    FREE:  'bg-blue-50 text-blue-700 border-blue-200',
    PAID:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ${cfg[role] ?? cfg['FREE']}`}>
      <Shield className="h-3 w-3" />
      {role}
    </span>
  );
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ── Token status message ───────────────────────────────────────────────────────
function TokenStatusMessage({ status }: { status: string }) {
  if (status === 'NOT_REQUESTED') return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <p className="text-sm font-bold text-blue-700 mb-1">🎁 You have 1,000,000 free tokens waiting!</p>
      <p className="text-xs text-blue-600 leading-relaxed">
        Click <strong>"Request Token Access"</strong> below to activate your free token allowance for the Valuation Agent. An admin will review and approve your request.
      </p>
    </div>
  );
  if (status === 'PENDING') return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-700 mb-1">⏳ Your free token access is pending admin approval.</p>
      <p className="text-xs text-amber-600 leading-relaxed">
        Your request has been submitted. Please check back later — you will be able to use the Valuation Agent once an admin approves your request.
      </p>
    </div>
  );
  if (status === 'REJECTED') return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
      <p className="text-sm font-bold text-red-700 mb-1">❌ Your token request was rejected.</p>
      <p className="text-xs text-red-600 leading-relaxed">
        Please contact admin for more information, or submit a new request below.
      </p>
    </div>
  );
  if (status === 'APPROVED') return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
      <p className="text-sm font-bold text-emerald-700 mb-1">✅ Your token access is approved and active!</p>
      <p className="text-xs text-emerald-600 leading-relaxed">
        You can now use the Valuation Agent. Your token balance reduces with each request.
      </p>
    </div>
  );
  return null;
}

// ── Main Profile Page ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [tokenSuccess, setTokenSuccess] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const balance = user.token_balance;
  const tokenStatus = balance?.status ?? 'NOT_REQUESTED';
  const canRequestRedemption = tokenStatus === 'NOT_REQUESTED' || tokenStatus === 'REJECTED';

  const startEdit = () => {
    setUsername(user.username);
    setEmail(user.email ?? '');
    setSaveError('');
    setSaveSuccess('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await apiFetch(API_ROUTES.profileUpdate, {
        method: 'PATCH',
        body: JSON.stringify({ username: username.trim() || undefined, email: email.trim() || undefined }),
      });
      setSaveSuccess('Profile updated successfully!');
      setEditing(false);
      await refreshProfile();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRequestRedemption = async () => {
    setTokenLoading(true);
    setTokenError('');
    setTokenSuccess('');
    try {
      const res = await apiRequest(API_ROUTES.requestTokenRedemption, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Request failed.');
      }
      setTokenSuccess('Token redemption request submitted! Admin will review soon.');
      await refreshProfile();
    } catch (err: unknown) {
      setTokenError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setTokenLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await apiRequest(API_ROUTES.profileDelete, { method: 'DELETE' });
      await logout();
    } catch {
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  const usedPct = balance
    ? Math.min(100, (balance.used_tokens / balance.total_allocated_tokens) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Profile</h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage your account and token access</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 text-xs font-bold transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Back
          </button>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {saveSuccess}
          </div>
        )}

        {/* ── Account Card ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                <UserIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{user.username}</h2>
                <p className="text-indigo-200 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <RoleBadge role={user.role} />
                  {balance && <TokenStatusBadge status={tokenStatus} />}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="p-6">
            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Username</label>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                {saveError && (
                  <p className="text-xs text-red-600 font-medium">{saveError}</p>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-60"
                  >
                    {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold transition-all"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Username</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{user.username}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <p className="text-sm text-slate-600">{user.email ?? 'No email set'}</p>
                </div>
                <button
                  onClick={startEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Token Balance Card (FREE users) ── */}
        {user.role !== 'ADMIN' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Token Balance</h3>
                <p className="text-xs text-slate-400">Free token allowance for Valuation Agent</p>
              </div>
            </div>

            <TokenStatusMessage status={tokenStatus} />

            {/* Balance bar */}
            {balance && tokenStatus === 'APPROVED' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Used</span>
                  <span className="text-slate-900">
                    {formatTokens(balance.used_tokens)} / {formatTokens(balance.total_allocated_tokens)}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[
                    { label: 'Allocated', value: formatTokens(balance.total_allocated_tokens), color: 'text-slate-700' },
                    { label: 'Available', value: formatTokens(balance.available_tokens), color: 'text-emerald-600' },
                    { label: 'Used', value: formatTokens(balance.used_tokens), color: 'text-indigo-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className={`text-lg font-black ${color}`}>{value}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request/Resubmit button */}
            {canRequestRedemption && (
              <div className="space-y-2">
                {tokenError && (
                  <p className="text-xs text-red-600 font-medium">{tokenError}</p>
                )}
                {tokenSuccess && (
                  <p className="text-xs text-emerald-600 font-medium">{tokenSuccess}</p>
                )}
                <button
                  onClick={handleRequestRedemption}
                  disabled={tokenLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60"
                >
                  {tokenLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {tokenStatus === 'REJECTED' ? 'Re-submit Token Request' : 'Request Token Access'}
                </button>
              </div>
            )}

            {tokenStatus === 'PENDING' && (
              <button
                onClick={async () => { await refreshProfile(); }}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-500 font-bold transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh Status
              </button>
            )}
          </div>
        )}

        {/* ── Quick Links (for FREE users) ── */}
        {user.role === 'FREE' && tokenStatus === 'APPROVED' && (
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-white font-black text-sm">Ready to valuate?</p>
              <p className="text-indigo-200 text-xs mt-0.5">Use your tokens on the Valuation Agent</p>
            </div>
            <a
              href="/valuation"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-black hover:bg-indigo-50 transition-all shadow-lg"
            >
              <BarChart3 className="h-4 w-4" /> Go to Valuation
            </a>
          </div>
        )}

        {/* ── Danger Zone ── */}
        <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-6">
          <h3 className="text-sm font-black text-red-600 mb-1">Danger Zone</h3>
          <p className="text-xs text-slate-400 mb-4">
            Permanently delete your account. This action cannot be undone.
          </p>

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold transition-all"
            >
              <Trash2 className="h-4 w-4" /> Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                ⚠️ Are you absolutely sure? This will delete all your data, sessions, and token history.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all disabled:opacity-60"
                >
                  {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Yes, Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Logout ── */}
        <div className="flex justify-end">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-bold transition-all"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
