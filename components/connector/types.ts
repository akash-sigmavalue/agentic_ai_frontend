"use client";

/**
 * New Gmail intent-understanding format.
 *
 * Backend can now return this directly as:
 * - response.intent_understanding
 * - response.gmail_intent
 * - response.plan.gmail_intent
 * - response.plan.intent_understanding
 */
export type GmailNewIntent = {
  stage?: "intent_understanding" | string;
  agent_name?: string;

  input?: {
    user_prompt?: string;
    available_intents?: string[];
    [key: string]: unknown;
  };

  intent_understanding_output?: {
    intent_status?: "resolved" | "needs_clarification" | "unresolved" | string;
    primary_intent?: GmailPrimaryIntent | string;
    secondary_intents?: string[];
    action_category?:
      | "read_only"
      | "write_action"
      | "destructive_action"
      | "scheduling_action"
      | "mixed_action"
      | string;
    user_goal?: string;
    reasoning_summary?: string;
    confidence_score?: number;
    [key: string]: unknown;
  };

  intent_details?: GmailIntentDetails;

  clarification?: {
    required?: boolean;
    question?: string;
    missing_information?: string[];
    [key: string]: unknown;
  };

  safety_and_permission?: {
    can_execute_without_confirmation?: string[];
    requires_confirmation?: string[];
    requires_explicit_confirmation?: string[];
    permission_status?: "allowed" | "pending_confirmation" | "blocked" | string;
    [key: string]: unknown;
  };

  next_stage?: {
    stage_name?:
      | "gmail_query_builder"
      | "email_reader"
      | "action_planner"
      | "clarification"
      | "policy_confirmation"
      | "completed"
      | string;
    input_required?: Record<string, unknown>;
    [key: string]: unknown;
  };

  [key: string]: unknown;
};

export type GmailPrimaryIntent =
  | "fetch_email"
  | "search_email"
  | "read_email"
  | "summarize_email"
  | "extract_data"
  | "extract_document"
  | "draft_reply"
  | "send_reply"
  | "send_new_email"
  | "forward_email"
  | "archive_email"
  | "delete_email"
  | "label_email"
  | "mark_as_read"
  | "mark_as_unread"
  | "star_email"
  | "unstar_email"
  | "mark_as_important"
  | "list_drafts"
  | "create_draft"
  | "update_draft"
  | "send_draft"
  | "contact_report"
  | "email_insight_report"
  | "schedule_follow_up";

export type GmailIntentDetails = {
  fetch_email?: GmailSearchEmailDetail;
  search_email?: GmailSearchEmailDetail;
  read_email?: {
    is_required?: boolean;
    reason?: string;
    read_type?: "snippet" | "full_email" | "full_thread" | "attachment" | string;
    [key: string]: unknown;
  };
  summarize_email?: {
    is_required?: boolean;
    reason?: string;
    summary_type?: "brief" | "detailed" | "action_points" | "thread_summary" | string;
    [key: string]: unknown;
  };
  extract_data?: {
    is_required?: boolean;
    reason?: string;
    fields_to_extract?: string[];
    [key: string]: unknown;
  };
  extract_document?: {
    is_required?: boolean;
    reason?: string;
    document_source?: "email_attachment" | "email_body" | "linked_document" | "unknown" | string;
    document_types?: string[];
    extraction_scope?: "full_document" | "specific_fields" | "summary" | "tables_only" | string;
    fields_to_extract?: string[];
    requires_attachment_read?: boolean;
    requires_document_parser?: boolean;
    [key: string]: unknown;
  };
  draft_reply?: {
    is_required?: boolean;
    reason?: string;
    draft_tone?: "professional" | "concise" | "formal" | "friendly" | string;
    requires_user_review?: boolean;
    reply_instruction?: string | null;
    [key: string]: unknown;
  };
  send_reply?: {
    is_required?: boolean;
    reason?: string;
    requires_explicit_confirmation?: boolean;
    reply_instruction?: string | null;
    [key: string]: unknown;
  };
  send_new_email?: {
    is_required?: boolean;
    reason?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body_instruction?: string;
    tone?: string;
    requires_explicit_confirmation?: boolean;
    [key: string]: unknown;
  };
  forward_email?: {
    is_required?: boolean;
    reason?: string;
    forward_to?: string[];
    note?: string | null;
    requires_confirmation?: boolean;
    [key: string]: unknown;
  };
  archive_email?: {
    is_required?: boolean;
    reason?: string;
    requires_confirmation?: boolean;
    [key: string]: unknown;
  };
  delete_email?: {
    is_required?: boolean;
    reason?: string;
    requires_explicit_confirmation?: boolean;
    [key: string]: unknown;
  };
  label_email?: {
    is_required?: boolean;
    reason?: string;
    label_name?: string;
    create_label_if_missing?: boolean;
    action?: "apply" | "remove" | "create" | "archive" | string;
    [key: string]: unknown;
  };
  mark_as_read?: GmailStatusIntentDetail;
  mark_as_unread?: GmailStatusIntentDetail;
  star_email?: GmailStatusIntentDetail;
  unstar_email?: GmailStatusIntentDetail;
  mark_as_important?: GmailStatusIntentDetail;
  list_drafts?: GmailDraftManagementDetail;
  create_draft?: GmailDraftManagementDetail;
  update_draft?: GmailDraftManagementDetail;
  send_draft?: GmailDraftManagementDetail;
  contact_report?: {
    is_required?: boolean;
    reason?: string;
    report_type?: "top_senders" | "sender_frequency" | "domain_report" | string;
    date_range?: GmailDateRange;
    [key: string]: unknown;
  };
  email_insight_report?: {
    is_required?: boolean;
    reason?: string;
    report_type?:
      | "count"
      | "top_senders"
      | "attachment_count"
      | "weekly_summary"
      | "sender_wise_count"
      | string;
    group_by?: "sender" | "date" | "label" | "subject" | "none" | string;
    date_range?: GmailDateRange;
    [key: string]: unknown;
  };
  schedule_follow_up?: {
    is_required?: boolean;
    reason?: string;
    follow_up_date?: string;
    follow_up_time?: string;
    reminder_text?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type GmailSearchEmailDetail = {
  is_required?: boolean;
  reason?: string;
  search_scope?: {
    sender?: string | null;
    recipient?: string | null;
    subject_keywords?: string[];
    body_keywords?: string[];
    date_range?: GmailDateRange;
    labels?: string[];
    has_attachment?: boolean | null;
    is_unread?: boolean | null;
    latest?: boolean | null;
    max_results?: number | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type GmailDateRange = {
  after?: string | null;
  before?: string | null;
  [key: string]: unknown;
};

export type GmailStatusIntentDetail = {
  is_required?: boolean;
  reason?: string;
  requires_confirmation?: boolean;
  [key: string]: unknown;
};

export type GmailDraftManagementDetail = {
  is_required?: boolean;
  reason?: string;
  draft_action?: "list" | "create" | "update" | "send" | "delete" | string;
  draft_id?: string | null;
  to?: string[];
  subject?: string;
  body_instruction?: string;
  requires_confirmation?: boolean;
  [key: string]: unknown;
};

export type LegacyGmailIntent = {
  intent_type?: "gmail" | string;
  execution_type?: "automation_rule" | "one_time_action" | "multi_step" | string;
  connector?: "gmail" | string;
  trigger_type?: string | null;
  group_id?: number | null;
  group_name?: string | null;
  operation?: string;
  action_type?: string;
  risk_level?: "low" | "medium" | "high" | "depends" | string;
  confirmation_required?: boolean;
  filters?: Record<string, unknown>;
  email_payload?: Record<string, unknown>;
  automation?: Record<string, unknown>;
  output_requirement?: Record<string, unknown>;
  chain_steps?: Array<Record<string, unknown>>;
  missing_fields?: Array<Record<string, unknown>>;
  frontend?: Record<string, unknown>;
  [key: string]: unknown;
};

export type GmailIntentLike = GmailNewIntent | LegacyGmailIntent | Record<string, unknown>;

export type WorkflowResponse = {
  success?: boolean;
  status?: string;
  summary?: string;
  message?: string;
  can_execute?: boolean;
  missing_field?: string;
  missing_field_question?: string;
  question?: string;
  needs_sender_email?: boolean;
  sender_email_question?: string;
  partial_intent?: Record<string, unknown>;
  field_type?: "email" | "choice" | "text" | "text_optional";
  field_options?: string[];
  field_skippable?: boolean;
  requires_oauth?: boolean;
  connector?: string | null;
  flow?: Record<string, unknown>;
  ui_schema?: Record<string, unknown>;

  // New intent-format fields exposed directly by backend.
  intent_understanding?: GmailNewIntent | null;
  gmail_intent?: GmailIntentLike | null;
  legacy_execution_intent?: LegacyGmailIntent | Record<string, unknown> | null;

  policy_decision?: {
    allowed?: boolean;
    decision?: "allowed" | "draft_only" | "blocked" | "requires_confirmation" | string;
    action?: string;
    reason?: string | null;
    required_user_action?: string | null;
    risk_level?: "low" | "medium" | "high" | "depends" | string;
    confirmation_required?: boolean;
    requires_approval?: boolean;
    primary_intent?: string | null;
    action_category?: string | null;
    permission_status?: string | null;
    operation?: string | null;
    [key: string]: unknown;
  } | null;

  analysis?: string | null;
  reply?: string | null;
  reply_sent?: string | null;
  reply_draft?: string | null;
  final_answer?: string | null;
  delivery_status?: "sent" | "draft_only";
  rule_id?: number;
  execution_type?: string;
  from_email?: string;
  to?: string | null;
  cc?: string | null;
  bcc?: string | null;
  automation_frequency?: "one_time" | "automated" | null;
  subject?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
  token_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    estimated_cost_usd?: number;
    [key: string]: unknown;
  } | null;

  plan?: {
    goal?: string;
    gmail_intent?: GmailIntentLike | string | null;

    // New explicit plan-level intent fields.
    intent_understanding?: GmailNewIntent | Record<string, unknown> | null;
    legacy_execution_intent?: LegacyGmailIntent | Record<string, unknown> | null;

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
      tool?: string | null;
      args?: Record<string, unknown>;
      store_as?: string | null;
    }>;
    needs_approval?: boolean;
    notes?: string[];
    special_response?: Record<string, unknown> | null;
    [key: string]: unknown;
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
    [key: string]: unknown;
  }>;

  approval_status?: string;
  error?: string | null;
  debug?: Record<string, unknown> | null;
};

export type WorkflowOperationType =
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
  | "draft"
  | "contact_report"
  | "status_update"
  | "delete"
  | "insight_report"
  | "chain";

export type ConvStep =
  | "idle"
  | "waiting_email"
  | "waiting_frequency"
  | "waiting_field"
  | "submitting"
  | "streaming"
  | "done";

export interface StreamStep {
  step: number;
  step_id: string;
  name: string;
  status: string;
  output: string;
  duration_ms?: number | null;
  error?: string | null;
}

export interface ConvMessage {
  role: "agent" | "assistant" | "user";
  text: string;
  content?: string;
}

export interface CompletionResult {
  status: "automation_rule_created" | "one_time_completed";
  message: string;
  rule_id?: number;
  execution_type?: string;
  reply?: string;
  reply_sent?: string;
  reply_draft?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
  token_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    estimated_cost_usd?: number;
    [key: string]: unknown;
  } | null;
}

export interface ReplyCustomizerValues {
  tone: string;
  customInstruction: string;
  rewrittenMessage: string;
}

const NEW_INTENT_TO_OPERATION: Record<string, WorkflowOperationType> = {
  fetch_email: "fetch",
  search_email: "search",
  read_email: "read",
  summarize_email: "analyze",
  extract_data: "analyze",
  extract_document: "read_attachment",
  draft_reply: "reply",
  send_reply: "reply",
  send_new_email: "send",
  forward_email: "send",
  archive_email: "label",
  delete_email: "delete",
  label_email: "label",
  mark_as_read: "status_update",
  mark_as_unread: "status_update",
  star_email: "status_update",
  unstar_email: "status_update",
  mark_as_important: "status_update",
  list_drafts: "draft",
  create_draft: "draft",
  update_draft: "draft",
  send_draft: "send",
  contact_report: "contact_report",
  email_insight_report: "insight_report",
  schedule_follow_up: "automate",
};

const LEGACY_OPERATION_ALIASES: Record<string, WorkflowOperationType> = {
  reply: "reply",
  reply_to_thread: "reply_to_thread",
  send_reply: "reply",
  draft_reply: "reply",
  send: "send",
  send_email: "send",
  send_new_email: "send",
  automate: "automate",
  automation_rule: "automate",
  fetch: "fetch",
  search: "search",
  read: "read",
  read_attachment: "read_attachment",
  fetch_attachment: "read_attachment",
  analyze: "analyze",
  analyse: "analyze",
  summarize: "analyze",
  summarise: "analyze",
  extract: "analyze",
  classify: "classify",
  label: "label",
  apply_label: "label",
  remove_label: "label",
  create_label: "label",
  archive: "label",
  draft: "draft",
  create_draft: "draft",
  list_drafts: "draft",
  update_draft: "draft",
  contact_report: "contact_report",
  sender_frequency: "contact_report",
  status_update: "status_update",
  mark_read: "status_update",
  mark_unread: "status_update",
  star: "status_update",
  unstar: "status_update",
  mark_important: "status_update",
  delete: "delete",
  trash: "delete",
  delete_email: "delete",
  insight_report: "insight_report",
  email_insight_report: "insight_report",
  top_senders: "insight_report",
  chain: "chain",
  compound: "chain",
  multi_step: "chain",
  workflow_chain: "chain",

  "gmail.search_threads": "search",
  "gmail.get_thread": "read",
  "gmail.read_message": "read",
  "gmail.read_attachment": "read_attachment",
  "gmail.classify_email": "classify",
  "gmail.draft_email": "draft",
  "gmail.create_draft": "draft",
  "gmail.list_drafts": "draft",
  "gmail.send_draft": "send",
  "gmail.send_email": "send",
  "gmail.reply_to_thread": "reply",
  "gmail.apply_label": "label",
  "gmail.status_update": "status_update",
  "gmail.delete": "delete",
  "gmail.contact_report": "contact_report",
  "gmail.insight_report": "insight_report",
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isGmailNewIntent(value: unknown): value is GmailNewIntent {
  return (
    isRecord(value) &&
    (value.stage === "intent_understanding" ||
      isRecord(value.intent_understanding_output) ||
      isRecord(value.intent_details))
  );
}

export function getGmailNewIntentFromResponse(
  response?: WorkflowResponse | null,
): GmailNewIntent | null {
  if (!response) return null;

  if (isGmailNewIntent(response.intent_understanding)) {
    return response.intent_understanding;
  }

  if (isGmailNewIntent(response.gmail_intent)) {
    return response.gmail_intent;
  }

  if (isGmailNewIntent(response.plan?.intent_understanding)) {
    return response.plan.intent_understanding as GmailNewIntent;
  }

  if (isGmailNewIntent(response.plan?.gmail_intent)) {
    return response.plan.gmail_intent as GmailNewIntent;
  }

  return null;
}

export function getPrimaryIntentFromGmailIntent(intent?: unknown): string {
  if (!isRecord(intent)) return "";

  const understanding = intent.intent_understanding_output;
  if (!isRecord(understanding)) return "";

  return String(understanding.primary_intent ?? "").trim();
}

export function mapPrimaryIntentToOperation(primaryIntent?: string | null): WorkflowOperationType | "" {
  const key = String(primaryIntent || "").trim().toLowerCase();
  if (!key) return "";
  return NEW_INTENT_TO_OPERATION[key] || LEGACY_OPERATION_ALIASES[key] || "";
}

export function normalizeWorkflowOperation(value?: string | null): WorkflowOperationType | "" {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return "";

  return NEW_INTENT_TO_OPERATION[key] || LEGACY_OPERATION_ALIASES[key] || "";
}

export function resolveGmailIntent(value: WorkflowResponse["plan"]): string {
  const raw = value?.gmail_intent;
  if (!raw) return "";

  if (typeof raw === "string") return raw.trim();

  if (isRecord(raw)) {
    const primaryIntent = getPrimaryIntentFromGmailIntent(raw);
    if (primaryIntent) return primaryIntent;

    return String(
      raw.intent ??
        raw.type ??
        raw.operation ??
        raw.name ??
        raw.primary_intent ??
        "",
    ).trim();
  }

  return "";
}

export function resolveWorkflowOperationFromResponse(
  response?: WorkflowResponse | null,
  prompt = "",
): WorkflowOperationType {
  const newIntent = getGmailNewIntentFromResponse(response);
  const primaryIntent = getPrimaryIntentFromGmailIntent(newIntent);

  const mappedFromPrimary = mapPrimaryIntentToOperation(primaryIntent);
  if (mappedFromPrimary) return mappedFromPrimary;

  const planIntent = response?.plan?.gmail_intent;
  if (isRecord(planIntent)) {
    const mappedFromOperation = normalizeWorkflowOperation(
      String(planIntent.operation ?? planIntent.intent ?? planIntent.type ?? ""),
    );
    if (mappedFromOperation) return mappedFromOperation;
  }

  const policyOperation = response?.policy_decision?.operation;
  const policyPrimaryIntent = response?.policy_decision?.primary_intent;

  const mappedFromPolicyPrimary = mapPrimaryIntentToOperation(
    typeof policyPrimaryIntent === "string" ? policyPrimaryIntent : "",
  );
  if (mappedFromPolicyPrimary) return mappedFromPolicyPrimary;

  const mappedFromPolicyOperation = normalizeWorkflowOperation(
    typeof policyOperation === "string" ? policyOperation : "",
  );
  if (mappedFromPolicyOperation) return mappedFromPolicyOperation;

  const firstActionTool =
    response?.step_results
      ?.map((step) => step.tool)
      .find((tool) =>
        [
          "gmail.apply_label",
          "gmail.status_update",
          "gmail.delete",
          "gmail.contact_report",
          "gmail.insight_report",
          "gmail.create_draft",
          "gmail.draft_email",
          "gmail.send_email",
          "gmail.reply_to_thread",
        ].includes(String(tool || "")),
      ) ||
    response?.raw_mcp_results
      ?.map((item) => item.tool)
      .find((tool) =>
        [
          "gmail.apply_label",
          "gmail.status_update",
          "gmail.delete",
          "gmail.contact_report",
          "gmail.insight_report",
          "gmail.create_draft",
          "gmail.draft_email",
          "gmail.send_email",
          "gmail.reply_to_thread",
        ].includes(String(tool || "")),
      );

  const mappedFromTool = normalizeWorkflowOperation(firstActionTool);
  if (mappedFromTool) return mappedFromTool;

  return detectGroupType(prompt, resolveGmailIntent(response?.plan), response?.execution_type);
}

export function detectGroupType(
  prompt: string,
  operationType?: string,
  executionType?: string,
): WorkflowOperationType {
  const lower = (prompt || "").toLowerCase();
  const normalizedOp = normalizeWorkflowOperation(operationType);
  const op = normalizedOp || (operationType || "").toLowerCase();
  const exec = (executionType || "").toLowerCase();

  if (
    op === "chain" ||
    /\b(find.*reply|search.*reply|read.*summarize|find.*label|extract.*draft)\b/.test(lower)
  ) {
    return "chain";
  }

  if (
    op === "automate" ||
    exec === "automated" ||
    /\b(when|whenever|every time|automatically|always)\b/.test(lower)
  ) {
    return "automate";
  }

  if (
    op === "label" ||
    /\b(label|archive|move to folder|organize|organise)\b/.test(lower)
  ) {
    return "label";
  }

  if (
    op === "draft" ||
    /\b(draft|pending drafts|saved draft|create draft|edit draft|update draft)\b/.test(lower)
  ) {
    return "draft";
  }

  if (
    op === "contact_report" ||
    /\b(who emails me|email id of|contact|people|sender frequency|domain report)\b/.test(lower)
  ) {
    return "contact_report";
  }

  if (
    op === "status_update" ||
    /\b(mark as read|mark read|mark unread|star|unstar|important|snooze|flag)\b/.test(lower)
  ) {
    return "status_update";
  }

  if (
    op === "delete" ||
    /\b(delete|trash|clean inbox|remove old emails|bulk delete)\b/.test(lower)
  ) {
    return "delete";
  }

  if (
    op === "insight_report" ||
    /\b(how many emails|count of emails|weekly summary|email report|top senders|activity report|insight)\b/.test(lower)
  ) {
    return "insight_report";
  }

  if (op === "reply" || op === "reply_to_thread" || /\breply\b/.test(lower)) return "reply";
  if (op === "send" || /\bsend email\b/.test(lower)) return "send";

  if (
    op === "read_attachment" ||
    /\b(read the pdf|open attachment|download attachment|attached pdf|attached excel|attachment)\b/.test(lower)
  ) {
    return "read_attachment";
  }

  if (
    op === "analyze" ||
    op === "classify" ||
    /\b(extract|analyze|analyse|classify|summarize|summarise|key details|action items)\b/.test(lower)
  ) {
    return "analyze";
  }

  if (op === "read" || /\b(show full thread|read thread|full thread|read latest email)\b/.test(lower)) {
    return "read";
  }

  if (op === "search" || /\b(find emails|search emails|search for|emails about)\b/.test(lower)) {
    return "search";
  }

  return "fetch";
}

export function extractEmailsFromText(text: string): string[] {
  return (text || "").match(/[\w.+-]+@[\w.-]+\.\w+/g) || [];
}

export function inferExecutionType(
  prompt: string,
  responseExecType?: string | null,
): "one_time" | "automated" | null {
  if (responseExecType === "one_time" || responseExecType === "automated") return responseExecType;

  const lower = (prompt || "").toLowerCase();
  if (/\b(when|whenever|every time|automatically|always)\b/.test(lower)) return "automated";
  if (/\b(reply to|send email|reply saying|send saying)\b/.test(lower)) return "one_time";
  return null;
}
