'use client';

import Image from 'next/image';
import { ArrowRight, Network, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import CortexAgentCard from './CortexAgentCard';
import { CORTEX_AGENTS } from './agents';

export default function NeuralPropertyCortex() {
  const [activeKey, setActiveKey] = useState(CORTEX_AGENTS[0].key);
  const active = CORTEX_AGENTS.find((agent) => agent.key === activeKey) ?? CORTEX_AGENTS[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveKey((current) => {
        const index = CORTEX_AGENTS.findIndex((agent) => agent.key === current);
        return CORTEX_AGENTS[(index + 1) % CORTEX_AGENTS.length].key;
      });
    }, 4300);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-indigo-200 bg-[radial-gradient(circle_at_68%_45%,rgba(99,102,241,.2),transparent_30%),linear-gradient(145deg,#fff,#eef2ff)] p-3 shadow-[0_30px_90px_rgba(62,66,131,.16)] dark:border-indigo-400/20 dark:bg-[radial-gradient(circle_at_68%_45%,rgba(99,102,241,.18),transparent_30%),linear-gradient(145deg,#050a17,#091226)] sm:p-5">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(99,102,241,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,.12)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(circle_at_65%_45%,black,transparent_72%)]" />

      <div className="relative grid min-h-[760px] gap-5 lg:grid-cols-[minmax(300px,.7fr)_minmax(680px,1.65fr)]">
        <div className="relative z-20 flex flex-col justify-center overflow-hidden rounded-[28px] border border-indigo-200 bg-white/75 p-7 backdrop-blur-xl dark:border-indigo-400/20 dark:bg-slate-950/65 sm:p-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-300 bg-indigo-500/5 px-3 py-2 text-[10px] font-black tracking-[.14em] text-indigo-600 uppercase dark:border-indigo-400/30 dark:text-indigo-300"><Network className="size-4" /> Neural property cortex</span>
          <h2 className="mt-6 text-5xl leading-[.96] font-black tracking-[-.055em] text-slate-950 sm:text-6xl dark:text-white">One property.<span className="mt-2 block bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Every intelligence.</span></h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">A coordinated network of specialist AI agents evaluates every real-estate asset from spatial, market, financial, physical, documentary and legal perspectives.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-5 py-4 text-sm font-bold text-white shadow-[0_14px_35px_rgba(79,70,229,.3)] transition hover:-translate-y-1"><Sparkles className="size-5" /> Explore intelligence <ArrowRight className="size-4" /></button>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-2">
            {[['9', 'Specialists'], ['24/7', 'Orchestration'], ['1', 'Unified answer']].map(([value, label]) => <div key={label} className="rounded-2xl border border-indigo-100 bg-white/60 p-3 dark:border-indigo-400/15 dark:bg-white/5"><b className="block text-lg text-slate-950 dark:text-white">{value}</b><span className="text-[9px] text-slate-500 dark:text-slate-400">{label}</span></div>)}
          </div>
        </div>

        <div className="relative hidden min-h-[720px] overflow-hidden rounded-[28px] border border-indigo-200/70 bg-white/35 dark:border-indigo-400/15 dark:bg-slate-950/25 lg:block">
          <span className="absolute top-5 left-6 z-20 flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-slate-500 uppercase dark:text-slate-400"><i className="size-2 animate-pulse rounded-full bg-[var(--active)]" style={{ '--active': active.color } as React.CSSProperties} /> Live orchestration map</span>
          <div className="absolute inset-[17%] animate-[spin_36s_linear_infinite] rounded-full border border-dashed border-indigo-400/35" />
          <div className="absolute top-1/2 left-1/2 h-[54%] w-[54%] -translate-x-1/2 -translate-y-1/2">
            <div className="absolute inset-0 rounded-full bg-indigo-200/40 blur-[80px] dark:bg-transparent" />
            <Image src="/images/design-2-property-cortex.png" alt="Futuristic neural property cortex" fill sizes="45vw" className="animate-[cortexFloat_5.5s_ease-in-out_infinite] object-contain brightness-105 drop-shadow-[0_30px_32px_rgba(79,70,229,.3)] dark:brightness-90" />
          </div>
          <div className="absolute top-[54%] left-1/2 z-10 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--active)] bg-white/80 text-center shadow-[0_0_55px_color-mix(in_srgb,var(--active)_35%,transparent)] backdrop-blur-xl dark:bg-slate-950/80" style={{ '--active': active.color } as React.CSSProperties}>
            <span><small className="block text-[8px] font-black tracking-widest text-[var(--active)] uppercase">Super Agent</small><b className="mt-1 block text-sm text-slate-950 dark:text-white">Property<br />Nucleus</b></span>
          </div>
          {CORTEX_AGENTS.map((agent) => <CortexAgentCard key={agent.key} agent={agent} active={agent.key === activeKey} onSelect={() => setActiveKey(agent.key)} />)}
          <aside className="absolute bottom-25 left-1/2 z-20 w-[48%] -translate-x-1/2 rounded-2xl border border-indigo-200 bg-white/80 p-4 shadow-xl backdrop-blur-xl dark:border-indigo-400/20 dark:bg-slate-950/80">
            <small className="font-black tracking-widest text-[var(--active)] uppercase" style={{ '--active': active.color } as React.CSSProperties}>{active.kicker}</small>
            <h3 className="mt-1 text-base font-extrabold text-slate-950 dark:text-white">{active.title}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-300">{active.summary}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950"><i className="block h-full w-4/5 animate-pulse rounded-full bg-gradient-to-r from-[var(--active)] to-cyan-400" style={{ '--active': active.color } as React.CSSProperties} /></div>
          </aside>
        </div>

        <div className="relative lg:hidden">
          <div className="relative mx-auto h-[380px] max-w-xl"><Image src="/images/design-2-property-cortex.png" alt="Futuristic neural property cortex" fill sizes="100vw" className="object-contain drop-shadow-[0_24px_30px_rgba(79,70,229,.3)]" /></div>
          <div className="-mt-7 mb-5 rounded-2xl border border-indigo-200 bg-white/80 p-4 text-center backdrop-blur-xl dark:border-indigo-400/20 dark:bg-slate-950/80"><small className="font-black tracking-widest text-[var(--active)] uppercase" style={{ '--active': active.color } as React.CSSProperties}>{active.kicker}</small><h3 className="mt-1 font-extrabold text-slate-950 dark:text-white">{active.title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{active.summary}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{CORTEX_AGENTS.map((agent) => <CortexAgentCard key={agent.key} agent={agent} active={agent.key === activeKey} mobile onSelect={() => setActiveKey(agent.key)} />)}</div>
        </div>
      </div>
      <style>{`@keyframes cortexFloat{50%{transform:translateY(-10px)}}@media(prefers-reduced-motion:reduce){[class*="cortexFloat"]{animation:none!important}}`}</style>
    </section>
  );
}
