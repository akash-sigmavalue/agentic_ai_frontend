'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, Clock, CheckCircle2, AlertCircle, PlayCircle, Settings, GitBranch } from 'lucide-react';

const CustomNode = ({ data, type }: NodeProps) => {
  const isActive = data.highlighted || data.status === 'In Progress';
  const isDone = data.status === 'Done';
  const isFailed = data.status === 'Failed';
  const isSubstage = data.kind === 'substage';
  const previewItems = Array.isArray(data.previewItems) ? data.previewItems : [];
  const isDarkTheme = data.theme === 'dark';

  const surfaceClass = isDarkTheme ? 'bg-slate-900/95 text-slate-100' : 'bg-white/95 text-slate-900';
  const mutedTextClass = isDarkTheme ? 'text-slate-300' : 'text-slate-600';
  const subtleTextClass = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const iconWrapClass = isDarkTheme ? 'bg-slate-800' : 'bg-slate-100';
  const previewWrapClass = isDarkTheme
    ? 'border-slate-700 bg-slate-800/80'
    : 'border-slate-100 bg-slate-50/80';
  const footerBorderClass = isDarkTheme ? 'border-slate-700' : 'border-slate-100';

  const getAccentColor = () => {
    if (isFailed) return isDarkTheme ? 'border-rose-500/70' : 'border-rose-300';
    if (isSubstage) return isDarkTheme ? 'border-sky-500/60' : 'border-sky-200 bg-sky-50/60';
    switch (type) {
      case 'input': return isDarkTheme ? 'border-emerald-500/70' : 'border-emerald-300';
      case 'output': return isDarkTheme ? 'border-indigo-500/70' : 'border-indigo-300';
      case 'decision': return isDarkTheme ? 'border-amber-500/70' : 'border-amber-300';
      default: return isDarkTheme ? 'border-violet-500/70' : 'border-violet-300';
    }
  };

  const getAccentBar = () => {
    if (isFailed) return 'bg-rose-500';
    if (isSubstage) return 'bg-sky-500';
    switch (type) {
      case 'input': return 'bg-emerald-500';
      case 'output': return 'bg-indigo-500';
      case 'decision': return 'bg-amber-500';
      default: return 'bg-violet-500';
    }
  };

  const getStatusIcon = () => {
    if (isDone) return <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
    if (isFailed) return <AlertCircle className="h-3 w-3 text-rose-600" />;
    if (isActive) return <PlayCircle className="h-3 w-3 text-indigo-600 animate-pulse" />;
    return <AlertCircle className={`h-3 w-3 ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`} />;
  };

  const targetPosition = isSubstage ? Position.Left : Position.Top;
  const sourcePosition = isSubstage ? Position.Right : Position.Bottom;

  return (
    <div
      className="relative"
    >
    <div
      className={`workflow-node ${isSubstage ? 'w-[220px]' : 'w-[248px]'} rounded-xl border-2 p-3 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 ${surfaceClass} ${
        getAccentColor()
      } ${isActive ? 'scale-105 shadow-[0_0_0_1px_rgba(82,92,235,0.25),0_0_28px_rgba(82,92,235,0.35)]' : ''} ${
        isDone ? 'opacity-95' : ''
      }`}
    >
      {isActive && <div className="absolute -inset-1 rounded-2xl bg-indigo-500/10 blur-xl animate-pulse" />}
      <Handle type="target" position={targetPosition} className={isDarkTheme ? '!bg-slate-300' : '!bg-slate-700'} />
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${getAccentBar()}`} />
      
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${iconWrapClass}`}>
            {isSubstage ? (
              <GitBranch className={`h-4 w-4 ${isDarkTheme ? 'text-sky-300' : 'text-sky-700'}`} />
            ) : (
              <Settings className={`h-4 w-4 ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`} />
            )}
          </div>
          <h3 className={`text-sm font-bold tracking-tight ${isDarkTheme ? 'text-slate-50' : 'text-slate-900'}`}>{data.label}</h3>
        </div>
        {getStatusIcon()}
      </div>

      <p className={`relative mt-2 text-[11px] leading-relaxed ${mutedTextClass}`}>
        {data.caption || data.description || 'No description provided for this node.'}
      </p>

      {previewItems.length > 0 && (
        <div className={`relative mt-3 space-y-2 rounded-xl border p-2.5 ${previewWrapClass}`}>
          {previewItems.map((item: { label: string; value: string }) => (
            <div key={`${item.label}-${item.value}`} className="flex items-start justify-between gap-3">
              <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                {item.label}
              </span>
              <span className={`max-w-[120px] text-right text-[10px] font-bold leading-4 ${isDarkTheme ? 'text-slate-100' : 'text-slate-700'}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.error && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-[10px] font-bold text-rose-700">
          {data.error}
        </div>
      )}

      <div className={`relative mt-3 flex items-center justify-between border-t pt-2 ${footerBorderClass}`}>
        <div className="flex items-center gap-1.5">
          <User className={`h-3 w-3 ${subtleTextClass}`} />
          <span className={`text-[10px] font-semibold ${mutedTextClass}`}>{data.owner || 'System'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className={`h-3 w-3 ${subtleTextClass}`} />
          <span className={`text-[10px] font-semibold ${mutedTextClass}`}>{data.duration || 'Auto'}</span>
        </div>
      </div>

      <Handle type="source" position={sourcePosition} className={isDarkTheme ? '!bg-slate-300' : '!bg-slate-700'} />
    </div>
    </div>
  );
};

export default memo(CustomNode);
