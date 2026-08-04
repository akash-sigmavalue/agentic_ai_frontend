"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import Image from "next/image";
import { Database, Globe2, RotateCcw, Server } from "lucide-react";
import ActivityLog from "./ActivityLog";
import AgentShell from "./AgentShell";
import BadgeList from "./BadgeList";
import PlanPanel from "./PlanPanel";
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
  const [results, setResults] = useState<DataRow[]>([]);
  const [captcha, setCaptcha] = useState<{ challengeId: string; image: string } | null>(null);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaSubmitting, setCaptchaSubmitting] = useState(false);
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
    setResults([]);
    setCaptcha(null);
    setCaptchaValue("");
    setStatus("Ready");
    setBusy(false);
  }, [closeStream, setStatus]);

  const resetAll = useCallback(() => {
    setQuery("");
    setUrlOverride("");
    setDistrictHint("");
    clearOutput();
  }, [clearOutput]);

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
            break;
          case "plan_ready":
            logLine(`Plan ready - ${message.query_understanding || ""} (${message.step_count || 0} steps)`, "step");
            setPlan(message.steps || []);
            break;
          case "step_started":
            logLine(`Step ${message.step} ${message.action || ""} - ${message.description || ""}`, "step");
            break;
          case "step_failed":
            logLine(`Step ${message.step} failed: ${message.error || ""}`, "error");
            break;
          case "data_extracted":
            logLine(`+${message.record_count || 0} records extracted`, "data");
            setResults((current) => current.concat(message.data || []));
            break;
          case "captcha_required":
            setCaptcha({
              challengeId: message.challenge_id || "",
              image: message.image || "",
            });
            setCaptchaValue("");
            setStatus("Action required", "busy");
            logLine(message.message || "Enter the CAPTCHA to continue.", "step");
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
            logLine(
              `Done. ${message.record_count || 0} total records, ${message.pages || 0} page(s), ${message.steps_executed || 0} steps, ${message.tokens_used || 0} tokens.`,
              "data",
            );
            closeStream();
            break;
          case "no_results":
            setStatus("No results", "err");
            setBusy(false);
            logLine(
              message.message || "The crawl completed, but no matching project details were extracted.",
              "error",
            );
            closeStream();
            break;
          case "error":
            setStatus("Error", "err");
            setBusy(false);
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
                <Image
                  src={captcha.image}
                  alt="CAPTCHA challenge"
                  width={1600}
                  height={700}
                  priority
                  unoptimized
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
            {plan && (
              <div className="min-h-0 flex-1">
                <PlanPanel plan={plan} />
              </div>
            )}
          </div>

          <div className="min-h-0">
            <ResultsTable data={results} onExportCsv={exportCsv} onExportJson={exportJson} />
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

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
