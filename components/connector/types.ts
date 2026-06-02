"use client";

export type WorkflowResponse = {
  success?: boolean;
  status?: string;
  summary?: string;
  message?: string;
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
  final_answer?: string | null;
  delivery_status?: "sent" | "draft_only";
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
