'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle, Building2, Loader2, LocateFixed, Maximize2, Minimize2, Pause, Play, RefreshCcw, RotateCcw } from 'lucide-react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { setOptions as setGoogleMapsOptions, importLibrary as importGoogleLibrary } from '@googlemaps/js-api-loader';
import { fetchThreeDMapTimelapse } from '@/lib/dashboard/geospatial/sampleMaps';
import type { FloorRateCell, MarkerData, ThreeDMapTimelapseRequest, ThreeDMapTimelapseResponse } from '@/lib/dashboard/geospatial/types';

const FLOOR_HEIGHT = 3.0;
const DEFAULT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const ANIMATION_MS = 900;
const MIN_RATE_SQMT = 65000;
const MAX_RATE_SQMT = 140000;

interface BuildingFeatureProperties {
  height_render?: number | string;
  is_custom?: boolean;
  building_name?: string | null;
  num_floors?: number | string | null;
  floor_rates_by_date?: Array<Array<number | null> | null> | null;
  floor_rates_enriched?: Array<Array<FloorRateCell> | null> | null;
}

interface FloorLayerRow {
  kind: 'floor';
  polygon: [number, number, number][];
  floor: number;
  name: string;
  totalFloors: number;
  baseZ: number;
  rateDisplay: string;
  dateLabel: string;
  fillColor: [number, number, number, number];
  confidence: number;
  source: string;
  note: string;
}

interface MarkerLayerRow {
  kind: 'marker';
  name: string;
  lat: number;
  lng: number;
}

type BuildingFeature = Feature<Geometry, BuildingFeatureProperties>;
type TooltipObject = BuildingFeature | FloorLayerRow | MarkerLayerRow;

interface ThreeDMapTimelapseViewProps {
  markers?: MarkerData[];
}

function rateToColor(normalizedValue: number): [number, number, number, number] {
  if (normalizedValue <= 0.5) {
    const red = Math.round(255 * (normalizedValue * 2));
    return [red, 255, 0, 220];
  }
  const green = Math.round(255 * (1 - (normalizedValue - 0.5) * 2));
  return [255, green, 0, 220];
}

function getDefaultColor(feature: BuildingFeature): [number, number, number, number] {
  const height = Number(feature.properties?.height_render ?? 10);
  return height < 12 ? [242, 235, 199, 220] : [228, 62, 102, 220];
}

function getPolygonCoords(feature: BuildingFeature, baseZ = 0): [number, number, number][] {
  const geometry = feature.geometry;
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0].map(([lng, lat]) => [lng, lat, baseZ]);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates[0][0].map(([lng, lat]) => [lng, lat, baseZ]);
  }
  return [];
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

export default function ThreeDMapTimelapseView({ markers = [] }: ThreeDMapTimelapseViewProps) {
  const [placeName, setPlaceName] = useState(
    markers[0]?.address || markers[0]?.label || 'Vision Flora mall Pimple saudagar Pune, Maharashtra, India'
  );
  const [radius, setRadius] = useState(450);
  const [useGeocoding, setUseGeocoding] = useState(false);
  const [cityForApi, setCityForApi] = useState('Pune');
  const [dryRun, setDryRun] = useState(false);
  const [includeDebugLogs, setIncludeDebugLogs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ThreeDMapTimelapseResponse | null>(null);
  const [dateIndex, setDateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: 73.8567,
    latitude: 18.5204,
    zoom: 17.5,
    pitch: 60,
    bearing: 35,
  });
  const [showUnmatched, setShowUnmatched] = useState(true);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef({ placeName, radius, useGeocoding, cityForApi, dryRun, includeDebugLogs });
  formRef.current = { placeName, radius, useGeocoding, cityForApi, dryRun, includeDebugLogs };

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
    const {
      placeName: place,
      radius: rad,
      useGeocoding: geo,
      cityForApi: city,
      dryRun: dry,
      includeDebugLogs: debug,
    } = formRef.current;
    const trimmedPlace = place.trim();
    const safeRadius = Number.isFinite(rad) ? Math.round(rad) : 1000;

    if (trimmedPlace.length < 2) {
      setError('Search location is required (min 2 characters).');
      setIsLoading(false);
      return;
    }
    if (safeRadius < 150 || safeRadius > 1000) {
      setError('Radius must be between 150 and 1000 meters.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: ThreeDMapTimelapseRequest = {
        place_name: trimmedPlace,
        radius_m: safeRadius,
        use_geocoding: geo,
        city_for_api: city || null,
        dry_run: dry,
        include_debug_logs: debug,
      };
      const response = await fetchThreeDMapTimelapse(payload);
      setData(response);
      setDateIndex(0);
      setIsPlaying(false);
      setViewState({
        longitude: response.location.lng,
        latitude: response.location.lat,
        zoom: 17.5,
        pitch: 60,
        bearing: 35,
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load 3D timelapse map data';
      setError(normalizeErrorMessage(message));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMap();
  }, [loadMap]);

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

  const layers = useMemo(() => {
    if (!data) return [];
    const dates = data.dates;
    const currentDateLabel = dates[dateIndex] ?? 'N/A';
    const globalMin = data.summary.global_min_rate;
    const globalMax = data.summary.global_max_rate;
    const rateRange = globalMax - globalMin || 1;

    const featureCollection = data.geojson as FeatureCollection<Geometry, BuildingFeatureProperties>;
    const features = featureCollection.features as BuildingFeature[];
    const customFeatures = features.filter((f) => f.properties?.is_custom === true);
    const normalFeatures = features.filter((f) => f.properties?.is_custom !== true);

    const normalLayer = new GeoJsonLayer<BuildingFeatureProperties>({
      id: 'timelapse-normal-buildings',
      data: { type: 'FeatureCollection', features: normalFeatures },
      extruded: true,
      filled: true,
      stroked: true,
      wireframe: true,
      getLineColor: [160, 40, 70, 255],
      lineWidthMinPixels: 1,
      opacity: 1,
      getElevation: (feature) => Number(feature.properties?.height_render ?? 10),
      getFillColor: (feature) => getDefaultColor(feature as BuildingFeature),
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 60],
      material: { ambient: 0.4, diffuse: 0.8, shininess: 0, specularColor: [0, 0, 0] },
    });

    const markerLayer = new ScatterplotLayer<MarkerLayerRow>({
      id: 'timelapse-excel-markers',
      data: data.excel_markers.map((m) => ({ ...m, kind: 'marker' })),
      getPosition: (entry) => [entry.lng, entry.lat],
      getFillColor: [255, 221, 0, 215],
      getRadius: 6,
      radiusMinPixels: 5,
      radiusMaxPixels: 12,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 180],
    });

    const floorLayers = customFeatures.flatMap((building) => {
      const name = String(building.properties?.building_name || 'Custom Building');
      const totalFloors = Number(building.properties?.num_floors || 0);
      const floorRatesByDate = building.properties?.floor_rates_by_date;
      const floorRatesEnriched = building.properties?.floor_rates_enriched;
      if (!totalFloors || !floorRatesByDate?.length) return [];

      // Per-building rate range for color normalization (makes floors distinguishable)
      const bldgMin = Number(building.properties?.min_rate ?? globalMin);
      const bldgMax = Number(building.properties?.max_rate ?? globalMax);
      const bldgRange = bldgMax - bldgMin || 1;

      return Array.from({ length: totalFloors }, (_, idx) => {
        const floor = idx + 1;
        const baseZ = idx * FLOOR_HEIGHT;
        const polygon = getPolygonCoords(building, baseZ);

        // Read enriched cell if available, otherwise fall back to flat rate
        const enrichedRow = floorRatesEnriched?.[dateIndex];
        const enrichedCell: FloorRateCell | null = Array.isArray(enrichedRow) ? enrichedRow[idx] ?? null : null;
        const flatRates = floorRatesByDate[dateIndex];
        const rate = enrichedCell?.rate ?? (Array.isArray(flatRates) ? flatRates[idx] : null);
        const confidence = enrichedCell?.confidence ?? (rate != null ? 1.0 : 0.0);
        const source = enrichedCell?.source ?? (rate != null ? 'actual' : 'no_data');
        const note = enrichedCell?.note ?? '';

        const normalizedRate = rate == null ? 0 : Math.max(0, Math.min(1, (Number(rate) - MIN_RATE_SQMT) / (MAX_RATE_SQMT - MIN_RATE_SQMT)));

        // Map confidence to fill color opacity
        let fillColor: [number, number, number, number];
        if (source === 'no_data' || rate == null) {
          // Transparent fill, outline only
          fillColor = [200, 200, 200, 0];
        } else {
          const baseColor = rateToColor(Math.max(0, Math.min(1, normalizedRate)));
          // Scale alpha by confidence (min 0.45 for low confidence, up to full for actual)
          const alpha = confidence >= 0.85 ? baseColor[3] : Math.max(100, Math.round(baseColor[3] * Math.max(0.45, confidence)));
          fillColor = [baseColor[0], baseColor[1], baseColor[2], alpha];
        }

        return new PolygonLayer<FloorLayerRow>({
          id: `${name.replace(/[^a-zA-Z0-9]/g, '_')}_tl_floor_${floor}`,
          data: polygon.length
            ? [
                {
                  kind: 'floor',
                  polygon,
                  floor,
                  name,
                  totalFloors,
                  baseZ,
                  rateDisplay: rate == null ? '?' : `₹${Number(rate).toLocaleString()}/sq.m.`,
                  dateLabel: currentDateLabel,
                  fillColor,
                  confidence,
                  source,
                  note,
                },
              ]
            : [],
          getPolygon: (entry) => entry.polygon,
          extruded: true,
          filled: true,
          stroked: true,
          wireframe: true,
          getLineColor: source === 'no_data' ? [150, 150, 150, 180] : [0, 0, 0, 200],
          lineWidthMinPixels: 1.5,
          getElevation: () => FLOOR_HEIGHT,
          getFillColor: (entry) => entry.fillColor,
          updateTriggers: {
            getFillColor: [dateIndex],
          },
          transitions: {
            getFillColor: {
              duration: 700,
            },
          },
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 150],
          material: { ambient: 0.3, diffuse: 0.7, shininess: 20, specularColor: [200, 200, 200] },
        });
      });
    });

    const finalLayers = [];
    if (showUnmatched) finalLayers.push(normalLayer);
    finalLayers.push(markerLayer, ...floorLayers);

    return finalLayers;
  }, [data, dateIndex, showUnmatched]);

  const tooltip = ({ object }: { object?: TooltipObject }) => {
    if (!object) return null;
    if ('kind' in object && object.kind === 'marker') {
      return {
        html: `<div><strong>Excel Point:</strong> ${object.name}</div><div>Lat: ${object.lat.toFixed(6)}</div><div>Lng: ${object.lng.toFixed(6)}</div>`,
      };
    }
    if ('kind' in object && object.kind === 'floor') {
      const sourceLabel = object.source === 'actual' ? '' : `<div style="color:#888;font-size:11px">Source: ${object.source} (${Math.round(object.confidence * 100)}%)</div>`;
      const noteLabel = object.note ? `<div style="color:#aaa;font-size:10px">${object.note}</div>` : '';
      return {
        html: `<div><strong>${object.name}</strong></div><div>Floor: ${object.floor} / ${object.totalFloors}</div><div>Rate: ${object.rateDisplay}</div><div>Date: ${object.dateLabel}</div>${sourceLabel}${noteLabel}`,
      };
    }
    if ('properties' in object && object.properties) {
      return {
        html: `<div><strong>Overture Building</strong></div><div>Height: ${Number(object.properties.height_render || 0).toFixed(1)}m</div>`,
      };
    }
    return null;
  };

  const currentDateLabel = data?.dates[dateIndex] ?? 'No date';

  return (
    <div className={`flex flex-col bg-slate-50 overflow-y-auto overflow-x-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen' : 'h-full'}`}>
      <div className="border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[260px] flex-col gap-2 flex-[2]">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Search location</span>
            <input
              ref={searchInputRef}
              value={placeName}
              onChange={(event) => setPlaceName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              placeholder="Pune, Maharashtra, India"
            />
          </label>

          <label className="flex min-w-[170px] flex-col gap-2 flex-[1]">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Radius (m)</span>
            <input
              type="number"
              min={150}
              max={1000}
              step={50}
              value={radius}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === '') return;
                setRadius(Number(raw));
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
            />
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 min-w-[190px]">
            <input type="checkbox" checked={useGeocoding} onChange={(event) => setUseGeocoding(event.target.checked)} />
            Correct coordinates
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 min-w-[120px]">
            <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
            Dry run
          </label>

          <button
            onClick={() => void loadMap()}
            disabled={isLoading || !placeName.trim()}
            className="min-w-[180px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#525ceb] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#434ce0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Load timelapse map
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">City hint</span>
            <input
              value={cityForApi}
              onChange={(event) => setCityForApi(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              placeholder="Pune"
            />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={includeDebugLogs}
              onChange={(event) => setIncludeDebugLogs(event.target.checked)}
            />
            Include debug logs
          </label>
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid-cols-5">
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Overture buildings</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{data?.summary.overture_building_count ?? '...'}</p>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Time steps</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{data?.summary.time_steps ?? '...'}</p>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Current date</p>
          <p className="mt-2 text-lg font-extrabold text-slate-900">{currentDateLabel}</p>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Analysis Scale (sq.m.)</p>
          <p className="mt-2 text-lg font-extrabold text-slate-900">
            {data ? `₹${MIN_RATE_SQMT.toLocaleString()} - ₹${MAX_RATE_SQMT.toLocaleString()}` : '...'}
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Corrections</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {data
              ? data.summary.corrected_buildings ?? data.summary.dry_run_estimated_corrections ?? 0
              : '...'}
          </p>
        </div>
      </div>

      {data?.dates.length ? (
        <div className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#525ceb] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#434ce0]"
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
              className="h-2 min-w-[220px] flex-1 cursor-pointer accent-[#525ceb]"
            />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{currentDateLabel}</span>
          </div>
        </div>
      ) : null}

      <div className="relative min-h-[400px] flex-[1.5] shrink-0">
        <button
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 border border-slate-200 shadow-lg backdrop-blur hover:bg-white transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4 text-slate-700" /> : <Maximize2 className="h-4 w-4 text-slate-700" />}
        </button>
 
        <div className="absolute top-14 right-3 z-20 flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200 shadow-lg backdrop-blur px-3 py-2 hover:bg-white transition-colors cursor-pointer select-none">
          <input 
            type="checkbox" 
            id="unmatched-toggle-timelapse" 
            checked={showUnmatched} 
            onChange={(e) => setShowUnmatched(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#525ceb]"
          />
          <label htmlFor="unmatched-toggle-timelapse" className="text-[10px] font-bold uppercase tracking-widest text-slate-700 cursor-pointer">
            Unmatched building
          </label>
        </div>
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#525ceb]" />
            <p className="text-sm font-semibold">Loading 3D timelapse data...</p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Unable to load 3D timelapse map</h3>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">{error}</p>
          </div>
        ) : data ? (
          <DeckGL
            controller
            layers={layers}
            viewState={viewState}
            onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState as typeof viewState)}
            getTooltip={tooltip}
            style={{ position: 'absolute', inset: '0px' }}
          >
            <Map mapLib={import('maplibre-gl')} mapStyle={DEFAULT_STYLE} reuseMaps style={{ width: '100%', height: '100%' }}>
              <NavigationControl position="top-right" />
            </Map>
          </DeckGL>
        ) : null}

        {data ? (
          <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <LocateFixed className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Location</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{data.location.formatted_address}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {data.summary.overture_building_count} buildings
              </span>
              <span>{data.summary.visible_excel_markers} markers</span>
            </div>
          </div>
        ) : null}
      </div>

      {data?.warnings.length || data?.debug_logs.length ? (
        <div className="border-t border-slate-200 bg-white px-5 py-4">
          {data.warnings.length ? (
            <details className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <summary className="cursor-pointer text-sm font-bold text-amber-900">
                Warnings ({data.warnings.length})
              </summary>
              <ul className="mt-3 space-y-2 text-sm text-amber-900">
                {data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {data.debug_logs.length ? (
            <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-900">
                Debug logs ({data.debug_logs.length})
              </summary>
              <ul className="mt-3 max-h-40 space-y-2 overflow-auto text-sm text-slate-600">
                {data.debug_logs.map((log, index) => (
                  <li key={`${log}-${index}`}>{log}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
