import { Bot, FlaskConical, ListChecks, Play, SlidersHorizontal } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import AgentCard from "./AgentCard";
import StatusChip from "./StatusChip";
import type { BackendConfig, StatusKind } from "./types";

type QueryPanelProps = {
  query: string;
  urlOverride: string;
  districtHint: string;
  apiBaseUrl: string;
  statusText: string;
  statusKind: StatusKind;
  busy: boolean;
  backendConfig: BackendConfig;
  onQueryChange: (value: string) => void;
  onUrlOverrideChange: (value: string) => void;
  onDistrictHintChange: (value: string) => void;
  onApiBaseUrlChange: (value: string) => void;
  onRun: () => void;
  onAsk: () => void;
  onPlan: () => void;
  onBrowserTest: () => void;
};

export default function QueryPanel({
  query,
  urlOverride,
  districtHint,
  apiBaseUrl,
  statusText,
  statusKind,
  busy,
  backendConfig,
  onQueryChange,
  onUrlOverrideChange,
  onDistrictHintChange,
  onApiBaseUrlChange,
  onRun,
  onAsk,
  onPlan,
  onBrowserTest,
}: QueryPanelProps) {
  return (
    <AgentCard title="Agent command" action={<StatusChip text={statusText} kind={statusKind} />}>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div>
          <label htmlFor="maharera-query" className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-text-dim">
            Search intent
          </label>
          <textarea
            id="maharera-query"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={
              "e.g. Get all registered residential projects in Pune district, Maharashtra\nor: Show ongoing commercial projects by promoter Lodha in Thane\nor: List RERA registered projects in Ghaziabad, UP with status Ongoing"
            }
            className="min-h-36 w-full resize-y rounded-2xl border border-border bg-bg-input px-4 py-3 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-dim focus:border-accent focus:bg-accent/5"
          />
          <p className="mt-2 text-[11px] leading-5 text-text-dim">
            Write naturally and include the city, district, state, project type, promoter, or status where useful. The agent extracts the location, picks the matching state RERA portal, and builds the search plan.
          </p>
        </div>

        <details className="group rounded-2xl border border-border bg-bg-card/60">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-accent-light">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            <span className="transition group-open:rotate-90">{">"}</span>
            Advanced options and backend
          </summary>
          <div className="grid gap-4 border-t border-border/60 p-4">
            <Field label="Portal URL override" hint="Use this only when you want to force a specific portal URL.">
              <input
                type="text"
                value={urlOverride}
                onChange={(event) => onUrlOverrideChange(event.target.value)}
                placeholder="Leave blank - auto-detected from your query"
                className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-accent focus:bg-accent/5"
              />
            </Field>
            <Field label="District hint" hint="Adds an explicit district filter on top of whatever is in your query.">
              <input
                type="text"
                value={districtHint}
                onChange={(event) => onDistrictHintChange(event.target.value)}
                placeholder="Leave blank - auto-detected from your query"
                className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-accent focus:bg-accent/5"
              />
            </Field>
            <Field label="Agent API base URL" hint="This value comes from NEXT_PUBLIC_MAHARERA_API_BASE_URL, with API fallbacks.">
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(event) => onApiBaseUrlChange(event.target.value)}
                className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 font-mono text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-accent focus:bg-accent/5"
              />
            </Field>
            <div className="rounded-xl border border-border bg-bg-deep/45 p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-text-dim">Backend endpoints</p>
              <Endpoint label="Stream" value={`${backendConfig.apiBaseUrl}${backendConfig.crawlStreamPath}`} />
              <Endpoint label="Plan" value={`${backendConfig.apiBaseUrl}${backendConfig.planPath}`} />
              <Endpoint label="Browser" value={`${backendConfig.apiBaseUrl}${backendConfig.browserTestPath}`} />
            </div>
          </div>
        </details>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-1">
          <ActionButton label="Run agent" icon={Play} busy={busy} primary onClick={onRun} />
          <ActionButton label="Ask agent" icon={Bot} busy={busy} onClick={onAsk} />
          <ActionButton label="Plan only" icon={ListChecks} busy={busy} onClick={onPlan} />
          <ActionButton label="Browser test" icon={FlaskConical} busy={busy} onClick={onBrowserTest} />
        </div>
      </div>
    </AgentCard>
  );
}

type FieldProps = {
  label: string;
  hint: string;
  children: ReactNode;
};

function Field({ label, hint, children }: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-text-dim">{label}</label>
      {children}
      <p className="mt-2 text-[10px] leading-4 text-text-dim">{hint}</p>
    </div>
  );
}

type EndpointProps = {
  label: string;
  value: string;
};

function Endpoint({ label, value }: EndpointProps) {
  return (
    <div className="mb-2 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 text-[10px]">
      <span className="font-black uppercase tracking-[0.14em] text-text-dim">{label}</span>
      <span className="truncate font-mono text-text-secondary" title={value}>
        {value}
      </span>
    </div>
  );
}

type ActionButtonProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  busy: boolean;
  primary?: boolean;
  onClick: () => void;
};

function ActionButton({ label, icon: Icon, busy, primary, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
        primary
          ? "bg-accent text-bg-deep hover:bg-accent-light"
          : "border border-border bg-bg-card text-text-secondary hover:border-border-glow hover:text-text-primary"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
