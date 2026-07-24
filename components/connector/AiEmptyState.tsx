// demoo
"use client";

import type { ReactNode } from "react";

function NodeMap() {
  return (
    <div className="relative mt-3 hidden h-10 overflow-hidden rounded-2xl bg-gradient-to-r from-transparent via-blue-500/10 to-transparent sm:block">
      <span className="absolute left-[10%] top-[22%] h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_18px_#4285f4]" />
      <span className="absolute left-[32%] top-[62%] h-2 w-2 rounded-full bg-red-500 shadow-[0_0_18px_#ea4335]" />
      <span className="absolute left-[58%] top-[25%] h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_#34a853]" />
      <span className="absolute left-[82%] top-[60%] h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_18px_#fbbc04]" />
    </div>
  );
}

type AiEmptyStateProps = {
  icon: ReactNode;
  title: string;
  text: string;
};

export default function AiEmptyState({ icon, title, text }: AiEmptyStateProps) {
  return (
    <div className="flex h-full min-h-[170px] items-center justify-center p-4 text-center">
      <div>
        <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-[20px] border border-blue-500/25 bg-gradient-to-br from-blue-500/20 to-red-500/10 text-2xl shadow-[0_0_46px_rgba(66,133,244,.22)]">
          {icon}
        </div>
        <h3 className="mt-4 text-sm font-black text-slate-950 dark:text-white">
          {title}
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {text}
        </p>
        <NodeMap />
      </div>
    </div>
  );
}
