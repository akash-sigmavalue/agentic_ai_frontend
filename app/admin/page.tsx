"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Users, CheckCircle2, XCircle, Clock, RefreshCw,
  Loader2, AlertCircle, ChevronDown, Filter, BarChart3, Mail,
  User as UserIcon, Calendar,
} from 'lucide-react';
import RoleGuard from '@/components/shared/RoleGuard';
import { apiFetch, apiRequest, apiUrl, API_ROUTES } from '@/lib/api-client';

// ── Types ──────────────────────────────────────────────────────────────────────
interface RedemptionRequest {
  id: number;
  user_id: number;
  username: string;
  email: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_at: string;
  reviewed_at: string | null;
  admin_remark: string | null;
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

// ── Helper components ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING:  { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
    APPROVED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
    REJECTED: { color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> },
  };
  const c = cfg[status] ?? cfg['PENDING'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${c.color}`}>
      {c.icon}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ── Admin Panel Page ───────────────────────────────────────────────────────────
function AdminPanelContent() {
  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [rejectRemark, setRejectRemark] = useState<Record<number, string>>({});

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setActionError('');
    try {
      const url = filter === 'ALL'
        ? API_ROUTES.adminRedemptionRequests
        : `${API_ROUTES.adminRedemptionRequests}?status=${filter}`;
      const data = await apiFetch<RedemptionRequest[]>(url);
      setRequests(data);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await apiRequest(`/admin/redemption-requests/${id}/approve`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Approve failed.');
      }
      setActionSuccess(`Request #${id} approved successfully!`);
      await fetchRequests();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await apiRequest(`/admin/redemption-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ remark: rejectRemark[id] || '' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Reject failed.');
      }
      setActionSuccess(`Request #${id} rejected.`);
      setRejectRemark(prev => { const n = { ...prev }; delete n[id]; return n; });
      await fetchRequests();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-24 pb-12 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Panel</h1>
              <p className="text-sm text-slate-400">Token Redemption Requests</p>
            </div>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:text-slate-900 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Requests', value: requests.length, icon: <BarChart3 className="h-5 w-5" />, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
            { label: 'Pending', value: pendingCount, icon: <Clock className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50 border-amber-100' },
            { label: 'Approved', value: requests.filter(r => r.status === 'APPROVED').length, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${color}`}>
                {icon}
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{value}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Action feedback ── */}
        {actionSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {actionSuccess}
          </div>
        )}
        {actionError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
          </div>
        )}

        {/* ── Filter ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* ── Requests Table ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-500">No requests found</p>
              <p className="text-xs text-slate-400 mt-1">
                {filter !== 'ALL' ? `No ${filter.toLowerCase()} requests.` : 'No token redemption requests yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    {['User', 'Email', 'Requested', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req, i) => (
                    <tr key={req.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/20'}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                            <UserIcon className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{req.username}</p>
                            <p className="text-[10px] text-slate-400">ID #{req.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Mail className="h-3 w-3 text-slate-300 shrink-0" />
                          {req.email ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3 w-3 text-slate-300 shrink-0" />
                          {formatDate(req.requested_at)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-4 py-4">
                        {req.status === 'PENDING' ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(req.id)}
                                disabled={actionLoading === req.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all disabled:opacity-60"
                              >
                                {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                disabled={actionLoading === req.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold hover:bg-red-100 transition-all disabled:opacity-60"
                              >
                                {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                Reject
                              </button>
                            </div>
                            <input
                              placeholder="Optional remark for rejection..."
                              value={rejectRemark[req.id] ?? ''}
                              onChange={e => setRejectRemark(prev => ({ ...prev, [req.id]: e.target.value }))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">
                            {req.reviewed_at ? formatDate(req.reviewed_at) : '—'}
                            {req.admin_remark && (
                              <p className="mt-1 text-slate-500 italic">"{req.admin_remark}"</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <AdminPanelContent />
    </RoleGuard>
  );
}
