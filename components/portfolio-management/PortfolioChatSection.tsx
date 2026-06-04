'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Coins, Database, Loader2, Send, TerminalSquare, User, X } from 'lucide-react';

const makeChatId = (prefix = 'chat') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

type PortfolioResultSet = {
  title?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  row_count?: number;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  status?: string;
  sql?: string;
  resultSets?: PortfolioResultSet[];
  error?: string;
};

type ChatTokenUsageEvent = {
  stage?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cumulative_total_tokens?: number;
  cumulative_cost_usd?: number;
};

const toText = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value, null, 2);
};

const toNumber = (value: unknown) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeTokenUsage = (value: unknown): ChatTokenUsageEvent => {
  const usage = (value || {}) as Record<string, unknown>;
  return {
    stage: typeof usage.stage === 'string' ? usage.stage : '',
    prompt_tokens: toNumber(usage.prompt_tokens),
    completion_tokens: toNumber(usage.completion_tokens),
    total_tokens: toNumber(usage.total_tokens),
    cumulative_total_tokens: toNumber(usage.cumulative_total_tokens),
    cumulative_cost_usd: toNumber(usage.cumulative_cost_usd),
  };
};

const formatTokenNumber = (value: unknown) => toNumber(value).toLocaleString('en-IN');
const formatUsd = (value: unknown) => `$${toNumber(value).toFixed(6)}`;

const PortfolioChatSection = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'System ready. Ask anything about your portfolio records.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenPopoverOpen, setTokenPopoverOpen] = useState(false);
  const [tokenUsageEvents, setTokenUsageEvents] = useState<ChatTokenUsageEvent[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('portfolio-chat-session-id');
  });
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const latestTokenUsage = tokenUsageEvents[tokenUsageEvents.length - 1];
  const totalTokens = latestTokenUsage?.cumulative_total_tokens || latestTokenUsage?.total_tokens || 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const updateAssistantMessage = (assistantId: string, patcher: (message: ChatMessage) => ChatMessage) => {
    setChatMessages((current) => current.map((message) => (message.id === assistantId ? patcher(message) : message)));
  };

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text || isStreaming) return;

    eventSourceRef.current?.close();

    const assistantId = makeChatId('chat-assistant');
    setChatMessages((prev) => [
      ...prev,
      { id: makeChatId('chat-user'), role: 'user', content: text },
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'Connecting to Portfolio Agent...',
        resultSets: [],
      },
    ]);
    setChatInput('');
    setTokenUsageEvents([]);
    setIsStreaming(true);

    const params = new URLSearchParams({ question: text });
    if (sessionId) params.set('session_id', sessionId);

    const source = new EventSource(`${API_BASE_URL}/portfolio/chat/stream?${params.toString()}`);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      let payload: { type?: string; content?: unknown; status?: string; agent?: string };
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (payload.type) {
        case 'session': {
          const nextSessionId = (payload.content as { session_id?: string } | undefined)?.session_id;
          if (nextSessionId) {
            setSessionId(nextSessionId);
            window.localStorage.setItem('portfolio-chat-session-id', nextSessionId);
          }
          break;
        }
        case 'start':
        case 'stage':
        case 'observation_preview':
          updateAssistantMessage(assistantId, (message) => ({ ...message, status: toText(payload.content) }));
          break;
        case 'sql_query':
          updateAssistantMessage(assistantId, (message) => ({ ...message, sql: toText(payload.content), status: 'Portfolio SQL query generated.' }));
          break;
        case 'result_set':
          updateAssistantMessage(assistantId, (message) => ({
            ...message,
            resultSets: [...(message.resultSets || []), payload.content as PortfolioResultSet],
            status: 'Portfolio records retrieved.',
          }));
          break;
        case 'token_usage':
          setTokenUsageEvents((current) => [...current, normalizeTokenUsage(payload.content)]);
          break;
        case 'report_chunk':
          updateAssistantMessage(assistantId, (message) => ({
            ...message,
            content: `${message.content}${toText(payload.content)}`,
            status: 'Writing answer...',
          }));
          break;
        case 'error':
          updateAssistantMessage(assistantId, (message) => ({
            ...message,
            error: toText(payload.content),
            content: message.content || `Error: ${toText(payload.content)}`,
            status: 'Portfolio Agent error.',
          }));
          setIsStreaming(false);
          source.close();
          break;
        case 'done':
          updateAssistantMessage(assistantId, (message) => ({
            ...message,
            content: message.content || 'No matching portfolio records were found.',
            status: payload.status === 'success' ? 'Complete' : `Finished: ${payload.status || 'unknown'}`,
          }));
          setIsStreaming(false);
          source.close();
          eventSourceRef.current = null;
          break;
        default:
          break;
      }
    };

    source.onerror = () => {
      updateAssistantMessage(assistantId, (message) => ({
        ...message,
        error: 'Portfolio chat stream disconnected. Please confirm the backend is running and try again.',
        content: message.content || 'Portfolio chat stream disconnected. Please confirm the backend is running and try again.',
        status: 'Disconnected',
      }));
      setIsStreaming(false);
      source.close();
      eventSourceRef.current = null;
    };
  };

  return (
    <aside className="sticky top-[6.5rem] flex h-[calc(100vh-8rem)] min-h-[620px] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 max-[1200px]:static max-[1200px]:h-[520px] max-[1200px]:min-h-0">
      <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-500"><Bot size={18} /></div>
        <div>
          <h2 className="text-[13px] font-black uppercase tracking-tight text-slate-900">AI Assistant</h2>
          <span className="mt-1 block text-xs font-bold text-slate-400">Portfolio chat</span>
        </div>
        <div className="relative ml-auto inline-flex items-center">
          <button
            className={`relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border shadow-sm transition hover:-translate-y-px ${latestTokenUsage ? 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'}`}
            type="button"
            onClick={() => setTokenPopoverOpen((open) => !open)}
            title="Retrieval token usage"
            aria-label="Retrieval token usage"
          >
            <Coins size={17} />
            {latestTokenUsage && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                {formatTokenNumber(totalTokens)}
              </span>
            )}
          </button>

          {tokenPopoverOpen && (
            <div className="absolute right-0 top-[48px] z-50 w-[min(340px,86vw)] rounded-[20px] border border-gray-200 bg-white p-4 text-left shadow-[0_22px_70px_rgba(15,23,42,0.2)]">
              <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="m-0 text-sm font-black text-slate-900">Retrieval Tokens</h3>
                  <p className="m-0 mt-1 text-xs font-semibold text-slate-500">
                    {latestTokenUsage ? latestTokenUsage.stage || 'Portfolio chat stream' : 'No token event captured yet'}
                  </p>
                </div>
                <button className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" onClick={() => setTokenPopoverOpen(false)} title="Close" type="button">
                  <X size={14} />
                </button>
              </div>

              {latestTokenUsage ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="block font-bold text-slate-500">Cumulative</span>
                      <b className="mt-1 block text-base text-slate-900">{formatTokenNumber(totalTokens)}</b>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="block font-bold text-slate-500">Cost</span>
                      <b className="mt-1 block text-base text-slate-900">{formatUsd(latestTokenUsage.cumulative_cost_usd)}</b>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="block font-bold text-slate-500">Prompt</span>
                      <b className="mt-1 block text-base text-slate-900">{formatTokenNumber(latestTokenUsage.prompt_tokens)}</b>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="block font-bold text-slate-500">Completion</span>
                      <b className="mt-1 block text-base text-slate-900">{formatTokenNumber(latestTokenUsage.completion_tokens)}</b>
                    </div>
                  </div>

                  {!!tokenUsageEvents.length && (
                    <div className="mt-3 max-h-44 overflow-auto rounded-2xl border border-slate-200">
                      {tokenUsageEvents.map((usage, index) => (
                        <div className="border-b border-slate-100 px-3 py-2.5 text-xs last:border-b-0" key={`${usage.stage || 'stage'}-${index}`}>
                          <div className="flex items-center justify-between gap-3">
                            <b className="truncate text-slate-800">{usage.stage || `Stage ${index + 1}`}</b>
                            <span className="font-black text-slate-900">{formatTokenNumber(usage.total_tokens)} tokens</span>
                          </div>
                          <div className="mt-1 text-slate-500">
                            {formatTokenNumber(usage.prompt_tokens)} prompt / {formatTokenNumber(usage.completion_tokens)} completion
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  Ask a portfolio retrieval question to see stream token usage here.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden bg-white p-5">
        {chatMessages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div className={`flex max-w-full gap-3 ${isUser ? 'flex-row-reverse' : ''}`} key={message.id}>
              <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-sm ${isUser ? 'text-slate-900' : 'text-slate-500'}`}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[82%] whitespace-pre-wrap break-words rounded-[22px] px-4 py-3 text-sm font-bold leading-relaxed shadow-sm ${isUser ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {message.status && !isUser && (
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500">
                    {isStreaming && !message.content ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot size={14} />}
                    <span>{message.status}</span>
                  </div>
                )}
                {message.content || (!isUser ? 'Thinking...' : '')}
                {!!message.resultSets?.length && (
                  <div className="mt-3 grid gap-2">
                    {message.resultSets.map((resultSet, index) => (
                      <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-700" key={`${message.id}-result-${index}`}>
                        <div className="mb-1.5 flex items-center gap-1.5 font-black text-slate-900">
                          <Database size={14} />
                          <span>{resultSet.title || 'Portfolio Data'}</span>
                        </div>
                        <div>{resultSet.row_count ?? resultSet.rows?.length ?? 0} row(s) returned</div>
                      </div>
                    ))}
                  </div>
                )}
                {message.sql && (
                  <details className="mt-3 rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-700">
                    <summary className="flex cursor-pointer items-center gap-1.5 font-black text-slate-900">
                      <TerminalSquare size={14} />
                      SQL
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed">{message.sql}</pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 bg-white p-5">
        <textarea
          className="min-h-11 flex-1 resize-none rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-300"
          rows={1}
          value={chatInput}
          disabled={isStreaming}
          onChange={(event) => setChatInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendChatMessage();
            }
          }}
          placeholder="Type your instruction..."
        />
        <button
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-slate-900 text-white shadow-xl shadow-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
          type="button"
          onClick={sendChatMessage}
          disabled={!chatInput.trim() || isStreaming}
          title="Send message"
          aria-label="Send message"
        >
          {isStreaming ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </aside>
  );
};

export default PortfolioChatSection;
