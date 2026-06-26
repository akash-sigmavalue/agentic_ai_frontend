'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import DeckGL from '@deck.gl/react';
import { ColumnLayer, PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import MapLibreMap, { NavigationControl as MapLibreNavigationControl } from 'react-map-gl/maplibre';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  Camera,
  Database,
  Download,
  Globe,
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
  Module7PlottableEnrichmentCorridor,
  Module7PlottableEnrichmentPoint,
  Module1IntentOutput,
  Module2Output,
  RuntimeGeneratedMapOption,
  VisualizationRetrievalState,
} from './types';
import {
  buildGeneratedMapConfig,
  getModule31Readiness,
} from '@/lib/visualization-agent-module31';
import {
  buildInteractiveSessionKey,
  mergeInteractiveMarkersIntoRecords,
  mergeInteractiveSnapshot,
  plottableCorridorsToInteractiveCorridors,
  plottablePointsToInsightLayers,
  snapshotInteractiveMarkers,
  softCacheToRuntimeOption,
  type InteractiveInsightLayerPoint,
  type InteractiveMapPlottedSnapshot,
  type InteractiveMapViewer,
  type InteractivePlottedDelta,
  type InteractiveMapSoftCache,
} from '@/lib/visualization-agent-interactive-cache';
import ThreeDMapView from '@/components/geospatial/maps/ThreeDMapView';
import ThreeDMapTimelapseView from '@/components/geospatial/maps/ThreeDMapTimelapseView';
import SpatialAnalysisView from '@/components/geospatial/maps/SpatialAnalysisView';
import MapOverlayView from '@/components/geospatial/maps/MapOverlayView';
import { CATEGORY_CONFIG } from '@/components/geospatial/maps/overlays/AmenitiesOverlay';
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
const MapAutoView = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      function AutoView({ center, zoom }: { center: [number, number]; zoom: number }) {
        const map = mod.useMap();

        useEffect(() => {
          map.setView(center, zoom, { animate: true });
        }, [center, map, zoom]);

        return null;
      }

      return AutoView;
    }),
  { ssr: false },
);

const InteractiveDrawControl = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      function DrawControl({
        onPolygonCreated,
        onPolygonDeleted,
      }: {
        onPolygonCreated: (geoJson: any) => void;
        onPolygonDeleted: () => void;
      }) {
        const map = mod.useMap();
        const createdRef = useRef(onPolygonCreated);
        const deletedRef = useRef(onPolygonDeleted);

        createdRef.current = onPolygonCreated;
        deletedRef.current = onPolygonDeleted;

        useEffect(() => {
          const mapWithDraw = map as any;
          if (mapWithDraw.__interactiveDrawControl) {
            return;
          }

          let cancelled = false;
          let drawnItems: any;
          let drawControl: any;
          let onCreated: ((event: any) => void) | null = null;
          let onDeleted: (() => void) | null = null;
          let onEdited: ((event: any) => void) | null = null;

          import('leaflet').then((leaflet: any) => {
            import('leaflet-draw').then(() => {
              if (cancelled || mapWithDraw.__interactiveDrawControl) return;

              drawnItems = new leaflet.FeatureGroup();
              map.addLayer(drawnItems);
              drawControl = new (leaflet.Control as any).Draw({
                position: 'topleft',
                draw: {
                  polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: { color: '#3b82f6', weight: 2, fillOpacity: 0.15 },
                  },
                  polyline: false,
                  rectangle: false,
                  circle: false,
                  marker: false,
                  circlemarker: false,
                },
                edit: {
                  featureGroup: drawnItems,
                  remove: true,
                },
              });
              map.addControl(drawControl);

              onCreated = (event: any) => {
                drawnItems.clearLayers();
                drawnItems.addLayer(event.layer);
                createdRef.current(event.layer.toGeoJSON());
              };
              onDeleted = () => {
                deletedRef.current();
              };
              onEdited = (event: any) => {
                let editedGeoJson: any = null;
                event.layers?.eachLayer?.((layer: any) => {
                  editedGeoJson = layer.toGeoJSON();
                });
                if (editedGeoJson) {
                  createdRef.current(editedGeoJson);
                }
              };
              map.on('draw:created', onCreated);
              map.on('draw:deleted', onDeleted);
              map.on('draw:edited', onEdited);
              mapWithDraw.__interactiveDrawControl = { drawnItems, drawControl, onCreated, onDeleted, onEdited };
            });
          });

          return () => {
            cancelled = true;
            const registered = mapWithDraw.__interactiveDrawControl;
            if (!registered) return;
            if (registered.onCreated) map.off('draw:created', registered.onCreated);
            if (registered.onDeleted) map.off('draw:deleted', registered.onDeleted);
            if (registered.onEdited) map.off('draw:edited', registered.onEdited);
            if (registered.drawControl) map.removeControl(registered.drawControl);
            if (registered.drawnItems) map.removeLayer(registered.drawnItems);
            delete mapWithDraw.__interactiveDrawControl;
          };
        }, [map]);

        return null;
      }

      return DrawControl;
    }),
  { ssr: false },
);

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_INTERACTIVE_AMENITIES = ['railway_stations'];
const MAX_INTERACTIVE_MARKERS = 1500;
const INTERACTIVE_3D_AMENITY_HEIGHT = 52;
const INTERACTIVE_3D_AMENITY_ICON_HEIGHT = INTERACTIVE_3D_AMENITY_HEIGHT + 10;

const CITY_CENTERS: Record<string, [number, number]> = {
  Pune: [18.5204, 73.8567],
  Mumbai: [19.076, 72.8777],
  Thane: [19.2183, 72.9781],
  Hyderabad: [17.385, 78.4867],
  Bengaluru: [12.9716, 77.5946],
  Dubai: [25.2048, 55.2708],
};

const CITY_BBOXES: Record<string, [number, number, number, number]> = {
  Pune: [18.4000, 73.7200, 18.6800, 74.0200],
  Mumbai: [18.8900, 72.7600, 19.3000, 72.9900],
  Thane: [19.1200, 72.9000, 19.3500, 73.1000],
  Hyderabad: [17.2500, 78.3000, 17.6000, 78.6500],
  Bengaluru: [12.8000, 77.4500, 13.1500, 77.8000],
  Dubai: [24.7500, 55.0000, 25.4500, 55.5500],
};

const INTERACTIVE_AMENITY_OPTIONS = [
  { value: 'railway_stations', label: 'Railway Stations', color: CATEGORY_CONFIG.railway_stations.color },
  { value: 'metro_stations', label: 'Metro Stations', color: CATEGORY_CONFIG.metro_stations.color },
  { value: 'bus_stops', label: 'Bus Stops', color: CATEGORY_CONFIG.bus_stops.color },
  { value: 'schools', label: 'Schools', color: CATEGORY_CONFIG.schools.color },
  { value: 'hospitals', label: 'Hospitals', color: CATEGORY_CONFIG.hospitals.color },
  { value: 'gardens', label: 'Gardens', color: CATEGORY_CONFIG.gardens.color },
  { value: 'malls', label: 'Malls', color: CATEGORY_CONFIG.malls.color },
  { value: 'it_parks', label: 'IT Parks', color: CATEGORY_CONFIG.it_parks.color },
  { value: 'restaurants_entertainment', label: 'Restaurants & Entertainment', color: CATEGORY_CONFIG.restaurants_entertainment.color },
  { value: 'police_stations', label: 'Police Stations', color: CATEGORY_CONFIG.police_stations.color },
  { value: 'fire_stations', label: 'Fire Stations', color: CATEGORY_CONFIG.fire_stations.color },
];

const DEFAULT_INTERACTIVE_CORRIDORS = ['highways', 'metro_lines'];
const INTERACTIVE_CORRIDOR_OPTIONS = [
  { value: 'highways', label: 'Highway Corridors', color: '#dc2626' },
  { value: 'metro_lines', label: 'Metro Lines', color: '#059669' },
];

const FONT_AWESOME_UNICODE_BY_CLASS: Record<string, string> = {
  'fa-hospital': '\uf0f8',
  'fa-bus': '\uf207',
  'fa-school': '\uf549',
  'fa-subway': '\uf239',
  'fa-train': '\uf238',
  'fa-leaf': '\uf06c',
  'fa-shopping-bag': '\uf290',
  'fa-building': '\uf1ad',
  'fa-utensils': '\uf2e7',
  'fa-shield-alt': '\uf3ed',
  'fa-fire': '\uf06d',
};

interface InteractiveAmenityPoint {
  name: string;
  lat: number;
  lon: number;
  category: string;
}

interface InteractiveCorridorLine {
  type?: string;
  latlngs: [number, number][];
  name?: string | null;
  ref?: string | null;
  layer: 'highways' | 'metro_lines' | 'insight_roads';
  highway?: string | null;
  railway?: string | null;
}

interface InteractiveMapMarker {
  id: string;
  entity_type: 'project' | 'location';
  name: string;
  lat: number;
  lon: number;
  source_fields?: Record<string, string>;
  raw?: Record<string, unknown>;
}

function createInteractiveAmenityIconHtml(category: string): string {
  const cfg = CATEGORY_CONFIG[category];
  if (!cfg) return '';
  return `<div style="background:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px solid ${cfg.color};box-shadow:0 1px 4px rgba(0,0,0,.15)"><i class="fas ${cfg.icon}" style="color:${cfg.color};font-size:14px"></i></div>`;
}

function createDestinationMarkerIconHtml(color: string): string {
  return `
    <div style="position:relative;width:34px;height:42px;">
      <div style="position:absolute;left:5px;top:1px;width:24px;height:24px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(15,23,42,.35);">
        <div style="position:absolute;left:50%;top:50%;width:8px;height:8px;border-radius:50%;background:white;transform:translate(-50%,-50%);"></div>
      </div>
      <div style="position:absolute;left:12px;top:28px;width:10px;height:4px;border-radius:999px;background:rgba(15,23,42,.22);filter:blur(.5px);"></div>
    </div>
  `;
}

function getDestinationIcon(color: string) {
  if (typeof window === 'undefined') return undefined;
  const L = require('leaflet');
  return L.divIcon({
    html: createDestinationMarkerIconHtml(color),
    className: '',
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -32],
  });
}

function pointInsidePolygon(point: [number, number], polygon: [number, number][]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonLatLngsFromGeoJson(geoJson: any): [number, number][] {
  const coords = geoJson?.geometry?.coordinates?.[0];
  if (!Array.isArray(coords)) return [];
  return coords
    .map((coord: unknown) => {
      if (!Array.isArray(coord) || coord.length < 2) return null;
      const lon = Number(coord[0]);
      const lat = Number(coord[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return [lat, lon] as [number, number];
    })
    .filter(Boolean) as [number, number][];
}

function isLatLngInsidePolygon(lat: number, lon: number, polygon: [number, number][]) {
  if (!polygon.length) return true;
  return pointInsidePolygon([lat, lon], polygon);
}

// ── Shared Intelligence Layer Filter ─────────────────────────────────────
// Shared for both Interactive Map (2D) and Interactive Map 3D.
// Drives selectedAmenities / selectedCorridors via setters; filters
// ── buildCatchmentEntityList ────────────────────────────────────────────────
// Derives a deduplicated list of individual project/location names from the
// plotted rows. Priority: project_field > geo_field > locality_field >
// micromarket_field (if geo_level doesn't specify projects, skip project_field).
function buildCatchmentEntityList(
  rows: Record<string, unknown>[],
  module1: Module1IntentOutput | null,
  module2: Module2Output | null,
): { id: string; name: string }[] {
  if (rows.length === 0) return [];

  const geoLevel = String(
    (module1?.map_output_requirements as Record<string, unknown> | undefined)?.geo_level
    || (module1 as Record<string, unknown> | null)?.geo_level
    || ''
  ).toLowerCase();

  const mapped: Record<string, string | null> = (module2?.mapped_fields as Record<string, string | null>) || {};

  const isProjectLevel =
    geoLevel.includes('project') ||
    (!geoLevel && !!(mapped.project_field));

  // Candidate field names in priority order
  const PROJECT_COLS = [
    mapped.project_field,
    'project_name', 'Project Name', 'ProjectName', 'property_name',
    'project', 'Project',
  ];
  const GEO_COLS = [
    mapped.geo_field, mapped.locality_field, mapped.micromarket_field,
    'location_name', 'Location Name', 'locality', 'Locality',
    'village', 'village_name', 'Village Name', 'micromarket',
    'Micromarket', 'geo_label',
  ];

  const first = rows[0];
  const keys = Object.keys(first);

  const resolveCol = (candidates: (string | null | undefined)[]): string | null => {
    for (const c of candidates) {
      if (c && keys.some(k => k.toLowerCase() === c.toLowerCase())) {
        return keys.find(k => k.toLowerCase() === c.toLowerCase())!;
      }
    }
    return null;
  };

  const nameCol = isProjectLevel
    ? (resolveCol(PROJECT_COLS) ?? resolveCol(GEO_COLS))
    : (resolveCol(GEO_COLS) ?? resolveCol(PROJECT_COLS));

  if (!nameCol) return [];

  const seen = new Set<string>();
  const result: { id: string; name: string }[] = [];
  rows.forEach((row, i) => {
    const name = String(row[nameCol] ?? '').trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    result.push({ id: `entity:${i}`, name });
  });
  return result;
}

// catchment insightLayer categories via onCatchmentCategoriesChange.
function IntelligenceLayerFilter({
  selectedAmenities,
  setSelectedAmenities,
  selectedCorridors,
  setSelectedCorridors,
  catchmentCategories = [],
  catchmentGeoLabel = 'Plotted data',
  onCatchmentCategoriesChange,
  onCatchmentActiveChange,
}: {
  selectedAmenities: string[];
  setSelectedAmenities: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCorridors: string[];
  setSelectedCorridors: React.Dispatch<React.SetStateAction<string[]>>;
  catchmentCategories?: string[];
  catchmentGeoLabel?: string;
  onCatchmentCategoriesChange?: (cats: string[]) => void;
  onCatchmentActiveChange?: (active: boolean) => void;
}) {
  const [selectedIntelLayers, setSelectedIntelLayers] = useState<string[]>(['development_planning', 'catchment_intelligence']);
  const [selectedCatchment, setSelectedCatchment] = useState<string[]>(catchmentCategories);
  const [catchmentSearch, setCatchmentSearch] = useState('');
  const prevCatsKey = useRef('');

  const isDevelopmentActive = selectedIntelLayers.includes('development_planning');
  const isCatchmentActive = selectedIntelLayers.includes('catchment_intelligence');

  // When catchment categories arrive / change, select all by default
  useEffect(() => {
    const key = catchmentCategories.join('|');
    if (key !== prevCatsKey.current) {
      prevCatsKey.current = key;
      setSelectedCatchment(catchmentCategories);
      onCatchmentCategoriesChange?.(catchmentCategories);
    }
  }, [catchmentCategories, onCatchmentCategoriesChange]);

  const toggleIntelLayer = (value: string) => {
    setSelectedIntelLayers(prev => {
      const has = prev.includes(value);
      if (value === 'development_planning') {
        if (has) { setSelectedAmenities([]); setSelectedCorridors([]); }
        else { setSelectedAmenities(DEFAULT_INTERACTIVE_AMENITIES); setSelectedCorridors(DEFAULT_INTERACTIVE_CORRIDORS); }
      }
      if (value === 'catchment_intelligence') {
        const next = has ? [] : catchmentCategories;
        setSelectedCatchment(next);
        onCatchmentCategoriesChange?.(next);
        onCatchmentActiveChange?.(!has);
      }
      return has ? prev.filter(v => v !== value) : [...prev, value];
    });
  };

  const toggleCatchmentItem = (cat: string, checked: boolean) => {
    setSelectedCatchment(prev => {
      const next = checked ? Array.from(new Set([...prev, cat])) : prev.filter(c => c !== cat);
      onCatchmentCategoriesChange?.(next);
      return next;
    });
  };

  const selectAllCatchment = () => {
    setSelectedCatchment(catchmentCategories);
    onCatchmentCategoriesChange?.(catchmentCategories);
  };

  const clearAllCatchment = () => {
    setSelectedCatchment([]);
    onCatchmentCategoriesChange?.([]);
  };

  // Items visible after search filter
  const filteredCatchmentItems = useMemo(() => {
    const q = catchmentSearch.toLowerCase().trim();
    if (!q) return catchmentCategories;
    return catchmentCategories.filter(c => c.toLowerCase().includes(q));
  }, [catchmentCategories, catchmentSearch]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 1 — Intelligence Layer master toggle */}
      <details className="relative rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
        <summary className="cursor-pointer list-none select-none whitespace-nowrap">
          Intelligence Layer ({selectedIntelLayers.length})
        </summary>
        <div className="absolute left-0 top-8 z-[800] min-w-[220px] rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl">
          <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Active intelligence</p>
          {(['development_planning', 'catchment_intelligence'] as const).map(val => (
            <label key={val} className="flex items-center gap-2 py-1 cursor-pointer text-[10px] font-bold normal-case tracking-normal text-slate-700">
              <input type="checkbox" checked={selectedIntelLayers.includes(val)} onChange={() => toggleIntelLayer(val)} className="h-3 w-3 accent-indigo-600" />
              {val === 'development_planning' ? 'Development Planning' : 'Catchment Intelligence'}
            </label>
          ))}
        </div>
      </details>

      {/* 2 — Amenities Overlay (Amenities + Corridors sub-sections) */}
      <details className={`relative rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-opacity ${
        isDevelopmentActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-400 opacity-50 pointer-events-none'
      }`}>
        <summary className="cursor-pointer list-none select-none whitespace-nowrap">
          Amenities Overlay {isDevelopmentActive ? `(${selectedAmenities.length + selectedCorridors.length})` : ''}
        </summary>
        <div className="absolute left-0 top-8 z-[800] min-w-[290px] rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl">
          <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Amenities</p>
          <div className="grid gap-1.5 mb-3">
            {INTERACTIVE_AMENITY_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-[10px] font-bold normal-case tracking-normal text-slate-600">
                <input
                  type="checkbox"
                  checked={selectedAmenities.includes(opt.value)}
                  onChange={e => setSelectedAmenities(prev => e.target.checked ? Array.from(new Set([...prev, opt.value])) : prev.filter(v => v !== opt.value))}
                  className="h-3 w-3 accent-emerald-600"
                />
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: opt.color }} />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-2">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Corridors</p>
            <div className="grid gap-1.5">
              {INTERACTIVE_CORRIDOR_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-[10px] font-bold normal-case tracking-normal text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedCorridors.includes(opt.value)}
                    onChange={e => setSelectedCorridors(prev => e.target.checked ? Array.from(new Set([...prev, opt.value])) : prev.filter(v => v !== opt.value))}
                    className="h-3 w-3 accent-emerald-600"
                  />
                  <span className="inline-block h-2 w-5 rounded-full" style={{ backgroundColor: opt.color }} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </details>

      {/* 3 — Catchment Intelligence — individual named entities */}
      <details className={`relative rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-opacity ${
        isCatchmentActive ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-100 text-slate-400 opacity-50 pointer-events-none'
      }`}>
        <summary className="cursor-pointer list-none select-none whitespace-nowrap">
          Catchment Intelligence {isCatchmentActive && selectedCatchment.length > 0 ? `(${selectedCatchment.length}/${catchmentCategories.length})` : ''}
        </summary>
        <div className="absolute left-0 top-8 z-[800] w-[280px] rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl">
          {/* Header row */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
              {catchmentGeoLabel}
            </p>
            {catchmentCategories.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={selectAllCatchment}
                  className="text-[9px] font-extrabold uppercase tracking-widest text-violet-600 hover:text-violet-800 transition-colors"
                >
                  All
                </button>
                <span className="text-slate-300 hidden">·</span>
                <button
                  onClick={clearAllCatchment}
                  className="hidden text-[9px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  None
                </button>
              </div>
            )}
          </div>

          {catchmentCategories.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic normal-case tracking-normal">
              No entities available yet. Submit a query first.
            </p>
          ) : (
            <>
              {/* Search box */}
              <div className="relative mb-2">
                <input
                  type="text"
                  value={catchmentSearch}
                  onChange={e => setCatchmentSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 normal-case tracking-normal"
                />
                {catchmentSearch && (
                  <button
                    onClick={() => setCatchmentSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Scrollable entity list — max 10 rows visible */}
              <div className="max-h-[220px] overflow-y-auto pr-1 grid gap-1">
                {filteredCatchmentItems.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic normal-case tracking-normal py-1">
                    No matches for &ldquo;{catchmentSearch}&rdquo;
                  </p>
                ) : (
                  filteredCatchmentItems.map(cat => (
                    <label
                      key={cat}
                      className="flex items-center gap-2 cursor-pointer rounded-lg px-1.5 py-1 text-[10px] font-semibold normal-case tracking-normal text-slate-700 hover:bg-violet-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCatchment.includes(cat)}
                        onChange={e => toggleCatchmentItem(cat, e.target.checked)}
                        className="h-3 w-3 flex-shrink-0 accent-violet-600"
                      />
                      <span className="truncate" title={cat}>{cat}</span>
                    </label>
                  ))
                )}
              </div>

              {/* Count summary */}
              <p className="mt-2 border-t border-slate-100 pt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {selectedCatchment.length} of {catchmentCategories.length} selected
                {catchmentSearch && filteredCatchmentItems.length !== catchmentCategories.length
                  ? ` · ${filteredCatchmentItems.length} shown`
                  : ''}
              </p>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function resolveInteractiveSelectedCity({
  selectedLocation,
  resolvedCity,
  rows,
  moduleOutput,
}: {
  selectedLocation: string;
  resolvedCity: string;
  rows: Record<string, unknown>[];
  moduleOutput: Module1IntentOutput | null;
}) {
  const searchStringSelected = selectedLocation ? selectedLocation.toLowerCase() : '';
  const searchStringResolved = resolvedCity ? resolvedCity.toLowerCase() : '';

  const directSelected = Object.keys(CITY_CENTERS).find((candidate) =>
    searchStringSelected.includes(candidate.toLowerCase()),
  );
  if (directSelected) return directSelected;

  const directResolved = Object.keys(CITY_CENTERS).find((candidate) =>
    searchStringResolved.includes(candidate.toLowerCase()),
  );
  if (directResolved) return directResolved;

  if (rows.length > 0) {
    const first = rows[0];
    const latField = findInteractiveField(first, ['latitude', 'lat', 'project_latitude', 'location_latitude', 'subject_lat', 'center_lat', 'y']);
    const lonField = findInteractiveField(first, ['longitude', 'lng', 'lon', 'long', 'project_longitude', 'location_longitude', 'subject_lon', 'center_lng', 'x']);
    if (latField && lonField) {
      let sumLat = 0;
      let sumLon = 0;
      let count = 0;
      for (const row of rows.slice(0, 10)) {
        const lat = toInteractiveNumber(row[latField]);
        const lon = toInteractiveNumber(row[lonField]);
        if (lat != null && lon != null) {
          sumLat += lat;
          sumLon += lon;
          count += 1;
        }
      }
      if (count > 0) {
        const avgLat = sumLat / count;
        const avgLon = sumLon / count;
        const matched = Object.entries(CITY_BBOXES).find(([, bbox]) => {
          const [south, west, north, east] = bbox;
          return avgLat >= south && avgLat <= north && avgLon >= west && avgLon <= east;
        });
        if (matched) return matched[0];
      }
    }
  }

  if (moduleOutput) {
    const intentStr = JSON.stringify(moduleOutput).toLowerCase();
    const matched = Object.keys(CITY_CENTERS).find((candidate) =>
      intentStr.includes(candidate.toLowerCase()),
    );
    if (matched) return matched;
  }

  return 'Pune';
}

function getInteractiveMarkerMetric(marker: InteractiveMapMarker): number | null {
  const raw = marker.raw || {};
  const preferredKeys = [
    'metric_value',
    'metricValue',
    'rate_per_sqft',
    'rate_per_sqt',
    'avg_rate_per_sqft',
    'average_rate',
    'value',
    'price',
  ];
  for (const key of preferredKeys) {
    const direct = raw[key];
    const parsed = toInteractiveNumber(direct);
    if (parsed != null) return parsed;
    const matched = Object.keys(raw).find((candidate) => normalizeInteractiveKey(candidate) === normalizeInteractiveKey(key));
    if (matched) {
      const matchedParsed = toInteractiveNumber(raw[matched]);
      if (matchedParsed != null) return matchedParsed;
    }
  }

  const skipPattern = /(lat|latitude|lon|lng|long|longitude|year|month|date|period|time|floor|id|pin|code)/i;
  for (const [key, value] of Object.entries(raw)) {
    if (skipPattern.test(key)) continue;
    const parsed = toInteractiveNumber(value);
    if (parsed != null) return parsed;
  }
  return null;
}

function buildRuntime3DBuildingsFromInteractiveMarkers(markers: InteractiveMapMarker[], dates: string[]): Runtime3DBuilding[] {
  const safeDates = dates.length > 0 ? dates : ['Current'];
  return markers
    .filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lon))
    .slice(0, 200)
    .map((marker) => {
      const metric = getInteractiveMarkerMetric(marker);
      const floorRates = [metric];
      return {
        name: marker.name,
        lat: marker.lat,
        lng: marker.lon,
        total_floors: 1,
        has_floor_data: false,
        floor_rates: floorRates,
        floor_rates_by_date: safeDates.map(() => floorRates),
        dates: safeDates,
        metric_value: metric,
      };
    });
}

interface InteractiveEntityValidationResponse {
  status: string;
  validation_source: string;
  entity_config: {
    entity_type?: 'project' | 'location' | 'unknown';
    name_field?: string | null;
    latitude_field?: string | null;
    longitude_field?: string | null;
    confidence?: number;
    reason?: string;
  };
  markers: InteractiveMapMarker[];
  marker_count: number;
  input_row_count: number;
  deduped_row_count: number;
  usage?: Record<string, unknown>;
}

type ViewerMapCategory = '2d' | '3d' | 'spatial-analysis' | 'interactive-map' | 'interactive-map-3d';
type GeneratedBasemapMode = 'current' | 'road' | 'satellite' | 'dark';

const DEFAULT_MAP_OPTIONS: { value: ViewerMapCategory; label: string }[] = [
  { value: 'interactive-map-3d', label: 'Interactive Map 3D' },
  { value: 'interactive-map', label: 'Interactive Map' },
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
  'interactive-map': 'Interactive Map',
};

const FAMILY_ACTION_LABEL: Record<GeneratedMapFamily, string> = {
  '2d': '2D Map',
  '3d': '3D Map',
  '3d-timelapse': '3D Timelapse',
  'spatial-analysis': 'Spatial Analysis',
  'heatmap-timelapse': 'Heatmap Timelapse',
  'interactive-map': 'Interactive Map',
};

const VIEWER_FAMILY_LABEL: Record<ViewerMapCategory, string> = {
  '2d': '2D Maps',
  '3d': '3D Maps',
  'spatial-analysis': 'Spatial Analysis',
  'interactive-map': 'Interactive Map',
  'interactive-map-3d': 'Interactive Map 3D',
};

const VIEWER_ACTION_LABEL: Record<ViewerMapCategory, string> = {
  '2d': '2D Map',
  '3d': '3D Map',
  'spatial-analysis': 'Spatial Analysis',
  'interactive-map': 'Interactive Map',
  'interactive-map-3d': 'Interactive Map 3D',
};

const INTERACTIVE_VIEWER_FAMILIES = new Set<ViewerMapCategory>(['interactive-map', 'interactive-map-3d']);

const SAMPLE_OPTION_VALUE = 'sample';
const SHOW_VISUALIZATION_DEFAULT_MAPS = false;
const GENERATED_FAMILIES = new Set<GeneratedMapFamily>([
  '2d',
  '3d',
  '3d-timelapse',
  'spatial-analysis',
  'heatmap-timelapse',
  'interactive-map',
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
  if (family === 'interactive-map') return '2d_overlay';
  return '3d_heatmap';
}

function getGenerationFamilyForViewer(category: ViewerMapCategory): GeneratedMapFamily {
  if (category === 'interactive-map-3d') return '3d';
  return category === 'interactive-map' ? '2d' : category;
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
  if (category === 'interactive-map-3d') return ['3d', '3d-timelapse', 'heatmap-timelapse'].includes(map.family);
  if (category === 'interactive-map') {
    return map.family === 'interactive-map' || (map.family === '2d' && map.primaryMapType === '2d_overlay');
  }
  return map.family === category;
}

function normalizeInteractiveKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function toInteractiveNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function findInteractiveField(record: Record<string, unknown>, candidates: string[]) {
  const normalized = new Map(Object.keys(record).map((key) => [normalizeInteractiveKey(key), key]));
  for (const candidate of candidates) {
    const field = normalized.get(normalizeInteractiveKey(candidate));
    if (field) return field;
  }
  return undefined;
}

function getInteractiveRows(
  module2Output: Module2Output | null,
  retrievalOutput: VisualizationRetrievalState | null,
): Record<string, unknown>[] {
  const visualizationRows = module2Output?.visualization_ready_output?.records;
  if (Array.isArray(visualizationRows)) {
    return visualizationRows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
  }
  if (Array.isArray(module2Output?.analysis_ready_dataset)) {
    return module2Output.analysis_ready_dataset.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
  }
  const retrievalRows = retrievalOutput?.resultSet?.rows;
  if (Array.isArray(retrievalRows)) {
    return retrievalRows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
  }
  return [];
}

function extractIntentLocations(moduleOutput: Module1IntentOutput | null) {
  const found: string[] = [];
  const locationKeyPattern = /(city|location|locality|village|micromarket|micro_market|geography|area|place)/;
  const pushText = (value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    const text = String(value).trim();
    if (
      text &&
      text.length <= 80 &&
      !/^(true|false|null|undefined)$/i.test(text) &&
      !/^[a-z0-9_ -]+requirements$/i.test(text)
    ) {
      found.push(text);
    }
  };
  const collectLocationValues = (value: unknown) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(collectLocationValues);
      return;
    }
    if (typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(collectLocationValues);
      return;
    }
    pushText(value);
  };
  const visit = (value: unknown) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        const keyLower = key.toLowerCase();
        if (locationKeyPattern.test(keyLower) && !/(field|column|schema|mapping|requirement|output)/.test(keyLower)) {
          collectLocationValues(nested);
        } else {
          visit(nested);
        }
      });
    }
  };
  visit(moduleOutput);
  const matchedKnownCities = Object.keys(CITY_CENTERS).filter((city) =>
    found.some((value) => value.toLowerCase().includes(city.toLowerCase())),
  );
  return Array.from(new Set([...matchedKnownCities, ...found]));
}

function resolveInteractiveCity(moduleOutput: Module1IntentOutput | null) {
  const locations = extractIntentLocations(moduleOutput);
  return Object.keys(CITY_CENTERS).find((city) =>
    locations.some((value) => value.toLowerCase().includes(city.toLowerCase())),
  ) || locations[0] || '';
}

function buildFallbackInteractiveMarkers(rows: Record<string, unknown>[]): InteractiveMapMarker[] {
  const first = rows[0];
  if (!first) return [];
  const projectField = findInteractiveField(first, ['Project Name', 'project_name', 'project', 'property_name']);
  const locationField = findInteractiveField(first, ['Location Name', 'location_name', 'locality', 'village', 'village_name', 'micromarket', 'city']);
  const latField = findInteractiveField(first, ['latitude', 'lat', 'project_latitude', 'location_latitude', 'subject_lat', 'center_lat', 'y']);
  const lonField = findInteractiveField(first, ['longitude', 'lng', 'lon', 'long', 'project_longitude', 'location_longitude', 'subject_lon', 'center_lng', 'x']);
  const nameField = projectField || locationField;
  const entityType: 'project' | 'location' = projectField ? 'project' : 'location';
  if (!nameField || !latField || !lonField) return [];
  const seen = new Set<string>();
  return rows.flatMap((row, index) => {
    const name = String(row[nameField] || '').trim();
    const lat = toInteractiveNumber(row[latField]);
    const lon = toInteractiveNumber(row[lonField]);
    if (!name || lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return [];
    const key = `${name.toLowerCase()}|${lat.toFixed(7)}|${lon.toFixed(7)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      id: `fallback:${index}`,
      entity_type: entityType,
      name,
      lat,
      lon,
      source_fields: { name: nameField, latitude: latField, longitude: lonField },
      raw: row,
    }];
  });
}

async function requestInteractiveEntityValidation(
  moduleOutput: Module1IntentOutput | null,
  module2Output: Module2Output | null,
  rows: Record<string, unknown>[],
): Promise<InteractiveEntityValidationResponse> {
  const response = await fetch(`${API_BASE}/visualization-agent/module31/interactive-map/validate-entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      module_1_intent_json: moduleOutput,
      module_2_output_json: module2Output,
      rows_json: rows,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail || `Interactive map validation failed with status ${response.status}`);
  }
  return response.json();
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
  retrievalOutput?: VisualizationRetrievalState | null;
  onRuntimeGeneratedMapsChange?: (maps: RuntimeGeneratedMapOption[]) => void;
  pendingPlottableEnrichment?: {
    mapId: string;
    points: Module7PlottableEnrichmentPoint[];
    corridors: Module7PlottableEnrichmentCorridor[];
  } | null;
  onPlottableEnrichmentApplied?: () => void;
  spatialV2Busy?: boolean;
  spatialV2OsmBusy?: boolean;
  onTakeSpatialSnapshot?: (viewer: InteractiveMapViewer, plotted: InteractiveMapPlottedSnapshot) => void | Promise<void>;
  onFetchExpandedOsm?: (viewer: InteractiveMapViewer, plotted: InteractiveMapPlottedSnapshot) => void | Promise<void>;
}

function SpatialInsightV2ToolbarButtons({
  busy,
  osmBusy,
  onTakeSnapshot,
  onFetchOsm,
  disabled,
  visible = true,
}: {
  busy?: boolean;
  osmBusy?: boolean;
  onTakeSnapshot?: () => void;
  onFetchOsm?: () => void;
  disabled?: boolean;
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center Gap-2">
      <button
        type="button"
        onClick={() => onFetchOsm?.()}
        disabled={disabled || busy || osmBusy || !onFetchOsm}
        title={
          disabled
            ? 'Plot the interactive map with Module 2 data first'
            : 'Fetch expanded OSM infrastructure for Spatial Insights v2'
        }
        className="inline-flex items-center Gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {osmBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
        Fetch OSM
      </button>
      <button
        type="button"
        onClick={() => onTakeSnapshot?.()}
        disabled={disabled || busy || !onTakeSnapshot}
        title={
          disabled
            ? 'Plot the interactive map with Module 2 data first'
            : 'Capture map snapshot and run Spatial Insights v2 pipeline'
        }
        className="inline-flex items-center Gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
        Take Snapshot
      </button>
    </div>
  );
}

function buildInteractivePlottedSnapshotFromRuntime(
  module31Config: GeneratedMapConfig | null,
  moduleOutput: Module1IntentOutput | null,
  module2Output: Module2Output | null,
  retrievalOutput: VisualizationRetrievalState | null,
  basemapMode: GeneratedBasemapMode,
  extras?: Partial<InteractiveMapPlottedSnapshot>,
): InteractiveMapPlottedSnapshot | null {
  if (!moduleOutput) return null;

  const rows = getInteractiveRows(module2Output, retrievalOutput);
  const markers = buildFallbackInteractiveMarkers(rows);
  const records = module31Config?.records?.length
    ? module31Config.records
    : mergeInteractiveMarkersIntoRecords(undefined, snapshotInteractiveMarkers(markers));

  if (records.length === 0 && markers.length === 0) return null;

  return {
    module31Config,
    records,
    projectMarkers: snapshotInteractiveMarkers(markers),
    amenities: extras?.amenities ?? [],
    corridors: extras?.corridors ?? [],
    insightLayers: extras?.insightLayers ?? [],
    runtimeContext: {
      city: resolveInteractiveCity(moduleOutput) || extras?.runtimeContext?.city,
      location: resolveInteractiveCity(moduleOutput) || extras?.runtimeContext?.location,
      basemap: basemapMode,
      selectedAmenities: extras?.runtimeContext?.selectedAmenities,
      selectedCorridors: extras?.runtimeContext?.selectedCorridors,
    },
  };
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

/** Format a metric value using the resolved unit context from Module 2 LLM 2.5a/b. */
function formatMapMetricValue(value: number | null | undefined, unitCtx: Record<string, unknown> | undefined): string {
  if (value == null) return 'N/A';
  const currencySymbol = typeof unitCtx?.currency_symbol === 'string' ? unitCtx.currency_symbol : '';
  const areaUnitSymbol = typeof unitCtx?.area_unit_symbol === 'string' ? unitCtx.area_unit_symbol : '';
  const unitType = typeof unitCtx?.unit_type === 'string' ? unitCtx.unit_type : '';
  const formatted = value.toLocaleString();
  if (unitType === 'rate_composite' && currencySymbol && areaUnitSymbol) return `${currencySymbol}${formatted}/${areaUnitSymbol}`;
  if (unitType === 'currency' && currencySymbol) return `${currencySymbol}${formatted}`;
  if (unitType === 'area' && areaUnitSymbol) return `${formatted} ${areaUnitSymbol}`;
  if (unitType === 'count' || unitType === 'percentage') return formatted;
  if (currencySymbol && areaUnitSymbol) return `${currencySymbol}${formatted}/${areaUnitSymbol}`;
  if (currencySymbol) return `${currencySymbol}${formatted}`;
  return formatted;
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

  const metricStats = getMetricStats(config.records);

  return {
    buildings,
    dates: safeDates,
    placeName: getRuntime3DPlaceName(config),
    radius: Math.max(250, Math.min(450, config.runtimeContext.radius || 350)),
    city: config.runtimeContext.city,
    hasFloor,
    hasProject: hasRuntimeProjectData(config.records),
    hasTime: hasRuntimeTimeData(config),
    metricMin: metricStats.min,
    metricMax: metricStats.max,
  };
}

function rgbaFromHex(hex: string, alpha = 220): [number, number, number, number] {
  const rgb = hexToRgb(hex);
  return rgb ? [rgb[0], rgb[1], rgb[2], alpha] : [37, 99, 235, alpha];
}

function getAmenityFontAwesomeGlyph(category: string) {
  const iconClass = CATEGORY_CONFIG[category]?.icon || '';
  return FONT_AWESOME_UNICODE_BY_CLASS[iconClass] || '\uf111';
}

function buildInteractive3DOverlayLayers({
  amenities,
  corridors,
  markers = [],
  insightLayers = [],
}: {
  amenities: InteractiveAmenityPoint[];
  corridors: InteractiveCorridorLine[];
  markers?: InteractiveMapMarker[];
  insightLayers?: InteractiveInsightLayerPoint[];
}) {
  const amenityLayer = new ColumnLayer<InteractiveAmenityPoint>({
    id: 'interactive-3d-amenity-columns',
    data: amenities.slice(0, 800),
    diskResolution: 16,
    radius: 18,
    elevationScale: 1,
    getPosition: (amenity) => [amenity.lon, amenity.lat],
    getElevation: () => INTERACTIVE_3D_AMENITY_HEIGHT,
    getFillColor: (amenity) => rgbaFromHex(CATEGORY_CONFIG[amenity.category]?.color || '#f59e0b', 210),
    getLineColor: [255, 255, 255, 230],
    lineWidthMinPixels: 1,
    extruded: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 120],
  });

  const corridorLayer = new PathLayer<InteractiveCorridorLine>({
    id: 'interactive-3d-corridors',
    data: corridors,
    getPath: (line) => line.latlngs.map(([lat, lon]) => [lon, lat] as [number, number]),
    getColor: (line) => {
      if (line.layer === 'metro_lines') return [5, 150, 105, 225];
      if (line.layer === 'insight_roads') return [249, 115, 22, 235];
      return [220, 38, 38, 204];
    },
    getWidth: (line) => {
      if (line.layer === 'metro_lines') return 8;
      if (line.layer === 'insight_roads') return 6;
      return 7;
    },
    widthMinPixels: 2,
    widthMaxPixels: 8,
    jointRounded: true,
    capRounded: true,
    pickable: true,
    autoHighlight: true,
  });

  const amenityIconLayer = new TextLayer<InteractiveAmenityPoint>({
    id: 'interactive-3d-amenity-icons',
    data: amenities.slice(0, 800),
    billboard: true,
    background: true,
    backgroundPadding: [5, 5],
    backgroundBorderRadius: 999,
    fontFamily: '"Font Awesome 5 Free"',
    fontWeight: 900,
    characterSet: Object.values(FONT_AWESOME_UNICODE_BY_CLASS).join('') + '\uf111',
    getText: (amenity) => getAmenityFontAwesomeGlyph(amenity.category),
    getPosition: (amenity) => [amenity.lon, amenity.lat, INTERACTIVE_3D_AMENITY_ICON_HEIGHT],
    getSize: () => 15,
    sizeUnits: 'pixels',
    getColor: (amenity) => rgbaFromHex(CATEGORY_CONFIG[amenity.category]?.color || '#f59e0b', 255),
    getBackgroundColor: () => [255, 255, 255, 245],
    getBorderColor: (amenity) => rgbaFromHex(CATEGORY_CONFIG[amenity.category]?.color || '#f59e0b', 255),
    getBorderWidth: () => 2,
    getTextAnchor: () => 'middle',
    getAlignmentBaseline: () => 'center',
    parameters: { depthTest: false } as any,
    pickable: true,
  });

  const markerLayer = new ScatterplotLayer<InteractiveMapMarker>({
    id: 'interactive-3d-preview-markers',
    data: markers,
    getPosition: (marker) => [marker.lon, marker.lat],
    getFillColor: (marker) => marker.entity_type === 'project' ? [5, 150, 105, 235] : [37, 99, 235, 235],
    getLineColor: [255, 255, 255, 255],
    getRadius: 34,
    radiusMinPixels: 7,
    radiusMaxPixels: 18,
    lineWidthMinPixels: 2,
    stroked: true,
    pickable: true,
    autoHighlight: true,
  });

  const insightLayer = new ScatterplotLayer<InteractiveInsightLayerPoint>({
    id: 'interactive-3d-insight-enrichment',
    data: insightLayers.slice(0, 400),
    getPosition: (point) => [point.lon, point.lat],
    getFillColor: [124, 58, 237, 235],
    getLineColor: [255, 255, 255, 255],
    getRadius: 40,
    radiusMinPixels: 8,
    radiusMaxPixels: 16,
    lineWidthMinPixels: 2,
    stroked: true,
    pickable: true,
    autoHighlight: true,
  });

  const layers: any[] = markers.length > 0
    ? [corridorLayer, amenityLayer, amenityIconLayer, markerLayer]
    : [corridorLayer, amenityLayer, amenityIconLayer];
  if (insightLayers.length > 0) {
    layers.push(insightLayer);
  }
  return layers;
}

type DeckOverlayTooltipHandler = (info: {
  object?: unknown;
  layer?: { id?: string } | null;
  [key: string]: unknown;
}) => { html?: string; text?: string } | null;

const getInteractive3DTooltip: DeckOverlayTooltipHandler = (info) => {
  const { object, layer } = info;
  if (!object) return null;
  const layerId = layer?.id || '';
  const amenity = object as InteractiveAmenityPoint;
  const corridor = object as InteractiveCorridorLine;
  const marker = object as InteractiveMapMarker;

  if (layerId.includes('insight-enrichment') || (object as InteractiveInsightLayerPoint).source === 'insight_enrichment') {
    const insightPoint = object as InteractiveInsightLayerPoint;
    return {
      html: `<strong>${insightPoint.name || 'Insight place'}</strong><br/>Insight: ${insightPoint.category.replace(/_/g, ' ')}`,
    };
  }
  if (layerId.includes('amenity') || (typeof amenity.category === 'string' && amenity.category)) {
    const label = CATEGORY_CONFIG[amenity.category]?.name || amenity.category;
    return { html: `<strong>${amenity.name || 'Amenity'}</strong><br/>${label}` };
  }
  if (layerId.includes('corridor') || Array.isArray(corridor.latlngs)) {
    const corridorLabel = corridor.layer === 'metro_lines'
      ? 'Metro line'
      : corridor.layer === 'insight_roads'
        ? 'Insight OSM road'
        : 'Highway corridor';
    const widthLabel = corridor.width_m ? `<br/>Width: ${corridor.width_m}` : '';
    const distanceLabel = corridor.distance_m != null ? `<br/>Distance: ${corridor.distance_m} m` : '';
    return {
      html: `<strong>${corridor.name || corridor.ref || 'Corridor'}</strong><br/>${corridorLabel}${widthLabel}${distanceLabel}`,
    };
  }
  if (marker.entity_type && marker.name) {
    return {
      html: `
        <div style="padding: 2px; font-family: ui-sans-serif, system-ui, sans-serif;">
          <div style="font-weight: 700; font-size: 13px; color: white;">${marker.name}</div>
          <div style="margin-top: 4px; font-size: 11px; color: #cbd5e1;">Coordinates: ${marker.lat.toFixed(5)}, ${marker.lon.toFixed(5)}</div>
          <div style="margin-top: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">Type: ${marker.entity_type}</div>
        </div>
      `
    };
  }
  return null;
};

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

function getFilteredModule31Config(
  module31Config: GeneratedMapConfig | null,
  catchmentActive: boolean,
  selectedCatchmentCategories: string[],
  totalCatchmentCount: number,
  markers: InteractiveMapMarker[]
): GeneratedMapConfig | null {
  if (!module31Config) return null;
  if (!catchmentActive || selectedCatchmentCategories.length === 0 || selectedCatchmentCategories.length === totalCatchmentCount) {
    return module31Config;
  }
  const nameSet = new Set(selectedCatchmentCategories);
  return {
    ...module31Config,
    records: module31Config.records.filter((record) => {
      // Find matching marker by lat/lon since raw references might be lost across serialization
      const m = markers.find((m) => m.lat === record.lat && m.lon === record.lng);
      return m ? nameSet.has(m.name) : true; // keep if no marker found to avoid accidentally hiding data
    }),
  };
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
      className="flex flex-wrap items-center rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur"
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

function GeneratedRecordPopup({ record, unitCtx }: { record: GeneratedMapRecord; unitCtx?: Record<string, unknown> }) {
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
        {record.metricLabel}: {formatMapMetricValue(record.metricValue, unitCtx)}
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
  extraDeckLayers = [],
  overlayTooltip,
}: {
  config: GeneratedMapConfig;
  title: string;
  description: string;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onLoaded?: (config: GeneratedMapConfig) => void;
  extraDeckLayers?: any[];
  overlayTooltip?: DeckOverlayTooltipHandler;
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
      <div className="min-h-[800px] flex-1 overflow-hidden">
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
          extraDeckLayers={extraDeckLayers}
          overlayTooltip={overlayTooltip}
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
  extraDeckLayers = [],
  overlayTooltip,
}: {
  config: GeneratedMapConfig;
  mode: Exclude<Runtime3DMode, '3d-heatmap'>;
  title: string;
  description: string;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onLoaded?: (config: GeneratedMapConfig) => void;
  extraDeckLayers?: any[];
  overlayTooltip?: DeckOverlayTooltipHandler;
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
    extraDeckLayers,
    overlayTooltip,
    metricUnitContext: (config.sourceModule2Output?.unit_identification as Record<string, unknown> | undefined) ?? undefined,
    metricDomainMin: runtime3D.metricMin,
    metricDomainMax: runtime3D.metricMax,
    metricLabel: config.metricLabel,
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
        {description ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-800">
            {description}
          </div>
        ) : null}
        <Module31TokenLedger config={config} />
      </div>
      <div className="min-h-[800px] flex-1 overflow-hidden">
        {mode === '3d-timelapse' ? (
          <ThreeDMapTimelapseView key={`${config.id}:3d-timelapse`} {...commonProps} />
        ) : (
          <ThreeDMapView key={`${config.id}:3d`} {...commonProps} />
        )}
      </div>
    </div>
  );
}

function isModule31ThreeDConfig(config: GeneratedMapConfig): boolean {
  return (
    config.family === 'heatmap-timelapse'
    || config.family === '3d-timelapse'
    || config.family === '3d'
    || config.renderer === '3d_heatmap'
    || config.renderer === '3d_building_plotting'
    || config.renderer === '3d_timelapse'
    || config.renderer === '3d_floor_wise'
  );
}

function getModule31ThreeDPanelSpec(
  config: GeneratedMapConfig,
  runtime3DMode: Runtime3DMode,
): {
  kind: 'heatmap' | 'three-d';
  mode: '3d' | '3d-timelapse';
  title: string;
  description?: string;
} {
  if (config.family === 'heatmap-timelapse') {
    return {
      kind: 'heatmap',
      mode: '3d',
      title: 'Module 3.1 Generated Heatmap Timelapse',
      description: 'Module 3.1 routed this request to the Heatmap - Timelapse adapter and bound runtime location, radius, metric values, timeline, and tooltips from Module 2.',
    };
  }

  if ((config.family === '3d-timelapse' || config.renderer === '3d_timelapse') && runtime3DMode === '3d-timelapse') {
    return {
      kind: 'three-d',
      mode: '3d-timelapse',
      title: 'Module 3.1 Generated 3D Timelapse',
      description: 'Module 3.1 is using the Overture 3D timelapse adapter with runtime Module 2 buildings, time frames, and snapping to nearby building polygons.',
    };
  }

  if (
    (config.family === '3d' || config.family === '3d-timelapse')
    && runtime3DMode === '3d'
    && config.renderer !== '3d_floor_wise'
  ) {
    return {
      kind: 'three-d',
      mode: '3d',
      title: 'Module 3.1 Generated 3D Map',
    };
  }

  if (config.renderer === '3d_floor_wise') {
    if (runtime3DMode === '3d-timelapse') {
      return {
        kind: 'three-d',
        mode: '3d-timelapse',
        title: 'Module 3.1 Generated 3D Floor Wise Timelapse',
        description: 'Module 3.1 detected floor and time fields, so this is routed to the 3D timelapse floor adapter with existing Overture snapping for building identification.',
      };
    }
    return {
      kind: 'three-d',
      mode: '3d',
      title: 'Module 3.1 Generated 3D Floor Wise Map',
      description: 'Module 3.1 detected floor fields without a timeline, so this is routed to the 3D floor adapter with existing Overture snapping for building identification.',
    };
  }

  if (config.renderer === '3d_heatmap' || config.renderer === '3d_building_plotting') {
    if (runtime3DMode === '3d-timelapse') {
      return {
        kind: 'three-d',
        mode: '3d-timelapse',
        title: 'Module 3.1 Generated 3D Timelapse',
        description: 'Module 3.1 detected project-level time data, so this is routed to the 3D timelapse adapter. Floor configuration is reduced to a single metric layer when floor fields are absent.',
      };
    }
    if (runtime3DMode === '3d') {
      return {
        kind: 'three-d',
        mode: '3d',
        title: 'Module 3.1 Generated 3D Map',
        description: 'Module 3.1 detected project/building data without a timeline, so this is routed to the 3D map adapter with Overture snapping and runtime metric coloring.',
      };
    }
    return {
      kind: 'heatmap',
      mode: '3d',
      title: 'Module 3.1 Generated 3D Map',
      description: 'Module 3.1 selected the Overture 3D runtime adapter. Overture buildings are loaded around the Module 2 location and colored from the generated metric.',
    };
  }

  if (runtime3DMode === '3d-heatmap') {
    return {
      kind: 'heatmap',
      mode: '3d',
      title: 'Module 3.1 Generated 3D Heatmap',
      description: 'Module 3.1 routed this request to the heatmap timelapse adapter with runtime Module 2 metric coloring across Overture building extrusions.',
    };
  }

  return {
    kind: 'three-d',
    mode: runtime3DMode === '3d-timelapse' ? '3d-timelapse' : '3d',
    title: runtime3DMode === '3d-timelapse' ? 'Module 3.1 Generated 3D Timelapse' : 'Module 3.1 Generated 3D Map',
    description: 'Module 3.1 routed this request to the runtime 3D map adapter with Overture building extrusions and Module 2 metrics.',
  };
}

function GeneratedModule31ThreeDMapView({
  config,
  basemapMode,
  onBasemapModeChange,
  onLoaded,
  extraDeckLayers = [],
  overlayTooltip,
}: {
  config: GeneratedMapConfig;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onLoaded?: (config: GeneratedMapConfig) => void;
  extraDeckLayers?: any[];
  overlayTooltip?: DeckOverlayTooltipHandler;
}) {
  const runtime3DMode = useMemo(() => getRuntime3DMode(config), [config]);
  const panelSpec = useMemo(() => getModule31ThreeDPanelSpec(config, runtime3DMode), [config, runtime3DMode]);

  if (panelSpec.kind === 'heatmap') {
    return (
      <GeneratedRuntimeHeatmapPanel
        config={config}
        title={panelSpec.title}
        description={panelSpec.description}
        basemapMode={basemapMode}
        onBasemapModeChange={onBasemapModeChange}
        onLoaded={onLoaded}
        extraDeckLayers={extraDeckLayers}
        overlayTooltip={overlayTooltip}
      />
    );
  }

  return (
    <GeneratedRuntimeThreeDPanel
      config={config}
      mode={panelSpec.mode}
      title={panelSpec.title}
      description={panelSpec.description}
      basemapMode={basemapMode}
      onBasemapModeChange={onBasemapModeChange}
      onLoaded={onLoaded}
      extraDeckLayers={extraDeckLayers}
      overlayTooltip={overlayTooltip}
    />
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
                              <Marker 
                                position={[Number(project.lat), Number(project.long)]} 
                                icon={getDestinationIcon(color)}
                              >
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
                              </Marker>
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
                            <Marker 
                              position={[Number(spatialData.subject_info.lat), Number(spatialData.subject_info.lon)]}
                              icon={getDestinationIcon('#2563eb')}
                            >
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
                            <Marker
                              key={record.id}
                              position={[record.lat, record.lng]}
                              icon={getDestinationIcon(color)}
                            >
                              <Popup>
                                <GeneratedRecordPopup record={record} unitCtx={config.sourceModule2Output?.unit_identification as Record<string, unknown> | undefined} />
                              </Popup>
                            </Marker>
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

function GeneratedMapOsmOverlayLayers({
  amenities,
  corridors,
  insightLayers = [],
}: {
  amenities: InteractiveAmenityPoint[];
  corridors: InteractiveCorridorLine[];
  insightLayers?: InteractiveInsightLayerPoint[];
}) {
  const [leaflet, setLeaflet] = useState<any>(null);

  useEffect(() => {
    let active = true;
    import('leaflet').then((mod) => {
      if (active) setLeaflet(mod);
    });
    return () => {
      active = false;
    };
  }, []);

  const createLeafletDivIcon = useCallback(
    (html: string, width: number, height: number, anchorY = height) => {
      if (!leaflet || !html) return undefined;
      return leaflet.divIcon({
        html,
        iconSize: [width, height],
        iconAnchor: [width / 2, anchorY],
        popupAnchor: [0, -Math.max(18, Math.round(height * 0.75))],
        className: '',
      });
    },
    [leaflet],
  );

  if (!leaflet) return null;

  return (
    <>
      {corridors.map((line, index) => {
        const isMetro = line.layer === 'metro_lines';
        const isInsightRoad = line.layer === 'insight_roads';
        return (
          <Polyline
            key={`generated-osm-corridor-${line.layer}-${line.name || line.ref || index}-${index}`}
            positions={line.latlngs}
            pathOptions={{
              color: isInsightRoad ? '#f97316' : isMetro ? '#059669' : '#dc2626',
              weight: isInsightRoad ? 5 : isMetro ? 5 : 4,
              opacity: isInsightRoad ? 0.92 : isMetro ? 0.88 : 0.8,
              dashArray: isInsightRoad ? '4, 4' : isMetro ? '8, 6' : undefined,
            }}
          >
            <Popup>
              <div className="text-xs">
                <strong>{line.name || (isInsightRoad ? 'Insight road' : isMetro ? 'Metro line' : 'Highway corridor')}</strong>
                <div>{isInsightRoad ? 'Insight OSM Road' : isMetro ? 'Metro Line' : 'Highway Corridor'}</div>
                {line.ref ? <div>Ref: {line.ref}</div> : null}
                {line.highway ? <div>Type: {line.highway}</div> : null}
                {line.width_m ? <div>Width: {line.width_m}</div> : null}
                {line.distance_m != null ? <div>Distance: {line.distance_m} m</div> : null}
              </div>
            </Popup>
          </Polyline>
        );
      })}
      {amenities.map((amenity, index) => {
        const option = INTERACTIVE_AMENITY_OPTIONS.find((candidate) => candidate.value === amenity.category);
        const categoryConfig = CATEGORY_CONFIG[amenity.category];
        return (
          <Marker
            key={`generated-osm-amenity-${amenity.category}-${amenity.lat}-${amenity.lon}-${index}`}
            position={[amenity.lat, amenity.lon]}
            icon={createLeafletDivIcon(createInteractiveAmenityIconHtml(amenity.category), 28, 28, 28)}
          >
            <Popup>
              <div className="text-xs">
                <strong>{amenity.name || 'Unnamed amenity'}</strong>
                <div>{categoryConfig?.name || option?.label || amenity.category}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {insightLayers.map((point, index) => (
        <CircleMarker
          key={`generated-insight-layer-${point.id || point.category}-${point.lat}-${point.lon}-${index}`}
          center={[point.lat, point.lon]}
          radius={8}
          pathOptions={{
            color: '#7c3aed',
            fillColor: '#8b5cf6',
            fillOpacity: 0.92,
            weight: 2,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={1}>
            <span className="text-xs font-semibold text-slate-800">
              {point.name}
              <br />
              <span className="font-bold uppercase tracking-wider text-[9px] text-violet-600">
                Insight · {point.category.replace(/_/g, ' ')}
              </span>
            </span>
          </Tooltip>
          <Popup>
            <div className="text-xs">
              <strong>{point.name}</strong>
              <div className="mt-1 font-semibold uppercase tracking-wider text-violet-600">
                Insight enrichment · {point.category.replace(/_/g, ' ')}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

function GeneratedMapView({
  config,
  basemapMode,
  onBasemapModeChange,
  onLoaded,
  extraDeckLayers = [],
  overlayTooltip,
  osmAmenities = [],
  osmCorridors = [],
  osmInsightLayers = [],
  onPolygonCreated,
  onPolygonDeleted,
}: {
  config: GeneratedMapConfig;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onLoaded?: (config: GeneratedMapConfig) => void;
  extraDeckLayers?: any[];
  overlayTooltip?: DeckOverlayTooltipHandler;
  osmAmenities?: InteractiveAmenityPoint[];
  osmCorridors?: InteractiveCorridorLine[];
  osmInsightLayers?: InteractiveInsightLayerPoint[];
  onPolygonCreated?: (geoJson: any) => void;
  onPolygonDeleted?: () => void;
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

  if (isModule31ThreeDConfig(config)) {
    return (
      <GeneratedModule31ThreeDMapView
        config={config}
        basemapMode={basemapMode}
        onBasemapModeChange={onBasemapModeChange}
        onLoaded={onLoaded}
        extraDeckLayers={extraDeckLayers}
        overlayTooltip={overlayTooltip}
      />
    );
  }

  if (config.family === 'spatial-analysis') {
    return <GeneratedSpatialAnalysisView config={config} basemapMode={basemapMode} onBasemapModeChange={onBasemapModeChange} onLoaded={onLoaded} />;
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
          <InteractiveDrawControl
            onPolygonCreated={onPolygonCreated || (() => {})}
            onPolygonDeleted={onPolygonDeleted || (() => {})}
          />
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
                            {config.metricLabel}: {formatMapMetricValue(cluster.metricValue, config.sourceModule2Output?.unit_identification as Record<string, unknown> | undefined)}
                          </p>
                        ) : null}
                        <GeneratedRecordPopup record={cluster.sample} unitCtx={config.sourceModule2Output?.unit_identification as Record<string, unknown> | undefined} />
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
                            {config.metricLabel}: {formatMapMetricValue(metricValue, config.sourceModule2Output?.unit_identification as Record<string, unknown> | undefined)}
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
                      <GeneratedRecordPopup record={record} unitCtx={config.sourceModule2Output?.unit_identification as Record<string, unknown> | undefined} />
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
                      <GeneratedRecordPopup record={record} unitCtx={config.sourceModule2Output?.unit_identification as Record<string, unknown> | undefined} />
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
                        <GeneratedRecordPopup record={record} unitCtx={config.sourceModule2Output?.unit_identification as Record<string, unknown> | undefined} />
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
                      <GeneratedRecordPopup record={record} unitCtx={config.sourceModule2Output?.unit_identification as Record<string, unknown> | undefined} />
                    </Popup>
                  </CircleMarker>
                );
              })
            : null}
          {(osmAmenities.length > 0 || osmCorridors.length > 0) ? (
            <GeneratedMapOsmOverlayLayers
              amenities={osmAmenities}
              corridors={osmCorridors}
              insightLayers={osmInsightLayers}
            />
          ) : null}
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

  if (activeFamily === 'interactive-map') {
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

function InteractiveMapPendingState() {
  return (
    <section className="flex h-full min-h-[800px] flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">Interactive MapView</p>
      <h3 className="mt-2 text-base font-extrabold text-slate-950">Waiting for resolved intent</h3>
      <p className="mt-3 max-w-md text-xs font-semibold leading-5 text-slate-500">
        Submit a query first. The interactive map will appear after Module 1 finishes intent resolution, then it will load amenities for the resolved city.
      </p>
    </section>
  );
}

function Interactive2DPreviewMap({
  center,
  amenities,
  corridors,
  markers = [],
  basemapMode,
  insightLayers = [],
  onPolygonCreated,
  onPolygonDeleted,
}: {
  center: [number, number];
  amenities: InteractiveAmenityPoint[];
  corridors: InteractiveCorridorLine[];
  markers?: InteractiveMapMarker[];
  basemapMode: GeneratedBasemapMode;
  insightLayers?: InteractiveInsightLayerPoint[];
  onPolygonCreated?: (geoJson: any) => void;
  onPolygonDeleted?: () => void;
}) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      preferCanvas
      className="h-full min-h-[800px] w-full"
      scrollWheelZoom
    >
      <TileLayer
        url={LEAFLET_BASEMAP_OPTIONS[basemapMode].url}
        attribution={LEAFLET_BASEMAP_OPTIONS[basemapMode].attribution}
      />
      <InteractiveDrawControl
        onPolygonCreated={onPolygonCreated || (() => {})}
        onPolygonDeleted={onPolygonDeleted || (() => {})}
      />
      <MapResizeInvalidator />
      <GeneratedMapOsmOverlayLayers
        amenities={amenities}
        corridors={corridors}
        insightLayers={insightLayers}
      />
      {markers.map((marker) => {
        const color = marker.entity_type === 'project' ? '#059669' : '#3b82f6';
        return (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lon]}
            icon={getDestinationIcon(color)}
          >
            <Tooltip>{marker.name}</Tooltip>
            <Popup>
              <div className="p-2 text-xs">
                <p className="font-bold text-slate-800">{marker.name}</p>
                <p className="mt-1 text-slate-500">
                  Coordinates: {marker.lat.toFixed(5)}, {marker.lon.toFixed(5)}
                </p>
                <p className="mt-1 text-slate-500 uppercase tracking-wider font-semibold text-[9px]">
                  Type: {marker.entity_type}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

function InteractiveRuntimeMapView({
  moduleOutput,
  module2Output,
  retrievalOutput,
  module31Config = null,
  isLoadingModule31 = false,
  m31Error = null,
  readiness,
  basemapMode,
  onBasemapModeChange,
  onMapLoaded,
  insightLayers = [],
  onPlottedSnapshotChange,
  spatialInsightActions,
}: {
  moduleOutput: Module1IntentOutput | null;
  module2Output: Module2Output | null;
  retrievalOutput: VisualizationRetrievalState | null;
  module31Config?: GeneratedMapConfig | null;
  isLoadingModule31?: boolean;
  m31Error?: string | null;
  readiness: ReturnType<typeof getModule31Readiness>;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onMapLoaded?: (config: GeneratedMapConfig) => void;
  insightLayers?: InteractiveInsightLayerPoint[];
  onPlottedSnapshotChange?: (delta: InteractivePlottedDelta) => void;
  spatialInsightActions?: {
    busy?: boolean;
    osmBusy?: boolean;
    onTakeSnapshot?: () => void;
    onFetchOsm?: () => void;
    disabled?: boolean;
  };
}) {
  const resolvedCity = useMemo(() => resolveInteractiveCity(moduleOutput), [moduleOutput]);
  const intentLocations = useMemo(() => extractIntentLocations(moduleOutput), [moduleOutput]);
  const rows = useMemo(() => getInteractiveRows(module2Output, retrievalOutput), [module2Output, retrievalOutput]);
  const markers = useMemo(() => buildFallbackInteractiveMarkers(rows), [rows]);
  const [selectedLocation, setSelectedLocation] = useState(resolvedCity);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(DEFAULT_INTERACTIVE_AMENITIES);
  const [selectedCorridors, setSelectedCorridors] = useState<string[]>(DEFAULT_INTERACTIVE_CORRIDORS);
  const [amenities, setAmenities] = useState<InteractiveAmenityPoint[]>([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [amenitiesStatus, setAmenitiesStatus] = useState('Railway stations selected by default');
  const [corridorLines, setCorridorLines] = useState<InteractiveCorridorLine[]>([]);
  const [corridorsLoading, setCorridorsLoading] = useState(false);
  const [corridorsStatus, setCorridorsStatus] = useState('Metro lines and highway corridors selected by default');
  const [polygonGeoJson, setPolygonGeoJson] = useState<any>(null);
  const [selectedCatchmentCategories, setSelectedCatchmentCategories] = useState<string[]>([]);
  const [catchmentActive, setCatchmentActive] = useState(true);

  const pointInPolygon = useCallback((pt: [number, number], vs: [number, number][]) => {
    const [x, y] = pt; let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const [xi, yi] = vs[i]; const [xj, yj] = vs[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }, []);

  const isInside = useCallback((lat: number, lon: number): boolean => {
    if (polygonGeoJson) {
      try { 
        const coords = polygonGeoJson.geometry.coordinates[0]; 
        return pointInPolygon([lat, lon], coords.map((c: number[]) => [c[1], c[0]])); 
      } catch { 
        return false; 
      }
    }
    return true;
  }, [polygonGeoJson, pointInPolygon]);

  const catchmentEntityList = useMemo(
    () => buildCatchmentEntityList(rows, moduleOutput, module2Output),
    [rows, moduleOutput, module2Output],
  );

  const catchmentGeoLabel = useMemo(() => {
    const gl = String(
      (moduleOutput?.map_output_requirements as Record<string, unknown> | undefined)?.geo_level
      || (moduleOutput as Record<string, unknown> | null)?.geo_level
      || ''
    ).toLowerCase();
    if (gl.includes('project')) return `Project-level · ${catchmentEntityList.length} entities`;
    if (gl.includes('locality') || gl.includes('micro') || gl.includes('location')) return `Locality-level · ${catchmentEntityList.length} entities`;
    return `${catchmentEntityList.length} entities`;
  }, [moduleOutput, catchmentEntityList]);

  const catchmentCategoriesForFilter = useMemo(
    () => catchmentEntityList.map(e => e.name),
    [catchmentEntityList],
  );

  const filteredAmenities = useMemo(() => amenities.filter(a => isInside(a.lat, a.lon)), [amenities, isInside]);
  const filteredCorridors = useMemo(() => corridorLines.filter(c => c.latlngs.some(([lat, lon]) => isInside(lat, lon))), [corridorLines, isInside]);
  const filteredMarkers = useMemo(() => {
    if (!catchmentActive) return [];
    const inside = markers.filter(m => isInside(m.lat, m.lon));
    if (selectedCatchmentCategories.length > 0 && selectedCatchmentCategories.length < catchmentEntityList.length) {
      const nameSet = new Set(selectedCatchmentCategories);
      return inside.filter(m => nameSet.has(m.name));
    }
    return inside;
  }, [markers, isInside, catchmentActive, selectedCatchmentCategories, catchmentEntityList]);

  const filteredInsightLayers = useMemo(
    () => {
      if (!catchmentActive) return [];
      return selectedCatchmentCategories.length > 0
        ? insightLayers.filter(l => selectedCatchmentCategories.includes(l.category))
        : insightLayers;
    },
    [insightLayers, selectedCatchmentCategories, catchmentActive],
  );



  const selectedCity = useMemo(
    () => resolveInteractiveSelectedCity({ selectedLocation, resolvedCity, rows, moduleOutput }),
    [moduleOutput, resolvedCity, rows, selectedLocation],
  );

  const filteredModule31Config = useMemo(
    () => getFilteredModule31Config(module31Config, catchmentActive, selectedCatchmentCategories, catchmentEntityList.length, markers),
    [module31Config, catchmentActive, selectedCatchmentCategories, catchmentEntityList.length, markers]
  );

  useEffect(() => {
    if (resolvedCity) {
      setSelectedLocation(resolvedCity);
    }
  }, [resolvedCity]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const loadAmenities = async () => {
      if (!selectedLocation || selectedAmenities.length === 0) {
        setAmenities([]);
        setAmenitiesStatus(!selectedLocation ? 'Waiting for resolved city to load amenities' : 'Select amenities to overlay');
        return;
      }
      if (!selectedCity) {
        setAmenities([]);
        setAmenitiesStatus('Amenities need a supported resolved city');
        return;
      }
      setAmenitiesLoading(true);
      setAmenitiesStatus('Fetching amenities from OpenStreetMap...');
      try {
        const params = new URLSearchParams({ city: selectedCity, categories: selectedAmenities.join(',') });
        const response = await fetch(`${API_BASE}/map-overlays/osm-amenities?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(body.detail || `HTTP ${response.status}`);
        }
        const data = await response.json() as {
          points?: InteractiveAmenityPoint[];
          category_metadata?: Record<string, { source?: string }>;
        };
        if (!active) return;
        const sources = new Set(Object.values(data.category_metadata || {}).map((metadata) => metadata.source));
        const cacheUsed = sources.has('soft_cache') || sources.has('stale_soft_cache');
        const points = Array.isArray(data.points) ? data.points : [];
        setAmenities(points);
        setAmenitiesStatus(`${points.length} amenities loaded${cacheUsed ? ' (soft cache)' : ''}`);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setAmenities([]);
        setAmenitiesStatus(error instanceof Error ? error.message : 'Unable to load amenities');
      } finally {
        if (active) setAmenitiesLoading(false);
      }
    };
    loadAmenities();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedAmenities, selectedCity, selectedLocation]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const loadCorridors = async () => {
      if (!selectedLocation || selectedCorridors.length === 0) {
        setCorridorLines([]);
        setCorridorsStatus(!selectedLocation ? 'Waiting for resolved city to load corridors' : 'Select corridor layers to overlay');
        return;
      }
      if (!selectedCity) {
        setCorridorLines([]);
        setCorridorsStatus('Corridors need a supported resolved city');
        return;
      }
      setCorridorsLoading(true);
      setCorridorsStatus('Fetching metro lines and highway corridors from OpenStreetMap...');
      try {
        const params = new URLSearchParams({ city: selectedCity, layers: selectedCorridors.join(',') });
        const response = await fetch(`${API_BASE}/map-overlays/osm-corridors?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(body.detail || `HTTP ${response.status}`);
        }
        const data = await response.json() as {
          highways?: InteractiveCorridorLine[];
          metro_lines?: InteractiveCorridorLine[];
          layer_metadata?: Record<string, { source?: string }>;
        };
        if (!active) return;
        const sources = new Set(Object.values(data.layer_metadata || {}).map((metadata) => metadata.source));
        const cacheUsed = sources.has('soft_cache') || sources.has('stale_soft_cache');
        const highways = (Array.isArray(data.highways) ? data.highways : []).map((line) => ({ ...line, layer: 'highways' as const }));
        const metroLines = (Array.isArray(data.metro_lines) ? data.metro_lines : []).map((line) => ({ ...line, layer: 'metro_lines' as const }));
        const lines = [...highways, ...metroLines].filter((line) => Array.isArray(line.latlngs) && line.latlngs.length > 1);
        setCorridorLines(lines);
        setCorridorsStatus(`${lines.length} corridors loaded${cacheUsed ? ' (soft cache)' : ''}`);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setCorridorLines([]);
        setCorridorsStatus(error instanceof Error ? error.message : 'Unable to load corridors');
      } finally {
        if (active) setCorridorsLoading(false);
      }
    };
    loadCorridors();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCorridors, selectedCity, selectedLocation]);

  useEffect(() => {
    if (!onPlottedSnapshotChange || !moduleOutput) return;
    onPlottedSnapshotChange({
      module31Config: filteredModule31Config || undefined,
      records: mergeInteractiveMarkersIntoRecords(filteredModule31Config?.records, snapshotInteractiveMarkers(filteredMarkers)),
      projectMarkers: snapshotInteractiveMarkers(filteredMarkers),
      amenities: filteredAmenities,
      corridors: filteredCorridors,
      runtimeContext: {
        city: selectedCity || undefined,
        location: selectedLocation || undefined,
        basemap: basemapMode,
        selectedAmenities,
        selectedCorridors,
      },
    });
  }, [
    amenities,
    basemapMode,
    corridorLines,
    markers,
    filteredModule31Config,
    moduleOutput,
    onPlottedSnapshotChange,
    selectedAmenities,
    selectedCity,
    selectedCorridors,
    selectedLocation,
    filteredMarkers,
    filteredAmenities,
    filteredCorridors,
  ]);

  const locationOptions = useMemo(
    () => Array.from(new Set([resolvedCity, ...intentLocations].filter(Boolean))),
    [intentLocations, resolvedCity],
  );
  const mapCenter: [number, number] = (selectedCity ? CITY_CENTERS[selectedCity] : undefined) || DEFAULT_CENTER;
  const waitingStatus = moduleOutput
    ? readiness.isReady
      ? 'Module 3.1 is preparing the 2D map from finalized Module 2 data.'
      : 'Intent resolved. Waiting for Module 2 finalized data before Module 3.1 starts.'
    : 'Submit a query to resolve intent and load the map.';

  const overlayToolbar = (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">MapView</p>
        <h3 className="text-sm font-extrabold text-slate-950">Interactive Map</h3>
      </div>

      <SpatialInsightV2ToolbarButtons
        busy={spatialInsightActions?.busy}
        osmBusy={spatialInsightActions?.osmBusy}
        onTakeSnapshot={spatialInsightActions?.onTakeSnapshot}
        onFetchOsm={spatialInsightActions?.onFetchOsm}
        disabled={spatialInsightActions?.disabled}
        visible={Boolean(spatialInsightActions)}
      />

      {isLoadingModule31 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-violet-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Module 3.1 processing
        </span>
      ) : module31Config ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
          <TrendingUp className="h-3 w-3" />
          OSM overlays active
        </span>
      ) : m31Error ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-red-700 max-w-[250px] truncate" title={m31Error}>
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{m31Error}</span>
        </span>
      ) : null}

      <label className="ml-auto flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Location
        <select
          value={selectedLocation}
          onChange={(event) => setSelectedLocation(event.target.value)}
          className="max-w-[190px] bg-transparent text-[10px] font-extrabold uppercase tracking-widest text-slate-700 outline-none"
        >
          {locationOptions.length > 0 ? (
            locationOptions.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))
          ) : (
            <option value="">No resolved location</option>
          )}
        </select>
      </label>

      <IntelligenceLayerFilter
        selectedAmenities={selectedAmenities}
        setSelectedAmenities={setSelectedAmenities}
        selectedCorridors={selectedCorridors}
        setSelectedCorridors={setSelectedCorridors}
        catchmentCategories={catchmentCategoriesForFilter}
        catchmentGeoLabel={catchmentGeoLabel}
        onCatchmentCategoriesChange={setSelectedCatchmentCategories}
        onCatchmentActiveChange={setCatchmentActive}
      />
    </div>
  );

  const statusFooter = (
    <div className="flex flex-wrap items-center justify-between Gap-3 border-t border-slate-100 bg-white px-5 py-3">
      <div className="grid flex-1 Gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 md:grid-cols-4">
        <span>
          {filteredModule31Config
            ? `${filteredModule31Config.records.length} records · same 2D map family renderer`
            : isLoadingModule31
              ? 'Module 3.1 processing finalized data'
              : waitingStatus}
        </span>
        <span>{filteredModule31Config ? 'module_3_1_records + osm overlays' : 'Waiting for Module 3.1'}</span>
        <span>{amenitiesLoading ? 'Waiting for OSM amenities...' : amenitiesStatus}</span>
        <span>{corridorsLoading ? 'Waiting for OSM corridors...' : corridorsStatus}</span>
      </div>
      <SpatialInsightV2ToolbarButtons
        busy={spatialInsightActions?.busy}
        osmBusy={spatialInsightActions?.osmBusy}
        onTakeSnapshot={spatialInsightActions?.onTakeSnapshot}
        onFetchOsm={spatialInsightActions?.onFetchOsm}
        disabled={spatialInsightActions?.disabled}
        visible={Boolean(spatialInsightActions)}
      />
    </div>
  );

  if (filteredModule31Config) {
    return (
      <section className="flex h-full min-h-[800px] flex-col bg-white">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />
        {overlayToolbar}
        <div className="min-h-0 flex-1">
          <GeneratedMapView
            key={filteredModule31Config.id}
            config={filteredModule31Config}
            basemapMode={basemapMode}
            onBasemapModeChange={onBasemapModeChange}
            onLoaded={onMapLoaded}
            osmAmenities={filteredAmenities}
            osmCorridors={filteredCorridors}
            osmInsightLayers={filteredInsightLayers}
            onPolygonCreated={(geoJson) => setPolygonGeoJson(geoJson)}
            onPolygonDeleted={() => setPolygonGeoJson(null)}
          />
        </div>
        {statusFooter}
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-[800px] flex-col bg-white">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />
      {overlayToolbar}
      <div className="relative min-h-[800px] flex-1">
        {readiness.isReady && isLoadingModule31 ? (
          <div className="flex h-full min-h-[800px] flex-col items-center justify-center bg-slate-50 px-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="mt-4 text-sm font-extrabold text-slate-900">Building Interactive Map</p>
            <p className="mt-2 max-w-md text-xs font-semibold leading-5 text-slate-500">
              Module 3.1 is generating the same 2D map family renderer. OSM amenities and corridors will overlay once ready.
            </p>
          </div>
        ) : (
          <>
            <Interactive2DPreviewMap
              center={mapCenter}
              amenities={filteredAmenities}
              corridors={filteredCorridors}
              markers={filteredMarkers}
              basemapMode={basemapMode}
              insightLayers={filteredInsightLayers}
              onPolygonCreated={(geoJson) => setPolygonGeoJson(geoJson)}
              onPolygonDeleted={() => setPolygonGeoJson(null)}
            />
            <div className="pointer-events-none absolute left-4 top-4 z-20 max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Resolved Location</p>
              <p className="mt-1 text-base font-extrabold text-slate-950">{selectedLocation || selectedCity || 'No resolved location'}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Amenities and corridors are loaded from intent. The fine-tuned 2D map will appear after Module 2 and Module 3.1 finish.
              </p>
            </div>
          </>
        )}
      </div>
      {statusFooter}
    </section>
  );
}

function Interactive3DPreviewMap({
  center,
  amenities,
  corridors,
  markers,
  basemapMode,
  onBasemapModeChange,
  insightLayers = [],
}: {
  center: [number, number];
  amenities: InteractiveAmenityPoint[];
  corridors: InteractiveCorridorLine[];
  markers: InteractiveMapMarker[];
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  insightLayers?: InteractiveInsightLayerPoint[];
}) {
  const [viewState, setViewState] = useState({
    longitude: center[1],
    latitude: center[0],
    zoom: markers.length > 0 ? 12.5 : 11.5,
    pitch: 58,
    bearing: 25,
  });

  useEffect(() => {
    setViewState((previous) => ({
      ...previous,
      longitude: center[1],
      latitude: center[0],
      zoom: markers.length > 0 ? 12.5 : 11.5,
    }));
  }, [center, markers.length]);

  const layers = useMemo(
    () => buildInteractive3DOverlayLayers({ amenities, corridors, markers, insightLayers }),
    [amenities, corridors, markers, insightLayers],
  );

  return (
    <div className="relative h-full min-h-[560px] overflow-hidden">
      <GeneratedBasemapOverlay value={basemapMode} onChange={onBasemapModeChange} />
      <DeckGL
        controller
        layers={layers}
        viewState={viewState}
        onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState as typeof viewState)}
        getTooltip={getInteractive3DTooltip}
        style={{ position: 'absolute', inset: '0px' }}
      >
        <MapLibreMap
          mapLib={import('maplibre-gl')}
          mapStyle={MAPLIBRE_STYLE_BY_BASEMAP[basemapMode]}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        >
          <MapLibreNavigationControl position="top-right" />
        </MapLibreMap>
      </DeckGL>
    </div>
  );
}

function InteractiveRuntime3DMapView({
  moduleOutput,
  module2Output,
  retrievalOutput,
  module31Config = null,
  isLoadingModule31 = false,
  readiness,
  basemapMode,
  onBasemapModeChange,
  onMapLoaded,
  insightLayers = [],
  onPlottedSnapshotChange,
  spatialInsightActions,
}: {
  moduleOutput: Module1IntentOutput | null;
  module2Output: Module2Output | null;
  retrievalOutput: VisualizationRetrievalState | null;
  module31Config?: GeneratedMapConfig | null;
  isLoadingModule31?: boolean;
  readiness: ReturnType<typeof getModule31Readiness>;
  basemapMode: GeneratedBasemapMode;
  onBasemapModeChange: (mode: GeneratedBasemapMode) => void;
  onMapLoaded?: (config: GeneratedMapConfig) => void;
  insightLayers?: InteractiveInsightLayerPoint[];
  onPlottedSnapshotChange?: (delta: InteractivePlottedDelta) => void;
  spatialInsightActions?: {
    busy?: boolean;
    osmBusy?: boolean;
    onTakeSnapshot?: () => void;
    onFetchOsm?: () => void;
    disabled?: boolean;
  };
}) {
  const resolvedCity = useMemo(() => resolveInteractiveCity(moduleOutput), [moduleOutput]);
  const intentLocations = useMemo(() => extractIntentLocations(moduleOutput), [moduleOutput]);
  const rows = useMemo(() => getInteractiveRows(module2Output, retrievalOutput), [module2Output, retrievalOutput]);
  const markers = useMemo(() => buildFallbackInteractiveMarkers(rows), [rows]);
  const [selectedLocation, setSelectedLocation] = useState(resolvedCity);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(DEFAULT_INTERACTIVE_AMENITIES);
  const [selectedCorridors, setSelectedCorridors] = useState<string[]>(DEFAULT_INTERACTIVE_CORRIDORS);
  const [amenities, setAmenities] = useState<InteractiveAmenityPoint[]>([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [amenitiesStatus, setAmenitiesStatus] = useState('Railway stations selected by default');
  const [corridorLines, setCorridorLines] = useState<InteractiveCorridorLine[]>([]);
  const [corridorsLoading, setCorridorsLoading] = useState(false);
  const [corridorsStatus, setCorridorsStatus] = useState('Metro lines and highway corridors selected by default');
  const [selectedCatchmentCategories, setSelectedCatchmentCategories] = useState<string[]>([]);
  const [catchmentActive, setCatchmentActive] = useState(true);

  const selectedCity = useMemo(
    () => resolveInteractiveSelectedCity({ selectedLocation, resolvedCity, rows, moduleOutput }),
    [moduleOutput, resolvedCity, rows, selectedLocation],
  );

  useEffect(() => {
    if (resolvedCity) {
      setSelectedLocation(resolvedCity);
    }
  }, [resolvedCity]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const loadAmenities = async () => {
      if (!selectedLocation || selectedAmenities.length === 0) {
        setAmenities([]);
        setAmenitiesStatus(!selectedLocation ? 'Waiting for resolved city to load amenities' : 'Select amenities to overlay');
        return;
      }
      if (!selectedCity) {
        setAmenities([]);
        setAmenitiesStatus('Amenities need a supported resolved city');
        return;
      }
      setAmenitiesLoading(true);
      setAmenitiesStatus('Fetching amenities from OpenStreetMap...');
      try {
        const params = new URLSearchParams({ city: selectedCity, categories: selectedAmenities.join(',') });
        const response = await fetch(`${API_BASE}/map-overlays/osm-amenities?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(body.detail || `HTTP ${response.status}`);
        }
        const data = await response.json() as {
          points?: InteractiveAmenityPoint[];
          category_metadata?: Record<string, { source?: string }>;
        };
        if (!active) return;
        const sources = new Set(Object.values(data.category_metadata || {}).map((metadata) => metadata.source));
        const cacheUsed = sources.has('soft_cache') || sources.has('stale_soft_cache');
        const points = Array.isArray(data.points) ? data.points : [];
        setAmenities(points);
        setAmenitiesStatus(`${points.length} amenities loaded${cacheUsed ? ' (soft cache)' : ''}`);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setAmenities([]);
        setAmenitiesStatus(error instanceof Error ? error.message : 'Unable to load amenities');
      } finally {
        if (active) setAmenitiesLoading(false);
      }
    };
    loadAmenities();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedAmenities, selectedCity, selectedLocation]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const loadCorridors = async () => {
      if (!selectedLocation || selectedCorridors.length === 0) {
        setCorridorLines([]);
        setCorridorsStatus(!selectedLocation ? 'Waiting for resolved city to load corridors' : 'Select corridor layers to overlay');
        return;
      }
      if (!selectedCity) {
        setCorridorLines([]);
        setCorridorsStatus('Corridors need a supported resolved city');
        return;
      }
      setCorridorsLoading(true);
      setCorridorsStatus('Fetching metro lines and highway corridors from OpenStreetMap...');
      try {
        const params = new URLSearchParams({ city: selectedCity, layers: selectedCorridors.join(',') });
        const response = await fetch(`${API_BASE}/map-overlays/osm-corridors?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(body.detail || `HTTP ${response.status}`);
        }
        const data = await response.json() as {
          highways?: InteractiveCorridorLine[];
          metro_lines?: InteractiveCorridorLine[];
          layer_metadata?: Record<string, { source?: string }>;
        };
        if (!active) return;
        const sources = new Set(Object.values(data.layer_metadata || {}).map((metadata) => metadata.source));
        const cacheUsed = sources.has('soft_cache') || sources.has('stale_soft_cache');
        const highways = (Array.isArray(data.highways) ? data.highways : []).map((line) => ({ ...line, layer: 'highways' as const }));
        const metroLines = (Array.isArray(data.metro_lines) ? data.metro_lines : []).map((line) => ({ ...line, layer: 'metro_lines' as const }));
        const lines = [...highways, ...metroLines].filter((line) => Array.isArray(line.latlngs) && line.latlngs.length > 1);
        setCorridorLines(lines);
        setCorridorsStatus(`${lines.length} corridors loaded${cacheUsed ? ' (soft cache)' : ''}`);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setCorridorLines([]);
        setCorridorsStatus(error instanceof Error ? error.message : 'Unable to load corridors');
      } finally {
        if (active) setCorridorsLoading(false);
      }
    };
    loadCorridors();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCorridors, selectedCity, selectedLocation]);

  const catchmentEntityList = useMemo(
    () => buildCatchmentEntityList(rows, moduleOutput, module2Output),
    [rows, moduleOutput, module2Output],
  );

  const catchmentGeoLabel = useMemo(() => {
    const gl = String(
      (moduleOutput?.map_output_requirements as Record<string, unknown> | undefined)?.geo_level
      || (moduleOutput as Record<string, unknown> | null)?.geo_level
      || ''
    ).toLowerCase();
    if (gl.includes('project')) return `Project-level · ${catchmentEntityList.length} entities`;
    if (gl.includes('locality') || gl.includes('micro') || gl.includes('location')) return `Locality-level · ${catchmentEntityList.length} entities`;
    return `${catchmentEntityList.length} entities`;
  }, [moduleOutput, catchmentEntityList]);

  const catchmentCategoriesForFilter = useMemo(
    () => catchmentEntityList.map(e => e.name),
    [catchmentEntityList],
  );

  const filteredInsightLayers = useMemo(
    () => {
      if (!catchmentActive) return [];
      return selectedCatchmentCategories.length > 0
        ? insightLayers.filter(l => selectedCatchmentCategories.includes(l.category))
        : insightLayers;
    },
    [insightLayers, selectedCatchmentCategories, catchmentActive],
  );

  const filteredModule31Config = useMemo(
    () => getFilteredModule31Config(module31Config, catchmentActive, selectedCatchmentCategories, catchmentEntityList.length, markers),
    [module31Config, catchmentActive, selectedCatchmentCategories, catchmentEntityList.length, markers]
  );

  useEffect(() => {
    if (!onPlottedSnapshotChange || !moduleOutput) return;
    onPlottedSnapshotChange({
      module31Config: filteredModule31Config || undefined,
      records: mergeInteractiveMarkersIntoRecords(filteredModule31Config?.records, snapshotInteractiveMarkers(markers)),
      projectMarkers: snapshotInteractiveMarkers(markers),
      amenities,
      corridors: corridorLines,
      insightLayers: filteredInsightLayers,
      runtimeContext: {
        city: selectedCity || undefined,
        location: selectedLocation || undefined,
        basemap: basemapMode,
        selectedAmenities,
        selectedCorridors,
      },
    });
  }, [
    amenities,
    basemapMode,
    corridorLines,
    filteredInsightLayers,
    filteredModule31Config,
    markers,
    moduleOutput,
    onPlottedSnapshotChange,
    selectedAmenities,
    selectedCity,
    selectedCorridors,
    selectedLocation,
  ]);

  const extraDeckLayers = useMemo(
    () => buildInteractive3DOverlayLayers({
      amenities,
      corridors: corridorLines,
      markers: catchmentActive
        ? (selectedCatchmentCategories.length > 0 && selectedCatchmentCategories.length < catchmentEntityList.length
            ? markers.filter(m => new Set(selectedCatchmentCategories).has(m.name))
            : markers)
        : [],
      insightLayers: filteredInsightLayers,
    }),
    [amenities, corridorLines, markers, filteredInsightLayers, catchmentActive, selectedCatchmentCategories, catchmentEntityList],
  );
  const locationOptions = useMemo(
    () => Array.from(new Set([resolvedCity, ...intentLocations].filter(Boolean))),
    [intentLocations, resolvedCity],
  );
  const mapCenter: [number, number] = (selectedCity ? CITY_CENTERS[selectedCity] : undefined) || DEFAULT_CENTER;
  const waitingStatus = moduleOutput
    ? readiness.isReady
      ? 'Module 3.1 is preparing the 3D map from finalized Module 2 data.'
      : 'Intent resolved. Waiting for Module 2 finalized data before Module 3.1 starts.'
    : 'Submit a query to resolve intent and load the map.';

  const overlayToolbar = (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">MapView</p>
        <h3 className="text-sm font-extrabold text-slate-950">Interactive Map 3D</h3>
      </div>

      <SpatialInsightV2ToolbarButtons
        busy={spatialInsightActions?.busy}
        osmBusy={spatialInsightActions?.osmBusy}
        onTakeSnapshot={spatialInsightActions?.onTakeSnapshot}
        onFetchOsm={spatialInsightActions?.onFetchOsm}
        disabled={spatialInsightActions?.disabled}
        visible={Boolean(spatialInsightActions)}
      />

      {isLoadingModule31 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-violet-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Module 3.1 processing
        </span>
      ) : module31Config ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
          <TrendingUp className="h-3 w-3" />
          OSM overlays active
        </span>
      ) : null}

      <label className="ml-auto flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Location
        <select
          value={selectedLocation}
          onChange={(event) => setSelectedLocation(event.target.value)}
          className="max-w-[190px] bg-transparent text-[10px] font-extrabold uppercase tracking-widest text-slate-700 outline-none"
        >
          {locationOptions.length > 0 ? (
            locationOptions.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))
          ) : (
            <option value="">No resolved location</option>
          )}
        </select>
      </label>

      <IntelligenceLayerFilter
        selectedAmenities={selectedAmenities}
        setSelectedAmenities={setSelectedAmenities}
        selectedCorridors={selectedCorridors}
        setSelectedCorridors={setSelectedCorridors}
        catchmentCategories={catchmentCategoriesForFilter}
        catchmentGeoLabel={catchmentGeoLabel}
        onCatchmentCategoriesChange={setSelectedCatchmentCategories}
        onCatchmentActiveChange={setCatchmentActive}
      />
    </div>
  );

  const statusFooter = (
    <div className="flex flex-wrap items-center justify-between Gap-3 border-t border-slate-100 bg-white px-5 py-3">
      <div className="grid flex-1 Gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 md:grid-cols-4">
        <span>
          {filteredModule31Config
            ? `${filteredModule31Config.records.length} records · same 3D map family renderer`
            : isLoadingModule31
              ? 'Module 3.1 processing finalized data'
              : waitingStatus}
        </span>
        <span>{filteredModule31Config ? 'module_3_1_records + osm overlays' : 'Waiting for Module 3.1'}</span>
        <span>{amenitiesLoading ? 'Waiting for OSM amenities...' : amenitiesStatus}</span>
        <span>{corridorsLoading ? 'Waiting for OSM corridors...' : corridorsStatus}</span>
      </div>
      <SpatialInsightV2ToolbarButtons
        busy={spatialInsightActions?.busy}
        osmBusy={spatialInsightActions?.osmBusy}
        onTakeSnapshot={spatialInsightActions?.onTakeSnapshot}
        onFetchOsm={spatialInsightActions?.onFetchOsm}
        disabled={spatialInsightActions?.disabled}
        visible={Boolean(spatialInsightActions)}
      />
    </div>
  );

  if (filteredModule31Config) {
    return (
      <section className="flex h-full min-h-[680px] flex-col bg-white">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
        {overlayToolbar}
        <div className="min-h-0 flex-1">
          <GeneratedMapView
            key={filteredModule31Config.id}
            config={filteredModule31Config}
            basemapMode={basemapMode}
            onBasemapModeChange={onBasemapModeChange}
            onLoaded={onMapLoaded}
            extraDeckLayers={extraDeckLayers}
            overlayTooltip={getInteractive3DTooltip}
          />
        </div>
        {statusFooter}
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-[680px] flex-col bg-white">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      {overlayToolbar}
      <div className="relative min-h-[560px] flex-1">
        {readiness.isReady && isLoadingModule31 ? (
          <div className="flex h-full min-h-[560px] flex-col items-center justify-center bg-slate-50 px-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="mt-4 text-sm font-extrabold text-slate-900">Building Interactive Map 3D</p>
            <p className="mt-2 max-w-md text-xs font-semibold leading-5 text-slate-500">
              Module 3.1 is generating the same 3D map family renderer. OSM amenities and corridors will overlay once ready.
            </p>
          </div>
        ) : (
          <>
            <Interactive3DPreviewMap
              center={mapCenter}
              amenities={amenities}
              corridors={corridorLines}
              markers={markers}
              basemapMode={basemapMode}
              onBasemapModeChange={onBasemapModeChange}
              insightLayers={insightLayers}
            />
            <div className="pointer-events-none absolute left-4 top-4 z-20 max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Resolved Location</p>
              <p className="mt-1 text-base font-extrabold text-slate-950">{selectedLocation || selectedCity || 'No resolved location'}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                Amenities and corridors are loaded from intent. The fine-tuned 3D map will appear after Module 2 and Module 3.1 finish.
              </p>
            </div>
          </>
        )}
      </div>
      {statusFooter}
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
  const actionLabel = VIEWER_ACTION_LABEL[activeFamily];
  const showGenerateButton = !INTERACTIVE_VIEWER_FAMILIES.has(activeFamily);

  return (
    <div className="flex h-full min-h-[540px] flex-col items-center justify-center bg-white px-6 text-center">
      {showGenerateButton ? (
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
      ) : null}
      {!readiness.isReady ? (
        <p className={`${showGenerateButton ? 'mt-4' : ''} max-w-md text-xs font-semibold leading-5 text-slate-500`}>
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
  retrievalOutput = null,
  onRuntimeGeneratedMapsChange,
  pendingPlottableEnrichment = null,
  onPlottableEnrichmentApplied,
  spatialV2Busy = false,
  spatialV2OsmBusy = false,
  onTakeSpatialSnapshot,
  onFetchExpandedOsm,
}) => {
  const [leafletReady, setLeafletReady] = useState(false);
  const [activeViewerModule, setActiveViewerModule] = useState<'3.1' | '3'>('3.1');
  const [generatedBasemapMode, setGeneratedBasemapMode] = useState<GeneratedBasemapMode>('satellite');
  const [activeFamily, setActiveFamily] = useState<ViewerMapCategory>('interactive-map');
  const [activeSampleFamily, setActiveSampleFamily] = useState<GeneratedMapFamily>('interactive-map');
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

  // ── Auto-trigger Module 3.1 for Interactive Map ─────────────────────────────
  const [interactiveModule31Config, setInteractiveModule31Config] = useState<GeneratedMapConfig | null>(null);
  const [interactiveM31Error, setInteractiveM31Error] = useState<string | null>(null);
  const [isGeneratingInteractiveM31, setIsGeneratingInteractiveM31] = useState(false);
  const prevModule2IdRef = useRef<string | null>(null);
  const [interactive3DModule31Config, setInteractive3DModule31Config] = useState<GeneratedMapConfig | null>(null);
  const [isGeneratingInteractive3DM31, setIsGeneratingInteractive3DM31] = useState(false);
  const prevModule23DIdRef = useRef<string | null>(null);
  const [interactive2DSoftCache, setInteractive2DSoftCache] = useState<InteractiveMapSoftCache | null>(null);
  const [interactive3DSoftCache, setInteractive3DSoftCache] = useState<InteractiveMapSoftCache | null>(null);

  const readiness = useMemo(
    () => getModule31Readiness(moduleOutput, module2Output),
    [moduleOutput, module2Output],
  );
  const mapsForFamily = generatedMaps.filter((map) => isMapInViewerCategory(map, activeFamily));
  const selectedGenerationTarget = useMemo<Module31GenerationTarget>(() => ({
    requested_map_family: getGenerationFamilyForViewer(activeFamily),
    requested_map_type: activeFamily === '3d' || activeFamily === 'interactive-map-3d'
      ? getAutomatic3DMapType(moduleOutput, module2Output)
      : getMapTypeForFamily(getGenerationFamilyForViewer(activeFamily), moduleOutput),
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
      ...(interactive2DSoftCache
        ? [
            softCacheToRuntimeOption(
              interactive2DSoftCache,
              moduleOutput,
              module2Output,
              interactiveModule31Config?.module31,
            ),
          ]
        : []),
      ...(interactive3DSoftCache
        ? [
            softCacheToRuntimeOption(
              interactive3DSoftCache,
              moduleOutput,
              module2Output,
              interactive3DModule31Config?.module31,
            ),
          ]
        : []),
    ],
    [
      fullMaps,
      generatedMaps,
      interactive2DSoftCache,
      interactive3DSoftCache,
      interactiveModule31Config?.module31,
      interactive3DModule31Config?.module31,
      module2Output,
      moduleOutput,
    ],
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

  const handleInteractive2DPlottedChange = React.useCallback(
    (delta: InteractivePlottedDelta) => {
      const sessionKey = buildInteractiveSessionKey(moduleOutput, module2Output);
      if (!sessionKey) return;
      const city = resolveInteractiveCity(moduleOutput) || delta.runtimeContext?.city || undefined;
      setInteractive2DSoftCache((previous) =>
        mergeInteractiveSnapshot(previous, delta, {
          viewer: 'interactive-map',
          sessionKey,
          city,
        }),
      );
    },
    [module2Output, moduleOutput],
  );

  const handleInteractive3DPlottedChange = React.useCallback(
    (delta: InteractivePlottedDelta) => {
      const sessionKey = buildInteractiveSessionKey(moduleOutput, module2Output);
      if (!sessionKey) return;
      const city = resolveInteractiveCity(moduleOutput) || delta.runtimeContext?.city || undefined;
      setInteractive3DSoftCache((previous) =>
        mergeInteractiveSnapshot(previous, delta, {
          viewer: 'interactive-map-3d',
          sessionKey,
          city,
        }),
      );
    },
    [module2Output, moduleOutput],
  );

  const resolveInteractive2DPlotted = React.useCallback((): InteractiveMapPlottedSnapshot | null => {
    const cached = interactive2DSoftCache?.plottedSnapshot;
    if (cached?.records?.length || cached?.projectMarkers?.length) return cached;
    return buildInteractivePlottedSnapshotFromRuntime(
      interactiveModule31Config,
      moduleOutput,
      module2Output,
      retrievalOutput,
      generatedBasemapMode,
      cached ?? undefined,
    );
  }, [
    generatedBasemapMode,
    interactive2DSoftCache?.plottedSnapshot,
    interactiveModule31Config,
    module2Output,
    moduleOutput,
    retrievalOutput,
  ]);

  const resolveInteractive3DPlotted = React.useCallback((): InteractiveMapPlottedSnapshot | null => {
    const cached = interactive3DSoftCache?.plottedSnapshot;
    if (cached?.records?.length || cached?.projectMarkers?.length) return cached;
    return buildInteractivePlottedSnapshotFromRuntime(
      interactive3DModule31Config,
      moduleOutput,
      module2Output,
      retrievalOutput,
      generatedBasemapMode,
      cached ?? undefined,
    );
  }, [
    generatedBasemapMode,
    interactive3DSoftCache?.plottedSnapshot,
    interactive3DModule31Config,
    module2Output,
    moduleOutput,
    retrievalOutput,
  ]);

  const interactive2DSpatialActions = useMemo(() => {
    if (!onTakeSpatialSnapshot && !onFetchExpandedOsm) return undefined;
    const disabled = !moduleOutput || !resolveInteractive2DPlotted();
    return {
      visible: true,
      busy: spatialV2Busy,
      osmBusy: spatialV2OsmBusy,
      disabled,
      onTakeSnapshot: onTakeSpatialSnapshot
        ? () => {
            const livePlotted = resolveInteractive2DPlotted();
            if (!livePlotted) return;
            void onTakeSpatialSnapshot('interactive-map', livePlotted);
          }
        : undefined,
      onFetchOsm: onFetchExpandedOsm
        ? () => {
            const livePlotted = resolveInteractive2DPlotted();
            if (!livePlotted) return;
            void onFetchExpandedOsm('interactive-map', livePlotted);
          }
        : undefined,
    };
  }, [
    moduleOutput,
    onFetchExpandedOsm,
    onTakeSpatialSnapshot,
    resolveInteractive2DPlotted,
    spatialV2Busy,
    spatialV2OsmBusy,
  ]);

  const interactive3DSpatialActions = useMemo(() => {
    if (!onTakeSpatialSnapshot && !onFetchExpandedOsm) return undefined;
    const disabled = !moduleOutput || !resolveInteractive3DPlotted();
    return {
      visible: true,
      busy: spatialV2Busy,
      osmBusy: spatialV2OsmBusy,
      disabled,
      onTakeSnapshot: onTakeSpatialSnapshot
        ? () => {
            const livePlotted = resolveInteractive3DPlotted();
            if (!livePlotted) return;
            void onTakeSpatialSnapshot('interactive-map-3d', livePlotted);
          }
        : undefined,
      onFetchOsm: onFetchExpandedOsm
        ? () => {
            const livePlotted = resolveInteractive3DPlotted();
            if (!livePlotted) return;
            void onFetchExpandedOsm('interactive-map-3d', livePlotted);
          }
        : undefined,
    };
  }, [
    moduleOutput,
    onFetchExpandedOsm,
    onTakeSpatialSnapshot,
    resolveInteractive3DPlotted,
    spatialV2Busy,
    spatialV2OsmBusy,
  ]);

  const applyPlottableEnrichmentToCache = React.useCallback(
    (
      cache: InteractiveMapSoftCache | null,
      setCache: React.Dispatch<React.SetStateAction<InteractiveMapSoftCache | null>>,
      mapId: string,
      points: Module7PlottableEnrichmentPoint[],
      corridors: Module7PlottableEnrichmentCorridor[],
    ) => {
      if (!cache || cache.id !== mapId) return false;
      if (points.length === 0 && corridors.length === 0) return false;

      const nextLayers = plottablePointsToInsightLayers(
        points,
        cache.plottedSnapshot.amenities,
        cache.plottedSnapshot.insightLayers,
      );
      const nextCorridors = plottableCorridorsToInteractiveCorridors(
        corridors,
        cache.plottedSnapshot.corridors,
      );
      if (nextLayers.length === 0 && nextCorridors.length === 0) return true;

      const delta: InteractivePlottedDelta = {};
      if (nextLayers.length > 0) delta.insightLayers = nextLayers;
      if (nextCorridors.length > 0) {
        delta.corridors = [...cache.plottedSnapshot.corridors, ...nextCorridors];
      }

      setCache((previous) =>
        previous
          ? mergeInteractiveSnapshot(
              previous,
              delta,
              {
                viewer: previous.viewer,
                sessionKey: previous.sessionKey,
                city: previous.plottedSnapshot.runtimeContext.city,
              },
            )
          : previous,
      );
      return true;
    },
    [],
  );

  useEffect(() => {
    if (!pendingPlottableEnrichment) return;
    const { mapId, points, corridors } = pendingPlottableEnrichment;
    const handled2D = applyPlottableEnrichmentToCache(
      interactive2DSoftCache,
      setInteractive2DSoftCache,
      mapId,
      points,
      corridors,
    );
    const handled3D = applyPlottableEnrichmentToCache(
      interactive3DSoftCache,
      setInteractive3DSoftCache,
      mapId,
      points,
      corridors,
    );
    if (handled2D || handled3D) {
      onPlottableEnrichmentApplied?.();
    }
  }, [
    applyPlottableEnrichmentToCache,
    interactive2DSoftCache,
    interactive3DSoftCache,
    onPlottableEnrichmentApplied,
    pendingPlottableEnrichment,
  ]);

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

  // Update parent registry about runtime maps
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

  useEffect(() => {
    if (activeFamily !== 'interactive-map') return;
    if (!moduleOutput || !module2Output || !readiness.isReady) return;

    const m2Id = (module2Output as unknown as Record<string, unknown>).cache_key as string
      || JSON.stringify(module2Output).slice(0, 64);
    if (m2Id === prevModule2IdRef.current) return;
    prevModule2IdRef.current = m2Id;

    setInteractiveModule31Config(null);
    setInteractiveM31Error(null);
    setInteractive2DSoftCache(null);
    setIsGeneratingInteractiveM31(true);

    requestModule31Generation(moduleOutput, module2Output, {
      requested_map_family: '2d',
      requested_map_type: getMapTypeForFamily('2d', moduleOutput),
    })
      .then((m31Output) => {
        const baseConfig = buildGeneratedMapConfig(moduleOutput, module2Output);
        const finalConfig = applyModule31Output(baseConfig, m31Output);
        setInteractiveModule31Config(finalConfig);
      })
      .catch((err: unknown) => {
        console.warn('[InteractiveMap] Auto Module 3.1 failed, falling back to Kimi K2 validation:', err);
        setInteractiveM31Error(String(err));
      })
      .finally(() => {
        setIsGeneratingInteractiveM31(false);
      });
  }, [activeFamily, module2Output, moduleOutput, readiness.isReady]);

  useEffect(() => {
    if (activeFamily !== 'interactive-map-3d') return;
    if (!moduleOutput || !module2Output || !readiness.isReady) return;

    const m2Id = (module2Output as unknown as Record<string, unknown>).cache_key as string
      || JSON.stringify(module2Output).slice(0, 64);
    if (m2Id === prevModule23DIdRef.current) return;
    prevModule23DIdRef.current = m2Id;

    setInteractive3DModule31Config(null);
    setInteractive3DSoftCache(null);
    setIsGeneratingInteractive3DM31(true);

    requestModule31Generation(moduleOutput, module2Output, {
      requested_map_family: '3d',
      requested_map_type: getAutomatic3DMapType(moduleOutput, module2Output),
    })
      .then((m31Output) => {
        const baseConfig = buildGeneratedMapConfig(moduleOutput, module2Output);
        const finalConfig = applyModule31Output(baseConfig, m31Output);
        setInteractive3DModule31Config(finalConfig);
      })
      .catch((err: unknown) => {
        console.warn('[InteractiveMap3D] Auto Module 3.1 failed, keeping retrieval/runtime 3D view:', err);
      })
      .finally(() => {
        setIsGeneratingInteractive3DM31(false);
      });
  }, [activeFamily, module2Output, moduleOutput, readiness.isReady]);

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
                    setActiveSampleFamily(nextFamily === 'interactive-map-3d' ? '3d' : getGenerationFamilyForViewer(nextFamily));
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
                        {activeFamily === '2d' ? 'Default 2D Sample Maps' : `Default ${VIEWER_FAMILY_LABEL[activeFamily]}`}
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

              {readiness.isReady && !INTERACTIVE_VIEWER_FAMILIES.has(activeFamily) ? (
                <button
                  onClick={handleGenerateMap}
                  disabled={isGenerating}
                  title={
                    cachedMapForSelectedTarget
                      ? `Open the cached ${VIEWER_ACTION_LABEL[activeFamily]} generated from this Module 2 data`
                      : `Generate ${VIEWER_ACTION_LABEL[activeFamily]} from the finalized Module 2 data`
                  }
                  className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  {cachedMapForSelectedTarget ? `View ${VIEWER_ACTION_LABEL[activeFamily]}` : `Generate ${VIEWER_ACTION_LABEL[activeFamily]}`}
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

      <div className="relative min-h-0 flex-1 bg-slate-50">
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
            ) : INTERACTIVE_VIEWER_FAMILIES.has(activeFamily) && !moduleOutput ? (
              <InteractiveMapPendingState />
            ) : activeFamily === 'interactive-map' ? (
              <InteractiveRuntimeMapView
                key="interactive-map-runtime"
                moduleOutput={moduleOutput}
                module2Output={module2Output}
                retrievalOutput={retrievalOutput}
                module31Config={interactiveModule31Config}
                isLoadingModule31={isGeneratingInteractiveM31}
                m31Error={interactiveM31Error}
                readiness={readiness}
                basemapMode={generatedBasemapMode}
                onBasemapModeChange={setGeneratedBasemapMode}
                onMapLoaded={handleGeneratedMapLoaded}
                insightLayers={interactive2DSoftCache?.plottedSnapshot.insightLayers || []}
                onPlottedSnapshotChange={handleInteractive2DPlottedChange}
                spatialInsightActions={interactive2DSpatialActions}
              />
            ) : activeFamily === 'interactive-map-3d' ? (
              <InteractiveRuntime3DMapView
                key="interactive-map-3d-runtime"
                moduleOutput={moduleOutput}
                module2Output={module2Output}
                retrievalOutput={retrievalOutput}
                module31Config={interactive3DModule31Config}
                isLoadingModule31={isGeneratingInteractive3DM31}
                readiness={readiness}
                basemapMode={generatedBasemapMode}
                onBasemapModeChange={setGeneratedBasemapMode}
                onMapLoaded={handleGeneratedMapLoaded}
                insightLayers={interactive3DSoftCache?.plottedSnapshot.insightLayers || []}
                onPlottedSnapshotChange={handleInteractive3DPlottedChange}
                spatialInsightActions={interactive3DSpatialActions}
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
                  (SHOW_VISUALIZATION_DEFAULT_MAPS ? loadedSampleMap?.mapLabel || FAMILY_LABEL[activeSampleFamily] : VIEWER_FAMILY_LABEL[activeFamily])
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
