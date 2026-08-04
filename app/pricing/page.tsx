"use client";

import React, { useState } from "react";
import {
  Check, Coins, Zap, Building2, Mail, ArrowRight, Loader2,
  Users, Phone, MessageSquare, ChevronDown, Shield, Globe, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "next/navigation";
import { apiFetch, apiRequest, API_ROUTES } from "@/lib/api-client";

// ─── Contact Form State ────────────────────────────────────────────────────────
interface ContactForm {
  name: string;
  email: string;
  company: string;
  phone: string;
  team_size: string;
  message: string;
}

const TEAM_SIZES = ["1–5", "5–20", "20–100", "100–500", "500+"];

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Payment state
  const [buyingTokens, setBuyingTokens] = useState(false);

  // Role & Enterprise checks
  const isAdmin = user?.role === 'ADMIN';
  const isEnterprise = !!user?.active_org;
  const isEnterpriseOwner = user?.active_org?.org_role === 'OWNER';

  let disabledNotice = '';
  if (isAdmin) {
    disabledNotice = 'Admin Account — Unlimited System Access';
  } else if (isEnterpriseOwner) {
    disabledNotice = 'Enterprise Owner — Managed via Enterprise Billing';
  } else if (isEnterprise) {
    disabledNotice = 'Enterprise Member — Covered by Org Token Pool';
  }

  const isBuyDisabled = buyingTokens || isAdmin || isEnterprise;

  // Contact form state with smart default pre-filled text
  const defaultCompany = user?.email && user.email.includes('@')
    ? user.email.split('@')[1].split('.')[0].toUpperCase() + " Corp"
    : user?.username
      ? `${user.username} Organization`
      : "Individual / Organization";

  const [form, setForm] = useState<ContactForm>({
    name: user?.username || "",
    email: user?.email || "",
    company: defaultCompany,
    phone: "",
    team_size: "5–20",
    message: "Interested in Enterprise Organization Plan for Sigmavalue AI Pilot.",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Custom Enterprise Offer state
  const [enterpriseOffer, setEnterpriseOffer] = useState<{
    id: number;
    offered_price_inr: number;
    offered_tokens: number;
    org_name: string | null;
    note: string | null;
  } | null>(null);
  const [payingEnterprise, setPayingEnterprise] = useState(false);

  React.useEffect(() => {
    if (user) {
      apiFetch<{ has_offer: boolean; offer: any }>(API_ROUTES.enterpriseMyOffer)
        .then((res) => {
          if (res?.has_offer && res?.offer) {
            setEnterpriseOffer(res.offer);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handlePayEnterpriseOffer = async () => {
    if (!user) { router.push("/auth"); return; }
    setPayingEnterprise(true);
    try {
      const data = await apiFetch<{ checkout_url: string }>(API_ROUTES.paymentCreateEnterpriseCheckoutSession, {
        method: "POST",
      });
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("Checkout URL missing");
      }
    } catch (err: any) {
      alert(err.message || "Failed to start enterprise checkout.");
      setPayingEnterprise(false);
    }
  };

  // Auto-scroll & expand contact form when hash is #enterprise-form or #enterprise-contact
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#enterprise-form' || hash === '#enterprise-contact' || window.location.search.includes('contact=true')) {
        setShowForm(true);
        setTimeout(() => {
          document.getElementById("enterprise-form")?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, []);

  const handleBuyTokens = async () => {
    if (!user) { router.push("/auth"); return; }
    setBuyingTokens(true);
    try {
      const data = await apiFetch<{ checkout_url: string }>("/payments/create-checkout-session", {
        method: "POST",
      });
      window.location.href = data.checkout_url;
    } catch (err: any) {
      alert(err.message || "Failed to create checkout session. Please try again.");
      setBuyingTokens(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) {
      setSubmitResult({ type: "error", text: "Name, email, and company are required." });
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await apiRequest("/contact/enterprise", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Submission failed.");
      setSubmitResult({ type: "success", text: data.message });
      setForm({ name: "", email: "", company: "", phone: "", team_size: "", message: "" });
    } catch (err: any) {
      setSubmitResult({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const isDark = useTheme();
  const bgClass = isDark ? "bg-slate-950 text-slate-100" : "bg-[#f8fafc] text-slate-900";
  const cardClass = isDark ? "bg-slate-900 border-slate-800 text-slate-100 shadow-xl" : "bg-white border-slate-200 shadow-sm text-slate-900";
  const featCardClass = isDark ? "bg-slate-900 border-2 border-indigo-500/80 shadow-indigo-500/10 text-slate-100" : "bg-white border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 text-slate-900";

  return (
    <div className={`min-h-screen pt-24 px-4 sm:px-6 pb-20 transition-colors ${bgClass}`}>
      <div className="max-w-6xl mx-auto space-y-16">

        {/* ─── Header ─────────────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className={`px-3.5 py-1 mb-5 rounded-full text-xs font-black uppercase tracking-wider border ${isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border-indigo-200"
            }`}>
            Simple &amp; Transparent Pricing
          </span>
          <h1 className={`text-3xl sm:text-5xl mt-5 font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            Pick Your Token Plan
          </h1>
          <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Every user gets <strong className={isDark ? "text-slate-200" : "text-slate-800"}>10,000 free tokens</strong> on signup.
            Upgrade whenever you need more. International cards accepted.
          </p>
        </div>

        {/* ─── CUSTOM ENTERPRISE OFFER BANNER (If issued by Admin) ───────────── */}
        {enterpriseOffer && (
          <div className={`mb-8 p-6 md:p-8 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
            isDark
              ? "bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 border-amber-500/40 text-slate-100"
              : "bg-gradient-to-r from-amber-50 via-white to-indigo-50 border-amber-300 text-slate-900"
          }`}>
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  <Zap className="w-3.5 h-3.5" />
                  Custom Enterprise Offer Ready
                </div>
                <h2 className="text-2xl font-black">
                  {enterpriseOffer.org_name || "Enterprise Organization Plan"}
                </h2>
                <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {enterpriseOffer.note || "Admin has generated a negotiated enterprise offer for your organization workspace."}
                </p>
                <div className="flex items-center gap-8 pt-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Token Allocation</span>
                    <span className="text-xl font-black text-amber-500">{enterpriseOffer.offered_tokens.toLocaleString()} tokens</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Negotiated Price</span>
                    <span className="text-xl font-black text-emerald-500">₹{enterpriseOffer.offered_price_inr.toLocaleString()} INR</span>
                  </div>
                </div>
              </div>

              <div className="self-center">
                <button
                  onClick={handlePayEnterpriseOffer}
                  disabled={payingEnterprise}
                  className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-amber-500/25 transition-all disabled:opacity-50"
                >
                  {payingEnterprise ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting to Stripe...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Pay ₹{enterpriseOffer.offered_price_inr.toLocaleString()} & Activate Enterprise Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Pricing Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">

          {/* TIER 1: FREE */}
          <div className={`p-8 rounded-3xl border flex flex-col justify-between space-y-6 transition-all ${cardClass}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Free Tier</span>
                <span className={`p-2 rounded-xl border ${isDark ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  <Coins className="w-5 h-5" />
                </span>
              </div>
              <div>
                <div className={`text-3xl font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>Free</div>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Auto-credited on signup</p>
              </div>
              <div className={`pt-4 border-t space-y-3 text-xs ${isDark ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                {["10,000 tokens included at signup", "Full Valuation Agent access", "No approval required", "Tokens never expire"].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => router.push(user ? "/valuation" : "/auth")}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all border ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                }`}
            >
              {user ? "Go to Agent →" : "Get Started Free →"}
            </button>
          </div>

          {/* TIER 2: INDIVIDUAL PRO — MOST POPULAR */}
          <div className={`p-8 rounded-3xl flex flex-col justify-between space-y-6 relative transition-all ${featCardClass}`}>
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap">
              Most Popular
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>Individual Pro Pack</span>
                <span className={`p-2 rounded-xl border ${isDark ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}>
                  <Zap className="w-5 h-5" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>₹5,000</span>
                  <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>/ pack</span>
                </div>
                <p className={`text-xs font-bold mt-1 ${isDark ? "text-indigo-300" : "text-indigo-600"}`}>1,000,000 tokens per pack</p>
              </div>
              <div className={`pt-4 border-t space-y-3 text-xs font-medium ${isDark ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-700"}`}>
                {[
                  "1,000,000 tokens added instantly",
                  "International cards accepted",
                  "UPI & NetBanking (India)",
                  "Tokens credited in seconds",
                  "No limit on repurchases",
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Accepted payment methods */}
              <div className={`pt-3 border-t ${isDark ? "border-slate-800/60" : "border-slate-200"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Accepted payment methods</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {["Visa", "Mastercard", "Amex", "UPI", "NetBanking"].map(m => (
                    <span key={m} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              id="pricing-buy-token-pack"
              onClick={handleBuyTokens}
              disabled={isBuyDisabled}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 ${isBuyDisabled
                ? isDark ? "bg-slate-800/90 border border-slate-700 text-slate-400 cursor-not-allowed shadow-none opacity-90" : "bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed shadow-none opacity-90"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 cursor-pointer"
                }`}
            >
              {buyingTokens ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout…</>
              ) : isBuyDisabled ? (
                <><Shield className="w-4 h-4 text-amber-500" /> {disabledNotice}</>
              ) : (
                <><Zap className="w-4 h-4" /> Buy 1M Token Pack — ₹5,000</>
              )}
            </button>

            <p className={`text-[10px] text-center -mt-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Secured by Stripe · 256-bit SSL encryption
            </p>
          </div>

          {/* TIER 3: ENTERPRISE */}
          <div id="enterprise" className={`p-8 rounded-3xl border flex flex-col justify-between space-y-6 transition-all ${cardClass}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-purple-400" : "text-purple-600"}`}>Enterprise Organization</span>
                <span className={`p-2 rounded-xl border ${isDark ? "bg-purple-600/20 text-purple-400 border-purple-500/30" : "bg-purple-50 text-purple-600 border-purple-200"}`}>
                  <Building2 className="w-5 h-5" />
                </span>
              </div>
              <div>
                <div className={`text-3xl font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>Custom</div>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Negotiated contract with sales team</p>
              </div>
              <div className={`pt-4 border-t space-y-3 text-xs ${isDark ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                {[
                  "1 Owner + unlimited Employees",
                  "Shared organization token pool",
                  "Email-based member onboarding",
                  "Org-wide usage analytics",
                  "Dedicated support & SLA",
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setShowForm(true); document.getElementById("enterprise-form")?.scrollIntoView({ behavior: "smooth" }); }}
              className={`w-full py-3 px-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${isDark ? "bg-purple-600/20 hover:bg-purple-600/30 border-purple-600/30 text-purple-300" : "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                }`}
            >
              <Mail className="w-4 h-4" />
              Contact Us for Enterprise
            </button>
          </div>
        </div>

        {/* ─── Trust Bar ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs">
          {[
            { icon: <Shield className="w-4 h-4 text-emerald-500" />, title: "Secure Payments", desc: "All payments processed by Stripe with 256-bit SSL encryption." },
            { icon: <Globe className="w-4 h-4 text-indigo-500" />, title: "International Cards", desc: "Visa, Mastercard, Amex, Maestro — 135+ currencies accepted." },
            { icon: <Zap className="w-4 h-4 text-amber-500" />, title: "Instant Credits", desc: "Tokens credited to your wallet within seconds of payment confirmation." },
          ].map(item => (
            <div key={item.title} className={`p-5 rounded-2xl border space-y-2 ${cardClass}`}>
              <div className="flex justify-center">{item.icon}</div>
              <div className={`font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{item.title}</div>
              <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* ─── Enterprise Contact Form ──────────────────────────────────────────── */}
        <div id="enterprise-form" className="max-w-2xl mx-auto">
          <div
            className={`p-7 rounded-3xl border shadow-xl cursor-pointer transition-colors ${cardClass}`}
            onClick={() => setShowForm(v => !v)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${isDark ? "bg-purple-600/20 border-purple-500/30 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-600"
                  }`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-lg font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>Enterprise Inquiry</h2>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-900"}`}>Our sales team will respond within 1–2 business days.</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isDark ? "text-slate-400" : "text-slate-900"} ${showForm ? "rotate-180" : ""}`} />
            </div>
          </div>

          {showForm && (
            <div className={`mt-4 p-7 rounded-3xl border space-y-5 shadow-lg ${cardClass}`}>
              {submitResult ? (
                <div className={`p-4 rounded-2xl text-sm font-medium text-center border ${submitResult.type === "success"
                  ? isDark ? "bg-emerald-950/50 border-emerald-800 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : isDark ? "bg-rose-950/50 border-rose-800 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}>
                  {submitResult.text}
                  {submitResult.type === "success" && (
                    <div className={`mt-3 text-xs font-normal ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                      Check your inbox — we've sent a confirmation to your email.
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Full Name *</label>
                      <input
                        required
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your full name"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:border-indigo-500 ${isDark
                          ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500"
                          : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                          }`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Work Email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@company.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:border-indigo-500 ${isDark
                          ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500"
                          : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                          }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Company Name *</label>
                      <input
                        required
                        type="text"
                        value={form.company}
                        onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                        placeholder="Acme Corp"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:border-indigo-500 ${isDark
                          ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500"
                          : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                          }`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Phone (optional)</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:border-indigo-500 ${isDark
                          ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500"
                          : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                          }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Team Size</label>
                    <div className="flex flex-wrap gap-2">
                      {TEAM_SIZES.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, team_size: size }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${form.team_size === size
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : isDark
                              ? "bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-500"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:border-indigo-500"
                            }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Message (optional)</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      rows={4}
                      placeholder="Tell us about your use case, required integrations, or any specific questions..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:border-indigo-500 resize-none ${isDark
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500"
                        : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                        }`}
                    />
                  </div>

                  <button
                    type="submit"
                    id="enterprise-contact-submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-sm text-white transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    ) : (
                      <><Mail className="w-4 h-4" /> Send Enterprise Inquiry</>
                    )}
                  </button>

                  <p className={`text-[11px] text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    By submitting, you agree to be contacted by our sales team.
                    We'll never share your info.
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
