import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  getRowKey,
  filterAndSortList,
  formatGeocodeSource,
  formatPrice,
} from "../chat-utils";
import TableHeaderCell from "./TableHeaderCell";
import RoadTypeBadge from "./RoadTypeBadge";

// ── Drop Stage Config ─────────────────────────────────────────────
const DROP_STAGE_CONFIG = {
  type_filter: { label: "Type Mismatch", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  geocode: { label: "Geocode Failed", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  distance_filter: { label: "Too Far (>15km)", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  url_filter: { label: "Bad URL", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  dedup: { label: "Duplicate", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  subject_filter: { label: "Subject Match", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const INITIAL_COMPARABLE_RADIUS_KM = 2;

function getComparableDistanceKm(comp) {
  const rawDistance = comp?.distance_from_subject_km;
  if (rawDistance === null || rawDistance === undefined || rawDistance === "") return null;
  const distance = Number(String(rawDistance).replace(/[^\d.-]/g, ""));
  return Number.isFinite(distance) ? distance : null;
}

function EditableCoordCell({ value, onSave, placeholder = "—" }) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value ?? "");

  // Update temp value when prop changes
  useState(() => {
    setTempValue(value ?? "");
  }, [value]);

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (tempValue !== String(value ?? "")) {
            onSave(tempValue);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (tempValue !== String(value ?? "")) {
              onSave(tempValue);
            }
          } else if (e.key === "Escape") {
            setEditing(false);
            setTempValue(value ?? "");
          }
        }}
        className="w-20 rounded border border-amber-500 bg-bg-input px-1.5 py-0.5 font-mono text-[10px] text-warning text-right outline-none shadow-sm"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit coordinate"
      className="group inline-flex items-center gap-1 rounded px-1 py-0.5 font-mono text-warning/90 hover:bg-warning/10 hover:text-warning text-right transition cursor-pointer"
    >
      <span>{value != null && value !== "" ? value : placeholder}</span>
      <span className="opacity-0 group-hover:opacity-100 text-[9px]">✏️</span>
    </button>
  );
}

function MobileComparableRow({
  comp,
  index,
  originalIndex,
  isChecked,
  isDroppedTab,
  selectable,
  onSelect,
  onRestore,
  onUpdateCoordinates,
  onResetCoordinates,
}) {
  const [expanded, setExpanded] = useState(false);
  const score = comp.confidence_score;
  const confidenceTier = comp.confidence_tier || (score >= 80 ? "High" : score >= 60 ? "Medium" : score >= 40 ? "Low" : "Very Low");
  const confidenceColor = confidenceTier === "High"
    ? "text-success"
    : confidenceTier === "Medium"
      ? "text-amber-400"
      : confidenceTier === "Low"
        ? "text-orange-400"
        : "text-danger";
  const coordinateSource = formatGeocodeSource(
    comp.geocode_source || (comp.data_source === "Internal DB" ? "internal_db" : null)
  );
  const hasCoordinateOverride = comp.geocode_source === "user_override" || comp.original_map_search_lat !== undefined;

  return (
    <div className={`transition-colors ${isDroppedTab ? "bg-amber-500/[0.03]" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {selectable ? (
          <input
            type="checkbox"
            checked={isChecked || false}
            onChange={onSelect}
            className="h-4 w-4 shrink-0 cursor-pointer rounded accent-[#fb923c]"
            aria-label={`Select ${comp.project_name || "comparable project"}`}
          />
        ) : (
          <span className="w-5 shrink-0 text-[10px] font-mono text-text-dim">{index + 1}</span>
        )}

        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-tight text-text-primary">
              {comp.project_name || "—"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded border border-border/50 bg-bg-input px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent-light">
                {comp.project_category || comp.property_type || "Comparable"}
              </span>
              <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${isDroppedTab
                ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
                : comp.data_source === "Internal DB"
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                  : "border-blue-500/30 bg-blue-500/15 text-blue-400"
                }`}>
                {isDroppedTab ? "Dropped" : comp.data_source === "Internal DB" ? "DB" : "Web"}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-mono text-[12px] font-bold text-[#fb923c]">
              {comp.distance_from_subject_km ? `${comp.distance_from_subject_km} km` : "—"}
            </p>
            <p className="text-[9px] text-text-dim">Distance</p>
          </div>

          <ChevronRight
            size={14}
            className={`shrink-0 text-text-dim transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {expanded && (
        <div className="space-y-1.5 border-t border-white/[0.04] bg-white/[0.01] px-4 pb-3 pt-1.5">
          {[
            ["Location", comp.location || "—"],
            ["Country", comp.country || "—"],
            ["Property Type", comp.property_type || "—"],
            ["Status", comp.possession_status || "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-white/[0.04] py-1.5">
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-text-dim">{label}</span>
              <span className="text-right text-[11px] text-text-secondary">{value}</span>
            </div>
          ))}

          {!isDroppedTab && score !== undefined && score !== null && (
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-text-dim">Confidence</span>
              <span className={`text-[11px] font-bold ${confidenceColor}`}>{score} · {confidenceTier}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-text-dim">Latitude</span>
            <EditableCoordCell
              value={comp.map_search_lat}
              onSave={(newLat) => onUpdateCoordinates?.(originalIndex, newLat, comp.map_search_lng, isDroppedTab || undefined)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-text-dim">Longitude</span>
            <EditableCoordCell
              value={comp.map_search_lng}
              onSave={(newLng) => onUpdateCoordinates?.(originalIndex, comp.map_search_lat, newLng, isDroppedTab || undefined)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-text-dim">Coordinate Source</span>
            <div className="flex items-center gap-1.5">
              <span className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${coordinateSource.color}`}>
                {coordinateSource.label}
              </span>
              {hasCoordinateOverride && (
                <button
                  type="button"
                  onClick={() => onResetCoordinates?.(originalIndex, isDroppedTab || undefined)}
                  className="rounded border border-border bg-bg-input px-1.5 py-0.5 text-[9px] font-bold text-text-dim"
                >
                  ↺ Reset
                </button>
              )}
            </div>
          </div>

          {(isDroppedTab ? (comp.drop_detail || comp.drop_reason) : (comp.reason || comp.confidence_reasoning)) && (
            <div className="flex items-start justify-between gap-4 py-1.5">
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-text-dim">
                {isDroppedTab ? "Drop Reason" : "Reason"}
              </span>
              <span className="text-right text-[10px] leading-relaxed text-text-secondary">
                {isDroppedTab ? (comp.drop_detail || comp.drop_reason) : (comp.reason || comp.confidence_reasoning)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            {comp.source_url && (
              <a
                href={comp.source_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-blue-400"
              >
                Open Source ↗
              </a>
            )}
            {isDroppedTab && (
              <button
                type="button"
                onClick={onRestore}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400"
              >
                ✓ Restore
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DroppedComparableTable({ droppedComparables, onRestore, selectable, onUpdateCoordinates, onResetCoordinates }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedDropped, setSelectedDropped] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [filterConfig, setFilterConfig] = useState({});

  const dropList = useMemo(() => droppedComparables || [], [droppedComparables]);

  // Count per stage
  const stageCounts = useMemo(() => {
    const counts = {};
    dropList.forEach(c => {
      const stage = c.drop_stage || "unknown";
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [dropList]);

  const filteredDropped = useMemo(() => {
    return stageFilter === "all"
      ? dropList
      : dropList.filter(c => c.drop_stage === stageFilter);
  }, [dropList, stageFilter]);

  const indexedDropped = useMemo(() => {
    return filteredDropped.map((comp, idx) => ({
      comp,
      originalIndex: dropList.indexOf(comp),
      distanceKm: getComparableDistanceKm(comp),
    }));
  }, [filteredDropped, dropList]);

  const processedDropped = useMemo(() => {
    return filterAndSortList(indexedDropped, sortConfig, filterConfig);
  }, [indexedDropped, sortConfig, filterConfig]);

  if (dropList.length === 0) return null;

  const handleToggle = (originalIndex, checked) => {
    setSelectedDropped(prev => {
      const next = new Set(prev);
      if (checked) next.add(originalIndex);
      else next.delete(originalIndex);
      return next;
    });
  };

  const handleRestoreSelected = () => {
    if (selectedDropped.size === 0) return;
    const toRestore = Array.from(selectedDropped).map(i => dropList[i]).filter(Boolean);
    onRestore?.(toRestore);
    setSelectedDropped(new Set());
  };

  const allVisibleSelected = processedDropped.length > 0 && processedDropped.every(({ originalIndex }) => selectedDropped.has(originalIndex));

  const renderTable = (maxHeightClass = "") => (
    <div className="relative">
      <div className={`overflow-x-auto ${maxHeightClass} custom-scrollbar`}>
        <table className="w-full min-w-max text-left text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-[#161922] border-b border-border shadow-md">
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.04em] text-text-dim">
              {selectable && (
                <th className="px-3 py-2.5 font-semibold">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => {
                      if (allVisibleSelected) {
                        processedDropped.forEach(({ originalIndex }) => handleToggle(originalIndex, false));
                      } else {
                        processedDropped.forEach(({ originalIndex }) => handleToggle(originalIndex, true));
                      }
                    }}
                    className="h-3.5 w-3.5 cursor-pointer rounded accent-amber-500"
                  />
                </th>
              )}
              <TableHeaderCell columnKey="drop_stage" label="Drop Stage" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="drop_reason" label="Drop Reason" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="project_name" label="Project Name" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="location" label="Location" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="property_type" label="Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="distance_from_subject_km" label="Distance" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="map_search_lat" label="Lat ✏️" align="right" className="text-warning" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="map_search_lng" label="Lng ✏️" align="right" className="text-warning" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="geocode_source" label="Coord Source" className="whitespace-nowrap" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="drop_detail" label="Detail" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
              <TableHeaderCell columnKey="source_url" label="Source URL" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedDropped} />
            </tr>
          </thead>
          <tbody>
            {processedDropped.map(({ comp, originalIndex }) => {
              const isChecked = selectedDropped.has(originalIndex);
              const stageConf = DROP_STAGE_CONFIG[comp.drop_stage] || { label: comp.drop_stage || "Unknown", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" };
              return (
                <tr
                  key={`dropped-${comp.project_name}-${originalIndex}`}
                  className={`border-b border-border/50 transition ${isChecked ? "bg-amber-500/[0.08]" : "hover:bg-amber-500/[0.04]"}`}
                >
                  {selectable && (
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked || false}
                        onChange={() => handleToggle(originalIndex, !isChecked)}
                        className="h-3.5 w-3.5 cursor-pointer rounded accent-amber-500"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${stageConf.color}`}>
                      {stageConf.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary text-[10px] max-w-[200px] truncate" title={comp.drop_reason}>{comp.drop_reason || "—"}</td>
                  <td className="px-3 py-2.5 font-medium text-text-primary whitespace-nowrap">{comp.project_name || "—"}</td>
                  <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{comp.location || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-md border border-border bg-bg-input px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-light">
                      {comp.property_type || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-text-secondary whitespace-nowrap">{comp.distance_from_subject_km ? `${comp.distance_from_subject_km} km` : "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <EditableCoordCell
                      value={comp.map_search_lat}
                      onSave={(newLat) => onUpdateCoordinates?.(originalIndex, newLat, comp.map_search_lng)}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <EditableCoordCell
                      value={comp.map_search_lng}
                      onSave={(newLng) => onUpdateCoordinates?.(originalIndex, comp.map_search_lat, newLng)}
                    />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {(() => {
                      const isOverride = comp.geocode_source === "user_override" || comp.original_map_search_lat !== undefined;
                      const src = formatGeocodeSource(comp.geocode_source);
                      return (
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${src.color}`}>
                            {src.label}
                          </span>
                          {isOverride && (
                            <button
                              type="button"
                              onClick={() => onResetCoordinates?.(originalIndex)}
                              title="Reset to original fetched coordinates"
                              className="inline-flex items-center gap-0.5 rounded border border-border bg-bg-input px-1.5 py-0.5 text-[9px] font-bold text-text-dim hover:border-amber-500 hover:text-amber-400 transition cursor-pointer"
                            >
                              <span>↺</span>
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary text-[10px] max-w-[250px] truncate" title={comp.drop_detail}>{comp.drop_detail || "—"}</td>
                  <td className="px-3 py-2.5 text-text-secondary truncate max-w-[200px]">
                    {comp.source_url ? (
                      <a href={comp.source_url} target="_blank" rel="noreferrer" className="text-accent-light underline underline-offset-2 hover:text-accent font-medium">
                        {comp.source_url}
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {processedDropped.length === 0 && (
        <div className="px-4 py-6 text-center text-xs text-text-dim">
          No dropped projects match this filter.
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-amber-500/30 bg-bg-card shadow-panel transition-all duration-300">
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="w-full border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-left transition hover:bg-amber-500/[0.1] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-sm">⚠️</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-amber-400">
                {dropList.length} Dropped Project{dropList.length !== 1 ? "s" : ""} — Click to Review
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectable && selectedDropped.size > 0 && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  {selectedDropped.size} selected
                </span>
              )}
              <span className={`text-amber-400 text-xs transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▾</span>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            {/* Info bar */}
            <div className="border-b border-amber-500/10 bg-amber-500/[0.03] px-4 py-2">
              <p className="text-[10px] text-text-dim leading-relaxed">
                These projects were filtered out during comparable identification. Some may be genuine — review and restore if needed.
              </p>
            </div>

            {/* Stage filter pills */}
            <div className="flex items-center gap-1 px-4 py-2.5 flex-wrap">
              <button
                onClick={() => setStageFilter("all")}
                className={`rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition ${stageFilter === "all" ? "bg-amber-500 text-bg-deep shadow" : "text-text-dim hover:text-text-primary"}`}
              >
                All ({dropList.length})
              </button>
              {Object.entries(stageCounts).map(([stage, count]) => {
                const conf = DROP_STAGE_CONFIG[stage] || { label: stage };
                return (
                  <button
                    key={stage}
                    onClick={() => setStageFilter(stage)}
                    className={`rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition ${stageFilter === stage ? "bg-amber-500 text-bg-deep shadow" : "text-text-dim hover:text-text-primary"}`}
                  >
                    {conf.label} ({count})
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-2">
                {selectable && selectedDropped.size > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreSelected}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em] text-emerald-400 transition hover:border-emerald-500 hover:bg-emerald-500/20"
                  >
                    ✓ Restore Selected ({selectedDropped.size})
                  </button>
                )}
                <button
                  onClick={() => setIsMaximized(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-amber-500 hover:text-amber-500"
                  title="Maximize Table"
                >
                  ⛶
                </button>
              </div>
            </div>

            {renderTable("max-h-[300px] overflow-y-auto")}
          </div>
        )}
      </div>

      {/* Maximized (fullscreen) modal */}
      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-amber-500/30 bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/[0.06] px-6 py-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-lg">⚠️</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.05em] text-amber-400">Dropped Comparable Projects</h3>
                  <p className="text-[10px] text-text-dim">{dropList.length} projects filtered out — review and restore if needed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectable && selectedDropped.size > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreSelected}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400 transition hover:border-emerald-500 hover:bg-emerald-500/20"
                  >
                    ✓ Restore Selected ({selectedDropped.size})
                  </button>
                )}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-deep/50 p-0.5">
                  <button
                    onClick={() => setStageFilter("all")}
                    className={`rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition ${stageFilter === "all" ? "bg-amber-500 text-bg-deep shadow" : "text-text-dim hover:text-text-primary"}`}
                  >
                    All ({dropList.length})
                  </button>
                  {Object.entries(stageCounts).map(([stage, count]) => {
                    const conf = DROP_STAGE_CONFIG[stage] || { label: stage };
                    return (
                      <button
                        key={stage}
                        onClick={() => setStageFilter(stage)}
                        className={`rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition ${stageFilter === stage ? "bg-amber-500 text-bg-deep shadow" : "text-text-dim hover:text-text-primary"}`}
                      >
                        {conf.label} ({count})
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setIsMaximized(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="min-w-max border border-border rounded-2xl overflow-hidden">
                {renderTable("")}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function ComparisonModal({ projects, onClose }) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/90 p-4 backdrop-blur-md animate-in zoom-in-95 duration-200">
      <div className="flex h-[80vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-bg-input px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">⚖️</span>
            <h3 className="text-lg font-bold text-text-primary">Project Side-by-Side Comparison</h3>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border hover:bg-danger/10 hover:text-danger text-2xl transition">×</button>
        </div>

        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p, idx) => (
              <div key={idx} className={`flex flex-col rounded-2xl border p-5 ${p.is_subject ? 'border-purple-500/40 bg-purple-500/5' : 'border-border bg-bg-input/30'}`}>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {p.is_subject && <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-400 border border-purple-500/30">Subject</span>}
                    <h4 className="text-base font-bold text-text-primary truncate">{p.project_name}</h4>
                  </div>
                  <p className="text-xs text-text-dim">{p.listing_count} listings analyzed</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-border/50 pb-2">
                    <span className="text-xs text-text-dim">Median Rate</span>
                    <span className="text-lg font-bold text-accent-light">{formatPrice(p.median_rate, p.currency || "INR")}</span>
                  </div>

                  <div className="flex justify-between items-center bg-bg-deep/50 rounded-xl p-3">
                    <span className="text-xs text-text-dim">Road Type</span>
                    <RoadTypeBadge type={p.road_type} />
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

export default function ComparableTable({
  comparables,
  droppedComparables,
  selectedComps,
  onToggle,
  onRestoreDropped,
  selectable,
  onUpdateCoordinates,
  onResetCoordinates,
  showComparableActionInfo,
  onToggleComparableActionInfo,
  listingCollapsed = false,
  onToggleListingCollapsed,
}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showAllComparables, setShowAllComparables] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all"); // "all" | "Web" | "Internal DB" | "Dropped"
  const [selectedDropped, setSelectedDropped] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [filterConfig, setFilterConfig] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const compsList = useMemo(() => {
    return (comparables || []).filter(c => (!c.drop_stage && !c.isDropped) || c.restored);
  }, [comparables]);

  const dropList = useMemo(() => {
    const extraDropped = (comparables || []).filter(c => (c.drop_stage || c.isDropped) && !c.restored);
    const rawAll = [...(droppedComparables || []), ...extraDropped];
    const seen = new Set();
    const unique = [];
    for (const d of rawAll) {
      if (d.drop_stage === "dedup") continue; // Exclude scraper duplicate drops
      const name = (d.project_name || "").toLowerCase().trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        unique.push(d);
      }
    }
    return unique;
  }, [comparables, droppedComparables]);

  const isDroppedTab = sourceFilter === "Dropped";

  const filteredComparables = useMemo(() => {
    if (sourceFilter === "all") return compsList;
    if (sourceFilter === "Dropped") return dropList;
    return compsList.filter(c => (c.data_source || "Web") === sourceFilter);
  }, [compsList, dropList, sourceFilter]);

  const indexedComparables = useMemo(() => {
    const rawActive = comparables || [];
    const rawDropped = droppedComparables || [];
    return filteredComparables.map((comp) => {
      let originalIndex;
      if (isDroppedTab) {
        const idx = rawDropped.indexOf(comp);
        if (idx !== -1) {
          originalIndex = idx;
        } else {
          const targetName = (comp.project_name || "").toLowerCase().trim();
          const foundIdx = rawDropped.findIndex(x => (x.project_name || "").toLowerCase().trim() === targetName);
          originalIndex = foundIdx !== -1 ? foundIdx : 0;
        }
      } else {
        const idx = rawActive.indexOf(comp);
        if (idx !== -1) {
          originalIndex = idx;
        } else {
          const targetName = (comp.project_name || "").toLowerCase().trim();
          const foundIdx = rawActive.findIndex(x => (x.project_name || "").toLowerCase().trim() === targetName);
          originalIndex = foundIdx !== -1 ? foundIdx : 0;
        }
      }

      return {
        comp: isDroppedTab ? { ...comp, isDropped: true } : comp,
        originalIndex,
        distanceKm: getComparableDistanceKm(comp),
      };
    });
  }, [filteredComparables, isDroppedTab, comparables, droppedComparables]);

  const processedComparables = useMemo(() => {
    return filterAndSortList(indexedComparables, sortConfig, filterConfig);
  }, [indexedComparables, sortConfig, filterConfig]);

  const searchedComparables = useMemo(() => {
    if (!searchQuery.trim()) return processedComparables;
    const query = searchQuery.toLowerCase().trim();
    return processedComparables.filter(({ comp }) =>
      String(comp.project_name || "").toLowerCase().includes(query) ||
      String(comp.location || "").toLowerCase().includes(query)
    );
  }, [processedComparables, searchQuery]);

  const nearbyComparables = useMemo(() => {
    return searchedComparables.filter(({ distanceKm }) => distanceKm !== null && distanceKm <= INITIAL_COMPARABLE_RADIUS_KM);
  }, [searchedComparables]);

  if (compsList.length === 0 && dropList.length === 0) return null;

  const visibleComparables = (showAllComparables || isDroppedTab) ? searchedComparables : nearbyComparables;
  const hiddenComparableCount = Math.max(indexedComparables.length - nearbyComparables.length, 0);
  const hasHiddenComparables = hiddenComparableCount > 0 && !isDroppedTab;
  const visibleResultLabel = isDroppedTab
    ? `${dropList.length} dropped projects`
    : showAllComparables
      ? `${filteredComparables.length} results`
      : `${nearbyComparables.length} within ${INITIAL_COMPARABLE_RADIUS_KM} km`;
  const webCount = compsList.filter((c) => (c.data_source || "Web") === "Web").length;
  const transactionCount = compsList.filter((c) => c.data_source === "Internal DB").length;
  const stage3Summary = `Transaction - ${transactionCount} | Web - ${webCount}`;
  const allSelected = visibleComparables.length > 0 && visibleComparables.every(({ originalIndex }) => selectedComps?.has(originalIndex));
  const allDroppedSelected = visibleComparables.length > 0 && visibleComparables.every(({ comp }) => selectedDropped.has(comp));

  const renderTabBar = () => {
    const tabs = ["all", "Web", "Internal DB", "Dropped"].map(opt => {
      const count = opt === "all"
        ? compsList.length
        : opt === "Web"
          ? compsList.filter(c => (c.data_source || "Web") === "Web").length
          : opt === "Internal DB"
            ? compsList.filter(c => c.data_source === "Internal DB").length
            : dropList.length;

      if (opt === "Dropped" && count === 0) return null;

      const label = opt === "all" ? "All" : opt === "Internal DB" ? "Transaction" : opt === "Dropped" ? "Dropped" : opt;
      const isTabDropped = opt === "Dropped";

      return { opt, count, label, isTabDropped };
    }).filter(Boolean);

    return (
      <div className="w-full sm:w-auto sm:max-w-full shrink-0 min-w-0">
        {/* Mobile View: Vertical list to prevent horizontal overflow */}
        <div className="flex flex-col gap-1.5 w-full sm:hidden bg-bg-deep/80 p-1.5 rounded-xl border border-border/60">
          {tabs.map(({ opt, count, label, isTabDropped }) => (
            <button
              key={`mobile-${opt}`}
              type="button"
              onClick={() => setSourceFilter(opt)}
              className={`w-full flex items-center justify-center min-h-[36px] rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${sourceFilter === opt
                ? isTabDropped
                  ? "bg-amber-500 text-bg-deep shadow font-extrabold"
                  : "bg-[#fb923c] text-bg-deep shadow"
                : isTabDropped
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold"
                  : "bg-bg-input/60 text-text-secondary border border-border/40 hover:text-text-primary"
                }`}
            >
              {`${label} (${count})`}
            </button>
          ))}
          {isDroppedTab && selectedDropped.size > 0 && (
            <button
              type="button"
              onClick={() => {
                onRestoreDropped?.(Array.from(selectedDropped));
                setSelectedDropped(new Set());
              }}
              className="w-full flex items-center justify-center min-h-[36px] rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/25 transition cursor-pointer whitespace-nowrap animate-in fade-in"
            >
              ✓ Restore Selected ({selectedDropped.size})
            </button>
          )}
        </div>

        {/* Desktop Web View: Original horizontal pill tab bar */}
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-deep/70 p-0.5 shrink-0 flex-wrap">
            {tabs.map(({ opt, count, label, isTabDropped }) => (
              <button
                key={`desktop-${opt}`}
                type="button"
                onClick={() => setSourceFilter(opt)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition whitespace-nowrap ${sourceFilter === opt
                  ? isTabDropped
                    ? "bg-amber-500 text-bg-deep shadow font-extrabold"
                    : "bg-[#fb923c] text-bg-deep shadow"
                  : isTabDropped
                    ? "text-amber-400/90 hover:text-amber-400 font-bold"
                    : "text-text-dim hover:text-text-primary"
                  }`}
              >
                {`${label} (${count})`}
              </button>
            ))}
          </div>
          {isDroppedTab && selectedDropped.size > 0 && (
            <button
              type="button"
              onClick={() => {
                onRestoreDropped?.(Array.from(selectedDropped));
                setSelectedDropped(new Set());
              }}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/25 transition cursor-pointer shrink-0 whitespace-nowrap animate-in fade-in"
            >
              ✓ Restore ({selectedDropped.size})
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTable = (maxHeightClass = "") => (
    <div className="relative">
      <div className={`sm:hidden overflow-y-auto custom-scrollbar ${maxHeightClass}`}>
        {visibleComparables.length > 0 && (
          <div className="divide-y divide-white/[0.05]">
            {visibleComparables.map(({ comp, originalIndex }, index) => {
              const isChecked = isDroppedTab ? selectedDropped.has(comp) : selectedComps?.has(originalIndex);
              return (
                <MobileComparableRow
                  key={`mobile-${comp.project_name}-${originalIndex}`}
                  comp={comp}
                  index={index}
                  originalIndex={originalIndex}
                  isChecked={isChecked}
                  isDroppedTab={isDroppedTab}
                  selectable={selectable}
                  onSelect={() => {
                    if (isDroppedTab) {
                      setSelectedDropped((previous) => {
                        const next = new Set(previous);
                        if (next.has(comp)) next.delete(comp);
                        else next.add(comp);
                        return next;
                      });
                    } else {
                      onToggle?.(originalIndex, !isChecked);
                    }
                  }}
                  onRestore={() => onRestoreDropped?.([comp])}
                  onUpdateCoordinates={onUpdateCoordinates}
                  onResetCoordinates={onResetCoordinates}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className={`hidden sm:block overflow-x-auto ${maxHeightClass} custom-scrollbar`}>
        <table className="w-full min-w-max text-left text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-[#161922] border-b border-border shadow-md">
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.04em] text-text-dim bg-[#161922]">
              {selectable && (
                <th className="px-3 py-2.5 font-semibold bg-[#161922]">
                  <input
                    type="checkbox"
                    checked={isDroppedTab ? allDroppedSelected : allSelected}
                    onChange={() => {
                      if (isDroppedTab) {
                        if (allDroppedSelected) {
                          setSelectedDropped(new Set());
                        } else {
                          setSelectedDropped(new Set(visibleComparables.map(({ comp }) => comp)));
                        }
                      } else {
                        if (allSelected) {
                          visibleComparables.forEach(({ originalIndex }) => onToggle?.(originalIndex, false));
                        } else {
                          visibleComparables.forEach(({ originalIndex }) => onToggle?.(originalIndex, true));
                        }
                      }
                    }}
                    className="h-3.5 w-3.5 cursor-pointer rounded accent-[#fb923c]"
                  />
                </th>
              )}
              {isDroppedTab && (
                <TableHeaderCell columnKey="drop_stage" label="Drop Stage" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              )}
              <TableHeaderCell columnKey="project_name" label="Project Name" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="location" label="Location" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="country" label="Country" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="property_type" label="Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="project_category" label="Property Category" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="distance_from_subject_km" label="Distance" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="map_search_lat" label="Lat ✏️" align="right" className="text-warning" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="map_search_lng" label="Lng ✏️" align="right" className="text-warning" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              {isDroppedTab ? (
                <>
                  <TableHeaderCell columnKey="drop_detail" label="Detail / Reason" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
                  <TableHeaderCell columnKey="action" label="Action" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
                </>
              ) : (
                <>
                  <TableHeaderCell columnKey="possession_status" label="Status" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
                  <TableHeaderCell columnKey="reason" label="Reason" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
                  <TableHeaderCell columnKey="comp.confidence_score" label="Confidence" align="center" className="text-accent-light whitespace-nowrap" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
                  <TableHeaderCell columnKey="confidence_reasoning" label="Confidence Reasoning" className="whitespace-nowrap" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
                  <TableHeaderCell columnKey="comp.location_certainty" label="Location Certainty" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
                </>
              )}
              <TableHeaderCell columnKey="data_source" label="Source" className="whitespace-nowrap" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
            </tr>
          </thead>
          <tbody>
            {visibleComparables.map(({ comp, originalIndex }) => {
              const isChecked = isDroppedTab ? selectedDropped.has(comp) : selectedComps?.has(originalIndex);
              const stageConf = isDroppedTab
                ? (DROP_STAGE_CONFIG[comp.drop_stage] || { label: comp.drop_stage || "Dropped", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" })
                : null;
              return (
                <tr
                  key={`${comp.project_name}-${originalIndex}`}
                  className={`border-b border-border/50 transition ${isDroppedTab ? (isChecked ? "bg-amber-500/[0.12]" : "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]") : isChecked ? "bg-[rgba(251,146,60,0.08)]" : "hover:bg-[rgba(251,146,60,0.04)]"}`}
                >
                  {selectable && (
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked || false}
                        onChange={() => {
                          if (isDroppedTab) {
                            if (selectedDropped.has(comp)) {
                              setSelectedDropped(prev => {
                                const next = new Set(prev);
                                next.delete(comp);
                                return next;
                              });
                            } else {
                              onRestoreDropped?.([comp]);
                            }
                          } else {
                            onToggle?.(originalIndex, !isChecked);
                          }
                        }}
                        className="h-3.5 w-3.5 cursor-pointer rounded accent-[#fb923c]"
                      />
                    </td>
                  )}
                  {isDroppedTab && (
                    <td className="px-3 py-2.5">
                      <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${stageConf.color}`}>
                        {stageConf.label}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-2.5 font-medium text-text-primary whitespace-nowrap">{comp.project_name || "—"}</td>
                  <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{comp.location || "—"}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{comp.country || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-md border border-border bg-bg-input px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-light">
                      {comp.property_type || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-md border border-border bg-bg-input px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-light">
                      {comp.project_category || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-text-secondary whitespace-nowrap">{comp.distance_from_subject_km ? `${comp.distance_from_subject_km} km` : "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <EditableCoordCell
                      value={comp.map_search_lat}
                      onSave={(newLat) => isDroppedTab ? onUpdateCoordinates?.(originalIndex, newLat, comp.map_search_lng, true) : onUpdateCoordinates?.(originalIndex, newLat, comp.map_search_lng)}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <EditableCoordCell
                      value={comp.map_search_lng}
                      onSave={(newLng) => isDroppedTab ? onUpdateCoordinates?.(originalIndex, comp.map_search_lat, newLng, true) : onUpdateCoordinates?.(originalIndex, comp.map_search_lat, newLng)}
                    />
                  </td>
                  {isDroppedTab ? (
                    <>
                      <td className="px-3 py-2.5 text-text-secondary text-[10px] max-w-[220px] truncate" title={comp.drop_reason || comp.drop_detail}>
                        {comp.drop_detail || comp.drop_reason || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onRestoreDropped?.([comp])}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                        >
                          ✓ Restore
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{comp.possession_status || "—"}</td>
                      <td className="px-3 py-2.5 text-text-secondary text-xs truncate max-w-[200px]" title={comp.reason}>{comp.reason || "—"}</td>
                      <td className="px-3 py-2.5 text-center">
                        {comp.confidence_score !== undefined && comp.confidence_score !== null ? (() => {
                          const score = comp.confidence_score;
                          const tier = comp.confidence_tier || (score >= 80 ? "High" : score >= 60 ? "Medium" : score >= 40 ? "Low" : "Very Low");
                          const tierColor = tier === "High" ? "bg-success/20 text-success border-success/30" :
                            tier === "Medium" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                              tier === "Low" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                                "bg-danger/20 text-danger border-danger/30";
                          const fb = comp.factor_breakdown || {};
                          const tooltip = [
                            comp.confidence_reasoning || "",
                            fb.location !== undefined ? `📍 Location: ${fb.location}` : "",
                            fb.amenities !== undefined ? `🏊 Amenities: ${fb.amenities}` : "",
                            fb.property_category !== undefined ? `🏷 Category: ${fb.property_category}` : "",
                          ].filter(Boolean).join(" | ");
                          return (
                            <div className="group relative inline-flex flex-col items-center gap-0.5" title={tooltip}>
                              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-black tabular-nums ${tierColor}`}>
                                {score}
                              </span>
                              <span className={`text-[8px] font-bold uppercase tracking-wider ${tierColor.split(" ")[1]}`}>
                                {tier}
                              </span>
                            </div>
                          );
                        })() : <span className="text-text-dim text-[10px]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 max-w-[260px]">
                        {comp.confidence_reasoning
                          ? <p className="text-[10px] leading-relaxed text-text-secondary truncate" title={comp.confidence_reasoning}>{comp.confidence_reasoning}</p>
                          : <span className="text-text-dim text-[10px]">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {comp.location_certainty ? (
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${comp.location_certainty === "Sure" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                            }`}>
                            {comp.location_certainty}
                          </span>
                        ) : (comp.location_certainty_score !== undefined && comp.location_certainty_score !== null ? (
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${comp.location_certainty_score >= 0.8 ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                            }`}>
                            {comp.location_certainty_score >= 0.8 ? "Sure" : "Not Sure"}
                          </span>
                        ) : "—")}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2.5">
                    {comp.isDropped ? (
                      <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">Dropped</span>
                    ) : comp.data_source === "Internal DB" ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Transaction DB</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">Agent Web Search</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visibleComparables.length === 0 && (
        <div className="px-4 py-6 text-center text-xs text-text-dim">
          {isDroppedTab ? "No dropped projects found." : `No comparable projects found within ${INITIAL_COMPARABLE_RADIUS_KM} km.`}
          {hasHiddenComparables ? " Use Show more to view farther projects." : ""}
        </div>
      )}
      {hasHiddenComparables && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-bg-input/40 px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-text-dim">
            {showAllComparables ? "Showing all comparable projects" : `${hiddenComparableCount} farther project(s) hidden`}
          </span>
          <button
            type="button"
            onClick={() => setShowAllComparables((prev) => !prev)}
            className="rounded-lg border border-[#fb923c]/35 bg-[#fb923c]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#fb923c] transition hover:border-[#fb923c] hover:bg-[#fb923c]/15"
          >
            {showAllComparables ? `Show within ${INITIAL_COMPARABLE_RADIUS_KM} km` : "Show more"}
          </button>
        </div>
      )}
    </div>
  );

  const renderSearchInput = () => (
    <div className="relative flex items-center w-full sm:ml-auto sm:w-[220px] sm:min-w-[220px] sm:max-w-[260px] flex-1">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search project or location..."
        className="w-full rounded-xl border border-border bg-bg-deep px-3.5 py-2.5 text-[12px] font-medium text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition focus:border-[#fb923c] placeholder:text-text-dim"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className="absolute right-2 text-text-dim hover:text-text-primary text-[10px] cursor-pointer"
        >
          ×
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel transition-all duration-300">
        <div
          onClick={() => onToggleListingCollapsed?.(!listingCollapsed)}
          className="border-b border-border bg-[linear-gradient(180deg,rgba(251,146,60,0.08),rgba(251,146,60,0.03))] px-3 py-3 sm:px-5 sm:py-3 cursor-pointer select-none"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#fb923c]/20 bg-[#fb923c]/10 text-sm">
                  🏘️
                </div>
                <div className="min-w-0">
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border border-[#fb923c]/30 bg-[#fb923c]/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#fb923c]">
                      Stage 3A - Comparable Discovery
                    </span>
                    {!listingCollapsed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComparableActionInfo?.();
                        }}
                        className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-[#fb923c]/30 bg-[#fb923c]/10 text-[9px] font-black text-[#fb923c] leading-none transition hover:bg-[#fb923c]/20"
                        aria-label="Show comparable selection tip"
                        title="Show tip"
                      >
                        i
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-text-dim">
                    {stage3Summary}
                  </p>
                  {!listingCollapsed && (
                    <div
                      className={`absolute left-0 top-full z-30 mt-2 w-[320px] rounded-xl border border-warning/25 bg-bg-card/98 p-3 shadow-lg backdrop-blur-md transition-all duration-200 ${showComparableActionInfo ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
                        }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[10px] text-text-secondary leading-relaxed">
                        Please review and select comparable projects from the table below, then click <span className="font-semibold text-warning">&quot;Proceed to Fetch Listings&quot;</span>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={`hidden items-center gap-2.5 shrink-0 sm:justify-self-end ${listingCollapsed ? "sm:hidden" : "sm:flex"}`}>
              <span className="rounded-full border border-border bg-bg-deep/60 px-2 py-0.5 text-[9px] font-semibold text-text-dim whitespace-nowrap">
                {visibleResultLabel}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMaximized(true);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-[#fb923c] hover:text-[#fb923c]"
                title="Maximize Table"
              >
                ⛶
              </button>
            </div>
            <div className="flex items-center shrink-0 self-start mt-0.5 ml-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleListingCollapsed?.(!listingCollapsed);
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#fb923c]/30 bg-[#fb923c]/10 text-[#fb923c] leading-none transition hover:bg-[#fb923c]/20"
                aria-label={listingCollapsed ? "Expand comparable discovery" : "Collapse comparable discovery"}
                title={listingCollapsed ? "Expand" : "Collapse"}
              >
                {listingCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {!listingCollapsed && (
            <div className="mt-3 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {renderTabBar()}
                {renderSearchInput()}
              </div>
            </div>
          )}
        </div>
        {!listingCollapsed && renderTable("max-h-[360px] overflow-y-auto")}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="relative flex items-center justify-between gap-3 border-b border-border bg-[rgba(251,146,60,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(251,146,60,0.15)] text-lg">🏘️</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.05em] text-[#fb923c]">Comparable Projects Detail</h3>
                  <p className="text-[10px] text-text-dim">{visibleResultLabel}</p>
                </div>
              </div>
              <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex">
                {renderTabBar()}
              </div>
              <div className="ml-auto flex items-center gap-3 shrink-0">
                {renderSearchInput()}
                <button
                  onClick={() => setIsMaximized(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="min-w-max border border-border rounded-2xl overflow-hidden">
                {renderTable("")}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
