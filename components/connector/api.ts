"use client";

import type { StreamStep, WorkflowResponse } from "./types";
import { API_BASE_URL, CONNECTOR_API_ROUTES, apiUrl } from "../../lib/api-client";

export interface GoogleOAuthStartResponse {
  auth_url: string;
}

export interface GmailConnectionStatusResponse {
  connected: boolean;
  email?: string | null;
}

export interface ContinueMissingFieldRequest {
  missing_field: string;
  user_answer: string;
  partial_intent: Record<string, unknown>;
}

export interface ContinueMissingFieldResponse {
  status: "automation_rule_created" | "one_time_completed" | "needs_clarification";
  message: string;
  rule_id?: number;
  execution_type?: "automated" | "one_time";
  summary?: string;
  final_answer?: string;
  success?: boolean;
  missing_field?: string;
  question?: string;
  field_type?: "email" | "choice" | "text" | "text_optional";
  field_options?: string[];
  field_skippable?: boolean;
  partial_intent?: Record<string, unknown>;
}

export interface SaveAutomationFlowRequest {
  flow: Record<string, unknown>;
}

export interface SaveAutomationFlowResponse {
  success?: boolean;
  rule?: AutomationRuleSummary;
}

export interface AutomationRuleSummary {
  id: number;
  user_id?: number | null;
  connector_type?: string | null;
  execution_type?: string | null;
  trigger_type?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  subject_filter?: string | null;
  keyword_filter?: string[];
  operation?: string | null;
  tone?: string | null;
  output_requirement?: Record<string, unknown>;
  auto_send?: boolean;
  is_active?: boolean;
  last_processed_message_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
  last_execution_status?: string | null;
  last_execution_message_id?: string | null;
  last_execution_action?: string | null;
}

export interface AutomationRuleExecutionLog {
  id: number;
  automation_rule_id?: number;
  user_id?: number;
  connector_type?: string | null;
  connector_id?: string | null;
  trigger_event_id?: string | null;
  matched_message_id?: string | null;
  status?: string;
  action_taken?: string | null;
  error_message?: string | null;
  sender_email?: string | null;
  subject?: string | null;
  thread_id?: string | null;
  reply_text?: string | null;
  draft_id?: string | null;
  sent_message_id?: string | null;
  valuation_extraction?: Record<string, unknown> | null;
  execution_duration_ms?: number | null;
  created_at?: string;
}

export interface ConnectorHealthResponse {
  status?: string;
  connector?: string;
  active_rules?: number;
  users_with_active_watch?: number;
  rules_executed_last_24h?: number;
  rules_failed_last_24h?: number;
}

export const API_BASE = API_BASE_URL;

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers || {});

  const isFormData =
    init.body instanceof FormData ||
    headers.get("Content-Type") === "application/x-www-form-urlencoded";

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers,
    });
  } catch (error) {
    console.error("API network error", {
      path,
      apiBase: API_BASE,
      error,
    });
    throw new Error(`Unable to reach backend at ${API_BASE}. Is it running?`);
  }

  if (!response.ok) {
    const message = await response.text();
    console.error("API request failed", {
      path,
      status: response.status,
      statusText: response.statusText,
      body: message,
    });

    if (response.status === 401 || response.status === 403) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function registerUser(payload: {
  username: string;
  email: string;
  password: string;
}) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: { username: string; password: string }) {
  const body = new URLSearchParams();
  body.append("username", payload.username);
  body.append("password", payload.password);

  return apiFetch<{ access_token: string; token_type: string }>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
}

export function processWorkflow(
  prompt: string,
): Promise<WorkflowResponse> {
  console.log("[Connector Debug] Before processWorkflow():", { prompt });
  console.log("[Connector Debug] Calling processWorkflow with payload:", { prompt });
  return apiFetch<WorkflowResponse>(CONNECTOR_API_ROUTES.processWorkflow, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  }).then((response) => {
    console.log("[Connector Debug] processWorkflow response:", response);
    return response;
  });
}

export function startGoogleOAuth(): Promise<GoogleOAuthStartResponse> {
  return apiFetch<GoogleOAuthStartResponse>(CONNECTOR_API_ROUTES.googleOAuthStart, {
    method: "GET",
  });
}

export function getGmailConnectionStatus(): Promise<GmailConnectionStatusResponse> {
  console.log("[Connector Debug] Before Gmail status check:");
  return apiFetch<GmailConnectionStatusResponse>(CONNECTOR_API_ROUTES.gmailStatus, {
    method: "GET",
  }).then((status) => {
    console.log("[Connector Debug] Gmail status:", status);
    return status;
  });
}

export function continueMissingField(
  payload: ContinueMissingFieldRequest,
): Promise<ContinueMissingFieldResponse> {
  return apiFetch<ContinueMissingFieldResponse>(CONNECTOR_API_ROUTES.continueMissingField, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeAutomationSavePayload(flow: Record<string, unknown>): Record<string, unknown> {
  const trigger = asRecord(flow.trigger ?? flow.automation_trigger);
  const triggerFilters = asRecord(
    flow.trigger_filters ?? trigger.filters ?? flow.filters ?? {},
  );
  const outputRequirement = asRecord(flow.output_requirement ?? flow.outputRequirement);
  const actions = Array.isArray(flow.actions)
    ? flow.actions
    : Array.isArray(flow.automation_actions)
      ? flow.automation_actions
      : [];

  const senderName = asString(
    flow.sender_name ?? triggerFilters.sender_name ?? triggerFilters.from,
  );
  const senderEmail = asString(
    flow.sender_email ?? triggerFilters.sender_email ?? triggerFilters.from,
  );
  const subjectFilter = asString(flow.subject_filter ?? triggerFilters.subject);
  const keywordFilter = asStringList(flow.keyword_filter ?? triggerFilters.keywords);
  const operation = asString(flow.operation ?? flow.action ?? flow.intent_operation) ?? "analyse_and_reply";
  const tone =
    asString(flow.tone ?? outputRequirement.tone ?? flow.reply_tone) ?? "professional";
  const triggerType =
    asString(flow.trigger_type ?? trigger.type) ?? "new_email";
  const executionType =
    asString(flow.execution_type ?? flow.mode) ?? "automated";

  return {
    connector_type: asString(flow.connector_type ?? flow.connector) ?? "gmail",
    execution_type: executionType,
    trigger_type: triggerType,
    sender_name: senderName,
    sender_email: senderEmail,
    subject_filter: subjectFilter,
    keyword_filter: keywordFilter,
    operation,
    tone,
    output_requirement: outputRequirement,
    auto_send: Boolean(flow.auto_send ?? outputRequirement.send_directly),
    is_active: flow.is_active !== false,
    trigger_filters: {
      from: senderEmail || senderName || undefined,
      sender_name: senderName,
      sender_email: senderEmail,
      subject: subjectFilter,
      keywords: keywordFilter,
      is_unread: Boolean(triggerFilters.is_unread),
      has_attachment: Boolean(triggerFilters.has_attachment),
    },
    actions,
  };
}

export function saveAutomationFlow(
  payload: SaveAutomationFlowRequest,
): Promise<SaveAutomationFlowResponse> {
  return apiFetch<SaveAutomationFlowResponse>(CONNECTOR_API_ROUTES.automationRules, {
    method: "POST",
    body: JSON.stringify(normalizeAutomationSavePayload(payload.flow)),
  });
}

export interface StreamWorkflowOptions {
  prompt: string;
  onStep: (step: StreamStep) => void;
  onComplete: (result: Record<string, unknown>) => void;
  onError: (error: string) => void;
  partialIntent?: Record<string, unknown> | null;
  executionMode?: "one_time_action" | "automation_rule" | null;
  signal?: AbortSignal;
}

export async function streamWorkflowRun({
  prompt,
  onStep,
  onComplete,
  onError,
  partialIntent,
  executionMode,
  signal,
}: StreamWorkflowOptions): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${CONNECTOR_API_ROUTES.workflowStream}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        partial_intent: partialIntent ?? undefined,
        execution_mode: executionMode ?? undefined,
      }),
      signal,
    });
  } catch (error) {
    onError(error instanceof Error ? error.message : "Network error connecting to stream");
    return;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => `HTTP ${response.status}`);
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      onError("Session expired. Please log in again.");
    } else {
      onError(text || `Request failed with status ${response.status}`);
    }
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError("No response body from streaming endpoint");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\n\n/);
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        const dataLine = trimmed
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("");

        if (!dataLine) continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(dataLine);
        } catch {
          continue;
        }

        const eventType = String(parsed.type || "");
        if (eventType === "step_started" || eventType === "step_completed" || eventType === "step_failed") {
          const stepPayload = asRecord(parsed.step);
          onStep({
            step: Number(stepPayload.step_number ?? stepPayload.step ?? 0),
            step_id: String(stepPayload.step_id ?? ""),
            name: String(stepPayload.step_name ?? stepPayload.name ?? ""),
            status: String(stepPayload.status ?? eventType.replace("step_", "")),
            output: String(stepPayload.output ?? ""),
            duration_ms:
              typeof stepPayload.duration_ms === "number"
                ? stepPayload.duration_ms
                : null,
            error:
              typeof stepPayload.error_message === "string"
                ? stepPayload.error_message
                : typeof stepPayload.error === "string"
                  ? stepPayload.error
                  : null,
          });
        } else if (eventType === "workflow_completed") {
          onComplete(asRecord(parsed.result));
        } else if (eventType === "error") {
          onError(String(parsed.error ?? "Unknown streaming error"));
        }
      }
    }
  } catch (error) {
    if ((error as Error)?.name !== "AbortError") {
      onError(error instanceof Error ? error.message : "Streaming error");
    }
  } finally {
    reader.releaseLock();
  }
}

export function fetchAttachment(
  messageId: string,
  attachmentId: string,
  filename?: string,
  mimeType?: string,
): Promise<Record<string, unknown>> {
  const query = new URLSearchParams();
  if (filename) {
    query.set("filename", filename);
  }
  if (mimeType) {
    query.set("mime_type", mimeType);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<Record<string, unknown>>(
    `/connectors/attachment/${encodeURIComponent(messageId)}/${encodeURIComponent(attachmentId)}${suffix}`,
    {
      method: "GET",
    },
  );
}

export function listAutomationRules(): Promise<{ rules: AutomationRuleSummary[] }> {
  return apiFetch<{ rules: AutomationRuleSummary[] }>("/connectors/automation-rules", {
    method: "GET",
  });
}

export function getAutomationRuleLogs(ruleId: number): Promise<AutomationRuleExecutionLog[]> {
  return apiFetch<{ logs: AutomationRuleExecutionLog[] }>(
    `/connectors/automation-rules/${ruleId}/logs`,
    {
      method: "GET",
    },
  ).then((response) => response.logs || []);
}

export function toggleAutomationRule(ruleId: number, isActive: boolean): Promise<{ success?: boolean; rule?: AutomationRuleSummary }> {
  return apiFetch<{ success?: boolean; rule?: AutomationRuleSummary }>(
    `/connectors/automation-rules/${ruleId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    },
  );
}

export async function getAutomationHealth(): Promise<ConnectorHealthResponse> {
  const rulesResult = await listAutomationRules().catch(() => ({ rules: [] as AutomationRuleSummary[] }));
  const gmailStatus = await apiFetch<Record<string, unknown>>("/connectors/status/gmail", {
    method: "GET",
  }).catch(() => ({}));
  const logsByRule = await Promise.all(
    (rulesResult.rules || []).map(async (rule) => ({
      ruleId: rule.id,
      logs: await getAutomationRuleLogs(rule.id).catch(() => [] as AutomationRuleExecutionLog[]),
    })),
  ).catch(() => [] as Array<{ ruleId: number; logs: AutomationRuleExecutionLog[] }>);

  const activeRules = (rulesResult.rules || []).filter((rule) => rule.is_active !== false).length;
  const activeWatch = Boolean((gmailStatus as { watch_active?: unknown }).watch_active);
  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;

  let executedLast24h = 0;
  let failedLast24h = 0;

  for (const entry of logsByRule) {
    for (const log of entry.logs || []) {
      const createdAt = log.created_at ? Date.parse(log.created_at) : NaN;
      if (!Number.isFinite(createdAt) || createdAt < recentCutoff) {
        continue;
      }

      executedLast24h += 1;
      const status = String(log.status || "").toLowerCase();
      if (status === "failed" || status === "error") {
        failedLast24h += 1;
      }
    }
  }

  return {
    status: "ok",
    connector: "gmail",
    active_rules: activeRules,
    users_with_active_watch: activeWatch ? 1 : 0,
    rules_executed_last_24h: executedLast24h,
    rules_failed_last_24h: failedLast24h,
  };
}

// Backward-compatible alias if old components still call this name.
export const planConnectorWorkflow = processWorkflow;
