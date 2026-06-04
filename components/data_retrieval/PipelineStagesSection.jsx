"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STAGE_ACCENTS = [
  { color: "#22d3ee", glow: "rgba(34,211,238,0.22)", border: "rgba(34,211,238,0.45)" },
  { color: "#2dd4bf", glow: "rgba(45,212,191,0.2)", border: "rgba(45,212,191,0.42)" },
  { color: "#38bdf8", glow: "rgba(56,189,248,0.2)", border: "rgba(56,189,248,0.42)" },
  { color: "#a78bfa", glow: "rgba(167,139,250,0.24)", border: "rgba(167,139,250,0.48)" },
  { color: "#c084fc", glow: "rgba(192,132,252,0.22)", border: "rgba(192,132,252,0.45)" },
  { color: "#818cf8", glow: "rgba(129,140,248,0.22)", border: "rgba(129,140,248,0.45)" },
  { color: "#f472b6", glow: "rgba(244,114,182,0.2)", border: "rgba(244,114,182,0.42)" },
  { color: "#fb7185", glow: "rgba(251,113,133,0.2)", border: "rgba(251,113,133,0.42)" },
  { color: "#fbbf24", glow: "rgba(251,191,36,0.18)", border: "rgba(251,191,36,0.4)" },
  { color: "#f97316", glow: "rgba(249,115,22,0.18)", border: "rgba(249,115,22,0.4)" },
  { color: "#34d399", glow: "rgba(52,211,153,0.22)", border: "rgba(52,211,153,0.45)" },
];

function formatTokenNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

function shortStageLabel(stage, index) {
  const base = stage.base_id || stage.id || "";
  const map = {
    stage_1: "S1",
    stage_1_5: "S1.5",
    stage_1_6: "S1.6",
    stage_2: "S2",
    stage_2_1: "S2.1",
    stage_3: "S3",
    stage_3_1: "S3A",
    stage_3_2: "S3B",
    stage_3_3: "S3C",
    stage_3_4: "S3D",
    stage_4: "S4",
  };
  if (map[base]) {
    return stage.iteration ? `${map[base]}.${stage.iteration}` : map[base];
  }
  return `S${index + 1}`;
}

function stageHeading(stage, catalog) {
  const title = (stage.title || catalog?.title || stage.id || "").replace(/^Stage\s*/i, "");
  const label = (catalog?.subtitle || stage.subtitle || "Pipeline step").toUpperCase();
  return `${title.toUpperCase()} — ${label}`;
}

function stageSummary(stage, catalog) {
  const parts = [catalog?.subtitle || stage.subtitle];
  const firstStep = stage.steps?.[0];
  if (firstStep?.value && firstStep.value !== "—") {
    parts.push(String(firstStep.value).slice(0, 72));
  }
  if (stage.status === "running") {
    parts.push("Executing prompt...");
  }
  return parts.filter(Boolean).join(" · ");
}

function accentForIndex(index) {
  return STAGE_ACCENTS[index % STAGE_ACCENTS.length];
}

function Chevron({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ProgressTimeline({ timeline, expandedId, accentForStage }) {
  if (!timeline.length) {
    return null;
  }

  return (
    <div className="px-5 pb-4 pt-1">
      <div className="relative flex items-center justify-between gap-1">
        <div
          className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2"
          style={{ background: "linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent-secondary) 40%, transparent))" }}
        />
        {timeline.map((stage, index) => {
          const accent = accentForStage(index, stage);
          const active = stage.id === expandedId;
          const done = stage.status === "completed" || stage.status === "needs_clarification";
          const running = stage.status === "running";
          const pending = stage.status === "pending";
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center gap-1.5" style={{ minWidth: 36 }}>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-[9px] font-bold tracking-wide"
                style={{
                  borderColor: pending ? "var(--border-soft)" : accent.border,
                  background: pending ? "var(--bg-input)" : active || running ? accent.glow : "var(--bg-card)",
                  color: pending ? "var(--text-muted)" : accent.color,
                  boxShadow: running || active ? `0 0 16px ${accent.glow}` : "none",
                }}
              >
                {shortStageLabel(stage, index)}
              </div>
              {done ? (
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent.color }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExecutionStepCard({ step, index, accent }) {
  const code = `AG-${String(index + 1).padStart(2, "0")}`;
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: "color-mix(in srgb, var(--border-soft) 80%, transparent)",
        background: "color-mix(in srgb, var(--bg-deep) 65%, var(--bg-input))",
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm"
            style={{ background: accent.glow, color: accent.color, border: `1px solid ${accent.border}` }}
          >
            📋
          </div>
          <div>
            <h5 className="m-0 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-primary)" }}>
              {step.label}
            </h5>
            {step.detail ? (
              <p className="m-0 mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                {step.detail}
              </p>
            ) : null}
          </div>
        </div>
        <span
          className="shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold"
          style={{ borderColor: accent.border, color: accent.color, background: accent.glow }}
        >
          {code}
        </span>
      </div>
      <div
        className="rounded-lg border p-3 text-xs leading-relaxed"
        style={{ borderColor: "var(--border-dim)", background: "var(--bg-deep)", color: "var(--text-secondary)" }}
      >
        <div className="whitespace-pre-wrap break-words">{step.value}</div>
      </div>
    </div>
  );
}

function StageAccordionCard({ stage, catalog, index, isExpanded, onToggle, showRaw }) {
  const accent = accentForIndex(index);
  const steps = Array.isArray(stage.steps) ? stage.steps : [];
  const stepCount = steps.length;
  const disabled = stage.status === "pending";
  const heading = stageHeading(stage, catalog);
  const summary = stageSummary(stage, catalog);

  return (
    <article
      className="overflow-hidden rounded-2xl border transition-shadow"
      style={{
        borderColor: isExpanded ? accent.border : "var(--border-soft)",
        background: "var(--bg-card)",
        boxShadow: isExpanded ? `0 0 0 1px ${accent.glow}, 0 12px 32px rgba(0,0,0,0.22)` : "none",
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onToggle(stage.id)}
        className="flex w-full items-start gap-3 px-4 py-4 text-left disabled:cursor-default disabled:opacity-50"
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{
            background: accent.glow,
            border: `1px solid ${accent.border}`,
            color: accent.color,
          }}
        >
          {stage.icon || catalog?.icon || "⚙️"}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="m-0 text-[11px] font-bold uppercase tracking-[0.1em]"
            style={{ color: accent.color }}
          >
            {heading}
          </h3>
          <p className="m-0 mt-1.5 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {summary}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className="rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]"
            style={{ borderColor: accent.border, color: accent.color, background: accent.glow }}
          >
            {stepCount || (stage.status === "running" ? "…" : "0")} STAGE STEPS
          </span>
          {!disabled ? <Chevron open={isExpanded} /> : null}
        </div>
      </button>

      {isExpanded && !disabled ? (
        <div className="border-t px-4 pb-4 pt-2" style={{ borderColor: "var(--border-soft)" }}>
          <div className="my-3 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "var(--border-soft)" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accent.color }}>
              Execution Steps
            </span>
            <div className="h-px flex-1" style={{ background: "var(--border-soft)" }} />
          </div>

          {steps.length ? (
            <div className="space-y-3">
              {steps.map((step, stepIndex) => (
                <ExecutionStepCard key={step.id} step={step} index={stepIndex} accent={accent} />
              ))}
            </div>
          ) : (
            <p className="m-0 rounded-xl border px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border-soft)", color: "var(--text-muted)" }}>
              {stage.phase === "running" ? "Waiting for the Agent to finish this stage..." : "No execution steps were returned."}
            </p>
          )}

          {showRaw && stage.raw_output ? (
            <div className="mt-4">
              <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
                Raw JSON
              </p>
              <pre
                className="max-h-[220px] overflow-auto rounded-xl border p-3 text-[10px] leading-5"
                style={{ borderColor: "var(--border-soft)", background: "var(--bg-deep)", color: "var(--text-secondary)" }}
              >
                {JSON.stringify(stage.raw_output, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function TokenLedger({ tokenEvents = [], totalTokens = 0 }) {
  return (
    <details className="shrink-0 border-t" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
      <summary className="cursor-pointer list-none px-5 py-3 marker:content-none">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-secondary)" }}>
            Token ledger
          </span>
          <span style={{ color: "var(--text-primary)" }}>
            Total <strong>{formatTokenNumber(totalTokens)}</strong>
            {tokenEvents.length ? ` · ${tokenEvents.length} events` : ""}
          </span>
        </div>
      </summary>
      <div className="max-h-[140px] overflow-y-auto px-5 pb-4 execution-flow-scroll">
        {tokenEvents.length ? (
          <div className="space-y-2">
            {tokenEvents.map((event) => (
              <div key={event.id} className="rounded-xl border px-3 py-2 text-[11px]" style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)" }}>
                <div className="flex justify-between gap-2">
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>{event.stage}</span>
                  <span style={{ color: "var(--text-muted)" }}>{formatTokenNumber(event.totalTokens)} tok</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 text-xs" style={{ color: "var(--text-muted)" }}>
            Token usage appears as each Agent stage completes.
          </p>
        )}
      </div>
    </details>
  );
}

export default function PipelineStagesSection({
  pipelineStages = [],
  pipelineCatalog = [],
  stageReport = null,
  onDownloadStageReport,
  isGenerating = false,
  totalTokens = 0,
  tokenEvents = [],
}) {
  const [expandedStageId, setExpandedStageId] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const userPickedExpansionRef = useRef(false);

  const sortedStages = useMemo(
    () => [...pipelineStages].sort((left, right) => (left.order || 0) - (right.order || 0)),
    [pipelineStages],
  );

  const catalogById = useMemo(
    () => new Map((pipelineCatalog || []).map((item) => [item.id, item])),
    [pipelineCatalog],
  );

  const timeline = useMemo(() => {
    if (!pipelineCatalog.length) {
      return sortedStages;
    }
    const seen = new Set(sortedStages.map((stage) => stage.base_id || stage.id));
    const pending = pipelineCatalog
      .filter((item) => !seen.has(item.id))
      .map((item) => ({
        ...item,
        id: item.id,
        base_id: item.id,
        status: "pending",
        phase: "pending",
        steps: [],
      }));
    return [...sortedStages, ...pending].sort((left, right) => (left.order || 0) - (right.order || 0));
  }, [pipelineCatalog, sortedStages]);

  const completedCount = timeline.filter((stage) => stage.status === "completed" || stage.status === "needs_clarification" || stage.status === "error").length;
  const totalCount = timeline.length;

  useEffect(() => {
    if (!pipelineStages.length) {
      userPickedExpansionRef.current = false;
      setExpandedStageId(null);
    }
  }, [pipelineStages.length]);

  useEffect(() => {
    if (userPickedExpansionRef.current) {
      return;
    }

    const running = sortedStages.find((stage) => stage.status === "running" || stage.phase === "running");
    if (running) {
      setExpandedStageId(running.id);
      return;
    }

    if (sortedStages.length) {
      setExpandedStageId(sortedStages[sortedStages.length - 1].id);
    }
  }, [sortedStages]);

  function toggleStage(stageId) {
    userPickedExpansionRef.current = true;
    setExpandedStageId((current) => (current === stageId ? null : stageId));
  }

  const isEmpty = !timeline.length && !isGenerating;

  return (
    <section className="app-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b px-5 py-4" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 font-orbitron text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: "var(--text-primary)" }}>
              Agentic Execution Flow
            </h2>
            <p className="m-0 mt-1 text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
              Data retrieval agent v2 · prompt stages & steps
            </p>
          </div>
          <span
            className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)", color: "var(--text-secondary)" }}
          >
            {completedCount} / {totalCount || "—"} Stages
          </span>
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{
              borderColor: isGenerating ? "color-mix(in srgb, var(--success) 40%, transparent)" : "var(--border-soft)",
              background: isGenerating ? "var(--success-glow)" : "var(--bg-input)",
              color: isGenerating ? "var(--success)" : "var(--text-muted)",
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: isGenerating ? "var(--success)" : "var(--text-muted)",
                boxShadow: isGenerating ? "0 0 10px var(--success)" : "none",
              }}
            />
            {isGenerating ? "Active" : isEmpty ? "Idle" : "Ready"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <input type="checkbox" checked={showRaw} onChange={(event) => setShowRaw(event.target.checked)} />
            Show raw JSON inside expanded stages
          </label>
          {stageReport ? (
            <button
              type="button"
              onClick={onDownloadStageReport}
              className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] transition hover:brightness-110"
              style={{
                borderColor: "color-mix(in srgb, var(--success) 40%, transparent)",
                background: "var(--success-glow)",
                color: "var(--success)",
              }}
            >
              Download stage Word report
            </button>
          ) : null}
        </div>
      </div>

      {!isEmpty ? (
        <ProgressTimeline
          timeline={timeline}
          expandedId={expandedStageId}
          accentForStage={(index) => accentForIndex(index)}
        />
      ) : null}

      <div className="execution-flow-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
        {isGenerating && !sortedStages.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Stage 1 is running...</span>
          </div>
        ) : null}

        {isEmpty && !isGenerating ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <p className="m-0 max-w-sm text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Send a query with Agent v2. Stages appear as boxes — click a stage to expand its execution steps.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {timeline.map((stage, index) => (
              <StageAccordionCard
                key={stage.id}
                stage={stage}
                catalog={catalogById.get(stage.base_id || stage.id)}
                index={index}
                isExpanded={expandedStageId === stage.id}
                onToggle={toggleStage}
                showRaw={showRaw}
              />
            ))}
          </div>
        )}
      </div>

      <TokenLedger tokenEvents={tokenEvents} totalTokens={totalTokens} />
    </section>
  );
}
