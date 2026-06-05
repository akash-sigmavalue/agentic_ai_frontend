"use client";

import PipelineStagesSection from "./PipelineStagesSection";

function formatTokenNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

function TokenLedger({ tokenEvents = [] }) {
  if (!tokenEvents.length) {
    return (
      <div className="rounded-2xl border px-4 py-3 text-xs" style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)", color: "var(--text-muted)" }}>
        Token usage will appear here as each stage runs.
      </div>
    );
  }

  return (
    <div className="max-h-[190px] overflow-auto pr-1">
      <div className="space-y-2">
        {tokenEvents.map((event) => (
          <div key={event.id} className="rounded-2xl border px-3 py-2" style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="truncate text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {event.stage}
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {formatTokenNumber(event.totalTokens)} tok
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegacyStageTimeline({ stageCards = [] }) {
  if (!stageCards.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="m-0 text-sm" style={{ color: "var(--text-secondary)" }}>
          Send a query and Agent v1 events will appear here as a simple timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-scroll space-y-3 p-4">
      {stageCards.map((card) => (
        <details key={card.id} className="rounded-2xl border" style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)" }} open>
          <summary className="cursor-pointer list-none px-4 py-3 marker:content-none">
            <div className="flex items-center gap-3">
              <span>{card.icon || "⚙️"}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{card.title}</span>
                <span className="block text-xs" style={{ color: "var(--text-muted)" }}>{card.subtitle}</span>
              </span>
              <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-dim)" }}>{card.status}</span>
            </div>
          </summary>
          <div className="border-t px-4 py-3 text-xs whitespace-pre-wrap leading-relaxed" style={{ borderColor: "var(--border-soft)", color: "var(--text-secondary)" }}>
            {card.payload || "No details."}
          </div>
        </details>
      ))}
    </div>
  );
}

export default function WorkflowSection({
  variant = "v1",
  stageCards = [],
  pipelineStages = [],
  pipelineCatalog = [],
  stageReport = null,
  onDownloadStageReport,
  isGenerating = false,
  totalTokens = 0,
  tokenEvents = [],
}) {
  if (variant === "v2") {
    return (
      <PipelineStagesSection
        pipelineStages={pipelineStages}
        pipelineCatalog={pipelineCatalog}
        stageReport={stageReport}
        onDownloadStageReport={onDownloadStageReport}
        isGenerating={isGenerating}
        totalTokens={totalTokens}
        tokenEvents={tokenEvents}
      />
    );
  }

  const isEmpty = !stageCards.length;

  return (
    <section className="app-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "var(--accent-glow)", color: "var(--accent-light)" }}>⚡</div>
        <div>
          <h2 className="m-0 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Agent Timeline</h2>
          <p className="m-0 text-xs" style={{ color: "var(--text-muted)" }}>Agent v1 stream events</p>
        </div>
      </div>
      <div className="execution-flow-scroll relative min-h-0 flex-1 overflow-y-auto">
        <LegacyStageTimeline stageCards={stageCards} />
      </div>
      <div className="border-t px-5 py-4" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
        <div className="mb-2 flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{isEmpty ? "Waiting for first event" : `${stageCards.length} events`}</span>
          <span style={{ color: "var(--text-primary)" }}>Total Tokens: <strong>{formatTokenNumber(totalTokens)}</strong></span>
        </div>
        <TokenLedger tokenEvents={tokenEvents} />
      </div>
    </section>
  );
}
