'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ChatSection from '@/components/visualization_agent/ChatSection';
import WorkflowSection from '@/components/visualization_agent/WorkflowSection';
import MapSection from '@/components/visualization_agent/MapSection';
import ResizeHandle from '@/components/shared/ResizeHandle';
import type { Module1IntentOutput, Module2Output } from '@/components/visualization_agent/types';

const DEFAULT_PANEL_WIDTHS = { chat: 25, workflow: 50, map: 25 };

export default function VisualizationAgentPage() {
  const [panelWidths, setPanelWidths] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_WIDTHS;

    const savedWidths = localStorage.getItem('visualization_panel_widths');
    if (!savedWidths) return DEFAULT_PANEL_WIDTHS;

    try {
      return JSON.parse(savedWidths) as typeof DEFAULT_PANEL_WIDTHS;
    } catch (error) {
      console.error('Failed to load saved panel widths', error);
      return DEFAULT_PANEL_WIDTHS;
    }
  });
  const [collapsed, setCollapsed] = useState({ chat: false, workflow: false, map: false });
  const [isDragging, setIsDragging] = useState<'chat' | 'workflow' | null>(null);
  const [moduleOutput, setModuleOutput] = useState<Module1IntentOutput | null>(null);
  const [module2Output, setModule2Output] = useState<Module2Output | null>(null);

  useEffect(() => {
    localStorage.setItem('visualization_panel_widths', JSON.stringify(panelWidths));
  }, [panelWidths]);

  const handleMouseDown = (panel: 'chat' | 'workflow') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(panel);
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = (e.movementX / window.innerWidth) * 100;

      setPanelWidths((prev) => {
        if (isDragging === 'chat') {
          const newChat = Math.max(15, Math.min(40, prev.chat + deltaX));
          const diff = newChat - prev.chat;
          return {
            ...prev,
            chat: newChat,
            workflow: prev.workflow - diff,
          };
        }

        const newWorkflow = Math.max(25, Math.min(65, prev.workflow + deltaX));
        const diff = newWorkflow - prev.workflow;
        return {
          ...prev,
          workflow: newWorkflow,
          map: prev.map - diff,
        };
      });
    },
    [isDragging]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const resetPanels = () => {
    setPanelWidths(DEFAULT_PANEL_WIDTHS);
  };

  return (
    <main className="workspace-page flex min-h-screen w-screen flex-col bg-[#f8fafc] text-slate-900 overflow-y-auto custom-scrollbar relative">
      {/* Subtle Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative z-10 flex flex-1 mt-20 p-6 gap-6 transition-all duration-300">
        <div
          className="grid h-[calc(100vh-120px)] w-full min-h-0"
          style={{
            gridTemplateColumns: `${collapsed.chat ? '80px' : `${panelWidths.chat}fr`} 14px ${collapsed.workflow ? '80px' : `${panelWidths.workflow}fr`} 14px ${collapsed.map ? '80px' : `${panelWidths.map}fr`}`,
          }}
        >
          <div className={`min-w-0 h-full overflow-hidden transition-all duration-300 ${collapsed.chat ? 'opacity-40 grayscale' : 'opacity-100'}`}>
            <ChatSection
              isCollapsed={collapsed.chat}
              onToggle={() => setCollapsed(prev => ({ ...prev, chat: !prev.chat }))}
              onModuleOutput={(output) => {
                setModuleOutput(output);
                setModule2Output(null);
              }}
            />
          </div>

          <div className="hidden lg:flex items-center justify-center h-full">
            <ResizeHandle onMouseDown={handleMouseDown('chat')} onDoubleClick={resetPanels} />
          </div>

          <div className={`min-w-0 h-full overflow-hidden transition-all duration-300 ${collapsed.workflow ? 'opacity-40 grayscale' : 'opacity-100'}`}>
            <WorkflowSection
              isCollapsed={collapsed.workflow}
              onToggle={() => setCollapsed(prev => ({ ...prev, workflow: !prev.workflow }))}
              moduleOutput={moduleOutput}
              onModule2Output={setModule2Output}
            />
          </div>

          <div className="hidden lg:flex items-center justify-center h-full">
            <ResizeHandle onMouseDown={handleMouseDown('workflow')} onDoubleClick={resetPanels} />
          </div>

          <div className={`min-w-0 h-full overflow-hidden transition-all duration-300 ${collapsed.map ? 'opacity-40 grayscale' : 'opacity-100'}`}>
            <MapSection
              isCollapsed={collapsed.map}
              onToggle={() => setCollapsed(prev => ({ ...prev, map: !prev.map }))}
              moduleOutput={moduleOutput}
              module2Output={module2Output}
            />
          </div>
        </div>
      </div>

      {/* Footer / Status Bar (Extra touch for premium feel) */}
      <footer className="h-8 border-t border-white/5 bg-black/40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Operational</span>
          </div>
          <span className="h-3 w-px bg-white/10" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none">Latency: 24ms</span>
        </div>
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          &copy; 2024 SIGMAVALUE AI CORP
        </div>
      </footer>
    </main>
  );
}
