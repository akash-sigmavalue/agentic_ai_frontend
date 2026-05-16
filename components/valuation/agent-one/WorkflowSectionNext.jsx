"use client";

import { useEffect, useMemo, useState } from "react";
import dagre from "dagre";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  Handle,
} from "reactflow";
import "reactflow/dist/style.css";
import { buildWorkflowFromEvents } from "@/lib/valuation/workflow";

const NODE_WIDTH = 340;
const NODE_HEIGHT = 260;

function getLayoutedElements(nodes, edges) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 140, marginx: 30, marginy: 30 });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return {
    nodes: nodes.map((node) => {
      const position = graph.node(node.id);
      return {
        ...node,
        position: { x: position.x - NODE_WIDTH / 2, y: position.y - NODE_HEIGHT / 2 },
      };
    }),
    edges: edges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "var(--text-dim)", strokeWidth: 1.8 },
    })),
  };
}

function WorkflowNode({ data, type }) {
  return (
    <div className="w-[340px] rounded-[22px] border border-border bg-bg-card shadow-panel">
      {type !== "input" ? (
        <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-bg-card !bg-accent" />
      ) : null}
      <div className="flex min-h-[260px]">
        <div className="w-2 rounded-l-[22px] bg-[linear-gradient(180deg,var(--accent),var(--accent-purple))]" />
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3 text-left">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-glow text-lg text-accent-light">
                {data.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[12px] uppercase tracking-[0.14em] text-text-primary">
                  {data.title}
                </h3>
                <p className="mt-1 break-words text-xs leading-5 text-text-secondary">{data.subtitle}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim">
              {data.status}
            </span>
          </div>
          <div className="mt-4 flex-1 rounded-2xl border border-border bg-bg-input p-3 text-left">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-dim">JSON Payload</p>
            <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-text-secondary text-left">
              {data.payload}
            </pre>
          </div>
        </div>
      </div>
      {type !== "output" ? (
        <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-bg-card !bg-accent" />
      ) : null}
    </div>
  );
}

const nodeTypes = {
  input: WorkflowNode,
  default: WorkflowNode,
  decision: WorkflowNode,
  output: WorkflowNode,
};

export default function WorkflowSectionNext({ events = [] }) {
  const workflow = useMemo(() => buildWorkflowFromEvents(events), [events]);
  const [layouted, setLayouted] = useState({ nodes: [], edges: [] });

  useEffect(() => {
    if (!workflow.nodes.length) {
      setLayouted({ nodes: [], edges: [] });
      return;
    }
    setLayouted(getLayoutedElements(workflow.nodes, workflow.edges));
  }, [workflow]);

  const isEmpty = layouted.nodes.length === 0;

  return (
    <section className="panel-shell">
      <div className="panel-header-shell">
        <div className="panel-title-shell">
          <div className="icon-chip">⚡</div>
          <div>
            <p className="panel-kicker">Workflow Engine</p>
            <h2 className="panel-heading">Stage Wise JSON Flow</h2>
          </div>
        </div>
        <div className="panel-pill">{isEmpty ? "WAITING" : "ACTIVE"}</div>
      </div>

      <div className="relative flex-1">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border bg-bg-card text-3xl text-accent-light">
              ⚙️
            </div>
            <h3 className="font-display text-base uppercase tracking-[0.14em] text-text-primary">
              Workflow Will Render Here
            </h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
              Once the chat starts streaming backend events, each stage payload will appear here as connected React Flow cards.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={layouted.nodes}
            edges={layouted.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            elementsSelectable
            panOnDrag
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
          >
            <Background color="var(--border-soft)" gap={24} size={1} />
            <Controls className="[&>button]:!border-border [&>button]:!bg-bg-card [&>button]:!text-text-primary" />
            <MiniMap
              className="!rounded-2xl !border !border-border !bg-bg-card"
              pannable
              zoomable
              nodeColor="var(--accent)"
            />
          </ReactFlow>
        )}
      </div>
    </section>
  );
}
