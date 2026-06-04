"use client";

import React, { useState } from "react";
import {
  getGmailConnectionStatus,
  processWorkflow,
  startGoogleOAuth,
} from "@/components/connector/api";
import type { ConvMessage, ConvStep, WorkflowResponse } from "@/components/connector/types";

import ChatSectionConnector from "../../components/connector/chatsectionconnector";
import WorkflowSectionConnector from "../../components/connector/workflowsectionconnector";
import OutputSectionConnector from "../../components/connector/outputsectionconnector";

function hasGmailStep(response: WorkflowResponse | null) {
  return (
    response?.plan?.steps?.some((step) => step.system === "gmail") ?? false
  );
}

function isGmailNotConnectedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /gmail is not connected/i.test(message) ||
    /connect google oauth/i.test(message)
  );
}

function responseRequiresGmailOAuth(response: WorkflowResponse | null) {
  if (!response) {
    return false;
  }

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

  return {
    ...value,
    message: value.message ?? undefined,
    connector: value.connector ?? undefined,
  };
}

export default function ConnectorPageClient() {
  const [prompt, setPrompt] = useState(
    "Read my Gmail attachments and summarize them",
  );

  const [isLoading, setIsLoading] = useState(false);
  const [connectorStatusLoading, setConnectorStatusLoading] = useState(false);

  const [statusMessage, setStatusMessage] = useState(
    "Prompt workflow workspace ready.",
  );

  const [response, setResponse] = useState<WorkflowResponse | null>(null);

  const [needsGmail, setNeedsGmail] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [activatingFlow, setActivatingFlow] = useState(false);
  const [activateFlowResult, setActivateFlowResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [convStep, setConvStep] = useState<ConvStep>("idle");
  const [convMessages, setConvMessages] = useState<ConvMessage[]>([]);

  const clearGmailState = () => {
    setNeedsGmail(false);
    setGmailConnected(false);
    setGmailEmail(null);
    setPendingPrompt(null);
  };

  const syncGmailConnectionStatus = async (promptToKeep: string) => {
    setConnectorStatusLoading(true);

    try {
      const status = await getGmailConnectionStatus();

      setNeedsGmail(true);
      setGmailConnected(status.connected);
      setGmailEmail(status.email ?? null);
      setPendingPrompt(promptToKeep);

      if (status.connected) {
        setStatusMessage(
          status.email
            ? `Gmail connected as ${status.email}.`
            : "Gmail connected.",
        );
      } else {
        setStatusMessage("This workflow needs Gmail access.");
      }
    } catch {
      setNeedsGmail(true);
      setGmailConnected(false);
      setGmailEmail(null);
      setPendingPrompt(promptToKeep);
      setStatusMessage("This workflow needs Gmail access.");
    } finally {
      setConnectorStatusLoading(false);
    }
  };

  const handleRunWorkflow = async (promptOverride?: string) => {
    const cleaned = (promptOverride ?? prompt).trim();

    if (!cleaned) {
      setStatusMessage("Enter a prompt first.");
      return;
    }

    setIsLoading(true);
    setConvStep("submitting");
    setStatusMessage("Generating workflow from backend...");

    try {
      const result = await processWorkflow(cleaned);
      const workflowResponse = result as WorkflowResponse;

      setResponse(normalizeWorkflowResponse(workflowResponse));

      if (responseRequiresGmailOAuth(workflowResponse)) {
        setNeedsGmail(true);
        setGmailConnected(false);
        setGmailEmail(null);
        setPendingPrompt(cleaned);
        setStatusMessage(
          workflowResponse.error || "This workflow needs Gmail access.",
        );
      } else if (hasGmailStep(workflowResponse)) {
        await syncGmailConnectionStatus(cleaned);
      } else {
        clearGmailState();
        setStatusMessage("Workflow generated successfully.");
      }
      setConvStep("done");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate workflow.";

      setStatusMessage(message);
      setResponse(null);

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
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to start Google OAuth.",
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

    await syncGmailConnectionStatus(pendingPrompt ?? prompt.trim());
  };

  const handleContinueWorkflow = async () => {
    if (!pendingPrompt) {
      setStatusMessage("No pending workflow to continue.");
      return;
    }

    await handleRunWorkflow(pendingPrompt);
  };

  const handleConvUserReply = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setConvMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setPrompt(trimmed);
    setStatusMessage("Submitting conversation response...");
    void handleRunWorkflow(trimmed);
  };

  const handleActivateFlow = async () => {
    setActivatingFlow(true);
    setActivateFlowResult(null);

    try {
      if (!response) {
        setActivateFlowResult({
          ok: false,
          message: "Run a workflow first before activating automation.",
        });
        return;
      }

      setActivateFlowResult({
        ok: true,
        message: "Automation activated.",
      });
      setStatusMessage("Automation activated.");
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
          />

          <OutputSectionConnector
            response={normalizedResponse}
            pendingPrompt={pendingPrompt}
            onSendPrompt={(nextPrompt) => void handleRunWorkflow(nextPrompt)}
          />
        </section>
      </div>
    </main>
  );
}
