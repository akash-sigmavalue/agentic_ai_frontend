import { AlertTriangle, Check, Circle, LoaderCircle, PauseCircle, Route } from "lucide-react";
import AgentCard from "./AgentCard";

type PlanStep = {
  step_number?: number;
  description?: string;
  action?: string;
};

export type WorkflowStepStatus = "pending" | "running" | "done" | "failed";

type WorkflowPanelProps = {
  plan: unknown[] | null;
  statuses: Record<string, WorkflowStepStatus>;
  paused: boolean;
  busy: boolean;
};

const discoverySteps: PlanStep[] = [
  { step_number: 1, description: "Understand the request", action: "resolve" },
  { step_number: 2, description: "Find the official RERA portal", action: "navigate" },
  { step_number: 3, description: "Build the search workflow", action: "plan" },
];

function toPlanStep(value: unknown): PlanStep | null {
  if (!value || typeof value !== "object") return null;
  const step = value as Record<string, unknown>;
  return {
    step_number: typeof step.step_number === "number" ? step.step_number : undefined,
    description: typeof step.description === "string" ? step.description : undefined,
    action: typeof step.action === "string" ? step.action : undefined,
  };
}

function actionLabel(action?: string) {
  return (action || "processing").replaceAll("_", " ");
}

function statusLabel(status: WorkflowStepStatus, paused: boolean) {
  if (paused && status === "running") return "Waiting for you";
  if (status === "running") return "In progress";
  if (status === "done") return "Complete";
  if (status === "failed") return "Needs attention";
  return "Queued";
}

export default function WorkflowPanel({ plan, statuses, paused, busy }: WorkflowPanelProps) {
  const plannedSteps = (plan || []).map(toPlanStep).filter((step): step is PlanStep => step !== null);
  const steps = plannedSteps.length ? plannedSteps : discoverySteps;
  const completedCount = steps.filter((step) => statuses[String(step.step_number)] === "done").length;
  const activeStatus = paused ? "Paused for CAPTCHA" : busy ? "Live execution" : plan ? "Ready to run" : "Preparing workflow";

  return (
    <AgentCard
      title="Live workflow"
      action={
        <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
          paused ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : busy ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-border bg-bg-card text-text-dim"
        }`}>
          {activeStatus}
        </span>
      }
    >
      <div className="flex h-full min-h-64 flex-col">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-bg-deep/50 px-3 py-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-text-secondary">Progress</span>
          <span className="font-mono text-xs font-bold text-accent">{completedCount}/{steps.length}</span>
        </div>

        <ol className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {steps.map((step, index) => {
            const id = String(step.step_number ?? index + 1);
            const status = statuses[id] || "pending";
            const isPaused = paused && status === "running";
            const Icon = isPaused ? PauseCircle : status === "done" ? Check : status === "failed" ? AlertTriangle : status === "running" ? LoaderCircle : Circle;
            const tone = isPaused
              ? "border-amber-400/35 bg-amber-400/[0.08] text-amber-200"
              : status === "done"
                ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
                : status === "failed"
                  ? "border-rose-400/35 bg-rose-400/[0.08] text-rose-300"
                  : status === "running"
                    ? "border-cyan-400/40 bg-cyan-400/[0.08] text-cyan-200"
                    : "border-border bg-bg-card/40 text-text-dim";

            return (
              <li key={id} className="relative flex gap-3 pb-3 last:pb-0">
                {index < steps.length - 1 ? <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-border" /> : null}
                <span className={`z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${tone}`}>
                  <Icon className={`h-3.5 w-3.5 ${status === "running" ? "animate-spin" : ""}`} />
                </span>
                <div className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 ${tone}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold leading-5 text-text-primary">{step.description || "Continue portal workflow"}</p>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em]">{statusLabel(status, paused)}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] opacity-80">
                    <Route className="h-3 w-3" /> {actionLabel(step.action)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </AgentCard>
  );
}
