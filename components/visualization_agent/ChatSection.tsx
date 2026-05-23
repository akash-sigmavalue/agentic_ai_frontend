'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Maximize2,
  Trash2,
  User,
  Loader2,
  ChevronDown,
  X,
} from 'lucide-react';
import type { ExecutionPlanStep, Module1IntentOutput } from './types';

interface ChatSectionProps {
  onToggle?: () => void;
  isCollapsed?: boolean;
  onModuleOutput?: (output: Module1IntentOutput | null) => void;
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
}

interface TokenLedgerRow {
  request_id: number;
  timestamp: string;
  model: string;
  query_preview: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
}

interface Module1ResponseData {
  intent_output: Module1IntentOutput;
  usage: Record<string, number>;
  cost: Record<string, number>;
  elapsed_seconds: number;
  ledger_row?: TokenLedgerRow | null;
}

const MODELS = ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'];
const MODEL_PRICING: Record<string, { input: number; cached_input: number; output: number }> = {
  'gpt-5.5': { input: 5.0, cached_input: 0.5, output: 30.0 },
  'gpt-5.4': { input: 2.5, cached_input: 0.25, output: 15.0 },
  'gpt-5.4-mini': { input: 0.75, cached_input: 0.075, output: 4.5 },
};
const DEFAULT_MODEL = 'gpt-5.4-mini';
const EXAMPLE_QUERY = 'Show residential sales density in Baner and Balewadi from 2021 to 2024.';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TAB_NAMES = [
  'Structured Output',
  'Execution Plan',
  'Map Requirements',
  'Intent Mapping',
  'Active Blocks',
  'Validation',
  'Token Ledger',
];

const ChatSection: React.FC<ChatSectionProps> = ({ onToggle, isCollapsed, onModuleOutput }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(EXAMPLE_QUERY);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [demoMode, setDemoMode] = useState(false);
  const [tokenLedger, setTokenLedger] = useState<TokenLedgerRow[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedPricing = MODEL_PRICING[selectedModel];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [input]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/visualization-agent/module1/run-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_query: query,
          model: selectedModel,
          demo_mode: demoMode,
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
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: summary,
        intentOutput: data.intent_output,
        usage: data.usage,
        cost: data.cost,
        ledgerRow: data.ledger_row,
        elapsed: data.elapsed_seconds,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Update token ledger. Demo mode mirrors Streamlit behavior and is not counted.
      if (!demoMode && data.usage && data.usage.total_tokens > 0) {
        const newRow: TokenLedgerRow = data.ledger_row || {
          request_id: tokenLedger.length + 1,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          model: selectedModel,
          query_preview: query.substring(0, 80),
          input_tokens: data.usage.input_tokens || 0,
          cached_input_tokens: data.usage.cached_input_tokens || 0,
          output_tokens: data.usage.output_tokens || 0,
          total_tokens: data.usage.total_tokens || 0,
          total_cost_usd: data.cost?.total_cost || 0,
        };
        setTokenLedger((prev) => [...prev, newRow]);
        setTotalCost((prev) => prev + (newRow.total_cost_usd || 0));
      }
    } catch (error: unknown) {
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

  const handleClear = () => {
    setMessages([]);
    setTokenLedger([]);
    setTotalCost(0);
    setModalData(null);
    setModalOpen(false);
    setActiveTab(0);
    onModuleOutput?.(null);
  };

  const openModal = (msg: Message) => {
    setModalData(msg);
    setActiveTab(0);
    setModalOpen(true);
  };

  const totalInputTokens = tokenLedger.reduce((s, r) => s + r.input_tokens, 0);
  const totalCachedInputTokens = tokenLedger.reduce((s, r) => s + r.cached_input_tokens, 0);
  const totalOutputTokens = tokenLedger.reduce((s, r) => s + r.output_tokens, 0);

  return (
    <>
      <div
        className={`workspace-panel flex h-full w-full flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden transition-all duration-500 ${isCollapsed ? 'opacity-80' : 'opacity-100'}`}
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
                  Module 1
                </span>
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">
                  Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="rounded-lg border border-slate-100 p-2 text-slate-400 transition-colors hover:text-slate-600"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              <Maximize2
                className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              />
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
                MODULE 1 - INTENT FINALIZATION
              </p>
              <p className="mt-4 max-w-[280px] text-sm font-medium text-slate-500 leading-relaxed">
                Enter a real estate visualization query to generate structured intent, map
                requirements, and an execution plan.
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
                    className={`flex max-w-[85%] gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
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

                    <div className="flex flex-col gap-2">
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
                              <p key={i} dangerouslySetInnerHTML={{
                                __html: line
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/`(.*?)`/g, '<code class="rounded bg-slate-200 px-1 py-0.5 text-[12px] text-indigo-600">$1</code>')
                              }} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Arrow button to open modal */}
                      {m.role === 'assistant' && m.intentOutput && (
                        <button
                          onClick={() => openModal(m)}
                          className="self-start flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest transition-all hover:bg-indigo-100 hover:shadow-sm"
                        >
                          <ChevronDown className="h-3 w-3" />
                          View Full Output
                        </button>
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
                        Finalizing intent...
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask the Visualization Agent what to analyze or visualize..."
              disabled={isLoading}
              className="max-h-[100px] min-h-[22px] flex-1 resize-none bg-transparent px-4 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />

            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-40"
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4.5 w-4.5" />
              )}
            </button>
          </div>

          {/* Model selector */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Model:
              </span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-700 uppercase tracking-widest outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(e) => setDemoMode(e.target.checked)}
                  className="h-3 w-3 accent-indigo-600"
                />
                Demo mode
              </label>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Enter to send - Shift+Enter for newline
              </p>
              {selectedPricing && (
                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  ${selectedPricing.input.toFixed(3)} in / ${selectedPricing.cached_input.toFixed(3)} cached / ${selectedPricing.output.toFixed(3)} out per 1M
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

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
                            {['#', 'Time', 'Model', 'Query', 'In', 'Cached', 'Out', 'Total', 'Cost'].map(
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
                                {row.model}
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
    </>
  );
};

export default ChatSection;
