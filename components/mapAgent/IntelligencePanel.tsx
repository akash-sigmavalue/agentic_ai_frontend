"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Activity, AlertCircle, ArrowUpRight, Loader2, MapPin, Search, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { MapAgentAnalyzeResponse, MapAgentSelection } from "./data";
import ValuationTab from "./ValuationTab";

type ReportType = "valuation" | "market";
type Tab = "market" | "valuation";

type Comparable = Record<string, any>;

type ValuationMapState = {
  subject: (Comparable & { lat: number; lng: number }) | null;
  comparables: Comparable[];
  radiusKm: number | null;
  focusNonce: number;
};

type IntelligencePanelProps = {
  selection: MapAgentSelection;
  analysisResult: MapAgentAnalyzeResponse | null;
  onSelectionChange: Dispatch<SetStateAction<MapAgentSelection | null>>;
  onAnalysisComplete: (result: MapAgentAnalyzeResponse | null) => void;
  onClose: () => void;
  onOpenReport: (tab: ReportType) => void;
  valuationMapState: ValuationMapState;
  onValuationMapStateChange: (state: ValuationMapState | ((current: ValuationMapState) => ValuationMapState)) => void;
  onOpenComparable: (comp: Comparable) => void;
  // Comparable panel — lifted to FullScreenMap so it renders beside this panel
  selectedComparables: Set<number>;
  onSelectedComparablesChange: Dispatch<SetStateAction<Set<number>>>;
  showComparablesPanel: boolean;
  onShowComparablesPanel: Dispatch<SetStateAction<boolean>>;
  onSetConfirmCallback: (cb: (() => void) | null) => void;
};

const PROPERTY_TYPES = ["plot", "villa", "shop", "office", "flate"];

export default function IntelligencePanel({
  selection,
  analysisResult,
  onSelectionChange,
  onAnalysisComplete,
  onClose,
  onOpenReport,
  valuationMapState,
  onValuationMapStateChange,
  onOpenComparable,
  selectedComparables,
  onSelectedComparablesChange,
  showComparablesPanel,
  onShowComparablesPanel,
  onSetConfirmCallback,
}: IntelligencePanelProps) {
  const [tab, setTab] = useState<Tab>("market");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggerValuation, setTriggerValuation] = useState(0);
  const [triggerFetchListings, setTriggerFetchListings] = useState(0);
  const [error, setError] = useState("");

  const canSubmit = Boolean(
    selection.projectName.trim() &&
      selection.location.trim() &&
      selection.propertyType.trim() &&
      !isSubmitting,
  );

  const sourceCount = useMemo(() => {
    if (!analysisResult) return 0;
    return (
      (analysisResult.data.openai_intelligence?.length || 0) +
      (analysisResult.data.gemini_intelligence?.length || 0)
    );
  }, [analysisResult]);

  const updateField = (field: keyof Pick<MapAgentSelection, "projectName" | "location" | "propertyType">, value: string) => {
    onSelectionChange((current) => (current ? { ...current, [field]: value } : current));
  };

  const submitAnalysis = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError("");
    onAnalysisComplete(null);

    try {
      const result = await apiFetch<MapAgentAnalyzeResponse>("/map-agent/analyze", {
        method: "POST",
        body: JSON.stringify({
          projectName: selection.projectName.trim(),
          location: selection.location.trim(),
          propertyType: selection.propertyType.trim(),
        }),
      });
      onAnalysisComplete(result);
      setTriggerValuation(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    onSetConfirmCallback(() => {
      setTriggerFetchListings(prev => prev + 1);
    });
  }, [onSetConfirmCallback]);

  return (
    <aside className="map-agent-panel" aria-label="Location intelligence report">
      <div className="map-agent-panel-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="map-agent-pin-icon"><MapPin /></span>
          <div className="min-w-0">
            <p>{selection.projectName || "Selected Location"}</p>
            <span>{selection.coordinates.lat.toFixed(5)}, {selection.coordinates.lng.toFixed(5)}</span>
          </div>
        </div>
        <button type="button" aria-label="Close location report" title="Close report" onClick={onClose} className="map-agent-icon-button"><X /></button>
      </div>

      {tab === "market" && (
        <div className="map-agent-activity-banner">
          <span className="map-agent-activity-icon">
            {selection.lookupStatus === "resolving" ? <Loader2 className="map-agent-spin-icon" /> : <Activity />}
          </span>
          <div>
            <strong>{selection.lookupStatus === "resolving" ? "Resolving location" : "Market intelligence ready"}</strong>
            <p>
              {selection.lookupStatus === "failed"
                ? "Google lookup unavailable. Enter details manually."
                : selection.lookupStatus === "resolving"
                ? "Finding nearby project and locality"
                : "Confirm details before analysis"}
            </p>
          </div>
          <span className="map-agent-live-badge"><i /> LIVE AREA</span>
        </div>
      )}

      <div className="map-agent-tabs" role="tablist" aria-label="Intelligence report type">
        <button type="button" role="tab" aria-selected={tab === "market"} onClick={() => setTab("market")} className={tab === "market" ? "active market" : ""}>Market Research</button>
        <button type="button" role="tab" aria-selected={tab === "valuation"} onClick={() => setTab("valuation")} className={tab === "valuation" ? "active valuation" : ""}>Valuation</button>
      </div>

      <div className={`map-agent-panel-content ${tab === "valuation" ? "valuation-tab-active" : ""}`}>
        <div style={{ display: tab === "market" ? "block" : "none" }}>
          <div className="map-agent-form" role="tabpanel">
            <label>
              <span>Project name</span>
              <input
                value={selection.projectName}
                onChange={(event) => updateField("projectName", event.target.value)}
                placeholder="Enter project or place name"
              />
            </label>

            <label>
              <span>Location</span>
              <input
                value={selection.location}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="Enter locality, city"
              />
            </label>

            <label>
              <span>Property type</span>
              <select value={selection.propertyType} onChange={(event) => updateField("propertyType", event.target.value)}>
                {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>

            {selection.formattedAddress && <p className="map-agent-help-text">Google address: {selection.formattedAddress}</p>}
            {selection.lookupError && <p className="map-agent-warning-text"><AlertCircle />{selection.lookupError}</p>}
            {error && <p className="map-agent-error-text"><AlertCircle />{error}</p>}

            <button type="button" onClick={submitAnalysis} disabled={!canSubmit} className="map-agent-submit-button">
              {isSubmitting ? <Loader2 className="map-agent-spin-icon" /> : <Search />}
              {isSubmitting ? "Analyzing..." : "Analyze Market"}
            </button>

            {analysisResult && (
              <div className="map-agent-result-card">
                <span>Analysis complete</span>
                <strong>{sourceCount} pricing record{sourceCount === 1 ? "" : "s"} found</strong>
                <p>
                  Tokens: {analysisResult.tokens_used ?? 0}
                  {analysisResult.estimated_cost != null ? ` · Est. $${analysisResult.estimated_cost}` : ""}
                </p>
                <button type="button" onClick={() => onOpenReport("market")} className="map-agent-report-button bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500">
                  View Report <ArrowUpRight />
                </button>
              </div>
            )}
          </div >
        </div>
        
        <div 
          className="map-agent-valuation-tab-shell w-full min-w-0 overflow-hidden px-2 pb-0"
          style={{ display: tab === "valuation" ? "block" : "none" }}
        >
          <ValuationTab
            key={`${selection.placeId || "map"}-${selection.coordinates.lat}-${selection.coordinates.lng}-${selection.projectName}-${selection.location}`}
            selection={selection}
            valuationMapState={valuationMapState}
            onValuationMapStateChange={onValuationMapStateChange}
            onOpenComparable={onOpenComparable}
            triggerRun={triggerValuation}
            autoOpen={true}
            selectedComparables={selectedComparables}
            onSelectedComparablesChange={onSelectedComparablesChange}
            showComparablesModal={showComparablesPanel}
            onShowComparablesModalChange={onShowComparablesPanel}
            triggerFetchListings={triggerFetchListings}
          />
        </div>
      </div>
      {/* ComparableModal is now rendered in FullScreenMap as a side panel */}
    </aside>
  );
}

