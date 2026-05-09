"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ChatSectionDashboard from '@/components/dashboard/chatsectiondashboard';
import WorkflowSectionDashboard from '@/components/dashboard/workflowsectiondashboard';
import OutputSectionDashboard from '@/components/dashboard/outputsectiondashboard';
import { WorkflowData, MarkerData, WorkflowRuntimeState, WorkflowStreamEvent } from '@/types/agents';
// import { extractCoordinates, extractWorkflow, loadMarkers, saveMarkers } from '@/lib/dashboard/geospatial/utils';
import {
  createInitialWorkflowRuntime,
  normalizeWorkflowRuntimeLayout,
  reduceWorkflowStreamEvent,
  workflowRuntimeToFlowData,
} from '@/lib/dashboard/workflow';
import { API_ROUTES, apiUrl } from '@/lib/api-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, History, Settings, Plug } from 'lucide-react';
import { extractCoordinates,  extractWorkflow, loadMarkers, saveMarkers  } from '@/lib/utils';

type AnalyticalOutput = {
  jsx?: string;
  html?: string;
  data_summary?: string;
  insights?: Array<{
    title?: string;
    description?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

const getObjectValue = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const consumeSseFrames = (
  buffer: string,
  onEvent: (event: WorkflowStreamEvent) => void
) => {
  const frames = buffer.split('\n\n');
  const remainder = frames.pop() || '';

  for (const frame of frames) {
    const dataLines = frame
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice(6).trim())
      .filter(Boolean);

    if (dataLines.length === 0) continue;

    try {
      onEvent(JSON.parse(dataLines.join('\n')) as WorkflowStreamEvent);
    } catch {
    }
  }

  return remainder;
};

const buildAssistantResponseFromFinalData = (data: unknown) => {
  if (typeof data === 'string') return data;

  const dataObject = getObjectValue(data);
  const structuredText =
    dataObject
      ? String(dataObject.data_summary || dataObject.jsx || '')
      : '';

  let content = structuredText
    ? `### Analysis Result\n\n${structuredText}`
    : `### Analysis Result\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;

  const insights = Array.isArray(dataObject?.insights) ? dataObject.insights : [];
  if (insights.length > 0) {
    content += '\n\n**Insights:**\n' + insights
      .map((insight) => {
        const insightObject = getObjectValue(insight);
        return `- **${String(insightObject?.title || 'Insight')}**: ${String(insightObject?.description || '')}`;
      })
      .join('\n');
  }

  return content;
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [panelWidths, setPanelWidths] = useState({ chat: 25, workflow: 45, map: 30 });
  const [workflowRuntime, setWorkflowRuntime] = useState<WorkflowRuntimeState>(createInitialWorkflowRuntime);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [analyticalOutput, setAnalyticalOutput] = useState<AnalyticalOutput | null>(null);
  const [assistantResponse, setAssistantResponse] = useState('');
  const [, setWorkflowStep] = useState<string | null>(null);
  const [, setWorkflowStepState] = useState<'idle' | 'running' | 'complete'>('idle');
  const [isDragging, setIsDragging] = useState<'chat' | 'workflow' | null>(null);
  const [collapsed, setCollapsed] = useState({ chat: false, workflow: false, map: false });
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [isResumingWorkflow, setIsResumingWorkflow] = useState(false);

  useEffect(() => {
    setMounted(true);
    // const token = localStorage.getItem('token');
    // if (!token) {
    //   router.push('/login');
    // }

    // Load persisted session data
    const savedWorkflow = localStorage.getItem('sigmavalue_workflow_data');
    if (savedWorkflow) {
      const parsed = JSON.parse(savedWorkflow) as WorkflowRuntimeState | WorkflowData;
      if ('mainNodes' in parsed && 'subNodes' in parsed) {
        const normalized = normalizeWorkflowRuntimeLayout(parsed);
        setWorkflowRuntime(normalized);
        localStorage.setItem('sigmavalue_workflow_data', JSON.stringify(normalized));
      } else if ('nodes' in parsed && 'edges' in parsed) {
        const fallbackRuntime = createInitialWorkflowRuntime();
        setWorkflowRuntime(fallbackRuntime);
        localStorage.setItem('sigmavalue_workflow_data', JSON.stringify(fallbackRuntime));
      }
    }

    const savedAnalytics = localStorage.getItem('sigmavalue_analytical_output');
    if (savedAnalytics) setAnalyticalOutput(JSON.parse(savedAnalytics));

    const savedWidths = localStorage.getItem('sigmavalue_panel_widths');
    if (savedWidths) setPanelWidths(JSON.parse(savedWidths));

    const savedCollapsed = localStorage.getItem('sigmavalue_collapsed_state');
    if (savedCollapsed) setCollapsed(JSON.parse(savedCollapsed));
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'dashboard' || tab === 'history' || tab === 'settings') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const persisted = loadMarkers();
    if (persisted.length > 0) {
      setMarkers(persisted);
    }
  }, []);

  const workflowData = workflowRuntimeToFlowData(workflowRuntime);

  const handleStreamEvent = useCallback((event: WorkflowStreamEvent) => {
    if (event.event_type === 'awaiting_file_decision') {
      const dataObject = getObjectValue(event.data);
      const planId = dataObject?.plan_id;
      if (typeof planId === 'string' && planId.trim()) {
        setPendingPlanId(planId.trim());
      }
      setWorkflowStep(event.node || 'File decision');
      setWorkflowStepState('complete');
    }

    if (event.event_type === 'stage_start' && event.node === 'query') {
      setPendingPlanId(null);
      setAnalyticalOutput(null);
      setAssistantResponse('');
      localStorage.removeItem('sigmavalue_analytical_output');
    }

    if (event.event_type === 'stage_complete' && event.node === 'file_decision') {
      setPendingPlanId(null);
    }

    if (event.event_type === 'stage_start') {
      setWorkflowStep(event.node || 'Working');
      setWorkflowStepState('running');
    } else if (
      event.event_type === 'stage_complete' ||
      event.event_type === 'final_result'
    ) {
      setWorkflowStep(event.node || 'Complete');
      setWorkflowStepState('complete');
    } else if (event.event_type === 'edge_start' || event.event_type === 'substage_start') {
      setWorkflowStepState('running');
    } else if (event.event_type === 'error') {
      setWorkflowStep(event.node || 'Failed');
      setWorkflowStepState('complete');
    }

    setWorkflowRuntime((prev) => {
      const baseRuntime = event.event_type === 'stage_start' && event.node === 'query'
        ? createInitialWorkflowRuntime()
        : prev;
      const next = reduceWorkflowStreamEvent(baseRuntime, event);
      localStorage.setItem('sigmavalue_workflow_data', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleAiResponse = useCallback((content: string, data?: unknown) => {
    setAssistantResponse(content);
    const dataObject = getObjectValue(data);
    if (dataObject) {
      const nextOutput = dataObject as AnalyticalOutput;
      setAnalyticalOutput(nextOutput);
      localStorage.setItem('sigmavalue_analytical_output', JSON.stringify(nextOutput));
    }
    
    const flow = extractWorkflow(content);
    if (flow) {
      const normalized = createInitialWorkflowRuntime();
      setWorkflowRuntime(normalized);
      localStorage.setItem('sigmavalue_workflow_data', JSON.stringify(normalized));
      setWorkflowStep('Output');
      setWorkflowStepState('complete');
    }

    const newMarkers = extractCoordinates(content);
    if (newMarkers.length > 0) {
      setMarkers((prev) => {
        const filtered = newMarkers.filter(
          (nm) => !prev.some((pm) => pm.lat === nm.lat && pm.lng === nm.lng)
        );
        const updated = [...prev, ...filtered];
        saveMarkers(updated);
        return updated;
      });
    }
  }, []);

  const resumeWorkflow = useCallback(async (file?: File, existingFileId?: string) => {
    if (!pendingPlanId) {
      console.error('Cannot resume workflow: missing plan_id.');
      return;
    }

    // const token = localStorage.getItem('token');
    // if (!token) {
    //   router.push('/login');
    //   return;
    // }

    const formData = new FormData();
    formData.append('plan_id', pendingPlanId);
    if (file) {
      formData.append('file', file);
    }
    if (existingFileId) {
      formData.append('file_id', existingFileId);
    }

    setIsResumingWorkflow(true);

    try {
      const response = await fetch(apiUrl(API_ROUTES.generationStreamResume), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Resume failed with status ${response.status}.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalData: unknown = null;
      let finalContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = consumeSseFrames(buffer, (streamEvent) => {
          window.dispatchEvent(
            new CustomEvent('workflow:tokenStreamEvent', {
              detail: streamEvent,
            })
          );
          handleStreamEvent(streamEvent);

          if (streamEvent.event_type === 'final_result') {
            finalData = streamEvent.data ?? null;
            finalContent = buildAssistantResponseFromFinalData(finalData);
          } else if (streamEvent.event_type === 'error') {
            finalContent = `Network error: ${streamEvent.message || 'Workflow resume failed.'}`;
          }
        });
      }

      if (finalContent.trim()) {
        window.dispatchEvent(
          new CustomEvent('dashboard:assistantResponse', {
            detail: { content: finalContent },
          })
        );
        handleAiResponse(finalContent, finalData);
      }
    } catch (streamError) {
      console.error(streamError);
      handleStreamEvent({
        event_type: 'error',
        node: file ? 'file_data_agent' : 'planning_agent',
        message: streamError instanceof Error ? streamError.message : 'Workflow resume failed.',
      });
    } finally {
      setIsResumingWorkflow(false);
    }
  }, [handleAiResponse, handleStreamEvent, pendingPlanId, router]);

  const handleResumeWithFile = useCallback((file: File) => resumeWorkflow(file), [resumeWorkflow]);

  const handleContinueWithoutFile = useCallback(() => resumeWorkflow(), [resumeWorkflow]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>, panel: 'chat' | 'workflow') => {
    event.preventDefault();
    setIsDragging(panel);
  };
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    localStorage.setItem('sigmavalue_panel_widths', JSON.stringify(panelWidths));
  }, [panelWidths]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = (e.movementX / window.innerWidth) * 100;

      setPanelWidths((prev) => {
        const updated = isDragging === 'chat' ? (
           (() => {
            const pairTotal = prev.chat + prev.workflow;
            const newChat = Math.max(15, Math.min(pairTotal - 25, prev.chat + deltaX));
            return { ...prev, chat: newChat, workflow: pairTotal - newChat };
           })()
        ) : (
           (() => {
            const pairTotal = prev.workflow + prev.map;
            const newWorkflow = Math.max(25, Math.min(pairTotal - 20, prev.workflow + deltaX));
            return { ...prev, workflow: newWorkflow, map: pairTotal - newWorkflow };
           })()
        );
        return updated;
      });
    },
    [isDragging]
  );

  const togglePanel = (panel: keyof typeof collapsed) => {
    setCollapsed(prev => {
      const newState = { ...prev, [panel]: !prev[panel] };
      localStorage.setItem('sigmavalue_collapsed_state', JSON.stringify(newState));
      return newState;
    });
  };

  useEffect(() => {
    if (isDragging) {
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!mounted) return null;

  return (
    <main className="dashboard-page flex h-screen w-screen bg-[#f1f5f9] text-[#1a1c3d] overflow-hidden font-sans relative">
      {/* Redesigned Sidebar - Match Image */}
      <aside className={`fixed left-0 top-20 bottom-0 z-40 transition-all duration-300 border-r border-slate-200/60 bg-white flex flex-col items-center py-6 w-20 shadow-sm`}>
        <div className="flex flex-col gap-6 w-full items-center">
          <button className="p-3 text-slate-400 hover:text-[#525ceb] transition-all">
            <div className="flex flex-col gap-1 items-center">
              <div className="w-6 h-0.5 bg-current rounded-full" />
              <div className="w-6 h-0.5 bg-current rounded-full" />
            </div>
          </button>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setActiveTab('dashboard')}
              title="Dashboard"
              className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-[#525ceb] text-white shadow-lg shadow-indigo-200 hover:scale-105' : 'bg-slate-100/80 text-slate-400 hover:bg-slate-100'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              title="History"
              className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all duration-300 ${activeTab === 'history' ? 'bg-[#525ceb] text-white shadow-lg shadow-indigo-200 hover:scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <History className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              title="Settings"
              className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all duration-300 ${activeTab === 'settings' ? 'bg-[#525ceb] text-white shadow-lg shadow-indigo-200 hover:scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <Link
              href="/connector"
              title="Connector"
              className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100/80 text-slate-400 border border-slate-200/80 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all duration-300"
            >
              <Plug className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="mt-auto mb-6">
           <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 border border-slate-200 shadow-sm font-black text-[#1a1c3d] text-sm">
             N
           </div>
        </div>
      </aside>

      <div className="relative z-10 flex flex-1 mt-20 p-6 ml-20 gap-6 transition-all duration-300">
        <div 
          className="grid flex-1 w-full h-[calc(100vh-120px)]"
          style={{
            gridTemplateColumns: mounted && window.innerWidth >= 1024
              ? `${collapsed.chat ? '80px' : `${panelWidths.chat}fr`} 18px ${collapsed.workflow ? '80px' : `${panelWidths.workflow}fr`} 18px ${collapsed.map ? '80px' : `${panelWidths.map}fr`}`
              : '1fr'
          }}
          suppressHydrationWarning
        >
          {/* Chat Panel */}
          <div className="h-full overflow-hidden">
            <ChatSectionDashboard 
              onAiResponse={handleAiResponse} 
              onStreamEvent={handleStreamEvent}
              isCollapsed={collapsed.chat}
              onToggle={() => togglePanel('chat')}
            />
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat and workflow panels"
            className={`group flex h-full cursor-col-resize items-center justify-center ${isDragging === 'chat' ? 'bg-indigo-50/70' : ''}`}
            onMouseDown={(event) => handleMouseDown(event, 'chat')}
          >
            <div className={`h-[80%] w-1 rounded-full transition-colors ${isDragging === 'chat' ? 'bg-[#525ceb]' : 'bg-slate-200/80 group-hover:bg-[#525ceb]'}`} />
          </div>

          {/* Workflow Panel */}
          <div className="h-full overflow-hidden">
            <WorkflowSectionDashboard 
              data={workflowData} 
              error={workflowRuntime.error}
              awaitingFileDecision={Boolean(pendingPlanId) && !isResumingWorkflow}
              onResumeWithFile={handleResumeWithFile}
              onContinueWithoutFile={handleContinueWithoutFile}
              isCollapsed={collapsed.workflow}
              onToggle={() => togglePanel('workflow')}
            />
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize workflow and output panels"
            className={`group flex h-full cursor-col-resize items-center justify-center ${isDragging === 'workflow' ? 'bg-indigo-50/70' : ''}`}
            onMouseDown={(event) => handleMouseDown(event, 'workflow')}
          >
            <div className={`h-[80%] w-1 rounded-full transition-colors ${isDragging === 'workflow' ? 'bg-[#525ceb]' : 'bg-slate-200/80 group-hover:bg-[#525ceb]'}`} />
          </div>

          {/* Map / Output Panel */}
          <div className="h-full overflow-hidden">
            <OutputSectionDashboard 
              markers={markers} 
              analyticalOutput={analyticalOutput} 
              responseText={assistantResponse}
              isCollapsed={collapsed.map}
            />
          </div>
        </div>
      </div>
      
      {/* Footer - Match Image */}
      <footer className="h-10 border-t border-slate-200 bg-white px-10 flex items-center gap-10 z-50 fixed bottom-0 left-0 right-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
            SYSTEM STATUS: <span className="text-emerald-500">OPERATIONAL</span>
          </span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
          AI MODEL: <span className="text-[#525ceb]">GPT-4O-MINI</span>
        </div>
      </footer>
    </main>
  );
}
