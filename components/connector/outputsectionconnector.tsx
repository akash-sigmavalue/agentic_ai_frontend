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
import { fetchAttachment, getConnectorFileUrl, summarizeAttachment } from "./api";

type WorkflowPromptPayload = string | Record<string, unknown>;

type OutputSectionConnectorProps = {
  response: WorkflowResponse | null;
  completionResult?: CompletionResult | null;
  onSendPrompt?: (prompt: WorkflowPromptPayload) => void;
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
    send_reply: "reply",
    gmail_reply: "reply",
    generate_reply: "reply",
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

function buildReplyActionPayload(
  response: WorkflowResponse | null,
  editedBody: string,
  options: { sendDirectly: boolean; draftOnly: boolean },
): Record<string, unknown> {
  const threadId = extractThreadId(response);
  const draftId = extractDraftId(response);
  const subject = firstString(response?.subject, deepFindString(response?.step_results, ["subject"]));
  const recipient = firstString(
    response?.from_email,
    deepFindString(response?.step_results, ["from_email", "sender_email", "from"]),
  );
  const cleanBody = editedBody.trim();
  const operation = options.draftOnly ? "draft_reply" : "send_reply";

  const partialIntent = {
    ...(isRecord(response?.partial_intent) ? response?.partial_intent : {}),
    operation,
    thread_id: threadId || undefined,
    draft_id: draftId || undefined,
    subject: subject || undefined,
    recipient: recipient || undefined,
    reply_body: cleanBody,
    edited_reply_body: cleanBody,
    body: cleanBody,
    message_body: cleanBody,
    reply_instruction: cleanBody,
    reply_instructions: cleanBody,
    confirmed: !options.draftOnly,
    user_confirmed: !options.draftOnly,
    send_directly: options.sendDirectly,
    draft_only: options.draftOnly,
    intent_details: {
      send_reply: {
        is_required: !options.draftOnly,
        thread_id: threadId || undefined,
        reply_body: cleanBody,
        edited_reply_body: cleanBody,
        body: cleanBody,
        reply_instruction: cleanBody,
        reply_instructions: cleanBody,
        tone: "professional",
        requires_explicit_confirmation: true,
      },
      draft_reply: {
        is_required: options.draftOnly,
        thread_id: threadId || undefined,
        draft_id: draftId || undefined,
        reply_body: cleanBody,
        edited_reply_body: cleanBody,
        body: cleanBody,
        reply_instruction: cleanBody,
        reply_instructions: cleanBody,
        draft_tone: "professional",
      },
    },
  };

  return {
    prompt: options.draftOnly ? "Create edited Gmail reply draft" : "[confirmed] Send edited Gmail reply",
    confirmed: !options.draftOnly,
    user_confirmed: !options.draftOnly,
    send_directly: options.sendDirectly,
    draft_only: options.draftOnly,
    thread_id: threadId || undefined,
    draft_id: draftId || undefined,
    reply_body: cleanBody,
    edited_reply_body: cleanBody,
    body: cleanBody,
    partial_intent: partialIntent,
    team_context: {
      confirmed: !options.draftOnly,
      user_confirmed: !options.draftOnly,
      send_directly: options.sendDirectly,
      draft_only: options.draftOnly,
      thread_id: threadId || undefined,
      reply_body: cleanBody,
      edited_reply_body: cleanBody,
      partial_intent: partialIntent,
    },
  };
}

function buildSendEditedReplyPayload(response: WorkflowResponse | null, editedBody: string) {
  return buildReplyActionPayload(response, editedBody, { sendDirectly: true, draftOnly: false });
}

function buildSaveEditedDraftPayload(response: WorkflowResponse | null, editedBody: string) {
  return buildReplyActionPayload(response, editedBody, { sendDirectly: false, draftOnly: true });
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => firstString(item))
      .filter(Boolean);
  }

  const single = firstString(value);
  return single ? [single] : [];
}

function getPartialIntentRecord(response: WorkflowResponse | null): Record<string, unknown> {
  return isRecord(response?.partial_intent) ? response.partial_intent : {};
}

function getPartialIntentArgs(response: WorkflowResponse | null): Record<string, unknown> {
  const partialIntent = getPartialIntentRecord(response);
  return isRecord(partialIntent.args) ? partialIntent.args : {};
}

function extractNewEmailRecipients(response: WorkflowResponse | null): string[] {
  const partialIntent = getPartialIntentRecord(response);
  const args = getPartialIntentArgs(response);
  const intentDetails = isRecord(args.intent_details) ? args.intent_details : {};

  const recipients = [
    ...asStringArray(args.to),
    ...asStringArray(partialIntent.to),
    ...asStringArray(intentDetails.to),
  ];

  const deepRecipient = firstString(
    deepFindString(response?.partial_intent, ["recipient", "to_email", "email"]),
    deepFindString(response?.plan, ["recipient", "to_email"]),
  );

  if (deepRecipient) recipients.push(deepRecipient);

  return Array.from(new Set(recipients.filter(Boolean)));
}

function extractNewEmailSubject(response: WorkflowResponse | null): string {
  const partialIntent = getPartialIntentRecord(response);
  const args = getPartialIntentArgs(response);
  const intentDetails = isRecord(args.intent_details) ? args.intent_details : {};

  return firstString(
    args.subject,
    partialIntent.subject,
    intentDetails.subject,
    response?.subject,
    deepFindString(response?.partial_intent, ["subject"]),
    deepFindString(response?.plan, ["subject"]),
  );
}

function extractNewEmailBody(response: WorkflowResponse | null, editedBody?: string): string {
  const partialIntent = getPartialIntentRecord(response);
  const args = getPartialIntentArgs(response);
  const intentDetails = isRecord(args.intent_details) ? args.intent_details : {};

  return firstString(
    editedBody,
    args.body,
    args.body_instruction,
    partialIntent.body,
    partialIntent.reply,
    partialIntent.message_body,
    partialIntent.body_instruction,
    intentDetails.body,
    intentDetails.body_instruction,
    response?.reply,
    response?.reply_body,
    response?.generated_reply,
    deepFindString(response?.partial_intent, ["body", "reply", "message_body", "body_instruction", "email_body"]),
    deepFindString(response?.step_results, ["body", "email_body", "message_body"]),
  );
}

function isNewEmailOperation(response: WorkflowResponse | null, operationType?: WorkflowOperationType): boolean {
  const partialIntent = getPartialIntentRecord(response);
  const primaryIntent = firstString(
    partialIntent.primary_intent,
    deepFindString(response?.plan?.gmail_intent, ["primary_intent"]),
    deepFindString(response?.intent_understanding, ["primary_intent"]),
  ).toLowerCase();
  const operation = firstString(partialIntent.operation).toLowerCase();
  const tool = firstString(partialIntent.tool, deepFindString(response?.plan, ["tool"])).toLowerCase();

  return Boolean(
    primaryIntent === "send_new_email" ||
    operation === "send_new_email" ||
    tool === "gmail.send_email" ||
    (operationType === "send" && primaryIntent !== "send_reply" && primaryIntent !== "draft_reply")
  );
}

function buildNewEmailActionPayload(
  response: WorkflowResponse | null,
  editedBody: string,
  options: { sendDirectly: boolean; draftOnly: boolean },
): Record<string, unknown> {
  const sourcePartialIntent = getPartialIntentRecord(response);
  const sourceArgs = getPartialIntentArgs(response);
  const to = extractNewEmailRecipients(response);
  const subject = extractNewEmailSubject(response);
  const cleanBody = extractNewEmailBody(response, editedBody).trim();
  const operation = options.draftOnly ? "create_draft" : "send_new_email";
  const tool = options.draftOnly ? "gmail.create_draft" : "gmail.send_email";

  const args = {
    ...sourceArgs,
    to,
    cc: Array.isArray(sourceArgs.cc) ? sourceArgs.cc : [],
    bcc: Array.isArray(sourceArgs.bcc) ? sourceArgs.bcc : [],
    subject,
    body: cleanBody,
    body_instruction: cleanBody,
    tone: firstString(sourceArgs.tone, "professional"),
    send_directly: options.sendDirectly,
    intent_details: {
      ...(isRecord(sourceArgs.intent_details) ? sourceArgs.intent_details : {}),
      is_required: true,
      to,
      subject,
      body: cleanBody,
      body_instruction: cleanBody,
      tone: firstString(sourceArgs.tone, "professional"),
      requires_explicit_confirmation: true,
    },
  };

  const partialIntent = {
    ...sourcePartialIntent,
    operation,
    primary_intent: "send_new_email",
    tool,
    args,
    to,
    recipient: to[0] || undefined,
    subject,
    body: cleanBody,
    body_instruction: cleanBody,
    message_body: cleanBody,
    reply: cleanBody,
    confirmed: !options.draftOnly,
    user_confirmed: !options.draftOnly,
    send_directly: options.sendDirectly,
    draft_only: options.draftOnly,
  };

  const promptLines = [
    options.draftOnly ? "Create new Gmail email draft" : "[confirmed] Send new Gmail email",
    `Operation: ${operation}`,
    `Send Directly: ${options.sendDirectly ? "true" : "false"}`,
    to.length ? `Recipient: ${to.join(", ")}` : "",
    subject ? `Subject: ${subject}` : "",
    cleanBody ? "Body:" : "",
    cleanBody,
  ].filter(Boolean);

  return {
    prompt: promptLines.join("\n"),
    confirmed: !options.draftOnly,
    user_confirmed: !options.draftOnly,
    send_directly: options.sendDirectly,
    draft_only: options.draftOnly,
    operation,
    primary_intent: "send_new_email",
    tool,
    to,
    subject,
    body: cleanBody,
    body_instruction: cleanBody,
    args,
    partial_intent: partialIntent,
    team_context: {
      confirmed: !options.draftOnly,
      user_confirmed: !options.draftOnly,
      send_directly: options.sendDirectly,
      draft_only: options.draftOnly,
      operation,
      primary_intent: "send_new_email",
      tool,
      to,
      subject,
      body: cleanBody,
      body_instruction: cleanBody,
      args,
      partial_intent: partialIntent,
    },
  };
}

function buildSendNewEmailPayload(response: WorkflowResponse | null, editedBody: string) {
  return buildNewEmailActionPayload(response, editedBody, { sendDirectly: true, draftOnly: false });
}

function buildSaveNewEmailDraftPayload(response: WorkflowResponse | null, editedBody: string) {
  return buildNewEmailActionPayload(response, editedBody, { sendDirectly: false, draftOnly: true });
}

function buildPrimarySendPayload(response: WorkflowResponse | null, operationType: WorkflowOperationType, editedBody: string) {
  return isNewEmailOperation(response, operationType)
    ? buildSendNewEmailPayload(response, editedBody)
    : buildSendEditedReplyPayload(response, editedBody);
}

function buildPrimaryDraftPayload(response: WorkflowResponse | null, operationType: WorkflowOperationType, editedBody: string) {
  return isNewEmailOperation(response, operationType)
    ? buildSaveNewEmailDraftPayload(response, editedBody)
    : buildSaveEditedDraftPayload(response, editedBody);
}

function isReplyDraftOperation(operationType: WorkflowOperationType) {
  return operationType === "reply" || operationType === "reply_to_thread";
}

function getPrimaryIntent(response: WorkflowResponse | null) {
  return firstString(
    isRecord(response?.plan?.gmail_intent) ? response?.plan?.gmail_intent.primary_intent : "",
    deepFindString(response?.plan?.gmail_intent, ["primary_intent"]),
  ).toLowerCase();
}

function isReplyReviewOperation(response: WorkflowResponse | null, operationType: WorkflowOperationType) {
  const primaryIntent = getPrimaryIntent(response);
  return (
    isNewEmailOperation(response, operationType) ||
    isReplyDraftOperation(operationType) ||
    operationType === "send" ||
    primaryIntent === "send_reply" ||
    primaryIntent === "draft_reply" ||
    primaryIntent === "send_new_email"
  );
}

function isReplyActuallySent(response: WorkflowResponse | null, completionResult: CompletionResult | null) {
  const status = firstString(response?.status, completionResult?.status).toLowerCase();
  return Boolean(
    response?.delivery_status === "sent" ||
    response?.reply_sent ||
    completionResult?.reply_sent ||
    status === "sent" ||
    status === "reply_sent" ||
    status === "email_sent"
  );
}

function looksLikeUiStatusMessage(value: string) {
  const text = value.toLowerCase();
  return (
    text.includes("review the confirmation") ||
    text.includes("output section") ||
    text.includes("workflow completed") ||
    text.includes("prepared the result")
  );
}

function getEditableReplyText(response: WorkflowResponse | null, completionResult: CompletionResult | null) {
  const explicitDraft = firstString(
    response?.reply_draft,
    completionResult?.reply_draft,
    response?.reply,
    completionResult?.reply,
    response?.generated_reply,
    response?.reply_body,
  );

  if (explicitDraft && !looksLikeRawGmailPayload(explicitDraft) && !looksLikeUiStatusMessage(explicitDraft)) {
    return explicitDraft;
  }

  const replyKeys = [
    "reply",
    "body",
    "text",
    "content",
    "reply_draft",
    "draft_reply",
    "generated_reply",
    "reply_body",
    "reply_text",
    "draft_body",
    "message_body",
    "email_body",
  ];

  const replyStep = (response?.step_results || []).find((step) => {
    const haystack = `${step?.tool || ""} ${step?.kind || ""} ${step?.step_id || ""}`.toLowerCase();
    return (
      haystack.includes("llm.generate_reply") ||
      haystack.includes("generate_gmail_reply") ||
      haystack.includes("generate") && haystack.includes("reply")
    );
  });

  const generatedReply = firstString(
    deepFindString(replyStep?.output, replyKeys),
    deepFindString(response?.partial_intent, replyKeys),
    deepFindString(response?.step_results, replyKeys),
  );

  if (generatedReply && !looksLikeRawGmailPayload(generatedReply) && !looksLikeUiStatusMessage(generatedReply)) {
    return generatedReply;
  }

  return "";
}

function collectWorkflowErrors(response: WorkflowResponse | null) {
  const errors: string[] = [];
  const topLevel = firstString(response?.error, response?.message);
  if (topLevel && String(response?.status || "").toLowerCase().includes("fail")) {
    errors.push(topLevel);
  }

  for (const item of response?.raw_mcp_results || []) {
    if (item.ok !== false) continue;
    const message = firstString(item.error, isRecord(item.data) ? item.data.error : "");
    if (!message) continue;
    const tool = firstString(item.tool, item.server);
    errors.push(tool ? `${tool}: ${message}` : message);
  }

  for (const step of response?.step_results || []) {
    if (!String(step.status || "").toLowerCase().includes("fail")) continue;
    const message = firstString(step.output?.error, step.output?.message, step.output);
    if (message) errors.push(`${step.step_id || step.tool || "Step"}: ${message}`);
  }

  return Array.from(new Set(errors));
}

function needsReplyConfirmation(response: WorkflowResponse | null, completionResult: CompletionResult | null, operationType: WorkflowOperationType) {
  if (!isReplyReviewOperation(response, operationType) || isReplyActuallySent(response, completionResult)) return false;

  const status = firstString(response?.status).toLowerCase();
  return Boolean(
    status === "needs_confirmation" ||
    status === "pending_confirmation" ||
    response?.can_send ||
    firstString(response?.chat_message, response?.message, response?.reply).toLowerCase().includes("review the confirmation")
  );
}

function WorkflowErrorPanel({ response }: { response: WorkflowResponse | null }) {
  const errors = collectWorkflowErrors(response);
  if (!errors.length) return null;

  return (
    <article className="rounded-[22px] border border-red-300/70 bg-red-50 p-5 text-red-900 shadow-sm dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100">
      <div className="mb-2 w-fit rounded-full border border-red-400/40 bg-red-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-700 dark:text-red-200">
        Workflow failed
      </div>
      <h3 className="text-base font-black">The Gmail action did not complete</h3>
      <div className="mt-3 space-y-2 text-sm leading-6">
        {errors.map((error) => (
          <p key={error} className="break-words rounded-2xl bg-white/70 p-3 dark:bg-slate-950/40">
            {error}
          </p>
        ))}
      </div>
    </article>
  );
}

function buildConfirmedReplyPrompt(response: WorkflowResponse | null, draftBody?: string) {
  const originalPrompt = firstString(
    response?.partial_intent?.original_prompt,
    response?.plan?.goal,
    response?.message,
    response?.summary,
    "Send the prepared Gmail reply",
  );

  return [
    `[confirmed] ${originalPrompt}`,
    "Operation: send_reply",
    "Send Directly: true",
    draftBody?.trim() ? "" : "",
    draftBody?.trim() ? "Edited Reply Body:" : "",
    draftBody?.trim() || "",
  ].filter((line) => line !== "").join("\n");
}

function buildDraftInsteadPrompt(response: WorkflowResponse | null, draftBody?: string) {
  const originalPrompt = firstString(
    response?.partial_intent?.original_prompt,
    response?.plan?.goal,
    response?.message,
    response?.summary,
    "Create a Gmail reply draft",
  );

  return [
    `Create draft instead of sending: ${originalPrompt}`,
    "Operation: draft_reply",
    "Send Directly: false",
    draftBody?.trim() ? "" : "",
    draftBody?.trim() ? "Draft Reply Body:" : "",
    draftBody?.trim() || "",
  ].filter((line) => line !== "").join("\n");
}

function buildGenerateReviewDraftPrompt(response: WorkflowResponse | null) {
  const originalPrompt = firstString(
    response?.partial_intent?.original_prompt,
    response?.plan?.goal,
    response?.message,
    response?.summary,
    "Generate a Gmail reply draft for review",
  );

  return [
    originalPrompt,
    "Operation: draft_reply",
    "Generate the reply body for review.",
    "Do not send the email.",
  ].join("\n");
}

function shouldShowResultTextWithUiResult(response: WorkflowResponse | null, operationType: WorkflowOperationType) {
  if (!response?.ui_result) return true;
  if (operationType === "analyze" || operationType === "classify" || operationType === "insight") return true;

  const primaryIntent = getPrimaryIntent(response);

  return primaryIntent === "extract_data" || primaryIntent === "summarize_email";
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
              table: ({ children }) => (
                <div className="mb-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white">{children}</thead>,
              th: ({ children }) => <th className="border-b border-slate-200 px-4 py-3 font-black dark:border-slate-700">{children}</th>,
              td: ({ children }) => <td className="border-b border-slate-200 px-4 py-3 align-top last:border-b-0 dark:border-slate-800">{children}</td>,
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

function ReplyConfirmationPanel({
  response,
  draftText,
  operationType,
  onSendPrompt,
}: {
  response: WorkflowResponse | null;
  draftText?: string;
  operationType: WorkflowOperationType;
  onSendPrompt?: (prompt: WorkflowPromptPayload) => void;
}) {
  if (!onSendPrompt) return null;
  const hasDraftText = Boolean(draftText?.trim());
  const isNewEmail = isNewEmailOperation(response, operationType);

  return (
    <article className="overflow-hidden rounded-[24px] border border-yellow-400/40 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.12)] dark:border-yellow-400/25 dark:bg-slate-950/70">
      <div className="border-b border-slate-200/70 bg-yellow-500/10 p-4 dark:border-slate-800/80">
        <div className="mb-2 w-fit rounded-full border border-yellow-400/40 bg-yellow-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-700 dark:text-yellow-300">
          Confirmation required
        </div>
        <h3 className="text-base font-black text-slate-950 dark:text-white">Review before sending</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {hasDraftText
            ? isNewEmail
              ? "New Gmail emails should not be sent until you confirm. Choose whether to send now or create a draft."
              : "Gmail replies should not be sent until you confirm. Choose whether to send now or create a draft."
            : "The backend asked for confirmation, but it did not return the email body to review."}
        </p>
      </div>
      {!hasDraftText ? (
        <div className="m-4 rounded-2xl border border-red-300/50 bg-red-500/10 p-4 text-sm leading-6 text-red-700 dark:border-red-500/25 dark:text-red-200">
          Direct send is disabled because there is no reply body visible in the UI. Generate a draft first, then review it before sending.
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3 p-4">
        <button
          type="button"
          onClick={() => onSendPrompt(buildPrimarySendPayload(response, operationType, draftText || ""))}
          disabled={!hasDraftText}
          className="rounded-full bg-red-500 px-5 py-2.5 text-xs font-black text-white shadow-[0_12px_35px_rgba(239,68,68,0.28)] transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isNewEmail ? "Send Email" : "Send Reply"}
        </button>
        {hasDraftText ? (
          <button
            type="button"
            onClick={() => onSendPrompt(buildPrimaryDraftPayload(response, operationType, draftText || ""))}
            className="rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2.5 text-xs font-black text-blue-600 transition hover:bg-blue-500/15 dark:text-blue-300"
          >
            Create Draft
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSendPrompt(buildGenerateReviewDraftPrompt(response))}
            className="rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2.5 text-xs font-black text-blue-600 transition hover:bg-blue-500/15 dark:text-blue-300"
          >
            Generate Draft
          </button>
        )}
      </div>
    </article>
  );
}


type GmailFormField = {
  name?: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  default?: string;
};

function getResponseStatus(response: WorkflowResponse | null) {
  return firstString(response?.status).toLowerCase();
}

function getMissingFieldName(response: WorkflowResponse | null) {
  return firstString(response?.missing_field, response?.form_schema?.missing_field);
}

function isClarificationResponse(response: WorkflowResponse | null) {
  const status = getResponseStatus(response);
  return Boolean(
    status === "needs_clarification" ||
    status.includes("clarification") ||
    response?.requires_form === true ||
    getMissingFieldName(response),
  );
}

function getVisibleClarificationFields(response: WorkflowResponse | null): GmailFormField[] {
  const fields = (response?.form_schema?.fields || []) as GmailFormField[];
  const missingField = getMissingFieldName(response);

  if (!missingField) return fields;

  const exactMatch = fields.filter((field) => field.name === missingField);
  if (exactMatch.length) return exactMatch;

  return [
    {
      name: missingField,
      label: missingField.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      type: response?.field_type || "text",
      required: true,
      placeholder: response?.question || response?.missing_field_question || "Provide the missing detail...",
    },
  ];
}

function buildClarificationPrompt(response: WorkflowResponse | null, fieldName: string, value: string) {
  const originalPrompt = firstString(
    response?.partial_intent?.original_prompt,
    response?.plan?.goal,
    response?.summary,
    response?.message,
    "Continue the previous Gmail workflow",
  );

  const operation = firstString(response?.partial_intent?.operation, "send_reply");
  const searchQuery = firstString(response?.partial_intent?.search_query);
  const messageInstruction = firstString(
    deepFindString(response?.partial_intent, ["reply_instructions", "reply_instruction", "message_instruction", "body_instruction"]),
    deepFindString(response?.plan, ["reply_instructions", "reply_instruction", "message_instruction", "body_instruction"]),
  );

  return [
    originalPrompt,
    "",
    "[clarification provided]",
    `Missing Field: ${fieldName}`,
    `User Answer: ${value.trim()}`,
    searchQuery ? `Previous Search Query: ${searchQuery}` : "",
    operation ? `Operation: ${operation}` : "",
    messageInstruction ? `Original Message Instruction: ${messageInstruction}` : "",
    "Continue the same Gmail workflow using this clarification. Do not ask the same missing field again.",
  ].filter(Boolean).join("\n");
}

function CompactClarificationForm({
  response,
  onSendPrompt,
}: {
  response: WorkflowResponse | null;
  onSendPrompt?: (prompt: WorkflowPromptPayload) => void;
}) {
  const fields = getVisibleClarificationFields(response);
  const firstField = fields[0];
  const missingField = firstString(firstField?.name, getMissingFieldName(response), "search_filter");
  const [value, setValue] = useState(firstString(firstField?.default));
  const label = firstString(firstField?.label, missingField.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()));
  const placeholder = firstString(
    firstField?.placeholder,
    response?.question,
    response?.missing_field_question,
    "Sender, subject, keyword, latest, unread, date range...",
  );
  const type = firstString(firstField?.type, "text").toLowerCase();
  const options = Array.isArray(firstField?.options) ? firstField.options : [];

  const submitClarification = () => {
    const answer = value.trim();
    if (!answer || !onSendPrompt) return;
    onSendPrompt(buildClarificationPrompt(response, missingField, answer));
  };

  return (
    <article className="overflow-hidden rounded-[24px] border border-orange-400/40 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.10)] dark:border-orange-400/25 dark:bg-slate-950/70">
      <div className="border-b border-slate-200/70 bg-orange-500/10 p-4 dark:border-slate-800/80">
        <div className="mb-2 w-fit rounded-full border border-orange-400/40 bg-orange-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
          More details required
        </div>
        <h3 className="text-base font-black text-slate-950 dark:text-white">
          {response?.form_schema?.title || "Complete missing Gmail detail"}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {response?.question || response?.summary || response?.form_schema?.description || "Please provide the missing detail to continue this workflow."}
        </p>
      </div>

      <div className="space-y-3 p-4">
        <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {label}
        </label>

        {type === "select" && options.length ? (
          <select
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={4}
            placeholder={placeholder}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
        )}

        {missingField === "search_filter" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            Examples: <b>from:hdfcbank</b>, <b>subject:bank account</b>, <b>HDFC account opening</b>, <b>after:2026/6/1 hdfc</b>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={submitClarification}
            disabled={!value.trim() || !onSendPrompt}
            className="rounded-full bg-orange-500 px-5 py-2.5 text-xs font-black text-white shadow-[0_12px_35px_rgba(249,115,22,0.24)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue Workflow
          </button>
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
  return clean ? getConnectorFileUrl(clean) : "";
}

function fileSizeLabel(size?: number | null) {
  if (!size || Number.isNaN(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function documentAnalysisAnswer(value: unknown) {
  if (!isRecord(value)) return "";
  return firstString(value.answer, value.summary, value.message);
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

function mergePreparedPdfAttachments(
  files: GmailAttachmentFile[],
  preparedFiles: Record<string, GmailAttachmentFile>,
) {
  if (!Object.keys(preparedFiles).length) return files;

  return files.map((file, index) => {
    const key = attachmentKey(file, index);
    const stableKey = [file.message_id, file.attachment_id, file.filename].filter(Boolean).join("|");
    return preparedFiles[key] || preparedFiles[stableKey] || file;
  });
}

function PdfAttachmentCard({
  file,
  attachmentIndex,
  onView,
  onPrepare,
  onDownload,
  onSummarize,
  isPreparing,
  isSummarizing,
  error,
  summary,
}: {
  file: GmailAttachmentFile;
  attachmentIndex: number;
  onView: (file: GmailAttachmentFile) => void;
  onPrepare: (file: GmailAttachmentFile, index: number) => void;
  onDownload: (file: GmailAttachmentFile, index: number) => void;
  onSummarize: (file: GmailAttachmentFile, index: number) => void;
  isPreparing: boolean;
  isSummarizing: boolean;
  error?: string;
  summary?: string;
}) {
  const viewUrl = absoluteFileUrl(file.view_url || file.file_url);
  const downloadUrl = absoluteFileUrl(file.download_url || file.view_url || file.file_url);
  const size = fileSizeLabel(file.file_size_bytes || file.size || null);
  const canPrepare = Boolean(file.message_id && file.attachment_id);

  const cardBody = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/15 text-lg">ðŸ“„</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                {file.filename || "PDF attachment"}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                PDF attachment{size ? ` â€¢ ${size}` : ""}{file.stored ? " â€¢ stored" : ""}
              </p>
              {error ? <p className="mt-1 text-xs font-bold text-red-500">{error}</p> : null}
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
          ) : canPrepare ? (
            <button
              type="button"
              onClick={() => onPrepare(file, attachmentIndex)}
              disabled={isPreparing}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
            >
              {isPreparing ? "Preparing..." : "Preview PDF"}
            </button>
          ) : (
            <span className="rounded-full bg-yellow-500/15 px-3 py-2 text-xs font-bold text-yellow-700 dark:text-yellow-300">
              Download required
            </span>
          )}

          <button
            type="button"
            onClick={() => onSummarize(file, attachmentIndex)}
            disabled={isSummarizing || !canPrepare}
            className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-600 hover:bg-blue-500/15 disabled:opacity-60 dark:text-blue-300"
          >
            {isSummarizing ? "Summarizing..." : "Summarize PDF"}
          </button>

          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              Download
            </a>
          ) : canPrepare ? (
            <button
              type="button"
              onClick={() => onDownload(file, attachmentIndex)}
              disabled={isPreparing}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              Download
            </button>
          ) : null}
        </div>
      </div>

      {summary ? (
        <div className="mt-4 rounded-2xl border border-blue-500/20 bg-white/80 p-4 text-sm leading-7 text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
          <div className="mb-3 w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-500">
            PDF Summary
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
        </div>
      ) : null}
    </>
  );

  return summary ? (
    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/10">
      {cardBody}
    </div>
  ) : (
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
            {error ? <p className="mt-1 text-xs font-bold text-red-500">{error}</p> : null}
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
        ) : canPrepare ? (
          <button
            type="button"
            onClick={() => onPrepare(file, attachmentIndex)}
            disabled={isPreparing}
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
          >
            {isPreparing ? "Preparing..." : "Preview PDF"}
          </button>
        ) : (
          <span className="rounded-full bg-yellow-500/15 px-3 py-2 text-xs font-bold text-yellow-700 dark:text-yellow-300">
            Download required
          </span>
        )}

        <button
          type="button"
          onClick={() => onSummarize(file, attachmentIndex)}
          disabled={isSummarizing || !canPrepare}
          className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-600 hover:bg-blue-500/15 disabled:opacity-60 dark:text-blue-300"
        >
          {isSummarizing ? "Summarizing..." : "Summarize PDF"}
        </button>

        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            Download
          </a>
        ) : canPrepare ? (
          <button
            type="button"
            onClick={() => onDownload(file, attachmentIndex)}
            disabled={isPreparing}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            Download
          </button>
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
    <div className="fixed inset-0 z-[10000] bg-slate-950/75 px-4 pb-6 pt-24 backdrop-blur-sm sm:px-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[20px] border border-slate-700/80 bg-slate-950 shadow-2xl">
        <div className="relative z-10 flex min-h-[76px] shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">PDF Preview</p>
            <h3 className="mt-1 truncate text-sm font-black text-white">
              {file.filename || "PDF attachment"}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={absoluteFileUrl(file.download_url || file.view_url || file.file_url)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
            >
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950 hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-neutral-900">
          <iframe title={file.filename || "PDF attachment"} src={url} className="h-full w-full bg-white" />
        </div>
      </div>
    </div>
  );
}

function PdfAttachmentPanel({
  files,
  onView,
  onPrepare,
  onDownload,
  onSummarize,
  preparingKey,
  summarizingKey,
  errors,
  summaries,
}: {
  files: GmailAttachmentFile[];
  onView: (file: GmailAttachmentFile) => void;
  onPrepare: (file: GmailAttachmentFile, index: number) => void;
  onDownload: (file: GmailAttachmentFile, index: number) => void;
  onSummarize: (file: GmailAttachmentFile, index: number) => void;
  preparingKey: string | null;
  summarizingKey: string | null;
  errors: Record<string, string>;
  summaries: Record<string, string>;
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
        {files.map((file, index) => {
          const key = attachmentKey(file, index);
          const stableKey = [file.message_id, file.attachment_id, file.filename].filter(Boolean).join("|");
          return (
            <PdfAttachmentCard
              key={key}
              file={file}
              attachmentIndex={index}
              onView={onView}
              onPrepare={onPrepare}
              onDownload={onDownload}
              onSummarize={onSummarize}
              isPreparing={preparingKey === key}
              isSummarizing={summarizingKey === key || summarizingKey === stableKey}
              error={errors[key] || errors[stableKey]}
              summary={summaries[key] || summaries[stableKey]}
            />
          );
        })}
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
  const isDocumentSummary = result?.kind === "document_summary_result";
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
          <div className={`mb-2 w-fit rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
            isDocumentSummary
              ? "border-blue-500/20 bg-blue-500/10 text-blue-500"
              : "border-red-500/20 bg-red-500/10 text-red-500"
          }`}>
            {isDocumentSummary ? "Document Analysis" : "Gmail Result"}
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
        <div className="mb-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h2 className="mb-4 text-xl font-black leading-7 text-slate-950 dark:text-white">{children}</h2>,
              h2: ({ children }) => <h3 className="mb-3 mt-6 border-b border-slate-200 pb-2 text-lg font-black leading-7 text-slate-950 first:mt-0 dark:border-slate-800 dark:text-white">{children}</h3>,
              h3: ({ children }) => <h4 className="mb-2 mt-5 text-base font-black leading-6 text-slate-950 first:mt-0 dark:text-white">{children}</h4>,
              p: ({ children }) => <p className="mb-4 break-words leading-7 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-5 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-5 last:mb-0">{children}</ol>,
              li: ({ children }) => <li className="break-words pl-1 leading-7">{children}</li>,
              strong: ({ children }) => <strong className="font-black text-slate-950 dark:text-white">{children}</strong>,
              blockquote: ({ children }) => (
                <blockquote className="mb-4 rounded-2xl border-l-4 border-blue-500 bg-blue-500/10 px-4 py-3 text-slate-700 dark:text-slate-200">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="mb-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
                  <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white">{children}</thead>,
              th: ({ children }) => <th className="border-b border-slate-200 px-4 py-3 font-black dark:border-slate-700">{children}</th>,
              td: ({ children }) => <td className="border-b border-slate-200 px-4 py-3 align-top dark:border-slate-800">{children}</td>,
              code: ({ children }) => (
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.9em] font-bold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  {children}
                </code>
              ),
            }}
          >
            {summary}
          </ReactMarkdown>
        </div>
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
  const [preparedPdfFiles, setPreparedPdfFiles] = useState<Record<string, GmailAttachmentFile>>({});
  const [preparingPdfKey, setPreparingPdfKey] = useState<string | null>(null);
  const [summarizingPdfKey, setSummarizingPdfKey] = useState<string | null>(null);
  const [pdfPrepareErrors, setPdfPrepareErrors] = useState<Record<string, string>>({});
  const [pdfSummaries, setPdfSummaries] = useState<Record<string, string>>({});
  const [rawJsonCopied, setRawJsonCopied] = useState(false);
  const [showUsageDetails, setShowUsageDetails] = useState(false);
  const basePdfAttachments = useMemo(() => collectPdfAttachments(response), [response]);
  const pdfAttachments = useMemo(
    () => mergePreparedPdfAttachments(basePdfAttachments, preparedPdfFiles),
    [basePdfAttachments, preparedPdfFiles],
  );
  const operationType = normalizeOperation(response);
  const replyWasSent = isReplyActuallySent(response, completionResult);
  const editableDraftText = getEditableReplyText(response, completionResult);
  const hasEditableDraft = Boolean(
    editableDraftText &&
    isReplyReviewOperation(response, operationType) &&
    !replyWasSent &&
    !looksLikeRawGmailPayload(editableDraftText),
  );
  const hasReplyConfirmation = Boolean(
    !hasEditableDraft &&
    needsReplyConfirmation(response, completionResult, operationType),
  );
  const resultText = hasEditableDraft || !shouldShowResultTextWithUiResult(response, operationType)
    ? ""
    : getResultText(response, completionResult);
  const uiEmails = response?.ui_result?.emails || [];
  const hasUiResult = Boolean(response?.ui_result);
  const hasForm = Boolean(response?.requires_form && response?.form_schema);
  const isNewEmailReview = isNewEmailOperation(response, operationType);
  const threadId = extractThreadId(response);
  const draftId = extractDraftId(response);
  const draftSubject = isNewEmailReview
    ? extractNewEmailSubject(response)
    : firstString(response?.subject, deepFindString(response?.step_results, ["subject"]));
  const draftRecipient = isNewEmailReview
    ? extractNewEmailRecipients(response).join(", ")
    : firstString(response?.from_email, deepFindString(response?.step_results, ["from_email", "from"]));
  const hasOutput = Boolean(hasForm || hasEditableDraft || hasReplyConfirmation || hasUiResult || pdfAttachments.length || response || completionResult || resultText);
  const emailsFound = uiEmails.length || response?.emails_found || countByTool(response, ["search", "fetch", "thread", "email"]);
  const repliesGenerated = response?.replies_generated || countByTool(response, ["generate", "compose", "reply"]);
  const repliesSent = replyWasSent
    ? response?.replies_sent_count || countByTool(response, ["send", "reply_to_thread"])
    : 0;
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

  const preparePdfAttachment = async (
    file: GmailAttachmentFile,
    index: number,
    options: { preview?: boolean; download?: boolean } = {},
  ) => {
    const key = attachmentKey(file, index);
    const stableKey = [file.message_id, file.attachment_id, file.filename].filter(Boolean).join("|");

    if ((file.view_url || file.file_url) && options.preview) {
      setSelectedPdf(file);
      return file;
    }

    const existing = preparedPdfFiles[key] || preparedPdfFiles[stableKey];
    if (existing) {
      if (options.preview) setSelectedPdf(existing);
      if (options.download) {
        const downloadUrl = absoluteFileUrl(existing.download_url || existing.view_url || existing.file_url);
        if (downloadUrl) window.open(downloadUrl, "_blank", "noopener,noreferrer");
      }
      return existing;
    }

    if (!file.message_id || !file.attachment_id) {
      setPdfPrepareErrors((prev) => ({
        ...prev,
        [key]: "This PDF is missing Gmail attachment identifiers.",
      }));
      return null;
    }

    setPreparingPdfKey(key);
    setPdfPrepareErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const result = await fetchAttachment(
        file.message_id,
        file.attachment_id,
        file.filename || undefined,
        file.mime_type || "application/pdf",
      );
      const stored =
        normalizeAttachment(result.attachment_file) ||
        normalizeAttachment(result.pdf_attachments?.[0]) ||
        normalizeAttachment(result.attachments?.[0]);

      if (!stored?.view_url && !stored?.download_url && !stored?.file_url) {
        throw new Error("Backend did not return a stored PDF URL.");
      }

      const merged: GmailAttachmentFile = {
        ...file,
        ...stored,
        filename: stored.filename || file.filename,
        message_id: stored.message_id || file.message_id,
        attachment_id: stored.attachment_id || file.attachment_id,
        mime_type: stored.mime_type || file.mime_type || "application/pdf",
        is_pdf: true,
        stored: true,
      };

      setPreparedPdfFiles((prev) => ({
        ...prev,
        [key]: merged,
        [stableKey]: merged,
      }));

      if (options.preview) setSelectedPdf(merged);
      if (options.download) {
        const downloadUrl = absoluteFileUrl(merged.download_url || merged.view_url || merged.file_url);
        if (downloadUrl) window.open(downloadUrl, "_blank", "noopener,noreferrer");
      }

      return merged;
    } catch (error) {
      setPdfPrepareErrors((prev) => ({
        ...prev,
        [key]: error instanceof Error ? error.message : "Unable to prepare PDF.",
      }));
      return null;
    } finally {
      setPreparingPdfKey(null);
    }
  };

  const summarizePdfAttachment = async (file: GmailAttachmentFile, index: number) => {
    const key = attachmentKey(file, index);
    const stableKey = [file.message_id, file.attachment_id, file.filename].filter(Boolean).join("|");

    if (!file.message_id || !file.attachment_id) {
      setPdfPrepareErrors((prev) => ({
        ...prev,
        [key]: "This PDF is missing Gmail attachment identifiers.",
      }));
      return;
    }

    setSummarizingPdfKey(key);
    setPdfPrepareErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const result = await summarizeAttachment(
        file.message_id,
        file.attachment_id,
        file.filename || undefined,
        file.mime_type || "application/pdf",
      );
      const stored =
        normalizeAttachment(result.attachment_file) ||
        normalizeAttachment(result.pdf_attachments?.[0]) ||
        normalizeAttachment(result.attachments?.[0]);
      const answer = documentAnalysisAnswer(result.document_analysis);

      if (stored) {
        const merged: GmailAttachmentFile = {
          ...file,
          ...stored,
          filename: stored.filename || file.filename,
          message_id: stored.message_id || file.message_id,
          attachment_id: stored.attachment_id || file.attachment_id,
          mime_type: stored.mime_type || file.mime_type || "application/pdf",
          is_pdf: true,
          stored: true,
        };
        setPreparedPdfFiles((prev) => ({
          ...prev,
          [key]: merged,
          [stableKey]: merged,
        }));
      }

      if (!answer) {
        throw new Error("Backend did not return a PDF summary.");
      }

      setPdfSummaries((prev) => ({
        ...prev,
        [key]: answer,
        [stableKey]: answer,
      }));
    } catch (error) {
      setPdfPrepareErrors((prev) => ({
        ...prev,
        [key]: error instanceof Error ? error.message : "Unable to summarize PDF.",
      }));
    } finally {
      setSummarizingPdfKey(null);
    }
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


            <WorkflowErrorPanel response={response} />

            {response?.requires_form && response?.form_schema && onSendPrompt ? (
              isClarificationResponse(response) && getMissingFieldName(response) ? (
                <CompactClarificationForm
                  response={response}
                  onSendPrompt={onSendPrompt}
                />
              ) : (
                <GmailActionForm
                  schema={response.form_schema}
                  originalPrompt={String(response.partial_intent?.original_prompt || response.plan?.goal || "")}
                  partialIntent={partialIntent}
                  onSubmit={(nextPrompt) => onSendPrompt(nextPrompt)}
                />
              )
            ) : null}

            <PdfAttachmentPanel
              files={pdfAttachments}
              onView={setSelectedPdf}
              onPrepare={(file, index) => void preparePdfAttachment(file, index, { preview: true })}
              onDownload={(file, index) => void preparePdfAttachment(file, index, { download: true })}
              onSummarize={(file, index) => void summarizePdfAttachment(file, index)}
              preparingKey={preparingPdfKey}
              summarizingKey={summarizingPdfKey}
              errors={pdfPrepareErrors}
              summaries={pdfSummaries}
            />

            {resultText ? (
              <FormattedAiResult text={resultText} operationType={operationType} />
            ) : null}

            {response?.ui_result ? <EmailResultPanel response={response} onViewPdf={setSelectedPdf} /> : null}

            {hasEditableDraft ? (
              <EditableReplyDraft
                initialBody={editableDraftText}
                threadId={isNewEmailReview ? "new_email" : threadId || null}
                draftId={draftId || null}
                subject={draftSubject || null}
                recipient={draftRecipient || null}
                fromEmail={response?.from_email || null}
                onSend={(editedBody) => onSendPrompt?.(buildPrimarySendPayload(response, operationType, editedBody))}
                onSaveDraft={(editedBody) => onSendPrompt?.(buildPrimaryDraftPayload(response, operationType, editedBody))}
                onRegenerate={() =>
                  onSendPrompt?.(
                    `Regenerate the Gmail reply for this same thread using a professional tone. Original goal: ${response?.plan?.goal || "reply to email"}`,
                  )
                }
              />
            ) : null}

            {hasReplyConfirmation ? (
              <ReplyConfirmationPanel response={response} draftText={editableDraftText} operationType={operationType} onSendPrompt={onSendPrompt} />
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
