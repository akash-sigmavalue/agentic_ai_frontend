"use client";

import type { ReactNode } from "react";

type AiPanelHeaderProps = {
  icon: ReactNode;
  kicker: string;
  title: string;
  right?: ReactNode;
  status?: boolean;
};

export default function AiPanelHeader({
  icon,
  kicker,
  title,
  right,
  status = true,
}: AiPanelHeaderProps) {
  return (
    <div className="connector-panel-header flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 px-4 dark:border-slate-700/80">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-500/15 text-base text-blue-500">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {kicker}
          </div>
          <div className="mt-0.5 truncate text-[13px] font-extrabold text-slate-950 dark:text-white">
            {status ? <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500" /> : null}
            {title}
          </div>
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
