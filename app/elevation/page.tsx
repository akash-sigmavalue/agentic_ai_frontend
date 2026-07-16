"use client";
import "./elevention.css"

import React, { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Mountain,
  PenTool,
  Trash2,
  Layers,
  Grid3X3,
  Activity,
  Box,
  Loader2,
  Ruler,
  TriangleAlert,
  Eye,
  EyeOff,
  Paintbrush,
  Bot,
  Send,
  X,
} from "lucide-react";
import type { LatLng, ElevationGridResponse } from "@/types/elevation.ts";

// Dynamic imports for heavy components (prevent SSR issues with Google Maps + Three.js)
const Map2D = dynamic(() => import("@/components/elevation/Map2D"), { ssr: false });
const Mesh3D = dynamic(() => import("@/components/elevation/Mesh3D"), { ssr: false });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_ELEVATION || "";
const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

export default function HomePage() {
  // ── State ──────────────────────────────────────────────────────────────
  const [polygon, setPolygon] = useState<LatLng[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [resolution, setResolution] = useState(30);
  const [elevationData, setElevationData] = useState<ElevationGridResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWireframe, setShowWireframe] = useState(true);
  const [exaggeration, setExaggeration] = useState(1.5);
  const [searchQuery, setSearchQuery] = useState("");
  const [colorMode, setColorMode] = useState<"elevation" | "cutfill">("elevation");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [overrideBalanceZ, setOverrideBalanceZ] = useState<number | null>(null);
  const [llmCostDetails, setLlmCostDetails] = useState<{
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    model?: string;
  } | null>(null);

  // ── Lifted Map Camera States ──────────────────────────────────────────
  const [mapCenter, setMapCenter] = useState<LatLng>({
    lat: 27.9881,
    lng: 86.925,
  });
  const [mapZoom, setMapZoom] = useState(13);
  const [mapTilt, setMapTilt] = useState(0);
  const [mapHeading, setMapHeading] = useState(0);
  const [mapSearchText, setMapSearchText] = useState("");

  // ── Client-side Cut/Fill Recalculation ──
  const computedElevationData = useMemo(() => {
    if (!elevationData) return null;
    
    // Default to backend-provided balance elevation if override is null
    const z = overrideBalanceZ !== null ? overrideBalanceZ : elevationData.balance_elevation_m;
    
    const { min_lat, max_lat, min_lng, max_lng, lat_step, lng_step } = elevationData.bounds;
    const latMid = (min_lat + max_lat) / 2;
    const radLat = (latMid * Math.PI) / 180;
    
    const metersPerDegLat = 111320.0;
    const metersPerDegLng = 111320.0 * Math.cos(radLat);
    
    const cellWidthM = lng_step * metersPerDegLng;
    const cellHeightM = lat_step * metersPerDegLat;
    const cellAreaM2 = cellWidthM * cellHeightM;
    
    let totalCutM3 = 0;
    let totalFillM3 = 0;
    const rows = elevationData.rows;
    const cols = elevationData.cols;
    const cutFillDepths: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isInside = elevationData.mask[r]?.[c];
        const elev = elevationData.elevations[r]?.[c];
        
        if (isInside && elev !== null && elev !== undefined) {
          const deltaZ = elev - z;
          cutFillDepths[r][c] = deltaZ;
          if (deltaZ > 0) {
            totalCutM3 += deltaZ * cellAreaM2;
          } else {
            totalFillM3 += Math.abs(deltaZ) * cellAreaM2;
          }
        }
      }
    }
    
    const netEarthworkM3 = totalCutM3 - totalFillM3;
    
    return {
      ...elevationData,
      balance_elevation_m: Number(z.toFixed(2)),
      estimated_cut_m3: totalCutM3,
      estimated_fill_m3: totalFillM3,
      net_earthwork_m3: netEarthworkM3,
      cut_fill_depths: cutFillDepths,
    };
  }, [elevationData, overrideBalanceZ]);

  const siteRemark = useMemo(() => {
    if (!computedElevationData) return "N/A";
    
    const slope = computedElevationData.avg_slope_pct;
    const hasWater = computedElevationData.nearby_features?.some(
      (f) => f.type === "water_body" && f.distance_m <= 300
    );
    const netVolume = Math.abs(computedElevationData.net_earthwork_m3);
    const plotArea = computedElevationData.plot_area_m2;
    const imbalanceRatio = plotArea > 0 ? netVolume / plotArea : 0;
    
    if (slope > 30) {
      return "Critical Slope Risk";
    } else if (slope > 15) {
      return "Steep Terrain";
    } else if (hasWater) {
      return "Eco Buffer Warning";
    } else if (imbalanceRatio > 1.5) {
      return "Earthwork Mismatch";
    } else if (slope <= 5 && imbalanceRatio < 0.2) {
      return "Optimal Grading";
    } else {
      return "Standard Grading";
    }
  }, [computedElevationData]);


  // ── Resizable Panels States ──────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(36); // percent
  const [midWidth, setMidWidth] = useState(38);   // percent
  const [activeResizer, setActiveResizer] = useState<"divider1" | "divider2" | null>(null);

  const startResize = useCallback((resizer: "divider1" | "divider2") => {
    setActiveResizer(resizer);
  }, []);

  const stopResize = useCallback(() => {
    setActiveResizer(null);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!activeResizer) return;
    
    const container = document.getElementById("panels-container");
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX;
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    
    if (activeResizer === "divider1") {
      if (showAiPanel && computedElevationData) {
        const newLeft = Math.max(15, Math.min(55, xPct));
        setLeftWidth(newLeft);
        const maxMid = 100 - newLeft - 20;
        if (midWidth > maxMid) {
          setMidWidth(maxMid);
        }
      } else {
        const newLeft = Math.max(15, Math.min(85, xPct));
        setLeftWidth(newLeft);
        setMidWidth(100 - newLeft);
      }
    } else if (activeResizer === "divider2") {
      const minMid = 15;
      const maxDivider2 = 85;
      const newDivider2Pos = Math.max(leftWidth + minMid, Math.min(maxDivider2, xPct));
      setMidWidth(newDivider2Pos - leftWidth);
    }
  }, [activeResizer, leftWidth, midWidth, showAiPanel, computedElevationData]);

  useEffect(() => {
    if (activeResizer) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResize);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [activeResizer, resize, stopResize]);

  useEffect(() => {
    if (showAiPanel && computedElevationData) {
      setLeftWidth(36);
      setMidWidth(38);
    } else {
      setLeftWidth(50);
      setMidWidth(50);
    }
  }, [showAiPanel, !!computedElevationData]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handlePolygonComplete = useCallback((coords: LatLng[]) => {
    setPolygon(coords);
    setIsDrawing(false);
    setError(null);
  }, []);

  const handleClearPolygon = useCallback(() => {
    setPolygon(null);
    setElevationData(null);
    setError(null);
    setIsDrawing(false);
    setShowAiPanel(false);
    setAiMessages([]);
    setOverrideBalanceZ(null);
    setLlmCostDetails(null);
  }, []);

  const handleStartDrawing = useCallback(() => {
    setPolygon(null);
    setElevationData(null);
    setError(null);
    setIsDrawing(true);
    setShowAiPanel(false);
    setAiMessages([]);
    setOverrideBalanceZ(null);
    setLlmCostDetails(null);
  }, []);

  const triggerAiSummary = useCallback(async (data: ElevationGridResponse) => {
    setAiLoading(true);
    setAiMessages([]);
    try {
      const plotData = {
        plot_area_m2: data.plot_area_m2,
        min_elevation_m: data.min_elevation,
        max_elevation_m: data.max_elevation,
        elevation_range_m: data.elevation_range,
        avg_slope_pct: data.avg_slope_pct,
        slope_classification: data.slope_classification,
        balance_elevation_m: data.balance_elevation_m,
        estimated_cut_m3: data.estimated_cut_m3,
        estimated_fill_m3: data.estimated_fill_m3,
        net_earthwork_m3: data.net_earthwork_m3,
        nearby_features: data.nearby_features,
        data_source: "Google Elevation API point sampling, smoothed (3x3 moving average)",
        confidence: "feasibility-estimate, not survey-grade"
      };

      const response = await fetch(`${BACKEND_URL}/api/plot-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plotData }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate feasibility summary");
      }

      const res = await response.json();
      setAiMessages([{ role: "assistant", text: res.text }]);
      if (res.cost_details) {
        setLlmCostDetails(res.cost_details);
      }
    } catch (err: any) {
      setAiMessages([{
        role: "assistant",
        text: `Failed to load feasibility summary. ${err.message}`
      }]);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!polygon || polygon.length < 3) return;
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        polygon: polygon.map((p) => ({ lat: p.lat, lng: p.lng })),
        resolution,
      };
      if (overrideBalanceZ !== null) {
        payload.custom_target_elevation = overrideBalanceZ;
      }

      const response = await fetch(`${BACKEND_URL}/api/elevation/grid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${response.status}`);
      }

      const data: ElevationGridResponse = await response.json();
      setElevationData(data);
      triggerAiSummary(data);
      setShowAiPanel(true);
    } catch (err: any) {
      setError(err.message || "Failed to fetch elevation data");
    } finally {
      setLoading(false);
    }
  }, [polygon, resolution, overrideBalanceZ, triggerAiSummary]);

  const handleSendQuestion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || !computedElevationData || aiLoading) return;

    const userText = aiInput.trim();
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", text: userText }]);
    setAiLoading(true);

    try {
      const plotData = {
        plot_area_m2: computedElevationData.plot_area_m2,
        min_elevation_m: computedElevationData.min_elevation,
        max_elevation_m: computedElevationData.max_elevation,
        elevation_range_m: computedElevationData.elevation_range,
        avg_slope_pct: computedElevationData.avg_slope_pct,
        slope_classification: computedElevationData.slope_classification,
        balance_elevation_m: computedElevationData.balance_elevation_m,
        estimated_cut_m3: computedElevationData.estimated_cut_m3,
        estimated_fill_m3: computedElevationData.estimated_fill_m3,
        net_earthwork_m3: computedElevationData.net_earthwork_m3,
        nearby_features: computedElevationData.nearby_features,
        data_source: "Google Elevation API point sampling, smoothed (3x3 moving average)",
        confidence: "feasibility-estimate, not survey-grade"
      };

      const response = await fetch(`${BACKEND_URL}/api/plot-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userText,
          plotData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from assistant");
      }

      const res = await response.json();
      setAiMessages((prev) => [...prev, { role: "assistant", text: res.text }]);
      if (res.cost_details) {
        setLlmCostDetails((prev) => {
          const prevInput = prev?.input_tokens ?? 0;
          const prevOutput = prev?.output_tokens ?? 0;
          const prevCost = prev?.cost_usd ?? 0;
          return {
            input_tokens: prevInput + res.cost_details.input_tokens,
            output_tokens: prevOutput + res.cost_details.output_tokens,
            cost_usd: prevCost + res.cost_details.cost_usd,
            model: res.cost_details.model,
          };
        });
      }
    } catch (err: any) {
      setAiMessages((prev) => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, computedElevationData, aiLoading]);

  // ── Computed values ────────────────────────────────────────────────────
  const vertexCount = polygon?.length || 0;
  const gridPointCount = resolution * resolution;
  const canGenerate = polygon && polygon.length >= 3 && !loading;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)] mt-[100px]">
      {/* ══════════════════════════════════════════════════════════════════
          HEADER PANEL
          ═══════════════════════════════════════════════════════════════ */}
      <header className="w-full bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] px-6 py-4 flex flex-wrap items-center justify-between gap-4 relative z-40 shrink-0 shadow-lg">
        {/* Left Side: Title & Polygon Tools */}
        <div className="flex items-center gap-6">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-md">
              <Mountain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">
                ElevationGIS
              </h1>
              <span className="text-[9px] text-[var(--text-muted)] font-medium tracking-wide">
                3D Terrain Dashboard
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[var(--border-subtle)]" />

          {/* Polygon drawing buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 p-1 rounded-lg border border-[var(--border-subtle)]">
            <button
              className={`px-3 py-1.5 text-xs rounded-md font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                isDrawing
                  ? "!border-indigo-500/50 !text-indigo-400 !bg-indigo-500/10"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
              onClick={handleStartDrawing}
              id="btn-draw-polygon"
            >
              <PenTool className="w-3.5 h-3.5" />
              {isDrawing ? "Drawing…" : "Draw Area"}
            </button>
            <button
              className="px-3 py-1.5 text-xs rounded-md font-semibold text-[var(--text-secondary)] hover:text-white disabled:opacity-40 flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
              onClick={handleClearPolygon}
              disabled={!polygon && !isDrawing}
              id="btn-clear-polygon"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            {polygon && (
              <div className="flex items-center gap-1 text-[10px] bg-slate-800/80 text-[var(--accent-cyan)] px-2 py-1 rounded font-mono border border-slate-700 font-bold ml-1.5">
                <Layers className="w-3 h-3" />
                {vertexCount} pts
              </div>
            )}
          </div>
        </div>

        {/* Middle: Sliders & Wireframe Options */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Resolution Slider */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
              Resolution
            </span>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={resolution}
              onChange={(e) => setResolution(Number(e.target.value))}
              className="w-24 accent-indigo-500 cursor-pointer"
              id="slider-resolution"
            />
            <span className="text-xs font-mono font-bold text-[var(--accent-indigo)] bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
              {resolution}²
            </span>
          </div>

          <div className="h-6 w-[1px] bg-[var(--border-subtle)]" />

          {/* Exaggeration Slider (shows when data exists) */}
          <div className={`flex items-center gap-2.5 transition-opacity duration-200 ${computedElevationData ? "opacity-100" : "opacity-35 pointer-events-none"}`}>
            <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
              Exaggeration
            </span>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.1}
              value={exaggeration}
              onChange={(e) => setExaggeration(Number(e.target.value))}
              disabled={!computedElevationData}
              className="w-24 accent-cyan-500 cursor-pointer"
              id="slider-exaggeration"
            />
            <span className="text-xs font-mono font-bold text-[var(--accent-cyan)] bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
              {exaggeration.toFixed(1)}x
            </span>
          </div>
 
          {/* Wireframe Toggle */}
          {computedElevationData && (
            <button
              className={`p-1.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                showWireframe
                  ? "border-indigo-500/35 text-indigo-400 bg-indigo-500/10 shadow-sm"
                  : "border-slate-800 text-slate-400 hover:text-white"
              }`}
              onClick={() => setShowWireframe(!showWireframe)}
              id="btn-wireframe-toggle"
              title="Toggle Wireframe"
            >
              {showWireframe ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </button>
          )}
 
          {/* Color Mode Toggle */}
          {computedElevationData && (
            <button
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                colorMode === "cutfill"
                  ? "border-rose-500/35 text-rose-400 bg-rose-500/10 shadow-sm"
                  : "border-slate-800 text-slate-400 hover:text-white"
              }`}
              onClick={() => setColorMode(colorMode === "elevation" ? "cutfill" : "elevation")}
              id="btn-color-mode-toggle"
              title="Toggle Earthwork Cut/Fill Heatmap"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              {colorMode === "cutfill" ? "Cut/Fill Heatmap" : "Elevation Map"}
            </button>
          )}
        </div>
 
        {/* Right Side: Stats & Action Button */}
        <div className="flex items-center gap-4">
          {/* Stats badge */}
          {computedElevationData && (
            <div className="hidden xl:flex items-center gap-4 text-[11px] font-mono text-[var(--text-secondary)] bg-slate-950/40 px-3.5 py-2 rounded-lg border border-[var(--border-subtle)]">
              {/* Min/Max */}
              <span className="flex gap-1.5 items-center cursor-help group relative">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-sans font-bold">Min/Max</span>
                <strong className="text-slate-300">
                  <span className="text-emerald-400">{computedElevationData.min_elevation?.toFixed(1)}m</span>
                  <span className="mx-1 text-slate-600">/</span>
                  <span className="text-rose-400">{computedElevationData.max_elevation?.toFixed(1)}m</span>
                </strong>
                
                {/* Popover */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-60 bg-slate-900/95 backdrop-blur-md text-slate-300 p-3 rounded-lg border border-slate-700/60 shadow-2xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-1.5 text-left font-sans">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-white/5">
                    Min/Max Elevation
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300">
                    <span className="font-bold text-slate-400 block mb-0.5">Bases & Constraints:</span>
                    The absolute highest and lowest terrain elevations sampled inside your custom boundary.
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300 border-t border-white/5 pt-1">
                    <span className="font-bold text-slate-400 block mb-0.5">Approach:</span>
                    Google Elevation point API sampling, smoothed with a 3x3 low-pass filter to remove sensor noise spikes.
                  </div>
                </div>
              </span>
              
              <span className="opacity-20">|</span>
              
              {/* Area */}
              <span className="flex gap-1.5 items-center cursor-help group relative">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-sans font-bold">Area</span>
                <strong className="text-amber-400">{Math.round(computedElevationData.plot_area_m2).toLocaleString()} m²</strong>
                
                {/* Popover */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-60 bg-slate-900/95 backdrop-blur-md text-slate-300 p-3 rounded-lg border border-slate-700/60 shadow-2xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-1.5 text-left font-sans">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-white/5">
                    Surface Area
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300">
                    <span className="font-bold text-slate-400 block mb-0.5">Bases & Constraints:</span>
                    The exact surface footprint size of your drawn coordinates.
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300 border-t border-white/5 pt-1">
                    <span className="font-bold text-slate-400 block mb-0.5">Approach:</span>
                    Calculated using the Shoelace polygon area formula on the lat/lng coordinates, scaled to physical meters based on the center latitude.
                  </div>
                </div>
              </span>
              
              <span className="opacity-20">|</span>
              
              {/* Slope */}
              <span className="flex gap-1.5 items-center cursor-help group relative">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-sans font-bold">Slope</span>
                <strong className={
                  computedElevationData.slope_classification === "Steep" || computedElevationData.slope_classification === "Very Steep"
                    ? "text-rose-400"
                    : computedElevationData.slope_classification === "Moderate"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }>
                  {computedElevationData.avg_slope_pct}% ({computedElevationData.slope_classification})
                </strong>
                
                {/* Popover */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-60 bg-slate-900/95 backdrop-blur-md text-slate-300 p-3 rounded-lg border border-slate-700/60 shadow-2xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-1.5 text-left font-sans">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-white/5">
                    Average Slope
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300">
                    <span className="font-bold text-slate-400 block mb-0.5">Bases & Constraints:</span>
                    Average slope steepness of the terrain. Steeper sites face increased grading risks and structural costs.
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300 border-t border-white/5 pt-1">
                    <span className="font-bold text-slate-400 block mb-0.5">Approach:</span>
                    Calculated per cell using Horn's slope algorithm (using the elevations of its 8 neighbors), then averaged across all inside points.
                  </div>
                </div>
              </span>
              
              <span className="opacity-20">|</span>
              
              {/* Balance Z */}
              <span className="flex gap-1.5 items-center cursor-help group relative">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-sans font-bold">Balance Z</span>
                <strong className="text-cyan-400">{computedElevationData.balance_elevation_m}m</strong>
                
                {/* Popover */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-60 bg-slate-900/95 backdrop-blur-md text-slate-300 p-3 rounded-lg border border-slate-700/60 shadow-2xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-1.5 text-left font-sans">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-white/5">
                    Target Pad Height
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300">
                    <span className="font-bold text-slate-400 block mb-0.5">Bases & Constraints:</span>
                    The optimal height level to establish a target pad without needing to export or import soil.
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300 border-t border-white/5 pt-1">
                    <span className="font-bold text-slate-400 block mb-0.5">Approach:</span>
                    Computed as the arithmetic mean of all elevation points. You can adjust this height manually using the slider.
                  </div>
                </div>
              </span>
              
              <span className="opacity-20">|</span>
              
              {/* Cut/Fill */}
              <span className="flex gap-1.5 items-center cursor-help group relative">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-sans font-bold">Cut/Fill</span>
                <strong className="text-slate-300">
                  <span className="text-rose-400">-{Math.round(computedElevationData.estimated_cut_m3)}m³</span>
                  <span className="mx-1 text-slate-600">/</span>
                  <span className="text-cyan-400">+{Math.round(computedElevationData.estimated_fill_m3)}m³</span>
                </strong>
                
                {/* Popover */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-60 bg-slate-900/95 backdrop-blur-md text-slate-300 p-3 rounded-lg border border-slate-700/60 shadow-2xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-1.5 text-left font-sans">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-white/5">
                    Grading Volumes
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300">
                    <span className="font-bold text-slate-400 block mb-0.5">Bases & Constraints:</span>
                    The estimated excavation (Cut) and deposit (Fill) volumes required to flatten the site to the Target Pad height.
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300 border-t border-white/5 pt-1">
                    <span className="font-bold text-slate-400 block mb-0.5">Approach:</span>
                    Calculated by multiplying the grid cell area by the vertical difference between its actual height and the target pad level.
                  </div>
                </div>
              </span>
              
              <span className="opacity-20">|</span>
              
              {/* Remark */}
              <span className="flex gap-1.5 items-center cursor-help group relative">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-sans font-bold">Remark</span>
                <strong className={
                  siteRemark.includes("Critical") || siteRemark.includes("Warning")
                    ? "text-rose-400"
                    : siteRemark.includes("Optimal")
                    ? "text-emerald-400"
                    : "text-amber-400"
                }>
                  {siteRemark}
                </strong>
                
                {/* Popover */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-60 bg-slate-900/95 backdrop-blur-md text-slate-300 p-3 rounded-lg border border-slate-700/60 shadow-2xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-1.5 text-left font-sans">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-white/5">
                    Site Suitability Remark
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300">
                    <span className="font-bold text-slate-400 block mb-0.5">Bases & Constraints:</span>
                    Derived from slope averages (risk thresholds at 15% and 30%), hydrological proximity setback (300m Google Places buffer), and net earthwork imbalance limits relative to the site area.
                  </div>
                  <div className="text-[9px] leading-normal text-slate-300 border-t border-white/5 pt-1">
                    <span className="font-bold text-slate-400 block mb-0.5">Approach:</span>
                    Combines the Horn's slope classification, Shoelace area metrics, and Google Places water features to output a quick feasibility status indicator.
                  </div>
                </div>
              </span>

              <span className="opacity-20">|</span>
              <span className="flex gap-1.5 items-center cursor-help group relative">
                <span className="text-[9px] text-[var(--text-muted)] uppercase font-sans font-bold">Est. Cost</span>
                <strong className="text-emerald-400">
                  ${((computedElevationData.api_cost_details?.total_cost_usd ?? 0) + (llmCostDetails?.cost_usd ?? 0)).toFixed(3)}
                </strong>
                
                {/* Hover Popover Breakdown */}
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 backdrop-blur-md text-slate-300 p-3 rounded-lg border border-slate-700/60 shadow-2xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider pb-1 border-b border-white/5">
                    Est. Billing Cost Breakdown
                  </div>
                  
                  <div className="flex flex-col gap-1 text-[10px] font-sans">
                    {/* Google Elevation */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Google Elevation API:</span>
                      <span className="font-mono text-white">
                        ${computedElevationData.api_cost_details?.elevation_cost_usd.toFixed(3) ?? "0.000"}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono pl-2 leading-none">
                      ({computedElevationData.api_cost_details?.elevation_api_calls} calls, {computedElevationData.api_cost_details?.elevation_cache_hits} cache hits)
                    </div>

                    {/* Google Places */}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-400">Google Places API:</span>
                      <span className="font-mono text-white">
                        ${computedElevationData.api_cost_details?.places_cost_usd.toFixed(3) ?? "0.000"}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono pl-2 leading-none">
                      ({computedElevationData.api_cost_details?.places_api_calls} search requests)
                    </div>

                    {/* AWS Bedrock */}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-400">AWS Bedrock LLM:</span>
                      <span className="font-mono text-white">
                        ${(llmCostDetails?.cost_usd ?? 0).toFixed(4)}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono pl-2 leading-none flex flex-col gap-0.5 mt-0.5">
                      <div>({llmCostDetails?.input_tokens ?? 0} in / {llmCostDetails?.output_tokens ?? 0} out tokens)</div>
                      {llmCostDetails?.model && (
                        <div className="text-slate-500 font-sans text-[8px] truncate leading-normal">
                          Model: <span className="font-mono text-indigo-400">{llmCostDetails.model}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-1.5 flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-300">Total Run Cost:</span>
                    <span className="text-emerald-400 font-mono">
                      ${((computedElevationData.api_cost_details?.total_cost_usd ?? 0) + (llmCostDetails?.cost_usd ?? 0)).toFixed(4)}
                    </span>
                  </div>

                  {computedElevationData.api_cost_details && computedElevationData.api_cost_details.elevation_cache_hits > 0 && (
                    <div className="text-[9px] text-emerald-500 italic text-center font-sans mt-0.5 leading-normal">
                      🎉 SQLite Cache saved you ${((computedElevationData.api_cost_details.elevation_cache_hits) * 0.005).toFixed(2)} USD!
                    </div>
                  )}
                </div>
              </span>
            </div>
          )}

          {/* AI Assistant Toggle Button */}
          {computedElevationData && (
            <button
              className={`px-3.5 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all duration-150 cursor-pointer leading-none ${
                showAiPanel
                  ? "border-indigo-500/35 text-indigo-400 bg-indigo-500/10 shadow-sm"
                  : "border-slate-800 text-slate-400 hover:text-white bg-slate-900/40"
              }`}
              onClick={() => setShowAiPanel(!showAiPanel)}
              id="btn-toggle-ai-panel"
              title="Toggle AI Feasibility Assistant"
            >
              <Bot className="w-3.5 h-3.5" />
              AI Assistant
            </button>
          )}
 
          {/* Action button */}
          <button
            className="btn-primary py-2 px-5 text-xs font-semibold shadow-md flex items-center gap-2 leading-none"
            disabled={!canGenerate}
            onClick={handleGenerate}
            id="btn-generate-elevation"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5" />
                Generate 3D Terrain
              </>
            )}
          </button>
        </div>
      </header>
 
      {/* Error alert banner */}
      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 fade-in-up">
          <TriangleAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
 
      {/* ══════════════════════════════════════════════════════════════════
          SIDE-BY-SIDE VIEWPORTS (RESIZABLE PANELS)
          ═══════════════════════════════════════════════════════════════ */}
      <div 
        id="panels-container"
        className="flex-1 w-full flex overflow-hidden p-2 gap-0.5 min-h-0 relative select-none"
        style={activeResizer ? { userSelect: "none" } : undefined}
      >
        {/* Left Side: 2D Map */}
        <div 
          style={{ width: showAiPanel && computedElevationData ? `${leftWidth}%` : `${(leftWidth / (leftWidth + midWidth)) * 100}%` }}
          className="h-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] relative shadow-inner shrink-0"
        >
          <Map2D
            apiKey={API_KEY}
            polygon={polygon}
            onPolygonComplete={handlePolygonComplete}
            isDrawing={isDrawing}
            searchQuery={searchQuery}
            center={mapCenter}
            setCenter={setMapCenter}
            zoom={mapZoom}
            setZoom={setMapZoom}
            tilt={mapTilt}
            setTilt={setMapTilt}
            heading={mapHeading}
            setHeading={setMapHeading}
            searchText={mapSearchText}
            setSearchText={setMapSearchText}
          />
          {/* Custom label */}
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <div className="glass-card-subtle px-2.5 py-1 flex items-center gap-1.5 bg-slate-950/70 backdrop-blur-md border border-white/5 shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] font-black text-slate-300 tracking-wider uppercase font-sans">
                2D Viewport
              </span>
            </div>
          </div>
        </div>

        {/* Divider 1 */}
        <div
          onMouseDown={() => startResize("divider1")}
          className={`w-2 hover:bg-indigo-500/20 active:bg-indigo-500/40 cursor-col-resize transition-colors duration-150 self-stretch flex items-center justify-center relative z-25 shrink-0 ${
            activeResizer === "divider1" ? "bg-indigo-500/30" : "bg-transparent"
          }`}
          title="Drag to resize viewports"
        >
          <div className="w-[2px] h-6 rounded bg-slate-800" />
        </div>
 
        {/* Right Side: 3D Viewport */}
        <div 
          style={{ width: showAiPanel && computedElevationData ? `${midWidth}%` : `${(midWidth / (leftWidth + midWidth)) * 100}%` }}
          className="h-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] relative bg-[#0b0e17] shadow-inner shrink-0"
        >
          <Mesh3D
            data={computedElevationData}
            showWireframe={showWireframe}
            exaggeration={exaggeration}
            colorMode={colorMode}
            balanceZ={computedElevationData ? computedElevationData.balance_elevation_m : 0}
            onBalanceZChange={setOverrideBalanceZ}
          />
          {/* Custom label */}
          {computedElevationData && (
            <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
              <div className="glass-card-subtle px-2.5 py-1 flex items-center gap-1.5 bg-slate-950/70 backdrop-blur-md border border-white/5 shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-[10px] font-black text-slate-300 tracking-wider uppercase font-sans">
                  3D Viewport
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Divider 2 */}
        {showAiPanel && computedElevationData && (
          <div
            onMouseDown={() => startResize("divider2")}
            className={`w-2 hover:bg-cyan-500/20 active:bg-cyan-500/40 cursor-col-resize transition-colors duration-150 self-stretch flex items-center justify-center relative z-25 shrink-0 ${
              activeResizer === "divider2" ? "bg-cyan-500/30" : "bg-transparent"
            }`}
            title="Drag to resize AI panel"
          >
            <div className="w-[2px] h-6 rounded bg-slate-800" />
          </div>
        )}
 
        {/* Far Right: AI Feasibility Assistant */}
        {showAiPanel && computedElevationData && (
          <div 
            style={{ width: `${100 - leftWidth - midWidth}%` }}
            className="h-full rounded-2xl border border-[var(--border-subtle)] bg-[#0d111d] flex flex-col overflow-hidden shadow-2xl relative shrink-0"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-md">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white leading-none">Feasibility AI</h3>
                  <span className="text-[8px] text-[var(--text-muted)] font-mono">amazon.nova-pro-v1:0</span>
                </div>
              </div>
              <button
                onClick={() => setShowAiPanel(false)}
                className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Disclaimer Banner */}
            <div className="mx-3 mt-3 px-3 py-2 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-[9px] text-yellow-500/70 leading-relaxed font-sans shrink-0">
              <strong>⚠️ Sat-estimate only:</strong> Data is smoothed point-sampling. Not a licensed survey or geotechnical report. Verify before financial/construction commitment.
            </div>

            {/* Chat Messages list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3.5 min-h-0">
              {aiLoading && aiMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-[11px] font-medium tracking-wide">Analyzing terrain feasibility...</span>
                </div>
              ) : (
                <>
                  {aiMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col gap-1 max-w-[90%] ${
                        msg.role === "user" ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        {msg.role === "user" ? "Developer" : "Feasibility AI"}
                      </div>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-[11px] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                            : "glass-card text-slate-300 rounded-tl-none border border-slate-800/40"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          <div className="prose prose-invert max-w-none">
                            {parseMarkdown(msg.text)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex gap-2 items-center text-[10px] text-slate-500 font-mono pl-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                      <span>Thinking...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendQuestion}
              className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] shrink-0"
            >
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder={aiLoading ? "Thinking..." : "Ask about grading, slopes, risks..."}
                  disabled={aiLoading}
                  className="w-full pr-10 pl-3.5 py-2 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim() || aiLoading}
                  className="absolute right-1.5 p-1.5 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/10 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Native React Markdown Parser with Table Support ───────────────────────
function parseMarkdown(text: string) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  
  let currentTable: string[][] = [];
  let tableKey = 0;
  
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let listKey = 0;

  const flushTable = () => {
    if (currentTable.length === 0) return;
    
    let rowsToRender = [...currentTable];
    let hasHeader = false;
    
    if (
      rowsToRender.length > 1 &&
      rowsToRender[1].every((cell) => cell.trim().startsWith("-") || cell.trim() === "")
    ) {
      hasHeader = true;
      rowsToRender.splice(1, 1); // remove separator row
    }
    
    const headers = hasHeader ? rowsToRender.shift() : null;
    
    blocks.push(
      <div key={`table-${tableKey++}`} className="overflow-x-auto my-3.5 border border-slate-800/60 rounded-xl bg-slate-950/40">
        <table className="min-w-full text-[11px] text-slate-300 border-collapse">
          {headers && (
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-black text-cyan-400 uppercase tracking-wider text-[10px]">
                    {parseInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rowsToRender.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-800/40 hover:bg-slate-900/20 last:border-b-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 font-mono text-[10.5px]">
                    {parseInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    currentTable = [];
  };

  const flushList = () => {
    if (!currentList) return;
    const ListTag = currentList.type;
    blocks.push(
      <ListTag key={`list-${listKey++}`} className="pl-5 my-2.5 list-disc text-[11px] text-slate-300 space-y-1 font-medium">
        {currentList.items.map((item, idx) => (
          <li key={idx}>{parseInlineMarkdown(item)}</li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Table line
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      currentTable.push(cells);
      continue;
    } else {
      flushTable();
    }
    
    // Unordered List line
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.substring(2);
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [content] };
      } else {
        currentList.items.push(content);
      }
      continue;
    }
    
    // Ordered List line
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const content = olMatch[2];
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [content] };
      } else {
        currentList.items.push(content);
      }
      continue;
    }
    
    flushList();
    
    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      blocks.push(<hr key={`hr-${i}`} className="border-white/5 my-3.5" />);
      continue;
    }
    
    // Headings
    if (trimmed.startsWith("# ")) {
      blocks.push(
        <h2 key={`h1-${i}`} className="text-sm font-black text-white mt-5 mb-2 border-b border-white/5 pb-1">
          {parseInlineMarkdown(trimmed.substring(2))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h3 key={`h2-${i}`} className="text-[13px] font-black text-indigo-400 mt-4.5 mb-2">
          {parseInlineMarkdown(trimmed.substring(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h4 key={`h3-${i}`} className="text-xs font-black text-cyan-400 mt-3.5 mb-1.5">
          {parseInlineMarkdown(trimmed.substring(4))}
        </h4>
      );
      continue;
    }
    
    // Empty line
    if (!trimmed) {
      blocks.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }
    
    // Paragraph
    blocks.push(
      <p key={`p-${i}`} className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
        {parseInlineMarkdown(line)}
      </p>
    );
  }
  
  flushTable();
  flushList();
  
  return blocks;
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split("**");
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="text-white font-bold">{parseInlineCode(part)}</strong>;
    }
    return parseInlineCode(part);
  });
}

function parseInlineCode(text: string): React.ReactNode {
  const parts = text.split("`");
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-slate-950/80 text-cyan-400 font-mono text-[9.5px] border border-white/5 font-bold">
          {part}
        </code>
      );
    }
    return part;
  });
}
