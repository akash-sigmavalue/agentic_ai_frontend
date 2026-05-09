'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle, Building2, Loader2, LocateFixed, Maximize2, Minimize2, Pause, Play, RefreshCcw, RotateCcw } from 'lucide-react';
import { setOptions as setGoogleMapsOptions, importLibrary as importGoogleLibrary } from '@googlemaps/js-api-loader';
import { fetchHeatmapTimelapse } from '@/lib/dashboard/geospatial/sampleMaps';
import { HeatmapTimelapseRequest, HeatmapTimelapseResponse } from '@/lib/dashboard/geospatial/types';

const DEFAULT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

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
  
  if (value >= 1) return [HEATMAP_COLORS[HEATMAP_COLORS.length - 1][0], HEATMAP_COLORS[HEATMAP_COLORS.length - 1][1], HEATMAP_COLORS[HEATMAP_COLORS.length - 1][2], 220];
  if (value <= 0) return [HEATMAP_COLORS[0][0], HEATMAP_COLORS[0][1], HEATMAP_COLORS[0][2], 220];
  
  const scaled = value * (HEATMAP_COLORS.length - 1);
  const index = Math.floor(scaled);
  const factor = scaled - index;
  
  const color = interpolateColor(HEATMAP_COLORS[index], HEATMAP_COLORS[index + 1], factor);
  return [color[0], color[1], color[2], 220];
}

export default function HeatmapTimelapseView() {
  const [placeName, setPlaceName] = useState('Kalyani Nagar, Pune, Maharashtra, India');
  const [radius, setRadius] = useState(500);
  const [cityForApi, setCityForApi] = useState('Pune');
  
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
  const formRef = useRef({ placeName, radius, cityForApi });
  formRef.current = { placeName, radius, cityForApi };

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
    const { placeName: place, radius: rad, cityForApi: city } = formRef.current;
    const trimmedPlace = place.trim();
    const safeRadius = Number.isFinite(rad) ? Math.round(rad) : 500;

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

    try {
      const payload: HeatmapTimelapseRequest = {
        place_name: trimmedPlace,
        radius_m: safeRadius,
        city_for_api: city || null,
      };
      
      const response = await fetchHeatmapTimelapse(payload);
      setData(response);
      setDateIndex(0);
      setIsPlaying(false);
      
      // Auto-center map on first hub or feature if available, simplified for phase 2
      if (response.hubs && response.hubs.length > 0) {
        setViewState((prev) => ({
          ...prev,
          longitude: response.hubs[0].lng,
          latitude: response.hubs[0].lat,
          zoom: 14.5
        }));
      }

    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load heatmap data';
      setError(normalizeErrorMessage(message));
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Base layer rendering (Phase 2: just grey buildings)
  const layers = useMemo(() => {
    if (!data || !data.geojson) return [];

    const buildingLayer = new GeoJsonLayer({
      id: 'heatmap-buildings',
      data: data.geojson as any,
      extruded: true,
      filled: true,
      stroked: true,
      wireframe: true,
      getLineColor: [100, 100, 100, 100],
      lineWidthMinPixels: 1,
      // Extrude based on the assigned height
      getElevation: (feature: any) => Number(feature.properties?.height_render ?? 15),
      
      // Map the calculated rate to a color gradient
      getFillColor: (feature: any) => {
        const rates = feature.properties?.interpolated_rates;
        if (!rates || rates.length === 0) return [180, 180, 180, 200]; // Fallback if no data

        // Phase 4: Dynamic coloring based on dateIndex
        const currentRate = rates[dateIndex];
        if (currentRate === undefined || currentRate === null) return [180, 180, 180, 200];

        const min = data.summary.global_min_rate;
        const max = data.summary.global_max_rate;
        const normalized = (currentRate - min) / (max - min || 1);
        
        return getHeatmapColor(normalized);
      },
      updateTriggers: {
        getFillColor: [dateIndex],
      },
      transitions: {
        getFillColor: { duration: 700 },
      },
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 100],
      material: { ambient: 0.4, diffuse: 0.8, shininess: 0, specularColor: [0, 0, 0] },
    });

    return [buildingLayer];
  }, [data, dateIndex]);

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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Analysis Scale (sq.m.)</p>
          <p className="mt-2 text-lg font-extrabold text-slate-900">
            {data ? `₹${data.summary.global_min_rate.toLocaleString()} - ₹${data.summary.global_max_rate.toLocaleString()}` : '...'}
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
      <div className="relative min-h-[500px] flex-[1.5] shrink-0">
        <button
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 border border-slate-200 shadow-lg backdrop-blur hover:bg-white transition-colors"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4 text-slate-700" /> : <Maximize2 className="h-4 w-4 text-slate-700" />}
        </button>

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
            style={{ position: 'absolute', inset: '0px' }}
          >
            <Map mapLib={import('maplibre-gl')} mapStyle={DEFAULT_STYLE} reuseMaps style={{ width: '100%', height: '100%' }}>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
