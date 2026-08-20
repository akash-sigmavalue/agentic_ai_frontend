import { useState, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";
import { filterAndSortList } from "../chat-utils";
import TableHeaderCell from "./TableHeaderCell";
import RoadTypeBadge from "./RoadTypeBadge";
import { ComparisonModal } from "./ComparableTable";

export function MobileFactorialRow({ row, index, selected, onToggle, fmt }) {
  const [expanded, setExpanded] = useState(false);
  const congestion = row.builtup_density?.congestion;
  const rateSource = !row.rate_derived_from || row.rate_derived_from === "—" || row.listing_count === 0
    ? "—"
    : row.rate_derived_from === "internal_db" || row.rate_derived_from === "Internal DB"
      ? "Transaction DB"
      : row.rate_derived_from === "mixed"
        ? "Web + DB"
        : row.rate_derived_from === "micromarket"
          ? "Micromarket"
          : "Listing";

  let amenityCounts = null;
  try {
    const summary = typeof row.amenity_summary === "string" ? JSON.parse(row.amenity_summary) : row.amenity_summary;
    amenityCounts = typeof summary?.counts === "string" ? JSON.parse(summary.counts) : summary?.counts;
  } catch {
    amenityCounts = null;
  }

  return (
    <div className={`transition-colors ${row.is_subject ? "bg-[rgba(167,139,250,0.08)]" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 rounded border-border accent-accent"
          aria-label={`Compare ${row.project_name || "project"}`}
        />

        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="w-5 shrink-0 text-[10px] font-mono text-text-dim">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-tight text-text-primary">
              {row.project_name || "—"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {row.is_subject && (
                <span className="rounded border border-purple-500/30 bg-purple-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-purple-400">
                  Subject
                </span>
              )}
              <span className="rounded border border-border/50 bg-bg-input px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-text-dim">
                {row.listing_count || 0} listings
              </span>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                {rateSource}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-mono text-[12px] font-bold text-[#a78bfa]">{fmt(row.avg_rate)}</p>
            <p className="text-[9px] text-text-dim">Avg rate</p>
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
            ["Road Type", row.road_type || "—"],
            ["90% CI Lower", fmt(row.ci_90_lower)],
            ["90% CI Upper", fmt(row.ci_90_upper)],
            ["Built-up Density", congestion?.score ?? "—"],
            ["Congestion", congestion?.level || "—"],
            ["Rate Source", rateSource],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-white/[0.04] py-1.5">
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-text-dim">{label}</span>
              <span className="text-right text-[11px] text-text-secondary">{value}</span>
            </div>
          ))}

          {amenityCounts && typeof amenityCounts === "object" && (
            <div className="border-b border-white/[0.04] py-1.5">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-text-dim">Nearby Amenities</p>
              <div className="space-y-1">
                {Object.entries(amenityCounts).map(([name, count]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-bg-input/55 px-2.5 py-1.5"
                  >
                    <span className="min-w-0 truncate text-[10px] font-medium text-text-secondary">
                      {String(name).replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase())}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-accent-light">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(row.cbd_data) && row.cbd_data.length > 0 && (
            <div className="py-1.5">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-text-dim">Nearest Commercial Hubs</p>
              <div className="space-y-1.5">
                {row.cbd_data.slice(0, 3).map((cbd, cbdIndex) => (
                  <div key={`${cbd.name}-${cbdIndex}`} className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="truncate text-amber-400">🏢 {cbd.short_name || cbd.name?.split(",")[0] || "—"}</span>
                    <span className="shrink-0 font-mono text-text-dim">{cbd.distance_km != null ? `${cbd.distance_km} km` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FactorialTable({ data, onCalculateRate, isCalculatingRate = false, canCalculateRate = true }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [filterConfig, setFilterConfig] = useState({});

  const dataTable = useMemo(() => data?.table || [], [data?.table]);

  const filteredAndSortedTable = useMemo(() => {
    return filterAndSortList(dataTable, sortConfig, filterConfig);
  }, [dataTable, sortConfig, filterConfig]);

  if (!data || !data.table || data.table.length === 0) return null;

  const currency = data.currency || "INR";

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  });

  const fmt = (v) => (!v && v !== 0) ? "—" : formatter.format(v);

  const renderTable = (maxHeightClass = "") => (
    <div className="relative">
      <div className={`sm:hidden overflow-y-auto ${maxHeightClass} custom-scrollbar`}>
        <div className="divide-y divide-white/[0.05]">
          {filteredAndSortedTable.map((row, index) => (
            <MobileFactorialRow
              key={`mobile-fact-${row.project_name || index}`}
              row={row}
              index={index}
              selected={selectedForComparison.has(row.project_name)}
              onToggle={() => {
                const next = new Set(selectedForComparison);
                if (next.has(row.project_name)) next.delete(row.project_name);
                else next.add(row.project_name);
                setSelectedForComparison(next);
              }}
              fmt={fmt}
            />
          ))}
        </div>
      </div>

      <div className={`hidden sm:block overflow-x-auto ${maxHeightClass} custom-scrollbar`}>
        <table className="w-full min-w-max text-left text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-[var(--bg-deep)] border-b border-border shadow-md">
            <tr className="border-b border-border text-xs uppercase tracking-[0.04em] text-text-dim">
              <th className="px-4 py-3 font-semibold w-10">
                <span className="sr-only">Select</span>
              </th>
              <TableHeaderCell
                columnKey="project_name"
                label="Project"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
              />
              <TableHeaderCell
                columnKey="listing_count"
                label="Listings"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
                align="center"
              />
              <TableHeaderCell
                columnKey="road_type"
                label="Road Type"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
                align="center"
              />
              <TableHeaderCell
                columnKey="amenity_summary"
                label="Nearby Amenities"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
              />
              <TableHeaderCell
                columnKey="cbd_data"
                label="Nearest Commercial Hubs"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
                align="center"
              />
              <TableHeaderCell
                columnKey="builtup_density.congestion.score"
                label="Built-up Density"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
                align="center"
              />
              <TableHeaderCell
                columnKey="avg_rate"
                label="Avg Rate"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
                align="right"
              />
              <TableHeaderCell
                columnKey="ci_90_lower"
                label="90% CI Lower"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
                align="right"
              />
              <TableHeaderCell
                columnKey="ci_90_upper"
                label="90% CI Upper"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
                align="right"
              />
              <TableHeaderCell
                columnKey="rate_derived_from"
                label="Rate Source"
                sortConfig={sortConfig}
                onSort={setSortConfig}
                filterConfig={filterConfig}
                onFilterChange={setFilterConfig}
                allRows={data.table}
                align="center"
              />
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTable.map((row, i) => {
              const hasSubRows = row.sub_rows && row.sub_rows.length > 1;
              const isExpanded = expandedProjects.has(row.project_name);

              return (
                <Fragment key={`fact-${row.project_name || i}`}>
                  <tr className={`border-b border-border/50 transition ${row.is_subject ? "bg-[rgba(167,139,250,0.10)] hover:bg-[rgba(167,139,250,0.16)]" : "hover:bg-[rgba(167,139,250,0.04)]"}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedForComparison.has(row.project_name)}
                        onChange={(e) => {
                          const next = new Set(selectedForComparison);
                          if (e.target.checked) next.add(row.project_name);
                          else next.delete(row.project_name);
                          setSelectedForComparison(next);
                        }}
                        className="h-3.5 w-3.5 rounded border-border accent-accent"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {hasSubRows && (
                          <button
                            onClick={() => {
                              const next = new Set(expandedProjects);
                              if (isExpanded) next.delete(row.project_name);
                              else next.add(row.project_name);
                              setExpandedProjects(next);
                            }}
                            className="text-text-dim hover:text-text-primary p-0.5 rounded hover:bg-white/5 transition"
                          >
                            <span className={`inline-block w-3 text-center text-[8px] transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              ▶
                            </span>
                          </button>
                        )}
                        <span>{row.project_name || "—"}</span>
                        {row.is_subject && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-[rgba(167,139,250,0.18)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#a78bfa] border border-[rgba(167,139,250,0.3)]">Subject</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md bg-[rgba(167,139,250,0.12)] px-1.5 text-xs font-bold text-[#c4b5fd]">{row.listing_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center"><RoadTypeBadge type={row.road_type} /></td>
                    <td className="px-4 py-3 text-left">
                      {(() => {
                        try {
                          let summary = row.amenity_summary;
                          if (typeof summary === 'string') summary = JSON.parse(summary);

                          let counts = summary?.counts;
                          if (typeof counts === 'string') counts = JSON.parse(counts);

                          if (!counts || typeof counts !== 'object') {
                            return <span className="text-text-dim block text-center">—</span>;
                          }

                          const entries = Object.entries(counts)
                            .filter(([, v]) => Number(v) > 0)
                            .map(([k, v]) => ({
                              label: String(k)
                                .replaceAll("_", " ")
                                .replace(/\b\w/g, (match) => match.toUpperCase()),
                              count: Number(v),
                            }));

                          return (
                            <div className="flex flex-wrap gap-1.5">
                              {entries.map((item) => (
                                <span
                                  key={item.label}
                                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em] ${row.is_subject
                                    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400"
                                    : "border-blue-500/35 bg-blue-500/10 text-blue-300"
                                    }`}
                                >
                                  <span className="truncate uppercase">{item.label}</span>
                                  <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-black normal-case tracking-normal ${row.is_subject
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : "bg-blue-500/15 text-blue-200"
                                    }`}>
                                    {item.count}
                                  </span>
                                </span>
                              ))}
                            </div>
                          );
                        } catch (err) {
                          return <span className="text-red-500 text-[8px] block text-center">Err</span>;
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const cbds = row.cbd_data || [];
                        if (cbds.length === 0) return <span className="text-text-dim">—</span>;

                        return (
                          <div className="flex flex-col items-start gap-1.5 min-w-[140px] max-w-[180px]">
                            {cbds.slice(0, 3).map((cbd, idx) => (
                              <div key={idx} className="flex items-center gap-3 w-full justify-between border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                                <span
                                  className="text-[9px] font-bold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded px-1.5 py-0.5 whitespace-nowrap truncate"
                                  title={cbd.name}
                                >
                                  🏢 {cbd.short_name || cbd.name.split(',')[0]}
                                </span>
                                <span className="text-[9px] font-mono text-text-dim whitespace-nowrap">
                                  {cbd.distance_km != null ? `${cbd.distance_km} km` : "N/A"}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold ${row.builtup_density?.congestion?.level === 'HIGH' ? 'bg-red-500/10 text-red-400' :
                        row.builtup_density?.congestion?.level === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' :
                          row.builtup_density?.congestion?.level === 'LOW' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-text-dim'
                        }`}>
                        {row.builtup_density?.congestion?.score || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{fmt(row.avg_rate)}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-dim">{fmt(row.ci_90_lower)}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-dim">{fmt(row.ci_90_upper)}</td>
                    <td className="px-4 py-3 text-center">
                      {!row.rate_derived_from || row.rate_derived_from === "—" || row.rate_derived_from === "-" || row.listing_count === 0 ? (
                        <span className="text-text-dim text-[10px]">—</span>
                      ) : row.rate_derived_from === "micromarket" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/20" title="Rate derived from comparable projects average (±5% CI)">
                          Micromarket
                        </span>
                      ) : row.rate_derived_from === "mixed" ? (
                        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500/10 to-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#d8b4fe] border border-purple-500/20" title="Rate derived from both Web Listings and Internal Database">
                          Web + DB
                        </span>
                      ) : row.rate_derived_from === "internal_db" || row.rate_derived_from === "Internal DB" ? (
                        <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-400 border border-purple-500/20" title="Rate derived from internal database transactions">
                          Transaction DB
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-400/20" title="Rate derived from actual listing data">
                          Listing
                        </span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasSubRows && row.sub_rows.map((sub, subIdx) => {
                    const isSubDb = sub.rate_derived_from === "internal_db";
                    return (
                      <tr
                        key={`fact-${row.project_name || i}-sub-${subIdx}`}
                        className="border-b border-border/30 bg-bg-deep/20 text-text-dim text-xs transition hover:bg-bg-deep/40"
                      >
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 pl-8 font-normal whitespace-nowrap text-text-dim flex items-center gap-1.5">
                           <span className="text-border">└──</span>
                          <span>{isSubDb ? "Internal DB Transactions" : "Web Listings"}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded bg-white/5 px-1.5 text-xs font-semibold text-text-dim">
                            {sub.listing_count}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">—</td>
                        <td className="px-4 py-2 text-center">—</td>
                        <td className="px-4 py-2 text-center">—</td>
                        <td className="px-4 py-2 text-center">—</td>
                        <td className="px-4 py-2 text-right font-mono text-text-dim/80">{fmt(sub.avg_rate)}</td>
                        <td className="px-4 py-2 text-right font-mono text-text-dim/80">{fmt(sub.ci_90_lower)}</td>
                        <td className="px-4 py-2 text-right font-mono text-text-dim/80">{fmt(sub.ci_90_upper)}</td>
                        <td className="px-4 py-2 text-center">
                          {isSubDb ? (
                            <span className="inline-flex items-center rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-400/80 border border-purple-500/20">
                              Transaction DB
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 border border-emerald-400/20">
                              Listing
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.01] backdrop-blur-md shadow-2xl transition-all duration-300 hover:shadow-purple-500/5">
        <div className="border-b border-white/[0.06] bg-[rgba(167,139,250,0.06)] px-4 py-3">
          <div className="flex items-start justify-between gap-2 flex-wrap min-w-0">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(167,139,250,0.15)] text-sm shrink-0">📈</span>
              <div className="min-w-0">
                <span className="inline-flex min-w-0 items-center rounded-full border border-[#a78bfa]/30 bg-[rgba(167,139,250,0.12)] px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.04em] text-[#a78bfa] sm:text-xs sm:tracking-[0.05em]">
                  Stage 4 - Comparable Project Metrics
                </span>
                <span className="mt-1 block rounded-full border border-white/[0.08] px-2 py-0.5 text-xs font-semibold text-text-dim whitespace-nowrap w-fit sm:text-xs">
                  <span className="sm:hidden">{data.table.length} · {data.total_valid}</span>
                  <span className="hidden sm:inline">{data.table.length} projects · {data.total_valid} listings</span>
                </span>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 sm:ml-0">
              {selectedForComparison.size >= 2 && (
                <button
                  onClick={() => setShowComparison(true)}
                  className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition"
                >
                  Compare {selectedForComparison.size}
                </button>
              )}
              <button onClick={() => setIsMaximized(true)} className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.08] bg-bg-card text-xs text-text-dim transition hover:border-[#a78bfa] hover:text-[#a78bfa]" title="Maximize Table">⛶</button>
            </div>
          </div>
        </div>
        {renderTable("max-h-[360px] overflow-y-auto")}
      </div>

      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.05em] text-accent-light">Ready For Final Rate</p>
          <p className="mt-1 text-xs text-text-dim">Review the Comparable Project Metrics and map factors, then calculate the saleable-area rate.</p>
        </div>
        <button
          type="button"
          onClick={onCalculateRate}
          disabled={!canCalculateRate || isCalculatingRate}
          className="w-full sm:w-auto shrink-0 rounded-xl bg-accent px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-bg-deep transition hover:scale-[1.02] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isCalculatingRate ? "Calculating..." : "Calculate Rate"}
        </button>
      </div>

      {showComparison && (
        <ComparisonModal
          projects={data.table.filter(p => selectedForComparison.has(p.project_name))}
          onClose={() => setShowComparison(false)}
        />
      )}
      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-[rgba(167,139,250,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(167,139,250,0.15)] text-lg">📈</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.05em] text-[#a78bfa]">Stage 4 - Comparable Project Metrics</h3>
                  <p className="text-xs text-text-dim">{data.table.length} projects · {data.total_valid} listings</p>
                </div>
              </div>
              <button onClick={() => setIsMaximized(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="w-full sm:min-w-max border border-border rounded-2xl overflow-hidden">
                {renderTable("")}
              </div>
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}
