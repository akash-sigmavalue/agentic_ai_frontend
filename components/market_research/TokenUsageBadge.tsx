import React from "react";
import { TokenUsage } from "@/types/market_research";

interface Props {
  title: string;
  usage: TokenUsage;
}

export default function TokenUsageBadge({ title, usage }: Props) {
  return (
    <div className="inline-flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-300">
      <span className="font-semibold text-blue-400">{title}:</span>
      <span>In: <strong className="text-gray-100">{usage.input_tokens}</strong></span>
      <span>Out: <strong className="text-gray-100">{usage.output_tokens}</strong></span>
      <span>Total: <strong className="text-emerald-400">{usage.total_tokens}</strong></span>
    </div>
  );
}
