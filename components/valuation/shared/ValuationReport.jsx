"use client";

import { useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FileText, Download, ChevronLeft, ChevronRight, Building2,
  TrendingUp, BarChart3, MapPin, Shield, Target, Award,
  Calculator, Layers, CheckCircle, AlertCircle,
  Printer, Star, Zap, Clock
} from "lucide-react";

// ── Utility: currency formatter ─────────────────────────────────────────────
function buildFormatter(currencyCode) {
  const code = (currencyCode || "INR").toUpperCase().trim();
  const locale = code === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    });
  } catch {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  }
}

function fmtCurrency(val, formatter) {
  if (val == null || isNaN(Number(val))) return "—";
  return formatter.format(Number(val));
}

function fmtPct(val) {
  if (val == null) return "—";
  const n = Number(val) * 100;
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

function getAmenitiesCount(amenitySummary) {
  if (!amenitySummary) return "—";
  if (typeof amenitySummary === "object") {
    if (amenitySummary.total != null) return amenitySummary.total;
    if (amenitySummary.counts) {
      return Object.values(amenitySummary.counts).reduce((a, b) => a + Number(b || 0), 0);
    }
  }
  if (typeof amenitySummary === "string") {
    const match = amenitySummary.match(/(\d+)\s+amenities/i);
    if (match) return Number(match[1]);
    const counts = amenitySummary.match(/:\s*(\d+)/g);
    if (counts) {
      return counts.reduce((acc, val) => acc + Number(val.replace(/[^\d]/g, "")), 0);
    }
    const parts = amenitySummary.split(",").map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts.length;
    }
  }
}

function haversineDistanceKM(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Slide indicator dots ─────────────────────────────────────────────────────
function SlideDots({ total, current, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`transition-all duration-300 rounded-full ${
            i === current
              ? "w-6 h-2 bg-accent shadow-[0_0_8px_rgba(34,211,238,0.6)]"
              : "w-2 h-2 bg-white/20 hover:bg-white/40"
          }`}
        />
      ))}
    </div>
  );
}

// Set up default Leaflet icon paths
if (typeof window !== 'undefined' && L && L.Icon) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

const subjectMarkerIcon = typeof window !== 'undefined' && L ? L.divIcon({
  className: "",
  html: `<div style="
      width: 24px;
      height: 24px;
      background: #f43f5e;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(244,63,94,0.3), 0 0 16px rgba(244,63,94,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: sans-serif;
      font-size: 11px;
      font-weight: 900;
  ">S</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -16],
}) : null;

const getCompMarkerIcon = (number) => {
  if (typeof window === 'undefined' || !L) return null;
  return L.divIcon({
    className: "",
    html: `<div style="
        width: 22px;
        height: 22px;
        background: #22d3ee;
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 3px rgba(34,211,238,0.25), 0 0 12px rgba(34,211,238,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0f172a;
        font-family: sans-serif;
        font-size: 10px;
        font-weight: 900;
    ">${number}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
};

// ── SLIDE 7: Property Map Slide (renders subject and comparable projects) ──
function SlideReportMap({ valuationResult }) {
  const { subjectData, factorialAnalysis } = valuationResult;
  const table = factorialAnalysis?.comparable_factoring_table || [];

  const subjectLat = subjectData?.lat ? Number(subjectData.lat) : null;
  const subjectLng = subjectData?.lng ? Number(subjectData.lng) : null;
  const subjectName = subjectData?.project_name || "Subject Property";

  if (!subjectLat || !subjectLng) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim text-[11px]">
        No coordinates available for subject property.
      </div>
    );
  }

  // Find all projects with valid coordinates and compute index and distance
  const markers = [
    {
      name: subjectName,
      lat: subjectLat,
      lng: subjectLng,
      isSubject: true,
      role: "SUBJECT",
      rate: factorialAnalysis?.subject_final_rate || 0,
      distance: 0,
      index: "S"
    },
    ...table.filter(row => row.role !== "SUBJECT" && row.lat && row.lng).map((row, idx) => {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      const distance = haversineDistanceKM(subjectLat, subjectLng, lat, lng);
      return {
        name: row.project_name,
        lat,
        lng,
        isSubject: false,
        role: "COMPARABLE",
        rate: row.avg_rate,
        factor: row.total_factor,
        factoredRate: row.factored_rate,
        distance,
        index: idx + 1
      };
    })
  ];

  const currencyCode = subjectData?.currency || "INR";
  const formatter = buildFormatter(currencyCode);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-3 shrink-0">
        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-accent/80">Geospatial Distribution</p>
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-primary">Subject & Comparable Properties Map</h3>
        <p className="text-[9px] text-text-dim mt-0.5 font-semibold">Showing subject property and selected comparable projects in the micro-market</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Map Container */}
        <div className="flex-[2] min-h-[250px] rounded-xl overflow-hidden border border-border-soft relative z-0">
          <MapContainer
            center={[subjectLat, subjectLng]}
            zoom={14}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {markers.map((m, idx) => (
              <Marker
                key={idx}
                position={[m.lat, m.lng]}
                icon={m.isSubject ? subjectMarkerIcon : getCompMarkerIcon(m.index)}
              >
                <Tooltip direction="top" offset={[0, -15]} permanent={false}>
                  <span className="font-sans text-[10px] font-bold text-slate-900 bg-white px-1 py-0.5 rounded shadow border border-slate-200">
                    {m.isSubject ? "S" : m.index}: {m.name} {m.isSubject ? "" : `(${m.distance?.toFixed(2)} km)`}
                  </span>
                </Tooltip>
                <Popup>
                  <div className="p-1 text-black font-sans text-xs">
                    <div className="font-bold border-b border-gray-200 pb-1 mb-1 flex items-center gap-1.5">
                      {m.isSubject ? (
                        <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded">SUBJECT</span>
                      ) : (
                        <span className="bg-cyan-500 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded">COMP {m.index}</span>
                      )}
                      {m.name}
                    </div>
                    <div className="space-y-0.5">
                      <div>Rate: <span className="font-mono font-bold">{fmtCurrency(m.rate, formatter)}/sqft</span></div>
                      {!m.isSubject && (
                        <>
                          <div>Distance: <span className="font-bold text-slate-700">{m.distance?.toFixed(2)} km</span></div>
                          {m.factoredRate && (
                            <>
                              <div>Adjusted: <span className="font-mono font-bold text-blue-600">{fmtCurrency(m.factoredRate, formatter)}/sqft</span></div>
                              <div>Adjustment: <span className="font-mono font-bold text-emerald-600">{(m.factor * 100).toFixed(2)}%</span></div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Legend / Properties List */}
        <div className="flex-1 min-h-[150px] lg:min-h-0 flex flex-col border border-border-soft bg-bg-card/40 rounded-xl p-3 overflow-hidden">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-dim mb-2 shrink-0 border-b border-border-soft pb-1">Map Legend & Distances</p>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {markers.map((m, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg border transition-all ${
                  m.isSubject
                    ? "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10"
                    : "bg-bg-input/40 border-border-soft hover:bg-bg-input/70"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black shrink-0 ${
                      m.isSubject
                        ? "bg-rose-500 text-white"
                        : "bg-accent text-bg-deep"
                    }`}
                  >
                    {m.index}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[9px] font-bold truncate ${m.isSubject ? "text-rose-400" : "text-text-secondary"}`}>
                      {m.name}
                    </p>
                    <div className="flex items-center justify-between text-[8px] text-text-dim mt-0.5 font-semibold">
                      <span>{m.isSubject ? "Subject Location" : `${m.distance?.toFixed(2)} km away`}</span>
                      <span className="font-mono">{fmtCurrency(m.rate, formatter)}/sqft</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SLIDE 1: Valuation Certificate Cover ────────────────────────────────────
function SlideCover({ valuationResult }) {
  const { subjectData, factorialAnalysis, costCalculation, type, timestamp } = valuationResult;
  const currencyCode = subjectData?.currency || "INR";
  const formatter = buildFormatter(currencyCode);

  const finalRate = factorialAnalysis?.subject_final_rate || 0;
  const area = Number(
    subjectData?.salable_area_sqft ||
    subjectData?.builtup_area_sqft ||
    subjectData?.carpet_area_sqft ||
    subjectData?.plot_area_sqft || 0
  );
  const marketValue = type === "cost"
    ? (costCalculation?.result?.cost_value || costCalculation?.depreciated_property_value || 0)
    : (finalRate * area);

  const confidence = factorialAnalysis?.confidence || "Medium";
  const methodology = factorialAnalysis?.methodology || (type === "cost" ? "Cost Approach" : "Market Comparison Approach");
  const dateStr = timestamp ? new Date(timestamp).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric"
  }) : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar">
      {/* Certificate Header */}
      <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-bg-card to-accent-purple/10 p-6 mb-4 shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(167,139,250,0.1),transparent_60%)]" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 border border-accent/30">
                <Award className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-accent/80">Sigmavalue AI</p>
                <h1 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-primary">
                  Valuation Certificate
                </h1>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${
              confidence === "High" ? "border-green-500/30 bg-green-500/10 text-green-400" :
              confidence === "Low" ? "border-red-500/30 bg-red-500/10 text-red-400" :
              "border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "currentColor" }} />
              {confidence} Confidence
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-text-dim mb-0.5">Property</p>
              <p className="text-[13px] font-black text-text-primary leading-tight">
                {subjectData?.project_name || "Subject Property"}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-text-dim mb-0.5">Location</p>
              <p className="text-[11px] font-bold text-text-secondary leading-tight">
                {subjectData?.location_name || "—"}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-text-dim mb-0.5">Date of Valuation</p>
              <p className="text-[11px] font-bold text-text-secondary">{dateStr}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-text-dim mb-0.5">Methodology</p>
              <p className="text-[11px] font-bold text-accent-light leading-tight">{methodology}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Value Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-r from-bg-card to-bg-deep p-5 mb-4 shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/[0.04] to-transparent" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-green-400/80 mb-1">
              {type === "cost" ? "Cost Approach Value" : "Market Valuation"}
            </p>
            <p className="font-mono text-3xl font-black text-text-primary drop-shadow-[0_0_16px_rgba(34,197,94,0.4)]">
              {fmtCurrency(marketValue, formatter)}
            </p>
            {area > 0 && type !== "cost" && (
              <p className="text-[9px] text-text-dim mt-1 font-semibold uppercase tracking-wider">
                {fmtCurrency(finalRate, formatter)}/sqft × {area.toLocaleString()} sqft
              </p>
            )}
          </div>
          {factorialAnalysis?.subject_rate_range && (
            <div className="text-right">
              <p className="text-[8px] font-bold uppercase tracking-widest text-text-dim mb-1">Rate Range</p>
              <p className="text-[11px] font-black text-text-primary font-mono">
                {fmtCurrency(factorialAnalysis.subject_rate_range.low, formatter)}
                <span className="text-text-dim mx-1">—</span>
                {fmtCurrency(factorialAnalysis.subject_rate_range.high, formatter)}
              </p>
              <p className="text-[8px] text-text-dim uppercase tracking-wider">per sqft</p>
            </div>
          )}
        </div>
      </div>

      {/* Property Summary Grid */}
      <div className="rounded-2xl border border-border-soft bg-bg-card/80 p-4 shrink-0">
        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-text-dim mb-3">Subject Property Details</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            ["Type", subjectData?.property_type?.replace(/_/g, " ").toUpperCase()],
            ["Country", subjectData?.country],
            ["Carpet Area", subjectData?.carpet_area_sqft ? `${Number(subjectData.carpet_area_sqft).toLocaleString()} sqft` : null],
            ["Salable Area", subjectData?.salable_area_sqft ? `${Number(subjectData.salable_area_sqft).toLocaleString()} sqft` : null],
            ["Built-up Area", subjectData?.builtup_area_sqft ? `${Number(subjectData.builtup_area_sqft).toLocaleString()} sqft` : null],
            ["Plot Area", subjectData?.plot_area_sqft ? `${Number(subjectData.plot_area_sqft).toLocaleString()} sqft` : null],
            ["Age", subjectData?.age_years != null ? `${subjectData.age_years} years` : null],
            ["Configuration", subjectData?.configuration || subjectData?.unit_configuration],
            ["Approach", subjectData?.recommended_approach?.toUpperCase()],
            ["Coordinates", subjectData?.lat ? `${Number(subjectData.lat).toFixed(4)}, ${Number(subjectData.lng || 0).toFixed(4)}` : null],
          ].filter(([_, v]) => v).map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-2 py-1 border-b border-border-dim/40 last:border-0">
              <span className="text-[9px] text-text-dim uppercase tracking-wide font-semibold shrink-0">{label}</span>
              <span className="text-[9px] text-text-secondary font-bold text-right leading-snug">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SLIDE 2: Comparable Factoring Grid ─────────────────────────────────────
function SlideComparableGrid({ valuationResult }) {
  const { factorialAnalysis, subjectData } = valuationResult;
  const currencyCode = subjectData?.currency || "INR";
  const formatter = buildFormatter(currencyCode);

  const table = factorialAnalysis?.comparable_factoring_table || [];
  const subjectRow = table.find(r => r.role === "SUBJECT");
  const compRows = table.filter(r => r.role !== "SUBJECT");

  if (table.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim text-[11px]">
        No comparable factoring data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-3 shrink-0">
        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-accent/80">Stage 5 · LLM Factoring Engine</p>
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-primary">Per-Comparable Adjustment Grid</h3>
        <p className="text-[9px] text-text-dim mt-0.5">Each spatial factor capped at ±5% · Total adjustment capped at ±20%</p>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar rounded-xl border border-border-soft">
        <table className="w-full text-left text-[9px] min-w-[600px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-bg-input border-b border-border-soft text-text-dim uppercase tracking-widest font-black text-[7px]">
              <th className="px-3 py-2.5 min-w-[130px]">Project</th>
              <th className="px-2 py-2.5 text-center">Road</th>
              <th className="px-2 py-2.5 text-center">Amenity</th>
              <th className="px-2 py-2.5 text-center">Density</th>
              <th className="px-2 py-2.5 text-center">CBD km</th>
              <th className="px-2 py-2.5 text-right">Avg Rate</th>
              <th className="px-2 py-2.5 text-center">Factor</th>
              <th className="px-2 py-2.5 text-right">Factored Rate</th>
            </tr>
          </thead>
          <tbody>
            {subjectRow && (
              <tr className="bg-accent/10 border-b border-accent/20">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-text-primary text-[9px]">{subjectRow.project_name}</span>
                    <span className="text-[6px] px-1 py-0.5 rounded bg-accent text-bg-deep font-black uppercase">Subject</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center font-mono font-bold text-accent text-[9px]">{subjectRow.road_type || "—"}</td>
                <td className="px-2 py-2.5 text-center text-[9px] text-text-dim">
                  {getAmenitiesCount(subjectRow.amenity_summary)}
                </td>
                <td className="px-2 py-2.5 text-center font-mono text-accent text-[9px]">
                  {subjectRow.builtup_density_score != null ? Number(subjectRow.builtup_density_score).toFixed(1) : "—"}
                </td>
                <td className="px-2 py-2.5 text-center font-mono text-[9px] text-text-dim">
                  {subjectRow.cbd_nearest_km != null ? `${Number(subjectRow.cbd_nearest_km).toFixed(1)}` : "—"}
                </td>
                <td className="px-2 py-2.5 text-right font-mono font-bold text-green-400 text-[9px]">
                  {fmtCurrency(subjectRow.avg_rate, formatter)}
                </td>
                <td className="px-2 py-2.5 text-center text-[8px] font-black text-accent/50 uppercase">Base</td>
                <td className="px-2 py-2.5 text-right font-mono font-black text-green-400 text-[10px]">
                  {fmtCurrency(subjectRow.avg_rate, formatter)}
                </td>
              </tr>
            )}
            {compRows.map((row, i) => {
              const totalF = row.total_factor != null ? Number(row.total_factor) : null;
              const isPos = totalF != null && totalF > 0;
              const isNeg = totalF != null && totalF < 0;
              return (
                <tr key={i} className="border-b border-border-dim hover:bg-bg-input/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="font-bold text-text-secondary text-[9px]">{row.project_name}</span>
                  </td>
                  <td className="px-2 py-2.5 text-center font-mono text-text-dim text-[9px]">{row.road_type || "—"}</td>
                  <td className="px-2 py-2.5 text-center text-[9px] text-text-dim">
                    {getAmenitiesCount(row.amenity_summary)}
                  </td>
                  <td className="px-2 py-2.5 text-center font-mono text-text-dim text-[9px]">
                    {row.builtup_density_score != null ? Number(row.builtup_density_score).toFixed(1) : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-center font-mono text-[9px] text-text-dim">
                    {row.cbd_nearest_km != null ? `${Number(row.cbd_nearest_km).toFixed(1)}` : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-text-secondary text-[9px]">
                    {fmtCurrency(row.avg_rate, formatter)}
                  </td>
                  <td className={`px-2 py-2.5 text-center font-mono font-black text-[10px] ${isPos ? "text-green-400" : isNeg ? "text-red-400" : "text-text-dim"}`}>
                    {totalF != null ? (totalF >= 0 ? "+" : "") + (totalF * 100).toFixed(2) + "%" : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono font-black text-[10px] text-blue-400">
                    {fmtCurrency(row.factored_rate, formatter)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Factor breakdown legend */}
      {compRows.some(r => r.factor_reasoning) && (
        <div className="mt-3 space-y-2 shrink-0 overflow-y-auto max-h-[180px] custom-scrollbar">
          {compRows.filter(r => r.factor_reasoning).slice(0, 3).map((row, i) => (
            <div key={i} className="rounded-xl border border-border-soft bg-bg-input/40 px-3 py-2">
              <p className="text-[8px] font-black uppercase tracking-wider text-text-dim mb-1">{row.project_name}</p>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {[["Road", row.factor_road], ["Amenity", row.factor_amenity], ["Density", row.factor_density], ["CBD", row.factor_cbd], ["Total", row.total_factor]].map(([label, val]) => (
                  val != null && (
                    <span key={label} className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${
                      Number(val) > 0 ? "text-green-400 border-green-500/20 bg-green-500/5" :
                      Number(val) < 0 ? "text-red-400 border-red-500/20 bg-red-500/5" :
                      "text-text-dim border-border-soft bg-bg-deep/30"
                    }`}>
                      {label}: {Number(val) >= 0 ? "+" : ""}{(Number(val) * 100).toFixed(2)}%
                    </span>
                  )
                ))}
              </div>
              <p className="text-[9px] text-text-secondary leading-relaxed line-clamp-2">{row.factor_reasoning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SLIDE 3: Blending & Final Rate Derivation ───────────────────────────────
function SlideBlending({ valuationResult }) {
  const { factorialAnalysis, subjectData } = valuationResult;
  const currencyCode = subjectData?.currency || "INR";
  const formatter = buildFormatter(currencyCode);
  const blending = factorialAnalysis?.blending || {};
  const details = factorialAnalysis?.valuation_details || {};

  const finalRate = factorialAnalysis?.subject_final_rate || 0;
  const area = Number(
    subjectData?.salable_area_sqft ||
    subjectData?.builtup_area_sqft ||
    subjectData?.carpet_area_sqft ||
    subjectData?.plot_area_sqft || 0
  );

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar space-y-4">
      <div className="shrink-0">
        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-accent/80">Stage 5 · Rate Reconciliation</p>
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-primary">Blending & Final Rate Derivation</h3>
      </div>

      {/* Confidence-weighted blending table */}
      {Object.keys(blending).length > 0 && (
        <div className="rounded-xl border border-border-soft bg-bg-card/60 overflow-hidden shrink-0">
          <div className="bg-bg-input px-4 py-2.5 border-b border-border-soft">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-dim">Confidence-Weighted Blending</p>
          </div>
          <div className="p-3 space-y-2">
            {Object.entries(blending).map(([project, data]) => {
              const weight = Number(data?.weight || 0) * 100;
              const rate = data?.factored_rate;
              const conf = data?.confidence_score;
              return (
                <div key={project} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-text-secondary truncate">{project}</p>
                    {conf != null && (
                      <p className="text-[8px] text-text-dim">Confidence: {(Number(conf) * 100).toFixed(0)}%</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-20 h-1.5 rounded-full bg-bg-deep overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-purple transition-all duration-500"
                        style={{ width: `${Math.min(weight, 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-black font-mono text-accent w-10 text-right">{weight.toFixed(1)}%</span>
                    <span className="text-[9px] font-mono text-text-secondary w-24 text-right">{fmtCurrency(rate, formatter)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spatial factor impact summary */}
      {details.attribute_weights && (
        <div className="rounded-xl border border-border-soft bg-bg-card/60 shrink-0">
          <div className="bg-bg-input px-4 py-2.5 border-b border-border-soft">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-dim">Spatial Factor Weights & Net Impact</p>
          </div>
          <div className="p-3 grid grid-cols-2 gap-3">
            {Object.entries(details.attribute_weights || {}).map(([factor, weight]) => {
              const impact = details.net_impacts?.[factor];
              const formatted = factor.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
              const isPos = impact != null && Number(impact) > 0;
              const isNeg = impact != null && Number(impact) < 0;
              return (
                <div key={factor} className="flex flex-col gap-1 p-2.5 rounded-lg border border-border-dim bg-bg-deep/30">
                  <p className="text-[8px] font-bold uppercase tracking-wide text-text-dim">{formatted}</p>
                  <p className="text-[10px] font-black font-mono text-text-primary">
                    {(Number(weight || 0) * 100).toFixed(0)}% weight
                  </p>
                  {impact != null && (
                    <p className={`text-[10px] font-black font-mono ${isPos ? "text-green-400" : isNeg ? "text-red-400" : "text-text-dim"}`}>
                      {isPos ? "+" : ""}{(Number(impact) * 100).toFixed(2)}% impact
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final rate summary */}
      <div className="relative overflow-hidden rounded-xl border border-green-500/30 bg-gradient-to-r from-bg-card to-bg-deep p-4 shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/[0.04] to-transparent" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-green-400/80 mb-1">Derived Rate</p>
            <p className="font-mono text-2xl font-black text-text-primary">
              {fmtCurrency(finalRate, formatter)}
            </p>
            <p className="text-[8px] text-text-dim uppercase tracking-wider">per sqft</p>
          </div>
          {area > 0 && (
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-accent/80 mb-1">Final Market Value</p>
              <p className="font-mono text-2xl font-black text-accent drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                {fmtCurrency(finalRate * area, formatter)}
              </p>
              <p className="text-[8px] text-text-dim uppercase tracking-wider">{area.toLocaleString()} sqft</p>
            </div>
          )}
        </div>
      </div>

      {/* Reconciliation note */}
      {factorialAnalysis?.reconciliation_note && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 shrink-0">
          <p className="text-[8px] font-black uppercase tracking-widest text-amber-400/70 mb-1">Reconciliation Note</p>
          <p className="text-[9px] text-text-secondary leading-relaxed">{factorialAnalysis.reconciliation_note}</p>
        </div>
      )}
    </div>
  );
}

// ── SLIDE 4: AI Reasoning & Audit ──────────────────────────────────────────
function SlideReasoning({ valuationResult }) {
  const { factorialAnalysis } = valuationResult;
  const audit = factorialAnalysis?.reasoning_audit || {};
  const report = factorialAnalysis?.raw_markdown_report;
  const projectReports = factorialAnalysis?.project_reports || [];

  if (!audit.final_reflection && !report && projectReports.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim text-[11px]">
        No reasoning data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar space-y-4">
      <div className="shrink-0">
        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-accent-purple/80">Stage 5 · LLM Reasoning</p>
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-primary">AI Agent Reasoning & Audit</h3>
      </div>

      {/* Reasoning stages */}
      {[
        ["Stage 1 — Scoring Analysis", audit.stage_1_scoring_thought, "text-blue-400", "border-blue-500/20 bg-blue-500/5"],
        ["Stage 2 — Adjustment Logic", audit.stage_2_adjustment_thought, "text-purple-400", "border-purple-500/20 bg-purple-500/5"],
        ["Final Reflection", audit.final_reflection, "text-green-400", "border-green-500/20 bg-green-500/5"],
        ["Key Value Drivers", audit.key_drivers, "text-amber-400", "border-amber-500/20 bg-amber-500/5"],
        ["Uncertainties", audit.uncertainties, "text-red-400", "border-red-500/20 bg-red-500/5"],
      ].filter(([, v]) => v).map(([label, text, labelColor, borderBg]) => (
        <div key={label} className={`rounded-xl border ${borderBg} px-4 py-3 shrink-0`}>
          <p className={`text-[8px] font-black uppercase tracking-widest mb-1.5 ${labelColor}`}>{label}</p>
          <p className="text-[9px] text-text-secondary leading-relaxed">{text}</p>
        </div>
      ))}

      {/* Per-project reports if available */}
      {projectReports.length > 0 && (
        <div className="shrink-0">
          <p className="text-[8px] font-black uppercase tracking-[0.25em] text-text-dim mb-2">Per-Comparable Scoring Reports</p>
          <div className="space-y-2">
            {projectReports.slice(0, 4).map((r, i) => (
              <div key={i} className="rounded-xl border border-border-soft bg-bg-input/40 px-3 py-2">
                <p className="text-[9px] font-bold text-text-secondary mb-1">{r.project_name}</p>
                <p className="text-[9px] text-text-dim leading-relaxed line-clamp-3">{r.report || r.reasoning || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SLIDE 5: Cost Approach (only when approach = cost) ──────────────────────
function SlideCostApproach({ valuationResult }) {
  const { costCalculation, subjectData, factorialAnalysis } = valuationResult;
  const currencyCode = subjectData?.currency || "INR";
  const formatter = buildFormatter(currencyCode);

  if (!costCalculation) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim text-[11px]">
        Cost Approach calculation not yet available.
      </div>
    );
  }

  const inputs = costCalculation.inputs || {};
  const calcs = costCalculation.calculations || {};
  const result = costCalculation.result || {};
  const audit = costCalculation.formula_audit || {};

  const steps = [
    {
      step: 1, label: "Land Component Valuation", color: "text-sky-400", bg: "border-sky-500/20 bg-sky-500/5",
      value: fmtCurrency(calcs.land_value, formatter),
      formula: audit.step_1 || `Land Value = ${fmtCurrency(inputs.derived_plot_rate_per_sqft, formatter)}/sqft × ${inputs.plot_area_sqft} sqft`,
    },
    {
      step: 2, label: "Replacement Construction Cost", color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/5",
      value: fmtCurrency(calcs.construction_cost, formatter),
      formula: audit.step_2 || `Construction = ${fmtCurrency(inputs.construction_rate_per_sqft, formatter)}/sqft × ${inputs.builtup_area_sqft} sqft`,
    },
    {
      step: 3, label: "Depreciation Rate", color: "text-red-400", bg: "border-red-500/20 bg-red-500/5",
      value: `${calcs.depreciation_rate_pct || 0}%`,
      formula: audit.step_3 || `Age ${inputs.age_of_property}yr / Life ${inputs.total_life_of_building}yr`,
    },
    {
      step: 4, label: "Depreciated Building Value", color: "text-orange-400", bg: "border-orange-500/20 bg-orange-500/5",
      value: fmtCurrency(calcs.depreciated_building_value, formatter),
      formula: audit.step_4 || `Construction Cost × (1 − Depreciation%)`,
    },
    {
      step: 5, label: "Final Cost Value", color: "text-green-400", bg: "border-green-500/20 bg-green-500/5",
      value: fmtCurrency(result.cost_value, formatter),
      formula: audit.step_5 || `Land Value + Depreciated Building Value`,
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar space-y-3">
      <div className="shrink-0">
        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-green-400/80">Traditional Cost Approach</p>
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-primary">Depreciated Replacement Cost Method</h3>
        <p className="text-[9px] text-text-dim mt-0.5">Land Component + Depreciated Structure · Audit-Backed</p>
      </div>

      {/* Input parameters */}
      <div className="rounded-xl border border-border-soft bg-bg-card/60 p-3 shrink-0">
        <p className="text-[8px] font-black uppercase tracking-widest text-text-dim mb-2">Appraisal Inputs</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            ["Plot Rate/sqft", fmtCurrency(inputs.derived_plot_rate_per_sqft, formatter)],
            ["Plot Area", `${inputs.plot_area_sqft?.toLocaleString()} sqft`],
            ["Built-up Area", `${inputs.builtup_area_sqft?.toLocaleString()} sqft`],
            ["Construction Rate/sqft", fmtCurrency(inputs.construction_rate_per_sqft, formatter)],
            ["Age of Property", `${inputs.age_of_property} years`],
            ["Economic Life", `${inputs.total_life_of_building} years`],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2 py-1 border-b border-border-dim/30 last:border-0">
              <span className="text-[8px] text-text-dim">{label}</span>
              <span className="text-[9px] font-bold text-text-primary font-mono">{value || "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calculation steps */}
      <div className="space-y-2 shrink-0">
        {steps.map(({ step, label, color, bg, value, formula }) => (
          <div key={step} className={`rounded-xl border ${bg} p-3`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-black shrink-0 ${bg} ${color}`} style={{ borderColor: "currentColor" }}>
                  {step}
                </span>
                <p className="text-[8px] font-black uppercase tracking-wide text-text-dim">{label}</p>
              </div>
              <p className={`text-[13px] font-black font-mono ${color} shrink-0`}>{value}</p>
            </div>
            <p className="text-[8px] text-text-dim mt-1 pl-7 leading-relaxed">{formula}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SLIDE 6: Factorial Rate Table (Comparable Rate Grid) ───────────────────
function SlideFactorialTable({ valuationResult }) {
  const { factorialData, subjectData } = valuationResult;
  const currencyCode = subjectData?.currency || "INR";
  const formatter = buildFormatter(currencyCode);
  const table = factorialData?.table || [];

  if (table.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim text-[11px]">
        No comparable rate table data available.
      </div>
    );
  }

  const areaUnit = factorialData?.area_unit || "sqft";
  const currency = factorialData?.currency || "INR";
  const totalValid = factorialData?.total_valid || 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-3 shrink-0">
        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-accent/80">Stage 4 · Rate Grid</p>
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-primary">Comparable Rate Table</h3>
        <p className="text-[9px] text-text-dim mt-0.5">{table.length} comparable projects · {totalValid} valid listings analyzed</p>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar rounded-xl border border-border-soft">
        <table className="w-full text-left text-[9px] min-w-[400px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-bg-input border-b border-border-soft text-text-dim uppercase tracking-widest font-black text-[7px]">
              <th className="px-3 py-2.5 min-w-[130px]">Project</th>
              <th className="px-2 py-2.5">Location</th>
              <th className="px-2 py-2.5 text-center">Listings</th>
              <th className="px-2 py-2.5 text-right">Avg Rate</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={i} className={`border-b border-border-dim hover:bg-bg-input/50 transition-colors ${row.is_subject ? "bg-accent/5" : ""}`}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-text-primary text-[9px]">{row.project_name}</span>
                    {row.is_subject && (
                      <span className="text-[6px] px-1 py-0.5 rounded bg-accent text-bg-deep font-black uppercase">S</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-text-dim text-[8px]">{row.location || "—"}</td>
                <td className="px-2 py-2.5 text-center font-mono text-text-secondary text-[9px]">{row.listing_count || 0}</td>
                <td className="px-2 py-2.5 text-right font-mono font-black text-[10px] text-green-400">
                  {row.avg_rate != null ? fmtCurrency(row.avg_rate, formatter) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PDF Download using browser print ────────────────────────────────────────
function downloadPDF(valuationResult) {
  const { subjectData, factorialAnalysis, costCalculation, type } = valuationResult;
  
  const subjectLat = subjectData?.lat ? Number(subjectData.lat) : null;
  const subjectLng = subjectData?.lng ? Number(subjectData.lng) : null;
  const subjectName = subjectData?.project_name || "Subject Property";

  const currencyCode = subjectData?.currency || "INR";
  const formatter = buildFormatter(currencyCode);
  const finalRate = factorialAnalysis?.subject_final_rate || 0;
  const area = Number(subjectData?.salable_area_sqft || subjectData?.builtup_area_sqft || subjectData?.carpet_area_sqft || subjectData?.plot_area_sqft || 0);
  const marketValue = type === "cost"
    ? (costCalculation?.result?.cost_value || 0)
    : (finalRate * area);
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const confidence = factorialAnalysis?.confidence || "Medium";
  const methodology = factorialAnalysis?.methodology || (type === "cost" ? "Cost Approach" : "Market Comparison Approach");

  const table = factorialAnalysis?.comparable_factoring_table || [];
  const subjectRow = table.find(r => r.role === "SUBJECT");
  const compRows = table.filter(r => r.role !== "SUBJECT");

  const costCalcs = costCalculation?.calculations || {};
  const costInputs = costCalculation?.inputs || {};
  const costResult = costCalculation?.result || {};
  const audit = costCalculation?.formula_audit || {};

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Valuation Report - ${subjectData?.project_name || "Subject Property"}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #1e293b; background: white; font-size: 10px; line-height: 1.5; }
  .page { padding: 40px; max-width: 900px; margin: 0 auto; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 20px; border-bottom: 3px solid #0891b2; margin-bottom: 24px; }
  .brand { display: flex; flex-direction: column; gap: 2px; }
  .brand-name { font-size: 18px; font-weight: 900; color: #0891b2; letter-spacing: 0.1em; text-transform: uppercase; }
  .brand-sub { font-size: 9px; color: #64748b; letter-spacing: 0.2em; text-transform: uppercase; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
  .doc-title .date { font-size: 9px; color: #64748b; margin-top: 4px; }
  .cert-no { font-size: 9px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; margin-top: 4px; }

  .section { margin-bottom: 24px; }
  .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
  
  .hero-box { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px solid #16a34a; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
  .hero-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; color: #16a34a; margin-bottom: 4px; }
  .hero-value { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 900; color: #0f172a; }
  .hero-sub { font-size: 9px; color: #64748b; margin-top: 4px; }
  .confidence-badge { padding: 6px 12px; border-radius: 20px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; background: ${confidence === "High" ? "#dcfce7" : confidence === "Low" ? "#fef2f2" : "#fffbeb"}; color: ${confidence === "High" ? "#16a34a" : confidence === "Low" ? "#dc2626" : "#d97706"}; border: 1px solid ${confidence === "High" ? "#86efac" : confidence === "Low" ? "#fca5a5" : "#fcd34d"}; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
  .info-item { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 5px 0; }
  .info-label { font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
  .info-value { font-size: 9px; font-weight: 700; color: #334155; text-align: right; }

  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 16px; }
  th { background: #f8fafc; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 8px; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
  tr.subject-row { background: #eff6ff; }
  tr.subject-row td { font-weight: 700; }
  .pos { color: #16a34a; font-weight: 900; }
  .neg { color: #dc2626; font-weight: 900; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .step-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start; }
  .step-label { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b; margin-bottom: 4px; }
  .step-value { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 900; }
  .step-formula { font-size: 8px; color: #94a3b8; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
  .reasoning-box { background: #f8fafc; border-left: 3px solid #0891b2; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 10px; }
  .reasoning-label { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #0891b2; margin-bottom: 4px; }
  .reasoning-text { font-size: 9px; color: #475569; line-height: 1.6; }
  .disclaimer { font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; line-height: 1.7; }
  .page-break { page-break-before: always; }
  @page {
    size: A4 portrait;
    margin: 15mm;
  }
  @media print {
    body {
      background: white;
      color: #1e293b;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .page {
      padding: 0;
      max-width: 100%;
      width: 100%;
      margin: 0;
    }
    .page-break {
      page-break-before: always;
      margin-top: 0;
    }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-name">Sigmavalue AI</div>
      <div class="brand-sub">Intelligent Property Valuation Platform</div>
      <div class="cert-no">REF: SV-${Date.now().toString(36).toUpperCase()}</div>
    </div>
    <div class="doc-title">
      <h1>Valuation Certificate</h1>
      <div class="date">Date of Valuation: ${dateStr}</div>
    </div>
  </div>

  <!-- Hero Value Block -->
  <div class="hero-box">
    <div>
      <div class="hero-label">${type === "cost" ? "Cost Approach Value" : "Market Valuation"}</div>
      <div class="hero-value">${fmtCurrency(marketValue, formatter)}</div>
      ${area > 0 && type !== "cost" ? `<div class="hero-sub">${fmtCurrency(finalRate, formatter)}/sqft × ${area.toLocaleString()} sqft</div>` : ""}
    </div>
    <div style="text-align:right">
      <div class="confidence-badge">${confidence} Confidence</div>
      <div style="font-size:9px;color:#64748b;margin-top:8px;font-weight:600;">${methodology}</div>
      ${factorialAnalysis?.subject_rate_range ? `<div style="font-size:9px;margin-top:4px;font-family:'JetBrains Mono',monospace;">Range: ${fmtCurrency(factorialAnalysis.subject_rate_range.low, formatter)} — ${fmtCurrency(factorialAnalysis.subject_rate_range.high, formatter)}</div>` : ""}
    </div>
  </div>

  <!-- Section 1: Property Details -->
  <div class="section">
    <div class="section-title">1. Subject Property Details</div>
    <div class="info-grid">
      ${[
        ["Project Name", subjectData?.project_name],
        ["Property Type", subjectData?.property_type?.replace(/_/g, " ")?.toUpperCase()],
        ["Location", subjectData?.location_name],
        ["Country", subjectData?.country],
        ["Configuration", subjectData?.configuration || subjectData?.unit_configuration],
        ["Age", subjectData?.age_years != null ? `${subjectData.age_years} Years` : null],
        ["Carpet Area", subjectData?.carpet_area_sqft ? `${Number(subjectData.carpet_area_sqft).toLocaleString()} sqft` : null],
        ["Salable Area", subjectData?.salable_area_sqft ? `${Number(subjectData.salable_area_sqft).toLocaleString()} sqft` : null],
        ["Built-up Area", subjectData?.builtup_area_sqft ? `${Number(subjectData.builtup_area_sqft).toLocaleString()} sqft` : null],
        ["Plot Area", subjectData?.plot_area_sqft ? `${Number(subjectData.plot_area_sqft).toLocaleString()} sqft` : null],
        ["Approach", subjectData?.recommended_approach?.toUpperCase()],
        ["Coordinates", subjectData?.lat ? `${Number(subjectData.lat).toFixed(5)}, ${Number(subjectData.lng || 0).toFixed(5)}` : null],
      ].filter(([, v]) => v).map(([l, v]) => `<div class="info-item"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
    </div>
  </div>

  <!-- Section 2: Map Visualisation -->
  <div class="section">
    <div class="section-title">2. Property Location & Comparable Distribution Map</div>
    <div id="print-map" style="height: 350px; width: 100%; border: 1px solid #cbd5e1; border-radius: 12px; margin-top: 10px; margin-bottom: 15px;"></div>
    
    <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-bottom: 8px;">Map Legend & Key Details</div>
    
    <div class="map-legend" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9px; line-height: 1.4;">
      <!-- Subject property item -->
      <div style="display: flex; align-items: center; gap: 8px; background: #fff1f2; border: 1px solid #fecdd3; padding: 6px 10px; border-radius: 8px;">
        <span style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; background: #f43f5e; color: white; border-radius: 50%; font-weight: 900; font-size: 9px; font-family: sans-serif;">S</span>
        <div style="flex: 1;">
          <div style="font-weight: 700; color: #9f1239;">[Subject] ${subjectName}</div>
          <div style="color: #e11d48; font-size: 8px;">Subject Property Location</div>
        </div>
      </div>
      <!-- Comparables dynamically generated in HTML template -->
      ${table.filter(row => row.role !== "SUBJECT" && row.lat && row.lng).map((row, idx) => {
        const dist = haversineDistanceKM(subjectLat, subjectLng, Number(row.lat), Number(row.lng));
        return `
        <div style="display: flex; align-items: center; gap: 8px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 6px 10px; border-radius: 8px;">
          <span style="display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; background: #2563eb; color: white; border-radius: 50%; font-weight: 900; font-size: 9px; font-family: sans-serif;">${idx + 1}</span>
          <div style="flex: 1; min-w: 0;">
            <div style="font-weight: 700; color: #1e3a8a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${row.project_name}</div>
            <div style="color: #2563eb; font-size: 8px; display: flex; justify-content: space-between;">
              <span>Distance: ${dist != null ? `${dist.toFixed(2)} km` : "—"}</span>
              <span class="mono" style="font-weight: 700;">Rate: ${row.avg_rate != null ? fmtCurrency(row.avg_rate, formatter) : "—"}/sqft</span>
            </div>
          </div>
        </div>
        `;
      }).join("")}
    </div>
  </div>

  <!-- Section 3: Comparable Factoring Grid -->
  ${compRows.length > 0 ? `
  <div class="section page-break">
    <div class="section-title">3. Comparable Factoring Grid (Per-Unit Spatial Adjustments)</div>
    <table>
      <thead>
        <tr>
          <th>Project</th>
          <th class="text-center">Road</th>
          <th class="text-center">Amenities</th>
          <th class="text-center">Density</th>
          <th class="text-center">CBD km</th>
          <th class="text-right">Avg Rate</th>
          <th class="text-center">Factor</th>
          <th class="text-right">Factored Rate</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRow ? `
        <tr class="subject-row">
          <td>${subjectRow.project_name} <span style="background:#0891b2;color:white;font-size:7px;padding:1px 4px;border-radius:3px;font-weight:900;">SUBJECT</span></td>
          <td class="text-center mono">${subjectRow.road_type || "—"}</td>
          <td class="text-center">${getAmenitiesCount(subjectRow.amenity_summary)}</td>
          <td class="text-center mono">${subjectRow.builtup_density_score != null ? Number(subjectRow.builtup_density_score).toFixed(1) : "—"}</td>
          <td class="text-center">${subjectRow.cbd_nearest_km != null ? Number(subjectRow.cbd_nearest_km).toFixed(1) : "—"}</td>
          <td class="text-right mono">${fmtCurrency(subjectRow.avg_rate, formatter)}</td>
          <td class="text-center" style="color:#0891b2;font-weight:900;">Base</td>
          <td class="text-right mono" style="color:#16a34a;font-weight:900;">${fmtCurrency(subjectRow.avg_rate, formatter)}</td>
        </tr>` : ""}
        ${compRows.map(row => {
          const f = row.total_factor != null ? Number(row.total_factor) : null;
          return `<tr>
            <td>${row.project_name}</td>
            <td class="text-center mono">${row.road_type || "—"}</td>
            <td class="text-center">${getAmenitiesCount(row.amenity_summary)}</td>
            <td class="text-center mono">${row.builtup_density_score != null ? Number(row.builtup_density_score).toFixed(1) : "—"}</td>
            <td class="text-center">${row.cbd_nearest_km != null ? Number(row.cbd_nearest_km).toFixed(1) : "—"}</td>
            <td class="text-right mono">${fmtCurrency(row.avg_rate, formatter)}</td>
            <td class="text-center mono ${f != null && f > 0 ? "pos" : f != null && f < 0 ? "neg" : ""}">${f != null ? (f >= 0 ? "+" : "") + (f * 100).toFixed(2) + "%" : "—"}</td>
            <td class="text-right mono" style="color:#2563eb;font-weight:700;">${fmtCurrency(row.factored_rate, formatter)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    <p style="font-size:8px;color:#94a3b8;">Each spatial factor capped at ±5% · Total adjustment capped at ±20% per comparable</p>
  </div>` : ""}

  <!-- Section 4: Cost Approach Calculation Steps (if cost type) -->
  ${type === "cost" && costCalculation ? `
  <div class="section">
    <div class="section-title">4. Cost Approach — Depreciated Replacement Value Schedule</div>
    ${[
      ["1. Land Component Valuation", fmtCurrency(costCalcs.land_value, formatter), audit.step_1 || `${fmtCurrency(costInputs.derived_plot_rate_per_sqft, formatter)}/sqft × ${costInputs.plot_area_sqft} sqft`, "#0284c7"],
      ["2. Replacement Construction Cost", fmtCurrency(costCalcs.construction_cost, formatter), audit.step_2 || `${fmtCurrency(costInputs.construction_rate_per_sqft, formatter)}/sqft × ${costInputs.builtup_area_sqft} sqft`, "#d97706"],
      ["3. Depreciation Rate", `${costCalcs.depreciation_rate_pct || 0}%`, audit.step_3 || `Age: ${costInputs.age_of_property}yr ÷ Life: ${costInputs.total_life_of_building}yr`, "#dc2626"],
      ["4. Depreciated Building Value", fmtCurrency(costCalcs.depreciated_building_value, formatter), audit.step_4 || "Construction Cost × (1 − Depreciation%)", "#ea580c"],
      ["5. Final Cost Value", fmtCurrency(costResult.cost_value, formatter), audit.step_5 || "Land Value + Depreciated Building Value", "#16a34a"],
    ].map(([label, value, formula, color]) => `
    <div class="step-box">
      <div>
        <div class="step-label">${label}</div>
        <div class="step-formula">${formula}</div>
      </div>
      <div class="step-value" style="color:${color}">${value}</div>
    </div>`).join("")}
  </div>` : ""}

  <!-- Section 5: AI Reasoning -->
  ${factorialAnalysis?.reasoning_audit ? `
  <div class="section">
    <div class="section-title">${type === "cost" ? "5" : "4"}. AI Agent Reasoning & Valuation Rationale</div>
    ${[
      ["Stage 1 — Comparable Scoring Analysis", factorialAnalysis.reasoning_audit.stage_1_scoring_thought],
      ["Stage 2 — Spatial Adjustment Logic", factorialAnalysis.reasoning_audit.stage_2_adjustment_thought],
      ["Final Reflection", factorialAnalysis.reasoning_audit.final_reflection],
      ["Key Value Drivers", factorialAnalysis.reasoning_audit.key_drivers],
      ["Uncertainties & Caveats", factorialAnalysis.reasoning_audit.uncertainties],
    ].filter(([, v]) => v).map(([label, text]) => `
    <div class="reasoning-box">
      <div class="reasoning-label">${label}</div>
      <div class="reasoning-text">${text}</div>
    </div>`).join("")}
    ${factorialAnalysis.reconciliation_note ? `
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-top:12px;">
      <div style="font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;color:#d97706;margin-bottom:4px;">Reconciliation Note</div>
      <div style="font-size:9px;color:#475569;line-height:1.6;">${factorialAnalysis.reconciliation_note}</div>
    </div>` : ""}
  </div>` : ""}

  <!-- Disclaimer -->
  <div class="disclaimer">
    <strong>Disclaimer:</strong> This valuation certificate has been prepared by Sigmavalue AI Pilot using artificial intelligence–driven market analysis, comparable transaction data, and geospatial spatial adjustment algorithms. The valuation is an estimate of market value as of the date of valuation and is subject to the assumptions and limiting conditions described herein. This report is not a substitute for a physical inspection or a formal registered valuation report. The values presented are for informational and analytical purposes only. Sigmavalue AI does not accept any liability for any loss, damage, or decision made in reliance upon this report without independent professional verification.
  </div>

</div>
<script>
  function initMap() {
    if (typeof L === 'undefined') {
      setTimeout(initMap, 50);
      return;
    }
    
    const subjectLat = ${subjectData?.lat ? Number(subjectData.lat) : 0};
    const subjectLng = ${subjectData?.lng ? Number(subjectData.lng) : 0};
    const subjectName = "${subjectData?.project_name?.replace(/"/g, '\\"') || 'Subject Property'}";
    
    if (!subjectLat || !subjectLng) return;

    const map = L.map('print-map', {
      center: [subjectLat, subjectLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);
    
    const subjectIcon = L.divIcon({
      className: '',
      html: '<div style="width:22px;height:22px;background:#f43f5e;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:10px;font-family:sans-serif;">S</div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    
    L.marker([subjectLat, subjectLng], { icon: subjectIcon })
      .addTo(map)
      .bindPopup('<b>Subject: ' + subjectName + '</b>');
      
    const comps = ${JSON.stringify(
      table.filter(row => row.role !== "SUBJECT" && row.lat && row.lng).map((row, idx) => {
        const dist = haversineDistanceKM(subjectLat, subjectLng, Number(row.lat), Number(row.lng));
        return {
          name: row.project_name,
          lat: Number(row.lat),
          lng: Number(row.lng),
          rate: row.avg_rate,
          distance: dist,
          index: idx + 1
        };
      })
    )};
    
    const bounds = L.latLngBounds([subjectLat, subjectLng]);
    
    comps.forEach(c => {
      const compIcon = L.divIcon({
        className: '',
        html: '<div style="width:20px;height:20px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:9px;font-family:sans-serif;">' + c.index + '</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      L.marker([c.lat, c.lng], { icon: compIcon })
        .addTo(map)
        .bindPopup('<b>[' + c.index + '] ' + c.name + '</b><br>Distance: ' + (c.distance != null ? c.distance.toFixed(2) + ' km' : '—') + '<br>Rate: ' + (c.rate != null ? c.rate.toLocaleString() : '—') + '/sqft');
      bounds.extend([c.lat, c.lng]);
    });
    
    map.fitBounds(bounds, { padding: [40, 40] });
  }
  
  function triggerPrint() {
    setTimeout(() => {
      window.print();
    }, 2000);
  }
  
  if (document.readyState === 'complete') {
    initMap();
    triggerPrint();
  } else {
    window.addEventListener('load', () => {
      initMap();
      triggerPrint();
    });
  }
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}



// ── Main ValuationReport component ─────────────────────────────────────────
export default function ValuationReport({ valuationResult }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!valuationResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 border border-accent/25 animate-pulse">
          <FileText className="h-8 w-8 text-accent/60" />
        </div>
        <div>
          <h3 className="font-display text-base font-bold uppercase tracking-[0.14em] text-text-primary mb-2">
            Report Pending
          </h3>
          <p className="text-sm leading-6 text-text-secondary max-w-[280px]">
            Complete the full valuation pipeline to generate the professional appraisal report.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-[10px] text-text-dim">
          {["Run a valuation query", "Select comparable projects", "Complete all pipeline stages", "Report auto-generates here"].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border-soft text-[8px] font-black">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { type, subjectData, costCalculation } = valuationResult;
  const hasCostApproach = type === "cost" && costCalculation;

  const slides = [
    { id: "cover", label: "Certificate", icon: Award, component: SlideCover },
    { id: "map", label: "Property Map", icon: MapPin, component: SlideReportMap },
    { id: "comparable", label: "Comparables", icon: BarChart3, component: SlideComparableGrid },
    { id: "blending", label: "Rate Derivation", icon: Target, component: SlideBlending },
    { id: "reasoning", label: "AI Reasoning", icon: Zap, component: SlideReasoning },
    { id: "factorial", label: "Rate Table", icon: Layers, component: SlideFactorialTable },
    ...(hasCostApproach ? [{ id: "cost", label: "Cost Approach", icon: Calculator, component: SlideCostApproach }] : []),
  ];

  const ActiveSlide = slides[currentSlide]?.component;

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      downloadPDF(valuationResult);
    } finally {
      setTimeout(() => setIsDownloading(false), 1500);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Slide Tab Navigation */}
      <div className="flex items-center gap-1 px-1 pb-3 shrink-0 overflow-x-auto custom-scrollbar">
        {slides.map((slide, i) => {
          const Icon = slide.icon;
          const isActive = i === currentSlide;
          return (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 shrink-0 ${
                isActive
                  ? "bg-accent/20 border border-accent/40 text-accent shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                  : "border border-border-soft bg-bg-deep/40 text-text-dim hover:text-text-secondary hover:border-border hover:bg-bg-input/60"
              }`}
            >
              <Icon className="h-3 w-3" />
              {slide.label}
            </button>
          );
        })}
      </div>

      {/* Slide Navigation Header */}
      <div className="flex items-center justify-between mb-3 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlide(p => Math.max(0, p - 1))}
            disabled={currentSlide === 0}
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-border-soft bg-bg-input hover:border-accent/40 hover:text-accent disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <SlideDots total={slides.length} current={currentSlide} onChange={setCurrentSlide} />
          <button
            onClick={() => setCurrentSlide(p => Math.min(slides.length - 1, p + 1))}
            disabled={currentSlide === slides.length - 1}
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-border-soft bg-bg-input hover:border-accent/40 hover:text-accent disabled:opacity-30 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-[8px] text-text-dim uppercase tracking-wider font-semibold ml-1">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>

        {/* Download buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-accent/30 bg-accent/10 text-accent text-[9px] font-black uppercase tracking-wider hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            {isDownloading ? "Preparing..." : "PDF"}
          </button>
        </div>
      </div>

      {/* Active Slide Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          key={currentSlide}
          className="h-full animate-in fade-in slide-in-from-right-4 duration-300"
        >
          {ActiveSlide && (
            <ActiveSlide valuationResult={valuationResult} />
          )}
        </div>
      </div>
    </div>
  );
}
