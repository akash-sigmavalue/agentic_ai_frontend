"use client";

import { ArrowUpRight } from "lucide-react";
import { marketData } from "./data";

export default function MarketResearchTab({ onOpenReport }: { onOpenReport: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        {marketData.map((item, index) => (
          <div key={item.label} className={index === marketData.length - 1 ? "map-agent-stat col-span-2 market" : "map-agent-stat market"}>
            <span>{item.label}</span><strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <button type="button" onClick={onOpenReport} className="map-agent-report-button bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500">
        View Full Market Report <ArrowUpRight />
      </button>
    </div>
  );
}
