"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Brain,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Mail,
  Maximize2,
  Minimize2,
  PenLine,
  Search,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { ConvStep, StreamStep, WorkflowResponse } from "./types";

type WorkflowSectionConnectorProps = {
  response: WorkflowResponse | null;
  needsGmail: boolean;
  gmailConnected: boolean;
  gmailEmail: string | null;
  pendingPrompt: string | null;
  isLoading: boolean;
  connectorStatusLoading: boolean;
  handleConnectGmail: () => void;
  handleRecheckGmailConnection: () => void;
  handleContinueWorkflow: () => void;
  handleActivateFlow: () => void;
  activatingFlow: boolean;
  activateFlowResult: { ok: boolean; message: string } | null;
  completionResult?: {
    status: string;
    message: string;
    rule_id?: number;
    reply_sent?: string | null;
    reply_draft?: string | null;
    analysis?: string | null;
    delivery_status?: string;
    execution_type?: string;
    from_email?: string;
    subject?: string;
  } | null;
  convStep?: ConvStep;
  /** Live step events from the SSE streaming endpoint */
  streamingSteps?: StreamStep[];
};

type FlowNodeStatus = "pending" | "running" | "completed" | "failed";

type FlowNodeData = {
  label: ReactNode;
  status: FlowNodeStatus;
};

type IntentDetails = {
  operation: string;
  executionType: string;
  fromEmail: string;
  sendDirectly: boolean | null;
};

type WorkflowStage =
  | "request"
  | "intent"
  | "search"
  | "read"
  | "extract"
  | "reply"
  | "draft"
  | "send"
  | "automation"
  | "completed"
  | "unknown";

type StepDisplayMeta = {
  stage: WorkflowStage;
  stageLabel: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
};

type WorkflowDisplayStep = {
  id: string;
  stepNumber: number;
  name: string;
  operation?: string | null;
  description?: string | null;
  output?: string | null;
  durationMs?: number | null;
  status: FlowNodeStatus;
};

function normalizeStepKey(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function matchesStep(stepName: string, aliases: string[]) {
  const normalized = normalizeStepKey(stepName);
  return aliases.some((alias) => normalized.includes(alias));
}

function fallbackStepTitle(stepName: string, operation?: string | null) {
  return humanStepName((stepName || operation || "Workflow Step").trim());
}

function getStepDisplayMeta(
  stepName?: string | null,
  operation?: string | null,
): StepDisplayMeta {
  const composite = `${operation || ""} ${stepName || ""}`;
  const normalized = normalizeStepKey(composite);

  if (
    normalized.includes("interpret_gmail_intent") ||
    normalized.includes("understand_user_request") ||
    normalized.includes("analyze_intent")
  ) {
    return {
      stage: "intent",
      stageLabel: "Intent Understanding",
      title: "Understanding User Request",
      subtitle: "Understanding what you want to do with Gmail.",
      icon: <Brain className="h-4 w-4" />,
    };
  }

  if (
    matchesStep(normalized, [
      "search_email",
      "search_emails",
      "search_thread",
      "search_threads",
      "search_gmail_threads",
      "find_thread",
      "find_threads",
      "gmail_search",
      "lookup_email",
    ])
  ) {
    return {
      stage: "search",
      stageLabel: "Gmail Search",
      title: "Searching Gmail Inbox",
      subtitle: "Searching your Gmail inbox for matching messages.",
      icon: <Search className="h-4 w-4" />,
    };
  }

  if (
    matchesStep(normalized, [
      "read_email",
      "read_thread",
      "read_message",
      "fetch_latest_thread",
      "get_thread",
      "open_thread",
      "inspect_thread",
    ])
  ) {
    return {
      stage: "read",
      stageLabel: "Email Reading",
      title: "Reading Email Content",
      subtitle: "Opening the latest thread and reading the message.",
      icon: <Mail className="h-4 w-4" />,
    };
  }

  if (
    matchesStep(normalized, [
      "extract_key_details",
      "extract_details",
      "parse_details",
      "summarize_thread",
      "summarize_email",
      "analyze_thread",
      "analyze_email",
    ])
  ) {
    return {
      stage: "extract",
      stageLabel: "AI Extraction",
      title: "Extracting Key Details",
      subtitle: "Extracting the key details and action items.",
      icon: <Sparkles className="h-4 w-4" />,
    };
  }

  if (
    matchesStep(normalized, [
      "generate_reply",
      "prepare_reply",
      "compose_reply",
      "draft_reply",
      "write_reply",
    ])
  ) {
    return {
      stage: "reply",
      stageLabel: "AI Reply",
      title: "Preparing AI Reply",
      subtitle: "Composing and sending your reply.",
      icon: <PenLine className="h-4 w-4" />,
    };
  }

  if (matchesStep(normalized, ["create_draft", "save_draft", "gmail_draft"])) {
    return {
      stage: "draft",
      stageLabel: "Gmail Draft",
      title: "Creating Gmail Draft",
      subtitle: "Preparing a draft for later review.",
      icon: <PenLine className="h-4 w-4" />,
    };
  }

  if (
    matchesStep(normalized, [
      "send_reply",
      "send_email",
      "dispatch_reply",
      "deliver_reply",
    ])
  ) {
    return {
      stage: "send",
      stageLabel: "Email Delivery",
      title: "Sending Email Reply",
      subtitle: "Dispatching your email through Gmail.",
      icon: <Send className="h-4 w-4" />,
    };
  }

  if (
    matchesStep(normalized, [
      "activate_automation",
      "enable_automation",
      "create_rule",
      "create_automation",
      "activate_rule",
    ])
  ) {
    return {
      stage: "automation",
      stageLabel: "Automation",
      title: "Activating Automation Rule",
      subtitle: "Registering a persistent automation rule.",
      icon: <Sparkles className="h-4 w-4" />,
    };
  }

  if (
    matchesStep(normalized, [
      "complete",
      "completed",
      "finalize",
      "finish",
      "done",
    ])
  ) {
    return {
      stage: "completed",
      stageLabel: "Completed",
      title: "Workflow Completed",
      subtitle: "The workflow run has finished.",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }

  return {
    stage: "unknown",
    stageLabel: "Workflow Step",
    title: fallbackStepTitle(stepName || operation || ""),
    subtitle: "Executing the next workflow action.",
    icon: getFallbackStepIcon(stepName, operation),
  };
}

function getStepIcon(stepName?: string | null, operation?: string | null) {
  const text = `${operation || ""} ${stepName || ""}`.toLowerCase();
  if (text.includes("search")) return <Search className="h-4 w-4" />;
  if (text.includes("thread") || text.includes("mail"))
    return <Mail className="h-4 w-4" />;
  if (text.includes("reply") || text.includes("send"))
    return <Send className="h-4 w-4" />;
  if (text.includes("draft")) return <PenLine className="h-4 w-4" />;
  if (text.includes("summar") || text.includes("report"))
    return <FileText className="h-4 w-4" />;
  if (text.includes("generat") || text.includes("llm"))
    return <Sparkles className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

function getFallbackStepIcon(
  stepName?: string | null,
  operation?: string | null,
) {
  return getStepIcon(stepName, operation);
}

function getStatusLabel(status: FlowNodeStatus) {
  switch (status) {
    case "running":
      return "Executing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return "Waiting";
  }
}

function getStatusDetail(status: FlowNodeStatus) {
  switch (status) {
    case "running":
      return "AI agent is currently executing this step...";
    case "completed":
      return "Step finished successfully.";
    case "failed":
      return "The agent hit an error while running this step.";
    default:
      return "Waiting for the agent to reach this step.";
  }
}

function shorten(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).trimEnd()}...`;
}

function humanStepName(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeStatus(status?: string | null): FlowNodeStatus {
  const value = String(status || "").toLowerCase();
  if (value === "running") return "running";
  if (value === "completed" || value === "success" || value === "done")
    return "completed";
  if (value === "failed" || value === "error") return "failed";
  return "pending";
}

function resolveIntentDetails(intentValue: unknown): IntentDetails {
  if (
    !intentValue ||
    typeof intentValue !== "object" ||
    Array.isArray(intentValue)
  ) {
    return {
      operation: "",
      executionType: "",
      fromEmail: "",
      sendDirectly: null,
    };
  }

  const intent = intentValue as Record<string, unknown>;
  const operation =
    (typeof intent.operation === "string" && intent.operation) ||
    (typeof intent.intent === "string" && intent.intent) ||
    (typeof intent.type === "string" && intent.type) ||
    (typeof intent.name === "string" && intent.name) ||
    "";
  const executionType =
    (typeof intent.execution_type === "string" && intent.execution_type) ||
    (typeof intent.executionType === "string" && intent.executionType) ||
    "";
  const fromEmail =
    (typeof intent.from_email === "string" && intent.from_email) ||
    (typeof intent.sender_email === "string" && intent.sender_email) ||
    (typeof intent.from === "string" && intent.from) ||
    "";
  const sendDirectlyValue = intent.send_directly;
  const sendDirectly =
    typeof sendDirectlyValue === "boolean"
      ? sendDirectlyValue
      : typeof sendDirectlyValue === "string"
        ? sendDirectlyValue.toLowerCase() === "true"
        : null;

  return {
    operation,
    executionType,
    fromEmail,
    sendDirectly,
  };
}

function buildDisplaySteps(
  response: WorkflowResponse | null,
  streamingSteps: StreamStep[],
): WorkflowDisplayStep[] {
  if (streamingSteps.length > 0) {
    return streamingSteps.map((step, index) => ({
      id: step.step_id || `stream-${index + 1}`,
      stepNumber: Number(step.step) || index + 1,
      name: step.name || "workflow_step",
      output: step.output || null,
      durationMs: step.duration_ms ?? null,
      status: normalizeStatus(step.status),
    }));
  }

  const planSteps = response?.plan?.steps || [];

  return planSteps.map((step, index) => ({
    id: step.id || `plan-${index + 1}`,
    stepNumber: index + 1,
    name: step.name || "workflow_step",
    operation: step.operation || null,
    description: step.description || null,
    output: step.description || null,
    durationMs: null,
    status: "completed",
  }));
}

function getExecutionNodeTitle(status: FlowNodeStatus) {
  if (status === "running")
    return "AI agent is currently executing this step...";
  if (status === "completed") return "Execution completed successfully.";
  if (status === "failed") return "Execution stopped because of an error.";
  return "Waiting for execution to begin.";
}

function getNodeTheme(status: FlowNodeStatus) {
  switch (status) {
    case "completed":
      return {
        border: "#bbf7d0",
        iconBg: "bg-emerald-500 text-white",
        badgeBg: "bg-emerald-50 text-emerald-600",
        badgeText: "done",
      };
    case "running":
      return {
        border: "#c7d2fe",
        iconBg: "bg-indigo-500 text-white",
        badgeBg: "bg-indigo-50 text-indigo-600",
        badgeText: "running",
      };
    case "failed":
      return {
        border: "#fecaca",
        iconBg: "bg-rose-500 text-white",
        badgeBg: "bg-rose-50 text-rose-600",
        badgeText: "failed",
      };
    default:
      return {
        border: "#e2e8f0",
        iconBg: "bg-slate-100 text-slate-500",
        badgeBg: "bg-slate-100 text-slate-600",
        badgeText: "pending",
      };
  }
}

function StatusBadge({
  status,
  showSpinner,
}: {
  status: FlowNodeStatus;
  showSpinner?: boolean;
}) {
  const theme = getNodeTheme(status);
  const badgeLabel = getStatusLabel(status);

  if (status === "running") {
    return (
      <span
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badgeBg}`}
      >
        {showSpinner ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        ) : (
          <Clock className="h-2.5 w-2.5" />
        )}
        {badgeLabel}
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badgeBg}`}
      >
        <CheckCircle2 className="h-2.5 w-2.5" />
        {badgeLabel}
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badgeBg}`}
      >
        <XCircle className="h-2.5 w-2.5" />
        {badgeLabel}
      </span>
    );
  }

  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badgeBg}`}
    >
      <Clock className="h-2.5 w-2.5" />
      {badgeLabel}
    </span>
  );
}

function WorkflowNodeCard({
  stepLabel,
  title,
  subtitle,
  statusDetail,
  output,
  durationMs,
  status,
  icon,
  isIntent = false,
}: {
  stepLabel: string;
  title: string;
  subtitle?: string;
  statusDetail?: string;
  output?: string;
  durationMs?: number | null;
  status: FlowNodeStatus;
  icon: ReactNode;
  isIntent?: boolean;
}) {
  const theme = getNodeTheme(status);
  const isRunning = status === "running";

  return (
    <>
      <style>{`
        @keyframes pulseRing {
          0%,100%{box-shadow:0 0 0 3px rgba(99,102,241,0.15)}
          50%{box-shadow:0 0 0 7px rgba(99,102,241,0.35)}
        }
      `}</style>
      <div
        className={`min-w-[320px] max-w-[400px] rounded-[14px] border bg-white px-4 py-3 ${
          isRunning ? "" : "shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        }`}
        style={{
          borderColor: theme.border,
          boxShadow: isRunning ? "0 0 0 4px rgba(99,102,241,0.2)" : undefined,
          animation: isRunning ? "pulseRing 1.5s ease infinite" : "none",
        }}
      >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] ${theme.iconBg}`}
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              {stepLabel}
            </p>
            <StatusBadge status={status} showSpinner={isRunning && !isIntent} />
          </div>

          <h4 className="mt-1 text-sm font-semibold text-slate-900">{title}</h4>

          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {subtitle}
            </p>
          ) : null}

          <p
            className={`mt-2 rounded-xl border px-3 py-2 text-[11px] font-medium leading-relaxed ${
              status === "running"
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : status === "completed"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : status === "failed"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {statusDetail || getExecutionNodeTitle(status)}
          </p>

          {output ? (
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Output preview
              </p>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                {shorten(output, 120)}
              </p>
            </div>
          ) : null}

          {durationMs != null ? (
            <p className="mt-1.5 text-[10px] text-slate-400">{durationMs} ms</p>
          ) : null}
        </div>
      </div>
    </div>
    </>
  );
}

function WorkflowViewportSync({
  nodeCount,
  viewportKey,
}: {
  nodeCount: number;
  viewportKey: string;
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodeCount <= 0) return;

    const timeout = window.setTimeout(() => {
      fitView({ padding: 0.18, duration: 400, maxZoom: 1.1 });
    }, 60);

    return () => window.clearTimeout(timeout);
  }, [fitView, nodeCount, viewportKey]);

  return null;
}

function WorkflowSectionConnectorInner(props: WorkflowSectionConnectorProps) {
  const {
    response,
    needsGmail,
    gmailConnected,
    gmailEmail,
    pendingPrompt,
    isLoading,
    connectorStatusLoading,
    handleConnectGmail,
    handleRecheckGmailConnection,
    handleContinueWorkflow,
    handleActivateFlow,
    activatingFlow,
    activateFlowResult,
    completionResult,
    convStep,
    streamingSteps = [],
  } = props;

  const connectors =
    response?.plan?.steps
      ?.map((step) => step.system)
      .filter((value): value is string => Boolean(value)) || [];
  const uniqueConnectors = [...new Set(connectors)];
  const intentDetails = useMemo(
    () => resolveIntentDetails(response?.plan?.gmail_intent),
    [response?.plan?.gmail_intent],
  );
  const displaySteps = useMemo(
    () => buildDisplaySteps(response, streamingSteps),
    [response, streamingSteps],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGmailPopoverOpen, setIsGmailPopoverOpen] = useState(false);
  const gmailBadgeRef = useRef<HTMLDivElement | null>(null);

  const isStreaming =
    convStep === "streaming" ||
    (streamingSteps.length > 0 && convStep !== "done" && convStep !== "idle");
  const hasWorkflowNodes = nodes.length > 0;

  useEffect(() => {
    console.log("[Connector Debug] Workflow panel render state:", {
      hasResponse: Boolean(response),
      response,
      streamingSteps,
      convStep,
      isStreaming,
    });
  }, [response, streamingSteps, convStep, isStreaming]);

  useEffect(() => {
    if (!needsGmail) {
      setIsGmailPopoverOpen(false);
    }
  }, [needsGmail]);

  useEffect(() => {
    if (!isGmailPopoverOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        gmailBadgeRef.current &&
        !gmailBadgeRef.current.contains(target)
      ) {
        setIsGmailPopoverOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [isGmailPopoverOpen]);

  const workflowGraphSignature = useMemo(() => {
    const responseSignature = response
      ? {
          goal: response.plan?.goal ?? null,
          steps: (response.plan?.steps || []).map((step) => ({
            id: step.id || "",
            kind: step.kind || "",
            name: step.name || "",
            description: step.description || null,
            system: step.system || null,
            operation: step.operation || null,
            requires_approval: Boolean(step.requires_approval),
            output: step.output || null,
          })),
          can_execute: Boolean(response.can_execute),
          missing_field: response.missing_field || null,
          summary: response.summary || null,
          message: response.message || null,
          status: response.status || null,
          connector: response.connector || null,
          execution_type: response.execution_type || null,
          reply_sent: response.reply_sent || null,
          reply_draft: response.reply_draft || null,
          final_answer: response.final_answer || null,
        }
      : null;

    const streamingSignature = streamingSteps.map((step) => ({
      step: step.step,
      step_id: step.step_id,
      name: step.name,
      status: step.status,
      output: step.output,
      duration_ms: step.duration_ms ?? null,
      error: step.error ?? null,
    }));

    const completionSignature = completionResult
      ? {
          status: completionResult.status,
          message: completionResult.message,
          rule_id: completionResult.rule_id ?? null,
          reply_sent: completionResult.reply_sent ?? null,
          reply_draft: completionResult.reply_draft ?? null,
          analysis: completionResult.analysis ?? null,
          delivery_status: completionResult.delivery_status ?? null,
          execution_type: completionResult.execution_type ?? null,
          from_email: completionResult.from_email ?? null,
          subject: completionResult.subject ?? null,
        }
      : null;

    return JSON.stringify({
      response: responseSignature,
      streamingSteps: streamingSignature,
      convStep: convStep || "idle",
      pendingPrompt: pendingPrompt || null,
      completionResult: completionSignature,
    });
  }, [completionResult, convStep, pendingPrompt, response, streamingSteps]);

  useEffect(() => {
    const nextNodes: Node<FlowNodeData>[] = [];
    const nextEdges: Edge[] = [];
    const shouldShowIntent = Boolean(response || streamingSteps.length > 0);

    if (!shouldShowIntent) {
      setNodes((current) => (current.length === 0 ? current : []));
      setEdges((current) => (current.length === 0 ? current : []));
      return;
    }

    const activeDisplaySteps = displaySteps;
    const intentStepIndex = activeDisplaySteps.findIndex((step) => {
      const meta = getStepDisplayMeta(step.name, step.operation);
      return meta.stage === "intent";
    });

    const intentStep =
      intentStepIndex >= 0 ? activeDisplaySteps[intentStepIndex] : undefined;
    const remainingSteps = intentStep
      ? activeDisplaySteps.filter((step) => step.id !== intentStep.id)
      : activeDisplaySteps;

    const requestStatus: FlowNodeStatus =
      activeDisplaySteps.length > 0 || response?.plan?.goal
        ? "completed"
        : "pending";
    const requestSubtitle =
      pendingPrompt ||
      response?.plan?.goal ||
      "The user request is being translated into an execution plan.";

    nextNodes.push({
      id: "node-request",
      type: "default",
      position: { x: 300, y: 0 },
      style: {
        background: "transparent",
        border: "none",
        padding: 0,
        width: 400,
      },
      data: {
        label: (
          <WorkflowNodeCard
            stepLabel="STEP 1 - USER REQUEST"
            title="User Request"
            subtitle={requestSubtitle}
            statusDetail={getExecutionNodeTitle(requestStatus)}
            status={requestStatus}
            icon={<Brain className="h-4 w-4" />}
          />
        ),
        status: requestStatus,
      },
    });

    let previousNodeId = "node-request";

    const intentStatus: FlowNodeStatus =
      intentStep?.status ||
      (activeDisplaySteps.length > 0 ? "completed" : "pending");
    const intentSubtitleParts: string[] = [];

    if (intentDetails.operation)
      intentSubtitleParts.push(intentDetails.operation);
    if (intentDetails.fromEmail)
      intentSubtitleParts.push(`from ${intentDetails.fromEmail}`);
    if (intentDetails.executionType) {
      intentSubtitleParts.push(intentDetails.executionType.replace(/_/g, " "));
    }
    if (typeof intentDetails.sendDirectly === "boolean") {
      intentSubtitleParts.push(
        intentDetails.sendDirectly ? "send directly" : "draft first",
      );
    }

    const intentMeta = getStepDisplayMeta(
      intentStep?.name,
      intentStep?.operation,
    );
    nextNodes.push({
      id: "node-intent",
      type: "default",
      position: { x: 300, y: 150 },
      style: {
        background: "transparent",
        border: "none",
        padding: 0,
        width: 400,
      },
      data: {
        label: (
          <WorkflowNodeCard
            stepLabel="STEP 2 - INTENT UNDERSTANDING"
            title={intentMeta.title}
            subtitle={intentSubtitleParts.join(" - ") || intentMeta.subtitle}
            statusDetail={getExecutionNodeTitle(intentStatus)}
            status={intentStatus}
            icon={intentMeta.icon}
            isIntent
          />
        ),
        status: intentStatus,
      },
    });

    nextEdges.push({
      id: "node-request->node-intent",
      source: "node-request",
      target: "node-intent",
      type: "smoothstep",
      animated: intentStatus === "running",
      style: {
        stroke: "#6366f1",
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#6366f1",
      },
    });

    remainingSteps.forEach((step, index) => {
      const meta = getStepDisplayMeta(step.name, step.operation);
      const stepId = `step-${step.stepNumber}-${index}`;
      const stepStatus = step.status;
      const stepSubtitle = step.description || meta.subtitle;
      const stepNumber = index + 3;

      nextNodes.push({
        id: stepId,
        type: "default",
        position: { x: 300, y: (index + 2) * 150 },
        style: {
          background: "transparent",
          border: "none",
          padding: 0,
          width: 400,
        },
        data: {
          label: (
            <WorkflowNodeCard
              stepLabel={`STEP ${stepNumber} - ${meta.stageLabel.toUpperCase()}`}
              title={meta.title}
              subtitle={stepSubtitle}
              statusDetail={getStatusDetail(stepStatus)}
              output={step.output || undefined}
              durationMs={step.durationMs ?? null}
              status={stepStatus}
              icon={meta.icon}
            />
          ),
          status: stepStatus,
        },
      });

      nextEdges.push({
        id: `${previousNodeId}->${stepId}`,
        source: previousNodeId,
        target: stepId,
        type: "smoothstep",
        animated: stepStatus === "running",
        style: {
          stroke: "#6366f1",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#6366f1",
        },
      });

      previousNodeId = stepId;
    });

    const shouldShowCompletionNode =
      activeDisplaySteps.length > 0 ||
      Boolean(completionResult) ||
      convStep === "done" ||
      response?.can_execute;
    if (shouldShowCompletionNode) {
      const completionStatus: FlowNodeStatus =
        convStep === "done" || Boolean(completionResult)
          ? "completed"
          : "pending";
      const completionNodeId = "node-completed";
      nextNodes.push({
        id: completionNodeId,
        type: "default",
        position: { x: 300, y: (remainingSteps.length + 2) * 150 },
        style: {
          background: "transparent",
          border: "none",
          padding: 0,
          width: 400,
        },
        data: {
          label: (
            <WorkflowNodeCard
              stepLabel={`STEP ${remainingSteps.length + 3} - COMPLETED`}
              title="Workflow Completed"
              subtitle="The live execution trail has finished."
              statusDetail={getExecutionNodeTitle(completionStatus)}
              output={
                completionResult?.message || response?.summary || undefined
              }
              status={completionStatus}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          ),
          status: completionStatus,
        },
      });

      nextEdges.push({
        id: `${previousNodeId}->${completionNodeId}`,
        source: previousNodeId,
        target: completionNodeId,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "#6366f1",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#6366f1",
        },
      });
    }

    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [workflowGraphSignature]);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  const renderCanvas = (fullscreen = false, showHeader = true) => (
    <div
      className={`relative flex min-h-0 flex-1 flex-col ${fullscreen ? "h-full" : ""}`}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {showHeader && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-[#f8fafc] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                <Brain className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  AI Agent Execution
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  Live workflow reasoning and action trail
                </p>
                {fullscreen ? (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Press Escape to return
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {needsGmail && (
                <div ref={gmailBadgeRef} className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setIsGmailPopoverOpen((current) => !current)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-medium transition ${
                      gmailConnected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    }`}
                    title={
                      gmailConnected ? "Gmail connected" : "Gmail not connected"
                    }
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        gmailConnected ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />

                    <Mail className="h-3.5 w-3.5" />

                    <span className="max-w-[130px] truncate">
                      {gmailConnected
                        ? gmailEmail || "Connected"
                        : "Not connected"}
                    </span>
                  </button>

                  {isGmailPopoverOpen && (
                    <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/70">
                      {!gmailConnected && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsGmailPopoverOpen(false);
                            handleConnectGmail();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#525ceb] transition hover:bg-indigo-50"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Connect Gmail
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsGmailPopoverOpen(false);
                          handleRecheckGmailConnection();
                        }}
                        disabled={connectorStatusLoading}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {connectorStatusLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}

                        <span>
                          {connectorStatusLoading ? "Checking..." : "Recheck"}
                        </span>
                      </button>

                      {gmailConnected && pendingPrompt && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsGmailPopoverOpen(false);
                            handleContinueWorkflow();
                          }}
                          disabled={isLoading}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}

                          <span>
                            {isLoading ? "Continuing..." : "Continue"}
                          </span>
                        </button>
                      )}

                      {gmailConnected && (
                        <button
                          type="button"
                          onClick={() => setIsGmailPopoverOpen(false)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Disconnect
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                  isStreaming
                    ? "bg-indigo-50 text-indigo-600"
                    : convStep === "done"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {isStreaming ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Executing
                  </span>
                ) : convStep === "done" ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Completed
                  </span>
                ) : (
                  "Waiting"
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreen((current) => !current)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                title={fullscreen ? "Exit fullscreen" : "Fullscreen workflow"}
              >
                {fullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="relative min-h-[540px] flex-1 bg-white">
          {hasWorkflowNodes ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              panOnDrag
              minZoom={0.35}
              maxZoom={1.4}
            >
              <WorkflowViewportSync
                nodeCount={nodes.length}
                viewportKey={`${fullscreen ? "fullscreen" : "panel"}:${streamingSteps.length}:${convStep || "idle"}`}
              />
              <Background color="#e2e8f0" gap={40} size={1} />
              <Controls className="overflow-hidden rounded-xl border border-slate-200 shadow-xl" />
            </ReactFlow>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <i
                className="ti ti-git-branch text-slate-300"
                style={{ fontSize: 32 }}
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-slate-400">
                Workflow steps will appear here
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Run a prompt to see live agent execution
              </p>
            </div>
          )}
        </div>

        {streamingSteps.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 max-h-[180px] overflow-y-auto">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Live Execution Log
            </p>
            <div className="space-y-1 font-mono text-[11px]">
              {streamingSteps.map((step, i) => (
                <div
                  key={step.step_id || i}
                  className={
                    step.status === "completed"
                      ? "text-emerald-700"
                      : step.status === "running"
                        ? "text-indigo-600 font-bold"
                        : step.status === "failed"
                          ? "text-rose-600"
                          : "text-slate-400"
                  }
                >
                  {step.status === "completed" &&
                    `[${step.step}] ✓ ${step.name}${step.duration_ms != null ? ` — ${step.duration_ms}ms` : ""}`}
                  {step.status === "running" && `[${step.step}] ⟳ ${step.name}...`}
                  {step.status === "failed" &&
                    `[${step.step}] ✗ ${step.name}${step.error ? ` — ${step.error}` : ""}`}
                  {step.status === "pending" && `[${step.step}] · ${step.name}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const goalBlock =
    response?.plan?.goal || response?.missing_field ? (
      <div className="flex flex-col overflow-hidden space-y-4">
        {response?.plan?.goal && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Goal
              </p>
              {intentDetails.operation && (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                  {String(intentDetails.operation).replace(/_/g, " ")}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {response.plan.goal}
            </p>
          </div>
        )}

        {response?.can_execute && response?.flow && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Ready to activate
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              This automation flow can be saved and enabled now.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleActivateFlow}
                disabled={activatingFlow || activateFlowResult?.ok === true}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activatingFlow
                  ? "Activating..."
                  : activateFlowResult?.ok
                    ? "Activated ✓"
                    : "Activate automation"}
              </button>
              {activateFlowResult && (
                <p
                  className={`text-sm font-medium ${activateFlowResult.ok ? "text-emerald-700" : "text-rose-600"}`}
                >
                  {activateFlowResult.message}
                </p>
              )}
            </div>
          </div>
        )}

        {uniqueConnectors.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Connectors
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {uniqueConnectors.map((connector) => (
                <span
                  key={connector}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                >
                  {connector}
                </span>
              ))}
            </div>
          </div>
        )}

        {/*
        {response?.plan?.steps?.length ? (
          <div className="h-[420px] w-full flex-shrink-0 pb-4">
            <WorkflowSummaryConnector response={response} />
          </div>
        ) : null}
        */}
      </div>
    ) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Workflow
      </p>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
        {renderCanvas(false, true)}

        {goalBlock}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-[99999] bg-slate-100 p-4">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-300/50">
            <div className="border-b border-slate-100 bg-[#f8fafc] px-8 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                    <Brain className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-tight text-[#1a1c3d]">
                      Workflow Canvas
                    </h2>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Press Escape to return
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                  title="Exit fullscreen"
                >
                  <Minimize2 className="h-4 w-4" />
                  Exit
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1">{renderCanvas(true, false)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowSectionConnector(
  props: WorkflowSectionConnectorProps,
) {
  return (
    <ReactFlowProvider>
      <WorkflowSectionConnectorInner {...props} />
    </ReactFlowProvider>
  );
}

