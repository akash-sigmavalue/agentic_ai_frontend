import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import TableHeaderCell from "./TableHeaderCell";
import {
  filterAndSortList,
  formatDate,
  formatPrice,
  getRowKey,
  needsPlotConversionInputs,
  isPlotListingRow
} from "../chat-utils";

export function MobileCleanedRow({ lst, idx, activeTab, isRowPlot, plotAreaValue, rowAreaForRate, ratePerSqft, rowCurrency, showReasonColumn, getRowReason }) {
  const [expanded, setExpanded] = useState(false);

  const category = lst.project_category;
  const isPlot = ["plot", "land"].includes((category || "").toLowerCase());
  const isVilla = ["villa", "building_land"].includes((category || "").toLowerCase());

  const categoryBadge = category ? (
    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${isPlot ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : isVilla ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
        : "bg-text-dim/10 text-text-dim border-border/40"
      }`}>{category}</span>
  ) : null;

  const sourceBadge = (
    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${lst.source === "Internal DB"
      ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
      : "bg-blue-500/20 text-blue-400 border-blue-500/30"
      }`}>
      {lst.source === "Internal DB" ? "DB" : "Web"}
    </span>
  );

  const rowBg = activeTab === "dropped"
    ? "opacity-60"
    : activeTab === "outliers"
      ? "bg-[rgba(239,68,68,0.03)]"
      : "";

  return (
    <div className={`${rowBg} transition-colors`}>
      {/* Main row — always visible */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
      >
        {/* Index */}
        <span className="shrink-0 w-5 text-[10px] text-text-dim font-mono">{idx + 1}</span>

        {/* Project name + badges */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-text-primary truncate leading-tight">
            {lst.cleaned_match_project || lst.project_name || "—"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {categoryBadge}
            {sourceBadge}
            {lst.cleaned_config && (
              <span className="text-[9px] text-text-dim">{lst.cleaned_config}</span>
            )}
          </div>
        </div>

        {/* Rate per sqft */}
        <div className="shrink-0 text-right">
          {ratePerSqft ? (
            <>
              <p className="text-[12px] font-bold text-[#fb923c] font-mono">{ratePerSqft}</p>
              <p className="text-[9px] text-text-dim">₹/sqft</p>
            </>
          ) : (
            <span className="text-text-dim text-[11px]">—</span>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight
          size={14}
          className={`shrink-0 text-text-dim transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {/* Expanded detail rows */}
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5 bg-white/[0.01] border-t border-white/[0.04]">
          {/* Price row */}
          <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Price (Raw)</span>
            <span className="text-[11px] text-text-secondary font-mono">
              {lst.original_price_value !== undefined && lst.original_price_value !== null
                ? formatPrice(lst.original_price_value, lst.original_currency || lst.currency)
                : formatPrice(lst.price_value, lst.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Standardized Price</span>
            <span className="text-[11px] text-text-primary font-mono font-semibold">
              {formatPrice(lst.cleaned_price_value || lst.price_value, lst.cleaned_currency || lst.currency)}
            </span>
          </div>

          {/* Area */}
          <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Raw Area</span>
            <span className="text-[11px] text-text-secondary font-mono">
              {lst.cleaned_area_sqft || "—"}{lst.cleaned_area_type ? ` ${lst.cleaned_area_type}` : ""}
            </span>
          </div>
          {!isRowPlot && lst.final_super_builtup_area && (
            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
              <span className="text-[10px] text-text-dim uppercase tracking-wider">Norm. Area (SBUA)</span>
              <span className="text-[11px] text-[#fb923c] font-mono font-bold">
                {Math.round(lst.final_super_builtup_area)} sqft
              </span>
            </div>
          )}
          {isRowPlot && plotAreaValue && (
            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
              <span className="text-[10px] text-text-dim uppercase tracking-wider">Plot Area</span>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">
                {Math.round(plotAreaValue).toLocaleString()} sqft
              </span>
            </div>
          )}

          {/* Currency */}
          <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Currency</span>
            <span className="text-[11px] text-text-secondary font-mono">{lst.cleaned_currency || lst.currency || "—"}</span>
          </div>

          {/* Floor / Total */}
          {(lst.cleaned_floor || lst.floor || lst.cleaned_total_floors || lst.total_floors) && (
            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
              <span className="text-[10px] text-text-dim uppercase tracking-wider">Floor</span>
              <span className="text-[11px] text-text-secondary font-mono">
                {lst.cleaned_floor || lst.floor || "—"} / {lst.cleaned_total_floors || lst.total_floors || "—"}
              </span>
            </div>
          )}

          {/* Date */}
          {(lst.transaction_date || lst.posted_date_raw) && (
            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
              <span className="text-[10px] text-text-dim uppercase tracking-wider">Date</span>
              <span className="text-[11px] text-text-secondary font-mono">
                {lst.transaction_date ? formatDate(lst.transaction_date) : lst.posted_date_raw}
              </span>
            </div>
          )}

          {/* Status */}
          {lst.cleaned_possession_status && (
            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
              <span className="text-[10px] text-text-dim uppercase tracking-wider">Status</span>
              <span className="text-[11px] text-text-secondary">{lst.cleaned_possession_status}</span>
            </div>
          )}

          {/* Stat flag */}
          <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Flag</span>
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${lst.stat_flag === "outlier" ? "bg-danger/20 text-danger" : "bg-success/20 text-success"
              }`}>{lst.stat_flag || "ok"}</span>
          </div>

          {/* Reason (outliers / dropped) */}
          {showReasonColumn && (
            <div className="flex justify-between items-start py-1.5">
              <span className="text-[10px] text-text-dim uppercase tracking-wider shrink-0 mr-3">Reason</span>
              <span className="text-[10px] text-text-dim text-right leading-relaxed">{getRowReason(lst)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CleanedTable({ listings, reviewListings = [], droppedListings = [], onRecalculate, subjectPropertyType, valuationApproach, collapsed = false, onToggleCollapsed }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [fsiGlobal, setFsiGlobal] = useState("");
  const [ccGlobal, setCcGlobal] = useState("");
  const [rowOverrides, setRowOverrides] = useState({}); // { uniqueKey: { fsi_low, fsi_high, cc_low, cc_high } }
  const [activeTab, setActiveTab] = useState("valid"); // "valid" | "outliers" | "dropped"
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [filterConfig, setFilterConfig] = useState({});

  // Reset filters and sort whenever the tab changes.
  useEffect(() => {
    setSortConfig({ column: null, direction: null });
    setFilterConfig({});
  }, [activeTab]);

  console.log("CleanedTable Render:", {
    activeTab,
    listingsPropLength: listings?.length,
    reviewListingsPropLength: reviewListings?.length,
    droppedListingsPropLength: droppedListings?.length,
  });

  const listingsList = useMemo(() => listings || [], [listings]);

  // Determine which rows to display based on active tab
  const displayedListings = useMemo(() => {
    const res = activeTab === "valid" ? listingsList : activeTab === "outliers" ? reviewListings : droppedListings;
    console.log("CleanedTable displayedListings recalculated:", {
      activeTab,
      resLength: res?.length,
      resFirst3: res?.slice(0, 3)
    });
    return res;
  }, [activeTab, listingsList, reviewListings, droppedListings]);

  const processedListings = useMemo(() => {
    const res = filterAndSortList(displayedListings, sortConfig, filterConfig);
    console.log("CleanedTable processedListings recalculated:", {
      resLength: res?.length,
      resFirst3: res?.slice(0, 3)
    });
    return res;
  }, [displayedListings, sortConfig, filterConfig]);

  if (!listings || listings.length === 0) return null;

  const hasPlotData = listingsList.some(lst => lst.plot_derived_rate_per_sqft !== undefined && lst.plot_derived_rate_per_sqft !== null);
  const isPlotSubject = ["plot", "villa", "building_land"].includes(subjectPropertyType?.toLowerCase()?.trim());
  const isVillaSubject = ["villa", "building_land"].includes(subjectPropertyType?.toLowerCase()?.trim());
  const isCostApproach = valuationApproach?.toLowerCase?.() === "cost";
  const derivedRateLabel = (isVillaSubject && isCostApproach) ? "Plot" : (isVillaSubject ? "Villa" : "Plot");

  const showPlotControls = isPlotSubject;
  const showReasonColumn = activeTab === "outliers" || activeTab === "dropped";

  const getRowReason = (lst) => {
    if (activeTab === "outliers") return "Statistical outlier (IQR)";
    if (lst.is_duplicate) return "Duplicate listing";
    return lst.cleaned_irrelevance_reason || lst.irrelevance_reason || "Not relevant for valuation";
  };

  const mobileCardList = (
    <div className={`sm:hidden overflow-y-auto custom-scrollbar ${isMaximized ? 'flex-1' : 'max-h-[500px]'}`}>
      {processedListings.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-text-dim">
          {activeTab === "outliers" ? "No outlier listings detected." : activeTab === "dropped" ? "No dropped listings." : "No valid listings."}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {processedListings.map((lst, idx) => {
            const isRowPlot = isPlotListingRow(lst);
            const plotAreaValue = lst.plot_area_sqft || (isRowPlot ? lst.cleaned_area_sqft : null);
            const rowAreaForRate = isRowPlot ? plotAreaValue : (lst.final_super_builtup_area || lst.cleaned_area_sqft);
            const ratePerSqft = lst.cleaned_price_value && rowAreaForRate
              ? Math.round(lst.cleaned_price_value / rowAreaForRate).toLocaleString()
              : null;
            const sourceIndex = displayedListings.indexOf(lst);
            const rKey = getRowKey(lst, sourceIndex !== -1 ? sourceIndex : idx);
            const rowCurrency = lst.cleaned_currency || lst.currency || "₹";

            return (
              <MobileCleanedRow
                key={`mob_${activeTab}_${idx}_${rKey}`}
                lst={lst}
                idx={idx}
                activeTab={activeTab}
                isRowPlot={isRowPlot}
                plotAreaValue={plotAreaValue}
                rowAreaForRate={rowAreaForRate}
                ratePerSqft={ratePerSqft}
                rowCurrency={rowCurrency}
                showReasonColumn={showReasonColumn}
                getRowReason={getRowReason}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  const tableContent = (
    <>
      {mobileCardList}

      <div className={`hidden sm:block overflow-x-auto overflow-y-auto custom-scrollbar ${isMaximized ? '' : 'max-h-[500px]'}`}>
        <table className="w-full text-left text-xs sm:text-sm relative">
          <thead className="sticky top-0 z-20 bg-[var(--bg-deep)] border-b border-border shadow-md">
            <tr className="border-b border-border text-xs uppercase tracking-[0.04em] text-text-dim">
              <TableHeaderCell columnKey="cleaned_match_project" label="Matched Project" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="project_category" label="Property Category" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="cleaned_currency" label="Currency" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="cleaned_config" label="Config" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="raw_price" label="Raw Price" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="cleaned_price_value" label="Standardized Price" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="exchange_rate_remark" label="Currency Exchange Rate" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="cleaned_area_sqft" label="Raw Area" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="final_super_builtup_area" label="Normalized Area (SBUA)" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              {isPlotSubject && (
                <TableHeaderCell columnKey="plot_area_sqft" label="Plot Area" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              )}
              <TableHeaderCell columnKey="rate_per_sqft" label="Rate / Sqft" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />

              {showPlotControls && (
                <>
                  <th className="px-3 py-2.5 font-semibold text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      Gross Floor area/Plot area
                      <div className="group relative inline-flex items-center cursor-pointer text-text-dim hover:text-accent-light">
                        <Info size={11} className="inline-block" />
                        <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 w-56 -translate-x-1/2 rounded bg-bg-deep border border-border px-2.5 py-2 text-[10px] normal-case tracking-normal text-text-secondary opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 whitespace-normal text-center leading-normal">
                          Any location does not have one fixed FSI/FAR; it depends on the specific plot, zoning, Development authority approvals & various other factors
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      Construction Cost (₹/sqft)
                    </div>
                  </th>
                  <TableHeaderCell columnKey="plot_derived_rate_per_sqft" label={`${derivedRateLabel} Derived Rate / Sqft`} align="right" className="text-accent-light font-bold" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
                  <TableHeaderCell columnKey="plot_derived_rate_range" label={`${derivedRateLabel} Rate Range`} align="right" className="text-accent" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
                  <TableHeaderCell columnKey="plot_derived_by" label="Derived By" align="center" className="text-accent-light" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
                </>
              )}

              <TableHeaderCell columnKey="cleaned_floor" label="Floor" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="cleaned_total_floors" label="Total Floor" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="cleaned_possession_status" label="Status" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="transaction_date" label="Date" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="source" label="Source" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              <TableHeaderCell columnKey="stat_flag" label="Flag" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
              {showReasonColumn && <TableHeaderCell columnKey="reason" label="Reason" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />}
            </tr>
          </thead>
          <tbody>
            {processedListings.length === 0 ? (
              <tr>
                <td colSpan={99} className="px-4 py-8 text-center text-sm text-text-dim">
                  {activeTab === "outliers" ? "No outlier listings detected." : "No dropped listings."}
                </td>
              </tr>
            ) : processedListings.map((lst, idx) => {
              const rowNeedsPlotConversion = needsPlotConversionInputs(lst, subjectPropertyType, valuationApproach);
              const overrideAvailability = {
                fsi: rowNeedsPlotConversion,
                cc: rowNeedsPlotConversion,
              };
              const rowCurrency = lst.cleaned_currency || lst.currency || "₹";
              const sourceIndex = displayedListings.indexOf(lst);
              const rKey = getRowKey(lst, sourceIndex !== -1 ? sourceIndex : idx);
              const isRowPlot = isPlotListingRow(lst);
              const plotAreaValue = lst.plot_area_sqft || (isRowPlot ? lst.cleaned_area_sqft : null);
              const rowAreaForRate = isRowPlot
                ? plotAreaValue
                : (lst.final_super_builtup_area || lst.cleaned_area_sqft);
              return (
                <tr key={`${activeTab}_${idx}_${rKey}`} className={`border-b border-border/50 transition hover:bg-[rgba(251,146,60,0.04)] ${activeTab === 'dropped' ? 'opacity-60' : activeTab === 'outliers' ? 'bg-[rgba(239,68,68,0.03)]' : ''}`}>
                  <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap">
                    {lst.cleaned_match_project || lst.project_name || "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {lst.project_category ? (
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${["plot", "land"].includes((lst.project_category || "").toLowerCase())
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : ["villa", "building_land"].includes((lst.project_category || "").toLowerCase())
                          ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                          : "bg-text-dim/10 text-text-dim border-border/40"
                        }`}>
                        {lst.project_category}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-text-secondary whitespace-nowrap">{lst.cleaned_currency || lst.currency || "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{lst.cleaned_config || lst.bhk || "—"}</td>

                  <td className="px-3 py-2 text-right font-mono text-text-secondary whitespace-nowrap">
                    {lst.original_price_value !== undefined && lst.original_price_value !== null
                      ? formatPrice(lst.original_price_value, lst.original_currency || lst.currency)
                      : formatPrice(lst.price_value, lst.currency)}
                  </td>

                  <td className="px-3 py-2 text-right font-mono text-text-primary whitespace-nowrap font-semibold font-mono">
                    {formatPrice(lst.cleaned_price_value || lst.price_value, lst.cleaned_currency || lst.currency)}
                  </td>

                  <td className="px-3 py-2 text-center font-mono text-text-secondary text-xs whitespace-nowrap">
                    {lst.exchange_rate_remark && lst.exchange_rate_remark !== "1.0"
                      ? lst.exchange_rate_remark
                      : "1.0"}
                  </td>

                  <td className="px-3 py-2 text-right font-mono text-text-secondary">
                    {lst.cleaned_area_sqft || "—"} <span className="text-xs opacity-50">{lst.cleaned_area_type}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-accent-light font-bold">
                    {!isRowPlot && lst.final_super_builtup_area
                      ? `${Math.round(lst.final_super_builtup_area)} sqft`
                      : "—"}
                  </td>
                  {isPlotSubject && (
                    <td className="px-3 py-2 text-right font-mono text-emerald-400 font-bold whitespace-nowrap">
                      {isRowPlot && plotAreaValue
                        ? `${Math.round(plotAreaValue).toLocaleString()} sqft`
                        : "—"}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right font-mono text-text-primary">
                    {lst.cleaned_price_value && rowAreaForRate
                      ? Math.round(lst.cleaned_price_value / rowAreaForRate).toLocaleString()
                      : "—"}
                  </td>

                  {showPlotControls && (
                    <>
                      <td className="px-3 py-2 text-center">
                        {overrideAvailability.fsi ? (
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="FSI"
                              className="w-16 bg-bg-deep/50 border border-border/50 rounded px-1.5 py-1 text-center text-[11px] text-accent focus:border-accent outline-none font-medium transition hover:border-accent/40"
                              value={rowOverrides[rKey]?.fsi_best ?? (lst.plot_fsi_range?.best || "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRowOverrides(prev => ({
                                  ...prev,
                                  [rKey]: { ...prev[rKey], fsi_best: val }
                                }));
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-text-dim">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {overrideAvailability.cc ? (
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              placeholder="Construction Cost (₹/sqft)"
                              className="w-24 bg-bg-deep/50 border border-border/50 rounded px-1.5 py-1 text-center text-[11px] text-accent focus:border-accent outline-none font-medium transition hover:border-accent/40"
                              value={rowOverrides[rKey]?.const_cost_best ?? (lst.plot_construction_cost_range?.best || "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRowOverrides(prev => ({
                                  ...prev,
                                  [rKey]: { ...prev[rKey], const_cost_best: val }
                                }));
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-text-dim">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-accent-light font-bold">
                        {lst.plot_derived_rate_per_sqft
                          ? `${rowCurrency} ${Math.round(lst.plot_derived_rate_per_sqft).toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary">
                        {lst.plot_derived_rate_range
                          ? (lst.plot_derived_rate_range.low === lst.plot_derived_rate_range.high
                            ? `${rowCurrency} ${lst.plot_derived_rate_range.low.toLocaleString()}`
                            : `${rowCurrency} ${lst.plot_derived_rate_range.low.toLocaleString()} - ${lst.plot_derived_rate_range.high.toLocaleString()}`)
                          : (lst.plot_negative_value_flag ? <span className="text-danger font-bold text-xs">NEG VALUE</span> : "—")}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${lst.plot_derived_by === 'user' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-bg-deep/40 text-text-dim border border-border/30'}`}>
                          {lst.plot_derived_by || "Agent"}
                        </span>
                      </td>
                    </>
                  )}

                  <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.cleaned_floor || lst.floor || "—"}</td>
                  <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.cleaned_total_floors || lst.total_floors || "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{lst.cleaned_possession_status || "—"}</td>
                  <td className="px-3 py-2 text-center font-mono text-text-secondary whitespace-nowrap">
                    {lst.transaction_date ? formatDate(lst.transaction_date) : (lst.posted_date_raw || "—")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${lst.source === 'Internal DB' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                      {lst.source === 'Internal DB' ? 'Transaction DB' : (lst.source || "Agent Web Search")}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold uppercase ${lst.stat_flag === 'outlier' ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                      {lst.stat_flag || "ok"}
                    </span>
                  </td>
                  {showReasonColumn && (
                    <td className="px-3 py-2 text-xs text-text-dim max-w-[200px] truncate" title={getRowReason(lst)}>
                      {getRowReason(lst)}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.01] backdrop-blur-md shadow-2xl transition-all duration-300 hover:shadow-cyan-500/5">
        <div
          className="border-b border-white/[0.06] bg-[rgba(251,146,60,0.06)] px-4 py-3 cursor-pointer select-none"
          onClick={() => onToggleCollapsed?.(!collapsed)}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(251,146,60,0.15)] text-sm">🧹</span>
              <div className="min-w-0">
                <span className="inline-flex min-w-0 items-center rounded-full border border-[#fb923c]/30 bg-[#fb923c]/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.05em] text-[#fb923c]">
                  Stage 3C - Cleaned & Normalized Data
                </span>
                <span className="mt-1 block rounded-full border border-white/[0.08] px-2 py-0.5 text-xs font-semibold text-text-dim whitespace-nowrap w-fit">
                  {listings.length} valid records
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapsed?.(!collapsed);
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#fb923c]/30 bg-[#fb923c]/10 text-[#fb923c] transition hover:bg-[#fb923c]/20"
                aria-label={collapsed ? "Expand cleaned table" : "Collapse cleaned table"}
                title={collapsed ? "Expand" : "Collapse"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {!collapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMaximized(true);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.08] bg-bg-card text-[10px] text-text-dim transition hover:border-[#fb923c] hover:text-[#fb923c]"
                  title="Maximize Table"
                >
                  ⛶
                </button>
              )}
            </div>
          </div>
        </div>
        {!collapsed && (
          <>
            <div className="border-b border-white/[0.06] bg-bg-deep/30 px-4 py-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-white/[0.06] bg-bg-deep/60 p-1 sm:p-0.5 gap-1 sm:gap-0.5 w-full sm:w-max">
                <button
                  onClick={() => setActiveTab("valid")}
                  className={`flex justify-center sm:justify-start items-center whitespace-nowrap w-full sm:w-auto gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "valid" ? "bg-success/20 text-success border border-success/30 shadow-[0_0_8px_rgba(34,197,94,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
                >
                  ✅ Valid ({listings.length})
                </button>
                <button
                  onClick={() => setActiveTab("outliers")}
                  className={`flex justify-center sm:justify-start items-center whitespace-nowrap w-full sm:w-auto gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "outliers" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
                >
                  ⚠️ Outliers ({reviewListings.length})
                </button>
                <button
                  onClick={() => setActiveTab("dropped")}
                  className={`flex justify-center sm:justify-start items-center whitespace-nowrap w-full sm:w-auto gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "dropped" ? "bg-danger/20 text-danger border border-danger/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
                >
                  ❌ Dropped ({droppedListings.length})
                </button>
              </div>
            </div>

            {showPlotControls && onRecalculate && (
              <div className="flex flex-wrap items-center gap-3 border-b border-border bg-bg-deep/50 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-widest text-text-dim mr-2">Global Overrides:</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="FSI"
                  value={fsiGlobal}
                  onChange={e => setFsiGlobal(e.target.value)}
                  className="w-24 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs text-white outline-none focus:border-[#fb923c]"
                />
                <input
                  type="number"
                  placeholder="Construction Cost (₹/sqft)"
                  value={ccGlobal}
                  onChange={e => setCcGlobal(e.target.value)}
                  className="w-32 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs text-white outline-none focus:border-[#fb923c]"
                />
                <div className="h-4 w-px bg-border mx-2" />
                <button
                  onClick={() => onRecalculate(fsiGlobal, ccGlobal, rowOverrides, "global")}
                  className="rounded-lg bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20 hover:bg-[#fb923c]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition"
                >
                  Apply All & Recalculate
                </button>
                {Object.keys(rowOverrides).length > 0 && (
                  <>
                    <button
                      onClick={() => onRecalculate("", "", rowOverrides, "edited")}
                      className="rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition"
                    >
                      Recalculate Edits
                    </button>
                    <button
                      onClick={() => setRowOverrides({})}
                      className="text-xs text-danger hover:underline font-bold uppercase ml-2"
                    >
                      Reset Edits
                    </button>
                  </>
                )}
              </div>
            )}

            {tableContent}
          </>
        )}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-[rgba(251,146,60,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(251,146,60,0.15)] text-lg">🧹</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.05em] text-[#fb923c]">
                    {hasPlotData ? `Normalized Listing & ${derivedRateLabel} Data` : "Normalized Listing Data"}
                  </h3>
                  {showPlotControls && onRecalculate && (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-bg-card px-4 py-3 shrink-0 mt-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim mr-2">Global Overrides:</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="FSI"
                        value={fsiGlobal}
                        onChange={e => setFsiGlobal(e.target.value)}
                        className="w-24 rounded-lg border border-border bg-bg-input px-3 py-1.5 text-[11px] text-white outline-none focus:border-[#fb923c]"
                      />
                      <input
                        type="number"
                        placeholder="Construction Cost (₹/sqft)"
                        value={ccGlobal}
                        onChange={e => setCcGlobal(e.target.value)}
                        className="w-32 rounded-lg border border-border bg-bg-input px-3 py-1.5 text-[11px] text-white outline-none focus:border-[#fb923c]"
                      />
                      <div className="h-4 w-px bg-border mx-2" />
                      <button
                        onClick={() => onRecalculate(fsiGlobal, ccGlobal, rowOverrides, "global")}
                        className="rounded-lg bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20 hover:bg-[#fb923c]/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition"
                      >
                        Apply All & Recalculate
                      </button>
                      {Object.keys(rowOverrides).length > 0 && (
                        <button
                          onClick={() => onRecalculate("", "", rowOverrides, "edited")}
                          className="rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition"
                        >
                          Recalculate Edits
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-text-dim">{listings.length} cleaned records</p>
                </div>
              </div>
              <button
                onClick={() => setIsMaximized(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="border-b border-white/[0.06] bg-bg-deep/30 px-4 py-2.5 shrink-0 overflow-y-auto max-h-[150px] sm:max-h-none sm:overflow-y-visible">
                <div className="flex flex-col sm:flex-row sm:items-center rounded-xl border border-white/[0.06] bg-bg-deep/60 p-1 sm:p-0.5 gap-1 sm:gap-0.5 w-full sm:w-max">
                  <button
                    onClick={() => setActiveTab("valid")}
                    className={`flex justify-center sm:justify-start items-center whitespace-nowrap w-full sm:w-auto gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "valid" ? "bg-success/20 text-success border border-success/30 shadow-[0_0_8px_rgba(34,197,94,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
                  >
                    ✅ Valid ({listings.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("outliers")}
                    className={`flex justify-center sm:justify-start items-center whitespace-nowrap w-full sm:w-auto gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "outliers" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
                  >
                    ⚠️ Outliers ({reviewListings.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("dropped")}
                    className={`flex justify-center sm:justify-start items-center whitespace-nowrap w-full sm:w-auto gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "dropped" ? "bg-danger/20 text-danger border border-danger/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
                  >
                    ❌ Dropped ({droppedListings.length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="w-full border border-border rounded-2xl overflow-hidden bg-bg-card">
                  {tableContent}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
