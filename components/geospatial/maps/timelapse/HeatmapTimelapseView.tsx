'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle, Building2, Loader2, LocateFixed, Maximize2, Minimize2, Pause, Play, RefreshCcw, RotateCcw } from 'lucide-react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { setOptions as setGoogleMapsOptions, importLibrary as importGoogleLibrary } from '@googlemaps/js-api-loader';
import { fetchHeatmapTimelapse } from '@/lib/dashboard/geospatial/sampleMaps';
import { HeatmapTimelapseRequest, HeatmapTimelapseResponse } from '@/lib/dashboard/geospatial/types';
import type { StyleSpecification } from 'maplibre-gl';

const DEFAULT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export interface RuntimeHeatmapHub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rates: number[];
  rawByFrame: Record<string, Record<string, unknown>>;
}

interface HeatmapTimelapseViewProps {
  initialPlaceName?: string;
  initialRadius?: number;
  initialCityForApi?: string;
  focusPoints?: Array<{ name?: string | null; lat: number; lng: number }>;
  fastMode?: boolean;
  maxBuildingsPerLocation?: number;
  maxTotalBuildings?: number;
  runtimeHubs?: RuntimeHeatmapHub[];
  runtimeDates?: string[];
  metricLabel?: string;
  mapStyle?: string | StyleSpecification;
  basemapControls?: React.ReactNode;
  autoLoad?: boolean;
  onInsightDataReady?: (payload: {
    mapId: string;
    mapLabel: string;
    plottedData: Record<string, unknown>;
  } | null) => void;
  extraDeckLayers?: any[];
  overlayTooltip?: (info: {
    object?: unknown;
    layer?: { id?: string } | null;
    [key: string]: unknown;
  }) => { html?: string; text?: string } | null;
}

interface HeatmapFeatureProperties {
  height_render?: number | string;
  interpolated_rates?: number[];
  runtime_metric_source?: string;
  [key: string]: unknown;
}

type HeatmapFeature = Feature<Geometry, HeatmapFeatureProperties>;
type TooltipObject = RuntimeHeatmapHub | HeatmapFeature;

function getFeatureRing(feature: HeatmapFeature): number[][] | undefined {
  const geometry = feature.geometry;
  if (geometry.type === 'Polygon') return geometry.coordinates[0] as number[][];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates[0]?.[0] as number[][] | undefined;
  return undefined;
}

function normalizeErrorMessage(message: string): string {
  try {
    const parsed = JSON.parse(message);
    if (typeof parsed?.detail === 'string') return parsed.detail;
  } catch {
    return message;
  }
  return message;
}

const HEATMAP_COLORS = [
  [0, 80, 255],     // Deep Blue
  [0, 200, 255],    // Light Blue
  [0, 220, 100],    // Green
  [255, 220, 0],    // Yellow
  [255, 100, 0],    // Orange
  [220, 0, 0]       // Red
];

function interpolateColor(color1: number[], color2: number[], factor: number) {
  const result = color1.slice();
  for (let i = 0; i < 3; i++) {
    result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
  }
  return result;
}

function getHeatmapColor(value: number): [number, number, number, number] {
  value = Math.max(0, Math.min(1, value));
  
  if (value >= 1) return [HEATMAP_COLORS[HEATMAP_COLORS.length - 1][0], HEATMAP_COLORS[HEATMAP_COLORS.length - 1][1], HEATMAP_COLORS[HEATMAP_COLORS.length - 1][2], 255];
  if (value <= 0) return [HEATMAP_COLORS[0][0], HEATMAP_COLORS[0][1], HEATMAP_COLORS[0][2], 255];
  
  const scaled = value * (HEATMAP_COLORS.length - 1);
  const index = Math.floor(scaled);
  const factor = scaled - index;
  
  const color = interpolateColor(HEATMAP_COLORS[index], HEATMAP_COLORS[index + 1], factor);
  return [color[0], color[1], color[2], 255];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateRuntimeIdw(
  targetLat: number,
  targetLng: number,
  hubs: RuntimeHeatmapHub[],
  dateIndex: number,
): number {
  let numerator = 0;
  let denominator = 0;
  for (const hub of hubs) {
    const value = hub.rates[dateIndex];
    if (!Number.isFinite(value) || value <= 0) continue;
    const distance = haversineKm(targetLat, targetLng, hub.lat, hub.lng);
    if (distance < 0.01) return value;
    const weight = 1 / distance ** 2;
    numerator += weight * value;
    denominator += weight;
  }
  return denominator ? numerator / denominator : 0;
}

function applyRuntimeHubs(
  response: HeatmapTimelapseResponse,
  runtimeHubs: RuntimeHeatmapHub[],
  runtimeDates: string[],
): HeatmapTimelapseResponse {
  if (runtimeHubs.length === 0 || runtimeDates.length === 0) return response;

  const baseGeojson = response.geojson as unknown as FeatureCollection<Geometry, HeatmapFeatureProperties>;
  const features = (Array.isArray(baseGeojson.features) ? baseGeojson.features : []) as HeatmapFeature[];
  const geojson: FeatureCollection<Geometry, HeatmapFeatureProperties> = {
    ...baseGeojson,
    features: features.map((feature) => {
      const coordinates = getFeatureRing(feature);
      if (!Array.isArray(coordinates) || coordinates.length === 0) return feature;

      const lng = coordinates.reduce((sum: number, coord: number[]) => sum + Number(coord[0] || 0), 0) / coordinates.length;
      const lat = coordinates.reduce((sum: number, coord: number[]) => sum + Number(coord[1] || 0), 0) / coordinates.length;
      const interpolatedRates = runtimeDates.map((_, index) => calculateRuntimeIdw(lat, lng, runtimeHubs, index));

      return {
        ...feature,
        properties: {
          ...(feature.properties || {}),
          interpolated_rates: interpolatedRates,
          runtime_metric_source: 'module_2_output',
        },
      };
    }),
  };

  const allRates = runtimeHubs.flatMap((hub) => hub.rates).filter((value) => Number.isFinite(value) && value > 0);
  return {
    ...response,
    dates: runtimeDates,
    geojson: geojson as unknown as HeatmapTimelapseResponse['geojson'],
    hubs: runtimeHubs.map((hub) => ({
      name: hub.name,
      lat: hub.lat,
      lng: hub.lng,
      rates: hub.rates,
    })),
    summary: {
      ...response.summary,
      global_min_rate: allRates.length ? Math.min(...allRates) : response.summary.global_min_rate,
      global_max_rate: allRates.length ? Math.max(...allRates) : response.summary.global_max_rate,
    },
  };
}

function getRuntimeTooltipRows(raw: Record<string, unknown> | undefined) {
  if (!raw) return '';
  const tooltipFields =
    typeof raw.tooltip_data === 'object' && raw.tooltip_data !== null
      ? (raw.tooltip_data as Record<string, unknown>).fields
      : undefined;
  const rawFields =
    typeof raw.raw_fields === 'object' && raw.raw_fields !== null
      ? (raw.raw_fields as Record<string, unknown>)
      : undefined;
  const source =
    tooltipFields && typeof tooltipFields === 'object'
      ? (tooltipFields as Record<string, unknown>)
      : rawFields || raw;
  return Object.entries(source)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 8)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('\n');
}

export default function HeatmapTimelapseView({
  initialPlaceName = 'Kalyani Nagar, Pune, Maharashtra, India',
  initialRadius = 500,
  initialCityForApi = 'Pune',
  focusPoints = [],
  fastMode = false,
  maxBuildingsPerLocation,
  maxTotalBuildings,
  runtimeHubs = [],
  runtimeDates = [],
  metricLabel = 'Rate',
  mapStyle,
  basemapControls,
  autoLoad = false,
  onInsightDataReady,
  extraDeckLayers = [],
  overlayTooltip,
}: HeatmapTimelapseViewProps) {
  const [placeName, setPlaceName] = useState(initialPlaceName);
  const [radius, setRadius] = useState(initialRadius);
  const [cityForApi] = useState(initialCityForApi);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HeatmapTimelapseResponse | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [dateIndex, setDateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [viewState, setViewState] = useState({
    longitude: 73.9060,
    latitude: 18.5484,
    zoom: 15,
    pitch: 45,
    bearing: 0,
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    setGoogleMapsOptions({ key: apiKey });
    importGoogleLibrary('places')
      .then(() => {
        const input = searchInputRef.current;
        if (!input) return;
        const autocomplete = new google.maps.places.Autocomplete(input, { types: ['geocode', 'establishment'] });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place?.formatted_address) setPlaceName(place.formatted_address);
          else if (place?.name) setPlaceName(place.name);
        });
      })
      .catch((err: unknown) => {
        console.warn('Google Places Autocomplete failed to load:', err);
      });
  }, []);

  const loadMap = useCallback(async () => {
    const trimmedPlace = placeName.trim();
    const safeRadius = Number.isFinite(radius) ? Math.round(radius) : 500;

    if (trimmedPlace.length < 2) {
      setError('Search location is required (min 2 characters).');
      return;
    }
    if (safeRadius < 150 || safeRadius > 2000) {
      setError('Radius must be between 150 and 2000 meters.');
      return;
    }

    setIsLoading(true);
    setError(null);
    onInsightDataReady?.(null);

    try {
      const payload: HeatmapTimelapseRequest = {
        place_name: trimmedPlace,
        radius_m: safeRadius,
        city_for_api: cityForApi || null,
        focus_points: focusPoints.length > 0 ? focusPoints : undefined,
        fast_mode: fastMode,
        max_buildings_per_location: maxBuildingsPerLocation,
        max_total_buildings: maxTotalBuildings,
      };
      
      const response = await fetchHeatmapTimelapse(payload);
      const runtimeResponse = applyRuntimeHubs(response, runtimeHubs, runtimeDates);
      setData(runtimeResponse);
      onInsightDataReady?.({
        mapId: runtimeHubs.length > 0 ? 'runtime:heatmap-timelapse' : 'default:heatmap-timelapse',
        mapLabel: runtimeHubs.length > 0 ? 'Generated Heatmap Timelapse' : 'Default Heatmap Timelapse',
        plottedData: {
          dates: runtimeResponse.dates,
          hubs: runtimeResponse.hubs,
          summary: runtimeResponse.summary,
          metric_label: metricLabel,
        },
      });
      setDateIndex(0);
      setIsPlaying(false);
      
      // Auto-center map on first hub or feature if available, simplified for phase 2
      if (focusPoints.length > 1) {
        setViewState((prev) => ({
          ...prev,
          longitude: focusPoints.reduce((sum, point) => sum + point.lng, 0) / focusPoints.length,
          latitude: focusPoints.reduce((sum, point) => sum + point.lat, 0) / focusPoints.length,
          zoom: 12.8,
        }));
      } else if (runtimeResponse.hubs && runtimeResponse.hubs.length > 0) {
        setViewState((prev) => ({
          ...prev,
          longitude: runtimeResponse.hubs[0].lng,
          latitude: runtimeResponse.hubs[0].lat,
          zoom: 14.5
        }));
      }

    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load heatmap data';
      setError(normalizeErrorMessage(message));
    } finally {
      setIsLoading(false);
    }
  }, [
    cityForApi,
    fastMode,
    focusPoints,
    maxBuildingsPerLocation,
    maxTotalBuildings,
    placeName,
    radius,
    runtimeDates,
    runtimeHubs,
    metricLabel,
    onInsightDataReady,
  ]);

  useEffect(() => {
    if (!autoLoad) return;
    const timer = window.setTimeout(() => {
      void loadMap();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoLoad, loadMap]);

  const ANIMATION_MS = 900;

  useEffect(() => {
    if (!isPlaying || !data?.dates.length) return;
    const timer = window.setInterval(() => {
      setDateIndex((prev) => {
        if (prev >= data.dates.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, ANIMATION_MS);
    return () => window.clearInterval(timer);
  }, [data?.dates.length, isPlaying]);

  // Per-timestep min/max from interpolated rates — excludes zero (no-data).
  const metricScale = useMemo(() => {
    const min = data?.summary.global_min_rate ?? 0;
    const rawMax = data?.summary.global_max_rate ?? 1;
    return { min, max: rawMax === min ? min + 1 : rawMax };
  }, [data?.summary.global_min_rate, data?.summary.global_max_rate]);

  // Base layer rendering
  const layers = useMemo(() => {
    if (!data || !data.geojson) return extraDeckLayers.length > 0 ? [...extraDeckLayers] : [];

    const buildingLayer = new GeoJsonLayer<HeatmapFeatureProperties>({
      id: 'heatmap-buildings',
      data: data.geojson as unknown as FeatureCollection<Geometry, HeatmapFeatureProperties>,
      extruded: true,
      filled: true,
      stroked: true,
      wireframe: true,
      getLineColor: [100, 100, 100, 100],
      lineWidthMinPixels: 1,
      getElevation: (feature: HeatmapFeature) => Number(feature.properties?.height_render ?? 15),
      
      // Colour based on per-timestep normalised rate
      getFillColor: (feature: HeatmapFeature) => {
        const rates = feature.properties?.interpolated_rates;
        if (!rates || rates.length === 0) return [180, 180, 180, 255];

        const currentRate = rates[dateIndex];
        if (!currentRate || currentRate <= 0) return [180, 180, 180, 255];

        const normalized = (currentRate - metricScale.min) / (metricScale.max - metricScale.min || 1);
        return getHeatmapColor(normalized);
      },
      updateTriggers: {
        getFillColor: [dateIndex, metricScale],
      },
      transitions: {
        getFillColor: { duration: 700 },
      },
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 100],
      material: { ambient: 0.4, diffuse: 0.8, shininess: 0, specularColor: [0, 0, 0] },
    });

    const runtimeHubLayer = new ScatterplotLayer<RuntimeHeatmapHub>({
      id: 'runtime-module2-hubs',
      data: runtimeHubs,
      getPosition: (hub) => [hub.lng, hub.lat],
      getRadius: (hub) => {
        const value = hub.rates[dateIndex] || 0;
        const normalized = (value - metricScale.min) / (metricScale.max - metricScale.min || 1);
        return 45 + Math.max(0, Math.min(1, normalized)) * 95;
      },
      radiusUnits: 'meters',
      getFillColor: (hub) => {
        const value = hub.rates[dateIndex] || 0;
        const normalized = (value - metricScale.min) / (metricScale.max - metricScale.min || 1);
        return getHeatmapColor(normalized);
      },
      getLineColor: [15, 23, 42, 255],
      lineWidthMinPixels: 2,
      stroked: true,
      filled: true,
      opacity: 1,
      pickable: true,
      updateTriggers: {
        getRadius: [dateIndex, metricScale],
        getFillColor: [dateIndex, metricScale],
      },
    });

    const baseLayers = runtimeHubs.length > 0 ? [buildingLayer, runtimeHubLayer] : [buildingLayer];
    return [...baseLayers, ...extraDeckLayers];
  }, [data, dateIndex, extraDeckLayers, metricScale, runtimeHubs]);

  return (
    <div className={`flex flex-col bg-slate-50 overflow-y-auto overflow-x-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen' : 'h-full'}`}>
      
      {/* Header / Form */}
      <div className="border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[260px] flex-col gap-2 flex-[2]">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Search location</span>
            <input
              ref={searchInputRef}
              value={placeName}
              onChange={(event) => setPlaceName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
              placeholder="Kalyani Nagar, Pune"
            />
          </label>

          <label className="flex min-w-[170px] flex-col gap-2 flex-[1]">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Radius (m)</span>
            <input
              type="number"
              min={150}
              max={2000}
              step={100}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
            />
          </label>

          <button
            onClick={() => void loadMap()}
            disabled={isLoading || !placeName.trim()}
            className="min-w-[180px] inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Load Heatmap
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid-cols-4">
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Buildings Found</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{data?.summary.overture_building_count ?? '...'}</p>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Time Steps</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{data?.dates.length ?? '...'}</p>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{metricLabel} Range</p>
          <p className="mt-2 text-lg font-extrabold text-slate-900">
            {data ? `₹${Math.round(metricScale.min).toLocaleString()} - ₹${Math.round(metricScale.max).toLocaleString()}` : '...'}
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Phase</p>
          <p className="mt-2 text-lg font-extrabold text-orange-600">Dynamic Playback</p>
        </div>
      </div>

      {/* Playback Controls */}
      {data?.dates.length ? (
        <div className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-600"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setDateIndex(0);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0, data.dates.length - 1)}
              step={1}
              value={dateIndex}
              onChange={(event) => {
                setIsPlaying(false);
                setDateIndex(Number(event.target.value));
              }}
              className="h-2 min-w-[220px] flex-1 cursor-pointer accent-orange-500"
            />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {data.dates[dateIndex] ?? 'No date'}
            </span>
          </div>
        </div>
      ) : null}

      {/* Map Container */}
      <div className="relative min-h-[1000px] flex-[1.5] shrink-0 [&_.maplibregl-ctrl-top-right]:mt-14">
        <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-2 max-w-full pointer-events-none">
          {basemapControls && (
            <div className="pointer-events-auto h-9">
              {basemapControls}
            </div>
          )}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 border border-slate-200 shadow-lg backdrop-blur hover:bg-white transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-slate-700" /> : <Maximize2 className="h-4 w-4 text-slate-700" />}
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm font-semibold">Loading spatial interpolation data...</p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Unable to load heatmap</h3>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">{error}</p>
          </div>
        ) : data ? (
          <DeckGL
            controller
            layers={layers}
            viewState={viewState}
            onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState as typeof viewState)}
            getTooltip={(info) => {
              const overlay = overlayTooltip?.(info);
              if (overlay) return overlay;

              const { object } = info as { object?: TooltipObject };
              if (!object) return null;
              if ('name' in object && Array.isArray(object.rates)) {
                const hub = object as RuntimeHeatmapHub;
                const frame = data.dates[dateIndex] || runtimeDates[dateIndex] || 'Current';
                const value = hub.rates[dateIndex];
                const rawRows = getRuntimeTooltipRows(hub.rawByFrame[frame]);
                return {
                  text: `${hub.name}\n${frame}\n${metricLabel}: ${
                    Number.isFinite(value) ? Math.round(value).toLocaleString() : 'N/A'
                  }${rawRows ? `\n\n${rawRows}` : ''}`,
                };
              }
              const rates = 'properties' in object ? object.properties?.interpolated_rates : undefined;
              if (Array.isArray(rates)) {
                const value = rates[dateIndex];
                const source = runtimeHubs.length > 0 ? 'Module 2 runtime hubs' : 'Backend heatmap hubs';
                return {
                  text: `Interpolated building value\n${data.dates[dateIndex] || 'Current'}\n${metricLabel}: ${
                    Number.isFinite(value) ? Math.round(value).toLocaleString() : 'N/A'
                  }\nSource: ${source}`,
                };
              }
              return null;
            }}
            style={{ position: 'absolute', inset: '0px' }}
          >
            <Map mapLib={import('maplibre-gl')} mapStyle={mapStyle || DEFAULT_STYLE} reuseMaps style={{ width: '100%', height: '100%' }}>
              <NavigationControl position="top-right" />
            </Map>
          </DeckGL>
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50 text-slate-400">
            <p className="text-sm font-medium">Search for a location to view the 3D heatmap.</p>
          </div>
        )}

        {/* Location Info Overlay */}
        {data && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <LocateFixed className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Location Base</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{placeName}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {data.summary.overture_building_count} extrusions rendered
              </span>
              {runtimeHubs.length > 0 ? (
                <span>{runtimeHubs.length} Module 2 hubs</span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
