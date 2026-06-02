/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import {
  Bot,
  FileText,
  Image as ImageIcon,
  Layers,
  Mic,
  Plus,
  Plug,
  RefreshCw,
  Upload,
  Workflow
} from 'lucide-react';

export default function AppHeader({
  plusMenuOpen,
  setPlusMenuOpen,
  openUploadModal,
  setAgentListOpen,
  saveAllAndRefreshDashboard,
  addSection
}) {
  const primaryButton = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800';
  const menuItem = 'flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-0 bg-transparent px-3 py-[11px] text-left font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700';

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

        <button className={`${primaryButton} bg-violet-600 hover:bg-violet-700 max-[640px]:w-full`} onClick={() => setAgentListOpen(true)}><Bot size={16} /> Agents</button>
        <button className={`${primaryButton} bg-green-600 hover:bg-green-700 max-[640px]:w-full`} onClick={saveAllAndRefreshDashboard}><RefreshCw size={16} /> Save All</button>
        <button className={`${primaryButton} max-[640px]:w-full`} onClick={addSection}><Plus size={16} /> Add Section</button>
      </div>
    </header>
  );
}
