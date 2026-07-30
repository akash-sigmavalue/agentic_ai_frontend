"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Building2,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Building,
  PlusCircle,
  XCircle,
  CheckCircle2,
  Coins,
  Loader2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import AdminOnlyGate from "@/components/shared/AdminOnlyGate";
import { apiFetch, apiRequest, API_ROUTES } from "@/lib/api-client";

interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  role: string;
  account_type: string | null;
  is_active: boolean;
  created_at: string | null;
  personal_token_balance: number;
  active_org_id: number | null;
  active_org_name: string | null;
  active_org_role: string | null;
}

interface AdminOrg {
  id: number;
  name: string;
  owner_user_id: number;
  owner_username: string;
  org_token_balance: number;
  status: string;
  created_at: string;
  active_member_count: number;
}

interface AdminTransaction {
  id: number;
  wallet_type: string;
  wallet_owner_id: number;
  amount: number;
  type: string;
  agent_id: number | null;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"users" | "orgs" | "transactions" | "payments">("users");

  // Payments state
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const data = await apiFetch<any[]>(API_ROUTES.adminPaymentHistory);
      setPayments(data);
    } catch {
      // ignore
    } finally {
      setLoadingPayments(false);
    }
  };


  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  // Promote Modal state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [initialTokens, setInitialTokens] = useState("10000000"); // Default 10M
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  // Orgs state
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Set org balance modal state
  const [selectedOrg, setSelectedOrg] = useState<AdminOrg | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [updatingOrg, setUpdatingOrg] = useState(false);

  // Transactions state
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await apiFetch<AdminUser[]>(API_ROUTES.adminUsers);
      setUsers(data);
    } catch (err: any) {
      console.error("Failed to load users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const data = await apiFetch<AdminOrg[]>(API_ROUTES.adminOrgs);
      setOrgs(data);
    } catch (err: any) {
      console.error("Failed to load orgs", err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const data = await apiFetch<AdminTransaction[]>(API_ROUTES.adminTransactions);
      setTransactions(data);
    } catch (err: any) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "orgs") fetchOrgs();
    if (activeTab === "transactions") fetchTransactions();
    if (activeTab === "payments") fetchPayments();
  }, [activeTab]);


  // Promote user to Enterprise Owner
  const handlePromote = async () => {
    if (!selectedUser) return;
    setPromoting(true);
    setPromoteError(null);
    setPromoteSuccess(null);

    try {
      const tokensNum = parseInt(initialTokens, 10);
      if (isNaN(tokensNum) || tokensNum < 0) {
        throw new Error("Invalid token amount");
      }

      const url = API_ROUTES.adminPromoteEnterprise(selectedUser.id);
      const res = await apiRequest(url, {
        method: "POST",
        body: JSON.stringify({ initial_org_tokens: tokensNum }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to promote user.");
      }

      const data = await res.json();
      setPromoteSuccess(data.message || "User promoted to Enterprise Owner!");
      fetchUsers();
      setTimeout(() => {
        setSelectedUser(null);
        setPromoteSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPromoteError(err.message);
    } finally {
      setPromoting(false);
    }
  };

  // Set Org Balance
  const handleSetBalance = async () => {
    if (!selectedOrg) return;
    setUpdatingOrg(true);
    try {
      const bal = parseInt(newBalance, 10);
      if (isNaN(bal) || bal < 0) throw new Error("Invalid balance");

      const url = API_ROUTES.adminSetOrgBalance(selectedOrg.id);
      const res = await apiRequest(url, {
        method: "POST",
        body: JSON.stringify({ new_balance: bal }),
      });
      if (!res.ok) throw new Error("Failed to set balance");

      fetchOrgs();
      setSelectedOrg(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingOrg(false);
    }
  };

  // Toggle Suspend / Activate
  const handleToggleSuspend = async (org: AdminOrg) => {
    const isSuspended = org.status === "SUSPENDED";
    const route = isSuspended
      ? API_ROUTES.adminActivateOrg(org.id)
      : API_ROUTES.adminSuspendOrg(org.id);

    try {
      const res = await apiRequest(route, { method: "POST" });
      if (!res.ok) throw new Error("Action failed");
      fetchOrgs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <AdminOnlyGate>
      <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 px-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">Admin Management Hub</h1>
                  <p className="text-xs text-slate-400 font-medium">
                    Manage users, Enterprise organizations, and inspect the token audit trail.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "users"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users className="w-4 h-4" />
                Users ({users.length})
              </button>
              <button
                onClick={() => setActiveTab("orgs")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "orgs"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Organizations
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "transactions"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Receipt className="w-4 h-4" />
                Token Audit
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "payments"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-4 h-4" />
                Fiat Payments ({payments.length})
              </button>
            </div>

          </div>

          {/* TAB 1: USERS */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by username or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-500"
                  />
                </div>
                <button
                  onClick={fetchUsers}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Account Type</th>
                      <th className="p-4">Personal Balance</th>
                      <th className="p-4">Active Organization</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                          Loading user directory...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-bold text-slate-200">
                            <div>{u.username}</div>
                            <div className="text-[11px] font-normal text-slate-400">{u.email || "No email"}</div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border ${
                                u.role === "ADMIN"
                                  ? "bg-violet-950/80 text-violet-300 border-violet-800"
                                  : u.role === "PAID"
                                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 font-semibold">
                            {u.account_type || "—"}
                          </td>
                          <td className="p-4 font-bold text-indigo-300">
                            {u.personal_token_balance.toLocaleString()} tokens
                          </td>
                          <td className="p-4 text-slate-300">
                            {u.active_org_name ? (
                              <div className="flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{u.active_org_name}</span>
                                <span className="text-[10px] text-slate-500 uppercase">({u.active_org_role})</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">None</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {!u.active_org_id && u.account_type !== "ENTERPRISE" && (
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/30 text-xs font-bold transition-all"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                Promote to Enterprise Owner
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATIONS */}
          {activeTab === "orgs" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={fetchOrgs}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOrgs ? "animate-spin" : ""}`} />
                  Refresh Orgs
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingOrgs ? (
                  <div className="col-span-full p-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading organizations...
                  </div>
                ) : orgs.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-slate-500">
                    No organizations created yet. Promote a user to Enterprise Owner to get started.
                  </div>
                ) : (
                  orgs.map((org) => (
                    <div
                      key={org.id}
                      className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-100 text-base">{org.name}</h3>
                          <p className="text-xs text-slate-400">Owner: {org.owner_username}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            org.status === "ACTIVE"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-rose-950 text-rose-400 border border-rose-800"
                          }`}
                        >
                          {org.status}
                        </span>
                      </div>

                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Shared Token Pool:</span>
                          <span className="font-bold text-indigo-300">
                            {org.org_token_balance.toLocaleString()} tokens
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Active Members:</span>
                          <span className="font-semibold text-slate-200">{org.active_member_count}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => {
                            setSelectedOrg(org);
                            setNewBalance(org.org_token_balance.toString());
                          }}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all text-center"
                        >
                          Update Balance
                        </button>
                        <button
                          onClick={() => handleToggleSuspend(org)}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                            org.status === "ACTIVE"
                              ? "bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border-rose-800"
                              : "bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800"
                          }`}
                        >
                          {org.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTIONS AUDIT TRAIL */}
          {activeTab === "transactions" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={fetchTransactions}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTx ? "animate-spin" : ""}`} />
                  Refresh Audit Trail
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-4">ID</th>
                      <th className="p-4">Wallet Type</th>
                      <th className="p-4">Owner ID</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                    {loadingTx ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                          Loading audit trail...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          No token transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 text-slate-400 font-mono">#{tx.id}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.wallet_type === "ORG"
                                  ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                                  : "bg-slate-800 text-slate-300 border border-slate-700"
                              }`}
                            >
                              {tx.wallet_type}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 font-mono">ID #{tx.wallet_owner_id}</td>
                          <td className="p-4 font-bold text-slate-200">{tx.type}</td>
                          <td className="p-4 font-bold">
                            <span className={tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"}>
                              {tx.amount >= 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FIAT PAYMENTS HISTORY */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={fetchPayments}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPayments ? "animate-spin" : ""}`} />
                  Refresh Payments
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-4">ID</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Amount (INR)</th>
                      <th className="p-4">Tokens Credited</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Session / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                    {loadingPayments ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                          Loading fiat payments...
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          No payments recorded in database yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 text-slate-400 font-mono">#{p.id}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-200">{p.username}</div>
                            <div className="text-[11px] font-normal text-slate-400">{p.user_email || `ID #${p.user_id}`}</div>
                          </td>
                          <td className="p-4 font-bold text-emerald-400">₹{p.amount_inr?.toLocaleString()}</td>
                          <td className="p-4 font-bold text-indigo-300">+{p.tokens_credited?.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                              p.status === "succeeded"
                                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                                : p.status === "pending"
                                ? "bg-amber-950 text-amber-300 border-amber-800"
                                : "bg-rose-950 text-rose-400 border-rose-800"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">
                            <div>{new Date(p.created_at).toLocaleString()}</div>
                            <div className="text-[10px] font-mono text-slate-500">{p.stripe_session_id?.slice(-14)}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* PROMOTE MODAL */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-100 text-lg">Promote to Enterprise Owner</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                User: <strong className="text-slate-200">{selectedUser.username}</strong> ({selectedUser.email || "No email"})
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Initial Org Tokens (Sales Contract)</label>
                <input
                  type="number"
                  value={initialTokens}
                  onChange={(e) => setInitialTokens(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500">Default: 10,000,000 tokens</p>
              </div>

              {promoteError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-medium">
                  {promoteError}
                </div>
              )}
              {promoteSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-medium">
                  {promoteSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromote}
                  disabled={promoting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {promoting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Promotion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SET BALANCE MODAL */}
        {selectedOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-100 text-lg">Update Org Token Balance</h3>
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Org: <strong className="text-slate-200">{selectedOrg.name}</strong>
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">New Token Balance</label>
                <input
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetBalance}
                  disabled={updatingOrg}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {updatingOrg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save New Balance
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminOnlyGate>
  );
}
