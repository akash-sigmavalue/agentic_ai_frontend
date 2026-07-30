"use client";

import React, { useState } from "react";
import {
  Check, Coins, Zap, Building2, Mail, ArrowRight, Loader2,
  Users, Phone, MessageSquare, ChevronDown, Shield, Globe
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useRouter } from "next/navigation";
import { apiFetch, apiRequest } from "@/lib/api-client";

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
  const cardClass = isDark ? "bg-slate-900/60 border-slate-800 text-slate-100" : "bg-white border-slate-200 shadow-sm text-slate-900";
  const featCardClass = isDark ? "bg-slate-900 border-2 border-indigo-500/80 shadow-indigo-500/10 text-slate-100" : "bg-white border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 text-slate-900";

  return (
    <div className={`min-h-screen pt-24 px-4 sm:px-6 pb-20 transition-colors ${bgClass}`}>
      <div className="max-w-6xl mx-auto space-y-16">

        {/* ─── Header ─────────────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            Simple &amp; Transparent Pricing
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Pick Your Token Plan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Every user gets <strong className="text-slate-800 dark:text-slate-200">10,000 free tokens</strong> on signup.
            Upgrade whenever you need more. International cards accepted.
          </p>
        </div>

        {/* ─── Pricing Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">

          {/* TIER 1: FREE */}
          <div className={`p-8 rounded-3xl border flex flex-col justify-between space-y-6 transition-all ${cardClass}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Free Tier</span>
                <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  <Coins className="w-5 h-5" />
                </span>
              </div>
              <div>
                <div className="text-3xl font-black">Free</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto-credited on signup</p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-300">
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
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all"
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
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Individual Pro Pack</span>
                <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Zap className="w-5 h-5" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-100">₹5,000</span>
                  <span className="text-xs text-slate-400">/ pack</span>
                </div>
                <p className="text-xs text-indigo-300 font-bold mt-1">1,000,000 tokens per pack</p>
              </div>
              <div className="pt-4 border-t border-slate-800 space-y-3 text-xs text-slate-300">
                {[
                  "1,000,000 tokens added instantly",
                  "International cards accepted",
                  "UPI & NetBanking (India)",
                  "Tokens credited in seconds",
                  "No limit on repurchases",
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Accepted payment methods */}
              <div className="pt-3 border-t border-slate-800/60">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Accepted payment methods</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {["Visa", "Mastercard", "Amex", "UPI", "NetBanking"].map(m => (
                    <span key={m} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
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
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 ${
                isBuyDisabled
                  ? "bg-slate-800/90 border border-slate-700 text-slate-400 cursor-not-allowed shadow-none opacity-90"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 cursor-pointer"
              }`}
            >
              {buyingTokens ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout…</>
              ) : isBuyDisabled ? (
                <><Shield className="w-4 h-4 text-amber-400" /> {disabledNotice}</>
              ) : (
                <><Zap className="w-4 h-4" /> Buy 1M Token Pack — ₹5,000</>
              )}
            </button>

            <p className="text-[10px] text-slate-500 text-center -mt-2">
              Secured by Stripe · 256-bit SSL encryption
            </p>
          </div>

          {/* TIER 3: ENTERPRISE */}
          <div id="enterprise" className={`p-8 rounded-3xl border flex flex-col justify-between space-y-6 transition-all ${cardClass}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Enterprise Organization</span>
                <span className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Building2 className="w-5 h-5" />
                </span>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-100">Custom</div>
                <p className="text-xs text-slate-400 mt-1">Negotiated contract with sales team</p>
              </div>
              <div className="pt-4 border-t border-slate-800 space-y-3 text-xs text-slate-300">
                {[
                  "1 Owner + unlimited Employees",
                  "Shared organization token pool",
                  "Email-based member onboarding",
                  "Org-wide usage analytics",
                  "Dedicated support & SLA",
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setShowForm(true); document.getElementById("enterprise-form")?.scrollIntoView({ behavior: "smooth" }); }}
              className="w-full py-3 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 font-bold text-xs text-purple-300 transition-all flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Contact Us for Enterprise
            </button>
          </div>
        </div>

        {/* ─── Trust Bar ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs">
          {[
            { icon: <Shield className="w-4 h-4 text-emerald-400" />, title: "Secure Payments", desc: "All payments processed by Stripe with 256-bit SSL encryption." },
            { icon: <Globe className="w-4 h-4 text-indigo-400" />, title: "International Cards", desc: "Visa, Mastercard, Amex, Maestro — 135+ currencies accepted." },
            { icon: <Zap className="w-4 h-4 text-amber-400" />, title: "Instant Credits", desc: "Tokens credited to your wallet within seconds of payment confirmation." },
          ].map(item => (
            <div key={item.title} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-2">
              <div className="flex justify-center">{item.icon}</div>
              <div className="font-bold text-slate-200">{item.title}</div>
              <p className="text-slate-500 text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* ─── Enterprise Contact Form ──────────────────────────────────────────── */}
        <div id="enterprise-form" className="max-w-2xl mx-auto">
          <div
            className="p-7 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl cursor-pointer"
            onClick={() => setShowForm(v => !v)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-100">Enterprise Inquiry</h2>
                  <p className="text-xs text-slate-400">Our sales team will respond within 1–2 business days.</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${showForm ? "rotate-180" : ""}`} />
            </div>
          </div>

          {showForm && (
            <div className="mt-4 p-7 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
              {submitResult ? (
                <div className={`p-4 rounded-2xl text-sm font-medium text-center ${
                  submitResult.type === "success"
                    ? "bg-emerald-950/50 border border-emerald-800 text-emerald-300"
                    : "bg-rose-950/50 border border-rose-800 text-rose-300"
                }`}>
                  {submitResult.text}
                  {submitResult.type === "success" && (
                    <div className="mt-3 text-xs text-emerald-400 font-normal">
                      Check your inbox — we've sent a confirmation to your email.
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Full Name *</label>
                      <input
                        required
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your full name"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Work Email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@company.com"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Company Name *</label>
                      <input
                        required
                        type="text"
                        value={form.company}
                        onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                        placeholder="Acme Corp"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Phone (optional)</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Team Size</label>
                    <div className="flex flex-wrap gap-2">
                      {TEAM_SIZES.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, team_size: size }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            form.team_size === size
                              ? "bg-indigo-600 text-white border-indigo-500"
                              : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Message (optional)</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      rows={4}
                      placeholder="Tell us about your use case, required integrations, or any specific questions..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
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

                  <p className="text-[11px] text-slate-500 text-center">
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
