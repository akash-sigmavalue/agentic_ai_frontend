'use client';

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Maximize2, Trash2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, WorkflowStreamEvent } from '../../types/agents';
import { getAiResponse } from '../../lib/mockAi';
import { saveDashboardLastRun } from '../../lib/dashboard/last-run-store';
import { API_ROUTES, apiUrl } from '../../lib/api-client';

interface ChatSectionProps {
  onAiResponse: (content: string, data?: unknown) => void;
  onStreamEvent?: (event: WorkflowStreamEvent) => void;
  onToggle?: () => void;
  isCollapsed?: boolean;
}

type TokenSource = 'estimated' | 'actual';

type TokenMetric = {
  tokens: number;
  source: TokenSource;
  modelName?: string;
  modelProvider?: string;
  inputTokens?: number;
  outputTokens?: number;
};

const AGENT_ORDER = ['intent_agent', 'planning_agent', 'file_data_agent', 'ui_agent'] as const;

const PERSONALIZED_WIDGETS = [
  'dashboard',
  'table',
  'metric',
  'bar_chart',
  'line_chart',
  'pie_chart',
  'scatter_plot',
] as const;

const AGENT_LABELS: Record<string, string> = {
  intent_agent: 'Intent Agent',
  planning_agent: 'Planning Agent',
  file_data_agent: 'File Data Agent',
  ui_agent: 'UI Agent',
};

const getObjectValue = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
};

const getNumberValue = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const getStringValue = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const estimateTokens = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
};

const extractTokenMetric = (event: WorkflowStreamEvent, fallbackText = ''): TokenMetric => {
  const dataObject = getObjectValue(event.data);
  const usageCandidates = [
    event.usage,
    dataObject?.usage,
    dataObject?.token_usage,
    dataObject?.usage_metadata,
  ];

  const directCandidates = [
    event.total_tokens,
    event.tokens,
    event.prompt_tokens,
    event.completion_tokens,
    dataObject?.total_tokens,
    dataObject?.tokens,
    dataObject?.prompt_tokens,
    dataObject?.completion_tokens,
  ];

  for (const candidate of usageCandidates) {
    const usageObject = getObjectValue(candidate);
    if (!usageObject) continue;

    const modelName =
      getStringValue(usageObject.model_name) ??
      getStringValue(usageObject.model) ??
      getStringValue(usageObject.model_id);
    const modelProvider =
      getStringValue(usageObject.model_provider) ??
      getStringValue(usageObject.provider);
    const inputTokens =
      getNumberValue(usageObject.input_tokens) ??
      getNumberValue(usageObject.prompt_tokens);
    const outputTokens =
      getNumberValue(usageObject.output_tokens) ??
      getNumberValue(usageObject.completion_tokens);

    const totalTokens =
      getNumberValue(usageObject.total_tokens) ??
      getNumberValue(usageObject.tokens);
    if (totalTokens !== null) {
      return {
        tokens: totalTokens,
        source: 'actual',
        modelName,
        modelProvider,
        inputTokens: inputTokens ?? undefined,
        outputTokens: outputTokens ?? undefined,
      };
    }

    const promptTokens = inputTokens;
    const completionTokens = outputTokens;
    if (promptTokens !== null || completionTokens !== null) {
      return {
        tokens: (promptTokens ?? 0) + (completionTokens ?? 0),
        source: 'actual',
        modelName,
        modelProvider,
        inputTokens: promptTokens ?? undefined,
        outputTokens: completionTokens ?? undefined,
      };
    }
  }

  for (const candidate of directCandidates) {
    const direct = getNumberValue(candidate);
    if (direct !== null) {
      return { tokens: direct, source: 'actual' };
    }
  }

  const estimateSource = fallbackText || event.message || safeStringify(event.data);
  return { tokens: estimateTokens(estimateSource), source: 'estimated' };
};

type AnalyticalData = {
  data_summary?: string;
  jsx?: string;
  insights?: Array<{
    title?: string;
    description?: string;
  }>;
  [key: string]: unknown;
};

type DashboardAssistantResponseEvent = CustomEvent<{
  content?: string;
}>;

const consumeSseFrames = (
  buffer: string,
  onEvent: (event: WorkflowStreamEvent) => void
) => {
  const frames = buffer.split('\n\n');
  const remainder = frames.pop() || '';

  for (const frame of frames) {
    const dataLines = frame
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice(6).trim())
      .filter(Boolean);

    if (dataLines.length === 0) continue;

    try {
      const parsed = JSON.parse(dataLines.join('\n')) as WorkflowStreamEvent;
      onEvent(parsed);
    } catch {
    }
  }

  return remainder;
};

const ChatSectionDashboard: React.FC<ChatSectionProps> = ({ 
  onAiResponse,
  onStreamEvent,
  onToggle,
  isCollapsed 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queryTokenMetric, setQueryTokenMetric] = useState<TokenMetric>({
    tokens: 0,
    source: 'estimated',
  });
  const [agentTokenMetrics, setAgentTokenMetrics] = useState<Partial<Record<string, TokenMetric>>>({});
  const [isTokenMonitorOpen, setIsTokenMonitorOpen] = useState(false);
  const [isResponseSelectorOpen, setIsResponseSelectorOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const agentTokenMetricsRef = useRef<Partial<Record<string, TokenMetric>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentQueryTokens = useMemo(() => estimateTokens(input), [input]);
  const queryTokenMetricDisplay = useMemo<TokenMetric>(
    () => ({
      ...queryTokenMetric,
      tokens: Math.max(queryTokenMetric.tokens, currentQueryTokens),
      source: queryTokenMetric.source === 'actual' ? 'actual' : 'estimated',
    }),
    [currentQueryTokens, queryTokenMetric]
  );
  const latestRunTotalTokens = useMemo(
    () =>
      queryTokenMetricDisplay.tokens +
      AGENT_ORDER.reduce((sum, key) => sum + (agentTokenMetrics[key]?.tokens ?? 0), 0),
    [agentTokenMetrics, queryTokenMetricDisplay.tokens]
  );
  const completedAgentCount = AGENT_ORDER.filter((key) => agentTokenMetrics[key]).length;
  const latestRunSummary = AGENT_ORDER.map((agentKey) => {
    const metric = agentTokenMetrics[agentKey];
    return {
      key: agentKey,
      label: AGENT_LABELS[agentKey],
      tokens: metric?.tokens ?? 0,
      source: metric?.source ?? 'estimated',
      modelName: metric?.modelName ?? 'Not reported',
      modelProvider: metric?.modelProvider ?? 'unknown',
      inputTokens: metric?.inputTokens,
      outputTokens: metric?.outputTokens,
      hasMetric: Boolean(metric),
    };
  });

  const recordAgentMetric = useCallback((key: string, metric: TokenMetric) => {
    if (!AGENT_ORDER.includes(key as (typeof AGENT_ORDER)[number])) return;

    setAgentTokenMetrics((prev) => {
      const existing = agentTokenMetricsRef.current[key];
      if (existing?.source === 'actual' && metric.source !== 'actual') {
        return prev;
      }
      if (existing && existing.source === 'estimated' && metric.source === 'estimated') {
        return prev;
      }
      const next = {
        ...prev,
        [key]: metric,
      };
      agentTokenMetricsRef.current = next;
      return next;
    });
  }, []);

  const recordTokenMetricFromEvent = useCallback((event: WorkflowStreamEvent) => {
    if (
      event.event_type === 'stage_complete' &&
      event.node &&
      AGENT_ORDER.includes(event.node as (typeof AGENT_ORDER)[number])
    ) {
      recordAgentMetric(
        event.node,
        extractTokenMetric(
          event,
          `${event.message || ''}\n${safeStringify(event.data)}`
        )
      );
    }
  }, [recordAgentMetric]);

  useEffect(() => {
    const handleResumeTokenEvent = (event: Event) => {
      const streamEvent = (event as CustomEvent<WorkflowStreamEvent>).detail;
      if (streamEvent) {
        recordTokenMetricFromEvent(streamEvent);
      }
    };

    window.addEventListener('workflow:tokenStreamEvent', handleResumeTokenEvent);
    return () => window.removeEventListener('workflow:tokenStreamEvent', handleResumeTokenEvent);
  }, [recordTokenMetricFromEvent]);

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sigmavalue_chat_history');
    if (saved) {
      setMessages(JSON.parse(saved) as Message[]);
    } else {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'System ready. How can I assist with your dashboard objectives today?',
          timestamp: Date.now(),
        },
      ]);
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('sigmavalue_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const handleExternalAssistantResponse = (event: Event) => {
      const { content } = (event as DashboardAssistantResponseEvent).detail || {};
      const trimmedContent = typeof content === 'string' ? content.trim() : '';
      if (!trimmedContent) return;

      setMessages((prev) => {
        const latestMessage = prev[prev.length - 1];
        if (latestMessage?.role === 'assistant' && latestMessage.content === trimmedContent) {
          return prev;
        }

        return [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: trimmedContent,
            timestamp: Date.now(),
          },
        ];
      });
    };

    window.addEventListener('dashboard:assistantResponse', handleExternalAssistantResponse);
    return () => window.removeEventListener('dashboard:assistantResponse', handleExternalAssistantResponse);
  }, []);

  const handleClearChat = () => {
    const initialMsg: Message[] = [{
      id: '1',
      role: 'assistant',
      content: 'System ready. How can I assist with your dashboard objectives today?',
      timestamp: Date.now(),
    }];
    setMessages(initialMsg);
    setQueryTokenMetric({ tokens: 0, source: 'estimated' });
    setAgentTokenMetrics({});
    agentTokenMetricsRef.current = {};
    setIsTokenMonitorOpen(false);
    localStorage.setItem('sigmavalue_chat_history', JSON.stringify(initialMsg));
  };

  const closeTokenMonitor = () => setIsTokenMonitorOpen(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const runPipeline = async (queryText: string, widget?: string) => {
    if (!queryText.trim() || isLoading) return;

    saveDashboardLastRun({ query: queryText, widget });

    const submittedQueryTokens = estimateTokens(queryText);
    setQueryTokenMetric({ tokens: submittedQueryTokens, source: 'estimated' });
    setAgentTokenMetrics({});
    agentTokenMetricsRef.current = {};
    setIsTokenMonitorOpen(true);

    const userMessageContent = widget
      ? `${queryText}\n\nSelected widget: ${widget}`
      : queryText;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    onStreamEvent?.({
      event_type: 'stage_start',
      node: 'query',
      message: 'Query received',
      data: {
        preview: {
          query: queryText,
          widget: widget || 'auto',
        },
      },
    });

    // token removeDot, authentication removed and vrearer token removed

    try {
      // const token = localStorage.getItem('token');
      let aiResponseContent = '';
      let analyticalData: AnalyticalData | string | null = null;
      let sawStreamMetrics = false;
      let pausedForFileDecision = false;

      // if (token) {
        const params = new URLSearchParams({
          query: queryText,
          pause_after_intent: 'true',
        });
        if (widget) {
          params.set('widget', widget);
        }

        const res = await fetch(`${apiUrl(API_ROUTES.generationStream)}?${params.toString()}`, {
          method: 'GET'
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          
          let buffer = "";
          let shouldStopStream = false;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            buffer = consumeSseFrames(buffer, (event) => {
              if (onStreamEvent) {
                onStreamEvent(event);
              }

              if (event.event_type === 'awaiting_file_decision') {
                pausedForFileDecision = true;
                shouldStopStream = true;
                return;
              }

              if (
                event.event_type === 'stage_complete' &&
                event.node &&
                AGENT_ORDER.includes(event.node as (typeof AGENT_ORDER)[number])
              ) {
                sawStreamMetrics = true;
                recordTokenMetricFromEvent(event);
              }

              if (event.event_type === 'final_result') {
                analyticalData = (event.data as AnalyticalData) ?? null;
                const structuredText =
                  typeof analyticalData === 'object' && analyticalData !== null
                    ? analyticalData.data_summary || analyticalData.jsx || ''
                    : '';
                if (structuredText) {
                  aiResponseContent = `### Analysis Result\n\n${structuredText}`;
                } else if (analyticalData && typeof analyticalData === 'object') {
                  aiResponseContent = `### Analysis Result\n\n\`\`\`json\n${JSON.stringify(analyticalData, null, 2)}\n\`\`\``;
                } else if (typeof analyticalData === 'string') {
                  aiResponseContent = String(analyticalData);
                }

                const insights = Array.isArray(analyticalData?.insights) ? analyticalData.insights : [];
                if (insights.length > 0) {
                  aiResponseContent += '\n\n**Insights:**\n' + insights
                    .map((insight) => `- **${insight.title || 'Insight'}**: ${insight.description || ''}`)
                    .join('\n');
                }
              } else if (event.event_type === 'error') {
                aiResponseContent = "Network error: " + event.message;
              }
            });

            if (shouldStopStream) {
              await reader.cancel();
              break;
            }
          }
        } else {
          aiResponseContent = "I encountered an error connecting to the analytical module. Please verify your credentials.";
        }
      // } else {
      //   aiResponseContent = await getAiResponse(queryText);
      // }

      if (pausedForFileDecision) {
        return;
      }

      if (!aiResponseContent.trim()) {
        aiResponseContent = 'No structured response was returned for this query.';
      }

      if (!sawStreamMetrics && aiResponseContent.trim()) {
        recordAgentMetric('ui_agent', {
          tokens: estimateTokens(aiResponseContent),
          source: 'estimated',
        });
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      onAiResponse(aiResponseContent, analyticalData);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Network error: Unable to reach the AI Neural Core.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    setPendingQuery(input.trim());
    setInput('');
    setIsResponseSelectorOpen(true);
  };

  const handleRunSelection = async (widget?: string) => {
    if (!pendingQuery?.trim() || isLoading) return;
    const queryText = pendingQuery;
    setIsResponseSelectorOpen(false);
    setPendingQuery(null);
    await runPipeline(queryText, widget);
  };

  const handleCancelSelection = () => {
    if (isLoading) return;
    if (pendingQuery) {
      setInput(pendingQuery);
    }
    setIsResponseSelectorOpen(false);
    setPendingQuery(null);
  };

  if (isCollapsed) {
    return (
      <div className="dashboard-panel flex h-full w-full flex-col items-center overflow-hidden rounded-[2rem] border border-slate-200 bg-white py-5 shadow-xl shadow-slate-200/40 transition-all duration-300">
        <button
          onClick={onToggle}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-100"
          title="Expand chat"
          aria-label="Expand chat"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        <div className="mt-5 h-px w-10 bg-slate-200" />

        <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
          <Bot className="h-5 w-5 text-slate-500" />
        </div>

        <div className="mt-6 flex flex-1 items-center justify-center">
          <div className="rotate-180 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 [writing-mode:vertical-rl]">
            AI Assistant
          </div>
        </div>

        {messages.length > 1 && (
          <div className="mb-1 flex h-7 min-w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[10px] font-black text-slate-500">
            {messages.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`dashboard-panel flex h-full w-full flex-col bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden transition-all duration-300`}>
      {/* Panel Header */}
      <div className="dashboard-panel-header flex items-center justify-between border-b border-slate-100 bg-[#f8fafc] px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
            <Bot className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-[#1a1c3d] tracking-tight uppercase">AI Dashboard Assistant</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button
             type="button"
             onClick={() => setIsTokenMonitorOpen(true)}
             className="inline-flex h-8 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
             title="Open model and token usage"
             aria-label="Open model and token usage"
           >
             <span>Usage</span>
             <ChevronDown className="h-3.5 w-3.5" />
           </button>
           {messages.length > 1 && (
             <button 
               onClick={handleClearChat}
               className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
               title="Clear Chat"
             >
               <Trash2 className="h-4 w-4" />
             </button>
           )}
           <div className="bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Online</span>
           </div>
           {onToggle && (
             <button 
               onClick={onToggle}
               className="text-slate-400 hover:text-indigo-500 transition-colors p-1 ml-2"
             >
               <Maximize2 className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
             </button>
           )}
        </div>
      </div>

      {isTokenMonitorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={closeTokenMonitor}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Token usage details"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Token Monitor</p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-[#1a1c3d]">Model Usage</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Open the model view to see exact token usage reported for each agent in the latest run.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTokenMonitor}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-3 sm:px-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Draft query</p>
                <div className="mt-3 flex items-end gap-2">
                  <p className="text-3xl font-black tracking-tight text-[#1a1c3d]">
                    {queryTokenMetricDisplay.tokens.toLocaleString()}
                  </p>
                  <span className="pb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">tokens</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {queryTokenMetricDisplay.source === 'actual' ? 'Actual usage' : 'Estimated from the draft prompt.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Latest run</p>
                <div className="mt-3 flex items-end gap-2">
                  <p className="text-3xl font-black tracking-tight text-[#1a1c3d]">
                    {latestRunTotalTokens.toLocaleString()}
                  </p>
                  <span className="pb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">tokens</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {completedAgentCount} of {AGENT_ORDER.length} agents reported usage.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Agents</p>
                <div className="mt-3 flex items-end gap-2">
                  <p className="text-3xl font-black tracking-tight text-[#1a1c3d]">{completedAgentCount}</p>
                  <span className="pb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">active</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Open any card below to review the model and token breakdown.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {latestRunSummary.map((agent) => (
                  <details
                    key={agent.key}
                    className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm open:shadow-md"
                    open={agent.key === 'intent_agent'}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{agent.label}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <p className="text-2xl font-black tracking-tight text-[#1a1c3d]">{agent.tokens.toLocaleString()}</p>
                          <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">tokens</span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          agent.hasMetric
                            ? agent.source === 'actual'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        {agent.hasMetric ? (agent.source === 'actual' ? 'Actual' : 'Estimated') : 'Waiting'}
                      </span>
                    </summary>

                    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Model</span>
                        <span className="font-bold text-[#1a1c3d]">{agent.modelName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Provider</span>
                        <span className="font-bold text-[#1a1c3d]">{agent.modelProvider}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Input</span>
                        <span className="font-bold text-[#1a1c3d]">
                          {agent.inputTokens?.toLocaleString() ?? '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Output</span>
                        <span className="font-bold text-[#1a1c3d]">
                          {agent.outputTokens?.toLocaleString() ?? '—'}
                        </span>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-canvas flex-1 overflow-y-auto overflow-x-hidden p-8 bg-white scrollbar-hide">
        <div className="space-y-10">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
            >
              <div
                className={`flex max-w-[90%] gap-4 ${
                  m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 shadow-sm transition-transform hover:scale-110`}>
                  {m.role === 'user' ? (
                    <User className="h-5 w-5 text-indigo-500" />
                  ) : (
                    <Bot className="h-5 w-5 text-slate-500" />
                  )}
                </div>
                <div
                  className={`rounded-[1.5rem] px-6 py-4 text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-[#525ceb] text-white font-black'
                      : 'bg-[#f1f5f9] text-[#1a1c3d] font-bold'
                  }`}
                >
                  <div className="prose prose-slate max-w-none break-words text-[13px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.role === 'assistant' ? (m.content || '').split('```json')[0] : (m.content || '')}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isResponseSelectorOpen && pendingQuery && (
            <>
              <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex max-w-[90%] gap-4 flex-row-reverse">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 shadow-sm">
                    <User className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div className="rounded-[1.5rem] bg-[#525ceb] px-6 py-4 text-sm leading-relaxed text-white shadow-sm">
                    <div className="prose prose-invert max-w-none break-words text-[13px] font-black">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {pendingQuery}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex max-w-[90%] min-w-0 gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 shadow-sm">
                    <Bot className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 w-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] px-5 py-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Choose Response Type</p>
                    <h3 className="mt-2 text-sm font-black leading-snug tracking-tight text-[#1a1c3d]">
                      How should I generate this response?
                    </h3>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                      You can let the agent decide automatically, or choose a widget yourself.
                    </p>

                    <div className="mt-5 grid min-w-0 gap-3">
                      <button
                        type="button"
                        onClick={() => void handleRunSelection()}
                        className="group flex min-w-0 items-start gap-3 rounded-2xl border border-indigo-100 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                          AI
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Default</span>
                          <span className="mt-1 block text-sm font-black leading-snug tracking-tight text-[#1a1c3d]">Let Agent 1 decide</span>
                          <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">
                            Auto-select the best output format for this request.
                          </span>
                        </span>
                      </button>

                      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Personalized</p>
                        <h4 className="mt-1 text-sm font-black leading-snug tracking-tight text-[#1a1c3d]">Choose a backend widget</h4>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                          Choose a specific backend widget.
                        </p>

                        <div className="mt-4 grid min-w-0 grid-cols-2 gap-2">
                          {PERSONALIZED_WIDGETS.map((widget) => (
                            <button
                              key={widget}
                              type="button"
                              onClick={() => void handleRunSelection(widget)}
                              className="min-w-0 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                              title={widget.replace(/_/g, ' ')}
                            >
                              {widget.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
                      <button
                        type="button"
                        onClick={handleCancelSelection}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                  <Bot className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex items-center gap-3 rounded-[1.5rem] bg-[#f1f5f9] px-6 py-4 border border-slate-100">
                  <Loader2 className="h-4 w-4 animate-spin text-[#525ceb]" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SYNTHESIZING...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="dashboard-panel-footer p-8 bg-white">
        <div className="dashboard-input-wrap relative flex items-center gap-3 rounded-2xl border-2 border-slate-100 bg-[#f8fafc] p-2 focus-within:border-[#525ceb]/30 transition-all shadow-inner-sm">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your instruction..."
            className="flex-1 resize-none bg-transparent px-4 py-3 text-sm font-bold text-[#1a1c3d] placeholder:text-slate-300 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#525ceb] text-white shadow-xl shadow-indigo-200 transition-all hover:bg-slate-900 disabled:opacity-30"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSectionDashboard;
