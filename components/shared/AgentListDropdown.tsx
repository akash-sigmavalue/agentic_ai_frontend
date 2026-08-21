"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Code2,
  Database,
  FileText,
  FolderKanban,
  Globe2,
  Handshake,
  Home,
  Lightbulb,
  LineChart,
  LayoutDashboard,
  Lock,
  MapPinned,
  MonitorCog,
  Plug,
  Scale,
  Search,
  Server,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

interface AgentLayer {
  id: string;
  layer: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  soft: string;
  agents: {
    name: string;
    icon: LucideIcon;
    href?: string;
    /** Internal key used for role-based access checks */
    key?: string;
  }[];
}

interface AgentListDropdownProps {
  onNavigate?: () => void;
}

/**
 * Central permission config.
 * ADMIN: all agents (*)
 * FREE: only valuation
 * PAID: placeholder — same as FREE for now
 */
const ALLOWED_AGENTS_BY_ROLE: Record<string, string[] | "*"> = {
  ADMIN: "*",
  FREE: ["valuation"],
  PAID: ["valuation", "rera_automation", "web_automation"],
};

const agentLayers: AgentLayer[] = [
  {
    id: "specialized",
    layer: "Layer 1",
    title: "Specialized Agents",
    description: "Domain specialists that interpret markets, assets, feasibility, and physical context.",
    icon: BrainCircuit,
    accent: "text-blue-600 border-blue-100 bg-blue-50 dark:text-blue-400 dark:border-blue-900 dark:bg-blue-950/50",
    soft: "from-blue-500/10 to-cyan-500/10",
    agents: [
      { name: "Land/GIS", icon: MapPinned, href: "/visualization_agent", key: "visualization_agent" },
      { name: "Elevation Agent", icon: MapPinned, href: "/elevation", key: "elevation" },
      { name: "Valuation", icon: BarChart3, href: "/valuation", key: "valuation" },
      { name: "Market Research", icon: Search, href: "/market_research", key: "market_research" },
      { name: "Physical AI", icon: Bot, key: "physical_ai" },
      { name: "Feasibility", icon: ClipboardCheck, href: "/feasibility", key: "feasibility" },
      { name: "Value Creation Agent", icon: Lightbulb, key: "value_creation" },
    ],
  },
  {
    id: "data",
    layer: "Layer 2",
    title: "Data Agents",
    description: "Input, retrieval, and evidence agents that keep the workflow grounded in source data.",
    icon: Database,
    accent: "text-indigo-600 border-indigo-100 bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900 dark:bg-indigo-950/50",
    soft: "from-indigo-500/10 to-sky-500/10",
    agents: [
      { name: "Document Intelligence Agent", icon: FileText, href: "/user_input", key: "user_input" },
      { name: "Live Data Intelligence Agent", icon: Globe2, href: "/web_search", key: "web_search" },
      { name: "Transaction Intelligence Agent", icon: Server, href: "/data_retrieval", key: "data_retrieval" },
      { name: "RERA Automation", icon: Building2, href: "/maharera_agent", key: "rera_automation" },
      { name: "Web Automation", icon: Bot, href: "/web_automation", key: "web_automation" },
      { name: "Analytics", icon: LineChart, key: "analytics" },
      { name: "Legal", icon: Scale, key: "legal" },
    ],
  },
  {
    id: "solution",
    layer: "Layer 3",
    title: "Solution Creation Agents",
    description: "Creation and operations agents that turn analysis into executable business workflows.",
    icon: Code2,
    accent: "text-violet-600 border-violet-100 bg-violet-50 dark:text-violet-400 dark:border-violet-900 dark:bg-violet-950/50",
    soft: "from-violet-500/10 to-fuchsia-500/10",
    agents: [
      { name: "Portfolio Management Agent", icon: LayoutDashboard, href: "/portfolio-management", key: "portfolio_management" },
      { name: "Generative Interface", icon: MonitorCog, href: "/ui_creation", key: "ui_creation" },
      { name: "Autonomous Relationship Agent", icon: Handshake, key: "crm" },
      { name: "Autonomous Real Estate ERP Agent", icon: Building2, key: "erp" },
      { name: "Property Management Agent", icon: Home, key: "property_mgmt" },
      { name: "Solution Engine", icon: Settings, key: "solution_engine" },
      { name: "Project Management", icon: FolderKanban, key: "project_mgmt" },
    ],
  },
  {
    id: "workspace",
    layer: "Layer 4",
    title: "Workspace Agents",
    description: "Collaboration agents that connect people, tools, and shared execution spaces.",
    icon: Users,
    accent: "text-emerald-600 border-emerald-100 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:bg-emerald-950/50",
    soft: "from-emerald-500/10 to-teal-500/10",
    agents: [
      { name: "Connector", icon: Plug, href: "/connector", key: "connector" },
      { name: "Team Collaboration", icon: Users, key: "team" },
    ],
  },
];

// High contrast Layer icon badge helper
const getLayerIconBadgeClass = (layerId: string, isActive: boolean, isDark: boolean) => {
  if (isActive) {
    if (layerId === "specialized") return isDark ? "bg-blue-900/80 border-blue-700 text-blue-300" : "bg-blue-600 border-blue-700 text-white shadow-sm font-bold";
    if (layerId === "data") return isDark ? "bg-indigo-900/80 border-indigo-700 text-indigo-300" : "bg-indigo-600 border-indigo-700 text-white shadow-sm font-bold";
    if (layerId === "solution") return isDark ? "bg-violet-900/80 border-violet-700 text-violet-300" : "bg-violet-600 border-violet-700 text-white shadow-sm font-bold";
    if (layerId === "workspace") return isDark ? "bg-emerald-900/80 border-emerald-700 text-emerald-300" : "bg-emerald-600 border-emerald-700 text-white shadow-sm font-bold";
  }
  return isDark
    ? "bg-slate-900 border-slate-800 text-slate-400"
    : "bg-slate-200 border-slate-300 text-slate-700 font-bold";
};

// High contrast Agent icon badge helper
const getAgentIconBadgeClass = (layerId: string, hasHref: boolean, isDark: boolean) => {
  if (!hasHref) {
    return isDark
      ? "bg-slate-800 border-slate-700 text-slate-400"
      : "bg-slate-200 border-slate-300 text-slate-800 font-bold";
  }
  if (layerId === "specialized") {
    return isDark
      ? "bg-blue-900/80 border-blue-700 text-blue-300"
      : "bg-blue-600 border-blue-700 text-white shadow-sm";
  }
  if (layerId === "data") {
    return isDark
      ? "bg-indigo-900/80 border-indigo-700 text-indigo-300"
      : "bg-indigo-600 border-indigo-700 text-white shadow-sm";
  }
  if (layerId === "solution") {
    return isDark
      ? "bg-violet-900/80 border-violet-700 text-violet-300"
      : "bg-violet-600 border-violet-700 text-white shadow-sm";
  }
  return isDark
    ? "bg-emerald-900/80 border-emerald-700 text-emerald-300"
    : "bg-emerald-600 border-emerald-700 text-white shadow-sm";
};

export default function AgentListDropdown({ onNavigate }: AgentListDropdownProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isDark = useTheme();

  const [isAgentsOpen, setIsAgentsOpen] = useState(false);
  const [activeAgentLayerId, setActiveAgentLayerId] = useState(agentLayers[0].id);

  // Mobile open layer category state (defaults to layer 1)
  const [mobileExpandedLayer, setMobileExpandedLayer] = useState<string | null>("specialized");

  const activeAgentLayer =
    agentLayers.find((layer) => layer.id === activeAgentLayerId) ?? agentLayers[0];
  const ActiveAgentLayerIcon = activeAgentLayer.icon;

  const userRole = user?.role ?? "FREE";
  const allowedAgents = ALLOWED_AGENTS_BY_ROLE[userRole] ?? ALLOWED_AGENTS_BY_ROLE["FREE"];

  const isAgentAllowed = (agentKey: string | undefined) => {
    if (!agentKey) return false;
    if (allowedAgents === "*") return true;
    return allowedAgents.includes(agentKey);
  };

  const handleAgentClick = (href?: string) => {
    if (!href) return;
    setIsAgentsOpen(false);
    if (onNavigate) onNavigate();
    router.push(href);
  };

  return (
    <div className="relative w-full lg:w-auto">
      {/* ── AGENTS BUTTON ────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsAgentsOpen((open) => !open)}
        className={`group inline-flex h-11 lg:h-10 w-full lg:w-auto items-center justify-between lg:justify-start gap-2.5 rounded-2xl lg:rounded-full border px-4 text-xs lg:text-[11px] font-extrabold uppercase tracking-[0.16em] shadow-sm transition-all duration-200 cursor-pointer ${isAgentsOpen
            ? "border-violet-500 bg-violet-600 text-white shadow-violet-500/30"
            : isDark
              ? "border-slate-800 bg-slate-900 text-slate-200 hover:border-violet-500/50 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-800 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 shadow-sm"
          }`}
        aria-expanded={isAgentsOpen}
        aria-controls="top-nav-agent-layers"
      >
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet-400 lg:text-current shrink-0" />
          <span>Agents ({agentLayers.reduce((acc, l) => acc + l.agents.length, 0)})</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isAgentsOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {/* ── 1. DESKTOP MEGA-MENU DROPDOWN (lg:flex) ───────────────────────── */}
      {isAgentsOpen && (
        <div
          id="top-nav-agent-layers"
          className={`hidden lg:block absolute right-0 top-[calc(100%+0.75rem)] z-[1100] w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 ${isDark
              ? "bg-slate-950 border-slate-800 text-slate-100 shadow-2xl shadow-slate-950/60"
              : "bg-white border-slate-200 text-slate-900 shadow-2xl shadow-slate-400/20"
            }`}
        >
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-slate-50/90"
            }`}>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-600 dark:text-violet-400">
                Agent layers
              </p>
              <h3 className={`mt-0.5 truncate text-sm font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"
                }`}>
                Super Agent orchestration map
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAgentsOpen(false)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${isDark
                  ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 shadow-sm"
                }`}
              aria-label="Close agent layers"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid max-h-[380px] grid-cols-[220px_1fr] overflow-y-auto">
            {/* Left Column: Layer Tabs */}
            <div className={`space-y-1.5 p-2.5 border-r ${isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-[#f8fafc]"
              }`}>
              {agentLayers.map((layer) => {
                const Icon = layer.icon;
                const isActive = activeAgentLayer.id === layer.id;

                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveAgentLayerId(layer.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-200 cursor-pointer ${isActive
                        ? isDark
                          ? "border-violet-800 bg-violet-950/60 shadow-sm"
                          : "border-indigo-200 bg-white shadow-md"
                        : isDark
                          ? "border-transparent bg-transparent hover:border-slate-800 hover:bg-slate-900/60 text-slate-400"
                          : "border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-200/60 text-slate-700"
                      }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${getLayerIconBadgeClass(
                        layer.id,
                        isActive,
                        isDark
                      )}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                        {layer.layer}
                      </span>
                      <span className={`mt-0.5 block text-xs font-extrabold leading-4 ${isDark ? "text-slate-100" : "text-slate-900"
                        }`}>
                        {layer.title}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Layer Details & Agents */}
            <div className={isDark ? `bg-gradient-to-br ${activeAgentLayer.soft} p-3` : "bg-gradient-to-br from-white via-indigo-50/50 to-slate-50 p-3"}>
              <div className="flex items-start gap-2.5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${getLayerIconBadgeClass(
                  activeAgentLayer.id,
                  true,
                  isDark
                )}`}>
                  <ActiveAgentLayerIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {activeAgentLayer.layer}
                  </p>
                  <h4 className={`mt-0.5 text-sm font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"
                    }`}>
                    {activeAgentLayer.title}
                  </h4>
                  <p className={`mt-0.5 max-w-xl text-xs font-medium leading-5 ${isDark ? "text-slate-300" : "text-slate-600"
                    }`}>
                    {activeAgentLayer.description}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {activeAgentLayer.agents.map((agent) => {
                  const AgentIcon = agent.icon;
                  const allowed = isAgentAllowed(agent.key);
                  const hasHref = !!agent.href;

                  return (
                    <button
                      key={agent.name}
                      type="button"
                      onClick={() => handleAgentClick(agent.href)}
                      title={!allowed && agent.key ? "Click to view Demo Video & Contact Us" : undefined}
                      className={`flex min-h-11 w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left shadow-sm transition-all ${hasHref
                          ? isDark
                            ? "bg-slate-900/90 border-slate-800 hover:bg-slate-800 hover:border-violet-500/40 text-slate-100 cursor-pointer"
                            : "bg-white border-slate-200/90 hover:bg-indigo-50 hover:border-indigo-300 text-slate-900 font-extrabold cursor-pointer"
                          : isDark
                            ? "bg-slate-900/50 border-slate-800/80 text-slate-400 cursor-default"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-default"
                        }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${getAgentIconBadgeClass(
                        activeAgentLayer.id,
                        hasHref,
                        isDark
                      )}`}>
                        <AgentIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className={`flex-1 break-words text-[11px] leading-snug ${hasHref
                          ? isDark ? "text-slate-100 font-bold" : "text-slate-900 font-extrabold"
                          : isDark ? "text-slate-400 font-medium" : "text-slate-700 font-bold"
                        }`}>
                        {agent.name}
                      </span>
                      {hasHref && !allowed && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 border ${isDark
                            ? "bg-violet-950 border-violet-800 text-violet-300"
                            : "bg-violet-100 border-violet-200 text-violet-800"
                          }`}>
                          Demo
                        </span>
                      )}
                      {!hasHref && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 border ${isDark
                            ? "bg-slate-800 border-slate-700 text-slate-400"
                            : "bg-slate-200 border-slate-300 text-slate-600"
                          }`}>
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>


            </div>
          </div>
        </div>
      )}

      {/* ── 2. MOBILE INLINE ACCORDION VIEW (lg:hidden) ───────────────────── */}
      {isAgentsOpen && (
        <div className={`block lg:hidden mt-3 space-y-3 rounded-2xl border p-3 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150 ${isDark
            ? "bg-slate-900/90 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900 shadow-lg"
          }`}>
          <div className={`flex items-center justify-between pb-2.5 px-1 border-b ${isDark ? "border-slate-800" : "border-slate-200"
            }`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Super Agent Orchestration Map
            </span>
            <span className={`text-[10px] font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {agentLayers.reduce((acc, l) => acc + l.agents.length, 0)} Agents
            </span>
          </div>

          <div className="space-y-2">
            {agentLayers.map((layer) => {
              const Icon = layer.icon;
              const isExpanded = mobileExpandedLayer === layer.id;

              return (
                <div
                  key={layer.id}
                  className={`rounded-xl border overflow-hidden transition-all ${isDark
                      ? "border-slate-800/80 bg-slate-950/60"
                      : "border-slate-200 bg-slate-50/80 shadow-sm"
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => setMobileExpandedLayer(isExpanded ? null : layer.id)}
                    className={`flex w-full items-center justify-between p-3 text-left transition-colors ${isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-100"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${getLayerIconBadgeClass(
                        layer.id,
                        isExpanded,
                        isDark
                      )}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {layer.layer}
                        </div>
                        <div className={`text-xs font-black truncate ${isDark ? "text-slate-100" : "text-slate-900"
                          }`}>
                          {layer.title}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDark
                          ? "bg-slate-800 text-slate-400 border-slate-700"
                          : "bg-white text-slate-600 border-slate-300"
                        }`}>
                        {layer.agents.length}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isDark ? "text-slate-400" : "text-slate-500"
                          } ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {/* Expanded Mobile Agents List */}
                  {isExpanded && (
                    <div className={`p-2 border-t space-y-1.5 animate-in fade-in duration-100 ${isDark
                        ? "border-slate-800/60 bg-slate-900/60"
                        : "border-slate-200 bg-white"
                      }`}>
                      <p className={`text-[11px] font-medium px-2 py-1 leading-snug ${isDark ? "text-slate-400" : "text-slate-600"
                        }`}>
                        {layer.description}
                      </p>
                      <div className="space-y-1 pt-1">
                        {layer.agents.map((agent) => {
                          const AgentIcon = agent.icon;
                          const allowed = isAgentAllowed(agent.key);
                          const hasHref = !!agent.href;

                          return (
                            <button
                              key={agent.name}
                              type="button"
                              onClick={() => handleAgentClick(agent.href)}
                              disabled={!hasHref}
                              className={`flex w-full items-center justify-between p-2.5 rounded-xl border text-left transition-all ${hasHref
                                  ? isDark
                                    ? "bg-slate-800/80 border-slate-700/70 text-slate-100 active:scale-[0.99] cursor-pointer"
                                    : "bg-slate-50 border-slate-200 text-slate-900 font-extrabold hover:bg-indigo-50 hover:border-indigo-300 shadow-sm active:scale-[0.99] cursor-pointer"
                                  : isDark
                                    ? "bg-slate-900/40 border-slate-800/40 text-slate-400 cursor-default"
                                    : "bg-slate-100/80 border-slate-200 text-slate-700 font-bold cursor-default"
                                }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${getAgentIconBadgeClass(
                                  layer.id,
                                  hasHref,
                                  isDark
                                )}`}>
                                  <AgentIcon className="h-3.5 w-3.5" />
                                </span>
                                <span className="text-xs font-bold truncate">
                                  {agent.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasHref && !allowed && (
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${isDark
                                      ? "bg-violet-950 border-violet-800 text-violet-300"
                                      : "bg-violet-100 border-violet-200 text-violet-800"
                                    }`}>
                                    Demo
                                  </span>
                                )}
                                {!hasHref && (
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${isDark
                                      ? "bg-slate-800 border-slate-700 text-slate-400"
                                      : "bg-slate-200 border-slate-300 text-slate-600"
                                    }`}>
                                    Soon
                                  </span>
                                )}
                                {hasHref && (
                                  <ChevronRight className={`w-3.5 h-3.5 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
