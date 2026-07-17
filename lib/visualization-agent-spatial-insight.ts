import { apiUrl, API_BASE_URL } from '@/lib/api-client';

const BASE = '/visualization-agent/spatial-insight';

function formatSpatialInsightFetchError(error: unknown): string {
  if (error instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(error.message)) {
    return `Cannot reach the backend at ${API_BASE_URL}. Start agentic_ai_backend with "uvicorn main:app --reload" (port 8000), then reopen Spatial Insight.`;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Unable to start Spatial Insight session.';
}

export interface SpatialInsightState {
  selected_place?: Record<string, unknown> | null;
  map_snapshot_meta?: Record<string, unknown> | null;
  excel_map_markers?: Array<Record<string, unknown>>;
  excel_marker_count?: number;
  excel_marker_file_path?: string | null;
  osm_amenity_count?: number;
  osm_amenity_metadata?: Record<string, unknown>;
  osm_geojson?: GeoJSON.FeatureCollection;
  analysis_image_source?: string | null;
  has_snapshot_image?: boolean;
  has_uploaded_image?: boolean;
  snapshot_image_base64?: string | null;
  uploaded_image_base64?: string | null;
  result_available?: boolean;
  query_answer?: string | null;
  query_gis_result?: Record<string, unknown> | null;
}

export interface SpatialInsightSession {
  session_id: string;
  app_title: string;
  google_maps_browser_api_key: string;
  google_maps_static_configured: boolean;
  osm_configured: boolean;
  bedrock_configured: boolean;
  models: Record<string, string>;
  pipeline_switches: Record<string, unknown>;
  default_map: Record<string, unknown>;
  excel_file_name: string;
  state: SpatialInsightState;
}

export interface SpatialInsightResultSummary {
  analysis_dir?: string;
  feature_count?: number;
  real_estate_point_count?: number;
  osm_feature_count?: number;
  downloads?: Array<{
    label: string;
    file_key: string;
    filename: string;
    mime: string;
    url: string;
  }>;
  previews?: Array<{ label: string; file_key: string; available: boolean }>;
  features?: Array<Record<string, unknown>>;
  real_estate_points?: Array<Record<string, unknown>>;
  osm_features?: Array<Record<string, unknown>>;
  project_spatial_analysis?: Record<string, unknown>;
  token_summary?: Record<string, unknown>;
  token_entries?: Array<Record<string, unknown>>;
}

export interface SpatialInsightActionResponse {
  level: string;
  message: string;
  state: SpatialInsightState;
  result_summary?: SpatialInsightResultSummary;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function createSpatialInsightSession(): Promise<SpatialInsightSession> {
  try {
    const response = await fetch(apiUrl(`${BASE}/session`), { method: 'POST' });
    return parseJson(response);
  } catch (error) {
    throw new Error(formatSpatialInsightFetchError(error));
  }
}

export async function loadSpatialInsightExcel(sessionId: string): Promise<SpatialInsightActionResponse> {
  const response = await fetch(apiUrl(`${BASE}/load-excel`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return parseJson(response);
}

export async function fetchSpatialInsightOsm(
  sessionId: string,
  payload: {
    bounds: { south: number; west: number; north: number; east: number };
    lat?: number;
    lng?: number;
    name?: string;
    address?: string;
  },
): Promise<SpatialInsightActionResponse> {
  const response = await fetch(apiUrl(`${BASE}/fetch-osm`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, ...payload }),
  });
  return parseJson(response);
}

export async function takeSpatialInsightSnapshot(
  sessionId: string,
  payload: {
    lat: number;
    lng: number;
    zoom: number;
    maptype: string;
    name?: string;
    address?: string;
    placeId?: string;
    eventId?: string;
  },
): Promise<SpatialInsightActionResponse> {
  const response = await fetch(apiUrl(`${BASE}/take-snapshot`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, ...payload }),
  });
  return parseJson(response);
}

export async function uploadSpatialInsightImage(
  sessionId: string,
  file: File,
): Promise<SpatialInsightActionResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(apiUrl(`${BASE}/upload-image?session_id=${encodeURIComponent(sessionId)}`), {
    method: 'POST',
    body: formData,
  });
  return parseJson(response);
}

export async function setSpatialInsightImageSource(
  sessionId: string,
  source: string,
): Promise<SpatialInsightActionResponse> {
  const response = await fetch(apiUrl(`${BASE}/set-image-source`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, source }),
  });
  return parseJson(response);
}

export async function generateSpatialInsight(sessionId: string): Promise<SpatialInsightActionResponse> {
  const response = await fetch(apiUrl(`${BASE}/generate`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return parseJson(response);
}

export async function querySpatialInsight(
  sessionId: string,
  query: string,
): Promise<{
  answer: string;
  gis_result: Record<string, unknown>;
  state: SpatialInsightState;
  result_summary: SpatialInsightResultSummary;
}> {
  const response = await fetch(apiUrl(`${BASE}/query`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, query }),
  });
  return parseJson(response);
}

export function spatialInsightDownloadUrl(sessionId: string, fileKey: string): string {
  return apiUrl(`${BASE}/download/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileKey)}`);
}

export async function previewSpatialInsightFile(
  sessionId: string,
  fileKey: string,
): Promise<{ content_type: string; mime: string; payload: unknown }> {
  const response = await fetch(apiUrl(`${BASE}/preview/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileKey)}`));
  return parseJson(response);
}
