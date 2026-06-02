'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Layer } from '@deck.gl/core';
import DeckGL from '@deck.gl/react';
import { ColumnLayer, GeoJsonLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import BaseMap, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Building2, Layers, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import type {
  GeneratedMapFamily,
  Module3BlueprintLayer,
  Module3GenerationOutput,
  Module3SceneRecord,
  Module7LoadedMapData,
} from './types';

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [
    {
      id: 'satellite-base',
      type: 'raster',
      source: 'satellite',
    },
  ],
};
const BASEMAP_OPTIONS = {
  light: {
    label: 'Light',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  streets: {
    label: 'Streets',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  dark: {
    label: 'Dark',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  satellite: {
    label: 'Satellite',
    style: SATELLITE_STYLE,
  },
} satisfies Record<string, { label: string; style: string | StyleSpecification }>;
type BasemapKey = keyof typeof BASEMAP_OPTIONS;
type ExternalBasemapMode = 'current' | 'road' | 'satellite' | 'dark';
const EXTERNAL_BASEMAP_OPTIONS: { value: ExternalBasemapMode; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: 'road', label: 'Road' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'dark', label: 'Dark' },
];
type RGBA = [number, number, number, number];
interface BuildingProperties {
  height_render?: number | string;
  [key: string]: unknown;
}
type BuildingFeature = Feature<Geometry, BuildingProperties>;

interface FullMapRendererProps {
  output: Module3GenerationOutput;
  basemapMode?: ExternalBasemapMode;
  onBasemapModeChange?: (mode: ExternalBasemapMode) => void;
  onLoaded?: (map: Module7LoadedMapData) => void;
}

function hexToColor(color: string): RGBA {
  const valid = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : '2563eb';
  return [
    Number.parseInt(valid.slice(0, 2), 16),
    Number.parseInt(valid.slice(2, 4), 16),
    Number.parseInt(valid.slice(4, 6), 16),
    255,
  ];
}

function interpolateOpaqueColor(start: RGBA, end: RGBA, fraction: number): RGBA {
  const bounded = Math.max(0, Math.min(1, fraction));
  return [
    Math.round(start[0] + (end[0] - start[0]) * bounded),
    Math.round(start[1] + (end[1] - start[1]) * bounded),
    Math.round(start[2] + (end[2] - start[2]) * bounded),
    255,
  ];
}

function metricFraction(value: number | null, min: number, max: number, values: number[], scale: 'linear' | 'quantile') {
  if (value == null || !Number.isFinite(value)) return 0;
  if (scale === 'quantile' && values.length > 1) {
    return values.filter((candidate) => candidate <= value).length / values.length;
  }
  return Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
}

function visualColor(layer: Module3BlueprintLayer, fraction: number): RGBA {
  const palette = layer.encoding.palette.length >= 2 ? layer.encoding.palette : ['#2563eb', '#dc2626'];
  const position = Math.max(0, Math.min(1, fraction)) * (palette.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.min(palette.length - 1, lowerIndex + 1);
  return interpolateOpaqueColor(
    hexToColor(palette[lowerIndex] || palette[0]),
    hexToColor(palette[upperIndex] || palette[palette.length - 1]),
    position - lowerIndex,
  );
}

function metricSize(layer: Module3BlueprintLayer, fraction: number) {
  return layer.encoding.size_min + fraction * (layer.encoding.size_max - layer.encoding.size_min);
}

function featureCenter(feature: BuildingFeature): [number, number] | null {
  const geometry = feature.geometry as Geometry & { coordinates?: unknown };
  const coordinates = geometry?.coordinates;
  const points: [number, number][] = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number'
    ) {
      points.push([value[0], value[1]]);
      return;
    }
    value.forEach(visit);
  };
  visit(coordinates);
  if (points.length === 0) return null;
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ];
}

function nearestRecord(feature: BuildingFeature, records: Module3SceneRecord[]) {
  const center = featureCenter(feature);
  if (!center || records.length === 0) return undefined;
  return records.reduce<{ row?: Module3SceneRecord; distance: number }>(
    (best, row) => {
      const distance = (row.lng - center[0]) ** 2 + (row.lat - center[1]) ** 2;
      return distance < best.distance ? { row, distance } : best;
    },
    { distance: Number.POSITIVE_INFINITY },
  ).row;
}

function formatMetric(value: number | null) {
  return value == null ? 'N/A' : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function externalToBasemapKey(mode?: ExternalBasemapMode): BasemapKey {
  if (mode === 'road') return 'streets';
  if (mode === 'satellite') return 'satellite';
  if (mode === 'dark') return 'dark';
  return 'light';
}

function FullMapBasemapOverlay({
  value,
  onChange,
}: {
  value: ExternalBasemapMode;
  onChange?: (mode: ExternalBasemapMode) => void;
}) {
  return (
    <div className="absolute right-4 top-4 z-20 flex flex-wrap items-center rounded-full border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur">
      {EXTERNAL_BASEMAP_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange?.(option.value)}
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

export default function FullMapRenderer({ output, basemapMode, onBasemapModeChange, onLoaded }: FullMapRendererProps) {
  const { blueprint, scene_payload: scene } = output;
  const frames = scene.time_frames;
  const hasTimeline = blueprint.controls.includes('timeline') && frames.length > 1;
  const [selectedFrame, setSelectedFrame] = useState(hasTimeline ? frames[0] : 'all');
  const [playing, setPlaying] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(blueprint.layers.map((layer) => [layer.id, layer.visible])),
  );
  const basemap = externalToBasemapKey(basemapMode);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!playing || !hasTimeline) return undefined;
    const timer = window.setInterval(() => {
      setSelectedFrame((current) => frames[(Math.max(0, frames.indexOf(current)) + 1) % frames.length]);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [frames, hasTimeline, playing]);

  const records = useMemo(
    () => (hasTimeline && selectedFrame !== 'all'
      ? scene.records.filter((row) => row.time_frame === selectedFrame)
      : scene.records),
    [hasTimeline, scene.records, selectedFrame],
  );
  const allValues = useMemo(
    () => scene.records
      .map((row) => row.metric_value)
      .filter((value): value is number => value != null && Number.isFinite(value))
      .sort((a, b) => a - b),
    [scene.records],
  );
  const min = scene.metric_domain.min ?? 0;
  const max = scene.metric_domain.max ?? (min + 1);
  const primaryLayer = blueprint.layers[0];
  const legendValues = useMemo(() => {
    const fractions = [0, 0.5, 1];
    if (primaryLayer?.encoding.scale === 'quantile' && allValues.length > 0) {
      return fractions.map((fraction) => allValues[Math.round(fraction * (allValues.length - 1))]);
    }
    return fractions.map((fraction) => min + fraction * (max - min));
  }, [allValues, max, min, primaryLayer]);
  const rankedLocations = useMemo(() => {
    const totals = new Map<string, number>();
    scene.records.forEach((row) => {
      if (row.metric_value != null) {
        totals.set(row.geo_label, (totals.get(row.geo_label) || 0) + row.metric_value);
      }
    });
    return Array.from(totals.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
  }, [scene.records]);
  const timeTrend = useMemo(() => {
    const totals = new Map<string, number>();
    scene.records.forEach((row) => {
      if (row.time_frame && row.metric_value != null) {
        totals.set(row.time_frame, (totals.get(row.time_frame) || 0) + row.metric_value);
      }
    });
    return Array.from(totals.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [scene.records]);
  const trendMax = Math.max(...timeTrend.map(([, value]) => value), 1);

  const layers = useMemo<Layer[]>(() => {
    const renderLayers: Layer[] = [];
    blueprint.layers.forEach((layer) => {
      if (!visibleLayers[layer.id]) return;
    const fractionFor = (row: Module3SceneRecord) =>
      metricFraction(row.metric_value, min, max, allValues, layer.encoding.scale);

    if (layer.type === 'point_markers' || layer.type === 'solid_heat_circles') {
      renderLayers.push(new ScatterplotLayer<Module3SceneRecord>({
        id: `module3-${layer.id}-${selectedFrame}`,
        data: records,
        getPosition: (row) => [row.lng, row.lat],
        getFillColor: (row) => visualColor(layer, fractionFor(row)),
        getLineColor: [255, 255, 255, 255],
        stroked: true,
        lineWidthMinPixels: 1,
        getRadius: (row) => layer.type === 'point_markers' ? 65 : metricSize(layer, fractionFor(row)),
        radiusUnits: 'meters',
        radiusMinPixels: layer.type === 'point_markers' ? 7 : 8,
        radiusMaxPixels: 50,
        pickable: true,
      }));
      return;
    }

    if (layer.type === 'metric_columns') {
      renderLayers.push(new ColumnLayer<Module3SceneRecord>({
        id: `module3-${layer.id}-${selectedFrame}`,
        data: records,
        getPosition: (row) => [row.lng, row.lat],
        getFillColor: (row) => visualColor(layer, fractionFor(row)),
        getElevation: (row) => 25 + metricSize(layer, fractionFor(row)),
        radius: Math.max(20, layer.encoding.size_min),
        diskResolution: 12,
        extruded: true,
        pickable: true,
      }));
      return;
    }

    if (layer.type === 'connection_path') {
      const ordered = [...records].sort((left, right) => left.geo_label.localeCompare(right.geo_label));
      if (ordered.length > 1) renderLayers.push(new PathLayer<{ path: [number, number][]; label: string }>({
        id: `module3-${layer.id}-${selectedFrame}`,
        data: [{ path: ordered.map((row) => [row.lng, row.lat]), label: layer.label }],
        getPath: (entry: { path: [number, number][] }) => entry.path,
        getColor: hexToColor(layer.encoding.palette[layer.encoding.palette.length - 1] || '#dc2626'),
        getWidth: 4,
        widthMinPixels: 3,
        pickable: true,
      }));
      return;
    }

    const buildings = scene.enrichment.buildings_geojson as unknown as FeatureCollection<Geometry, BuildingProperties>;
    renderLayers.push(new GeoJsonLayer<BuildingProperties>({
      id: `module3-${layer.id}-${selectedFrame}`,
      data: buildings,
      filled: true,
      stroked: true,
      extruded: true,
      wireframe: true,
      getLineColor: [100, 116, 139, 220],
      lineWidthMinPixels: 1,
      getFillColor: (feature) => {
        const match = nearestRecord(feature as BuildingFeature, records);
        return match ? visualColor(layer, fractionFor(match)) : [203, 213, 225, 255];
      },
      getElevation: (feature) => {
        const match = nearestRecord(feature as BuildingFeature, records);
        const baseHeight = Number(feature.properties?.height_render || 8);
        return match ? baseHeight + metricSize(layer, fractionFor(match)) / 5 : baseHeight;
      },
      pickable: true,
      updateTriggers: { getFillColor: [selectedFrame], getElevation: [selectedFrame] },
    }));
    });
    return renderLayers;
  }, [allValues, blueprint.layers, max, min, records, scene.enrichment.buildings_geojson, selectedFrame, visibleLayers]);

  const family: GeneratedMapFamily = blueprint.view_mode === '3d' ? '3d' : '2d';
  const metricLabel = String(
    (output.input_summary.field_mapping as Record<string, unknown> | undefined)?.metric_field || 'Metric Value',
  ).replaceAll('_', ' ');

  const notifyLoaded = () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    onLoaded?.({
      mapId: `module3:${output.cache_key}`,
      mapLabel: blueprint.title,
      mapFamily: family,
      plottedData: {
        title: blueprint.title,
        blueprint,
        records: scene.records,
        metric_domain: scene.metric_domain,
        time_frames: scene.time_frames,
        enrichment_summary: output.enrichment_summary,
      },
    });
  };

  return (
    <section className="flex min-h-[720px] flex-col bg-white">
      <header className="shrink-0 border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div className="max-w-[75%]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">Module 3 Full Dynamic Map</p>
            <h3 className="mt-1 text-sm font-extrabold text-slate-950">{blueprint.title}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{blueprint.purpose}</p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
              {blueprint.view_mode} native render
            </span>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-violet-700">
              {output.usage.total_llm_calls} LLM call
            </span>
          </div>
        </div>

        <details className="mt-4 rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2 text-[11px] text-violet-900">
          <summary className="cursor-pointer select-none font-extrabold uppercase tracking-widest">
            Module 3 Token Ledger - ${output.usage.total_cost_usd.toFixed(6)} / {output.usage.total_tokens.toLocaleString()} tokens
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <span>Input: {output.usage.total_input_tokens.toLocaleString()}</span>
            <span>Cached: {output.usage.total_cached_input_tokens.toLocaleString()}</span>
            <span>Output: {output.usage.total_output_tokens.toLocaleString()}</span>
            <span>Time: {output.processing_time_seconds.toFixed(2)}s</span>
          </div>
          {output.usage.ledger.map((entry) => (
            <div key={entry.call_name} className="mt-3 border-t border-violet-100 pt-2 font-semibold">
              <p>{entry.call_name}: {entry.model}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>{entry.input_tokens.toLocaleString()} input / ${Number(entry.input_cost || 0).toFixed(6)}</span>
                <span>{entry.cached_input_tokens.toLocaleString()} cached / ${Number(entry.cached_input_cost || 0).toFixed(6)}</span>
                <span>{entry.output_tokens.toLocaleString()} output / ${Number(entry.output_cost || 0).toFixed(6)}</span>
                <span>Total: ${Number(entry.total_cost || 0).toFixed(6)}</span>
              </div>
            </div>
          ))}
          <p className="mt-2 font-semibold">
            Full runtime rows bound after planning: {scene.records.length}. Generated HTML/TSX tokens: 0.
          </p>
        </details>
      </header>

      <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {hasTimeline ? (
            <>
              <div className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                <Timer className="h-3.5 w-3.5" />
                <select
                  value={selectedFrame}
                  onChange={(event) => {
                    setPlaying(false);
                    setSelectedFrame(event.target.value);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 outline-none"
                >
                  {frames.map((frame) => <option key={frame} value={frame}>{frame}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setPlaying((current) => !current)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setSelectedFrame(frames[0]);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-600"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </>
          ) : null}
          {blueprint.controls.includes('layer_toggle') && blueprint.layers.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              {blueprint.layers.map((layer) => (
                <label key={layer.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  <input
                    type="checkbox"
                    checked={Boolean(visibleLayers[layer.id])}
                    onChange={(event) => setVisibleLayers((current) => ({ ...current, [layer.id]: event.target.checked }))}
                    className="accent-emerald-600"
                  />
                  {layer.label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {blueprint.supporting_panels.includes('metric_summary') ? (
        <div className="grid shrink-0 grid-cols-2 gap-px border-b border-slate-100 bg-slate-100 md:grid-cols-4">
          <div className="bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Records</p><p className="mt-1 text-lg font-extrabold text-slate-900">{scene.records.length.toLocaleString()}</p></div>
          <div className="bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Metric Range</p><p className="mt-1 text-sm font-extrabold capitalize text-slate-900">{formatMetric(min)} - {formatMetric(max)}</p></div>
          <div className="bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Time Frames</p><p className="mt-1 text-lg font-extrabold text-slate-900">{frames.length || 1}</p></div>
          <div className="bg-white px-5 py-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Buildings</p><p className="mt-1 inline-flex items-center gap-1 text-lg font-extrabold text-slate-900"><Building2 className="h-4 w-4 text-emerald-600" />{output.enrichment_summary.feature_count.toLocaleString()}</p></div>
        </div>
      ) : null}

      <div className="relative min-h-[500px] flex-1">
        <FullMapBasemapOverlay value={basemapMode || 'current'} onChange={onBasemapModeChange} />
        {blueprint.controls.includes('legend') ? (
          <aside className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Metric</p>
            <p className="mt-1 text-xs font-extrabold capitalize text-slate-900">{metricLabel}</p>
            <div
              className="mt-3 h-2 w-44 rounded-full"
              style={{
                background: `linear-gradient(to right, ${(primaryLayer?.encoding.palette || ['#2563eb', '#dc2626']).join(', ')})`,
              }}
            />
            <div className="mt-2 flex w-44 justify-between gap-2 text-[9px] font-bold text-slate-400">
              {legendValues.map((value, index) => (
                <span key={`${value}-${index}`} className={index === 1 ? 'text-center' : index === 2 ? 'text-right' : ''}>
                  {formatMetric(value)}
                </span>
              ))}
            </div>
          </aside>
        ) : null}
        <DeckGL
          controller
          layers={layers}
          initialViewState={{
            latitude: scene.center.lat,
            longitude: scene.center.lng,
            zoom: blueprint.view_mode === '3d' ? 14.2 : 12.5,
            pitch: blueprint.view_mode === '3d' ? 52 : 0,
            bearing: blueprint.view_mode === '3d' ? 24 : 0,
          }}
          getTooltip={({ object }) => {
            const row = object && 'geo_label' in object
              ? object as Module3SceneRecord
              : object ? nearestRecord(object as BuildingFeature, records) : undefined;
            return row
              ? { text: `${row.geo_label}\n${metricLabel}: ${formatMetric(row.metric_value)}${row.time_frame ? `\nPeriod: ${row.time_frame}` : ''}` }
              : null;
          }}
          style={{ position: 'absolute', inset: '0px' }}
        >
          <BaseMap mapLib={import('maplibre-gl')} mapStyle={BASEMAP_OPTIONS[basemap].style} reuseMaps onLoad={notifyLoaded} style={{ width: '100%', height: '100%' }}>
            <NavigationControl position="top-right" />
          </BaseMap>
        </DeckGL>
      </div>

      {blueprint.supporting_panels.includes('ranked_locations') || blueprint.supporting_panels.includes('time_trend') ? (
        <div className="grid shrink-0 gap-px border-t border-slate-100 bg-slate-100 md:grid-cols-2">
          {blueprint.supporting_panels.includes('ranked_locations') ? (
            <section className="bg-white px-5 py-4">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Highest Metric Locations</p>
              <div className="mt-3 space-y-2">
                {rankedLocations.map(([label, value], index) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-semibold text-slate-700">{index + 1}. {label}</span>
                    <span className="font-extrabold text-slate-900">{formatMetric(value)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {blueprint.supporting_panels.includes('time_trend') && timeTrend.length > 0 ? (
            <section className="bg-white px-5 py-4">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Metric By Time Frame</p>
              <div className="mt-3 space-y-2">
                {timeTrend.map(([frame, value]) => (
                  <div key={frame} className="grid grid-cols-[56px_1fr_82px] items-center gap-2 text-[11px]">
                    <span className="font-bold text-slate-500">{frame}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(3, (value / trendMax) * 100)}%` }} />
                    </span>
                    <span className="text-right font-extrabold text-slate-700">{formatMetric(value)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
