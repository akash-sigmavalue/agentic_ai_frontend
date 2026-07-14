"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Code2,
  Database,
  FileText,
  FolderKanban,
  Globe2,
  Handshake,
  LineChart,
  Lock,
  MapIcon,
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

/**
 * Central permission config.
 * ADMIN: all agents (*)
 * FREE: only valuation
 * PAID: placeholder — same as FREE for now
 */
const ALLOWED_AGENTS_BY_ROLE: Record<string, string[] | '*'> = {
  ADMIN: '*',
  FREE: ['valuation'],
  PAID: ['valuation'],  // extend when paid logic is implemented
};

const agentLayers: AgentLayer[] = [
  {
    id: "specialized",
    layer: "Layer 1",
    title: "Specialized Agents",
    description: "Domain specialists that interpret markets, assets, feasibility, and physical context.",
    icon: BrainCircuit,
    accent: "text-blue-600 border-blue-100 bg-blue-50",
    soft: "from-blue-500/10 to-cyan-500/10",
    agents: [
      { name: "Land/GIS", icon: MapPinned, href: '/visualization_agent', key: 'visualization_agent' },
      { name: "Elevation Agent", icon: MapPinned, href: '/elevation', key: 'elevation' },  
      { name: "Valuation", icon: BarChart3, href: "/valuation", key: 'valuation' },
      { name: "Market Research", icon: Search, key: 'market_research' },
      { name: "Physical AI", icon: Bot, key: 'physical_ai' },
      { name: "Feasibility", icon: ClipboardCheck, href: "/feasibility", key: 'feasibility' },
    ],
  },
  {
    id: "data",
    layer: "Layer 2",
    title: "Data Agents",
    description: "Input, retrieval, and evidence agents that keep the workflow grounded in source data.",
    icon: Database,
    accent: "text-indigo-600 border-indigo-100 bg-indigo-50",
    soft: "from-indigo-500/10 to-sky-500/10",
    agents: [
      { name: "User Input (Docs/Images)", icon: FileText, href: "/user_input", key: 'user_input' },
      { name: "Web Data", icon: Globe2, href: "/web_search", key: 'web_search' },
      { name: "Data Retriever Agent", icon: Server, href: "/data_retrieval", key: 'data_retrieval' },
      { name: "Analytics", icon: LineChart, key: 'analytics' },
      { name: "Legal", icon: Scale, key: 'legal' },
    ],
  },
  {
    id: "solution",
    layer: "Layer 3",
    title: "Solution Creation Agents",
    description: "Creation and operations agents that turn analysis into executable business workflows.",
    icon: Code2,
    accent: "text-violet-600 border-violet-100 bg-violet-50",
    soft: "from-violet-500/10 to-fuchsia-500/10",
    agents: [
      { name: "UI Creation", icon: MonitorCog, href: "/ui_creation", key: 'ui_creation' },
      { name: "Solution Engine", icon: Settings, key: 'solution_engine' },
      { name: "CRM", icon: Handshake, key: 'crm' },
      { name: "ERP", icon: Building2, key: 'erp' },
      { name: "Project Management", icon: FolderKanban, key: 'project_mgmt' },
    ],
  },
  {
    id: "workspace",
    layer: "Layer 4",
    title: "Workspace Agents",
    description: "Collaboration agents that connect people, tools, and shared execution spaces.",
    icon: Users,
    accent: "text-emerald-600 border-emerald-100 bg-emerald-50",
    soft: "from-emerald-500/10 to-teal-500/10",
    agents: [
      { name: "Connector", icon: Plug, href: "/connector", key: 'connector' },
      { name: "Team Collaboration", icon: Users, key: 'team' },
    ],
  },
];

export default function AgentListDropdown() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAgentsOpen, setIsAgentsOpen] = useState(false);
  const [activeAgentLayerId, setActiveAgentLayerId] = useState(agentLayers[0].id);

  const activeAgentLayer =
    agentLayers.find((layer) => layer.id === activeAgentLayerId) ?? agentLayers[0];
  const ActiveAgentLayerIcon = activeAgentLayer.icon;


  const userRole = user?.role ?? 'FREE';
  const allowedAgents = ALLOWED_AGENTS_BY_ROLE[userRole] ?? ALLOWED_AGENTS_BY_ROLE['FREE'];

  const isAgentAllowed = (agentKey: string | undefined) => {
    if (!agentKey) return false;   // no href = not navigable anyway
    if (allowedAgents === '*') return true;
    return allowedAgents.includes(agentKey);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsAgentsOpen((open) => !open)}
        className={`group inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[11px] font-extrabold uppercase tracking-[0.18em] shadow-sm transition-all duration-200 ${isAgentsOpen
            ? "border-violet-200 bg-violet-600 text-white shadow-violet-200/70"
            : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          }`}
        aria-expanded={isAgentsOpen}
        aria-controls="top-nav-agent-layers"
      >
        <Bot className="h-4 w-4" />
        Agents
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAgentsOpen ? "rotate-180" : ""}`} />
      </button>

      {isAgentsOpen && (
        <div
          id="top-nav-agent-layers"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-[1100] w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/15 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-600">Agent layers</p>
              <h3 className="mt-1 truncate text-sm font-extrabold tracking-tight text-slate-950">
                Super Agent orchestration map
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAgentsOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
              aria-label="Close agent layers"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid max-h-[420px] grid-cols-1 overflow-y-auto md:grid-cols-[250px_1fr]">
            <div className="space-y-2 border-b border-slate-100 bg-white p-3 md:border-b-0 md:border-r">
              {agentLayers.map((layer) => {
                const Icon = layer.icon;
                const isActive = activeAgentLayer.id === layer.id;

                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveAgentLayerId(layer.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${isActive
                        ? "border-violet-200 bg-violet-50 shadow-sm"
                        : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isActive ? layer.accent : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                        {layer.layer}
                      </span>
                      <span className="mt-0.5 block text-sm font-extrabold leading-5 text-slate-900">
                        {layer.title}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={`bg-gradient-to-br ${activeAgentLayer.soft} p-4`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${activeAgentLayer.accent}`}>
                  <ActiveAgentLayerIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                    {activeAgentLayer.layer}
                  </p>
                  <h4 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
                    {activeAgentLayer.title}
                  </h4>
                  <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-slate-600">
                    {activeAgentLayer.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activeAgentLayer.agents.map((agent) => {
                  const AgentIcon = agent.icon;
                  const allowed = isAgentAllowed(agent.key);
                  const clickable = !!agent.href && allowed;

                  return (
                    <button
                      key={agent.name}
                      type="button"
                      onClick={() => {
                        if (!clickable) {
                          if (agent.href && !allowed) {
                            setIsAgentsOpen(false);
                            router.push('/unauthorized');
                          }
                          return;
                        }
                        setIsAgentsOpen(false);
                        router.push(agent.href!);
                      }}
                      title={!allowed && agent.key ? 'Access restricted for your role' : undefined}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/70 bg-white/90 px-3 py-2.5 text-left shadow-sm transition-colors ${clickable
                          ? 'hover:bg-violet-50/70 cursor-pointer'
                          : agent.href
                            ? 'opacity-60 cursor-not-allowed'
                            : 'opacity-40 cursor-default'
                        }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${activeAgentLayer.accent}`}>
                        <AgentIcon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="flex-1 break-words text-sm font-extrabold leading-5 text-slate-900">
                        {agent.name}
                      </span>
                      {/* Lock icon for role-restricted agents */}
                      {agent.href && !allowed && (
                        <Lock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
