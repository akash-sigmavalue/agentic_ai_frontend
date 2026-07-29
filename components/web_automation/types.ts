export type HumanPrompt = {
  id: string;
  kind: string;
  text?: string | null;
  prompt?: string | null;
  message?: string | null;
  timeoutSeconds?: number | null;
  options?: string[] | null;
  destructive?: boolean | null;
  screenshotUrl?: string | null;
  captchaContext?: {
    imageUrl?: string | null;
    description?: string | null;
    alt?: string | null;
  } | null;
};

export type ExtractionResult = {
  data: unknown;
  schema_description?: string | null;
  success?: boolean | null;
  error?: string | null;
};

export type TaskLog = {
  type?: string | null;
  action?: string | null;
  target?: string | null;
  result?: string | null;
  message?: string | null;
};

export type TaskState = {
  task_id?: string | null;
  taskId?: string | null;
  status?: string | null;
  success?: boolean | null;
  error?: string | null;
  current_step?: string | null;
  currentStep?: string | null;
  plan_summary?: string | null;
  planSummary?: string | null;
  logs?: TaskLog[] | null;
  log?: TaskLog[] | null;
  human_prompt?: HumanPrompt | null;
  prompt?: HumanPrompt | null;
  extraction_result?: ExtractionResult | null;
  result?: ExtractionResult | null;
  [key: string]: unknown;
};
