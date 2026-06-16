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

export interface GmailAttachmentFileResponse {
  id?: number;
  filename?: string;
  mime_type?: string | null;
  message_id?: string;
  thread_id?: string | null;
  attachment_id?: string;
  file_size_bytes?: number | null;
  storage_type?: string;
  file_path?: string;
  file_url?: string | null;
  view_url?: string | null;
  download_url?: string | null;
  is_pdf?: boolean;
  stored?: boolean;
}

export interface GmailAttachmentDownloadResponse {
  success: boolean;
  message_id: string;
  attachment_id: string;
  attachment?: Record<string, unknown> | null;
  downloaded?: Record<string, unknown> | null;
  processed?: Record<string, unknown> | null;
  attachment_file?: GmailAttachmentFileResponse | null;
  pdf_attachment?: GmailAttachmentFileResponse | null;
  attachments?: GmailAttachmentFileResponse[];
  pdf_attachments?: GmailAttachmentFileResponse[];
}

export interface ContinueMissingFieldRequest {
  missing_field: string;
  user_answer: string;
  partial_intent: Record<string, unknown>;
}

export interface ContinueMissingFieldResponse {
  status: "automation_rule_created";
  message: string;
  rule_id: number;
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

export type WorkflowStreamEventType =
  | "step_started"
  | "step_completed"
  | "step_failed"
  | "workflow_completed"
  | "missing_field"
  | "error";

export type RawStepEvent = {
  step_number?: number;
  step_id?: string;
  step_name?: string;
  status?: "running" | "completed" | "failed" | string;
  output?: string;
  duration_ms?: number | null;
  error_message?: string | null;
};

export type WorkflowStreamEvent = {
  type?: WorkflowStreamEventType | string;
  step?: RawStepEvent;
  result?: WorkflowResponse;
  error?: string;
};

export type StreamWorkflowHandlers = {
  onEvent?: (event: WorkflowStreamEvent) => void;
  onStepStarted?: (step: StreamStep) => void;
  onStepCompleted?: (step: StreamStep) => void;
  onStepFailed?: (step: StreamStep) => void;
  onMissingField?: (result: WorkflowResponse) => void;
  onCompleted?: (result: WorkflowResponse) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
};

export const API_BASE = API_BASE_URL;

export function getConnectorFileUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return apiUrl(pathOrUrl);
}

export function getPdfViewUrl(file: { view_url?: string | null; file_url?: string | null } | null | undefined): string {
  return getConnectorFileUrl(file?.view_url || file?.file_url || "");
}

export function getPdfDownloadUrl(file: { download_url?: string | null; file_url?: string | null } | null | undefined): string {
  return getConnectorFileUrl(file?.download_url || file?.file_url || "");
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function getStreamWorkflowPath(): string {
  const routes = CONNECTOR_API_ROUTES as Record<string, string | undefined>;
  return routes.streamWorkflow || routes.processWorkflowStream || "/connectors/workflow/run/stream";
}

function mapRawStepToStreamStep(step: RawStepEvent | undefined): StreamStep {
  return {
    step: Number(step?.step_number || 0),
    step_id: String(step?.step_id || step?.step_number || Date.now()),
    name: String(step?.step_name || step?.step_id || "Workflow step"),
    status: String(step?.status || "running"),
    output: String(step?.output || ""),
    duration_ms: step?.duration_ms ?? null,
    error: step?.error_message ?? null,
  };
}

function dispatchStreamEvent(event: WorkflowStreamEvent, handlers: StreamWorkflowHandlers): WorkflowResponse | null {
  handlers.onEvent?.(event);

  const eventType = String(event.type || "");

  if (eventType === "step_started") {
    handlers.onStepStarted?.(mapRawStepToStreamStep({ ...(event.step || {}), status: "running" }));
    return null;
  }

  if (eventType === "step_completed") {
    handlers.onStepCompleted?.(mapRawStepToStreamStep({ ...(event.step || {}), status: "completed" }));
    return null;
  }

  if (eventType === "step_failed") {
    handlers.onStepFailed?.(mapRawStepToStreamStep({ ...(event.step || {}), status: "failed" }));
    return null;
  }

  if (eventType === "missing_field" && event.result) {
    handlers.onMissingField?.(event.result);
    return event.result;
  }

  if (eventType === "workflow_completed") {
    const completedResult: WorkflowResponse = event.result ?? { success: true };
    handlers.onCompleted?.(completedResult);
    return completedResult;
  }

  if (eventType === "error") {
    const message = event.error || "Workflow stream failed.";
    handlers.onError?.(message);
    throw new Error(message);
  }

  return null;
}

function parseSseBlock(block: string): WorkflowStreamEvent | null {
  const dataLines: string[] = [];

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const data = dataLines.join("\n").trim();
  if (!data) return null;

  try {
    return JSON.parse(data) as WorkflowStreamEvent;
  } catch (error) {
    console.error("Invalid workflow SSE event", { data, error });
    return null;
  }
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

export async function streamWorkflow(
  prompt: string,
  handlers: StreamWorkflowHandlers = {},
): Promise<WorkflowResponse> {
  const token = getToken();
  const path = getStreamWorkflowPath();
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt }),
      signal: handlers.signal,
    });
  } catch (error) {
    console.error("Workflow stream network error", { path, apiBase: API_BASE, error });
    throw new Error(`Unable to reach backend stream at ${API_BASE}. Is it running?`);
  }

  if (!response.ok) {
    const message = await response.text();
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      throw new Error("Session expired. Please log in again.");
    }
    throw new Error(message || `Workflow stream failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Backend did not return a readable workflow stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: WorkflowResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const event = parseSseBlock(block);
      if (!event) continue;
      const maybeResult = dispatchStreamEvent(event, handlers);
      if (maybeResult) {
        finalResult = maybeResult;
      }
    }

    if (done) break;
  }

  const trailing = parseSseBlock(buffer);
  if (trailing) {
    const maybeResult = dispatchStreamEvent(trailing, handlers);
    if (maybeResult) {
      finalResult = maybeResult;
    }
  }

  if (!finalResult) {
    // Some operation types (e.g. G8 automation rules, G9 label) return only
    // step events with no result payload. Treat as a successful empty response
    // rather than crashing the UI.
    console.warn("[streamWorkflow] Stream ended without a result payload — returning empty success.");
    return { success: true } as WorkflowResponse;
  }

  return finalResult;
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

export function fetchAttachment(
  messageId: string,
  attachmentId: string,
  filename?: string,
  mimeType?: string,
): Promise<GmailAttachmentDownloadResponse> {
  const query = new URLSearchParams();
  if (filename) {
    query.set("filename", filename);
  }
  if (mimeType) {
    query.set("mime_type", mimeType);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<GmailAttachmentDownloadResponse>(
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
