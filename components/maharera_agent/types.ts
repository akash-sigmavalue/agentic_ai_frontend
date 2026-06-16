export type StatusKind = "busy" | "done" | "err" | undefined;

export type DataRow = Record<string, string | number | boolean | null | undefined>;

export type Badge = {
  id: string;
  label: string;
  value: string | number;
  variant?: "url";
};

export type LogEntry = {
  id: string;
  time: string;
  message: string;
  tone?: "error" | "data" | "step";
};

export type BackendConfig = {
  apiBaseUrl: string;
  crawlStreamPath: string;
  planPath: string;
  browserTestPath: string;
};

export type AgentEvent = {
  type?: string;
  message?: string;
  state?: string;
  district?: string;
  confidence?: string;
  portal_url?: string;
  query_understanding?: string;
  step_count?: number;
  steps?: unknown[];
  step?: string | number;
  action?: string;
  description?: string;
  error?: string;
  record_count?: number;
  data?: DataRow[];
  pages?: number;
  steps_executed?: number;
  tokens_used?: number;
  title?: string;
  dropdowns?: number;
  inputs?: number;
  dropdown_details?: unknown[];
};

export type PlanResponse = {
  status?: string;
  message?: string;
  location?: {
    state?: string;
    district?: string;
    confidence?: string;
  };
  portal_url?: string;
  query_understanding?: string;
  step_count?: number;
  tokens_used?: number;
  steps?: unknown[];
};
