"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  CornerDownLeft,
  Download,
  Mail,
  Copy,
  Send,
} from "lucide-react";
import EmailCard from "./EmailCard";
import WorkflowFormBox from "./WorkflowFormBox";
import ThreadView from "./ThreadView";
import type { CompletionResult, ConvStep, WorkflowResponse } from "./types";
import MonitoringPanel from "./MonitoringPanel";

type WorkflowOperationType =
  | "reply"
  | "reply_to_thread"
  | "send"
  | "automate"
  | "fetch"
  | "search"
  | "read"
  | "read_attachment"
  | "analyze"
  | "classify";

type OutputSectionConnectorProps = {
  response: WorkflowResponse | null;
  completionResult?: CompletionResult | null;
  onSendPrompt?: (prompt: string) => void;
  partialIntent?: Record<string, unknown> | null;
  convStep?: ConvStep;
};

export default function OutputSectionConnector({
  response,
  completionResult,
  onSendPrompt,
  partialIntent,
  convStep,
}: OutputSectionConnectorProps) {
  const responseExtras = response as
    | (WorkflowResponse & { to?: unknown; recipient?: unknown })
    | null;
  const [rawCopied, setRawCopied] = useState(false);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [isThreadViewOpen, setIsThreadViewOpen] = useState(false);

  useEffect(() => {
    setSelectedThread(null);
    setIsThreadViewOpen(false);
  }, [response]);

  const completionTitle =
    completionResult?.status === "automation_rule_created"
      ? "Workflow complete"
      : completionResult?.status === "one_time_completed"
        ? "Email processed"
        : "";

  const emailsFound = (() => {
    const step = response?.step_results?.find(
      (s) =>
        s.tool === "gmail.get_thread" ||
        s.tool === "fetch_latest_thread" ||
        s.tool === "fetch_matching_threads" ||
        s.tool === "gmail.search_threads" ||
        s.tool === "finalize" ||
        s.kind === "finalize"
    );

    const threads = step?.output?.threads || step?.output?.data?.threads || step?.output;

    if (Array.isArray(threads)) return threads.length;
    if (step?.output) return 1;
    return 0;
  })();

  const repliesGenerated = (() => {
    const step = response?.step_results?.find(
      (s) => s.tool === "llm.generate_reply" || s.tool === "generate_gmail_replies"
    );

    return Array.isArray(step?.output) ? step.output.length : step?.output ? 1 : 0;
  })();

  const operationType = (() => {
    const gmailIntent = response?.plan?.gmail_intent;
    const rawOperation =
      gmailIntent && typeof gmailIntent === "object" && !Array.isArray(gmailIntent)
        ? (gmailIntent as { operation?: unknown }).operation
        : undefined;
    const rawResolvedOperation =
      (typeof rawOperation === "string" && rawOperation) ||
      (response?.execution_type === "automated" ? "automate" : response?.execution_type) ||
      "send";
    const resolvedOperation =
      rawResolvedOperation === "send_email"
        ? "send"
        : rawResolvedOperation === "reply_thread"
          ? "reply_to_thread"
          : rawResolvedOperation === "fetch_attachment"
            ? "read_attachment"
            : rawResolvedOperation === "automation_rule"
              ? "automate"
              : rawResolvedOperation === "draft_reply"
                ? "reply"
                : rawResolvedOperation;

    switch (resolvedOperation) {
      case "reply":
      case "reply_to_thread":
      case "send":
      case "automate":
      case "fetch":
      case "search":
      case "read":
      case "read_attachment":
      case "analyze":
      case "classify":
        return resolvedOperation;
      default:
        return "send";
    }
  })() as WorkflowOperationType;

  const repliesSent = (() => {
    const sendSteps =
      response?.step_results?.filter(
        (s) =>
          s.tool === "gmail.reply_to_thread" ||
          s.tool === "gmail.send_email" ||
          s.tool === "send_gmail_reply"
      ) || [];

    const fromSteps = sendSteps.reduce(
      (acc, step) => acc + (Array.isArray(step.output) ? step.output.length : 1),
      0
    );
    if (fromSteps > 0) return fromSteps;
    if (
      operationType === "send" &&
      response?.success === true &&
      response?.status === "completed"
    ) {
      return 1;
    }
    return 0;
  })();

  const sentReplyText =
    completionResult?.reply_sent ||
    response?.reply_sent ||
    completionResult?.reply_draft ||
    response?.reply_draft ||
    completionResult?.reply ||
    response?.reply ||
    null;
  const replyLabel =
    completionResult?.reply_sent || response?.reply_sent
      ? "AGENT REPLY SENT"
      : sentReplyText
        ? "AGENT REPLY DRAFT"
        : null;

  const processedEmails = extractProcessedEmails(response);

  const handleViewThread = (threadId: string, email?: any) => {
    const threadSource = hasThreadMessages(email) ? normalizeThreadForView(email) : null;
    if (threadSource) {
      setSelectedThread(threadSource);
      setIsThreadViewOpen(true);
      return;
    }

    if (threadId && onSendPrompt) {
      onSendPrompt(`Get thread ${threadId}`);
    }
  };

  const promptTokens = response?.prompt_tokens ?? 0;
  const completionTokens = response?.completion_tokens ?? 0;
  const totalTokens = response?.total_tokens ?? promptTokens + completionTokens;
  const estimatedCost = response?.estimated_cost_usd ?? 0;
  const estimatedCostLabel = `$${estimatedCost.toFixed(4)} USD`;

  const bannerStatus =
    response?.status === "needs_confirmation" ||
    response?.status === "needs_clarification"
      ? "pending"
      : response?.status === "failed" || response?.error
        ? "failed"
        : "success";

  const bannerConfig = {
    success: {
      bg: "bg-emerald-50/50 border-emerald-100",
      iconBg: "bg-emerald-500",
      titleColor: "text-emerald-700",
      textColor: "text-emerald-800/70",
      title: "Workflow Completed Successfully!",
    },
    pending: {
      bg: "bg-amber-50/50 border-amber-100",
      iconBg: "bg-amber-500",
      titleColor: "text-amber-700",
      textColor: "text-amber-800/70",
      title: "Action Required",
    },
    failed: {
      bg: "bg-rose-50/50 border-rose-100",
      iconBg: "bg-rose-500",
      titleColor: "text-rose-700",
      textColor: "text-rose-800/70",
      title: "Workflow Failed",
    },
  }[bannerStatus];

  const rawOutputDebug =
    response?.raw_mcp_results && response.raw_mcp_results.length > 0
      ? JSON.stringify(response.raw_mcp_results, null, 2)
      : "";

  const handleCopyRawOutput = async () => {
    if (!rawOutputDebug) return;

    try {
      await navigator.clipboard.writeText(rawOutputDebug);
      setRawCopied(true);
      window.setTimeout(() => setRawCopied(false), 1500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = rawOutputDebug;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setRawCopied(true);
      window.setTimeout(() => setRawCopied(false), 1500);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-tl-3xl border-l border-t border-slate-200/60 bg-white p-6 shadow-[0_0_40px_-15px_rgba(0,0,0,0.05)]">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">
          OUTPUT
        </h3>

        {response && (
          <button
            onClick={() => {
              const reportData = {
                goal: response.plan?.goal,
                status: response.status,
                summary: response.summary,
                final_answer: response.final_answer,
                emails_found: emailsFound,
                replies_generated: repliesGenerated,
                replies_sent: repliesSent,
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: totalTokens,
                estimated_cost_usd: estimatedCost,
                step_results: response.step_results,
                timestamp: new Date().toISOString(),
              };
              const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `workflow-report-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Download size={14} /> Download Report
          </button>
        )}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
        {completionResult?.status && (
          <div
            className="mb-8 rounded-2xl border border-green-100 bg-green-50/80 p-4"
            style={{ borderLeft: "4px solid #22c55e" }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-green-600">
                <CheckCircle2 size={22} strokeWidth={2.5} />
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-base font-black tracking-tight text-green-700">
                  {completionTitle}
                </h4>

                <p className="mt-1 text-sm leading-relaxed text-green-800/80">
                  {completionResult.message}
                </p>

                {completionResult.reply_sent ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Agent reply sent:
                    </div>
                    <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-slate-600">
                      {completionResult.reply_sent}
                    </blockquote>
                  </div>
                ) : null}

                {typeof completionResult.rule_id === "number" ? (
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    Rule ID: {completionResult.rule_id}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {response ? (
          <>
            <div className={`relative mb-8 overflow-hidden rounded-2xl border p-6 ${bannerConfig.bg}`}>
              <div className="relative z-10 flex items-center gap-4">
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md shadow-emerald-500/20 ${bannerConfig.iconBg}`}>
                  <Check size={24} strokeWidth={3} />
                </div>

                <div>
                  <h4 className={`text-lg font-black tracking-tight ${bannerConfig.titleColor}`}>
                    {bannerConfig.title}
                  </h4>

                  <p className={`mt-1 max-w-md text-sm font-medium leading-relaxed ${bannerConfig.textColor}`}>
                    {response.summary ||
                      "I found specific emails and processed them according to your workflow automatically."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-[#1e345c]">
                EXECUTION SUMMARY
              </h4>

              <div className="grid grid-cols-4 gap-4">
                <SummaryCard
                  title="Emails Found"
                  value={emailsFound}
                  icon={<Mail size={24} strokeWidth={2.5} />}
                  iconClassName="text-sky-400"
                />

                <SummaryCard
                  title="Replies Generated"
                  value={repliesGenerated}
                  icon={<CornerDownLeft size={24} strokeWidth={2.5} />}
                  iconClassName="text-indigo-400 -scale-x-100"
                />

                <SummaryCard
                  title="Replies Sent"
                  value={repliesSent}
                  icon={<Send size={22} strokeWidth={2.5} />}
                  iconClassName="text-indigo-500"
                />

                <div className="flex flex-col justify-center rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black tracking-tight text-slate-500">
                    Status
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="text-emerald-500">
                      <CheckCircle2 size={24} strokeWidth={2.5} />
                    </div>

                    <span className="text-lg font-black tracking-tight text-emerald-600">
                      Completed
                    </span>
                  </div>
              </div>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-[#1e345c]">
                TOKEN USAGE
              </h4>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <TokenCard label="Prompt Tokens" value={promptTokens} accentClassName="text-sky-500" />
                <TokenCard label="Completion Tokens" value={completionTokens} accentClassName="text-indigo-500" />
                <TokenCard label="Total Tokens" value={totalTokens} accentClassName="text-emerald-500" />
                <div className="flex flex-col justify-center rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black tracking-tight text-slate-500">
                    Estimated Cost
                  </div>
                  <div className="mt-3 text-2xl font-black tracking-tight text-[#1e345c]">
                    {estimatedCostLabel}
                  </div>
                </div>
              </div>
            </div>

          {sentReplyText && replyLabel ? (
            <div className="mb-8">
              <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-[#1e345c]">
                {replyLabel}
              </h4>

              <div
                className={`rounded-[20px] p-5 shadow-sm ${
                  replyLabel === "AGENT REPLY SENT"
                    ? "border border-emerald-200 bg-emerald-50/70"
                    : "border border-amber-200 bg-amber-50/70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                      replyLabel === "AGENT REPLY SENT"
                        ? "bg-emerald-500 shadow-emerald-500/20"
                        : "bg-amber-500 shadow-amber-500/20"
                    }`}
                  >
                    <Send size={18} strokeWidth={2.5} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-black tracking-tight ${
                          replyLabel === "AGENT REPLY SENT"
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        {replyLabel === "AGENT REPLY SENT" ? "Reply delivered" : "Draft prepared"}
                      </span>
                      <span
                        className={`rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${
                          replyLabel === "AGENT REPLY SENT"
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        Gmail
                      </span>
                    </div>

                    <p
                      className={`mt-1 text-sm leading-relaxed ${
                        replyLabel === "AGENT REPLY SENT"
                          ? "text-emerald-900/80"
                          : "text-amber-900/80"
                      }`}
                    >
                      {replyLabel === "AGENT REPLY SENT"
                        ? "This is the message your agent sent back through the original email thread."
                        : "This is the message your agent prepared for review."}
                    </p>

                    <blockquote
                      className={`mt-4 rounded-2xl border bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm ${
                        replyLabel === "AGENT REPLY SENT"
                          ? "border-emerald-200"
                          : "border-amber-200"
                      }`}
                    >
                      {sentReplyText}
                    </blockquote>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {(convStep === "done" ||
            convStep === "waiting_email" ||
            convStep === "waiting_field" ||
            response?.status === "needs_confirmation") &&
            response &&
            (response.from_email ||
              response.subject ||
              response.execution_type ||
              responseExtras?.to ||
              responseExtras?.recipient ||
              response.step_results?.some(
                (s) =>
                  s.tool === "gmail.send_email" ||
                  s.tool === "send_gmail_email" ||
                  s.tool === "gmail.reply_to_thread"
              ) ||
              partialIntent?.filters ||
              partialIntent?.original_prompt) && (
              <div className="mb-8">
                <WorkflowFormBox
                  key={[
                    operationType,
                    response.from_email || "",
                    response.subject || "",
                    response.execution_type || "",
                    partialIntent?.max_results ?? "",
                    partialIntent?.reply_tone ?? "",
                  ].join("|")}
                  response={response}
                  partialIntent={partialIntent}
                  operationType={operationType}
                  onRerun={onSendPrompt || (() => {})}
                />
              </div>
            )}

          <div className="mb-8">
            <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-[#1e345c]">
              RECENT EMAILS PROCESSED
            </h4>

            {isThreadViewOpen && selectedThread ? (
              <div className="mb-4">
                <ThreadView
                  {...({
                    thread: selectedThread,
                    onClose: () => {
                      setIsThreadViewOpen(false);
                      setSelectedThread(null);
                    },
                  } as any)}
                />
              </div>
            ) : null}

            <EmailList
              emails={processedEmails}
              onSendPrompt={onSendPrompt}
              onViewThread={handleViewThread}
            />
          </div>

            <MonitoringPanel />

            {response.raw_mcp_results && response.raw_mcp_results.length > 0 && (
              <details className="group mb-2 mt-4 rounded-2xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 outline-none">
                  <div className="min-w-0">
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                      RAW OUTPUT DEBUG
                    </span>
                    <span className="mt-1 block text-[10px] font-medium normal-case tracking-normal text-slate-400">
                      Click to view full JSON response
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleCopyRawOutput();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100"
                    >
                      <Copy size={12} />
                      {rawCopied ? "Copied" : "Copy"}
                    </button>

                    <ChevronDown
                      size={16}
                      className="text-slate-400 transition-transform group-open:rotate-180"
                    />
                  </div>
                </summary>

                <div className="border-t border-slate-200 p-4">
                  <pre className="overflow-x-auto text-[10px] leading-relaxed text-slate-600">
                    {rawOutputDebug}
                  </pre>
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="m-2 flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 shadow-sm">
              <Mail size={24} strokeWidth={2} />
            </div>

            <h4 className="text-base font-black tracking-tight text-slate-900">
              Waiting for Output
            </h4>

            <p className="mt-2 max-w-[240px] text-xs font-medium leading-relaxed text-slate-500">
              Run a prompt to see the workflow execution summary and emails processed here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  iconClassName,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconClassName?: string;
}) {
  return (
    <div className="flex flex-col justify-center rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="text-xs font-black tracking-tight text-slate-500">{title}</div>

      <div className="mt-3 flex items-end gap-3">
        <div className={iconClassName}>{icon}</div>

        <span className="text-3xl font-black leading-none text-[#1e345c]">
          {value}
        </span>
      </div>
    </div>
  );
}

function TokenCard({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: number;
  accentClassName: string;
}) {
  return (
    <div className="flex flex-col justify-center rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="text-xs font-black tracking-tight text-slate-500">{label}</div>
      <div className={`mt-3 text-3xl font-black leading-none ${accentClassName}`}>
        {value}
      </div>
    </div>
  );
}

function EmailList({
  emails,
  onSendPrompt,
  onViewThread,
}: {
  emails: any[];
  onSendPrompt?: (prompt: string) => void;
  onViewThread?: (threadId: string, email?: any) => void;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white px-2 py-2 shadow-sm">
      {emails.length === 0 ? (
        <div className="p-6 text-center text-sm font-medium text-slate-500">
          No recent emails processed in this execution.
        </div>
      ) : (
        <div className="space-y-3 p-2">
          {emails.map((email, idx) => (
            <EmailCard
              key={getEmailCardKey(email, idx)}
              email={email}
              index={idx}
              onReadEmail={(id) => onSendPrompt?.(`Read email ${id}`)}
              onViewThread={onViewThread}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function extractProcessedEmails(response: WorkflowResponse | null) {
  const steps =
    response?.step_results?.filter((step) =>
      [
        "gmail.search_threads",
        "gmail.get_thread",
        "fetch_matching_threads",
        "finalize",
      ].includes(step.tool || "") || step.kind === "finalize"
    ) ?? [];

  const seen = new Set<string>();
  const emails: any[] = [];

  for (const step of steps) {
    for (const record of flattenEmailRecords(step.output, step.tool)) {
      const key = getEmailDedupKey(record);
      if (seen.has(key)) continue;
      seen.add(key);
      emails.push(record);
    }
  }

  return emails;
}

function flattenEmailRecords(output: any, tool?: string): any[] {
  if (!output) return [];

  if (Array.isArray(output)) {
    return output.flatMap((item) => flattenEmailRecords(item, tool));
  }

  if (typeof output !== "object") {
    return [];
  }

  const record = output as Record<string, any>;
  const nested = record.data && typeof record.data === "object" ? record.data : null;
  if (nested) {
    const nestedRecords = flattenEmailRecords(nested, tool);
    if (nestedRecords.length > 0) {
      return nestedRecords;
    }
  }

  if (Array.isArray(record.threads)) {
    return record.threads.flatMap((thread) => normalizeThreadRecord(thread, tool));
  }

  if (Array.isArray(record.messages)) {
    return [normalizeThreadRecord(record, tool)];
  }

  if (record.data && typeof record.data === "object") {
    if (Array.isArray(record.data.threads)) {
      return record.data.threads.flatMap((thread: any) => normalizeThreadRecord(thread, tool));
    }

    if (Array.isArray(record.data.messages)) {
      return [normalizeThreadRecord(record.data, tool)];
    }
  }

  if (record.payload || record.internalDate || record.internal_date || record.snippet) {
    return [normalizeMessageRecord(record, tool)];
  }

  return [normalizeThreadRecord(record, tool)];
}

function normalizeThreadRecord(record: Record<string, any>, tool?: string) {
  const messages = normalizeThreadMessages(extractThreadMessages(record));
  const summaryMessage = messages.length > 0 ? messages[messages.length - 1] : record;
  const summary = normalizeMessageRecord(summaryMessage, tool);
  const threadId = getThreadId(record) || getThreadId(summary) || getEmailId(record);
  const messageCount = getThreadMessageCount(record, messages);
  const attachmentCount = getAttachmentCount(record, messages);

  return {
    ...record,
    ...summary,
    id: getEmailId(summary) || getEmailId(record) || threadId,
    message_id: getMessageId(summary) || getMessageId(record),
    thread_id: threadId || undefined,
    threadId: threadId || record.threadId,
    messages,
    message_count: messageCount,
    thread_message_count: record.thread_message_count ?? messageCount,
    from_email: getSender(summary) || getSender(record),
    to: getReceiver(summary) || getReceiver(record),
    subject: summary.subject || record.subject || record.title || "Email interaction",
    date_str: summary.date_str || summary.date || record.date_str || record.date,
    snippet: getSnippet(summary) || getSnippet(record),
    body_preview: summary.body_preview || summary.body || summary.text || getSnippet(record),
    has_attachments:
      Boolean(record.has_attachments) || attachmentCount > 0 || Boolean(summary.has_attachments),
    attachment_count: typeof record.attachment_count === "number" ? record.attachment_count : attachmentCount,
    tool,
  };
}

function normalizeMessageRecord(record: Record<string, any>, tool?: string) {
  const source = record.data && typeof record.data === "object" ? record.data : record;
  const headers = extractHeaders(source);
  const payload = source.payload && typeof source.payload === "object" ? source.payload : null;
  const attachmentCount = countAttachmentsFromMessage(source);
  const threadId = getThreadId(source);
  const messageId = getMessageId(source);
  const id = getEmailId(source) || messageId || threadId;
  const fromHeader = getHeaderValue(headers, "From");
  const toHeader = getHeaderValue(headers, "To");
  const subjectHeader = getHeaderValue(headers, "Subject");
  const dateHeader = getHeaderValue(headers, "Date");
  const snippet = getSnippet(source);

  return {
    ...record,
    ...source,
    id,
    message_id: messageId || id,
    thread_id: threadId || undefined,
    threadId: threadId || source.threadId,
    from_email: firstString(source.from_email, source.from, source.sender, source.sender_email, fromHeader),
    to: firstString(source.to, source.receiver, source.to_email, toHeader),
    subject: firstString(source.subject, source.title, subjectHeader) || "Email interaction",
    date_str: firstString(source.date_str, source.date, dateHeader),
    internalDate: source.internalDate ?? source.internal_date,
    snippet,
    body_preview: firstString(source.body_preview, source.body, source.text, snippet),
    has_attachments: Boolean(source.has_attachments) || attachmentCount > 0,
    attachment_count: source.attachment_count ?? attachmentCount,
    thread_message_count: source.thread_message_count ?? 1,
    message_count: source.message_count ?? 1,
    messages: Array.isArray(source.messages) ? source.messages : undefined,
    tool,
    payload,
  };
}

function extractThreadMessages(record: Record<string, any>) {
  const messages = Array.isArray(record.messages)
    ? record.messages
    : record.data && Array.isArray(record.data.messages)
      ? record.data.messages
      : Array.isArray(record.output?.messages)
        ? record.output.messages
        : record.thread && Array.isArray(record.thread.messages)
          ? record.thread.messages
          : [];

  return messages.filter((message: any) => message && typeof message === "object");
}

function normalizeThreadMessages(messages: any[]) {
  const seen = new Set<string>();
  const normalized = messages
    .map((message) => normalizeThreadMessage(message))
    .filter((message) => {
      const key = getMessageKey(message);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort(compareThreadMessages);

  return normalized;
}

function normalizeThreadMessage(message: any) {
  const source = message?.data && typeof message.data === "object" ? message.data : message;
  return {
    ...source,
    id: firstString(source?.id, source?.message_id, source?.gmail_id),
    message_id: firstString(source?.message_id, source?.id, source?.gmail_id),
    thread_id: firstString(source?.thread_id, source?.threadId),
    internalDate: source?.internalDate ?? source?.internal_date,
    date_str: firstString(source?.date_str, source?.date),
  };
}

function compareThreadMessages(a: any, b: any) {
  const aTime = getMessageSortTime(a);
  const bTime = getMessageSortTime(b);
  if (aTime !== bTime) {
    return aTime - bTime;
  }
  return String(a.id || a.message_id || "").localeCompare(String(b.id || b.message_id || ""));
}

function extractHeaders(record: Record<string, any>) {
  const payload = record.payload && typeof record.payload === "object" ? record.payload : null;
  const rawHeaders = payload?.headers;

  if (!Array.isArray(rawHeaders)) {
    return [];
  }

  return rawHeaders.filter((header) => header && typeof header === "object");
}

function getHeaderValue(headers: any[], headerName: string) {
  const match = headers.find(
    (header) => String(header?.name || "").toLowerCase() === headerName.toLowerCase()
  );
  const value = match?.value;
  return typeof value === "string" ? value.trim() : "";
}

function getThreadMessageCount(record: Record<string, any>, messages: any[]) {
  if (typeof record.thread_message_count === "number") {
    return record.thread_message_count;
  }

  if (typeof record.message_count === "number") {
    return record.message_count;
  }

  if (messages.length > 0) {
    return messages.length;
  }

  return 1;
}

function getAttachmentCount(record: Record<string, any>, messages: any[]) {
  if (typeof record.attachment_count === "number") {
    return record.attachment_count;
  }

  const messageAttachmentTotal = messages.reduce(
    (total, message) => total + countAttachmentsFromMessage(message),
    0
  );

  if (messageAttachmentTotal > 0) {
    return messageAttachmentTotal;
  }

  return countAttachmentsFromMessage(record);
}

function countAttachmentsFromMessage(message: any): number {
  if (!message || typeof message !== "object") {
    return 0;
  }

  if (typeof message.attachment_count === "number") {
    return message.attachment_count;
  }

  const attachments = Array.isArray(message.attachments) ? message.attachments.length : 0;
  if (attachments > 0) {
    return attachments;
  }

  if (message.has_attachments === true) {
    return 1;
  }

  const payload = message.payload && typeof message.payload === "object" ? message.payload : null;
  return countAttachmentParts(payload);
}

function countAttachmentParts(node: any): number {
  if (!node || typeof node !== "object") {
    return 0;
  }

  let total = 0;
  if (typeof node.filename === "string" && node.filename.trim()) {
    total += 1;
  }

  if (node.body && typeof node.body === "object" && node.body.attachmentId) {
    total += 1;
  }

  if (Array.isArray(node.parts)) {
    for (const part of node.parts) {
      total += countAttachmentParts(part);
    }
  }

  return total;
}

function getEmailCardKey(email: any, index: number) {
  return getEmailDedupKey(email) || `email-${index}`;
}

function getEmailDedupKey(email: any) {
  return (
    getThreadId(email) ||
    getMessageId(email) ||
    getEmailId(email) ||
    getSender(email) ||
    `${getSender(email)}|${getReceiver(email)}|${getSnippet(email)}|${getDateValue(email)}`
  );
}

function getEmailId(email: any) {
  return firstString(email?.id, email?.message_id, email?.thread_id, email?.threadId);
}

function getMessageId(email: any) {
  return firstString(email?.message_id, email?.messageId, email?.id);
}

function getThreadId(email: any) {
  return firstString(email?.thread_id, email?.threadId, email?.id, email?.message_id);
}

function getSender(email: any) {
  return firstString(email?.from_email, email?.from, email?.sender, email?.sender_email);
}

function getReceiver(email: any) {
  return firstString(email?.to, email?.receiver, email?.to_email);
}

function getSnippet(email: any) {
  return firstString(email?.snippet, email?.body_preview, email?.body, email?.text);
}

function getDateValue(email: any) {
  return firstString(email?.date_str, email?.date, email?.internalDate, email?.internal_date);
}

function getMessageSortTime(message: any) {
  const internalRaw = firstString(message?.internalDate, message?.internal_date);
  const internalValue = internalRaw ? Number.parseInt(internalRaw, 10) : Number.NaN;
  if (Number.isFinite(internalValue)) {
    return internalValue;
  }

  const parsed = Date.parse(firstString(message?.date_str, message?.date));
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return 0;
}

function getMessageKey(message: any) {
  return (
    firstString(message?.id, message?.message_id, message?.gmail_id) ||
    `${getSender(message)}|${getSubject(message)}|${getBody(message)}|${getDateValue(message)}`
  );
}

function getSubject(email: any) {
  return firstString(email?.subject, email?.title);
}

function getBody(email: any) {
  return firstString(email?.body, email?.text, email?.plain_text, email?.snippet, email?.body_preview);
}

function hasThreadMessages(email: any) {
  const messages = extractThreadMessages(email);
  return messages.length > 0;
}

function normalizeThreadForView(email: any) {
  const messages = normalizeThreadMessages(extractThreadMessages(email));
  return {
    ...email,
    messages,
    thread_message_count: messages.length || email?.thread_message_count || email?.message_count || 1,
    message_count: messages.length || email?.message_count || email?.thread_message_count || 1,
  };
}

function firstString(...values: any[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}
