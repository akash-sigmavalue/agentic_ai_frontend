"use client";

import type { ReactNode } from "react";

type AiMetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  note?: string;
  color?: "red" | "blue" | "green" | "yellow";
};

const colorMap = {
  red: "bg-red-500/15 text-red-500",
  blue: "bg-blue-500/15 text-blue-500",
  green: "bg-green-500/15 text-green-500",
  yellow: "bg-yellow-500/15 text-yellow-500",
};

export default function AiMetricCard({
  icon,
  label,
  value,
  note,
  color = "blue",
}: AiMetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-slate-200/70 bg-white/80 p-3 shadow-[0_14px_42px_rgba(15,23,42,0.08)] dark:border-slate-700/80 dark:bg-slate-900/80 lg:p-4">
      <div className="relative z-10 flex items-center gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-1 truncate text-xl font-black leading-none text-slate-950 dark:text-white">
            {value} {note ? <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{note}</span> : null}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-16 left-0 right-0 h-28 bg-blue-500/10 blur-2xl" />
    </div>
  );
}
