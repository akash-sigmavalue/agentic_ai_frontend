'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import ChatSection from '../components/geospatial/ChatSection';
import WorkflowSection from '../components/geospatial/WorkflowSection';
import MapSection from '../components/geospatial/MapSection';
import ResizeHandle from '../components/shared/ResizeHandle';
import { WorkflowData, MarkerData } from '../types/agents';
import { loadMarkers, saveMarkers } from '../lib/utils';

export default function WorkspacePage() {
  const [panelWidths, setPanelWidths] = useState({ chat: 25, workflow: 50, map: 25 });
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [collapsed, setCollapsed] = useState({ chat: false, workflow: false, map: false });
  const [isDragging, setIsDragging] = useState<'chat' | 'workflow' | null>(null);

  useEffect(() => {
    const savedWidths = localStorage.getItem('sigmavalue_panel_widths');
    if (!savedWidths) return;

    try {
      // Restore the last panel layout from localStorage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPanelWidths(JSON.parse(savedWidths));
    } catch (error) {
      console.error('Failed to load saved panel widths', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sigmavalue_panel_widths', JSON.stringify(panelWidths));
  }, [panelWidths]);

  // Load persisted markers on mount
  useEffect(() => {
    const persisted = loadMarkers();
    if (persisted.length > 0) {
      // Restore persisted map markers on first client load.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMarkers(persisted);
    }
  }, []);

  const handleAiResponse = useCallback(() => {
    // Redundant extraction removed; now handled by specialized callbacks
  }, []);

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
    setPanelWidths({ chat: 25, workflow: 50, map: 25 });
  };

  return (
     <Suspense fallback={<div>Loading...</div>}>
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
              onAiResponse={handleAiResponse}
              isCollapsed={collapsed.chat}
              onToggle={() => setCollapsed(prev => ({ ...prev, chat: !prev.chat }))}
              onMarkersFound={(newMarkers) => {
                setMarkers((prev) => {
                  const filtered = newMarkers.filter(
                    (nm) => !prev.some((pm) => pm.lat === nm.lat && pm.lng === nm.lng)
                  );
                  const updated = [...prev, ...filtered];
                  saveMarkers(updated);
                  return updated;
                });
              }}
              onWorkflowGenerated={(flow) => setWorkflowData(flow)}
            />
          </div>

          <div className="hidden lg:flex items-center justify-center h-full">
            <ResizeHandle onMouseDown={handleMouseDown('chat')} onDoubleClick={resetPanels} />
          </div>

          <div className={`min-w-0 h-full overflow-hidden transition-all duration-300 ${collapsed.workflow ? 'opacity-40 grayscale' : 'opacity-100'}`}>
            <WorkflowSection
              data={workflowData}
              isCollapsed={collapsed.workflow}
              onToggle={() => setCollapsed(prev => ({ ...prev, workflow: !prev.workflow }))}
            />
          </div>

          <div className="hidden lg:flex items-center justify-center h-full">
            <ResizeHandle onMouseDown={handleMouseDown('workflow')} onDoubleClick={resetPanels} />
          </div>

          <div className={`min-w-0 h-full overflow-hidden transition-all duration-300 ${collapsed.map ? 'opacity-40 grayscale' : 'opacity-100'}`}>
            <MapSection
              markers={markers}
              isCollapsed={collapsed.map}
              onToggle={() => setCollapsed(prev => ({ ...prev, map: !prev.map }))}
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
    </Suspense>
  );
}
