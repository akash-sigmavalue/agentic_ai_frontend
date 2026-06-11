"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  continueMissingField,
  getGmailConnectionStatus,
  streamWorkflow,
  startGoogleOAuth,
} from "@/components/connector/api";
import type {
  CompletionResult,
  ConvMessage,
  ConvStep,
  StreamStep,
  WorkflowResponse,
} from "@/components/connector/types";

import ChatSectionConnector from "../../components/connector/chatsectionconnector";
import WorkflowSectionConnector from "../../components/connector/workflowsectionconnector";
import OutputSectionConnector from "../../components/connector/outputsectionconnector";
import AiMetricCard from "../../components/connector/AiMetricCard";

type RunWorkflowOptions = {
  appendUserMessage?: boolean;
};

function hasGmailStep(response: WorkflowResponse | null) {
  return response?.plan?.steps?.some((step) => step.system === "gmail") ?? false;
}

function isGmailNotConnectedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /gmail is not connected/i.test(message) || /connect google oauth/i.test(message);
}

function responseRequiresGmailOAuth(response: WorkflowResponse | null) {
  if (!response) return false;
  if (response.requires_oauth && response.connector === "gmail") return true;

  return (
    response.raw_mcp_results?.some(
      (item) => item.connector === "gmail" && item.requires_oauth === true,
    ) ?? false
  );
}

function normalizeWorkflowResponse(value: WorkflowResponse | null): WorkflowResponse | null {
  if (!value) return null;
  return {
    ...value,
    message: value.message ?? undefined,
    connector: value.connector ?? undefined,
    ui_result: value.ui_result ?? null,
    chat_message: value.chat_message ?? undefined,
    requires_form: value.requires_form ?? false,
    form_schema: value.form_schema ?? null,
  };
}

function isWaitingForField(response: WorkflowResponse | null) {
  const status = String(response?.status || "").toLowerCase();
  return Boolean(
    response?.missing_field ||
    response?.question ||
    response?.missing_field_question ||
    status.includes("clarification") ||
    status.includes("missing") ||
    status.includes("waiting"),
  );
}

function getSafeChatMessage(response: WorkflowResponse | null) {
  if (!response) return "Workflow completed.";
  return response.chat_message || "Done. I prepared the result in the output section.";
}

function toCompletionResult(response: WorkflowResponse): CompletionResult | null {
  if (isWaitingForField(response)) return null;
  return {
    status: response.execution_type === "automated" || response.rule_id ? "automation_rule_created" : "one_time_completed",
    message: response.chat_message || "Workflow completed.",
    rule_id: response.rule_id,
    execution_type: response.execution_type,
    reply: response.reply || undefined,
    reply_sent: response.reply_sent || undefined,
    reply_draft: response.reply_draft || undefined,
    prompt_tokens: response.prompt_tokens,
    completion_tokens: response.completion_tokens,
    total_tokens: response.total_tokens,
    estimated_cost_usd: response.estimated_cost_usd,
  };
}

function buildCompletedStreamSteps(response: WorkflowResponse | null): StreamStep[] {
  return (
    response?.plan?.steps?.map((step, index) => ({
      step: index + 1,
      step_id: step.id || String(index + 1),
      name: step.name || step.operation || `Step ${index + 1}`,
      status: "completed",
      output: step.description || step.operation || "Completed",
      duration_ms: null,
      error: null,
    })) ?? []
  );
}

function upsertStreamingStep(prev: StreamStep[], next: StreamStep): StreamStep[] {
  const stepKey = next.step_id || String(next.step || "");
  const existingIndex = prev.findIndex((item) => (item.step_id || String(item.step || "")) === stepKey);

  if (existingIndex === -1) {
    return [...prev, next];
  }

  const copy = [...prev];
  copy[existingIndex] = {
    ...copy[existingIndex],
    ...next,
    output: next.output || copy[existingIndex].output,
    error: next.error ?? copy[existingIndex].error,
    duration_ms: next.duration_ms ?? copy[existingIndex].duration_ms ?? null,
  };
  return copy;
}

export default function ConnectorPageClient() {
  const [prompt, setPrompt] = useState("Read my Gmail attachments and summarize them");
  const [isLoading, setIsLoading] = useState(false);
  const [connectorStatusLoading, setConnectorStatusLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Prompt workflow workspace ready.");
  const [response, setResponse] = useState<WorkflowResponse | null>(null);
  const [needsGmail, setNeedsGmail] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [activatingFlow, setActivatingFlow] = useState(false);
  const [activateFlowResult, setActivateFlowResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [convStep, setConvStep] = useState<ConvStep>("idle");
  const [convMessages, setConvMessages] = useState<ConvMessage[]>([]);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [streamingSteps, setStreamingSteps] = useState<StreamStep[]>([]);

  const clearGmailState = () => {
    setNeedsGmail(false);
    setGmailConnected(false);
    setGmailEmail(null);
    setPendingPrompt(null);
  };

  // On mount: silently check Gmail connection so the "Connect Gmail" button
  // is visible immediately — no login or workflow run required.
  // The backend uses AUTH_DISABLED_USER_ID=1 and has no auth guard on this route.
  useEffect(() => {
    void syncGmailConnectionStatus("", { requireWorkflow: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const syncGmailConnectionStatus = async (promptToKeep: string) => {
  //   setConnectorStatusLoading(true);
  //   try {
  //     const status = await getGmailConnectionStatus();
  //     setNeedsGmail(true);
  //     setGmailConnected(status.connected);
  //     setGmailEmail(status.email ?? null);
  //     setPendingPrompt(promptToKeep);
  //     setStatusMessage(status.connected ? (status.email ? `Gmail connected as ${status.email}.` : "Gmail connected.") : "This workflow needs Gmail access.");
  //   } catch {
  //     setNeedsGmail(true);
  //     setGmailConnected(false);
  //     setGmailEmail(null);
  //     setPendingPrompt(promptToKeep);
  //     setStatusMessage("This workflow needs Gmail access.");
  //   } finally {
  //     setConnectorStatusLoading(false);
  //   }
  // };
  const syncGmailConnectionStatus = async (
    promptToKeep: string,
    options: { requireWorkflow?: boolean } = {},
  ) => {
    const requireWorkflow = options.requireWorkflow ?? false;

    setConnectorStatusLoading(true);
    try {
      const status = await getGmailConnectionStatus();

      setGmailConnected(status.connected);
      setGmailEmail(status.email ?? null);

      if (requireWorkflow || !status.connected) {
        setNeedsGmail(true);
        setPendingPrompt(promptToKeep);
        setStatusMessage(
          status.connected
            ? status.email
              ? `Gmail connected as ${status.email}. Continue the pending workflow.`
              : "Gmail connected. Continue the pending workflow."
            : "This workflow needs Gmail access.",
        );
      } else {
        setNeedsGmail(false);
        setPendingPrompt(null);
        setStatusMessage(
          status.connected
            ? status.email
              ? `Gmail connected as ${status.email}.`
              : "Gmail connected."
            : "This workflow needs Gmail access.",
        );
      }
    } catch {
      setGmailConnected(false);
      setGmailEmail(null);

      if (requireWorkflow) {
        setNeedsGmail(true);
        setPendingPrompt(promptToKeep);
      }

      setStatusMessage("Unable to check Gmail connection.");
    } finally {
      setConnectorStatusLoading(false);
    }
  };

  const handleRunWorkflow = async (promptOverride?: string, options: RunWorkflowOptions = {}) => {
    const cleaned = (promptOverride ?? prompt).trim();
    const appendUserMessage = options.appendUserMessage ?? true;

    if (!cleaned) {
      setStatusMessage("Enter a prompt first.");
      return;
    }

    setIsLoading(true);
    setConvStep("streaming");
    setResponse(null);
    setCompletionResult(null);
    setStreamingSteps([]);
    setActivateFlowResult(null);
    setStatusMessage("Starting live workflow stream...");

    if (appendUserMessage) {
      setConvMessages((prev) => [...prev, { role: "user", text: cleaned }]);
    }

    let liveStepCount = 0;

    try {
      const result = await streamWorkflow(cleaned, {
        onStepStarted: (step) => {
          liveStepCount += 1;
          setConvStep("streaming");
          setStatusMessage(`Running: ${step.name}`);
          setStreamingSteps((prev) => upsertStreamingStep(prev, step));
        },
        onStepCompleted: (step) => {
          setStatusMessage(`Completed: ${step.name}`);
          setStreamingSteps((prev) => upsertStreamingStep(prev, step));
        },
        onStepFailed: (step) => {
          setStatusMessage(step.error || `Failed: ${step.name}`);
          setStreamingSteps((prev) => upsertStreamingStep(prev, step));
        },
        onMissingField: (missingResult) => {
          const nextResponse = normalizeWorkflowResponse(missingResult);
          const question = nextResponse?.question || nextResponse?.missing_field_question || `Please provide ${nextResponse?.missing_field || "the missing detail"}.`;
          const formMessage = nextResponse?.chat_message || "Please complete the required details in the output section.";
          setResponse(nextResponse);
          setCompletionResult(null);
          setStatusMessage(nextResponse?.requires_form ? formMessage : question);
        },
        onCompleted: (completedResult) => {
          const nextResponse = normalizeWorkflowResponse(completedResult);
          setResponse(nextResponse);
        },
        onError: (message) => {
          setStatusMessage(message);
        },
      });

      const workflowResponse = normalizeWorkflowResponse(result as WorkflowResponse);
      setResponse(workflowResponse);

      if (isWaitingForField(workflowResponse)) {
        const question = workflowResponse?.question || workflowResponse?.missing_field_question || `Please provide ${workflowResponse?.missing_field || "the missing detail"}.`;
        const formMessage = workflowResponse?.chat_message || "Please complete the required details in the output section.";

        if (liveStepCount === 0) {
          setStreamingSteps(buildCompletedStreamSteps(workflowResponse));
        }
        setCompletionResult(null);
        setConvMessages((prev) => [...prev, { role: "agent", text: workflowResponse?.requires_form ? formMessage : question }]);
        setStatusMessage(workflowResponse?.requires_form ? formMessage : question);

        // Phase 2: when backend provides a form, keep clarification inside OutputSectionConnector.
        // This prevents the chat input area from becoming the clarification form.
        setConvStep(workflowResponse?.requires_form ? "done" : workflowResponse?.field_type === "email" ? "waiting_email" : "waiting_field");
        return;
      }

      if (workflowResponse) {
        setCompletionResult(toCompletionResult(workflowResponse));
        // Phase 1: do not push final email/result text into chat.
        // Clean result is rendered only inside OutputSectionConnector via response.ui_result.
      }

      // if (responseRequiresGmailOAuth(workflowResponse)) {
      //   setNeedsGmail(true);
      //   setGmailConnected(false);
      //   setGmailEmail(null);
      //   setPendingPrompt(cleaned);
      //   setStatusMessage(workflowResponse?.error || "This workflow needs Gmail access.");
      // } else if (hasGmailStep(workflowResponse)) {
      //   await syncGmailConnectionStatus(cleaned);
      // } else {
      //   clearGmailState();
      //   setStatusMessage(getSafeChatMessage(workflowResponse));
      // }
      if (responseRequiresGmailOAuth(workflowResponse)) {
        await syncGmailConnectionStatus(cleaned, { requireWorkflow: true });
      } else {
        clearGmailState();
        setStatusMessage(getSafeChatMessage(workflowResponse));
      }
      setConvStep("done");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate workflow.";
      setStatusMessage(message);
      setResponse(null);
      setCompletionResult(null);
      setStreamingSteps([]);
      setConvMessages((prev) => [...prev, { role: "agent", text: message }]);
      if (isGmailNotConnectedError(error)) {
        setNeedsGmail(true);
        setGmailConnected(false);
        setGmailEmail(null);
        setPendingPrompt(cleaned);
      }
      setConvStep("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    let authUrl = "";
    try {
      const data = await startGoogleOAuth();
      authUrl = data.auth_url;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to start Google OAuth.");
      return;
    }

    const popup = window.open(authUrl, "_blank", "width=600,height=700");
    if (!popup) {
      setStatusMessage("Popup blocked. Please allow popups to connect Gmail.");
      return;
    }
    setStatusMessage("Gmail setup opened. Complete Google sign-in, then recheck the connection.");
  };

  // const handleRecheckGmailConnection = async () => {
  //   if (!pendingPrompt && !hasGmailStep(response)) {
  //     setStatusMessage("No Gmail workflow is waiting for a connection.");
  //     return;
  //   }
  //   await syncGmailConnectionStatus(pendingPrompt ?? prompt.trim());
  // }; 
  const handleRecheckGmailConnection = async () => {
    if (pendingPrompt) {
      await syncGmailConnectionStatus(pendingPrompt, { requireWorkflow: true });
      return;
    }

    await syncGmailConnectionStatus(prompt.trim(), { requireWorkflow: false });
  };

  const handleContinueWorkflow = async () => {
    if (!pendingPrompt) {
      setStatusMessage("No pending workflow to continue.");
      return;
    }
    await handleRunWorkflow(pendingPrompt);
  };

  const handleConvUserReply = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setConvMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setStatusMessage("Submitting conversation response...");
    setIsLoading(true);
    setConvStep("submitting");

    try {
      if (response?.missing_field && response.partial_intent) {
        const continued = (await continueMissingField({
          missing_field: response.missing_field,
          user_answer: trimmed,
          partial_intent: response.partial_intent,
        })) as unknown as WorkflowResponse;
        const nextResponse = normalizeWorkflowResponse(continued);
        setResponse(nextResponse);
        setCompletionResult(nextResponse ? toCompletionResult(nextResponse) : null);
        setStreamingSteps(buildCompletedStreamSteps(nextResponse));

        if (isWaitingForField(nextResponse)) {
          const question = nextResponse?.question || nextResponse?.missing_field_question || "Please provide the missing detail.";
          const formMessage = nextResponse?.chat_message || "Please complete the required details in the output section.";
          setConvMessages((prev) => [...prev, { role: "agent", text: nextResponse?.requires_form ? formMessage : question }]);
          setConvStep(nextResponse?.requires_form ? "done" : nextResponse?.field_type === "email" ? "waiting_email" : "waiting_field");
          setStatusMessage(nextResponse?.requires_form ? formMessage : question);
          return;
        }

        // Phase 1: after successful continuation, do not show final output in chat.
        setConvStep("done");
        setStatusMessage(getSafeChatMessage(nextResponse));
        return;
      }

      await handleRunWorkflow(trimmed, { appendUserMessage: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to continue workflow.";
      setStatusMessage(message);
      setConvMessages((prev) => [...prev, { role: "agent", text: message }]);
      setConvStep("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateFlow = async () => {
    setActivatingFlow(true);
    setActivateFlowResult(null);
    try {
      if (!response) {
        setActivateFlowResult({ ok: false, message: "Run a workflow first before activating automation." });
        return;
      }
      setActivateFlowResult({ ok: true, message: "Automation activated." });
      setStatusMessage("Automation activated.");
    } finally {
      setActivatingFlow(false);
    }
  };

  const normalizedResponse = normalizeWorkflowResponse(response);
  const totalSteps = normalizedResponse?.plan?.steps?.length || streamingSteps.length || 0;
  const totalTokens = normalizedResponse?.total_tokens || completionResult?.total_tokens || 0;
  const costValue = normalizedResponse?.estimated_cost_usd ?? completionResult?.estimated_cost_usd;
  const assistantStatus = isLoading ? "Running" : convStep === "done" ? "Completed" : convStep.startsWith("waiting") ? "Needs Input" : "Ready";

  const metricCards = useMemo(
    () => [
      { icon: "📬", label: "Status", value: assistantStatus, note: gmailConnected ? "Gmail connected" : needsGmail ? "OAuth needed" : "AI ready", color: "red" as const },
      { icon: "🛠️", label: "Steps", value: totalSteps, note: "planned", color: "blue" as const },
      { icon: "🤖", label: "Tokens", value: totalTokens ? totalTokens.toLocaleString() : "—", note: "used", color: "green" as const },
      { icon: "💸", label: "Cost", value: costValue != null ? `$${Number(costValue).toFixed(4)}` : "—", note: "est.", color: "yellow" as const },
    ],
    [assistantStatus, costValue, gmailConnected, needsGmail, totalSteps, totalTokens],
  );

  const handleReset = () => {
    setResponse(null);
    setCompletionResult(null);
    setStreamingSteps([]);
    setConvMessages([]);
    setConvStep("idle");
    setStatusMessage("Prompt workflow workspace ready.");
  };

  return (
    <div>
      <main className="connector-page relative h-dvh w-screen overflow-hidden bg-slate-50 pt-20 text-slate-950 dark:bg-[#0b0f1a] dark:text-white">
        <style>{`
          @keyframes floatOrb { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-18px) scale(1.04); } }
          @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute inset-[-20%] opacity-40" style={{ backgroundImage: "linear-gradient(rgba(66,133,244,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(66,133,244,.10) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="absolute -left-28 top-20 h-[420px] w-[420px] animate-[floatOrb_9s_ease-in-out_infinite] rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -right-28 top-36 h-[420px] w-[420px] animate-[floatOrb_9s_ease-in-out_infinite] rounded-full bg-red-500/20 blur-3xl [animation-delay:-2s]" />
          <div className="absolute bottom-[-180px] left-[45%] h-[420px] w-[420px] animate-[floatOrb_9s_ease-in-out_infinite] rounded-full bg-green-500/20 blur-3xl [animation-delay:-4s]" />
        </div>

        <div className="relative z-10 ml-0 flex h-full min-h-0 flex-col px-3 py-4 sm:px-5 lg:px-4 xl:px-6">
          {/* <header className="hidden border border-danger-300 bg-danger-50/70 p-5 shadow-sm md:flex md:items-center md:justify-between md:rounded-lg">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-400 text-2xl shadow-[0_12px_35px_rgba(234,67,53,.25)]">🧠</div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Gmail AI Workflow Agent</h1>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Prompt → neural planning → Gmail actions → AI summarized output</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-black text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-white">{statusMessage}</span>
              <button onClick={handleReset} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">🔄 Reset</button>
            </div>
          </header> */}

          

          <section className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(240px,30fr)_minmax(260px,31fr)_minmax(320px,39fr)]">
            <ChatSectionConnector
              prompt={prompt}
              setPrompt={setPrompt}
              isLoading={isLoading}
              statusMessage={statusMessage}
              handleRunWorkflow={() => void handleRunWorkflow()}
              convStep={convStep}
              convMessages={convMessages}
              handleConvUserReply={handleConvUserReply}
              currentFieldName={normalizedResponse?.missing_field ?? null}
              currentFieldType={normalizedResponse?.field_type ?? "text"}
              currentFieldOptions={normalizedResponse?.field_options ?? []}
              currentFieldSkippable={normalizedResponse?.field_skippable ?? false}
              currentFieldQuestion={normalizedResponse?.question || normalizedResponse?.missing_field_question || null}
            />

            <WorkflowSectionConnector
              response={normalizedResponse}
              needsGmail={needsGmail}
              gmailConnected={gmailConnected}
              gmailEmail={gmailEmail}
              pendingPrompt={pendingPrompt}
              isLoading={isLoading}
              connectorStatusLoading={connectorStatusLoading}
              handleConnectGmail={handleConnectGmail}
              handleRecheckGmailConnection={handleRecheckGmailConnection}
              handleContinueWorkflow={handleContinueWorkflow}
              handleActivateFlow={handleActivateFlow}
              activatingFlow={activatingFlow}
              activateFlowResult={activateFlowResult}
              completionResult={completionResult}
              convStep={convStep}
              streamingSteps={streamingSteps}
            />

            <OutputSectionConnector
              response={normalizedResponse}
              completionResult={completionResult}
              onSendPrompt={(nextPrompt) => void handleRunWorkflow(nextPrompt)}
              partialIntent={normalizedResponse?.partial_intent ?? null}
              convStep={convStep}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
