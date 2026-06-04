'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  Loader2,
  RefreshCcw,
  Download,
  Map as MapIcon,
  PlaySquare,
  ListTree,
  Database,
  Receipt,
  LocateFixed,
  Building2,
  MapPin,
  TrendingUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MarkerData, SpatialAnalysisRequest, SpatialAnalysisResponse } from '@/lib/dashboard/geospatial/types';
import { fetchSpatialAnalysis } from '@/lib/dashboard/geospatial/sampleMaps';

import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((mod) => mod.CircleMarker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then((mod) => mod.Tooltip), { ssr: false });

interface SpatialAnalysisViewProps {
  markers?: MarkerData[];
  isFullscreen?: boolean;
  toggleFullscreen?: () => void;
}

const DEFAULT_QUERY =
  'based on few comparable projects give me what should the rate be of my subject project.';

type TabId = 'overlay' | 'plan' | 'steps' | 'output' | 'ledger';
{/*
const DEFAULT_QUERY =
  'Analyze the relationship between road proximity and project rates for the plotted projects. Use the Excel data and extract only the required data from OSM map context. Make a step-by-step implementation plan, run the calculations, update the map overlay, and generate insights.';

type TabId = 'overlay' | 'plan' | 'steps' | 'output' | 'ledger';
*/}
const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'overlay', label: 'Updated OSM Overlay', icon: MapIcon },
  { id: 'plan', label: 'Implementation Plan', icon: ListTree },
  { id: 'steps', label: 'Execution Steps', icon: PlaySquare },
  { id: 'output', label: 'Output Data', icon: Database },
  { id: 'ledger', label: 'Token & Cost Ledger', icon: Receipt },
];

function zoneColor(zone: string | null | undefined): string {
  if (zone === 'Premium') return '#dc2626'; // red
  if (zone === 'High Value Residential') return '#ea580c'; // orange
  if (zone === 'Balanced') return '#eab308'; // gold
  if (zone === 'Discount') return '#16a34a'; // green
  return '#2563eb'; // blue
}

export default function SpatialAnalysisView({ 
  markers = [],
  isFullscreen = false,
  toggleFullscreen
}: SpatialAnalysisViewProps) {
  const defaultLat = markers[0]?.lat ?? 18.59260855107351;
  const defaultLng = markers[0]?.lng ?? 73.79994598999583;

  const [subjectName, setSubjectName] = useState('My Subject Project');
  const [subjectLatStr, setSubjectLatStr] = useState(defaultLat.toFixed(6));
  const [subjectLngStr, setSubjectLngStr] = useState(defaultLng.toFixed(6));
  const [useSubject, setUseSubject] = useState(false);
  const [userQuery, setUserQuery] = useState(DEFAULT_QUERY);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SpatialAnalysisResponse | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('overlay');

  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    let active = true;
    import('leaflet').then((leaflet) => {
      if (!active) return;
      const iconPrototype = leaflet.Icon.Default.prototype as any;
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

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setData(null);

    const lat = parseFloat(subjectLatStr);
    const lng = parseFloat(subjectLngStr);
    
    try {
      const payload: SpatialAnalysisRequest = {
        user_query: userQuery,
        subject_name: subjectName,
        subject_lat: useSubject && !isNaN(lat) ? lat : null,
        subject_lon: useSubject && !isNaN(lng) ? lng : null,
        use_subject: useSubject,
      };

      const result = await fetchSpatialAnalysis(payload);
      setData(result);
      setActiveTab('overlay');
    } catch (err: any) {
      setError(err.message || 'Spatial analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const mapCenter: [number, number] = useMemo(() => {
    if (!data) return [defaultLat, defaultLng];
    if (data.projects && data.projects.length > 0) {
      let latSum = 0;
      let lngSum = 0;
      data.projects.forEach(p => {
        latSum += (p.lat || 0);
        lngSum += (p.long || 0);
      });
      return [latSum / data.projects.length, lngSum / data.projects.length];
    }
    return [defaultLat, defaultLng];
  }, [data, defaultLat, defaultLng]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur shadow-sm z-10 relative">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-[1.5] flex flex-col gap-3 min-w-[300px]">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Subject Project (Optional)</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[#525ceb]" checked={useSubject} onChange={e => setUseSubject(e.target.checked)} />
                  <span className="text-xs font-semibold text-slate-700 select-none">Include Subject</span>
                </label>
             </div>
             <input
               value={subjectName}
               onChange={e => setSubjectName(e.target.value)}
               disabled={!useSubject}
               placeholder="Project Name"
               className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-1 focus:ring-[#525ceb] disabled:opacity-50"
             />
             <div className="flex gap-2">
                <input
                  value={subjectLatStr}
                  onChange={e => setSubjectLatStr(e.target.value)}
                  disabled={!useSubject}
                  placeholder="Latitude"
                  type="number"
                  className="w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-1 focus:ring-[#525ceb] disabled:opacity-50"
                />
                <input
                  value={subjectLngStr}
                  onChange={e => setSubjectLngStr(e.target.value)}
                  disabled={!useSubject}
                  placeholder="Longitude"
                  type="number"
                  className="w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-1 focus:ring-[#525ceb] disabled:opacity-50"
                />
             </div>
          </div>

          <div className="flex-[2] flex flex-col gap-2 min-w-[350px]">
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">User Query</span>
             <textarea
               value={userQuery}
               onChange={e => setUserQuery(e.target.value)}
               rows={4}
               className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-1 focus:ring-[#525ceb] resize-none"
             />
          </div>

          <div className="flex-[0.8] flex flex-col justify-end min-w-[180px] h-full pt-6">
             <button
               onClick={runAnalysis}
               disabled={isLoading || !userQuery.trim()}
               className="h-full min-h-[90px] w-full inline-flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#06b6d4] to-[#2563eb] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 shadow-md shadow-blue-500/20"
             >
               {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCcw className="h-6 w-6" />}
               <span>{isLoading ? 'Running Workflow...' : 'Run Spatial Workflow'}</span>
             </button>
          </div>
        </div>
      </div>

      {data && !isLoading && !error && (
        <div className="grid gap-3 border-b border-slate-200 bg-white px-5 py-3 shrink-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50/50 p-3 flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Projects Loaded</p>
            <p className="mt-1 text-xl font-extrabold text-slate-800">{data.stats.project_count}</p>
          </div>
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50/50 p-3 flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Roads Analyzed</p>
            <p className="mt-1 text-xl font-extrabold text-slate-800">{data.stats.road_count}</p>
          </div>
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50/50 p-3 flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Amenities / POIs</p>
            <p className="mt-1 text-xl font-extrabold text-slate-800">{data.stats.place_count}</p>
          </div>
          <div className="rounded-[1rem] border border-slate-100 bg-slate-50/50 p-3 flex flex-col justify-center border-l-4 border-l-emerald-400">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Analysis Cost</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">${data.stats.total_cost_usd.toFixed(4)}</p>
          </div>
        </div>
      )}

      {data && !isLoading && !error && (
        <div className="border-b border-slate-200 bg-slate-50/80 px-3 pt-2 shrink-0">
           <div className="flex gap-1 overflow-x-auto scroolbar-hide pb-2">
             {TABS.map(tab => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                     isActive 
                       ? 'bg-white text-blue-600 shadow border border-slate-200' 
                       : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                   }`}
                 >
                   <Icon className="w-4 h-4" />
                   {tab.label}
                 </button>
               );
             })}
           </div>
        </div>
      )}

      <div className="relative flex-1 min-h-[300px] overflow-y-auto bg-slate-50">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-50">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
              <div className="h-16 w-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            </div>
            <p className="text-sm font-bold text-slate-500 tracking-wide uppercase mt-4">Running Multistage Workflow</p>
            <div className="w-64 space-y-2 mt-4 text-xs font-medium text-slate-400">
               <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/> Loading Dataset</div>
               <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" style={{animationDelay: "0.2s"}}/> Extracting OSM Context</div>
               <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" style={{animationDelay: "0.4s"}}/> Analyzing Variables</div>
               <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{animationDelay: "0.6s"}}/> Agent Reasoning Steps</div>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
             <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
             <h3 className="text-lg font-bold text-slate-800 mb-2">Analysis Failed</h3>
             <p className="text-sm text-slate-500 max-w-md bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100">{error}</p>
          </div>
        ) : !data ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center opacity-60 pointer-events-none p-6 text-center">
              <MapIcon className="w-20 h-20 text-slate-300 stroke-[1.5] mb-6" />
              <h2 className="text-2xl font-bold text-slate-400">No Data Yet</h2>
              <p className="mt-2 text-sm text-slate-400 max-w-md">Click "Run Spatial Workflow" to extract map data, perform Agent analysis, and render business insights.</p>
           </div>
        ) : (
           <div className="absolute inset-0 p-4 pb-12 overflow-x-hidden pwa-scrollbar">
              {/* TAB 1: OSM OVERLAY */}
              {activeTab === 'overlay' && leafletReady && (
                 <div className="flex flex-col gap-4 h-full">
                    <div 
                      className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative shrink-0 z-0"
                      style={{ height: isFullscreen ? 'calc(100vh - 180px)' : '400px' }}
                    >
                      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="h-full w-full">
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                        
                        <MapScaler isFullscreen={isFullscreen} />
                        
                        {/* ROADS */}
                        {data.roads?.map((r, i) => (
                           <Polyline
                             key={`road-${i}`}
                             positions={r.geometry}
                             color={r.is_main_road ? '#f97316' : '#60a5fa'}
                             weight={r.is_main_road ? 4 : 2}
                             opacity={r.is_main_road ? 0.7 : 0.45}
                           >
                             <Tooltip>{r.name || 'Unnamed Road'} ({r.highway})</Tooltip>
                           </Polyline>
                        ))}
                        
                        {/* PLACES */}
                        {data.places?.slice(0, 300).map((p, i) => {
                           const types = [p.amenity, p.railway, p.highway, p.public_transport].filter(Boolean).join(' / ');
                           return (
                             <CircleMarker
                               key={`place-${i}`}
                               center={[p.lat, p.lon]}
                               radius={3}
                               color="#a78bfa"
                               fill
                               fillOpacity={0.7}
                             >
                                <Tooltip>{p.name} | {types}</Tooltip>
                             </CircleMarker>
                           );
                        })}
                        
                        {/* PROJECTS */}
                        {data.projects?.map((p, i) => {
                           if (p.project_name === data.subject_info?.name && p.rate == null) return null; // hide subject dummy row
                           const popupContent = `
                             <b>Project:</b> ${p.project_name}<br />
                             <b>Rate:</b> ${p.rate || 'N/A'}<br />
                             <b>Dist to Main:</b> ${p.distance_from_main_road_m || 'N/A'} m<br />
                             <b>Zone:</b> ${p.zone || 'N/A'}<br />
                             <b>Nearest Main:</b> ${p.nearest_main_road_name || 'N/A'}
                           `;
                           return (
                             <React.Fragment key={`proj-${i}`}>
                               <CircleMarker
                                 center={[p.lat, p.long]}
                                 radius={7}
                                 color={zoneColor(p.zone)}
                                 fill
                                 fillOpacity={0.85}
                               >
                                 <Tooltip>{p.project_name}</Tooltip>
                                 <Popup><div dangerouslySetInnerHTML={{ __html: popupContent }} /></Popup>
                               </CircleMarker>
                               {/* Distance Line to Main Road */}
                               {p.nearest_main_road_point_lat != null && p.nearest_main_road_point_lon != null && (
                                 <Polyline
                                   positions={[
                                     [p.lat, p.long],
                                     [p.nearest_main_road_point_lat, p.nearest_main_road_point_lon]
                                   ]}
                                   color="#dc2626"
                                   weight={3}
                                   opacity={0.9}
                                   dashArray="6"
                                 />
                               )}
                               {/* Distance Line to Any Road */}
                               {p.nearest_road_point_lat != null && p.nearest_road_point_lon != null && (
                                 <Polyline
                                   positions={[
                                     [p.lat, p.long],
                                     [p.nearest_road_point_lat, p.nearest_road_point_lon]
                                   ]}
                                   color="#f97316"
                                   weight={1.5}
                                   opacity={0.6}
                                 />
                               )}
                             </React.Fragment>
                           );
                        })}
                        
                        {/* SUBJECT PROJECT */}
                        {data.subject_info && (
                          <React.Fragment>
                            <Marker position={[data.subject_info.lat, data.subject_info.lon]}>
                               <Popup>
                                 <div className="text-xs">
                                   <b>{data.subject_info.name}</b><br/>
                                   Lat: {data.subject_info.lat.toFixed(5)}<br/>
                                   Lon: {data.subject_info.lon.toFixed(5)}<br/>
                                   <b>Est. Rate: {data.subject_info.estimated_rate ?? 'N/A'}</b><br/>
                                   Zone: {data.subject_info.zone ?? 'N/A'}<br/>
                                   Main Rd Dist: {data.subject_info.distance_to_main_road_m ?? 'N/A'} m<br/>
                                 </div>
                               </Popup>
                            </Marker>
                            {data.subject_info.nearest_main_road_point_lat != null && data.subject_info.nearest_main_road_point_lon != null && (
                               <Polyline
                                 positions={[
                                   [data.subject_info.lat, data.subject_info.lon],
                                   [data.subject_info.nearest_main_road_point_lat, data.subject_info.nearest_main_road_point_lon]
                                 ]}
                                 color="#dc2626"
                                 weight={3}
                                 opacity={0.9}
                                 dashArray="6"
                               />
                             )}
                          </React.Fragment>
                        )}
                      </MapContainer>

                      {/* Fullscreen Toggle Button */}
                      <button
                        onClick={toggleFullscreen}
                        className="absolute top-5 right-5 z-[10006] p-2.5 bg-white shadow-2xl border-2 border-blue-500/20 text-blue-600 hover:text-white hover:bg-blue-500 transition-all hover:scale-110 flex items-center justify-center rounded-xl"
                        title={isFullscreen ? "Minimize Map" : "Maximize Map"}
                      >
                        {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
                      </button>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                       <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                         <TrendingUp className="w-5 h-5 text-indigo-500" /> Executive Insights
                       </h3>
                       <div className="max-w-none text-slate-600 text-sm leading-relaxed whitespace-normal break-words [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-slate-800 [&_table]:w-full [&_table]:mb-6 [&_table]:border-collapse [&_th]:text-left [&_th]:p-2 [&_th]:border-b-2 [&_th]:border-slate-300 [&_th]:font-bold [&_td]:p-2 [&_td]:border-b [&_td]:border-slate-200 [&_a]:text-indigo-600 [&_a]:underline">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {data.insights}
                          </ReactMarkdown>
                       </div>
                    </div>
                 </div>
              )}

              {/* TAB 2: IMPLEMENTATION PLAN */}
              {activeTab === 'plan' && (
                 <div className="bg-slate-900 rounded-2xl p-5 w-full overflow-hidden shadow-lg border border-slate-800">
                   <div className="flex items-center gap-2 mb-4">
                     <ListTree className="w-5 h-5 text-[#38bdf8]" />
                     <h3 className="text-sm font-bold text-white tracking-wide uppercase">Agent Requirement Deciphering & Scope</h3>
                   </div>
                   <pre className="text-xs text-sky-200 overflow-x-auto whitespace-pre-wrap leading-relaxed scroolbar-hide">
                     {JSON.stringify(data.planner, null, 2)}
                   </pre>
                 </div>
              )}

              {/* TAB 3: EXECUTION STEPS */}
              {activeTab === 'steps' && (
                 <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                       <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                         <PlaySquare className="w-5 h-5 text-emerald-500" /> Internal Progress Log
                       </h3>
                       <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 font-medium">
                         {data.progress_log.map((log, i) => (
                           <li key={i}>{log}</li>
                         ))}
                       </ol>
                    </div>
                    
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg">
                       <h3 className="text-sm font-bold tracking-wide uppercase text-white mb-4 flex items-center gap-2">
                         <MapPin className="w-5 h-5 text-[#f472b6]" /> Agent Execution Summary
                       </h3>
                       <pre className="text-xs text-pink-200 overflow-x-auto whitespace-pre-wrap leading-relaxed scroolbar-hide">
                         {JSON.stringify(data.execution_summary, null, 2)}
                       </pre>
                    </div>
                 </div>
              )}

              {/* TAB 4: OUTPUT DATA */}
              {activeTab === 'output' && (
                 <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                         <Database className="w-5 h-5 text-sky-500" /> Temporary Enriched Data
                       </h3>
                       <button
                         onClick={() => {
                           const keys = Object.keys(data.projects[0] || {});
                           const csv = [
                             keys.join(','),
                             ...data.projects.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))
                           ].join('\n');
                           const blob = new Blob([csv], { type: 'text/csv' });
                           const url = URL.createObjectURL(blob);
                           const a = document.createElement('a');
                           a.href = url;
                           a.download = 'spatial_analysis_output.csv';
                           a.click();
                         }}
                         className="inline-flex items-center gap-2 text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors"
                       >
                         <Download className="w-4 h-4" /> Download CSV
                       </button>
                    </div>
                    <div className="flex-1 overflow-auto rounded-xl border border-slate-100 scroolbar-hide">
                       <table className="w-full text-left text-xs whitespace-nowrap">
                         <thead className="bg-slate-50 sticky top-0 z-10 text-slate-500 uppercase tracking-wider font-bold">
                           <tr>
                             {data.projects.length > 0 && Object.keys(data.projects[0]).map(key => (
                               <th key={key} className="px-4 py-3 border-b">{key}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 text-slate-700">
                           {data.projects.map((row, i) => (
                             <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                               {Object.values(row).map((val: any, j) => (
                                 <td key={j} className="px-4 py-2">{typeof val === 'number' ? val.toFixed(4) : (val ?? 'N/A')}</td>
                               ))}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>
                 </div>
              )}

              {/* TAB 5: LEDGER */}
              {activeTab === 'ledger' && (
                 <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-hidden flex flex-col gap-6">
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                       <Receipt className="w-5 h-5 text-amber-500" /> Token Cost Ledger
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">Input Tokens</p>
                         <p className="text-2xl font-black text-amber-700 mt-1">
                           {data.token_log.reduce((acc, curr) => acc + curr.input_tokens, 0).toLocaleString()}
                         </p>
                       </div>
                       <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">Output Tokens</p>
                         <p className="text-2xl font-black text-amber-700 mt-1">
                           {data.token_log.reduce((acc, curr) => acc + curr.output_tokens, 0).toLocaleString()}
                         </p>
                       </div>
                       <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">Total Tokens</p>
                         <p className="text-2xl font-black text-amber-700 mt-1">
                           {data.token_log.reduce((acc, curr) => acc + curr.total_tokens, 0).toLocaleString()}
                         </p>
                       </div>
                       <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70">Total Cost</p>
                         <p className="text-2xl font-black text-emerald-700 mt-1">
                           ${data.stats.total_cost_usd.toFixed(4)}
                         </p>
                       </div>
                    </div>

                    <div className="overflow-auto rounded-xl border border-slate-100 scroolbar-hide">
                       <table className="w-full text-left text-xs whitespace-nowrap">
                         <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold">
                           <tr>
                             <th className="px-4 py-3 border-b">Step</th>
                             <th className="px-4 py-3 border-b text-right">Input Tokens</th>
                             <th className="px-4 py-3 border-b text-right">Output Tokens</th>
                             <th className="px-4 py-3 border-b text-right">Total Tokens</th>
                             <th className="px-4 py-3 border-b text-right">Cost (USD)</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 text-slate-700">
                           {data.token_log.map((log, i) => (
                             <tr key={i}>
                               <td className="px-4 py-2 font-medium bg-slate-50/50">{log.step}</td>
                               <td className="px-4 py-2 text-right">{log.input_tokens.toLocaleString()}</td>
                               <td className="px-4 py-2 text-right">{log.output_tokens.toLocaleString()}</td>
                               <td className="px-4 py-2 text-right">{log.total_tokens.toLocaleString()}</td>
                               <td className="px-4 py-2 text-right font-medium text-emerald-600">${log.cost_usd.toFixed(6)}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>
                 </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}

function MapScaler({ isFullscreen }: { isFullscreen: boolean }) {
  const [leaflet, setLeaflet] = useState<any>(null);
  useEffect(() => { import('react-leaflet').then(mod => setLeaflet(mod)); }, []);
  if (!leaflet) return null;
  
  const Inner = () => {
    const map = leaflet.useMap();
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
