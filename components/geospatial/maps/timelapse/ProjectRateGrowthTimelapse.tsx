'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { PolygonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AlertTriangle, Building2, Loader2, Maximize2, Minimize2,
  Pause, Play, RefreshCcw, RotateCcw, TrendingUp,
} from 'lucide-react';
import { setOptions as setGoogleMapsOptions, importLibrary as importGoogleLibrary } from '@googlemaps/js-api-loader';
import { fetchProjectRateTimelapse } from '@/lib/dashboard/geospatial/sampleMaps';
import type {
  BuildingTimelapse, FloorMonthValue, ProjectRateTimelapseResponse, FloorTimelapse,
} from '@/lib/dashboard/geospatial/types';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const FLOOR_H = 3.5;
const HALF_SIDE = 0.00008;

function rateToColor(psf: number): [number, number, number] {
  if (psf < 6000)  return [37, 99, 235];
  if (psf < 10000) return [34, 197, 94];
  if (psf < 14000) return [234, 179, 8];
  if (psf < 18000) return [249, 115, 22];
  return [239, 68, 68];
}

function growthGlow(mom: number | null): [number, number, number] {
  if (mom === null) return [148, 163, 184];
  if (mom < -3)  return [220, 38, 38];
  if (mom <= 3)  return [148, 163, 184];
  if (mom <= 8)  return [34, 197, 94];
  return [6, 182, 212];
}

function confAlpha(conf: number, base = 220): number {
  if (conf >= 0.85) return base;
  if (conf >= 0.70) return Math.round(base * 0.75);
  if (conf >= 0.60) return Math.round(base * 0.65);
  if (conf >= 0.50) return Math.round(base * 0.55);
  if (conf >= 0.40) return Math.round(base * 0.45);
  return Math.round(base * 0.35);
}

function buildPolygon(lat: number, lng: number): [number, number][] {
  return [
    [lng - HALF_SIDE, lat - HALF_SIDE],
    [lng + HALF_SIDE, lat - HALF_SIDE],
    [lng + HALF_SIDE, lat + HALF_SIDE],
    [lng - HALF_SIDE, lat + HALF_SIDE],
  ];
}

interface InsightCard { label: string; value: string; sub?: string; }

function computeInsights(data: ProjectRateTimelapseResponse, month: string): InsightCard[] {
  const allRates: number[] = [];
  const allMom: number[] = [];
  let txnTotal = 0;

  data.buildings.forEach((b: BuildingTimelapse) => {
    b.floors.forEach((f: FloorTimelapse) => {
      const mv: FloorMonthValue | undefined = f.monthly_values[month];
      if (!mv) return;
      if (mv.rate_psf !== null) allRates.push(mv.rate_psf);
      if (mv.mom_growth_pct !== null) allMom.push(mv.mom_growth_pct);
      txnTotal += mv.txn_count;
    });
  });

  const avgRate = allRates.length ? allRates.reduce((a, b) => a + b, 0) / allRates.length : null;
  const avgMom  = allMom.length  ? allMom.reduce((a, b) => a + b, 0) / allMom.length : null;

  return [
    { label: 'Buildings', value: String(data.buildings.length) },
    { label: 'Time steps', value: String(data.timeline.length) },
    { label: 'Current month', value: month || '...' },
    { label: 'Avg Rate (₹/sq.ft)', value: avgRate ? `₹${Math.round(avgRate).toLocaleString()}` : '...' },
    { label: 'MoM Growth', value: avgMom !== null ? `${avgMom >= 0 ? '+' : ''}${avgMom.toFixed(1)}%` : '...' },
  ];
}

export default function ProjectRateGrowthTimelapse() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [towerFilter, setTowerFilter]     = useState('');
  const [propType, setPropType]           = useState('');
  const [bhk, setBhk]                     = useState('');
  const [saleType, setSaleType]           = useState('');
  const [startMonth, setStartMonth]       = useState('');
  const [endMonth, setEndMonth]           = useState('');

  const [data, setData]         = useState<ProjectRateTimelapseResponse | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [monthIdx, setMonthIdx] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [speed, setSpeed]       = useState(900);
  const [isFullscreen, setFullscreen] = useState(false);

  const [viewState, setViewState] = useState({
    longitude: 73.8567, latitude: 18.5204,
    zoom: 14, pitch: 55, bearing: 20,
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Google Places Autocomplete
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    setGoogleMapsOptions({ key: apiKey });
    importGoogleLibrary('places')
      .then(() => {
        const input = searchInputRef.current;
        if (!input) return;
        const ac = new google.maps.places.Autocomplete(input, { types: ['geocode', 'establishment'] });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (place?.formatted_address) setSearch(place.formatted_address);
          else if (place?.name) setSearch(place.name);
        });
      })
      .catch((err: unknown) => console.warn('Google Places failed:', err));
  }, []);

  // Playback
  useEffect(() => {
    if (!isPlaying || !data?.timeline.length) return;
    const id = window.setInterval(() => {
      setMonthIdx((p) => {
        if (p >= data.timeline.length - 1) { setPlaying(false); return p; }
        return p + 1;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [isPlaying, data?.timeline.length, speed]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await fetchProjectRateTimelapse({
        search: search || undefined,
        project_name: projectFilter || undefined,
        tower_name:   towerFilter   || undefined,
        property_type: propType     || undefined,
        unit_configuration: bhk     || undefined,
        sale_type: saleType         || undefined,
        start_month: startMonth     || undefined,
        end_month:   endMonth       || undefined,
      });
      setData(result);
      setMonthIdx(0); setPlaying(false);
      setViewState((v) => ({
        ...v,
        longitude: result.map_center[1],
        latitude:  result.map_center[0],
        zoom: 14, pitch: 55, bearing: 20,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [search, projectFilter, towerFilter, propType, bhk, saleType, startMonth, endMonth]);

  const layers = useMemo(() => {
    if (!data) return [];
    const month = data.timeline[monthIdx] ?? '';
    const floorRows: Array<{
      polygon: [number, number][]; elevation: number;
      fillColor: [number, number, number, number];
      proj: string; tower: string; floor: number; mv: FloorMonthValue;
    }> = [];
    const glowRows: Array<{ pos: [number, number]; color: [number, number, number, number]; radius: number }> = [];
    const labelRows: Array<{ pos: [number, number, number]; text: string }> = [];

    data.buildings.forEach((b: BuildingTimelapse) => {
      const poly = buildPolygon(b.latitude, b.longitude);
      const totalFloors = b.floors.length;
      labelRows.push({ pos: [b.longitude, b.latitude, totalFloors * FLOOR_H + 5], text: b.project_name });

      b.floors.forEach((f: FloorTimelapse) => {
        const mv: FloorMonthValue | undefined = f.monthly_values[month];
        if (!mv || mv.rate_psf === null) {
          floorRows.push({ polygon: poly, elevation: FLOOR_H, fillColor: [200, 200, 200, 60], proj: b.project_name, tower: b.tower_name ?? '', floor: f.floor_index, mv: mv ?? { rate_psf: null, mom_growth_pct: null, txn_count: 0, confidence_score: 0.3, fallback_level: 7, is_estimated: true } });
          return;
        }
        const [r, g, bl] = rateToColor(mv.rate_psf);
        const alpha = confAlpha(mv.confidence_score);
        floorRows.push({ polygon: poly, elevation: FLOOR_H, fillColor: [r, g, bl, alpha], proj: b.project_name, tower: b.tower_name ?? '', floor: f.floor_index, mv });

        if (mv.mom_growth_pct !== null && Math.abs(mv.mom_growth_pct) > 3) {
          const [gr, gg, gb] = growthGlow(mv.mom_growth_pct);
          glowRows.push({ pos: [b.longitude, b.latitude], color: [gr, gg, gb, 90], radius: 18 });
        }
      });
    });

    return [
      new PolygonLayer({
        id: 'proj-floors', data: floorRows,
        getPolygon: (d) => d.polygon, getElevation: FLOOR_H,
        extruded: true, filled: true, stroked: true, wireframe: true,
        getFillColor: (d) => d.fillColor, getLineColor: [160, 40, 70, 255],
        lineWidthMinPixels: 1, pickable: true, autoHighlight: true,
        highlightColor: [255, 255, 255, 60],
        material: { ambient: 0.35, diffuse: 0.7, shininess: 20, specularColor: [100, 100, 100] },
        updateTriggers: { getFillColor: [monthIdx] },
        transitions: { getFillColor: { duration: 600 } },
      }),
      new ScatterplotLayer({
        id: 'proj-glow', data: glowRows,
        getPosition: (d) => d.pos, getFillColor: (d) => d.color,
        getRadius: (d) => d.radius, radiusMinPixels: 6, radiusMaxPixels: 30, pickable: false,
        updateTriggers: { getFillColor: [monthIdx], getRadius: [monthIdx] },
      }),
      new TextLayer({
        id: 'proj-labels', data: labelRows,
        getPosition: (d) => d.pos, getText: (d) => d.text, getSize: 12,
        getColor: [30, 41, 59, 220], getAlignmentBaseline: 'bottom',
        fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700,
        background: true, getBackgroundColor: [255, 255, 255, 200],
        backgroundPadding: [3, 2, 3, 2],
      }),
    ];
  }, [data, monthIdx]);

  const getTooltip = ({ object }: { object?: any }) => {
    if (!object?.proj) return null;
    const mv: FloorMonthValue = object.mv;
    const sourceLabel = mv.is_estimated ? `<div style="color:#888;font-size:11px">Source: fallback L${mv.fallback_level} (${Math.round(mv.confidence_score * 100)}%)</div>` : '';
    return {
      html: `<div><strong>${object.proj}${object.tower ? ` · ${object.tower}` : ''}</strong></div>
        <div>Floor: ${object.floor} · ${data?.timeline[monthIdx] ?? ''}</div>
        <div>Rate: ${mv.rate_psf !== null ? `₹${mv.rate_psf.toLocaleString()} / sq.ft` : '?'}</div>
        ${mv.mom_growth_pct !== null ? `<div style="color:${mv.mom_growth_pct >= 0 ? '#16A34A' : '#DC2626'}">MoM: ${mv.mom_growth_pct >= 0 ? '+' : ''}${mv.mom_growth_pct.toFixed(1)}%</div>` : ''}
        <div>Txn: ${mv.txn_count}</div>${sourceLabel}`,
    };
  };

  const currentMonth = data?.timeline[monthIdx] ?? 'No date';
  const insights = data && currentMonth !== 'No date' ? computeInsights(data, currentMonth) : [];

  return (
    <div className={`flex flex-col bg-slate-50 overflow-y-auto overflow-x-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen' : 'h-full'}`}>
      {/* Search bar — matches ThreeDMapTimelapseView */}
      <div className="border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[260px] flex-col gap-2 flex-[2]">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Search project / location</span>
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              placeholder="Baner, Pune, Maharashtra, India"
            />
          </label>

          <label className="flex min-w-[140px] flex-col gap-2 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Project</span>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15">
              <option value="">All</option>
              {(data?.available_projects ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>

          <label className="flex min-w-[120px] flex-col gap-2 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Tower</span>
            <select value={towerFilter} onChange={(e) => setTowerFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15">
              <option value="">All</option>
              {(data?.available_towers ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>

          <button onClick={loadData} disabled={isLoading}
            className="min-w-[180px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#525ceb] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#434ce0] disabled:cursor-not-allowed disabled:opacity-60">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Load timelapse
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          {[
            { label: 'Property Type', val: propType, set: setPropType },
            { label: 'BHK / Config', val: bhk, set: setBhk },
            { label: 'Sale Type', val: saleType, set: setSaleType },
          ].map(({ label, val, set }) => (
            <label key={label} className="flex min-w-[150px] flex-1 flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</span>
              <input value={val} onChange={(e) => set(e.target.value)} placeholder="Any"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15" />
            </label>
          ))}
          <label className="flex min-w-[200px] flex-1 flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Date Range</span>
            <div className="flex gap-2">
              <input value={startMonth} onChange={(e) => setStartMonth(e.target.value)} placeholder="YYYY-MM"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15" />
              <input value={endMonth} onChange={(e) => setEndMonth(e.target.value)} placeholder="YYYY-MM"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15" />
            </div>
          </label>
        </div>
      </div>

      {/* Stat cards — matches ThreeDMapTimelapseView */}
      <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid-cols-5">
        {insights.length > 0 ? insights.map((c) => (
          <div key={c.label} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{c.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{c.value}</p>
            {c.sub && <p className="text-xs text-slate-500">{c.sub}</p>}
          </div>
        )) : ['Buildings', 'Time steps', 'Current month', 'Avg Rate', 'MoM Growth'].map((l) => (
          <div key={l} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{l}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">...</p>
          </div>
        ))}
      </div>

      {/* Playback bar — matches ThreeDMapTimelapseView */}
      {data?.timeline.length ? (
        <div className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#525ceb] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#434ce0]">
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => { setPlaying(false); setMonthIdx(0); }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100">
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </button>
            <input type="range" min={0} max={Math.max(0, data.timeline.length - 1)} step={1} value={monthIdx}
              onChange={(e) => { setPlaying(false); setMonthIdx(Number(e.target.value)); }}
              className="h-2 min-w-[220px] flex-1 cursor-pointer accent-[#525ceb]" />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{currentMonth}</span>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none">
              <option value={1800}>0.5×</option>
              <option value={900}>1×</option>
              <option value={450}>2×</option>
              <option value={200}>4×</option>
            </select>
          </div>
        </div>
      ) : null}

      {/* Map area */}
      <div className="relative min-h-[400px] flex-[1.5] shrink-0">
        <button onClick={() => setFullscreen((p) => !p)}
          className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 border border-slate-200 shadow-lg backdrop-blur hover:bg-white transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <Minimize2 className="h-4 w-4 text-slate-700" /> : <Maximize2 className="h-4 w-4 text-slate-700" />}
        </button>

        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#525ceb]" />
            <p className="text-sm font-semibold">Loading project timelapse data...</p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Unable to load project timelapse</h3>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">{error}</p>
          </div>
        ) : data ? (
          <DeckGL controller layers={layers} viewState={viewState}
            onViewStateChange={({ viewState: vs }) => setViewState(vs as typeof viewState)}
            getTooltip={getTooltip as any}
            style={{ position: 'absolute', inset: '0px' }}>
            <Map mapLib={import('maplibre-gl')} mapStyle={MAP_STYLE} reuseMaps style={{ width: '100%', height: '100%' }}>
              <NavigationControl position="top-right" />
            </Map>
          </DeckGL>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
            <TrendingUp className="h-10 w-10 text-[#525ceb]/40" />
            <p className="text-sm font-semibold text-slate-700">Project Rate + Growth Velocity</p>
            <p className="max-w-xs text-xs text-slate-500 text-center">Search a project or location, then click Load to start the timelapse.</p>
          </div>
        )}

        {/* Legend overlay */}
        {data && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Rate ₹/sq.ft</p>
            {[['< 6k', '#2563EB'], ['6k–10k', '#22C55E'], ['10k–14k', '#EAB308'], ['14k–18k', '#F97316'], ['> 18k', '#EF4444']].map(([lbl, col]) => (
              <div key={lbl} className="flex items-center gap-2 mb-1">
                <div className="h-3 w-3 rounded-sm" style={{ background: col }} />
                <span className="text-[10px] text-slate-600">{lbl}</span>
              </div>
            ))}
            <p className="mt-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Growth Pulse</p>
            {[['↓ < -3%', '#DC2626'], ['Stable', '#94A3B8'], ['+3–8%', '#22C55E'], ['> +8%', '#06B6D4']].map(([lbl, col]) => (
              <div key={lbl} className="flex items-center gap-2 mb-1">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />
                <span className="text-[10px] text-slate-600">{lbl}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {(data?.warnings ?? []).length > 0 && (
          <div className="absolute bottom-4 right-4 z-10">
            <details className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-xl backdrop-blur max-w-xs">
              <summary className="cursor-pointer text-sm font-bold text-amber-900">Warnings ({data!.warnings.length})</summary>
              <ul className="mt-3 space-y-2 text-sm text-amber-900">
                {data!.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
