'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Loader2,
  Map as MapIcon,
  Maximize2,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Target,
  Timer,
} from 'lucide-react';
import type {
  GeneratedMapConfig,
  GeneratedMapFamily,
  GeneratedMapRecord,
  GeneratedMapRenderer,
  GeneratedMapVisualEncoding,
  Module31GenerationOutput,
  Module1IntentOutput,
  Module2Output,
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
import type { RuntimeHeatmapHub } from '@/components/geospatial/maps/timelapse/HeatmapTimelapseView';
import { API_BASE } from '@/lib/dashboard/geospatial/api';

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

const DEFAULT_MAP_OPTIONS: { value: GeneratedMapFamily; label: string }[] = [
  { value: '2d', label: '2D Maps' },
  { value: '3d', label: '3D Maps' },
  { value: '3d-timelapse', label: '3D Map - Timelapse' },
  { value: 'spatial-analysis', label: 'Spatial Analysis' },
  { value: 'heatmap-timelapse', label: 'Heatmap - Timelapse' },
];

const FAMILY_LABEL: Record<GeneratedMapFamily, string> = {
  '2d': '2D Maps',
  '3d': '3D Maps',
  '3d-timelapse': '3D Map - Timelapse',
  'spatial-analysis': 'Spatial Analysis',
  'heatmap-timelapse': 'Heatmap - Timelapse',
};

const SAMPLE_OPTION_VALUE = 'sample';
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
): Promise<Module31GenerationOutput> {
  const response = await fetch(`${API_BASE}/visualization-agent/module31/generate`, {
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
    throw new Error(message || `Module 3.1 failed with status ${response.status}`);
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
  onToggle?: () => void;
  isCollapsed?: boolean;
  moduleOutput?: Module1IntentOutput | null;
  module2Output?: Module2Output | null;
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

function getRawString(record: GeneratedMapRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record.raw?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return '';
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

function Module31TokenLedger({ config }: { config: GeneratedMapConfig }) {
  const usage = config.module31?.usage;
  if (!usage) return null;

  return (
    <details className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-xs text-violet-900">
      <summary className="cursor-pointer select-none font-extrabold uppercase tracking-widest">
        Module 3.1 Token Ledger - ${usage.total_cost_usd.toFixed(6)} / {usage.total_tokens.toLocaleString()} tokens
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[11px]">
          <thead className="text-violet-500">
            <tr>
              <th className="py-1 pr-3">Call</th>
              <th className="py-1 pr-3">Input</th>
              <th className="py-1 pr-3">Output</th>
              <th className="py-1 pr-3">Tokens</th>
              <th className="py-1 pr-3">Cost</th>
            </tr>
          </thead>
          <tbody>
            {usage.ledger.map((row) => (
              <tr key={row.call_name} className="border-t border-violet-200/70">
                <td className="py-1.5 pr-3 font-bold">{row.call_name}</td>
                <td className="py-1.5 pr-3">{row.input_tokens.toLocaleString()}</td>
                <td className="py-1.5 pr-3">{row.output_tokens.toLocaleString()}</td>
                <td className="py-1.5 pr-3">{row.total_tokens.toLocaleString()}</td>
                <td className="py-1.5 pr-3">${(row.total_cost || 0).toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
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
}: {
  config: GeneratedMapConfig;
  title: string;
  description: string;
}) {
  const runtimeHeatmap = useMemo(() => buildRuntimeHeatmapInputs(config), [config]);
  const llmCalls = config.module31?.llm_call_count || 0;

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
          autoLoad
        />
      </div>
    </div>
  );
}

function GeneratedSpatialAnalysisView({ config }: { config: GeneratedMapConfig }) {
  const center = useMemo(() => getRecordCenter(config.records), [config.records]);
  const stats = useMemo(() => getMetricStats(config.records), [config.records]);
  const sortedRecords = useMemo(
    () =>
      [...config.records].sort((a, b) => {
        const av = a.metricValue ?? Number.NEGATIVE_INFINITY;
        const bv = b.metricValue ?? Number.NEGATIVE_INFINITY;
        return bv - av;
      }),
    [config.records],
  );
  const comparisonLines = sortedRecords.slice(1, 8).map((record) => [center, [record.lat, record.lng]] as [[number, number], [number, number]]);

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
          Module 3.1 is using Module 2 records directly as the spatial source. The original sample Spatial Analysis workflow remains available under Default Maps.
        </div>
        <Module31TokenLedger config={config} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[460px]">
          <MapContainer center={center} zoom={12} scrollWheelZoom zoomControl className="h-full w-full">
            <MapResizeInvalidator />
            <TileLayer
              attribution="&copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {comparisonLines.map((line, index) => (
              <Polyline
                key={`spatial-line-${index}`}
                positions={line}
                pathOptions={{ color: '#f97316', weight: 2, opacity: 0.45, dashArray: '6' }}
              />
            ))}
            {sortedRecords.map((record, index) => {
              const color = getMetricColor(record.metricValue, stats, config.visualEncoding);
              return (
                <CircleMarker
                  key={record.id}
                  center={[record.lat, record.lng]}
                  radius={index === 0 ? 12 : getMetricRadius(record.metricValue, stats, config.visualEncoding)}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: index === 0 ? 0.9 : 0.68,
                    weight: index === 0 ? 3 : 2,
                  }}
                >
                  <Popup>
                    <GeneratedRecordPopup record={record} />
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
          <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-xs rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Spatial Metric
            </p>
            <p className="mt-1 text-sm font-extrabold text-slate-900">{config.metricLabel}</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <Navigation className="h-3.5 w-3.5 text-orange-500" />
              Runtime center and comparison links
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-auto border-l border-slate-200 bg-white p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Ranked Output
          </p>
          <div className="mt-3 space-y-2">
            {sortedRecords.slice(0, 12).map((record, index) => (
              <div key={record.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-extrabold text-slate-900">{record.geoLabel}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    #{index + 1}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {config.metricLabel}: {record.metricValue == null ? 'N/A' : record.metricValue.toLocaleString()}
                </p>
                {record.timeFrame ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                    <Timer className="h-3 w-3" />
                    {record.timeFrame}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneratedMapView({ config }: { config: GeneratedMapConfig }) {
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
      />
    );
  }

  if (config.family === '3d-timelapse') {
    return (
      <GeneratedRuntimeHeatmapPanel
        config={config}
        title="Module 3.1 Generated 3D Timelapse"
        description="Module 3.1 is using the Overture 3D runtime adapter with Module 2 time frames as playback steps. Default sample 3D timelapse remains separate."
      />
    );
  }

  if (config.family === 'spatial-analysis') {
    return <GeneratedSpatialAnalysisView config={config} />;
  }

  if (config.renderer === '3d_floor_wise') {
    return (
      <GeneratedRuntimeHeatmapPanel
        config={config}
        title="Module 3.1 Generated 3D Floor Wise Map"
        description="Module 3.1 selected the floor-wise 3D template. It uses Module 2 focus points and floor-related fields when available, with Overture buildings loaded around the selected locations."
      />
    );
  }

  if (config.renderer === '3d_heatmap' || config.renderer === '3d_building_plotting') {
    return (
      <GeneratedRuntimeHeatmapPanel
        config={config}
        title="Module 3.1 Generated 3D Map"
        description="Module 3.1 selected the Overture 3D runtime adapter. Overture buildings are loaded around the Module 2 location and colored from the generated metric."
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
            attribution="&copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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

function SampleMapView({
  activeFamily,
  isFullscreen,
  toggleFullscreen,
}: {
  activeFamily: GeneratedMapFamily;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}) {
  if (activeFamily === '2d') {
    return <MapOverlayView isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />;
  }

  if (activeFamily === '3d') {
    return <ThreeDMapView markers={[]} />;
  }

  if (activeFamily === '3d-timelapse') {
    return <ThreeDMapTimelapseView markers={[]} />;
  }

  if (activeFamily === 'spatial-analysis') {
    return (
      <SpatialAnalysisView
        markers={[]}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
      />
    );
  }

  return <HeatmapTimelapseView />;
}

const MapSection: React.FC<MapSectionProps> = ({
  onToggle,
  isCollapsed,
  moduleOutput = null,
  module2Output = null,
}) => {
  const [leafletReady, setLeafletReady] = useState(false);
  const [activeFamily, setActiveFamily] = useState<GeneratedMapFamily>('2d');
  const [generatedMaps, setGeneratedMaps] = useState<GeneratedMapConfig[]>([]);
  const [activeGeneratedId, setActiveGeneratedId] = useState<string>(SAMPLE_OPTION_VALUE);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSampleFullscreen, setIsSampleFullscreen] = useState(false);

  const readiness = useMemo(
    () => getModule31Readiness(moduleOutput, module2Output),
    [moduleOutput, module2Output],
  );
  const mapsForFamily = generatedMaps.filter((map) => map.family === activeFamily);
  const activeGenerated =
    activeGeneratedId === SAMPLE_OPTION_VALUE
      ? null
      : generatedMaps.find((map) => map.id === activeGeneratedId) || null;

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

  const handleGenerateMap = async () => {
    if (!moduleOutput || !module2Output || !readiness.isReady) return;

    setIsGenerating(true);
    setGenerationError(null);
    try {
      const module31 = await requestModule31Generation(moduleOutput, module2Output);
      const generated = applyModule31Output(
        buildGeneratedMapConfig(moduleOutput, module2Output),
        module31,
      );
      setGeneratedMaps((prev) => [generated, ...prev]);
      setActiveFamily(generated.family);
      setActiveGeneratedId(generated.id);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Unable to generate map.');
    } finally {
      setIsGenerating(false);
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
      className={`workspace-panel flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-xl shadow-slate-200/20 transition-all duration-500 ${
        isCollapsed ? 'opacity-80' : 'opacity-100'
      }`}
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
              Module 3.1 dynamic map builder
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <span>Default Maps</span>
            <select
              value={activeFamily}
              onChange={(event) => {
                setActiveFamily(event.target.value as GeneratedMapFamily);
                setActiveGeneratedId(SAMPLE_OPTION_VALUE);
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
              value={activeGenerated?.id || SAMPLE_OPTION_VALUE}
              onChange={(event) => setActiveGeneratedId(event.target.value)}
              className="max-w-[190px] bg-transparent text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 outline-none"
            >
              <option value={SAMPLE_OPTION_VALUE}>
                {activeFamily === '2d' ? 'Default 2D Sample Maps' : `Default ${FAMILY_LABEL[activeFamily]}`}
              </option>
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
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Generate Map
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              No generated map
            </div>
          )}

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {generatedMaps.length} cached
          </div>

          <button
            onClick={onToggle}
            className="p-1 text-slate-400 transition-colors hover:text-slate-600"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <Maximize2 className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatedDots />

      {generationError ? (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-6 py-3 text-xs font-bold text-red-600">
          {generationError}
        </div>
      ) : null}

      {readiness.warnings.length > 0 ? (
        <div className="shrink-0 border-b border-amber-100 bg-amber-50 px-6 py-3 text-xs font-semibold text-amber-700">
          {readiness.warnings.join(' ')}
        </div>
      ) : null}

      <div className="relative z-10 flex-1 overflow-hidden bg-slate-50">
        {activeGenerated ? (
          <GeneratedMapView key={activeGenerated.id} config={activeGenerated} />
        ) : (
          <SampleMapView
            activeFamily={activeFamily}
            isFullscreen={isSampleFullscreen}
            toggleFullscreen={() => setIsSampleFullscreen((prev) => !prev)}
          />
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            {activeGenerated ? 'Generated Visualization' : `Default ${FAMILY_LABEL[activeFamily]}`}
          </span>
          <span className="h-3 w-px bg-slate-200" />
          <span className="inline-flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Module 1 + Module 2 required
          </span>
        </div>
      </div>
    </div>
  );
};

export default MapSection;
