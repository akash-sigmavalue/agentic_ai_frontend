'use client';

import React from 'react';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown, onDoubleClick }) => {
  return (
    <div
      className="group relative w-2 cursor-col-resize transition-all hover:bg-indigo-500/10"
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
      <div className="absolute inset-y-12 left-1/2 w-[2px] -translate-x-1/2 bg-slate-800 transition-colors group-hover:bg-indigo-500" />
      
      {/* Visual indicator handle */}
      <div className="absolute top-1/2 left-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-700/50 transition-all group-hover:h-24 group-hover:bg-indigo-400" />
    </div>
  );
};

export default ResizeHandle;
