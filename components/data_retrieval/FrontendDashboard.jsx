"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChatSection from "./ChatSection";
import MapSection from "./MapSection";
import ResizableDashboardLayout from "./ResizableDashboardLayout";
import ThemeToggle from "./ThemeToggle";
import WorkflowSection from "./WorkflowSection";
import { API_BASE_URL, apiUrl } from "@/lib/api-client";
import { downloadStageWordReport } from "@/lib/data-retrieval/stageWordReport";

export default function FrontendDashboard() {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  // Always uses data_retrieval_agent_v2; provider/model from global navbar (Header.tsx).

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [metricsText, setMetricsText] = useState("Latency: --s");
  const [totalTokens, setTotalTokens] = useState(0);
  const [tokenEvents, setTokenEvents] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [stageCards, setStageCards] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [pipelineCatalog, setPipelineCatalog] = useState([]);
  const [stageReport, setStageReport] = useState(null);
  const [clarificationState, setClarificationState] = useState({
    awaiting: false,
    meta: null,
    selectedOptions: [],
    otherText: "",
    fieldValues: {},
  });

  const eventSourceRef = useRef(null);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem("reai-session-id") || "";
      setSessionId(stored);
    });
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  function resetRunState() {
    setStageCards([]);
    setPipelineStages([]);
    setPipelineCatalog([]);
    setStageReport(null);
    setMetricsText("Streaming from backend...");
    setTotalTokens(0);
    setTokenEvents([]);
  }

  function upsertPipelineStage(stage) {
    if (!stage?.id) {
      return;
    }
    setPipelineStages((current) => {
      const index = current.findIndex((item) => item.id === stage.id);
      if (index === -1) {
        return [...current, stage].sort(
          (left, right) => (left.order || 0) - (right.order || 0),
        );
      }
      const next = [...current];
      next[index] = { ...next[index], ...stage };
      return next;
    });
  }

  function addStageCard(kind, title, payload, subtitle = "", icon = "⚙️") {
    setStageCards((current) => [
      ...current,
      {
        id: `${kind}-${current.length + 1}-${Date.now()}`,
        kind,
        title,
        subtitle,
        payload,
        icon,
        status: kind.toUpperCase(),
      },
    ]);
  }

  function appendStageDetail(text) {
    if (!text) {
      return;
    }

    setStageCards((current) => {
      if (!current.length) {
        return current;
      }

      const next = [...current];
      const last = next[next.length - 1];
      const previousText = String(last.payload || "").trim();
      const incomingText = String(text).trim();
      if (!incomingText) {
        return current;
      }
      if (previousText.includes(incomingText)) {
        return current;
      }

      next[next.length - 1] = {
        ...last,
        payload: previousText
          ? `${previousText}\n${incomingText}`
          : incomingText,
      };
      return next;
    });
  }

  function summarizePlan(plan) {
    const steps = Array.isArray(plan?.steps) ? plan.steps : [];
    if (!steps.length) {
      return "Planner returned no concrete steps.";
    }
    return steps
      .map(
        (step, index) => `${index + 1}. ${String(step).replaceAll("_", " ")}`,
      )
      .join("\n");
  }

  function summarizeTools(selections) {
    if (!Array.isArray(selections) || !selections.length) {
      return "No specific tools selected for this run.";
    }
    return selections
      .map((selection) => {
        const step = String(selection.step || "step").replaceAll("_", " ");
        const tool = selection.tool_name || "unknown tool";
        return `${step}: ${tool}`;
      })
      .join("\n");
  }

  function summarizeSql(sql) {
    if (!sql) {
      return "SQL generation skipped.";
    }
    const compact = String(sql).replace(/\s+/g, " ").trim();
    return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
  }

  function handleClarificationToggle(optionId) {
    setClarificationState((current) => {
      if (optionId === "no_details") {
        return {
          ...current,
          selectedOptions: current.selectedOptions.includes(optionId)
            ? []
            : ["no_details"],
        };
      }

      const filtered = current.selectedOptions.filter(
        (item) => item !== "no_details",
      );
      return {
        ...current,
        selectedOptions: filtered.includes(optionId)
          ? filtered.filter((item) => item !== optionId)
          : [...filtered, optionId],
      };
    });
  }

  function formatClarificationAnswerLines(fieldValues, fields) {
    const lines = [];
    const schemas = Array.isArray(fields) ? fields : [];
    const schemaByField = new Map(
      schemas.map((schema) => [schema.field, schema]),
    );

    for (const [field, rawValue] of Object.entries(fieldValues || {})) {
      const value = String(rawValue || "").trim();
      if (!value) {
        continue;
      }
      const schema = schemaByField.get(field);
      const label =
        schema?.label || field.replaceAll("__", ": ").replaceAll("_", " ");
      lines.push(`${label}: ${value}`);
    }
    return lines;
  }

  function buildSubmissionPayload() {
    const freeText = input.trim();

    if (clarificationState.awaiting) {
      const structuredLines = formatClarificationAnswerLines(
        clarificationState.fieldValues,
        clarificationState.meta?.fields,
      );
      if (!structuredLines.length && !freeText) {
        return null;
      }
      const answerText = [...structuredLines, freeText]
        .filter(Boolean)
        .join("\n");
      const originalQuery = clarificationState.meta?.original_query || "";
      const requestText = originalQuery
        ? `${originalQuery}\nClarification answer: ${answerText}`
        : answerText;
      return {
        requestText,
        displayText: answerText,
      };
    }

    if (
      !clarificationState.awaiting ||
      clarificationState.meta?.clarification_type !== "space_filter"
    ) {
      return freeText ? { requestText: freeText, displayText: freeText } : null;
    }

    if (
      !clarificationState.selectedOptions.length &&
      !freeText &&
      !clarificationState.otherText.trim()
    ) {
      return null;
    }

    const optionMap = new Map(
      (clarificationState.meta.options || []).map((option) => [
        option.id,
        option.label,
      ]),
    );
    const noDetails = clarificationState.selectedOptions.includes("no_details");
    const requestLines = [
      "Space clarification response:",
      `selected_options=${clarificationState.selectedOptions.join(",") || "none"}`,
    ];
    const displayLines = [];

    if (clarificationState.selectedOptions.length) {
      displayLines.push(
        `Selected: ${clarificationState.selectedOptions.map((option) => optionMap.get(option) || option).join(", ")}`,
      );
    }
    if (noDetails) {
      requestLines.push("user_does_not_have_more_space_details=true");
    }
    if (clarificationState.otherText.trim()) {
      requestLines.push(`other_text=${clarificationState.otherText.trim()}`);
      displayLines.push(`Other: ${clarificationState.otherText.trim()}`);
    }
    if (freeText) {
      requestLines.push(`additional_details=${freeText}`);
      displayLines.push(freeText);
    }

    return {
      requestText: requestLines.join("\n"),
      displayText: displayLines.join("\n") || "Do not have details.",
    };
  }

  function finalizeStream(metrics) {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setIsStreaming(false);
    if (metrics) {
      setTotalTokens(metrics.total_tokens || 0);
      setMetricsText(
        `Latency: ${metrics.duration_seconds}s | Tokens: ${metrics.total_tokens}`,
      );
    }
  }

  function handleSubmit() {
    if (isStreaming) {
      return;
    }

    const submission = buildSubmissionPayload();
    if (!submission) {
      return;
    }

    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: submission.displayText,
        time: new Date(),
      },
      {
        id: assistantId,
        role: "assistant",
        content: "",
        time: new Date(),
        resultSets: [],
      },
    ]);

    setClarificationState({
      awaiting: false,
      meta: null,
      selectedOptions: [],
      otherText: "",
      fieldValues: {},
    });
    setInput("");
    setIsStreaming(true);
    resetRunState();

    const params = new URLSearchParams({ question: submission.requestText });
    if (sessionId) {
      params.set("session_id", sessionId);
    }
    params.set(
      "model",
      window.localStorage.getItem("sigmavalue_llm_model") || "gpt-4o-mini",
    );

    const streamPath = "/aks_stream_data_retrieval_agent_v2";
    const source = new EventSource(
      apiUrl(`${streamPath}?${params.toString()}`),
    );
    eventSourceRef.current = source;

    source.onmessage = (message) => {
      const data = JSON.parse(message.data);

      switch (data.type) {
        case "session": {
          const nextSessionId = data.content?.session_id;
          if (nextSessionId) {
            setSessionId(nextSessionId);
            window.localStorage.setItem("reai-session-id", nextSessionId);
          }
          break;
        }
        case "agent_route":
          addStageCard(
            "router",
            "Super Agent Route",
            `Selected: ${data.content?.agent_route || "mixed"}\nConfidence: ${data.content?.confidence ?? "--"}\nReason: ${data.content?.reason || "Router selected a domain path."}\nSignals: ${(data.content?.debug_trace?.matched_signals || []).join(", ") || "none"}`,
            "Domain routing decision before execution.",
            "🧭",
          );
          break;
        case "start":
          break;
        case "pipeline_catalog":
          setPipelineCatalog(
            Array.isArray(data.content?.stages) ? data.content.stages : [],
          );
          break;
        case "pipeline_stage":
          if (data.content) upsertPipelineStage(data.content);
          break;
        case "stage":
          break;
        case "intent":
          appendStageDetail(
            `Intent recognized: ${data.content?.intent || "unknown"}`,
          );
          break;
        case "plan":
          appendStageDetail(`Plan:\n${summarizePlan(data.content)}`);
          break;
        case "tool_selections":
          appendStageDetail(`Tools:\n${summarizeTools(data.content)}`);
          break;
        case "sql_query":
          appendStageDetail(`SQL ready:\n${summarizeSql(data.content)}`);
          break;
        case "observation_preview":
          appendStageDetail(`Result: ${data.content}`);
          break;
        case "result_set":
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? {
                    ...item,
                    resultSets: [...(item.resultSets || []), data.content],
                  }
                : item,
            ),
          );
          break;
        case "action":
          appendStageDetail(`Action: ${data.content}`);
          break;
        case "debug_trace":
          break;
        case "token_usage":
          if (data.content) {
            const stageName = String(
              data.content.stage || data.content.stage_name || "unknown stage",
            );
            const event = {
              id: `${stageName}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
              stage: stageName,
              promptTokens: Number(data.content.prompt_tokens || 0),
              completionTokens: Number(data.content.completion_tokens || 0),
              totalTokens: Number(data.content.total_tokens || 0),
              cumulativeTotalTokens: Number(
                data.content.cumulative_total_tokens || 0,
              ),
              cumulativeCostUsd: Number(data.content.cumulative_cost_usd || 0),
            };
            setTokenEvents((current) => [...current, event].slice(-16));
            if (event.cumulativeTotalTokens !== undefined) {
              setTotalTokens(event.cumulativeTotalTokens);
              setMetricsText(
                `Streaming | Tokens: ${event.cumulativeTotalTokens} | Cost: $${event.cumulativeCostUsd.toFixed(6)}`,
              );
            }
          }
          break;
        case "clarification_required":
          addStageCard(
            "clarification",
            "Clarification Needed",
            data.content?.clarification_question ||
              data.content?.message ||
              "More detail is needed before the agent can continue.",
            data.content?.stopped_at_stage
              ? `Stopped at ${data.content.stopped_at_stage.replaceAll("_", ".")}`
              : "Backend is waiting for more detail.",
            "❓",
          );
          setClarificationState({
            awaiting: true,
            meta: data.content,
            selectedOptions: [],
            otherText: "",
            fieldValues: {},
          });
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? {
                    ...item,
                    clarification: data.content,
                  }
                : item,
            ),
          );
          break;
        case "report_chunk":
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? {
                    ...item,
                    content: `${item.content}${data.content}`,
                  }
                : item,
            ),
          );
          break;
        case "error":
          appendStageDetail(
            `Issue: ${typeof data.content === "string" ? data.content : JSON.stringify(data.content)}`,
          );
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? {
                    ...item,
                    content:
                      item.content ||
                      `Error: ${typeof data.content === "string" ? data.content : JSON.stringify(data.content)}`,
                  }
                : item,
            ),
          );
          break;
        case "stage_report":
          if (data.content) {
            setStageReport(data.content);
            const modelLabel =
              window.localStorage.getItem("sigmavalue_llm_model") ||
              "gpt-4o-mini";
            downloadStageWordReport(data.content, modelLabel);
            setMetricsText(
              (current) => `${current} | Stage Word report downloaded`,
            );
          }
          break;
        case "done":
          finalizeStream(data.metrics);
          break;
        default:
          break;
      }
    };

    source.onerror = () => {
      finalizeStream();
    };
  }

  function clearConversation() {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setMessages([]);
    setInput("");
    setIsStreaming(false);
    setStageCards([]);
    setPipelineStages([]);
    setPipelineCatalog([]);
    setStageReport(null);
    setTotalTokens(0);
    setMetricsText("Latency: --s");
    setClarificationState({
      awaiting: false,
      meta: null,
      selectedOptions: [],
      otherText: "",
      fieldValues: {},
    });
  }

  return (
    <main
      className="flex h-screen flex-col overflow-hidden pt-20"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="bg-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <header
          className="border-b backdrop-blur-xl"
          style={{
            borderColor: "var(--border-soft)",
            background: "var(--bg-header)",
          }}
        >
          <div className="mx-auto flex w-full max-w-[1880px] items-center justify-between gap-4 px-4 py-4 lg:px-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-secondary))",
                  boxShadow:
                    "0 0 30px color-mix(in srgb, var(--accent) 34%, transparent)",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div className="font-orbitron text-sm font-bold uppercase tracking-[0.22em]">
                  Data Retrieval agent
                </div>
                <div
                  className="text-xs uppercase tracking-[0.14em]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Intelligence Layer
                </div>
              </div>
              {/* <span
                className="hidden rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] sm:inline-flex"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--accent) 22%, transparent)",
                  background: "var(--accent-glow)",
                  color: "var(--accent-light)",
                }}
              >
                v3.0 Agentic
              </span> */}
            </div>

            {/* <div
              className="hidden items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold md:flex"
              style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-muted)" }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--success)", boxShadow: "0 0 10px var(--success)" }} />
              <span>Agent Synchronized</span>
            </div> */}

            <div className="flex items-center gap-3">
              <span
                className="rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
                style={{
                  borderColor: "var(--border-soft)",
                  background: "var(--bg-card)",
                  color: "var(--text-muted)",
                }}
                title="Uses global navbar provider/model selection"
              >
                Agent v2
              </span>
              {/* <div
                className="rounded-lg border px-3 py-2 font-mono text-xs"
                style={{
                  borderColor: "var(--border-soft)",
                  background: "var(--bg-input)",
                }}
              >
                <span style={{ color: "var(--text-dim)" }}>CORE:</span>{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--accent-light)" }}
                >
                  FastAPI SSE v2
                </span>
              </div>
              <div className="hidden gap-1 md:flex">
                {["TRX", "PRJ", "LST", "AMN"].map((label) => (
                  <span
                    key={label}
                    className="rounded-md border px-2 py-1 text-[10px] font-black"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--accent) 22%, transparent)",
                      background: "var(--accent-glow)",
                      color: "var(--accent-light)",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div> */}
              {/* <ThemeToggle /> */}
            </div>
          </div>
        </header>

        <ResizableDashboardLayout
          left={
            <ChatSection
              messages={messages}
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              isStreaming={isStreaming}
              metricsText={metricsText}
              clarificationState={clarificationState}
              onClarificationToggle={handleClarificationToggle}
              onClarificationOtherChange={(value) =>
                setClarificationState((current) => ({
                  ...current,
                  otherText: value,
                }))
              }
              onClarificationFieldChange={(field, value) =>
                setClarificationState((current) => ({
                  ...current,
                  fieldValues: {
                    ...current.fieldValues,
                    [field]: value,
                  },
                }))
              }
              onClear={clearConversation}
              backendLabel={`${apiBaseUrl} · agent v2`}
            />
          }
          center={
            <WorkflowSection
              variant="v2"
              stageCards={stageCards}
              pipelineStages={pipelineStages}
              pipelineCatalog={pipelineCatalog}
              stageReport={stageReport}
              onDownloadStageReport={() => {
                const modelLabel =
                  window.localStorage.getItem("sigmavalue_llm_model") ||
                  "gpt-4o-mini";
                if (stageReport) {
                  downloadStageWordReport(stageReport, modelLabel);
                }
              }}
              isGenerating={isStreaming}
              totalTokens={totalTokens}
              tokenEvents={tokenEvents}
            />
          }
          right={<MapSection />}
        />
      </div>
    </main>
  );
}
