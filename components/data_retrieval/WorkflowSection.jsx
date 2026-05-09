"use client";

import { useCallback, useEffect, useMemo } from "react";
import dagre from "dagre";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

const NODE_WIDTH = 320;
const NODE_HEIGHT = 210;

function getNodeTheme(type) {
  if (type === "input") {
    return {
      stripe: "linear-gradient(180deg, rgba(52,211,153,0.75), rgba(5,150,105,0.72))",
      chipBg: "rgba(52,211,153,0.16)",
      chipText: "var(--success)",
      iconBg: "rgba(52,211,153,0.18)",
      iconText: "var(--success)",
    };
  }

  if (type === "output") {
    return {
      stripe: "linear-gradient(180deg, rgba(14,165,233,0.78), rgba(8,145,178,0.72))",
      chipBg: "rgba(14,165,233,0.16)",
      chipText: "var(--accent)",
      iconBg: "rgba(14,165,233,0.16)",
      iconText: "var(--accent-light)",
    };
  }

  if (type === "decision") {
    return {
      stripe: "linear-gradient(180deg, rgba(251,191,36,0.82), rgba(217,119,6,0.7))",
      chipBg: "rgba(251,191,36,0.16)",
      chipText: "var(--warning)",
      iconBg: "rgba(251,191,36,0.16)",
      iconText: "var(--warning)",
    };
  }

  return {
    stripe: "linear-gradient(180deg, rgba(34,211,238,0.76), rgba(167,139,250,0.72))",
    chipBg: "rgba(34,211,238,0.14)",
    chipText: "var(--accent-light)",
    iconBg: "rgba(34,211,238,0.16)",
    iconText: "var(--accent-light)",
  };
}

function normalizeWorkflow(stageCards = []) {
  const nodes = stageCards.map((card, index) => {
    const type = index === 0 ? "input" : index === stageCards.length - 1 ? "output" : "default";
    return {
      id: card.id || `stage-${index + 1}`,
      type,
      data: {
        title: card.title,
        subtitle: card.subtitle || "",
        status: card.status || card.kind || "Stage",
        icon: card.icon || "⚙️",
        details: typeof card.payload === "string" ? card.payload : String(card.payload || ""),
      },
      __orderIndex: index,
    };
  });

  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `edge-${node.id}-${nodes[index + 1].id}`,
    source: node.id,
    target: nodes[index + 1].id,
    type: "smoothstep",
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
    },
    style: {
      stroke: "var(--text-muted)",
      strokeWidth: 2,
    },
  }));

  return { nodes, edges };
}

function getLayoutedElements(nodes, edges) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 130, marginx: 24, marginy: 24 });

  nodes.forEach((node) => graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  return {
    nodes: nodes.map((node) => {
      const position = graph.node(node.id);
      return {
        ...node,
        position: {
          x: position.x - NODE_WIDTH / 2,
          y: position.y - NODE_HEIGHT / 2,
        },
      };
    }),
    edges,
  };
}

function WorkflowCardNode({ data, type, __orderIndex }) {
  const theme = getNodeTheme(type);

  return (
    <div
      className="relative w-full max-w-[320px] overflow-hidden rounded-2xl border"
      style={{
        minWidth: "260px",
        borderColor: "var(--border-soft)",
        background: "var(--bg-surface)",
        boxShadow: `0 14px 34px rgba(0,0,0,0.14)`,
        animationDelay: `${(__orderIndex || 0) * 60}ms`,
      }}
    >
      {type !== "input" ? (
        <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !shadow" style={{ background: "var(--text-muted)", borderColor: "var(--bg-deep)" }} />
      ) : null}

      <div className="flex min-h-[164px]">
        <div className="w-4 shrink-0" style={{ background: theme.stripe }} />
        <div className="flex-1 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base" style={{ background: theme.iconBg, color: theme.iconText }}>
              {data.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="m-0 break-words text-[15px] font-semibold leading-5" style={{ color: "var(--text-primary)" }}>
                  {data.title}
                </h3>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ borderColor: "transparent", background: theme.chipBg, color: theme.chipText }}>
                  {data.status}
                </span>
              </div>

              <p className="mt-1 text-[12px] leading-[1.4]" style={{ color: "var(--text-secondary)" }}>
                {data.subtitle || (type === "decision" ? "Decision point with conditional branch handling." : "Stage-wise workflow node for the generated process.")}
              </p>
            </div>
          </div>

          <div
            className="mt-4 max-h-[110px] overflow-auto rounded-xl border p-3 text-[11px] leading-5"
            style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)", color: "var(--text-secondary)" }}
          >
            <div className="whitespace-pre-wrap break-words">
              {data.details || "Waiting for the next step."}
            </div>
          </div>
        </div>
      </div>

      {type !== "output" ? (
        <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !shadow" style={{ background: "var(--text-muted)", borderColor: "var(--bg-deep)" }} />
      ) : null}
    </div>
  );
}

const nodeTypes = {
  input: (props) => <WorkflowCardNode {...props} type="input" />,
  default: (props) => <WorkflowCardNode {...props} type="default" />,
  output: (props) => <WorkflowCardNode {...props} type="output" />,
  decision: (props) => <WorkflowCardNode {...props} type="decision" />,
};

function formatTokenNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

function TokenLedger({ tokenEvents = [] }) {
  if (!tokenEvents.length) {
    return (
      <div className="rounded-2xl border px-4 py-3 text-xs" style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)", color: "var(--text-muted)" }}>
        Token usage will appear here as each LLM stage runs.
      </div>
    );
  }

  return (
    <div className="max-h-[190px] overflow-auto pr-1">
      <div className="space-y-2">
        {tokenEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border px-3 py-2"
            style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {event.stage}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Prompt {formatTokenNumber(event.promptTokens)} · Completion {formatTokenNumber(event.completionTokens)}
                </div>
              </div>
              <div className="text-right text-[10px]" style={{ color: "var(--text-secondary)" }}>
                <div>Total {formatTokenNumber(event.totalTokens)}</div>
                <div>Cumulative {formatTokenNumber(event.cumulativeTotalTokens)}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
              Cost ${Number(event.cumulativeCostUsd || 0).toFixed(6)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkflowSection({ stageCards = [], isGenerating = false, totalTokens = 0, tokenEvents = [] }) {
  const normalizedWorkflow = useMemo(() => normalizeWorkflow(stageCards), [stageCards]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!normalizedWorkflow.nodes.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const layouted = getLayoutedElements(normalizedWorkflow.nodes, normalizedWorkflow.edges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [normalizedWorkflow, setEdges, setNodes]);

  const onConnect = useCallback(
    (params) =>
      setEdges((existing) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
            style: { stroke: "var(--text-muted)", strokeWidth: 2 },
          },
          existing,
        ),
      ),
    [setEdges],
  );

  const isEmpty = nodes.length === 0;

  return (
    <section className="app-panel flex h-full min-h-[620px] flex-col">
      <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "var(--accent-glow)", color: "var(--accent-light)" }}>⚡</div>
        <div>
          <h2 className="m-0 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Workflow Stages</h2>
          <p className="m-0 text-xs" style={{ color: "var(--text-muted)" }}>Live backend stages and agent actions connected in sequence</p>
        </div>
        <span
          className="ml-auto rounded-full border px-3 py-1 text-[11px] font-semibold"
          style={{
            borderColor: isEmpty ? "color-mix(in srgb, var(--warning) 30%, transparent)" : "color-mix(in srgb, var(--success) 30%, transparent)",
            background: isEmpty ? "var(--warning-glow)" : "var(--success-glow)",
            color: isEmpty ? "var(--warning)" : "var(--success)",
          }}
        >
          {isEmpty ? "Inactive" : "Active"}
        </span>
      </div>

      <div className="relative flex-1">
        {isGenerating ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm" style={{ background: "color-mix(in srgb, var(--bg-surface) 82%, transparent)" }}>
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Building workflow...</span>
            </div>
          </div>
        ) : null}

        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center" style={{ background: "radial-gradient(circle at center, color-mix(in srgb, var(--accent-secondary) 10%, transparent), transparent 58%)" }}>
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed text-3xl" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-muted)" }}>
              ⚡
            </div>
            <h3 className="mt-5 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>No workflow yet</h3>
            <p className="mt-2 max-w-sm text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              Send a query to the backend and each pipeline stage will appear here as a connected workflow.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            nodesDraggable={false}
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            elementsSelectable
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
              style: { stroke: "var(--text-muted)", strokeWidth: 2 },
            }}
          >
            <Background gap={20} size={1} color="var(--border-soft)" />
            <Controls />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(0,0,0,0.12)"
              nodeBorderRadius={10}
              nodeColor={(node) => {
                if (node.type === "input") return "#10b981";
                if (node.type === "output") return "#0ea5e9";
                if (node.type === "decision") return "#f59e0b";
                return "#22d3ee";
              }}
            />
          </ReactFlow>
        )}
      </div>

      <div className="border-t px-5 py-4" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span style={{ color: "var(--text-muted)" }}>Visible here: workflow stages, agent steps, and live token accounting</span>
          <span style={{ color: "var(--text-primary)" }}>
            Total Tokens: <strong>{formatTokenNumber(totalTokens)}</strong>
          </span>
        </div>
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-secondary)" }}>
              Token Ledger
            </h3>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {tokenEvents.length} events
            </span>
          </div>
          <TokenLedger tokenEvents={tokenEvents} />
        </div>
      </div>
    </section>
  );
}
