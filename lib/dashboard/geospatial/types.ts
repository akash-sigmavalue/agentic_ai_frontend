export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface WorkflowNode {
  id: string;
  type: 'input' | 'default' | 'decision' | 'output' | 'plus';
  data: {
    label: string;
    description?: string;
    owner?: string;
    duration?: string;
    status?: string;
    icon?: string;
    highlighted?: boolean;
  };
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface MarkerData {
  id?: string;
  lat: number;
  lng: number;
  label?: string;
  description?: string;
  address?: string;
  insight?: string;
  context?: string;
}

export type SampleMapMode = 'default' | '2d' | '3d' | '3d-timelapse' | 'visualization' | 'heatmap-timelapse';

export interface ThreeDMapRequest {
  place_name: string;
  radius_m: number;
  use_geocoding: boolean;
  city_for_api?: string | null;
  dry_run: boolean;
  include_debug_logs: boolean;
  fast_mode?: boolean;
  max_buildings?: number;
}

export interface ThreeDMapLocation {
  lat: number;
  lng: number;
  formatted_address: string;
}

export interface ThreeDMapSummary {
  total_excel_buildings: number;
  exact_matches: number;
  snapped_matches: number;
  unmatched: number;
  visible_excel_markers: number;
  overture_building_count: number;
  corrected_buildings: number;
  dry_run_estimated_corrections: number;
}

export interface ThreeDMapMarker {
  lat: number;
  lng: number;
  name: string;
}

export interface ThreeDMapResponse {
  location: ThreeDMapLocation;
  geojson: GeoJSON.FeatureCollection;
  excel_markers: ThreeDMapMarker[];
  warnings: string[];
  debug_logs: string[];
  summary: ThreeDMapSummary;
}

export interface ThreeDMapTimelapseRequest {
  place_name: string;
  radius_m: number;
  use_geocoding: boolean;
  city_for_api?: string | null;
  dry_run: boolean;
  include_debug_logs: boolean;
  fast_mode?: boolean;
  max_buildings?: number;
}

export interface FloorRateCell {
  rate: number | null;
  source: string;
  confidence: number;
  note: string;
}

export interface ThreeDMapTimelapseSummary {
  total_excel_buildings: number;
  exact_matches: number;
  snapped_matches: number;
  unmatched: number;
  visible_excel_markers: number;
  overture_building_count: number;
  time_steps: number;
  global_min_rate: number;
  global_max_rate: number;
  corrected_buildings: number;
  dry_run_estimated_corrections: number;
  fill_summary?: Record<string, number> | null;
}

export interface ThreeDMapTimelapseResponse {
  location: ThreeDMapLocation;
  geojson: GeoJSON.FeatureCollection;
  excel_markers: ThreeDMapMarker[];
  dates: string[];
  warnings: string[];
  debug_logs: string[];
  summary: ThreeDMapTimelapseSummary;
}

export interface SpatialAnalysisRequest {
  user_query: string;
  subject_name: string;
  subject_lat: number | null;
  subject_lon: number | null;
  use_subject: boolean;
}

export interface SpatialAnalysisStats {
  project_count: number;
  road_count: number;
  place_count: number;
  total_cost_usd: number;
}

// Spatial analysis rows are heterogeneous backend payloads consumed dynamically by the map renderer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpatialLooseRecord = Record<string, any>;

export interface SpatialAnalysisResponse {
  projects: SpatialLooseRecord[];
  roads: SpatialLooseRecord[];
  places: SpatialLooseRecord[];
  planner: SpatialLooseRecord;
  execution_summary: SpatialLooseRecord;
  insights: string;
  subject_info: SpatialLooseRecord | null;
  token_log: SpatialLooseRecord[];
  progress_log: string[];
  excel_preview: SpatialLooseRecord[];
  stats: SpatialAnalysisStats;
}

// =========================================================
// Project Rate + Growth Velocity Timelapse
// =========================================================

export interface ProjectRateTimelapseRequest {
  search?: string;
  project_name?: string;
  tower_name?: string;
  property_type?: string;
  unit_configuration?: string;
  sale_type?: string;
  start_month?: string;
  end_month?: string;
}

export interface FloorMonthValue {
  rate_psf: number | null;
  mom_growth_pct: number | null;
  txn_count: number;
  confidence_score: number;
  fallback_level: number;
  is_estimated: boolean;
}

export interface FloorTimelapse {
  floor_index: number;
  monthly_values: Record<string, FloorMonthValue>;
}

export interface BuildingTimelapse {
  project_id: string | null;
  project_name: string;
  tower_name: string | null;
  latitude: number;
  longitude: number;
  floors: FloorTimelapse[];
}

export interface ProjectRateTimelapseResponse {
  type: string;
  map_center: [number, number];
  timeline: string[];
  buildings: BuildingTimelapse[];
  warnings: string[];
  available_projects: string[];
  available_towers: string[];
  global_min_rate: number;
  global_max_rate: number;
}

// =========================================================
// Location Rate Heatmap + Volume Pulse Timelapse
// =========================================================

export interface LocationRateTimelapseRequest {
  search?: string;
  location_name?: string;
  micro_market?: string;
  property_type?: string;
  unit_configuration?: string;
  sale_type?: string;
  start_month?: string;
  end_month?: string;
}

export interface LocationMonthValue {
  median_rate_psf: number | null;
  avg_rate_psf: number | null;
  transaction_volume: number;
  active_project_count: number;
  total_agreement_value: number;
  rate_growth_pct: number | null;
  volume_growth_pct: number | null;
  momentum_score: number | null;
}

export interface LocationTimelapse {
  location_name: string;
  micro_market: string | null;
  latitude: number;
  longitude: number;
  monthly_values: Record<string, LocationMonthValue>;
}

export interface LocationRateTimelapseResponse {
  type: string;
  map_center: [number, number];
  timeline: string[];
  locations: LocationTimelapse[];
  warnings: string[];
  available_locations: string[];
  available_micro_markets: string[];
  global_min_rate: number;
  global_max_rate: number;
}

// =========================================================
// Location Heatmap Timelapse (IDW Interpolation)
// =========================================================

export interface HeatmapTimelapseRequest {
  place_name: string;
  radius_m: number;
  city_for_api?: string | null;
  focus_points?: Array<{ name?: string | null; lat: number; lng: number }>;
  fast_mode?: boolean;
  max_buildings_per_location?: number;
  max_total_buildings?: number;
}

export interface HeatmapHub {
  name: string;
  lat: number;
  lng: number;
  rates: number[];
}

export interface HeatmapSummary {
  global_min_rate: number;
  global_max_rate: number;
  overture_building_count: number;
}

export interface HeatmapTimelapseResponse {
  dates: string[];
  geojson: GeoJSON.FeatureCollection;
  hubs: HeatmapHub[];
  summary: HeatmapSummary;
}

