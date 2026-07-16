import type {
  GeneratedMapConfig,
  GeneratedMapFamily,
  GeneratedMapRecord,
  Module1IntentOutput,
  Module2Output,
  Module31GenerationOutput,
  Module7PlottableEnrichmentPoint,
  RuntimeGeneratedMapOption,
} from '@/components/visualization_agent/types';

export type InteractiveBasemapMode = 'current' | 'road' | 'satellite' | 'dark';

export interface InteractiveAmenityPoint {
  name: string;
  lat: number;
  lon: number;
  category: string;
}

export interface InteractiveCorridorLine {
  type?: string;
  latlngs: [number, number][];
  name?: string | null;
  ref?: string | null;
  layer: 'highways' | 'metro_lines' | 'insight_roads';
  highway?: string | null;
  railway?: string | null;
  width_m?: string | number | null;
  lanes?: string | number | null;
  distance_m?: number | null;
  source?: 'insight_enrichment';
}

export interface InteractiveInsightLayerPoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: string;
  source: 'insight_enrichment';
}

export interface InteractiveMapRuntimeContext {
  city?: string;
  location?: string;
  basemap?: InteractiveBasemapMode;
  selectedAmenities?: string[];
  selectedCorridors?: string[];
}

export interface InteractiveMapMarkerSnapshot {
  id: string;
  entity_type: 'project' | 'location';
  name: string;
  lat: number;
  lon: number;
}

export interface InteractiveMapPlottedSnapshot {
  module31Config?: GeneratedMapConfig | null;
  records?: GeneratedMapRecord[];
  projectMarkers?: InteractiveMapMarkerSnapshot[];
  amenities: InteractiveAmenityPoint[];
  corridors: InteractiveCorridorLine[];
  insightLayers: InteractiveInsightLayerPoint[];
  runtimeContext: InteractiveMapRuntimeContext;
}

export function snapshotInteractiveMarkers(
  markers: Array<{
    id: string;
    entity_type: 'project' | 'location';
    name: string;
    lat: number;
    lon: number;
    raw?: Record<string, unknown>;
  }>,
): InteractiveMapMarkerSnapshot[] {
  return markers.map((marker) => ({
    id: marker.id,
    entity_type: marker.entity_type,
    name: marker.name,
    lat: marker.lat,
    lon: marker.lon,
  }));
}

export function markerSnapshotToInsightRecord(
  marker: InteractiveMapMarkerSnapshot,
): GeneratedMapRecord {
  return {
    id: marker.id,
    lat: marker.lat,
    lng: marker.lon,
    geoLabel: marker.name,
    metricValue: null,
    metricLabel: marker.entity_type === 'project' ? 'Project' : 'Location',
    raw: {
      entity_type: marker.entity_type,
      name: marker.name,
      source: 'interactive_map_marker',
    },
  };
}

export function mergeInteractiveMarkersIntoRecords(
  records: GeneratedMapRecord[] | undefined,
  markers: InteractiveMapMarkerSnapshot[],
): GeneratedMapRecord[] {
  const merged = [...(records || [])];
  const seen = new Set(merged.map((record) => `${record.geoLabel}|${record.lat.toFixed(5)}|${record.lng.toFixed(5)}`));
  for (const marker of markers) {
    const key = `${marker.name}|${marker.lat.toFixed(5)}|${marker.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(markerSnapshotToInsightRecord(marker));
  }
  return merged;
}

export type InteractiveMapViewer = 'interactive-map' | 'interactive-map-3d';

export interface InteractiveMapSoftCache {
  id: string;
  label: string;
  stage: string;
  updatedAt: string;
  viewer: InteractiveMapViewer;
  sessionKey: string;
  plottedSnapshot: InteractiveMapPlottedSnapshot;
}

export type InteractivePlottedDelta = Partial<InteractiveMapPlottedSnapshot>;

function stableCoordinate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(5) : '0';
}

export function amenityStableKey(point: Pick<InteractiveAmenityPoint, 'category' | 'lat' | 'lon'>): string {
  return `amenity:${point.category}:${stableCoordinate(point.lat)}:${stableCoordinate(point.lon)}`;
}

export function corridorStableKey(line: Pick<InteractiveCorridorLine, 'layer' | 'ref' | 'name' | 'latlngs'>): string {
  const ref = line.ref || line.name || line.latlngs.length;
  return `corridor:${line.layer}:${String(ref)}`;
}

export function insightLayerStableKey(point: Pick<InteractiveInsightLayerPoint, 'category' | 'lat' | 'lon'>): string {
  return `insight-osm:${point.category}:${stableCoordinate(point.lat)}:${stableCoordinate(point.lon)}`;
}

export function dedupeAmenities(
  current: InteractiveAmenityPoint[],
  incoming: InteractiveAmenityPoint[],
): InteractiveAmenityPoint[] {
  const merged = new Map<string, InteractiveAmenityPoint>();
  for (const point of [...current, ...incoming]) {
    merged.set(amenityStableKey(point), point);
  }
  return Array.from(merged.values());
}

export function dedupeCorridors(
  current: InteractiveCorridorLine[],
  incoming: InteractiveCorridorLine[],
): InteractiveCorridorLine[] {
  const merged = new Map<string, InteractiveCorridorLine>();
  for (const line of [...current, ...incoming]) {
    merged.set(corridorStableKey(line), line);
  }
  return Array.from(merged.values());
}

export function dedupeInsightLayers(
  current: InteractiveInsightLayerPoint[],
  incoming: InteractiveInsightLayerPoint[],
): InteractiveInsightLayerPoint[] {
  const merged = new Map<string, InteractiveInsightLayerPoint>();
  for (const point of [...current, ...incoming]) {
    merged.set(point.id || insightLayerStableKey(point), point);
  }
  return Array.from(merged.values());
}

export function buildInteractiveSessionKey(
  moduleOutput: Module1IntentOutput | null,
  module2Output: Module2Output | null,
): string | null {
  if (!moduleOutput) return null;
  const cacheKey = (module2Output as unknown as Record<string, unknown> | null)?.cache_key;
  if (typeof cacheKey === 'string' && cacheKey.trim()) {
    return cacheKey.trim();
  }
  if (module2Output) {
    return JSON.stringify(module2Output).slice(0, 64);
  }
  return JSON.stringify(moduleOutput).slice(0, 64);
}

export function buildInteractiveCacheId(viewer: InteractiveMapViewer, sessionKey: string): string {
  const dimension = viewer === 'interactive-map-3d' ? '3d' : '2d';
  return `interactive-map:${dimension}:${sessionKey}`;
}

export function buildInteractiveStage(snapshot: InteractiveMapPlottedSnapshot): string {
  const parts: string[] = [];
  if (snapshot.module31Config || (snapshot.records?.length ?? 0) > 0) {
    parts.push(snapshot.module31Config?.family === '3d' || snapshot.module31Config?.family === '3d-timelapse' ? '3D' : '2D');
  }
  if (snapshot.amenities.length > 0 || snapshot.corridors.length > 0) {
    parts.push('OSM');
  }
  if ((snapshot.insightLayers?.length ?? 0) > 0) {
    parts.push('Insights');
  }
  if (parts.length === 0) {
    return 'Preview';
  }
  return parts.join(' + ');
}

export function buildInteractiveLabel(city: string | undefined, stage: string): string {
  const location = city?.trim() || 'Interactive Map';
  return `Interactive · ${location} · ${stage}`;
}

export function mergeInteractiveSnapshot(
  current: InteractiveMapSoftCache | null,
  delta: InteractivePlottedDelta,
  {
    viewer,
    sessionKey,
    city,
  }: {
    viewer: InteractiveMapViewer;
    sessionKey: string;
    city?: string;
  },
): InteractiveMapSoftCache {
  const previousSnapshot = current?.sessionKey === sessionKey ? current.plottedSnapshot : undefined;
  const baseSnapshot: InteractiveMapPlottedSnapshot = previousSnapshot || {
    amenities: [],
    corridors: [],
    insightLayers: [],
    runtimeContext: {},
  };

  const mergedSnapshot: InteractiveMapPlottedSnapshot = {
    module31Config: delta.module31Config !== undefined ? delta.module31Config : baseSnapshot.module31Config,
    records: delta.records !== undefined ? delta.records : baseSnapshot.records,
    projectMarkers: delta.projectMarkers !== undefined ? delta.projectMarkers : baseSnapshot.projectMarkers,
    amenities: delta.amenities !== undefined ? delta.amenities : baseSnapshot.amenities,
    corridors: delta.corridors !== undefined ? delta.corridors : baseSnapshot.corridors,
    insightLayers: dedupeInsightLayers(baseSnapshot.insightLayers, delta.insightLayers || []),
    runtimeContext: {
      ...baseSnapshot.runtimeContext,
      ...(delta.runtimeContext || {}),
    },
  };

  const stage = buildInteractiveStage(mergedSnapshot);
  const id = buildInteractiveCacheId(viewer, sessionKey);

  return {
    id,
    label: buildInteractiveLabel(city, stage),
    stage,
    updatedAt: new Date().toISOString(),
    viewer,
    sessionKey,
    plottedSnapshot: mergedSnapshot,
  };
}

export function buildPlottedDataFromSoftCache(cache: InteractiveMapSoftCache): Record<string, unknown> {
  const snapshot = cache.plottedSnapshot;
  return {
    source: 'interactive_soft_cache',
    stage: cache.stage,
    viewer: cache.viewer,
    runtime_context: snapshot.runtimeContext,
    module31_config_id: snapshot.module31Config?.id || null,
    renderer: snapshot.module31Config?.renderer || null,
    primary_map_type: snapshot.module31Config?.primaryMapType || null,
    metric_label: snapshot.module31Config?.metricLabel || null,
    time_frames: snapshot.module31Config?.timeFrames || [],
    visual_encoding: snapshot.module31Config?.visualEncoding || null,
    records: mergeInteractiveMarkersIntoRecords(
      snapshot.records || snapshot.module31Config?.records || [],
      snapshot.projectMarkers || [],
    ),
    project_markers: snapshot.projectMarkers || [],
    amenities: snapshot.amenities,
    corridors: snapshot.corridors,
    insight_layers: snapshot.insightLayers,
  };
}

export function buildSlimModule2ForInteractiveInsight(
  module2Output: Module2Output | null | undefined,
): Module2Output | undefined {
  if (!module2Output) return undefined;
  const cacheKey = (module2Output as unknown as Record<string, unknown>).cache_key;
  return {
    status: module2Output.status,
    cache_key: typeof cacheKey === 'string' ? cacheKey : undefined,
    data_quality_summary: module2Output.data_quality_summary,
    map_readiness: module2Output.map_readiness,
  } as Module2Output;
}

export function softCacheToRuntimeOption(
  cache: InteractiveMapSoftCache,
  moduleOutput: Module1IntentOutput | null,
  module2Output: Module2Output | null,
  module31Output?: Module31GenerationOutput | null,
): RuntimeGeneratedMapOption {
  const family: GeneratedMapFamily =
    cache.viewer === 'interactive-map-3d'
      ? cache.plottedSnapshot.module31Config?.family || '3d'
      : cache.plottedSnapshot.module31Config?.family || '2d';

  return {
    id: cache.id,
    label: cache.label,
    title: `Living interactive map snapshot (${cache.stage})`,
    sourceModule: 'interactive',
    family,
    mapType: cache.plottedSnapshot.module31Config?.primaryMapType || cache.viewer,
    stage: cache.stage,
    insightContext: {
      mapId: cache.id,
      mapLabel: cache.label,
      mapFamily: family,
      mapSource: 'interactive',
      plottedData: buildPlottedDataFromSoftCache(cache),
      moduleOutput: moduleOutput || undefined,
      module2Output: buildSlimModule2ForInteractiveInsight(module2Output),
      module31Output: module31Output || cache.plottedSnapshot.module31Config?.module31 || undefined,
    },
  };
}

export function plottableCorridorsToInteractiveCorridors(
  corridors: Array<{
    type?: string;
    layer: 'highways' | 'metro_lines' | 'insight_roads';
    name?: string | null;
    ref?: string | null;
    highway?: string | null;
    width_m?: string | number | null;
    lanes?: string | number | null;
    distance_m?: number | null;
    latlngs: [number, number][];
    source?: 'insight_enrichment';
  }>,
  existingCorridors: InteractiveCorridorLine[],
): InteractiveCorridorLine[] {
  const existingKeys = new Set(existingCorridors.map((line) => corridorStableKey(line)));
  const next: InteractiveCorridorLine[] = [];
  for (const corridor of corridors) {
    if (!Array.isArray(corridor.latlngs) || corridor.latlngs.length < 2) continue;
    const candidate: InteractiveCorridorLine = {
      type: corridor.type || 'insight_road',
      layer: corridor.layer,
      name: corridor.name || undefined,
      ref: corridor.ref || undefined,
      highway: corridor.highway || undefined,
      width_m: corridor.width_m ?? undefined,
      lanes: corridor.lanes ?? undefined,
      distance_m: corridor.distance_m ?? undefined,
      latlngs: corridor.latlngs,
      source: corridor.source || 'insight_enrichment',
    };
    const key = corridorStableKey(candidate);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    next.push(candidate);
  }
  return next;
}

export function plottablePointsToInsightLayers(
  points: Module7PlottableEnrichmentPoint[],
  existingAmenities: InteractiveAmenityPoint[],
  existingInsightLayers: InteractiveInsightLayerPoint[],
): InteractiveInsightLayerPoint[] {
  const existingKeys = new Set([
    ...existingAmenities.map((point) => amenityStableKey(point)),
    ...existingInsightLayers.map((point) => insightLayerStableKey(point)),
  ]);

  const nextLayers: InteractiveInsightLayerPoint[] = [];
  for (const point of points) {
    const candidate = {
      category: point.category,
      lat: point.lat,
      lon: point.lon,
    };
    const key = insightLayerStableKey(candidate);
    if (existingKeys.has(key) || existingKeys.has(amenityStableKey(candidate))) {
      continue;
    }
    existingKeys.add(key);
    nextLayers.push({
      id: key,
      name: point.name,
      lat: point.lat,
      lon: point.lon,
      category: point.category,
      source: 'insight_enrichment',
    });
  }
  return nextLayers;
}
