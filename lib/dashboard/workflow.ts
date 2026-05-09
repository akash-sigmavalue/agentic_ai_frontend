import { MarkerType } from 'reactflow';
import {
  WorkflowData,
  WorkflowEdge,
  WorkflowNode,
  WorkflowRuntimeState,
  WorkflowStreamEvent,
} from '../../types/agents';

const MAIN_NODE_ORDER = ['query', 'intent_agent', 'file_decision', 'planning_agent', 'file_data_agent', 'database', 'ui_agent', 'output'] as const;

const MAIN_NODE_LABELS: Record<string, string> = {
  query: 'Query',
  intent_agent: 'Intent Agent',
  file_decision: 'File Decision',
  planning_agent: 'Planning Agent',
  file_data_agent: 'File Data Agent',
  database: 'Database',
  ui_agent: 'UI Agent',
  output: 'Output',
};

const MAIN_NODE_META: Record<string, Pick<WorkflowNode, 'type'> & { owner: string; description: string }> = {
  query: {
    type: 'input',
    owner: 'Client',
    description: 'Incoming request and normalized query payload.',
  },
  intent_agent: {
    type: 'default',
    owner: 'Agent 1',
    description: 'Builds the semantic intent and response plan.',
  },
  file_decision: {
    type: 'decision',
    owner: 'User',
    description: 'Upload a data file or continue with connected CRM data.',
  },
  planning_agent: {
    type: 'default',
    owner: 'Agent 2',
    description: 'Grounds fields and prepares executable retrieval steps.',
  },
  file_data_agent: {
    type: 'default',
    owner: 'Agent 2b',
    description: 'Profiles uploaded file data and maps it into the plan.',
  },
  database: {
    type: 'decision',
    owner: 'Data Layer',
    description: 'Runs SQL and returns live records.',
  },
  ui_agent: {
    type: 'default',
    owner: 'Agent 3',
    description: 'Composes the UI from live analytical results.',
  },
  output: {
    type: 'output',
    owner: 'Renderer',
    description: 'Packages the final response for the dashboard.',
  },
};

const MAIN_NODE_X = 80;
const MAIN_NODE_Y_START = 60;
const MAIN_NODE_Y_GAP = 320;
const SUBNODE_X_OFFSET = 420;
const SUBNODE_Y_GAP = 170;

const truncateValue = (value: string, maxLength = 44) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
};

const titleCaseFromId = (value: string) =>
  value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const toDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'Not available';
  if (typeof value === 'string') return truncateValue(value.trim() || 'Not available');
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return truncateValue(value.join(', '));
  if (typeof value === 'object') {
    const objectEntries = Object.entries(value as Record<string, unknown>)
      .slice(0, 2)
      .map(([key, entryValue]) => `${titleCaseFromId(key)}: ${toDisplayValue(entryValue)}`);
    return truncateValue(objectEntries.join(' | '));
  }
  return truncateValue(String(value));
};

const getObjectValue = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const getWorkflowPreviewItems = (data: unknown) => {
  const objectValue = getObjectValue(data);
  if (!objectValue) return [];

  const previewObject = getObjectValue(objectValue.preview);
  const source = previewObject ?? objectValue;

  return Object.entries(source)
    .filter(([key]) => !['usage', 'jsx', 'html', 'data_summary', 'insights', 'semantic_schema_plan', 'schema_plan'].includes(key))
    .slice(0, 3)
    .map(([key, value]) => ({
      label: titleCaseFromId(key),
      value: toDisplayValue(value),
    }));
};

const createMainNode = (nodeId: string): WorkflowNode => {
  const meta = MAIN_NODE_META[nodeId];
  return {
    id: nodeId,
    type: meta.type,
    position: getMainNodePosition(nodeId),
    data: {
      label: MAIN_NODE_LABELS[nodeId],
      description: meta.description,
      owner: meta.owner,
      duration: 'Waiting',
      status: nodeId === 'query' ? 'Ready' : 'Idle',
      kind: 'main',
      visible: nodeId === 'query',
      previewItems: [],
      caption: 'Awaiting activity',
      highlighted: false,
    },
  };
};

const getMainNodePosition = (nodeId: string) => {
  if (nodeId === 'file_data_agent') {
    return {
      x: MAIN_NODE_X,
      y: MAIN_NODE_Y_START + 3 * MAIN_NODE_Y_GAP,
    };
  }

  if (nodeId === 'database') {
    return {
      x: MAIN_NODE_X,
      y: MAIN_NODE_Y_START + 4 * MAIN_NODE_Y_GAP,
    };
  }

  if (nodeId === 'ui_agent') {
    return {
      x: MAIN_NODE_X,
      y: MAIN_NODE_Y_START + 5 * MAIN_NODE_Y_GAP,
    };
  }

  if (nodeId === 'output') {
    return {
      x: MAIN_NODE_X,
      y: MAIN_NODE_Y_START + 6 * MAIN_NODE_Y_GAP,
    };
  }

  const index = MAIN_NODE_ORDER.indexOf(nodeId as (typeof MAIN_NODE_ORDER)[number]);
  return {
    x: MAIN_NODE_X,
    y: MAIN_NODE_Y_START + Math.max(index, 0) * MAIN_NODE_Y_GAP,
  };
};

const createMainEdges = (): WorkflowEdge[] =>
  [
    ['query', 'intent_agent'],
    ['intent_agent', 'file_decision'],
    ['file_decision', 'planning_agent'],
    ['file_decision', 'file_data_agent'],
    ['planning_agent', 'database'],
    ['file_data_agent', 'database'],
    ['database', 'ui_agent'],
    ['ui_agent', 'output'],
  ].map(([source, target]) => ({
    id: `edge:${source}->${target}`,
    source,
    target,
    animated: false,
    type: 'smoothstep',
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
  }));

export const createInitialWorkflowRuntime = (): WorkflowRuntimeState => ({
  mainNodes: MAIN_NODE_ORDER.map((nodeId) => createMainNode(nodeId)),
  subNodes: [],
  edges: createMainEdges(),
  error: null,
});

const getStatusAppearance = (status: string) => {
  if (status === 'In Progress') {
    return {
      style: { backgroundColor: '#eef2ff', border: '2px solid #4f46e5', boxShadow: '0 0 0 1px rgba(99,102,241,0.2)' },
      highlighted: true,
    };
  }
  if (status === 'Done') {
    return {
      style: { backgroundColor: '#ecfdf5', border: '2px solid #10b981' },
      highlighted: false,
    };
  }
  if (status === 'Awaiting') {
    return {
      style: { backgroundColor: '#fffbeb', border: '2px dashed #f59e0b' },
      highlighted: false,
    };
  }
  if (status === 'Failed') {
    return {
      style: { backgroundColor: '#fef2f2', border: '2px solid #ef4444' },
      highlighted: false,
    };
  }
  return {
    style: undefined,
    highlighted: false,
  };
};

const parseEdgeNode = (value?: string) => {
  if (!value) return null;
  const parts = value.split('_to_');
  if (parts.length !== 2) return null;

  const normalizeNodeId = (nodeId: string) => {
    if (nodeId === 'intent') return 'intent_agent';
    if (nodeId === 'planning') return 'planning_agent';
    if (nodeId === 'db') return 'database';
    return nodeId;
  };

  const target = normalizeNodeId(parts[1]);
  const source = (
    parts[0] === 'intent' &&
    (target === 'planning_agent' || target === 'file_data_agent')
  )
    ? 'file_decision'
    : normalizeNodeId(parts[0]);

  return {
    source,
    target,
    edgeId: `edge:${source}->${target}`,
  };
};

const getSubnodePosition = (parentId: string, subNodes: WorkflowNode[], currentId: string) => {
  const parentPosition = getMainNodePosition(parentId);
  const siblings = subNodes.filter((node) => node.data.parentId === parentId && node.id !== currentId);
  const slotIndex = siblings.length;
  return {
    x: MAIN_NODE_X + SUBNODE_X_OFFSET,
    y: parentPosition.y + slotIndex * SUBNODE_Y_GAP,
  };
};

export const normalizeWorkflowRuntimeLayout = (state: WorkflowRuntimeState): WorkflowRuntimeState => {
  const normalizedMainNodes = state.mainNodes.map((node) => ({
    ...node,
    position: getMainNodePosition(node.id),
  }));

  const groupedCounts: Record<string, number> = {};
  const normalizedSubNodes = state.subNodes.map((node) => {
    const parentId = node.data.parentId || 'output';
    const slotIndex = groupedCounts[parentId] || 0;
    groupedCounts[parentId] = slotIndex + 1;

    const parentPosition = getMainNodePosition(parentId);
    return {
      ...node,
      position: {
        x: MAIN_NODE_X + SUBNODE_X_OFFSET,
        y: parentPosition.y + slotIndex * SUBNODE_Y_GAP,
      },
    };
  });

  return {
    ...state,
    mainNodes: normalizedMainNodes,
    subNodes: normalizedSubNodes,
  };
};

const updateMainNode = (
  mainNodes: WorkflowNode[],
  nodeId: string,
  status: 'In Progress' | 'Done' | 'Failed' | 'Awaiting',
  message?: string,
  data?: unknown
) =>
  mainNodes.map((node) => {
    if (node.id !== nodeId) {
      if (status === 'In Progress' && node.data.kind === 'main') {
        return {
          ...node,
          data: {
            ...node.data,
            highlighted: false,
          },
        };
      }
      return node;
    }

    const previewItems = getWorkflowPreviewItems(data);
    const appearance = getStatusAppearance(status);
    return {
      ...node,
      style: appearance.style,
      data: {
        ...node.data,
        status,
        highlighted: appearance.highlighted,
        visible: true,
        duration: status === 'Done' ? 'Complete' : status === 'Failed' ? 'Failed' : status === 'Awaiting' ? 'Paused' : 'Running',
        caption: message || node.data.caption,
        description: message || node.data.description,
        previewItems: previewItems.length > 0 ? previewItems : node.data.previewItems,
        error: status === 'Failed' ? message || 'Workflow failed' : undefined,
      },
    };
  });

const completeActiveSubnodesForParent = (
  subNodes: WorkflowNode[],
  parentId: string,
  message?: string
) =>
  subNodes.map((node) => {
    if (node.data.parentId !== parentId || node.data.status !== 'In Progress') {
      return node;
    }

    const appearance = getStatusAppearance('Done');
    return {
      ...node,
      style: appearance.style,
      data: {
        ...node.data,
        status: 'Done',
        duration: 'Complete',
        highlighted: false,
        caption: node.data.caption || message || 'Complete',
      },
    };
  });

const completeActiveSubnodes = (subNodes: WorkflowNode[]) =>
  subNodes.map((node) => {
    if (node.data.status !== 'In Progress') {
      return node;
    }

    const appearance = getStatusAppearance('Done');
    return {
      ...node,
      style: appearance.style,
      data: {
        ...node.data,
        status: 'Done',
        duration: 'Complete',
        highlighted: false,
      },
    };
  });

const stopActiveEdges = (edges: WorkflowEdge[]) =>
  edges.map((edge) => {
    if (!edge.animated) return edge;

    return {
      ...edge,
      animated: false,
      style: {
        ...edge.style,
        stroke: '#10b981',
        strokeWidth: 2.5,
      },
      markerEnd: {
        ...edge.markerEnd,
        type: MarkerType.ArrowClosed,
        color: '#10b981',
      },
    };
  });

const createFlowEdge = (
  source: string,
  target: string,
  edge?: WorkflowEdge
): WorkflowEdge => ({
  id: edge?.id || `edge:${source}->${target}`,
  source,
  target,
  animated: edge?.animated === true,
  type: edge?.type || 'smoothstep',
  style: edge?.style || { stroke: '#10b981', strokeWidth: 2.5 },
  markerEnd: {
    type: edge?.markerEnd?.type || MarkerType.ArrowClosed,
    color: edge?.markerEnd?.color || '#10b981',
  },
});

const upsertSubNode = (
  subNodes: WorkflowNode[],
  edges: WorkflowEdge[],
  event: WorkflowStreamEvent,
  status: 'In Progress' | 'Done'
) => {
  const parentId = event.parent_node;
  const subnodeId = event.subnode_id;
  if (!parentId || !subnodeId) {
    return { subNodes, edges };
  }

  const nodeId = `sub:${parentId}:${subnodeId}`;
  const existing = subNodes.find((node) => node.id === nodeId);
  const previewItems = getWorkflowPreviewItems(event.data);
  const appearance = getStatusAppearance(status);

  const nextNode: WorkflowNode = existing
    ? {
        ...existing,
        style: appearance.style,
        data: {
          ...existing.data,
          label: event.label || existing.data.label,
          status,
          duration: status === 'Done' ? 'Complete' : 'Running',
          highlighted: appearance.highlighted,
          caption: event.message || event.label || existing.data.caption,
          previewItems: previewItems.length > 0 ? previewItems : existing.data.previewItems,
        },
      }
    : {
        id: nodeId,
        type: 'default',
        position: getSubnodePosition(parentId, subNodes, nodeId),
        data: {
          label: event.label || titleCaseFromId(subnodeId),
          description: event.message || event.label || 'Substage activity',
          owner: MAIN_NODE_LABELS[parentId] || 'Workflow',
          duration: status === 'Done' ? 'Complete' : 'Running',
          status,
          highlighted: appearance.highlighted,
          kind: 'substage',
          parentId,
          visible: true,
          previewItems,
          caption: event.message || event.label || 'Substage activity',
        },
        style: appearance.style,
      };

  const nextSubNodes = existing
    ? subNodes.map((node) => (node.id === nodeId ? nextNode : node))
    : [...subNodes, nextNode];

  const edgeId = `edge:${parentId}->${nodeId}`;
  const edgeExists = edges.some((edge) => edge.id === edgeId);
  const nextEdges = edgeExists
    ? edges
    : [
        ...edges,
        {
          id: edgeId,
          source: parentId,
          target: nodeId,
          animated: status === 'In Progress',
          type: 'smoothstep',
          style: { stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '6 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' },
        },
      ];

  return { subNodes: nextSubNodes, edges: nextEdges };
};

const revealSubstageParent = (
  mainNodes: WorkflowNode[],
  event: WorkflowStreamEvent,
  status: 'In Progress' | 'Done'
) => {
  if (!event.parent_node || !MAIN_NODE_LABELS[event.parent_node]) return mainNodes;

  return updateMainNode(
    mainNodes,
    event.parent_node,
    status,
    status === 'Done'
      ? `${MAIN_NODE_LABELS[event.parent_node]} substage completed`
      : `${MAIN_NODE_LABELS[event.parent_node]} substage running`,
    undefined
  );
};

const updateEdgeState = (edges: WorkflowEdge[], value: string | undefined, isActive: boolean) => {
  const parsed = parseEdgeNode(value);
  if (!parsed) return edges;

  const nextEdge: WorkflowEdge = {
    id: parsed.edgeId,
    source: parsed.source,
    target: parsed.target,
    animated: isActive,
    type: 'smoothstep',
    style: {
      stroke: isActive ? '#4f46e5' : '#10b981',
      strokeWidth: 2.5,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: isActive ? '#4f46e5' : '#10b981',
    },
  };

  if (!edges.some((edge) => edge.id === parsed.edgeId)) {
    return [...edges, nextEdge];
  }

  return edges.map((edge) => {
    if (edge.id !== parsed.edgeId) return edge;
    return {
      ...edge,
      ...nextEdge,
    };
  });
};

export const reduceWorkflowStreamEvent = (
  state: WorkflowRuntimeState,
  event: WorkflowStreamEvent
): WorkflowRuntimeState => {
  const eventType = event.event_type;
  if (!eventType) return state;

  if (eventType === 'stage_start' && event.node) {
    return {
      ...state,
      error: null,
      mainNodes: updateMainNode(state.mainNodes, event.node, 'In Progress', event.message, event.data),
    };
  }

  if (eventType === 'stage_complete' && event.node) {
    return {
      ...state,
      mainNodes: updateMainNode(state.mainNodes, event.node, 'Done', event.message, event.data),
      subNodes: completeActiveSubnodesForParent(state.subNodes, event.node, event.message),
    };
  }

  if (eventType === 'edge_start') {
    return {
      ...state,
      edges: updateEdgeState(state.edges, event.node, true),
    };
  }

  if (eventType === 'edge_complete') {
    return {
      ...state,
      edges: updateEdgeState(state.edges, event.node, false),
    };
  }

  if (eventType === 'awaiting_file_decision') {
    return {
      ...state,
      mainNodes: updateMainNode(
        state.mainNodes,
        'file_decision',
        'Awaiting',
        event.message || 'Upload a file or continue without one.',
        event.data
      ),
      edges: updateEdgeState(state.edges, 'intent_agent_to_file_decision', false),
    };
  }

  if (eventType === 'substage_start' || eventType === 'substage_complete') {
    const status = eventType === 'substage_complete' ? 'Done' : 'In Progress';
    const nextSubnodeState = upsertSubNode(
      state.subNodes,
      state.edges,
      event,
      status
    );
    return {
      ...state,
      mainNodes: revealSubstageParent(state.mainNodes, event, status),
      subNodes: nextSubnodeState.subNodes,
      edges: nextSubnodeState.edges,
    };
  }

  if (eventType === 'final_result') {
    return {
      ...state,
      mainNodes: updateMainNode(state.mainNodes, 'output', 'Done', event.message, {
        preview: {
          title: 'Result Ready',
          status: 'Delivered',
        },
      }),
      subNodes: completeActiveSubnodes(state.subNodes),
      edges: stopActiveEdges(state.edges),
    };
  }

  if (eventType === 'error') {
    const failedNodeId = event.node && MAIN_NODE_LABELS[event.node] ? event.node : 'output';
    return {
      ...state,
      error: event.message || 'Workflow failed',
      mainNodes: updateMainNode(state.mainNodes, failedNodeId, 'Failed', event.message, event.data),
    };
  }

  return state;
};

export const workflowRuntimeToFlowData = (state: WorkflowRuntimeState): WorkflowData => {
  const visibleMainNodes = state.mainNodes
    .filter((node) => node.data.visible !== false)
    .sort((a, b) => (
      MAIN_NODE_ORDER.indexOf(a.id as (typeof MAIN_NODE_ORDER)[number]) -
      MAIN_NODE_ORDER.indexOf(b.id as (typeof MAIN_NODE_ORDER)[number])
    ));

  const compactMainNodes = visibleMainNodes.map((node, index) => ({
    ...node,
    position: {
      x: MAIN_NODE_X,
      y: MAIN_NODE_Y_START + index * MAIN_NODE_Y_GAP,
    },
  }));
  const compactMainPositionById = new Map(compactMainNodes.map((node) => [node.id, node.position]));
  const compactMainIds = new Set(compactMainNodes.map((node) => node.id));
  const groupedSubnodeCounts: Record<string, number> = {};

  const compactSubNodes = state.subNodes
    .filter((node) => node.data.visible !== false && compactMainIds.has(node.data.parentId || ''))
    .map((node) => {
      const parentId = node.data.parentId || 'output';
      const parentPosition = compactMainPositionById.get(parentId) || getMainNodePosition(parentId);
      const slotIndex = groupedSubnodeCounts[parentId] || 0;
      groupedSubnodeCounts[parentId] = slotIndex + 1;

      return {
        ...node,
        position: {
          x: MAIN_NODE_X + SUBNODE_X_OFFSET,
          y: parentPosition.y + slotIndex * SUBNODE_Y_GAP,
        },
      };
    });

  const visibleNodes = [...compactMainNodes, ...compactSubNodes];
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdgesById = new Map(
    state.edges
      .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map((edge) => [edge.id, edge])
  );
  const bridgedMainEdges: WorkflowEdge[] = [];

  for (let index = 0; index < compactMainNodes.length - 1; index += 1) {
    const source = compactMainNodes[index].id;
    const target = compactMainNodes[index + 1].id;
    const edgeId = `edge:${source}->${target}`;
    bridgedMainEdges.push(createFlowEdge(source, target, visibleEdgesById.get(edgeId)));
    visibleEdgesById.delete(edgeId);
  }

  return {
    nodes: visibleNodes,
    edges: [
      ...bridgedMainEdges,
      ...Array.from(visibleEdgesById.values()).map((edge) => createFlowEdge(edge.source, edge.target, edge)),
    ],
  };
};
