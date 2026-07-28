'use client';

import React, { memo, useMemo, useState } from 'react';
import Module2Section from './Module2Section';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Code2,
  Database,
  FileText,
  FolderKanban,
  Globe2,
  Handshake,
  LineChart,
  MapPinned,
  Maximize2,
  Minimize2,
  MonitorCog,
  Network,
  Plug,
  Scale,
  Search,
  Server,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import type {
  ExecutionPlanStep,
  Module1IntentOutput,
  Module2Output,
  VisualizationRetrievalState,
} from './types';

interface WorkflowSectionProps {
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  moduleOutput?: Module1IntentOutput | null;
  retrievalOutput?: VisualizationRetrievalState | null;
  onModule2Output?: (output: Module2Output | null) => void;
}

interface WorkflowNodeData {
  step: ExecutionPlanStep;
}

interface AgentLayer {
  id: string;
  layer: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  soft: string;
  agents: {
    name: string;
    icon: LucideIcon;
    href?: string;
  }[];
}

const agentLayers: AgentLayer[] = [
  {
    id: 'specialized',
    layer: 'Layer 1',
    title: 'Specialized Agents',
    description: 'Domain specialists that interpret markets, assets, feasibility, and physical context.',
    icon: BrainCircuit,
    accent: 'text-blue-600 border-blue-100 bg-blue-50',
    soft: 'from-blue-500/10 to-cyan-500/10',
    agents: [
      { name: 'Land/GIS', icon: MapPinned , href: '/visualization_agent'},
      { name: "Elevation Agent", icon: MapPinned, href: '/elevation' },       
      { name: 'Valuation', icon: BarChart3, href: '/valuation' },
      { name: 'Market Research', icon: Search },
      { name: 'Physical AI', icon: Bot },
      { name: 'Feasibility', icon: ClipboardCheck, href: '/feasibility' },
    ],
  },
  {
    id: 'data',
    layer: 'Layer 2',
    title: 'Data Agents',
    description: 'Input, retrieval, and evidence agents that keep the workflow grounded in source data.',
    icon: Database,
    accent: 'text-indigo-600 border-indigo-100 bg-indigo-50',
    soft: 'from-indigo-500/10 to-sky-500/10',
    agents: [
      { name: 'User Input (Docs/Images)', icon: FileText,href: '/user_input' },
      { name: 'Web Data', icon: Globe2, href: '/web_search' },
      { name: 'Data Retriever Agent', icon: Server, href: '/data_retrieval' },
      { name: 'Analytics', icon: LineChart },
      { name: 'Legal', icon: Scale },
    ],
  },
  {
    id: 'solution',
    layer: 'Layer 3',
    title: 'Solution Creation Agents',
    description: 'Creation and operations agents that turn analysis into executable business workflows.',
    icon: Code2,
    accent: 'text-violet-600 border-violet-100 bg-violet-50',
    soft: 'from-violet-500/10 to-fuchsia-500/10',
    agents: [
      { name: 'UI Creation', icon: MonitorCog , href: '/ui_creation'},
      { name: 'Solution Engine', icon: Settings },
      { name: 'CRM', icon: Handshake },
      { name: 'ERP', icon: Building2 },
      { name: 'Project Management', icon: FolderKanban },
    ],
  },
  {
    id: 'workspace',
    layer: 'Layer 4',
    title: 'Workspace Agents',
    description: 'Collaboration agents that connect people, tools, and shared execution spaces.',
    icon: Users,
    accent: 'text-emerald-600 border-emerald-100 bg-emerald-50',
    soft: 'from-emerald-500/10 to-teal-500/10',
    agents: [
      { name: 'Connector', icon: Plug ,href : '/connector'},
      { name: 'Team Collaboration', icon: Users },
    ],
  },
];

const MODULE_LANES = [
  'Intent Finalization & Visualization Planning',
  'Data Restructuring & Filtering',
  'Simulation Depiction Layer',
  'What-if Analysis Engine',
  'Geo-Enrichment & Map Plotting',
  'Spatial Analysis',
  'Insight Generation',
];

const MODULE_COLORS: Record<string, string> = {
  'Intent Finalization & Visualization Planning': 'border-indigo-200 bg-indigo-50 text-indigo-700',
  'Data Restructuring & Filtering': 'border-sky-200 bg-sky-50 text-sky-700',
  'Geo-Enrichment & Map Plotting': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Simulation Depiction Layer': 'border-amber-200 bg-amber-50 text-amber-700',
  'What-if Analysis Engine': 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  'Spatial Analysis': 'border-teal-200 bg-teal-50 text-teal-700',
  'Insight Generation': 'border-violet-200 bg-violet-50 text-violet-700',
};

const NODE_WIDTH = 260;
const LANE_GAP = 300;
const ROW_GAP = 165;

const getStepStatus = (step: Partial<ExecutionPlanStep>) => String(step.status || 'planned').toLowerCase();

// Stable constants — must NOT be defined inline in JSX.
// React Flow v11 has internal useEffect hooks that depend on these by reference;
// new objects/functions each render cause those effects to re-fire → infinite setState loop.
const FIT_VIEW_OPTIONS = { padding: 0.22 } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;
const getMiniMapNodeColor = (node: { data: WorkflowNodeData }) =>
  getStepStatus(node.data.step) === 'skipped' ? '#cbd5e1' : '#8b5cf6';

const WorkflowPlanNode = memo(({ data }: NodeProps<WorkflowNodeData>) => {
  const { step } = data;
  const status = getStepStatus(step);
  const isSkipped = status === 'skipped';
  const moduleColor = MODULE_COLORS[step.module || ''] || 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div
      className={`w-[260px] rounded-xl border bg-white px-4 py-3 shadow-lg shadow-slate-200/60 transition-all ${
        isSkipped ? 'border-slate-200 opacity-55' : 'border-slate-200'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${
              isSkipped ? 'bg-slate-100 text-slate-400' : 'bg-violet-600 text-white'
            }`}
          >
            {step.step_id}
          </span>
          <div className="min-w-0">
            <p className="line-clamp-2 text-xs font-extrabold leading-4 text-slate-900">
              {step.step_name || `Step ${step.step_id}`}
            </p>
            <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {step.action_type || 'workflow_step'}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${
            isSkipped
              ? 'border-slate-200 bg-slate-100 text-slate-400'
              : 'border-emerald-200 bg-emerald-50 text-emerald-600'
          }`}
        >
          {status}
        </span>
      </div>

      <div className={`mt-3 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold leading-4 ${moduleColor}`}>
        {step.module || 'Unassigned module'}
      </div>

      <p className="mt-3 line-clamp-2 text-[11px] font-medium leading-5 text-slate-500">
        {step.step_purpose || step.expected_output || 'Dynamic execution-plan step.'}
      </p>

      <div className="mt-3 border-t border-slate-100 pt-2">
        <p className="truncate text-[10px] font-mono text-slate-500">
          Output: {step.expected_output || 'not specified'}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-violet-500" />
    </div>
  );
});

WorkflowPlanNode.displayName = 'WorkflowPlanNode';

const nodeTypes = {
  planStep: WorkflowPlanNode,
};

function buildWorkflowGraph(moduleOutput?: Module1IntentOutput | null): {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
} {
  const steps = [...(moduleOutput?.execution_plan || [])].sort((a, b) => a.step_id - b.step_id);
  const stepIds = new Set(steps.map((step) => step.step_id));

  const nodes: Node<WorkflowNodeData>[] = steps.map((step, index) => {
    const knownLane = MODULE_LANES.indexOf(step.module || '');
    const laneIndex = knownLane >= 0 ? knownLane : MODULE_LANES.length;
    const isSkipped = getStepStatus(step) === 'skipped';

    return {
      id: `step-${step.step_id}`,
      type: 'planStep',
      data: { step },
      position: {
        x: laneIndex * LANE_GAP,
        y: index * ROW_GAP,
      },
      draggable: true,
      selectable: true,
      style: {
        width: NODE_WIDTH,
        opacity: isSkipped ? 0.7 : 1,
      },
    };
  });

  const edges: Edge[] = steps.flatMap((step, index) => {
    const dependencies =
      step.depends_on && step.depends_on.length > 0
        ? step.depends_on
        : index > 0
          ? [steps[index - 1].step_id]
          : [];

    return dependencies
      .filter((dependencyId) => stepIds.has(dependencyId))
      .map((dependencyId) => {
        const sourceStep = steps.find((candidate) => candidate.step_id === dependencyId);
        const isSkipped = getStepStatus(step) === 'skipped' || getStepStatus(sourceStep || {}) === 'skipped';

        return {
          id: `edge-${dependencyId}-${step.step_id}`,
          source: `step-${dependencyId}`,
          target: `step-${step.step_id}`,
          type: 'smoothstep',
          animated: !isSkipped,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: isSkipped ? '#94a3b8' : '#7c3aed',
          },
          style: {
            stroke: isSkipped ? '#cbd5e1' : '#7c3aed',
            strokeWidth: isSkipped ? 1.5 : 2.25,
            strokeDasharray: isSkipped ? '6 6' : undefined,
          },
        };
      });
  });

  return { nodes, edges };
}

const WorkflowSection: React.FC<WorkflowSectionProps> = ({
  onToggleExpand,
  isExpanded,
  moduleOutput,
  retrievalOutput,
  onModule2Output,
}) => {
  const router = useRouter();
  const [isAgentsOpen, setIsAgentsOpen] = useState(false);
  const [activeAgentLayerId, setActiveAgentLayerId] = useState(agentLayers[0].id);
  const [activeView, setActiveView] = useState<'workflow' | 'module2'>('workflow');
  const { nodes, edges } = useMemo(() => buildWorkflowGraph(moduleOutput), [moduleOutput]);
  const hasWorkflow = nodes.length > 0;
  const plannedCount = nodes.filter((node) => getStepStatus(node.data.step) === 'planned').length;
  const skippedCount = nodes.filter((node) => getStepStatus(node.data.step) === 'skipped').length;

  const activeAgentLayer =
    agentLayers.find((layer) => layer.id === activeAgentLayerId) ?? agentLayers[0];
  const ActiveAgentLayerIcon = activeAgentLayer.icon;

  return (
    <div className="workspace-panel flex h-full w-full flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden transition-all duration-500">
      <div className="workspace-panel-header grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
            <Network className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setActiveView('workflow')}
                className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                  activeView === 'workflow'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Workflow
              </button>
              <button
                onClick={() => setActiveView('module2')}
                className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                  activeView === 'module2'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Module 2
              </button>
            </div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase leading-none hidden lg:block">
              {activeView === 'workflow' ? 'Interactive process map' : 'Data Restructuring'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAgentsOpen((open) => !open)}
          className={`group inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[11px] font-extrabold uppercase tracking-[0.18em] shadow-sm transition-all duration-200 ${
            isAgentsOpen
              ? 'border-violet-200 bg-violet-600 text-white shadow-violet-200/70'
              : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700'
          }`}
        >
          <Bot className="h-4 w-4" />
          Agents
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAgentsOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center justify-end gap-3">
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
              hasWorkflow
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                : 'border-slate-200 bg-slate-100 text-slate-400'
            }`}
          >
            {hasWorkflow ? `${plannedCount} planned / ${skippedCount} skipped` : 'Inactive'}
          </div>
          
          <button 
            onClick={onToggleExpand}
            title={isExpanded ? 'Restore panel size' : 'Expand panel'}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="workspace-canvas relative flex min-h-0 flex-1 flex-col bg-white overflow-hidden">
        {activeView === 'module2' ? (
          <Module2Section
            moduleOutput={moduleOutput}
            retrievalOutput={retrievalOutput}
            onModule2Output={onModule2Output}
          />
        ) : (
          <>
        {isAgentsOpen && (
          <div className="absolute left-1/2 top-4 z-30 w-[min(760px,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/15 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-600">Agent layers</p>
                <h3 className="mt-1 truncate text-sm font-extrabold tracking-tight text-slate-950">
                  Super Agent orchestration map
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAgentsOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid max-h-[420px] grid-cols-1 overflow-y-auto md:grid-cols-[250px_1fr]">
              <div className="space-y-2 border-b border-slate-100 bg-white p-3 md:border-b-0 md:border-r">
                {agentLayers.map((layer) => {
                  const Icon = layer.icon;
                  const isActive = activeAgentLayer.id === layer.id;

                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => setActiveAgentLayerId(layer.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                        isActive
                          ? 'border-violet-200 bg-violet-50 shadow-sm'
                          : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          isActive ? layer.accent : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                          {layer.layer}
                        </span>
                        <span className="mt-0.5 block text-sm font-extrabold leading-5 text-slate-900">
                          {layer.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className={`bg-gradient-to-br ${activeAgentLayer.soft} p-4`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${activeAgentLayer.accent}`}>
                    <ActiveAgentLayerIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                      {activeAgentLayer.layer}
                    </p>
                    <h4 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
                      {activeAgentLayer.title}
                    </h4>
                    <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-slate-600">
                      {activeAgentLayer.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeAgentLayer.agents.map((agent) => {
                    const AgentIcon = agent.icon;

                    return (
                      <button
                        key={agent.name}
                        type="button"
                        onClick={() => {
                          if (!agent.href) return;
                          setIsAgentsOpen(false);
                          router.push(agent.href);
                        }}
                        className={`flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/70 bg-white/90 px-3 py-2.5 text-left shadow-sm transition-colors ${
                          agent.href ? 'hover:bg-violet-50/70 cursor-pointer' : ''
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${activeAgentLayer.accent}`}>
                          <AgentIcon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="break-words text-sm font-extrabold leading-5 text-slate-900">
                          {agent.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {hasWorkflow ? (
          <div className="relative h-full w-full">
            <div className="absolute left-4 top-4 z-20 max-w-[360px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/70 backdrop-blur">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-600">
                Dynamic execution plan
              </p>
              <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-slate-950">
                {moduleOutput?.business_objective || 'Module 1 workflow plan'}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(moduleOutput?.required_modules || []).map((moduleName) => (
                  <span
                    key={moduleName}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500"
                  >
                    {moduleName}
                  </span>
                ))}
              </div>
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={FIT_VIEW_OPTIONS}
              minZoom={0.18}
              maxZoom={1.25}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              proOptions={PRO_OPTIONS}
              className="bg-slate-50"
            >
              <Background color="#cbd5e1" gap={28} size={1} />
              <Controls className="workspace-controls !rounded-xl !border-slate-200 !bg-white !shadow-sm" />
              <MiniMap
                pannable
                zoomable
                nodeStrokeWidth={2}
                className="!rounded-xl !border !border-slate-200 !bg-white !shadow-sm"
                nodeColor={getMiniMapNodeColor}
              />
            </ReactFlow>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
              <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-violet-500/5 animate-pulse blur-xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl border border-slate-100">
                  <Network className="h-10 w-10 text-violet-500/40" />
              </div>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">No workflow yet</h3>
              <p className="mt-2.5 max-w-[240px] text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
              Logic synthesis framework
              </p>
              <p className="mt-4 max-w-[280px] text-sm font-medium text-slate-500 leading-relaxed text-center">
              Ask the AI Assistant to generate a Module 1 execution plan and it will appear here as a dynamic workflow.
              </p>

              <div className="mt-8 flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-4 py-2 opacity-50">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting interaction</span>
              </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowSection;
