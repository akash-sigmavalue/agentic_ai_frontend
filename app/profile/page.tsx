"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User as UserIcon, Mail, Shield, Coins, Building2, Zap, LogOut,
  ArrowRight, Users, Send, Trash2, RefreshCw, Edit3, Check, X,
  Clock, CheckCircle2, XCircle, Loader2, AlertTriangle, Crown, Receipt,

} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, apiRequest, API_ROUTES } from "@/lib/api-client";

// ─── Types ──────────────────────────────────────────────────────────────────────
interface OrgMember {
  user_id: number;
  username: string;
  email: string | null;
  org_role: string;
  status: string;
  joined_at: string;
}

interface OrgInvite {
  id: number;
  invited_email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface OrgDetail {
  id: number;
  name: string;
  owner_user_id: number;
  org_token_balance: number;
  status: string;
  created_at: string;
}

// ─── Role Badge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role, accountType, orgRole }: { role: string; accountType?: string | null; orgRole?: string }) {
  if (role === "ADMIN") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-300 border-violet-500/30">
      <Shield className="h-3 w-3" /> ADMIN
    </span>
  );
  if (orgRole === "OWNER") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border-amber-500/30">
      <Crown className="h-3 w-3" /> ORG OWNER
    </span>
  );
  if (orgRole === "EMPLOYEE") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
      <Building2 className="h-3 w-3" /> EMPLOYEE
    </span>
  );
  if (accountType === "ENTERPRISE") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
      <Building2 className="h-3 w-3" /> ENTERPRISE
    </span>
  );
  if (role === "PAID" || accountType === "INDIVIDUAL") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
      <Zap className="h-3 w-3" /> INDIVIDUAL PRO
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border-slate-700">
      <Coins className="h-3 w-3" /> FREE TIER
    </span>
  );
}

// ─── Invite Status Badge ────────────────────────────────────────────────────────
function InviteStatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING:  { color: "bg-amber-950/60 text-amber-300 border-amber-800", icon: <Clock className="w-3 h-3" /> },
    ACCEPTED: { color: "bg-emerald-950/60 text-emerald-300 border-emerald-800", icon: <CheckCircle2 className="w-3 h-3" /> },
    REVOKED:  { color: "bg-rose-950/60 text-rose-300 border-rose-800", icon: <XCircle className="w-3 h-3" /> },
    EXPIRED:  { color: "bg-slate-800 text-slate-400 border-slate-700", icon: <AlertTriangle className="w-3 h-3" /> },
  };
  const { color, icon } = map[status] || map.EXPIRED;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${color}`}>
      {icon} {status}
    </span>
  );
}

// ─── Section Card ───────────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-6 rounded-3xl bg-slate-900/60 border border-slate-800 ${className}`}>
      {children}
    </div>
  );
}

// ─── Owner Organization Management Section ──────────────────────────────────────
function OrgManagementSection({ orgId, initialName, initialBalance, initialStatus }: {
  orgId: number; initialName: string; initialBalance: number; initialStatus: string;
}) {
  const [orgName, setOrgName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try { setMembers(await apiFetch<OrgMember[]>(API_ROUTES.enterpriseMyOrgMembers)); }
    catch { /* ignore */ } finally { setLoadingMembers(false); }
  };

  const fetchInvites = async () => {
    setLoadingInvites(true);
    try { setInvites(await apiFetch<OrgInvite[]>(API_ROUTES.enterpriseMyOrgInvites)); }
    catch { /* ignore */ } finally { setLoadingInvites(false); }
  };

  useEffect(() => {
    fetchMembers();
    fetchInvites();
  }, []);

  const handleRenameSave = async () => {
    if (!nameInput.trim() || nameInput === orgName) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await apiRequest(API_ROUTES.enterpriseRenameOrg, {
        method: "PATCH",
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      setOrgName(nameInput.trim());
      setEditingName(false);
    } catch (e: any) {
      alert(e.message || "Failed to rename.");
    } finally { setSavingName(false); }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    setInviteMsg(null);
    try {
      const res = await apiRequest(API_ROUTES.enterpriseMyOrgMembers, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add member");
      // Show the confirmed username so owner can verify it's the right person
      setInviteMsg({
        type: "success",
        text: `✓ '${data.username}' (${inviteEmail.trim()}) has been added to your organization. They've been notified by email.`,
      });
      setInviteEmail("");
      fetchMembers();
    } catch (e: any) {
      setInviteMsg({ type: "error", text: e.message });
    } finally { setSendingInvite(false); }
  };

  const handleRemoveMember = async (userId: number, username: string) => {
    if (!confirm(`Remove ${username} from the organization?`)) return;
    setRemovingUserId(userId);
    try {
      const res = await apiRequest(API_ROUTES.enterpriseRemoveMember(userId), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove member");
      fetchMembers();
    } catch (e: any) {
      alert(e.message);
    } finally { setRemovingUserId(null); }
  };

  const handleRevokeInvite = async (inviteId: number) => {
    try {
      const res = await apiRequest(API_ROUTES.enterpriseRevokeInvite(inviteId), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      fetchInvites();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const activeMembers = members.filter(m => m.status === "ACTIVE");
  const pendingInvites = invites.filter(i => i.status === "PENDING");

  return (
    <div className="space-y-5">
      {/* Org Header Card */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleRenameSave(); if (e.key === "Escape") setEditingName(false); }}
                    className="bg-slate-950 border border-indigo-500 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-100 focus:outline-none w-52"
                  />
                  <button onClick={handleRenameSave} disabled={savingName}
                    className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all">
                    {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEditingName(false)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-100 truncate">{orgName}</h2>
                  <button onClick={() => { setNameInput(orgName); setEditingName(true); }}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-0.5">Your enterprise organization</p>
            </div>
          </div>

          {/* Org Stats */}
          <div className="flex items-center gap-6 text-xs">
            <div className="text-center">
              <div className="text-xl font-black text-amber-300">{initialBalance.toLocaleString()}</div>
              <div className="text-slate-500 text-[11px] uppercase tracking-wider">Shared Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-slate-100">{activeMembers.length}</div>
              <div className="text-slate-500 text-[11px] uppercase tracking-wider">Active Members</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-slate-100">{pendingInvites.length}</div>
              <div className="text-slate-500 text-[11px] uppercase tracking-wider">Pending Invites</div>
            </div>
          </div>
        </div>

        {/* Status banner if suspended */}
        {initialStatus === "SUSPENDED" && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            This organization is currently SUSPENDED. Contact support to reactivate.
          </div>
        )}
      </Card>

      {/* Invite New Employee */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Add Member by Email</h3>
        </div>

        <div className="flex gap-2">
          <input
            type="email"
            placeholder="employee@company.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSendInvite(); }}
            className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
          />
          <button
            onClick={handleSendInvite}
            disabled={sendingInvite || !inviteEmail.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
          >
            {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Add Member
          </button>
        </div>

        {inviteMsg && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-medium leading-relaxed ${
            inviteMsg.type === "success"
              ? "bg-emerald-950/50 border border-emerald-800 text-emerald-300"
              : "bg-rose-950/50 border border-rose-800 text-rose-300"
          }`}>
            {inviteMsg.text}
          </div>
        )}
      </Card>

      {/* Active Members */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Active Members ({activeMembers.length})</h3>
          </div>
          <button onClick={fetchMembers} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMembers ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingMembers ? (
          <div className="flex items-center justify-center py-6 text-slate-500 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading members...
          </div>
        ) : activeMembers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No active members yet. Send invites above.</p>
        ) : (
          <div className="space-y-2">
            {activeMembers.map(m => (
              <div key={m.user_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-slate-300">
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{m.username}</div>
                    <div className="text-[11px] text-slate-500">{m.email || "No email"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                    m.org_role === "OWNER"
                      ? "bg-amber-950 text-amber-300 border-amber-800"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {m.org_role}
                  </span>
                  {m.org_role !== "OWNER" && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id, m.username)}
                      disabled={removingUserId === m.user_id}
                      className="p-1.5 rounded-lg bg-rose-950/50 text-rose-400 hover:bg-rose-900/50 border border-rose-800/60 transition-all disabled:opacity-50"
                      title="Remove member"
                    >
                      {removingUserId === m.user_id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invites List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Invite History</h3>
          </div>
          <button onClick={fetchInvites} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInvites ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingInvites ? (
          <div className="flex items-center justify-center py-6 text-slate-500 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading invites...
          </div>
        ) : invites.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No invites sent yet.</p>
        ) : (
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <div>
                  <div className="text-xs font-bold text-slate-200">{inv.invited_email}</div>
                  <div className="text-[11px] text-slate-500">
                    Sent {new Date(inv.created_at).toLocaleDateString()} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <InviteStatusBadge status={inv.status} />
                  {inv.status === "PENDING" && (
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all"
                      title="Revoke invite"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Employee Org Card ──────────────────────────────────────────────────────────
function EmployeeOrgCard({ activeOrg }: { activeOrg: NonNullable<ReturnType<typeof useAuth>["user"]>["active_org"] }) {
  if (!activeOrg) return null;
  const isSuspended = activeOrg.org_status === "SUSPENDED";

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-indigo-400" />
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Your Organization</h3>
        <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
          isSuspended
            ? "bg-rose-950 text-rose-400 border-rose-800"
            : "bg-emerald-950 text-emerald-400 border-emerald-800"
        }`}>
          {activeOrg.org_status}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xl font-black text-slate-100">{activeOrg.org_name}</div>
          <div className="text-xs text-slate-400 mt-0.5">You are an <strong className="text-indigo-300">Employee</strong> in this organization.</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">Shared Token Pool</span>
          <span className="text-sm font-black text-indigo-300">{activeOrg.org_token_balance.toLocaleString()} tokens</span>
        </div>

        {isSuspended && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Your organization is suspended. Contact your organization owner.
          </div>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">
          All your agent usage inside the office workspace is billed against the organization's shared token pool.
          Your personal {" "}
          <strong className="text-slate-400">10,000 free tokens</strong> remain untouched in your personal wallet.
        </p>
      </div>
    </Card>
  );
}

// ─── Payment History Card ────────────────────────────────────────────────────────
function PaymentHistoryCard() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>(API_ROUTES.paymentHistory);
      setPayments(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Payment & Billing History</h3>
        </div>
        <button onClick={fetchHistory} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-500 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading payment history...
        </div>
      ) : payments.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-6">No payments recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <span>₹{p.amount_inr?.toLocaleString()}</span>
                  <span className="text-indigo-400 font-mono text-[11px]">(+{p.tokens_credited?.toLocaleString()} Tokens)</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {new Date(p.created_at).toLocaleString()} · Session: {p.stripe_session_id?.slice(-12) || p.id}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                p.status === "succeeded"
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                  : p.status === "pending"
                  ? "bg-amber-950 text-amber-300 border-amber-800"
                  : "bg-rose-950 text-rose-400 border-rose-800"
              }`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Main Profile Page ──────────────────────────────────────────────────────────
export default function ProfilePage() {

  const { user, logout, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const isOwner = user.active_org?.org_role === "OWNER";
  const isEmployee = user.active_org?.org_role === "EMPLOYEE";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 px-6 pb-16">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ─── Profile Banner ─────────────────────────────────────────────────── */}
        <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-6 justify-between shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-2xl shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2 mb-1.5">
                <h1 className="text-xl font-black text-slate-100">{user.username}</h1>
                <RoleBadge role={user.role} accountType={user.account_type} orgRole={user.active_org?.org_role} />
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email || "No email attached"}
              </p>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-800/60 text-xs font-bold hover:bg-rose-900/40 transition-all shrink-0">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>

        {/* ─── Wallets Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Personal Wallet */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Coins className="h-4 w-4 text-indigo-400" /> Personal Wallet
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                PERSONAL
              </span>
            </div>
            <div className="text-3xl font-black text-indigo-300 mb-1">
              {(user.personal_token_balance || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mb-4">Your personal token balance</p>
            {!isEmployee && (
              <button onClick={() => router.push("/pricing")}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30">
                <Zap className="h-3.5 w-3.5" /> Get More Tokens (₹5,000 / 1M)
              </button>
            )}
          </Card>

          {/* Org Token Pool (if owner or employee) */}
          {user.active_org ? (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-400" /> Organization Pool
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  {user.active_org.org_role}
                </span>
              </div>
              <div className="text-3xl font-black text-amber-300 mb-1">
                {user.active_org.org_token_balance.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Shared pool — {isOwner ? "your employees draw from this." : "used for your office workspace."}
              </p>
              {isOwner && (
                <button onClick={() => alert("Contact Sigma Value support to add more org tokens.")}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/30 font-bold text-xs flex items-center justify-center gap-2 transition-all">
                  <Coins className="h-3.5 w-3.5" /> Request More Org Tokens
                </button>
              )}
            </Card>
          ) : (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enterprise Org</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Need a company account with shared tokens for your whole team?
              </p>
              <button onClick={() => router.push("/pricing#enterprise")}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all">
                Learn About Enterprise <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Card>
          )}
        </div>

        {/* ─── Owner: Full Organization Management ──────────────────────────── */}
        {isOwner && user.active_org && (
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-1 h-4 rounded-full bg-amber-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Organization Management</h2>
            </div>
            <OrgManagementSection
              orgId={user.active_org.org_id}
              initialName={user.active_org.org_name}
              initialBalance={user.active_org.org_token_balance}
              initialStatus={user.active_org.org_status}
            />
          </div>
        )}

        {/* ─── Employee: Read-only Org Card ──────────────────────────────────── */}
        {isEmployee && (
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-1 h-4 rounded-full bg-indigo-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Your Organization</h2>
            </div>
            <EmployeeOrgCard activeOrg={user.active_org} />
          </div>
        )}



        {/* ─── Payment & Billing History ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="w-1 h-4 rounded-full bg-indigo-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Billing History</h2>
          </div>
          <PaymentHistoryCard />
        </div>

        {/* ─── Pricing Reminder ────────────────────────────────────────────── */}
        <Card className="bg-slate-900/30 border-slate-800/50">

          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Current Plan Policy</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400">🎁 Free Signup Grant</span>
              <p className="text-[11px] text-slate-400">10,000 tokens auto-credited on signup.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-indigo-400">⚡ Individual Pack</span>
              <p className="text-[11px] text-slate-400">₹5,000 for 1,000,000 tokens.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-400">🏢 Enterprise Org</span>
              <p className="text-[11px] text-slate-400">Shared pool for multi-employee teams.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
