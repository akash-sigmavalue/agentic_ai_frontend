'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, Clock, CheckCircle2, AlertCircle, PlayCircle, Settings } from 'lucide-react';

const CustomNode = ({ data, type }: NodeProps) => {
  const isActive = data.highlighted || data.status === 'In Progress';
  const isDone = data.status === 'Done';

  const getAccentColor = () => {
    switch (type) {
      case 'input': return 'border-emerald-300 bg-white';
      case 'output': return 'border-indigo-300 bg-white';
      case 'decision': return 'border-amber-300 bg-white';
      default: return 'border-violet-300 bg-white';
    }
  };

  const getAccentBar = () => {
    switch (type) {
      case 'input': return 'bg-emerald-500';
      case 'output': return 'bg-indigo-500';
      case 'decision': return 'bg-amber-500';
      default: return 'bg-violet-500';
    }
  };

  const getStatusIcon = () => {
    if (isDone) return <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
    if (isActive) return <PlayCircle className="h-3 w-3 text-indigo-600 animate-pulse" />;
    return <AlertCircle className="h-3 w-3 text-slate-500" />;
  };

  return (
    <div
      className="relative"
    >
    <div
      className={`workflow-node w-[240px] rounded-xl border-2 p-3 shadow-2xl bg-white/95 backdrop-blur-md transition-all duration-300 hover:scale-105 ${
        getAccentColor()
      } ${isActive ? 'scale-105 shadow-[0_0_0_1px_rgba(82,92,235,0.25),0_0_28px_rgba(82,92,235,0.35)]' : ''} ${
        isDone ? 'opacity-95' : ''
      }`}
    >
      {isActive && <div className="absolute -inset-1 rounded-2xl bg-indigo-500/10 blur-xl animate-pulse" />}
      <Handle type="target" position={Position.Top} className="!bg-slate-700" />
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${getAccentBar()}`} />
      
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-100 p-1.5">
            <Settings className="h-4 w-4 text-slate-700" />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">{data.label}</h3>
        </div>
        {getStatusIcon()}
      </div>

      <p className="relative mt-2 text-[11px] leading-relaxed text-slate-600">
        {data.description || 'No description provided for this node.'}
      </p>

      <div className="relative mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 text-slate-500" />
          <span className="text-[10px] font-semibold text-slate-600">{data.owner || 'System'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-slate-500" />
          <span className="text-[10px] font-semibold text-slate-600">{data.duration || 'Auto'}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-700" />
    </div>
    </div>
  );
};

export default memo(CustomNode);
