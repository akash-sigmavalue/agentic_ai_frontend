'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle, Building2, Loader2, LocateFixed, Maximize2, Minimize2, RefreshCcw } from 'lucide-react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { setOptions as setGoogleMapsOptions, importLibrary as importGoogleLibrary } from '@googlemaps/js-api-loader';
import { fetchThreeDMap } from '@/lib/dashboard/geospatial/sampleMaps';
import type { MarkerData, ThreeDMapRequest, ThreeDMapResponse } from '@/lib/dashboard/geospatial/types';
import type { StyleSpecification } from 'maplibre-gl';

const FLOOR_HEIGHT = 3.0;
const DEFAULT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

 
// Unit Constants (per sq.m.)
const MIN_RATE_SQMT = 65000;
const MAX_RATE_SQMT = 140000;

interface BuildingFeatureProperties {
  height_render?: number | string;
  is_custom?: boolean;
  building_name?: string | null;
  num_floors?: number | string | null;
  floor_rates?: Array<number | null> | null;
  min_rate?: number | string | null;
  max_rate?: number | string | null;
  runtime_has_floor_data?: boolean;
}

type BuildingFeature = Feature<Geometry, BuildingFeatureProperties>;

type RGBA = [number, number, number, number];

interface MarkerTooltipData {
  kind: 'marker';
  name: string;
  lat: number;
  lng: number;
}

interface FloorTooltipData {
  kind: 'floor' | 'building';
  floor: number;
  name: string;
  totalFloors: number;
  baseZ: number;
  rateDisplay: string;
  heightDisplay?: string;
}

type TooltipObject = BuildingFeature | MarkerTooltipData | FloorTooltipData;

interface ThreeDMapViewProps {
  markers?: MarkerData[];
  initialPlaceName?: string;
  initialRadius?: number;
  initialCityForApi?: string;
  initialUseGeocoding?: boolean;
  runtimeBuildings?: Record<string, unknown>[];
  fastMode?: boolean;
  maxBuildings?: number;
  mapStyle?: string | StyleSpecification;
  basemapControls?: React.ReactNode;
  extraDeckLayers?: any[];
  extraMapChildren?: React.ReactNode;
  hideConfigurationPanel?: boolean;
  hideSummaryCards?: boolean;
  mapId?: string;
  mapLabel?: string;
  onInsightDataReady?: (payload: {
    mapId: string;
    mapLabel: string;
    plottedData: Record<string, unknown>;
  } | null) => void;
  overlayTooltip?: (info: {
    object?: unknown;
    layer?: { id?: string } | null;
    [key: string]: unknown;
  }) => { html?: string; text?: string } | null;
}

function rateToColor(normalizedValue: number) {
  if (normalizedValue <= 0.5) {
    const red = 255 * (normalizedValue * 2);
    return [red, 255, 0, 220] as RGBA;
  }

  const green = 255 * (1 - (normalizedValue - 0.5) * 2);
  return [255, green, 0, 220] as RGBA;
}

function getDefaultColor(feature: BuildingFeature) {
  const height = Number(feature.properties?.height_render ?? 10);
  return (height < 12 ? [242, 235, 199, 220] : [228, 62, 102, 220]) as RGBA;
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

function normalizeErrorMessage(message: string) {
  try {
    const parsed = JSON.parse(message);
    if (typeof parsed?.detail === 'string') {
      return parsed.detail;
    }
  } catch {
    return message;
  }

  return message;
}

export default function ThreeDMapView({
  markers = [],
  initialPlaceName,
  initialRadius,
  initialCityForApi,
  initialUseGeocoding,
  runtimeBuildings,
  fastMode,
  maxBuildings,
  mapStyle,
  basemapControls,
  extraDeckLayers = [],
  extraMapChildren,
  hideConfigurationPanel = false,
  hideSummaryCards = false,
  mapId = 'default:3d',
  mapLabel = 'Default 3D Building Map',
  onInsightDataReady,
  overlayTooltip,
}: ThreeDMapViewProps) {
  const [placeName, setPlaceName] = useState(initialPlaceName || markers[0]?.address || markers[0]?.label || 'Vision Flora mall Pimple saudagar Pune, Maharashtra, India');
  const [radius, setRadius] = useState(initialRadius || 450);
  const [useGeocoding, setUseGeocoding] = useState(Boolean(initialUseGeocoding));
  const [cityForApi, setCityForApi] = useState(initialCityForApi || 'Pune');
  const [includeDebugLogs, setIncludeDebugLogs] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ThreeDMapResponse | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: 73.8567,
    latitude: 18.5204,
    zoom: 17.5,
    pitch: 60,
    bearing: 35,
  });
  const [showUnmatched, setShowUnmatched] = useState(true);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Use a ref to read the latest form values so loadMap stays stable
  // and does NOT re-trigger on every keystroke.
  const formRef = useRef({ placeName, radius, useGeocoding, cityForApi, dryRun, includeDebugLogs });

  useEffect(() => {
    formRef.current = { placeName, radius, useGeocoding, cityForApi, dryRun, includeDebugLogs };
  }, [cityForApi, dryRun, includeDebugLogs, placeName, radius, useGeocoding]);

  // Google Places Autocomplete
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    setGoogleMapsOptions({ key: apiKey });

    importGoogleLibrary('places').then(() => {
      const input = searchInputRef.current;
      if (!input) return;

      const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['geocode', 'establishment'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place?.formatted_address) {
          setPlaceName(place.formatted_address);
        } else if (place?.name) {
          setPlaceName(place.name);
        }
      });
    }).catch((err: unknown) => {
      console.warn('Google Places Autocomplete failed to load:', err);
    });
  }, []);

  const loadMap = useCallback(async (payloadOverride?: Partial<ThreeDMapRequest>) => {
    const { placeName: place, radius: rad, useGeocoding: geo, cityForApi: city, dryRun: dry, includeDebugLogs: debug } = formRef.current;
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
    onInsightDataReady?.(null);

    try {
      const payload: ThreeDMapRequest = {
        place_name: trimmedPlace,
        radius_m: safeRadius,
        use_geocoding: geo,
        city_for_api: city || null,
        dry_run: dry,
        include_debug_logs: debug,
        fast_mode: fastMode,
        max_buildings: maxBuildings,
        runtime_buildings: runtimeBuildings,
        ...payloadOverride,
      };

      const response = await fetchThreeDMap(payload);
      setData(response);
      onInsightDataReady?.({
        mapId,
        mapLabel,
        plottedData: {
          location: response.location,
          summary: response.summary,
          markers: response.excel_markers,
          warnings: response.warnings,
        },
      });
      setViewState({
        longitude: response.location.lng,
        latitude: response.location.lat,
        zoom: 17.5,
        pitch: 60,
        bearing: 35,
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load 3D map data';
      setError(normalizeErrorMessage(message));
    } finally {
      setIsLoading(false);
    }
  }, [fastMode, mapId, mapLabel, maxBuildings, onInsightDataReady, runtimeBuildings]);

  // Only load once on mount — subsequent loads happen via the button
  useEffect(() => {
    void loadMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layers = useMemo(() => {
    if (!data) return extraDeckLayers.length > 0 ? [...extraDeckLayers] : [];

    const featureCollection = data.geojson as FeatureCollection<Geometry, BuildingFeatureProperties>;
    const features = featureCollection.features as BuildingFeature[];
    const customFeatures = features.filter((feature) => feature.properties?.is_custom === true);
    const normalFeatures = features.filter((feature) => feature.properties?.is_custom !== true);
    const noFloorCustomFeatures = customFeatures.filter((feature) => feature.properties?.runtime_has_floor_data === false);
    const floorCustomFeatures = customFeatures.filter((feature) => feature.properties?.runtime_has_floor_data !== false);
    const noFloorRates = noFloorCustomFeatures
      .flatMap((feature) => {
        const match = runtimeBuildings?.find((b: any) => b.name === feature.properties?.building_name) as any;
        if (match && typeof match.metric_value === 'number') return [match.metric_value];
        return feature.properties?.floor_rates || [];
      })
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const noFloorMin = noFloorRates.length ? Math.min(...noFloorRates) : 0;
    const noFloorMax = noFloorRates.length ? Math.max(...noFloorRates) : 1;
    const noFloorRange = noFloorMax - noFloorMin || 1;

    const normalLayer = new GeoJsonLayer<BuildingFeatureProperties>({
      id: 'normal-buildings',
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

    const markerLayer = new ScatterplotLayer({
      id: 'excel-markers',
      data: data.excel_markers.map((marker) => ({ ...marker, kind: 'marker' })),
      getPosition: (entry) => [entry.lng, entry.lat],
      getFillColor: [255, 221, 0, 215],
      getRadius: 6,
      radiusMinPixels: 5,
      radiusMaxPixels: 12,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 180],
    });

    const runtimeBuildingLayer = new GeoJsonLayer<BuildingFeatureProperties>({
      id: 'runtime-custom-buildings',
      data: { type: 'FeatureCollection', features: noFloorCustomFeatures },
      extruded: true,
      filled: true,
      stroked: true,
      wireframe: true,
      getLineColor: [0, 0, 0, 210],
      lineWidthMinPixels: 1.5,
      opacity: 1,
      getElevation: (feature) => Number(feature.properties?.height_render ?? 15),
      getFillColor: (feature) => {
        const match = runtimeBuildings?.find((b: any) => b.name === feature.properties?.building_name) as any;
        let metric = match && typeof match.metric_value === 'number' ? match.metric_value : undefined;
        if (metric === undefined) {
          metric = feature.properties?.floor_rates?.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
        }
        if (metric == null) return [148, 163, 184, 230];
        const normalized = Math.max(0, Math.min(1, (metric - noFloorMin) / noFloorRange));
        return rateToColor(normalized);
      },
      updateTriggers: {
        getFillColor: [runtimeBuildings],
      },
      transitions: {
        getFillColor: { duration: 700 },
      },
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 150],
      material: { ambient: 0.35, diffuse: 0.75, shininess: 15, specularColor: [180, 180, 180] },
    });

    const floorLayers = floorCustomFeatures.flatMap((building) => {
      const name = String(building.properties?.building_name || 'Custom Building');
      const totalFloors = Number(building.properties?.num_floors || 0);
      const match = runtimeBuildings?.find((b: any) => b.name === name) as any;
      const floorRates = (match?.floor_rates || building.properties?.floor_rates) as Array<number | null> | undefined;
      const minRate = Number(building.properties?.min_rate || 0);
      const maxRate = Number(building.properties?.max_rate || 1);

      if (!totalFloors || !floorRates) {
        return [];
      }

      return Array.from({ length: totalFloors }, (_, index) => {
        const floor = index + 1;
        const rate = floorRates[index];
        const range = MAX_RATE_SQMT - MIN_RATE_SQMT;
        const normalizedRate = rate == null ? 0 : Math.max(0, Math.min(1, (rate - MIN_RATE_SQMT) / range));
        const fillColor: [number, number, number, number] =
          rate == null ? [255, 255, 255, 220] : rateToColor(normalizedRate);
        const baseZ = index * FLOOR_HEIGHT;
        const polygon = getPolygonCoords(building, baseZ);

        return new PolygonLayer({
          id: `${name.replace(/[^a-zA-Z0-9]/g, '_')}_floor_${floor}`,
          data: polygon.length
            ? [
                {
                  kind: 'floor',
                  polygon,
                  floor,
                  name,
                  totalFloors,
                  baseZ,
                  rateDisplay: rate == null ? 'N/A' : `Rs.${rate.toLocaleString()}/sq.m.`,
                },
              ]
            : [],
          getPolygon: (entry) => entry.polygon,
          extruded: true,
          filled: true,
          stroked: true,
          wireframe: true,
          getLineColor: [0, 0, 0, 200],
          lineWidthMinPixels: 1.5,
          opacity: 1,
          getElevation: () => FLOOR_HEIGHT,
          getFillColor: fillColor,
          updateTriggers: {
            getFillColor: [runtimeBuildings],
          },
          transitions: {
            getFillColor: { duration: 700 },
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
    finalLayers.push(runtimeBuildingLayer, markerLayer, ...floorLayers);

    return [...finalLayers, ...extraDeckLayers];
  }, [data, extraDeckLayers, showUnmatched, runtimeBuildings]);

  const tooltip = ({ object }: { object?: TooltipObject }) => {
    if (!object) return null;

    if ('kind' in object && object.kind === 'marker') {
      return {
        html: `<div><strong>Excel Point:</strong> ${object.name}</div><div>Lat: ${object.lat.toFixed(6)}</div><div>Lng: ${object.lng.toFixed(6)}</div>`,
      };
    }

    if ('kind' in object && object.kind === 'building') {
      return {
        html: `<div><strong>${object.name}</strong></div><div>Rate: ${object.rateDisplay}</div><div>Height: ${object.heightDisplay}</div>`,
      };
    }

    if ('kind' in object && object.kind === 'floor') {
      return {
        html: `<div><strong>${object.name}</strong></div><div>Floor: ${object.floor} / ${object.totalFloors}</div><div>Rate: ${object.rateDisplay}/sq.m.</div><div>Height: ${object.baseZ.toFixed(1)}m - ${(object.baseZ + FLOOR_HEIGHT).toFixed(1)}m</div>`,
      };
    }

    if ('properties' in object && object.properties) {
      if (object.properties.is_custom && object.properties.runtime_has_floor_data === false) {
        const match = runtimeBuildings?.find((b: any) => b.name === object.properties?.building_name) as any;
        const metric = match && typeof match.metric_value === 'number' 
          ? match.metric_value 
          : object.properties.floor_rates?.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
        return {
          html: `<div><strong>${object.properties.building_name || 'Runtime Building'}</strong></div><div>Rate: ${metric == null ? 'N/A' : `Rs.${metric.toLocaleString()}/sq.m.`}</div><div>Height: ${Number(object.properties.height_render || 15).toFixed(1)}m</div>`,
        };
      }
      return {
        html: `<div><strong>Overture Building</strong></div><div>Height: ${Number(object.properties.height_render || 0).toFixed(1)}m</div>`,
      };
    }

    return null;
  };

  return (
    <div className={`flex flex-col bg-slate-50 overflow-y-auto overflow-x-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen' : 'h-full'}`}>
      {!hideConfigurationPanel ? (
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
                  if (raw === '') return; // don't send invalid 0 on delete
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
              className="min-w-[160px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#525ceb] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#434ce0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Load 3D map
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
      ) : null}

      {!hideSummaryCards ? (
        <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid-cols-4">
          <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Overture buildings</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{data?.summary.overture_building_count ?? '...'}</p>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Custom matches</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {data ? data.summary.exact_matches + data.summary.snapped_matches : '...'}
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Selected  markers</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{data?.summary.visible_excel_markers ?? '...'}</p>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Corrections</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {data?.summary.corrected_buildings ?? data?.summary.dry_run_estimated_corrections ?? '...'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="relative min-h-[400px] flex-[1.5] shrink-0">
        {basemapControls}
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
            id="unmatched-toggle" 
            checked={showUnmatched} 
            onChange={(e) => setShowUnmatched(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#525ceb]"
          />
          <label htmlFor="unmatched-toggle" className="text-[10px] font-bold uppercase tracking-widest text-slate-700 cursor-pointer">
            Unmatched building
          </label>
        </div>
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#525ceb]" />
            <p className="text-sm font-semibold">Loading 3D building data...</p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Unable to load 3D map</h3>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">{error}</p>
          </div>
        ) : data ? (
          <DeckGL
            controller
            layers={layers}
            viewState={viewState}
            onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState as typeof viewState)}
            getTooltip={(info) => overlayTooltip?.(info) || tooltip(info)}
            style={{ position: 'absolute', inset: '0px' }}
          >
            <Map mapLib={import('maplibre-gl')} mapStyle={mapStyle || DEFAULT_STYLE} reuseMaps style={{ width: '100%', height: '100%' }}>
              <NavigationControl position="top-right" />
              {extraMapChildren}
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

            {data.warnings.length ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900">
                  Notice
                </p>
                <ul className="mt-2 space-y-1 text-[11px] font-medium text-amber-900">
                  {data.warnings.slice(0, 2).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {data.summary.visible_excel_markers === 0 && data.summary.total_excel_buildings > 0 ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
               {/*<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Hint
                </p>
                <p className="mt-2 text-[11px] font-medium text-slate-700">
                  No Excel points fell within the selected radius. Try enabling <span className="font-bold">Correct coordinates</span> or increase the radius.
                </p>*/} 
              </div>
            ) : null}
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
