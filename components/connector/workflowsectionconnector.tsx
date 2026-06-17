"use client";

import type { CompletionResult, ConvStep, StreamStep, WorkflowResponse } from "./types";
import AiEmptyState from "./AiEmptyState";
import AiPanelHeader from "./AiPanelHeader";
import AiWorkflowStepCard from "./AiWorkflowStepCard";

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
  completionResult?: CompletionResult | null;
  convStep?: ConvStep;
  streamingSteps?: StreamStep[];
};

type PlanStep = NonNullable<NonNullable<WorkflowResponse["plan"]>["steps"]>[number];
type StepResult = NonNullable<WorkflowResponse["step_results"]>[number];

function prettyTitle(value: string, index: number) {
  const clean = value.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
  const title = clean ? clean.replace(/\b\w/g, (letter) => letter.toUpperCase()) : `Step ${index + 1}`;
  return `${String(index + 1).padStart(2, "0")} ${title}`;
}

function stepTag(index: number) {
  return `Step ${index + 1}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getPrimaryIntent(output: unknown, response: WorkflowResponse | null) {
  if (isRecord(output)) {
    const nested = output.intent_understanding_output;
    if (isRecord(nested)) {
      const intent = firstString(nested.primary_intent, nested.intent, nested.operation);
      if (intent) return intent;
    }
    const intent = firstString(output.primary_intent, output.intent, output.operation);
    if (intent) return intent;
  }

  const gmailIntent = response?.plan?.gmail_intent;
  if (isRecord(gmailIntent)) {
    const nested = gmailIntent.intent_understanding_output;
    if (isRecord(nested)) {
      const intent = firstString(nested.primary_intent, nested.intent, nested.operation);
      if (intent) return intent;
    }
    return firstString(gmailIntent.primary_intent, gmailIntent.intent, gmailIntent.operation);
  }

  return firstString(gmailIntent);
}

function getIntentRecord(output: unknown, response: WorkflowResponse | null): Record<string, unknown> | null {
  if (isRecord(output)) {
    const nested = output.intent_understanding_output;
    if (isRecord(nested)) return nested;
    return output;
  }

  const gmailIntent = response?.plan?.gmail_intent;
  if (isRecord(gmailIntent)) {
    const nested = gmailIntent.intent_understanding_output;
    if (isRecord(nested)) return nested;
    return gmailIntent;
  }

  return null;
}

function collectThreads(output: unknown): Record<string, unknown>[] {
  if (Array.isArray(output)) return output.filter(isRecord);
  if (!isRecord(output)) return [];

  if (Array.isArray(output.threads)) return output.threads.filter(isRecord);
  if (Array.isArray(output.emails)) return output.emails.filter(isRecord);

  const data = output.data;
  if (isRecord(data)) {
    if (Array.isArray(data.threads)) return data.threads.filter(isRecord);
    if (Array.isArray(data.emails)) return data.emails.filter(isRecord);
  }

  return [];
}

function collectThreadCount(output: unknown): number {
  return collectThreads(output).length;
}

function formatThreadLine(thread: Record<string, unknown>, index: number) {
  const sender = firstString(thread.from_name, thread.sender_name, thread.from_email, thread.from, "Unknown sender");
  const subject = firstString(thread.subject, "(No subject)");
  const date = firstString(thread.date_str, thread.date, thread.internalDate);
  const preview = firstString(thread.snippet, thread.body_preview);

  return [
    `${index + 1}. ${subject}`,
    `   From: ${sender}${date ? ` | Date: ${date}` : ""}`,
    preview ? `   Preview: ${preview}` : "",
  ].filter(Boolean).join("\n");
}

function buildHumanStepDetails(
  step: PlanStep,
  result: StepResult | undefined,
  response: WorkflowResponse | null,
) {
  const name = `${step.name || ""} ${step.operation || ""} ${result?.tool || ""}`.toLowerCase();
  const output = result?.output;
  const status = firstString(result?.status, "completed");
  const tool = firstString(result?.tool, step.operation, step.kind);

  if (name.includes("intent")) {
    const intent = getPrimaryIntent(output, response) || "resolved";
    const intentRecord = getIntentRecord(output, response);
    const goal = firstString(response?.plan?.goal);
    const category = firstString(intentRecord?.action_category);
    const confidence = firstString(intentRecord?.confidence_score);
    const reasoning = firstString(intentRecord?.reasoning_summary);

    return [
      "Intent Summary",
      goal ? `Goal: ${goal}` : "",
      `Intent: ${intent}`,
      category ? `Category: ${category}` : "",
      confidence ? `Confidence: ${confidence}` : "",
      reasoning ? `Reasoning: ${reasoning}` : "",
      `Status: ${status}`,
    ].filter(Boolean).join("\n");
  }

  if (name.includes("search") || name.includes("fetch") || name.includes("list")) {
    const threads = collectThreads(output);
    return [
      "Gmail Search Summary",
      `Tool: ${tool}`,
      `Status: ${status}`,
      `Emails found: ${threads.length}`,
      "",
      ...threads.slice(0, 5).map(formatThreadLine),
      threads.length > 5 ? `\nShowing first 5 of ${threads.length}. Full data is available in Raw JSON Response.` : "",
    ].filter(Boolean).join("\n");
  }

  if (name.includes("return") || name.includes("finalize")) {
    const threads = collectThreads(output);
    return [
      "Output Summary",
      `Status: ${status}`,
      `Returned to output panel: ${threads.length || response?.emails_found || 0} email result${(threads.length || response?.emails_found || 0) === 1 ? "" : "s"}`,
      "Readable email cards are shown in the Output panel. Raw backend data is available in Raw JSON Response.",
    ].join("\n");
  }

  return [
    "Step Summary",
    `Tool: ${tool || "workflow step"}`,
    `Status: ${status}`,
    firstString(step.description) ? `Description: ${step.description}` : "",
  ].filter(Boolean).join("\n");
}

function cleanStepDescription(
  step: PlanStep,
  result: StepResult | undefined,
  response: WorkflowResponse | null,
) {
  const name = `${step.name || ""} ${step.operation || ""} ${result?.tool || ""}`.toLowerCase();
  const output = result?.output;

  if (name.includes("intent")) {
    const intent = getPrimaryIntent(output, response) || "resolved";
    return `Intent resolved: ${intent}`;
  }

  if (name.includes("search") || name.includes("fetch") || name.includes("list")) {
    const count = collectThreadCount(output);
    return count > 0 ? `Searched Gmail and found ${count} email thread${count === 1 ? "" : "s"}.` : "Searched Gmail for matching email threads.";
  }

  if (name.includes("return") || name.includes("finalize")) {
    const count = collectThreadCount(output);
    return count > 0 ? `Returned ${count} email result${count === 1 ? "" : "s"} to the output panel.` : "Prepared the final output.";
  }

  return step.description || step.operation || result?.tool || "Completed";
}

function stepEmoji(name: string, system?: string | null) {
  const key = `${name} ${system || ""}`.toLowerCase();
  if (key.includes("auth") || key.includes("oauth") || key.includes("connect")) return "🔐";
  if (key.includes("intent") || key.includes("plan") || key.includes("classify")) return "🧭";
  if (key.includes("search") || key.includes("fetch") || key.includes("list")) return "📬";
  if (key.includes("attachment") || key.includes("parse") || key.includes("read")) return "📎";
  if (key.includes("summary") || key.includes("summar") || key.includes("analy") || key.includes("extract")) return "🧠";
  if (key.includes("reply") || key.includes("draft") || key.includes("send")) return "✍️";
  if (key.includes("automation") || key.includes("rule") || key.includes("trigger")) return "⚡";
  return "✨";
}

function buildWorkflowCards(response: WorkflowResponse | null, streamingSteps: StreamStep[] = []) {
  if (response?.plan?.steps?.length) {
    return response.plan.steps.map((step, index) => {
      const result = response.step_results?.find((item) => item.step_id === step.id) || response.step_results?.[index];
      return {
        emoji: stepEmoji(step.name || step.operation || "", step.system),
        title: prettyTitle(step.name || step.operation || step.kind || "workflow step", index),
        desc: cleanStepDescription(step, result, response),
        tag: stepTag(index),
        ms: null,
        status: result?.status || "planned",
        details: buildHumanStepDetails(step, result, response),
      };
    });
  }

  if (streamingSteps.length > 0) {
    return streamingSteps.map((step, index) => ({
      emoji: stepEmoji(step.name),
      title: prettyTitle(step.name, index),
      desc: step.output || step.error || "Live workflow step",
      tag: stepTag(index),
      ms: step.duration_ms ?? null,
      status: step.status,
      details: step.error || step.output || "",
    }));
  }

  return (
    response?.plan?.steps?.map((step, index) => ({
      emoji: stepEmoji(step.name || step.operation || "", step.system),
      title: prettyTitle(step.name || step.operation || step.kind || "workflow step", index),
      desc: step.description || step.operation || step.system || "Prepared by AI planner",
      tag: stepTag(index),
      ms: null,
      status: "planned",
      details: firstString(step.description, step.operation, step.kind),
    })) ?? []
  );
}

function countStatus(response: WorkflowResponse | null, streamingSteps: StreamStep[] = []) {
  if (streamingSteps.length > 0) {
    const completed = streamingSteps.filter((item) => String(item.status).toLowerCase().includes("complete") || String(item.status).toLowerCase().includes("success")).length;
    const failed = streamingSteps.filter((item) => String(item.status).toLowerCase().includes("fail") || String(item.status).toLowerCase().includes("error")).length;
    return { completed, failed };
  }

  const results = response?.step_results || [];
  const completed = results.filter((item) => String(item.status).toLowerCase().includes("success") || String(item.status).toLowerCase().includes("complete")).length;
  const failed = results.filter((item) => String(item.status).toLowerCase().includes("fail") || String(item.status).toLowerCase().includes("error")).length;
  return { completed, failed };
}


function getResponseStatus(response: WorkflowResponse | null) {
  return String(response?.status || "").toLowerCase();
}

function isAutomationPlan(response: WorkflowResponse | null) {
  const plan = response?.plan;
  return typeof (plan as { type?: unknown })?.type === "string" && (plan as { type?: string }).type === "automation";
}

function isWaitingForConfirmation(response: WorkflowResponse | null) {
  return getResponseStatus(response) === "needs_confirmation";
}

function isWaitingForClarification(response: WorkflowResponse | null) {
  return getResponseStatus(response) === "needs_clarification" || response?.requires_form === true;
}

function getStatusTitle(
  response: WorkflowResponse | null,
  isLoading: boolean,
  convStep: ConvStep,
  completionResult?: CompletionResult | null,
) {
  if (isWaitingForConfirmation(response)) return "Needs Confirmation";
  if (isWaitingForClarification(response)) return "Needs Details";
  if (completionResult) return "Complete";
  if (isLoading || convStep === "streaming" || convStep === "submitting") return "Running";
  if (response?.plan?.steps?.length) return "Planned";
  return "AI Waiting";
}

function getStatusBadgeClass(response: WorkflowResponse | null, isLoading: boolean, completionResult?: CompletionResult | null) {
  const status = getResponseStatus(response);

  if (status === "needs_confirmation") return "bg-yellow-500/15 text-yellow-500";
  if (status === "needs_clarification" || response?.requires_form === true) return "bg-orange-500/15 text-orange-500";
  if (status === "failed" || response?.success === false) return "bg-red-500/15 text-red-500";
  if (completionResult || status === "completed" || status === "sent" || status === "draft_ready") return "bg-green-500/15 text-green-500";
  if (isLoading) return "bg-blue-500/15 text-blue-500";

  return "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300";
}

export default function WorkflowSectionConnector({
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
  completionResult = null,
  convStep = "idle",
  streamingSteps = [],
}: WorkflowSectionConnectorProps) {
  const cards = buildWorkflowCards(response, streamingSteps);
  const { completed, failed } = countStatus(response, streamingSteps);
  const activeCard = cards.find((item) => String(item.status).toLowerCase() === "running") || cards[cards.length - 1];
  const statusTitle = getStatusTitle(response, isLoading, convStep, completionResult);
  const statusBadgeClass = getStatusBadgeClass(response, isLoading, completionResult);
  const liveTool = isLoading && activeCard ? activeCard.tag : completionResult ? "idle" : cards[0]?.tag || "—";

  return (
    <section className="connector-panel flex h-full min-h-[520px] max-h-full flex-col overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/85 shadow-[0_18px_54px_rgba(15,23,42,.10)] dark:border-slate-700/80 dark:bg-slate-900/85 lg:min-h-0">
      <AiPanelHeader
        icon="🛠️"
        kicker="Workflow"
        title="AI Agent Execution"
        right={
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${statusBadgeClass}`}>
            {statusTitle}
          </span>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-4 custom-scrollbar">
        {needsGmail ? (
          <div className="connector-card mb-4 rounded-[22px] border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-950 dark:text-white">🔐 Gmail connection required</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {gmailConnected
                    ? `Connected as ${gmailEmail || "Gmail user"}.${pendingPrompt ? " Continue the pending workflow." : ""}`
                    : pendingPrompt
                      ? "Connect Gmail, then recheck the connection to continue this workflow."
                      : "Connect your Gmail account to run AI workflows on your inbox."}
                </p>
                {pendingPrompt ? <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">Pending: {pendingPrompt}</p> : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {!gmailConnected ? (
                  <button onClick={handleConnectGmail} className="rounded-full bg-red-500 px-4 py-2 text-xs font-black text-white">Connect Gmail</button>
                ) : pendingPrompt ? (
                  <button onClick={handleContinueWorkflow} disabled={isLoading} className="rounded-full bg-green-500 px-4 py-2 text-xs font-black text-white disabled:opacity-60">Continue</button>
                ) : null}
                <button onClick={handleRecheckGmailConnection} disabled={connectorStatusLoading} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200">
                  {connectorStatusLoading ? "Checking..." : "Recheck"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {cards.length === 0 ? (
          <AiEmptyState
            icon="⚙️"
            title="AI workflow plan will appear here"
            text="Run a prompt to see neural planning, tool selection, Gmail API calls, and summarization steps."
          />
        ) : (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <div className="connector-card rounded-2xl border border-slate-200 bg-white/80 p-3 text-center dark:border-slate-700 dark:bg-slate-800/70">
                <div className="text-lg font-black text-white">{cards.length}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Steps</div>
              </div>
              <div className="connector-card rounded-2xl border border-slate-200 bg-white/80 p-3 text-center dark:border-slate-700 dark:bg-slate-800/70">
                <div className="text-lg font-black text-green-500">{completed || (completionResult ? cards.length : 0)}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Done</div>
              </div>
              <div className="connector-card rounded-2xl border border-slate-200 bg-white/80 p-3 text-center dark:border-slate-700 dark:bg-slate-800/70">
                <div className="text-lg font-black text-red-500">{failed}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Errors</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {cards.map((step, index) => (
                <AiWorkflowStepCard key={`${step.tag}-${index}`} step={step} running={String(step.status).toLowerCase() === "running"} />
              ))}
            </div>

            {isWaitingForConfirmation(response) ? (
              <div className="connector-card mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                ⚠️ <b>Confirmation required:</b>{" "}
                {response?.message || response?.summary || "Please review the generated reply before sending."}
              </div>
            ) : null}

            {isWaitingForClarification(response) ? (
              <div className="connector-card mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                📝 <b>More details required:</b>{" "}
                {response?.question || response?.summary || "Please provide the missing details to continue."}
              </div>
            ) : null}

            {response?.plan?.goal ? (
              <div className="connector-card mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                🎯 <b>Goal:</b> {response.plan.goal}
              </div>
            ) : null}

            {response?.execution_type === "automated" || isAutomationPlan(response) ? (
              <div className="connector-card mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950 dark:text-white">⚡ Automation workflow</div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Activate only after checking the generated workflow.</p>
                  </div>
                  <button onClick={handleActivateFlow} disabled={activatingFlow} className="rounded-full bg-red-500 px-4 py-2 text-xs font-black text-white disabled:opacity-60">
                    {activatingFlow ? "Activating..." : "Activate automation"}
                  </button>
                </div>
                {activateFlowResult ? <p className={`mt-3 text-xs font-bold ${activateFlowResult.ok ? "text-green-500" : "text-red-500"}`}>{activateFlowResult.message}</p> : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="connector-panel-footer flex h-10 shrink-0 items-center justify-between border-t border-slate-200 px-4 text-xs text-slate-500 [&>span:last-child]:hidden dark:border-slate-700 dark:text-slate-400">
        <span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500" />Live tool: <b>{liveTool}</b></span>
        <span>tokens {(response?.total_tokens || completionResult?.total_tokens || 0).toLocaleString()} · cost {response?.estimated_cost_usd != null ? `$${Number(response.estimated_cost_usd).toFixed(4)}` : "—"}</span>
      </div>
    </section>
  );
}
