import type { CSSProperties } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface WorkflowNode {
  id: string;
  type: 'input' | 'default' | 'decision' | 'output' | 'plus';
  data: {
    label: string;
    onAdd?: () => void;
    onContinue?: () => void;
    theme?: 'light' | 'dark';
    description?: string;
    owner?: string;
    duration?: string;
    status?: string;
    icon?: string;
    highlighted?: boolean;
    kind?: 'main' | 'substage';
    parentId?: string;
    visible?: boolean;
    previewItems?: Array<{
      label: string;
      value: string;
    }>;
    caption?: string;
    error?: string;
  };
  position?: { x: number; y: number };
  style?: CSSProperties;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  type?: string;
  style?: CSSProperties;
  markerEnd?: {
    type?: string;
    color?: string;
  };
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowRuntimeState {
  mainNodes: WorkflowNode[];
  subNodes: WorkflowNode[];
  edges: WorkflowEdge[];
  error: string | null;
}

export interface WorkflowStreamEvent {
  event_type?: string;
  node?: string;
  parent_node?: string;
  subnode_id?: string;
  label?: string;
  message?: string;
  data?: unknown;
  usage?: unknown;
  tokens?: unknown;
  total_tokens?: unknown;
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
}

export interface MarkerData {
  id?: string;
  lat: number;
  lng: number;
  label?: string;
  description?: string;
  address?: string;
  insight?: string;
  context?: string;
}

export type GraphNodeId = "start" | "retrieve" | "generate" | "end";

export type PipelineDurations = Partial<Record<GraphNodeId, number>>;
