"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mail,
  ArrowRight,
  Sparkles,
  Lock,
  Building2,
  CheckCircle2,
  ChevronLeft,
  X,
  Loader2,
  Bot,
  Send,
  Globe,
  TrendingUp,
  MapPin,
  Search,
  BarChart2,
  Layers,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api-client";

// ── Agent Metadata Map ────────────────────────────────────────────────────────
export interface AgentInfo {
  title: string;
  category: string;
  subtitle: string;
  description: string;
  features: string[];
  demoVideoPoster?: string;
  gradient: string;
}

export const AGENT_INFO_MAP: Record<string, AgentInfo> = {
  data_retrieval: {
    title: "Location Intelligence Agent",
    category: "Geospatial AI",
    subtitle: "Map-based radius analysis & POI spatial scoring",
    description: "Extract location metrics, nearby infrastructure, transit accessibility, and spatial radius scores across Indian real estate markets.",
    features: [
      "Radius POI Extraction & Categorization",
      "Transit & Highway Proximity Scoring",
      "Geospatial Heatmap Visualization",
      "Micro-Market Location Benchmarking",
    ],
    gradient: "from-sky-500 to-cyan-600",
  },
  visualization_agent: {
    title: "GIS & Spatial Visualization",
    category: "Geospatial AI",
    subtitle: "Interactive mapping & spatial insights engine",
    description: "Multi-layered interactive GIS visualization for land parcels, elevation contours, and zone classification.",
    features: [
      "Interactive Multi-Layer GIS Maps",
      "Elevation & Slope Overlays",
      "Parcel Boundary Detection",
      "Custom Spatial Report Generation",
    ],
    gradient: "from-blue-500 to-indigo-600",
  },
  web_search: {
    title: "Market Research Agent",
    category: "Market Intelligence",
    subtitle: "Real-time web search & market news analysis",
    description: "Aggregates real-time real estate news, developer announcements, transactional signals, and pricing sentiment.",
    features: [
      "Live Real Estate Web Search",
      "Source Citation & Fact Verification",
      "Micro-Market Sentiment Analysis",
      "Developer & Competitor Intelligence",
    ],
    gradient: "from-amber-500 to-orange-600",
  },
  feasibility: {
    title: "Feasibility Agent",
    category: "Financial & ROI Models",
    subtitle: "Construction cost models & investor IRR calculator",
    description: "Simulate project feasibility, floor plate construction costs, revenue timeline projections, and investor return metrics.",
    features: [
      "Construction Timetable & Cost Projections",
      "Revenue P2 & Velocity Forecasts",
      "Investor IRR & Waterfall Scenarios",
      "Parking & FAR Area Optimizers",
    ],
    gradient: "from-rose-500 to-pink-600",
  },
  maharera_agent: {
    title: "MahaRERA Regulatory Agent",
    category: "Compliance & Legal AI",
    subtitle: "RERA project verification & promoter track record",
    description: "Automated browser-agent that extracts verified RERA filings, financial disclosures, litigation history, and project completion dates.",
    features: [
      "Automated RERA Registration Lookup",
      "Promoter Litigation & Track Record Audit",
      "Quarterly Progress Report Extraction",
      "Compliance Status Monitoring",
    ],
    gradient: "from-emerald-500 to-teal-600",
  },
  elevation: {
    title: "Elevation & Terrain Agent",
    category: "Physical AI & Topography",
    subtitle: "3D topographical mesh & slope classification",
    description: "Fetch high-resolution elevation data, generate 3D site meshes, calculate earthwork volumes, and evaluate site drainage slope.",
    features: [
      "High-Resolution Contour Extraction",
      "Interactive 3D Terrain Mesh Viewer",
      "Slope Classification & Cut/Fill Calculations",
      "Exportable Elevation CSV Data",
    ],
    gradient: "from-purple-500 to-violet-600",
  },
  user_input: {
    title: "Document & User Input Agent",
    category: "Data Extraction",
    subtitle: "OCR & unstructured document parsing",
    description: "Upload title deeds, sale deeds, floor plans, and layout drawings to extract structured JSON data for valuation models.",
    features: [
      "PDF & Image Deed OCR Parsing",
      "Automatic Key Term Extraction",
      "Document Anomaly Detection",
      "Structured JSON Export",
    ],
    gradient: "from-slate-700 to-slate-900",
  },
  ui_creation: {
    title: "UI & Workflow Creation Agent",
    category: "Workflow Automation",
    subtitle: "Custom dashboard generator & widget builder",
    description: "Generate tailored workflow interfaces and real estate decision dashboards on the fly using natural language commands.",
    features: [
      "Natural Language UI Generation",
      "Custom Real Estate KPI Widgets",
      "Drag-and-Drop Layout Editor",
      "One-Click Dashboard Sharing",
    ],
    gradient: "from-violet-600 to-fuchsia-600",
  },
  connector: {
    title: "Enterprise Connectors & API Agent",
    category: "Integration Engine",
    subtitle: "Connect CRM, ERP, and internal databases",
    description: "Integrate Sigmavalue AI Pilot with Salesforce, SAP, Oracle, and internal SQL databases for automated data synchronization.",
    features: [
      "Salesforce & CRM Synchronization",
      "Custom SQL / REST API Connectors",
      "Bi-Directional Data Syncing",
      "Role-Based Audit Logs",
    ],
    gradient: "from-cyan-600 to-blue-700",
  },
};

import { useTheme } from "@/hooks/use-theme";

interface AgentDemoGuardProps {
  agentKey?: string;
  customTitle?: string;
}

export default function AgentDemoGuard({ agentKey = "data_retrieval", customTitle }: AgentDemoGuardProps) {
  const { user } = useAuth();
  const isDark = useTheme();

  const bgClass = isDark ? "bg-[#090d16] text-slate-100" : "bg-[#f8fafc] text-slate-900";
  const info = AGENT_INFO_MAP[agentKey] || {
    title: customTitle || "Specialized AI Agent",
    category: "Enterprise Module",
    subtitle: "Advanced Real Estate AI Intelligence",
    description: "This specialized AI agent is currently restricted to administrators and enterprise plan accounts.",
    features: [
      "Multi-Agent Workflow Integration",
      "High-Priority GPU Inference",
      "Custom Real Estate Analytics",
      "Dedicated Enterprise Support",
    ],
    gradient: "from-indigo-600 to-violet-600",
  };

  // Video player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Modal contact form state
  const defaultCompany = user?.email && user.email.includes('@')
    ? user.email.split('@')[1].split('.')[0].toUpperCase() + " Corp"
    : user?.username
    ? `${user.username} Organization`
    : "Individual / Organization";

  const [showContactModal, setShowContactModal] = useState(false);
  const [form, setForm] = useState({
    name: user?.username || "",
    email: user?.email || "",
    company: defaultCompany,
    phone: "",
    message: `Interested in accessing the ${info.title} module.`,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg("Name and Email are required.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await apiRequest("/contact/enterprise", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Submission failed.");
      }
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`min-h-screen w-full pt-24 pb-16 px-4 sm:px-6 relative overflow-hidden font-sans transition-colors ${bgClass}`}>
      {/* Ambient background glows */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        {/* Top Navigation / Breadcrumb */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
          <Link
            href="/valuation"
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Valuation Agent
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            <Lock className="w-3 h-3" /> Admin / Enterprise Module
          </div>
        </div>

        {/* Hero Header */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> {info.category}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {info.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed font-medium">
            {info.description}
          </p>
        </div>

        {/* ── Demo Video Player Card ────────────────────────────────────────── */}
        <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xl overflow-hidden backdrop-blur-xl transition-colors">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-950/60 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                  Live Agent Demo Preview
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-mono text-[11px]">4K DEMO SIMULATION</span>
            </div>
            <div className="px-2.5 py-0.5 rounded-md bg-indigo-950 border border-indigo-800 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
              Preview Mode
            </div>
          </div>

          {/* Interactive Simulated Video Container */}
          <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden group">
            {/* Animated Demo Visual Canvas */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-6 group-hover:scale-105 transition-transform duration-300">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight max-w-lg">
                {info.title} Workflow Simulation
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-md">
                {info.subtitle}
              </p>

              {/* Dynamic Simulated Capability Badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-xl">
                {info.features.map((feat) => (
                  <span
                    key={feat}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Video Controls Overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? "Pause Demo" : "Play Demo"}
              </button>

              <div className="flex-1 hidden sm:flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400">01:24</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                </div>
                <span className="text-[11px] font-mono text-slate-500">02:30</span>
              </div>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Action Section: Contact Us CTA ──────────────────────────────── */}
        <div className={`rounded-3xl border p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-xl transition-all ${
          isDark
            ? "bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border-indigo-500/30 shadow-2xl text-white"
            : "bg-gradient-to-br from-white via-indigo-50/60 to-slate-50 border-indigo-200/80 shadow-xl text-slate-900"
        }`}>
          <div className="space-y-3 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" /> Enterprise Early Access
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Want access to {info.title}?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
              We are rolling out specialized AI agents to enterprise partners and early access users. Contact our team to schedule a custom demo or unlock access for your organization.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              Contact Us for Access
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Contact Us Modal ────────────────────────────────────────────────── */}
      {showContactModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
            isDark
              ? "bg-[#0f172a] border border-slate-800 text-slate-100"
              : "bg-white border border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${
              isDark ? "border-slate-800" : "border-slate-200"
            }`}>
              <div>
                <h3 className="text-xl font-black">Contact Us</h3>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500 font-medium"}`}>
                  Request access to {info.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className={`p-2 rounded-xl transition-colors ${
                  isDark
                    ? "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
                    : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold">Inquiry Sent Successfully!</h4>
                <p className={`text-xs max-w-xs mx-auto ${isDark ? "text-slate-400" : "text-slate-600 font-medium"}`}>
                  Our enterprise team will reach out to <strong className={isDark ? "text-slate-200" : "text-slate-900 font-bold"}>{form.email}</strong> shortly with custom access details.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setShowContactModal(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-medium focus:outline-none transition-colors border ${
                      isDark
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600"
                    }`}
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-medium focus:outline-none transition-colors border ${
                      isDark
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600"
                    }`}
                    placeholder="name@company.com"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    required
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-medium focus:outline-none transition-colors border ${
                      isDark
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600"
                    }`}
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Message
                  </label>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-medium focus:outline-none transition-colors border resize-none ${
                      isDark
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600"
                    }`}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    className={`px-5 py-3 rounded-xl text-xs font-bold transition-colors ${
                      isDark
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-extrabold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="w-3.5 h-3.5" /> Submit Request</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
