'use client';

export type ConnectorMode = 'prompt' | 'manual';
export type ConnectorStage = 'prompt' | 'workflow' | 'config' | 'test' | 'publish';
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';
export type TestState = 'idle' | 'running' | 'passed' | 'failed';
export type PublishState = 'draft' | 'ready' | 'live';
export type WatchState = 'idle' | 'starting' | 'active' | 'error';

export interface ConnectorOperation {
  operation_key: string;
  display_name: string;
  description?: string | null;
  mode?: string | null;
  required_fields?: string[];
  parameters?: Record<string, unknown>;
}

export interface ConnectorService {
  service_key: string;
  display_name: string;
  description?: string | null;
  trigger_key?: string | null;
  action_keys?: string[];
  required_fields?: string[];
  operations?: ConnectorOperation[];
}

export interface ConnectorCapability {
  connector_key: string;
  display_name: string;
  auth_type: string;
  adapter: string;
  execution_modes: string[];
  input_schemas: Record<string, unknown>;
  metadata: Record<string, unknown>;
  services: ConnectorService[];
  triggers: ConnectorOperation[];
  actions: ConnectorOperation[];
}

export interface ConnectorRegistryResponse {
  connectors: ConnectorCapability[];
}

export interface ConnectorRef {
  connector_key: string;
  service_key?: string | null;
  trigger_key?: string | null;
  action_key?: string | null;
  display_name?: string | null;
}

export interface MissingField {
  key: string;
  label: string;
  description?: string | null;
  required?: boolean;
  connector_key?: string | null;
  service_key?: string | null;
  operation_key?: string | null;
  step_id?: string | null;
  value?: string | null;
}

export type ConnectorStepType = 'prompt' | 'trigger' | 'condition' | 'action' | 'publish' | 'output';
export type ConnectorStepStatus = 'ready' | 'needs_auth' | 'needs_config' | 'tested' | 'published' | 'warning';

export interface ConnectorWorkflowStep {
  step_id: string;
  connector_key: string;
  service_key?: string | null;
  trigger_key?: string | null;
  action_key?: string | null;
  step_type: ConnectorStepType;
  label: string;
  description?: string | null;
  agent_role?: string | null;
  agent_task?: string | null;
  status?: ConnectorStepStatus | string;
  config?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  missing_fields: Array<MissingField | string>;
}

export interface ConnectorWorkflowDraft {
  workflow_name: string;
  description?: string | null;
  connector_refs: ConnectorRef[];
  steps: ConnectorWorkflowStep[];
  missing_fields: Array<MissingField | string>;
  can_execute: boolean;
  confidence: number;
  notes: string[];
  source_prompt?: string | null;
}

export interface PromptToWorkflowResponse {
  draft: ConnectorWorkflowDraft;
  validation_errors: string[];
  available_connectors: ConnectorCapability[];
  can_execute: boolean;
}

export interface ConnectorInstanceConfiguration {
  connector_key: string;
  service_key?: string | null;
  trigger_key?: string | null;
  action_key?: string | null;
  auth: Record<string, unknown>;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ConnectorInstance {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  connector_type: string;
  connector_key: string | null;
  status: string;
  is_published: boolean;
  configuration: ConnectorInstanceConfiguration;
  last_test_status: string | null;
  last_test_error: string | null;
  last_tested_at: string | null;
  last_published_at: string | null;
  token_usage_total: number;
  token_usage_last: number;
  token_usage_last_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectorInstanceCreate {
  name: string;
  description?: string | null;
  connector_key: string;
  configuration: ConnectorInstanceConfiguration;
}

export interface ConnectorInstanceUpdate {
  name?: string | null;
  description?: string | null;
  configuration?: ConnectorInstanceConfiguration | null;
}

export interface ConnectorExecutionRequest {
  connector_key: string;
  service_key?: string | null;
  trigger_key?: string | null;
  action_key?: string | null;
  trigger_payload?: Record<string, unknown>;
  action_payload?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  trigger_source?: string | null;
}

export interface ConnectorExecutionResult {
  status: 'success' | 'failed';
  connector_key: string;
  service_key?: string | null;
  trigger_key?: string | null;
  action_key?: string | null;
  validation_errors: string[];
  preview: Record<string, unknown> | null;
  execution_result: Record<string, unknown>;
  run?: Record<string, unknown> | null;
  can_execute: boolean;
}

export interface ConnectorTestResult extends ConnectorExecutionResult {
  preview: Record<string, unknown> | null;
}

export interface ConnectorPublishResult {
  status: 'published' | 'draft';
  connector: ConnectorInstance;
}

export interface ConnectorActivityItem {
  id: number | string;
  connector_id?: number;
  title: string;
  status: string;
  source?: string | null;
  trigger_source?: string | null;
  summary?: string | null;
  details?: Record<string, unknown>;
  preview_payload?: Record<string, unknown> | null;
  created_at?: string | null;
  completed_at?: string | null;
  connector_key?: string | null;
  service_key?: string | null;
  trigger_key?: string | null;
  action_key?: string | null;
  raw?: Record<string, unknown>;
}

export interface ConnectorWorkflowRead {
  id: number;
  user_id: number;
  connector_id: number | null;
  name: string;
  prompt: string | null;
  draft: ConnectorWorkflowDraft;
  execution_plan: Record<string, unknown>;
  ui_schema: Record<string, unknown>;
  status: string;
  is_active: boolean;
  last_error: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Backward-compatible aliases for the old email-specific module surface.
export type EmailConnectorRead = ConnectorInstance;
export type EmailConnectorRunRead = ConnectorActivityItem;
export type EmailConnectorTestResult = ConnectorTestResult;
export type EmailConnectorPublishResult = ConnectorPublishResult;
export type EmailConnectorExecutionResult = ConnectorExecutionResult;
export type EmailConnectorInboundStatus = {
  connector_id: number;
  watch_active: boolean;
  inbound_mode: string | null;
  auto_reply_enabled: boolean;
  pubsub_webhook_path: string | null;
  auto_reply_sender_email: string | null;
  auto_reply_instruction: string | null;
  history_id: string | null;
  watch_started_at: string | null;
  watch_expires_at: string | null;
  last_polled_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  retry_count: number;
};
export type InboundEmailEventRead = {
  id: number;
  connector_id: number;
  gmail_message_id: string;
  gmail_thread_id: string | null;
  gmail_history_id: string | null;
  sender_email: string | null;
  sender_name: string | null;
  subject: string | null;
  snippet: string | null;
  received_source: string;
  processing_status: string;
  decision_action: string | null;
  error_message: string | null;
  duplicate_of_event_id: number | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
};
export type InboundProcessingRunRead = {
  id: number;
  connector_id: number;
  inbound_event_id: number;
  mode: string;
  status: string;
  trigger_source: string | null;
  agent1_output: Record<string, unknown> | null;
  agent2_output: Record<string, unknown> | null;
  agent3_output: Record<string, unknown> | null;
  policy_decision: Record<string, unknown> | null;
  request_payload: Record<string, unknown>;
  preview_payload: Record<string, unknown> | null;
  execution_result: Record<string, unknown> | null;
  provider_message_id: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};



// user_input-------------


export type TokenUsage = {
  input: number;
  output: number;
};

export type UploadResult = {
  document_name: string;
  pages_or_sections: number;
  chunk_count: number;
  message: string;
  token_usage: TokenUsage;
};

export type Chunk = {
  chunk_id?: string;
  document_id?: string;
  source_name?: string;
  source: string;
  page: string;
  page_number?: string;
  page_range?: string;
  type?: "text" | "table" | "image";
  content?: string;
  text?: string;
  image_base64?: string;
  image_mime?: string;
  relevance_score?: number;
  confidence_score?: number;
};

export type HighlightRect = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  page_width: number;
  page_height: number;
};

export type HighlightResponse = {
  success: boolean;
  page_number: number;
  rects: HighlightRect[];
  message?: string | null;
};

export type AskResult = {
  answer: string;
  chunks: Chunk[];
  token_usage: TokenUsage;
  verified?: boolean;
  suggested_questions?: string[];
};
