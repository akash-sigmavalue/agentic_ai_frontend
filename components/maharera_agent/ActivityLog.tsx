import { Trash2 } from "lucide-react";
import AgentCard from "./AgentCard";
import type { LogEntry } from "./types";

type ActivityLogProps = {
  entries: LogEntry[];
  onClear: () => void;
};

export default function ActivityLog({ entries, onClear }: ActivityLogProps) {
  return (
    <AgentCard
      title="Activity log"
      action={
        <button
          type="button"
          onClick={onClear}
          className="flex min-h-8 items-center gap-2 rounded-xl border border-border bg-bg-card px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary transition hover:border-border-glow hover:text-text-primary"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      }
    >
      <div className="custom-scrollbar h-full min-h-64 overflow-y-auto rounded-2xl border border-white/[0.04] bg-bg-deep/70 p-4 font-mono text-[11px] leading-6 text-text-secondary">
        {!entries.length ? (
          <p className="text-text-dim">No activity yet. Run, ask, or plan a query to see live progress here.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="whitespace-pre-wrap break-words">
              <span className="mr-2 text-text-dim">{entry.time}</span>
              <span className={toneClass(entry.tone)}>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </AgentCard>
  );
}

function toneClass(tone: LogEntry["tone"]) {
  if (tone === "error") return "text-danger";
  if (tone === "data") return "text-success";
  if (tone === "step") return "text-accent-light";
  return "";
}
