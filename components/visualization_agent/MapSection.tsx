'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  Database,
  Download,
  Layers,
  Lightbulb,
  ListTree,
  Loader2,
  Map as MapIcon,
  PlaySquare,
  Receipt,
  Maximize2,
  Minimize2,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Save,
  Target,
  TrendingUp,
  Trash2,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { StyleSpecification } from 'maplibre-gl';
import type {
  GeneratedMapConfig,
  GeneratedMapFamily,
  GeneratedMapRecord,
  GeneratedMapRenderer,
  GeneratedMapVisualEncoding,
  Module31GenerationOutput,
  Module31GenerationTarget,
  Module3GenerationOutput,
  Module7GenerationOutput,
  Module7LoadedMapData,
  Module1IntentOutput,
  Module2Output,
  RuntimeGeneratedMapOption,
} from './types';
import {
  buildGeneratedMapConfig,
  getModule31Readiness,
} from '@/lib/visualization-agent-module31';
import ThreeDMapView from '@/components/geospatial/maps/ThreeDMapView';
import ThreeDMapTimelapseView from '@/components/geospatial/maps/ThreeDMapTimelapseView';
import SpatialAnalysisView from '@/components/geospatial/maps/SpatialAnalysisView';
import MapOverlayView from '@/components/geospatial/maps/MapOverlayView';
import HeatmapTimelapseView from '@/components/geospatial/maps/timelapse/HeatmapTimelapseView';
import FullMapRenderer from './FullMapRenderer';
import type { RuntimeHeatmapHub } from '@/components/geospatial/maps/timelapse/HeatmapTimelapseView';
import { API_BASE } from '@/lib/dashboard/geospatial/api';
import type { SpatialAnalysisResponse } from '@/lib/dashboard/geospatial/types';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false },
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false },
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false },
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false },
);
const MapResizeInvalidator = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      function ResizeInvalidator() {
        const map = mod.useMap();

        useEffect(() => {
          const container = map.getContainer();
          const target = container.parentElement || container;
          let frame = 0;

          const invalidate = () => {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(() => {
              map.invalidateSize({ animate: false, pan: false });
            });
          };

          invalidate();
          const resizeObserver = new ResizeObserver(invalidate);
          resizeObserver.observe(target);
          window.addEventListener('resize', invalidate);
          const delayed = window.setTimeout(invalidate, 250);

          return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(delayed);
            resizeObserver.disconnect();
            window.removeEventListener('resize', invalidate);
          };
        }, [map]);

        return null;
      }

      return ResizeInvalidator;
    }),
  { ssr: false },
);

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

type ViewerMapCategory = '2d' | '3d' | 'spatial-analysis';
type GeneratedBasemapMode = 'current' | 'road' | 'satellite' | 'dark';

const DEFAULT_MAP_OPTIONS: { value: ViewerMapCategory; label: string }[] = [
  { value: '2d', label: '2D Maps' },
  { value: '3d', label: '3D Maps' },
  { value: 'spatial-analysis', label: 'Spatial Analysis' },
];

const THREE_D_DEFAULT_OPTIONS: { value: GeneratedMapFamily; label: string }[] = [
  { value: '3d', label: 'Default 3D Map' },
  { value: '3d-timelapse', label: 'Default 3D Timelapse' },
  { value: 'heatmap-timelapse', label: 'Default Heatmap Timelapse' },
];

const GENERATED_BASEMAP_OPTIONS: { value: GeneratedBasemapMode; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: 'road', label: 'Road' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'dark', label: 'Dark' },
];

const LEAFLET_BASEMAP_OPTIONS: Record<GeneratedBasemapMode, { url: string; attribution: string }> = {
  current: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
  road: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
};

const MAPLIBRE_STYLE_BY_BASEMAP: Record<GeneratedBasemapMode, string | StyleSpecification> = {
  current: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  road: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  satellite: {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      },
    },
    layers: [{ id: 'satellite-base', type: 'raster', source: 'satellite' }],
  } as StyleSpecification,
};

const FAMILY_LABEL: Record<GeneratedMapFamily, string> = {
  '2d': '2D Maps',
  '3d': '3D Maps',
  '3d-timelapse': '3D Map - Timelapse',
  'spatial-analysis': 'Spatial Analysis',
  'heatmap-timelapse': 'Heatmap - Timelapse',
};

const FAMILY_ACTION_LABEL: Record<GeneratedMapFamily, string> = {
  '2d': '2D Map',
  '3d': '3D Map',
  '3d-timelapse': '3D Timelapse',
  'spatial-analysis': 'Spatial Analysis',
  'heatmap-timelapse': 'Heatmap Timelapse',
};

const SAMPLE_OPTION_VALUE = 'sample';
const SHOW_VISUALIZATION_DEFAULT_MAPS = false;
const GENERATED_FAMILIES = new Set<GeneratedMapFamily>([
  '2d',
  '3d',
  '3d-timelapse',
  'spatial-analysis',
  'heatmap-timelapse',
]);
const GENERATED_RENDERERS = new Set<GeneratedMapRenderer>([
  'marker_map',
  'cluster_map',
  '2d_overlay',
  '2d_heatmap',
  'region_choropleth',
  'comparison_map',
  '3d_building_plotting',
  '3d_floor_wise',
  '3d_heatmap',
  '3d_timelapse',
  'proximity_map',
  'generic_point_map',
]);

interface FullGeneratedMapEntry {
  runtimeKey: string;
  output: Module3GenerationOutput;
  module1: Module1IntentOutput;
  module2: Module2Output;
}

interface StoredRuntimeMap {
  id: string;
  sourceModule: '3.1' | '3';
  savedAt: string;
  generatedMap?: GeneratedMapConfig;
  fullMap?: FullGeneratedMapEntry;
}

const RUNTIME_MAP_DATABASE = 'visualization-agent-saved-maps';
const RUNTIME_MAP_STORE = 'runtime-maps';
const RUNTIME_MAP_DATABASE_VERSION = 1;

function openRuntimeMapDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('Local browser storage is unavailable.'));
      return;
    }

    const request = window.indexedDB.open(RUNTIME_MAP_DATABASE, RUNTIME_MAP_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RUNTIME_MAP_STORE)) {
        database.createObjectStore(RUNTIME_MAP_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open local map storage.'));
  });
}

async function readSavedRuntimeMaps(): Promise<StoredRuntimeMap[]> {
  const database = await openRuntimeMapDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RUNTIME_MAP_STORE, 'readonly');
    const request = transaction.objectStore(RUNTIME_MAP_STORE).getAll();
    request.onsuccess = () => resolve(request.result as StoredRuntimeMap[]);
    request.onerror = () => reject(request.error || new Error('Unable to read saved maps.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Unable to read saved maps.'));
    };
  });
}

async function writeSavedRuntimeMap(map: StoredRuntimeMap): Promise<void> {
  const database = await openRuntimeMapDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RUNTIME_MAP_STORE, 'readwrite');
    transaction.objectStore(RUNTIME_MAP_STORE).put(map);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Unable to save generated map locally.'));
    };
  });
}

async function deleteSavedRuntimeMap(id: string): Promise<void> {
  const database = await openRuntimeMapDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RUNTIME_MAP_STORE, 'readwrite');
    transaction.objectStore(RUNTIME_MAP_STORE).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Unable to delete saved map.'));
    };
  });
}

const RENDERER_FAMILY_OVERRIDES: Partial<Record<GeneratedMapRenderer, GeneratedMapFamily>> = {
  marker_map: '2d',
  cluster_map: '2d',
  '2d_overlay': '2d',
  '2d_heatmap': '2d',
  region_choropleth: '2d',
  comparison_map: '2d',
  proximity_map: 'spatial-analysis',
  '3d_building_plotting': '3d',
  '3d_floor_wise': '3d',
  '3d_timelapse': '3d-timelapse',
};

const DEFAULT_VISUAL_ENCODING: GeneratedMapVisualEncoding = {
  colorPalette: ['#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#f97316', '#dc2626'],
  thresholdStrategy: 'linear',
  geometryType: 'point',
  radiusRange: { min: 7, max: 20 },
  lineWeightRange: { min: 3, max: 10 },
  legendLabels: {
    low: 'Low',
    mid: 'Medium',
    high: 'High',
  },
};

async function requestModule31Generation(
  moduleOutput: Module1IntentOutput,
  module2Output: Module2Output,
  target?: Module31GenerationTarget,
): Promise<Module31GenerationOutput> {
  const response = await fetch(`${API_BASE}/visualization-agent/module31/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      module_1_intent_json: moduleOutput,
      module_2_output_json: module2Output,
      requested_map_family: target?.requested_map_family,
      requested_map_type: target?.requested_map_type,
    }),
  });

  if (!response.ok) {
    let message = await response.text();
    try {
      const parsed = JSON.parse(message);
      message = parsed?.detail || message;
    } catch {
      // Keep raw response text.
    }
    throw new Error(message || `Module 3.1 failed with status ${response.status}`);
  }

  return response.json();
}

async function requestRuntimeSpatialAnalysis(
  config: GeneratedMapConfig,
  payload: {
    userQuery: string;
    subjectName: string;
    subjectLat: number | null;
    subjectLon: number | null;
    useSubject: boolean;
    radiusM: number;
  },
): Promise<SpatialAnalysisResponse> {
  const response = await fetch(`${API_BASE}/visualization-agent/module31/spatial-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_query: payload.userQuery,
      subject_name: payload.subjectName,
      subject_lat: payload.subjectLat,
      subject_lon: payload.subjectLon,
      use_subject: payload.useSubject,
      radius_m: payload.radiusM,
      records_json: config.records,
      module_1_intent_json: config.sourceModule1Intent,
      module_2_output_json: config.sourceModule2Output,
    }),
  });

  if (!response.ok) {
    let message = await response.text();
    try {
      const parsed = JSON.parse(message);
      message = parsed?.detail || message;
    } catch {
      // Keep raw response text.
    }
    throw new Error(message || `Runtime spatial analysis failed with status ${response.status}`);
  }

  return response.json();
}

function getIntentMapFamily(moduleOutput: Module1IntentOutput | null): GeneratedMapFamily {
  const mapReq = moduleOutput?.map_output_requirements || {};
  const primaryMapType = String(mapReq.primary_map_type || '').toLowerCase();
  const spatialActive = Boolean(
    (moduleOutput?.spatial_requirements as Record<string, unknown> | undefined)?.is_active,
  );
  if (primaryMapType === '3d_timelapse') return '3d-timelapse';
  if (primaryMapType === 'proximity_map' || spatialActive) return 'spatial-analysis';
  if (primaryMapType === '3d_heatmap' && mapReq.timelapse_required) return 'heatmap-timelapse';
  if (['3d_heatmap', '3d_building_plotting', '3d_floor_wise'].includes(primaryMapType)) return '3d';
  return '2d';
}

function getMapTypeForFamily(
  family: GeneratedMapFamily,
  moduleOutput: Module1IntentOutput | null,
): string {
  const mapReq = moduleOutput?.map_output_requirements || {};
  const primaryMapType = String(mapReq.primary_map_type || '').toLowerCase();
  const intentFamily = getIntentMapFamily(moduleOutput);
  if (family === intentFamily && primaryMapType) return primaryMapType;
  if (family === '2d') return primaryMapType.startsWith('2d_') || ['marker_map', 'cluster_map', 'region_choropleth', 'comparison_map'].includes(primaryMapType)
    ? primaryMapType
    : '2d_heatmap';
  if (family === '3d') return ['3d_heatmap', '3d_building_plotting', '3d_floor_wise'].includes(primaryMapType)
    ? primaryMapType
    : '3d_heatmap';
  if (family === '3d-timelapse') return '3d_timelapse';
  if (family === 'spatial-analysis') return 'proximity_map';
  return '3d_heatmap';
}

function getAutomatic3DMapType(moduleOutput: Module1IntentOutput | null, module2Output: Module2Output | null): string {
  const mapReq = moduleOutput?.map_output_requirements || {};
  const primaryMapType = String(mapReq.primary_map_type || '').toLowerCase();
  const metricText = [
    mapReq.base_map_metric,
    mapReq.intensity_metric,
    module2Output?.aggregation_summary?.metric_name,
  ].map((value) => String(value || '').toLowerCase()).join(' ');
  const heatmapLike = primaryMapType.includes('heatmap') || metricText.includes('density');
  const hasTimeline = Boolean(mapReq.timelapse_required)
    || Boolean(module2Output?.map_readiness?.time_field)
    || (Array.isArray(module2Output?.visualization_ready_output?.records)
      && new Set(
        module2Output.visualization_ready_output.records
          .map((record) => String((record as Record<string, unknown>).timelapse_frame || (record as Record<string, unknown>).time_period || ''))
          .filter(Boolean),
      ).size > 1);
  if (primaryMapType === '3d_floor_wise') return '3d_floor_wise';
  if (primaryMapType === '3d_timelapse') return '3d_timelapse';
  if (primaryMapType === '3d_heatmap' && hasTimeline) return '3d_heatmap';
  if (hasTimeline && heatmapLike) return '3d_heatmap';
  if (hasTimeline) return '3d_timelapse';
  return ['3d_heatmap', '3d_building_plotting', '3d_floor_wise'].includes(primaryMapType)
    ? primaryMapType
    : '3d_heatmap';
}

function isMapInViewerCategory(map: GeneratedMapConfig, category: ViewerMapCategory): boolean {
  if (category === '3d') return ['3d', '3d-timelapse', 'heatmap-timelapse'].includes(map.family);
  return map.family === category;
}

async function requestModule3Generation(
  moduleOutput: Module1IntentOutput,
  module2Output: Module2Output,
): Promise<Module3GenerationOutput> {
  const response = await fetch(`${API_BASE}/visualization-agent/module3/generate-full-map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      module_1_intent_json: moduleOutput,
      module_2_output_json: module2Output,
    }),
  });

  if (!response.ok) {
    let message = await response.text();
    try {
      const parsed = JSON.parse(message);
      message = parsed?.detail || message;
    } catch {
      // Keep raw response text.
    }
    throw new Error(message || `Module 3 failed with status ${response.status}`);
  }

  return response.json();
}

async function requestModule7Insights({
  mapId,
  mapLabel,
  mapFamily,
  mapSource,
  plottedData,
  moduleOutput,
  module2Output,
  module31Output,
}: {
  mapId: string;
  mapLabel: string;
  mapFamily: GeneratedMapFamily;
  mapSource: 'generated' | 'default';
  plottedData: Record<string, unknown>;
  moduleOutput?: Module1IntentOutput | null;
  module2Output?: Module2Output | null;
  module31Output?: Module31GenerationOutput;
}): Promise<Module7GenerationOutput> {
  const response = await fetch(`${API_BASE}/visualization-agent/module7/generate-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      map_id: mapId,
      map_label: mapLabel,
      map_family: mapFamily,
      map_source: mapSource,
      plotted_data_json: plottedData,
      module_1_intent_json: mapSource === 'generated' ? moduleOutput : undefined,
      module_2_output_json: mapSource === 'generated' ? module2Output : undefined,
      module_31_output_json: mapSource === 'generated' ? module31Output : undefined,
    }),
  });

  if (!response.ok) {
    let message = await response.text();
    try {
      const parsed = JSON.parse(message);
      message = parsed?.detail || message;
    } catch {
      // Keep raw response text.
    }
    throw new Error(message || `Module 7 failed with status ${response.status}`);
  }

  return response.json();
}

function applyModule31Output(
  config: GeneratedMapConfig,
  module31: Module31GenerationOutput,
): GeneratedMapConfig {
  const spec = module31.final_renderer_spec || {};
  const renderer = String(spec.renderer || '');
  const specFamily = String(spec.family || '');
  const safeRenderer = GENERATED_RENDERERS.has(renderer as GeneratedMapRenderer)
    ? (renderer as GeneratedMapRenderer)
    : config.renderer;
  const familyOverride = RENDERER_FAMILY_OVERRIDES[safeRenderer];
  const llmFamily =
    safeRenderer === '3d_heatmap' && config.module1Summary.timelapseRequired
      ? 'heatmap-timelapse'
      : safeRenderer === '3d_heatmap'
        ? '3d'
      : config.family === 'spatial-analysis' && specFamily !== 'spatial-analysis'
        ? 'spatial-analysis'
        : specFamily;
  const safeFamily = familyOverride || llmFamily;

  return {
    ...config,
    family: GENERATED_FAMILIES.has(safeFamily as GeneratedMapFamily)
      ? (safeFamily as GeneratedMapFamily)
      : config.family,
    renderer: safeRenderer,
    primaryMapType: safeRenderer || config.primaryMapType,
    category: 'LLM Generated Visualizations',
    subtype: String(spec.base_component || spec.template_key || 'Generated Visualizations'),
    visualEncoding: normalizeVisualEncoding(spec.visual_encoding, config.visualEncoding),
    module31,
  };
}

function normalizeVisualEncoding(
  raw: unknown,
  fallback?: GeneratedMapVisualEncoding,
): GeneratedMapVisualEncoding {
  const base = fallback || DEFAULT_VISUAL_ENCODING;
  if (!raw || typeof raw !== 'object') return base;
  const spec = raw as Record<string, unknown>;
  const paletteSource = spec.color_palette || spec.palette || spec.colors;
  const palette = Array.isArray(paletteSource)
    ? paletteSource
        .map((color) => String(color))
        .filter((color) => /^#[0-9a-f]{6}$/i.test(color))
        .slice(0, 7)
    : [];
  const threshold = String(spec.threshold_strategy || spec.thresholdStrategy || '').toLowerCase();
  const geometry = String(spec.geometry_type || spec.geometryType || spec.geometry || '').toLowerCase();
  const radius = (spec.radius_range || spec.marker_radius || {}) as Record<string, unknown>;
  const lineWeight = (spec.line_weight_range || spec.lineWeightRange || spec.stroke_weight || {}) as Record<string, unknown>;
  const minRadius = Number(radius.min ?? spec.min_radius);
  const maxRadius = Number(radius.max ?? spec.max_radius);
  const minLineWeight = Number(lineWeight.min ?? spec.min_line_weight);
  const maxLineWeight = Number(lineWeight.max ?? spec.max_line_weight);
  const legend = (spec.legend_labels || spec.legendLabels || {}) as Record<string, unknown>;

  return {
    colorPalette: palette.length >= 2 ? palette : base.colorPalette,
    thresholdStrategy: threshold === 'quantile' ? 'quantile' : 'linear',
    geometryType: ['point', 'circle', 'line', 'polygon'].includes(geometry)
      ? (geometry as GeneratedMapVisualEncoding['geometryType'])
      : base.geometryType,
    radiusRange: {
      min: Number.isFinite(minRadius) ? Math.max(3, Math.min(24, minRadius)) : base.radiusRange.min,
      max: Number.isFinite(maxRadius) ? Math.max(6, Math.min(36, maxRadius)) : base.radiusRange.max,
    },
    lineWeightRange: {
      min: Number.isFinite(minLineWeight)
        ? Math.max(1, Math.min(12, minLineWeight))
        : base.lineWeightRange?.min || DEFAULT_VISUAL_ENCODING.lineWeightRange?.min || 3,
      max: Number.isFinite(maxLineWeight)
        ? Math.max(2, Math.min(20, maxLineWeight))
        : base.lineWeightRange?.max || DEFAULT_VISUAL_ENCODING.lineWeightRange?.max || 10,
    },
    legendLabels: {
      low: typeof legend.low === 'string' ? legend.low : base.legendLabels?.low,
      mid: typeof legend.mid === 'string' ? legend.mid : base.legendLabels?.mid,
      high: typeof legend.high === 'string' ? legend.high : base.legendLabels?.high,
    },
  };
}

function AnimatedDots() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    const dots = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      r: Math.random() * 2.5 + 1.5,
    }));

    let raf = 0;

    const draw = () => {
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(108,99,255,0.07)';
      ctx.lineWidth = 1;

      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      dots.forEach((dot) => {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > 1) dot.vx *= -1;
        if (dot.y < 0 || dot.y > 1) dot.vy *= -1;
      });

      for (let i = 0; i < dots.length; i += 1) {
        for (let j = i + 1; j < dots.length; j += 1) {
          const dx = (dots[i].x - dots[j].x) * W;
          const dy = (dots[i].y - dots[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.strokeStyle = `rgba(108,99,255,${0.18 * (1 - dist / 100)})`;
            ctx.beginPath();
            ctx.moveTo(dots[i].x * W, dots[i].y * H);
            ctx.lineTo(dots[j].x * W, dots[j].y * H);
            ctx.stroke();
          }
        }
      }

      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x * W, dot.y * H, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139,132,255,0.55)';
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

interface MapSectionProps {
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  moduleOutput?: Module1IntentOutput | null;
  module2Output?: Module2Output | null;
  onRuntimeGeneratedMapsChange?: (maps: RuntimeGeneratedMapOption[]) => void;
}

function getRecordCenter(records: GeneratedMapRecord[]): [number, number] {
  if (records.length === 0) return DEFAULT_CENTER;
  const lat = records.reduce((sum, record) => sum + record.lat, 0) / records.length;
  const lng = records.reduce((sum, record) => sum + record.lng, 0) / records.length;
  return [lat, lng];
}

function getMetricStats(records: GeneratedMapRecord[]) {
  const values = records
    .map((record) => record.metricValue)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (values.length === 0) return { min: 0, max: 1, values: [] as number[] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max: max === min ? min + 1 : max, values: [...values].sort((a, b) => a - b) };
}

function hexToRgb(color: string): [number, number, number] | null {
  const match = color.match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function interpolateColor(palette: string[], t: number): string {
  if (palette.length === 0) return DEFAULT_VISUAL_ENCODING.colorPalette[0];
  if (palette.length === 1) return palette[0];
  const scaled = Math.max(0, Math.min(1, t)) * (palette.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(palette.length - 1, lowerIndex + 1);
  const localT = scaled - lowerIndex;
  const lower = hexToRgb(palette[lowerIndex]);
  const upper = hexToRgb(palette[upperIndex]);
  if (!lower || !upper) return palette[lowerIndex] || palette[0];
  const rgb = lower.map((channel, index) => Math.round(channel + (upper[index] - channel) * localT));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function getMetricColor(
  value: number | null,
  stats: ReturnType<typeof getMetricStats>,
  encoding?: GeneratedMapVisualEncoding,
): string {
  if (value == null || !Number.isFinite(value)) return '#2563eb';
  const palette = encoding?.colorPalette?.length ? encoding.colorPalette : DEFAULT_VISUAL_ENCODING.colorPalette;
  const t = Math.max(0, Math.min(1, (value - stats.min) / (stats.max - stats.min || 1)));
  const rank =
    encoding?.thresholdStrategy === 'quantile' && stats.values.length > 1
      ? stats.values.filter((candidate) => candidate <= value).length / stats.values.length
      : t;
  if (encoding?.thresholdStrategy !== 'quantile') {
    return interpolateColor(palette, rank);
  }
  const index = Math.min(palette.length - 1, Math.floor(rank * palette.length));
  return palette[index] || palette[palette.length - 1] || DEFAULT_VISUAL_ENCODING.colorPalette[0];
}

function getMetricRadius(
  value: number | null,
  stats: ReturnType<typeof getMetricStats>,
  encoding?: GeneratedMapVisualEncoding,
): number {
  const range = encoding?.radiusRange || DEFAULT_VISUAL_ENCODING.radiusRange;
  if (value == null || !Number.isFinite(value)) return range.min;
  const t = Math.max(0, Math.min(1, (value - stats.min) / (stats.max - stats.min || 1)));
  return range.min + t * (range.max - range.min);
}

function getMetricWeight(
  value: number | null,
  stats: ReturnType<typeof getMetricStats>,
  encoding?: GeneratedMapVisualEncoding,
): number {
  const range = encoding?.lineWeightRange || DEFAULT_VISUAL_ENCODING.lineWeightRange || { min: 3, max: 10 };
  if (value == null || !Number.isFinite(value)) return range.min;
  const t = Math.max(0, Math.min(1, (value - stats.min) / (stats.max - stats.min || 1)));
  return range.min + t * (range.max - range.min);
}

function hasMetricValues(records: GeneratedMapRecord[]): boolean {
  return records.some((record) => typeof record.metricValue === 'number' && Number.isFinite(record.metricValue));
}

function getRawValue(record: GeneratedMapRecord, keys: string[]): unknown {
  const sources: Record<string, unknown>[] = [record.raw];
  const rawFields = record.raw?.raw_fields;
  if (rawFields && typeof rawFields === 'object') sources.push(rawFields as Record<string, unknown>);
  const tooltipData = record.raw?.tooltip_data;
  const tooltipFields =
    tooltipData && typeof tooltipData === 'object'
      ? (tooltipData as Record<string, unknown>).fields
      : null;
  if (tooltipFields && typeof tooltipFields === 'object') sources.push(tooltipFields as Record<string, unknown>);

  for (const key of keys) {
    const normalizedKey = key.toLowerCase();
    for (const source of sources) {
      if (source[key] !== null && source[key] !== undefined && String(source[key]).trim()) return source[key];
      const matchedKey = Object.keys(source).find((candidate) => candidate.toLowerCase() === normalizedKey);
      if (matchedKey && source[matchedKey] !== null && source[matchedKey] !== undefined && String(source[matchedKey]).trim()) {
        return source[matchedKey];
      }
    }
  }
  return undefined;
}

function getRawString(record: GeneratedMapRecord, keys: string[]): string {
  const value = getRawValue(record, keys);
  return value !== null && value !== undefined && String(value).trim() ? String(value).trim() : '';
}

function getRecordCategory(record: GeneratedMapRecord): string {
  return (
    getRawString(record, [
      'category',
      'category_name',
      'type',
      'layer',
      'layer_name',
      'amenity_type',
      'amenity_category',
      'property_type',
      'segment',
      'class',
    ]) || record.geoLabel
  );
}

function getCategoryColor(category: string, palette: string[]): string {
  if (!category) return palette[0] || DEFAULT_VISUAL_ENCODING.colorPalette[0];
  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length] || DEFAULT_VISUAL_ENCODING.colorPalette[0];
}

function getGeneratedGeometryType(config: GeneratedMapConfig): NonNullable<GeneratedMapVisualEncoding['geometryType']> {
  const spec = config.module31?.final_renderer_spec || {};
  const layers = Array.isArray(spec.layers) ? spec.layers : [];
  const layerGeometry = layers
    .map((layer) => (layer && typeof layer === 'object' ? String((layer as Record<string, unknown>).geometry || '') : ''))
    .find(Boolean);
  const rawGeometry = String(
    config.visualEncoding?.geometryType ||
      spec.geometry_type ||
      spec.geometryType ||
      spec.geometry ||
      layerGeometry ||
      '',
  ).toLowerCase();
  if (['point', 'circle', 'line', 'polygon'].includes(rawGeometry)) {
    return rawGeometry as NonNullable<GeneratedMapVisualEncoding['geometryType']>;
  }
  const objective = `${config.fullTitle} ${config.label} ${config.primaryMapType}`.toLowerCase();
  if (config.renderer === 'region_choropleth') return 'polygon';
  if (config.renderer === '2d_overlay' && /(road|metro|highway|corridor|route|line)/i.test(objective)) return 'line';
  if (config.renderer === '2d_overlay' && /(catchment|radius|buffer|vicinity|nearby)/i.test(objective)) return 'circle';
  return 'point';
}

function buildClusterRecords(records: GeneratedMapRecord[]) {
  const groups = new Map<
    string,
    {
      id: string;
      latSum: number;
      lngSum: number;
      count: number;
      metricSum: number;
      metricCount: number;
      records: GeneratedMapRecord[];
    }
  >();

  records.forEach((record) => {
    const key = `${record.lat.toFixed(2)}-${record.lng.toFixed(2)}`;
    const existing =
      groups.get(key) ||
      {
        id: key,
        latSum: 0,
        lngSum: 0,
        count: 0,
        metricSum: 0,
        metricCount: 0,
        records: [],
      };
    existing.latSum += record.lat;
    existing.lngSum += record.lng;
    existing.count += 1;
    existing.records.push(record);
    if (typeof record.metricValue === 'number' && Number.isFinite(record.metricValue)) {
      existing.metricSum += record.metricValue;
      existing.metricCount += 1;
    }
    groups.set(key, existing);
  });

  return Array.from(groups.values()).map((group) => ({
    id: group.id,
    lat: group.latSum / group.count,
    lng: group.lngSum / group.count,
    count: group.count,
    metricValue: group.metricCount > 0 ? group.metricSum : group.count,
    sample: group.records[0],
    records: group.records,
  }));
}

function groupRecordsForLines(records: GeneratedMapRecord[]) {
  const groups = new Map<string, GeneratedMapRecord[]>();
  records.forEach((record) => {
    const key = getRawString(record, ['line_id', 'route_id', 'road_name', 'corridor_name', 'segment', 'category']) || record.geoLabel;
    groups.set(key, [...(groups.get(key) || []), record]);
  });
  return Array.from(groups.entries()).filter(([, group]) => group.length > 1);
}

function buildRuntimeHeatmapInputs(config: GeneratedMapConfig) {
  const dates =
    config.timeFrames.length > 0
      ? config.timeFrames
      : Array.from(new Set(config.records.map((record) => record.timeFrame || 'Current')));
  const safeDates = dates.length > 0 ? dates : ['Current'];
  const groups = new Map<string, RuntimeHeatmapHub>();
  const accumulators = new Map<string, { sums: number[]; counts: number[] }>();

  config.records.forEach((record) => {
    const key = `${record.geoLabel}-${record.lat.toFixed(6)}-${record.lng.toFixed(6)}`;
    const existing =
      groups.get(key) ||
      ({
        id: key,
        name: record.geoLabel,
        lat: record.lat,
        lng: record.lng,
        rates: Array.from({ length: safeDates.length }, () => 0),
        rawByFrame: {},
      } satisfies RuntimeHeatmapHub);
    const frame = record.timeFrame || safeDates[0];
    const dateIndex = Math.max(0, safeDates.indexOf(frame));
    const accumulator =
      accumulators.get(key) ||
      {
        sums: Array.from({ length: safeDates.length }, () => 0),
        counts: Array.from({ length: safeDates.length }, () => 0),
      };
    if (record.metricValue != null && Number.isFinite(record.metricValue)) {
      accumulator.sums[dateIndex] += record.metricValue;
      accumulator.counts[dateIndex] += 1;
      existing.rates[dateIndex] = accumulator.sums[dateIndex] / accumulator.counts[dateIndex];
    }
    existing.rawByFrame[frame] = {
      ...record.raw,
      module31_aggregated_records: accumulator.counts[dateIndex],
    };
    groups.set(key, existing);
    accumulators.set(key, accumulator);
  });

  const hubs = Array.from(groups.values()).filter((hub) =>
    hub.rates.some((value) => Number.isFinite(value) && value > 0),
  );
  const fallbackFocusPoints = Array.from(
    new Map(
      config.records.map((record) => [
        `${record.geoLabel}-${record.lat.toFixed(6)}-${record.lng.toFixed(6)}`,
        { name: record.geoLabel, lat: record.lat, lng: record.lng },
      ]),
    ).values(),
  );
  const focusPoints = (hubs.length > 0 ? hubs : fallbackFocusPoints)
    .map((point) => ({ name: point.name, lat: point.lat, lng: point.lng }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .slice(0, 8);
  const radius = Math.max(250, Math.min(450, config.runtimeContext.radius || 350));
  const city = config.runtimeContext.city;
  const placeName = config.runtimeContext.placeName;

  return {
    hubs,
    dates: safeDates,
    placeName,
    radius,
    city,
    focusPoints,
  };
}

type Runtime3DMode = '3d' | '3d-timelapse' | '3d-heatmap';

interface Runtime3DBuilding {
  name: string;
  lat: number;
  lng: number;
  total_floors: number;
  has_floor_data: boolean;
  floor_rates?: Array<number | null>;
  floor_rates_by_date?: Array<Array<number | null>>;
  dates?: string[];
  metric_value?: number | null;
}

const PROJECT_FIELD_KEYS = [
  'project_name',
  'project',
  'building_name',
  'building',
  'tower_name',
  'tower',
];
const FLOOR_FIELD_KEYS = [
  'floor_number',
  'floor_no',
  'floor',
  'floor_level',
  'floor_label',
  'current floor',
  'current_floor',
  'level',
];

function parseRuntimeFloor(record: GeneratedMapRecord): number | null {
  const value = getRawValue(record, FLOOR_FIELD_KEYS);
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  if (text === 'ground') return 0;
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  return Math.round(Number(match[0]));
}

function hasRuntimeFloorData(records: GeneratedMapRecord[]): boolean {
  return records.some((record) => parseRuntimeFloor(record) !== null);
}

function hasRuntimeProjectData(records: GeneratedMapRecord[]): boolean {
  return records.some((record) => Boolean(getRawString(record, PROJECT_FIELD_KEYS)));
}

function hasRuntimeTimeData(config: GeneratedMapConfig): boolean {
  if (config.timeFrames.length > 1) return true;
  const meaningfulFrames = new Set(
    config.records
      .map((record) => String(record.timeFrame || '').trim())
      .filter((frame) => frame && !/^(current|all|n\/a|na|none)$/i.test(frame)),
  );
  return meaningfulFrames.size > 1;
}

function getRuntime3DMode(config: GeneratedMapConfig): Runtime3DMode {
  const hasTime = hasRuntimeTimeData(config);
  const hasFloor = hasRuntimeFloorData(config.records);
  const hasProject = hasRuntimeProjectData(config.records);

  if (hasFloor && hasTime) return '3d-timelapse';
  if (hasFloor) return '3d';
  if (hasTime && hasProject) return '3d-timelapse';
  if (hasTime) return '3d-heatmap';
  return '3d';
}

function getRuntime3DName(record: GeneratedMapRecord): string {
  const project = getRawString(record, ['project_name', 'project', 'name']);
  const tower = getRawString(record, ['tower_name', 'tower']);
  const building = getRawString(record, ['building_name', 'building']);
  return [project || building || record.geoLabel, tower && tower !== project ? tower : ''].filter(Boolean).join(' - ');
}

function getRuntime3DPlaceName(config: GeneratedMapConfig): string {
  const city = config.runtimeContext.city || 'Pune';
  const recordLocality = config.records
    .map((record) => getRawString(record, ['location_name', 'location', 'locality', 'micro_market', 'micromarket', 'village_name', 'village']))
    .find(Boolean);
  if (recordLocality) return `${recordLocality}, ${city}, India`;

  const objective = config.module1Summary.businessObjective || config.fullTitle || '';
  const locationMatch = objective.match(/\bin\s+([a-z][a-z\s-]{2,40}?)(?=\s+(?:based|ranked|from|for|over|with|using|by|and)\b|[.,]|$)/i);
  const objectiveLocation = locationMatch?.[1]?.trim();
  if (objectiveLocation) return `${objectiveLocation}, ${city}, India`;

  const locationLabel = config.runtimeContext.locationLabels.find((label) => !PROJECT_FIELD_KEYS.some((key) => key && label.toLowerCase().includes(key.replace('_', ' '))));
  if (locationLabel) return `${locationLabel}, ${city}, India`;

  return `${config.runtimeContext.center.lat.toFixed(5)}, ${config.runtimeContext.center.lng.toFixed(5)}`;
}

function buildRuntime3DInputs(config: GeneratedMapConfig) {
  const dates =
    config.timeFrames.length > 0
      ? config.timeFrames
      : Array.from(new Set(config.records.map((record) => record.timeFrame || 'Current')));
  const safeDates = dates.length > 0 ? dates : ['Current'];
  const hasFloor = hasRuntimeFloorData(config.records);
  const buckets = new Map<
    string,
    {
      name: string;
      lat: number;
      lng: number;
      floorValues: Map<number, number[]>;
      floorTimeValues: Map<string, Map<number, number[]>>;
      timeValues: Map<string, number[]>;
      metricValues: number[];
    }
  >();

  config.records.forEach((record) => {
    const name = getRuntime3DName(record);
    const key = `${name}-${record.lat.toFixed(6)}-${record.lng.toFixed(6)}`;
    const existing =
      buckets.get(key) ||
      {
        name,
        lat: record.lat,
        lng: record.lng,
        floorValues: new Map<number, number[]>(),
        floorTimeValues: new Map<string, Map<number, number[]>>(),
        timeValues: new Map<string, number[]>(),
        metricValues: [],
      };
    const metric = typeof record.metricValue === 'number' && Number.isFinite(record.metricValue) ? record.metricValue : null;
    const floor = parseRuntimeFloor(record);
    const frame = record.timeFrame || safeDates[0];
    if (metric !== null) {
      existing.metricValues.push(metric);
      const timeBucket = existing.timeValues.get(frame) || [];
      timeBucket.push(metric);
      existing.timeValues.set(frame, timeBucket);
      if (floor !== null) {
        const floorBucket = existing.floorValues.get(floor) || [];
        floorBucket.push(metric);
        existing.floorValues.set(floor, floorBucket);
        const frameFloorValues = existing.floorTimeValues.get(frame) || new Map<number, number[]>();
        const frameFloorBucket = frameFloorValues.get(floor) || [];
        frameFloorBucket.push(metric);
        frameFloorValues.set(floor, frameFloorBucket);
        existing.floorTimeValues.set(frame, frameFloorValues);
      }
    }
    buckets.set(key, existing);
  });

  const buildings: Runtime3DBuilding[] = Array.from(buckets.values()).map((bucket) => {
    const sortedFloors = Array.from(bucket.floorValues.keys()).sort((a, b) => a - b);
    const floorList = hasFloor && sortedFloors.length > 0 ? sortedFloors : [0];
    const floorIndex = new Map(floorList.map((floor, index) => [floor, index]));
    const totalFloors = Math.max(1, floorList.length);
    const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
    const fallbackMetric = average(bucket.metricValues);
    const floorRates = floorList.map((floor) => average(bucket.floorValues.get(floor) || []) ?? fallbackMetric);
    const floorRatesByDate = safeDates.map((date) => {
      const row = Array.from({ length: totalFloors }, () => null as number | null);
      const frameFloorValues = bucket.floorTimeValues.get(date);
      if (frameFloorValues) {
        frameFloorValues.forEach((values, floor) => {
          const index = floorIndex.get(floor);
          if (index !== undefined) row[index] = average(values);
        });
      } else if (!hasFloor) {
        row[0] = average(bucket.timeValues.get(date) || []) ?? fallbackMetric;
      }
      return row.map((value) => value ?? fallbackMetric);
    });

    return {
      name: bucket.name,
      lat: bucket.lat,
      lng: bucket.lng,
      total_floors: totalFloors,
      has_floor_data: hasFloor && sortedFloors.length > 0,
      floor_rates: floorRates,
      floor_rates_by_date: floorRatesByDate,
      dates: safeDates,
      metric_value: fallbackMetric,
    };
  });

  return {
    buildings,
    dates: safeDates,
    placeName: getRuntime3DPlaceName(config),
    radius: Math.max(250, Math.min(450, config.runtimeContext.radius || 350)),
    city: config.runtimeContext.city,
    hasFloor,
    hasProject: hasRuntimeProjectData(config.records),
    hasTime: hasRuntimeTimeData(config),
  };
}

function Module31TokenLedger({ config }: { config: GeneratedMapConfig }) {
  const usage = config.module31?.usage;
  if (!usage) return null;

  return (
    <details className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-xs text-violet-900">
      <summary className="cursor-pointer select-none font-extrabold uppercase tracking-widest">
        Module 3.1 Token Ledger - ${usage.total_cost_usd.toFixed(6)} / {usage.total_tokens.toLocaleString()} tokens
      </summary>
      <div className="mt-3 overflow-x-auto">
        <div className="mb-3 grid gap-2 sm:grid-cols-5">
          <span>Calls: {usage.total_llm_calls}</span>
          <span>Input: {usage.total_input_tokens.toLocaleString()}</span>
          <span>Cached: {usage.total_cached_input_tokens.toLocaleString()}</span>
          <span>Output: {usage.total_output_tokens.toLocaleString()}</span>
          <span>Total: {usage.total_tokens.toLocaleString()}</span>
        </div>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <span>Input Cost: ${Number(usage.total_input_cost_usd || 0).toFixed(6)}</span>
          <span>Cached Cost: ${Number(usage.total_cached_input_cost_usd || 0).toFixed(6)}</span>
          <span>Output Cost: ${Number(usage.total_output_cost_usd || 0).toFixed(6)}</span>
          <span className="font-extrabold">Total Cost: ${usage.total_cost_usd.toFixed(6)}</span>
        </div>
        <table className="w-full min-w-[1480px] text-left text-[11px]">
          <thead className="text-violet-500">
            <tr>
              <th className="py-1 pr-3">#</th>
              <th className="py-1 pr-3">Timestamp</th>
              <th className="py-1 pr-3">Call</th>
              <th className="py-1 pr-3">Step</th>
              <th className="py-1 pr-3">Duration</th>
              <th className="py-1 pr-3">Provider</th>
              <th className="py-1 pr-3">Region</th>
              <th className="py-1 pr-3">Endpoint</th>
              <th className="py-1 pr-3">Model</th>
              <th className="py-1 pr-3">API Model</th>
              <th className="py-1 pr-3">Input</th>
              <th className="py-1 pr-3">Cached</th>
              <th className="py-1 pr-3">Output</th>
              <th className="py-1 pr-3">Tokens</th>
              <th className="py-1 pr-3">Input Cost</th>
              <th className="py-1 pr-3">Cached Cost</th>
              <th className="py-1 pr-3">Output Cost</th>
              <th className="py-1 pr-3">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {usage.ledger.map((row) => (
              <tr key={`${row.call_id || 0}-${row.call_name}`} className="border-t border-violet-200/70">
                <td className="py-1.5 pr-3">{row.call_id || '-'}</td>
                <td className="whitespace-nowrap py-1.5 pr-3">{row.timestamp?.replace('T', ' ') || '-'}</td>
                <td className="py-1.5 pr-3 font-bold">{row.call_name}</td>
                <td className="py-1.5 pr-3">{row.step || '-'}</td>
                <td className="py-1.5 pr-3">{row.processing_time_seconds != null ? `${row.processing_time_seconds.toFixed(3)}s` : '-'}</td>
                <td className="py-1.5 pr-3">{row.provider || 'AWS Bedrock'}</td>
                <td className="py-1.5 pr-3 font-mono">{row.region || 'ap-south-1'}</td>
                <td className="py-1.5 pr-3">{row.endpoint_type || 'bedrock-mantle'}</td>
                <td className="max-w-[220px] py-1.5 pr-3 font-mono">
                  <span className="block whitespace-normal break-words" title={row.model}>{row.model}</span>
                </td>
                <td className="max-w-[220px] py-1.5 pr-3 font-mono">
                  <span className="block whitespace-normal break-words" title={row.api_model || row.model}>
                    {row.api_model || row.model}
                  </span>
                </td>
                <td className="py-1.5 pr-3">{row.input_tokens.toLocaleString()}</td>
                <td className="py-1.5 pr-3">{row.cached_input_tokens.toLocaleString()}</td>
                <td className="py-1.5 pr-3">{row.output_tokens.toLocaleString()}</td>
                <td className="py-1.5 pr-3">{row.total_tokens.toLocaleString()}</td>
                <td className="py-1.5 pr-3">${Number(row.input_cost_usd ?? row.input_cost ?? 0).toFixed(6)}</td>
                <td className="py-1.5 pr-3">${Number(row.cached_input_cost_usd ?? row.cached_input_cost ?? 0).toFixed(6)}</td>
                <td className="py-1.5 pr-3">${Number(row.output_cost_usd ?? row.output_cost ?? 0).toFixed(6)}</td>
                <td className="py-1.5 pr-3 font-bold">${Number(row.total_cost_usd ?? row.total_cost ?? 0).toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function GeneratedBasemapOverlay({
  value,
  onChange,
}: {
  value: GeneratedBasemapMode;
  onChange: (mode: GeneratedBasemapMode) => void;
}) {
  return (
    <div
      className="absolute right-4 top-4 z-[700] flex flex-wrap items-center rounded-full border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur"
      role="group"
      aria-label="Generated map base view"
    >
      {GENERATED_BASEMAP_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-widest transition-colors ${
            value === option.value
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
          title={`Switch generated map to ${option.label} view`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function GeneratedRecordPopup({ record }: { record: GeneratedMapRecord }) {
  const tooltipFields =
    typeof record.raw.tooltip_data === 'object' && record.raw.tooltip_data !== null
      ? (record.raw.tooltip_data as Record<string, unknown>).fields
      : undefined;
  const rawFields =
    typeof record.raw.raw_fields === 'object' && record.raw.raw_fields !== null
      ? (record.raw.raw_fields as Record<string, unknown>)
      : undefined;
  const tooltipSource =
    tooltipFields && typeof tooltipFields === 'object'
      ? (tooltipFields as Record<string, unknown>)
      : rawFields || record.raw;
  const rawEntries = Object.entries(tooltipSource)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 7);

  return (
    <div className="min-w-[190px] max-w-[260px] p-1">
      <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-900">
        {record.geoLabel}
      </p>
      <p className="text-[11px] font-semibold text-slate-600">
        {record.metricLabel}: {record.metricValue == null ? 'N/A' : record.metricValue.toLocaleString()}
      </p>
      {record.timeFrame ? (
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
          {record.timeFrame}
        </p>
      ) : null}
      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
        {rawEntries.map(([key, value]) => (
          <p key={key} className="text-[10px] leading-4 text-slate-500">
            <span className="font-bold text-slate-700">{key}:</span> {String(value)}
          </p>
        ))}
      </div>
    </div>
  );
}

function GeneratedRuntimeHeatmapPanel({
  config,
  title,
  description,
  basemapMode,
  onBasemapModeChange,
  onLoaded,
}: {
  config: GeneratedMapConfig;
  title: string;
  description: string;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onLoaded?: (config: GeneratedMapConfig) => void;
}) {
  const runtimeHeatmap = useMemo(() => buildRuntimeHeatmapInputs(config), [config]);
  const llmCalls = config.module31?.llm_call_count || 0;
  const handleRuntimeDataReady = React.useCallback(
    (payload: { mapId: string; mapLabel: string; plottedData: Record<string, unknown> } | null) => {
      if (payload) onLoaded?.(config);
    },
    [config, onLoaded],
  );

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">
          {title}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-slate-950">
          {config.fullTitle}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
            {FAMILY_LABEL[config.family]}
          </span>
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-indigo-600">
            {config.primaryMapType}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
            {runtimeHeatmap.hubs.length} runtime hubs
          </span>
          {llmCalls > 0 ? (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-violet-600">
              {llmCalls} LLM calls
            </span>
          ) : null}
        </div>
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-800">
          {description}
        </div>
        <Module31TokenLedger config={config} />
      </div>
      <div className="min-h-[520px] flex-1 overflow-hidden">
        <HeatmapTimelapseView
          key={config.id}
          initialPlaceName={runtimeHeatmap.placeName}
          initialRadius={runtimeHeatmap.radius}
          initialCityForApi={runtimeHeatmap.city}
          focusPoints={runtimeHeatmap.focusPoints}
          fastMode
          maxBuildingsPerLocation={300}
          maxTotalBuildings={1000}
          runtimeHubs={runtimeHeatmap.hubs}
          runtimeDates={runtimeHeatmap.dates}
          metricLabel={config.metricLabel}
          mapStyle={MAPLIBRE_STYLE_BY_BASEMAP[basemapMode]}
          basemapControls={<GeneratedBasemapOverlay value={basemapMode} onChange={onBasemapModeChange} />}
          autoLoad
          onInsightDataReady={handleRuntimeDataReady}
        />
      </div>
    </div>
  );
}

function GeneratedRuntimeThreeDPanel({
  config,
  mode,
  title,
  description,
  basemapMode,
  onBasemapModeChange,
  onLoaded,
}: {
  config: GeneratedMapConfig;
  mode: Exclude<Runtime3DMode, '3d-heatmap'>;
  title: string;
  description: string;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onLoaded?: (config: GeneratedMapConfig) => void;
}) {
  const runtime3D = useMemo(() => buildRuntime3DInputs(config), [config]);
  const llmCalls = config.module31?.llm_call_count || 0;
  const handleRuntimeDataReady = React.useCallback(
    (payload: { mapId: string; mapLabel: string; plottedData: Record<string, unknown> } | null) => {
      if (payload) onLoaded?.(config);
    },
    [config, onLoaded],
  );
  const commonProps = {
    initialPlaceName: runtime3D.placeName,
    initialRadius: runtime3D.radius,
    initialCityForApi: runtime3D.city,
    initialUseGeocoding: true,
    runtimeBuildings: runtime3D.buildings as unknown as Record<string, unknown>[],
    fastMode: true,
    maxBuildings: 700,
    mapStyle: MAPLIBRE_STYLE_BY_BASEMAP[basemapMode],
    basemapControls: <GeneratedBasemapOverlay value={basemapMode} onChange={onBasemapModeChange} />,
    mapId: `generated:${config.id}`,
    mapLabel: config.label,
    onInsightDataReady: handleRuntimeDataReady,
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">
          {title}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-slate-950">
          {config.fullTitle}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
            {mode === '3d-timelapse' ? '3D Timelapse' : '3D Map'}
          </span>
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-indigo-600">
            {config.primaryMapType}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
            {runtime3D.buildings.length} runtime building{runtime3D.buildings.length === 1 ? '' : 's'}
          </span>
          {runtime3D.hasFloor ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-sky-600">
              floor fields detected
            </span>
          ) : null}
          {runtime3D.hasTime ? (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-orange-600">
              {runtime3D.dates.length} time steps
            </span>
          ) : null}
          {llmCalls > 0 ? (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-violet-600">
              {llmCalls} LLM calls
            </span>
          ) : null}
        </div>
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-800">
          {description}
        </div>
        <Module31TokenLedger config={config} />
      </div>
      <div className="min-h-[560px] flex-1 overflow-hidden">
        {mode === '3d-timelapse' ? (
          <ThreeDMapTimelapseView key={`${config.id}:3d-timelapse`} {...commonProps} />
        ) : (
          <ThreeDMapView key={`${config.id}:3d`} {...commonProps} />
        )}
      </div>
    </div>
  );
}

function GeneratedSpatialAnalysisView({
  config,
  basemapMode,
  onBasemapModeChange,
  onLoaded,
}: {
  config: GeneratedMapConfig;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onLoaded?: (config: GeneratedMapConfig) => void;
}) {
  const center = useMemo(() => getRecordCenter(config.records), [config.records]);
  const stats = useMemo(() => getMetricStats(config.records), [config.records]);
  const previewRecords = useMemo(
    () =>
      [...config.records].sort((a, b) => {
        const av = a.metricValue ?? Number.NEGATIVE_INFINITY;
        const bv = b.metricValue ?? Number.NEGATIVE_INFINITY;
        return bv - av;
      }),
    [config.records],
  );
  const [subjectName, setSubjectName] = useState('Subject Project');
  const [subjectLat, setSubjectLat] = useState(String(center[0]?.toFixed(6) || ''));
  const [subjectLng, setSubjectLng] = useState(String(center[1]?.toFixed(6) || ''));
  const [analysisQuery, setAnalysisQuery] = useState(
    config.module1Summary.businessObjective || 'Analyze the subject project against nearby plotted records and relevant amenities.',
  );
  const [spatialData, setSpatialData] = useState<SpatialAnalysisResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overlay' | 'plan' | 'steps' | 'output' | 'ledger'>('overlay');
  const comparisonLines = previewRecords.slice(1, 8).map((record) => [center, [record.lat, record.lng]] as [[number, number], [number, number]]);
  const radiusM = 1000;
  const ledgerTotals = useMemo(
    () => ({
      input: spatialData?.token_log.reduce((sum, row) => sum + Number(row.input_tokens || 0), 0) || 0,
      output: spatialData?.token_log.reduce((sum, row) => sum + Number(row.output_tokens || 0), 0) || 0,
      total: spatialData?.token_log.reduce((sum, row) => sum + Number(row.total_tokens || 0), 0) || 0,
    }),
    [spatialData],
  );

  const runRuntimeSpatialAnalysis = async () => {
    const parsedLat = Number(subjectLat);
    const parsedLng = Number(subjectLng);
    setIsRunning(true);
    setError(null);
    try {
      const result = await requestRuntimeSpatialAnalysis(config, {
        userQuery: analysisQuery,
        subjectName,
        subjectLat: Number.isFinite(parsedLat) ? parsedLat : null,
        subjectLon: Number.isFinite(parsedLng) ? parsedLng : null,
        useSubject: Number.isFinite(parsedLat) && Number.isFinite(parsedLng),
        radiusM,
      });
      setSpatialData(result);
      setActiveTab('overlay');
      onLoaded?.(config);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Runtime spatial analysis failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const activeCenter: [number, number] = useMemo(() => {
    if (spatialData?.subject_info?.lat != null && spatialData.subject_info.lon != null) {
      return [Number(spatialData.subject_info.lat), Number(spatialData.subject_info.lon)];
    }
    if (spatialData?.projects?.length) {
      const latSum = spatialData.projects.reduce((sum, project) => sum + Number(project.lat || 0), 0);
      const lngSum = spatialData.projects.reduce((sum, project) => sum + Number(project.long || 0), 0);
      return [latSum / spatialData.projects.length, lngSum / spatialData.projects.length];
    }
    return center;
  }, [center, spatialData]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">
          Module 3.1 Generated Spatial Analysis
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-slate-950">
          {config.fullTitle}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Runtime Spatial Adapter
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
            {config.records.length} records
          </span>
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-indigo-600">
            {config.metricLabel}
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
          This Module 3.1 spatial workflow uses the finalized Module 2 dataset only. The original sample Spatial Analysis workflow remains available under Default Maps.
        </div>
        <Module31TokenLedger config={config} />
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_120px]">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Subject Name</span>
            <input
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Subject Lat / Long</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={subjectLat}
                onChange={(event) => setSubjectLat(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400"
              />
              <input
                value={subjectLng}
                onChange={(event) => setSubjectLng(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400"
              />
            </div>
          </label>
          <button
            onClick={runRuntimeSpatialAnalysis}
            disabled={isRunning || !analysisQuery.trim()}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run
          </button>
          <label className="lg:col-span-3 flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Spatial Analysis Query</span>
            <textarea
              value={analysisQuery}
              onChange={(event) => setAnalysisQuery(event.target.value)}
              rows={2}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-700 outline-none focus:border-emerald-400"
              placeholder="Ask for main road impact, schools nearby, malls, hospitals, metro access, parks, or any spatial comparison..."
            />
          </label>
        </div>
        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
            {error}
          </div>
        ) : null}
      </div>

      {spatialData ? (
        <div className="grid shrink-0 gap-3 border-b border-slate-200 bg-white px-5 py-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Projects Loaded</p>
            <p className="mt-1 text-xl font-extrabold text-slate-800">{spatialData.stats.project_count}</p>
          </div>
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Roads Analyzed</p>
            <p className="mt-1 text-xl font-extrabold text-slate-800">{spatialData.stats.road_count}</p>
          </div>
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Amenities / POIs</p>
            <p className="mt-1 text-xl font-extrabold text-slate-800">{spatialData.stats.place_count}</p>
          </div>
          <div className="rounded-[1rem] border border-slate-100 border-l-4 border-l-emerald-400 bg-slate-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Analysis Cost</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">${spatialData.stats.total_cost_usd.toFixed(4)}</p>
          </div>
        </div>
      ) : null}

      {spatialData ? (
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-3 pt-2">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {[
              { id: 'overlay', label: 'Updated OSM Overlay', icon: MapIcon },
              { id: 'plan', label: 'Implementation Plan', icon: ListTree },
              { id: 'steps', label: 'Execution Steps', icon: PlaySquare },
              { id: 'output', label: 'Output Data', icon: Database },
              { id: 'ledger', label: 'Token & Cost Ledger', icon: Receipt },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    isActive ? 'border border-slate-200 bg-white text-blue-600 shadow' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="relative min-h-[300px] flex-1 overflow-y-auto bg-slate-50">
        {isRunning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-50">
            <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Running Runtime Spatial Workflow</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-rose-500" />
            <h3 className="mb-2 text-lg font-bold text-slate-800">Analysis Failed</h3>
            <p className="max-w-md rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
          </div>
        ) : (
          <div className="absolute inset-0 overflow-x-hidden p-4 pb-12">
            {(!spatialData || activeTab === 'overlay') ? (
              <div className="flex h-full flex-col gap-4">
                <div className="relative z-0 h-[400px] w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                  <GeneratedBasemapOverlay value={basemapMode} onChange={onBasemapModeChange} />
                  <MapContainer key={spatialData ? `runtime-${config.id}` : config.id} center={activeCenter} zoom={12} scrollWheelZoom zoomControl className="h-full w-full">
                    <MapResizeInvalidator />
                    <TileLayer
                      attribution={LEAFLET_BASEMAP_OPTIONS[basemapMode].attribution}
                      url={LEAFLET_BASEMAP_OPTIONS[basemapMode].url}
                    />
                    {spatialData ? (
                      <>
                        {spatialData.roads?.map((road, index) => (
                          <Polyline
                            key={`runtime-road-${index}`}
                            positions={road.geometry}
                            pathOptions={{ color: road.is_main_road ? '#f97316' : '#60a5fa', weight: road.is_main_road ? 4 : 2, opacity: road.is_main_road ? 0.7 : 0.45 }}
                          >
                            <Tooltip>{road.name || 'Unnamed road'} ({road.highway})</Tooltip>
                          </Polyline>
                        ))}
                        {spatialData.places?.slice(0, 300).map((place, index) => {
                          const type = [place.amenity, place.shop, place.leisure, place.tourism, place.railway, place.highway, place.public_transport].filter(Boolean).join(' / ');
                          return (
                            <CircleMarker key={`runtime-place-${index}`} center={[Number(place.lat), Number(place.lon)]} radius={3} pathOptions={{ color: '#a78bfa', fillColor: '#a78bfa', fillOpacity: 0.7, weight: 1 }}>
                              <Tooltip>{place.name || 'Place'}{type ? ` | ${type}` : ''}</Tooltip>
                            </CircleMarker>
                          );
                        })}
                        {spatialData.projects?.map((project, index) => {
                          if (project.project_name === spatialData.subject_info?.name && project.rate == null) return null;
                          const color = getMetricColor(Number(project.rate), stats, config.visualEncoding);
                          return (
                            <React.Fragment key={`runtime-project-${index}`}>
                              <CircleMarker center={[Number(project.lat), Number(project.long)]} radius={7} pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}>
                                <Tooltip>{project.project_name}</Tooltip>
                                <Popup>
                                  <div className="text-xs">
                                    <b>Project:</b> {project.project_name}<br />
                                    <b>Metric:</b> {project.rate ?? 'N/A'}<br />
                                    <b>Dist to Main:</b> {project.distance_from_main_road_m ?? 'N/A'} m<br />
                                    <b>Amenity:</b> {project.distance_to_amenity_m ?? 'N/A'} m<br />
                                    <b>Zone:</b> {project.zone ?? 'N/A'}
                                  </div>
                                </Popup>
                              </CircleMarker>
                              {project.nearest_main_road_point_lat != null && project.nearest_main_road_point_lon != null ? (
                                <Polyline
                                  positions={[[Number(project.lat), Number(project.long)], [Number(project.nearest_main_road_point_lat), Number(project.nearest_main_road_point_lon)]]}
                                  pathOptions={{ color: '#dc2626', weight: 3, opacity: 0.9, dashArray: '6' }}
                                />
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                        {spatialData.subject_info?.lat != null && spatialData.subject_info?.lon != null ? (
                          <React.Fragment>
                            <Circle center={[Number(spatialData.subject_info.lat), Number(spatialData.subject_info.lon)]} radius={radiusM} pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.08, weight: 2, dashArray: '6' }}>
                              <Tooltip>1 km subject data radius</Tooltip>
                            </Circle>
                            <Marker position={[Number(spatialData.subject_info.lat), Number(spatialData.subject_info.lon)]}>
                              <Popup>
                                <div className="text-xs">
                                  <b>{spatialData.subject_info.name}</b><br />
                                  Lat: {Number(spatialData.subject_info.lat).toFixed(5)}<br />
                                  Lon: {Number(spatialData.subject_info.lon).toFixed(5)}<br />
                                  <b>Est. Metric: {spatialData.subject_info.estimated_rate ?? 'N/A'}</b><br />
                                  Zone: {spatialData.subject_info.zone ?? 'N/A'}<br />
                                  Main Rd Dist: {spatialData.subject_info.distance_to_main_road_m ?? 'N/A'} m
                                </div>
                              </Popup>
                            </Marker>
                          </React.Fragment>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {comparisonLines.map((line, index) => (
                          <Polyline key={`spatial-line-${index}`} positions={line} pathOptions={{ color: '#f97316', weight: 2, opacity: 0.45, dashArray: '6' }} />
                        ))}
                        {previewRecords.map((record, index) => {
                          const color = getMetricColor(record.metricValue, stats, config.visualEncoding);
                          return (
                            <CircleMarker
                              key={record.id}
                              center={[record.lat, record.lng]}
                              radius={index === 0 ? 12 : getMetricRadius(record.metricValue, stats, config.visualEncoding)}
                              pathOptions={{ color, fillColor: color, fillOpacity: index === 0 ? 0.9 : 0.68, weight: index === 0 ? 3 : 2 }}
                            >
                              <Popup>
                                <GeneratedRecordPopup record={record} />
                              </Popup>
                            </CircleMarker>
                          );
                        })}
                      </>
                    )}
                  </MapContainer>
                  <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-xs rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      {spatialData ? 'Runtime Spatial Analysis' : 'Spatial Metric'}
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                      {spatialData ? `${spatialData.stats.project_count} records analyzed` : config.metricLabel}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <Navigation className="h-3.5 w-3.5 text-orange-500" />
                      {spatialData ? `${spatialData.stats.place_count} places / ${spatialData.stats.road_count} roads` : 'Runtime center and comparison links'}
                    </div>
                  </div>
                </div>

                {spatialData ? (
                  <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-800">
                      <TrendingUp className="h-5 w-5 text-indigo-500" /> Executive Insights
                    </h3>
                    <div className="max-w-none text-sm leading-relaxed text-slate-600 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-800 [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-800 [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_strong]:font-semibold [&_strong]:text-slate-800 [&_table]:mb-6 [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border-b-2 [&_th]:border-slate-300 [&_th]:p-2 [&_th]:text-left [&_th]:font-bold [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{spatialData.insights}</ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {spatialData && activeTab === 'plan' ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                <div className="mb-4 flex items-center gap-2">
                  <ListTree className="h-5 w-5 text-[#38bdf8]" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-white">LLM Requirement Deciphering & Scope</h3>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-sky-200">{JSON.stringify(spatialData.planner, null, 2)}</pre>
              </div>
            ) : null}

            {spatialData && activeTab === 'steps' ? (
              <div className="flex flex-col gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-800">
                    <PlaySquare className="h-5 w-5 text-emerald-500" /> Internal Progress Log
                  </h3>
                  <ol className="list-inside list-decimal space-y-2 text-sm font-medium text-slate-600">
                    {spatialData.progress_log.map((log, index) => <li key={index}>{log}</li>)}
                  </ol>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
                    <MapIcon className="h-5 w-5 text-[#f472b6]" /> LLM Execution Summary
                  </h3>
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-pink-200">{JSON.stringify(spatialData.execution_summary, null, 2)}</pre>
                </div>
              </div>
            ) : null}

            {spatialData && activeTab === 'output' ? (
              <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                    <Database className="h-5 w-5 text-sky-500" /> Temporary Enriched Data
                  </h3>
                  <button
                    onClick={() => {
                      const keys = Object.keys(spatialData.projects[0] || {});
                      const csv = [keys.join(','), ...spatialData.projects.map((row) => keys.map((key) => `"${row[key] ?? ''}"`).join(','))].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const anchor = document.createElement('a');
                      anchor.href = url;
                      anchor.download = 'module31_spatial_analysis_output.csv';
                      anchor.click();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600 transition-colors hover:bg-sky-100"
                  >
                    <Download className="h-4 w-4" /> Download CSV
                  </button>
                </div>
                <div className="overflow-auto rounded-xl border border-slate-100">
                  <table className="w-full whitespace-nowrap text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                      <tr>{Object.keys(spatialData.projects[0] || {}).map((key) => <th key={key} className="border-b px-4 py-3">{key}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {spatialData.projects.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50/80">
                          {Object.values(row).map((value, valueIndex) => (
                            <td key={valueIndex} className="px-4 py-2">{typeof value === 'number' ? value.toFixed(4) : (value ?? 'N/A')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {spatialData && activeTab === 'ledger' ? (
              <div className="flex flex-col gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                  <Receipt className="h-5 w-5 text-amber-500" /> Token Cost Ledger
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">Input Tokens</p>
                    <p className="mt-1 text-2xl font-black text-amber-700">{ledgerTotals.input.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">Output Tokens</p>
                    <p className="mt-1 text-2xl font-black text-amber-700">{ledgerTotals.output.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">Total Tokens</p>
                    <p className="mt-1 text-2xl font-black text-amber-700">{ledgerTotals.total.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70">Total Cost</p>
                    <p className="mt-1 text-2xl font-black text-emerald-700">${spatialData.stats.total_cost_usd.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function GeneratedMapView({
  config,
  basemapMode,
  onBasemapModeChange,
  onLoaded,
}: {
  config: GeneratedMapConfig;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onLoaded?: (config: GeneratedMapConfig) => void;
}) {
  const [selectedFrame, setSelectedFrame] = useState<string>('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const hasTimeline = config.timeFrames.length > 1;
  const activeFrameIndex = config.timeFrames.indexOf(selectedFrame);
  const sliderFrameIndex = activeFrameIndex >= 0 ? activeFrameIndex : 0;

  useEffect(() => {
    if (!hasTimeline || !isPlaying) return;

    const timer = window.setInterval(() => {
      setSelectedFrame((currentFrame) => {
        const currentIndex = config.timeFrames.indexOf(currentFrame);
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % config.timeFrames.length;
        return config.timeFrames[nextIndex] || 'all';
      });
    }, 1200);

    return () => window.clearInterval(timer);
  }, [config.timeFrames, hasTimeline, isPlaying]);

  const visibleRecords = useMemo(() => {
    const records =
      selectedFrame === 'all'
        ? config.records
        : config.records.filter((record) => record.timeFrame === selectedFrame);
    return records.slice(0, 700);
  }, [config.records, selectedFrame]);
  const center = useMemo(() => getRecordCenter(visibleRecords), [visibleRecords]);
  const stats = useMemo(() => getMetricStats(config.records), [config.records]);
  const visualEncoding = config.visualEncoding || DEFAULT_VISUAL_ENCODING;
  const hasMetrics = useMemo(() => hasMetricValues(config.records), [config.records]);
  const hasCategories = useMemo(
    () => config.records.some((record) => getRecordCategory(record) !== record.geoLabel),
    [config.records],
  );
  const geometryType = getGeneratedGeometryType(config);
  const lineGroups = useMemo(() => groupRecordsForLines(visibleRecords), [visibleRecords]);
  const clusterRecords = useMemo(() => buildClusterRecords(visibleRecords), [visibleRecords]);
  const clusterStats = useMemo(
    () => getMetricStats(clusterRecords.map((cluster) => ({ ...cluster.sample, metricValue: cluster.metricValue }))),
    [clusterRecords],
  );
  const isSpecializedPreview = config.family !== '2d';
  const llmCalls = config.module31?.llm_call_count || 0;
  const categoryCount = useMemo(
    () => new Set(config.records.map((record) => getRecordCategory(record)).filter(Boolean)).size,
    [config.records],
  );
  const shouldRenderClusters = config.renderer === 'cluster_map';
  const shouldRenderLines = !shouldRenderClusters && geometryType === 'line' && lineGroups.length > 0;
  const shouldRenderAreas =
    !shouldRenderClusters && !shouldRenderLines && (config.renderer === 'region_choropleth' || geometryType === 'polygon');
  const shouldRenderRadiusCircles = !shouldRenderClusters && !shouldRenderLines && !shouldRenderAreas && geometryType === 'circle';
  const shouldRenderPoints = !shouldRenderClusters && !shouldRenderLines && !shouldRenderAreas && !shouldRenderRadiusCircles;
  const runtime3DMode = useMemo(() => getRuntime3DMode(config), [config]);

  useEffect(() => {
    if (config.family === '2d' && config.records.length > 0) onLoaded?.(config);
  }, [config, onLoaded]);

  const getRecordColor = (record: GeneratedMapRecord) => {
    if (config.renderer === 'comparison_map') {
      return getCategoryColor(record.geoLabel || getRecordCategory(record), visualEncoding.colorPalette);
    }
    if (hasMetrics) return getMetricColor(record.metricValue, stats, visualEncoding);
    return getCategoryColor(getRecordCategory(record), visualEncoding.colorPalette);
  };

  const getRecordRadius = (record: GeneratedMapRecord) =>
    hasMetrics ? getMetricRadius(record.metricValue, stats, visualEncoding) : visualEncoding.radiusRange.min;

  if (config.family === 'heatmap-timelapse') {
    return (
      <GeneratedRuntimeHeatmapPanel
        config={config}
        title="Module 3.1 Generated Heatmap Timelapse"
        description="Module 3.1 routed this request to the Heatmap - Timelapse adapter and bound runtime location, radius, metric values, timeline, and tooltips from Module 2."
        basemapMode={basemapMode}
        onBasemapModeChange={onBasemapModeChange}
        onLoaded={onLoaded}
      />
    );
  }

  if ((config.family === '3d-timelapse' || config.renderer === '3d_timelapse') && runtime3DMode === '3d-timelapse') {
    return (
      <GeneratedRuntimeThreeDPanel
        config={config}
        mode="3d-timelapse"
        title="Module 3.1 Generated 3D Timelapse"
        description="Module 3.1 is using the Overture 3D timelapse adapter with runtime Module 2 buildings, time frames, and snapping to nearby building polygons."
        basemapMode={basemapMode}
        onBasemapModeChange={onBasemapModeChange}
        onLoaded={onLoaded}
      />
    );
  }

  if (
    (config.family === '3d' || config.family === '3d-timelapse') &&
    runtime3DMode === '3d' &&
    config.renderer !== '3d_floor_wise'
  ) {
    return (
      <GeneratedRuntimeThreeDPanel
        config={config}
        mode="3d"
        title="Module 3.1 Generated 3D Map"
        description="Module 3.1 detected project/building records without meaningful time or floor fields, so this is rendered as a simple 3D map with runtime metrics and coordinate correction enabled."
        basemapMode={basemapMode}
        onBasemapModeChange={onBasemapModeChange}
        onLoaded={onLoaded}
      />
    );
  }

  if (config.family === 'spatial-analysis') {
    return <GeneratedSpatialAnalysisView config={config} basemapMode={basemapMode} onBasemapModeChange={onBasemapModeChange} onLoaded={onLoaded} />;
  }

  if (config.renderer === '3d_floor_wise') {
    if (runtime3DMode === '3d-timelapse') {
      return (
        <GeneratedRuntimeThreeDPanel
          config={config}
          mode="3d-timelapse"
          title="Module 3.1 Generated 3D Floor Wise Timelapse"
          description="Module 3.1 detected floor and time fields, so this is routed to the 3D timelapse floor adapter with existing Overture snapping for building identification."
          basemapMode={basemapMode}
          onBasemapModeChange={onBasemapModeChange}
          onLoaded={onLoaded}
        />
      );
    }
    return (
      <GeneratedRuntimeThreeDPanel
        config={config}
        mode="3d"
        title="Module 3.1 Generated 3D Floor Wise Map"
        description="Module 3.1 detected floor fields without a timeline, so this is routed to the 3D floor adapter with existing Overture snapping for building identification."
        basemapMode={basemapMode}
        onBasemapModeChange={onBasemapModeChange}
        onLoaded={onLoaded}
      />
    );
  }

  if (config.renderer === '3d_heatmap' || config.renderer === '3d_building_plotting') {
    if (runtime3DMode === '3d-timelapse') {
      return (
        <GeneratedRuntimeThreeDPanel
          config={config}
          mode="3d-timelapse"
          title="Module 3.1 Generated 3D Timelapse"
          description="Module 3.1 detected project-level time data, so this is routed to the 3D timelapse adapter. Floor configuration is reduced to a single metric layer when floor fields are absent."
          basemapMode={basemapMode}
          onBasemapModeChange={onBasemapModeChange}
          onLoaded={onLoaded}
        />
      );
    }
    if (runtime3DMode === '3d') {
      return (
        <GeneratedRuntimeThreeDPanel
          config={config}
          mode="3d"
          title="Module 3.1 Generated 3D Map"
          description="Module 3.1 detected project/building data without a timeline, so this is routed to the 3D map adapter with Overture snapping and runtime metric coloring."
          basemapMode={basemapMode}
          onBasemapModeChange={onBasemapModeChange}
          onLoaded={onLoaded}
        />
      );
    }
    return (
      <GeneratedRuntimeHeatmapPanel
        config={config}
        title="Module 3.1 Generated 3D Map"
        description="Module 3.1 selected the Overture 3D runtime adapter. Overture buildings are loaded around the Module 2 location and colored from the generated metric."
        basemapMode={basemapMode}
        onBasemapModeChange={onBasemapModeChange}
        onLoaded={onLoaded}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">
              Module 3.1 Generated Map
            </p>
            <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-slate-950">
              {config.fullTitle}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                {FAMILY_LABEL[config.family]}
              </span>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-indigo-600">
                {config.primaryMapType}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                {visibleRecords.length} records
              </span>
              {llmCalls > 0 ? (
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-violet-600">
                  {llmCalls} LLM calls
                </span>
              ) : null}
            </div>
          </div>

          {config.timeFrames.length > 0 && (
            <label className="flex min-w-[180px] flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Time Frame
              </span>
              <select
                value={selectedFrame}
                onChange={(event) => setSelectedFrame(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">All frames</option>
                {config.timeFrames.map((frame) => (
                  <option key={frame} value={frame}>
                    {frame}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {hasTimeline ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                if (selectedFrame === 'all') setSelectedFrame(config.timeFrames[0]);
                setIsPlaying((value) => !value);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-extrabold uppercase tracking-widest text-white shadow-sm transition hover:bg-emerald-700"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setSelectedFrame('all');
              }}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold uppercase tracking-widest text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <input
              type="range"
              min={0}
              max={config.timeFrames.length - 1}
              step={1}
              value={sliderFrameIndex}
              onChange={(event) => {
                setIsPlaying(false);
                setSelectedFrame(config.timeFrames[Number(event.target.value)] || 'all');
              }}
              className="h-2 min-w-[180px] flex-1 accent-emerald-600"
              aria-label="Generated map timelapse frame"
            />
            <span className="min-w-[72px] rounded-full bg-slate-100 px-3 py-1.5 text-center text-xs font-extrabold text-slate-700">
              {selectedFrame === 'all' ? 'All frames' : selectedFrame}
            </span>
          </div>
        ) : null}

        {isSpecializedPreview ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
            Classified as {FAMILY_LABEL[config.family]}. Module 3.1 generated a validated renderer spec from the default map templates; approved runtime rendering uses the closest existing renderer path.
          </div>
        ) : null}
      </div>

      <div className="relative min-h-[420px] flex-1">
        <GeneratedBasemapOverlay value={basemapMode} onChange={onBasemapModeChange} />
        <MapContainer
          key={config.id}
          center={center}
          zoom={12}
          scrollWheelZoom
          zoomControl
          className="h-full w-full"
        >
          <MapResizeInvalidator />
          <TileLayer
            attribution={LEAFLET_BASEMAP_OPTIONS[basemapMode].attribution}
            url={LEAFLET_BASEMAP_OPTIONS[basemapMode].url}
          />
          {shouldRenderClusters
            ? clusterRecords.map((cluster) => {
                const color = hasMetrics
                  ? getMetricColor(cluster.metricValue, clusterStats, visualEncoding)
                  : getCategoryColor(getRecordCategory(cluster.sample), visualEncoding.colorPalette);
                return (
                  <CircleMarker
                    key={cluster.id}
                    center={[cluster.lat, cluster.lng]}
                    radius={Math.min(28, visualEncoding.radiusRange.min + Math.sqrt(cluster.count) * 5)}
                    pathOptions={{ color, fillColor: color, fillOpacity: 1, opacity: 1, weight: 2 }}
                  >
                    <Tooltip permanent direction="center" className="!border-0 !bg-transparent !shadow-none">
                      <span className="text-[10px] font-extrabold text-white drop-shadow">{cluster.count}</span>
                    </Tooltip>
                    <Popup>
                      <div className="min-w-[180px] space-y-2 text-xs">
                        <p className="font-extrabold text-slate-900">Cluster Summary</p>
                        <p className="text-slate-600">Records: {cluster.count}</p>
                        {hasMetrics ? (
                          <p className="text-slate-600">
                            {config.metricLabel}: {Math.round(cluster.metricValue).toLocaleString()}
                          </p>
                        ) : null}
                        <GeneratedRecordPopup record={cluster.sample} />
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })
            : null}

          {shouldRenderLines
            ? lineGroups.map(([lineName, records]) => {
                const metricValues = records
                  .map((record) => record.metricValue)
                  .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
                const metricValue =
                  metricValues.length > 0
                    ? metricValues.reduce((sum, value) => sum + value, 0) / metricValues.length
                    : null;
                const color = hasMetrics
                  ? getMetricColor(metricValue, stats, visualEncoding)
                  : getCategoryColor(lineName, visualEncoding.colorPalette);
                return (
                  <Polyline
                    key={lineName}
                    positions={records.map((record) => [record.lat, record.lng] as [number, number])}
                    pathOptions={{
                      color,
                      opacity: 1,
                      weight: getMetricWeight(metricValue, stats, visualEncoding),
                    }}
                  >
                    <Popup>
                      <div className="min-w-[180px] space-y-1 text-xs">
                        <p className="font-extrabold text-slate-900">{lineName}</p>
                        <p className="text-slate-600">Segments: {records.length}</p>
                        {metricValue !== null ? (
                          <p className="text-slate-600">
                            {config.metricLabel}: {Math.round(metricValue).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    </Popup>
                  </Polyline>
                );
              })
            : null}

          {shouldRenderAreas
            ? visibleRecords.map((record) => {
                const color = getRecordColor(record);
                return (
                  <Circle
                    key={record.id}
                    center={[record.lat, record.lng]}
                    radius={Math.max(220, getRecordRadius(record) * 55)}
                    pathOptions={{ color, fillColor: color, fillOpacity: 1, opacity: 1, weight: 2 }}
                  >
                    <Popup>
                      <GeneratedRecordPopup record={record} />
                    </Popup>
                  </Circle>
                );
              })
            : null}

          {shouldRenderRadiusCircles
            ? visibleRecords.map((record) => {
                const color = getRecordColor(record);
                const radius = Math.max(150, Math.min(5000, config.runtimeContext.radius || getRecordRadius(record) * 80));
                return (
                  <Circle
                    key={record.id}
                    center={[record.lat, record.lng]}
                    radius={radius}
                    pathOptions={{ color, fillColor: color, fillOpacity: 1, opacity: 1, weight: 2 }}
                  >
                    <Popup>
                      <GeneratedRecordPopup record={record} />
                    </Popup>
                  </Circle>
                );
              })
            : null}

          {shouldRenderPoints
            ? visibleRecords.map((record) => {
                const color = getRecordColor(record);
                const useIconMarker = config.renderer === 'marker_map' && !hasMetrics && !hasCategories;
                if (useIconMarker) {
                  return (
                    <Marker key={record.id} position={[record.lat, record.lng]}>
                      <Popup>
                        <GeneratedRecordPopup record={record} />
                      </Popup>
                    </Marker>
                  );
                }

                return (
                  <CircleMarker
                    key={record.id}
                    center={[record.lat, record.lng]}
                    radius={config.renderer === '2d_heatmap' || hasMetrics ? getRecordRadius(record) : visualEncoding.radiusRange.min}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 1,
                      opacity: 1,
                      weight: config.renderer === 'comparison_map' ? 3 : 2,
                    }}
                  >
                    <Popup>
                      <GeneratedRecordPopup record={record} />
                    </Popup>
                  </CircleMarker>
                );
              })
            : null}
        </MapContainer>

        <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-xs rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            {hasMetrics ? 'Metric' : 'Layer'}
          </p>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {hasMetrics ? config.metricLabel : `${categoryCount || visibleRecords.length} categories`}
          </p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full">
            {visualEncoding.colorPalette.map((color) => (
              <span key={color} className="flex-1" style={{ backgroundColor: color }} />
            ))}
          </div>
          {hasMetrics ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span>Min {Math.round(stats.min).toLocaleString()}</span>
              <span>Max {Math.round(stats.max).toLocaleString()}</span>
            </div>
          ) : (
            <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {visibleRecords.length.toLocaleString()} visible records
            </div>
          )}
          <div className="mt-2 flex justify-between gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            <span>{visualEncoding.legendLabels?.low || 'Low'}</span>
            <span>{visualEncoding.legendLabels?.high || 'High'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function loadedDatasetCacheKey(baseId: string, plottedData: Record<string, unknown>): string {
  const serialized = JSON.stringify(plottedData);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${baseId}:${(hash >>> 0).toString(36)}`;
}

function runtimeFullMapCacheKey(moduleOutput: Module1IntentOutput, module2Output: Module2Output): string {
  return loadedDatasetCacheKey('runtime-module3', {
    module_1_intent_json: moduleOutput,
    module_2_output_json: module2Output,
  });
}

function SampleMapView({
  activeFamily,
  isFullscreen,
  toggleFullscreen,
  onInsightDataReady,
}: {
  activeFamily: GeneratedMapFamily;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  onInsightDataReady?: (payload: Module7LoadedMapData | null) => void;
}) {
  const handleLoaded = React.useCallback(
    (payload: { mapId: string; mapLabel: string; plottedData: Record<string, unknown> } | null) => {
      onInsightDataReady?.(
        payload
          ? {
              ...payload,
              mapId: loadedDatasetCacheKey(payload.mapId, payload.plottedData),
              mapFamily: activeFamily,
            }
          : null,
      );
    },
    [activeFamily, onInsightDataReady],
  );

  if (activeFamily === '2d') {
    return <MapOverlayView isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} onInsightDataReady={handleLoaded} />;
  }

  if (activeFamily === '3d') {
    return <ThreeDMapView markers={[]} onInsightDataReady={handleLoaded} />;
  }

  if (activeFamily === '3d-timelapse') {
    return <ThreeDMapTimelapseView markers={[]} onInsightDataReady={handleLoaded} />;
  }

  if (activeFamily === 'spatial-analysis') {
    return (
      <SpatialAnalysisView
        markers={[]}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        onInsightDataReady={handleLoaded}
      />
    );
  }

  return <HeatmapTimelapseView onInsightDataReady={handleLoaded} />;
}

function Module7InsightsPanel({
  output,
  mapLabel,
}: {
  output: Module7GenerationOutput;
  mapLabel: string;
}) {
  const insights = output.insight_output;
  const findings = Array.isArray(insights.key_findings) ? insights.key_findings : [];
  const spatialFindings = Array.isArray(insights.spatial_findings) ? insights.spatial_findings : [];
  const actions = Array.isArray(insights.recommended_actions) ? insights.recommended_actions : [];
  const caveats = Array.isArray(insights.caveats) ? insights.caveats : [];
  const enrichment = output.spatial_enrichment;

  return (
    <section className="border-t border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">
            Module 7 Spatial Insight Generation
          </p>
          <h3 className="mt-1 text-sm font-extrabold text-slate-950">
            {insights.headline || `Insights for ${mapLabel}`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {enrichment?.is_enriched ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-sky-700">
              📍 {enrichment.osm_summary?.main_roads ?? 0} roads · {enrichment.osm_summary?.total_places ?? 0} places · {enrichment.point_count ?? 0} points
            </span>
          ) : null}
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
            Cached for this map
          </span>
        </div>
      </div>

      {insights.executive_summary ? (
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
          {insights.executive_summary}
        </p>
      ) : null}

      {findings.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Key Findings</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {findings.map((finding, index) => (
              <article key={`${finding.title || 'finding'}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-extrabold text-slate-900">{finding.title || `Finding ${index + 1}`}</p>
                {finding.evidence ? <p className="mt-1 text-[11px] leading-4 text-slate-600">{finding.evidence}</p> : null}
                {finding.business_implication ? (
                  <p className="mt-2 text-[11px] font-semibold leading-4 text-emerald-700">{finding.business_implication}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {spatialFindings.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-600">Spatial Findings</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {spatialFindings.map((finding, index) => (
              <article key={`spatial-${finding.title || 'sf'}-${index}`} className="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
                <p className="text-xs font-extrabold text-slate-900">{finding.title || `Spatial Finding ${index + 1}`}</p>
                {finding.spatial_evidence ? (
                  <p className="mt-1 text-[11px] leading-4 text-slate-600">{finding.spatial_evidence}</p>
                ) : null}
                {finding.metric_impact ? (
                  <p className="mt-1 text-[11px] font-bold leading-4 text-sky-700">{finding.metric_impact}</p>
                ) : null}
                {finding.business_implication ? (
                  <p className="mt-2 text-[11px] font-semibold leading-4 text-emerald-700">{finding.business_implication}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {enrichment?.is_enriched && enrichment.zone_distribution && Object.keys(enrichment.zone_distribution).length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Zone Distribution</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(enrichment.zone_distribution).map(([zone, count]) => (
              <span
                key={zone}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  zone === 'Premium'
                    ? 'border border-amber-200 bg-amber-50 text-amber-700'
                    : zone === 'High Value Residential'
                      ? 'border border-blue-200 bg-blue-50 text-blue-700'
                      : zone === 'Balanced'
                        ? 'border border-green-200 bg-green-50 text-green-700'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {zone}: {count}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Recommended Actions</p>
          <div className="mt-2 space-y-1.5">
            {actions.map((action, index) => (
              <p key={`${action}-${index}`} className="text-xs font-semibold leading-5 text-slate-700">
                {index + 1}. {action}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {caveats.length > 0 ? (
        <details className="mt-4 text-xs text-slate-600">
          <summary className="cursor-pointer select-none font-bold uppercase tracking-widest text-slate-500">
            Caveats ({caveats.length})
          </summary>
          <div className="mt-2 space-y-1">
            {caveats.map((caveat, index) => (
              <p key={`${caveat}-${index}`}>{caveat}</p>
            ))}
          </div>
        </details>
      ) : null}

      <details className="mt-4 rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2 text-[11px] text-violet-900">
        <summary className="cursor-pointer select-none font-extrabold uppercase tracking-widest">
          Module 7 Token Ledger - ${output.usage.total_cost_usd.toFixed(6)} / {output.usage.total_tokens.toLocaleString()} tokens
        </summary>
        <div className="mt-2 flex flex-wrap gap-4 font-semibold">
          <span>LLM Calls: {output.usage.total_llm_calls}</span>
          <span>Input: {output.usage.total_input_tokens.toLocaleString()}</span>
          <span>Output: {output.usage.total_output_tokens.toLocaleString()}</span>
          <span>Time: {output.processing_time_seconds.toFixed(2)}s</span>
        </div>
      </details>
    </section>
  );
}

function GeneratedMapEmptyState({
  activeFamily,
  readiness,
  isGenerating,
  hasCachedMap,
  onGenerate,
}: {
  activeFamily: ViewerMapCategory;
  readiness: ReturnType<typeof getModule31Readiness>;
  isGenerating: boolean;
  hasCachedMap: boolean;
  onGenerate: () => void | Promise<void>;
}) {
  const actionLabel = FAMILY_ACTION_LABEL[activeFamily];

  return (
    <div className="flex h-full min-h-[540px] flex-col items-center justify-center bg-white px-6 text-center">
      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={!readiness.isReady || isGenerating}
        title={readiness.isReady ? `Generate ${actionLabel} from the finalized Module 2 data` : readiness.reasons.join(' ')}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-xs font-extrabold uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {hasCachedMap ? `View ${actionLabel}` : `Generate ${actionLabel}`}
      </button>
      {!readiness.isReady ? (
        <p className="mt-4 max-w-md text-xs font-semibold leading-5 text-slate-500">
          Module 3.1 unlocks after runtime Module 1 intent and runtime Module 2 finalized data are ready.
        </p>
      ) : null}
    </div>
  );
}

const MapSection: React.FC<MapSectionProps> = ({
  onToggleExpand,
  isExpanded,
  moduleOutput = null,
  module2Output = null,
  onRuntimeGeneratedMapsChange,
}) => {
  const [leafletReady, setLeafletReady] = useState(false);
  const [activeViewerModule, setActiveViewerModule] = useState<'3.1' | '3'>('3.1');
  const [generatedBasemapMode, setGeneratedBasemapMode] = useState<GeneratedBasemapMode>('current');
  const [activeFamily, setActiveFamily] = useState<ViewerMapCategory>('2d');
  const [activeSampleFamily, setActiveSampleFamily] = useState<GeneratedMapFamily>('2d');
  const [generatedMaps, setGeneratedMaps] = useState<GeneratedMapConfig[]>([]);
  const [activeGeneratedId, setActiveGeneratedId] = useState<string>(SAMPLE_OPTION_VALUE);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSampleFullscreen, setIsSampleFullscreen] = useState(false);
  const [loadedGeneratedMaps, setLoadedGeneratedMaps] = useState<Record<string, boolean>>({});
  const [loadedSampleMap, setLoadedSampleMap] = useState<Module7LoadedMapData | null>(null);
  const [insightCache, setInsightCache] = useState<Record<string, Module7GenerationOutput>>({});
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [fullMaps, setFullMaps] = useState<FullGeneratedMapEntry[]>([]);
  const [activeFullMapKey, setActiveFullMapKey] = useState<string | null>(null);
  const [loadedFullMap, setLoadedFullMap] = useState<Module7LoadedMapData | null>(null);
  const [isGeneratingFullMap, setIsGeneratingFullMap] = useState(false);
  const [fullMapError, setFullMapError] = useState<string | null>(null);
  const [isGeneratingFullMapInsights, setIsGeneratingFullMapInsights] = useState(false);
  const [fullMapInsightError, setFullMapInsightError] = useState<string | null>(null);
  const [savedRuntimeMapIds, setSavedRuntimeMapIds] = useState<Set<string>>(() => new Set());
  const [savedRuntimeMaps, setSavedRuntimeMaps] = useState<StoredRuntimeMap[]>([]);
  const [isCacheManagerOpen, setIsCacheManagerOpen] = useState(false);
  const [deletingRuntimeMapId, setDeletingRuntimeMapId] = useState<string | null>(null);
  const [isSavingRuntimeMap, setIsSavingRuntimeMap] = useState(false);
  const [mapStorageMessage, setMapStorageMessage] = useState<string | null>(null);
  const [mapStorageMessageTone, setMapStorageMessageTone] = useState<'success' | 'error'>('success');
  const insightPanelRef = useRef<HTMLDivElement | null>(null);

  const readiness = useMemo(
    () => getModule31Readiness(moduleOutput, module2Output),
    [moduleOutput, module2Output],
  );
  const mapsForFamily = generatedMaps.filter((map) => isMapInViewerCategory(map, activeFamily));
  const selectedGenerationTarget = useMemo<Module31GenerationTarget>(() => ({
    requested_map_family: activeFamily,
    requested_map_type: activeFamily === '3d'
      ? getAutomatic3DMapType(moduleOutput, module2Output)
      : getMapTypeForFamily(activeFamily, moduleOutput),
  }), [activeFamily, module2Output, moduleOutput]);
  const cachedMapForSelectedTarget = generatedMaps.find(
    (map) =>
      isMapInViewerCategory(map, activeFamily) &&
      map.primaryMapType === selectedGenerationTarget.requested_map_type,
  );
  const activeGenerated =
    activeGeneratedId === SAMPLE_OPTION_VALUE
      ? null
      : generatedMaps.find((map) => map.id === activeGeneratedId) || null;
  const activeMapId = activeGenerated
    ? `generated:${activeGenerated.id}`
    : SHOW_VISUALIZATION_DEFAULT_MAPS
      ? loadedSampleMap?.mapId || `default:${activeSampleFamily}`
      : `empty:${activeFamily}`;
  const activeInsight = insightCache[activeMapId] || null;
  const activeMapLoaded = activeGenerated
    ? Boolean(loadedGeneratedMaps[activeGenerated.id])
    : SHOW_VISUALIZATION_DEFAULT_MAPS && Boolean(loadedSampleMap);
  const activeFullMap = fullMaps.find((entry) => entry.output.cache_key === activeFullMapKey) || null;
  const activeFullInsight = loadedFullMap ? insightCache[loadedFullMap.mapId] || null : null;
  const activeRuntimeMapStorageId =
    activeViewerModule === '3.1' && activeGenerated
      ? `module31:${activeGenerated.id}`
      : activeViewerModule === '3' && activeFullMap
        ? `module3:${activeFullMap.output.cache_key}`
        : null;
  const isActiveRuntimeMapSaved = Boolean(activeRuntimeMapStorageId && savedRuntimeMapIds.has(activeRuntimeMapStorageId));
  const runtimeGeneratedMapOptions = useMemo<RuntimeGeneratedMapOption[]>(
    () => [
      ...generatedMaps.map((map) => ({
        id: `module31:${map.id}`,
        label: map.label,
        title: map.fullTitle,
        sourceModule: '3.1' as const,
        family: map.family,
        mapType: map.primaryMapType,
        insightContext: {
          mapId: `generated:${map.id}`,
          mapLabel: map.label,
          mapFamily: map.family,
          mapSource: 'generated' as const,
          plottedData: {
            title: map.fullTitle,
            renderer: map.renderer,
            primary_map_type: map.primaryMapType,
            metric_label: map.metricLabel,
            time_frames: map.timeFrames,
            runtime_context: map.runtimeContext,
            visual_encoding: map.visualEncoding,
            records: map.records,
          },
          moduleOutput: map.sourceModule1Intent,
          module2Output: map.sourceModule2Output,
          module31Output: map.module31,
        },
      })),
      ...fullMaps.map((map) => ({
        id: `module3:${map.output.cache_key}`,
        label: map.output.blueprint.title,
        title: map.output.blueprint.purpose || map.output.blueprint.title,
        sourceModule: '3' as const,
        family: (map.output.blueprint.view_mode === '3d' ? '3d' : '2d') as GeneratedMapFamily,
        mapType: map.output.blueprint.view_mode,
        insightContext: {
          mapId: `module3:${map.output.cache_key}`,
          mapLabel: map.output.blueprint.title,
          mapFamily: (map.output.blueprint.view_mode === '3d' ? '3d' : '2d') as GeneratedMapFamily,
          mapSource: 'generated' as const,
          plottedData: {
            title: map.output.blueprint.title,
            blueprint: map.output.blueprint,
            records: map.output.scene_payload.records,
            metric_domain: map.output.scene_payload.metric_domain,
            time_frames: map.output.scene_payload.time_frames,
            enrichment_summary: map.output.enrichment_summary,
          },
          moduleOutput: map.module1,
          module2Output: map.module2,
        },
      })),
    ],
    [fullMaps, generatedMaps],
  );
  const module31CacheItems = useMemo(
    () =>
      generatedMaps.map((map) => ({
        id: `module31:${map.id}`,
        sourceModule: '3.1' as const,
        title: map.label || map.fullTitle,
        subtitle: `${FAMILY_LABEL[map.family]} / ${map.primaryMapType}`,
        savedAt: savedRuntimeMaps.find((saved) => saved.id === `module31:${map.id}`)?.savedAt,
        map,
      })),
    [generatedMaps, savedRuntimeMaps],
  );
  const module3CacheItems = useMemo(
    () =>
      fullMaps.map((map) => ({
        id: `module3:${map.output.cache_key}`,
        sourceModule: '3' as const,
        title: map.output.blueprint.title,
        subtitle: map.output.blueprint.view_mode === '3d' ? '3D Full Map' : '2D Full Map',
        savedAt: savedRuntimeMaps.find((saved) => saved.id === `module3:${map.output.cache_key}`)?.savedAt,
        map,
      })),
    [fullMaps, savedRuntimeMaps],
  );

  const handleGeneratedMapLoaded = React.useCallback((config: GeneratedMapConfig) => {
    setLoadedGeneratedMaps((previous) =>
      previous[config.id] ? previous : { ...previous, [config.id]: true },
    );
  }, []);

  const handleSampleMapLoaded = React.useCallback((payload: Module7LoadedMapData | null) => {
    setLoadedSampleMap(payload);
  }, []);

  const handleFullMapLoaded = React.useCallback((payload: Module7LoadedMapData) => {
    setLoadedFullMap(payload);
  }, []);

  useEffect(() => {
    let active = true;

    import('leaflet').then((leaflet) => {
      if (!active) return;
      const iconPrototype = leaflet.Icon.Default.prototype as typeof leaflet.Icon.Default.prototype & {
        _getIconUrl?: string;
      };
      delete iconPrototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
      setLeafletReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    onRuntimeGeneratedMapsChange?.(runtimeGeneratedMapOptions);
  }, [onRuntimeGeneratedMapsChange, runtimeGeneratedMapOptions]);

  useEffect(() => {
    let cancelled = false;

    readSavedRuntimeMaps()
      .then((storedMaps) => {
        if (cancelled) return;
        const savedGeneratedMaps = storedMaps
          .filter((map): map is StoredRuntimeMap & { generatedMap: GeneratedMapConfig } => map.sourceModule === '3.1' && Boolean(map.generatedMap))
          .map((map) => map.generatedMap);
        const savedFullMaps = storedMaps
          .filter((map): map is StoredRuntimeMap & { fullMap: FullGeneratedMapEntry } => map.sourceModule === '3' && Boolean(map.fullMap))
          .map((map) => map.fullMap);

        setSavedRuntimeMapIds(new Set(storedMaps.map((map) => map.id)));
        setSavedRuntimeMaps(storedMaps);
        setGeneratedMaps((previous) => [
          ...previous,
          ...savedGeneratedMaps.filter((saved) => !previous.some((existing) => existing.id === saved.id)),
        ]);
        setFullMaps((previous) => [
          ...previous,
          ...savedFullMaps.filter((saved) => !previous.some((existing) => existing.output.cache_key === saved.output.cache_key)),
        ]);
        if (savedGeneratedMaps[0]) {
          setActiveGeneratedId((previous) => {
            if (previous !== SAMPLE_OPTION_VALUE) return previous;
            setActiveFamily(isMapInViewerCategory(savedGeneratedMaps[0], '3d') ? '3d' : savedGeneratedMaps[0].family as ViewerMapCategory);
            return savedGeneratedMaps[0].id;
          });
        }
        if (savedFullMaps[0]) {
          setActiveFullMapKey((previous) => previous || savedFullMaps[0].output.cache_key);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMapStorageMessageTone('error');
          setMapStorageMessage(error instanceof Error ? error.message : 'Unable to restore saved maps.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveRuntimeMap = async () => {
    if (!activeRuntimeMapStorageId) return;

    const storedMap: StoredRuntimeMap | null =
      activeViewerModule === '3.1' && activeGenerated
        ? {
            id: activeRuntimeMapStorageId,
            sourceModule: '3.1',
            savedAt: new Date().toISOString(),
            generatedMap: activeGenerated,
          }
        : activeViewerModule === '3' && activeFullMap
          ? {
              id: activeRuntimeMapStorageId,
              sourceModule: '3',
              savedAt: new Date().toISOString(),
              fullMap: activeFullMap,
            }
          : null;
    if (!storedMap) return;

    setIsSavingRuntimeMap(true);
    setMapStorageMessage(null);
    try {
      await writeSavedRuntimeMap(storedMap);
      setSavedRuntimeMapIds((previous) => new Set([...previous, storedMap.id]));
      setSavedRuntimeMaps((previous) => [
        storedMap,
        ...previous.filter((map) => map.id !== storedMap.id),
      ]);
      setMapStorageMessageTone('success');
      setMapStorageMessage('Map saved locally for reuse after reload.');
    } catch (error) {
      setMapStorageMessageTone('error');
      setMapStorageMessage(error instanceof Error ? error.message : 'Unable to save generated map locally.');
    } finally {
      setIsSavingRuntimeMap(false);
    }
  };

  const handleOpenCachedMap = (id: string) => {
    if (id.startsWith('module31:')) {
      const mapId = id.replace('module31:', '');
      const map = generatedMaps.find((candidate) => candidate.id === mapId);
      if (!map) return;
      setActiveViewerModule('3.1');
      setActiveFamily(isMapInViewerCategory(map, '3d') ? '3d' : map.family as ViewerMapCategory);
      setActiveGeneratedId(map.id);
      setIsCacheManagerOpen(false);
      setGenerationError(null);
      return;
    }

    if (id.startsWith('module3:')) {
      const cacheKey = id.replace('module3:', '');
      if (!fullMaps.some((candidate) => candidate.output.cache_key === cacheKey)) return;
      setActiveViewerModule('3');
      setActiveFullMapKey(cacheKey);
      setIsCacheManagerOpen(false);
      setFullMapError(null);
    }
  };

  const handleDeleteCachedMap = async (id: string) => {
    setDeletingRuntimeMapId(id);
    setMapStorageMessage(null);
    try {
      if (savedRuntimeMapIds.has(id)) {
        await deleteSavedRuntimeMap(id);
      }
      setSavedRuntimeMapIds((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
      setSavedRuntimeMaps((previous) => previous.filter((map) => map.id !== id));

      if (id.startsWith('module31:')) {
        const mapId = id.replace('module31:', '');
        setGeneratedMaps((previous) => previous.filter((map) => map.id !== mapId));
        setLoadedGeneratedMaps((previous) => {
          const next = { ...previous };
          delete next[mapId];
          return next;
        });
        setInsightCache((previous) => {
          const next = { ...previous };
          delete next[`generated:${mapId}`];
          return next;
        });
        if (activeGeneratedId === mapId) {
          setActiveGeneratedId(SAMPLE_OPTION_VALUE);
          setLoadedSampleMap(null);
        }
      } else if (id.startsWith('module3:')) {
        const cacheKey = id.replace('module3:', '');
        setFullMaps((previous) => previous.filter((map) => map.output.cache_key !== cacheKey));
        setInsightCache((previous) => {
          const next = { ...previous };
          delete next[`module3:${cacheKey}`];
          return next;
        });
        if (activeFullMapKey === cacheKey) {
          setActiveFullMapKey(null);
          setLoadedFullMap(null);
        }
      }

      setMapStorageMessageTone('success');
      setMapStorageMessage(savedRuntimeMapIds.has(id) ? 'Saved map deleted from local storage.' : 'Cached map removed from this session.');
    } catch (error) {
      setMapStorageMessageTone('error');
      setMapStorageMessage(error instanceof Error ? error.message : 'Unable to delete saved map.');
    } finally {
      setDeletingRuntimeMapId(null);
    }
  };

  const handleGenerateMap = async () => {
    if (!moduleOutput || !module2Output || !readiness.isReady) return;

    if (cachedMapForSelectedTarget) {
      setActiveFamily(isMapInViewerCategory(cachedMapForSelectedTarget, '3d') ? '3d' : cachedMapForSelectedTarget.family as ViewerMapCategory);
      setActiveGeneratedId(cachedMapForSelectedTarget.id);
      setGenerationError(null);
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    try {
      const module31 = await requestModule31Generation(
        moduleOutput,
        module2Output,
        selectedGenerationTarget,
      );
      const generated = applyModule31Output(
        buildGeneratedMapConfig(moduleOutput, module2Output),
        module31,
      );
      setGeneratedMaps((prev) => [generated, ...prev]);
      setActiveFamily(isMapInViewerCategory(generated, '3d') ? '3d' : generated.family as ViewerMapCategory);
      setActiveGeneratedId(generated.id);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Unable to generate map.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFullMap = async () => {
    if (!moduleOutput || !module2Output || !readiness.isReady) return;

    const runtimeKey = runtimeFullMapCacheKey(moduleOutput, module2Output);
    const cachedMap = fullMaps.find((entry) => entry.runtimeKey === runtimeKey);
    if (cachedMap) {
      setActiveFullMapKey(cachedMap.output.cache_key);
      setFullMapError(null);
      setFullMapInsightError(null);
      return;
    }

    setIsGeneratingFullMap(true);
    setFullMapError(null);
    setFullMapInsightError(null);
    try {
      const output = await requestModule3Generation(moduleOutput, module2Output);
      setFullMaps((previous) => {
        const withoutSameMap = previous.filter((entry) => entry.output.cache_key !== output.cache_key);
        return [{ runtimeKey, output, module1: moduleOutput, module2: module2Output }, ...withoutSameMap];
      });
      setActiveFullMapKey(output.cache_key);
      setLoadedFullMap(null);
    } catch (error) {
      setFullMapError(error instanceof Error ? error.message : 'Unable to generate full map.');
    } finally {
      setIsGeneratingFullMap(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!activeMapLoaded) return;
    if (activeInsight) {
      insightPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const plottedData = activeGenerated
      ? {
          title: activeGenerated.fullTitle,
          renderer: activeGenerated.renderer,
          primary_map_type: activeGenerated.primaryMapType,
          metric_label: activeGenerated.metricLabel,
          time_frames: activeGenerated.timeFrames,
          runtime_context: activeGenerated.runtimeContext,
          visual_encoding: activeGenerated.visualEncoding,
          records: activeGenerated.records,
        }
      : loadedSampleMap?.plottedData;
    if (!plottedData) return;

    setIsGeneratingInsights(true);
    setInsightError(null);
    try {
      const output = await requestModule7Insights({
        mapId: activeMapId,
        mapLabel: activeGenerated?.label || loadedSampleMap?.mapLabel || FAMILY_LABEL[activeSampleFamily],
        mapFamily: activeGenerated?.family || loadedSampleMap?.mapFamily || activeSampleFamily,
        mapSource: activeGenerated ? 'generated' : 'default',
        plottedData,
        moduleOutput: activeGenerated?.sourceModule1Intent,
        module2Output: activeGenerated?.sourceModule2Output,
        module31Output: activeGenerated?.module31,
      });
      setInsightCache((previous) => ({ ...previous, [activeMapId]: output }));
    } catch (error) {
      setInsightError(error instanceof Error ? error.message : 'Unable to generate insights.');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleGenerateFullMapInsights = async () => {
    if (!activeFullMap || !loadedFullMap) return;
    if (activeFullInsight) return;

    setIsGeneratingFullMapInsights(true);
    setFullMapInsightError(null);
    try {
      const output = await requestModule7Insights({
        mapId: loadedFullMap.mapId,
        mapLabel: loadedFullMap.mapLabel,
        mapFamily: loadedFullMap.mapFamily,
        mapSource: 'generated',
        plottedData: loadedFullMap.plottedData,
        moduleOutput: activeFullMap.module1,
        module2Output: activeFullMap.module2,
      });
      setInsightCache((previous) => ({ ...previous, [loadedFullMap.mapId]: output }));
    } catch (error) {
      setFullMapInsightError(error instanceof Error ? error.message : 'Unable to generate full-map insights.');
    } finally {
      setIsGeneratingFullMapInsights(false);
    }
  };

  if (!leafletReady) {
    return (
      <div className="workspace-panel flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-xl shadow-slate-200/20">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Initializing Map Engine
        </p>
      </div>
    );
  }

  return (
    <div
      className="workspace-panel flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-xl shadow-slate-200/20 transition-all duration-500"
    >
      <div className="workspace-panel-header flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
            <MapIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold leading-none tracking-tight text-slate-900">
              Geospatial Viewer
            </h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] leading-none text-slate-400">
              {activeViewerModule === '3.1' ? 'Module 3.1 dynamic map builder' : 'Module 3 full map builder'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div
            className="flex items-center rounded-full border border-slate-200 bg-white p-1"
            role="tablist"
            aria-label="Geospatial viewer module"
          >
            {(['3.1', '3'] as const).map((module) => (
              <button
                key={module}
                type="button"
                role="tab"
                aria-selected={activeViewerModule === module}
                onClick={() => setActiveViewerModule(module)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest transition-colors ${
                  activeViewerModule === module
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {module}
              </button>
            ))}
          </div>

          {activeViewerModule === '3.1' ? (
            <>
              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <span>Map Family</span>
                <select
                  value={activeFamily}
                  onChange={(event) => {
                    const nextFamily = event.target.value as ViewerMapCategory;
                    setActiveFamily(nextFamily);
                    setActiveSampleFamily(nextFamily === '3d' ? '3d' : nextFamily);
                    setActiveGeneratedId(SAMPLE_OPTION_VALUE);
                    setLoadedSampleMap(null);
                    setInsightError(null);
                  }}
                  className="bg-transparent text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 outline-none"
                >
                  {DEFAULT_MAP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <span>{activeFamily === '2d' ? 'Subtype' : 'Maps'}</span>
                <select
                  value={activeGenerated?.id || `sample:${activeSampleFamily}`}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue.startsWith('sample:')) {
                      const nextSampleFamily = nextValue.replace('sample:', '') as GeneratedMapFamily;
                      setActiveSampleFamily(nextSampleFamily);
                      setActiveGeneratedId(SAMPLE_OPTION_VALUE);
                      setLoadedSampleMap(null);
                    } else {
                      setActiveGeneratedId(nextValue);
                    }
                    setInsightError(null);
                  }}
                  className="max-w-[190px] bg-transparent text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 outline-none"
                >
                  {SHOW_VISUALIZATION_DEFAULT_MAPS ? (
                    activeFamily === '3d' ? (
                      THREE_D_DEFAULT_OPTIONS.map((option) => (
                        <option key={option.value} value={`sample:${option.value}`}>
                          {option.label}
                        </option>
                      ))
                    ) : (
                      <option value={`sample:${activeFamily}`}>
                        {activeFamily === '2d' ? 'Default 2D Sample Maps' : `Default ${FAMILY_LABEL[activeFamily]}`}
                      </option>
                    )
                  ) : (
                    <option value={`sample:${activeSampleFamily}`} disabled>
                      {mapsForFamily.length > 0 ? 'Select Generated Map' : 'No Generated Maps Yet'}
                    </option>
                  )}
                  {mapsForFamily.map((map) => (
                    <option key={map.id} value={map.id}>
                      {map.label}
                    </option>
                  ))}
                </select>
              </label>

              {readiness.isReady ? (
                <button
                  onClick={handleGenerateMap}
                  disabled={isGenerating}
                  title={
                    cachedMapForSelectedTarget
                      ? `Open the cached ${FAMILY_ACTION_LABEL[activeFamily]} generated from this Module 2 data`
                      : `Generate ${FAMILY_ACTION_LABEL[activeFamily]} from the finalized Module 2 data`
                  }
                  className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  {cachedMapForSelectedTarget ? `View ${FAMILY_ACTION_LABEL[activeFamily]}` : `Generate ${FAMILY_ACTION_LABEL[activeFamily]}`}
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  No generated map
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsCacheManagerOpen((open) => !open)}
                title="View cached and locally saved Module 3.1 maps"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {generatedMaps.length} cached
              </button>

              <button
                type="button"
                onClick={handleGenerateInsights}
                disabled={!activeMapLoaded || isGeneratingInsights}
                title={activeMapLoaded ? 'Generate spatial insights grounded in map data and surrounding geography' : 'Spatial insights unlock after the selected map data loads'}
                className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isGeneratingInsights ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
                {activeInsight ? 'Spatial Insights Cached' : 'Spatial Insights'}
              </button>
            </>
          ) : (
            <>
              {fullMaps.length > 0 ? (
                <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <span>Maps</span>
                  <select
                    value={activeFullMapKey || ''}
                    onChange={(event) => {
                      setActiveFullMapKey(event.target.value);
                      setLoadedFullMap(null);
                      setFullMapInsightError(null);
                    }}
                    className="max-w-[190px] bg-transparent text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 outline-none"
                  >
                    {fullMaps.map((map) => (
                      <option key={map.output.cache_key} value={map.output.cache_key}>
                        {map.output.blueprint.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                onClick={handleGenerateFullMap}
                disabled={!readiness.isReady || isGeneratingFullMap}
                title={readiness.isReady ? 'Build a complete dynamic map from runtime Module 1 and Module 2 output' : readiness.reasons.join(' ')}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isGeneratingFullMap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Generate Full Map
              </button>
              <button
                type="button"
                onClick={() => setIsCacheManagerOpen((open) => !open)}
                title="View cached and locally saved Module 3 maps"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {fullMaps.length} cached
              </button>
              {activeFullMap ? (
                <button
                  type="button"
                  onClick={handleGenerateFullMapInsights}
                  disabled={!loadedFullMap || isGeneratingFullMapInsights}
                  title={loadedFullMap ? 'Generate spatial insights for this full map' : 'Spatial insights unlock once the full map loads'}
                  className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {isGeneratingFullMapInsights ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
                  {activeFullInsight ? 'Spatial Insights Cached' : 'Spatial Insights'}
                </button>
              ) : null}
            </>
          )}

          {activeRuntimeMapStorageId ? (
            <button
              type="button"
              onClick={handleSaveRuntimeMap}
              disabled={isSavingRuntimeMap}
              title={isActiveRuntimeMapSaved ? 'Update the locally saved copy of this map' : 'Save this generated map locally for reload testing'}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest transition-all disabled:cursor-wait disabled:opacity-60 ${
                isActiveRuntimeMapSaved
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
              }`}
            >
              {isSavingRuntimeMap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isActiveRuntimeMapSaved ? 'Saved Locally' : 'Save Map'}
            </button>
          ) : null}

          <button
            onClick={onToggleExpand}
            className="p-1 text-slate-400 transition-colors hover:text-slate-600"
            title={isExpanded ? 'Restore panel size' : 'Expand panel'}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isCacheManagerOpen ? (
        <div className="relative z-20 shrink-0 border-b border-slate-100 bg-white px-6 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">
                Saved Map Cache
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {activeViewerModule === '3.1'
                  ? 'Module 3.1 generated maps stored in this session or local browser storage.'
                  : 'Module 3 full maps stored in this session or local browser storage.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCacheManagerOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
              title="Close cache manager"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
            {(activeViewerModule === '3.1' ? module31CacheItems : module3CacheItems).length > 0 ? (
              <div className="grid gap-2">
                {(activeViewerModule === '3.1' ? module31CacheItems : module3CacheItems).map((item) => {
                  const isSaved = savedRuntimeMapIds.has(item.id);
                  const isDeleting = deletingRuntimeMapId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenCachedMap(item.id)}
                        className="min-w-0 flex-1 text-left"
                        title="Open cached map"
                      >
                        <p className="truncate text-xs font-extrabold text-slate-900">{item.title}</p>
                        <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Module {item.sourceModule} - {item.subtitle}
                          {item.savedAt ? ` - saved ${new Date(item.savedAt).toLocaleString()}` : ' - session cache'}
                        </p>
                      </button>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest ${
                            isSaved
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                        >
                          {isSaved ? 'Saved' : 'Session'}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCachedMap(item.id)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-white px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                          title={isSaved ? 'Delete saved map from local storage and remove from cache' : 'Remove cached map from this session'}
                        >
                          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-xs font-bold text-slate-500">No cached maps yet.</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Generate or save a map to see it here.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <AnimatedDots />

      {mapStorageMessage ? (
        <div
          className={`shrink-0 border-b px-6 py-2 text-[11px] font-semibold ${
            mapStorageMessageTone === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-red-100 bg-red-50 text-red-600'
          }`}
        >
          {mapStorageMessage}
        </div>
      ) : null}

      {activeViewerModule === '3.1' && generationError ? (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-6 py-3 text-xs font-bold text-red-600">
          {generationError}
        </div>
      ) : null}

      {activeViewerModule === '3.1' && insightError ? (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-6 py-3 text-xs font-bold text-red-600">
          Module 7: {insightError}
        </div>
      ) : null}

      {activeViewerModule === '3.1' && readiness.warnings.length > 0 ? (
        <div className="shrink-0 border-b border-amber-100 bg-amber-50 px-6 py-3 text-xs font-semibold text-amber-700">
          {readiness.warnings.join(' ')}
        </div>
      ) : null}

      {activeViewerModule === '3' && fullMapError ? (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-6 py-3 text-xs font-bold text-red-600">
          Module 3: {fullMapError}
        </div>
      ) : null}

      {activeViewerModule === '3' && fullMapInsightError ? (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-6 py-3 text-xs font-bold text-red-600">
          Module 7: {fullMapInsightError}
        </div>
      ) : null}

      <div className="relative z-10 min-h-0 flex-1 bg-slate-50">
        <div
          className={`h-full overflow-y-auto bg-slate-50 custom-scrollbar ${
            activeViewerModule === '3.1' ? '' : 'invisible pointer-events-none'
          }`}
          aria-hidden={activeViewerModule !== '3.1'}
        >
          <div className="h-full min-h-[680px] bg-slate-50">
            {activeGenerated ? (
              <GeneratedMapView
                key={activeGenerated.id}
                config={activeGenerated}
                basemapMode={generatedBasemapMode}
                onBasemapModeChange={setGeneratedBasemapMode}
                onLoaded={handleGeneratedMapLoaded}
              />
            ) : SHOW_VISUALIZATION_DEFAULT_MAPS ? (
              <SampleMapView
                activeFamily={activeSampleFamily}
                isFullscreen={isSampleFullscreen}
                toggleFullscreen={() => setIsSampleFullscreen((prev) => !prev)}
                onInsightDataReady={handleSampleMapLoaded}
              />
            ) : (
              <GeneratedMapEmptyState
                activeFamily={activeFamily}
                readiness={readiness}
                isGenerating={isGenerating}
                hasCachedMap={Boolean(cachedMapForSelectedTarget)}
                onGenerate={handleGenerateMap}
              />
            )}
          </div>

          {activeInsight ? (
            <div ref={insightPanelRef}>
              <Module7InsightsPanel
                output={activeInsight}
                mapLabel={
                  activeGenerated?.label ||
                  (SHOW_VISUALIZATION_DEFAULT_MAPS ? loadedSampleMap?.mapLabel || FAMILY_LABEL[activeSampleFamily] : FAMILY_LABEL[activeFamily])
                }
              />
            </div>
          ) : null}
        </div>

        {activeViewerModule === '3' ? (
          <div className="absolute inset-0 overflow-y-auto bg-slate-50 custom-scrollbar">
            {activeFullMap ? (
              <>
                <FullMapRenderer
                  key={activeFullMap.output.cache_key}
                  output={activeFullMap.output}
                  basemapMode={generatedBasemapMode}
                  onBasemapModeChange={setGeneratedBasemapMode}
                  onLoaded={handleFullMapLoaded}
                />
                {activeFullInsight ? (
                  <Module7InsightsPanel output={activeFullInsight} mapLabel={activeFullMap.output.blueprint.title} />
                ) : null}
              </>
            ) : (
              <div className="flex h-full min-h-[540px] flex-col items-center justify-center bg-white px-6 text-center">
                <button
                  type="button"
                  onClick={handleGenerateFullMap}
                  disabled={!readiness.isReady || isGeneratingFullMap}
                  title={readiness.isReady ? 'Build a complete dynamic map from runtime Module 1 and Module 2 output' : readiness.reasons.join(' ')}
                  className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-xs font-extrabold uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {isGeneratingFullMap ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Generate Full Map
                </button>
                {!readiness.isReady ? (
                  <p className="mt-4 max-w-md text-xs font-semibold leading-5 text-slate-500">
                    Module 3 unlocks after runtime Module 1 intent and runtime Module 2 finalized data are ready.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {activeViewerModule === '3.1' ? (
        <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-3">
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {activeGenerated
                ? 'Generated Visualization'
                : SHOW_VISUALIZATION_DEFAULT_MAPS
                  ? `Default ${FAMILY_LABEL[activeSampleFamily]}`
                  : 'No Generated Map Loaded'}
            </span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {activeGenerated
                ? 'Module 1 + Module 2 required'
                : SHOW_VISUALIZATION_DEFAULT_MAPS
                  ? 'Default map data source'
                  : 'Generate map to load Module 3.1 output'}
            </span>
          </div>
        </div>
      ) : activeFullMap ? (
        <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-3">
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Full Dynamic Visualization
            </span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Runtime Module 1 + Runtime Module 2
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MapSection;
