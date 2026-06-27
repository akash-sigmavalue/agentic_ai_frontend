'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, Download, Layers, Trash2, Circle, Maximize2, Minimize2 } from 'lucide-react';
import type { AmenityPoint } from './overlays/AmenitiesOverlay';
import type { HighwayData, MetroLineData, MetroStationData, MetroVisibility, MetroDataBundle } from './overlays/MetroCorridor';
import type { RoadMapData } from './overlays/RoadWidth';
import { CATEGORY_CONFIG, CITIES } from './overlays/AmenitiesOverlay';

interface PriceDataItem {
  project_id: number;
  project_name: string;
  latitude: number;
  longitude: number;
  village_names: string;
  year_latest: number;
  year_previous: number;
  avg_ca_latest: number | null;
  avg_sa_latest: number | null;
  avg_ca_previous: number | null;
  avg_sa_previous: number | null;
  growth_pct_ca: number | null;
  growth_pct_sa: number | null;
}

// ── Dynamic imports (SSR-safe) ─────────────────────────────
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const MarkerDyn = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const PopupDyn = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const CircleDyn = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });

// Lazy overlay logic imports (re-use existing overlay components for data loading)
import AmenitiesOverlayLogic from './overlays/AmenitiesOverlay';
import MetroCorridorLogic from './overlays/MetroCorridor';
import RoadWidthLogic, { RoadWidthRef } from './overlays/RoadWidth';
import { apiUrl } from '@/lib/api-client';

// ── Configuration ──────────────────────────────────────────
const CITY_CENTERS: Record<string, [number, number]> = {
  Pune: [18.52, 73.85], Mumbai: [19.07, 72.87], Thane: [19.2, 72.97],
  Hyderabad: [17.38, 78.48], Bengaluru: [12.97, 77.59], Dubai: [25.20, 55.27],
};
const CITY_IDS: Record<string, number> = { Pune: 1, Mumbai: 2, Thane: 3, Hyderabad: 4, Bengaluru: 5, Dubai: 6 };

const SECTIONS: Record<string, string[]> = {
  'Development Planning': ['Amenities Overlay', 'Metro Lines and Highway Corridors', 'Road Width Analysis'],
  'Catchment Intelligence': ['Price Momentum', 'Rate Analysis'],
};

type MapLayerType = 'light' | 'dark' | 'satellite';

// ── Map Updater ────────────────────────────────────────────
function MapUpdater({ center, zoom, isFullscreen }: { center: [number, number]; zoom: number; isFullscreen?: boolean }) {
  const [leaflet, setLeaflet] = useState<any>(null);
  useEffect(() => { import('react-leaflet').then((mod) => setLeaflet(mod)); }, []);
  if (!leaflet) return null;
  const Inner = () => { 
    const map = leaflet.useMap(); 
    useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]); 
    useEffect(() => {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
    }, [isFullscreen, map]);
    return null; 
  };
  return <Inner />;
}

// ── Draw Control (polygon draw/delete on map) ──────────────
const DrawControlInner = React.memo(function DrawControlInner({ onCreatedRef, onDeletedRef }: { onCreatedRef: React.MutableRefObject<(geoJson: any) => void>; onDeletedRef: React.MutableRefObject<() => void> }) {
  const [rl, setRl] = useState<any>(null);
  useEffect(() => { import('react-leaflet').then((mod) => setRl(mod)); }, []);
  if (!rl) return null;
  const Inner2 = () => {
    const map = rl.useMap();
    const initRef = React.useRef(false);
    useEffect(() => {
      if (initRef.current) return;
      initRef.current = true;
      import('leaflet').then((L: any) => {
        import('leaflet-draw').then(() => {
          const drawnItems = new L.FeatureGroup();
          map.addLayer(drawnItems);
          const drawControl = new (L.Control as any).Draw({
            position: 'topleft',
            draw: {
              polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#3b82f6', weight: 2, fillOpacity: 0.15 } },
              polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
            },
            edit: { featureGroup: drawnItems, remove: true },
          });
          map.addControl(drawControl);
          map.on('draw:created', (e: any) => {
            drawnItems.clearLayers();
            drawnItems.addLayer(e.layer);
            const geoJson = e.layer.toGeoJSON();
            onCreatedRef.current(geoJson);
          });
          map.on('draw:deleted', () => { onDeletedRef.current(); });
        });
      });
      // No cleanup — we want the control to persist for the lifetime of the map
    }, [map, onCreatedRef, onDeletedRef]);
    return null;
  };
  return <Inner2 />;
});

function DrawControl({ onPolygonCreated, onPolygonDeleted }: { onPolygonCreated: (geoJson: any) => void; onPolygonDeleted: () => void }) {
  const createdRef = React.useRef(onPolygonCreated);
  const deletedRef = React.useRef(onPolygonDeleted);
  createdRef.current = onPolygonCreated;
  deletedRef.current = onPolygonDeleted;
  return <DrawControlInner onCreatedRef={createdRef} onDeletedRef={deletedRef} />;
}

// ── Icon helpers ───────────────────────────────────────────
function createMarkerIconHtml(category: string): string {
  const cfg = CATEGORY_CONFIG[category];
  if (!cfg) return '';
  return `<div style="background:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px solid ${cfg.color};box-shadow:0 1px 4px rgba(0,0,0,.15)"><i class="fas ${cfg.icon}" style="color:${cfg.color};font-size:14px"></i></div>`;
}
function createGrowthMarkerHtml(growth: number | null): string {
  const isNull = growth === null || growth === undefined;
  const bg = isNull ? '#f59e0b' : growth! > 0 ? '#10b981' : '#ef4444';
  const sign = growth !== null && growth !== undefined && growth > 0 ? '+' : '';
  const display = isNull ? '?' : `${sign}${Math.round(growth!)}%`;
  return `<div style="background:${bg};color:white;font-weight:700;font-size:11px;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,.3);border:2px solid white">${display}</div>`;
}
function createRateMarkerHtml(rate: number | null): string {
  const isNull = rate === null || rate === undefined;
  const bg = isNull ? '#f59e0b' : '#3b82f6';
  const display = isNull ? '?' : `₹${Math.round(rate!)}`;
  return `<div style="background:${bg};color:white;font-weight:700;font-size:10px;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,.3);border:2px solid white">${display}</div>`;
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
interface MapOverlayViewProps {
  isFullscreen?: boolean;
  toggleFullscreen?: () => void;
  onInsightDataReady?: (payload: {
    mapId: string;
    mapLabel: string;
    plottedData: Record<string, unknown>;
  } | null) => void;
}

const MapOverlayView: React.FC<MapOverlayViewProps> = ({ isFullscreen, toggleFullscreen, onInsightDataReady }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [L, setL] = useState<any>(null);

  // Section state
  const [sectionCategory, setSectionCategory] = useState('Development Planning');
  const [activeSection, setActiveSection] = useState('Amenities Overlay');

  // Map & filter states
  const [selectedCity, setSelectedCity] = useState('Pune');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['metro_stations']);
  const [polygonGeoJson, setPolygonGeoJson] = useState<any>(null);
  const [filterMode, setFilterMode] = useState('none');
  const [savedCoordinate, setSavedCoordinate] = useState<[number, number] | null>(null);
  const [circleRadius, setCircleRadius] = useState<number | null>(null);
  const [coordInput, setCoordInput] = useState('');
  const [radiusInput, setRadiusInput] = useState('');
  const [mapLayer, setMapLayer] = useState<MapLayerType>('light');

  const roadWidthRef = useRef<RoadWidthRef | null>(null);
  const [roadAnalysisLoading, setRoadAnalysisLoading] = useState(false);

  // Data stores
  const [allAmenities, setAllAmenities] = useState<AmenityPoint[]>([]);
  const [pointsToShow, setPointsToShow] = useState<AmenityPoint[]>([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [amenitiesStatus, setAmenitiesStatus] = useState('Loading Pune metro stations from OpenStreetMap...');
  const [highwaysData, setHighwaysData] = useState<HighwayData[]>([]);
  const [metroLinesData, setMetroLinesData] = useState<MetroLineData[]>([]);
  const [metroStationsData, setMetroStationsData] = useState<MetroStationData[]>([]);
  const [metroVisibility, setMetroVisibility] = useState<MetroVisibility>({ highways: true, metroLines: true, metroStations: true });
  const [priceData, setPriceData] = useState<PriceDataItem[]>([]);
  const [filteredPriceData, setFilteredPriceData] = useState<PriceDataItem[]>([]);
  const [priceRateType, setPriceRateType] = useState('carpet');
  const [villagesList, setVillagesList] = useState<string[]>([]);
  const [selectedVillage, setSelectedVillage] = useState('All');
  const [roadData, setRoadData] = useState<RoadMapData[]>([]);
  const [rateData, setRateData] = useState<PriceDataItem[]>([]);
  const [filteredRateData, setFilteredRateData] = useState<PriceDataItem[]>([]);
  const [rateRateType, setRateRateType] = useState('carpet');
  const [rateVillagesList, setRateVillagesList] = useState<string[]>([]);
  const [rateSelectedVillage, setRateSelectedVillage] = useState('All');
  const [rateLoading, setRateLoading] = useState(false);
  const [filteredHighways, setFilteredHighways] = useState<HighwayData[]>([]);
  const [filteredMetroLines, setFilteredMetroLines] = useState<MetroLineData[]>([]);
  const [filteredMetroStations, setFilteredMetroStations] = useState<MetroStationData[]>([]);

  // ── Init Leaflet ─────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true);
    import('leaflet').then((leaflet) => {
      const proto = leaflet.Icon.Default.prototype as any;
      delete proto._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      setL(leaflet);
    });
  }, []);

  // ── Derived ──────────────────────────────────────────────
  const overlayMode =
    activeSection === 'Amenities Overlay' ? 'amenities' :
    activeSection === 'Metro Lines and Highway Corridors' ? 'metro' :
    activeSection === 'Price Momentum' ? 'price' :
    activeSection === 'Road Width Analysis' ? 'road' :
    activeSection === 'Rate Analysis' ? 'rate' : 'none';

  const mapCenter: [number, number] = savedCoordinate || CITY_CENTERS[selectedCity] || [18.52, 73.85];
  const mapZoom = savedCoordinate ? 14 : 12;

  // ── Callbacks ────────────────────────────────────────────
  const handleMetroDataLoaded = useCallback((data: MetroDataBundle) => {
    setHighwaysData(data.highways); setMetroLinesData(data.metroLines); setMetroStationsData(data.metroStations);
  }, []);
  const handleMetroToggle = useCallback((layer: keyof MetroVisibility) => {
    setMetroVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);
  const handleRoadDataLoaded = useCallback((roads: RoadMapData[]) => { setRoadData(roads); }, []);

  useEffect(() => {
    if (!onInsightDataReady) return;

    const base = {
      city: selectedCity,
      section: activeSection,
      map_family: '2d',
    };
    if (overlayMode === 'amenities' && allAmenities.length > 0) {
      onInsightDataReady({
        mapId: 'default:2d:amenities',
        mapLabel: 'Default Amenities Overlay',
        plottedData: { ...base, records: allAmenities },
      });
      return;
    }
    if (overlayMode === 'metro' && highwaysData.length + metroLinesData.length + metroStationsData.length > 0) {
      onInsightDataReady({
        mapId: 'default:2d:metro-corridors',
        mapLabel: 'Default Metro Lines and Highway Corridors',
        plottedData: {
          ...base,
          highways: highwaysData,
          metro_lines: metroLinesData,
          metro_stations: metroStationsData,
        },
      });
      return;
    }
    if (overlayMode === 'price' && priceData.length > 0) {
      onInsightDataReady({
        mapId: 'default:2d:price-momentum',
        mapLabel: 'Default Price Momentum',
        plottedData: { ...base, records: priceData, metric: priceRateType },
      });
      return;
    }
    if (overlayMode === 'road' && roadData.length > 0) {
      onInsightDataReady({
        mapId: 'default:2d:road-width',
        mapLabel: 'Default Road Width Analysis',
        plottedData: { ...base, records: roadData },
      });
      return;
    }
    if (overlayMode === 'rate' && rateData.length > 0) {
      onInsightDataReady({
        mapId: 'default:2d:rate-analysis',
        mapLabel: 'Default Rate Analysis',
        plottedData: { ...base, records: rateData, metric: rateRateType },
      });
      return;
    }
    onInsightDataReady(null);
  }, [
    activeSection,
    allAmenities,
    highwaysData,
    metroLinesData,
    metroStationsData,
    onInsightDataReady,
    overlayMode,
    priceData,
    priceRateType,
    rateData,
    rateRateType,
    roadData,
    selectedCity,
  ]);

  // ── Filtering ────────────────────────────────────────────
  useEffect(() => {
    const pointInPolygon = (pt: [number, number], vs: [number, number][]) => {
      const [x, y] = pt; let inside = false;
      for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const [xi, yi] = vs[i]; const [xj, yj] = vs[j];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    };
    const inside = (lat: number, lon: number): boolean => {
      if (filterMode === 'polygon' && polygonGeoJson) {
        try { const coords = polygonGeoJson.geometry.coordinates[0]; return pointInPolygon([lat, lon], coords.map((c: number[]) => [c[1], c[0]])); } catch { return false; }
      } else if (filterMode === 'circle' && circleRadius && savedCoordinate && L) {
        return L.latLng(savedCoordinate[0], savedCoordinate[1]).distanceTo(L.latLng(lat, lon)) <= circleRadius;
      }
      return true;
    };
    setPointsToShow(filterMode !== 'none' ? allAmenities.filter((p) => inside(p.lat, p.lon)) : allAmenities);
    if (filterMode !== 'none') {
      setFilteredHighways(highwaysData.filter((h) => h.latlngs.some(([lat, lon]) => inside(lat, lon))));
      setFilteredMetroLines(metroLinesData.filter((l) => l.latlngs.some(([lat, lon]) => inside(lat, lon))));
      setFilteredMetroStations(metroStationsData.filter((s) => inside(s.lat, s.lon)));
    } else {
      setFilteredHighways(highwaysData); setFilteredMetroLines(metroLinesData); setFilteredMetroStations(metroStationsData);
    }
    setFilteredPriceData(filterMode !== 'none' ? (Array.isArray(priceData) ? priceData.filter((i) => inside(i.latitude, i.longitude)) : []) : (Array.isArray(priceData) ? priceData : []));
    setFilteredRateData(filterMode !== 'none' ? (Array.isArray(rateData) ? rateData.filter((i) => inside(i.latitude, i.longitude)) : []) : (Array.isArray(rateData) ? rateData : []));
  }, [allAmenities, filterMode, polygonGeoJson, circleRadius, savedCoordinate, highwaysData, metroLinesData, metroStationsData, priceData, rateData, L]);

  // ── Backend fetches ──────────────────────────────────────
  useEffect(() => {
    if (activeSection !== 'Price Momentum' && activeSection !== 'Rate Analysis') return;
    const cityId = CITY_IDS[selectedCity]; if (!cityId) return;
    fetch(apiUrl(`/map-overlays/villages-for-city?city_id=${cityId}`))
      .then((r) => r.json())
      .then((data) => { if (activeSection === 'Price Momentum') setVillagesList(data.villages || []); else setRateVillagesList(data.villages || []); })
      .catch(() => {});
  }, [activeSection, selectedCity]);

  const handlePriceFetch = useCallback(async () => {
    const cityId = CITY_IDS[selectedCity]; if (!cityId) return;
    try { let url = apiUrl(`/map-overlays/price-momentum?city_id=${cityId}`); if (selectedVillage !== 'All') url += `&village_name=${encodeURIComponent(selectedVillage)}`; const r = await fetch(url); const data = await r.json(); setPriceData(Array.isArray(data) ? data : []); } catch { setPriceData([]); }
  }, [selectedCity, selectedVillage]);

  const handleRateFetch = useCallback(async () => {
    const cityId = CITY_IDS[selectedCity]; if (!cityId) return;
    setRateLoading(true);
    try { let url = apiUrl(`/map-overlays/price-momentum?city_id=${cityId}`); if (rateSelectedVillage !== 'All') url += `&village_name=${encodeURIComponent(rateSelectedVillage)}`; const r = await fetch(url); const data = await r.json(); setRateData(Array.isArray(data) ? data : []); } catch { setRateData([]); }
    finally { setRateLoading(false); }
  }, [selectedCity, rateSelectedVillage]);

  const handleSaveCoordinate = () => {
    const parts = coordInput.replace(',', ' ').split(/\s+/);
    if (parts.length === 2) { const lat = parseFloat(parts[0]); const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) { setSavedCoordinate([lat, lon]); setPolygonGeoJson(null); setCircleRadius(null); setFilterMode('none'); } else alert('Invalid format');
    } else alert('Use "lat, lon" format');
  };

  const handleApplyRadius = () => {
    const r = parseFloat(radiusInput);
    if (!isNaN(r) && r > 0 && savedCoordinate) { setCircleRadius(r); setFilterMode('circle'); setPolygonGeoJson(null); }
  };

  const createDivIcon = useCallback((html: string, size: number) => {
    if (!L) return undefined;
    return L.divIcon({ html, iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size / 2], className: '' });
  }, [L]);

  const handleDownloadCSV = () => {
    let rows: string[][] = [];
    if (overlayMode === 'amenities') {
      rows = [['Name', 'Category', 'Latitude', 'Longitude'], ...pointsToShow.map((p) => [p.name || 'Unnamed', CATEGORY_CONFIG[p.category]?.name || p.category, String(p.lat), String(p.lon)])];
    } else if (overlayMode === 'metro') {
      rows = [['Name', 'Type', 'Details']];
      filteredHighways.forEach((h) => rows.push([h.name || 'Unnamed', 'Highway', h.ref || '']));
      filteredMetroLines.forEach((l) => rows.push([l.name, 'Metro Line', '']));
      filteredMetroStations.forEach((s) => rows.push([s.name, 'Metro Station', s.operator || '']));
    } else if (overlayMode === 'price') {
      rows = [['Project', 'Villages', 'Year', 'Rate', 'Growth (%)'], ...filteredPriceData.map((i) => {
        const g = priceRateType === 'carpet' ? i.growth_pct_ca : i.growth_pct_sa;
        const r = priceRateType === 'carpet' ? i.avg_ca_latest : i.avg_sa_latest;
        return [i.project_name, i.village_names, `${i.year_previous}-${i.year_latest}`, String(r ?? ''), g != null ? String(g) : 'N/A'];
      })];
    } else if (overlayMode === 'rate') {
      rows = [['Project', 'Villages', 'Year', 'Rate (₹/sqft)'], ...filteredRateData.map((i) => {
        const r = rateRateType === 'carpet' ? i.avg_ca_latest : i.avg_sa_latest;
        return [i.project_name, i.village_names, `${i.year_previous}-${i.year_latest}`, r != null ? String(r) : 'N/A'];
      })];
    } else if (overlayMode === 'road') {
      rows = [['Name', 'Width (m)', 'Length (m)', 'Highway Type'], ...roadData.map((r) => [r.name || 'Unnamed', r.width_m != null ? r.width_m.toFixed(1) : '?', r.length_m != null ? r.length_m.toFixed(1) : '?', r.highwayType || ''])];
    }
    if (rows.length <= 1) return;
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${overlayMode}_${selectedCity}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (!isMounted || !L) return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50">
      <div className="text-center"><div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Map Overlay...</p></div>
    </div>
  );

  const tileUrl = mapLayer === 'light' ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : mapLayer === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  // ── Data for the bottom table ────────────────────────────
  const tableData = getTableData(overlayMode, pointsToShow, filteredHighways, filteredMetroLines, filteredMetroStations, filteredPriceData, priceRateType, roadData, filteredRateData, rateRateType);

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-100">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />

      {/* ═══ TOP: CONTROL BAR ═══════════════════════════════ */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3">
        {/* Row 1: Section + Subsection dropdowns */}
        <div className="flex items-center gap-3 flex-wrap">
          <select value={sectionCategory} onChange={(e) => { setSectionCategory(e.target.value); setActiveSection(SECTIONS[e.target.value][0]); }}
            className="py-1.5 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold outline-none cursor-pointer">
            {Object.keys(SECTIONS).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="text-slate-400 -mx-1" />
          <select value={activeSection} onChange={(e) => setActiveSection(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold outline-none cursor-pointer">
            {SECTIONS[sectionCategory].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* City selector (always visible) */}
          <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold outline-none cursor-pointer">
            {Object.keys(CITIES).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Map layer */}
          <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            {([['light', '☀️'], ['dark', '🌙'], ['satellite', '🛰️']] as [MapLayerType, string][]).map(([k, icon]) => (
              <button key={k} onClick={() => setMapLayer(k)}
                className={`py-1 px-2 rounded-md text-xs transition-colors ${mapLayer === k ? 'bg-white shadow-sm font-semibold' : 'hover:bg-slate-50'}`}>{icon}</button>
            ))}
          </div>
        </div>

        {/* Row 2: Section-specific controls */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {/* Amenities: category checkboxes */}
          {overlayMode === 'amenities' && (
            <div className="flex items-center gap-2 flex-wrap">
              {Object.keys(CATEGORY_CONFIG).map((cat) => (
                <label key={cat} className="flex items-center gap-1 text-xs cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={selectedCategories.includes(cat)}
                    onChange={(e) => { if (e.target.checked) setSelectedCategories([...selectedCategories, cat]); else setSelectedCategories(selectedCategories.filter((c) => c !== cat)); }}
                    className="accent-blue-500 w-3.5 h-3.5" />
                  <span style={{ color: CATEGORY_CONFIG[cat].color }}>●</span>
                  <span className="text-slate-700">{CATEGORY_CONFIG[cat].name}</span>
                </label>
              ))}
              <span className={`ml-2 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                amenitiesLoading
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}>
                {amenitiesLoading ? 'Waiting for OSM...' : amenitiesStatus}
              </span>
            </div>
          )}

          {/* Metro: visibility toggles */}
          {overlayMode === 'metro' && (
            <div className="flex items-center gap-2">
              {([['highways', '🛣️ Highways'], ['metroLines', '🚇 Metro Lines'], ['metroStations', '🚉 Stations']] as [keyof MetroVisibility, string][]).map(([k, label]) => (
                <button key={k} onClick={() => handleMetroToggle(k)}
                  className={`py-1 px-3 rounded-full border text-xs transition-colors ${metroVisibility[k] ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' : 'bg-white border-slate-300 text-slate-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Price Momentum: rate type + village */}
          {overlayMode === 'price' && (
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                {(['carpet', 'salable'] as const).map((t) => (
                  <button key={t} onClick={() => setPriceRateType(t)}
                    className={`py-1 px-3 rounded-md text-xs transition-colors ${priceRateType === t ? 'bg-white shadow-sm font-semibold' : ''}`}>
                    {t === 'carpet' ? 'Carpet' : 'Salable'}
                  </button>
                ))}
              </div>
              <select value={selectedVillage} onChange={(e) => setSelectedVillage(e.target.value)}
                className="py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-50 text-xs outline-none">
                <option value="All">All Villages</option>
                {villagesList.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <button onClick={handlePriceFetch} className="py-1.5 px-4 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors">Load</button>
            </div>
          )}

          {/* Rate Analysis: rate type + village */}
          {overlayMode === 'rate' && (
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                {(['carpet', 'salable'] as const).map((t) => (
                  <button key={t} onClick={() => setRateRateType(t)}
                    className={`py-1 px-3 rounded-md text-xs transition-colors ${rateRateType === t ? 'bg-white shadow-sm font-semibold' : ''}`}>
                    {t === 'carpet' ? 'Carpet' : 'Salable'}
                  </button>
                ))}
              </div>
              <select value={rateSelectedVillage} onChange={(e) => setRateSelectedVillage(e.target.value)}
                className="py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-50 text-xs outline-none">
                <option value="All">All Villages</option>
                {rateVillagesList.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <button onClick={handleRateFetch} disabled={rateLoading}
                className={`py-1.5 px-4 rounded-lg text-xs font-medium transition-colors ${rateLoading ? 'bg-gray-400 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                {rateLoading ? '...' : 'Load'}
              </button>
            </div>
          )}

          {/* Road Width Analysis Trigger Button */}
          {overlayMode === 'road' && (
            <button
              onClick={() => roadWidthRef.current?.runAnalysis()}
              disabled={roadAnalysisLoading}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                roadAnalysisLoading 
                  ? 'bg-slate-400 text-white cursor-not-allowed' 
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100'
              }`}
            >
              {roadAnalysisLoading ? (
                <span className="flex items-center gap-2">
                   <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ANALYZING...
                </span>
              ) : (
                <>
                  <Download size={16} />
                  ANALYZE ROAD WIDTHS
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ═══ MIDDLE: MAP ════════════════════════════════════ */}
      <div 
        className="relative mx-4 my-3 rounded-xl overflow-hidden border border-slate-200 shadow-sm" 
        style={{ height: isFullscreen ? 'calc(100vh - 180px)' : '400px' }}
      >
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <MapUpdater center={mapCenter} zoom={mapZoom} isFullscreen={isFullscreen} />
          <TileLayer key={mapLayer} url={tileUrl} attribution="&copy; CARTO" />
          <DrawControl
            onPolygonCreated={(geoJson: any) => { setPolygonGeoJson(geoJson); setFilterMode('polygon'); setCircleRadius(null); }}
            onPolygonDeleted={() => { setPolygonGeoJson(null); if (filterMode === 'polygon') setFilterMode('none'); }}
          />

          {savedCoordinate && <MarkerDyn position={savedCoordinate}><PopupDyn>Subject point</PopupDyn></MarkerDyn>}
          {filterMode === 'circle' && circleRadius && savedCoordinate && (
            <CircleDyn center={savedCoordinate} radius={circleRadius} pathOptions={{ color: '#ff7800', fillColor: '#ff7800', fillOpacity: 0.15 }} />
          )}

          {/* Amenity markers */}
          {overlayMode === 'amenities' && pointsToShow.map((p, i) => (
            <MarkerDyn key={i} position={[p.lat, p.lon]} icon={createDivIcon(createMarkerIconHtml(p.category), 28)}>
              <PopupDyn><b>{p.name || 'Unnamed'}</b><br />{CATEGORY_CONFIG[p.category]?.name}</PopupDyn>
            </MarkerDyn>
          ))}
          {/* Metro overlay */}
          {overlayMode === 'metro' && (<>
            {metroVisibility.highways && filteredHighways.map((h, i) => (<Polyline key={`hw-${i}`} positions={h.latlngs} pathOptions={{ color: '#d13834', weight: 4, opacity: 0.8 }}><PopupDyn>{h.name || 'Highway'}{h.ref && <><br /><small>{h.ref}</small></>}</PopupDyn></Polyline>))}
            {metroVisibility.metroLines && filteredMetroLines.map((l, i) => (<Polyline key={`ml-${i}`} positions={l.latlngs} pathOptions={{ color: '#1f7b4d', weight: 5, opacity: 0.9, dashArray: '8, 6' }}><PopupDyn>🚇 {l.name}</PopupDyn></Polyline>))}
            {metroVisibility.metroStations && filteredMetroStations.map((s, i) => (<MarkerDyn key={`ms-${i}`} position={[s.lat, s.lon]}><PopupDyn><b>{s.name}</b>{s.operator && <><br /><small>{s.operator}</small></>}</PopupDyn></MarkerDyn>))}
          </>)}
          {/* Price markers */}
          {overlayMode === 'price' && filteredPriceData.map((item, i) => {
            const g = priceRateType === 'carpet' ? item.growth_pct_ca : item.growth_pct_sa;
            return (<MarkerDyn key={`pr-${i}`} position={[item.latitude, item.longitude]} icon={createDivIcon(createGrowthMarkerHtml(g ?? null), 30)}><PopupDyn><b>{item.project_name}</b><br />{item.village_names}<br />Growth: {g ?? 'N/A'}%</PopupDyn></MarkerDyn>);
          })}
          {/* Road overlay */}
          {overlayMode === 'road' && roadData.map((r, i) => (<Polyline key={`rd-${i}`} positions={r.latlngs} pathOptions={{ color: '#ff1744', weight: 5, opacity: 0.8 }}><PopupDyn>{r.name && <b>{r.name}</b>}<br />Width: {r.width_m != null ? `${r.width_m.toFixed(1)}m` : '?'}</PopupDyn></Polyline>))}
          {/* Rate markers */}
          {overlayMode === 'rate' && filteredRateData.map((item, i) => {
            const r = rateRateType === 'carpet' ? item.avg_ca_latest : item.avg_sa_latest;
            return (<MarkerDyn key={`ra-${i}`} position={[item.latitude, item.longitude]} icon={createDivIcon(createRateMarkerHtml(r ?? null), 28)}><PopupDyn><b>{item.project_name}</b><br />Rate: ₹{r ?? 'N/A'}/sqft</PopupDyn></MarkerDyn>);
          })}
        </MapContainer>

        {/* Coordinate input bar overlaid on map */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm py-2 px-4 rounded-full shadow-lg flex items-center gap-2 border border-slate-200">
          <input type="text" placeholder="lat, lon (e.g. 18.52, 73.85)" value={coordInput} onChange={(e) => setCoordInput(e.target.value)}
            className="py-1.5 px-3 rounded-full border border-slate-300 w-48 text-xs outline-none" />
          <button onClick={handleSaveCoordinate} className="py-1.5 px-3 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition-colors">Save</button>

          {savedCoordinate && (<>
            <div className="h-4 w-px bg-slate-300" />
            <input type="number" placeholder="Radius (m)" value={radiusInput} onChange={(e) => setRadiusInput(e.target.value)}
              className="py-1.5 px-2 rounded-full border border-slate-300 w-24 text-xs outline-none" />
            <button onClick={handleApplyRadius} className="py-1.5 px-3 bg-emerald-500 text-white rounded-full text-xs font-medium hover:bg-emerald-600 transition-colors">Circle</button>
            <button onClick={() => { setCircleRadius(null); setFilterMode('none'); setRadiusInput(''); }}
              className="py-1.5 px-2 text-slate-500 hover:text-red-500 transition-colors" title="Clear circle"><Circle size={14} /></button>
            <button onClick={() => { setPolygonGeoJson(null); if (filterMode === 'polygon') setFilterMode('none'); }}
              className="py-1.5 px-2 text-slate-500 hover:text-red-500 transition-colors" title="Clear drawn"><Trash2 size={14} /></button>
          </>)}
        </div>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-5 right-5 z-[10006] p-2.5 bg-white shadow-2xl border-2 border-blue-500/20 text-blue-600 hover:text-white hover:bg-blue-500 transition-all hover:scale-110 flex items-center justify-center rounded-xl"
          title={isFullscreen ? "Minimize Map" : "Maximize Map"}
        >
          {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
        </button>

        {/* Hidden subsection logic loaders */}
        <div className="hidden">
          {overlayMode === 'amenities' && <AmenitiesOverlayLogic selectedCity={selectedCity} setSelectedCity={setSelectedCity} selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories} setAllAmenities={setAllAmenities} pointsToShow={pointsToShow} onClearDrawn={() => {}} onClearCircle={() => {}} onLoadingChange={setAmenitiesLoading} onStatusChange={setAmenitiesStatus} />}
          {overlayMode === 'metro' && <MetroCorridorLogic selectedCity={selectedCity} onDataLoaded={handleMetroDataLoaded} visibility={metroVisibility} onToggle={handleMetroToggle} />}
          {overlayMode === 'road' && (
            <RoadWidthLogic 
              ref={roadWidthRef}
              savedCoordinate={savedCoordinate} 
              circleRadius={circleRadius} 
              polygonGeoJson={polygonGeoJson} 
              filterMode={filterMode} 
              selectedCity={selectedCity} 
              onRoadsLoaded={handleRoadDataLoaded} 
              onLoadingChange={setRoadAnalysisLoading}
            />
          )}
        </div>
      </div>

      {/* ═══ BOTTOM: DATA TABLE ═════════════════════════════ */}
      <div className="mx-4 mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm" style={{ maxHeight: '350px' }}>
        {/* Table header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-blue-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{activeSection} — Results</span>
            <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{tableData.rows.length}</span>
          </div>
          {tableData.rows.length > 0 && (
            <button onClick={handleDownloadCSV} className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors">
              <Download size={12} /> CSV
            </button>
          )}
        </div>
        {/* Table body */}
        <div className="flex-1 overflow-auto">
          {tableData.rows.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr>{tableData.headers.map((h, i) => <th key={i} className="text-left py-2 px-3 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                    {row.map((cell, ci) => <td key={ci} className="py-1.5 px-3 text-slate-700 whitespace-nowrap">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full py-6 text-xs text-slate-400">
              No data loaded. Use the controls above to load overlay data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Table data helper ──────────────────────────────────────
function getTableData(
  mode: string,
  amenities: AmenityPoint[],
  highways: HighwayData[],
  metroLines: MetroLineData[],
  metroStations: MetroStationData[],
  priceData: PriceDataItem[],
  priceRateType: string,
  roadData: RoadMapData[],
  rateData: PriceDataItem[],
  rateRateType: string,
): { headers: string[]; rows: string[][] } {
  if (mode === 'amenities') {
    return {
      headers: ['#', 'Name', 'Category', 'Latitude', 'Longitude'],
      rows: amenities.map((p, i) => [String(i + 1), p.name || 'Unnamed', CATEGORY_CONFIG[p.category]?.name || p.category, p.lat.toFixed(5), p.lon.toFixed(5)]),
    };
  }
  if (mode === 'metro') {
    const rows: string[][] = [];
    highways.forEach((h) => rows.push([h.name || 'Unnamed', 'Highway', h.ref || '-']));
    metroLines.forEach((l) => rows.push([l.name, 'Metro Line', '-']));
    metroStations.forEach((s) => rows.push([s.name, 'Metro Station', s.operator || '-']));
    return { headers: ['Name', 'Type', 'Details'], rows };
  }
  if (mode === 'price') {
    return {
      headers: ['#', 'Project', 'Villages', 'Period', 'Avg Rate', 'Growth (%)'],
      rows: priceData.map((item, i) => {
        const g = priceRateType === 'carpet' ? item.growth_pct_ca : item.growth_pct_sa;
        const r = priceRateType === 'carpet' ? item.avg_ca_latest : item.avg_sa_latest;
        const gStr = g != null ? `${g > 0 ? '+' : ''}${g}%` : 'N/A';
        return [String(i + 1), item.project_name, item.village_names, `${item.year_previous}→${item.year_latest}`, r != null ? `₹${r}` : '-', gStr];
      }),
    };
  }
  if (mode === 'road') {
    return {
      headers: ['#', 'Name', 'Width (m)', 'Length (m)', 'Type', 'Source'],
      rows: roadData.map((r, i) => [String(i + 1), r.name || 'Unnamed', r.width_m != null ? r.width_m.toFixed(1) : '?', r.length_m != null ? r.length_m.toFixed(1) : '?', r.highwayType || '-', r.widthExplicit ? 'Explicit' : 'Estimated']),
    };
  }
  if (mode === 'rate') {
    return {
      headers: ['#', 'Project', 'Villages', 'Period', 'Rate (₹/sqft)'],
      rows: rateData.map((item, i) => {
        const r = rateRateType === 'carpet' ? item.avg_ca_latest : item.avg_sa_latest;
        return [String(i + 1), item.project_name, item.village_names, `${item.year_previous}→${item.year_latest}`, r != null ? `₹${r}` : '-'];
      }),
    };
  }
  return { headers: [], rows: [] };
}

export default MapOverlayView;
