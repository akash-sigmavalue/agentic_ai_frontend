'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Maximize2,
  Minimize2,
  User,
  Loader2,
  ChevronDown,
  X,
  Database,
  FileCode2,
  Map as MapIcon,
} from 'lucide-react';
import type {
  ExecutionPlanStep,
  Module1IntentOutput,
  Module7GenerationOutput,
  RuntimeGeneratedMapOption,
  VisualizationRetrievalResultSet,
  VisualizationRetrievalState,
  VisualizationRetrievalTokenEvent,
  VisualizationRetrievalClarification,
  VisualizationRetrievalClarificationField,
} from './types';

interface ChatSectionProps {
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  onModuleOutput?: (output: Module1IntentOutput | null) => void;
  onRetrievalOutput?: (output: VisualizationRetrievalState | null) => void;
  runtimeGeneratedMaps?: RuntimeGeneratedMapOption[];
  selectedInsightMapId?: string | null;
  onInsightMapSelect?: (mapId: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intentOutput?: Module1IntentOutput;
  usage?: Record<string, number>;
  cost?: Record<string, number>;
  ledgerRow?: TokenLedgerRow | null;
  elapsed?: number;
  retrieval?: VisualizationRetrievalState;
  insightOutput?: Module7GenerationOutput;
  insightMapLabel?: string;
}

interface TokenLedgerRow {
  request_id: number;
  timestamp: string;
  provider?: string;
  region?: string;
  model: string;
  query_preview: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost_usd?: number;
  cached_input_cost_usd?: number;
  output_cost_usd?: number;
  total_cost_usd: number;
}

interface Module1ResponseData {
  intent_output: Module1IntentOutput;
  usage: Record<string, number>;
  cost: Record<string, number>;
  elapsed_seconds: number;
  ledger_row?: TokenLedgerRow | null;
}

const MODULE1_RUNTIME_MODEL = 'moonshotai.kimi-k2.5';
const MODULE7_RUNTIME_MODEL = 'moonshot.kimi-k2-thinking';
const MODULE7_RUNTIME_PROVIDER = 'AWS Bedrock';
const MODULE7_RUNTIME_REGION = 'ap-south-1';
const DEMO_MODE_ENABLED = false;
const EXAMPLE_QUERY = 'Give me average year on year rate for each floor of Kohinoor Emerald from 2021 to 2024';
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');

const TAB_NAMES = [
  'Structured Output',
  'Execution Plan',
  'Map Requirements',
  'Intent Mapping',
  'Active Blocks',
  'Validation',
  'Token Ledger',
];

const RETRIEVAL_TABS = ['Data', 'SQL Query'];
type ChatCategory = 'land-gis' | 'insight-generation' | 'workflow' | 'conversational';
const CHAT_CATEGORIES: Array<{ value: ChatCategory; label: string; disabled?: boolean }> = [
  { value: 'land-gis', label: 'Land / GIS' },
  { value: 'insight-generation', label: 'Insight Generation' },
  { value: 'workflow', label: 'Workflow (Coming Soon)', disabled: true },
  { value: 'conversational', label: 'Conversational (Coming Soon)', disabled: true },
];
const DEFAULT_INSIGHT_QUERY = 'Generate insights for map';

async function requestInsightGeneration(
  map: RuntimeGeneratedMapOption,
  question: string,
): Promise<Module7GenerationOutput> {
  const context = map.insightContext;
  const response = await fetch(`${API_BASE}/visualization-agent/module7/generate-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      map_id: context.mapId,
      map_label: context.mapLabel,
      map_family: context.mapFamily,
      map_source: context.mapSource,
      plotted_data_json: context.plottedData,
      module_1_intent_json: context.moduleOutput,
      module_2_output_json: context.module2Output,
      module_31_output_json: context.module31Output,
      user_question: question,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(responseBody.detail || `Module 7 failed with status ${response.status}`);
  }
  return response.json();
}

function Module7ChatInsightPanel({ output, mapLabel }: { output: Module7GenerationOutput; mapLabel: string }) {
  const insights = output.insight_output;
  const findings = Array.isArray(insights.key_findings) ? insights.key_findings : [];
  const spatialFindings = Array.isArray(insights.spatial_findings) ? insights.spatial_findings : [];
  const actions = Array.isArray(insights.recommended_actions) ? insights.recommended_actions : [];
  const caveats = Array.isArray(insights.caveats) ? insights.caveats : [];
  const enrichment = output.spatial_enrichment;

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">
            Module 7 Spatial Insight Generation
          </p>
          <h3 className="mt-1 text-sm font-extrabold text-slate-950">
            {insights.headline || `Insights for ${mapLabel}`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {enrichment?.is_enriched ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-sky-700">
              📍 {enrichment.osm_summary?.main_roads ?? 0} roads · {enrichment.osm_summary?.total_places ?? 0} places · {enrichment.point_count ?? 0} points
            </span>
          ) : null}
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
            {mapLabel}
          </span>
        </div>
      </div>

      {insights.executive_summary ? (
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{insights.executive_summary}</p>
      ) : null}

      {findings.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Key Findings</p>
          <div className="mt-2 grid gap-2">
            {findings.map((finding, index) => (
              <article key={`${finding.title || 'finding'}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-extrabold text-slate-900">{finding.title || `Finding ${index + 1}`}</p>
                {finding.evidence ? <p className="mt-1 text-[11px] leading-4 text-slate-600">{finding.evidence}</p> : null}
                {finding.business_implication ? (
                  <p className="mt-2 text-[11px] font-semibold leading-4 text-emerald-700">{finding.business_implication}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {spatialFindings.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-600">Spatial Findings</p>
          <div className="mt-2 grid gap-2">
            {spatialFindings.map((finding, index) => (
              <article key={`spatial-${finding.title || 'sf'}-${index}`} className="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
                <p className="text-xs font-extrabold text-slate-900">{finding.title || `Spatial Finding ${index + 1}`}</p>
                {finding.spatial_evidence ? (
                  <p className="mt-1 text-[11px] leading-4 text-slate-600">{finding.spatial_evidence}</p>
                ) : null}
                {finding.metric_impact ? (
                  <p className="mt-1 text-[11px] font-bold leading-4 text-sky-700">{finding.metric_impact}</p>
                ) : null}
                {finding.business_implication ? (
                  <p className="mt-2 text-[11px] font-semibold leading-4 text-emerald-700">{finding.business_implication}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {enrichment?.is_enriched && enrichment.zone_distribution && Object.keys(enrichment.zone_distribution).length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Zone Distribution</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(enrichment.zone_distribution).map(([zone, count]) => (
              <span
                key={zone}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  zone === 'Premium'
                    ? 'border border-amber-200 bg-amber-50 text-amber-700'
                    : zone === 'High Value Residential'
                      ? 'border border-blue-200 bg-blue-50 text-blue-700'
                      : zone === 'Balanced'
                        ? 'border border-green-200 bg-green-50 text-green-700'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {zone}: {count}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Recommended Actions</p>
          <div className="mt-2 space-y-1.5">
            {actions.map((action, index) => (
              <p key={`${action}-${index}`} className="text-xs font-semibold leading-5 text-slate-700">
                {index + 1}. {action}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {caveats.length > 0 ? (
        <details className="mt-4 text-xs text-slate-600">
          <summary className="cursor-pointer select-none font-bold uppercase tracking-widest text-slate-500">
            Caveats ({caveats.length})
          </summary>
          <div className="mt-2 space-y-1">
            {caveats.map((caveat, index) => <p key={`${caveat}-${index}`}>{caveat}</p>)}
          </div>
        </details>
      ) : null}

      <details className="mt-4 rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2 text-[11px] text-violet-900">
        <summary className="cursor-pointer select-none font-extrabold uppercase tracking-widest">
          Module 7 Token Ledger - ${output.usage.total_cost_usd.toFixed(6)} / {output.usage.total_tokens.toLocaleString()} tokens
        </summary>
        <div className="mt-2 flex flex-wrap gap-4 font-semibold">
          <span>LLM Calls: {output.usage.total_llm_calls}</span>
          <span>Input: {output.usage.total_input_tokens.toLocaleString()}</span>
          <span>Output: {output.usage.total_output_tokens.toLocaleString()}</span>
          <span>Time: {output.processing_time_seconds.toFixed(2)}s</span>
        </div>
      </details>
    </section>
  );
}

function formatRetrievedCellValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function renderFormattedLine(line: string) {
  return line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${part}-${index}`} className="rounded bg-slate-200 px-1 py-0.5 text-[12px] text-indigo-600">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

function RetrievedDataTable({ resultSet, maxRows = 100 }: { resultSet?: VisualizationRetrievalResultSet; maxRows?: number }) {
  const rows = Array.isArray(resultSet?.rows) ? resultSet.rows : [];
  const columns =
    Array.isArray(resultSet?.columns) && resultSet.columns.length > 0
      ? resultSet.columns
      : rows.length > 0
        ? Object.keys(rows[0])
        : [];

  if (!columns.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-400">
        No retrieved rows are available for this run.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs font-extrabold text-slate-900">
            {resultSet?.title || 'Retrieved Data'}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {resultSet?.domain || 'data retrieval'} · {resultSet?.row_count ?? rows.length} rows
          </p>
        </div>
        {rows.length > maxRows && (
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
            Showing {maxRows}
          </span>
        )}
      </div>
      <div className="max-h-[52vh] overflow-auto custom-scrollbar">
        <table className="w-full min-w-max border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-slate-200 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-600"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, maxRows).map((row, rowIndex) => (
              <tr key={`retrieved-row-${rowIndex}`} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    key={`${column}-${rowIndex}`}
                    className="max-w-[260px] border-b border-slate-100 px-3 py-2 align-top text-slate-600"
                  >
                    <span className="block truncate" title={formatRetrievedCellValue(row?.[column])}>
                      {formatRetrievedCellValue(row?.[column])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function defaultClarificationValue(field: VisualizationRetrievalClarificationField) {
  if (field.type === 'select') {
    return field.options?.[0]?.value || '';
  }
  return '';
}

function clarificationFieldLabel(field: VisualizationRetrievalClarificationField) {
  return field.label || field.field.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildClarificationAnswer(
  clarification: VisualizationRetrievalClarification | undefined,
  values: Record<string, string>,
) {
  const fields = clarification?.fields || [];
  if (!fields.length) {
    return Object.values(values).join('\n').trim();
  }
  return fields
    .map((field) => {
      const value = (values[field.field] || '').trim();
      if (!value) return '';
      return `${clarificationFieldLabel(field)}: ${value}`;
    })
    .filter(Boolean)
    .join('\n');
}

function missingRequiredClarificationFields(
  clarification: VisualizationRetrievalClarification | undefined,
  values: Record<string, string>,
) {
  return (clarification?.fields || []).filter((field) => field.required !== false && !(values[field.field] || '').trim());
}

const ChatSection: React.FC<ChatSectionProps> = ({
  onToggleExpand,
  isExpanded,
  onModuleOutput,
  onRetrievalOutput,
  runtimeGeneratedMaps = [],
  selectedInsightMapId = null,
  onInsightMapSelect,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(EXAMPLE_QUERY);
  const [isLoading, setIsLoading] = useState(false);
  const [chatCategory, setChatCategory] = useState<ChatCategory>('land-gis');
  const [tokenLedger, setTokenLedger] = useState<TokenLedgerRow[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [retrievalModalOpen, setRetrievalModalOpen] = useState(false);
  const [retrievalModalData, setRetrievalModalData] = useState<VisualizationRetrievalState | null>(null);
  const [activeRetrievalTab, setActiveRetrievalTab] = useState(0);
  const [insightMapModalOpen, setInsightMapModalOpen] = useState(false);
  const [pendingRetrievalClarification, setPendingRetrievalClarification] = useState<{
    messageId: string;
    originalQuery: string;
    question: string;
  } | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, Record<string, string>>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const retrievalSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const pendingRetrievalRef = useRef<Map<string, VisualizationRetrievalState>>(new Map());
  const latestRetrievalMessageIdRef = useRef<string | null>(null);
  const chatDraftsRef = useRef<Record<ChatCategory, string>>({
    'land-gis': EXAMPLE_QUERY,
    'insight-generation': DEFAULT_INSIGHT_QUERY,
    workflow: '',
    conversational: '',
  });
  const isLandGisChat = chatCategory === 'land-gis';
  const isInsightChat = chatCategory === 'insight-generation';
  const selectedInsightMap = runtimeGeneratedMaps.find((map) => map.id === selectedInsightMapId) || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const retrievalSources = retrievalSourcesRef.current;
    const pendingRetrieval = pendingRetrievalRef.current;
    return () => {
      retrievalSources.forEach((source) => source.close());
      retrievalSources.clear();
      pendingRetrieval.clear();
    };
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [input]);

  const closeRetrievalSource = (messageId: string) => {
    const existing = retrievalSourcesRef.current.get(messageId);
    if (existing) {
      existing.close();
      retrievalSourcesRef.current.delete(messageId);
    }
  };

  const updateRetrievalForMessage = (
    messageId: string,
    updater: Partial<VisualizationRetrievalState> | ((current: VisualizationRetrievalState) => VisualizationRetrievalState),
  ) => {
    const current = pendingRetrievalRef.current.get(messageId) || {
      status: 'running',
      tokenEvents: [],
    };
    const next =
      typeof updater === 'function'
        ? updater(current)
        : {
            ...current,
            ...updater,
            tokenEvents: updater.tokenEvents ?? current.tokenEvents ?? [],
          };

    pendingRetrievalRef.current.set(messageId, next);
    if (latestRetrievalMessageIdRef.current === messageId) {
      onRetrievalOutput?.(next);
    }
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              retrieval: next,
            }
          : message,
      ),
    );
  };

  const initializeClarificationAnswers = (messageId: string, clarification: VisualizationRetrievalClarification) => {
    const values = (clarification.fields || []).reduce<Record<string, string>>((acc, field) => {
      acc[field.field] = defaultClarificationValue(field);
      return acc;
    }, {});
    setClarificationAnswers((current) => ({
      ...current,
      [messageId]: values,
    }));
  };

  const updateClarificationAnswer = (messageId: string, field: string, value: string) => {
    setClarificationAnswers((current) => ({
      ...current,
      [messageId]: {
        ...(current[messageId] || {}),
        [field]: value,
      },
    }));
  };

  const startHiddenDataRetrieval = (query: string, messageId: string) => {
    closeRetrievalSource(messageId);
    updateRetrievalForMessage(messageId, {
      status: 'running',
      agentRoute: undefined,
      retrievalIntent: undefined,
      sqlQuery: undefined,
      resultSet: undefined,
      clarification: undefined,
      tokenEvents: [],
      metrics: undefined,
      error: undefined,
    });

    const params = new URLSearchParams({ question: query });
    const storedSession = window.localStorage.getItem('visualization-data-retrieval-session-id') || '';
    if (storedSession) {
      params.set('session_id', storedSession);
    }

    const source = new EventSource(`${API_BASE}/aks_stream_data_retrieval_agent_v2?${params.toString()}`);
    retrievalSourcesRef.current.set(messageId, source);

    source.onmessage = (event) => {
      let payload: { type?: string; content?: unknown; metrics?: Record<string, unknown> };
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (payload.type) {
        case 'session': {
          const sessionId = (payload.content as { session_id?: string } | undefined)?.session_id;
          if (sessionId) {
            window.localStorage.setItem('visualization-data-retrieval-session-id', sessionId);
          }
          updateRetrievalForMessage(messageId, { agentRoute: 'data_retrieval_agent_v2' });
          break;
        }
        case 'agent_route': {
          const content = payload.content as { agent_route?: string } | undefined;
          updateRetrievalForMessage(messageId, { agentRoute: content?.agent_route });
          break;
        }
        case 'intent': {
          updateRetrievalForMessage(messageId, {
            retrievalIntent: (payload.content || {}) as Record<string, unknown>,
          });
          break;
        }
        case 'sql_query': {
          updateRetrievalForMessage(messageId, {
            sqlQuery: String(payload.content || ''),
          });
          break;
        }
        case 'result_set': {
          updateRetrievalForMessage(messageId, {
            resultSet: payload.content as VisualizationRetrievalResultSet,
          });
          break;
        }
        case 'clarification_required': {
          const clarification = (payload.content || {}) as VisualizationRetrievalClarification;
          const question =
            clarification.clarification_question ||
            clarification.message ||
            clarification.questions?.[0] ||
            'Please clarify the requested values.';
          const originalQuery = clarification.original_query || query;
          setPendingRetrievalClarification({ messageId, originalQuery, question });
          initializeClarificationAnswers(messageId, clarification);
          updateRetrievalForMessage(messageId, {
            status: 'needs_clarification',
            clarification,
            error: undefined,
          });
          break;
        }
        case 'token_usage': {
          updateRetrievalForMessage(messageId, (current) => ({
            ...current,
            tokenEvents: [...(current.tokenEvents || []), payload.content as VisualizationRetrievalTokenEvent].slice(-16),
          }));
          break;
        }
        case 'error': {
          updateRetrievalForMessage(messageId, {
            error: typeof payload.content === 'string' ? payload.content : JSON.stringify(payload.content),
          });
          break;
        }
        case 'done': {
          updateRetrievalForMessage(messageId, (current) => ({
            ...current,
            status:
              current.status === 'needs_clarification'
                ? 'needs_clarification'
                : current.resultSet?.rows?.length
                  ? 'success'
                  : 'error',
            metrics: payload.metrics,
            error: current.status === 'needs_clarification' || current.resultSet?.rows?.length
              ? current.error
              : current.error || 'Data retrieval completed without a result set.',
          }));
          closeRetrievalSource(messageId);
          break;
        }
        default:
          break;
      }
    };

    source.onerror = () => {
      updateRetrievalForMessage(messageId, (current) => {
        if (current.status !== 'running') {
          return current;
        }
        return {
          ...current,
          status: 'error',
          error: current.error || 'Data retrieval stream closed before completion.',
        };
      });
      closeRetrievalSource(messageId);
    };
  };

  const submitRetrievalClarification = (messageId: string, retrieval: VisualizationRetrievalState) => {
    const clarification = retrieval.clarification;
    const originalQuery = clarification?.original_query || pendingRetrievalClarification?.originalQuery || '';
    const values = clarificationAnswers[messageId] || {};
    const missingFields = missingRequiredClarificationFields(clarification, values);
    const answer = buildClarificationAnswer(clarification, values).trim();
    if (!originalQuery || !answer || missingFields.length > 0) {
      updateRetrievalForMessage(messageId, {
        error:
          missingFields.length > 0
            ? `Please answer: ${missingFields.map(clarificationFieldLabel).join(', ')}.`
            : 'Please answer the clarification fields before rerunning data retrieval.',
      });
      return;
    }

    const assistantId = (Date.now() + 1).toString();
    const combinedQuery = `${originalQuery}\nClarification answer:\n${answer}`;
    latestRetrievalMessageIdRef.current = assistantId;
    onRetrievalOutput?.(null);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: answer },
      {
        id: assistantId,
        role: 'assistant',
        content: '**Data Retrieval V2:** Rerunning with your clarification.',
        retrieval: {
          status: 'running',
          agentRoute: 'data_retrieval_agent_v2',
          tokenEvents: [],
        },
      },
    ]);
    setInput('');
    chatDraftsRef.current['land-gis'] = '';
    setPendingRetrievalClarification(null);
    setClarificationAnswers((current) => {
      const next = { ...current };
      delete next[messageId];
      return next;
    });
    setIsLoading(true);
    startHiddenDataRetrieval(combinedQuery, assistantId);
    setIsLoading(false);
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isLoading) return;
    if (isInsightChat) {
      if (!selectedInsightMap) {
        setInsightMapModalOpen(true);
        return;
      }

      const assistantId = (Date.now() + 1).toString();
      setMessages((previous) => [
        ...previous,
        { id: Date.now().toString(), role: 'user', content: query },
      ]);
      setInput('');
      chatDraftsRef.current['insight-generation'] = '';
      setIsLoading(true);
      try {
        const output = await requestInsightGeneration(selectedInsightMap, query);
        const usageRow = output.usage.ledger[0];
        const ledgerRow: TokenLedgerRow = {
          request_id: tokenLedger.length + 1,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          provider: usageRow?.provider || MODULE7_RUNTIME_PROVIDER,
          region: usageRow?.region || MODULE7_RUNTIME_REGION,
          model: usageRow?.model || MODULE7_RUNTIME_MODEL,
          query_preview: `Insights: ${query}`.substring(0, 80),
          input_tokens: output.usage.total_input_tokens,
          cached_input_tokens: output.usage.total_cached_input_tokens,
          output_tokens: output.usage.total_output_tokens,
          total_tokens: output.usage.total_tokens,
          input_cost_usd: usageRow?.input_cost_usd ?? usageRow?.input_cost ?? 0,
          cached_input_cost_usd: usageRow?.cached_input_cost_usd ?? usageRow?.cached_input_cost ?? 0,
          output_cost_usd: usageRow?.output_cost_usd ?? usageRow?.output_cost ?? 0,
          total_cost_usd: output.usage.total_cost_usd,
        };
        setMessages((previous) => [
          ...previous,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            insightOutput: output,
            insightMapLabel: selectedInsightMap.label,
            ledgerRow,
          },
        ]);
        setTokenLedger((previous) => [...previous, ledgerRow]);
        setTotalCost((previous) => previous + ledgerRow.total_cost_usd);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to generate map insights.';
        setMessages((previous) => [
          ...previous,
          { id: assistantId, role: 'assistant', content: `**Error:** ${message}` },
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    if (!isLandGisChat) return;

    if (pendingRetrievalClarification) {
      const answer = query;
      const assistantId = (Date.now() + 1).toString();
      const combinedQuery = `${pendingRetrievalClarification.originalQuery}\nClarification answer: ${answer}`;
      latestRetrievalMessageIdRef.current = assistantId;
      onRetrievalOutput?.(null);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'user', content: answer },
        {
          id: assistantId,
          role: 'assistant',
          content: '**Data Retrieval V2:** Rerunning with your clarification.',
          retrieval: {
            status: 'running',
            agentRoute: 'data_retrieval_agent_v2',
            tokenEvents: [],
          },
        },
      ]);
      setInput('');
      chatDraftsRef.current['land-gis'] = '';
      setPendingRetrievalClarification(null);
      setIsLoading(true);
      startHiddenDataRetrieval(combinedQuery, assistantId);
      setIsLoading(false);
      return;
    }

    const assistantId = (Date.now() + 1).toString();
    latestRetrievalMessageIdRef.current = assistantId;
    onRetrievalOutput?.(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    chatDraftsRef.current['land-gis'] = '';
    setIsLoading(true);
    startHiddenDataRetrieval(query, assistantId);

    try {
      const res = await fetch(`${API_BASE}/visualization-agent/module1/run-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_query: query,
          demo_mode: DEMO_MODE_ENABLED,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errorData.detail || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as Module1ResponseData;
      const intentOutput = data.intent_output;
      onModuleOutput?.(intentOutput);
      const objective = intentOutput?.business_objective || 'Intent finalized successfully.';
      const mapType = intentOutput?.map_output_requirements?.primary_map_type || 'auto';
      const isValid = intentOutput?.validation_status?.is_valid;

      const summary = [
        `**Business Objective:** ${objective}`,
        `**Primary Map Type:** \`${mapType}\``,
        `**Validation:** ${isValid ? 'Valid' : 'Has issues'}`,
        `**Time:** ${data.elapsed_seconds}s`,
      ].join('\n\n');

      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: summary,
        intentOutput: data.intent_output,
        usage: data.usage,
        cost: data.cost,
        ledgerRow: data.ledger_row,
        elapsed: data.elapsed_seconds,
        retrieval: pendingRetrievalRef.current.get(assistantId),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Update token ledger. Demo mode mirrors Streamlit behavior and is not counted.
      if (!DEMO_MODE_ENABLED && data.usage && data.usage.total_tokens > 0) {
        const newRow: TokenLedgerRow = data.ledger_row || {
          request_id: tokenLedger.length + 1,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          provider: 'AWS Bedrock',
          region: 'ap-south-1',
          model: 'moonshotai.kimi-k2.5',
          query_preview: query.substring(0, 80),
          input_tokens: data.usage.input_tokens || 0,
          cached_input_tokens: data.usage.cached_input_tokens || 0,
          output_tokens: data.usage.output_tokens || 0,
          total_tokens: data.usage.total_tokens || 0,
          input_cost_usd: data.cost?.input_cost || 0,
          cached_input_cost_usd: data.cost?.cached_input_cost || 0,
          output_cost_usd: data.cost?.output_cost || 0,
          total_cost_usd: data.cost?.total_cost || 0,
        };
        setTokenLedger((prev) => [...prev, newRow]);
        setTotalCost((prev) => prev + (newRow.total_cost_usd || 0));
      }
    } catch (error: unknown) {
      closeRetrievalSource(assistantId);
      pendingRetrievalRef.current.delete(assistantId);
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `**Error:** ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (msg: Message) => {
    setModalData(msg);
    setActiveTab(0);
    setModalOpen(true);
  };

  const openRetrievalModal = (retrieval: VisualizationRetrievalState) => {
    setRetrievalModalData(retrieval);
    setActiveRetrievalTab(0);
    setRetrievalModalOpen(true);
  };

  const handleCategoryChange = (nextCategory: ChatCategory) => {
    chatDraftsRef.current[chatCategory] = input;
    setChatCategory(nextCategory);
    setInput(chatDraftsRef.current[nextCategory]);
    if (nextCategory === 'insight-generation') {
      setInsightMapModalOpen(true);
    }
  };

  const handleSelectInsightMap = (mapId: string) => {
    onInsightMapSelect?.(mapId);
    setInsightMapModalOpen(false);
  };

  const totalInputTokens = tokenLedger.reduce((s, r) => s + r.input_tokens, 0);
  const totalCachedInputTokens = tokenLedger.reduce((s, r) => s + r.cached_input_tokens, 0);
  const totalOutputTokens = tokenLedger.reduce((s, r) => s + r.output_tokens, 0);

  return (
    <>
      <div
        className="workspace-panel flex h-full w-full flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden transition-all duration-500"
      >
        {/* Header */}
        <div className="workspace-panel-header flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
                AI Assistant
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  {isInsightChat ? 'Module 7' : 'Module 1'}
                </span>
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">
                  Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              title={isExpanded ? 'Restore panel size' : 'Expand panel'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Chat messages area */}
        <div className="workspace-scroll flex-1 overflow-y-auto p-5 scrollbar-thin">
          {messages.length === 0 && !isLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-center animate-in fade-in duration-700">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-indigo-500/5 animate-pulse blur-xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl border border-slate-100">
                  <Bot className="h-10 w-10 text-indigo-500/40" />
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Visualization Agent
              </h3>
              <p className="mt-2.5 max-w-[240px] text-xs font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                {isInsightChat ? 'MODULE 7 - INSIGHT GENERATION' : 'MODULE 1 - INTENT FINALIZATION'}
              </p>
              <p className="mt-4 max-w-[280px] text-sm font-medium text-slate-500 leading-relaxed">
                {isInsightChat
                  ? 'Select a generated map and ask for analysis grounded in its plotted data.'
                  : 'Enter a real estate visualization query to generate structured intent, map requirements, and an execution plan.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`flex gap-3 ${m.insightOutput ? 'w-full' : 'max-w-[85%]'} ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        m.role === 'user'
                          ? 'border-indigo-100 bg-indigo-50 text-indigo-600'
                          : 'border-slate-100 bg-slate-50 text-slate-400'
                      }`}
                    >
                      {m.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>

                    <div className={`flex min-w-0 flex-col gap-2 ${m.insightOutput ? 'flex-1' : ''}`}>
                      {m.insightOutput ? (
                        <Module7ChatInsightPanel
                          output={m.insightOutput}
                          mapLabel={m.insightMapLabel || 'Selected Map'}
                        />
                      ) : (
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            m.role === 'user'
                              ? 'bg-indigo-600 text-white shadow-indigo-100'
                              : 'border border-slate-100 bg-slate-50 text-slate-700'
                          }`}
                        >
                          {m.role === 'user' ? (
                          m.content
                        ) : (
                          <div className="space-y-1">
                            {m.content.split('\n\n').map((line, i) => (
                              <p key={i}>{renderFormattedLine(line)}</p>
                            ))}
                          </div>
                        )}
                        </div>
                      )}

                      {/* Output actions */}
                      {m.role === 'assistant' && (m.intentOutput || m.retrieval) && (
                        <div className="flex flex-wrap items-center gap-2 self-start">
                          {m.intentOutput && (
                            <button
                              onClick={() => openModal(m)}
                              className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest transition-all hover:bg-indigo-100 hover:shadow-sm"
                            >
                              <ChevronDown className="h-3 w-3" />
                              View Full Output
                            </button>
                          )}

                          {m.retrieval?.status === 'running' && (
                            <button
                              disabled
                              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                            >
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Retrieving Data
                            </button>
                          )}

                          {m.retrieval?.status === 'needs_clarification' && (
                            <div className="w-full max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 shadow-sm">
                              <div className="flex items-start gap-2">
                                <span className="text-base font-black leading-none text-red-500">?</span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-extrabold uppercase tracking-widest text-[10px] text-amber-700">
                                    {m.retrieval.clarification?.stopped_at_stage?.replace(/_/g, ' ') || 'Data Retrieval V2'} Clarification
                                  </p>
                                  <p className="mt-1 font-semibold leading-5">
                                    {m.retrieval.clarification?.clarification_question ||
                                      m.retrieval.clarification?.message ||
                                      'Please clarify the requested values.'}
                                  </p>
                                </div>
                              </div>

                              {m.retrieval.clarification?.next_action ? (
                                <p className="mt-2 text-[11px] font-medium leading-4 text-amber-800">
                                  {m.retrieval.clarification.next_action}
                                </p>
                              ) : null}

                              {Array.isArray(m.retrieval.clarification?.fields) && m.retrieval.clarification.fields.length > 0 ? (
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  {m.retrieval.clarification.fields.map((field) => {
                                    const label = clarificationFieldLabel(field);
                                    const value = clarificationAnswers[m.id]?.[field.field] ?? defaultClarificationValue(field);
                                    return (
                                      <label key={field.field} className="block min-w-0">
                                        <span className="block text-[10px] font-extrabold uppercase tracking-[0.22em] text-amber-800">
                                          {label}
                                        </span>
                                        {field.help_text ? (
                                          <span className="mt-1 block text-[10px] font-semibold leading-4 text-amber-700">
                                            {field.help_text}
                                          </span>
                                        ) : null}
                                        {field.type === 'select' ? (
                                          <select
                                            value={value}
                                            onChange={(event) => updateClarificationAnswer(m.id, field.field, event.target.value)}
                                            className="mt-2 h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                                          >
                                            {(field.options || []).map((option) => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        ) : field.type === 'textarea' ? (
                                          <textarea
                                            rows={3}
                                            value={value}
                                            onChange={(event) => updateClarificationAnswer(m.id, field.field, event.target.value)}
                                            placeholder={field.placeholder || `Enter ${label.toLowerCase()}`}
                                            className="mt-2 min-h-20 w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={value}
                                            onChange={(event) => updateClarificationAnswer(m.id, field.field, event.target.value)}
                                            placeholder={field.placeholder || `Enter ${label.toLowerCase()}`}
                                            className="mt-2 h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                                          />
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                <label className="mt-4 block">
                                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.22em] text-amber-800">
                                    Answer
                                  </span>
                                  <textarea
                                    rows={3}
                                    value={clarificationAnswers[m.id]?.clarification_answer || ''}
                                    onChange={(event) => updateClarificationAnswer(m.id, 'clarification_answer', event.target.value)}
                                    placeholder="Provide the missing detail"
                                    className="mt-2 min-h-20 w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                                  />
                                </label>
                              )}

                              {m.retrieval.error ? (
                                <p className="mt-2 text-[11px] font-bold text-red-600">{m.retrieval.error}</p>
                              ) : null}

                              <div className="mt-3 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => submitRetrievalClarification(m.id, m.retrieval as VisualizationRetrievalState)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-amber-700"
                                >
                                  <Send className="h-3 w-3" />
                                  Submit Answer
                                </button>
                              </div>
                            </div>
                          )}

                          {Boolean(m.retrieval?.resultSet?.rows?.length) && (
                            <button
                              onClick={() => openRetrievalModal(m.retrieval as VisualizationRetrievalState)}
                              className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest transition-all hover:bg-emerald-100 hover:shadow-sm"
                            >
                              <Database className="h-3 w-3" />
                              Display Retrieved Data
                            </button>
                          )}

                          {m.retrieval?.status === 'error' && !m.retrieval?.resultSet?.rows?.length && (
                            <button
                              disabled
                              title={m.retrieval.error || 'Data retrieval did not return rows.'}
                              className="flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-bold text-red-500 uppercase tracking-widest"
                            >
                              Retrieval Unavailable
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <div className="flex max-w-[85%] gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                      <Bot className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {isInsightChat ? 'Analyzing selected map...' : 'Finalizing intent...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Token summary bar */}
        {tokenLedger.length > 0 && (
          <div className="flex items-center justify-between px-6 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            <div className="flex items-center gap-2">
              <span>{tokenLedger.length} requests</span>
              <span>/</span>
              <span>{totalInputTokens.toLocaleString()} in</span>
              <span>/</span>
              <span>{totalCachedInputTokens.toLocaleString()} cached</span>
              <span>/</span>
              <span>{totalOutputTokens.toLocaleString()} out</span>
              <span>/</span>
              <span>${totalCost.toFixed(6)}</span>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="workspace-panel-footer p-6 bg-slate-50/30 border-t border-slate-100">
          <div className="workspace-input-wrap relative flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-inner-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                chatDraftsRef.current[chatCategory] = e.target.value;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                pendingRetrievalClarification
                  ? 'Answer the data retrieval clarification...'
                  : isLandGisChat
                    ? 'Ask the Visualization Agent what to analyze or visualize...'
                  : 'Ask for anything about insights from the loaded map...'
              }
              disabled={isLoading}
              className="max-h-[100px] min-h-[22px] flex-1 resize-none bg-transparent px-4 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />

            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || (isInsightChat && !selectedInsightMap)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-40"
              title={
                pendingRetrievalClarification
                  ? 'Submit clarification answer'
                  : isLandGisChat
                  ? 'Send message'
                  : selectedInsightMap
                    ? 'Generate insights for the selected map'
                    : 'Select a generated map to ask for insights'
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4.5 w-4.5" />
              )}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Category:</span>
              <select
                value={chatCategory}
                onChange={(event) => handleCategoryChange(event.target.value as ChatCategory)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-slate-700 outline-none"
                aria-label="Select chat category"
              >
                {CHAT_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value} disabled={category.disabled}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            {isLandGisChat ? (
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                {pendingRetrievalClarification ? 'Answer Retrieval Clarification' : 'Module 1 + Retrieval V2 Active'}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setInsightMapModalOpen(true)}
                className="flex max-w-[220px] items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 transition-colors hover:bg-emerald-100"
                title="Select a generated map for insight generation"
              >
                <MapIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{selectedInsightMap?.label || 'Select Generated Map'}</span>
              </button>
            )}
          </div>

          {/* Runtime model information */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                {isLandGisChat ? MODULE1_RUNTIME_MODEL : MODULE7_RUNTIME_MODEL}
              </span>
            </div>
          </div>
        </div>
      </div>

      {insightMapModalOpen && (
        <div className="workspace-modal fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="workspace-modal-card flex w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="workspace-panel-header flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                  Insight Generation
                </p>
                <h2 className="mt-1 text-base font-extrabold text-slate-900">
                  Select a Generated Map
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInsightMapModalOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Close generated map selection"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto bg-slate-50/60 p-5 custom-scrollbar">
              {runtimeGeneratedMaps.length === 0 ? (
                <div className="flex min-h-[170px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-6 text-center">
                  <MapIcon className="h-7 w-7 text-slate-300" />
                  <p className="mt-4 text-sm font-bold text-slate-700">
                    No map generated yet for Insights
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    Generate a map in Module 3.1 or Module 3 to continue.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {runtimeGeneratedMaps.map((map) => {
                    const isSelected = map.id === selectedInsightMapId;
                    return (
                      <button
                        type="button"
                        key={map.id}
                        onClick={() => handleSelectInsightMap(map.id)}
                        className={`flex w-full items-start justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">{map.label}</p>
                          <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">{map.title}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest text-indigo-600">
                            Module {map.sourceModule}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            {map.family}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Full-screen popup modal ===== */}
      {modalOpen && modalData && (
        <div className="workspace-modal fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="workspace-modal-card h-[85vh] w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
            {/* Modal header */}
            <div className="workspace-panel-header flex items-center justify-between border-b border-slate-100 px-8 py-5 shrink-0">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Module 1 - Structured Output
              </h2>
              <div className="flex items-center gap-3">
                {modalData.elapsed != null && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {modalData.elapsed}s
                  </span>
                )}
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 px-8 py-2 overflow-x-auto shrink-0">
              {TAB_NAMES.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => setActiveTab(idx)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === idx
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
              {activeTab === 0 && (
                <pre className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(modalData.intentOutput, null, 2)}
                </pre>
              )}

              {activeTab === 1 && (
                <div>
                  {(modalData.intentOutput?.execution_plan?.length ?? 0) > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            {['Step', 'Name', 'Module', 'Action', 'Status', 'Depends On'].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-600 uppercase tracking-widest text-[10px]"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(modalData.intentOutput?.execution_plan ?? []).map((step: ExecutionPlanStep) => (
                            <tr key={step.step_id} className="hover:bg-slate-50">
                              <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-indigo-600">
                                {step.step_id}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800">
                                {step.step_name}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-500">
                                {step.module}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-500">
                                {step.action_type}
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    step.status === 'planned'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                                  }`}
                                >
                                  {step.status}
                                </span>
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono text-slate-500">
                                {(step.depends_on?.length ?? 0) > 0 ? step.depends_on?.join(', ') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No execution plan found.</p>
                  )}
                </div>
              )}

              {activeTab === 2 && (
                <pre className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(
                    modalData.intentOutput?.map_output_requirements || {},
                    null,
                    2
                  )}
                </pre>
              )}

              {activeTab === 3 && (
                <pre className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(modalData.intentOutput?.intent_mapping || {}, null, 2)}
                </pre>
              )}

              {activeTab === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                        Active Requirement Blocks
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(modalData.intentOutput?.active_requirement_blocks || []).map(
                          (b: string) => (
                            <span
                              key={b}
                              className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest"
                            >
                              {b}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                        Required Modules
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(modalData.intentOutput?.required_modules || []).map((m: string) => (
                          <span
                            key={m}
                            className="rounded-full bg-violet-50 border border-violet-100 px-3 py-1 text-[10px] font-bold text-violet-600 uppercase tracking-widest"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                      Execution Flags
                    </h4>
                    <pre className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(modalData.intentOutput?.execution_flags || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 5 && (
                <pre className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(modalData.intentOutput?.validation_status || {}, null, 2)}
                </pre>
              )}

              {activeTab === 6 && (
                <div>
                  {tokenLedger.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            {[
                              '#',
                              'Time',
                              'Provider',
                              'Region',
                              'Model',
                              'Query',
                              'Input Tokens',
                              'Cached',
                              'Output Tokens',
                              'Total Tokens',
                              'Input Cost',
                              'Cached Cost',
                              'Output Cost',
                              'Total Cost',
                            ].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-600 uppercase tracking-widest text-[10px]"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {tokenLedger.map((row) => (
                            <tr key={row.request_id} className="hover:bg-slate-50">
                              <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-indigo-600">
                                {row.request_id}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-500">
                                {row.timestamp}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-500">
                                {row.provider || 'AWS Bedrock'}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono text-slate-500">
                                {row.region || 'ap-south-1'}
                              </td>
                              <td className="max-w-[240px] border border-slate-200 px-3 py-2 font-mono text-slate-700">
                                <span className="block whitespace-normal break-words" title={row.model}>
                                  {row.model}
                                </span>
                              </td>
                              <td className="border border-slate-200 px-3 py-2 text-slate-700 max-w-[200px] truncate">
                                {row.query_preview}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono text-slate-600">
                                {row.input_tokens.toLocaleString()}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono text-slate-600">
                                {row.cached_input_tokens.toLocaleString()}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono text-slate-600">
                                {row.output_tokens.toLocaleString()}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-slate-800">
                                {row.total_tokens.toLocaleString()}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono text-emerald-600">
                                ${(row.input_cost_usd || 0).toFixed(6)}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono text-emerald-600">
                                ${(row.cached_input_cost_usd || 0).toFixed(6)}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono text-emerald-600">
                                ${(row.output_cost_usd || 0).toFixed(6)}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono text-emerald-600">
                                ${row.total_cost_usd.toFixed(6)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Token ledger is empty. Demo mode calls are not counted.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Retrieved data popup modal ===== */}
      {retrievalModalOpen && retrievalModalData && (
        <div className="workspace-modal fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="workspace-modal-card h-[85vh] w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="workspace-panel-header flex items-center justify-between border-b border-slate-100 px-8 py-5 shrink-0">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Retrieved Data
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {retrievalModalData.agentRoute || retrievalModalData.resultSet?.domain || 'Data Retrieval Agent'}
                  {retrievalModalData.metrics?.duration_seconds
                    ? ` · ${String(retrievalModalData.metrics.duration_seconds)}s`
                    : ''}
                </p>
              </div>
              <button
                onClick={() => setRetrievalModalOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-1 border-b border-slate-100 px-8 py-2 overflow-x-auto shrink-0">
              {RETRIEVAL_TABS.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => setActiveRetrievalTab(idx)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeRetrievalTab === idx
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {idx === 0 ? <Database className="h-3 w-3" /> : <FileCode2 className="h-3 w-3" />}
                  {name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
              {activeRetrievalTab === 0 && (
                <RetrievedDataTable resultSet={retrievalModalData.resultSet} />
              )}

              {activeRetrievalTab === 1 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-xs font-extrabold text-slate-900">Generated SQL Query</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Executed by the existing data retrieval agent pipeline
                    </p>
                  </div>
                  <pre className="max-h-[58vh] overflow-auto p-5 text-xs font-mono leading-relaxed text-slate-700 whitespace-pre-wrap custom-scrollbar">
                    {retrievalModalData.sqlQuery || 'No SQL query was returned for this run.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatSection;
