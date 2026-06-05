'use client';

import React, { useState, useCallback } from 'react';
import {
  Play,
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Cpu,
  Table2,
  BarChart3,
  Eye,
  Shield,
  Coins,
  Bug,
  FileCode2,
} from 'lucide-react';
import type {
  Module1IntentOutput,
  Module2InputsConsidered,
  Module2Output,
  Module2StepSummary,
  VisualizationRetrievalState,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const DEFAULT_INPUTS: Module2InputsConsidered = {
  retrieved_data: true,
  data_mapping: true,
  module_1_intent: true,
  retrieval_model_intent: true,
  retrieval_sql_query: true,
};

const TAB_CONFIG = [
  { name: 'Final Dataset', icon: Table2 },
  { name: 'Steps', icon: BarChart3 },
  { name: 'Mapped Fields', icon: Database },
  { name: 'Filter + Agg', icon: Eye },
  { name: 'Visualization', icon: Eye },
  { name: 'Data Quality', icon: Shield },
  { name: 'Token Ledger', icon: Coins },
  { name: 'Inputs Debug', icon: Bug },
  { name: 'Full JSON', icon: FileCode2 },
];

/* ------------------------------------------------------------------ */
/* Reusable sub-components                                            */
/* ------------------------------------------------------------------ */

function JsonViewer({ data, label }: { data: unknown; label?: string }) {
  const [open, setOpen] = useState(false);
  const text = JSON.stringify(data, null, 2);
  const isLong = text.length > 600;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      {label && (
        <div className="px-4 py-2 border-b border-slate-200 bg-white">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
      )}
      <pre
        className={`p-4 text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto ${
          !open && isLong ? 'max-h-[300px] overflow-hidden relative' : ''
        }`}
      >
        {text}
        {!open && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent" />
        )}
      </pre>
      {isLong && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full py-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-t border-slate-200 hover:bg-indigo-50 transition-colors"
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-lg font-extrabold tracking-tight ${accent ? 'text-indigo-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

function StepAccordion({ step }: { step: Module2StepSummary }) {
  const [open, setOpen] = useState(false);
  const isOk = step.status === 'success';
  const isSkipped = step.status === 'skipped';

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isOk ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : isSkipped ? (
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          )}
          <span className="text-xs font-extrabold text-slate-800 truncate">{step.step_name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${
              isOk
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                : isSkipped
                  ? 'border-amber-200 bg-amber-50 text-amber-600'
                  : 'border-red-200 bg-red-50 text-red-600'
            }`}
          >
            {step.status}
          </span>
          {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
        </div>
      </button>
      {open && step.bullet_points.length > 0 && (
        <div className="px-4 pb-3 space-y-1 border-t border-slate-100">
          {step.bullet_points.map((point, i) => (
            <p key={i} className="text-[11px] text-slate-500 leading-5 pl-6 relative before:content-['-'] before:absolute before:left-2 before:text-slate-400">
              {point}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function DataTable({ records, maxRows = 50 }: { records: Record<string, unknown>[]; maxRows?: number }) {
  if (!records || records.length === 0) return <p className="text-sm text-slate-400">No data available.</p>;

  const cols = Object.keys(records[0]);
  const rows = records.slice(0, maxRows);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100">
            {cols.map((col) => (
              <th key={col} className="border-b border-slate-200 px-3 py-2 text-left font-bold text-slate-600 uppercase tracking-widest text-[10px] whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {cols.map((col) => (
                <td key={col} className="border-b border-slate-100 px-3 py-2 text-slate-600 max-w-[200px] truncate">
                  {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {records.length > maxRows && (
        <p className="px-3 py-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Showing {maxRows} of {records.length} rows
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Module2Section component                                       */
/* ------------------------------------------------------------------ */

interface Module2SectionProps {
  moduleOutput?: Module1IntentOutput | null;
  retrievalOutput?: VisualizationRetrievalState | null;
  onModule2Output?: (output: Module2Output | null) => void;
}

const Module2Section: React.FC<Module2SectionProps> = ({ moduleOutput = null, retrievalOutput = null, onModule2Output }) => {
  const [inputs, setInputs] = useState<Module2InputsConsidered>(DEFAULT_INPUTS);
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<Module2Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const toggleInput = useCallback((key: keyof Module2InputsConsidered) => {
    if (key === 'retrieved_data') return; // always on
    setInputs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleRun = useCallback(async () => {
    if (inputs.module_1_intent && !moduleOutput) {
      setError('Run Module 1 first so Module 2 can use the current runtime intent.');
      onModule2Output?.(null);
      return;
    }

    const runtimeRows = retrievalOutput?.resultSet?.rows ?? [];
    const runtimeRetrievalStarted = Boolean(retrievalOutput);
    const runtimeRetrievalReady = retrievalOutput?.status === 'success' && runtimeRows.length > 0;

    if (runtimeRetrievalStarted && !runtimeRetrievalReady) {
      setError(
        retrievalOutput?.status === 'running'
          ? 'Data Retrieval Agent is still running under the hood. Please run Module 2 after retrieved data is ready.'
          : retrievalOutput?.error || 'Data Retrieval Agent did not return usable rows for Module 2.',
      );
      onModule2Output?.(null);
      return;
    }

    const runtimeIntent = retrievalOutput?.retrievalIntent;
    const runtimeSql = retrievalOutput?.sqlQuery || '';
    const requestInputs: Module2InputsConsidered = {
      ...inputs,
      retrieval_model_intent:
        inputs.retrieval_model_intent && (runtimeRetrievalStarted ? Boolean(runtimeIntent) : true),
      retrieval_sql_query:
        inputs.retrieval_sql_query && (runtimeRetrievalStarted ? Boolean(runtimeSql) : true),
    };

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/visualization-agent/module2/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs_considered: requestInputs,
          module_1_intent_json: inputs.module_1_intent ? moduleOutput : undefined,
          retrieved_data_json: runtimeRetrievalReady ? runtimeRows : undefined,
          retrieval_context_json: requestInputs.retrieval_model_intent ? runtimeIntent : undefined,
          retrieval_sql_query: requestInputs.retrieval_sql_query ? runtimeSql : '',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as Module2Output;
      setOutput(data);
      onModule2Output?.(data);
      setActiveTab(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      onModule2Output?.(null);
    } finally {
      setIsLoading(false);
    }
  }, [inputs, moduleOutput, onModule2Output, retrievalOutput]);

  const handleDownloadCsv = useCallback(() => {
    if (!output?.analysis_ready_dataset?.length) return;
    const cols = Object.keys(output.analysis_ready_dataset[0]);
    const header = cols.join(',');
    const rows = output.analysis_ready_dataset.map((row) =>
      cols.map((c) => {
        const v = row[c];
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
        return s.includes(',') ? `"${s}"` : s;
      }).join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'module_2_analysis_ready_dataset.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [output]);

  const ledger = output?.debug_metadata?.llm_token_ledger;
  const stepSummaries = output?.debug_metadata?.step_summaries ?? [];
  const runtimeRowsCount = retrievalOutput?.resultSet?.rows?.length ?? 0;
  const runtimeRetrievalReady = retrievalOutput?.status === 'success' && runtimeRowsCount > 0;
  const runtimeRetrievalRunning = retrievalOutput?.status === 'running';

  const runBlockedReason = (() => {
    if (isLoading) return null;
    if (inputs.module_1_intent && !moduleOutput) {
      return 'Run a Land GIS query in the chat panel first (Module 1 intent), or turn off the "module 1 intent" input toggle.';
    }
    if (runtimeRetrievalRunning) {
      return 'Data retrieval is still running. Wait for it to finish, or turn off retrieval-related input toggles.';
    }
    return null;
  })();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* ---- Input Configuration ---- */}
      <div className="relative z-20 shrink-0 p-5 space-y-4 border-b border-slate-100 bg-slate-50/30">
        {/* Toggle switches */}
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Inputs Considered</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DEFAULT_INPUTS) as (keyof Module2InputsConsidered)[]).map((key) => {
              const isOn = inputs[key];
              const isFixed = key === 'retrieved_data';
              const label = key.replace(/_/g, ' ');
              return (
                <button
                  key={key}
                  disabled={isFixed || isLoading}
                  onClick={() => toggleInput(key)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isOn
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 bg-white text-slate-400'
                  } ${isFixed ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {runBlockedReason && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800">
            {runBlockedReason}
          </div>
        )}

        {/* Run button + status */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (runBlockedReason) {
                setError(runBlockedReason);
                return;
              }
              void handleRun();
            }}
            disabled={isLoading}
            aria-disabled={Boolean(runBlockedReason)}
            title={runBlockedReason || 'Run Module 2 data restructuring pipeline'}
            className={`relative z-20 flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest shadow-lg transition-all ${
              runBlockedReason
                ? 'border border-amber-300 bg-amber-100 text-amber-900 shadow-amber-100 hover:bg-amber-200'
                : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
            } disabled:cursor-wait disabled:opacity-60`}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isLoading ? 'Processing...' : 'Run Module 2'}
          </button>

          {inputs.module_1_intent && moduleOutput && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
              Runtime Module 1 intent linked
            </span>
          )}

          {retrievalOutput?.status === 'running' && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-600">
              Data retrieval running
            </span>
          )}

          {runtimeRetrievalReady && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-sky-600">
              Runtime retrieval linked · {runtimeRowsCount} rows
            </span>
          )}

          {retrievalOutput?.status === 'error' && (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-red-600">
              Runtime retrieval unavailable
            </span>
          )}

          {output && (
            <div className="flex items-center gap-2">
              {output.next_module_ready ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span
                className={`text-[10px] font-extrabold uppercase tracking-widest ${
                  output.next_module_ready ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {output.status} - {output.next_module_ready ? 'Ready' : 'Not Ready'}
              </span>
              {output.processing_time_seconds != null && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {output.processing_time_seconds}s
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* ---- Token Ledger Metrics (if output exists) ---- */}
      {ledger && (
        <div className="shrink-0 grid grid-cols-4 gap-3 p-5 border-b border-slate-100">
          <MetricCard label="LLM Calls" value={ledger.total_llm_calls} accent />
          <MetricCard label="Input Tokens" value={ledger.total_input_tokens.toLocaleString()} />
          <MetricCard label="Output Tokens" value={ledger.total_output_tokens.toLocaleString()} />
          <MetricCard label="Cost USD" value={`$${ledger.total_cost_usd.toFixed(6)}`} accent />
        </div>
      )}

      {/* ---- Tab bar ---- */}
      {output && (
        <div className="shrink-0 flex items-center gap-1 px-5 py-2 border-b border-slate-100 overflow-x-auto">
          {TAB_CONFIG.map((tab, idx) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === idx
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ---- Tab content ---- */}
      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
        {!output && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-sky-500/5 animate-pulse blur-xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl border border-slate-100">
                <Cpu className="h-10 w-10 text-sky-500/40" />
              </div>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Module 2</h3>
            <p className="mt-2.5 max-w-[240px] text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
              Data Restructuring &amp; Filtering
            </p>
            <p className="mt-4 max-w-[280px] text-sm font-medium text-slate-500 leading-relaxed text-center">
              Configure the input toggles above and click &quot;Run Module 2&quot; to process the data pipeline.
            </p>
            <div className="mt-8 flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-4 py-2 opacity-50">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting execution</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            <p className="text-sm font-bold text-slate-500">Running Module 2 pipeline...</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              This may take 10-30 seconds
            </p>
          </div>
        )}

        {output && !isLoading && (
          <>
            {/* Tab 0: Final Dataset */}
            {activeTab === 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">Final Analysis-Ready Dataset</h3>
                  {output.analysis_ready_dataset && output.analysis_ready_dataset.length > 0 && (
                    <button
                      onClick={handleDownloadCsv}
                      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                    >
                      <Download className="h-3 w-3" /> Download CSV
                    </button>
                  )}
                </div>
                {output.analysis_ready_dataset && output.analysis_ready_dataset.length > 0 ? (
                  <DataTable records={output.analysis_ready_dataset} />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                      No analysis_ready_dataset was created.
                    </div>
                    {!!output.missing_required_fields && <JsonViewer data={output.missing_required_fields} label="Missing Required Fields" />}
                    {!!output.missing_metric_logic && <JsonViewer data={output.missing_metric_logic} label="Missing Metric Logic" />}
                  </div>
                )}
              </div>
            )}

            {/* Tab 1: Step-by-Step Changes */}
            {activeTab === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">Step-by-Step Changes</h3>
                {stepSummaries.length > 0 ? (
                  <div className="space-y-2">
                    {stepSummaries.map((step, i) => (
                      <StepAccordion key={i} step={step} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No step summaries available.</p>
                )}
                <JsonViewer data={output.debug_metadata?.step_log ?? []} label="Raw Step Log" />
              </div>
            )}

            {/* Tab 2: Mapped Fields */}
            {activeTab === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">Mapped Fields</h3>
                {output.mapped_fields ? (
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(output.mapped_fields).map(([field, col]) => (
                      <div key={field} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <span className="text-xs font-extrabold text-slate-700">{field}</span>
                        <span className={`text-xs font-mono ${col ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                          {col ?? 'unmapped'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No mapped fields available.</p>
                )}
              </div>
            )}

            {/* Tab 3: Filter + Aggregation */}
            {activeTab === 3 && (
              <div className="space-y-4">
                <JsonViewer data={output.filter_validation ?? {}} label="Filter Validation" />
                <JsonViewer data={output.aggregation_summary ?? {}} label="Aggregation Summary" />
              </div>
            )}

            {/* Tab 4: Visualization Output */}
            {activeTab === 4 && (
              <div className="space-y-4">
                <JsonViewer data={output.visualization_ready_output ?? {}} label="Visualization-Ready Output" />
                <JsonViewer data={output.map_readiness ?? {}} label="Map Readiness" />
                {(() => {
                  const recs = (output.visualization_ready_output as Record<string, unknown>)?.records;
                  if (Array.isArray(recs) && recs.length > 0) {
                    return (
                      <>
                        <h3 className="text-sm font-extrabold text-slate-900">Visualization Records Preview</h3>
                        <DataTable records={recs as Record<string, unknown>[]} />
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {/* Tab 5: Data Quality */}
            {activeTab === 5 && (
              <div className="space-y-4">
                <JsonViewer data={output.map_readiness ?? {}} label="Map Readiness" />
                <JsonViewer data={output.data_quality_summary ?? {}} label="Data Quality Summary" />
              </div>
            )}

            {/* Tab 6: Token Ledger */}
            {activeTab === 6 && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">LLM Token Ledger</h3>
                {ledger && (
                  <JsonViewer
                    data={{
                      total_llm_calls: ledger.total_llm_calls,
                      total_input_tokens: ledger.total_input_tokens,
                      total_cached_input_tokens: ledger.total_cached_input_tokens,
                      total_output_tokens: ledger.total_output_tokens,
                      total_tokens: ledger.total_tokens,
                      total_cost_usd: ledger.total_cost_usd,
                    }}
                    label="Summary"
                  />
                )}
                {ledger && ledger.ledger.length > 0 ? (
                  <DataTable records={ledger.ledger as unknown as Record<string, unknown>[]} />
                ) : (
                  <p className="text-sm text-slate-400">No LLM calls were recorded.</p>
                )}
              </div>
            )}

            {/* Tab 7: Inputs Debug */}
            {activeTab === 7 && (
              <div className="space-y-4">
                <JsonViewer data={output.inputs_considered ?? {}} label="Inputs Considered" />
                <JsonViewer data={output.input_summary ?? {}} label="Input Summary" />
                <JsonViewer data={output.debug_metadata?.module_1_requirements_used ?? {}} label="Module 1 Requirements Used" />
              </div>
            )}

            {/* Tab 8: Full JSON Output */}
            {activeTab === 8 && <JsonViewer data={output} label="Full Module 2 Output JSON" />}
          </>
        )}
      </div>
    </div>
  );
};

export default Module2Section;
