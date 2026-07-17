"use client";

export type GmailFormFieldType = "text" | "textarea" | "select" | "email" | "boolean";

export interface GmailFormField {
  name: string;
  label: string;
  type: GmailFormFieldType;
  required?: boolean;
  required_for?: string[];
  options?: string[];
  placeholder?: string;
  default?: string | boolean;
}

export interface GmailFormSchema {
  title?: string;
  description?: string;
  missing_field?: string | null;
  fields?: GmailFormField[];
  partial_intent?: Record<string, unknown>;
}

export interface GmailAttachmentFile {
  id?: number | string | null;
  filename?: string;
  original_filename?: string;
  mime_type?: string | null;
  file_extension?: string | null;
  message_id?: string | null;
  thread_id?: string | null;
  attachment_id?: string | null;
  size?: number | null;
  file_size_bytes?: number | null;
  storage_type?: "local" | "s3" | string;
  stored?: boolean;
  is_pdf?: boolean;
  file_url?: string | null;
  view_url?: string | null;
  download_url?: string | null;
}

export interface GmailUiEmail {
  id?: string;
  thread_id?: string;
  subject?: string;
  from?: string;
  from_name?: string;
  sender_name?: string;
  from_email?: string;
  to?: string;
  date?: string;
  date_str?: string;
  snippet?: string;
  body_preview?: string;
  body?: string;
  content?: string;
  attachments?: GmailAttachmentFile[];
  pdf_attachments?: GmailAttachmentFile[];
}

export interface UiResult {
  kind?: "email_result" | "draft_result" | "summary_result" | string;
  title?: string;
  summary?: string;
  emails?: GmailUiEmail[];
  attachments?: GmailAttachmentFile[];
  pdf_attachments?: GmailAttachmentFile[];
  has_pdf_attachments?: boolean;
  raw_hidden?: boolean;
}

export type WorkflowResponse = {
  success?: boolean;
  status?: string;
  summary?: string;
  message?: string;
  chat_message?: string | null;
  ui_result?: UiResult | null;

  // PDF / Gmail attachment viewer support.
  attachments?: GmailAttachmentFile[];
  pdf_attachments?: GmailAttachmentFile[];
  has_pdf_attachments?: boolean;

  // Phase 2: backend-driven clarification/action form.
  requires_form?: boolean;
  form_schema?: GmailFormSchema | null;
  form_data?: Record<string, unknown> | null;

  // Editable reply draft / final-send support.
  thread_id?: string | null;
  draft_id?: string | null;
  can_send?: boolean;

  can_execute?: boolean;
  missing_field?: string;
  missing_field_question?: string;
  question?: string;
  partial_intent?: Record<string, unknown>;
  field_type?: "email" | "choice" | "text" | "text_optional";
  field_options?: string[];
  field_skippable?: boolean;
  requires_oauth?: boolean;
  connector?: string | null;
  flow?: Record<string, unknown>;
  ui_schema?: Record<string, unknown>;
  policy_decision?: {
    allowed?: boolean;
    decision?: "allowed" | "draft_only" | "blocked" | string;
    reason?: string | null;
    required_user_action?: string | null;
    [key: string]: unknown;
  } | null;
  analysis?: string | null;
  reply?: string | null;
  reply_sent?: string | null;
  reply_draft?: string | null;
  reply_body?: string | null;
  generated_reply?: string | null;
  intent_understanding?: Record<string, unknown> | null;
  final_answer?: string | null;
  delivery_status?: "sent" | "draft_only";
  emails_found?: number;
  replies_generated?: number;
  replies_sent_count?: number;
  rule_id?: number;
  execution_type?: string;
  from_email?: string;
  subject?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
  plan?: {
    goal?: string;
    gmail_intent?: string | Record<string, unknown> | null;
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
  error?: string | null;
};

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
  thread_id?: string | null;
  draft_id?: string | null;
  can_send?: boolean;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
}

export interface ReplyCustomizerValues {
  tone: string;
  customInstruction: string;
  rewrittenMessage: string;
}

export function resolveGmailIntent(value: WorkflowResponse["plan"]): string {
  const raw = value?.gmail_intent;
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    return String(record.intent ?? record.type ?? record.operation ?? record.name ?? "").trim();
  }
  return "";
}
