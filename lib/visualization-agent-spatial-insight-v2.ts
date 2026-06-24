import type { GeneratedMapRecord } from '@/components/visualization_agent/types';
import type { InteractiveMapPlottedSnapshot } from '@/lib/visualization-agent-interactive-cache';
import {
  createSpatialInsightSession,
  fetchSpatialInsightOsm,
  type SpatialInsightResultSummary,
  type SpatialInsightState,
} from '@/lib/visualization-agent-spatial-insight';
import { apiUrl } from '@/lib/api-client';

export interface SpatialInsightV2RealEstatePoint {
  name: string;
  lat: number;
  lng: number;
  rate?: string;
  record_id?: string;
  data_source?: string;
}

export interface SpatialInsightV2SnapshotPayload {
  lat: number;
  lng: number;
  zoom: number;
  maptype: 'hybrid' | 'satellite';
  name?: string;
  address?: string;
}

export interface SpatialInsightV2Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface SpatialInsightV2RunRequest {
  sessionId?: string | null;
  realEstatePoints: SpatialInsightV2RealEstatePoint[];
  snapshot: SpatialInsightV2SnapshotPayload;
  bounds: SpatialInsightV2Bounds;
  overlayAmenityCount?: number;
  overlayCorridorCount?: number;
}

export interface SpatialInsightV2RunResponse {
  session_id: string;
  level: string;
  message: string;
  fetch_message?: string;
  state: SpatialInsightState;
  result_summary: SpatialInsightResultSummary;
}

export interface SpatialInsightV2State {
  sessionId: string | null;
  resultSummary: SpatialInsightResultSummary | null;
  state: SpatialInsightState;
  statusMessage: string | null;
  statusLevel: 'info' | 'success' | 'warning' | 'error';
  isRunning: boolean;
  isFetchingOsm: boolean;
  previewKey: string;
  previewContent: { type: string; payload: unknown } | null;
  queryAnswer: string | null;
  queryGisResult: SpatialInsightState['query_gis_result'];
}

export const EMPTY_SPATIAL_INSIGHT_V2_STATE: SpatialInsightV2State = {
  sessionId: null,
  resultSummary: null,
  state: {},
  statusMessage: null,
  statusLevel: 'info',
  isRunning: false,
  isFetchingOsm: false,
  previewKey: '',
  previewContent: null,
  queryAnswer: null,
  queryGisResult: null,
};

const RATE_FIELD_PATTERN = /(rate|price|rent|psf|avg|average|metric|value)/i;

function extractRateFromRaw(raw: Record<string, unknown> | undefined): string {
  if (!raw) return '';
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (RATE_FIELD_PATTERN.test(key)) return String(value);
    }
    if (typeof value === 'string' && value.trim() && RATE_FIELD_PATTERN.test(key)) {
      return value.trim();
    }
  }
  for (const key of ['rate', 'Rate', 'metric_value', 'avg_rate', 'average_rate']) {
    const value = raw[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function recordToRealEstatePoint(record: GeneratedMapRecord): SpatialInsightV2RealEstatePoint | null {
  if (!Number.isFinite(record.lat) || !Number.isFinite(record.lng)) return null;
  const name = String(record.geoLabel || record.raw?.name || record.raw?.Project || 'Location').trim();
  if (!name) return null;
  const rate =
    (record.metricValue != null && Number.isFinite(record.metricValue) ? String(record.metricValue) : '') ||
    extractRateFromRaw(record.raw as Record<string, unknown> | undefined) ||
    String(record.metricLabel || '').trim();
  return {
    name,
    lat: record.lat,
    lng: record.lng,
    rate,
    data_source: 'module_2_plotted_data',
  };
}

export function buildRealEstatePointsFromPlottedSnapshot(
  plotted: InteractiveMapPlottedSnapshot,
): SpatialInsightV2RealEstatePoint[] {
  const seen = new Set<string>();
  const points: SpatialInsightV2RealEstatePoint[] = [];

  for (const record of plotted.records || []) {
    const point = recordToRealEstatePoint(record);
    if (!point) continue;
    const key = `${point.name.toLowerCase()}|${point.lat.toFixed(6)}|${point.lng.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(point);
  }

  for (const marker of plotted.projectMarkers || []) {
    const key = `${marker.name.toLowerCase()}|${marker.lat.toFixed(6)}|${marker.lon.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({
      name: marker.name,
      lat: marker.lat,
      lng: marker.lon,
      rate: extractRateFromRaw(marker as unknown as Record<string, unknown>),
      data_source: 'module_2_plotted_data',
    });
  }

  return points;
}

export function computeBoundsFromPoints(
  points: Array<{ lat: number; lng: number }>,
  fallback: { lat: number; lng: number },
  padding = 0.03,
): SpatialInsightV2Bounds {
  if (points.length === 0) {
    return {
      south: fallback.lat - padding,
      west: fallback.lng - padding,
      north: fallback.lat + padding,
      east: fallback.lng + padding,
    };
  }
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const south = Math.min(...lats) - padding;
  const north = Math.max(...lats) + padding;
  const west = Math.min(...lngs) - padding;
  const east = Math.max(...lngs) + padding;
  return { south, west, north, east };
}

export function computeSnapshotCenter(
  points: Array<{ lat: number; lng: number }>,
  fallback: { lat: number; lng: number },
): { lat: number; lng: number; zoom: number } {
  if (points.length === 0) {
    return { lat: fallback.lat, lng: fallback.lng, zoom: 17 };
  }
  const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
  const latSpan = Math.max(...points.map((p) => p.lat)) - Math.min(...points.map((p) => p.lat));
  const lngSpan = Math.max(...points.map((p) => p.lng)) - Math.min(...points.map((p) => p.lng));
  const span = Math.max(latSpan, lngSpan);
  const zoom = span > 0.25 ? 12 : span > 0.12 ? 13 : span > 0.06 ? 14 : span > 0.03 ? 15 : span > 0.015 ? 16 : 17;
  return { lat, lng, zoom };
}

export function basemapToSnapshotMaptype(basemap: string | undefined): 'hybrid' | 'satellite' {
  return basemap === 'satellite' ? 'satellite' : 'hybrid';
}

export function buildIntegratedRunPayload(
  plotted: InteractiveMapPlottedSnapshot,
  options: {
    locationName?: string;
    fallbackCenter: { lat: number; lng: number };
    sessionId?: string | null;
  },
): SpatialInsightV2RunRequest {
  const realEstatePoints = buildRealEstatePointsFromPlottedSnapshot(plotted);
  const center = computeSnapshotCenter(realEstatePoints, options.fallbackCenter);
  const bounds = computeBoundsFromPoints(realEstatePoints, center);
  return {
    sessionId: options.sessionId,
    realEstatePoints,
    snapshot: {
      lat: center.lat,
      lng: center.lng,
      zoom: center.zoom,
      maptype: basemapToSnapshotMaptype(plotted.runtimeContext.basemap),
      name: options.locationName || plotted.runtimeContext.location || 'Interactive map snapshot area',
      address: plotted.runtimeContext.city || options.locationName || '',
    },
    bounds,
    overlayAmenityCount: plotted.amenities.length,
    overlayCorridorCount: plotted.corridors.length,
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function runIntegratedSpatialInsightV2(
  request: SpatialInsightV2RunRequest,
): Promise<SpatialInsightV2RunResponse> {
  const response = await fetch(apiUrl('/visualization-agent/spatial-insight/integrated/run'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: request.sessionId || undefined,
      real_estate_points: request.realEstatePoints,
      lat: request.snapshot.lat,
      lng: request.snapshot.lng,
      zoom: request.snapshot.zoom,
      maptype: request.snapshot.maptype,
      name: request.snapshot.name,
      address: request.snapshot.address,
      bounds: request.bounds,
      overlay_amenity_count: request.overlayAmenityCount ?? 0,
      overlay_corridor_count: request.overlayCorridorCount ?? 0,
      data_source_label: 'module_2_plotted_data',
    }),
  });
  return parseJson(response);
}

export async function ensureSpatialInsightSession(sessionId?: string | null): Promise<string> {
  if (sessionId) return sessionId;
  const session = await createSpatialInsightSession();
  return session.session_id;
}

export async function fetchExpandedOsmForInteractiveMap(
  sessionId: string,
  payload: {
    bounds: SpatialInsightV2Bounds;
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  },
) {
  return fetchSpatialInsightOsm(sessionId, payload);
}

export async function previewSpatialInsightV2File(sessionId: string, fileKey: string) {
  const response = await fetch(
    apiUrl(`/visualization-agent/spatial-insight/preview/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileKey)}`),
  );
  return parseJson<{ content_type: string; mime: string; payload: unknown }>(response);
}

export function spatialInsightV2DownloadUrl(sessionId: string, fileKey: string): string {
  return apiUrl(`/visualization-agent/spatial-insight/download/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileKey)}`);
}

export async function querySpatialInsightV2(sessionId: string, query: string) {
  const response = await fetch(apiUrl('/visualization-agent/spatial-insight/query'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, query }),
  });
  return parseJson<{
    answer: string;
    gis_result: SpatialInsightState['query_gis_result'];
    state: SpatialInsightState;
    result_summary: SpatialInsightResultSummary;
  }>(response);
}

export function getDefaultPreviewKey(resultSummary: SpatialInsightResultSummary | null): string {
  const previews = resultSummary?.previews || [];
  const preferred = previews.find((item) => item.label.includes('All Structured Spatial Layers'));
  return preferred?.file_key || previews[0]?.file_key || '';
}
