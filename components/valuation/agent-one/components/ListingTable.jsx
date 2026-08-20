import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import TableHeaderCell from "./TableHeaderCell";
import { filterAndSortList, formatDate } from "../chat-utils";

export function ListingTable({ listings, dbTransactions, collapsed = false, onToggleCollapsed }) {
  const { user } = useAuth();
  const [isMaximized, setIsMaximized] = useState(false);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [filterConfig, setFilterConfig] = useState({});

  // Map internal DB transactions into listing row shape
  const dbRows = useMemo(() => {
    return (dbTransactions || []).map(t => ({
      project_name: t.project_name,
      property_type: t.property_type_raw || t.property_type,
      project_category: t.property_type,
      listing_type: t.transaction_category,
      bhk: t.unit_configuration,
      currency: t.currency,
      price: t.agreement_price,
      price_per_sqft: t.price_per_sqft,
      area_sqft: t.area_sqft,
      area_type: t.area_type || "Carpet Area",
      is_subject: t.is_subject || false,
      floor: t.floor_number,
      total_floors: null,
      location: t.location_name,
      transaction_date: t.transaction_date,
      source_url: null,
      _is_db: true,   // flag to render source badge
      website_authenticity_score: 100,
      website_authenticity_category: "Government DB",
    }));
  }, [dbTransactions]);

  const subjectListings = useMemo(() => (listings || []).filter((l) => l.is_subject), [listings]);
  const compListings = useMemo(() => (listings || []).filter((l) => !l.is_subject), [listings]);

  const allListingRowsCombined = useMemo(() => {
    return [...subjectListings, ...compListings, ...dbRows];
  }, [subjectListings, compListings, dbRows]);

  const processedSubjectListings = useMemo(() => {
    return filterAndSortList(subjectListings, sortConfig, filterConfig);
  }, [subjectListings, sortConfig, filterConfig]);

  const processedCompListings = useMemo(() => {
    return filterAndSortList(compListings, sortConfig, filterConfig);
  }, [compListings, sortConfig, filterConfig]);

  const processedDbRows = useMemo(() => {
    return filterAndSortList(dbRows, sortConfig, filterConfig);
  }, [dbRows, sortConfig, filterConfig]);

  const allEmpty = allListingRowsCombined.length === 0;
  if (allEmpty) return null;

  const renderRows = (rows, label) => (
    <>
      {rows.length > 0 && (
        <tr>
          <td colSpan="100" className="bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs font-bold uppercase tracking-[0.05em] text-text-dim">
            {label} ({rows.length})
          </td>
        </tr>
      )}
      {rows.map((lst, i) => (
        <tr key={`${lst.project_name}-${i}`} className="border-b border-border/50 transition hover:bg-[rgba(34,211,238,0.04)]">
          <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap">
            {lst.project_name || "—"}
            {lst.is_fallback && (
              <span
                title="Data found via Agent search fallback (scraping failed)"
                className="ml-2 inline-flex items-center rounded-full bg-orange-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-400 border border-orange-400/20"
              >
                Fallback
              </span>
            )}
          </td>
          <td className="px-3 py-2 text-text-secondary">{lst.property_type || "—"}</td>
          <td className="px-3 py-2 text-text-secondary">{lst.project_category || "—"}</td>
          <td className="px-3 py-2 text-text-secondary">{lst.listing_type || "—"}</td>
          <td className="px-3 py-2 text-center font-mono text-text-secondary">{lst.bhk || "—"}</td>
          <td className="px-3 py-2 text-center font-mono text-text-secondary whitespace-nowrap">{lst.currency || "—"}</td>
          <td className="px-3 py-2 text-right font-mono text-text-primary whitespace-nowrap">{lst.price || "—"}</td>
          <td className="px-3 py-2 text-right font-mono text-text-secondary whitespace-nowrap">{lst.area_sqft || "—"} {lst.area_sqft ? 'sqft' : ''}</td>
          <td className="px-3 py-2 text-text-dim">{lst.area_type || "—"}</td>
          <td className="px-3 py-2 text-center">
            {lst.is_subject ? (
              <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-400 border border-purple-500/20">Subject</span>
            ) : (
              <span className="rounded-md bg-[#fb923c]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#fb923c] border border-[#fb923c]/20">Comparable</span>
            )}
          </td>
          <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.floor || "—"}</td>
          <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.total_floors || "—"}</td>
          <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{lst.location || "—"}</td>
          <td className="px-3 py-2 text-center font-mono text-text-secondary whitespace-nowrap">
            {lst.transaction_date ? formatDate(lst.transaction_date) : (lst.posted_date_raw || "—")}
          </td>
          <td className="max-w-[200px] truncate px-3 py-2 text-text-dim">
            {lst._is_db ? (
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Transaction DB</span>
            ) : lst.source_url ? (
              user?.role === "ADMIN" ? (
                <a href={lst.source_url} target="_blank" rel="noreferrer" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 font-medium">
                  {lst.source_url}
                </a>
              ) : (
                <span className="inline-flex items-center rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">web</span>
              )
            ) : "—"}
          </td>
        </tr>
      ))}
    </>
  );

  const renderTable = (maxHeightClass = "") => (
    <div className={`overflow-x-auto ${maxHeightClass} custom-scrollbar`}>
      <table className="w-full min-w-max text-left text-xs sm:text-sm">
        <thead className="sticky top-0 z-20 bg-[#161922] border-b border-border shadow-md">
          <tr className="border-b border-border text-xs uppercase tracking-[0.04em] text-text-dim">
            <TableHeaderCell columnKey="project_name" label="Project" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="property_type" label="Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="project_category" label="Property Category" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="listing_type" label="List Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="bhk" label="BHK" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="currency" label="Currency" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="price" label="Price" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="area_sqft" label="Area" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="area_type" label="Area Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="is_subject" label="Role" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="floor" label="Floor" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="total_floors" label="Total Floor" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="location" label="Location" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="transaction_date" label="Date" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="_is_db" label="Source" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
          </tr>
        </thead>
        <tbody>
          {renderRows(processedSubjectListings, "Subject Property")}
          {renderRows(processedCompListings, "Comparable Projects")}
          {processedDbRows.length > 0 && renderRows(processedDbRows, "Internal DB Transactions")}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel transition-all duration-300">
        <div
          className="border-b border-border bg-[rgba(34,211,238,0.06)] px-4 py-3 cursor-pointer select-none"
          onClick={() => onToggleCollapsed?.(!collapsed)}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(34,211,238,0.15)] text-sm shrink-0">📊</span>
              <div className="min-w-0">
                <span className="inline-flex min-w-0 items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.05em] text-cyan-400 shrink-0">
                  Stage 3B - Market Signal
                </span>
                <span className="mt-1 block rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-text-dim whitespace-nowrap w-fit">{(listings || []).length} web + {dbRows.length} db records</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapsed?.(!collapsed);
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-400 transition hover:bg-cyan-400/20"
                  aria-label={collapsed ? "Expand Market Signal" : "Collapse Market Signal"}
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
                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-cyan-400 hover:text-cyan-400"
                    title="Maximize Table"
                  >
                    ⛶
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {!collapsed && renderTable("max-h-[360px] overflow-y-auto")}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-[rgba(34,211,238,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(34,211,238,0.15)] text-lg">📊</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold uppercase tracking-[0.05em] text-cyan-400">Market Signal</h3>
                  <p className="text-xs text-text-dim">{((listings || []).length + dbRows.length)} total records found</p>
                </div>
              </div>
              <button
                onClick={() => setIsMaximized(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger"
              >
                ×
              </button>
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

export function TransactionTable({ transactions }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [filterConfig, setFilterConfig] = useState({});

  const processedTransactions = useMemo(() => {
    return filterAndSortList(transactions || [], sortConfig, filterConfig);
  }, [transactions, sortConfig, filterConfig]);

  if (!transactions || transactions.length === 0) return null;

  const tableContent = (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full min-w-max text-left text-xs sm:text-sm">
        <thead className="sticky top-0 z-20 bg-[#161922] border-b border-border shadow-md">
          <tr className="border-b border-border text-xs uppercase tracking-[0.04em] text-text-dim">
            <TableHeaderCell columnKey="project_name" label="Project" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="property_type_raw" label="Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="property_type" label="Property Category" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="transaction_category" label="List Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="currency" label="Currency" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="agreement_price" label="Price" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="price_per_sqft" label="Price/Sqft" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="area_sqft" label="Area (Sqft)" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="area_type" label="Area Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="floor_number" label="Floor" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="location_name" label="Location" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="transaction_date" label="Date" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="source" label="Source" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="net_carpet_area_sq_m" label="Net Carpet (SQM)" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
            <TableHeaderCell columnKey="country_name" label="Country" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={transactions} />
          </tr>
        </thead>
        <tbody>
          {processedTransactions.map((t, i) => (
            <tr key={i} className="border-b border-border/50 transition hover:bg-[rgba(52,211,153,0.04)]">
              <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap">{t.project_name || "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{t.property_type_raw || "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{t.property_type || "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{t.transaction_category || "—"}</td>
              <td className="px-3 py-2 text-center font-mono text-text-secondary">{t.currency || "—"}</td>
              <td className="px-3 py-2 text-right font-mono text-text-primary whitespace-nowrap">{t.agreement_price ?? "—"}</td>
              <td className="px-3 py-2 text-right font-mono text-accent-light whitespace-nowrap">{t.price_per_sqft ?? "—"}</td>
              <td className="px-3 py-2 text-right font-mono text-text-secondary whitespace-nowrap">{t.area_sqft ?? "—"}</td>
              <td className="px-3 py-2 text-text-dim">{t.area_type || "Carpet Area"}</td>
              <td className="px-3 py-2 text-center font-mono text-text-dim">{t.floor_number ?? "—"}</td>
              <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{t.location_name || "—"}</td>
              <td className="px-3 py-2 text-center font-mono text-text-secondary whitespace-nowrap">{formatDate(t.transaction_date)}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Transaction DB
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-text-dim">{t.net_carpet_area_sq_m ?? "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{t.country_name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-500/25 bg-bg-card shadow-panel transition-all duration-300">
        <div className="border-b border-emerald-500/20 bg-[rgba(52,211,153,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(52,211,153,0.15)] text-sm">🗄️</span>
            <span className="text-xs font-bold uppercase tracking-[0.05em] text-emerald-400">Transactions</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-400">{transactions.length} records</span>
              <button
                onClick={() => setIsMaximized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-emerald-400 hover:text-emerald-400"
                title="Maximize Table"
              >⛶</button>
            </div>
          </div>
        </div>
        {tableContent}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-emerald-500/30 bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-[rgba(52,211,153,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(52,211,153,0.15)] text-lg">🗄️</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold uppercase tracking-[0.05em] text-emerald-400">Transactions</h3>
                  <p className="text-xs text-text-dim">{transactions.length} total records</p>
                </div>
              </div>
              <button onClick={() => setIsMaximized(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="min-w-max border border-border rounded-2xl overflow-hidden">{tableContent}</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
