"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import {
  getAutomationHealth,
  getAutomationRuleLogs,
  listAutomationRules,
  toggleAutomationRule,
  type AutomationRuleExecutionLog,
  type AutomationRuleSummary,
  type ConnectorHealthResponse,
} from "./api";

function statusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function statusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "success":
      return <CheckCircle2 className="h-4 w-4" />;
    case "failed":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Clock3 className="h-4 w-4" />;
  }
}

export default function MonitoringPanel() {
  const [health, setHealth] = useState<ConnectorHealthResponse | null>(null);
  const [rules, setRules] = useState<AutomationRuleSummary[]>([]);
  const [logsByRule, setLogsByRule] = useState<Record<number, AutomationRuleExecutionLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (ruleId: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await toggleAutomationRule(ruleId, newStatus);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, is_active: newStatus } : r))
      );
    } catch {
      alert("Failed to toggle automation rule");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setError(null);
        const [healthResult, rulesResult] = await Promise.allSettled([
          getAutomationHealth(),
          listAutomationRules(),
        ]);

        if (cancelled) return;

        const nextHealth = healthResult.status === "fulfilled" ? healthResult.value : null;
        const nextRules = rulesResult.status === "fulfilled" ? rulesResult.value.rules || [] : [];

        setHealth(nextHealth);
        setRules(nextRules);
        setError(
          [
            healthResult.status === "rejected" ? messageFromReason(healthResult.reason) : null,
            rulesResult.status === "rejected" ? messageFromReason(rulesResult.reason) : null,
          ]
            .filter(Boolean)
            .join(" ")
            .trim() || null,
        );

        if (nextRules.length === 0) {
          setLogsByRule({});
          return;
        }

        const logPairs = await Promise.all(
          nextRules.map(async (rule) => {
            const logs = await getAutomationRuleLogs(rule.id);
            return [rule.id, logs.slice(0, 5)] as const;
          }),
        );

        if (cancelled) return;

        setLogsByRule(Object.fromEntries(logPairs) as Record<number, AutomationRuleExecutionLog[]>);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load automation monitoring.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    const interval = setInterval(() => {
      void load();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && rules.length === 0) {
    return null;
  }

  if (rules.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Monitoring
          </p>
          <h4 className="mt-2 text-lg font-black tracking-tight text-slate-900">
            Automation health
          </h4>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Live signal for active Gmail rules and recent execution history.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <RefreshCw className="h-3.5 w-3.5" />
          Refreshes every 30s
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <MetricCard label="Active rules" value={health?.active_rules ?? rules.length} />
        <MetricCard label="Active watches" value={health?.users_with_active_watch ?? 0} />
        <MetricCard label="Executed 24h" value={health?.rules_executed_last_24h ?? 0} />
        <MetricCard label="Failed 24h" value={health?.rules_failed_last_24h ?? 0} />
      </div>

      <div className="mt-6 space-y-4">
        {rules.map((rule) => {
          const logs = logsByRule[rule.id] || [];
          return (
            <article key={rule.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h5 className="text-sm font-black tracking-tight text-slate-900">
                      {rule.sender_name || rule.sender_email || `Rule #${rule.id}`}
                    </h5>
                    <button
                      onClick={() => handleToggle(rule.id, !!rule.is_active)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] hover:opacity-80 transition-opacity cursor-pointer ${
                        rule.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      {rule.is_active ? "Active" : "Paused"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {rule.subject_filter || rule.operation || "Gmail automation"}
                  </p>
                </div>

                {rule.last_execution_status ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClasses(
                      rule.last_execution_status,
                    )}`}
                  >
                    {statusIcon(rule.last_execution_status)}
                    {rule.last_execution_status}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                {logs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">
                    No execution logs yet.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {log.action_taken}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          Message {log.matched_message_id ?? "unknown"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClasses(
                            log.status ?? "",
                          )}`}
                        >
                          {statusIcon(log.status ?? "")}
                          {log.status ?? "unknown"}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "unknown time"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function messageFromReason(reason: unknown) {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === "string") {
    return reason;
  }
  return "Failed to load automation monitoring.";
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
