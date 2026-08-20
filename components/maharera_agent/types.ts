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

export type QueryClarification = {
  message: string;
  suggestedQuery?: string;
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
  run_id?: string;
  challenge_id?: string;
  image?: string;
  expires_in?: number;
  missing_field?: string;
  missing_fields?: string[];
  suggested_query?: string;
  ui?: {
    placement?: string;
    section?: string;
    priority?: string;
  };
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
