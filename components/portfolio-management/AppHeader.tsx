/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import { useState } from 'react';
import {
  Coins,
  Bot,
  FileText,
  Image as ImageIcon,
  Layers,
  Mic,
  Plus,
  Plug,
  RefreshCw,
  Upload,
  Workflow,
  X
} from 'lucide-react';

const formatTokenNumber = (value) => Number(value || 0).toLocaleString('en-IN');

export default function AppHeader({
  plusMenuOpen,
  setPlusMenuOpen,
  openUploadModal,
  setAgentListOpen,
  saveAllAndRefreshDashboard,
  tokenUsageSummary
}) {
  const [tokenPopoverOpen, setTokenPopoverOpen] = useState(false);
  const usage = tokenUsageSummary?.displayUsage || {};
  const tableUsages = tokenUsageSummary?.tables || [];
  const primaryButton = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800';
  const menuItem = 'flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-0 bg-transparent px-3 py-[11px] text-left font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700';
  const iconButton = 'inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:-translate-y-px';
  const tokenStat = 'rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5';

  return (
    <header className="mb-5 flex items-end justify-between gap-5 max-[1100px]:flex-col max-[1100px]:items-stretch">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-[7px] text-[13px] text-slate-600 shadow-[0_2px_10px_rgba(15,23,42,0.04)]"><Layers size={14} /> SigmaValue OS Prototype</div>
        <h1 className="my-1.5 text-[38px] tracking-[-0.04em] max-[640px]:text-3xl">Portfolio Management Software</h1>
        <p className="mt-1.5 text-slate-500">Every section has a master table, editable fields, and field categorisation into Raw, Derived, and System fields.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative inline-flex items-center">
          <button className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 shadow-[0_8px_18px_rgba(29,78,216,0.12)] hover:bg-blue-100" onClick={() => setPlusMenuOpen((open) => !open)} title="Quick actions">
            <Plus size={22} />
          </button>
          {plusMenuOpen && (
            <div className="absolute left-0 top-[52px] z-50 w-[230px] rounded-[18px] border border-gray-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
              <button className={menuItem} onClick={() => { setPlusMenuOpen(false); openUploadModal('global'); }}><Upload size={16} /> Upload File</button>
              <button className={menuItem} onClick={() => setPlusMenuOpen(false)}><ImageIcon size={16} /> Upload Photo</button>
              <button className={menuItem} onClick={() => setPlusMenuOpen(false)}><Plug size={16} /> Connect Apps</button>
              <button className={menuItem} onClick={() => setPlusMenuOpen(false)}><FileText size={16} /> Create Report</button>
              <button className={menuItem} onClick={() => setPlusMenuOpen(false)}><Workflow size={16} /> Add to Workflow</button>
              <button className={menuItem} onClick={() => { setPlusMenuOpen(false); setAgentListOpen(true); }}><Bot size={16} /> Use Agent</button>
              <button className={menuItem} onClick={() => setPlusMenuOpen(false)}><Mic size={16} /> Record Voice</button>
            </div>
          )}
        </div>

        <div className="relative inline-flex items-center">
          <button
            className={`${iconButton} ${tokenUsageSummary ? 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setTokenPopoverOpen((open) => !open)}
            title="Token usage"
            type="button"
          >
            <Coins size={19} />
            {tokenUsageSummary && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                {formatTokenNumber(usage.total_tokens || 0)}
              </span>
            )}
          </button>

          {tokenPopoverOpen && (
            <div className="absolute right-0 top-[52px] z-50 w-[min(360px,92vw)] rounded-[20px] border border-gray-200 bg-white p-4 text-left shadow-[0_22px_70px_rgba(15,23,42,0.2)]">
              <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="m-0 text-sm font-black text-slate-900">Token Usage</h3>
                  <p className="m-0 mt-1 text-xs font-semibold text-slate-500">
                    {tokenUsageSummary ? `Latest ${tokenUsageSummary.mode || 'upload'} preview` : 'No upload preview captured yet'}
                  </p>
                </div>
                <button className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" onClick={() => setTokenPopoverOpen(false)} title="Close" type="button">
                  <X size={14} />
                </button>
              </div>

              {tokenUsageSummary ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={tokenStat}>
                      <span className="block font-bold text-slate-500">Total tokens</span>
                      <b className="mt-1 block text-base text-slate-900">{formatTokenNumber(usage.total_tokens)}</b>
                    </div>
                    <div className={tokenStat}>
                      <span className="block font-bold text-slate-500">LLM requests</span>
                      <b className="mt-1 block text-base text-slate-900">{formatTokenNumber(usage.llm_request_count || usage.request_count)}</b>
                    </div>
                    <div className={tokenStat}>
                      <span className="block font-bold text-slate-500">Input</span>
                      <b className="mt-1 block text-base text-slate-900">{formatTokenNumber(usage.input_tokens || usage.prompt_tokens)}</b>
                    </div>
                    <div className={tokenStat}>
                      <span className="block font-bold text-slate-500">Output</span>
                      <b className="mt-1 block text-base text-slate-900">{formatTokenNumber(usage.output_tokens || usage.completion_tokens)}</b>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-500">Captured</span>
                      <span className="text-right font-semibold text-slate-700">{tokenUsageSummary.capturedAt}</span>
                    </div>
                    {tokenUsageSummary.uploadId && (
                      <div className="mt-1.5 flex justify-between gap-3">
                        <span className="font-bold text-slate-500">Upload ID</span>
                        <span className="max-w-[190px] truncate text-right font-semibold text-slate-700" title={tokenUsageSummary.uploadId}>{tokenUsageSummary.uploadId}</span>
                      </div>
                    )}
                  </div>

                  {!!tableUsages.length && (
                    <div className="mt-3 max-h-44 overflow-auto rounded-2xl border border-slate-200">
                      {tableUsages.map((table) => (
                        <div className="border-b border-slate-100 px-3 py-2.5 text-xs last:border-b-0" key={`${table.tableIndex}-${table.detectedSectionKey}`}>
                          <div className="flex items-center justify-between gap-3">
                            <b className="truncate text-slate-800">{table.detectedSectionKey || `Table ${table.tableIndex}`}</b>
                            <span className="font-black text-slate-900">{formatTokenNumber(table.tokenUsage?.total_tokens)} tokens</span>
                          </div>
                          <div className="mt-1 text-slate-500">
                            {formatTokenNumber(table.tokenUsage?.input_tokens || table.tokenUsage?.prompt_tokens)} in / {formatTokenNumber(table.tokenUsage?.output_tokens || table.tokenUsage?.completion_tokens)} out
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  Upload an Excel/CSV file and run preview to see mapping-agent token usage here.
                </div>
              )}
            </div>
          )}
        </div>

        <button className={`${primaryButton} bg-violet-600 hover:bg-violet-700 max-[640px]:w-full`} onClick={() => setAgentListOpen(true)}><Bot size={16} /> Agents</button>
        <button className={`${primaryButton} bg-green-600 hover:bg-green-700 max-[640px]:w-full`} onClick={saveAllAndRefreshDashboard}><RefreshCw size={16} /> Save All</button>
      </div>
    </header>
  );
}
