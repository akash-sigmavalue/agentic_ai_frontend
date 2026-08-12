'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
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

type CarouselAgent = {
  name: string;
  eyebrow: string;
  description: string;
  capabilities: string[];
  cta: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
};

const AGENTS: CarouselAgent[] = [
  { name: 'Valuation Agent', eyebrow: 'Property intelligence', description: 'Get an instant, data-backed valuation using property details, images, location intelligence and comparable market evidence.', capabilities: ['Property valuation', 'Image assessment', 'Comparable finder', 'Map analysis', 'Valuation models'], cta: 'Open Valuation Agent', icon: Building2, color: '#10b981', gradient: 'from-emerald-500 to-cyan-500' },
  { name: 'Land & GIS Agent', eyebrow: 'Spatial intelligence', description: 'Explore any land parcel through prompt-based mapping, multi-layer spatial analysis and interactive visualization.', capabilities: ['Identify parcels', 'Verify boundaries', 'Planning overlays', 'Analyse surroundings', '2D and 3D views'], cta: 'Explore Land & GIS', icon: MapPinned, color: '#14b8a6', gradient: 'from-teal-500 to-cyan-500' },
  { name: 'Market Research Agent', eyebrow: 'Market intelligence', description: 'Generate structured real-estate insights, market trends and actionable recommendations using integrated data and analytics.', capabilities: ['Micro-market analysis', 'Demand and supply', 'Pricing insights', 'Benchmarking', 'Market forecasting'], cta: 'Explore Market Research', icon: BarChart3, color: '#f97316', gradient: 'from-orange-500 to-amber-500' },
  { name: 'Physical AI Agent', eyebrow: 'Construction intelligence', description: 'Monitor construction sites using imagery, video, drone footage and BIM data to detect progress and completed work.', capabilities: ['Progress tracking', 'Completion assessment', 'Visual analysis', 'Drone monitoring', 'Asset monitoring'], cta: 'Explore Physical AI', icon: RadioTower, color: '#8b5cf6', gradient: 'from-violet-500 to-indigo-500' },
  { name: 'Feasibility Agent', eyebrow: 'Development intelligence', description: 'Compare development possibilities to determine the most viable land use, configuration and financial strategy.', capabilities: ['Land potential', 'Highest and Best Use', 'Configuration optimization', 'Return forecasting', 'Risk assessment'], cta: 'Simulate Feasibility', icon: Calculator, color: '#ec4899', gradient: 'from-pink-500 to-fuchsia-500' },
  { name: 'Document Intelligence', eyebrow: 'Document intelligence', description: 'Convert agreements, construction plans and property documents into AI-powered, decision-ready intelligence.', capabilities: ['Multimodal analysis', 'Clause intelligence', 'Plan interpretation', 'Risk detection', 'Cross-validation'], cta: 'Extract Document Insights', icon: FileText, color: '#3b82f6', gradient: 'from-blue-500 to-cyan-500' },
  { name: 'Live Data Intelligence', eyebrow: 'Open-web intelligence', description: 'Transform the open web into a live, AI-powered real-estate knowledge network.', capabilities: ['Autonomous discovery', 'Real-time signals', 'Market monitoring', 'Data structuring', 'Source verification'], cta: 'Activate Web Intelligence', icon: RadioTower, color: '#2563eb', gradient: 'from-blue-600 to-indigo-500' },
  { name: 'Transaction Intelligence', eyebrow: 'Transaction intelligence', description: 'Transform millions of property transactions into instant, AI-powered market intelligence.', capabilities: ['Conversational exploration', 'Comparable matching', 'Price patterns', 'Geospatial analysis', 'Market trends'], cta: 'Unlock Transaction Intelligence', icon: RefreshCcw, color: '#f59e0b', gradient: 'from-amber-500 to-orange-500' },
  { name: 'Legal Intelligence', eyebrow: 'Legal intelligence', description: 'Interpret property laws, regulations and legal documents to identify obligations and potential risks.', capabilities: ['Ownership checks', 'Clause analysis', 'Compliance', 'Approval verification', 'Legal-risk detection'], cta: 'Explore Legal Intelligence', icon: Scale, color: '#7c3aed', gradient: 'from-violet-600 to-purple-500' },
];

function AgentSlide({ agent, featured = false }: { agent: CarouselAgent; featured?: boolean }) {
  const Icon = agent.icon;
  return (
    <article style={{ '--agent': agent.color } as React.CSSProperties} className={`relative overflow-hidden rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-[0_25px_80px_rgba(79,70,229,.16)] backdrop-blur-2xl dark:border-indigo-400/20 dark:bg-slate-950/85 dark:shadow-[0_30px_90px_rgba(0,0,0,.45)] sm:p-8 ${featured ? 'min-h-[500px]' : 'min-h-[390px]'}`}>
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${agent.gradient}`} />
      <div className="absolute -top-24 -right-24 size-64 rounded-full bg-[var(--agent)] opacity-10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className={`grid size-15 place-items-center rounded-2xl bg-gradient-to-br ${agent.gradient} text-white shadow-[0_12px_30px_color-mix(in_srgb,var(--agent)_35%,transparent)]`}><Icon className="size-7" /></div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black tracking-[.14em] text-emerald-600 uppercase dark:text-emerald-400">Active agent</span>
        </div>
        <p className="mt-8 text-[10px] font-black tracking-[.18em] text-[var(--agent)] uppercase">{agent.eyebrow}</p>
        <h3 className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-950 dark:text-white sm:text-4xl">{agent.name}</h3>
        <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{agent.description}</p>
        <div className="mt-6">
          <p className="text-[10px] font-black tracking-[.14em] text-slate-500 uppercase dark:text-slate-400">Key capabilities</p>
          <div className="mt-3 flex flex-wrap gap-2">{agent.capabilities.map((item) => <span key={item} className="rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-[10px] font-semibold text-slate-700 dark:border-indigo-400/15 dark:bg-indigo-500/10 dark:text-slate-200">{item}</span>)}</div>
        </div>
        <button type="button" className={`mt-7 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r ${agent.gradient} px-5 py-4 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-1 hover:brightness-110`}><span>{agent.cta}</span><ArrowRight className="size-5" /></button>
      </div>
    </article>
  );
}

export default function AgentCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const previous = (active - 1 + AGENTS.length) % AGENTS.length;
  const next = (active + 1) % AGENTS.length;

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % AGENTS.length), 5200);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_32%,rgba(124,58,237,.18),transparent_35%),linear-gradient(135deg,#f8faff,#eef2ff)] px-4 py-20 dark:bg-[radial-gradient(circle_at_50%_32%,rgba(124,58,237,.2),transparent_35%),linear-gradient(135deg,#020617,#0b1024)] sm:px-6">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#818cf8_1px,transparent_1px)] [background-size:30px_30px] dark:opacity-10" />
      <div className="relative mx-auto max-w-[1450px]">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-[10px] font-black tracking-[.17em] text-violet-600 uppercase backdrop-blur dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-300"><Sparkles className="size-4" /> AI agent ecosystem</span>
          <h2 className="mt-5 text-4xl font-black tracking-[-.05em] text-slate-950 sm:text-6xl dark:text-white">One carousel. Every intelligence.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Explore the specialist agents powering every stage of the real-estate decision workflow.</p>
        </header>

        <div className="mt-12 hidden items-center gap-6 lg:grid lg:grid-cols-[.72fr_1fr_.72fr]">
          <div onClick={() => setActive(previous)} className="translate-x-10 scale-90 cursor-pointer opacity-55 transition duration-500 hover:opacity-85"><AgentSlide agent={AGENTS[previous]} /></div>
          <div key={AGENTS[active].name} className="relative z-10 animate-[carouselIn_.55s_cubic-bezier(.22,1,.36,1)]"><AgentSlide agent={AGENTS[active]} featured /></div>
          <div onClick={() => setActive(next)} className="-translate-x-10 scale-90 cursor-pointer opacity-55 transition duration-500 hover:opacity-85"><AgentSlide agent={AGENTS[next]} /></div>
        </div>

        <div key={`mobile-${AGENTS[active].name}`} className="mt-10 animate-[carouselIn_.55s_cubic-bezier(.22,1,.36,1)] lg:hidden"><AgentSlide agent={AGENTS[active]} featured /></div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button type="button" onClick={() => setActive(previous)} aria-label="Previous agent" className="grid size-11 place-items-center rounded-full border border-indigo-200 bg-white text-slate-700 shadow-lg transition hover:-translate-x-1 hover:border-indigo-400 dark:border-indigo-400/20 dark:bg-slate-900 dark:text-white"><ArrowLeft className="size-5" /></button>
          <div className="flex items-center gap-1.5">{AGENTS.map((agent, index) => <button key={agent.name} type="button" onClick={() => setActive(index)} aria-label={`Show ${agent.name}`} className={`h-2 rounded-full transition-all ${index === active ? 'w-8 bg-violet-600' : 'w-2 bg-indigo-200 hover:bg-indigo-400 dark:bg-indigo-800'}`} />)}</div>
          <button type="button" onClick={() => setActive(next)} aria-label="Next agent" className="grid size-11 place-items-center rounded-full border border-indigo-200 bg-white text-slate-700 shadow-lg transition hover:translate-x-1 hover:border-indigo-400 dark:border-indigo-400/20 dark:bg-slate-900 dark:text-white"><ArrowRight className="size-5" /></button>
        </div>
        <p className="mt-3 text-center text-[10px] font-bold tracking-widest text-slate-400 uppercase">{String(active + 1).padStart(2, '0')} / {String(AGENTS.length).padStart(2, '0')} · {paused ? 'Paused' : 'Auto playing'}</p>
      </div>
      <style>{`@keyframes carouselIn{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){[class*="carouselIn"]{animation:none!important}}`}</style>
    </section>
  );
}
