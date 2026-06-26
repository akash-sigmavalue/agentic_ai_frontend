'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatSection from '@/components/visualization_agent/ChatSection';
import WorkflowSection from '@/components/visualization_agent/WorkflowSection';
import MapSection from '@/components/visualization_agent/MapSection';
import ResizeHandle from '@/components/shared/ResizeHandle';
import type {
  Module1IntentOutput,
  Module2Output,
  Module7PlottableEnrichmentCorridor,
  Module7PlottableEnrichmentPoint,
  RuntimeGeneratedMapOption,
  VisualizationRetrievalState,
} from '@/components/visualization_agent/types';

const DEFAULT_PANEL_WIDTHS = { chat: 25, workflow: 50, map: 25 };
const EXPANDED_PANEL_WIDTHS = {
  chat: { chat: 80, workflow: 10, map: 10 },
  workflow: { chat: 10, workflow: 80, map: 10 },
  map: { chat: 10, workflow: 10, map: 80 },
};
type PanelKey = keyof typeof EXPANDED_PANEL_WIDTHS;

export default function VisualizationAgentPage() {
  const [panelWidths, setPanelWidths] = useState(DEFAULT_PANEL_WIDTHS);
  const [expandedPanel, setExpandedPanel] = useState<PanelKey | null>(null);
  const [isDragging, setIsDragging] = useState<'chat' | 'workflow' | null>(null);

  // Restore saved panel widths AFTER hydration so server & client first-render match
  useEffect(() => {
    try {
      const saved = localStorage.getItem('visualization_panel_widths');
      if (saved) {
        const parsed = JSON.parse(saved) as typeof DEFAULT_PANEL_WIDTHS;
        if (parsed && typeof parsed.chat === 'number') {
          setPanelWidths(parsed);
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }, []);

  // Persist panel widths whenever they change (but not when a panel is expanded)
  useEffect(() => {
    if (!expandedPanel) {
      localStorage.setItem('visualization_panel_widths', JSON.stringify(panelWidths));
    }
  }, [expandedPanel, panelWidths]);

  const [moduleOutput, setModuleOutput] = useState<Module1IntentOutput | null>(null);
  const [module2Output, setModule2Output] = useState<Module2Output | null>(null);
  const [retrievalOutput, setRetrievalOutput] = useState<VisualizationRetrievalState | null>(null);
  const [runtimeGeneratedMaps, setRuntimeGeneratedMaps] = useState<RuntimeGeneratedMapOption[]>([]);
  const [selectedInsightMapId, setSelectedInsightMapId] = useState<string | null>(null);
  const [pendingPlottableEnrichment, setPendingPlottableEnrichment] = useState<{
    mapId: string;
    points: Module7PlottableEnrichmentPoint[];
    corridors: Module7PlottableEnrichmentCorridor[];
  } | null>(null);
  const restoredPanelWidthsRef = useRef(panelWidths);



  const handleMouseDown = (panel: 'chat' | 'workflow') => (e: React.MouseEvent) => {
    if (expandedPanel) return;
    e.preventDefault();
    setIsDragging(panel);
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || expandedPanel) return;

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
    [expandedPanel, isDragging]
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
    setExpandedPanel(null);
    setPanelWidths(DEFAULT_PANEL_WIDTHS);
  };

  const toggleExpandedPanel = (panel: PanelKey) => {
    if (expandedPanel === panel) {
      setExpandedPanel(null);
      setPanelWidths(restoredPanelWidthsRef.current);
      return;
    }

    if (!expandedPanel) {
      restoredPanelWidthsRef.current = panelWidths;
    }
    setExpandedPanel(panel);
    setIsDragging(null);
    setPanelWidths(EXPANDED_PANEL_WIDTHS[panel]);
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
            gridTemplateColumns: `${panelWidths.chat}fr 14px ${panelWidths.workflow}fr 14px ${panelWidths.map}fr`,
          }}
        >
          <div className="min-w-0 h-full overflow-hidden transition-all duration-300">
            <ChatSection
              isExpanded={expandedPanel === 'chat'}
              onToggleExpand={() => toggleExpandedPanel('chat')}
              onModuleOutput={(output) => {
                setModuleOutput(output);
                setModule2Output(null);
              }}
              onRetrievalOutput={(output) => {
                setRetrievalOutput(output);
                setModule2Output(null);
              }}
              runtimeGeneratedMaps={runtimeGeneratedMaps}
              selectedInsightMapId={selectedInsightMapId}
              onInsightMapSelect={setSelectedInsightMapId}
              onPlottableEnrichment={(mapId, points, corridors) =>
                setPendingPlottableEnrichment({ mapId, points, corridors })}
            />
          </div>

          <div className={`hidden lg:flex items-center justify-center h-full transition-opacity ${expandedPanel ? 'pointer-events-none opacity-30' : ''}`}>
            <ResizeHandle onMouseDown={handleMouseDown('chat')} onDoubleClick={resetPanels} />
          </div>

          <div className="min-w-0 h-full overflow-hidden transition-all duration-300">
            <WorkflowSection
              isExpanded={expandedPanel === 'workflow'}
              onToggleExpand={() => toggleExpandedPanel('workflow')}
              moduleOutput={moduleOutput}
              retrievalOutput={retrievalOutput}
              onModule2Output={setModule2Output}
            />
          </div>

          <div className={`hidden lg:flex items-center justify-center h-full transition-opacity ${expandedPanel ? 'pointer-events-none opacity-30' : ''}`}>
            <ResizeHandle onMouseDown={handleMouseDown('workflow')} onDoubleClick={resetPanels} />
          </div>

          <div className="min-w-0 h-full overflow-hidden transition-all duration-300">
            <MapSection
              isExpanded={expandedPanel === 'map'}
              onToggleExpand={() => toggleExpandedPanel('map')}
              moduleOutput={moduleOutput}
              module2Output={module2Output}
              retrievalOutput={retrievalOutput}
              onRuntimeGeneratedMapsChange={setRuntimeGeneratedMaps}
              pendingPlottableEnrichment={pendingPlottableEnrichment}
              onPlottableEnrichmentApplied={() => setPendingPlottableEnrichment(null)}
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
