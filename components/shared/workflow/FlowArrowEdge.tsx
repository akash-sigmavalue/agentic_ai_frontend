'use client';

import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from 'reactflow';

const FlowArrowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  animated,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: animated ? '#525ceb' : '#94a3b8',
          strokeWidth: animated ? 3 : 2,
          strokeDasharray: animated ? '7 6' : '0',
          ...style,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`workflow-edge-label pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.28em] shadow-sm ${
            animated
              ? 'border-indigo-200 bg-white text-indigo-600'
              : 'border-slate-200 bg-white text-slate-400'
          }`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          →
          {animated && (
            <span className="absolute -right-2 -top-2 h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default FlowArrowEdge;
