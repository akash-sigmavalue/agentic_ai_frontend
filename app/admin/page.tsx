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
  ExternalLink,
  Crown,
  X,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  Trash2,
  Eye,
  Filter,
} from "lucide-react";
import AdminOnlyGate from "@/components/shared/AdminOnlyGate";
import { apiFetch, apiRequest, API_ROUTES } from "@/lib/api-client";
import { useTheme } from "@/hooks/use-theme";

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

interface AdminContactInquiry {
  id: number;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  team_size: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const isDark = useTheme();
  const [activeTab, setActiveTab] = useState<"users" | "orgs" | "transactions" | "payments" | "queries">("users");

  // User Queries (Contact Inquiries) state
  const [inquiries, setInquiries] = useState<AdminContactInquiry[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [inquirySearch, setInquirySearch] = useState("");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>("ALL");
  const [selectedInquiry, setSelectedInquiry] = useState<AdminContactInquiry | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [deletingInquiryId, setDeletingInquiryId] = useState<number | null>(null);

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

  const fetchInquiries = async () => {
    setLoadingInquiries(true);
    try {
      const data = await apiFetch<AdminContactInquiry[]>(API_ROUTES.adminInquiries);
      setInquiries(data);
    } catch (err: any) {
      console.error("Failed to load contact inquiries", err);
    } finally {
      setLoadingInquiries(false);
    }
  };

  const handleUpdateStatus = async (inquiryId: number, newStatus: string) => {
    setUpdatingStatusId(inquiryId);
    try {
      const url = API_ROUTES.adminUpdateInquiryStatus(inquiryId);
      const res = await apiRequest(url, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setInquiries((prev) =>
        prev.map((item) => (item.id === inquiryId ? { ...item, status: newStatus } : item))
      );
      if (selectedInquiry && selectedInquiry.id === inquiryId) {
        setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteInquiry = async (inquiryId: number) => {
    if (!confirm("Are you sure you want to delete this user query?")) return;
    setDeletingInquiryId(inquiryId);
    try {
      const url = API_ROUTES.adminDeleteInquiry(inquiryId);
      const res = await apiRequest(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete inquiry");
      setInquiries((prev) => prev.filter((item) => item.id !== inquiryId));
      if (selectedInquiry && selectedInquiry.id === inquiryId) {
        setSelectedInquiry(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete inquiry");
    } finally {
      setDeletingInquiryId(null);
    }
  };

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "orgs") fetchOrgs();
    if (activeTab === "transactions") fetchTransactions();
    if (activeTab === "payments") fetchPayments();
    if (activeTab === "queries") fetchInquiries();
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

  const filteredInquiries = inquiries.filter((inq) => {
    const matchesSearch =
      inq.name.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      inq.email.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      (inq.company && inq.company.toLowerCase().includes(inquirySearch.toLowerCase())) ||
      (inq.message && inq.message.toLowerCase().includes(inquirySearch.toLowerCase()));

    const matchesStatus =
      inquiryStatusFilter === "ALL" ||
      inq.status.toUpperCase() === inquiryStatusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  // Explicit theme variables to guarantee ZERO color bleeding
  const bgClass = isDark ? "bg-slate-950 text-slate-100" : "bg-[#f8fafc] text-slate-900";
  const cardClass = isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200 shadow-sm text-slate-900";
  const tableHeaderClass = isDark ? "bg-slate-900/90 text-slate-400 border-slate-800" : "bg-slate-100 text-slate-700 border-slate-200 font-black";
  const tableRowClass = isDark ? "hover:bg-slate-800/40 border-slate-800/60 text-slate-200" : "hover:bg-slate-50 border-slate-200 text-slate-800";
  const inputClass = isDark
    ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500"
    : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm";
  const buttonSecClass = isDark
    ? "bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800"
    : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100 shadow-sm font-bold";

  return (
    <AdminOnlyGate>
      <div className={`min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-16 transition-colors font-sans ${bgClass}`}>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header & Title */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-500 border border-indigo-500/30 shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">Admin Management Hub</h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Manage users, Enterprise organizations, token audit trail, and user contact queries.
                </p>
              </div>
            </div>

            {/* Navigation Tabs (Scrollable on Mobile) */}
            <div className={`flex items-center gap-2 p-1.5 rounded-2xl border overflow-x-auto max-w-full shrink-0 ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-slate-200/80 border-slate-300 shadow-sm"
            }`}>
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "users"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-300/60"
                }`}
              >
                <Users className="w-4 h-4" />
                Users ({users.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("orgs")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "orgs"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-300/60"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Organizations ({orgs.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("transactions")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "transactions"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-300/60"
                }`}
              >
                <Receipt className="w-4 h-4" />
                Token Audit
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("payments")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "payments"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-300/60"
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                Fiat Payments ({payments.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("queries")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "queries"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-300/60"
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                User Queries ({inquiries.length})
              </button>
            </div>
          </div>

          {/* ── TAB 1: USERS DIRECTORY ─────────────────────────────────────────── */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by username or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-colors ${inputClass}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchUsers}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${buttonSecClass}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
                  Refresh Directory
                </button>
              </div>

              {/* Fully Responsive Scrollable Table */}
              <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardClass}`}>
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${tableHeaderClass}`}>
                        <th className="p-4">User</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Account Type</th>
                        <th className="p-4">Personal Balance</th>
                        <th className="p-4">Active Organization</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-medium">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
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
                          <tr key={u.id} className={`transition-colors ${tableRowClass}`}>
                            <td className="p-4 font-bold">
                              <div className={isDark ? "text-slate-100 font-bold" : "text-slate-900 font-extrabold"}>
                                {u.username}
                              </div>
                              <div className={isDark ? "text-[11px] text-slate-400 font-normal" : "text-[11px] text-slate-600 font-medium"}>
                                {u.email || "No email"}
                              </div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border ${
                                  u.role === "ADMIN"
                                    ? isDark
                                      ? "bg-violet-950/80 text-violet-300 border-violet-800"
                                      : "bg-violet-100 text-violet-800 border-violet-300 font-bold"
                                    : u.role === "PAID"
                                    ? isDark
                                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                                      : "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                                    : isDark
                                    ? "bg-slate-800 text-slate-300 border-slate-700"
                                    : "bg-slate-200 text-slate-800 border-slate-300 font-bold"
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className={`p-4 font-semibold ${isDark ? "text-slate-300" : "text-slate-800 font-bold"}`}>
                              {u.account_type || "—"}
                            </td>
                            <td className={`p-4 font-bold ${isDark ? "text-indigo-400" : "text-indigo-700 font-black"}`}>
                              {u.personal_token_balance.toLocaleString()} tokens
                            </td>
                            <td className="p-4">
                              {u.active_org_name ? (
                                <div className={`flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-slate-800 font-bold"}`}>
                                  <Building className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{u.active_org_name}</span>
                                  <span className={`text-[10px] uppercase ${isDark ? "text-slate-400" : "text-slate-600 font-semibold"}`}>
                                    ({u.active_org_role})
                                  </span>
                                </div>
                              ) : (
                                <span className={isDark ? "text-slate-500" : "text-slate-600 font-medium"}>None</span>
                              )}
                            </td>
                            <td className="p-4 text-right whitespace-nowrap">
                              {!u.active_org_id && u.account_type !== "ENTERPRISE" && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedUser(u)}
                                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    isDark
                                      ? "bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30"
                                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                                  }`}
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-400" />
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
            </div>
          )}

          {/* ── TAB 2: ORGANIZATIONS ───────────────────────────────────────────── */}
          {activeTab === "orgs" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={fetchOrgs}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${buttonSecClass}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOrgs ? "animate-spin" : ""}`} />
                  Refresh Orgs
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loadingOrgs ? (
                  <div className="col-span-full p-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
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
                      className={`p-6 rounded-3xl border space-y-4 relative overflow-hidden transition-all ${cardClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-black text-base ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                            {org.name}
                          </h3>
                          <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600 font-medium"}`}>
                            Owner: <strong>{org.owner_username}</strong>
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${
                            org.status === "ACTIVE"
                              ? isDark
                                ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                              : isDark
                              ? "bg-rose-950 text-rose-300 border-rose-800"
                              : "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                          }`}
                        >
                          {org.status}
                        </span>
                      </div>

                      <div className={`p-4 rounded-2xl border space-y-2 ${
                        isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200 shadow-inner"
                      }`}>
                        <div className="flex justify-between text-xs items-center">
                          <span className={isDark ? "text-slate-400" : "text-slate-600 font-bold"}>
                            Shared Token Pool:
                          </span>
                          <span className={`font-black ${isDark ? "text-indigo-400" : "text-indigo-700 text-sm"}`}>
                            {org.org_token_balance.toLocaleString()} tokens
                          </span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                          <span className={isDark ? "text-slate-400" : "text-slate-600 font-bold"}>
                            Active Members:
                          </span>
                          <span className={`font-black ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                            {org.active_member_count}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrg(org);
                            setNewBalance(org.org_token_balance.toString());
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                            isDark
                              ? "bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30"
                              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                          }`}
                        >
                          Set Balance
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(org)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            org.status === "ACTIVE"
                              ? isDark
                                ? "bg-rose-950/40 text-rose-300 border border-rose-800 hover:bg-rose-900/40"
                                : "bg-rose-600 text-white hover:bg-rose-700 shadow-md"
                              : isDark
                              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/40"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
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

          {/* ── TAB 3: TOKEN AUDIT TRANSACTIONS ───────────────────────────────── */}
          {activeTab === "transactions" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={fetchTransactions}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${buttonSecClass}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTx ? "animate-spin" : ""}`} />
                  Refresh Audit Trail
                </button>
              </div>

              <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardClass}`}>
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${tableHeaderClass}`}>
                        <th className="p-4">Tx ID</th>
                        <th className="p-4">Wallet Type</th>
                        <th className="p-4">Owner ID</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-medium">
                      {loadingTx ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
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
                          <tr key={tx.id} className={`transition-colors ${tableRowClass}`}>
                            <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-400">#{tx.id}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isDark
                                  ? "bg-slate-800 text-slate-300 border-slate-700"
                                  : "bg-slate-100 text-slate-800 border-slate-300"
                              }`}>
                                {tx.wallet_type}
                              </span>
                            </td>
                            <td className={`p-4 font-extrabold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{tx.wallet_owner_id}</td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  tx.type === "SIGNUP_GRANT"
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                    : tx.type === "PURCHASE"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {tx.type}
                              </span>
                            </td>
                            <td className="p-4 font-bold">
                              <span className={tx.amount >= 0 ? (isDark ? "text-emerald-400" : "text-emerald-700 font-extrabold") : (isDark ? "text-rose-400" : "text-rose-700 font-extrabold")}>
                                {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()} tokens
                              </span>
                            </td>
                            <td className={`p-4 whitespace-nowrap ${isDark ? "text-slate-400" : "text-slate-600 font-medium"}`}>
                              {new Date(tx.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: FIAT PAYMENTS ──────────────────────────────────────────── */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={fetchPayments}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${buttonSecClass}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPayments ? "animate-spin" : ""}`} />
                  Refresh Payments
                </button>
              </div>

              <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardClass}`}>
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${tableHeaderClass}`}>
                        <th className="p-4">Tx ID</th>
                        <th className="p-4">User ID</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Tokens Credited</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-medium">
                      {loadingPayments ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                            Loading fiat payment records...
                          </td>
                        </tr>
                      ) : payments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-500">
                            No Stripe fiat payment transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p.id} className={`transition-colors ${tableRowClass}`}>
                            <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-400">#{p.id}</td>
                            <td className={`p-4 font-extrabold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{p.user_id}</td>
                            <td className={`p-4 ${isDark ? "text-slate-300" : "text-slate-800 font-semibold"}`}>{p.customer_email || "—"}</td>
                            <td className={`p-4 font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                              ₹{(p.amount_inr || 0).toLocaleString()}
                            </td>
                            <td className={`p-4 font-black ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                              +{(p.tokens_credited || 0).toLocaleString()}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${
                                p.status === "succeeded"
                                  ? isDark
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : p.status === "pending"
                                  ? isDark
                                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                    : "bg-amber-100 text-amber-800 border-amber-300"
                                  : isDark
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  : "bg-rose-100 text-rose-800 border-rose-300"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {p.receipt_url ? (
                                <a
                                  href={p.receipt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                >
                                  View Receipt <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className={isDark ? "text-slate-600" : "text-slate-400"}>—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: USER QUERIES (CONTACT FORM SUBMISSIONS) ─────────────── */}
          {activeTab === "queries" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:max-w-xl">
                  <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, company, or query..."
                      value={inquirySearch}
                      onChange={(e) => setInquirySearch(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-indigo-500 transition-colors ${inputClass}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                    <select
                      value={inquiryStatusFilter}
                      onChange={(e) => setInquiryStatusFilter(e.target.value)}
                      className={`w-full sm:w-auto px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer ${inputClass}`}
                    >
                      <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Statuses</option>
                      <option value="NEW" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">New</option>
                      <option value="CONTACTED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Contacted</option>
                      <option value="IN_PROGRESS" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">In Progress</option>
                      <option value="RESOLVED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Resolved</option>
                      <option value="ARCHIVED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Archived</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchInquiries}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${buttonSecClass}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingInquiries ? "animate-spin" : ""}`} />
                  Refresh Queries
                </button>
              </div>

              {/* Fully Responsive Scrollable Table */}
              <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardClass}`}>
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${tableHeaderClass}`}>
                        <th className="p-4">Date & ID</th>
                        <th className="p-4">User Details</th>
                        <th className="p-4">Company & Phone</th>
                        <th className="p-4">User Query Message</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-medium">
                      {loadingInquiries ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                            Loading user queries...
                          </td>
                        </tr>
                      ) : filteredInquiries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-500">
                            No user queries found.
                          </td>
                        </tr>
                      ) : (
                        filteredInquiries.map((inq) => (
                          <tr key={inq.id} className={`transition-colors ${tableRowClass}`}>
                            <td className="p-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              <div className={`font-extrabold ${isDark ? "text-slate-200" : "text-slate-900"}`}>#{inq.id}</div>
                              <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600 font-medium"}`}>
                                {inq.created_at ? new Date(inq.created_at).toLocaleString() : "—"}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className={`font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>{inq.name}</div>
                              <a
                                href={`mailto:${inq.email}`}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Mail className="w-3 h-3 shrink-0" />
                                {inq.email}
                              </a>
                            </td>
                            <td className="p-4">
                              <div className={`font-bold ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                                {inq.company || "Individual"}
                              </div>
                              {inq.phone && (
                                <div className={`text-[11px] flex items-center gap-1 mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600 font-medium"}`}>
                                  <Phone className="w-3 h-3 shrink-0" />
                                  {inq.phone}
                                </div>
                              )}
                              {inq.team_size && (
                                <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-600 font-medium"}`}>Team: {inq.team_size}</div>
                              )}
                            </td>
                            <td className="p-4 max-w-xs">
                              <p className={`line-clamp-2 font-normal leading-relaxed ${isDark ? "text-slate-300" : "text-slate-800"}`}>
                                {inq.message || "No message content"}
                              </p>
                            </td>
                            <td className="p-4">
                              <select
                                value={inq.status}
                                disabled={updatingStatusId === inq.id}
                                onChange={(e) => handleUpdateStatus(inq.id, e.target.value)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border cursor-pointer focus:outline-none transition-colors ${
                                  inq.status === "NEW"
                                    ? isDark
                                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                      : "bg-amber-100 text-amber-800 border-amber-300"
                                    : inq.status === "CONTACTED" || inq.status === "IN_PROGRESS"
                                    ? isDark
                                      ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                                      : "bg-indigo-100 text-indigo-800 border-indigo-300"
                                    : inq.status === "RESOLVED"
                                    ? isDark
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : isDark
                                    ? "bg-slate-800 text-slate-400 border-slate-700"
                                    : "bg-slate-200 text-slate-800 border-slate-300"
                                }`}
                              >
                                <option value="NEW" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">NEW</option>
                                <option value="CONTACTED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">CONTACTED</option>
                                <option value="IN_PROGRESS" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">IN PROGRESS</option>
                                <option value="RESOLVED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">RESOLVED</option>
                                <option value="ARCHIVED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">ARCHIVED</option>
                              </select>
                            </td>
                            <td className="p-4 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() => setSelectedInquiry(inq)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  isDark
                                    ? "bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30"
                                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Query
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInquiry(inq.id)}
                                disabled={deletingInquiryId === inq.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                                  isDark
                                    ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                    : "bg-rose-600 text-white hover:bg-rose-700 shadow-md"
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL 1: PROMOTE USER TO ENTERPRISE OWNER ─────────────────────── */}
          {selectedUser && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              }`}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-black">Promote to Enterprise Owner</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      User: <strong>{selectedUser.username}</strong> ({selectedUser.email})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {promoteError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                      {promoteError}
                    </div>
                  )}

                  {promoteSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      {promoteSuccess}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Initial Organization Tokens
                    </label>
                    <input
                      type="number"
                      value={initialTokens}
                      onChange={(e) => setInitialTokens(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold focus:outline-none focus:border-indigo-500 ${inputClass}`}
                      placeholder="10000000"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                      Default is 10,000,000 tokens for the organization's shared token pool.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePromote}
                    disabled={promoting}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {promoting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Promoting…</>
                    ) : (
                      "Confirm Promotion"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL 2: SET ORG BALANCE ──────────────────────────────────────── */}
          {selectedOrg && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              }`}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-black">Set Organization Token Pool</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Organization: <strong>{selectedOrg.name}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrg(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      New Token Balance
                    </label>
                    <input
                      type="number"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold focus:outline-none focus:border-indigo-500 ${inputClass}`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrg(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSetBalance}
                    disabled={updatingOrg}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {updatingOrg ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                    ) : (
                      "Save Balance"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL 3: VIEW FULL USER QUERY DETAILS ───────────────────────────── */}
          {selectedInquiry && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              }`}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                        Query #{selectedInquiry.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${
                        selectedInquiry.status === "NEW"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30"
                          : selectedInquiry.status === "RESOLVED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30"
                      }`}>
                        {selectedInquiry.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-black mt-2">{selectedInquiry.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedInquiry(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Email Address</span>
                    <a
                      href={`mailto:${selectedInquiry.email}`}
                      className="block font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {selectedInquiry.email}
                    </a>
                  </div>
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Company & Team</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedInquiry.company || "Individual / Not specified"}
                    </div>
                    {selectedInquiry.team_size && (
                      <div className="text-slate-500">Team Size: {selectedInquiry.team_size}</div>
                    )}
                  </div>
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Phone Number</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedInquiry.phone || "Not provided"}
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Submitted At</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedInquiry.created_at ? new Date(selectedInquiry.created_at).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Full User Query / Message
                  </label>
                  <div className={`p-5 rounded-2xl border text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}>
                    {selectedInquiry.message || "No message content submitted."}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-500">Status:</span>
                    <select
                      value={selectedInquiry.status}
                      onChange={(e) => handleUpdateStatus(selectedInquiry.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none ${inputClass}`}
                    >
                      <option value="NEW" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">NEW</option>
                      <option value="CONTACTED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">CONTACTED</option>
                      <option value="IN_PROGRESS" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">IN PROGRESS</option>
                      <option value="RESOLVED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">RESOLVED</option>
                      <option value="ARCHIVED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">ARCHIVED</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <a
                      href={`mailto:${selectedInquiry.email}?subject=Re: Sigmavalue AI Pilot Inquiry`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Reply to User
                    </a>
                    <button
                      type="button"
                      onClick={() => setSelectedInquiry(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminOnlyGate>
  );
}
