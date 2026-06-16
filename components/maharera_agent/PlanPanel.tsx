import AgentCard from "./AgentCard";

type PlanPanelProps = {
  plan: unknown[] | null;
};

export default function PlanPanel({ plan }: PlanPanelProps) {
  if (!plan) return null;

  return (
    <AgentCard title="Action plan">
      <pre className="custom-scrollbar h-full min-h-64 overflow-auto rounded-2xl border border-white/[0.04] bg-bg-deep/70 p-4 font-mono text-[11px] leading-6 text-text-secondary">
        {JSON.stringify(plan, null, 2)}
      </pre>
    </AgentCard>
  );
}
