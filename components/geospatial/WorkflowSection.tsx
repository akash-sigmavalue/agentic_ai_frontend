'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  Connection,
} from 'reactflow';
import dagre from 'dagre';
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
import type { WorkflowData } from '@/lib/dashboard/geospatial/types';

interface WorkflowSectionProps {
  data: WorkflowData | null;
  isGenerating?: boolean;
  onToggle?: () => void;
  isCollapsed?: boolean;
}

type WorkflowNodeType = 'input' | 'default' | 'decision' | 'output';

interface WorkflowNodeData {
  label: string;
  title: string;
  subtitle?: string;
  description?: string;
  owner?: string;
  duration?: string;
  status?: string;
  ctaLabel?: string;
  icon?: string;
}

interface WorkflowNode extends Node<WorkflowNodeData> {
  type: WorkflowNodeType;
  __orderIndex?: number;
}

const NODE_WIDTH = 320;
const NODE_HEIGHT = 160;

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
      { name: "Visualization Agent", icon: MapPinned, href: '/visualization_agent' },      
      { name: 'Valuation', icon: BarChart3, href: '/valuation' },
      { name: 'Market Research', icon: Search },
      { name: 'Physical AI', icon: Bot },
      { name: 'Feasibility', icon: ClipboardCheck },
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

const getNodeTheme = (type: WorkflowNodeType) => {
  switch (type) {
    case 'input':
      return {
        side: 'from-emerald-500/70 to-emerald-600/70',
        ring: 'ring-emerald-500/30',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        iconWrap: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        title: 'text-white',
        metaDot: 'bg-emerald-500',
        cta: 'text-emerald-400 hover:text-emerald-300',
      };
    case 'output':
      return {
        side: 'from-indigo-500/70 to-indigo-600/70',
        ring: 'ring-indigo-500/30',
        badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        iconWrap: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
        title: 'text-white',
        metaDot: 'bg-indigo-500',
        cta: 'text-indigo-400 hover:text-indigo-300',
      };
    case 'decision':
      return {
        side: 'from-amber-500/70 to-amber-600/70',
        ring: 'ring-amber-500/30',
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        iconWrap: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        title: 'text-white',
        metaDot: 'bg-amber-500',
        cta: 'text-amber-400 hover:text-amber-300',
      };
    default:
      return {
        side: 'from-violet-500/70 to-violet-600/70',
        ring: 'ring-violet-500/30',
        badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        iconWrap: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
        title: 'text-white',
        metaDot: 'bg-violet-500',
        cta: 'text-violet-400 hover:text-violet-300',
      };
  }
};

const normalizeWorkflow = (workflow: WorkflowData | null | undefined) => {
  const rawNodes = Array.isArray(workflow?.nodes) ? workflow!.nodes : [];
  const rawEdges = Array.isArray(workflow?.edges) ? workflow!.edges : [];

  const normalizedNodes: WorkflowNode[] = rawNodes.map((node: any, index: number) => {
    const safeType: WorkflowNodeType =
      node?.type === 'input' ||
        node?.type === 'output' ||
        node?.type === 'default' ||
        node?.type === 'decision'
        ? node.type
        : index === 0
          ? 'input'
          : index === rawNodes.length - 1
            ? 'output'
            : 'default';

    const label =
      node?.data?.label ||
      node?.data?.title ||
      node?.label ||
      `Step ${index + 1}`;

    return {
      ...node,
      id: String(node?.id ?? `node-${index + 1}`),
      type: safeType,
      data: {
        label,
        title: node?.data?.title || label,
        subtitle: node?.data?.subtitle || node?.data?.description || '',
        description: node?.data?.description || '',
        owner: node?.data?.owner || '',
        duration: node?.data?.duration || '',
        status:
          node?.data?.status ||
          (safeType === 'input'
            ? 'Start'
            : safeType === 'output'
              ? 'End'
              : safeType === 'decision'
                ? 'Decision'
                : 'In Progress'),
        ctaLabel: node?.data?.ctaLabel || '',
        icon:
          node?.data?.icon ||
          (safeType === 'input'
            ? '🚀'
            : safeType === 'output'
              ? '🏁'
              : safeType === 'decision'
                ? '⚖️'
                : '⚙️'),
      },
      position: node?.position || { x: 0, y: 0 },
      __orderIndex: index,
    };
  });

  const normalizedEdges: Edge[] = rawEdges.map((edge: any, index: number) => ({
    id: String(edge?.id || `e-${edge?.source}-${edge?.target}-${index}`),
    source: String(edge?.source),
    target: String(edge?.target),
    sourceHandle: edge?.sourceHandle,
    targetHandle: edge?.targetHandle,
    label: edge?.label,
    type: edge?.type || 'smoothstep',
    animated: edge?.animated ?? true,
    markerEnd:
      edge?.markerEnd || {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: '#475569',
      },
    style: {
      stroke: '#475569',
      strokeWidth: 2,
      ...edge?.style,
    },
  }));

  return {
    nodes: normalizedNodes,
    edges: normalizedEdges,
  };
};

const getLayoutedElements = (
  nodes: WorkflowNode[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 130,
    marginx: 30,
    marginy: 30,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function WorkflowCardNode({
  data,
  type,
  __orderIndex,
}: {
  data: WorkflowNodeData;
  type: WorkflowNodeType;
  __orderIndex?: number;
}) {
  const theme = getNodeTheme(type);
  const [isVisible, setIsVisible] = useState(false);

  const delay = (__orderIndex ?? 0) * 0.08;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`relative w-full max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]/95 shadow-lg ring-1 ${theme.ring} transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      style={{ minWidth: '260px' }}
    >
      {type !== 'input' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !-top-1.5 !border-2 !border-[#0f172a] !bg-slate-500"
        />
      )}

      <div className="flex min-h-[160px]">
        <div className={`w-4 shrink-0 bg-gradient-to-b ${theme.side}`} />

        <div className="max-h-[160px] flex-1 overflow-y-auto p-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold ${theme.iconWrap}`}
            >
              {data.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`break-words text-[15px] font-semibold leading-5 ${theme.title}`}>
                  {data.title}
                </h3>

                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${theme.badge}`}
                >
                  {data.status}
                </span>
              </div>

              {data.subtitle ? (
                <p className="mt-1 break-words text-[12px] leading-[1.35] text-slate-300">
                  {data.subtitle}
                </p>
              ) : (
                <p className="mt-1 break-words text-[12px] leading-[1.35] text-slate-400">
                  {type === 'input'
                    ? 'Workflow entry point'
                    : type === 'output'
                      ? 'Workflow completion point'
                      : type === 'decision'
                        ? 'Decision point'
                        : 'Processing step'}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
            {data.owner ? (
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${theme.metaDot}`} />
                <span className="font-medium text-white">{data.owner}</span>
              </div>
            ) : null}

            {data.duration ? (
              <div className="flex items-center gap-1.5">
                <span>⏱</span>
                <span>{data.duration}</span>
              </div>
            ) : null}
          </div>

          {data.ctaLabel ? (
            <button
              type="button"
              className={`mt-4 text-[12px] font-semibold underline-offset-2 hover:underline ${theme.cta}`}
            >
              {data.ctaLabel}
            </button>
          ) : null}
        </div>
      </div>

      {type !== 'output' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !-bottom-1.5 !border-2 !border-[#0f172a] !bg-slate-500"
        />
      )}
    </div>
  );
}

const InputNode = (props: any) => (
  <WorkflowCardNode
    data={props.data}
    type="input"
    __orderIndex={props.__orderIndex ?? props.data?.__orderIndex}
  />
);

const DefaultNode = (props: any) => (
  <WorkflowCardNode
    data={props.data}
    type="default"
    __orderIndex={props.__orderIndex ?? props.data?.__orderIndex}
  />
);

const DecisionNode = (props: any) => (
  <WorkflowCardNode
    data={props.data}
    type="decision"
    __orderIndex={props.__orderIndex ?? props.data?.__orderIndex}
  />
);

const OutputNode = (props: any) => (
  <WorkflowCardNode
    data={props.data}
    type="output"
    __orderIndex={props.__orderIndex ?? props.data?.__orderIndex}
  />
);

const nodeTypes = {
  input: InputNode,
  default: DefaultNode,
  decision: DecisionNode,
  output: OutputNode,
};

const WorkflowSection: React.FC<WorkflowSectionProps> = ({
  data,
  isGenerating = false,
  onToggle,
  isCollapsed,
}) => {
  const router = useRouter();
  const normalizedWorkflow = useMemo(() => normalizeWorkflow(data), [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [isAgentsOpen, setIsAgentsOpen] = useState(false);
  const [activeAgentLayerId, setActiveAgentLayerId] = useState(agentLayers[0].id);

  const activeAgentLayer =
    agentLayers.find((layer) => layer.id === activeAgentLayerId) ?? agentLayers[0];
  const ActiveAgentLayerIcon = activeAgentLayer.icon;

  useEffect(() => {
    if (normalizedWorkflow.nodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        normalizedWorkflow.nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            __orderIndex: node.__orderIndex,
          },
        })),
        normalizedWorkflow.edges,
        'TB'
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [normalizedWorkflow, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 18,
              height: 18,
              color: '#475569',
            },
            style: {
              stroke: '#475569',
              strokeWidth: 2,
            },
          },
          eds
        )
      ),
    [setEdges]
  );

  const isEmpty = nodes.length === 0;

  return (
    <div className={`workspace-panel flex h-full w-full flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden transition-all duration-500 ${isCollapsed ? 'opacity-80' : 'opacity-100'}`}>
      <div className="workspace-panel-header grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">Workflow</h2>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-1 leading-none">Interactive process map</p>
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
          aria-expanded={isAgentsOpen}
          aria-controls="workflow-agent-layers"
        >
          <Bot className="h-4 w-4" />
          Agents
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAgentsOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center justify-end gap-3">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${nodes.length > 0
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
          >
            {nodes.length > 0 ? 'Active' : 'Inactive'}
          </div>
          
          <button 
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <Maximize2 className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <div className="workspace-canvas relative flex-1 bg-white">
        {isAgentsOpen && (
          <div
            id="workflow-agent-layers"
            className="absolute left-1/2 top-4 z-30 w-[min(760px,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/15 backdrop-blur-xl"
          >
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
                aria-label="Close agent layers"
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

        {isGenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-ping" />
              <div className="relative h-12 w-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-xs font-bold text-violet-600 uppercase tracking-widest animate-pulse">Synthesizing Logic...</p>
          </div>
        )}

        {!isEmpty ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            className="bg-slate-50/30"
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.2}
            maxZoom={1.5}
            attributionPosition="bottom-right"
            proOptions={{ hideAttribution: true }}
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick
            nodesDraggable={false}
            nodesConnectable
            elementsSelectable
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 18,
                height: 18,
                color: '#94a3b8',
              },
              style: {
                stroke: '#cbd5e1',
                strokeWidth: 2,
              },
            }}
          >
            <Background color="#e2e8f0" gap={24} size={1} />
            <Controls className="workspace-controls !bg-white !border-slate-200 !shadow-sm !rounded-xl" />
            <MiniMap
              pannable
              zoomable
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}
              maskColor="rgba(2, 6, 23, 0.7)"
              nodeBorderRadius={10}
              nodeColor={(n) => {
                if (n.type === 'input') return '#10b981';
                if (n.type === 'output') return '#6366f1';
                if (n.type === 'decision') return '#f59e0b';
                return '#8b5cf6';
              }}
            />
          </ReactFlow>
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
               Ask the AI Assistant to generate a process map or analyze a workflow sequence to see it visualized here.
             </p>

             <div className="mt-8 flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-4 py-2 opacity-50">
               <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting interaction</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowSection;
