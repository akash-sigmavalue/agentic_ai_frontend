"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CompletionResult, ConvStep, GmailAttachmentFile, GmailUiEmail, WorkflowResponse } from "./types";
import AiEmptyState from "./AiEmptyState";
import AiPanelHeader from "./AiPanelHeader";
import WorkflowFormBox from "./WorkflowFormBox";
import GmailActionForm from "./GmailActionForm";
import EditableReplyDraft from "./EditableReplyDraft";

type OutputSectionConnectorProps = {
  response: WorkflowResponse | null;
  completionResult?: CompletionResult | null;
  onSendPrompt?: (prompt: string) => void;
  partialIntent?: Record<string, unknown> | null;
  convStep?: ConvStep;
};

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
  | "classify"
  | "label"
  | "flag"
  | "delete"
  | "contact"
  | "insight"
  | "chain";

const EMAILS_PER_PAGE = 5;

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

function normalizeOperation(response: WorkflowResponse | null): WorkflowOperationType {
  const gmailIntent = response?.plan?.gmail_intent;
  const intentRecord = isRecord(gmailIntent) ? gmailIntent : null;

  // Pull from intent object first, then fall through to execution_type, then
  // first step_result tool/kind, then first plan step operation — so every
  // group has a real source string to work from.
  const firstStepTool = firstString(
    response?.step_results?.[0]?.tool,
    response?.step_results?.[0]?.kind,
  );
  const firstPlanOp = firstString(
    response?.plan?.steps?.[0]?.operation,
    response?.plan?.steps?.[0]?.kind,
    response?.plan?.steps?.[0]?.name,
  );

  const rawOperation = firstString(
    intentRecord?.operation,
    intentRecord?.intent,
    intentRecord?.type,
    response?.execution_type === "automated" ? "automate" : response?.execution_type,
    firstStepTool,
    firstPlanOp,
  ).toLowerCase();

  const value = rawOperation.replace(/-/g, "_");

  const aliases: Record<string, WorkflowOperationType> = {
    // G1 – Fetch / Display
    fetch_email: "fetch",
    fetch_emails: "fetch",
    list_email: "fetch",
    list_emails: "fetch",
    get_emails: "fetch",
    display_email: "fetch",
    // G2 – Search
    search_email: "search",
    search_emails: "search",
    search_threads: "search",
    find_email: "search",
    find_emails: "search",
    // G3 – Read Full Thread
    read_email: "read",
    read_thread: "read",
    get_thread: "read",
    full_thread: "read",
    thread_view: "read",
    // G4 – Attachment
    fetch_attachment: "read_attachment",
    read_attachments: "read_attachment",
    get_attachment: "read_attachment",
    download_attachment: "read_attachment",
    attachment: "read_attachment",
    // G5 – Analyze / Classify
    summarize: "analyze",
    summarise: "analyze",
    extract: "analyze",
    extraction: "analyze",
    analyze_email: "analyze",
    analyse_email: "analyze",
    classify_email: "classify",
    classify: "classify",
    categorize: "classify",
    categorise: "classify",
    // G6 – Reply
    reply_to_email: "reply",
    draft_reply: "reply",
    create_draft: "reply",
    // G7 – Send New Email
    send_email: "send",
    email_send: "send",
    compose_email: "send",
    new_email: "send",
    // G8 – Automate
    automation_rule: "automate",
    auto_reply: "automate",
    automated: "automate",
    create_rule: "automate",
    schedule_email: "automate",
    // G9 – Label / Organize
    label: "label",
    label_email: "label",
    label_emails: "label",
    add_label: "label",
    apply_label: "label",
    organize: "label",
    archive: "label",
    move_email: "label",
    // G10 – Draft
    reply_thread: "reply_to_thread",
    // G11 – Contact / People
    contact: "contact",
    contacts: "contact",
    find_contact: "contact",
    who_emails: "contact",
    top_senders: "contact",
    sender_info: "contact",
    people: "contact",
    // G12 – Status / Flag
    flag: "flag",
    mark_read: "flag",
    mark_unread: "flag",
    mark_as_read: "flag",
    mark_as_unread: "flag",
    status: "flag",
    flag_email: "flag",
    // G13 – Delete / Clean
    delete: "delete",
    delete_email: "delete",
    delete_emails: "delete",
    trash: "delete",
    clean: "delete",
    remove_email: "delete",
    // G14 – Report / Insight
    insight: "insight",
    report: "insight",
    analytics: "insight",
    summary_report: "insight",
    email_report: "insight",
    top_senders_report: "insight",
    weekly_summary: "insight",
    // G15 – Multi-Step Chain
    chain: "chain",
    multi_step: "chain",
    pipeline: "chain",
    workflow_chain: "chain",
    multi_step_chain: "chain",
  };

  if (aliases[value]) return aliases[value];

  const allValid: WorkflowOperationType[] = [
    "reply", "reply_to_thread", "send", "automate", "fetch", "search",
    "read", "read_attachment", "analyze", "classify",
    "label", "flag", "delete", "contact", "insight", "chain",
  ];
  if (allValid.includes(value as WorkflowOperationType)) {
    return value as WorkflowOperationType;
  }

  // Last-resort: scan all step names/operations for a recognisable keyword.
  const allStepText = (response?.plan?.steps || [])
    .map((step) => `${step.operation || ""} ${step.name || ""} ${step.kind || ""}`)
    .concat((response?.step_results || []).map((step) => `${step.tool || ""} ${step.kind || ""}`))
    .join(" ")
    .toLowerCase();

  if (allStepText.includes("label") || allStepText.includes("archive")) return "label";
  if (allStepText.includes("delete") || allStepText.includes("trash")) return "delete";
  if (allStepText.includes("flag") || allStepText.includes("mark_read") || allStepText.includes("mark_unread")) return "flag";
  if (allStepText.includes("contact") || allStepText.includes("sender")) return "contact";
  if (allStepText.includes("insight") || allStepText.includes("report")) return "insight";
  if (allStepText.includes("send")) return "send";
  if (allStepText.includes("search") || allStepText.includes("find")) return "search";

  return "fetch";
}

function looksLikeRawGmailPayload(value?: string | null) {
  if (!value) return false;

  const rawMarkers = [
    "payload",
    "headers",
    "DKIM-Signature",
    "ARC-Seal",
    "Received-SPF",
    "X-Google-DKIM-Signature",
    "Authentication-Results",
    "mimeType",
    "historyId",
    "internalDate",
    "raw_mcp_results",
  ];

  return rawMarkers.some((marker) => value.includes(marker));
}

function getResultText(response: WorkflowResponse | null, completionResult: CompletionResult | null) {
  const candidates = [
    completionResult?.reply_sent,
    response?.reply_sent,
    completionResult?.reply_draft,
    response?.reply_draft,
    completionResult?.reply,
    response?.reply,
    response?.analysis,
    response?.final_answer,
    response?.chat_message,
  ];

  for (const item of candidates) {
    if (typeof item === "string" && item.trim() && !looksLikeRawGmailPayload(item)) {
      return item.trim();
    }
  }

  return "";
}

function deepFindString(value: unknown, keys: string[], depth = 0): string {
  if (!value || depth > 5) return "";

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindString(item, keys, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (!isRecord(value)) return "";

  for (const key of keys) {
    const direct = value[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    if (typeof direct === "number") return String(direct);
  }

  for (const nested of Object.values(value)) {
    const found = deepFindString(nested, keys, depth + 1);
    if (found) return found;
  }

  return "";
}

function extractThreadId(response: WorkflowResponse | null): string {
  return firstString(
    response?.thread_id,
    response?.partial_intent?.thread_id,
    deepFindString(response?.raw_mcp_results, ["thread_id", "threadId"]),
    deepFindString(response?.step_results, ["thread_id", "threadId"]),
    deepFindString(response?.ui_result?.emails, ["thread_id", "threadId", "id"]),
  );
}

function extractDraftId(response: WorkflowResponse | null): string {
  return firstString(
    response?.draft_id,
    response?.partial_intent?.draft_id,
    deepFindString(response?.raw_mcp_results, ["draft_id", "draftId", "id"]),
    deepFindString(response?.step_results, ["draft_id", "draftId"]),
  );
}

function buildSendEditedReplyPrompt(response: WorkflowResponse | null, editedBody: string) {
  const threadId = extractThreadId(response);
  const subject = firstString(response?.subject, deepFindString(response?.step_results, ["subject"]));
  const recipient = firstString(response?.from_email, deepFindString(response?.step_results, ["from_email", "from"]));

  return [
    "[confirmed] Send edited Gmail reply",
    threadId ? `Thread ID: ${threadId}` : "Thread ID: missing_from_response",
    subject ? `Subject: ${subject}` : "",
    recipient ? `Recipient / To: ${recipient}` : "",
    "Send Directly: true",
    "Operation: send_reply",
    "",
    "Edited Reply Body:",
    editedBody.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSaveEditedDraftPrompt(response: WorkflowResponse | null, editedBody: string) {
  const threadId = extractThreadId(response);
  const draftId = extractDraftId(response);

  return [
    "Save this edited Gmail reply as draft",
    threadId ? `Thread ID: ${threadId}` : "Thread ID: missing_from_response",
    draftId ? `Draft ID: ${draftId}` : "",
    "Operation: draft_reply",
    "",
    "Edited Reply Body:",
    editedBody.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

function isReplyDraftOperation(operationType: WorkflowOperationType) {
  return operationType === "reply" || operationType === "reply_to_thread";
}

function FormattedAiResult({ text, operationType }: { text: string; operationType: WorkflowOperationType }) {
  const title =
    operationType === "analyze" || operationType === "classify" || operationType === "insight"
      ? "Extracted key details"
      : "AI Result";

  return (
    <article className="connector-card overflow-hidden rounded-[22px] border border-slate-200/70 bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-700/80 dark:bg-slate-900/80">
      <div className="border-b border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="mb-2 w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-500">
          Readable report
        </div>
        <h3 className="text-base font-black text-slate-950 dark:text-white">{title}</h3>
      </div>
      <div className="p-5">
        <div className="max-w-none text-sm leading-7 text-slate-700 dark:text-slate-200">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h2 className="mb-4 text-xl font-black leading-7 text-slate-950 dark:text-white">{children}</h2>,
              h2: ({ children }) => <h3 className="mb-3 mt-6 border-b border-slate-200 pb-2 text-lg font-black leading-7 text-slate-950 first:mt-0 dark:border-slate-800 dark:text-white">{children}</h3>,
              h3: ({ children }) => <h4 className="mb-2 mt-5 text-base font-black leading-6 text-slate-950 first:mt-0 dark:text-white">{children}</h4>,
              p: ({ children }) => <p className="mb-4 break-words leading-7 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-4 space-y-2 pl-5 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5 last:mb-0">{children}</ol>,
              li: ({ children }) => <li className="break-words pl-1 leading-7">{children}</li>,
              strong: ({ children }) => <strong className="font-black text-slate-950 dark:text-white">{children}</strong>,
              blockquote: ({ children }) => (
                <blockquote className="mb-4 rounded-2xl border-l-4 border-blue-500 bg-blue-500/10 px-4 py-3 text-slate-700 dark:text-slate-200">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.9em] font-bold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  {children}
                </code>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
    </article>
  );
}


function countByTool(response: WorkflowResponse | null, patterns: string[]) {
  return (response?.step_results || []).reduce((total, step) => {
    const haystack = `${step.tool || ""} ${step.kind || ""} ${step.step_id || ""}`.toLowerCase();
    return patterns.some((pattern) => haystack.includes(pattern)) ? total + 1 : total;
  }, 0);
}


function isPdfAttachment(file: Partial<GmailAttachmentFile> | null | undefined) {
  const mime = String(file?.mime_type || "").toLowerCase();
  const filename = String(file?.filename || "").toLowerCase();
  return Boolean(file?.is_pdf || mime === "application/pdf" || filename.endsWith(".pdf"));
}

function attachmentKey(file: Partial<GmailAttachmentFile>, index: number) {
  return [file.id, file.message_id, file.attachment_id, file.filename, index].filter(Boolean).join("-");
}

function absoluteFileUrl(url?: string | null) {
  const clean = String(url || "").trim();
  if (!clean) return "";
  if (/^(https?:|blob:|data:)/i.test(clean)) return clean;

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  const normalizedBase = String(base || "").replace(/\/$/, "");
  if (!normalizedBase) return clean;
  return clean.startsWith("/") ? `${normalizedBase}${clean}` : `${normalizedBase}/${clean}`;
}

function fileSizeLabel(size?: number | null) {
  if (!size || Number.isNaN(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeAttachment(file: unknown): GmailAttachmentFile | null {
  if (!isRecord(file)) return null;
  const normalized: GmailAttachmentFile = {
    id: typeof file.id === "number" ? file.id : undefined,
    filename: firstString(file.filename, file.name, file.original_filename),
    mime_type: firstString(file.mime_type, file.mimeType, file.content_type),
    attachment_id: firstString(file.attachment_id, file.attachmentId, file.gmail_attachment_id),
    message_id: firstString(file.message_id, file.messageId),
    thread_id: firstString(file.thread_id, file.threadId),
    size: typeof file.size === "number" ? file.size : undefined,
    file_size_bytes: typeof file.file_size_bytes === "number" ? file.file_size_bytes : undefined,
    stored: Boolean(file.stored || file.view_url || file.download_url || file.file_url),
    view_url: firstString(file.view_url, file.file_url),
    download_url: firstString(file.download_url),
    is_pdf: Boolean(file.is_pdf),
  };
  normalized.is_pdf = isPdfAttachment(normalized);
  return normalized.filename || normalized.attachment_id || normalized.id ? normalized : null;
}

function collectPdfAttachments(response: WorkflowResponse | null): GmailAttachmentFile[] {
  const candidates: unknown[] = [];

  if (Array.isArray(response?.pdf_attachments)) candidates.push(...response.pdf_attachments);
  if (Array.isArray(response?.attachments)) candidates.push(...response.attachments);
  if (Array.isArray(response?.ui_result?.pdf_attachments)) candidates.push(...response.ui_result.pdf_attachments);
  if (Array.isArray(response?.ui_result?.attachments)) candidates.push(...response.ui_result.attachments);

  for (const email of response?.ui_result?.emails || []) {
    if (Array.isArray(email.pdf_attachments)) candidates.push(...email.pdf_attachments);
    if (Array.isArray(email.attachments)) candidates.push(...email.attachments);
  }

  const seen = new Set<string>();
  const output: GmailAttachmentFile[] = [];

  for (const item of candidates) {
    const normalized = normalizeAttachment(item);
    if (!normalized || !isPdfAttachment(normalized)) continue;

    const key = [normalized.id, normalized.message_id, normalized.attachment_id, normalized.filename].filter(Boolean).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }

  return output;
}

function PdfAttachmentCard({
  file,
  onView,
}: {
  file: GmailAttachmentFile;
  onView: (file: GmailAttachmentFile) => void;
}) {
  const viewUrl = absoluteFileUrl(file.view_url || file.file_url);
  const downloadUrl = absoluteFileUrl(file.download_url || file.view_url || file.file_url);
  const size = fileSizeLabel(file.file_size_bytes || file.size || null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/10">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/15 text-lg">📄</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
              {file.filename || "PDF attachment"}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              PDF attachment{size ? ` • ${size}` : ""}{file.stored ? " • stored" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {viewUrl ? (
          <button
            type="button"
            onClick={() => onView(file)}
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-red-700"
          >
            View PDF
          </button>
        ) : (
          <span className="rounded-full bg-yellow-500/15 px-3 py-2 text-xs font-bold text-yellow-700 dark:text-yellow-300">
            Download required
          </span>
        )}

        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            Download
          </a>
        ) : null}
      </div>
    </div>
  );
}

function PdfViewerModal({
  file,
  onClose,
}: {
  file: GmailAttachmentFile | null;
  onClose: () => void;
}) {
  if (!file) return null;

  const url = absoluteFileUrl(file.view_url || file.file_url || file.download_url);
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-red-500">PDF Preview</p>
            <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">
              {file.filename || "PDF attachment"}
            </h3>
          </div>
          <div className="flex shrink-0 gap-2">
            <a
              href={absoluteFileUrl(file.download_url || file.view_url || file.file_url)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:text-white"
            >
              Open
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950"
            >
              Close
            </button>
          </div>
        </div>
        <iframe title={file.filename || "PDF attachment"} src={url} className="h-full w-full flex-1 bg-white" />
      </div>
    </div>
  );
}

function PdfAttachmentPanel({
  files,
  onView,
}: {
  files: GmailAttachmentFile[];
  onView: (file: GmailAttachmentFile) => void;
}) {
  if (!files.length) return null;

  return (
    <article className="rounded-[22px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-700/80 dark:bg-slate-950/50">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 w-fit rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-500">
            PDF Attachments
          </div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">
            Files available from Gmail
          </h3>
        </div>
        <span className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-black text-red-600 dark:text-red-300">
          {files.length} PDF{files.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-3">
        {files.map((file, index) => (
          <PdfAttachmentCard key={attachmentKey(file, index)} file={file} onView={onView} />
        ))}
      </div>
    </article>
  );
}

function formatEmailSender(email: GmailUiEmail) {
  if (email.from_name && email.from_email && email.from_name !== email.from_email) {
    return `${email.from_name} <${email.from_email}>`;
  }
  return email.from || email.from_email || email.from_name || email.sender_name || "Unknown sender";
}

function getReadableEmailBody(email: GmailUiEmail) {
  return firstString(email.body_preview, email.snippet, email.body, email.content);
}

function normalizeThreadEmail(value: unknown): GmailUiEmail | null {
  if (!isRecord(value)) return null;

  const attachments = Array.isArray(value.attachments)
    ? value.attachments
        .map((attachment) => normalizeAttachment(attachment))
        .filter((attachment): attachment is GmailAttachmentFile => Boolean(attachment))
    : undefined;

  const email: GmailUiEmail = {
    id: firstString(value.id, value.message_id, value.thread_id, value.threadId),
    thread_id: firstString(value.thread_id, value.threadId, value.id),
    subject: firstString(value.subject, value.title),
    from: firstString(value.from, value.sender),
    from_name: firstString(value.from_name),
    sender_name: firstString(value.sender_name),
    from_email: firstString(value.from_email, value.sender_email),
    to: firstString(value.to, value.receiver, value.to_email),
    date: firstString(value.date, value.date_str, value.internalDate, value.internal_date),
    date_str: firstString(value.date_str),
    snippet: firstString(value.snippet),
    body_preview: firstString(value.body_preview),
    body: firstString(value.body),
    content: firstString(value.content),
    attachments,
  };

  return email.subject || email.from || email.from_email || email.snippet || email.body
    ? email
    : null;
}

function collectThreadEmailsFromValue(value: unknown): GmailUiEmail[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeThreadEmail(item))
      .filter((email): email is GmailUiEmail => Boolean(email));
  }

  if (!isRecord(value)) return [];

  const candidates = [
    value.threads,
    isRecord(value.data) ? value.data.threads : undefined,
    value.emails,
    isRecord(value.data) ? value.data.emails : undefined,
  ];

  for (const candidate of candidates) {
    const emails = collectThreadEmailsFromValue(candidate);
    if (emails.length) return emails;
  }

  const single = normalizeThreadEmail(value);
  return single ? [single] : [];
}

function collectDisplayEmails(response: WorkflowResponse): GmailUiEmail[] {
  const cleanEmails = response.ui_result?.emails || [];
  if (cleanEmails.length) return cleanEmails;

  const seen = new Set<string>();
  const emails: GmailUiEmail[] = [];

  for (const step of response.step_results || []) {
    const stepEmails = collectThreadEmailsFromValue(step.output);
    for (const email of stepEmails) {
      const key = email.id || email.thread_id || `${email.from_email}-${email.subject}-${email.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      emails.push(email);
    }
  }

  return emails;
}

function EmailReaderModal({
  email,
  onClose,
}: {
  email: GmailUiEmail | null;
  onClose: () => void;
}) {
  if (!email) return null;

  const body = getReadableEmailBody(email) || "No readable body was returned for this email.";
  const sender = formatEmailSender(email);
  const date = email.date || email.date_str;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <article className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-slate-700 bg-slate-950 shadow-2xl">
        <header className="border-b border-slate-800 bg-slate-900/95 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 w-fit rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-300">
                Email Preview
              </div>
              <h2 className="break-words text-lg font-black leading-6 text-white">
                {email.subject || "(No subject)"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-red-400 hover:text-red-200"
            >
              Close
            </button>
          </div>

          <dl className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="font-black uppercase tracking-wide text-slate-500">From</dt>
              <dd className="mt-1 break-words font-semibold text-slate-100">{sender}</dd>
            </div>
            {email.to ? (
              <div className="min-w-0">
                <dt className="font-black uppercase tracking-wide text-slate-500">To</dt>
                <dd className="mt-1 break-words font-semibold text-slate-100">{email.to}</dd>
              </div>
            ) : null}
            {date ? (
              <div className="min-w-0 sm:col-span-2">
                <dt className="font-black uppercase tracking-wide text-slate-500">Date</dt>
                <dd className="mt-1 break-words font-semibold text-slate-100">{date}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-950 p-6 custom-scrollbar">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm leading-7 text-slate-100 [overflow-wrap:anywhere]">
            <p className="whitespace-pre-line break-words">{body}</p>
          </div>
        </div>
      </article>
    </div>
  );
}

function EmailResultPanel({ response, onViewPdf }: { response: WorkflowResponse; onViewPdf: (file: GmailAttachmentFile) => void }) {
  const [page, setPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<GmailUiEmail | null>(null);
  const result = response.ui_result;
  const emails = collectDisplayEmails(response);
  const summary = firstString(result?.summary);
  const showSummary = Boolean(summary && !(emails.length && summary.toLowerCase().includes("no email data")));
  const totalPages = Math.max(1, Math.ceil(emails.length / EMAILS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * EMAILS_PER_PAGE;
  const pageEmails = emails.slice(pageStart, pageStart + EMAILS_PER_PAGE);

  return (
    <>
    <EmailReaderModal email={selectedEmail} onClose={() => setSelectedEmail(null)} />
    <article className="rounded-[22px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-700/80 dark:bg-slate-950/50">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 w-fit rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-500">
            Gmail Result
          </div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">
            {result?.title || "Processed email result"}
          </h3>
        </div>
        <span className="rounded-full bg-green-500/15 px-3 py-1.5 text-xs font-black text-green-600 dark:text-green-400">
          Clean output
        </span>
      </div>

      {showSummary ? (
        <p className="mb-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
          {summary}
        </p>
      ) : null}

      {emails.length > 0 ? (
        <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>
            Showing {pageStart + 1}-{Math.min(pageStart + EMAILS_PER_PAGE, emails.length)} of {emails.length} emails
          </span>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200"
              >
                Prev
              </button>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {safePage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>

        <div className="max-h-[640px] space-y-3 overflow-auto pr-1 custom-scrollbar">
          {pageEmails.map((email, index) => (
            <div
              key={email.id || email.thread_id || email.subject || `${safePage}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              {(() => {
                const readableBody = getReadableEmailBody(email);
                return (
                  <>
              <div className="mb-3 flex flex-col gap-2">
                <div className="min-w-0">
                  <h4 className="break-words text-sm font-black leading-5 text-slate-950 dark:text-white">
                    {email.subject || "(No subject)"}
                  </h4>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                    From: <span className="font-bold text-slate-700 dark:text-slate-200">{formatEmailSender(email)}</span>
                  </p>
                  {email.to ? (
                    <p className="mt-1 break-words text-xs leading-5 text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                      To: <span className="font-medium text-slate-700 dark:text-slate-300">{email.to}</span>
                    </p>
                  ) : null}
                </div>
                {email.date || email.date_str ? (
                  <span className="w-fit max-w-full rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold leading-4 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {email.date || email.date_str}
                  </span>
                ) : null}
              </div>

              {readableBody ? (
                <div className="max-h-28 overflow-hidden rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:bg-slate-950/70 dark:text-slate-200">
                  <p className="whitespace-pre-line break-words">
                    {readableBody}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEmail(email)}
                  className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-600 transition hover:bg-red-500/20 dark:text-red-300"
                >
                  Read full
                </button>
              </div>

              {!!email.attachments?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {email.attachments.map((file, fileIndex) => {
                    const normalized = normalizeAttachment(file);
                    const isPdf = isPdfAttachment(normalized);
                    const canView = Boolean(normalized?.view_url || normalized?.file_url);

                    if (isPdf && normalized && canView) {
                      return (
                        <button
                          type="button"
                          key={`${normalized.filename}-${fileIndex}`}
                          onClick={() => onViewPdf(normalized)}
                          className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-500/20 dark:text-red-300"
                        >
                          📄 View {normalized.filename || "PDF"}
                        </button>
                      );
                    }

                    return (
                      <span
                        key={`${normalized?.filename || file.filename}-${fileIndex}`}
                        className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-300"
                      >
                        {isPdf ? "📄" : "📎"} {normalized?.filename || file.filename || "Attachment"}
                      </span>
                    );
                  })}
                </div>
              ) : null}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Backend returned a clean result object, but no readable email items were included.
        </div>
      )}
    </article>
    </>
  );
}

export default function OutputSectionConnector({
  response,
  completionResult = null,
  onSendPrompt,
  partialIntent = null,
  convStep = "idle",
}: OutputSectionConnectorProps) {
  const [selectedPdf, setSelectedPdf] = useState<GmailAttachmentFile | null>(null);
  const [rawJsonCopied, setRawJsonCopied] = useState(false);
  const [showUsageDetails, setShowUsageDetails] = useState(false);
  const pdfAttachments = useMemo(() => collectPdfAttachments(response), [response]);
  const operationType = normalizeOperation(response);
  const editableDraftText = firstString(response?.reply_draft, completionResult?.reply_draft);
  const hasEditableDraft = Boolean(editableDraftText && isReplyDraftOperation(operationType) && !looksLikeRawGmailPayload(editableDraftText));
  const resultText = response?.ui_result || hasEditableDraft ? "" : getResultText(response, completionResult);
  const uiEmails = response?.ui_result?.emails || [];
  const hasUiResult = Boolean(response?.ui_result);
  const hasForm = Boolean(response?.requires_form && response?.form_schema);
  const threadId = extractThreadId(response);
  const draftId = extractDraftId(response);
  const draftSubject = firstString(response?.subject, deepFindString(response?.step_results, ["subject"]));
  const draftRecipient = firstString(response?.from_email, deepFindString(response?.step_results, ["from_email", "from"]));
  const hasOutput = Boolean(hasForm || hasEditableDraft || hasUiResult || pdfAttachments.length || response || completionResult || resultText);
  const emailsFound = uiEmails.length || response?.emails_found || countByTool(response, ["search", "fetch", "thread", "email"]);
  const repliesGenerated = response?.replies_generated || countByTool(response, ["generate", "compose", "reply"]);
  const repliesSent = response?.replies_sent_count || countByTool(response, ["send", "reply_to_thread"]);
  const showForm = Boolean(!response?.requires_form && response && onSendPrompt && (convStep === "waiting_email" || convStep === "waiting_field"));
  const rawResponseJson = response
    ? JSON.stringify(response, null, 2)
    : completionResult
      ? JSON.stringify(completionResult, null, 2)
      : "";
  const promptTokens = response?.prompt_tokens || completionResult?.prompt_tokens || 0;
  const completionTokens = response?.completion_tokens || completionResult?.completion_tokens || 0;
  const totalTokens = response?.total_tokens || completionResult?.total_tokens || promptTokens + completionTokens;
  const estimatedCost = response?.estimated_cost_usd ?? completionResult?.estimated_cost_usd;

  const handleCopyRawJson = async () => {
    if (!rawResponseJson) return;

    try {
      await navigator.clipboard.writeText(rawResponseJson);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = rawResponseJson;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setRawJsonCopied(true);
    window.setTimeout(() => setRawJsonCopied(false), 1500);
  };

  return (
    <>
    <PdfViewerModal file={selectedPdf} onClose={() => setSelectedPdf(null)} />
    <section className="connector-panel flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/85 shadow-[0_18px_54px_rgba(15,23,42,.10)] dark:border-slate-700/80 dark:bg-slate-900/85">
      <AiPanelHeader
        icon="📤"
        kicker="Output"
        title="Processed Emails"
        right={
          <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUsageDetails((value) => !value)}
            className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-500 transition hover:border-blue-500/60"
          >
            Analyze
          </button>
          <button
            type="button"
            onClick={() => onSendPrompt?.("Create a new Gmail automation rule")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            ⊕ New rule
          </button>
          {showUsageDetails ? (
            <div className="absolute right-0 top-10 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl dark:border-slate-700 dark:bg-slate-950">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Usage Analysis
              </div>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <span>Prompt tokens</span>
                  <b className="text-slate-950 dark:text-white">{promptTokens ? promptTokens.toLocaleString() : "—"}</b>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Completion tokens</span>
                  <b className="text-slate-950 dark:text-white">{completionTokens ? completionTokens.toLocaleString() : "—"}</b>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800">
                  <span>Total tokens</span>
                  <b className="text-blue-500">{totalTokens ? totalTokens.toLocaleString() : "—"}</b>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Estimated cost</span>
                  <b className="text-green-500">{estimatedCost != null ? `$${Number(estimatedCost).toFixed(4)}` : "—"}</b>
                </div>
              </div>
            </div>
          ) : null}
          </div>
        }
      />

      <div className="h-0 min-h-0 flex-1 overflow-auto overscroll-contain p-4 custom-scrollbar">
        {!hasOutput ? (
          <AiEmptyState
            icon="✨"
            title="Waiting for AI Output"
            text="Clean email cards, summaries, generated replies, and extracted details will appear here. Workflow steps stay in the workflow panel."
          />
        ) : (
          <div className="space-y-4">
            <div className="connector-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-yellow-400/60 bg-yellow-500/10 p-4 text-sm text-slate-800 dark:text-slate-100">
              <span>✅ ✨ Processed {emailsFound || 0} emails</span>
              <div className="flex gap-2">
                <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-black text-blue-500">Generated {repliesGenerated || 0}</span>
                <span className="rounded-full bg-green-500/15 px-3 py-1.5 text-xs font-black text-green-500">Sent {repliesSent || 0}</span>
              </div>
            </div>


            {response?.requires_form && response?.form_schema && onSendPrompt ? (
              <GmailActionForm
                schema={response.form_schema}
                originalPrompt={String(response.partial_intent?.original_prompt || response.plan?.goal || "")}
                partialIntent={partialIntent}
                onSubmit={(nextPrompt) => onSendPrompt(nextPrompt)}
              />
            ) : null}

            <PdfAttachmentPanel files={pdfAttachments} onView={setSelectedPdf} />

            {response?.ui_result ? <EmailResultPanel response={response} onViewPdf={setSelectedPdf} /> : null}

            {hasEditableDraft ? (
              <EditableReplyDraft
                initialBody={editableDraftText}
                threadId={threadId || null}
                draftId={draftId || null}
                subject={draftSubject || null}
                recipient={draftRecipient || null}
                fromEmail={response?.from_email || null}
                onSend={(editedBody) => onSendPrompt?.(buildSendEditedReplyPrompt(response, editedBody))}
                onSaveDraft={(editedBody) => onSendPrompt?.(buildSaveEditedDraftPrompt(response, editedBody))}
                onRegenerate={() =>
                  onSendPrompt?.(
                    `Regenerate the Gmail reply for this same thread using a professional tone. Original goal: ${response?.plan?.goal || "reply to email"}`,
                  )
                }
              />
            ) : null}

            {resultText ? (
              <FormattedAiResult text={resultText} operationType={operationType} />
            ) : null}

            {showForm && response ? (
              <div className="connector-card rounded-[22px] border border-slate-200/70 bg-white/80 p-4 dark:border-slate-700/80 dark:bg-slate-950/40">
                <WorkflowFormBox
                  key={`${operationType}-${response.from_email || ""}-${response.subject || ""}-${response.execution_type || ""}-${response?.plan?.goal || ""}`}
                  response={response}
                  partialIntent={partialIntent}
                  operationType={operationType}
                  onRerun={(nextPrompt) => onSendPrompt?.(nextPrompt)}
                />
              </div>
            ) : null}

            {rawResponseJson ? (
              <article className="rounded-[22px] border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-[0_18px_55px_rgba(15,23,42,0.18)]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="w-fit rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Raw JSON Response
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRawJson}
                    className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-black text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {rawJsonCopied ? "Copied" : "Copy JSON"}
                  </button>
                </div>
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-200">
                  {rawResponseJson}
                </pre>
              </article>
            ) : null}
          </div>
        )}
      </div>
    </section>
    </>
  );
}
