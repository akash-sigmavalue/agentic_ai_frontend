'use client';

import React from 'react';
import { Bot, Sparkles, Wand2, Send, Database } from 'lucide-react';
import { ConnectorRegistryResponse, ConnectorWorkflowDraft } from '../../types/api';

interface ChatSectionConnectorProps {
  value: string;
  onChange: (value: string) => void;
  onPlan?: (value: string) => void | Promise<void>;
  workflowMode: 'prompt' | 'manual';
  registry: ConnectorRegistryResponse | null;
  draft: ConnectorWorkflowDraft | null;
  isPlanning: boolean;
  statusMessage: string;
}

const QUICK_PROMPTS = [
  'Route form submissions into the best matching connector service',
  'Create a workflow that detects missing config and asks only for essentials',
  'Plan a publishable connector workflow from a natural language prompt',
];

export default function ChatSectionConnector({
  value,
  onChange,
  onPlan,
  workflowMode,
  registry,
  draft,
  isPlanning,
  statusMessage,
}: ChatSectionConnectorProps) {
  const connectorCount = registry?.connectors.length || 0;
  const activeStepCount = draft?.steps.length || 0;
  const readyState = draft?.can_execute ? 'Ready to execute' : 'Needs config';

  return (
    <section className="connector-panel flex h-full min-h-[620px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
      <div className="connector-panel-header border-b border-slate-100 bg-[#f8fafc] px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
              <Bot className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Step 1</p>
              <h2 className="mt-1 text-[13px] font-black uppercase tracking-tight text-[#1a1c3d]">Describe the workflow</h2>
            </div>
          </div>
          <div className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
            {workflowMode === 'prompt' ? 'Planner mode' : 'Manual mode'}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-8">
        <div className="connector-card rounded-[1.75rem] border border-slate-200 bg-[#f8fafc] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#525ceb]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Connector brief</span>
          </div>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
            Describe the outcome you want. The backend planner will detect the connector, service, trigger, action,
            and missing fields from the registry metadata.
          </p>

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="For example: plan a connector that routes lead form submissions to the right email action."
            className="connector-input mt-4 min-h-[220px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium leading-relaxed text-slate-900 outline-none placeholder:text-slate-400"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onChange(prompt)}
                className="connector-chip rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:border-indigo-200 hover:text-indigo-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Registry</p>
            </div>
            <p className="mt-3 text-2xl font-black text-[#1a1c3d]">{connectorCount}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Connectors loaded from backend capability metadata.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-emerald-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Planner</p>
            </div>
            <p className="mt-3 text-sm font-black text-[#1a1c3d]">{isPlanning ? 'Planning workflow...' : readyState}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{activeStepCount} workflow steps currently detected.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-slate-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Status</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">{statusMessage}</p>
          </div>
        </div>
      </div>

      <div className="connector-panel-footer border-t border-slate-100 bg-white p-8">
        <div className="connector-input-wrap flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#f8fafc] p-2 shadow-inner">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-transparent px-4 py-3 text-sm font-semibold text-[#1a1c3d] outline-none placeholder:text-slate-400"
            placeholder="Type your connector prompt..."
          />
          <button
            type="button"
            onClick={() => onPlan?.(value.trim())}
            disabled={isPlanning}
            className="inline-flex items-center gap-2 rounded-xl bg-[#525ceb] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[#434fd8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isPlanning ? 'Planning' : 'Plan'}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
          <span>Prompt to workflow</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-500">
            <Wand2 className="h-3.5 w-3.5" />
            Backend-planned draft
          </span>
        </div>
        {draft?.notes?.length ? (
          <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            {draft.notes[0]}
          </p>
        ) : null}
      </div>
    </section>
  );
}
