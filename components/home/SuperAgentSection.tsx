'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  FileText,
  MapPinned,
  RadioTower,
  RefreshCcw,
  Scale,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NeuralPropertyCortex } from './design-2';
import { AgentCarousel } from './design-3';

type Agent = {
  name: string;
  description: string;
  capabilities: string[];
  cta: string;
  icon: LucideIcon;
  iconClass: string;
  position: string;
};

const AGENTS: Agent[] = [
  { name: 'Valuation Agent', description: 'Get an instant, data-backed valuation of any property using property details, images, location intelligence and comparable market evidence.', capabilities: ['Property valuation', 'Image-based assessment', 'Comparable finder', 'Map-based analysis', 'Valuation models'], cta: 'Open Valuation Agent →', icon: Building2, iconClass: 'bg-emerald-500/15 text-emerald-500', position: 'left-[49%] top-5 -translate-x-1/2' },
  { name: 'Land & GIS Agent', description: 'Explore any land parcel through prompt-based mapping, multi-layer spatial analysis and interactive visualization.', capabilities: ['Identify land parcels', 'Verify boundaries', 'Satellite, cadastral and master-plan overlays', 'Analyse surroundings', '2D and 3D site visualization'], cta: 'Explore Land & GIS Agent →', icon: MapPinned, iconClass: 'bg-teal-500/15 text-teal-500', position: 'left-[31%] top-[17%] -translate-x-1/2' },
  { name: 'Market Research Agent', description: 'Generate structured real estate insights, market trends and actionable recommendations using integrated data and analytics.', capabilities: ['Micro-market analysis', 'Demand–supply trends', 'Pricing and absorption insights', 'Competitor benchmarking', 'Buyer profiling', 'Growth and risk assessment', 'Market forecasting', 'Automated reports', 'Product mix analysis', 'Investment opportunity identification'], cta: 'Explore Market Research Agent →', icon: BarChart3, iconClass: 'bg-orange-500/15 text-orange-500', position: 'right-[6%] top-[15%]' },
  { name: 'Physical AI Agent', description: 'Monitor construction sites using images, videos, drone footage and BIM data to detect progress and completed work.', capabilities: ['Construction progress tracking', 'Work-completion assessment', 'Image and video analysis', 'Drone-site monitoring', 'Asset and project monitoring'], cta: 'Explore Physical AI Agent →', icon: RadioTower, iconClass: 'bg-violet-500/15 text-violet-500', position: 'right-0 top-[34%]' },
  { name: 'Feasibility Agent', description: 'Compare multiple development possibilities to determine the most viable land use, project configuration and financial strategy.', capabilities: ['Land potential assessment', 'Highest and Best Use analysis', 'Project configuration optimization', 'Revenue and return forecasting', 'Risk assessment', 'Investment recommendations'], cta: 'Simulate Project Feasibility →', icon: Calculator, iconClass: 'bg-pink-500/15 text-pink-500', position: 'right-0 top-[53%]' },
  { name: 'Document Intelligence Agent', description: 'Convert complex agreements, construction plans and property documents into AI-powered, decision-ready intelligence.', capabilities: ['Multimodal document analysis', 'Clause intelligence', 'Plan interpretation', 'Risk detection', 'Cross-document validation', 'Automated insights'], cta: 'Extract Document Insights →', icon: FileText, iconClass: 'bg-blue-500/15 text-blue-500', position: 'right-[1%] top-[73%]' },
  { name: 'Live Data Intelligence Agent', description: 'Transform the open web into a live, AI-powered real estate knowledge network.', capabilities: ['Autonomous web discovery', 'Real-time signal detection', 'Market monitoring', 'Data structuring', 'Cross-source verification', 'Intelligence synthesis'], cta: 'Activate Web Intelligence →', icon: RadioTower, iconClass: 'bg-blue-600/15 text-blue-500', position: 'left-[33%] bottom-2 -translate-x-1/2' },
  { name: 'Transaction Intelligence Agent', description: 'Transform millions of property transactions into instant, AI-powered market intelligence.', capabilities: ['Conversational data exploration', 'Intelligent comparable matching', 'Price-pattern detection', 'Geospatial transaction analysis', 'Market-trend discovery', 'Decision-ready outputs'], cta: 'Unlock Transaction Intelligence →', icon: RefreshCcw, iconClass: 'bg-amber-500/15 text-amber-500', position: 'left-[54%] bottom-0 -translate-x-1/2' },
  { name: 'Legal Intelligence Agent', description: 'Interpret property laws, regulations and legal documents to identify compliance requirements, obligations and potential risks.', capabilities: ['Title and ownership checks', 'Agreement and clause analysis', 'Regulatory compliance', 'Approval verification', 'Legal-risk detection', 'Evidence-linked insights'], cta: 'Explore Legal Intelligence →', icon: Scale, iconClass: 'bg-violet-600/15 text-violet-500', position: 'right-[10%] bottom-0' },
];

function AgentCard({ agent, compact = false }: { agent: Agent; compact?: boolean }) {
  const Icon = agent.icon;

  return (
    <article className={`group flex border border-indigo-200 bg-white/90 shadow-[0_12px_35px_rgba(79,70,229,0.12)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-[0_18px_45px_rgba(79,70,229,0.20)] dark:border-indigo-400/25 dark:bg-slate-950/75 dark:shadow-[0_14px_40px_rgba(0,0,0,0.35)] dark:hover:border-indigo-400/60 ${compact ? 'min-h-31 items-start gap-3 rounded-2xl p-4' : 'w-66 items-start gap-3 rounded-2xl p-4'}`}>
      <div className={`grid shrink-0 place-items-center rounded-full ${agent.iconClass} ${compact ? 'size-12' : 'size-11'}`}>
        <Icon className="size-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" strokeWidth={2.1} />
      </div>
      <div className="min-w-0 pt-0.5">
        <h3 className="text-[14px] leading-tight font-extrabold text-slate-950 dark:text-white">{agent.name}</h3>
        <p className={`mt-1 leading-4 text-slate-600 dark:text-slate-300 ${compact ? 'text-xs' : 'line-clamp-2 text-[10px]'}`}>{agent.description}</p>
        <span className="mt-2 inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] leading-none font-black tracking-[0.12em] text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">ACTIVE</span>
        <details className="group/details mt-2 border-t border-indigo-100 pt-2 dark:border-indigo-400/15">
          <summary className="cursor-pointer list-none text-[10px] font-extrabold text-indigo-600 transition hover:text-violet-600 dark:text-indigo-300">View capabilities <span className="inline-block transition-transform group-open/details:rotate-90">›</span></summary>
          <div className="mt-2 rounded-xl bg-indigo-50/80 p-2.5 dark:bg-indigo-500/10">
            <p className="text-[9px] font-black tracking-wide text-slate-700 uppercase dark:text-slate-200">Key capabilities</p>
            <ul className="mt-1.5 space-y-1 text-[9px] leading-3.5 text-slate-600 dark:text-slate-300">
              {agent.capabilities.map((capability) => <li key={capability} className="flex gap-1.5"><span className="text-indigo-500">•</span><span>{capability}</span></li>)}
            </ul>
            <button type="button" className="mt-2.5 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-2 py-2 text-[9px] font-extrabold text-white transition hover:brightness-110">{agent.cta}</button>
          </div>
        </details>
      </div>
    </article>
  );
}

function IntroPanel({ desktop = false }: { desktop?: boolean }) {
  return (
    <div className={`${desktop ? 'absolute left-0 top-1/2 z-20 flex min-h-[600px] w-[31%] -translate-y-1/2 flex-col justify-center p-8' : 'relative z-20 mx-auto max-w-2xl px-5 py-8 text-center'} rounded-[28px] border border-indigo-200 bg-white/90 shadow-[0_24px_70px_rgba(79,70,229,0.14)] backdrop-blur-xl dark:border-indigo-400/30 dark:bg-slate-950/75 dark:shadow-[0_25px_80px_rgba(0,0,0,0.4)]`}>
      <div className={`flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-400 ${desktop ? '' : 'justify-center'}`}>
        <Sparkles className="size-4" /> Sigmavalue Core Engine
      </div>
      <h2 className={`${desktop ? 'mt-6 text-5xl' : 'mt-4 text-4xl sm:text-6xl'} font-black tracking-[-0.045em] text-slate-950 dark:text-white`}>Super Agent</h2>
      <p className="mt-3 font-bold text-indigo-600 dark:text-indigo-400">AI orchestration for real estate intelligence</p>
      {desktop && <p className="mt-8 text-sm leading-6 text-slate-600 dark:text-slate-300">The Super Agent coordinates valuation, land intelligence, market research, transactions, documents, legal review and site monitoring workflows around every real-estate asset.</p>}
      <a href="#" className={`${desktop ? 'mt-8' : 'mt-6 mx-auto'} super-cta flex max-w-sm items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 font-bold text-white shadow-[0_10px_30px_rgba(99,102,241,0.38)] transition hover:-translate-y-0.5 hover:shadow-[0_15px_35px_rgba(99,102,241,0.5)]`}>
        <span className="flex items-center gap-3"><Sparkles className="size-5" /> Explore Super Agent</span><ArrowRight className="size-5" />
      </a>
      <div className={`${desktop ? 'mt-5' : 'mx-auto mt-4'} flex max-w-sm items-center justify-center gap-3 rounded-full border border-indigo-200 px-4 py-2 text-xs text-indigo-600 dark:border-indigo-400/25 dark:text-indigo-300`}>
        <Sparkles className="size-4" /> AI-powered <span>•</span> Real estate focused
      </div>
    </div>
  );
}

function BuildingVisual({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className={`relative mx-auto ${mobile ? 'h-[390px] w-full max-w-2xl sm:h-[560px]' : 'absolute inset-x-0 top-[18%] mx-auto h-[67%] w-[48%]'}`}>
      <div className="absolute inset-[8%] rounded-full bg-white/70 blur-3xl dark:bg-transparent " />
      <div className="absolute inset-[12%] rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-500/15" />
      <div className="super-ring absolute inset-[17%] rounded-full border border-indigo-300/80 dark:border-indigo-500/30" />
      <div className="super-ring-reverse absolute inset-[24%] rounded-full border border-dashed border-violet-300/90 dark:border-violet-500/35" />
      <Image src="/images/super-agent-building.png" alt="AI-connected real estate complex" fill sizes={mobile ? '(max-width: 1024px) 100vw' : '50vw'} className="super-building relative z-10 object-contain translate-x-[4%] translate-y-[2%] brightness-110 saturate-75 drop-shadow-[0_28px_35px_rgba(79,70,229,0.22)] dark:brightness-100 dark:saturate-100 dark:drop-shadow-[0_28px_35px_rgba(79,70,229,0.28)]" />
    </div>
  );
}

function DesignOne() {
  return (
    <section id="super-agent-section" className="relative z-10 overflow-hidden border-y border-indigo-100 bg-[radial-gradient(circle_at_58%_48%,rgba(129,140,248,0.22),transparent_38%),linear-gradient(135deg,#ffffff_0%,#f7f7ff_48%,#eef2ff_100%)] px-4 py-16 text-slate-950 dark:border-indigo-500/15 dark:bg-[radial-gradient(circle_at_58%_48%,rgba(79,70,229,0.18),transparent_36%),linear-gradient(135deg,#020617,#071026)] dark:text-white sm:px-6 lg:px-8 lg:py-10">
      <style>{`
        @keyframes super-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes super-ring { to { transform: rotate(360deg) } }
        @keyframes super-ring-reverse { to { transform: rotate(-360deg) } }
        @keyframes super-flow { to { stroke-dashoffset: -42 } }
        @keyframes super-card-in { from { opacity: 0; transform: translateY(18px) scale(.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes super-cta-glow { 0%,100% { box-shadow: 0 10px 30px rgba(99,102,241,.35) } 50% { box-shadow: 0 12px 42px rgba(124,58,237,.62) } }
        .super-building { animation: super-float 6s ease-in-out infinite; }
        .super-ring { animation: super-ring 28s linear infinite; }
        .super-ring-reverse { animation: super-ring-reverse 22s linear infinite; }
        .super-network path { stroke-dasharray: 8 8; animation: super-flow 3s linear infinite; }
        .super-card-enter { opacity: 0; animation: super-card-in .65s cubic-bezier(.22,1,.36,1) forwards; }
        .super-cta { animation: super-cta-glow 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .super-building, .super-ring, .super-ring-reverse, .super-network path, .super-card-enter, .super-cta { animation: none !important; }
          .super-card-enter { opacity: 1; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#818cf8_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_25%,transparent_75%,black)] dark:opacity-15" />

      <div className="relative mx-auto hidden h-[900px] max-w-[1700px] lg:block xl:h-[1000px] ">
        <IntroPanel desktop />
        <BuildingVisual />
        <svg className="super-network pointer-events-none absolute inset-0 z-0 h-full w-full text-indigo-500/55 drop-shadow-[0_0_4px_rgba(99,102,241,0.25)] dark:text-indigo-400/65 dark:drop-shadow-none" viewBox="0 0 1500 830" fill="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1.6">
            <path d="M735 60 Q 796 205 741 217"/>
            <path d="M465 180 Q 616 236 591 289"/>
            <path d="M1278 164 Q 1106 348 938 333"/>
            <path d="M1368 322 Q 1137 457 957 392"/>
            <path d="M1368 479 Q 1113 551 959 445"/>
            <path d="M1353 645 Q 1079 648 947 498"/>
            <path d="M495 782 Q 544 602 627 598"/>
            <path d="M810 790 Q 732 654 784 634"/>
            <path d="M1218 790 Q 976 715 916 556"/>
          </g>
        </svg>
        {AGENTS.map((agent, index) => <div key={agent.name} className={`absolute z-20 hover:z-50 has-[details[open]]:z-50 ${agent.position}`}><div className="super-card-enter" style={{ animationDelay: `${index * 90}ms` }}><AgentCard agent={agent} /></div></div>)}
      </div>

      <div className="relative mx-auto max-w-4xl lg:hidden border">
        <IntroPanel />
        <BuildingVisual mobile />
        <div className="relative z-20 -mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {AGENTS.map((agent, index) => <div key={agent.name} className={`super-card-enter ${index === AGENTS.length - 1 ? 'sm:col-span-2 sm:mx-auto sm:w-1/2' : ''}`} style={{ animationDelay: `${index * 80}ms` }}><AgentCard agent={agent} compact /></div>)}
        </div>
      </div>
    </section>
  );
}

const DESIGNS = [
  { id: 1, label: 'Design 1' },
  { id: 2, label: 'Design 2' },
  { id: 3, label: 'Design 3' },
] as const;

export default function SuperAgentSection() {
  const [design, setDesign] = useState<1 | 2 | 3>(1);

  return (
    <div className="relative">
      <div className="sticky top-20 z-50 mx-auto -mb-7 flex w-fit items-center gap-1 rounded-2xl border border-indigo-200 bg-white/85 p-1.5 shadow-[0_12px_35px_rgba(30,41,59,.14)] backdrop-blur-xl dark:border-indigo-400/25 dark:bg-slate-950/85">
        {DESIGNS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setDesign(item.id)}
            className={`relative rounded-xl px-4 py-2.5 text-xs font-extrabold transition sm:px-6 ${design === item.id ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {design === 1 && <DesignOne />}
      {design === 2 && <div className="bg-slate-50 px-3 py-16 dark:bg-slate-950 sm:px-6"><div className="mx-auto max-w-[1500px]"><NeuralPropertyCortex /></div></div>}
      {design === 3 && <AgentCarousel />}
    </div>
  );
}
