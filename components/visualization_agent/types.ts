export interface ExecutionPlanStep {
  step_id: number;
  step_name?: string;
  module?: string;
  step_purpose?: string;
  action_type?: string;
  input_required?: string[];
  expected_output?: string;
  depends_on?: number[];
  validation_checks?: string[];
  skip_condition?: string;
  failure_handling?: string;
  status?: string;
}

export interface Module1IntentOutput {
  business_objective?: string;
  map_output_requirements?: Record<string, unknown> & {
    primary_map_type?: string;
  };
  validation_status?: Record<string, unknown> & {
    is_valid?: boolean;
  };
  execution_plan?: ExecutionPlanStep[];
  active_requirement_blocks?: string[];
  required_modules?: string[];
  execution_flags?: Record<string, unknown>;
  intent_mapping?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VisualizationRetrievalResultSet {
  domain?: string;
  title?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  row_count?: number;
}

export interface VisualizationRetrievalClarificationField {
  field: string;
  type?: 'text' | 'textarea' | 'select' | string;
  label?: string;
  placeholder?: string;
  help_text?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface VisualizationRetrievalClarification {
  message?: string;
  questions?: string[];
  clarification_question?: string;
  clarification_type?: string;
  original_query?: string;
  stopped_at_stage?: string;
  next_action?: string;
  fields?: VisualizationRetrievalClarificationField[];
  missing_fields?: string[];
}

export interface VisualizationRetrievalTokenEvent {
  stage?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cumulative_total_tokens?: number;
  cumulative_cost_usd?: number;
}

export interface VisualizationRetrievalState {
  status: 'running' | 'success' | 'error' | 'needs_clarification';
  agentRoute?: string;
  retrievalIntent?: Record<string, unknown>;
  sqlQuery?: string;
  resultSet?: VisualizationRetrievalResultSet;
  clarification?: VisualizationRetrievalClarification;
  tokenEvents: VisualizationRetrievalTokenEvent[];
  metrics?: Record<string, unknown>;
  error?: string;
}

export interface Module2InputsConsidered {
  retrieved_data: boolean;
  data_mapping: boolean;
  module_1_intent: boolean;
  retrieval_model_intent: boolean;
  retrieval_sql_query: boolean;
}

export interface Module2StepSummary {
  step_name: string;
  status: string;
  bullet_points: string[];
}

export interface Module2TokenLedgerEntry {
  call_id: number;
  timestamp: string;
  call_name: string;
  model: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost_usd: number;
  cached_input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
}

export interface Module2Output {
  module_number: number;
  module_name: string;
  status: string;
  next_module_ready: boolean;
  source_type?: string;
  row_limit_applied?: boolean;
  inputs_considered?: Record<string, boolean>;
  processing_time_seconds?: number;
  input_summary?: Record<string, unknown>;
  mapped_fields?: Record<string, string | null>;
  filter_validation?: Record<string, unknown>;
  aggregation_summary?: Record<string, unknown>;
  analysis_ready_dataset?: Record<string, unknown>[];
  visualization_ready_output?: Record<string, unknown>;
  map_readiness?: Record<string, unknown>;
  data_quality_summary?: Record<string, unknown>;
  debug_metadata?: {
    step_log?: Record<string, unknown>[];
    step_summaries?: Module2StepSummary[];
    module_1_requirements_used?: Record<string, unknown>;
    llm_token_ledger?: {
      total_llm_calls: number;
      total_input_tokens: number;
      total_cached_input_tokens: number;
      total_output_tokens: number;
      total_tokens: number;
      total_cost_usd: number;
      ledger: Module2TokenLedgerEntry[];
    };
  };
  missing_required_fields?: unknown;
  missing_metric_logic?: unknown;
  available_columns?: string[];
  available_mapping?: Record<string, string>;
}

export type GeneratedMapFamily =
  | '2d'
  | '3d'
  | '3d-timelapse'
  | 'spatial-analysis'
  | 'heatmap-timelapse';

export interface RuntimeGeneratedMapOption {
  id: string;
  label: string;
  title: string;
  sourceModule: '3.1' | '3';
  family: GeneratedMapFamily;
  mapType?: string;
  insightContext: {
    mapId: string;
    mapLabel: string;
    mapFamily: GeneratedMapFamily;
    mapSource: 'generated';
    plottedData: Record<string, unknown>;
    moduleOutput?: Module1IntentOutput;
    module2Output?: Module2Output;
    module31Output?: Module31GenerationOutput;
  };
}

export type GeneratedMapRenderer =
  | 'marker_map'
  | 'cluster_map'
  | '2d_overlay'
  | '2d_heatmap'
  | 'region_choropleth'
  | 'comparison_map'
  | '3d_building_plotting'
  | '3d_floor_wise'
  | '3d_heatmap'
  | '3d_timelapse'
  | 'proximity_map'
  | 'generic_point_map';

export interface GeneratedMapRecord {
  id: string;
  lat: number;
  lng: number;
  geoLabel: string;
  metricValue: number | null;
  metricLabel: string;
  timeFrame?: string | null;
  raw: Record<string, unknown>;
}

export interface GeneratedMapRuntimeContext {
  center: {
    lat: number;
    lng: number;
  };
  radius: number;
  city: string;
  placeName: string;
  locationLabels: string[];
}

export interface GeneratedMapVisualEncoding {
  colorPalette: string[];
  thresholdStrategy: 'linear' | 'quantile';
  geometryType?: 'point' | 'circle' | 'line' | 'polygon';
  radiusRange: {
    min: number;
    max: number;
  };
  lineWeightRange?: {
    min: number;
    max: number;
  };
  legendLabels?: {
    low?: string;
    mid?: string;
    high?: string;
  };
}

export interface GeneratedMapConfig {
  id: string;
  label: string;
  fullTitle: string;
  family: GeneratedMapFamily;
  renderer: GeneratedMapRenderer;
  primaryMapType: string;
  category: string;
  subtype: string;
  metricLabel: string;
  geoLabelField?: string;
  latitudeField?: string;
  longitudeField?: string;
  metricField?: string;
  timeField?: string;
  timeFrames: string[];
  records: GeneratedMapRecord[];
  runtimeContext: GeneratedMapRuntimeContext;
  visualEncoding?: GeneratedMapVisualEncoding;
  module1Summary: {
    businessObjective?: string;
    primaryMapType?: string;
    requiredModules?: string[];
    timelapseRequired?: boolean;
  };
  module2Summary: {
    status?: string;
    nextModuleReady?: boolean;
    sourceType?: string;
    recordsCount: number;
    mapReady?: boolean;
    needsGeoEnrichment?: boolean;
  };
  module31?: Module31GenerationOutput;
  sourceModule1Intent?: Module1IntentOutput;
  sourceModule2Output?: Module2Output;
  createdAt: string;
}

export interface Module31Readiness {
  isReady: boolean;
  reasons: string[];
  warnings: string[];
}

export interface Module31UsageLedgerEntry {
  call_name: string;
  step?: string;
  provider?: string;
  region?: string;
  endpoint_type?: string;
  model: string;
  api_model?: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost?: number;
  cached_input_cost?: number;
  output_cost?: number;
  total_cost?: number;
  input_cost_usd?: number;
  cached_input_cost_usd?: number;
  output_cost_usd?: number;
  total_cost_usd?: number;
}

export interface Module31Usage {
  total_llm_calls: number;
  total_input_tokens: number;
  total_cached_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  ledger: Module31UsageLedgerEntry[];
}

export interface Module31GenerationOutput {
  module_number: number;
  module_name: string;
  status: string;
  llm_call_count: number;
  processing_time_seconds: number;
  input_summary: Record<string, unknown>;
  planner_output: Record<string, unknown>;
  renderer_output: Record<string, unknown>;
  validator_output: Record<string, unknown>;
  final_renderer_spec: Record<string, unknown>;
  generated_code_artifact: Record<string, unknown>;
  usage: Module31Usage;
  cache_policy: string;
}

export interface Module31GenerationTarget {
  requested_map_family?: GeneratedMapFamily;
  requested_map_type?: string;
}

export type Module3LayerType =
  | 'point_markers'
  | 'solid_heat_circles'
  | 'metric_columns'
  | 'connection_path'
  | 'building_extrusion';

export interface Module3BlueprintLayer {
  id: string;
  type: Module3LayerType;
  label: string;
  visible: boolean;
  encoding: {
    scale: 'linear' | 'quantile';
    size_min: number;
    size_max: number;
    palette: string[];
  };
}

export interface Module3Blueprint {
  title: string;
  purpose: string;
  renderer: 'maplibre_deckgl';
  view_mode: '2d' | '3d';
  layers: Module3BlueprintLayer[];
  controls: Array<'legend' | 'timeline' | 'layer_toggle'>;
  tooltip_fields: string[];
  supporting_panels: Array<'metric_summary' | 'ranked_locations' | 'time_trend'>;
  enrichment: {
    overture_buildings: boolean;
    radius_m: number;
  };
  rationale: string;
}

export interface Module3SceneRecord {
  id: string;
  lat: number;
  lng: number;
  geo_label: string;
  metric_value: number | null;
  time_frame?: string | null;
  source_row: Record<string, unknown>;
}

export interface Module3GenerationOutput {
  module_number: number;
  module_name: string;
  status: string;
  processing_time_seconds: number;
  input_summary: Record<string, unknown>;
  blueprint: Module3Blueprint;
  validation: {
    is_valid: boolean;
    execute_generated_code: boolean;
    warnings?: string[];
    bound_runtime_record_count: number;
  };
  scene_payload: {
    records: Module3SceneRecord[];
    field_mapping: Record<string, string | null>;
    metric_domain: { min: number | null; max: number | null; count: number };
    time_frames: string[];
    center: { lat: number; lng: number };
    bounds: { south: number; north: number; west: number; east: number };
    enrichment: {
      buildings_geojson: Record<string, unknown>;
    };
  };
  enrichment_summary: {
    requested: boolean;
    source?: string | null;
    feature_count: number;
  };
  usage: Module31Usage & {
    context_optimization?: Record<string, unknown>;
  };
  cache_key: string;
  cache_policy: string;
}

export interface Module7LoadedMapData {
  mapId: string;
  mapLabel: string;
  mapFamily: GeneratedMapFamily;
  plottedData: Record<string, unknown>;
}

export interface Module7InsightOutput {
  headline?: string;
  executive_summary?: string;
  key_findings?: Array<{
    title?: string;
    evidence?: string;
    business_implication?: string;
  }>;
  spatial_findings?: Array<{
    title?: string;
    spatial_evidence?: string;
    metric_impact?: string;
    business_implication?: string;
  }>;
  recommended_actions?: string[];
  caveats?: string[];
  [key: string]: unknown;
}

export interface Module7SpatialEnrichment {
  is_enriched: boolean;
  enrichment_source?: string;
  osm_summary?: {
    total_roads: number;
    main_roads: number;
    total_places: number;
  };
  point_count?: number;
  zone_distribution?: Record<string, number>;
}

export interface Module7GenerationOutput {
  module_number: number;
  module_name: string;
  status: string;
  map_id: string;
  map_source: 'generated' | 'default';
  processing_time_seconds: number;
  insight_output: Module7InsightOutput;
  spatial_enrichment?: Module7SpatialEnrichment;
  usage: Module31Usage;
  cache_policy: string;
}
