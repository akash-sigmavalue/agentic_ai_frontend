"use client";

import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { locationDetails, valuationData } from "./data";

export default function ValuationTab({ onOpenReport }: { onOpenReport: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        {valuationData.map((item, index) => (
          <div key={item.label} className={index === 0 ? "map-agent-stat col-span-2 featured" : "map-agent-stat"}>
            <span>{item.label}</span><strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 dark:border-indigo-400/20 dark:bg-indigo-500/10">
        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />Confidence score</span>
        <strong className="text-indigo-700 dark:text-indigo-300">{locationDetails.confidence}%</strong>
      </div>
      <button type="button" onClick={onOpenReport} className="map-agent-report-button bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500">
        View Full Valuation Report <ArrowUpRight />
      </button>
    </div>
  );
}
