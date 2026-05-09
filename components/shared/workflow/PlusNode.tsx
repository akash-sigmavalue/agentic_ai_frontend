'use client';

import React, { memo } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { Plus } from 'lucide-react';

type PlusNodeData = {
  label?: string;
  onAdd?: () => void;
  onContinue?: () => void;
  theme?: 'light' | 'dark';
};

const PlusNode = ({ data }: NodeProps<PlusNodeData>) => {
  const isDarkTheme = data.theme === 'dark';

  return (
    <div
      className={`relative flex w-[190px] flex-col items-center gap-2 rounded-xl border-2 border-dashed px-5 py-4 text-center shadow-lg backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-xl ${
        isDarkTheme
          ? 'border-indigo-400/70 bg-slate-900/90 text-slate-100 hover:border-indigo-300'
          : 'border-indigo-300 bg-white/95 text-slate-900 hover:border-indigo-500'
      }`}
      title="Choose file workflow"
    >
      <Handle
        type="target"
        position={Position.Top}
        className={isDarkTheme ? '!bg-slate-300' : '!bg-slate-700'}
      />
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
        <Plus className="h-5 w-5" />
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">
        {data.label || 'Add Data'}
      </span>
      <span className={`text-[11px] font-bold ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
        Upload CSV/XLSX or continue
      </span>
      <span className="mt-2 flex w-full gap-2">
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            data.onAdd?.();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              data.onAdd?.();
            }
          }}
          className="flex-1 rounded-lg bg-indigo-600 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-slate-900"
        >
          Upload
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            data.onContinue?.();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              data.onContinue?.();
            }
          }}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
        >
          Skip
        </span>
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className={isDarkTheme ? '!bg-slate-300' : '!bg-slate-700'}
      />
    </div>
  );
};

export default memo(PlusNode);
