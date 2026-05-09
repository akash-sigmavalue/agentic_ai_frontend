"use client";

import type { PromptToWorkflowResponse } from "../../types/api";
import { API_BASE_URL, CONNECTOR_API_ROUTES } from "../../lib/api-client";

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
  status: "automation_rule_created";
  message: string;
  rule_id: number;
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
    response = await fetch(`${API_BASE}${path}`, {
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
): Promise<PromptToWorkflowResponse> {
  return apiFetch<PromptToWorkflowResponse>(CONNECTOR_API_ROUTES.processWorkflow, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function startGoogleOAuth(): Promise<GoogleOAuthStartResponse> {
  return apiFetch<GoogleOAuthStartResponse>(CONNECTOR_API_ROUTES.googleOAuthStart, {
    method: "GET",
  });
}

export function getGmailConnectionStatus(): Promise<GmailConnectionStatusResponse> {
  return apiFetch<GmailConnectionStatusResponse>(CONNECTOR_API_ROUTES.gmailStatus, {
    method: "GET",
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

// Backward-compatible alias if old components still call this name.
export const planConnectorWorkflow = processWorkflow;
