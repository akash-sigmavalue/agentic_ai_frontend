'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Activity, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import CustomNode from '../shared/workflow/CustomNode';
import PlusNode from '../shared/workflow/PlusNode'; // ADDED: upload insertion node
import { WorkflowData, WorkflowEdge, WorkflowNode } from '../../types/agents';

interface WorkflowSectionProps {
  data: WorkflowData | null;
  error?: string | null;
  onToggle?: () => void;
  isCollapsed?: boolean;
  awaitingFileDecision?: boolean;
  onResumeWithFile?: (file: File) => Promise<void>;
  onContinueWithoutFile?: () => Promise<void>;
}

const nodeTypes = {
  input: CustomNode,
  default: CustomNode,
  decision: CustomNode,
  output: CustomNode,
  plus: PlusNode, // ADDED: ReactFlow custom node for dynamic upload
};

const WorkflowViewportSync = ({ nodeCount, viewportKey }: { nodeCount: number; viewportKey: string }) => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodeCount > 0) {
      const timeout = window.setTimeout(() => {
        fitView({ padding: 0.18, duration: 400, maxZoom: 1.1 });
      }, 60);

      return () => window.clearTimeout(timeout);
    }
  }, [fitView, nodeCount, viewportKey]);

  return null;
};

const WorkflowSectionDashboard: React.FC<WorkflowSectionProps> = ({ 
  data,
  error,
  awaitingFileDecision = false,
  onResumeWithFile,
  onContinueWithoutFile,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isWorkflowFullscreen, setIsWorkflowFullscreen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showPlusNode, setShowPlusNode] = useState(false); // ADDED: visible after intent completes

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const updateTheme = () => {
      setIsDarkTheme(document.documentElement.classList.contains('dark-mode'));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // ADDED: opens a file picker, uploads the selected file, and announces the backend file_id.
  const handleAddData = useCallback(() => {
    if (!onResumeWithFile || typeof window === 'undefined') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        await onResumeWithFile(file);
      } catch (uploadError) {
        console.error('File upload failed:', uploadError);
      }
    };
    input.click();
  }, [onResumeWithFile]);

  const handleContinueWithoutFile = useCallback(() => {
    if (!onContinueWithoutFile) return;
    void onContinueWithoutFile();
  }, [onContinueWithoutFile]);

  useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      // ADDED: show upload node once Agent 1 completes and Agent 2 has not appeared yet.
      const intentNode = data.nodes.find((node) => node.id === 'intent_agent');
      const planningNode = data.nodes.find((node) => node.id === 'planning_agent');
      const fileDataNode = data.nodes.find((node) => node.id === 'file_data_agent');
      const fileDecisionNode = data.nodes.find((node) => node.id === 'file_decision');
      const intentStatus = String(intentNode?.data?.status || '').toLowerCase();
      const fileDecisionStatus = String(fileDecisionNode?.data?.status || '').toLowerCase();
      const shouldShowPlusNode = Boolean(
        awaitingFileDecision ||
        (fileDecisionNode && fileDecisionStatus === 'awaiting') ||
        (
          intentNode &&
          !planningNode &&
          !fileDataNode &&
          (intentStatus === 'done' || intentStatus === 'complete')
        )
      );
      window.setTimeout(() => setShowPlusNode(shouldShowPlusNode), 0);

      // ADDED: inject the PlusNode between intent_agent and the future planning_agent.
      const plusNode: WorkflowNode | null = shouldShowPlusNode && !fileDecisionNode
        ? {
            id: 'file_decision',
            type: 'plus',
            position: {
              x: intentNode?.position?.x ?? 80,
              y: (intentNode?.position?.y ?? 380) + 170,
            },
            data: {
              label: 'Add or Skip Data',
              onAdd: handleAddData,
              onContinue: handleContinueWithoutFile,
              theme: isDarkTheme ? 'dark' : 'light',
            },
          }
        : null;

      const plusEdges: WorkflowEdge[] = shouldShowPlusNode && !data.edges.some((edge) => edge.id === 'edge:intent_agent->file_decision')
        ? [
            {
              id: 'edge:intent_agent->file_decision',
              source: 'intent_agent',
              target: 'file_decision',
              animated: true,
              type: 'smoothstep',
              style: { stroke: '#6366f1', strokeWidth: 2.5, strokeDasharray: '7 5' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            },
          ]
        : [];

      const finalNodes = plusNode
        ? [...data.nodes, plusNode]
        : data.nodes.map((node) => (
            node.id === 'file_decision' && shouldShowPlusNode
              ? {
                  ...node,
                  type: 'plus' as const,
                  data: {
                    ...node.data,
                    label: 'Add or Skip Data',
                    onAdd: handleAddData,
                    onContinue: handleContinueWithoutFile,
                  },
                }
              : node
          ));
      const finalEdges = [...data.edges, ...plusEdges];

      setNodes(
        finalNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            theme: isDarkTheme ? 'dark' : 'light',
          },
          position: node.position || { x: 0, y: 0 },
        }))
      );
      setEdges(
        finalEdges.map((e) => ({
          ...e,
          type: e.type || 'smoothstep',
          animated: e.animated === true,
          markerEnd: {
            type: e.markerEnd?.type === MarkerType.ArrowClosed ? e.markerEnd.type : MarkerType.ArrowClosed,
            color: e.markerEnd?.color || '#475569',
          },
        }))
      );
    } else {
      window.setTimeout(() => setShowPlusNode(false), 0);
      setNodes([]);
      setEdges([]);
    }
  }, [awaitingFileDecision, data, handleAddData, handleContinueWithoutFile, isDarkTheme, setNodes, setEdges]);

  useEffect(() => {
    if (!isWorkflowFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsWorkflowFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWorkflowFullscreen]);

  const renderWorkflowCanvas = (fullscreen = false) => (
    <div className={`dashboard-canvas relative bg-white ${fullscreen ? 'h-full w-full' : 'flex-1'}`}>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{ backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {error && (
        <div className="absolute left-5 top-5 z-20 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-600" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-600">Workflow Error</p>
            <p className="mt-1 text-xs font-bold text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {nodes.length > 0 ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag
          minZoom={0.35}
          maxZoom={1.4}
          fitView={!fullscreen}
        >
          <WorkflowViewportSync nodeCount={nodes.length} viewportKey={`${fullscreen ? 'fullscreen' : 'panel'}:${showPlusNode ? 'upload' : 'base'}`} />
          <Background color={isDarkTheme ? '#334155' : '#cbd5e1'} gap={40} size={1} />
          <Controls className={`dashboard-controls shadow-xl rounded-xl overflow-hidden ${isDarkTheme ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200'}`} />
        </ReactFlow>
      ) : (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 relative z-10">
          <div className="relative mb-6">
             <div className="absolute inset-0 rounded-full bg-slate-100 animate-pulse blur-xl" />
             <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-2xl border border-slate-100 transition-transform hover:scale-110">
               <div className="flex flex-col items-center">
                  <div className="w-10 h-1 bg-indigo-500/20 rounded-full mb-1" />
                  <Activity className="h-10 w-10 text-slate-800" />
               </div>
             </div>
          </div>
          <h3 className="text-xl font-black text-[#1a1c3d] tracking-tight">Logic Canvas Ready</h3>
          <p className="mx-auto mt-4 max-w-[280px] text-sm font-bold text-slate-400 leading-relaxed">
            Workflows triggered by the AI Dashboard Assistant, as real time diagrams.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`dashboard-panel flex h-full w-full flex-col bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden transition-all duration-300`}>
      {/* Panel Header */}
      <div className="dashboard-panel-header flex items-center justify-between border-b border-slate-100 bg-[#f8fafc] px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 shadow-sm">
            <Activity className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-[#1a1c3d] tracking-tight uppercase">Dashboard Workflow</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {nodes.length > 0 && (
            <button
              onClick={() => setIsWorkflowFullscreen(true)}
              className="p-1 text-slate-400 transition-colors hover:text-indigo-500"
              title="Fullscreen workflow"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
          <div className="bg-slate-200 px-3 py-1 rounded-lg border border-slate-300">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">STANDBY</span>
          </div>
        </div>
      </div>

      {renderWorkflowCanvas()}

      {isWorkflowFullscreen && (
        <div className="fixed bottom-10 left-20 right-0 top-20 z-[99999] bg-[#f1f5f9] p-4">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-300/50">
            <div className="dashboard-panel-header flex items-center justify-between border-b border-slate-100 bg-[#f8fafc] px-8 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 shadow-sm">
                  <Activity className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <h2 className="text-[13px] font-black text-[#1a1c3d] tracking-tight uppercase">Dashboard Workflow</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Press Escape to return</p>
                </div>
              </div>
              <button
                onClick={() => setIsWorkflowFullscreen(false)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
                title="Exit fullscreen"
              >
                <Minimize2 className="h-4 w-4" />
                Exit
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {renderWorkflowCanvas(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowSectionDashboard;
