"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { AlertCircle, ArrowUpRight, CheckCircle2, ChevronDown, ChevronLeft, Database, FileSearch, Loader2, MapPin, RadioTower, RotateCcw, Search, Table2, X, TrendingUp, ShieldCheck, AlertTriangle, HelpCircle, GitBranch, Sparkles, Building2, Globe2, Target, Home, Layers, Square, Map as MapIcon, Clock } from "lucide-react";
import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "@/lib/api-client";
import type { MapAgentSelection } from "./data";
import ComparableModal from "./ComparableModal";
type Comparable = Record<string, any>;

type ValuationMapState = {
  subject: (Comparable & { lat: number; lng: number }) | null;
  comparables: Comparable[];
  radiusKm: number | null;
  focusNonce: number;
};



type ValuationEvent = {
  type: string;
  content: any;
  metrics?: any;
};

type ClarificationGate = {
  missing_fields: string[];
  question: string;
  message: string;
  user_inputs_required: any[];
};

type ExtractionVerificationGate = {
  entities: Record<string, any>;
  message: string;
};

type ApproachChoiceGate = {
  recommended_approach: string;
  alternative_approach?: string;
  question: string;
};

type MapConfirmationGate = {
  lat: number;
  lng: number;
  location_name: string;
  message: string;
};

type ValuationForm = {
  projectName: string;
  locationName: string;
  country: string;
  propertyType: string;
  approach: string;
  salableAreaSqft: string;
  builtupAreaSqft: string;
  plotAreaSqft: string;
  ageYears: string;
  landType: string;
  frontage: string;
  occupancyStatus: string;
  buildingType: string;
  constructionRateSqft: string;
  totalLifeYears: string;
};

type ValuationTabProps = {
  selection: MapAgentSelection;
  valuationMapState: ValuationMapState;
  onValuationMapStateChange: (state: ValuationMapState | ((current: ValuationMapState) => ValuationMapState)) => void;
  onOpenComparable: (comp: Comparable) => void;
  triggerRun?: number;
  autoOpen?: boolean;
  selectedComparables: Set<number>;
  onSelectedComparablesChange: Dispatch<SetStateAction<Set<number>>>;
  showComparablesModal: boolean;
  onShowComparablesModalChange: Dispatch<SetStateAction<boolean>>;
  triggerFetchListings?: number;
};

const PROPERTY_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "plot", label: "Plot" },
  { value: "retail", label: "Retail" },
  { value: "commercial_office", label: "Commercial Office" },
  { value: "building_land", label: "Building + Land" },
];

const emptyForm: ValuationForm = {
  projectName: "",
  locationName: "",
  country: "India",
  propertyType: "apartment",
  approach: "market",
  salableAreaSqft: "",
  builtupAreaSqft: "",
  plotAreaSqft: "",
  ageYears: "",
  landType: "residential",
  frontage: "",
  occupancyStatus: "vacant",
  buildingType: "residential",
  constructionRateSqft: "",
  totalLifeYears: "60",
};

function countryFromAddress(address?: string) {
  if (!address) return "India";
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || "India";
}

function cityFromAddress(address?: string, fallback?: string) {
  const knownCities = ["Pune", "Mumbai", "Thane", "Bengaluru", "Hyderabad", "Delhi", "Noida", "Gurugram", "Chennai", "Kolkata", "Ahmedabad"];
  const parts = address?.split(",").map((part) => part.trim()).filter(Boolean) || [];
  const matchedCity = knownCities.find((city) => parts.some((part) => part.toLowerCase() === city.toLowerCase()));
  if (matchedCity) return matchedCity;
  return fallback?.trim() || "";
}

function isValidCoord(value: unknown) {
  return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earth = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeRadiusKm(subject: any, comparables: Comparable[]) {
  if (!subject || !isValidCoord(subject.lat) || !isValidCoord(subject.lng)) return null;
  const origin = { lat: Number(subject.lat), lng: Number(subject.lng) };
  const max = comparables.reduce((largest, comp) => {
    if (!isValidCoord(comp.lat) || !isValidCoord(comp.lng)) return largest;
    const explicit = Number(comp.distance_from_subject_km);
    const value = Number.isFinite(explicit) && explicit > 0
      ? explicit
      : distanceKm(origin, { lat: Number(comp.lat), lng: Number(comp.lng) });
    return Math.max(largest, value);
  }, 0);
  return max > 0 ? Number((max * 1.08).toFixed(2)) : null;
}

function buildValuationQuery(form: ValuationForm, selection: MapAgentSelection) {
  const lines = [
    "Value this property from map selection.",
    `Project Name: ${form.projectName}.`,
    `Location Name: ${form.locationName || selection.location || selection.formattedAddress || "Selected Location"}.`,
    `City: ${selection.city || cityFromAddress(selection.formattedAddress, selection.location) || "Not provided"}.`,
    `Country: ${form.country || countryFromAddress(selection.formattedAddress)}.`,
    `Property Type: ${form.propertyType}.`,
    form.approach ? `Proceed with the ${form.approach} approach.` : "Proceed with the market approach.",
    `Lat: ${selection.coordinates.lat}, Lng: ${selection.coordinates.lng}.`,
    "Coordinates Confirmed: true.",
    "Extraction Verified: true.",
  ];

  if (["apartment", "retail", "commercial_office"].includes(form.propertyType) && form.salableAreaSqft) lines.push(`Salable Area: ${form.salableAreaSqft} sqft.`);
  if (["villa", "building_land", "industrial"].includes(form.propertyType) && form.builtupAreaSqft) lines.push(`Built-up Area: ${form.builtupAreaSqft} sqft.`);
  if (["villa", "plot", "building_land", "industrial", "agricultural"].includes(form.propertyType) && form.plotAreaSqft) lines.push(`Plot Area: ${form.plotAreaSqft} sqft.`);
  if (["apartment", "villa", "building_land", "building"].includes(form.propertyType) && form.ageYears) lines.push(`Age Years: ${form.ageYears}.`);
  if (form.propertyType === "plot" && form.landType) lines.push(`Land Type: ${form.landType}.`);
  if (form.propertyType === "retail" && form.frontage) lines.push(`Frontage: ${form.frontage}.`);
  if (form.propertyType === "commercial_office" && form.occupancyStatus) lines.push(`Occupancy Status: ${form.occupancyStatus}.`);
  if (form.propertyType === "building_land" && form.buildingType) lines.push(`Building Type: ${form.buildingType}.`);

  return lines.join(" ");
}

function buildInitialValuationForm(selection: MapAgentSelection): ValuationForm {
  return {
    ...emptyForm,
    projectName: selection.projectName || "",
    locationName: selection.location || selection.formattedAddress || "",
    propertyType: selection.propertyType || emptyForm.propertyType,
  };
}

function statusForEvent(event: any) {
  if (event.type === "entities") return "Subject extracted from valuation agent.";
  if (event.type === "workflow") return "Workflow generated.";
  if (event.type === "comparable_results") return `Found ${event.content?.total_found || event.content?.comparables?.length || 0} comparable projects.`;
  if (event.type === "clarification_needed") return event.content?.question || event.content?.message || "More property details are required.";
  if (event.type === "map_confirmation") return "Map confirmation requested by backend.";
  if (event.type === "extraction_verification") return "Extraction verification requested by backend.";
  if (event.type === "listing_results") return `Fetched ${event.content?.total_listings || 0} web listings.`;
  if (event.type === "transaction_results") return `Fetched ${event.content?.total || 0} DB transactions.`;
  if (event.type === "cleaning_results") return `Cleaned ${event.content?.cleaned_listings?.length || 0} listing rows.`;
  if (event.type === "factorial_results") return `Built rate table with ${event.content?.table?.length || 0} projects.`;
  if (event.type === "factorial_analysis_result") return "Final valuation rate is ready.";
  if (event.type === "done") return "Current stream completed.";
  if (event.type === "error") return String(event.content || "Valuation error.");
  return typeof event.content === "string" ? event.content : "Valuation stream update received.";
}

function EventStatus({ events }: { events: any[] }) {
  const last = events[events.length - 1];
  if (!last) return null;
  return <p className="map-agent-valuation-status"><RadioTower />{statusForEvent(last)}</p>;
}

const GATE_META = [
  { step: 1, label: "Identity", desc: "Project & Location", icon: "📍" },
  { step: 2, label: "Type", desc: "Property Category", icon: "🏠" },
  { step: 3, label: "Approach", desc: "Valuation Logic", icon: "⎇" },
  { step: 4, label: "Details", desc: "Area & Specs", icon: "📝" },
  { step: 5, label: "Review", desc: "Confirm All", icon: "🔍" },
];

export default function ValuationTab({
  selection,
  valuationMapState,
  onValuationMapStateChange,
  onOpenComparable,
  triggerRun = 0,
  autoOpen = false,
  selectedComparables,
  onSelectedComparablesChange,
  showComparablesModal,
  onShowComparablesModalChange,
  triggerFetchListings = 0
}: ValuationTabProps) {
  const [form, setForm] = useState<ValuationForm>(() => buildInitialValuationForm(selection));
  const [events, setEvents] = useState<any[]>([]);
  const [subject, setSubject] = useState<any>(null);
  const [comparables, setComparables] = useState<Comparable[]>([]);
  // selectedComparables state has been lifted
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cleanedRows, setCleanedRows] = useState<any[]>([]);
  const [factorialData, setFactorialData] = useState<any>(null);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

  const [clarificationGate, setClarificationGate] = useState<ClarificationGate | null>(null);
  const [verificationGate, setVerificationGate] = useState<ExtractionVerificationGate | null>(null);
  const [approachGate, setApproachGate] = useState<ApproachChoiceGate | null>(null);
  const [mapGate, setMapGate] = useState<MapConfirmationGate | null>(null);

  const [activeEvents, setActiveEvents] = useState<ValuationEvent[]>([]);
  const [gateStep, setGateStep] = useState(1);
  const [gateValues, setGateValues] = useState<Record<string, any>>({});
  const [gateCollapsed, setGateCollapsed] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  // showComparablesModal state has been lifted



  useEffect(() => {
    if (triggerRun > 0) {
      runValuation();
    }
  }, [triggerRun]);

  useEffect(() => {
    if (triggerFetchListings > 0) {
      runAutomatedPipeline();
    }
  }, [triggerFetchListings]);

  const runAutomatedPipeline = async () => {
    // Clear all downstream state to allow cascading effects to trigger
    setListings([]);
    setTransactions([]);
    setCleanedRows([]);
    setFactorialData(null);
    setFinalResult(null);
    setShowReport(false);

    await fetchListingsAndTransactions();
  };

  useEffect(() => {
    if (triggerFetchListings > 0 && (listings.length > 0 || transactions.length > 0) && !isStreaming && !cleanedRows.length) {
      cleanData();
    }
  }, [listings, transactions, triggerFetchListings, isStreaming]);

  useEffect(() => {
    if (triggerFetchListings > 0 && cleanedRows.length > 0 && !isStreaming && !factorialData) {
      buildFactorial();
    }
  }, [cleanedRows, triggerFetchListings, isStreaming]);

  useEffect(() => {
    if (triggerFetchListings > 0 && factorialData && !isStreaming && !finalResult) {
      runFinalValuation();
    }
  }, [factorialData, triggerFetchListings, isStreaming]);

  const pushEvent = (event: ValuationEvent) => {
    setActiveEvents((prev) => [...prev, event]);
    setEvents((current) => [...current, event]);
    if (event.type === "stage") {
      setCurrentStage(event.content);
    }
  };

  const clearGates = () => {
    setClarificationGate(null);
    setVerificationGate(null);
    setApproachGate(null);
    setMapGate(null);
  };

  const resetValuationState = () => {
    setIsStreaming(false);
    setError(null);
    setStatusMessage(null);
    setCurrentStage(null);
    clearGates();
    setGateActive(false);
    setActiveEvents([]);
    setEvents([]);
    setSubject(null);
    setComparables([]);
    onSelectedComparablesChange(new Set());
    setListings([]);
    setTransactions([]);
    setCleanedRows([]);
    setFactorialData(null);
    setFinalResult(null);
    setShowReport(false);
    onShowComparablesModalChange(false);
    onValuationMapStateChange({
      subject: null,
      comparables: [],
      radiusKm: null,
      focusNonce: valuationMapState.focusNonce + 1,
    });
  };

  const selectedPayload = useMemo(() => Array.from(selectedComparables).map((index) => comparables[index]).filter(Boolean), [comparables, selectedComparables]);
  const effectiveProjectName = form.projectName.trim();
  const effectiveLocationName = form.locationName || selection.location || selection.formattedAddress || "";
  const effectiveCity = selection.city || cityFromAddress(selection.formattedAddress, selection.location);
  const effectiveCountry = form.country || countryFromAddress(selection.formattedAddress);
  const requiredReady = Boolean(effectiveProjectName && effectiveLocationName.trim() && effectiveCountry.trim() && form.propertyType.trim());

  const updateForm = (field: keyof ValuationForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const runValuation = async (overrideQuery?: string) => {
    if (isStreaming) return;
    if (!overrideQuery && !requiredReady) {
      if (!effectiveProjectName) setError("Project name is required for valuation.");
      return;
    }
    const query = overrideQuery || buildValuationQuery({ ...form, projectName: effectiveProjectName, locationName: effectiveLocationName, country: effectiveCountry }, selection);

    setIsStreaming(true);
    setError(null);
    setStatusMessage("Initializing valuation pipeline...");
    clearGates();
    setActiveEvents([]);
    setEvents([]);
    setSubject(null);
    setComparables([]);
    onSelectedComparablesChange(new Set());
    setListings([]);
    setTransactions([]);
    setCleanedRows([]);
    setFactorialData(null);
    setFinalResult(null);

    // Initial Gate Values population for autofill
    setGateValues({
      project_name: effectiveProjectName,
      location_name: effectiveLocationName,
      city: effectiveCity,
      country: effectiveCountry,
      lat: selection.coordinates.lat,
      lng: selection.coordinates.lng,
      coordinates: `${selection.coordinates.lat}, ${selection.coordinates.lng}`,
      property_type: form.propertyType,
      recommended_approach: form.approach,
    });

    onValuationMapStateChange({
      subject: {
        project_name: effectiveProjectName,
        location_name: effectiveLocationName,
        city: effectiveCity,
        lat: selection.coordinates.lat,
        lng: selection.coordinates.lng,
      },
      comparables: [],
      radiusKm: null,
      focusNonce: valuationMapState.focusNonce + 1,
    });

    try {
      const response = await fetch(apiUrl(`/ask_stream_valuation?question=${encodeURIComponent(query)}&comparable_source=both`));
      if (!response.ok || !response.body) throw new Error(`Valuation request failed with status ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let activeSubject: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          let event: ValuationEvent;
          try {
            event = JSON.parse(chunk.slice(6));
          } catch (e) {
            console.error("Failed to parse SSE chunk", chunk);
            continue;
          }
          pushEvent(event);

          if (event.type === "entities") {
            const coords = event.content?.coordinates || {};
            activeSubject = {
              ...event.content,
              project_name: event.content?.project_name || effectiveProjectName,
              location_name: event.content?.location_name || form.locationName,
              city: event.content?.city || event.content?.city_name || effectiveCity,
              country: event.content?.country || form.country,
              lat: Number(coords.lat || selection.coordinates.lat),
              lng: Number(coords.lng || selection.coordinates.lng),
            };
            setSubject(activeSubject);
            // Sync with gateValues for autofill in Step 4
            setGateValues(prev => ({
              ...prev,
              ...event.content,
              project_name: activeSubject.project_name,
              location_name: activeSubject.location_name,
              city: activeSubject.city,
              country: activeSubject.country,
              lat: activeSubject.lat,
              lng: activeSubject.lng
            }));
            onValuationMapStateChange((current) => ({ ...current, subject: activeSubject, focusNonce: current.focusNonce + 1 }));
          }

          if (event.type === "clarification_needed") {
            setClarificationGate(event.content);
            const vals: any = {};
            event.content.missing_fields?.forEach((f: string) => { vals[f] = ""; });
            setGateValues(prev => ({ ...prev, ...vals }));
          }
          if (event.type === "extraction_verification") {
            setVerificationGate(event.content);
            setGateValues(prev => ({ ...prev, ...(event.content.entities || {}) }));
          }
          if (event.type === "approach_choice_needed") setApproachGate(event.content);
          if (event.type === "map_confirmation") {
            setMapGate(event.content);
            setGateValues(prev => ({ ...prev, lat: event.content.lat, lng: event.content.lng }));
          }

          if (event.type === "comparable_results") {
            const comps = event.content?.comparables || [];
            setComparables(comps);

            if (autoOpen && comps.length > 0) {
              onShowComparablesModalChange(true);
            }

            const subj = activeSubject || {
              project_name: effectiveProjectName,
              location_name: effectiveLocationName,
              lat: selection.coordinates.lat,
              lng: selection.coordinates.lng,
            };
            onValuationMapStateChange((current) => ({
              subject: current.subject || subj,
              comparables: comps,
              radiusKm: computeRadiusKm(current.subject || subj, comps),
              focusNonce: current.focusNonce + 1,
            }));
          }

          if (event.type === "stage") setStatusMessage(event.content);
          if (event.type === "done") setIsStreaming(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run valuation.");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleGateResponse = (response: string) => {
    clearGates();
    setGateActive(false);
    runValuation(`${response}`);
  };

  const [gateActive, setGateActive] = useState(false);

  const advanceGate = () => {
    setGateStep(prev => {
      let next = prev + 1;
      if (next === 3 && form.propertyType !== "villa") next = 4;
      return next;
    });
  };

  const gateSubmitFinal = () => {
    const lines = [
      "Value this property from map selection.",
      `Project Name: ${gateValues.project_name || ""}.`,
      `Location Name: ${gateValues.location_name || ""}.`,
      `City: ${gateValues.city || ""}.`,
      `Country: ${gateValues.country || ""}.`,
      `Property Type: ${gateValues.property_type || ""}.`,
      gateValues.recommended_approach ? `Proceed with the ${gateValues.recommended_approach} approach.` : "Proceed with the market approach.",
      `Lat: ${gateValues.lat || selection.coordinates.lat}, Lng: ${gateValues.lng || selection.coordinates.lng}.`,
      "Coordinates Confirmed: true.",
      "Extraction Verified: true.",
    ];

    const propType = gateValues.property_type || form.propertyType;
    if (["apartment", "retail", "commercial_office"].includes(propType) && gateValues.salable_area_sqft) lines.push(`Salable Area: ${gateValues.salable_area_sqft} sqft.`);
    if (["villa", "building_land", "industrial"].includes(propType) && gateValues.builtup_area_sqft) lines.push(`Built-up Area: ${gateValues.builtup_area_sqft} sqft.`);
    if (["villa", "plot", "building_land", "industrial", "agricultural"].includes(propType) && gateValues.plot_area_sqft) lines.push(`Plot Area: ${gateValues.plot_area_sqft} sqft.`);
    if (["apartment", "villa", "building_land", "building"].includes(propType) && gateValues.age_years) lines.push(`Age Years: ${gateValues.age_years}.`);
    if (propType === "plot" && gateValues.land_type) lines.push(`Land Type: ${gateValues.land_type}.`);
    if (propType === "retail" && gateValues.frontage) lines.push(`Frontage: ${gateValues.frontage}.`);
    if (propType === "commercial_office" && gateValues.occupancy_status) lines.push(`Occupancy Status: ${gateValues.occupancy_status}.`);
    if (propType === "building_land" && gateValues.building_type) lines.push(`Building Type: ${gateValues.building_type}.`);

    const query = lines.join(" ");
    handleGateResponse(query);
  };

  const handleGeocodeRefresh = async () => {
    const loc = gateValues["location_name"] || effectiveLocationName;
    if (!loc) return;
    setIsGeocoding(true);
    setGeocodeError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        const { lat, lon } = data[0];
        setGateValues(prev => ({ ...prev, lat, lng: lon, coordinates: `${lat}, ${lon}` }));
      } else {
        setGeocodeError("Location not found. Please try adding more detail (e.g. city name).");
      }
    } catch (e) {
      setGeocodeError("Failed to fetch coordinates. Please enter them manually.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const renderGateField = (f: { field: string; label: string; sub?: string; type: string; options?: any[]; icon?: React.ReactNode }) => {
    const val = gateValues[f.field] ?? "";

    return (
      <div key={f.field} className="map-agent-gate-field mb-5">
        <label className="mb-2 block">
          <span className="map-agent-gate-label mb-1 block text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">
            {f.label}
          </span>
          {f.type === "select" ? (
            <div className="relative">
              <select
                value={val}
                onChange={e => setGateValues(prev => ({ ...prev, [f.field]: e.target.value }))}
                className="map-agent-gate-input h-9 w-full appearance-none rounded-xl border border-slate-300 bg-white px-2.5 pr-9 text-[10px] font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="">Select {f.label.toLowerCase()}...</option>
                {f.options?.map(opt => (
                  <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          ) : (
            <input
              type={f.type === "number" ? "number" : "text"}
              value={val}
              onChange={e => setGateValues(prev => ({ ...prev, [f.field]: e.target.value }))}
              placeholder={`Enter ${f.label.toLowerCase()}...`}
              className="map-agent-gate-input h-9 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-[10px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          )}
        </label>
        {f.sub && <p className="map-agent-gate-sub text-[9px] font-medium text-slate-500">{f.sub}</p>}
      </div>
    );
  };

  const toggleComparable = (index: number) => {
    onSelectedComparablesChange((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const focusComparables = () => onValuationMapStateChange((current) => ({ ...current, focusNonce: current.focusNonce + 1 }));

  const renderStepHeading = (step: string, title: string) => (
    <div className="mb-4 flex items-start gap-2">
      {gateStep > 1 && (
        <button
          type="button"
          aria-label="Back"
          onClick={() => setGateStep(prev => prev - 1)}
          className="map-agent-valuation-step-back mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}
      <div>
        <span className="map-agent-valuation-step-eyebrow text-[8px] font-black uppercase tracking-[0.16em] text-slate-300">{step}</span>
        <h4 className="map-agent-valuation-step-title text-sm font-black text-slate-900">{title}</h4>
      </div>
    </div>
  );

  const fetchListingsAndTransactions = async () => {
    if (selectedPayload.length === 0 || !subject || isStreaming) return;
    setIsStreaming(true);
    setError(null);
    setListings([]);
    setTransactions([]);
    try {
      const webComps = selectedPayload.filter((comp) => (comp.data_source || "Web") !== "Internal DB");
      const dbComps = selectedPayload.filter((comp) => (comp.data_source || "Web") === "Internal DB");

      if (webComps.length > 0) {
        const response = await fetch(apiUrl("/listing_stream"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, selected_comparables: webComps, property_type: subject.property_type || form.propertyType, listing_type: "sale" }),
        });
        if (response.body) await consumeSse(response, (event) => {
          pushEvent(event);
          if (event.type === "listing_results") setListings(event.content?.listings || []);
        });
      }

      for (const comp of dbComps) {
        const response = await fetch(apiUrl("/transaction_stream"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: String(comp.project_id || comp.id || comp.project_name), property_type: comp.property_type || subject.property_type || form.propertyType, project_name: comp.project_name || "" }),
        });
        if (response.body) await consumeSse(response, (event) => {
          pushEvent(event);
          if (event.type === "transaction_results") setTransactions((current) => [...current, ...(event.content?.transactions || [])]);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch listings/transactions.");
    } finally {
      setIsStreaming(false);
    }
  };

  const cleanData = async () => {
    if ((!listings.length && !transactions.length) || !subject || isStreaming) return;
    setIsStreaming(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/cleaning_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings, subject, comparables: selectedPayload, property_type: subject.property_type || form.propertyType, db_transactions: transactions, valuation_approach: form.approach }),
      });
      if (!response.body) throw new Error("Cleaning stream unavailable.");
      await consumeSse(response, (event) => {
        pushEvent(event);
        if (event.type === "cleaning_results") setCleanedRows(event.content?.cleaned_listings || []);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clean data.");
    } finally {
      setIsStreaming(false);
    }
  };

  const buildFactorial = async () => {
    if (!cleanedRows.length || !subject || isStreaming) return;
    setIsStreaming(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/factorial_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleaned_listings: cleanedRows, subject, comparables: selectedPayload, currency: subject.currency || "INR", area_unit: "sqft", valuation_approach: form.approach }),
      });
      if (!response.body) throw new Error("Factorial stream unavailable.");
      await consumeSse(response, (event) => {
        pushEvent(event);
        if (event.type === "factorial_results") setFactorialData(event.content);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to build factorial table.");
    } finally {
      setIsStreaming(false);
    }
  };

  const runFinalValuation = async () => {
    if (!factorialData || !subject || isStreaming) return;
    setIsStreaming(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/factorial_analysis_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorial_data: factorialData, subject, comparables: selectedPayload, radii: { road_m: 200, amenity_m: 2000, density_m: 500 } }),
      });
      if (!response.body) throw new Error("Final valuation stream unavailable.");
      await consumeSse(response, (event) => {
        pushEvent(event);
        if (event.type === "factorial_analysis_result") setFinalResult(event.content);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run final valuation.");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="map-agent-valuation-flow flex min-h-0 flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar pb-4">
      {error && <div className="map-agent-valuation-error flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/20 p-4 text-sm text-danger animate-in fade-in zoom-in">
        <AlertTriangle className="h-4 w-4" /> {error}
      </div>}

      {isStreaming && !comparables.length && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/5 border border-accent/10 px-4 py-3 text-sm text-text-primary animate-pulse">
          <Loader2 className="animate-spin h-4 w-4 text-accent" />
          <span>{statusMessage || "Starting pipeline..."}</span>
        </div>
      )}

      <div className="map-agent-form map-agent-valuation-form">
        <label>
          <span>Project name *</span>
          <input
            value={form.projectName}
            onChange={(event) => {
              updateForm("projectName", event.target.value);
              if (error === "Project name is required for valuation.") setError(null);
            }}
            placeholder="Enter project name for valuation"
            required
          />
        </label>
      </div>

      <div className="map-agent-valuation-run-row">
        <button
          type="button"
          className="map-agent-valuation-run"
          disabled={isStreaming || !requiredReady}
          onClick={() => runValuation()}
          title={!effectiveProjectName ? "Enter project name to run valuation" : undefined}
        >
          {isStreaming ? (
            <>
              <Loader2 className="map-agent-spin-icon" />
              Running Analysis...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {comparables.length > 0 ? "Restart Valuation" : "Run Valuation"}
            </>
          )}
        </button>
        <button
          type="button"
          className="map-agent-valuation-reset"
          onClick={resetValuationState}
          title="Reset valuation"
        >
          <RotateCcw />
          Reset
        </button>
      </div>

      {comparables.length > 0 && (
        <div className="map-agent-valuation-results">
          <div className="map-agent-section-heading">
            <div><strong>Comparable Projects</strong><span>{comparables.length} projects found</span></div>
            <button type="button" onClick={focusComparables}><MapPin />Show on Map</button>
          </div>

          <button
            type="button"
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-accent/10 border border-accent/20 py-3 text-sm font-bold text-accent hover:bg-accent/20 transition"
            onClick={() => onShowComparablesModalChange(true)}
          >
            <Table2 className="h-4 w-4" />
            Open Comparable Project Modal
          </button>
        </div>
      )}

      {/* ── High-Fidelity Side-Stepper Valuation Wizard ── */}
      {(clarificationGate || verificationGate || approachGate || mapGate) && (
        <div className="map-agent-valuation-gate-card relative mb-4 mt-3 flex max-h-[calc(100dvh-360px)] min-h-[430px] w-full flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_-20px_rgba(15,23,42,0.35)] animate-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="map-agent-valuation-gate-header relative flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="map-agent-valuation-gate-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Sparkles className="h-4 w-4 text-indigo-600"  />
            </div>
            <div className="min-w-0">
              <p className="map-agent-valuation-gate-kicker text-[8px] font-black uppercase tracking-[0.14em] text-indigo-600">Valuation Gate</p>
              <h2 className="map-agent-valuation-gate-title text-sm font-black uppercase tracking-tight text-slate-900">
                {GATE_META[gateStep - 1]?.label || "Identity"}
              </h2>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {/* Vertical Sidebar Stepper */}
            <div className="map-agent-valuation-gate-sidebar flex w-[68px] shrink-0 flex-col items-center gap-5 overflow-y-auto border-r border-slate-200 bg-slate-50 py-6 custom-scrollbar">
              {GATE_META.map((g, idx) => {
                const isActive = g.step === gateStep;
                const isDone = g.step < gateStep;
                return (
                  <div key={g.step} className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { if (gateStep > g.step) setGateStep(g.step); }}
                      className={`relative flex h-8 w-8 items-center justify-center rounded-xl border text-[10px] font-black transition-all ${
                        isActive
                          ? "map-agent-gate-step-active border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-500/10 scale-105 z-10"
                          : isDone
                            ? "map-agent-gate-step-done border-emerald-200 bg-emerald-50 text-emerald-600"
                            : "map-agent-gate-step-idle border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {isDone ? "✓" : g.step}
                    </button>
                    <span className={`map-agent-gate-step-label text-[8px] font-black uppercase tracking-[0.05em] ${isActive ? "text-indigo-600" : "text-slate-400 opacity-60"}`}>
                      {g.label.slice(0, 6)}
                    </span>
                    {idx < GATE_META.length - 1 && (
                      <div className={`map-agent-gate-step-line mt-1 h-4 w-px bg-slate-200 opacity-60`}></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Content Body */}
            <div className="map-agent-valuation-gate-content min-h-0 flex-1 overflow-y-auto px-5 py-2 custom-scrollbar">
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {gateStep === 1 && (
                  <div className="space-y-6">
                    {renderStepHeading("Step 01", "Identity")}
                    {renderGateField({ field: "project_name", label: "Project Name", type: "text" })}
                    {renderGateField({ field: "location_name", label: "Location", type: "text" })}
                    {renderGateField({ field: "city", label: "City", type: "text" })}
                    {renderGateField({ field: "country", label: "Country", type: "select", options: ["India", "USA", "UAE", "UK"] })}

                    <div className="map-agent-coordinate-card mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="map-agent-gate-label text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">Coordinates</span>
                        <div className="map-agent-coordinate-auto flex items-center gap-1.5 text-[8px] font-bold text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> Auto
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <label className="block">
                          <span className="map-agent-gate-label mb-1 block text-[8px] font-black uppercase text-slate-400">Lat</span>
                          <input
                            type="number"
                            value={gateValues.lat ?? ""}
                            onChange={e => setGateValues(prev => ({ ...prev, lat: e.target.value, coordinates: `${e.target.value}, ${prev.lng ?? ""}` }))}
                            className="map-agent-gate-input h-9 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-2 text-[9px] font-bold text-slate-900 shadow-inner focus:border-indigo-500"
                          />
                        </label>
                        <label className="block">
                          <span className="map-agent-gate-label mb-1 block text-[8px] font-black uppercase text-slate-400">Lng</span>
                          <input
                            type="number"
                            value={gateValues.lng ?? ""}
                            onChange={e => setGateValues(prev => ({ ...prev, lng: e.target.value, coordinates: `${prev.lat ?? ""}, ${e.target.value}` }))}
                            className="map-agent-gate-input h-9 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-2 text-[9px] font-bold text-slate-900 shadow-inner focus:border-indigo-500"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {gateStep === 2 && (
                  <div className="space-y-6">
                    {renderStepHeading("Step 02", "Property Type")}
                    {renderGateField({ field: "property_type", label: "Property Type", type: "select", options: PROPERTY_OPTIONS })}
                  </div>
                )}

                {gateStep === 3 && (
                  <div className="space-y-6">
                    {renderStepHeading("Step 03", "Valuation Approach")}
                    <div className="map-agent-approach-note rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-[10px] font-medium leading-relaxed text-indigo-800">
                      We suggest <strong>Market Approach</strong> based on asset profile.
                    </div>
                    {renderGateField({ field: "recommended_approach", label: "Approach", type: "select", options: [{ value: "market", label: "Market Comparison" }, { value: "cost", label: "Cost & Depreciation" }] })}
                  </div>
                )}

                {gateStep === 4 && (
                  <div className="space-y-6">
                    {renderStepHeading("Step 04", "Details")}
                    {["apartment", "retail", "commercial_office"].includes(gateValues.property_type || form.propertyType) && renderGateField({ field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" })}
                    {(gateValues.property_type || form.propertyType) === "retail" && renderGateField({ field: "frontage", label: "Road Frontage (ft)", type: "number" })}
                    {["villa", "building_land"].includes(gateValues.property_type || form.propertyType) && renderGateField({ field: "builtup_area_sqft", label: "Built-up Area (sqft)", type: "number" })}
                    {["villa", "plot", "building_land"].includes(gateValues.property_type || form.propertyType) && renderGateField({ field: "plot_area_sqft", label: "Plot Area (sqft)", type: "number" })}
                    {["apartment", "villa", "building_land"].includes(gateValues.property_type || form.propertyType) && renderGateField({ field: "age_years", label: "Property Age (Years)", type: "number" })}
                  </div>
                )}

                {gateStep === 5 && (
                  <div className="space-y-6">
                    {renderStepHeading("Step 05", "Review")}
                    <div className="grid gap-3">
                      {Object.entries(gateValues).filter(([k]) => !["coordinates"].includes(k)).map(([k, v]) => (
                        <div key={k} className="map-agent-review-row flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                          <span className="map-agent-review-label text-[7px] font-black uppercase tracking-wider text-slate-500">{k.replaceAll("_", " ")}</span>
                          <span className="map-agent-review-value break-words text-[9px] font-black leading-tight text-slate-900">{String(v) || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="map-agent-valuation-gate-footer relative flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={clearGates}
              className="map-agent-gate-cancel group flex h-8 items-center gap-1.5 rounded-lg px-2 text-[10px] font-bold text-slate-400 transition hover:text-red-500"
            >
              <X className="h-3.5 w-3.5 transition group-hover:rotate-90" /> Cancel
            </button>

            <div className="flex gap-2">
              {gateStep < 5 ? (
                <button
                  type="button"
                  onClick={advanceGate}
                  className="map-agent-gate-next group relative flex h-8 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95 active:shadow-none"
                >
                  Next
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={gateSubmitFinal}
                  className="map-agent-gate-confirm group relative flex h-8 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 active:shadow-none"
                >
                  Confirm
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="map-agent-valuation-actions">
        <button type="button" disabled={selectedPayload.length === 0 || isStreaming} onClick={fetchListingsAndTransactions}><FileSearch />Fetch Listings</button>
        <button type="button" disabled={(!listings.length && !transactions.length) || isStreaming} onClick={cleanData}><Database />Clean Data</button>
        <button type="button" disabled={!cleanedRows.length || isStreaming} onClick={buildFactorial}><Table2 />Build Rate Table</button>
        <button type="button" disabled={!factorialData || isStreaming} onClick={runFinalValuation}><CheckCircle2 />Final Valuation</button>
      </div>

      {/* ComparableModal is now rendered in parent IntelligencePanel */}

      {finalResult && (
        <div className="map-agent-result-card valuation-ready">
          <span>Final valuation ready</span>
          <strong>
            {finalResult.subject_final_rate
              ? `${Number(finalResult.subject_final_rate).toLocaleString("en-IN")} / sqft`
              : finalResult.confidence || "Result generated"}
          </strong>
          <p>{finalResult.methodology || "Comparable factoring analysis completed."}</p>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="map-agent-report-button bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500"
          >
            View Full Valuation Report <ArrowUpRight />
          </button>
        </div>
      )}

      {showReport && finalResult && (
        <ValuationReportModal
          result={finalResult}
          subject={subject}
          selection={selection}
          onResultChange={setFinalResult}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

async function consumeSse(response: Response, onEvent: (event: any) => void) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";
    for (const chunk of chunks) {
      if (!chunk.startsWith("data: ")) continue;
      onEvent(JSON.parse(chunk.slice(6)));
    }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Valuation Report Modal
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MAP_AGENT_CONFIDENCE_RANGE_PCT: Record<string, number> = {
  high: 0.03,
  medium: 0.06,
  low: 0.10,
};

function getMapAgentConfidenceRangePct(confidence: unknown) {
  const key = String(confidence || "Medium").trim().toLowerCase();
  return MAP_AGENT_CONFIDENCE_RANGE_PCT[key] || MAP_AGENT_CONFIDENCE_RANGE_PCT.medium;
}

function buildMapAgentNumberRange(exactValue: unknown, confidence: unknown) {
  const value = Number(exactValue || 0);
  if (!value) return null;
  const pct = getMapAgentConfidenceRangePct(confidence);
  return {
    low: Math.round(value * (1 - pct)),
    high: Math.round(value * (1 + pct)),
  };
}

function ValuationReportModal({
  result,
  subject,
  selection,
  onResultChange,
  onClose,
}: {
  result: any;
  subject: any;
  selection: MapAgentSelection;
  onResultChange: (result: any) => void;
  onClose: () => void;
}) {
  const [originalResult] = useState(() => JSON.parse(JSON.stringify(result)));
  const currency = result.currency || "INR";
  const areaUnit = result.area_unit || "sqft";
  const finalRate = result.subject_final_rate ?? result.subject_final_plot_rate;
  const rateRange = result.subject_rate_range;
  const marketValue = result.subject_market_value;
  const valueRange = result.subject_value_range;
  const confidence = result.confidence || "--";
  const methodology = result.methodology || "Comparable factoring analysis";
  const factoringTable: any[] = result.comparable_factoring_table || [];
  const details = result.valuation_details || {};
  const reasoning = result.reasoning_audit || {};
  const note = result.limited_evidence_note || result.reconciliation_note || "";
  const subjectListings = Number(subject?.listing_count || result.blending?.subject_listing_count || 0);
  const capLimit = subjectListings >= 10 ? 0.10 : 0.20;

  const fmt = (n: number | null | undefined) =>
    n != null ? Number(n).toLocaleString("en-IN") : "--";

  const fmtFactor = (value: number | string | null | undefined) => {
    if (value == null || value === "") return "--";
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return `${num >= 0 ? "+" : ""}${(num * 100).toFixed(2)}%`;
  };

  const fmtAmenity = (summary: any) => {
    if (!summary) return "--";
    if (typeof summary === "string") return summary;
    if (summary.total != null) return `${summary.total}`;
    if (summary.counts && typeof summary.counts === "object") {
      const total = Object.values(summary.counts as Record<string, unknown>).reduce<number>((sum, value) => sum + Number(value || 0), 0);
      return `${total}`;
    }
    return "--";
  };

  const factorColorClass = (value: number | string | null | undefined) => {
    if (value == null || value === "") return "neutral";
    const num = Number(value);
    if (num > 0) return "positive";
    if (num < 0) return "negative";
    return "neutral";
  };

  const subjectRow = factoringTable.find((row) => row.role === "SUBJECT");
  const comparableRows = factoringTable.filter((row) => row.role !== "SUBJECT");
  const blending = result.blending || {};
  const subjectOwnRate = Number(blending.subject_own_rate || subjectRow?.avg_rate || 0);
  const factoredCompAvg = Number(blending.factored_comp_avg || 0);
  const subjectWeight = Number(blending.w1 ?? (subjectListings > 0 ? 0.5 : 0));
  const comparableWeight = Number(blending.w2 ?? (subjectListings > 0 ? 0.5 : 1));
  const areaInfo = (() => {
    const propertyType = String(subject?.property_type || result.property_type || "").toLowerCase().trim();
    if (["flat", "apartment", "shop", "retail", "office", "commercial_office"].includes(propertyType) && subject?.salable_area_sqft) {
      return { value: Number(subject.salable_area_sqft), label: "Salable Area" };
    }
    if (["villa", "house", "building_land"].includes(propertyType) && subject?.builtup_area_sqft) {
      return { value: Number(subject.builtup_area_sqft), label: "Built-up Area" };
    }
    if (["land", "plot"].includes(propertyType) && subject?.plot_area_sqft) {
      return { value: Number(subject.plot_area_sqft), label: "Total Area" };
    }
    if (subject?.salable_area_sqft) return { value: Number(subject.salable_area_sqft), label: "Salable Area" };
    if (subject?.builtup_area_sqft) return { value: Number(subject.builtup_area_sqft), label: "Built-up Area" };
    if (subject?.plot_area_sqft) return { value: Number(subject.plot_area_sqft), label: "Total Area" };
    if (subject?.carpet_area_sqft) return { value: Number(subject.carpet_area_sqft), label: "Carpet Area" };
    return { value: 0, label: "Area" };
  })();
  const selectedArea = Number(areaInfo.value || 0);
  const displayMarketValue = selectedArea > 0
    ? Number(marketValue || Math.round(Number(finalRate || 0) * selectedArea))
    : Number(marketValue || 0);
  const displayRateRange = rateRange?.low && rateRange?.high ? rateRange : buildMapAgentNumberRange(finalRate, confidence);
  const displayValueRange = displayMarketValue > 0
    ? (valueRange?.low && valueRange?.high ? valueRange : buildMapAgentNumberRange(displayMarketValue, confidence))
    : null;
  const rangePct = Number(result.confidence_range_pct || (getMapAgentConfidenceRangePct(confidence) * 100));
  const rangeLabel = `+/-${rangePct.toFixed(rangePct % 1 === 0 ? 0 : 1)}% ${confidence || "Medium"} confidence band`;

  const isProjectModified = (projectName: string) => {
    const originalRow = originalResult.comparable_factoring_table?.find((row: any) => row.project_name === projectName);
    const currentRow = factoringTable.find((row) => row.project_name === projectName);
    if (!originalRow || !currentRow) return false;
    return (
      originalRow.factor_road !== currentRow.factor_road ||
      originalRow.factor_amenity !== currentRow.factor_amenity ||
      originalRow.factor_density !== currentRow.factor_density ||
      originalRow.factor_cbd !== currentRow.factor_cbd
    );
  };

  const isCapped = (row: any) => {
    const rawSum =
      Number(row.factor_road || 0) +
      Number(row.factor_amenity || 0) +
      Number(row.factor_density || 0) +
      Number(row.factor_cbd || 0);
    return Math.abs(rawSum) > capLimit;
  };

  const isWeightsModified = () => {
    return (
      originalResult.blending?.w1 !== blending.w1 ||
      originalResult.blending?.w2 !== blending.w2
    );
  };

  const recalculateResult = (nextTable: any[], nextW1 = subjectWeight, nextW2 = comparableWeight) => {
    const nextComparableRows = nextTable.filter((row) => row.role !== "SUBJECT");
    const compCount = nextComparableRows.length;
    const factoredCompAvg = compCount > 0
      ? Math.round(nextComparableRows.reduce((sum, row) => sum + Number(row.factored_rate || 0), 0) / compCount)
      : 0;
    const nextSubjectRow = nextTable.find((row) => row.role === "SUBJECT");
    const subjectRate = Number(nextSubjectRow?.avg_rate || 0);
    const currentBlending = result.blending || {};
    const nextFinalRate = subjectListings > 0 && subjectRate > 0
      ? Math.round(nextW1 * subjectRate + nextW2 * factoredCompAvg)
      : Math.round(factoredCompAvg);
    const area = Number(
      subject?.salable_area_sqft ||
      subject?.builtup_area_sqft ||
      subject?.carpet_area_sqft ||
      subject?.plot_area_sqft ||
      0
    );
    const nextMarketValue = area > 0 ? Math.round(nextFinalRate * area) : result.subject_market_value;

    onResultChange({
      ...result,
      comparable_factoring_table: nextTable,
      blending: {
        ...currentBlending,
        factored_comp_avg: factoredCompAvg,
        w1: nextW1,
        w2: nextW2,
        final_rate: nextFinalRate,
        weight_reasoning: nextW1 !== originalResult.blending?.w1 || nextW2 !== originalResult.blending?.w2
          ? null
          : (originalResult.blending?.weight_reasoning || currentBlending.weight_reasoning),
      },
      subject_final_rate: nextFinalRate,
      confidence_range_pct: getMapAgentConfidenceRangePct(confidence) * 100,
      subject_rate_range: buildMapAgentNumberRange(nextFinalRate, confidence),
      subject_market_value: nextMarketValue,
      subject_value_range: nextMarketValue ? buildMapAgentNumberRange(nextMarketValue, confidence) : result.subject_value_range,
    });
  };

  const handleFactorChange = (projectName: string, factorKey: string, valuePct: number) => {
    const decimalValue = Number((valuePct / 100).toFixed(4));
    const nextTable = factoringTable.map((row) => {
      if (row.project_name !== projectName) return row;
      const updatedRow = { ...row, [factorKey]: decimalValue };
      const rawFactor =
        Number(updatedRow.factor_road || 0) +
        Number(updatedRow.factor_amenity || 0) +
        Number(updatedRow.factor_density || 0) +
        Number(updatedRow.factor_cbd || 0);
      const totalFactor = Math.max(-capLimit, Math.min(capLimit, rawFactor));
      return {
        ...updatedRow,
        total_factor: totalFactor,
        factored_rate: Math.round(Number(updatedRow.avg_rate || 0) * (1 + totalFactor)),
      };
    });
    recalculateResult(nextTable);
  };

  const handleWeightChange = (nextW1: number) => {
    const roundedW1 = Math.round(nextW1 * 100) / 100;
    const roundedW2 = Math.round((1 - roundedW1) * 100) / 100;
    recalculateResult(factoringTable, roundedW1, roundedW2);
  };

  const handleResetWeights = () => {
    const originalW1 = Number(originalResult.blending?.w1 ?? (subjectListings > 0 ? 0.5 : 0));
    const originalW2 = Number(originalResult.blending?.w2 ?? (subjectListings > 0 ? 0.5 : 1));
    recalculateResult(factoringTable, originalW1, originalW2);
  };

  const handleResetProject = (projectName: string) => {
    const originalRow = originalResult.comparable_factoring_table?.find((row: any) => row.project_name === projectName);
    if (!originalRow) return;
    const nextTable = factoringTable.map((row) => row.project_name === projectName ? JSON.parse(JSON.stringify(originalRow)) : row);
    recalculateResult(nextTable);
  };

  const confidenceClass =
    confidence.toLowerCase() === "high"
      ? "high"
      : confidence.toLowerCase() === "medium"
        ? "medium"
        : "low";

  const modal = (
    <div
      className="map-agent-modal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="val-report-title"
        className="map-agent-modal map-agent-val-report-modal"
      >
        {/* Header */}
        <header className="map-agent-modal-header">
          <div>
            <span className="indigo">VALUATION REPORT</span>
            <h2 id="val-report-title">
              {subject?.project_name || "Subject Property"}
            </h2>
            <p>
              <MapPin />
              {subject?.location_name || selection.location || `${selection.coordinates.lat.toFixed(5)}, ${selection.coordinates.lng.toFixed(5)}`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close valuation report"
            onClick={onClose}
            className="map-agent-icon-button"
          >
            <X />
          </button>
        </header>

        <div className="map-agent-modal-body">
          {/* Hero rate card */}
          <section className="map-agent-report-hero">
            <div>
              <span><TrendingUp /> Final valuation result</span>
              <h3>
                {finalRate != null
                  ? `${currency} ${fmt(finalRate)} / ${areaUnit}`
                  : "Rate pending"}
              </h3>
              {rateRange && (
                <p>
                  Range: {currency} {fmt(rateRange.low)} â€“ {currency} {fmt(rateRange.high)} / {areaUnit}
                </p>
              )}
            </div>
            <div className="map-agent-rate-chip">
              <span>Confidence</span>
              <strong className={`map-agent-confidence-badge ${confidenceClass}`}>
                <ShieldCheck /> {confidence}
              </strong>
            </div>
          </section>

          {/* Market value summary */}
          {marketValue && (
            <section className="map-agent-summary-grid">
              <div>
                <span>Market value</span>
                <strong>{currency} {fmt(marketValue)}</strong>
              </div>
              {valueRange && (
                <>
                  <div>
                    <span>Value (low)</span>
                    <strong>{currency} {fmt(valueRange.low)}</strong>
                  </div>
                  <div>
                    <span>Value (high)</span>
                    <strong>{currency} {fmt(valueRange.high)}</strong>
                  </div>
                </>
              )}
              <div>
                <span>Methodology</span>
                <strong>{methodology}</strong>
              </div>
              <div>
                <span>Property type</span>
                <strong>{result.property_type || subject?.property_type || "--"}</strong>
              </div>
              <div>
                <span>Rate basis</span>
                <strong>{result.rate_basis || "Built-up"}</strong>
              </div>
            </section>
          )}

          {/* Comparable factoring table */}
          {factoringTable.length > 0 && (
            <section>
              <h3><TrendingUp /> Comparable Factoring Table</h3>
              <div className="map-agent-comparable-table map-agent-report-table">
                <div className="map-agent-report-table-header">
                  <span>Project Name</span>
                  <span>Road Type</span>
                  <span>Amenity</span>
                  <span>Density Score</span>
                  <span>CBD (km)</span>
                  <span>Avg Rate</span>
                  <span>Factor</span>
                  <span>Net Factored Rate</span>
                </div>
                {factoringTable.map((row: any, i: number) => (
                  <div key={i} className={row.role === "SUBJECT" ? "selected" : ""}>
                    <span>
                      <strong>{row.project_name || "--"}</strong>
                      <small>{row.role === "SUBJECT" ? "Subject" : row.location || row.role || ""}</small>
                    </span>
                    <span>{row.road_type || "--"}</span>
                    <span>{fmtAmenity(row.amenity_summary)}</span>
                    <span>{row.builtup_density_score != null ? Number(row.builtup_density_score).toFixed(1) : "--"}</span>
                    <span>{row.cbd_nearest_km != null ? Number(row.cbd_nearest_km).toFixed(1) : "--"}</span>
                    <span>{row.avg_rate != null ? `${currency} ${fmt(row.avg_rate)}` : "--"}</span>
                    <span>{row.role === "SUBJECT" ? "Base" : fmtFactor(row.total_factor)}</span>
                    <span>{row.factored_rate != null ? `${currency} ${fmt(row.factored_rate)}` : "--"}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {comparableRows.length > 0 && comparableRows.some((row) => row.factor_reasoning || row.factor_road != null || row.factor_amenity != null || row.factor_density != null || row.factor_cbd != null) && (
            <section className="map-agent-factor-controls">
              <div className="map-agent-factor-controls-heading">
                <h3>Factor Adjustment Controls</h3>
                <p>Each factor capped at +/-5% and total adjustment capped at +/-{(capLimit * 100).toFixed(0)}% per comparable.</p>
              </div>
              <div className="map-agent-factor-controls-grid">
                {comparableRows.map((row: any, index: number) => {
                  const modified = isProjectModified(row.project_name);
                  const capped = isCapped(row);
                  const factorItems = [
                    { key: "factor_road", label: "Road Type Adjustment", value: Number(row.factor_road || 0) },
                    { key: "factor_amenity", label: "Amenity Adjustment", value: Number(row.factor_amenity || 0) },
                    { key: "factor_density", label: "Density Score Adjustment", value: Number(row.factor_density || 0) },
                    { key: "factor_cbd", label: "CBD Distance Adjustment", value: Number(row.factor_cbd || 0) },
                  ];

                  return (
                    <div key={`${row.project_name || "factor"}-${index}`} className="map-agent-factor-card">
                      <div className="map-agent-factor-card-header">
                        <div>
                          <strong>{row.project_name || "Comparable Project"}</strong>
                          {modified && <span>Edited</span>}
                        </div>
                        {modified && (
                          <button type="button" onClick={() => handleResetProject(row.project_name)}>
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="map-agent-factor-slider-list">
                        {factorItems.map((factor) => {
                          const sliderValue = Math.round(factor.value * 1000);
                          return (
                            <div key={factor.key} className="map-agent-factor-slider">
                              <div className="map-agent-factor-slider-label">
                                <span>{factor.label}</span>
                                <strong className={factorColorClass(factor.value)}>{fmtFactor(factor.value)}</strong>
                              </div>
                              <div className="map-agent-factor-slider-row">
                                <button
                                  type="button"
                                  onClick={() => handleFactorChange(row.project_name, factor.key, Math.max(-50, sliderValue - 1) / 10)}
                                  disabled={sliderValue <= -50}
                                  aria-label={`Decrease ${factor.label}`}
                                >
                                  -
                                </button>
                                <input
                                  type="range"
                                  min="-50"
                                  max="50"
                                  step="1"
                                  value={sliderValue}
                                  onChange={(event) => handleFactorChange(row.project_name, factor.key, Number(event.target.value) / 10)}
                                  aria-label={factor.label}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleFactorChange(row.project_name, factor.key, Math.min(50, sliderValue + 1) / 10)}
                                  disabled={sliderValue >= 50}
                                  aria-label={`Increase ${factor.label}`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="map-agent-factor-net">
                        <span>Net Correction:</span>
                        <div>
                          {capped && <em>Capped at +/-{(capLimit * 100).toFixed(0)}%</em>}
                          <strong className={factorColorClass(row.total_factor)}>{fmtFactor(row.total_factor)}</strong>
                        </div>
                      </div>

                      {row.factor_reasoning && (
                        <div className="map-agent-factor-reasoning">
                          <span>Expert Baseline Reasoning:</span>
                          <p>{row.factor_reasoning}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {blending && (blending.w1 !== undefined || blending.w2 !== undefined || blending.factored_comp_avg !== undefined || subjectOwnRate > 0) && (
            <section className="map-agent-blending-card">
              <div className="map-agent-blending-header">
                <div className="map-agent-blending-title">
                  <span>W</span>
                  <div>
                    <h3>Appraisal Blending & Weights</h3>
                    <p>Adjust confidence weight balance for final valuation</p>
                  </div>
                </div>
                {isWeightsModified() && (
                  <button type="button" onClick={handleResetWeights}>
                    Reset Weights
                  </button>
                )}
              </div>

              <div className="map-agent-blending-body">
                <div className="map-agent-blending-summary">
                  <div className="map-agent-blending-formula">
                    <span>Formula:</span>
                    <strong>Blended Rate = (W1 * Subject Rate) + (W2 * Comparables Avg)</strong>
                  </div>
                  <div className="map-agent-blending-stat-grid">
                    <div>
                      <span>Subject Rate:</span>
                      <strong className="subject">{subjectOwnRate ? `${currency} ${fmt(subjectOwnRate)}` : "--"}</strong>
                      <small>({blending.subject_listing_count ?? subjectListings} listings)</small>
                    </div>
                    <div>
                      <span>Comparables Avg:</span>
                      <strong className="comparable">{factoredCompAvg ? `${currency} ${fmt(factoredCompAvg)}` : "--"}</strong>
                      <small>(from {comparableRows.length} comparables)</small>
                    </div>
                  </div>
                </div>

                <div className="map-agent-blending-sliders">
                  {subjectListings > 0 ? (
                    <>
                      <label>
                        <span>Subject Weight (W1)</span>
                        <strong>{Math.round(subjectWeight * 100)}%</strong>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.round(subjectWeight * 100)}
                          onChange={(event) => handleWeightChange(Number(event.target.value) / 100)}
                        />
                      </label>
                      <label>
                        <span>Comparable Weight (W2)</span>
                        <strong className="comparable">{Math.round(comparableWeight * 100)}%</strong>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.round(comparableWeight * 100)}
                          onChange={(event) => handleWeightChange(1 - Number(event.target.value) / 100)}
                        />
                      </label>
                    </>
                  ) : (
                    <div className="map-agent-blending-locked">
                      <strong>Weights Locked</strong>
                      <p>Subject property has 0 listings. Valuation is weighted 100% on the average of the selected market comparables.</p>
                    </div>
                  )}
                </div>
              </div>

              {blending.weight_reasoning && (
                <p className="map-agent-blending-note">Note: {blending.weight_reasoning}</p>
              )}
            </section>
          )}

          <section className="map-agent-derived-value-card">
            <div className="map-agent-derived-rate-side">
              <span>Derived Rate</span>
              <strong>{finalRate != null ? `${currency} ${fmt(Number(finalRate))}` : "--"}<small>/ {areaUnit}</small></strong>
              {displayRateRange && (
                <div className="map-agent-derived-range rate">
                  <span>Indicative Rate Range</span>
                  <strong>{currency} {fmt(displayRateRange.low)} - {currency} {fmt(displayRateRange.high)}/{areaUnit}</strong>
                  <small>{rangeLabel}</small>
                </div>
              )}
              {selectedArea > 0 ? (
                <p>Calculated on <b>{fmt(selectedArea)} {areaUnit}</b> of {areaInfo.label}</p>
              ) : (
                <p className="warning">Enter the subject area to view final valuation value.</p>
              )}
            </div>

            <div className="map-agent-valuation-value-side">
              <span>Valuation Value</span>
              <strong>{displayMarketValue > 0 ? `${currency} ${fmt(displayMarketValue)}` : "--"}</strong>
              {displayValueRange && (
                <div className="map-agent-derived-range value">
                  <span>Indicative Value Range</span>
                  <strong>{currency} {fmt(displayValueRange.low)} - {currency} {fmt(displayValueRange.high)}</strong>
                  <small>{rangeLabel}</small>
                </div>
              )}
              {selectedArea > 0 && finalRate != null && (
                <p>{currency} {fmt(Number(finalRate))}/{areaUnit} x {fmt(selectedArea)} {areaUnit} ({areaInfo.label})</p>
              )}
            </div>
          </section>

          {/* Valuation details */}
          {details && Object.keys(details).length > 0 && (
            <section>
              <h3><ShieldCheck /> Valuation Details</h3>
              <div className="map-agent-summary-grid">
                {details.base_rate != null && <div><span>Base rate</span><strong>{currency} {fmt(details.base_rate)} / {areaUnit}</strong></div>}
                {details.derived_rate != null && <div><span>Derived rate</span><strong>{currency} {fmt(details.derived_rate)} / {areaUnit}</strong></div>}
                {details.total_net_adjustment != null && <div><span>Net adjustment</span><strong>{Number(details.total_net_adjustment).toFixed(2)}%</strong></div>}
                {details.confidence_range_pct != null && <div><span>Confidence range</span><strong>Â±{details.confidence_range_pct}%</strong></div>}
              </div>
            </section>
          )}

          {/* Reasoning audit */}
          {Object.keys(reasoning).length > 0 && (
            <section>
              <h3>Reasoning Audit</h3>
              <div className="map-agent-evidence-box">
                {reasoning.stage_1_scoring_thought && <p><strong>Stage 1:</strong> {reasoning.stage_1_scoring_thought}</p>}
                {reasoning.stage_2_adjustment_thought && <p><strong>Stage 2:</strong> {reasoning.stage_2_adjustment_thought}</p>}
                {reasoning.final_reflection && <p><strong>Reflection:</strong> {reasoning.final_reflection}</p>}
                {reasoning.key_drivers && <p><strong>Key drivers:</strong> {reasoning.key_drivers}</p>}
                {reasoning.uncertainties && <p><strong>Uncertainties:</strong> {reasoning.uncertainties}</p>}
              </div>
            </section>
          )}

          {/* Note / disclaimer */}
          {note && (
            <section>
              <div className="map-agent-evidence-box">
                <p>{note}</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// Comparable Modal is now imported from ./ComparableModal
