"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import Image from "next/image";
import { Check, Copy, Database, ExternalLink, Eye, Globe2, Loader2, Maximize2, RefreshCw, RotateCcw, Server, ShieldCheck, Tv } from "lucide-react";
import ActivityLog from "./ActivityLog";
import AgentShell from "./AgentShell";
import BadgeList from "./BadgeList";
import WorkflowPanel, { type WorkflowStepStatus } from "./WorkflowPanel";
import QueryPanel from "./QueryPanel";
import ResultsTable from "./ResultsTable";
import type { AgentEvent, BackendConfig, Badge, DataRow, LogEntry, PlanResponse, StatusKind } from "./types";

type MahaReraAgentAppProps = {
  initialApiBaseUrl: string;
};


const paths = {
  crawlStreamPath: "/rera/crawl/stream",
  planPath: "/rera/plan",
  browserTestPath: "/rera/browser/test",
};

export default function MahaReraAgentApp({ initialApiBaseUrl }: MahaReraAgentAppProps) {
  const [query, setQuery] = useState("");
  const [urlOverride, setUrlOverride] = useState("");
  const [districtHint, setDistrictHint] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl || "http://localhost:8000");
  const [statusText, setStatusText] = useState("Ready");
  const [statusKind, setStatusKind] = useState<StatusKind>();
  const [busy, setBusy] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [plan, setPlan] = useState<unknown[] | null>(null);
  const [workflowStatuses, setWorkflowStatuses] = useState<Record<string, WorkflowStepStatus>>({});
  const [results, setResults] = useState<DataRow[]>([]);
  const [captcha, setCaptcha] = useState<{ challengeId: string; image: string } | null>(null);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaSubmitting, setCaptchaSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "browser">("results");
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const activeSourceRef = useRef<EventSource | null>(null);

  const normalizedApiBaseUrl = useMemo(() => normalizeApiBase(apiBaseUrl), [apiBaseUrl]);

  const backendConfig: BackendConfig = useMemo(
    () => ({
      apiBaseUrl: normalizedApiBaseUrl,
      ...paths,
    }),
    [normalizedApiBaseUrl],
  );

  const closeStream = useCallback(() => {
    activeSourceRef.current?.close();
    activeSourceRef.current = null;
  }, []);

  const setStatus = useCallback((text: string, kind?: StatusKind) => {
    setStatusText(text);
    setStatusKind(kind);
  }, []);

  const logLine = useCallback((message: string, tone?: LogEntry["tone"]) => {
    setLogEntries((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        time: new Date().toLocaleTimeString(),
        message,
        tone,
      },
    ]);
  }, []);

  const addBadge = useCallback((label: string, value: string | number, variant?: Badge["variant"]) => {
    setBadges((current) => [
      ...current,
      {
        id: `${label}-${Date.now()}-${current.length}`,
        label,
        value,
        variant,
      },
    ]);
  }, []);

  const clearOutput = useCallback(() => {
    closeStream();
    setLogEntries([]);
    setBadges([]);
    setPlan(null);
    setWorkflowStatuses({});
    setResults([]);
    setCaptcha(null);
    setCaptchaValue("");
    setDistrictHint("");
  }, [closeStream]);

  const streamFrom = useCallback(
    (path: string, params: Record<string, string>, onEvent: (message: AgentEvent) => void) => {
      closeStream();
      const url = new URL(normalizedApiBaseUrl + path);
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });

      logLine(`Connecting to ${url.pathname} ...`, "step");
      const source = new EventSource(url.toString());
      activeSourceRef.current = source;

      source.onmessage = (event) => {
        try {
          onEvent(JSON.parse(event.data) as AgentEvent);
        } catch {
          logLine("Received an unreadable stream message.", "error");
        }
      };

      source.onerror = () => {
        if (activeSourceRef.current !== source) return;
        logLine("Connection closed or errored.", "error");
        setBusy(false);
        source.close();
        activeSourceRef.current = null;
      };
    },
    [closeStream, logLine, normalizedApiBaseUrl],
  );

  const runAgent = useCallback(() => {
    const q = query.trim();
    const district = districtHint.trim();
    if (!q) {
      window.alert("Describe what you want to find first.");
      return;
    }

    clearOutput();
    setBusy(true);
    setStatus("Resolving...", "busy");
    setActiveTab("browser"); // Automatically switch to browser view when running

    streamFrom(
      paths.crawlStreamPath,
      {
        query: q,
        url: urlOverride.trim(),
        district,
      },
      (message) => {
        switch (message.type) {
          case "log":
            logLine(message.message || "");
            break;
          case "location_resolved":
            addBadge("Location", `${message.state || "-"}${message.district ? ` / ${message.district}` : ""}`);
            addBadge("Confidence", message.confidence || "unknown");
            break;
          case "portal_resolved":
            addBadge("Portal", message.state || "-");
            addBadge("URL", message.portal_url || "-", "url");
            if (message.portal_url) {
              setCurrentBrowserUrl(message.portal_url);
            }
            break;
          case "plan_ready":
            logLine(`Plan ready - ${message.query_understanding || ""} (${message.step_count || 0} steps)`, "step");
            setPlan(message.steps || []);
            setWorkflowStatuses(
              Object.fromEntries(
                (message.steps || []).map((step, index) => {
                  const item = step as { step_number?: string | number };
                  return [String(item.step_number ?? index + 1), "pending"];
                }),
              ) as Record<string, WorkflowStepStatus>,
            );
            break;
          case "step_started":
            logLine(`Step ${message.step} ${message.action || ""} - ${message.description || ""}`, "step");
            setWorkflowStatuses((current) => ({ ...current, [String(message.step)]: "running" }));
            setActiveAction(message.description || `Step ${message.step}: ${message.action || "Processing"}`);
            break;
          case "step_done":
            setWorkflowStatuses((current) => ({ ...current, [String(message.step)]: "done" }));
            setActiveAction(null);
            break;
          case "step_failed":
            logLine(`Step ${message.step} failed: ${message.error || ""}`, "error");
            setWorkflowStatuses((current) => ({ ...current, [String(message.step)]: "failed" }));
            break;
          case "screenshot":
            setScreenshot(message.image || null);
            if (message.portal_url && message.portal_url !== "about:blank") {
              setCurrentBrowserUrl(message.portal_url);
            }
            break;
          case "data_extracted":
            logLine(`+${message.record_count || 0} records extracted`, "data");
            setResults((current) => current.concat(message.data || []));
            // Keep the browser mirror on screen while the agent is still
            // working. Users can inspect each portal transition in real time
            // and switch to Results whenever they choose.
            break;
          case "captcha_required":
            setCaptcha({
              challengeId: message.challenge_id || "",
              image: message.image || "",
            });
            setCaptchaValue("");
            setStatus("Action required", "busy");
            logLine(message.message || "Enter the CAPTCHA to continue.", "step");
            setActiveTab("browser");
            break;
          case "captcha_resumed":
            setCaptcha(null);
            setCaptchaValue("");
            setStatus("Running...", "busy");
            logLine(message.message || "CAPTCHA accepted. Resuming.", "data");
            break;
          case "captcha_rejected":
            setCaptchaValue("");
            setStatus("CAPTCHA rejected", "busy");
            logLine(message.message || "The portal rejected that CAPTCHA. Try again.", "error");
            break;
          case "done":
            setStatus("Done", "done");
            setBusy(false);
            // A portal can complete through the semantic fast path (exact
            // result/detail discovery) before the backend emits step_done for
            // every originally planned browser action. The run itself is the
            // source of truth, so finish any remaining timeline nodes here.
            setWorkflowStatuses((current) =>
              Object.fromEntries(
                Object.keys(current).map((step) => [step, "done"]),
              ) as Record<string, WorkflowStepStatus>,
            );
            logLine(
              `Done. ${message.record_count || 0} total records, ${message.pages || 0} page(s), ${message.steps_executed || 0} steps, ${message.tokens_used || 0} tokens.`,
              "data",
            );
            closeStream();
            break;
          case "no_results":
            setStatus("No results", "err");
            setBusy(false);
            setWorkflowStatuses((current) => markActiveWorkflowStep(current, "failed"));
            logLine(
              message.message || "The crawl completed, but no matching project details were extracted.",
              "error",
            );
            closeStream();
            break;
          case "error":
            setStatus("Error", "err");
            setBusy(false);
            setWorkflowStatuses((current) => markActiveWorkflowStep(current, "failed"));
            logLine(`Error: ${message.message || ""}`, "error");
            closeStream();
            break;
        }
      },
    );
  }, [addBadge, clearOutput, closeStream, districtHint, logLine, query, setStatus, streamFrom, urlOverride]);

  const submitCaptcha = useCallback(async () => {
    if (!captcha || !captchaValue.trim()) return;
    setCaptchaSubmitting(true);
    try {
      const response = await fetch(normalizedApiBaseUrl + "/rera/captcha/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: captcha.challengeId,
          value: captchaValue.trim(),
        }),
      });
      const payload = (await response.json()) as { status?: string; message?: string };
      if (!response.ok || payload.status !== "ok") {
        throw new Error(payload.message || "CAPTCHA submission failed.");
      }
      logLine("CAPTCHA answer sent; waiting for portal verification.", "step");
    } catch (error) {
      const message = error instanceof Error ? error.message : "CAPTCHA submission failed.";
      logLine(message, "error");
    } finally {
      setCaptchaSubmitting(false);
    }
  }, [captcha, captchaValue, logLine, normalizedApiBaseUrl]);

  const runPlan = useCallback(
    async (conversational: boolean) => {
      const q = query.trim();
      const district = districtHint.trim();
      if (!q) {
        window.alert("Describe what you want to find first.");
        return;
      }

      clearOutput();
      setBusy(true);
      setStatus(conversational ? "Thinking..." : "Planning...", "busy");
      logLine(conversational ? `Asking the agent how it would approach: "${q}"` : `Generating a plan for: "${q}"`);

      try {
        const response = await fetch(normalizedApiBaseUrl + paths.planPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: urlOverride.trim(),
            query: district ? `${q} (filter by district: ${district})` : q,
          }),
        });
        const data = (await response.json()) as PlanResponse;
        if (!response.ok || data.status !== "ok") {
          throw new Error(data.message || "Planner returned an error");
        }

        addBadge("Location", `${data.location?.state || "-"}${data.location?.district ? ` / ${data.location.district}` : ""}`);
        addBadge("Confidence", data.location?.confidence || "unknown");
        addBadge("Portal", data.portal_url || "-", "url");

        if (conversational) {
          logLine(`Understanding: ${data.query_understanding || ""}`, "step");
          logLine(
            `The agent would open ${data.portal_url || ""} and run a ${data.step_count || 0}-step plan to get this data. Use Plan only to see the full step list, or Run agent to execute it.`,
          );
        } else {
          logLine(`Plan ready - ${data.query_understanding || ""} (${data.step_count || 0} steps, ${data.tokens_used || 0} tokens)`, "step");
          setPlan(data.steps || []);
          setWorkflowStatuses(
            Object.fromEntries(
              (data.steps || []).map((step, index) => {
                const item = step as { step_number?: string | number };
                return [String(item.step_number ?? index + 1), "pending"];
              }),
            ) as Record<string, WorkflowStepStatus>,
          );
        }
        setStatus("Done", "done");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown planner error";
        setStatus("Error", "err");
        logLine(`Error: ${message}`, "error");
      } finally {
        setBusy(false);
      }
    },
    [addBadge, clearOutput, districtHint, logLine, normalizedApiBaseUrl, query, setStatus, urlOverride],
  );

  const runBrowserTest = useCallback(() => {
    clearOutput();
    setBusy(true);
    setStatus("Opening browser...", "busy");
    setActiveTab("browser"); // Automatically switch to browser view when testing

    const overrideUrl = urlOverride.trim();
    logLine(
      overrideUrl
        ? `Opening a test browser session at ${overrideUrl} ...`
        : "Opening a test browser session on the default portal ...",
      "step",
    );

    streamFrom(paths.browserTestPath, { url: overrideUrl }, (message) => {
      switch (message.type) {
        case "log":
          logLine(message.message || "");
          break;
        case "browser_ready":
          addBadge("Page title", message.title || "-");
          addBadge("Dropdowns found", message.dropdowns || 0);
          addBadge("Text inputs found", message.inputs || 0);
          if (message.dropdown_details?.length) setPlan(message.dropdown_details);
          break;
        case "done":
          setStatus("Done", "done");
          setBusy(false);
          logLine(message.message || "Done", "data");
          closeStream();
          break;
        case "error":
          setStatus("Error", "err");
          setBusy(false);
          logLine(`Error: ${message.message || ""}`, "error");
          closeStream();
          break;
      }
    });
  }, [addBadge, clearOutput, closeStream, logLine, setStatus, streamFrom, urlOverride]);

  const exportJson = useCallback(() => {
    if (!results.length) {
      window.alert("No data to export yet.");
      return;
    }
    downloadBlob(JSON.stringify(results, null, 2), "application/json", "rera_results.json");
  }, [results]);

  const exportCsv = useCallback(() => {
    if (!results.length) {
      window.alert("No data to export yet.");
      return;
    }
    const columns = Array.from(
      results.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>()),
    );
    const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [columns.map(escapeCsv).join(",")];
    results.forEach((row) => lines.push(columns.map((column) => escapeCsv(row[column])).join(",")));
    downloadBlob(lines.join("\n"), "text/csv", "rera_results.csv");
  }, [results]);

  return (
    <AgentShell>
      {captcha ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rera-captcha-title"
            className="max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-3xl border-2 border-cyan-400/70 bg-bg-panel p-6 shadow-[0_0_80px_rgba(34,211,238,0.3)] sm:p-8"
          >
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300">Action required — browser paused</p>
            <h2 id="rera-captcha-title" className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">
              Enter the RERA portal CAPTCHA
            </h2>
            <p className="mt-3 text-base text-text-secondary">
              Type the characters exactly as shown. Scraping will continue in the same browser immediately after submission.
            </p>
            {captcha.image ? (
              <div className="mt-6 rounded-2xl border-2 border-cyan-400/40 bg-white p-3 sm:p-5">
                <img
                  src={captcha.image}
                  alt="CAPTCHA challenge"
                  className="max-h-[55vh] min-h-52 w-full rounded-xl bg-white object-contain [image-rendering:auto]"
                />
              </div>
            ) : null}
            <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                autoFocus
                value={captchaValue}
                onChange={(event) => setCaptchaValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitCaptcha();
                }}
                placeholder="Type CAPTCHA characters here"
                className="w-full rounded-2xl border-2 border-border bg-bg-card px-5 py-4 text-xl font-bold tracking-[0.18em] text-text-primary outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                disabled={!captchaValue.trim() || captchaSubmitting}
                onClick={() => void submitCaptcha()}
                className="rounded-2xl bg-cyan-400 px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 disabled:opacity-50"
              >
                {captchaSubmitting ? "Submitting..." : "Submit and continue"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isMaximized && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-slate-950/95 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                <span className="h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              </div>
              <span className="text-xs font-mono text-cyan-300 truncate max-w-xl bg-bg-card px-3 py-1.5 rounded-xl border border-border flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                {currentBrowserUrl || "http://rera.telangana.gov.in"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {currentBrowserUrl && (
                <a
                  href={currentBrowserUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary bg-bg-card border border-border rounded-xl transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in New Tab
                </a>
              )}
              <button
                onClick={() => setIsMaximized(false)}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl hover:bg-rose-500/30 transition"
              >
                Close Fullscreen
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-900/60 rounded-2xl overflow-hidden border border-border/40 relative p-2">
            {activeAction && (
              <div className="absolute top-4 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/90 text-cyan-300 border border-cyan-500/50 text-xs font-bold shadow-2xl backdrop-blur-md animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span>{activeAction}</span>
              </div>
            )}
            {screenshot ? (
              <img
                src={screenshot}
                alt="Live browser screenshot"
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl border border-border/40"
              />
            ) : currentBrowserUrl ? (
              <iframe
                src={currentBrowserUrl}
                title="Full Live RERA View"
                className="w-full h-full border-0 rounded-xl bg-white"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            ) : (
              <div className="text-center text-text-dim p-8">
                <Globe2 className="h-10 w-10 mx-auto text-cyan-400 mb-3" />
                <p className="text-sm font-bold text-text-primary">No active browser session frames received yet.</p>
                <p className="text-xs text-text-dim mt-1">Start an agent crawl or browser test to view live activity.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <section className="flex h-full min-h-0 flex-col">
        {/* <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="rounded-2xl border border-border bg-bg-panel px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-text-dim">New query</p>
                <h1 className="mt-1 text-base font-black uppercase tracking-[0.12em] text-text-primary">
                  RERA portal orchestration
                </h1>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <MetricChip icon={Server} label="Backend" value={backendConfig.apiBaseUrl} />
                <MetricChip icon={Globe2} label="Portal Mode" value={urlOverride.trim() ? "Manual override" : "Auto detected"} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-bg-card px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-text-secondary transition hover:border-border-glow hover:text-text-primary"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div> */}

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(360px,0.85fr)_minmax(360px,1fr)_minmax(420px,1.15fr)]">
          <div className="min-h-0">
            <QueryPanel
              query={query}
              urlOverride={urlOverride}
              districtHint={districtHint}
              apiBaseUrl={apiBaseUrl}
              statusText={statusText}
              statusKind={statusKind}
              busy={busy}
              backendConfig={backendConfig}
              onQueryChange={setQuery}
              onUrlOverrideChange={setUrlOverride}
              onDistrictHintChange={setDistrictHint}
              onApiBaseUrlChange={setApiBaseUrl}
              onRun={runAgent}
              onAsk={() => void runPlan(true)}
              onPlan={() => void runPlan(false)}
              onBrowserTest={runBrowserTest}
            />
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            <div className="rounded-2xl border border-border bg-bg-panel p-3 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-text-dim">
                <Database className="h-4 w-4 text-accent" />
                Resolved context
              </div>
              <BadgeList badges={badges} />
              {!badges.length && (
                <p className="rounded-xl border border-dashed border-border bg-bg-card/50 px-3 py-3 text-[11px] leading-5 text-text-dim">
                  Location, confidence, portal, and browser findings will appear here.
                  </p>
              )}
            </div>
            <div className="min-h-0 flex-1">
              <ActivityLog entries={logEntries} onClear={() => setLogEntries([])} />
            </div>
            <div className="min-h-0 flex-1">
              <WorkflowPanel plan={plan} statuses={workflowStatuses} paused={Boolean(captcha)} busy={busy} />
            </div>
          </div>

          <div className="flex flex-col h-full min-h-0">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-bg-panel/40 p-1 border border-border select-none">
              <div className="flex gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab("results")}
                  className={`flex-1 text-center py-2 text-[10px] font-black uppercase tracking-[0.16em] rounded-xl transition-all ${
                    activeTab === "results"
                      ? "bg-accent text-slate-950 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-card/45"
                  }`}
                >
                  Results ({results.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("browser")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-[0.16em] rounded-xl transition-all ${
                    activeTab === "browser"
                      ? "bg-accent text-slate-950 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-card/45"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full transition-all ${busy ? "bg-cyan-400 animate-ping" : "bg-text-dim"}`} />
                  Live Browser
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              {activeTab === "results" ? (
                <ResultsTable data={results} onExportCsv={exportCsv} onExportJson={exportJson} />
              ) : (
                <BrowserWindow
                  screenshot={screenshot}
                  currentBrowserUrl={currentBrowserUrl}
                  busy={busy}
                  activeAction={activeAction}
                  onMaximize={() => setIsMaximized(true)}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </AgentShell>
  );
}

type MetricChipProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
};

function MetricChip({ icon: Icon, label, value }: MetricChipProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-bg-card px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-dim">{label}</p>
        <p className="truncate font-mono text-[11px] font-bold text-text-secondary" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function normalizeApiBase(value: string) {
  return (value || "http://localhost:8000").replace(/\/$/, "");
}

function markActiveWorkflowStep(
  statuses: Record<string, WorkflowStepStatus>,
  nextStatus: WorkflowStepStatus,
) {
  const activeStep = Object.entries(statuses).find(([, status]) => status === "running")?.[0];
  return activeStep ? { ...statuses, [activeStep]: nextStatus } : statuses;
}

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function BrowserWindow({
  screenshot,
  currentBrowserUrl,
  busy,
  activeAction,
  onMaximize,
}: {
  screenshot: string | null;
  currentBrowserUrl: string | null;
  busy: boolean;
  activeAction: string | null;
  onMaximize: () => void;
}) {
  const [viewMode, setViewMode] = useState<"stream" | "iframe">("stream");
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    if (currentBrowserUrl) {
      void navigator.clipboard.writeText(currentBrowserUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="panel-shell h-full min-h-[400px] flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-panel/90 shadow-2xl backdrop-blur-xl">
      {/* Header Bar */}
      <div className="panel-header-shell shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-bg-card/40">
        <div className="panel-title-shell flex items-center gap-3">
          <div className="flex gap-1.5 shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-text-primary flex items-center gap-2">
            Embedded Live Browser
            {busy && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold tracking-normal">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                STREAMING LIVE
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex bg-bg-deep/80 p-0.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setViewMode("stream")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                viewMode === "stream"
                  ? "bg-accent text-slate-950 font-black shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Tv className="h-3 w-3" />
              Stream
            </button>
            <button
              type="button"
              onClick={() => setViewMode("iframe")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                viewMode === "iframe"
                  ? "bg-accent text-slate-950 font-black shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Eye className="h-3 w-3" />
              Interactive
            </button>
          </div>

          <button
            type="button"
            onClick={onMaximize}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] bg-bg-card hover:bg-border/20 text-text-secondary hover:text-text-primary px-2.5 py-1.5 rounded-xl border border-border transition"
            title="Maximize browser window"
          >
            <Maximize2 className="h-3 w-3" />
            Maximize
          </button>
        </div>
      </div>

      {/* Address bar */}
      <div className="px-4 py-2 bg-bg-deep/30 border-b border-border flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-emerald-400 shrink-0" title="Secure connection">
          <ShieldCheck className="h-3.5 w-3.5" />
        </div>

        <div className="flex-1 min-w-0 flex items-center bg-bg-card border border-border px-3 py-1 rounded-lg text-xs font-mono text-text-secondary truncate">
          <span className="truncate flex-1 text-text-primary">{currentBrowserUrl || "about:blank"}</span>
        </div>

        {currentBrowserUrl && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-1.5 rounded-lg border border-border bg-bg-card hover:bg-border/20 text-text-secondary hover:text-text-primary transition"
              title="Copy URL"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
            <a
              href={currentBrowserUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg border border-border bg-bg-card hover:bg-border/20 text-text-secondary hover:text-text-primary transition"
              title="Open portal in new tab"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 relative bg-slate-950/80 p-2 flex items-center justify-center overflow-hidden">
        {activeAction && (
          <div className="absolute top-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold shadow-lg backdrop-blur-md animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            <span className="truncate max-w-xs">{activeAction}</span>
          </div>
        )}

        {viewMode === "stream" ? (
          screenshot ? (
            <div className="relative w-full h-full flex items-center justify-center overflow-auto custom-scrollbar group bg-slate-900/40 rounded-lg">
              <img
                src={screenshot}
                alt="Live agent browser activity frame"
                className="max-h-full max-w-full rounded-lg border border-border/60 object-contain shadow-2xl transition-all duration-200 opacity-95"
              />
              
              {/* CRT Scanline effect */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.01),rgba(0,0,255,0.04))] bg-[length:100%_4px,3px_100%] opacity-50 z-10 rounded-lg mix-blend-overlay"></div>
              
              {/* Vignette effect */}
              <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10"></div>
              
              {/* Live Overlay Badges */}
              {busy && (
                <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-none z-20">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-md border border-red-500/30 text-red-400 font-bold text-[10px] tracking-widest font-mono shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                    REC
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-md border border-cyan-500/30 text-cyan-300 font-bold text-[10px] tracking-widest font-mono shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    LIVE
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm">
              <div className="p-4 rounded-full bg-bg-card border border-border mb-3 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <Globe2 className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                {busy ? "Connecting Live Stream..." : "Browser Sandbox Ready"}
              </h3>
              <p className="text-xs text-text-dim mt-2 leading-relaxed">
                {busy
                  ? "Launching Playwright browser session and capturing live portal frames..."
                  : "Click 'Run agent' or 'Browser test' to project real-time browser activity directly into this window."}
              </p>
            </div>
          )
        ) : (
          <div className="w-full h-full relative rounded-lg overflow-hidden border border-border/60 bg-white">
            {currentBrowserUrl ? (
              <iframe
                src={currentBrowserUrl}
                title="Live RERA Portal Frame"
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-800">
                <Globe2 className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-xs font-semibold">No active portal URL to display interactively.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
