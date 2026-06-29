"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { CheckCircle2, ChevronLeft, Table2, X, MapPin, TrendingUp, Shield } from "lucide-react";
import { useMemo, useState } from "react";

type ComparableSelectionPanelProps = {
  comparables: any[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  onOpenDetails: (comp: any) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ComparableSelectionPanel({
  comparables,
  selectedIndices,
  onToggle,
  onOpenDetails,
  onClose,
  onConfirm,
}: ComparableSelectionPanelProps) {
  const [sourceFilter, setSourceFilter] = useState<"all" | "Web" | "Internal DB">("all");

  const sourceCounts = useMemo(() => ({
    all: comparables.length,
    Web: comparables.filter((comp) => (comp.data_source || comp.source || "Web") !== "Internal DB").length,
    "Internal DB": comparables.filter((comp) => (comp.data_source || comp.source || "Web") === "Internal DB").length,
  }), [comparables]);

  const visibleComparables = useMemo(() => (
    comparables
      .map((comp, index) => ({ comp, originalIndex: index }))
      .filter(({ comp }) => {
        const source = comp.data_source || comp.source || "Web";
        if (sourceFilter === "all") return true;
        if (sourceFilter === "Web") return source !== "Internal DB";
        return source === "Internal DB";
      })
  ), [comparables, sourceFilter]);

  const allSelected = visibleComparables.length > 0 && visibleComparables.every(({ originalIndex }) => selectedIndices.has(originalIndex));

  const toggleAll = () => {
    if (allSelected) {
      visibleComparables.forEach(({ originalIndex }) => { if (selectedIndices.has(originalIndex)) onToggle(originalIndex); });
    } else {
      visibleComparables.forEach(({ originalIndex }) => { if (!selectedIndices.has(originalIndex)) onToggle(originalIndex); });
    }
  };

  return (
    <aside
      className="map-agent-comparable-side-panel"
      aria-label="Select comparable projects"
    >
      {/* Header */}
      <div className="map-agent-comparable-side-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="map-agent-comparable-side-icon">
            <Table2 />
          </div>
          <div className="min-w-0">
            <p className="map-agent-comparable-side-title">Select Comparables</p>
            <span className="map-agent-comparable-side-subtitle">
              {comparables.length} projects found · {selectedIndices.size} selected
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close comparable panel"
          onClick={onClose}
          className="map-agent-icon-button"
        >
          <X />
        </button>
      </div>

      {/* Select All */}
      <div className="map-agent-comparable-side-selectall">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            className="map-agent-comp-checkbox"
            checked={allSelected}
            disabled={visibleComparables.length === 0}
            onChange={toggleAll}
          />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {allSelected ? "Deselect Shown" : "Select Shown"}
          </span>
        </label>
        <div className="map-agent-comparable-source-tabs" role="tablist" aria-label="Comparable source">
          {[
            { key: "all", label: "All", count: sourceCounts.all },
            { key: "Web", label: "Web", count: sourceCounts.Web },
            { key: "Internal DB", label: "DB", count: sourceCounts["Internal DB"] },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={sourceFilter === tab.key}
              className={sourceFilter === tab.key ? "active" : ""}
              onClick={() => setSourceFilter(tab.key as "all" | "Web" | "Internal DB")}
            >
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <span className="map-agent-comparable-side-count-badge">
          {selectedIndices.size}/{visibleComparables.length}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="map-agent-comparable-side-list custom-scrollbar">
        {visibleComparables.map(({ comp, originalIndex }) => {
          const isSelected = selectedIndices.has(originalIndex);
          const confidence = comp.confidence_score ?? comp.confidence_tier;
          const confNum = typeof confidence === "number" ? confidence : null;
          const confLabel = confNum !== null
            ? (confNum > 80 ? "high" : confNum > 50 ? "medium" : "low")
            : typeof confidence === "string" ? confidence.toLowerCase() : "medium";

          return (
            <div
              key={`${comp.project_name || "comparable"}-${originalIndex}`}
              className={`map-agent-comparable-side-item ${isSelected ? "selected" : ""}`}
              onClick={() => onToggle(originalIndex)}
            >
              {/* Checkbox + selection indicator */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="map-agent-comp-checkbox mt-0.5 shrink-0"
                  checked={isSelected}
                  onChange={() => onToggle(originalIndex)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="map-agent-comparable-side-name">
                      {comp.project_name || "Comparable Project"}
                    </strong>
                    <span className={`map-agent-comp-confidence-badge ${confLabel}`}>
                      {confNum !== null ? `${confNum}` : confidence || "—"}
                    </span>
                  </div>

                  <p className="map-agent-comparable-side-location">
                    <MapPin className="inline h-3 w-3 mr-1 opacity-60" />
                    {comp.location || comp.location_name || "—"}
                  </p>

                  <div className="map-agent-comp-meta-row">
                    {comp.distance_from_subject_km != null && (
                      <span className="map-agent-comp-meta-chip">
                        📍 {comp.distance_from_subject_km} km
                      </span>
                    )}
                    {(comp.data_source || comp.source) && (
                      <span className="map-agent-comp-meta-chip">
                        {comp.data_source === "Internal DB" ? "🗄️ DB" : "🌐 Web"}
                      </span>
                    )}
                    {comp.possession_status && (
                      <span className="map-agent-comp-meta-chip">
                        {comp.possession_status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details link */}
              <button
                type="button"
                className="map-agent-comp-details-btn"
                onClick={(e) => { e.stopPropagation(); onOpenDetails(comp); }}
              >
                View Details →
              </button>
            </div>
          );
        })}
        {visibleComparables.length === 0 && (
          <div className="map-agent-comparable-side-empty">
            No {sourceFilter === "Internal DB" ? "DB" : sourceFilter === "Web" ? "Web" : ""} comparables found.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="map-agent-comparable-side-footer">
        <div className="map-agent-comparable-side-footer-info">
          <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-cyan-400">{selectedIndices.size}</strong> projects selected for listing analysis
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="map-agent-comp-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={selectedIndices.size === 0}
            className="map-agent-comp-confirm-btn"
          >
            Confirm & Proceed →
          </button>
        </div>
      </div>
    </aside>
  );
}
