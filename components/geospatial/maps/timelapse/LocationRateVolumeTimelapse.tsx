'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AlertTriangle, Loader2, MapPin, Maximize2, Minimize2,
  Pause, Play, RefreshCcw, RotateCcw,
} from 'lucide-react';
import { setOptions as setGoogleMapsOptions, importLibrary as importGoogleLibrary } from '@googlemaps/js-api-loader';
import { fetchLocationRateTimelapse } from '@/lib/dashboard/geospatial/sampleMaps';
import type { LocationRateTimelapseResponse, LocationMonthValue, LocationTimelapse } from '@/lib/dashboard/geospatial/types';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

function rateToColor(psf: number | null): [number, number, number] {
  if (psf === null) return [100, 116, 139];
  if (psf < 6000)  return [37, 99, 235];
  if (psf < 10000) return [34, 197, 94];
  if (psf < 14000) return [234, 179, 8];
  if (psf < 18000) return [249, 115, 22];
  return [239, 68, 68];
}

function volumeColor(vol: number): [number, number, number] {
  if (vol <= 5)  return [56, 189, 248];
  if (vol <= 15) return [34, 197, 94];
  if (vol <= 40) return [234, 179, 8];
  if (vol <= 75) return [249, 115, 22];
  return [217, 70, 239];
}

function pulseRadius(vol: number): number {
  return Math.min(40 + vol * 3, 450);
}

const MARKET_EVENTS = [
  { event_month: '2024-03', event_type: 'Metro', event_title: 'Metro Work Started', city_name: 'Pune', location_name: 'Baner', color: [37, 99, 235] as [number, number, number] },
];

export default function LocationRateVolumeTimelapse() {
  const [search, setSearch]         = useState('');
  const [locFilter, setLocFilter]   = useState('');
  const [mmFilter, setMmFilter]     = useState('');
  const [propType, setPropType]     = useState('');
  const [bhk, setBhk]               = useState('');
  const [saleType, setSaleType]     = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth]     = useState('');

  const [data, setData]         = useState<LocationRateTimelapseResponse | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [monthIdx, setMonthIdx] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [speed, setSpeed]       = useState(900);
  const [isFullscreen, setFullscreen] = useState(false);
  const [pulse, setPulse]       = useState(0);

  const [viewState, setViewState] = useState({
    longitude: 73.8567, latitude: 18.5204,
    zoom: 11, pitch: 40, bearing: 0,
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

  // Pulse animation
  useEffect(() => {
    const id = window.setInterval(() => setPulse((p) => (p + 0.05) % 1), 60);
    return () => clearInterval(id);
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
    return () => clearInterval(id);
  }, [isPlaying, data?.timeline.length, speed]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await fetchLocationRateTimelapse({
        search: search || undefined,
        location_name: locFilter || undefined,
        micro_market: mmFilter || undefined,
        property_type: propType || undefined,
        unit_configuration: bhk || undefined,
        sale_type: saleType || undefined,
        start_month: startMonth || undefined,
        end_month: endMonth || undefined,
      });
      setData(result);
      setMonthIdx(0); setPlaying(false);
      setViewState((v) => ({
        ...v,
        longitude: result.map_center[1],
        latitude: result.map_center[0],
        zoom: 11, pitch: 40, bearing: 0,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [search, locFilter, mmFilter, propType, bhk, saleType, startMonth, endMonth]);

  const currentMonth = data?.timeline[monthIdx] ?? 'No date';

  const layers = useMemo(() => {
    if (!data) return [];
    const heatRows: Array<{ pos: [number, number]; r: [number, number, number]; radius: number; alpha: number; loc: string; mm: string | null; mv: LocationMonthValue }> = [];
    const pulseRows: Array<{ pos: [number, number]; color: [number, number, number, number]; radius: number; loc: string; mm: string | null; mv: LocationMonthValue }> = [];
    const labelRows: Array<{ pos: [number, number, number]; text: string }> = [];
    const eventRows: Array<{ pos: [number, number]; color: [number, number, number, number] }> = [];

    data.locations.forEach((loc: LocationTimelapse) => {
      const mv: LocationMonthValue | undefined = loc.monthly_values[currentMonth];
      if (!mv) return;
      const pos: [number, number] = [loc.longitude, loc.latitude];
      const [r, g, b] = rateToColor(mv.median_rate_psf);
      heatRows.push({ pos, r: [r, g, b], radius: pulseRadius(mv.transaction_volume) * 0.6, alpha: 55, loc: loc.location_name, mm: loc.micro_market, mv });
      const pulseMod = 1 + 0.18 * Math.sin(pulse * Math.PI * 2);
      pulseRows.push({ pos, color: [...volumeColor(mv.transaction_volume), 170] as [number, number, number, number], radius: pulseRadius(mv.transaction_volume) * pulseMod, loc: loc.location_name, mm: loc.micro_market, mv });
      labelRows.push({ pos: [loc.longitude, loc.latitude, 0], text: `${loc.location_name}${mv.median_rate_psf ? ` ₹${Math.round(mv.median_rate_psf / 1000)}k` : ''}` });
    });

    MARKET_EVENTS.forEach((ev) => {
      if (ev.event_month !== currentMonth) return;
      const loc = data.locations.find((l: LocationTimelapse) => l.location_name.toLowerCase().includes(ev.location_name.toLowerCase()));
      if (loc) eventRows.push({ pos: [loc.longitude, loc.latitude], color: [...ev.color, 230] as [number, number, number, number] });
    });

    return [
      new ScatterplotLayer({ id: 'loc-heat', data: heatRows, getPosition: (d) => d.pos, getFillColor: (d) => [...d.r, d.alpha] as [number, number, number, number], getRadius: (d) => d.radius, radiusUnits: 'meters' as const, pickable: false, updateTriggers: { getFillColor: [monthIdx], getRadius: [monthIdx] } }),
      new ScatterplotLayer({ id: 'loc-pulse', data: pulseRows, getPosition: (d) => d.pos, getFillColor: (d) => d.color, getRadius: (d) => d.radius, radiusUnits: 'meters' as const, stroked: true, lineWidthMinPixels: 1.5, getLineColor: (d) => [d.color[0], d.color[1], d.color[2], 200], pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 60], updateTriggers: { getFillColor: [monthIdx, pulse], getRadius: [pulse] } }),
      new ScatterplotLayer({ id: 'loc-events', data: eventRows, getPosition: (d) => d.pos, getFillColor: (d) => d.color, getRadius: 120, radiusUnits: 'meters' as const, pickable: false }),
      new TextLayer({ id: 'loc-labels', data: labelRows, getPosition: (d) => d.pos, getText: (d) => d.text, getSize: 11, getColor: [30, 41, 59, 200], getAlignmentBaseline: 'bottom', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, background: true, getBackgroundColor: [255, 255, 255, 190], backgroundPadding: [3, 2, 3, 2] }),
    ];
  }, [data, monthIdx, currentMonth, pulse]);

  const getTooltip = ({ object }: { object?: any }) => {
    if (!object?.loc) return null;
    const mv: LocationMonthValue = object.mv;
    return {
      html: `<div><strong>${object.loc}${object.mm ? ` · ${object.mm}` : ''}</strong></div>
        <div style="font-size:11px;color:#64748B">${currentMonth}</div>
        <div style="margin-top:4px">Median: ${mv.median_rate_psf ? `₹${mv.median_rate_psf.toLocaleString()}` : '—'} · Avg: ${mv.avg_rate_psf ? `₹${mv.avg_rate_psf.toLocaleString()}` : '—'}</div>
        <div>Volume: ${mv.transaction_volume} deals · Projects: ${mv.active_project_count}</div>
        ${mv.rate_growth_pct !== null ? `<div style="color:${mv.rate_growth_pct >= 0 ? '#16A34A' : '#DC2626'}">Rate MoM: ${mv.rate_growth_pct >= 0 ? '+' : ''}${mv.rate_growth_pct.toFixed(1)}%</div>` : ''}
        ${mv.momentum_score !== null ? `<div>Momentum: ${mv.momentum_score.toFixed(0)}</div>` : ''}
        <div style="font-size:10px;color:#64748B">Value: ₹${(mv.total_agreement_value / 1e7).toFixed(2)} Cr</div>`,
    };
  };

  // Insight cards
  const insights = useMemo(() => {
    if (!data || currentMonth === 'No date') return [];
    const mvs = data.locations.map((l: LocationTimelapse) => l.monthly_values[currentMonth]).filter(Boolean) as LocationMonthValue[];
    const rates = mvs.map((m) => m.median_rate_psf).filter((r): r is number => r !== null);
    const vols  = mvs.map((m) => m.transaction_volume);
    const moms  = mvs.map((m) => m.momentum_score).filter((s): s is number => s !== null);
    const medRate = rates.length ? rates.sort((a, b) => a - b)[Math.floor(rates.length / 2)] : null;
    const totalVol = vols.reduce((a, b) => a + b, 0);
    const activeProj = mvs.reduce((a, m) => a + m.active_project_count, 0);
    const avgMom = moms.length ? moms.reduce((a, b) => a + b, 0) / moms.length : null;
    const totalVal = mvs.reduce((a, m) => a + m.total_agreement_value, 0);
    return [
      { label: 'Locations', value: String(data.locations.length) },
      { label: 'Time steps', value: String(data.timeline.length) },
      { label: 'Current month', value: currentMonth },
      { label: 'Median Rate (₹/sq.ft)', value: medRate ? `₹${Math.round(medRate).toLocaleString()}` : '...' },
      { label: 'Txn Volume', value: totalVol.toLocaleString() },
    ];
  }, [data, currentMonth]);

  return (
    <div className={`flex flex-col bg-slate-50 overflow-y-auto overflow-x-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen' : 'h-full'}`}>
      {/* Search bar */}
      <div className="border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[260px] flex-col gap-2 flex-[2]">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Search location / micro-market</span>
            <input ref={searchInputRef} value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              placeholder="Baner, Pune, Maharashtra, India" />
          </label>

          <label className="flex min-w-[140px] flex-col gap-2 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Location</span>
            <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15">
              <option value="">All</option>
              {(data?.available_locations ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>

          <label className="flex min-w-[140px] flex-col gap-2 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Micro Market</span>
            <select value={mmFilter} onChange={(e) => setMmFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15">
              <option value="">All</option>
              {(data?.available_micro_markets ?? []).map((o: string) => <option key={o} value={o}>{o}</option>)}
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

      {/* Stat cards */}
      <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid-cols-5">
        {insights.length > 0 ? insights.map((c) => (
          <div key={c.label} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{c.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{c.value}</p>
          </div>
        )) : ['Locations', 'Time steps', 'Current month', 'Median Rate', 'Txn Volume'].map((l) => (
          <div key={l} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{l}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">...</p>
          </div>
        ))}
      </div>

      {/* Playback bar */}
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
            <p className="text-sm font-semibold">Loading location timelapse data...</p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Unable to load location timelapse</h3>
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
            <MapPin className="h-10 w-10 text-[#525ceb]/40" />
            <p className="text-sm font-semibold text-slate-700">Location Rate Heatmap + Volume Pulse</p>
            <p className="max-w-xs text-xs text-slate-500 text-center">Search a location, micro-market or city, then click Load.</p>
          </div>
        )}

        {/* Legend */}
        {data && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Rate ₹/sq.ft</p>
            {[['< 6k', '#2563EB'], ['6k–10k', '#22C55E'], ['10k–14k', '#EAB308'], ['14k–18k', '#F97316'], ['> 18k', '#EF4444']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-2 mb-1">
                <div className="h-3 w-3 rounded-sm" style={{ background: c }} />
                <span className="text-[10px] text-slate-600">{l}</span>
              </div>
            ))}
            <p className="mt-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Volume Pulse</p>
            {[['1–5', '#38BDF8'], ['6–15', '#22C55E'], ['16–40', '#EAB308'], ['41–75', '#F97316'], ['75+', '#D946EF']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-2 mb-1">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                <span className="text-[10px] text-slate-600">{l} deals</span>
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
