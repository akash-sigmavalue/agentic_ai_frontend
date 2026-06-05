'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Layers, Target, Compass, Maximize2 } from 'lucide-react';
import type { MarkerData } from '@/lib/dashboard/geospatial/types';
import type { SampleMapMode } from '@/lib/dashboard/geospatial/types';
import ThreeDMapView from './maps/ThreeDMapView';
import ThreeDMapTimelapseView from './maps/ThreeDMapTimelapseView';
import SpatialAnalysisView from './maps/SpatialAnalysisView';
import MapOverlayView from './maps/MapOverlayView';
import HeatmapTimelapseView from './maps/timelapse/HeatmapTimelapseView';
import { SAMPLE_MAP_OPTIONS } from '@/lib/dashboard/geospatial/sampleMaps';
import { useSearchParams } from 'next/navigation';


// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

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

      // Grid
      ctx.strokeStyle = 'rgba(108,99,255,0.07)';
      ctx.lineWidth = 1;
      const step = 40;

      for (let x = 0; x < W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      for (let y = 0; y < H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Move dots
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;

        if (d.x < 0 || d.x > 1) d.vx *= -1;
        if (d.y < 0 || d.y > 1) d.vy *= -1;
      });

      // Connect nearby dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = (dots[i].x - dots[j].x) * W;
          const dy = (dots[i].y - dots[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.strokeStyle = `rgba(108,99,255,${0.18 * (1 - dist / 100)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dots[i].x * W, dots[i].y * H);
            ctx.lineTo(dots[j].x * W, dots[j].y * H);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      dots.forEach((d) => {
        ctx.beginPath();
        ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
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

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  );
}

interface MapSectionProps {
  markers?: MarkerData[];
  onToggle?: () => void;
  isCollapsed?: boolean;
}

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

const MapSection: React.FC<MapSectionProps> = ({ 
  markers = [],
  onToggle,
  isCollapsed 
}) => {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as string | null;
  const tabName = (tabFromUrl == "2d_map" ? "2d" : tabFromUrl) as SampleMapMode | null;
  const [isMounted, setIsMounted] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);
  const [sampleMapMode, setSampleMapMode] = useState<SampleMapMode>(tabName || 'default');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const center: [number, number] =
    markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : DEFAULT_CENTER;

  useEffect(() => {
    let active = true;
    
    setIsMounted(true);

    import('leaflet').then((leaflet) => {
      if (!active) return;

      // Fix default icon issue in Leaflet + Next.js
      const iconPrototype = leaflet.Icon.Default.prototype as typeof leaflet.Icon.Default.prototype & {
        _getIconUrl?: string;
      };
      delete iconPrototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl:
          'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      setLeafletReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  // Update sampleMapMode when URL search params change
  useEffect(() => {
    if (tabName) {
      setSampleMapMode(tabName as SampleMapMode);
    }
  }, [searchParams]);

  if (!isMounted || (sampleMapMode === 'default' && !leafletReady)) {
    return (
      <div className="workspace-panel flex h-full w-full flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden items-center justify-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
          <div className="relative h-12 w-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing Engine</p>
      </div>
    );
  }

  return (
    <div className={`workspace-panel flex h-full w-full flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden transition-all duration-500 
      ${isCollapsed ? 'opacity-80' : 'opacity-100'} 
      ${isMapFullscreen ? 'fixed inset-0 z-[10005] m-0 rounded-none' : ''}`}
    >
      {/* Panel Header */}
      <div className="workspace-panel-header flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <MapIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">Geospatial Viewer</h2>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-1 leading-none">Real-time coordinate mapping</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <span>Sample Maps</span>
            <select
              value={sampleMapMode}
              onChange={(event) => setSampleMapMode(event.target.value as SampleMapMode)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 outline-none"
            >
              {SAMPLE_MAP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {markers.length > 0 ? `${markers.length} Targets` : 'No markers'}
          </div>
          
          <button 
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <Maximize2 className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Animated background */}
      <AnimatedDots />

      <div className="relative z-10 flex-1 bg-slate-50 overflow-y-auto">
        {sampleMapMode === 'default' ? (
          markers.length > 0 ? (
          <div className="h-full w-full">
            <MapContainer
              center={center}
              zoom={8}
              scrollWheelZoom={true}
              zoomControl={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

            {markers.map((marker, idx) => {
              const markerKey =
                marker.id ??
                `${marker.lat}-${marker.lng}-${idx}`;

              const title = marker.address || marker.label || 'Selected Location';
              const subtitle = marker.insight || marker.description || '';
              const lat = Number(marker.lat);
              const lng = Number(marker.lng);

              return (
                <Marker key={markerKey} position={[lat, lng]}>
                  <Popup>
                    <div className="min-w-[160px] max-w-[250px] p-1">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-white">
                        {title}
                      </p>

                      {subtitle ? (
                        <p className="mb-2 text-[11px] leading-relaxed text-slate-300">
                          {subtitle}
                        </p>
                      ) : null}

                      <p className="text-[10px] text-slate-400">
                        Lat: {lat.toFixed(5)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Lng: {lng.toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
             <div className="relative mb-8">
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-pulse blur-2xl" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-2xl border border-slate-100/50">
                  <Compass className="h-12 w-12 text-emerald-500/40 animate-[spin_20s_linear_infinite]" />
                </div>
             </div>
             
             <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Geospatial Data Inactive</h3>
             <p className="mt-3 max-w-[280px] text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
               Neural engine coordinate system
             </p>
             <p className="mt-4 max-w-[280px] text-sm font-medium text-slate-500 leading-relaxed">
               Provide location coordinates, and ask geographical analysis in the view to populate this view.
             </p>

             <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-sm px-4">
                <div className="p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm text-left">
                  <Layers className="h-5 w-5 text-indigo-500 mb-3" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Layers</p>
                  <p className="text-sm font-extrabold text-slate-900">4 Available</p>
                </div>
                <div className="p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm text-left">
                  <Target className="h-5 w-5 text-emerald-500 mb-3" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coordinate Check</p>
                  <p className="text-sm font-extrabold text-slate-900">Ready</p>
                </div>
             </div>

             <div className="mt-8 flex flex-wrap justify-center gap-2">
                {['Layers ...', 'Markers ...', 'Coverage ...'].map((tag) => (
                  <span key={tag} className="px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 tracking-wide">
                    {tag}
                  </span>
                ))}
             </div>

             <div className="mt-8 text-[10px] font-mono text-slate-400 bg-slate-100/50 px-4 py-2 rounded-xl border border-slate-200/50">
               lat: -.--- , lon: -.--- zoom: -
             </div>
          </div>
        )
        ) : sampleMapMode === '2d' ? (
          <MapOverlayView isFullscreen={isMapFullscreen} toggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)} />
        ) : sampleMapMode === '3d' ? (
          <ThreeDMapView markers={markers} />
        ) : sampleMapMode === '3d-timelapse' ? (
          <ThreeDMapTimelapseView markers={markers} />
        ) : sampleMapMode === 'visualization' ? (
          <SpatialAnalysisView markers={markers} isFullscreen={isMapFullscreen} toggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)} />
        ) : sampleMapMode === 'heatmap-timelapse' ? (
          <HeatmapTimelapseView />
        ) : null}

      </div>
    </div>
  );
};

export default MapSection;
