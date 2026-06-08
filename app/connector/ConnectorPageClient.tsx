"use client";

import React, { useRef, useState } from "react";
import {
  continueMissingField,
  getGmailConnectionStatus,
  saveAutomationFlow,
  startGoogleOAuth,
  streamWorkflowRun,
} from "@/components/connector/api";
import type {
  CompletionResult,
  ConvMessage,
  ConvStep,
  StreamStep,
  WorkflowResponse,
} from "@/components/connector/types";

import ChatSectionConnector from "../../components/connector/chatsectionconnector";
import OutputSectionConnector from "../../components/connector/outputsectionconnector";
import WorkflowSectionConnector from "../../components/connector/workflowsectionconnector";

function hasGmailStep(response: WorkflowResponse | null) {
  return response?.plan?.steps?.some((step) => step.system === "gmail") ?? false;
}

function isGmailNotConnectedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /gmail is not connected/i.test(message) || /connect google oauth/i.test(message);
}

function responseRequiresGmailOAuth(response: WorkflowResponse | null) {
  if (!response) return false;

  if (response.requires_oauth && response.connector === "gmail") {
    return true;
  }

  return (
    response.raw_mcp_results?.some(
      (item) => item.connector === "gmail" && item.requires_oauth === true,
    ) ?? false
  );
}

function normalizeWorkflowResponse(
  value: WorkflowResponse | null,
): WorkflowResponse | null {
  if (!value) {
    return null;
  }

  const tokenUsage =
    value.token_usage && typeof value.token_usage === "object"
      ? (value.token_usage as Record<string, unknown>)
      : null;

  return {
    ...value,
    message: value.message ?? undefined,
    connector: value.connector ?? undefined,
    prompt_tokens: value.prompt_tokens ?? Number(tokenUsage?.prompt_tokens ?? 0),
    completion_tokens: value.completion_tokens ?? Number(tokenUsage?.completion_tokens ?? 0),
    total_tokens: value.total_tokens ?? Number(tokenUsage?.total_tokens ?? 0),
    estimated_cost_usd: value.estimated_cost_usd ?? Number(tokenUsage?.estimated_cost_usd ?? 0),
    token_usage: tokenUsage
      ? {
          ...tokenUsage,
          prompt_tokens: Number(tokenUsage.prompt_tokens ?? value.prompt_tokens ?? 0),
          completion_tokens: Number(tokenUsage.completion_tokens ?? value.completion_tokens ?? 0),
          total_tokens: Number(tokenUsage.total_tokens ?? value.total_tokens ?? 0),
          estimated_cost_usd:
            Number(tokenUsage.estimated_cost_usd ?? value.estimated_cost_usd ?? 0),
        }
      : undefined,
  };
}

function getClarificationQuestion(
  fieldName: string | null,
  fallback: string | null | undefined,
): string {
  if (fieldName === "to") {
    return "Please enter the full recipient email address (for example, user@example.com).";
  }

  if (fieldName === "sender_email") {
    return "Please enter the sender's full email address (for example, avinash@example.com).";
  }

  return (
    fallback?.trim() ||
    "Please provide a bit more information so I can continue."
  );
}

function toCompletionResult(response: WorkflowResponse): CompletionResult {
  const tokenUsage =
    response.token_usage && typeof response.token_usage === "object"
      ? (response.token_usage as Record<string, unknown>)
      : null;

  return {
    status: response.status === "automation_rule_created" ? "automation_rule_created" : "one_time_completed",
    message:
      response.message ||
      response.summary ||
      (response.status === "automation_rule_created"
        ? "Automation rule created."
        : "Workflow completed successfully."),
    rule_id: response.rule_id,
    execution_type: response.execution_type,
    reply: response.reply ?? undefined,
    reply_sent: response.reply_sent ?? undefined,
    reply_draft: response.reply_draft ?? undefined,
    prompt_tokens: response.prompt_tokens ?? Number(tokenUsage?.prompt_tokens ?? 0),
    completion_tokens: response.completion_tokens ?? Number(tokenUsage?.completion_tokens ?? 0),
    total_tokens: response.total_tokens ?? Number(tokenUsage?.total_tokens ?? 0),
    estimated_cost_usd: response.estimated_cost_usd ?? Number(tokenUsage?.estimated_cost_usd ?? 0),
  };
}

export default function ConnectorPageClient() {
  const abortRef = useRef<AbortController | null>(null);

  const [prompt, setPrompt] = useState("Read my Gmail attachments and summarize them");
  const [isLoading, setIsLoading] = useState(false);
  const [connectorStatusLoading, setConnectorStatusLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Prompt workflow workspace ready.");
  const [response, setResponse] = useState<WorkflowResponse | null>(null);
  const [streamingSteps, setStreamingSteps] = useState<StreamStep[]>([]);
  const [convStep, setConvStep] = useState<ConvStep>("idle");
  const [convMessages, setConvMessages] = useState<ConvMessage[]>([]);
  const [currentMissingField, setCurrentMissingField] = useState<string | null>(null);
  const [currentFieldType, setCurrentFieldType] = useState<
    "email" | "choice" | "text" | "text_optional"
  >("text");
  const [currentFieldOptions, setCurrentFieldOptions] = useState<string[]>([]);
  const [currentFieldSkippable, setCurrentFieldSkippable] = useState(false);
  const [currentFieldQuestion, setCurrentFieldQuestion] = useState<string | null>(null);
  const [partialIntent, setPartialIntent] = useState<Record<string, unknown> | null>(null);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [activatingFlow, setActivatingFlow] = useState(false);
  const [activateFlowResult, setActivateFlowResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [needsGmail, setNeedsGmail] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const clearGmailState = () => {
    setNeedsGmail(false);
    setGmailConnected(false);
    setGmailEmail(null);
    setPendingPrompt(null);
  };

  const setGmailRequiredState = (promptToKeep: string, message: string) => {
    setNeedsGmail(true);
    setGmailConnected(false);
    setGmailEmail(null);
    setPendingPrompt(promptToKeep);
    setStatusMessage(message);
  };

  const syncGmailConnectionStatus = async (promptToKeep: string) => {
    setConnectorStatusLoading(true);

    try {
      const status = await getGmailConnectionStatus();

      setGmailConnected(status.connected);
      setGmailEmail(status.email ?? null);

      if (status.connected) {
        setNeedsGmail(false);
        setStatusMessage(
          status.email ? `Gmail connected as ${status.email}.` : "Gmail connected.",
        );
      } else {
        setGmailRequiredState(
          promptToKeep,
          "Gmail connection is required. Please connect your account first.",
        );
      }
    } catch {
      setGmailRequiredState(
        promptToKeep,
        "Gmail connection is required. Please connect your account first.",
      );
    } finally {
      setConnectorStatusLoading(false);
    }
  };

  const handleRunWorkflow = async (
    promptOverride?: string,
    options?: {
      appendConversationMessage?: boolean;
      partialIntent?: Record<string, unknown> | null;
      executionMode?: "one_time_action" | "automation_rule" | null;
    },
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const sourcePrompt = typeof promptOverride === "string" ? promptOverride : prompt;
    const cleaned = sourcePrompt.trim();

    if (!cleaned) {
      setStatusMessage("Enter a prompt first.");
      return;
    }

    if (options?.appendConversationMessage !== false) {
      setConvMessages((prev) => [...prev, { role: "user", text: cleaned }]);
    }

    setConvStep("submitting");
    setCurrentMissingField(null);
    setCurrentFieldType("text");
    setCurrentFieldOptions([]);
    setCurrentFieldSkippable(false);
    setCurrentFieldQuestion(null);
    setPartialIntent(null);
    setCompletionResult(null);
    setActivateFlowResult(null);
    setStreamingSteps([]);
    setResponse(null);
    setIsLoading(true);
    setStatusMessage("Checking Gmail connection...");

    try {
      const connectionStatus = await getGmailConnectionStatus();

      if (!connectionStatus.connected) {
        setGmailRequiredState(
          cleaned,
          "Gmail connection is required. Please connect your account first.",
        );
        return;
      }

      setNeedsGmail(false);
      setGmailConnected(true);
      setGmailEmail(connectionStatus.email ?? null);
      setPendingPrompt(cleaned);
      setStatusMessage("Running workflow — watching agent steps live...");
      setConvStep("streaming");

      await streamWorkflowRun({
        prompt: cleaned,
        partialIntent: options?.partialIntent ?? null,
        executionMode: options?.executionMode ?? null,
        signal: abortRef.current.signal,
        onStep: (step) => {
          setStreamingSteps((prev) => {
            const idx = prev.findIndex((s) => s.step === step.step);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = step;
              return next;
            }
            return [...prev, step];
          });
        },
        onComplete: (result) => {
          const workflowResponse = result as WorkflowResponse;
          setResponse(workflowResponse);

          if (workflowResponse.missing_field && workflowResponse.partial_intent) {
            setPartialIntent(workflowResponse.partial_intent);
            setCurrentMissingField(workflowResponse.missing_field);
            setCurrentFieldType(workflowResponse.field_type || "text");
            setCurrentFieldOptions(workflowResponse.field_options || []);
            setCurrentFieldSkippable(workflowResponse.field_skippable || false);
            setCurrentFieldQuestion(
              getClarificationQuestion(
                workflowResponse.missing_field || null,
                workflowResponse.question || workflowResponse.missing_field_question || null,
              ),
            );
            setConvMessages((prev) => [
              ...prev,
              {
                role: "agent",
                text: getClarificationQuestion(
                  workflowResponse.missing_field || null,
                  workflowResponse.question || workflowResponse.missing_field_question || null,
                ),
              },
            ]);
            setConvStep("waiting_field");
            setStatusMessage("I need a bit more information to continue.");
            setIsLoading(false);
            return;
          }

          if (responseRequiresGmailOAuth(workflowResponse)) {
            setGmailRequiredState(
              cleaned,
              workflowResponse.error || "Gmail connection is required. Please connect your account first.",
            );
          } else {
            clearGmailState();
            setCompletionResult(toCompletionResult(workflowResponse));
            setStatusMessage(
              workflowResponse.message ||
                workflowResponse.summary ||
                "Workflow completed successfully.",
            );
          }
          setConvStep("done");
          setIsLoading(false);
        },
        onError: (error) => {
          if (isGmailNotConnectedError(new Error(error))) {
            setGmailRequiredState(
              cleaned,
              "Gmail connection is required. Please connect your account first.",
            );
          } else {
            setStatusMessage(error);
          }
          setConvStep("idle");
          setIsLoading(false);
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate workflow.";

      if (isGmailNotConnectedError(error)) {
        setGmailRequiredState(
          cleaned,
          "Gmail connection is required. Please connect your account first.",
        );
        return;
      }

      setStatusMessage(message);
      setConvStep("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvUserReply = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setConvMessages((prev) => [...prev, { role: "user", text: trimmed }]);

    if (
      convStep === "waiting_field" ||
      convStep === "waiting_email" ||
      convStep === "waiting_frequency"
    ) {
      const activeField =
        currentMissingField ||
        (convStep === "waiting_email"
          ? "sender_email"
          : convStep === "waiting_frequency"
            ? "execution_type"
            : null);
      if (!activeField) {
        return;
      }

      const isSkip =
        trimmed.toLowerCase() === "skip" ||
        (currentFieldSkippable && trimmed === "");

      if (currentFieldType === "email" && !isSkip && !/^[\w.-]+@[\w.-]+\.\w+$/.test(trimmed)) {
        setStatusMessage("Please enter a valid email address.");
        setConvMessages((prev) => prev.slice(0, -1));
        return;
      }

      const normalizedValue =
        activeField === "execution_type"
          ? trimmed.toLowerCase().replace(/\s+/g, "_")
          : trimmed;

      setConvStep("submitting");
      setStatusMessage("Setting up your workflow...");
      setIsLoading(true);

      try {
        const result = await continueMissingField({
          missing_field: activeField,
          user_answer: isSkip ? "__skip__" : normalizedValue,
          partial_intent: {
            ...(partialIntent || {}),
            [activeField]: isSkip ? null : normalizedValue,
            answered_fields: [
              ...((partialIntent as { answered_fields?: string[] } | null)?.answered_fields || []),
              activeField,
            ],
          },
        });

        if (result.missing_field && result.partial_intent) {
          setResponse((prev) =>
            prev
              ? {
                  ...prev,
                  ...result,
                }
              : {
                  ...result,
                },
          );
          setPartialIntent(result.partial_intent);
          setCurrentMissingField(result.missing_field);
          setCurrentFieldType(result.field_type || "text");
          setCurrentFieldOptions(result.field_options || []);
          setCurrentFieldSkippable(result.field_skippable || false);
          setCurrentFieldQuestion(
          getClarificationQuestion(result.missing_field || null, result.question || null),
          );
          setConvStep("waiting_field");
          setStatusMessage("I need a bit more information to continue.");
          setConvMessages((prev) => [
            ...prev,
            {
              role: "agent",
              text: getClarificationQuestion(result.missing_field || null, result.question || null),
            },
          ]);
          setIsLoading(false);
          return;
        }

        const completion = result as CompletionResult;
        setCompletionResult(completion);
        setResponse((prev) =>
          ({
            ...(prev || {}),
            ...completion,
            missing_field: undefined,
            question: undefined,
            field_type: undefined,
            field_options: undefined,
            field_skippable: undefined,
            partial_intent: undefined,
          } as WorkflowResponse),
        );
        setCurrentMissingField(null);
        setCurrentFieldQuestion(null);
        setCurrentFieldOptions([]);
        setCurrentFieldSkippable(false);
        setPartialIntent(null);
        setPendingPrompt(null);
        setConvStep("done");
        setStatusMessage(completion.message || "Workflow set up successfully.");
        setConvMessages((prev) => [
          ...prev,
          {
            role: "agent",
            text: completion.message || "Done! Your workflow is active.",
          },
        ]);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Something went wrong.";
        setStatusMessage(msg);
        setConvStep("idle");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setPrompt(trimmed);
    setStatusMessage("Submitting conversation response...");
    void handleRunWorkflow(trimmed, { appendConversationMessage: false });
  };

  const handleConnectGmail = async () => {
    let authUrl = "";

    try {
      const data = await startGoogleOAuth();
      authUrl = data.auth_url;
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to start Google OAuth.",
      );
      return;
    }

    const popup = window.open(authUrl, "_blank", "width=600,height=700");

    if (!popup) {
      setStatusMessage("Popup blocked. Please allow popups to connect Gmail.");
      return;
    }

    setStatusMessage(
      "Gmail setup opened. Complete Google sign-in, then recheck the connection.",
    );
  };

  const handleRecheckGmailConnection = async () => {
    if (!pendingPrompt && !hasGmailStep(response)) {
      setStatusMessage("No Gmail workflow is waiting for a connection.");
      return;
    }

    const promptToResume = pendingPrompt ?? prompt.trim();
    await syncGmailConnectionStatus(promptToResume);

    const status = await getGmailConnectionStatus().catch(() => ({ connected: false }));
    if ((status as { connected?: boolean }).connected && pendingPrompt) {
      await handleContinueWorkflow();
    }
  };

  const handleContinueWorkflow = async () => {
    if (!pendingPrompt) {
      setStatusMessage("No pending workflow to continue.");
      return;
    }

    try {
      const status = await getGmailConnectionStatus();
      if (!status.connected) {
        setGmailRequiredState(
          pendingPrompt,
          "Gmail connection is required. Please connect your account first.",
        );
        return;
      }
      setGmailConnected(true);
      setGmailEmail(status.email ?? null);
      setNeedsGmail(false);
    } catch (error) {
      setGmailRequiredState(
        pendingPrompt,
        error instanceof Error ? error.message : "Unable to verify Gmail connection.",
      );
      return;
    }

    await handleRunWorkflow(pendingPrompt, { appendConversationMessage: false });
  };

  const handleActivateFlow = async () => {
    if (!response?.can_execute || !response.flow) {
      setActivateFlowResult({
        ok: false,
        message: "No executable automation flow is available.",
      });
      return;
    }

    setActivatingFlow(true);
    setActivateFlowResult(null);

    try {
      const result = await saveAutomationFlow({ flow: response.flow });
      const ruleId = result.rule?.id ?? null;
      setCompletionResult({
        status: "automation_rule_created",
        message:
          ruleId != null
            ? `Automation saved as rule #${ruleId}.`
            : "Automation saved successfully.",
        rule_id: ruleId ?? undefined,
      });
      setActivateFlowResult({
        ok: true,
        message:
          ruleId != null
            ? `Automation saved as rule #${ruleId}.`
            : "Automation activated.",
      });
      setStatusMessage(
        ruleId != null ? `Automation saved as rule #${ruleId}.` : "Automation activated.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to activate automation.";
      setActivateFlowResult({
        ok: false,
        message,
      });
      setStatusMessage(message);
    } finally {
      setActivatingFlow(false);
    }
  };

  const normalizedResponse = normalizeWorkflowResponse(response);

  return (
    <main className="relative flex h-dvh w-screen flex-col overflow-hidden bg-[#f8fafc] text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.24]"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 ml-20 flex h-full min-h-0 flex-col pt-20">
        <section className="grid flex-1 min-h-0 gap-5 px-6 pb-6 pt-6 xl:grid-cols-[0.95fr_1fr_1.08fr]">
          <ChatSectionConnector
            prompt={prompt}
            setPrompt={setPrompt}
            isLoading={isLoading}
            statusMessage={statusMessage}
            handleRunWorkflow={() => void handleRunWorkflow()}
            convStep={convStep}
            convMessages={convMessages}
            handleConvUserReply={handleConvUserReply}
            currentFieldName={currentMissingField}
            currentFieldType={currentFieldType}
            currentFieldOptions={currentFieldOptions}
            currentFieldSkippable={currentFieldSkippable}
            currentFieldQuestion={currentFieldQuestion}
            response={normalizedResponse}
            partialIntent={partialIntent}
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
            pendingPrompt={pendingPrompt}
            currentPrompt={prompt}
            convStep={convStep}
            onSendPrompt={(nextPrompt) => void handleRunWorkflow(nextPrompt)}
            onRunWorkflow={(payload) =>
              void handleRunWorkflow(payload.prompt, {
                partialIntent: payload.partialIntent,
                executionMode: payload.executionMode,
                appendConversationMessage: false,
              })
            }
          />
        </section>
      </div>
    </main>
  );
}
