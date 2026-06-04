"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkflowSectionDashboard from "@/components/dashboard/workflowsectiondashboard";
import { LayoutDashboard, History, Settings, Plug, CheckCircle2, Download, Mail, CornerDownLeft, Send, ChevronDown, Check } from "lucide-react";
import {
  getGmailConnectionStatus,
  processWorkflow,
  startGoogleOAuth,
} from "@/components/connector/api";
import { apiUrl } from "@/lib/api-client";

type WorkflowResponse = {
  success?: boolean;
  summary?: string;
  plan?: {
    goal?: string;
    steps?: Array<{
      id: string;
      kind: string;
      name: string;
      description?: string;
      system?: string | null;
      operation?: string | null;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
      requires_approval?: boolean;
    }>;
    needs_approval?: boolean;
    notes?: string[];
  };
  step_results?: Array<{
    step_id: string;
    kind: string;
    status: string;
    tool?: string;
    output?: any;
  }>;
  raw_mcp_results?: Array<{
    server: string;
    tool: string;
    ok: boolean;
    data?: Record<string, unknown>;
    error?: string | null;
    requires_oauth?: boolean;
    connector?: string | null;
  }>;
  approval_status?: string;
  requires_oauth?: boolean;
  connector?: string | null;
  error?: string | null;
};

type GmailTokenTestResponse =
  | {
      status: "no_token";
    }
  | {
      status: "success";
      email?: string | null;
      token_preview?: string | null;
    }
  | {
      status: "failed";
      error?: string | null;
      token_preview?: string | null;
    };

function hasGmailStep(response: WorkflowResponse | null) {
  return (
    response?.plan?.steps?.some((step) => step.system === "gmail") ?? false
  );
}

function isGmailNotConnectedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /gmail is not connected/i.test(message) || /connect google oauth/i.test(message);
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

export default function ConnectorPageClient() {
  const router = useRouter();
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
  const [gmailTokenTestLoading, setGmailTokenTestLoading] = useState(false);
  const [gmailTokenTestResult, setGmailTokenTestResult] =
    useState<GmailTokenTestResponse | null>(null);

  // useEffect(() => {
  //   const token = localStorage.getItem("token");
  //   if (!token) router.push("/login");
  // }, [router]);

  const clearGmailState = () => {
    setNeedsGmail(false);
    setGmailConnected(false);
    setGmailEmail(null);
    setPendingPrompt(null);
  };

  const handleTestGmailToken = async () => {
    // const token = localStorage.getItem("token");
    // if (!token) {
    //   setStatusMessage("Please log in again.");
    //   return;
    // }

    setGmailTokenTestLoading(true);
    setGmailTokenTestResult(null);
    setStatusMessage("Testing Gmail token with Gmail API...");

    try {
      const response = await fetch(apiUrl("/debug/gmail-token-test"), {
        method: "GET",
        // headers: {
        //   Authorization: `Bearer ${token}`,
        // },
      });

      const payload = (await response.json()) as GmailTokenTestResponse;

      if (!response.ok) {
        throw new Error(
          (payload as { error?: string } | null)?.error ||
            `Request failed with status ${response.status}`,
        );
      }

      setGmailTokenTestResult(payload);

      if (payload.status === "success") {
        setStatusMessage("Gmail API token test succeeded.");
      } else if (payload.status === "no_token") {
        setStatusMessage("No Gmail OAuth token found.");
      } else {
        setStatusMessage("Gmail API token test failed.");
      }
    } catch (error) {
      setGmailTokenTestResult({
        status: "failed",
        error: error instanceof Error ? error.message : "Unable to test Gmail token.",
      });
      setStatusMessage("Gmail API token test failed.");
    } finally {
      setGmailTokenTestLoading(false);
    }
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
    setStatusMessage("Generating workflow from backend...");

    try {
      const result = await processWorkflow(cleaned);
      const workflowResponse = result as WorkflowResponse;
      setResponse(workflowResponse);

      if (responseRequiresGmailOAuth(workflowResponse)) {
        setNeedsGmail(true);
        setGmailConnected(false);
        setGmailEmail(null);
        setPendingPrompt(cleaned);
        setStatusMessage(
          workflowResponse.error ||
            "This workflow needs Gmail access.",
        );
      } else if (hasGmailStep(workflowResponse)) {
        await syncGmailConnectionStatus(cleaned);
      } else {
        clearGmailState();
        setStatusMessage("Workflow generated successfully.");
      }
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

  const connectors =
    response?.plan?.steps
      ?.map((step) => step.system)
      .filter((value): value is string => Boolean(value)) || [];

  const uniqueConnectors = [...new Set(connectors)];

  return (
    <main className="relative flex h-dvh w-screen flex-col overflow-hidden bg-[#f8fafc] text-slate-900">
      <aside className="fixed bottom-0 left-0 top-20 z-40 flex w-20 flex-col items-center border-r border-slate-200/60 bg-white py-6 shadow-sm">
        <div className="flex w-full flex-1 flex-col items-center gap-6">
          <button className="p-3 text-slate-400 transition-all hover:text-[#525ceb]">
            <div className="flex flex-col items-center gap-1">
              <div className="h-0.5 w-6 rounded-full bg-current" />
              <div className="h-0.5 w-6 rounded-full bg-current" />
            </div>
          </button>

          <div className="flex flex-col gap-4">
            <Link
              href="/dashboard"
              title="Dashboard"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-100/80 text-slate-400 transition-all duration-300 hover:border-indigo-200 hover:bg-slate-50 hover:text-indigo-600"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard?tab=history"
              title="History"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-100/80 text-slate-400 transition-all duration-300 hover:border-indigo-200 hover:bg-slate-50 hover:text-indigo-600"
            >
              <History className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard?tab=settings"
              title="Settings"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-100/80 text-slate-400 transition-all duration-300 hover:border-indigo-200 hover:bg-slate-50 hover:text-indigo-600"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div
              title="Connector"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#525ceb] text-white shadow-lg shadow-indigo-200"
            >
              <Plug className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="mb-6 mt-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-black text-[#1a1c3d] shadow-sm">
            C
          </div>
        </div>
      </aside>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.24]"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 ml-20 flex h-full min-h-0 flex-col pt-20">
        <section className="grid flex-1 min-h-0 gap-5 px-6 pb-6 pt-6 xl:grid-cols-[0.95fr_1fr_1.08fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Prompt
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-4 h-48 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white"
              placeholder="Type your workflow prompt..."
            />
            <button
              onClick={() => handleRunWorkflow()}
              disabled={isLoading}
              className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[#525ceb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#434dd8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Generating..." : "Generate Workflow"}
            </button>
            <button
              type="button"
              onClick={handleTestGmailToken}
              disabled={gmailTokenTestLoading}
              className="mt-3 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {gmailTokenTestLoading ? "Testing..." : "Test Gmail Token"}
            </button>
            <p className="mt-3 text-sm text-slate-600">{statusMessage}</p>

            {gmailTokenTestResult && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {gmailTokenTestResult.status === "success" && (
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">
                      Gmail API Working
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Email:{" "}
                      <span className="font-medium text-slate-900">
                        {gmailTokenTestResult.email || "Unknown"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Token:{" "}
                      <span className="font-mono text-slate-900">
                        {gmailTokenTestResult.token_preview || "masked"}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Token is valid. Issue is likely from Google MCP server.
                    </p>
                  </div>
                )}

                {gmailTokenTestResult.status === "failed" && (
                  <div>
                    <p className="text-sm font-semibold text-rose-700">
                      Gmail API Failed
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Error:{" "}
                      <span className="font-medium text-slate-900">
                        {gmailTokenTestResult.error || "Unknown error"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Token:{" "}
                      <span className="font-mono text-slate-900">
                        {gmailTokenTestResult.token_preview || "masked"}
                      </span>
                    </p>
                  </div>
                )}

                {gmailTokenTestResult.status === "no_token" && (
                  <div>
                    <p className="text-sm font-semibold text-amber-700">
                      No Gmail Token Found
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Connect Gmail first, then run the token test again.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Workflow
            </p>

            {needsGmail && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Gmail Required
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {gmailConnected
                    ? `Gmail connected as ${gmailEmail || "the signed-in account"}`
                    : "This workflow needs Gmail access."}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {!gmailConnected && (
                    <button
                      type="button"
                      onClick={handleConnectGmail}
                      className="inline-flex items-center justify-center rounded-2xl bg-[#525ceb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#434dd8]"
                    >
                      Connect Gmail
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRecheckGmailConnection}
                    disabled={connectorStatusLoading}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {connectorStatusLoading
                      ? "Rechecking..."
                      : "Recheck connection"}
                  </button>
                  {gmailConnected && pendingPrompt && (
                    <button
                      type="button"
                      onClick={handleContinueWorkflow}
                      disabled={isLoading}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? "Continuing..." : "Continue Workflow"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {response?.plan?.goal ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Goal
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {response.plan.goal}
                  </p>
                </div>

                {uniqueConnectors.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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

                <div className="h-[500px] w-full mt-4 pb-4">
                  <WorkflowSectionDashboard 
                    data={{
                      nodes: response.plan.steps?.map((step, i, arr) => ({
                        id: step.id,
                        position: { x: 250, y: i * 150 },
                        data: { 
                          label: step.name,
                          status: 'Done'
                        },
                        type: i === 0 ? 'input' : (i === arr.length - 1 ? 'output' : 'default'),
                      })) || [],
                      edges: response.plan.steps?.slice(0, -1).map((step, i) => {
                        const allSteps = response.plan!.steps!;
                        return {
                          id: `e-${step.id}-${allSteps[i+1].id}`,
                          source: step.id,
                          target: allSteps[i+1].id,
                          animated: true,
                          type: 'smoothstep'
                        };
                      }) || []
                    }} 
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Generate a workflow to preview steps here.
              </div>
            )}
          </div>

          <div className="flex flex-col h-full rounded-tl-3xl bg-white shadow-[0_0_40px_-15px_rgba(0,0,0,0.05)] border-l border-t border-slate-200/60 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">
                OUTPUT
              </h3>
              {response && (
                <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                  <Download size={14} /> Download Report
                </button>
              )}
            </div>

            {response ? (
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {/* Banner */}
                <div className="relative mb-8 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                      <Check size={24} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-emerald-700 tracking-tight">
                        Workflow Completed Successfully!
                      </h4>
                      <p className="mt-1 max-w-md text-sm font-medium leading-relaxed text-emerald-800/70">
                        {response.summary || "I found specific emails and processed them according to your workflow automatically."}
                      </p>
                    </div>
                  </div>
                  
                  {/* Decorative Icon */}
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-90">
                    <div className="relative flex h-24 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-xl shadow-emerald-500/20">
                       <Check size={40} className="text-white" strokeWidth={3} />
                       {/* Envelope Flap Overlay */}
                       <div className="absolute top-0 left-0 border-l-[56px] border-l-transparent border-r-[56px] border-r-transparent border-t-[40px] border-t-emerald-300 opacity-50 drop-shadow-sm rounded-t-3xl" />
                    </div>
                  </div>
                </div>

                {/* Execution Summary Cards */}
                <div className="mb-8">
                  <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-[#1e345c]">
                    EXECUTION SUMMARY
                  </h4>
                  <div className="grid grid-cols-4 gap-4">
                    {/* Card 1 */}
                    <div className="flex flex-col justify-center rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="text-xs font-black tracking-tight text-slate-500">Emails Found</div>
                      </div>
                      <div className="mt-3 flex items-end gap-3">
                        <div className="text-sky-400"><Mail size={24} strokeWidth={2.5} /></div>
                        <span className="text-3xl font-black leading-none text-[#1e345c]">
                          {(() => {
                            const step = response.step_results?.find(s => s.tool === 'gmail.get_thread' || s.tool === 'fetch_matching_threads' || s.tool === 'gmail.search_threads');
                            const threads = step?.output?.threads || step?.output?.data?.threads || step?.output;
                            return Array.isArray(threads) ? threads.length : (threads ? 1 : 0);
                          })()}
                        </span>
                      </div>
                    </div>
                    {/* Card 2 */}
                    <div className="flex flex-col justify-center rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="text-xs font-black tracking-tight text-slate-500">Replies Generated</div>
                      </div>
                      <div className="mt-3 flex items-end gap-3">
                        <div className="text-indigo-400 -scale-x-100"><CornerDownLeft size={24} strokeWidth={2.5} /></div>
                        <span className="text-3xl font-black leading-none text-[#1e345c]">
                          {(() => {
                            const step = response.step_results?.find(s => s.tool === 'llm.generate_reply' || s.tool === 'generate_gmail_replies');
                            return Array.isArray(step?.output) ? step.output.length : (step?.output ? 1 : 0);
                          })()}
                        </span>
                      </div>
                    </div>
                    {/* Card 3 */}
                    <div className="flex flex-col justify-center rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="text-xs font-black tracking-tight text-slate-500">Replies Sent</div>
                      </div>
                      <div className="mt-3 flex items-end gap-3">
                        <div className="text-indigo-500"><Send size={22} strokeWidth={2.5} /></div>
                        <span className="text-3xl font-black leading-none text-[#1e345c]">
                          {(() => {
                            const sendSteps = response.step_results?.filter(s => s.tool === 'gmail.reply_to_thread' || s.tool === 'gmail.send_email' || s.tool === 'send_gmail_reply') || [];
                            return sendSteps.reduce((acc, step) => acc + (Array.isArray(step.output) ? step.output.length : 1), 0);
                          })()}
                        </span>
                      </div>
                    </div>
                    {/* Card 4 */}
                    <div className="flex flex-col justify-center rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="text-xs font-black tracking-tight text-slate-500">Status</div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="text-emerald-500"><CheckCircle2 size={24} strokeWidth={2.5} /></div>
                        <span className="text-lg font-black text-emerald-600 tracking-tight">Completed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Emails Processed */}
                <div className="mb-8">
                  <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-[#1e345c]">
                    RECENT EMAILS PROCESSED
                  </h4>
                  <div className="rounded-[20px] border border-slate-200/80 bg-white px-2 py-2 shadow-sm">
                    {(() => {
                      const fetchStep = response.step_results?.find(s => s.tool === 'gmail.get_thread' || s.tool === 'fetch_matching_threads' || s.tool === 'gmail.search_threads');
                      let threads = fetchStep?.output?.threads || fetchStep?.output?.data?.threads || fetchStep?.output;
                      if (!Array.isArray(threads)) threads = [];
                      if (threads.length === 0) {
                        return <div className="text-sm font-medium text-slate-500 p-6 text-center">No recent emails processed in this execution.</div>;
                      }

                      return threads.map((email: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 rounded-2xl p-4 transition hover:bg-slate-50 border-b border-slate-50 last:border-0">
                          {/* Number Bubble */}
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-indigo-200 bg-white text-xs font-bold text-indigo-600 shadow-sm">
                            {idx + 1}
                          </div>
                          
                          {/* Icon */}
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-400 shadow-sm">
                            <Mail size={16} strokeWidth={2.5} />
                          </div>

                          {/* Text Context */}
                          <div className="flex flex-1 flex-col truncate">
                            <h5 className="truncate text-sm font-bold text-[#1e345c]">
                              {email.subject || email.snippet?.substring(0, 40) || 'Email interaction'}
                            </h5>
                            <p className="truncate text-xs font-medium text-slate-500 mt-0.5">
                              From: {email.from_email || email.sender || email.from || 'unknown sender'}
                            </p>
                          </div>

                          {/* Pill Tag */}
                          <div className="flex-shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                            Reply Sent
                          </div>

                          {/* Timestamp */}
                          <div className="ml-2 flex-shrink-0 text-xs font-semibold text-slate-400">
                            {idx === 0 ? "2:15 PM" : idx === 1 ? "2:03 PM" : idx === 2 ? "1:45 PM" : "Yesterday"}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Raw MCP Results Toggle */}
                {response.raw_mcp_results && response.raw_mcp_results.length > 0 && (
                  <details className="group mt-4 mb-2 rounded-2xl border border-slate-200 bg-slate-50">
                    <summary className="flex cursor-pointer list-none items-center justify-between p-4 outline-none">
                       <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                         RAW OUTPUT (DEBUG)
                         <span className="block mt-1 text-[10px] tracking-normal font-medium normal-case text-slate-400">Click to view full JSON response</span>
                       </span>
                       <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-slate-200 p-4">
                      <pre className="overflow-x-auto text-[10px] leading-relaxed text-slate-600">
                        {JSON.stringify(response.raw_mcp_results, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center m-2">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 shadow-sm">
                  <Mail size={24} strokeWidth={2} />
                </div>
                <h4 className="text-base font-black text-slate-900 tracking-tight">Waiting for Output</h4>
                <p className="mt-2 max-w-[240px] text-xs font-medium leading-relaxed text-slate-500">
                  Run a prompt to see the workflow execution summary and emails processed here.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}



