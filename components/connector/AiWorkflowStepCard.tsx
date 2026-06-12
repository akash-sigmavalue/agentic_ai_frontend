"use client";

import { useState } from "react";

type AiWorkflowStepCardProps = {
  step: {
    emoji?: string;
    title: string;
    desc?: string;
    tag?: string;
    ms?: number | null;
    status?: string;
    details?: string;
  };
  running?: boolean;
};

export default function AiWorkflowStepCard({ step, running = false }: AiWorkflowStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const status = String(step.status || (running ? "running" : "completed")).toLowerCase();
  const isError = status.includes("error") || status.includes("fail");
  const isRunning = running || status.includes("running") || status.includes("pending") || status.includes("stream");
  const canExpand = Boolean(step.details);

  return (
    <button
      type="button"
      onClick={() => canExpand && setExpanded((value) => !value)}
      className="connector-card relative grid w-full animate-[slideIn_.35s_ease_both] grid-cols-[44px_1fr_auto] gap-3 overflow-hidden rounded-[22px] border border-slate-200/70 bg-white/80 p-4 text-left shadow-[0_18px_55px_rgba(15,23,42,0.08)] transition hover:border-blue-400/40 dark:border-slate-700/80 dark:bg-slate-900/70"
    >
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-blue-500 via-red-500 to-green-500" />
      <div className={`grid h-10 w-10 place-items-center rounded-full outline outline-[6px] ${isError ? "bg-red-500/15 text-red-500 outline-red-500/5" : "bg-green-500/15 text-green-500 outline-green-500/5"}`}>
        {isRunning ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" /> : step.emoji || "✦"}
      </div>
      <div className="min-w-0">
        <h4 className="truncate text-sm font-black text-slate-950 dark:text-white">✦ {step.title}</h4>
        {step.desc ? <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.desc}</p> : null}
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          {isRunning ? "running..." : step.ms ? `- ${step.ms}ms` : status || "completed"}
          {canExpand ? <span className="ml-2 font-bold text-blue-400">{expanded ? "Hide details" : "View details"}</span> : null}
        </div>
        {expanded && step.details ? (
          <div className="connector-subcard mt-3 max-h-72 overflow-auto rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4 text-xs leading-6 text-slate-700 [overflow-wrap:anywhere] dark:border-blue-400/15 dark:bg-slate-950/70 dark:text-slate-200">
            <p className="whitespace-pre-line break-words">{step.details}</p>
          </div>
        ) : null}
      </div>
      {step.tag ? (
        <div className="h-fit max-w-[120px] truncate rounded-full bg-blue-500/15 px-2.5 py-1 font-mono text-[11px] font-bold text-blue-500">
          {step.tag}
        </div>
      ) : null}
    </button>
  );
}
