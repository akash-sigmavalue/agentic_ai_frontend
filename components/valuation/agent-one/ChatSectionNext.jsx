"use client";

import { useEffect, useRef, useState, Fragment, useMemo } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "@/lib/api-client";
import {
  MessageSquareCode,
  Bot,
  FileSearch,
  Sparkles,
  TrendingUp,
  MapPin,
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle,
  Database,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Info,
  ArrowUp,
  ArrowDown,
  Filter,
  Search,
  X,
  Zap
} from "lucide-react";

const QUICK_PROMPTS = [
  "Value a 2BHK flat in Hiranandani Gardens, Powai, Mumbai. 1100 sqft, 5 years old, floor 15/25, West facing",
  "what is the value of a 500 sqft retail shop on the ground floor of MGF Metropolitan Mall, MG Road, Gurgaon? Currently self-used. Market Approach.. Frontage: 18",
  "What is the market value of a 3BHK flat in Godrej Infinity, Keshav Nagar, Pune, 1100 sqft, floor 12/20, East facing",
];

const PLACEHOLDER_MAP = {
  project_name: "e.g. Godrej Infinity, Lodha Altamount, Phoenix Marketcity",
  carpet_area_sqft: "e.g. 850 sqft",
  salable_area_sqft: "e.g. 1100 sqft",
  builtup_area_sqft: "e.g. 1050 sqft",
  plot_area_sqft: "e.g. 1200 sqft",
  age_years: "e.g. 5, or '0' for Under Construction",
  location_name: "Locality / Micro-market (e.g. Baner, Kalyani Nagar)",
  city_name: "Broader city (e.g. Pune, Mumbai, Dubai)",
  country: "e.g. India, USA, UK",
  coordinates: "lat, lng - e.g. 18.559, 73.789",
  land_type: "agricultural / non_agricultural / residential / commercial",
  frontage: "e.g. 30 ft",
  occupancy_status: "vacant / leased / self_use",
  water_availability: "good / moderate / poor",
  clear_height: "e.g. 20 ft",
};

const getCurrencySymbol = (currencyCode) => {
  if (!currencyCode) return "₹";
  try {
    const formatter = new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode.toUpperCase().trim(),
    });
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find((part) => part.type === "currency");
    return symbolPart ? symbolPart.value : currencyCode;
  } catch (e) {
    return currencyCode || "₹";
  }
};

function ReActReasoningReport({ report }) {
  const renderedLines = useMemo(() => {
    if (!report) return [];

    const lines = report.split('\n');
    return lines.map((line) => {
      let trimmed = line.trim();
      if (!trimmed) {
        return { type: 'empty', content: '' };
      }

      // Clean up markdown hashes & asterisks
      trimmed = trimmed.replace(/^#+\s*/, "");
      trimmed = trimmed.replace(/^\*\*+\s*/, "").replace(/\s*\*\*+$/, "");
      trimmed = trimmed.replaceAll("**", "");

      const upper = trimmed.toUpperCase();

      // 1. Stage Header Match
      if (upper.startsWith('STAGE ')) {
        return {
          type: 'stage-header',
          content: trimmed
        };
      }

      // 2. Step Header Match
      if (upper.startsWith('STEP ')) {
        return {
          type: 'step-header',
          content: trimmed
        };
      }

      // 3. Keyword matches
      const keywords = ['THOUGHT:', 'ACTION:', 'OBSERVATION:', 'CRITIQUE:', 'REVISE:'];
      for (const kw of keywords) {
        if (upper.startsWith(kw)) {
          return {
            type: kw.toLowerCase().slice(0, -1),
            label: trimmed.substring(0, kw.length),
            value: trimmed.substring(kw.length).trim()
          };
        }
      }

      // 4. Bullet points
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return {
          type: 'bullet',
          content: trimmed.substring(1).trim()
        };
      }

      // 5. Default line
      return {
        type: 'text',
        content: trimmed
      };
    });
  }, [report]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel p-6">
      <div className="max-h-[720px] overflow-y-auto custom-scrollbar space-y-3.5 font-mono text-[11px] leading-relaxed pr-2">
        {renderedLines.map((line, idx) => {
          switch (line.type) {
            case 'empty':
              return <div key={idx} className="h-1" />;

            case 'stage-header':
              return (
                <div key={idx} className="border-b border-border/60 pb-2 pt-4 first:pt-0">
                  <h4 className="text-accent text-[12px] font-black tracking-wider uppercase">
                    {line.content}
                  </h4>
                </div>
              );

            case 'step-header':
              return (
                <div key={idx} className="pt-2">
                  <h5 className="text-text-primary text-[11px] font-bold tracking-wide uppercase">
                    {line.content}
                  </h5>
                </div>
              );

            case 'thought':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-accent-purple/40 text-text-dim italic">
                  <span className="text-accent-purple font-bold not-italic">{line.label}</span> {line.value}
                </div>
              );

            case 'action':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-accent/40 text-text-secondary">
                  <span className="text-accent font-bold">{line.label}</span> <code className="bg-bg-deep/40 px-1 py-0.5 rounded text-accent-light">{line.value}</code>
                </div>
              );

            case 'observation':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-success/40 text-text-secondary">
                  <span className="text-success font-bold">{line.label}</span> {line.value}
                </div>
              );

            case 'critique':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-warning/40 text-text-secondary">
                  <span className="text-warning font-bold">{line.label}</span> {line.value}
                </div>
              );

            case 'revise':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-accent-purple/40 text-text-secondary">
                  <span className="text-accent-purple font-bold">{line.label}</span> {line.value}
                </div>
              );

            case 'bullet':
              return (
                <div key={idx} className="pl-8 flex items-start gap-2 text-text-muted">
                  <span className="text-accent-light select-none">•</span>
                  <span>{line.content}</span>
                </div>
              );

            default:
              return (
                <div key={idx} className="text-text-secondary pl-3.5">
                  {line.content}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}

function summarizeEvent(event) {
  if (typeof event.content === "string") return event.content;
  if (event.type === "entities") return "I extracted the structured property details and pushed them into the workflow panel.";
  if (event.type === "clarification_needed") return event.content?.question || "I need a few more details before I can continue.";
  if (event.type === "map_confirmation") return event.content?.message || "I found a probable property location.";
  if (event.type === "approach") return "Agent 2 has recommended a valuation approach based on property intelligence.";
  if (event.type === "approach_choice_needed") return event.content?.question || "Please confirm the optimal valuation approach.";
  if (event.type === "workflow") return "Agent 3 has compiled the execution workflow steps.";
  if (event.type === "comparable_search_progress") {
    const p = event.content;
    return `[SEARCH] Searching radius ${p?.radius_km}km — iteration ${p?.iteration}, ${p?.comps_so_far} comps found so far...`;
  }
  if (event.type === "comparable_results") {
    const c = event.content;
    let baseMsg = `[SUCCESS] Found ${c?.total_found || 0} comparable projects. Select comparables below and proceed to fetch listings.`;
    if (c?.web_error) {
      baseMsg += ` (Note: Web search failed due to a technical issue: ${c.web_error}. Sourced results from internal database instead.)`;
    }
    return baseMsg;
  }
  if (event.type === "listing_start") return event.content?.message || "Starting listing search...";
  if (event.type === "listing_progress") {
    const p = event.content;
    if (p?.status === "scraped") return `[SCRAPED] ${p?.project}: ${p?.detail?.listings_found || 0} listings found`;
    if (p?.status === "fallback") return `[FALLBACK] Running fallback search for ${p?.detail?.projects?.length || 0} projects...`;
    return `[PIPELINE] Listing pipeline: ${p?.status}`;
  }
  if (event.type === "listing_results") {
    return `[LISTINGS] Fetched ${event.content?.total_listings || 0} listings across ${event.content?.projects_processed || 0} projects.`;
  }
  if (event.type === "listing_done") return "Listing fetch completed.";
  if (event.type === "extraction_verification") return event.content?.message || "Please verify the extracted attributes.";
  if (event.type === "factorial_start") return event.content?.message || "Analyzing project metrics...";
  if (event.type === "factorial_results") {
    const t = event.content?.table || [];
    return `[METRICS] Project metrics ready — ${t.length} projects, ${event.content?.total_valid || 0} valid listings.`;
  }
  if (event.type === "factorial_done") return "Valuation analytics generated.";
  if (event.type === "done") return "Pipeline execution completed or artificially frozen.";
  if (event.type === "token_usage") return `Token usage updated: ${event.content?.cumulative_total_tokens || 0} tokens so far.`;
  return "Pipeline update received.";
}

function humanizeFieldName(field) {
  return field.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

const getRowKey = (lst, rowIndex = "") => {
  if (!lst) return "";
  const explicitId = lst.id || lst.listing_id || lst.transaction_id || lst.source_id || lst.url || lst.listing_url || "";
  const project = lst.cleaned_match_project || lst.project_name || "";
  const date = lst.transaction_date || lst.posted_date_raw || "";
  const area = lst.final_super_builtup_area || lst.cleaned_area_sqft || lst.area_sqft || "";
  const price = lst.cleaned_price_value || lst.price_value || "";
  return `${explicitId}_${project}_${date}_${area}_${price}_${rowIndex}`;
};

const hasPlotOverrideValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "object") {
    return ["best", "low", "high"].some((key) => value[key] !== null && value[key] !== undefined && value[key] !== "");
  }
  return true;
};

const getPlotOverrideAvailability = (lst) => {
  const derivedBy = (lst?.plot_derived_by || "").toLowerCase().trim();
  const wasDerivedFromFsiCc = derivedBy === "llm" || derivedBy === "user";
  return {
    fsi: wasDerivedFromFsiCc || hasPlotOverrideValue(lst?.plot_fsi_range),
    cc: wasDerivedFromFsiCc || hasPlotOverrideValue(lst?.plot_construction_cost_range),
  };
};

const getListingCategory = (lst) => (lst?.project_category || lst?.property_type || "").toLowerCase().trim();

const isPlotListingRow = (lst) => {
  const category = getListingCategory(lst);
  return ["plot", "land"].includes(category)
    || (!category && lst?.plot_area_sqft != null && Number(lst.plot_area_sqft) > 0);
};

const isBuiltFormListingRow = (lst) => {
  const category = getListingCategory(lst);
  return ["villa", "building_land", "house", "bungalow"].includes(category);
};

const needsPlotConversionInputs = (lst, subjectPropertyType, valuationApproach) => {
  const subjectType = (subjectPropertyType || "").toLowerCase().trim();
  const approach = (valuationApproach || "").toLowerCase().trim();
  const category = getListingCategory(lst);
  const isRowPlot = isPlotListingRow(lst);
  const isRowBuiltForm = isBuiltFormListingRow(lst);

  if (subjectType === "plot") {
    return isRowBuiltForm || (!category && !isRowPlot && (getPlotOverrideAvailability(lst).fsi || getPlotOverrideAvailability(lst).cc));
  }

  if (["villa", "building_land"].includes(subjectType)) {
    if (approach === "cost") {
      return isRowBuiltForm || (!category && !isRowPlot && (getPlotOverrideAvailability(lst).fsi || getPlotOverrideAvailability(lst).cc));
    }
    return isRowPlot;
  }

  return false;
};

const parseNumericValue = (val) => {
  if (val === null || val === undefined || val === "") return -Infinity;
  if (typeof val === "number") return val;

  let str = String(val).toLowerCase().trim();
  let multiplier = 1;
  if (str.includes("cr") || str.includes("crore")) {
    multiplier = 10000000;
  } else if (str.includes("lac") || str.includes("lakh")) {
    multiplier = 100000;
  } else if (str.includes("k") && !str.includes("sqft") && !str.includes("km")) {
    multiplier = 1000;
  }

  let cleanStr = str
    .replace(/[₹$€£a-z]/gi, "")
    .replace(/,/g, "")
    .trim();

  let parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? -Infinity : parsed * multiplier;
};

const getRowValue = (row, columnKey) => {
  if (!row) return "";
  const rootVal = row[columnKey];
  const compVal = row.comp ? row.comp[columnKey] : undefined;

  if (columnKey === "transaction_date") {
    const r = row.comp || row;
    return r.transaction_date || r.posted_date_raw || "";
  }
  if (columnKey === "comp.location_certainty") {
    const c = row.comp || row;
    return c.location_certainty || (c.location_certainty_score !== undefined ? (c.location_certainty_score >= 0.8 ? "Sure" : "Not Sure") : "—");
  }
  if (columnKey === "comp.confidence_score") {
    const c = row.comp || row;
    return c.confidence_score ?? "—";
  }
  if (columnKey === "rate_per_sqft") {
    const r = row.comp || row;
    const price = r.cleaned_price_value || r.price_value;
    const area = r.final_super_builtup_area;
    return price && area ? Math.round(price / area) : "";
  }
  if (columnKey === "raw_price") {
    const r = row.comp || row;
    return r.original_price_value !== undefined && r.original_price_value !== null
      ? r.original_price_value
      : r.price_value;
  }
  if (columnKey === "cleaned_price_value") {
    const r = row.comp || row;
    return r.cleaned_price_value || r.price_value;
  }
  if (columnKey === "distance_from_subject_km") {
    return row.distanceKm !== undefined && row.distanceKm !== null ? row.distanceKm : (row.comp?.distance_from_subject_km || "");
  }
  if (columnKey === "cbd_data") {
    const cbds = row.cbd_data || [];
    return cbds[0]?.distance_km ?? "";
  }
  if (columnKey === "amenity_summary") {
    try {
      let summary = row.amenity_summary;
      if (typeof summary === 'string') summary = JSON.parse(summary);
      let counts = summary?.counts;
      if (typeof counts === 'string') counts = JSON.parse(counts);
      if (!counts || typeof counts !== 'object') return "";
      return "{" + Object.entries(counts).map(([k, v]) => `'${k}': ${v}`).join(', ') + "}";
    } catch (e) {
      return "";
    }
  }
  if (columnKey.includes(".")) {
    const parts = columnKey.split(".");
    let val = parts.reduce((acc, part) => acc && acc[part], row);
    if (val === undefined && row.comp) {
      val = parts.reduce((acc, part) => acc && acc[part], row.comp);
    }
    return val !== undefined && val !== null ? val : "";
  }

  if (compVal !== undefined && compVal !== null) return compVal;
  if (rootVal !== undefined && rootVal !== null) return rootVal;
  return "";
};

const isNumericColumn = (col) => {
  const numericCols = [
    "distance_from_subject_km",
    "distanceKm",
    "map_search_lat",
    "map_search_lng",
    "confidence_score",
    "location_certainty_score",
    "price_per_sqft",
    "rate_per_sqft",
    "price",
    "price_value",
    "original_price_value",
    "cleaned_price_value",
    "agreement_price",
    "area_sqft",
    "net_carpet_area_sq_m",
    "final_super_builtup_area",
    "floor",
    "floor_number",
    "total_floors",
    "cleaned_floor",
    "cleaned_total_floors",
    "listing_count",
    "avg_rate",
    "ci_90_lower",
    "ci_90_upper",
    "raw_price",
    "builtup_density_score",
    "cbd_nearest_km",
    "total_factor",
    "factored_rate",
    "builtup_density.congestion.score",
    "cbd_data",
    "website_authenticity_score"
  ];
  return numericCols.includes(col);
};

const filterAndSortList = (rows, sortConfig, filterConfig) => {
  if (!rows || rows.length === 0) return [];
  let result = [...rows];

  // 1. Filter
  if (filterConfig) {
    Object.entries(filterConfig).forEach(([col, selectedList]) => {
      if (selectedList === null || selectedList === undefined) return;
      const selectedSet = new Set(selectedList);
      result = result.filter(row => {
        const val = getRowValue(row, col);
        const valStr = val === null || val === undefined || val === "" ? "" : String(val);
        return selectedSet.has(valStr);
      });
    });
  }

  // 2. Sort
  if (sortConfig && sortConfig.column && sortConfig.direction) {
    const col = sortConfig.column;
    const isDesc = sortConfig.direction === "desc";
    const isNumeric = isNumericColumn(col);

    result.sort((a, b) => {
      let valA = getRowValue(a, col);
      let valB = getRowValue(b, col);

      if (isNumeric) {
        valA = parseNumericValue(valA);
        valB = parseNumericValue(valB);
      } else {
        valA = valA === null || valA === undefined ? "" : String(valA).toLowerCase();
        valB = valB === null || valB === undefined ? "" : String(valB).toLowerCase();
      }

      if (valA === valB) return 0;
      if (valA === -Infinity || valA === "") return 1; // blanks to bottom
      if (valB === -Infinity || valB === "") return -1;

      if (isDesc) {
        return valA < valB ? 1 : -1;
      } else {
        return valA > valB ? 1 : -1;
      }
    });
  }
  return result;
};

function SpreadsheetFilterDropdown({
  triggerRef,
  columnKey,
  label,
  uniqueValues,
  sortConfig,
  onSort,
  filterConfig,
  onFilterChange,
  onClose,
}) {
  const dropdownRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const selectedValues = useMemo(() => filterConfig?.[columnKey] || [], [filterConfig, columnKey]);

  useEffect(() => {
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 240;
      const dropdownHeight = 320;

      let left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY + 4;

      if (rect.left + dropdownWidth > window.innerWidth) {
        left = rect.right - dropdownWidth + window.scrollX;
      }
      if (left < 0) {
        left = 8 + window.scrollX;
      }
      if (rect.bottom + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 4 + window.scrollY;
      }

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [triggerRef]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, triggerRef]);

  const filteredOptions = useMemo(() => {
    return uniqueValues.filter(val => {
      const displayVal = val === "" ? "(Blanks)" : val;
      return displayVal.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [uniqueValues, searchQuery]);

  const isAllChecked = !filterConfig?.[columnKey] || filterConfig[columnKey].length === uniqueValues.length;

  const handleToggleOption = (val) => {
    let nextSelected;
    const currentFilter = filterConfig?.[columnKey];
    if (!currentFilter) {
      nextSelected = uniqueValues.filter(v => v !== val);
    } else {
      if (currentFilter.includes(val)) {
        nextSelected = currentFilter.filter(v => v !== val);
      } else {
        nextSelected = [...currentFilter, val];
      }
    }

    if (nextSelected.length === uniqueValues.length) {
      onFilterChange(columnKey, null);
    } else {
      onFilterChange(columnKey, nextSelected);
    }
  };

  const isOptionChecked = (val) => {
    const currentFilter = filterConfig?.[columnKey];
    if (!currentFilter) return true;
    return currentFilter.includes(val);
  };

  const handleSortAsc = () => {
    onSort(columnKey, "asc");
    onClose();
  };

  const handleSortDesc = () => {
    onSort(columnKey, "desc");
    onClose();
  };

  const handleClearSort = () => {
    onSort(columnKey, null);
    onClose();
  };

  const handleClearFilter = () => {
    onFilterChange(columnKey, null);
    onClose();
  };

  const handleSelectOnly = (val) => {
    onFilterChange(columnKey, [val]);
  };

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
      }}
      className="z-[99999] w-60 rounded-xl border border-border bg-bg-card/95 backdrop-blur-md shadow-2xl p-3 text-xs flex flex-col max-h-[320px] animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="pb-2 border-b border-border/50 space-y-1 shrink-0">
        <button
          onClick={handleSortAsc}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-white/5 transition font-medium text-text-primary ${sortConfig?.column === columnKey && sortConfig?.direction === "asc" ? "bg-accent/10 text-accent hover:bg-accent/15" : ""}`}
        >
          <ArrowUp size={13} className="text-text-dim shrink-0" />
          <span>Sort Smallest to Largest</span>
        </button>
        <button
          onClick={handleSortDesc}
          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-white/5 transition font-medium text-text-primary ${sortConfig?.column === columnKey && sortConfig?.direction === "desc" ? "bg-accent/10 text-accent hover:bg-accent/15" : ""}`}
        >
          <ArrowDown size={13} className="text-text-dim shrink-0" />
          <span>Sort Largest to Smallest</span>
        </button>
        {sortConfig?.column === columnKey && sortConfig?.direction && (
          <button
            onClick={handleClearSort}
            className="w-full text-left px-2.5 py-1 rounded-lg flex items-center gap-2 text-danger hover:bg-danger/10 transition"
          >
            <X size={13} className="shrink-0" />
            <span>Clear Sort</span>
          </button>
        )}
      </div>

      <div className="pt-2 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-1 mb-2 shrink-0">
          <span className="font-bold text-text-dim text-[10px] uppercase tracking-wider">Filter Values</span>
          {filterConfig?.[columnKey] && (
            <button
              onClick={handleClearFilter}
              className="text-accent hover:text-accent-light hover:underline font-bold text-[10px] uppercase"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="relative mb-2 shrink-0">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            placeholder="Search values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-deep/50 border border-border/60 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent outline-none transition"
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1 text-[11px]">
          {searchQuery === "" && (
            <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-text-secondary select-none font-medium">
              <input
                type="checkbox"
                checked={isAllChecked}
                onChange={(e) => {
                  if (e.target.checked) {
                    onFilterChange(columnKey, null);
                  } else {
                    onFilterChange(columnKey, []);
                  }
                }}
                className="h-3.5 w-3.5 rounded accent-[#fb923c] border-border"
              />
              <span>(Select All)</span>
            </label>
          )}

          {filteredOptions.length === 0 ? (
            <div className="text-center py-4 text-text-dim italic">No matching values</div>
          ) : (
            filteredOptions.map((val, idx) => {
              const displayVal = val === "" ? "(Blanks)" : val;
              const isChecked = isOptionChecked(val);
              return (
                <div key={idx} className="flex items-center justify-between group/opt rounded hover:bg-white/5 px-2 py-1">
                  <label className="flex items-center gap-2 cursor-pointer text-text-secondary select-none flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleOption(val)}
                      className="h-3.5 w-3.5 rounded accent-[#fb923c] border-border shrink-0"
                    />
                    <span className="truncate" title={displayVal}>{displayVal}</span>
                  </label>
                  <button
                    onClick={() => handleSelectOnly(val)}
                    className="opacity-0 group-hover/opt:opacity-100 text-[10px] text-accent hover:text-accent-light font-bold uppercase transition"
                  >
                    Only
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function TableHeaderCell({
  columnKey,
  label,
  sortConfig,
  onSort,
  filterConfig,
  onFilterChange,
  allRows,
  className = "",
  align = "left",
}) {
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const isSorted = sortConfig?.column === columnKey;
  const sortDir = isSorted ? sortConfig?.direction : null;

  const activeFilters = filterConfig?.[columnKey] || [];
  const hasActiveFilters = activeFilters.length > 0;

  const uniqueValues = useMemo(() => {
    if (!allRows) return [];
    const values = allRows.map(row => {
      const val = getRowValue(row, columnKey);
      return val === null || val === undefined || val === "" ? "" : String(val);
    });
    return Array.from(new Set(values)).sort((a, b) => {
      if (a === "") return 1;
      if (b === "") return -1;
      const numA = parseNumericValue(a);
      const numB = parseNumericValue(b);
      if (numA !== -Infinity && numB !== -Infinity) {
        return numA - numB;
      }
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [allRows, columnKey]);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClose = () => setIsOpen(false);

  return (
    <th className={`px-3 py-2.5 font-semibold group/header relative select-none ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}>
      <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
        <span>{label}</span>

        <div className="flex items-center gap-0.5">
          {isSorted && (
            sortDir === "asc" ? (
              <ArrowUp size={12} className="text-[#fb923c] animate-fade-in" />
            ) : (
              <ArrowDown size={12} className="text-[#fb923c] animate-fade-in" />
            )
          )}
          {hasActiveFilters && (
            <Filter size={10} className="text-[#fb923c] animate-fade-in" />
          )}

          <button
            ref={triggerRef}
            onClick={toggleDropdown}
            className={`opacity-0 group-hover/header:opacity-100 focus:opacity-100 hover:text-accent-light text-text-dim transition p-0.5 rounded ${isOpen ? 'opacity-100 text-accent bg-white/5' : ''}`}
            title="Sort & Filter"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {isOpen && (
        <SpreadsheetFilterDropdown
          triggerRef={triggerRef}
          columnKey={columnKey}
          label={label}
          uniqueValues={uniqueValues}
          sortConfig={sortConfig}
          onSort={onSort}
          filterConfig={filterConfig}
          onFilterChange={onFilterChange}
          onClose={handleClose}
        />
      )}
    </th>
  );
}

// ── Road Type Badge ──────────────────────────────────────────────
function RoadTypeBadge({ type }) {
  if (!type) return <span className="text-text-dim">—</span>;

  const config = {
    'D': { label: 'Expressway', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    'B': { label: 'Primary', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'C': { label: 'Secondary', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    'A': { label: 'Residential', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  };

  const c = config[type] || { label: type, color: 'bg-border/20 text-text-secondary border-border/30' };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.color}`} title={`${c.label} Road`}>
      {type}
    </span>
  );
}

// ── Comparison Modal ─────────────────────────────────────────────
function ComparisonModal({ projects, onClose }) {
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

// ── Comparable Table with Checkboxes ─────────────────────────────
const INITIAL_COMPARABLE_RADIUS_KM = 2;

function getComparableDistanceKm(comp) {
  const rawDistance = comp?.distance_from_subject_km;
  if (rawDistance === null || rawDistance === undefined || rawDistance === "") return null;
  const distance = Number(String(rawDistance).replace(/[^\d.-]/g, ""));
  return Number.isFinite(distance) ? distance : null;
}

function ComparableTable({ comparables, selectedComps, onToggle, selectable }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showAllComparables, setShowAllComparables] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all"); // "all" | "Web" | "Internal DB"
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [filterConfig, setFilterConfig] = useState({});

  const compsList = useMemo(() => comparables || [], [comparables]);

  // Detect whether mixed sources exist
  const hasMixedSources = useMemo(() => {
    return compsList.some(c => c.data_source === "Internal DB") && compsList.some(c => c.data_source === "Web");
  }, [compsList]);

  const filteredComparables = useMemo(() => {
    return sourceFilter === "all"
      ? compsList
      : compsList.filter(c => (c.data_source || "Web") === sourceFilter);
  }, [compsList, sourceFilter]);

  const indexedComparables = useMemo(() => {
    return filteredComparables.map((comp) => ({
      comp,
      originalIndex: compsList.indexOf(comp), // keep original indices for selection
      distanceKm: getComparableDistanceKm(comp),
    }));
  }, [filteredComparables, compsList]);

  const processedComparables = useMemo(() => {
    return filterAndSortList(indexedComparables, sortConfig, filterConfig);
  }, [indexedComparables, sortConfig, filterConfig]);

  const nearbyComparables = useMemo(() => {
    return processedComparables.filter(({ distanceKm }) => distanceKm !== null && distanceKm <= INITIAL_COMPARABLE_RADIUS_KM);
  }, [processedComparables]);

  if (compsList.length === 0) return null;

  const visibleComparables = showAllComparables ? processedComparables : nearbyComparables;
  const hiddenComparableCount = Math.max(indexedComparables.length - nearbyComparables.length, 0);
  const hasHiddenComparables = hiddenComparableCount > 0;
  const visibleResultLabel = showAllComparables
    ? `${filteredComparables.length} results`
    : `${nearbyComparables.length} within ${INITIAL_COMPARABLE_RADIUS_KM} km`;
  const allSelected = visibleComparables.length > 0 && visibleComparables.every(({ originalIndex }) => selectedComps?.has(originalIndex));

  const renderTable = (maxHeightClass = "") => (
    <div className="relative">
      <div className={`overflow-x-auto ${maxHeightClass} custom-scrollbar`}>
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-bg-input shadow-sm">
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
              {selectable && (
                <th className="px-3 py-2.5 font-semibold">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        visibleComparables.forEach(({ originalIndex }) => onToggle?.(originalIndex, false));
                      } else {
                        visibleComparables.forEach(({ originalIndex }) => onToggle?.(originalIndex, true));
                      }
                    }}
                    className="h-3.5 w-3.5 cursor-pointer rounded accent-[#fb923c]"
                  />
                </th>
              )}
              <TableHeaderCell columnKey="project_name" label="Project Name" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="location" label="Location" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="country" label="Country" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="property_type" label="Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="project_category" label="Property Category" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="distance_from_subject_km" label="Distance" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="map_search_lat" label="Lat" align="right" className="text-warning" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="map_search_lng" label="Lng" align="right" className="text-warning" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="possession_status" label="Status" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="reason" label="Reason" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="comp.confidence_score" label="Confidence" align="center" className="text-accent-light whitespace-nowrap" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="confidence_reasoning" label="Confidence Reasoning" className="whitespace-nowrap" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="comp.location_certainty" label="Location Certainty" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="source_url" label="Source URL" className="whitespace-nowrap" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
              <TableHeaderCell columnKey="data_source" label="Source" className="whitespace-nowrap" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={indexedComparables} />
            </tr>
          </thead>
          <tbody>
            {visibleComparables.map(({ comp, originalIndex }) => {
              const isChecked = selectedComps?.has(originalIndex);
              return (
                <tr
                  key={`${comp.project_name}-${originalIndex}`}
                  className={`border-b border-border/50 transition ${isChecked ? "bg-[rgba(251,146,60,0.08)]" : "hover:bg-[rgba(251,146,60,0.04)]"}`}
                >
                  {selectable && (
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked || false}
                        onChange={() => onToggle?.(originalIndex, !isChecked)}
                        className="h-3.5 w-3.5 cursor-pointer rounded accent-[#fb923c]"
                      />
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
                  <td className="px-3 py-2.5 text-right font-mono text-warning/80">{comp.map_search_lat || "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-warning/80">{comp.map_search_lng || "—"}</td>
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
                  <td className="px-3 py-2.5 text-text-secondary truncate max-w-[200px]">
                    {comp.source_url ? (
                      <a href={comp.source_url} target="_blank" rel="noreferrer" className="text-accent-light underline underline-offset-2 hover:text-accent font-medium">
                        {comp.source_url}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {comp.data_source === "Internal DB" ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Transaction</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">Web</span>
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
          No comparable projects found within {INITIAL_COMPARABLE_RADIUS_KM} km.
          {hasHiddenComparables ? " Use Show more to view farther projects." : ""}
        </div>
      )}
      {hasHiddenComparables && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-bg-input/40 px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim">
            {showAllComparables ? "Showing all comparable projects" : `${hiddenComparableCount} farther project(s) hidden`}
          </span>
          <button
            type="button"
            onClick={() => setShowAllComparables((prev) => !prev)}
            className="rounded-lg border border-[#fb923c]/35 bg-[#fb923c]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#fb923c] transition hover:border-[#fb923c] hover:bg-[#fb923c]/15"
          >
            {showAllComparables ? `Show within ${INITIAL_COMPARABLE_RADIUS_KM} km` : "Show more"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel transition-all duration-300">
        <div className="border-b border-border bg-[rgba(251,146,60,0.06)] px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(251,146,60,0.15)] text-sm">🏘️</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#fb923c]">Comparable Projects Found</span>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-deep/50 p-0.5">
              {["all", "Web", "Internal DB"].map(opt => {
                const count = opt === "all"
                  ? comparables.length
                  : opt === "Web"
                    ? comparables.filter(c => (c.data_source || "Web") === "Web").length
                    : comparables.filter(c => c.data_source === "Internal DB").length;
                const label = opt === "all" ? "All" : opt === "Internal DB" ? "Transaction" : opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setSourceFilter(opt)}
                    className={`rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition ${sourceFilter === opt
                      ? "bg-[#fb923c] text-bg-deep shadow"
                      : "text-text-dim hover:text-text-primary"
                      }`}
                  >
                    {`${label} (${count})`}
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-dim">{visibleResultLabel}</span>
              <button
                onClick={() => setIsMaximized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-[#fb923c] hover:text-[#fb923c]"
                title="Maximize Table"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>
        {renderTable("max-h-[360px] overflow-y-auto")}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-[rgba(251,146,60,0.06)] px-6 py-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(251,146,60,0.15)] text-lg">🏘️</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#fb923c]">Comparable Projects Detail</h3>
                  <p className="text-[10px] text-text-dim">{visibleResultLabel} found in vicinity</p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-deep/50 p-0.5">
                {["all", "Web", "Internal DB"].map(opt => {
                  const count = opt === "all"
                    ? comparables.length
                    : opt === "Web"
                      ? comparables.filter(c => (c.data_source || "Web") === "Web").length
                      : comparables.filter(c => c.data_source === "Internal DB").length;
                  const label = opt === "all" ? "All" : opt === "Internal DB" ? "Transaction" : opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setSourceFilter(opt)}
                      className={`rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition ${sourceFilter === opt
                        ? "bg-[#fb923c] text-bg-deep shadow"
                        : "text-text-dim hover:text-text-primary"
                        }`}
                    >
                      {`${label} (${count})`}
                    </button>
                  );
                })}
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

// ── Listing Table ────────────────────────────────────────────────
function ListingTable({ listings, dbTransactions }) {
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
          <td colSpan="100" className="bg-[rgba(255,255,255,0.02)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
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
          <td className="px-3 py-2 text-right font-mono text-accent-light whitespace-nowrap">
            {lst.price_per_sqft ? `${lst.price_per_sqft.toLocaleString()}` : "—"}
          </td>
          <td className="px-3 py-2 text-right font-mono text-text-secondary whitespace-nowrap">{lst.area_sqft || "—"} {lst.area_sqft ? 'sqft' : ''}</td>
          <td className="px-3 py-2 text-text-dim">{lst.area_type || "—"}</td>
          <td className="px-3 py-2 text-center">
            {lst.is_subject ? (
              <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-400 border border-purple-500/20">Subject</span>
            ) : (
              <span className="rounded-md bg-[#fb923c]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#fb923c] border border-[#fb923c]/20">Comparable</span>
            )}
          </td>
          <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.floor || "—"}</td>
          <td className="px-3 py-2 text-center font-mono text-text-dim">{lst.total_floors || "—"}</td>
          <td className="px-3 py-2 text-text-secondary whitespace-nowrap">{lst.location || "—"}</td>
          <td className="px-3 py-2 text-center font-mono text-text-secondary whitespace-nowrap">
            {lst.transaction_date ? formatDate(lst.transaction_date) : (lst.posted_date_raw || "—")}
          </td>
          <td className="px-3 py-2 text-center font-mono whitespace-nowrap">
            {lst.website_authenticity_score !== undefined && lst.website_authenticity_score !== null ? (
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${lst.website_authenticity_score >= 90
                  ? "bg-success/20 text-success border border-success/30"
                  : lst.website_authenticity_score >= 70
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "bg-danger/20 text-danger border border-danger/30"
                }`}>
                {lst.website_authenticity_score}
              </span>
            ) : "—"}
          </td>
          <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
            {lst.website_authenticity_category || "—"}
          </td>
          <td className="max-w-[200px] truncate px-3 py-2 text-text-dim">
            {lst._is_db ? (
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Transaction</span>
            ) : lst.source_url ? (
              <a href={lst.source_url} target="_blank" rel="noreferrer" className="text-accent-light underline underline-offset-2 hover:text-accent font-medium">
                {lst.source_url}
              </a>
            ) : "—"}
          </td>
        </tr>
      ))}
    </>
  );

  const renderTable = (maxHeightClass = "") => (
    <div className={`overflow-x-auto ${maxHeightClass} custom-scrollbar`}>
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-bg-input shadow-sm">
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
            <TableHeaderCell columnKey="project_name" label="Project" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="property_type" label="Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="project_category" label="Property Category" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="listing_type" label="List Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="bhk" label="BHK" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="currency" label="Currency" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="price" label="Price" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="price_per_sqft" label="Price/Sqft" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="area_sqft" label="Area" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="area_type" label="Area Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="is_subject" label="Role" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="floor" label="Floor" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="total_floors" label="Total Floor" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="location" label="Location" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="transaction_date" label="Date" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="website_authenticity_score" label="Authenticity" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
            <TableHeaderCell columnKey="website_authenticity_category" label="Site Type" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={allListingRowsCombined} />
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
        <div className="border-b border-border bg-[rgba(34,211,238,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(34,211,238,0.15)] text-sm">📊</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-400">Market Signal</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-dim">{(listings || []).length} web + {dbRows.length} db records</span>
              <button
                onClick={() => setIsMaximized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg-card text-[10px] text-text-dim transition hover:border-cyan-400 hover:text-cyan-400"
                title="Maximize Table"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>
        {renderTable("max-h-[360px] overflow-y-auto")}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-[rgba(34,211,238,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(34,211,238,0.15)] text-lg">📊</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Market Signal</h3>
                  <p className="text-[10px] text-text-dim">{((listings || []).length + dbRows.length)} total records found</p>
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

// ── Transaction Table (Internal DB) ─────────────────────────────────────────
function TransactionTable({ transactions }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [filterConfig, setFilterConfig] = useState({});

  const processedTransactions = useMemo(() => {
    return filterAndSortList(transactions || [], sortConfig, filterConfig);
  }, [transactions, sortConfig, filterConfig]);

  if (!transactions || transactions.length === 0) return null;

  const tableContent = (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-bg-input shadow-sm">
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
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
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                  Transaction
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
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-400">Transactions</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">{transactions.length} records</span>
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
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">Transactions</h3>
                  <p className="text-[10px] text-text-dim">{transactions.length} total records</p>
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

// ── Helper: Format Price based on Currency ───────────────────
function formatPrice(value, currency = "INR") {
  if (!value && value !== 0) return "—";

  const curr = currency === "\u20B9" ? "INR" : (currency || "INR");
  const isIndian = curr === "INR";

  if (isIndian) {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lac`;
    return `₹${Number(value).toLocaleString('en-IN')}`;
  }

  // International formatting
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 0,
    }).format(value);
  } catch (e) {
    return `${curr} ${Number(value).toLocaleString()}`;
  }
}

// ── Helper: Format Date ──────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return String(dateStr).split(/[T ]/)[0];
}

// ── Cleaned Data Table ──────────────────────────────────────────
function CleanedTable({ listings, reviewListings = [], droppedListings = [], onRecalculate, subjectPropertyType, valuationApproach }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [fsiGlobal, setFsiGlobal] = useState("");
  const [ccGlobal, setCcGlobal] = useState("");
  const [rowOverrides, setRowOverrides] = useState({}); // { uniqueKey: { fsi_low, fsi_high, cc_low, cc_high } }
  const [activeTab, setActiveTab] = useState("valid"); // "valid" | "outliers" | "dropped"
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [filterConfig, setFilterConfig] = useState({});

  // Reset filters and sort whenever the tab changes.
  // filterConfig values are built from the current tab's row data — they are not
  // transferable across tabs (Valid vs Outlier vs Dropped have different value sets).
  // Without this reset, switching tabs leaves stale filters active, causing wrong
  // rows to appear in the new tab (the reported bug).
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

  // Detect if we have plot data and if the subject itself is a plot
  // Detect if the subject itself is a plot or villa
  const hasPlotData = listingsList.some(lst => lst.plot_derived_rate_per_sqft !== undefined && lst.plot_derived_rate_per_sqft !== null);
  const isPlotSubject = ["plot", "villa", "building_land"].includes(subjectPropertyType?.toLowerCase()?.trim());
  const isVillaSubject = ["villa", "building_land"].includes(subjectPropertyType?.toLowerCase()?.trim());
  // In Cost Approach, villa subject derives the PLOT/LAND rate (reverse residual: villa price - CC = land value)
  // In Market Approach, villa subject derives the VILLA built-up rate (plot comps × FSI + CC)
  const isCostApproach = valuationApproach?.toLowerCase?.() === "cost";
  // derivedRateLabel reflects what is being DERIVED, not the subject type
  const derivedRateLabel = (isVillaSubject && isCostApproach) ? "Plot" : (isVillaSubject ? "Villa" : "Plot");

  // Always show the FSI/CC overrides if the subject is a plot or villa
  const showPlotControls = isPlotSubject;

  const showReasonColumn = activeTab === "outliers" || activeTab === "dropped";

  // Helper: extract reason for drop/outlier
  const getRowReason = (lst) => {
    if (activeTab === "outliers") return "Statistical outlier (IQR)";
    if (lst.is_duplicate) return "Duplicate listing";
    return lst.cleaned_irrelevance_reason || lst.irrelevance_reason || "Not relevant for valuation";
  };

  const tableContent = (
    <div className={`overflow-x-auto overflow-y-auto custom-scrollbar ${isMaximized ? '' : 'max-h-[500px]'}`}>
      <table className="w-full text-left text-xs relative">
        <thead className="sticky top-0 z-[11] bg-bg-input shadow-sm">
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
            <TableHeaderCell columnKey="cleaned_match_project" label="Matched Project" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
            <TableHeaderCell columnKey="project_category" label="Property Category" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
            <TableHeaderCell columnKey="cleaned_currency" label="Currency" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
            <TableHeaderCell columnKey="cleaned_config" label="Config" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
            <TableHeaderCell columnKey="raw_price" label="Raw Price" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
            <TableHeaderCell columnKey="cleaned_price_value" label="Standardized Price" align="right" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
            <TableHeaderCell columnKey="exchange_rate_remark" label="Exchange Rate" align="center" sortConfig={sortConfig} onSort={(col, dir) => setSortConfig({ column: col, direction: dir })} filterConfig={filterConfig} onFilterChange={(col, list) => setFilterConfig(prev => ({ ...prev, [col]: list }))} allRows={displayedListings} />
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
                        Any location does not have one fixed FSI/FAR; it depends on the specific plot, zoning,  Development authority approvals & various other factors
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
            // project_category is "plot" / "land" / "villa" — use it as the primary signal.
            // Fall back to plot_area_sqft presence if project_category is absent.
            const isRowPlot = isPlotListingRow(lst);
            // For plot rows: use plot_area_sqft first, then cleaned_area_sqft as fallback
            const plotAreaValue = lst.plot_area_sqft || (isRowPlot ? lst.cleaned_area_sqft : null);
            // Rate/sqft divisor: plot rows use plotAreaValue, others use final_super_builtup_area
            const rowAreaForRate = isRowPlot
              ? plotAreaValue
              : (lst.final_super_builtup_area || lst.cleaned_area_sqft);
            return (
              <tr key={`${activeTab}_${idx}_${rKey}`} className={`border-b border-border/50 transition hover:bg-[rgba(251,146,60,0.04)] ${activeTab === 'dropped' ? 'opacity-60' : activeTab === 'outliers' ? 'bg-[rgba(239,68,68,0.03)]' : ''}`}>
                <td className="px-3 py-2 font-medium text-text-primary whitespace-nowrap">
                  {lst.cleaned_match_project || lst.project_name || "—"}
                </td>
                {/* Property Category badge */}
                <td className="px-3 py-2 whitespace-nowrap">
                  {lst.project_category ? (
                    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${["plot", "land"].includes((lst.project_category || "").toLowerCase())
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

                {/* Raw Price Column */}
                <td className="px-3 py-2 text-right font-mono text-text-secondary whitespace-nowrap">
                  {lst.original_price_value !== undefined && lst.original_price_value !== null
                    ? formatPrice(lst.original_price_value, lst.original_currency || lst.currency)
                    : formatPrice(lst.price_value, lst.currency)}
                </td>

                {/* Standardized Price Column */}
                <td className="px-3 py-2 text-right font-mono text-text-primary whitespace-nowrap font-semibold">
                  {formatPrice(lst.cleaned_price_value || lst.price_value, lst.cleaned_currency || lst.currency)}
                </td>

                {/* Exchange Rate Column */}
                <td className="px-3 py-2 text-center font-mono text-text-secondary text-[11px] whitespace-nowrap">
                  {lst.exchange_rate_remark && lst.exchange_rate_remark !== "1.0"
                    ? lst.exchange_rate_remark
                    : "1.0"}
                </td>

                <td className="px-3 py-2 text-right font-mono text-text-secondary">
                  {lst.cleaned_area_sqft || "—"} <span className="text-[10px] opacity-50">{lst.cleaned_area_type}</span>
                </td>
                {/* Normalized Area (SBUA) — only filled for villa / non-plot rows */}
                <td className="px-3 py-2 text-right font-mono text-accent-light font-bold">
                  {!isRowPlot && lst.final_super_builtup_area
                    ? `${Math.round(lst.final_super_builtup_area)} sqft`
                    : "—"}
                </td>
                {/* Plot Area — only filled for plot rows; falls back to cleaned_area_sqft */}
                {isPlotSubject && (
                  <td className="px-3 py-2 text-right font-mono text-emerald-400 font-bold whitespace-nowrap">
                    {isRowPlot && plotAreaValue
                      ? `${Math.round(plotAreaValue).toLocaleString()} sqft`
                      : "—"}
                  </td>
                )}
                {/* Rate / Sqft — uses the relevant area field per row type */}
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
                        : (lst.plot_negative_value_flag ? <span className="text-danger font-bold text-[10px]">NEG VALUE</span> : "—")}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${lst.plot_derived_by === 'user' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-bg-deep/40 text-text-dim border border-border/30'}`}>
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
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${lst.source === 'Internal DB' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                    {lst.source === 'Internal DB' ? 'Transaction' : (lst.source || "Web")}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${lst.stat_flag === 'outlier' ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                    {lst.stat_flag || "ok"}
                  </span>
                </td>
                {showReasonColumn && (
                  <td className="px-3 py-2 text-[10px] text-text-dim max-w-[200px] truncate" title={getRowReason(lst)}>
                    {getRowReason(lst)}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.01] backdrop-blur-md shadow-2xl transition-all duration-300 hover:shadow-cyan-500/5">
        <div className="border-b border-white/[0.06] bg-[rgba(251,146,60,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(251,146,60,0.15)] text-sm">🧹</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#fb923c]">
              {hasPlotData ? `Cleaned & ${derivedRateLabel} Valuation Data` : "Cleaned & Normalized Data"}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-text-dim">{listings.length} valid records</span>
              <button
                onClick={() => setIsMaximized(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.08] bg-bg-card text-[10px] text-text-dim transition hover:border-[#fb923c] hover:text-[#fb923c]"
                title="Maximize Table"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-bg-deep/30 px-4 py-2.5">
          <div className="flex items-center rounded-xl border border-white/[0.06] bg-bg-deep/60 p-0.5 gap-0.5">
            <button
              onClick={() => setActiveTab("valid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "valid" ? "bg-success/20 text-success border border-success/30 shadow-[0_0_8px_rgba(34,197,94,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
            >
              ✅ Valid ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab("outliers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "outliers" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
            >
              ⚠️ Outliers ({reviewListings.length})
            </button>
            <button
              onClick={() => setActiveTab("dropped")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "dropped" ? "bg-danger/20 text-danger border border-danger/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
            >
              ❌ Dropped ({droppedListings.length})
            </button>
          </div>
        </div>

        {showPlotControls && onRecalculate && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-bg-deep/50 px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim mr-2">Global Overrides:</span>
            <input
              type="number"
              step="0.1"
              placeholder="FSI"
              value={fsiGlobal}
              onChange={e => setFsiGlobal(e.target.value)}
              className="w-24 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-[11px] text-white outline-none focus:border-[#fb923c]"
            />
            <input
              type="number"
              placeholder="Construction Cost (₹/sqft)"
              value={ccGlobal}
              onChange={e => setCcGlobal(e.target.value)}
              className="w-32 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-[11px] text-white outline-none focus:border-[#fb923c]"
            />
            <div className="h-4 w-px bg-border mx-2" />
            <button
              onClick={() => onRecalculate(fsiGlobal, ccGlobal, rowOverrides, "global")}
              className="rounded-lg bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20 hover:bg-[#fb923c]/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition"
            >
              Apply All & Recalculate
            </button>
            {Object.keys(rowOverrides).length > 0 && (
              <>
                <button
                  onClick={() => onRecalculate("", "", rowOverrides, "edited")}
                  className="rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition"
                >
                  Recalculate Edits
                </button>
                <button
                  onClick={() => setRowOverrides({})}
                  className="text-[10px] text-danger hover:underline font-bold uppercase ml-2"
                >
                  Reset Edits
                </button>
              </>
            )}
          </div>
        )}

        {tableContent}
      </div>

      {isMaximized && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-[rgba(251,146,60,0.06)] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(251,146,60,0.15)] text-lg">🧹</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#fb923c]">
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
              {/* Tab Bar (maximized) */}
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-bg-deep/30 px-4 py-2.5 shrink-0">
                <div className="flex items-center rounded-xl border border-white/[0.06] bg-bg-deep/60 p-0.5 gap-0.5">
                  <button
                    onClick={() => setActiveTab("valid")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "valid" ? "bg-success/20 text-success border border-success/30 shadow-[0_0_8px_rgba(34,197,94,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
                  >
                    ✅ Valid ({listings.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("outliers")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "outliers" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
                  >
                    ⚠️ Outliers ({reviewListings.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("dropped")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "dropped" ? "bg-danger/20 text-danger border border-danger/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]" : "text-text-dim hover:text-text-secondary"}`}
                  >
                    ❌ Dropped ({droppedListings.length})
                  </button>
                </div>
              </div>

              {/* Table (full-width, scrollable) */}
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

// ── Factorial Rate Summary Table ──────────────────────────────────────────────
function FactorialTable({ data, onCalculateRate, isCalculatingRate = false, canCalculateRate = true }) {
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
  const areaUnit = data.area_unit || "sqft";

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  });

  const fmt = (v) => (!v && v !== 0) ? "—" : formatter.format(v);

  const renderTable = (maxHeightClass = "") => (
    <div className={`overflow-x-auto ${maxHeightClass} custom-scrollbar`}>
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-bg-input shadow-sm">
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-dim">
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
                        <span className="ml-2 inline-flex items-center rounded-full bg-[rgba(167,139,250,0.18)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a78bfa] border border-[rgba(167,139,250,0.3)]">Subject</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md bg-[rgba(167,139,250,0.12)] px-1.5 text-[11px] font-bold text-[#c4b5fd]">{row.listing_count}</span>
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

                        const dictStr = "{" + Object.entries(counts).map(([k, v]) => `'${k}': ${v}`).join(', ') + "}";

                        return (
                          <div className="group relative">
                            <div className="max-w-[200px] font-mono text-[9px] leading-relaxed text-text-dim bg-bg-deep/30 p-2 rounded-lg border border-border/30 break-words hover:text-accent hover:border-accent/30 transition-colors">
                              {dictStr}
                            </div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-header px-2 py-1 rounded text-[10px] border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                              Categorical Amenity Distribution
                            </div>
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
                    <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-bold ${row.builtup_density?.congestion?.level === 'HIGH' ? 'bg-red-500/10 text-red-400' :
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
                      <span className="text-text-dim text-[9px]">—</span>
                    ) : row.rate_derived_from === "micromarket" ? (
                      <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/20" title="Rate derived from comparable projects average (±5% CI)">
                        Micromarket
                      </span>
                    ) : row.rate_derived_from === "mixed" ? (
                      <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500/10 to-purple-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#d8b4fe] border border-purple-500/20" title="Rate derived from both Web Listings and Internal Database">
                        Web + DB
                      </span>
                    ) : row.rate_derived_from === "internal_db" || row.rate_derived_from === "Internal DB" ? (
                      <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-400 border border-purple-500/20" title="Rate derived from internal database transactions">
                        Transaction
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-400/20" title="Rate derived from actual listing data">
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
                      className="border-b border-border/30 bg-bg-deep/20 text-text-dim text-[11px] transition hover:bg-bg-deep/40"
                    >
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 pl-8 font-normal whitespace-nowrap text-text-dim flex items-center gap-1.5">
                        <span className="text-border">└──</span>
                        <span>{isSubDb ? "Internal DB Transactions" : "Web Listings"}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded bg-white/5 px-1.5 text-[10px] font-semibold text-text-dim">
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
                          <span className="inline-flex items-center rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-purple-400/80 border border-purple-500/20">
                            Transaction
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400/80 border border-emerald-400/20">
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
  );

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.01] backdrop-blur-md shadow-2xl transition-all duration-300 hover:shadow-purple-500/5">
        <div className="border-b border-white/[0.06] bg-[rgba(167,139,250,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(167,139,250,0.15)] text-sm">📈</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a78bfa]">Comparable Project Metrics</span>
            <div className="ml-auto flex items-center gap-3">
              {selectedForComparison.size >= 2 && (
                <button
                  onClick={() => setShowComparison(true)}
                  className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition"
                >
                  Compare {selectedForComparison.size}
                </button>
              )}
              <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-text-dim">{data.table.length} projects · {data.total_valid} listings</span>
              <button onClick={() => setIsMaximized(true)} className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.08] bg-bg-card text-[10px] text-text-dim transition hover:border-[#a78bfa] hover:text-[#a78bfa]" title="Maximize Table">⛶</button>
            </div>
          </div>
        </div>
        {renderTable("max-h-[360px] overflow-y-auto")}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-light">Ready For Final Rate</p>
          <p className="mt-1 text-xs text-text-dim">Review the Comparable Project Metrics and map factors, then calculate the saleable-area rate.</p>
        </div>
        <button
          type="button"
          onClick={onCalculateRate}
          disabled={!canCalculateRate || isCalculatingRate}
          className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-bg-deep transition hover:scale-[1.02] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
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
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#a78bfa]">Comparable Project Metrics</h3>
                  <p className="text-[10px] text-text-dim">{data.table.length} projects · {data.total_valid} listings · {currency}/{areaUnit}</p>
                </div>
              </div>
              <button onClick={() => setIsMaximized(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-bg-input text-lg text-text-dim transition hover:bg-danger/10 hover:text-danger">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="min-w-max border border-border rounded-2xl overflow-hidden">
                {renderTable("")}
              </div>
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}

// ── Final Valuation Result ─────────────────────────────────────
function ValuationResult({ data, currency = "INR" }) {
  const [confLevel, setConfLevel] = useState("95");
  const [showCalc, setShowCalc] = useState(false);

  if (!data) return null;

  const { mean_rate, std_dev, sample_size, sem, moe, critical_values } = data;
  const currentMoe = moe[confLevel] || 0;
  const currentCv = critical_values[confLevel] || 0;

  const lower = mean_rate - currentMoe;
  const upper = mean_rate + currentMoe;

  const locale = currency === "INR" ? "en-IN" : "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  });

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[rgba(16,185,129,0.28)] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(11,14,20,0.92))] shadow-[0_20px_40px_rgba(0,0,0,0.35)] animate-in slide-in-from-bottom-2">
      <div className="border-b border-[rgba(16,185,129,0.16)] bg-[rgba(16,185,129,0.06)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.12)] text-lg text-[#10b981]">
              🎯
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#10b981]">
                Final Valuation
              </p>
              <p className="text-[10px] text-text-dim">
                Based on {sample_size} pooled comparable listings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-text-dim hidden sm:inline">Confidence:</span>
            <select
              value={confLevel}
              onChange={(e) => setConfLevel(e.target.value)}
              className="rounded-lg border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] px-2 py-1 text-xs font-bold text-[#10b981] outline-none cursor-pointer hover:bg-[rgba(16,185,129,0.15)] transition"
            >
              <option value="90" style={{ backgroundColor: 'var(--bg-dark, #0b0e14)', color: 'var(--text-primary, #f8fafc)' }}>90%</option>
              <option value="95" style={{ backgroundColor: 'var(--bg-dark, #0b0e14)', color: 'var(--text-primary, #f8fafc)' }}>95%</option>
              <option value="99" style={{ backgroundColor: 'var(--bg-dark, #0b0e14)', color: 'var(--text-primary, #f8fafc)' }}>99%</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-5 text-center">
        <p className="mb-1 text-xs text-text-secondary uppercase tracking-widest">Estimated Value / Sqft</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span className="text-3xl font-black tracking-tight text-white">{formatter.format(mean_rate)}</span>
          <span className="text-lg font-bold text-text-dim">± {formatter.format(currentMoe)}</span>
        </div>
        <p className="mt-3 text-sm font-bold text-[#10b981]">
          {formatter.format(lower)} <span className="text-text-dim mx-2 font-normal">—</span> {formatter.format(upper)}
        </p>
      </div>

      <div className="border-t border-white/5 bg-bg-deep/50 px-4 py-3">
        <button
          onClick={() => setShowCalc(!showCalc)}
          className="flex w-full items-center justify-between text-xs font-semibold text-text-dim hover:text-[#10b981] transition"
        >
          <span>View Calculation Breakdown</span>
          <span>{showCalc ? "▲" : "▼"}</span>
        </button>
        {showCalc && (
          <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-black/20 p-4 text-xs font-mono text-text-secondary animate-in fade-in duration-200">
            <div className="flex justify-between"><span className="text-text-dim">Sample Mean (x̄)</span> <span className="text-white">{formatter.format(mean_rate)}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Standard Deviation (s)</span> <span className="text-white">{formatter.format(std_dev)}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Sample Size (n)</span> <span className="text-white">{sample_size}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Standard Error (s / √n)</span> <span className="text-white">{formatter.format(sem)}</span></div>
            <div className="my-2 border-t border-dashed border-white/10" />
            <div className="flex justify-between"><span className="text-text-dim">{sample_size < 30 ? "T-Score" : "Z-Score"} ({confLevel}%)</span> <span className="text-white">{currentCv}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Margin of Error (CV × SE)</span> <span className="text-white">{formatter.format(currentMoe)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
// ── Amenity Cell Chips ────────────────────────────────────────────────────────
function AmenityCellChips({ summary, isSubject }) {
  if (!summary || summary === "—") return <span className="text-text-dim text-[9px]">—</span>;
  const chips = summary
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const parts = s.split(":");
      return { label: parts[0]?.trim(), count: parts[1]?.trim() };
    })
    .filter(c => c.label && c.count && c.count !== "0");
  if (!chips.length) return <span className="text-text-dim text-[9px]">{summary}</span>;
  return (
    <div className="flex flex-wrap justify-center gap-1 py-0.5">
      {chips.map((c, i) => (
        <span key={i} className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[8px] font-bold border ${isSubject ? "border-green-500/25 bg-green-500/10 text-green-400" : "border-blue-500/20 bg-blue-500/[0.07] text-blue-300"}`}>
          <span className="opacity-70">{c.label}</span>
          <span className="font-black">{c.count}</span>
        </span>
      ))}
    </div>
  );
}

// ── CBD Cell ──────────────────────────────────────────────────────────────────
function CbdCell({ km, name, isSubject }) {
  if (km == null && !name) return <span className="text-text-dim text-[9px]">—</span>;
  return (
    <div className="flex flex-col items-center gap-0.5">
      {name && (
        <span className={`text-[8px] font-bold leading-tight text-center max-w-[120px] ${isSubject ? "text-green-400/80" : "text-blue-300/80"}`}>
          {name}
        </span>
      )}
      {km != null && (
        <span className="font-mono text-[9px] text-text-dim font-bold">{Number(km).toFixed(1)} km</span>
      )}
    </div>
  );
}

function FactoringResultCard({ data, area_unit, subjectData, onUpdateData }) {
  const [showReport, setShowReport] = useState(false);
  const [isSectionMaximized, setIsSectionMaximized] = useState(false);

  // Cache original data for Reset functionality when the card is first mounted
  const [originalData] = useState(() => JSON.parse(JSON.stringify(data)));

  if (!data) return null;

  const {
    comparable_factoring_table = [],
    blending = {},
    subject_final_rate,
    subject_rate_range,
    confidence,
    raw_markdown_report,
    reconciliation_note,
    limited_evidence_note,
    subject_only_mode,
  } = data;

  const currencyCode = subjectData?.currency || "INR";
  const locale = currencyCode === "INR" ? "en-IN" : "en-US";
  const formatter = new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
  const fmtRate = (v) => v != null ? formatter.format(Number(v)) : "—";
  const fmtPct = (v) => {
    if (v == null) return "—";
    const n = Number(v) * 100;
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  };
  const adjColor = (v) => {
    if (v == null) return "text-text-dim";
    const n = Number(v);
    if (n > 0) return "text-green-400";
    if (n < 0) return "text-red-400";
    return "text-text-dim";
  };

  const subjectRow = comparable_factoring_table.find(r => r.role === "SUBJECT");
  const compRows = comparable_factoring_table.filter(r => r.role !== "SUBJECT");
  const finalRate = Number(subject_final_rate || 0);
  const area = Number(subjectData?.salable_area_sqft || subjectData?.carpet_area_sqft || subjectData?.builtup_area_sqft || 0);

  const subjectListings = Number(subjectData?.listing_count || blending.subject_listing_count || 0);
  const capLimit = subjectListings >= 10 ? 0.10 : 0.20;

  // Custom helper function to check if a project has custom factor overrides
  const isProjectModified = (projectName) => {
    const origRow = originalData.comparable_factoring_table?.find(r => r.project_name === projectName);
    const currRow = comparable_factoring_table.find(r => r.project_name === projectName);
    if (!origRow || !currRow) return false;
    return (
      origRow.factor_road !== currRow.factor_road ||
      origRow.factor_amenity !== currRow.factor_amenity ||
      origRow.factor_density !== currRow.factor_density ||
      origRow.factor_cbd !== currRow.factor_cbd
    );
  };

  // Custom helper to check if weights have been modified from original
  const isWeightsModified = () => {
    return (
      originalData.blending?.w1 !== blending.w1 ||
      originalData.blending?.w2 !== blending.w2
    );
  };

  // Helper to check if a comparable hit the cap
  const isCapped = (projectName) => {
    const currRow = comparable_factoring_table.find(r => r.project_name === projectName);
    if (!currRow) return false;
    const sum = (currRow.factor_road ?? 0) + (currRow.factor_amenity ?? 0) + (currRow.factor_density ?? 0) + (currRow.factor_cbd ?? 0);
    return Math.abs(sum) > capLimit;
  };

  // Recalculates other dependent fields and triggers parent update handler
  const recalculateAndTrigger = (newTable, w1, w2) => {
    const compRowsOnly = newTable.filter((r) => r.role !== "SUBJECT");
    const compCount = compRowsOnly.length;
    const factoredCompAvg = compCount > 0
      ? Math.round(compRowsOnly.reduce((sum, r) => sum + (r.factored_rate ?? 0), 0) / compCount)
      : 0;

    const sRate = subjectRow ? Number(subjectRow.avg_rate ?? 0) : 0;

    let finalRate = 0;
    if (subjectListings > 0 && sRate > 0) {
      finalRate = Math.round(w1 * sRate + w2 * factoredCompAvg);
    } else {
      finalRate = Math.round(factoredCompAvg);
    }

    // Dynamic reconciliation note updates if edits are capped
    let note = reconciliation_note || "";
    note = note.replace(/\[Client-Side Adjustment Capped\].*?\./g, "").trim();
    const cappedProjects = newTable
      .filter(r => r.role !== "SUBJECT")
      .filter(r => {
        const sum = (r.factor_road ?? 0) + (r.factor_amenity ?? 0) + (r.factor_density ?? 0) + (r.factor_cbd ?? 0);
        return Math.abs(sum) > capLimit;
      })
      .map(r => r.project_name);

    if (cappedProjects.length > 0) {
      note = `[Client-Side Adjustment Capped] Total adjustments capped at ${(capLimit * 100).toFixed(0)}% for projects: ${cappedProjects.join(", ")}. ${note}`;
    }

    const isWeightsMod = (w1 !== originalData.blending?.w1 || w2 !== originalData.blending?.w2);
    const updatedData = {
      ...data,
      comparable_factoring_table: newTable,
      blending: {
        ...blending,
        factored_comp_avg: factoredCompAvg,
        w1,
        w2,
        final_rate: finalRate,
        weight_reasoning: isWeightsMod ? null : (originalData.blending?.weight_reasoning || blending.weight_reasoning),
      },
      subject_final_rate: finalRate,
      subject_rate_range: {
        low: Math.round(finalRate * 0.95),
        high: Math.round(finalRate * 1.05),
      },
      reconciliation_note: note,
    };

    onUpdateData?.(updatedData);
  };

  const handleFactorChange = (projectName, factorKey, valPct) => {
    const decimalVal = Number((valPct / 100).toFixed(4));
    const updatedTable = comparable_factoring_table.map((row) => {
      if (row.project_name !== projectName) return row;

      const updatedRow = { ...row, [factorKey]: decimalVal };
      const road = updatedRow.factor_road ?? 0;
      const amenity = updatedRow.factor_amenity ?? 0;
      const density = updatedRow.factor_density ?? 0;
      const cbd = updatedRow.factor_cbd ?? 0;

      const rawSum = road + amenity + density + cbd;
      const totalFactor = Math.max(-capLimit, Math.min(capLimit, rawSum));
      const factoredRate = Math.round((updatedRow.avg_rate ?? 0) * (1 + totalFactor));

      return {
        ...updatedRow,
        total_factor: totalFactor,
        factored_rate: factoredRate,
      };
    });

    recalculateAndTrigger(updatedTable, blending.w1, blending.w2);
  };

  const handleResetProject = (projectName) => {
    const origRow = originalData.comparable_factoring_table?.find(r => r.project_name === projectName);
    if (!origRow) return;

    const updatedTable = comparable_factoring_table.map((row) => {
      if (row.project_name !== projectName) return row;
      return JSON.parse(JSON.stringify(origRow));
    });

    recalculateAndTrigger(updatedTable, blending.w1, blending.w2);
  };

  const handleWeightChange = (newW1) => {
    const roundedW1 = Math.round(newW1 * 100) / 100;
    const roundedW2 = Math.round((1.0 - roundedW1) * 100) / 100;
    recalculateAndTrigger(comparable_factoring_table, roundedW1, roundedW2);
  };

  const handleResetWeights = () => {
    const origW1 = originalData.blending?.w1 ?? 0.5;
    const origW2 = originalData.blending?.w2 ?? 0.5;
    recalculateAndTrigger(comparable_factoring_table, origW1, origW2);
  };

  const MainContent = (
    <div className="mt-8 rounded-[2.5rem] border border-border-soft bg-bg-card/90 shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">

      {/* Header */}
      <div className="border-b border-border-soft bg-gradient-to-r from-accent/10 to-transparent px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-xl">🛡️</div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-primary">Comparable Factoring Analysis</h2>
            <p className="text-[8px] text-text-dim mt-0.5 uppercase tracking-widest opacity-50">Per-comparable adjustment → Confidence-weighted blend</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${confidence === "High" ? "border-green-500/30 bg-green-500/10 text-green-400" : confidence === "Low" ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "currentColor" }}></span>
            {confidence || "Medium"} Confidence
          </div>
          <button onClick={() => setIsSectionMaximized(!isSectionMaximized)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-soft bg-bg-input hover:bg-accent/20 hover:text-accent transition-all text-[8px] font-black uppercase tracking-widest">
            {isSectionMaximized ? "Collapse" : "⛶ Expand"}
          </button>
        </div>
      </div>

      <div className="p-8 space-y-10">

        {/* ── Subject-Only Evidence Warning ─────────────────────────── */}
        {subject_only_mode && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-bg-card to-amber-600/5 p-5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.12),transparent_60%)]" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[18px] font-black">
                ⚠
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-400 mb-1.5">
                  Limited Comparable Market Evidence — Subject-Only Valuation
                </p>
                <p className="text-[10px] text-amber-200/80 leading-relaxed">
                  {limited_evidence_note ||
                    "Due to limited comparable market evidence, the valuation has been derived using the best available data for the subject property. For a detailed expert review and enhanced valuation assessment, please contact our team."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPARABLE FACTORING TABLE ─────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 border border-accent/30 text-sm">⚖️</span>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-primary">Per-Comparable Factor Adjustment Table</h3>
              <p className="text-[9px] text-text-dim mt-0.5">Each factor capped at ±5% · Total adjustment capped at ±{(capLimit * 100).toFixed(0)}% per comparable (subject listings: {subjectListings})</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border-soft shadow-xl">
            <table className="w-full text-left text-[10px] min-w-[900px]">
              <thead>
                <tr className="bg-bg-input border-b border-border-soft text-text-dim uppercase tracking-widest font-black text-[8px]">
                  <th className="px-5 py-3.5 min-w-[180px]">Project Name</th>
                  <th className="px-4 py-3.5 text-center">Road Type</th>
                  <th className="px-4 py-3.5 text-center min-w-[140px]">Amenity</th>
                  <th className="px-4 py-3.5 text-center">Density Score</th>
                  <th className="px-4 py-3.5 text-center">CBD (km)</th>
                  <th className="px-4 py-3.5 text-right">Avg Rate</th>
                  <th className="px-4 py-3.5 text-center">Factor</th>
                  <th className="px-4 py-3.5 text-right min-w-[150px]">Net Factored Rate</th>
                </tr>
              </thead>
              <tbody>
                {/* Subject row */}
                {subjectRow && (
                  <tr className="bg-accent/10 border-b border-accent/20">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-text-primary text-[11px]">{subjectRow.project_name}</span>
                        <span className="text-[7px] px-1.5 py-0.5 rounded bg-accent text-bg-deep font-black uppercase shrink-0">Subject</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-bold text-accent">{subjectRow.road_type || "—"}</td>
                    <td className="px-4 py-4 text-center">
                      <AmenityCellChips summary={subjectRow.amenity_summary} isSubject />
                    </td>
                    <td className="px-4 py-4 text-center font-mono font-bold text-accent">{subjectRow.builtup_density_score != null ? Number(subjectRow.builtup_density_score).toFixed(1) : "—"}</td>
                    <td className="px-4 py-4 text-center">
                      <CbdCell km={subjectRow.cbd_nearest_km} name={subjectRow.cbd_name} isSubject />
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-green-400">{fmtRate(subjectRow.avg_rate)}</td>
                    <td className="px-4 py-4 text-center text-[8px] font-black text-accent/50 uppercase">Base</td>
                    <td className="px-4 py-4 text-right font-mono font-black text-green-400 text-[13px]">{fmtRate(subjectRow.avg_rate)}</td>
                  </tr>
                )}

                {/* Comparable rows */}
                {compRows.map((row, i) => {
                  const totalF = row.total_factor != null ? Number(row.total_factor) : null;
                  const factoredRate = row.factored_rate;
                  const isModified = isProjectModified(row.project_name);
                  return (
                    <tr key={i} className="border-b border-border-dim hover:bg-bg-input/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text-secondary text-[10px]">{row.project_name}</span>
                          {isModified && (
                            <span className="h-1.5 w-1.5 rounded-full bg-warning" title="Modified by appraiser"></span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-text-dim">{row.road_type || "—"}</td>
                      <td className="px-4 py-4 text-center">
                        <AmenityCellChips summary={row.amenity_summary} />
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-text-dim">{row.builtup_density_score != null ? Number(row.builtup_density_score).toFixed(1) : "—"}</td>
                      <td className="px-4 py-4 text-center">
                        <CbdCell km={row.cbd_nearest_km} name={row.cbd_name} />
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-text-secondary">{fmtRate(row.avg_rate)}</td>
                      <td className={`px-4 py-4 text-center font-mono font-black text-[12px] ${adjColor(totalF)}`}>
                        {totalF != null ? (totalF >= 0 ? "+" : "") + (totalF * 100).toFixed(2) + "%" : "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-black text-[12px] text-blue-400">
                        {fmtRate(factoredRate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Factor breakdown and adjustment sliders */}
          {compRows.some(r => r.factor_reasoning) && (
            <div className="mt-6 space-y-4">
              <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-text-primary">Factor Adjustment Controls</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {compRows.map((row, i) => {
                  const isModified = isProjectModified(row.project_name);
                  const isRowCapped = isCapped(row.project_name);
                  const roadVal = row.factor_road ?? 0;
                  const amenityVal = row.factor_amenity ?? 0;
                  const densityVal = row.factor_density ?? 0;
                  const cbdVal = row.factor_cbd ?? 0;

                  return (
                    <div key={i} className="rounded-2xl border border-border-soft bg-bg-input/25 p-5 space-y-4 flex flex-col justify-between hover:border-border transition-all">
                      <div>
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text-secondary text-[11px]">{row.project_name}</span>
                            {isModified && (
                              <span className="px-2 py-0.5 rounded bg-warning/20 border border-warning/30 text-[8px] text-warning font-black uppercase tracking-wider">Edited</span>
                            )}
                          </div>
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => handleResetProject(row.project_name)}
                              className="text-[9px] font-bold text-warning hover:text-warning-light hover:underline transition uppercase tracking-wider cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Interactive Sliders for 4 Geospatial factors */}
                        <div className="space-y-3.5">
                          {/* Road Slider */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] text-text-dim uppercase font-black tracking-widest">
                              <span>Road Type Adjustment</span>
                              <span className={`font-mono ${adjColor(roadVal)}`}>{fmtPct(roadVal)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_road", Math.max(-50, Math.round(roadVal * 1000) - 1) / 10)}
                                disabled={Math.round(roadVal * 1000) <= -50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >−</button>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={Math.round(roadVal * 1000)}
                                onChange={(e) => handleFactorChange(row.project_name, "factor_road", Number(e.target.value) / 10)}
                                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_road", Math.min(50, Math.round(roadVal * 1000) + 1) / 10)}
                                disabled={Math.round(roadVal * 1000) >= 50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >+</button>
                            </div>
                          </div>

                          {/* Amenity Slider */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] text-text-dim uppercase font-black tracking-widest">
                              <span>Amenity Adjustment</span>
                              <span className={`font-mono ${adjColor(amenityVal)}`}>{fmtPct(amenityVal)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_amenity", Math.max(-50, Math.round(amenityVal * 1000) - 1) / 10)}
                                disabled={Math.round(amenityVal * 1000) <= -50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >−</button>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={Math.round(amenityVal * 1000)}
                                onChange={(e) => handleFactorChange(row.project_name, "factor_amenity", Number(e.target.value) / 10)}
                                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_amenity", Math.min(50, Math.round(amenityVal * 1000) + 1) / 10)}
                                disabled={Math.round(amenityVal * 1000) >= 50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >+</button>
                            </div>
                          </div>

                          {/* Density Slider */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] text-text-dim uppercase font-black tracking-widest">
                              <span>Density Score Adjustment</span>
                              <span className={`font-mono ${adjColor(densityVal)}`}>{fmtPct(densityVal)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_density", Math.max(-50, Math.round(densityVal * 1000) - 1) / 10)}
                                disabled={Math.round(densityVal * 1000) <= -50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >−</button>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={Math.round(densityVal * 1000)}
                                onChange={(e) => handleFactorChange(row.project_name, "factor_density", Number(e.target.value) / 10)}
                                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_density", Math.min(50, Math.round(densityVal * 1000) + 1) / 10)}
                                disabled={Math.round(densityVal * 1000) >= 50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >+</button>
                            </div>
                          </div>

                          {/* CBD Slider */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] text-text-dim uppercase font-black tracking-widest">
                              <span>CBD Distance Adjustment</span>
                              <span className={`font-mono ${adjColor(cbdVal)}`}>{fmtPct(cbdVal)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_cbd", Math.max(-50, Math.round(cbdVal * 1000) - 1) / 10)}
                                disabled={Math.round(cbdVal * 1000) <= -50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >−</button>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={Math.round(cbdVal * 1000)}
                                onChange={(e) => handleFactorChange(row.project_name, "factor_cbd", Number(e.target.value) / 10)}
                                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleFactorChange(row.project_name, "factor_cbd", Math.min(50, Math.round(cbdVal * 1000) + 1) / 10)}
                                disabled={Math.round(cbdVal * 1000) >= 50}
                                className="w-6 h-6 rounded-full border border-border bg-bg-input flex items-center justify-center text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition select-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >+</button>
                            </div>
                          </div>
                        </div>

                        {/* Net Adjustments capped info */}
                        <div className="mt-4 flex items-center justify-between text-[10px] bg-black/30 px-3.5 py-2.5 rounded-xl border border-white/5 font-mono">
                          <span className="text-text-dim uppercase tracking-wider text-[8px] font-bold">Net Correction:</span>
                          <div className="flex items-center gap-2">
                            {isRowCapped && (
                              <span className="text-[8px] bg-warning/20 border border-warning/30 text-warning px-1.5 py-0.5 rounded font-black uppercase tracking-widest animate-pulse">Capped at ±{(capLimit * 100).toFixed(0)}%</span>
                            )}
                            <span className={`font-black ${adjColor(row.total_factor)}`}>{fmtPct(row.total_factor)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-3.5 mt-2">
                        <span className="text-[8px] font-black text-text-dim uppercase tracking-widest block mb-1.5">Expert Baseline Reasoning:</span>
                        <p className="text-[10px] text-text-secondary leading-relaxed font-semibold">{row.factor_reasoning}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── VALUATION BLENDING & WEIGHTS CONFIGURATION ─────────────────── */}
        <section className="rounded-[2rem] border border-border-soft bg-bg-card/75 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-purple/20 border border-accent-purple/30 text-sm">🧪</span>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-text-primary">Appraisal Blending & Weights</h3>
                <p className="text-[8px] text-text-dim mt-0.5 uppercase tracking-widest opacity-50">Adjust confidence weight balance for final valuation</p>
              </div>
            </div>
            {isWeightsModified() && (
              <button
                type="button"
                onClick={handleResetWeights}
                className="text-[9px] font-bold text-warning hover:text-warning-light hover:underline transition uppercase tracking-wider cursor-pointer"
              >
                Reset Weights
              </button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Blending stats */}
            <div className="space-y-4">
              <div className="rounded-xl bg-black/40 border border-white/[0.05] p-4 space-y-2">
                <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider">Formula:</p>
                <p className="font-mono text-[10px] text-white/90 font-bold leading-relaxed font-semibold">
                  Blended Rate = (w₁ × Subject Rate) + (w₂ × Comparables Avg)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                  <span className="text-text-dim block mb-1">Subject Rate:</span>
                  <span className="font-bold text-green-400">{fmtRate(blending.subject_own_rate)}</span>
                  <span className="text-[8px] text-text-dim block mt-0.5">({blending.subject_listing_count || 0} listings)</span>
                </div>
                <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                  <span className="text-text-dim block mb-1">Comparables Avg:</span>
                  <span className="font-bold text-blue-400">{fmtRate(blending.factored_comp_avg)}</span>
                  <span className="text-[8px] text-text-dim block mt-0.5">(from {compRows.length} comparables)</span>
                </div>
              </div>
            </div>

            {/* Weight Sliders */}
            <div className="space-y-4 flex flex-col justify-center">
              {subjectListings > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-text-dim font-semibold">
                      <span>Subject Weight (w₁)</span>
                      <span className="text-accent font-mono font-bold">{((blending.w1 ?? 0.5) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round((blending.w1 ?? 0.5) * 100)}
                      onChange={(e) => handleWeightChange(Number(e.target.value) / 100)}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-text-dim font-semibold">
                      <span>Comparable Weight (w₂)</span>
                      <span className="text-accent-purple font-mono font-bold">{((blending.w2 ?? 0.5) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round((blending.w2 ?? 0.5) * 100)}
                      onChange={(e) => handleWeightChange(1 - Number(e.target.value) / 100)}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-purple"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Weights Locked</p>
                  <p className="text-[10px] text-text-dim leading-relaxed font-semibold">
                    Subject property has 0 listings. Valuation is weighted 100% (w₂ = 1.0) on the average of the selected market comparables.
                  </p>
                </div>
              )}
            </div>
          </div>

          {blending.weight_reasoning && (
            <div className="text-[9px] text-text-dim italic leading-relaxed border-t border-white/5 pt-3 font-semibold font-semibold">
              Note: {blending.weight_reasoning}
            </div>
          )}
        </section>

        {/* ── DERIVED RATE AND VALUE SUMMARY ─────────────────────────────── */}
        {(() => {
          const propType = (subjectData?.property_type || "").toLowerCase().trim();
          let selectedArea = 0;
          let areaLabel = "Area";

          if (["flat", "apartment", "shop", "retail", "office", "commercial_office"].includes(propType)) {
            selectedArea = Number(subjectData?.salable_area_sqft || 0);
            areaLabel = "Salable Area";
          } else if (["villa", "house", "building_land"].includes(propType)) {
            selectedArea = Number(subjectData?.builtup_area_sqft || 0);
            areaLabel = "Built-up Area";
          } else if (["land", "plot"].includes(propType)) {
            selectedArea = Number(subjectData?.plot_area_sqft || 0);
            areaLabel = "Total Area";
          } else {
            // fallback: check in logical order
            selectedArea = Number(subjectData?.salable_area_sqft || subjectData?.builtup_area_sqft || subjectData?.plot_area_sqft || subjectData?.carpet_area_sqft || 0);
            if (subjectData?.salable_area_sqft) areaLabel = "Salable Area";
            else if (subjectData?.builtup_area_sqft) areaLabel = "Built-up Area";
            else if (subjectData?.plot_area_sqft) areaLabel = "Total Area";
            else if (subjectData?.carpet_area_sqft) areaLabel = "Carpet Area";
          }

          return (
            <section className="relative overflow-hidden rounded-[2rem] border border-green-500/30 bg-gradient-to-b from-bg-card to-bg-deep p-8 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/[0.03] to-transparent pointer-events-none" />

              <div className="flex-1 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-400/80 font-black">Derived Rate</span>
                <div className="flex items-baseline gap-1">
                  <h2 className="font-mono text-4xl font-black text-text-primary drop-shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                    {fmtRate(finalRate)}
                  </h2>
                  <span className="text-xs text-text-dim font-bold font-semibold">/ {area_unit || "sqft"}</span>
                </div>
                {selectedArea > 0 ? (
                  <p className="text-[10px] text-text-dim font-semibold uppercase tracking-wider font-semibold">
                    Calculated on <span className="text-accent-light">{selectedArea.toLocaleString()} {area_unit || "sqft"}</span> of {areaLabel}
                  </p>
                ) : (
                  <p className="text-[9px] text-warning/80 font-bold uppercase tracking-wider animate-pulse font-semibold">
                    Please enter the {areaLabel} in subject details to view final valuation
                  </p>
                )}
              </div>

              {selectedArea > 0 && (
                <div className="flex-1 md:text-right space-y-2 md:border-l md:border-border-soft md:pl-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/80 font-black">Valuation Value</span>
                  <h2 className="font-mono text-4xl font-black text-text-primary drop-shadow-[0_0_16px_rgba(167,139,250,0.4)]">
                    {formatter.format(finalRate * selectedArea)}
                  </h2>
                  <p className="text-[9px] text-text-dim font-semibold uppercase tracking-widest font-semibold">
                    {fmtRate(finalRate)}/{area_unit || "sqft"} × {selectedArea.toLocaleString()} {area_unit || "sqft"} ({areaLabel})
                  </p>
                </div>
              )}
            </section>
          );
        })()}


        {/* ── REASONING REPORT ──────────────────────────────────────── */}
        {raw_markdown_report && (
          <section>
            <button onClick={() => setShowReport(!showReport)} className="flex w-full items-center justify-between rounded-xl border border-border-soft bg-bg-input px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-accent hover:border-accent/40 transition-all font-semibold">
              <span className="flex items-center gap-2">🧾 Agent Reasoning Report</span>
              <span>{showReport ? "▲ Hide" : "▼ Show"}</span>
            </button>
            {showReport && (
              <div className="mt-3 rounded-xl border border-border-soft bg-bg-dark/40 p-4 overflow-auto max-h-[600px] custom-scrollbar animate-in fade-in duration-200">
                <ReActReasoningReport report={raw_markdown_report} />
              </div>
            )}
          </section>
        )}

        {reconciliation_note && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-amber-400/70 mb-1 font-semibold">Reconciliation Note</p>
            <p className="text-[10px] text-text-secondary leading-relaxed font-semibold">{reconciliation_note}</p>
          </div>
        )}

      </div>
    </div>
  );

  if (isSectionMaximized && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-bg-deep/95 backdrop-blur-2xl animate-in fade-in duration-300 flex flex-col">
        {/* Sticky top bar with close button */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border-soft bg-bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-lg">🛡️</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-primary font-black">Comparable Factoring Analysis</p>
              <p className="text-[8px] text-text-dim uppercase tracking-widest opacity-50 font-semibold">Per-comparable adjustment → Confidence-weighted blend</p>
            </div>
          </div>
          <button
            onClick={() => setIsSectionMaximized(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-soft bg-bg-input hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-all text-[9px] font-black uppercase tracking-widest text-text-dim font-semibold"
          >
            ✕ Collapse
          </button>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {MainContent}
        </div>
      </div>,
      document.body
    );
  }

  return MainContent;
}



// ── Cost Approach Inputs Form ────────────────────────────────────
const REQUIRED_COST_INPUTS = [
  {
    field: "construction_rate_per_sqft",
    label: "Construction Rate per sqft",
    type: "number",
    placeholder: "2500",
  },
  {
    field: "total_life_of_building",
    label: "Economic Life",
    type: "number",
    default: 60,
    placeholder: "60",
  },
];

function normalizeCostInputSchema(schema) {
  const inputs = Array.isArray(schema?.inputs)
    ? schema.inputs
    : (Array.isArray(schema?.user_inputs_required) ? schema.user_inputs_required : []);
  const seen = new Set(inputs.map((inp) => inp.field));
  const requiredInputs = REQUIRED_COST_INPUTS.filter((inp) => !seen.has(inp.field));
  return {
    ...(schema || {}),
    inputs: [...inputs, ...requiredInputs],
  };
}

function buildCostInputDefaults(schema, subjectData, currentValues = {}) {
  const defaults = {};
  schema.inputs?.forEach((inp) => {
    let val = inp.default !== undefined && inp.default !== null ? inp.default : "";
    if (inp.field === "total_life_of_building") {
      val = 60;
    }

    if (subjectData) {
      if (inp.field === "age_of_property") {
        const extractedAge = subjectData.age_of_property ?? subjectData.age_years ?? subjectData.age ?? subjectData.age_of_building;
        if (extractedAge != null && extractedAge !== "") val = Number(extractedAge);
      } else if (inp.field === "construction_rate_per_sqft") {
        const extractedRate = subjectData.construction_rate_per_sqft ?? subjectData.construction_rate ?? subjectData.build_rate;
        if (extractedRate != null && extractedRate !== "") val = Number(extractedRate);
      } else if (inp.field === "total_life_of_building") {
        const extractedLife = subjectData.total_life_of_building ?? subjectData.economic_life ?? subjectData.building_life;
        if (extractedLife != null && extractedLife !== "") val = Number(extractedLife);
      }
    }

    defaults[inp.field] = currentValues[inp.field] !== undefined ? currentValues[inp.field] : val;
  });
  return defaults;
}

function CostInputsForm({ schema, values, onChange, onSubmit, isCalculating, subjectData, submitLabel }) {
  if (!schema) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-[2rem] border border-warning/30 bg-bg-card shadow-2xl backdrop-blur-3xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/20 text-warning text-xl border border-warning/30">
          🏗️
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-primary">Cost Approach Parameters</h3>
          <p className="text-[8px] text-text-dim mt-0.5 uppercase tracking-widest font-bold opacity-50">Please enter cost-specific details for subject project</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {schema.inputs?.map((inp) => {
          let label = inp.label;
          let placeholder = inp.placeholder || inp.default || 0;
          if (inp.field === "construction_rate_per_sqft") {
            const sym = getCurrencySymbol(subjectData?.currency);
            label = `Construction Rate per sqft (${sym})`;
          } else if (inp.field === "total_life_of_building") {
            label = "Economic Life (Years)";
            placeholder = 60;
          } else if (inp.field === "age_of_property") {
            label = "Age of Property (Years)";
          }

          let helpText = inp.help;
          if (inp.field === "construction_rate_per_sqft") {
            const propType = (subjectData?.property_type || "").toLowerCase();
            if (propType === "apartment" || propType === "retail" || propType === "commercial_office") {
              helpText = "Remark: Please enter construction cost per sqft on Salable Area.";
            } else if (propType === "villa" || propType === "building_land") {
              helpText = "Remark: Please enter construction cost per sqft on Built-up Area.";
            }
          }

          return (
            <label key={inp.field} className="flex flex-col gap-1.5">
              <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
                {label}
              </span>
              <input
                type="number"
                value={values[inp.field] !== undefined ? values[inp.field] : ""}
                onChange={(e) => onChange(inp.field, e.target.value)}
                placeholder={`e.g. ${placeholder}`}
                className="rounded-xl border border-border bg-bg-input px-3.5 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-warning/[0.05]"
              />
              {helpText && (
                <span className="pl-1 text-[9px] text-warning/80 font-semibold leading-relaxed">{helpText}</span>
              )}
            </label>
          );
        })}
      </div>

      <button
        onClick={onSubmit}
        disabled={isCalculating}
        className="w-full rounded-2xl bg-gradient-to-r from-warning to-amber-500 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-bg-deep shadow-lg shadow-warning/10 transition duration-300 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
      >
        {isCalculating ? "Calculating Cost Valuation..." : (submitLabel || "Execute Cost Approach Calculation")}
      </button>
    </div>
  );
}

// ── Cost Result Card ─────────────────────────────────────────────
function CostResultCard({ data, subjectData }) {
  const [isSectionMaximized, setIsSectionMaximized] = useState(false);
  if (!data) return null;

  const derived_plot_rate_per_sqft = data.inputs?.derived_plot_rate_per_sqft;
  const plot_area_sqft = data.inputs?.plot_area_sqft;
  const builtup_area_sqft = data.inputs?.builtup_area_sqft;
  const construction_rate_per_sqft = data.inputs?.construction_rate_per_sqft;
  const age_of_property = data.inputs?.age_of_property;
  const total_life_of_building = data.inputs?.total_life_of_building;

  const land_value = data.calculations?.land_value;
  const construction_cost = data.calculations?.construction_cost;
  const depreciation_rate = (data.calculations?.depreciation_rate_pct || 0) / 100;
  const depreciated_building_value = data.calculations?.depreciated_building_value;

  const final_property_value = data.result?.cost_value;
  const property_type = data.property_type;

  const audit_trail = {
    land_value_formula: data.formula_audit?.step_1,
    construction_cost_formula: data.formula_audit?.step_2,
    depreciation_formula: data.formula_audit?.step_3,
    depreciated_cost_formula: data.formula_audit?.step_4,
    final_value_formula: data.formula_audit?.step_5,
  };

  const currencyCode = subjectData?.currency || "INR";
  const locale = currencyCode === "INR" ? "en-IN" : "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  });

  const fmt = (val) => val != null ? formatter.format(Number(val)) : "—";
  const fmtRate = (val) => val != null ? formatter.format(Number(val)) : "—";

  const DashboardContent = (
    <div className={`mt-8 rounded-[2.5rem] border border-success/20 bg-bg-card/95 shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${isSectionMaximized
      ? "fixed inset-0 z-[10000] m-4 md:m-12 rounded-[3rem] h-[calc(100vh-6rem)] overflow-y-auto border-success/40 custom-scrollbar"
      : "overflow-hidden"
      }`}>
      {/* Header */}
      <div className="border-b border-border-soft bg-gradient-to-r from-success/10 to-transparent px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/20 text-success text-xl border border-success/30">🛡️</div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Cost Approach Valuation Appraisal</h2>
              <p className="text-[8px] text-text-dim mt-1 uppercase tracking-widest font-bold opacity-40">Audit-Backed Land + Depreciated Structure Method</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSectionMaximized(!isSectionMaximized)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-soft bg-bg-input hover:bg-success/20 hover:text-success hover:border-success/40 transition-all text-[8px] font-black uppercase tracking-widest text-text-secondary"
            >
              {isSectionMaximized ? "Collapse Audit" : "Maximize Audit View"} ⛶
            </button>
            <div className="flex items-center gap-1.5 rounded-xl border border-success/20 bg-success/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-success">Verified Audit</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <section className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-text-primary">Appraisal Step Calculation Audit</h3>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Step 1 */}
            <div className="rounded-2xl border border-border-soft bg-bg-input/30 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 1: Land component Valuation</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-white/40">Land Value</p>
                  <p className="text-2xl font-black text-sky-400 font-mono leading-none">{fmt(land_value)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/[0.05] p-3 text-[10px] text-text-secondary space-y-1">
                <p className="font-semibold text-white/55">Valuation Base:</p>
                <p className="font-mono text-white/80 leading-relaxed font-bold">
                  {audit_trail?.land_value_formula || `Land Value = ${fmtRate(derived_plot_rate_per_sqft)}/sqft × ${plot_area_sqft} sqft (Plot Area)`}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-border-soft bg-bg-input/30 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 2: Replacement Construction Cost</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-white/40">Construction Cost</p>
                  <p className="text-2xl font-black text-amber-400 font-mono leading-none">{fmt(construction_cost)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/[0.05] p-3 text-[10px] text-text-secondary space-y-1">
                <p className="font-semibold text-amber-400/55">Formula & Inputs:</p>
                <p className="font-mono text-amber-400/90 leading-relaxed font-bold">
                  {audit_trail?.construction_cost_formula || `Construction Cost = ${fmtRate(construction_rate_per_sqft)}/sqft × ${builtup_area_sqft} sqft (Built-up Area)`}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-border-soft bg-bg-input/30 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 3: Straight-Line Depreciation Rate</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-text-dim">Depreciation %</p>
                  <p className="text-2xl font-black text-warning font-mono leading-none">{(depreciation_rate * 100).toFixed(2)}%</p>
                </div>
              </div>
              <div className="rounded-xl bg-bg-dark border border-border-soft p-3 text-[10px] text-text-secondary space-y-1">
                <p className="font-semibold text-text-secondary">Formula:</p>
                <p className="font-mono text-text-primary leading-relaxed">
                  {audit_trail?.depreciation_formula || `Depreciation = ${age_of_property} yrs / ${total_life_of_building} yrs = ${(depreciation_rate * 100).toFixed(2)}%`}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl border border-border-soft bg-bg-input/30 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 4: Depreciated Structure Value</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-white/40">Structure Value</p>
                  <p className="text-2xl font-black text-teal-400 font-mono leading-none">{fmt(depreciated_building_value)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-bg-dark border border-border-soft p-3 text-[10px] text-text-secondary space-y-2">
                <div>
                  <p className="font-mono text-teal-400/80 leading-relaxed font-bold">
                    {audit_trail?.depreciated_cost_formula || `Depreciated Value = ${fmt(construction_cost)} × (100% − ${(depreciation_rate * 100).toFixed(2)}%) = ${fmt(depreciated_building_value)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="relative">
          <div className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-success/20 to-transparent blur-2xl opacity-40"></div>

          <div className="relative overflow-hidden rounded-[2rem] border border-success/30 bg-gradient-to-b from-[#13241d] to-[#0c1410] p-8 text-center space-y-4 shadow-2xl">
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-success/70">Final Cost Approach Villa Value</span>

            <div className="space-y-1">
              <h1 className="font-mono text-5xl font-black text-text-primary drop-shadow-[0_0_24px_rgba(34,197,94,0.5)]">
                {fmt(final_property_value)}
              </h1>
              <p className="text-[10px] text-success/60 font-semibold uppercase tracking-widest">
                Land Value + Depreciated Structure Value
              </p>
            </div>

            <div className="border-t border-success/20 pt-4 max-w-lg mx-auto">
              <p className="text-[9px] font-mono text-text-secondary leading-relaxed">
                Appraisal Audit Trail:<br />
                <span className="text-white/80 font-bold">{audit_trail?.final_value_formula || `Cost Value = ${fmt(land_value)} (Land) + ${fmt(depreciated_building_value)} (Structure) = ${fmt(final_property_value)}`}</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  if (isSectionMaximized && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-bg-deep/95 backdrop-blur-2xl p-4 md:p-8 flex items-center justify-center animate-in fade-in duration-300">
        <div className="w-full h-full max-h-[90vh] overflow-y-auto custom-scrollbar">
          {DashboardContent}
        </div>
      </div>,
      document.body
    );
  }

  return DashboardContent;
}

export default function ChatSectionNext({ onEvent, onClear, onEventsReset, onMarkersUpdate, factorialData: externalFactorialData, onValuationResult, events, setEvents }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [revertNotice, setRevertNotice] = useState("");
  const [backupValuationState, setBackupValuationState] = useState(null);

  // Clear revert notice after 3 seconds
  useEffect(() => {
    if (revertNotice) {
      const timer = setTimeout(() => {
        setRevertNotice("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [revertNotice]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingNote, setStreamingNote] = useState("");
  const [tokenStats, setTokenStats] = useState({
    total_tokens: 0,
    cost_usd: 0,
    model_breakdown: {},
    tool_breakdown: {}
  });
  const [showTokenBreakdown, setShowTokenBreakdown] = useState(false);

  // Helper for model-wise pricing:
  // Mistral Large 3: Input $0.50/1M, Output $1.50/1M
  // Kimi: Input $0.60/1M, Output $3.00/1M (commented out)
  // GPT-4o: Input $5.00/1M, Output $15.00/1M
  // GPT-4o-mini/others: Input $0.15/1M, Output $0.60/1M
  const getModelCost = (model, prompt, completion) => {
    const modelLower = model.toLowerCase();
    if (modelLower.includes("mistral.mistral-large-3-675b-instruct") || modelLower.includes("mistral-large-3")) {
      return (prompt / 1000000 * 0.50) + (completion / 1000000 * 1.50);
    } else if (modelLower.includes("gpt-4o") && !modelLower.includes("mini")) {
      return (prompt / 1000000 * 5.00) + (completion / 1000000 * 15.00);
    } else {
      return (prompt / 1000000 * 0.15) + (completion / 1000000 * 0.60);
    }
  };

  const calculatedTotalTokens = useMemo(() => {
    return Object.entries(tokenStats.model_breakdown)
      .filter(([model]) => model.toLowerCase() !== "unknown")
      .reduce((sum, [_, usage]) => sum + (usage.total || 0), 0);
  }, [tokenStats.model_breakdown]);

  const calculatedCostUsd = useMemo(() => {
    const modelCost = Object.entries(tokenStats.model_breakdown).reduce(
      (sum, [model, usage]) => sum + getModelCost(model, usage.prompt || 0, usage.completion || 0),
      0
    );
    const toolCost = Object.values(tokenStats.tool_breakdown).reduce(
      (sum, tool) => sum + (tool.cost_usd || 0),
      0
    );
    return modelCost + toolCost;
  }, [tokenStats.model_breakdown, tokenStats.tool_breakdown]);

  const [currentQuestion, setCurrentQuestion] = useState("");
  const [clarificationPrompt, setClarificationPrompt] = useState("");
  const [clarificationFields, setClarificationFields] = useState([]);
  const [clarificationValues, setClarificationValues] = useState({});
  const [mapConfirmation, setMapConfirmation] = useState(null);
  const [approachChoiceNeeded, setApproachChoiceNeeded] = useState(null);
  const [extractionVerification, setExtractionVerification] = useState(null);

  // ── Stage 1 Gate Wizard ────────────────────────────────────────
  const [gateActive, setGateActive] = useState(false);
  const [gateStep, setGateStep] = useState(1);
  const [gateMode, setGateMode] = useState(null);
  const [gateAllFields, setGateAllFields] = useState([]);
  const [gateValues, setGateValues] = useState({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  // ── Collapse states for all interactive panels ────────────────
  const [gateCollapsed, setGateCollapsed] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [approachCollapsed, setApproachCollapsed] = useState(false);
  const [ctaListingCollapsed, setCtaListingCollapsed] = useState(false);
  const [ctaCleanCollapsed, setCtaCleanCollapsed] = useState(false);
  const [ctaFactorialCollapsed, setCtaFactorialCollapsed] = useState(false);
  const [comparableData, setComparableData] = useState(null);
  const [selectedComps, setSelectedComps] = useState(new Set());
  const [dbNoResults, setDbNoResults] = useState(false);
  const [subjectData, setSubjectData] = useState(null);
  const [listingData, setListingData] = useState(null);
  const [dbTransactions, setDbTransactions] = useState([]); // transactions from Internal DB comparables
  const [isListingStreaming, setIsListingStreaming] = useState(false);
  const [cleanedData, setCleanedData] = useState(null);
  const [isCleaningStreaming, setIsCleaningStreaming] = useState(false);
  const [factorialData, setFactorialData] = useState(null);
  const [isFactorialStreaming, setIsFactorialStreaming] = useState(false);
  const [factorialAnalysisData, setFactorialAnalysisData] = useState(null);
  const [isFactorialAnalysisStreaming, setIsFactorialAnalysisStreaming] = useState(false);
  const [needsFactorialRegeneration, setNeedsFactorialRegeneration] = useState(false);
  const [pipelineDone, setPipelineDone] = useState(false);
  const [currentStage, setCurrentStage] = useState("Stage 0: Initialization");
  const [originalQuestion, setOriginalQuestion] = useState("");

  // Cost Approach States
  const [costInputsSchema, setCostInputsSchema] = useState(null);
  const [costInputsValues, setCostInputsValues] = useState({});
  const [costCalculationData, setCostCalculationData] = useState(null);
  const [isCostCalculating, setIsCostCalculating] = useState(false);
  // Tracks which comparable IDs have already been fetched (for incremental addition)
  const [fetchedCompIds, setFetchedCompIds] = useState(new Set());

  // Special Factorial Analysis State
  const [showSpecialForm, setShowSpecialForm] = useState(false);
  const [specialSubjectName, setSpecialSubjectName] = useState("Lodha Altamount");
  const [specialSubjectLat, setSpecialSubjectLat] = useState("18.974");
  const [specialSubjectLng, setSpecialSubjectLng] = useState("72.810");
  const [specialCompName, setSpecialCompName] = useState("Rustomjee Crown");
  const [specialCompLat, setSpecialCompLat] = useState("19.018");
  const [specialCompLng, setSpecialCompLng] = useState("72.827");

  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const markersRef = useRef([]);
  const subjectDataRef = useRef(null);

  const selectedComparablePayload = () => {
    if (!comparableData) return [];
    return Array.from(selectedComps).map((i) => comparableData[i]).filter(Boolean);
  };

  const handleCalculateRate = (factData) => {
    submitFactorialAnalysis(factData || factorialData, subjectData, selectedComparablePayload());
  };

  const handleCostCalculate = async () => {
    if (isCostCalculating || !subjectData || !factorialAnalysisData) return;

    const isRecalculation = Boolean(costCalculationData);
    setIsCostCalculating(true);
    setStreamingNote("Sending inputs to Traditional Cost Approach Engine...");

    const derivedRate = factorialAnalysisData.subject_final_rate || 0;
    const plotArea = subjectData?.plot_area_sqft || 0;
    const builtupArea = subjectData?.builtup_area_sqft || 0;
    const ageYears = subjectData?.age_years || 0;

    const payload = {
      derived_plot_rate_per_sqft: Number(derivedRate),
      plot_area_sqft: Number(plotArea),
      builtup_area_sqft: Number(builtupArea),
      property_type: subjectData?.property_type || "villa",
      construction_rate_per_sqft: Number(costInputsValues.construction_rate_per_sqft || 0),
      total_life_of_building: Number(costInputsValues.total_life_of_building || 60),
      age_of_property: Number(ageYears),
    };

    if (!isRecalculation) {
      setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Run Traditional Cost Approach calculation. Construction Rate: ₹${payload.construction_rate_per_sqft}/sqft, Economic Life: ${payload.total_life_of_building} yrs. Plot Area: ${payload.plot_area_sqft} sqft, Built-up Area: ${payload.builtup_area_sqft} sqft, Age: ${payload.age_of_property} yrs.`,
        meta: "Now"
      },
      { role: "assistant", content: "Calculating depreciated property value...", meta: "Live" },
      ]);
    } else {
      setMessages((prev) => {
        const costResultIndex = prev.findIndex((msg) => msg.cost_calculation_data);
        if (costResultIndex === -1) return prev;
        return prev.map((msg, idx) =>
          idx === costResultIndex
            ? {
              ...msg,
              content: "Recalculating Cost Approach with updated parameters...",
              meta: "Live",
            }
            : msg
        );
      });
    }

    try {
      const response = await fetch(apiUrl("/cost_calculation_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Cost calculation failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
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
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "cost_calculation_start") summary = event.content?.message || "Running Cost Approach calculations...";
          else if (event.type === "cost_calculation_result") summary = `🛡️ Cost Approach calculated.`;
          else if (event.type === "cost_calculation_done") summary = "Cost Approach calculation complete.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "cost_calculation_result") {
            setCostCalculationData(event.content);
            // Bubble cost valuation result up for the Report tab in Visual Layer
            onValuationResult?.({
              type: "cost",
              factorialAnalysis: factorialAnalysisData,
              costCalculation: event.content,
              subjectData: subjectDataRef.current || subjectData,
              factorialData: factorialData,
              timestamp: new Date().toISOString(),
            });
            setMessages((prev) => {
              if (isRecalculation) {
                const costResultIndex = prev.findIndex((msg) => msg.cost_calculation_data || msg.meta === "Live");
                if (costResultIndex !== -1) {
                  return prev.map((msg, idx) =>
                    idx === costResultIndex
                      ? {
                        ...msg,
                        role: "assistant",
                        content: summary,
                        meta: "cost calculation results",
                        cost_calculation_data: event.content,
                      }
                      : msg
                  );
                }
              }

              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "cost calculation results",
                  cost_calculation_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "cost_calculation_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = isRecalculation
                ? next.findIndex((msg) => msg.cost_calculation_data || msg.meta === "Live")
                : next.length - 1;
              if (targetIndex >= 0 && !next[targetIndex].meta?.includes("results")) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "cost calculation done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        const targetIndex = isRecalculation
          ? next.findIndex((msg) => msg.cost_calculation_data || msg.meta === "Live")
          : next.length - 1;
        if (targetIndex >= 0) {
          next[targetIndex] = {
            ...next[targetIndex],
            role: "assistant",
            content: `Cost calculation error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsCostCalculating(false);
      setStreamingNote("");
    }
  };

  useEffect(() => {
    setFactorialData(externalFactorialData);
    if (externalFactorialData) {
      setMessages(prev => prev.map(msg => {
        if (msg.meta === "factorial results" || (msg.factorial_data && msg.factorial_data.table)) {
          return { ...msg, factorial_data: externalFactorialData };
        }
        return msg;
      }));
    }
  }, [externalFactorialData]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingNote, showTokenBreakdown, gateActive, mapConfirmation, approachChoiceNeeded]);

  const clearInteractiveState = () => {
    setClarificationPrompt("");
    setClarificationFields([]);
    setClarificationValues({});
    setMapConfirmation(null);
    setApproachChoiceNeeded(null);
    setExtractionVerification(null);
    setComparableData(null);
    setSelectedComps(new Set());
    setDbNoResults(false);
    setSubjectData(null);
    setListingData(null);
    setDbTransactions([]);
    setCleanedData(null);
    setFactorialData(null);
    setFactorialAnalysisData(null);
    setCostInputsSchema(null);
    setCostInputsValues({});
    setCostCalculationData(null);
    setIsCostCalculating(false);
    setPipelineDone(false);
    setCurrentStage("Stage 0: Initialization");
    // Reset gate wizard
    setGateActive(false);
    setGateStep(1);
    setGateMode(null);
    setGateAllFields([]);
    setGateValues({});
    // Reset collapse states
    setGateCollapsed(false);
    setMapCollapsed(false);
    setApproachCollapsed(false);
    setCtaListingCollapsed(false);
    setCtaCleanCollapsed(false);
    setCtaFactorialCollapsed(false);
    markersRef.current = [];
    onMarkersUpdate?.([]);
    setBackupValuationState(null);
    setFetchedCompIds(new Set());
  };

  // ── Subject-Only Listing Fetch (no comparables found anywhere) ───
  const submitSubjectOnlyListingFetch = async () => {
    if (!subjectData || isListingStreaming) return;

    setIsListingStreaming(true);
    setStreamingNote("🔍 Searching for listings for the subject property (no comparables)...");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Continue valuation using subject-only data (no comparables).", meta: "Now" },
      { role: "assistant", content: "Searching for listings for the subject project only...", meta: "Live" },
    ]);

    try {
      const response = await fetch(apiUrl("/listing_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectData,
          selected_comparables: [],          // no comparables — subject only
          property_type: subjectData.property_type || "apartment",
          listing_type: "sale",
        }),
      });

      if (!response.ok || !response.body)
        throw new Error(`Listing request failed: ${response.status}`);

      const reader = response.body.getReader();
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
          const event = JSON.parse(chunk.slice(6));

          if (event.type === "listing_progress") {
            setStreamingNote(
              `🔍 ${event.content?.project || "Subject"}: ${event.content?.detail || event.content?.status || ""}`
            );
          }

          if (event.type === "listing_results") {
            const allListings = event.content?.listings || [];
            setListingData(allListings);
            setMessages((prev) => {
              const next = [...prev];
              const lastIdx = next.length - 1;
              if (lastIdx >= 0) {
                next[lastIdx] = {
                  ...next[lastIdx],
                  role: "assistant",
                  content: `✅ Found ${allListings.length} listing(s) for the subject property.`,
                  meta: "listing results",
                  listings: allListings,
                  db_transactions: [],
                };
              }
              return next;
            });
          }

          if (event.type === "error") {
            setStreamingNote(`Error: ${event.content}`);
          }
        }
      }
    } catch (error) {
      setStreamingNote(`Subject-only listing search failed: ${error.message}`);
    } finally {
      setIsListingStreaming(false);
      setStreamingNote("");
    }
  };

  // ── Toggle comparable selection ────────────────────────────────
  const handleCompToggle = (index, checked) => {
    setSelectedComps((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  // ── Synchronize markers when state changes ────────────────────
  useEffect(() => {
    let allMarkers = [];

    // 1. Subject from subjectData
    if (subjectData?.lat && subjectData?.lng) {
      allMarkers.push({
        lat: subjectData.lat,
        lng: subjectData.lng,
        label: subjectData.project_name || "Subject",
        source: "subject"
      });
    }

    // 2. Comparables from comparableData
    if (comparableData) {
      const toolMarkers = comparableData
        .filter((c, index) => selectedComps.has(index))
        .filter(c => c.map_search_lat && c.map_search_lng && !isNaN(Number(c.map_search_lat)))
        .map(c => ({
          lat: Number(c.map_search_lat),
          lng: Number(c.map_search_lng),
          label: c.project_name || "Comparable",
          source: "comparable",
          data_source: c.data_source || "Web"
        }));

      // Deduplicate comparables by label (project name), prioritizing Web source coordinate
      const seen = new Map();
      for (const m of toolMarkers) {
        const name = (m.label || "").toLowerCase().trim();
        const existing = seen.get(name);
        if (!existing) {
          seen.set(name, m);
        } else {
          const currentIsWeb = String(m.data_source).toLowerCase() === "web";
          const existingIsWeb = String(existing.data_source).toLowerCase() === "web";
          if (currentIsWeb && !existingIsWeb) {
            seen.set(name, m);
          }
        }
      }
      allMarkers = [...allMarkers, ...Array.from(seen.values())];
    }


    markersRef.current = allMarkers;
    onMarkersUpdate?.(allMarkers);
  }, [subjectData, comparableData, selectedComps, factorialData]);

  // ── Go Back to Comparable Selection (Step 2) ──────────────────
  const handleBackToComparables = () => {
    // Save current state as backup so user can revert/cancel this action
    setBackupValuationState({
      messages: [...messages],
      listingData,
      dbTransactions,
      cleanedData,
      factorialData,
      factorialAnalysisData,
      costCalculationData,
      selectedComps: new Set(selectedComps),
      events: events ? [...events] : [],
    });

    setListingData(null);
    setDbTransactions([]);
    setCleanedData(null);
    setFactorialData(null);
    setFactorialAnalysisData(null);
    setCostCalculationData(null);
    // Keep selected comps so they remain selected by default in the selection table/map

    // Truncate chat messages after the comparable results message
    setMessages((prev) => {
      const compResultsIdx = prev.findIndex((m) => m.meta === "comparable results" || m.comparables);
      if (compResultsIdx !== -1) {
        return prev.slice(0, compResultsIdx + 1);
      }
      return prev;
    });

    // Pipeline sync and visual feedback
    onEventsReset?.("comparable_results");
    onValuationResult?.(null);
    setRevertNotice("⏪ Pipeline rewound to comparable selection");
  };

  const handleCancelModification = () => {
    if (!backupValuationState) return;

    const {
      messages: backupMessages,
      listingData: backupListingData,
      dbTransactions: backupDbTransactions,
      cleanedData: backupCleanedData,
      factorialData: backupFactorialData,
      factorialAnalysisData: backupFactorialAnalysisData,
      costCalculationData: backupCostCalculationData,
      selectedComps: backupSelectedComps,
      events: backupEvents,
    } = backupValuationState;

    setMessages(backupMessages);
    setListingData(backupListingData);
    setDbTransactions(backupDbTransactions);
    setCleanedData(backupCleanedData);
    setFactorialData(backupFactorialData);
    setFactorialAnalysisData(backupFactorialAnalysisData);
    setCostCalculationData(backupCostCalculationData);
    setSelectedComps(backupSelectedComps);

    if (setEvents && backupEvents) {
      setEvents(backupEvents);
    }

    // Reconstruct and restore valuationResult
    if (backupFactorialAnalysisData) {
      onValuationResult?.({
        type: subjectData?.recommended_approach === "cost" ? "cost" : "market",
        factorialAnalysis: backupFactorialAnalysisData,
        subjectData: subjectDataRef.current || subjectData,
        factorialData: backupFactorialData,
        costCalculation: backupCostCalculationData,
        timestamp: new Date().toISOString(),
      });
    }

    setBackupValuationState(null);
    setRevertNotice("🔄 Modification cancelled, previous valuation restored");
  };

  // ── Edit Past Profiling Inputs (Stage 1 / 2) ───────────────────
  const handleEditPropertyDetails = () => {
    const activeType = (subjectData?.property_type || "").toLowerCase().trim();

    // Construct identity, type, approach, and detail fields matching current property type
    const identityFields = [
      ...(activeType !== "plot" ? [{ field: "project_name", label: "Project Name", type: "text" }] : []),
      { field: "location_name", label: "Location / Locality", type: "text" },
      { field: "city_name", label: "City Name", type: "text" },
      { field: "country", label: "Country", type: "text" },
    ];
    const typeFields = [
      {
        field: "property_type", label: "Property Type", type: "select", options: [
          { value: "apartment", label: "Apartment / Flat" },
          { value: "villa", label: "Villa" },
          { value: "plot", label: "Plot / Land" },
          { value: "retail", label: "Retail / Shop" },
          { value: "commercial_office", label: "Commercial Office" },
          { value: "building_land", label: "Building + Land" },
        ]
      },
      ...(activeType === "building_land" ? [
        {
          field: "building_type", label: "Building Type", type: "select", options: [
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" },
            { value: "industrial", label: "Industrial" }
          ]
        }
      ] : [])
    ];
    const approachFields = activeType === "villa" ? [
      {
        field: "recommended_approach", label: "Valuation Approach", type: "select", options: [
          { value: "market", label: "Market Approach" },
          { value: "cost", label: "Cost Approach" },
        ]
      }
    ] : [];

    let detailFields = [];
    if (activeType === "apartment") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
      ];
    } else if (activeType === "villa" || activeType === "building_land") {
      detailFields = [
        { field: "plot_area_sqft", label: "Plot Area (sqft)", type: "number" },
        { field: "builtup_area_sqft", label: "Built-up Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
      ];
    } else if (activeType === "plot") {
      detailFields = [
        { field: "plot_area_sqft", label: "Plot Area (sqft)", type: "number" },
        {
          field: "land_type", label: "Land Type", type: "select", options: [
            { value: "agricultural", label: "Agricultural" },
            { value: "non_agricultural", label: "Non Agricultural" },
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" }
          ]
        },
      ];
    } else if (activeType === "retail") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "frontage", label: "Road Frontage (ft)", type: "number" },
      ];
    } else if (activeType === "commercial_office") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        {
          field: "occupancy_status", label: "Occupancy Status", type: "select", options: [
            { value: "vacant", label: "Vacant" },
            { value: "leased", label: "Leased" },
            { value: "self_use", label: "Self Use" }
          ]
        },
      ];
    } else {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
      ];
    }

    const allFields = [...identityFields, ...typeFields, ...approachFields, ...detailFields];
    const initialVals = buildGateInitialValues(allFields, subjectData, mapConfirmation);

    setGateAllFields(allFields);
    setGateValues(initialVals);
    setGateMode('verification'); // lets user edit and verify
    setGateStep(5); // start directly at Gate 5 Review step for convenience
    setGateActive(true);
  };

  // ── Recalculate Cost Value (Client-side Math for Realtime Updates) ──
  const recalculateCostValue = (derivedRate, subject, costInputs) => {
    const plotArea = Number(subject?.plot_area_sqft || 0);
    const builtupArea = Number(subject?.builtup_area_sqft || 0);
    const age = Number(subject?.age_years || 0);
    const constRate = Number(costInputs.construction_rate_per_sqft || 0);
    const totalLife = Number(costInputs.total_life_of_building || 60);
    const sym = getCurrencySymbol(subject?.currency);

    const landValue = derivedRate * plotArea;
    const constructionCost = constRate * builtupArea;
    const depreciationRate = Math.min(age / totalLife, 1.0);
    const depreciatedBuilding = constructionCost * (1.0 - depreciationRate);
    const costValue = landValue + depreciatedBuilding;

    return {
      success: true,
      property_type: subject?.property_type || "villa",
      inputs: {
        derived_plot_rate_per_sqft: derivedRate,
        plot_area_sqft: plotArea,
        builtup_area_sqft: builtupArea,
        construction_rate_per_sqft: constRate,
        age_of_property: age,
        total_life_of_building: totalLife,
      },
      calculations: {
        land_value: landValue,
        construction_cost: constructionCost,
        depreciation_rate_pct: depreciationRate * 100,
        depreciated_building_value: depreciatedBuilding,
      },
      result: {
        cost_value: costValue,
      },
      formula_audit: {
        step_1: `Land Value = ${derivedRate} ${sym}/sqft × ${plotArea} sqft (Plot Area) = ${sym}${Math.round(landValue).toLocaleString()}`,
        step_2: `Replacement Construction Cost = ${constRate} ${sym}/sqft × ${builtupArea} sqft (Built-up Area) = ${sym}${Math.round(constructionCost).toLocaleString()}`,
        step_3: `Depreciation = ${age} yrs / ${totalLife} yrs = ${(depreciationRate * 100).toFixed(2)}%`,
        step_4: `Depreciated Building Value = ${sym}${Math.round(constructionCost).toLocaleString()} × (100% − ${(depreciationRate * 100).toFixed(2)}%) = ${sym}${Math.round(depreciatedBuilding).toLocaleString()}`,
        step_5: `Cost Value = ${sym}${Math.round(landValue).toLocaleString()} (Land) + ${sym}${Math.round(depreciatedBuilding).toLocaleString()} (Building) = ${sym}${Math.round(costValue).toLocaleString()}`,
      }
    };
  };

  // ── Area/Age-Only Fast Recalculation (skip full pipeline re-run) ──────────
  // Called from gateSubmitFinal when user edited Stage 1 but only changed area or age.
  // Performs a client-side value update without any API calls.
  const AREA_AGE_FIELDS = new Set([
    "salable_area_sqft", "carpet_area_sqft", "builtup_area_sqft",
    "plot_area_sqft", "age_years",
  ]);

  const applyAreaAgeRecalculation = (updatedSubjectData, changedFields) => {
    // Persist updated subject data
    setSubjectData(updatedSubjectData);
    subjectDataRef.current = updatedSubjectData;

    const approach = updatedSubjectData.recommended_approach || "market";
    const sym = getCurrencySymbol(updatedSubjectData.currency);

    let newFactorialAnalysis = factorialAnalysisData ? { ...factorialAnalysisData } : null;
    let newCostCalc = costCalculationData;

    if (approach === "cost" && factorialAnalysisData && costInputsValues) {
      // Recalculate cost approach: land value + depreciated building
      const derivedRate = factorialAnalysisData.subject_final_rate || 0;
      newCostCalc = recalculateCostValue(derivedRate, updatedSubjectData, costInputsValues);
      setCostCalculationData(newCostCalc);

      // Stamp updated cost result into the relevant chat message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.cost_calculation_data ? { ...msg, cost_calculation_data: newCostCalc } : msg
        )
      );
    } else if (approach !== "cost" && factorialAnalysisData) {
      // Market approach: new market value = final_rate × new_area
      const finalRate = Number(factorialAnalysisData.subject_final_rate || 0);
      const newArea = Number(
        updatedSubjectData.salable_area_sqft ||
        updatedSubjectData.carpet_area_sqft ||
        updatedSubjectData.builtup_area_sqft ||
        0
      );
      const newMarketValue = Math.round(finalRate * newArea);
      newFactorialAnalysis = {
        ...factorialAnalysisData,
        market_value: newMarketValue,
        market_value_computed: true,
        subject_area_used: newArea,
      };
      setFactorialAnalysisData(newFactorialAnalysis);

      // Stamp updated analysis into the relevant chat message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.factorial_analysis_data
            ? { ...msg, factorial_analysis_data: newFactorialAnalysis }
            : msg
        )
      );
    }

    // Build a readable change summary
    const changeLabels = changedFields.map((f) => {
      const val = updatedSubjectData[f];
      if (f === "age_years") return `Age: ${val} yrs`;
      if (f.includes("area")) return `${f.replace(/_/g, " ").replace(/sqft/, "sqft")}: ${val}`;
      return `${f}: ${val}`;
    });

    const summaryMsg = `⚡ Quick update applied — ${changeLabels.join(", ")}. Valuation recalculated instantly without re-running the pipeline.`;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Updated: ${changeLabels.join(", ")}`, meta: "Now" },
      { role: "assistant", content: summaryMsg, meta: "Instant Update" },
    ]);

    // Emit a synthetic event to the workflow/execution panel
    onEvent?.({
      type: "area_age_recalc",
      content: {
        changed_fields: changedFields,
        updated_subject: updatedSubjectData,
        approach,
        new_market_value: approach !== "cost" ? newFactorialAnalysis?.market_value : null,
        new_cost_value: approach === "cost" ? newCostCalc?.result?.cost_value : null,
      },
    });

    // Notify parent with updated valuation result
    onValuationResult?.({
      type: approach === "cost" ? "cost" : "market",
      factorialAnalysis: newFactorialAnalysis,
      subjectData: updatedSubjectData,
      factorialData: factorialData,
      costCalculation: newCostCalc,
      timestamp: new Date().toISOString(),
    });

    setRevertNotice(`⚡ Instant recalc — ${changeLabels.join(", ")} updated`);
  };

  // ── Handle Custom Override Factoring Updates ─────────────────
  const handleUpdateFactoringData = (updatedData) => {
    setFactorialAnalysisData(updatedData);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.factorial_analysis_data) {
          return { ...msg, factorial_analysis_data: updatedData };
        }
        return msg;
      })
    );

    // If Cost Approach has already been executed, also recalculate cost approach details locally
    let updatedCost = costCalculationData;
    if (costCalculationData && subjectData?.recommended_approach === "cost") {
      updatedCost = recalculateCostValue(
        updatedData.subject_final_rate,
        subjectData,
        costInputsValues
      );
      setCostCalculationData(updatedCost);
    }

    onValuationResult?.({
      type: subjectData?.recommended_approach === "cost" ? "cost" : "market",
      factorialAnalysis: updatedData,
      subjectData: subjectDataRef.current || subjectData,
      factorialData: factorialData,
      costCalculation: updatedCost,
      timestamp: new Date().toISOString(),
    });
  };

  // ── Proceed to Listing Fetch (Step 2) ──────────────────────────
  const submitListingFetch = async () => {
    if (!comparableData || selectedComps.size === 0 || !subjectData || isListingStreaming) return;

    const selected = Array.from(selectedComps).map((i) => comparableData[i]);

    // ── Incremental Fetch: skip comps already fetched ──────────────────────────
    // Build a stable ID for each comparable (project_id > id > project_name)
    const getCompId = (c) => String(c.project_id || c.id || c.project_name || "").trim();

    const newComps = selected.filter(c => !fetchedCompIds.has(getCompId(c)));
    const skipComps = selected.filter(c => fetchedCompIds.has(getCompId(c)));

    const isIncremental = skipComps.length > 0;

    console.log("submitListingFetch starts:", {
      selected: selected.map(c => ({ name: c.project_name, source: c.data_source, id: getCompId(c) })),
      fetchedCompIds: Array.from(fetchedCompIds),
      newComps: newComps.map(c => c.project_name),
      skipComps: skipComps.map(c => c.project_name),
      isIncremental,
    });

    // Build stable sets for filtering previously fetched data to carry over
    const selectedProjectNames = new Set(
      selected.map(c => String(c.project_name || "").trim().toLowerCase())
    );
    const selectedProjectIds = new Set(
      selected.map(c => String(c.project_id || c.id || "").trim().toLowerCase()).filter(Boolean)
    );
    const subjectProjectName = String(subjectData?.project_name || "").trim().toLowerCase();

    // Split new comps by source
    const dbComps = newComps.filter(c => (c.data_source || "Web") === "Internal DB");
    const webComps = newComps.filter(c => (c.data_source || "Web") !== "Internal DB");

    // If subject project exists in internal DB, also fetch its transactions (first time only)
    const subjectDbProject = subjectData?.subject_db_project || null;
    const shouldFetchSubjectTx = subjectDbProject && !fetchedCompIds.has("__subject__");
    const shouldFetchWebListings = webComps.length > 0 || !fetchedCompIds.has("__subject_web__");

    // Filter previous records from backup state
    const isPrevListingToKeep = (lst) => {
      if (!lst) return false;
      const lstProj = String(lst.project_name || lst.cleaned_match_project || "").trim().toLowerCase();
      const lstProjId = String(lst.project_id || lst.cleaned_match_id || "").trim().toLowerCase();
      if (lst.is_subject || lstProj === subjectProjectName) {
        return true;
      }
      if (selectedProjectNames.has(lstProj)) {
        return true;
      }
      if (lstProjId && selectedProjectIds.has(lstProjId)) {
        return true;
      }
      return false;
    };

    const isPrevTxToKeep = (tx) => {
      if (!tx) return false;
      const txProj = String(tx.project_name || tx.cleaned_match_project || "").trim().toLowerCase();
      const txProjId = String(tx.project_id || tx.cleaned_match_id || "").trim().toLowerCase();
      if (tx.is_subject || txProj === subjectProjectName) {
        return !shouldFetchSubjectTx;
      }
      if (selectedProjectNames.has(txProj)) {
        return true;
      }
      if (txProjId && selectedProjectIds.has(txProjId)) {
        return true;
      }
      return false;
    };

    const activePreviousListings = (backupValuationState?.listingData || []).filter(isPrevListingToKeep);
    const activePreviousDbTransactions = (backupValuationState?.dbTransactions || []).filter(isPrevTxToKeep);

    setBackupValuationState(null);

    // If nothing new to fetch, nothing to do
    if (newComps.length === 0 && !shouldFetchSubjectTx && !shouldFetchWebListings) {
      setRevertNotice("⏩ All selected comparables already fetched — nothing new to process");
      return;
    }

    setIsListingStreaming(true);
    setStreamingNote(isIncremental
      ? `⏩ Skipping ${skipComps.length} already-fetched comparable(s). Fetching ${newComps.length} new one(s)...`
      : "Starting listing fetch pipeline...");
    setCurrentStage("Stage 3: Market Approach (Listing Fetch)");

    const totalDbFetches = dbComps.length + (shouldFetchSubjectTx ? 1 : 0);
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: isIncremental
          ? `Adding ${newComps.length} new comparable(s). Skipping ${skipComps.length} already fetched (${skipComps.map(c => c.project_name).join(", ")}).`
          : `Proceed with ${selected.length} selected comparable(s) — ${totalDbFetches} from Internal DB, ${webComps.length} from Web.`,
        meta: "Now",
      },
      { role: "assistant", content: isIncremental ? "Fetching listings for new comparables only..." : "Running listing pipeline...", meta: "Live" },
    ]);

    try {
      // ── 1. Fetch transactions for each Internal DB comparable in parallel ──
      const fetchProjectTransactions = async (comp, isSubject = false) => {
        const projId = comp.project_id || comp.id || comp.project_name;
        const propType = comp.property_type || subjectData.property_type || "apartment";
        if (!projId) return [];

        setStreamingNote(`🗄️ Fetching DB transactions for "${comp.project_name}"...`);
        const projectTx = [];
        try {
          const res = await fetch(apiUrl("/transaction_stream"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: String(projId),
              property_type: propType,
              project_name: comp.project_name || "",
            }),
          });
          if (!res.ok || !res.body) return [];

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const chunks = buf.split("\n\n");
            buf = chunks.pop() || "";
            for (const chunk of chunks) {
              if (!chunk.startsWith("data: ")) continue;
              const ev = JSON.parse(chunk.slice(6));
              onEvent?.(ev);
              if (ev.type === "transaction_results") {
                const txs = ev.content?.transactions || [];
                const mapped = isSubject ? txs.map(t => ({ ...t, is_subject: true })) : txs;
                projectTx.push(...mapped);
                setStreamingNote(`✅ Got ${ev.content?.total || 0} ${isSubject ? "subject " : ""}transactions for "${comp.project_name}"`);
              }
            }
          }
        } catch (e) {
          console.warn("DB transaction fetch failed for", comp.project_name, e);
        }
        return projectTx;
      };

      const fetchWebListings = async () => {
        const webFetchNote = webComps.length > 0
          ? `🌐 Fetching web listings for Subject Project & ${webComps.length} web comparable(s)...`
          : `🌐 Fetching web listings for Subject Project...`;
        setStreamingNote(webFetchNote);

        try {
          const response = await fetch(apiUrl("/listing_stream"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: subjectData,
              selected_comparables: webComps,
              property_type: subjectData.property_type || "apartment",
            }),
          });

          if (!response.ok || !response.body) return [];

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let listings = [];

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
              if (!chunk.startsWith("data: ")) continue;
              const event = JSON.parse(chunk.slice(6));
              onEvent?.(event);
              const summary = summarizeEvent(event);
              setStreamingNote(summary);

              if (event.type === "listing_results") {
                listings = event.content?.listings || [];
                const newUsage = event.content?.token_usage || {};
                const total = newUsage.total_tokens || 0;
                const model = newUsage.model || "gpt-4o-mini";
                // Filter out subject listings from the fresh stream results only if they are already in the backup listings
                const hasPreviousSubjectListing = activePreviousListings.some(l =>
                  l && (l.is_subject || String(l.project_name || l.cleaned_match_project || "").trim().toLowerCase() === subjectProjectName)
                );
                const freshListings = hasPreviousSubjectListing
                  ? listings.filter(l => {
                    if (!l) return false;
                    const lProj = String(l.project_name || l.cleaned_match_project || "").trim().toLowerCase();
                    return !(l.is_subject || lProj === subjectProjectName);
                  })
                  : listings;
                // Merge with existing listingData (incremental addition)
                const mergedListings = isIncremental
                  ? [...activePreviousListings, ...freshListings]
                  : listings;
                setListingData(mergedListings);
                setTokenStats((prev) => {
                  const nextModelBreakdown = { ...prev.model_breakdown };
                  const currentModelStats = nextModelBreakdown[model] || { prompt: 0, completion: 0, total: 0 };

                  const promptDiff = (newUsage.prompt_tokens || 0);
                  const completionDiff = (newUsage.completion_tokens || 0);

                  nextModelBreakdown[model] = {
                    prompt: currentModelStats.prompt + promptDiff,
                    completion: currentModelStats.completion + completionDiff,
                    total: currentModelStats.total + total
                  };

                  const addedCost = getModelCost(model, promptDiff, completionDiff);

                  return {
                    ...prev,
                    total_tokens: prev.total_tokens + total,
                    model_breakdown: nextModelBreakdown,
                    cost_usd: (prev.cost_usd || 0) + addedCost
                  };
                });
                setMessages((prev) => {
                  const next = [...prev];
                  const lastIndex = next.length - 1;
                  if (lastIndex >= 0) {
                    next[lastIndex] = {
                      ...next[lastIndex],
                      role: "assistant",
                      content: summary,
                      meta: "listing results",
                      listings: mergedListings,
                      // Preserve any DB transactions stamped in the same message
                      db_transactions: next[lastIndex].db_transactions || [],
                    };
                  }
                  return next;
                });
              }

              if (event.type === "listing_done" || event.type === "error") {
                setMessages((prev) => {
                  const next = [...prev];
                  const lastIndex = next.length - 1;
                  if (lastIndex >= 0 && !next[lastIndex].listings) {
                    next[lastIndex] = { ...next[lastIndex], role: "assistant", content: summary, meta: event.type === "error" ? "error" : "listing done" };
                  }
                  return next;
                });
              }
            }
          }
          return listings;
        } catch (error) {
          console.warn("Web listing fetch failed", error);
          throw error;
        }
      };

      const fetchPromises = [];
      for (const comp of dbComps) {
        fetchPromises.push(fetchProjectTransactions(comp, false));
      }
      if (shouldFetchSubjectTx) {
        fetchPromises.push(fetchProjectTransactions(subjectDbProject, true));
      }

      // Execute all DB fetches and Web listings fetch concurrently in parallel
      let dbResults = [];
      if (shouldFetchWebListings) {
        const [dbRes, _] = await Promise.all([
          Promise.all(fetchPromises),
          fetchWebListings()
        ]);
        dbResults = dbRes;
      } else {
        // No web listings to fetch. Use active previous listings as is, and just fetch DB transactions
        setListingData(activePreviousListings);
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0) {
            next[lastIndex] = {
              ...next[lastIndex],
              role: "assistant",
              content: "⏩ Listings carried over from previous run.",
              meta: "listing done",
              listings: activePreviousListings,
            };
          }
          return next;
        });
        dbResults = await Promise.all(fetchPromises);
      }

      const newDbTransactions = dbResults.flat();

      // Merge new DB transactions with existing ones (incremental case)
      const mergedDbTransactions = isIncremental
        ? [...activePreviousDbTransactions, ...newDbTransactions]
        : newDbTransactions;

      // Store merged DB transactions and stamp on the message
      if (mergedDbTransactions.length > 0) {
        setDbTransactions(mergedDbTransactions);
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0) {
            next[lastIndex] = {
              ...next[lastIndex],
              db_transactions: mergedDbTransactions,
            };
          }
          return next;
        });
      }

      // Mark newly fetched comp IDs so they won't be re-fetched next time
      setFetchedCompIds((prev) => {
        const next = new Set(prev);
        newComps.forEach(c => next.add(getCompId(c)));
        if (shouldFetchSubjectTx) next.add("__subject__");
        if (shouldFetchWebListings) next.add("__subject_web__");
        return next;
      });

      // Emit synthetic event to workflow panel for incremental fetch
      if (isIncremental) {
        onEvent?.({
          type: "incremental_listing",
          content: {
            new_count: newComps.length,
            skipped_count: skipComps.length,
            skipped_names: skipComps.map(c => c.project_name),
          },
        });
      }

    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = { ...next[next.length - 1], role: "assistant", content: `Listing fetch error: ${error.message}`, meta: "Error" };
        }
        return next;
      });
    } finally {
      setIsListingStreaming(false);
      setStreamingNote("");
    }
  };

  // ── Proceed to Data Cleaning (Step 3) ──────────────────────────
  const submitCleaning = async () => {
    // Trigger if we have web listings OR db transactions (or both)
    const hasWebListings = listingData && listingData.length > 0;
    const hasDbTx = dbTransactions && dbTransactions.length > 0;
    if ((!hasWebListings && !hasDbTx) || !subjectData || isCleaningStreaming) return;

    const selected = Array.from(selectedComps).map((i) => comparableData[i]);
    const webCount = (listingData || []).length;
    const dbCount = dbTransactions.length;

    setIsCleaningStreaming(true);
    setStreamingNote("Starting data cleaning pipeline...");
    setCurrentStage("Stage 3: Market Approach (Data Cleaning)");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Proceed to clean ${webCount} web listing(s) and merge with ${dbCount} Internal DB transaction(s).`,
        meta: "Now",
      },
      { role: "assistant", content: "Running smart data cleaning pipeline...", meta: "Live" },
    ]);


    try {
      const response = await fetch(apiUrl("/cleaning_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listings: listingData || [],          // web listings only — cleaning applies here
          subject: subjectData,
          comparables: selected,
          property_type: subjectData.property_type || "apartment",
          db_transactions: dbTransactions,      // passed through as-is, merged after cleaning
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Cleaning request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
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
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "cleaning_start") summary = event.content?.message || "Starting data cleaning...";
          else if (event.type === "cleaning_progress") summary = `🧹 Cleaning: ${event.content?.detail || event.content?.stage}`;
          else if (event.type === "cleaning_results") {
            const webCnt = event.content?.web_count ?? (event.content?.cleaned_listings?.length || 0);
            const dbCnt = event.content?.db_count ?? 0;
            summary = `✅ Cleaning complete: ${webCnt} web listing(s) + ${dbCnt} Internal DB transaction(s) merged.`;
          }
          else if (event.type === "cleaning_done") summary = "Data cleaning pipeline finished.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "cleaning_results") {
            const cleanedListings = event.content?.cleaned_listings || [];
            const reviewListings = event.content?.review_listings || [];
            const droppedListings = event.content?.dropped_listings || [];
            const auditStats = event.content?.audit_stats || {};
            const newUsage = auditStats.token_usage || {};
            const total = newUsage.total_tokens || 0;
            const model = newUsage.model || "gpt-4o-mini";

            setCleanedData(cleanedListings);
            setTokenStats((prev) => {
              const nextModelBreakdown = { ...prev.model_breakdown };
              const currentModelStats = nextModelBreakdown[model] || { prompt: 0, completion: 0, total: 0 };

              const promptDiff = (newUsage.prompt_tokens || 0);
              const completionDiff = (newUsage.completion_tokens || 0);

              nextModelBreakdown[model] = {
                prompt: currentModelStats.prompt + promptDiff,
                completion: currentModelStats.completion + completionDiff,
                total: currentModelStats.total + total
              };

              const addedCost = getModelCost(model, promptDiff, completionDiff);

              return {
                ...prev,
                total_tokens: prev.total_tokens + total,
                model_breakdown: nextModelBreakdown,
                cost_usd: (prev.cost_usd || 0) + addedCost
              };
            });

            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "cleaning results",
                  cleaned_listings: cleanedListings,
                  review_listings: reviewListings,
                  dropped_listings: droppedListings,
                };
              }
              return next;
            });
          }

          if (event.type === "cleaning_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "cleaning done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Cleaning fetch error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsCleaningStreaming(false);
      setStreamingNote("");
    }
  };


  // ── Handle Plot Rate Recalculation (Overrides) ─────────────────
  const handleRecalculatePlotRates = async (fsiGlobal, ccGlobal, rowOverrides = {}, mode = "global") => {
    if (!cleanedData || cleanedData.length === 0 || !subjectData || isCleaningStreaming) return;

    setIsCleaningStreaming(true);
    setStreamingNote("Recalculating plot rates with overrides...");

    const getCleanedListingsMessageIndex = (messages) => {
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i]?.cleaned_listings) return i;
      }
      return messages.length - 1;
    };

    try {
      const parsedFsiGlobal = parseFloat(fsiGlobal);
      const parsedCcGlobal = parseFloat(ccGlobal);
      const hasFsiGlobal = fsiGlobal !== "" && !isNaN(parsedFsiGlobal);
      const hasCcGlobal = ccGlobal !== "" && !isNaN(parsedCcGlobal);
      const shouldUseGlobalOverrides = mode === "global";
      const mappedOverrides = {};
      cleanedData.forEach((lst, origIdx) => {
        const rowNeedsPlotConversion = needsPlotConversionInputs(
          lst,
          subjectData.property_type || "plot",
          subjectData.recommended_approach
        );
        const overrideAvailability = {
          fsi: rowNeedsPlotConversion,
          cc: rowNeedsPlotConversion,
        };
        if (!overrideAvailability.fsi && !overrideAvailability.cc) return;

        const uniqueKey = getRowKey(lst, origIdx);
        const ov = rowOverrides[uniqueKey];
        const hasRowFsiOverride = overrideAvailability.fsi && ov?.fsi_best !== undefined && ov.fsi_best !== "";
        const hasRowCcOverride = overrideAvailability.cc && ov?.const_cost_best !== undefined && ov.const_cost_best !== "";
        const shouldApplyFsiGlobal = shouldUseGlobalOverrides && overrideAvailability.fsi && hasFsiGlobal;
        const shouldApplyCcGlobal = shouldUseGlobalOverrides && overrideAvailability.cc && hasCcGlobal;

        if (hasRowFsiOverride || hasRowCcOverride || shouldApplyFsiGlobal || shouldApplyCcGlobal) {
          mappedOverrides[origIdx] = {};
          if (shouldApplyFsiGlobal) {
            mappedOverrides[origIdx].fsi_low = parsedFsiGlobal;
            mappedOverrides[origIdx].fsi_high = parsedFsiGlobal;
          }
          if (shouldApplyCcGlobal) {
            mappedOverrides[origIdx].cc_low = parsedCcGlobal;
            mappedOverrides[origIdx].cc_high = parsedCcGlobal;
          }
          if (hasRowFsiOverride) {
            mappedOverrides[origIdx].fsi_low = ov.fsi_best;
            mappedOverrides[origIdx].fsi_high = ov.fsi_best;
          }
          if (hasRowCcOverride) {
            mappedOverrides[origIdx].cc_low = ov.const_cost_best;
            mappedOverrides[origIdx].cc_high = ov.const_cost_best;
          }
        }
      });
      const overriddenIndices = new Set(Object.keys(mappedOverrides).map((idx) => Number(idx)));

      const payload = {
        cleaned_listings: cleanedData,
        subject: subjectData,
        property_type: subjectData.property_type || "plot",
        overrides: mappedOverrides,
      };

      const response = await fetch(apiUrl("/recalculate_plot_rates_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Recalculate request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newCleanedListings = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "recalculate_start") summary = event.content || "Recalculating plot rates...";
          else if (event.type === "recalculate_results") {
            summary = `Recalculation ready — ${event.content?.listings?.length || 0} listings.`;
            newCleanedListings = event.content.listings;
          }
          else if (event.type === "recalculate_done") summary = "Plot rate recalculation complete.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "recalculate_results" && event.content?.listings) {
            const updatedListings = cleanedData.map((listing, idx) =>
              overriddenIndices.has(idx)
                ? (event.content.listings[idx] || listing)
                : listing
            );
            setCleanedData(updatedListings);
            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = getCleanedListingsMessageIndex(next);
              if (targetIndex >= 0) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: "cleaning results",
                  cleaned_listings: updatedListings,
                  // Backend returns the authoritative full set after segregating
                  // negative-rate listings — update both tabs in one shot.
                  dropped_listings: event.content.dropped_listings ?? next[targetIndex].dropped_listings ?? [],
                  review_listings: event.content.review_listings ?? next[targetIndex].review_listings ?? [],
                };
              }
              return next;
            });
          }

          if (event.type === "recalculate_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = getCleanedListingsMessageIndex(next);
              if (targetIndex >= 0 && !next[targetIndex].meta?.includes("results")) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "recalculation done",
                };
              }
              return next;
            });
          }
        }
      }

      if (newCleanedListings) {
        setFactorialData(null);
        setFactorialAnalysisData(null);
        setCostCalculationData(null);
        setNeedsFactorialRegeneration(true);
        setCtaFactorialCollapsed(false);
        onValuationResult?.(null);
        setMessages((prev) =>
          prev.filter((msg) =>
            !msg.factorial_data &&
            !msg.factorial_analysis_data &&
            !msg.cost_calculation_data
          )
        );
      }

    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        const targetIndex = getCleanedListingsMessageIndex(next);
        if (targetIndex >= 0) {
          next[targetIndex] = {
            ...next[targetIndex],
            role: "assistant",
            content: `Recalculate error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsCleaningStreaming(false);
      setStreamingNote("");
    }
  };


  // ── Proceed to Factorial Table (Step 4) ────────────────────────
  const submitFactorial = async () => {
    if (!cleanedData || cleanedData.length === 0 || !subjectData || isFactorialStreaming) return;

    const selected = Array.from(selectedComps).map((i) => comparableData[i]);

    setIsFactorialStreaming(true);
    setStreamingNote("Computing factorial rate table...");
    setCurrentStage("Stage 4: Factorial Rate Table");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Generate factorial rate table from ${cleanedData.length} cleaned listings.`, meta: "Now" },
      { role: "assistant", content: "Computing rate statistics...", meta: "Live" },
    ]);

    try {
      const response = await fetch(apiUrl("/factorial_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaned_listings: cleanedData,
          subject: subjectData,
          comparables: selected,
          currency: subjectData.currency,
          area_unit: subjectData.area_unit || "sqft",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Factorial request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
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
          const event = JSON.parse(chunk.slice(6));

          console.log("SSE EVENT:", event);
          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "factorial_start") summary = event.content?.message || "Computing factorial table...";
          else if (event.type === "factorial_results") summary = `📈 Factorial table ready — ${event.content?.table?.length || 0} projects.`;
          else if (event.type === "factorial_done") summary = "Factorial rate table generated.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "factorial_results") {
            setFactorialData(event.content);
            setNeedsFactorialRegeneration(false);
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "factorial results",
                  factorial_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "factorial_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta?.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "factorial done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Factorial table error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsFactorialStreaming(false);
      setStreamingNote("");
    }
  };

  const submitFactorialAnalysis = async (factData, subject, comps) => {
    if (!factData || !subject || isFactorialAnalysisStreaming) return;

    setIsFactorialAnalysisStreaming(true);
    setStreamingNote("Sending factorial data to Agent for adjustment analysis...");
    setCurrentStage("Stage 5: Agent Factorial Analysis");

    setMessages((prev) => {
      const existingIndex = prev.findIndex(m =>
        m.meta === "factorial analysis results" ||
        m.meta === "factorial analysis done" ||
        m.meta === "factorial analysis start" ||
        m.content === "Running Agent Factoring..."
      );

      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = { role: "assistant", content: "Running Agent Factoring...", meta: "Live" };
        return next;
      }
      return [
        ...prev,
        { role: "assistant", content: "Running Agent Factoring...", meta: "Live" }
      ];
    });

    try {
      const response = await fetch(apiUrl("/factorial_analysis_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorial_data: factData,
          subject: subject,
          comparables: comps,
          radii: { road_m: 200, amenity_m: 2000, density_m: 500 }
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Agent Factoring request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
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
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "factorial_analysis_start") summary = event.content?.message || "Running Agent factoring analysis...";
          else if (event.type === "factorial_analysis_result") summary = `🤖 Agent Factoring ready.`;
          else if (event.type === "factorial_analysis_done") summary = "Agent Factoring completed.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "factorial_analysis_result") {
            setFactorialAnalysisData(event.content);
            // Bubble valuation result up for the Report tab in Visual Layer
            onValuationResult?.({
              type: "market",
              factorialAnalysis: event.content,
              subjectData: subjectDataRef.current || subjectData,
              factorialData: factorialData,
              timestamp: new Date().toISOString(),
            });

            // Handle audit stats
            const usage = event.content?._token_usage;
            if (usage) {
              const total = usage.total_tokens || 0;
              const model = usage.model || "gpt-4o";
              setTokenStats((prev) => {
                const nextModelBreakdown = { ...prev.model_breakdown };
                const currentModelStats = nextModelBreakdown[model] || { prompt: 0, completion: 0, total: 0 };

                const promptDiff = (usage.prompt_tokens || 0);
                const completionDiff = (usage.completion_tokens || 0);

                nextModelBreakdown[model] = {
                  prompt: currentModelStats.prompt + promptDiff,
                  completion: currentModelStats.completion + completionDiff,
                  total: currentModelStats.total + total
                };

                const addedCost = getModelCost(model, promptDiff, completionDiff);

                return {
                  ...prev,
                  total_tokens: prev.total_tokens + total,
                  model_breakdown: nextModelBreakdown,
                  cost_usd: (prev.cost_usd || 0) + addedCost,
                  last_stage_tokens: total,
                  last_stage_name: "Agent Factoring (Stage 5)"
                };
              });
            }

            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = next.findIndex(m => m.meta === "Live" || m.meta === "factorial analysis results");
              if (targetIndex !== -1) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: "factorial analysis results",
                  factorial_analysis_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "factorial_analysis_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = next.findIndex(m => m.meta === "Live" || m.meta === "factorial analysis results");
              if (targetIndex !== -1 && !next[targetIndex].meta?.includes("results")) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "factorial analysis done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        const targetIndex = next.findIndex(m => m.meta === "Live" || m.meta === "factorial analysis results");
        if (targetIndex !== -1) {
          next[targetIndex] = {
            ...next[targetIndex],
            role: "assistant",
            content: `Agent Factoring error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsFactorialAnalysisStreaming(false);
      setStreamingNote("");
    }
  };


  const buildGateInitialValues = (schemas, currentSubjectData, currentMapConfirmation) => {
    const sData = currentSubjectData || subjectDataRef.current || {};
    const mapConf = currentMapConfirmation || mapConfirmation || null;

    const allExpectedFields = [
      ...schemas.map(s => s.field),
      "project_name",
      "location_name",
      "city_name",
      "country",
      "city",
      "property_type",
      "recommended_approach",
      "lat",
      "lng",
      "coordinates",
      "salable_area_sqft",
      "builtup_area_sqft",
      "plot_area_sqft",
      "age_years",
      "land_type",
      "frontage",
      "occupancy_status"
    ];

    const initVals = {};

    // Fill defaults from schemas
    schemas.forEach(s => {
      let dVal = s.default;
      if (s.field === "property_type" && dVal) {
        const hasOpt = s.options?.some(o => (typeof o === 'object' ? o.value : o) === dVal);
        if (!hasOpt) dVal = "";
      }
      if (dVal !== undefined && dVal !== null && dVal !== "") {
        initVals[s.field] = dVal;
      }
    });

    // Autofill from sData (extracted from query)
    allExpectedFields.forEach(field => {
      if (initVals[field] === undefined || initVals[field] === null || initVals[field] === "") {
        // Handle city_name: also check legacy 'city' key from backend
        let valFromData = sData[field] !== undefined ? sData[field] : (sData.entities ? sData.entities[field] : undefined);
        if (field === "city_name" && (valFromData === undefined || valFromData === null || valFromData === "")) {
          valFromData = sData["city"] || (sData.entities ? sData.entities["city"] : undefined);
        }
        if (valFromData !== undefined && valFromData !== null && valFromData !== "") {
          if (!(field === "project_name" && valFromData === "Subject Property")) {
            if (field === "coordinates" && typeof valFromData === 'object') {
              if (valFromData.lat && valFromData.lng) {
                initVals[field] = `${valFromData.lat}, ${valFromData.lng}`;
              }
            } else if (typeof valFromData !== 'object') {
              initVals[field] = valFromData;
            }
          }
        }
      }
    });

    // Fallback/custom fields mapping
    if (!initVals["lat"] || Number(initVals["lat"]) === 0) {
      if (mapConf?.lat) {
        initVals["lat"] = mapConf.lat;
      } else if (sData.coordinates?.lat) {
        initVals["lat"] = sData.coordinates.lat;
      } else if (sData.lat) {
        initVals["lat"] = sData.lat;
      }
    }
    if (!initVals["lng"] || Number(initVals["lng"]) === 0) {
      if (mapConf?.lng) {
        initVals["lng"] = mapConf.lng;
      } else if (sData.coordinates?.lng) {
        initVals["lng"] = sData.coordinates.lng;
      } else if (sData.lng) {
        initVals["lng"] = sData.lng;
      }
    }

    if (!initVals["coordinates"]) {
      if (initVals["lat"] && initVals["lng"]) {
        initVals["coordinates"] = `${initVals["lat"]}, ${initVals["lng"]}`;
      } else if (sData.coordinates) {
        if (typeof sData.coordinates === 'string') {
          initVals["coordinates"] = sData.coordinates;
        } else if (typeof sData.coordinates === 'object' && sData.coordinates.lat && sData.coordinates.lng) {
          initVals["coordinates"] = `${sData.coordinates.lat}, ${sData.coordinates.lng}`;
        }
      }
    }

    // Area fields fallback mapping
    const propType = (gateValues["property_type"] || sData.property_type || "").toLowerCase().trim();

    const extractedSalable = sData.salable_area_sqft || sData.entities?.salable_area_sqft || "";
    const extractedBuiltup = sData.builtup_area_sqft || sData.entities?.builtup_area_sqft || "";
    const extractedPlot = sData.plot_area_sqft || sData.entities?.plot_area_sqft || "";

    const primaryArea = extractedBuiltup || extractedSalable || extractedPlot;

    if (primaryArea) {
      if (propType === "villa" || propType === "building_land") {
        initVals["builtup_area_sqft"] = extractedBuiltup || extractedSalable || "";
        initVals["plot_area_sqft"] = extractedPlot || ""; // Do NOT fall back to salable/builtup for villa plot area
      } else if (propType === "plot") {
        initVals["plot_area_sqft"] = extractedPlot || primaryArea;
      } else {
        // apartment, retail, commercial_office
        initVals["salable_area_sqft"] = extractedSalable || primaryArea;
      }

      // Keep other fields filled if extracted specifically
      if (extractedSalable) initVals["salable_area_sqft"] = extractedSalable;
      if (extractedBuiltup) initVals["builtup_area_sqft"] = extractedBuiltup;
      if (extractedPlot) initVals["plot_area_sqft"] = extractedPlot;
    }

    // Ensure all expected fields are strings/numbers, not undefined
    allExpectedFields.forEach(field => {
      if (initVals[field] === undefined || initVals[field] === null || typeof initVals[field] === 'object') {
        initVals[field] = "";
      }
    });

    return initVals;
  };


  const submitQuestion = async (question, isContinuation = false, uiDisplayOverride = null) => {
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;

    abortRef.current?.abort?.();
    abortRef.current = new AbortController();
    setCurrentQuestion(trimmed);
    clearInteractiveState();

    if (!isContinuation) {
      onClear?.();
      setMessages([]);
      setOriginalQuestion(trimmed);
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: uiDisplayOverride || trimmed, meta: "Now" },
      { role: "assistant", content: "Running the valuation pipeline...", meta: "Live" },
    ]);
    setInput("");
    setStreamingNote("Connecting to backend stream...");
    setIsStreaming(true);

    let currentSubjectObj = null;
    let currentMapConf = null;

    try {
      const response = await fetch(apiUrl(`/ask_stream_valuation?question=${encodeURIComponent(trimmed)}&comparable_source=both`), {
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Backend request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
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

          const event = JSON.parse(chunk.slice(6));
          onEvent?.(event);

          if (event.type === "token_usage") {
            const content = event.content || {};
            setTokenStats({
              total_tokens: content.cumulative_total_tokens || 0,
              cost_usd: content.cumulative_cost_usd || 0,
              model_breakdown: content.model_breakdown || {},
              tool_breakdown: content.tool_breakdown || {}
            });
          }


          if (event.type === "stage") {
            setCurrentStage(event.content || "Processing...");
          }

          if (event.type === "entities") {
            const ents = event.content;
            const coords = ents?.coordinates;

            // Store subject data for later use in listing fetch
            const subjectObj = {
              ...ents,
              project_name: ents?.project_name || "Subject Property",
              location_name: ents?.location_name || "",
              country: ents?.country || "India",
              currency: ents?.currency || "INR",
              property_type: ents?.property_type || "apartment",
              recommended_approach: ents?.recommended_approach || "market",
              lat: coords?.lat || 0,
              lng: coords?.lng || 0,
            };
            setSubjectData(subjectObj);
            subjectDataRef.current = subjectObj;
            currentSubjectObj = subjectObj;

            if (coords?.lat && coords?.lng && !isNaN(Number(coords.lat)) && !isNaN(Number(coords.lng)) && Number(coords.lat) !== 0 && Number(coords.lng) !== 0) {
              // useEffect will handle marker update
            }
          }

          if (event.type === "cost_inputs_required") {
            const normalizedSchema = normalizeCostInputSchema(event.content);
            setCostInputsSchema(normalizedSchema);
            setCostInputsValues((prev) =>
              buildCostInputDefaults(normalizedSchema, subjectDataRef.current, prev)
            );
          }

          if (event.type === "clarification_needed") {
            const inputs = event.content?.user_inputs_required || [];
            const fields = event.content?.missing_fields || [];
            const schemas = inputs.length > 0 ? inputs : fields.map(f => ({
              field: f, label: f.replaceAll("_", " "), type: "text"
            }));
            const initVals = buildGateInitialValues(schemas, currentSubjectObj, currentMapConf);
            // Legacy path kept for non-gate flows
            setClarificationPrompt(event.content?.question || event.content?.message || "");
            setClarificationFields(schemas);
            setClarificationValues(initVals);
            // Open gate wizard
            setGateAllFields(schemas);
            setGateValues(initVals);
            setGateMode('clarification');
            setGateStep(1);
            setGateActive(true);
          }

          if (event.type === "map_confirmation") {
            const lat = Number(event.content?.lat);
            const lng = Number(event.content?.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
              const conf = {
                lat,
                lng,
                label: event.content?.location_name || "Subject Property",
                source: "map_confirmation",
                message: event.content?.message || "Please confirm this location.",
              };
              setMapConfirmation(conf);
              currentMapConf = conf;
              setClarificationValues(prev => ({
                ...prev,
                coordinates: `${lat}, ${lng}`,
                lat: lat,
                lng: lng
              }));
              setGateValues(prev => ({
                ...prev,
                coordinates: `${lat}, ${lng}`,
                lat: lat,
                lng: lng
              }));
            }
          }

          if (event.type === "approach_choice_needed") {
            setApproachChoiceNeeded(event.content);
            // Open the 5-step wizard at Step 3 (Approach Selection)
            const schemas = [
              {
                field: "recommended_approach",
                label: "Valuation Approach",
                type: "select",
                options: [
                  { value: "market", label: "Market Approach" },
                  { value: "cost", label: "Cost Approach" }
                ],
                default: event.content.recommended_approach
              }
            ];
            const initVals = buildGateInitialValues(schemas, currentSubjectObj || subjectDataRef.current, currentMapConf || mapConfirmation);
            if (event.content.recommended_approach) {
              initVals["recommended_approach"] = event.content.recommended_approach;
            }
            setGateAllFields(schemas);
            setGateValues(initVals);
            setGateMode('clarification');
            setGateStep(3); // Start directly at Step 3: Approach Selection
            setGateActive(true);
          }

          if (event.type === "extraction_verification") {
            setExtractionVerification(event.content);
            const ents = event.content?.entities || {};
            const ignoreKeys = [
              "intent", "extraction_verified", "coordinates_confirmed",
              "user_requested_approach", "_original_query", "missing_mandatory",
              "clarification_needed", "recommended_approach", "coordinates",
              "property_type_missing", "pt_clarification", "others_clarification"
            ];
            const propType = ents?.property_type;
            const projectNameTypes = ["apartment", "villa", "retail", "commercial_office"];
            const fields = Object.entries(ents)
              .filter(([k, v]) => {
                if (ignoreKeys.includes(k) || k.startsWith("_")) return false;
                if (v === null || v === "" || typeof v === 'object') return false;
                if (k === "project_name" && propType && !projectNameTypes.includes(propType)) {
                  const valStr = String(v).trim().toLowerCase();
                  if (!valStr || ["subject property", "unknown", "unnamed_project", "unnamed project"].includes(valStr)) {
                    return false;
                  }
                }
                return true;
              })
              .map(([k, v]) => ({ field: k, label: k.replaceAll("_", " "), type: typeof v === "number" ? "number" : "text", default: v }));
            if (ents.coordinates && typeof ents.coordinates === 'object') {
              if (ents.coordinates.lat) fields.push({ field: "lat", label: "Latitude", type: "number", default: ents.coordinates.lat });
              if (ents.coordinates.lng) fields.push({ field: "lng", label: "Longitude", type: "number", default: ents.coordinates.lng });
            }
            const initVals = buildGateInitialValues(fields, currentSubjectObj || ents, currentMapConf);
            setClarificationFields(fields);
            setClarificationValues(initVals);
            setClarificationPrompt(event.content?.message || "Please review and confirm the extracted property details.");
            // Open gate wizard at verification step
            setGateAllFields(fields);
            setGateValues(initVals);
            setGateMode('verification');
            setGateStep(1);
            setGateActive(true);
          }

          if (event.type === "comparable_results") {
            const comps = event.content?.comparables || [];
            // Only set comparableData when there are actual results
            // (empty array means no comparables found — leave it null so the fallback card fires)
            if (comps.length > 0) {
              setComparableData(comps);
            }
            // Store subject's DB entry (if found) for listing fetch
            const subjectDbProject = event.content?.subject_db_project || null;
            if (subjectDbProject) {
              setSubjectData(prev => prev ? { ...prev, subject_db_project: subjectDbProject } : prev);
              subjectDataRef.current = subjectDataRef.current
                ? { ...subjectDataRef.current, subject_db_project: subjectDbProject }
                : subjectDataRef.current;
            }
            // Do not auto-select comparables by default to prevent accidental massive token consumption.
            // But we show them all on the map by default.
            setSelectedComps(new Set());
          }

          if (event.type === "db_comparable_status") {
            if (event.content?.status === "no_results" || event.content?.status === "error") {
              setDbNoResults(true);
              // Also stamp it onto the current last message so the flag survives the 'done' meta overwrite
              setMessages((prev) => {
                const next = [...prev];
                const lastIndex = next.length - 1;
                if (lastIndex >= 0) {
                  next[lastIndex] = { ...next[lastIndex], db_no_results: true };
                }
                return next;
              });
            }
          }

          if (event.type === "done") {
            setPipelineDone(true);
          }

          const summary = summarizeEvent(event);
          setStreamingNote(summary);

          if (["entities", "clarification_needed", "map_confirmation", "approach", "approach_choice_needed", "workflow", "comparable_results", "extraction_verification", "done", "error"].includes(event.type)) {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type.replaceAll("_", " "),
                  ...(event.type === "comparable_results"
                    ? {
                        // Store null (not []) when no comparables found so the fallback card
                        // condition `!message.comparables` remains truthy
                        comparables: (event.content?.comparables?.length > 0)
                          ? event.content.comparables
                          : null,
                      }
                    : {}),
                  // Preserve db_no_results flag across meta overwrites
                  db_no_results: next[lastIndex]?.db_no_results || false,
                  web_comparable_search_done: next[lastIndex]?.web_comparable_search_done || event.type === "done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: `Connection error: ${error.message}`,
            meta: "Error",
          };
          return next;
        });
      }
    } finally {
      setIsStreaming(false);
      setStreamingNote("");
      abortRef.current = null;
    }
  };

  const submitClarification = () => {
    const entries = Object.entries(clarificationValues).filter(([, value]) => value.trim());
    if (entries.length === 0) return;

    const response = entries
      .map(([field, value]) => `${humanizeFieldName(field)}: ${value.trim()}`)
      .join(", ");

    setClarificationPrompt("");
    setClarificationFields([]);
    setClarificationValues({});
    submitQuestion(`${currentQuestion}. ${response}`, true, response);
  };

  const submitExtractionVerification = () => {
    if (!extractionVerification) return;

    const entries = Object.entries(clarificationValues).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
    const changes = [];
    const ents = extractionVerification.entities || {};
    const entsCoords = ents.coordinates || {};

    entries.forEach(([field, value]) => {
      let isChanged = false;
      if (field === "lat" || field === "lng") {
        isChanged = String(value).trim() !== String(entsCoords[field]);
      } else {
        isChanged = String(value).trim() !== String(ents[field]);
      }

      if (isChanged) {
        changes.push(`${humanizeFieldName(field)}: ${value}`);
      }
    });

    let response = "The extracted details are confirmed to be correct.";
    if (changes.length > 0) {
      response = `The extracted details are confirmed with the following corrections: ${changes.join(", ")}. Please use these values.`;
      if (changes.some(c => c.startsWith("Lat") || c.startsWith("Lng"))) {
        response += " Also update the coordinates to the new latitude and longitude.";
      }
    }

    setExtractionVerification(null);
    setClarificationFields([]);
    setClarificationValues({});
    setClarificationPrompt("");
    submitQuestion(`${currentQuestion}. ${response}`, true, changes.length > 0 ? `Confirmed with corrections: ${changes.join(", ")}` : "Details confirmed");
  };

  const submitMapConfirmation = (confirmed) => {
    if (!mapConfirmation) return;

    if (confirmed) {
      setMapConfirmation(null);
      submitQuestion(`${currentQuestion}. The map location is confirmed to be correct.`, true, "Location confirmed");
      return;
    }

    const corrected = clarificationValues.coordinates?.trim();
    if (!corrected) return;

    setMapConfirmation(null);
    setClarificationValues((prev) => ({ ...prev, coordinates: "" }));
    submitQuestion(`${currentQuestion}. The correct coordinates are ${corrected}.`, true, `Updated coordinates to ${corrected}`);
  };

  const handleGeocodeRefresh = async () => {
    const locName = gateValues["location_name"] || "";
    const projName = gateValues["project_name"] || "";
    const country = gateValues["country"] || "India";

    if (!locName.trim()) {
      setGeocodeError("Please enter a locality name first (e.g. Sus, Pune).");
      return;
    }

    setIsGeocoding(true);
    setGeocodeError("");

    try {
      const response = await fetch(apiUrl("/geocode"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_name: locName,
          project_name: projName,
          country: country
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact geocoder API.");
      }

      const result = await response.json();
      if (result.lat && result.lng) {
        setGateValues(prev => ({
          ...prev,
          lat: String(result.lat),
          lng: String(result.lng),
          coordinates: `${result.lat}, ${result.lng}`
        }));
        setGeocodeError("");
      } else if (result.error) {
        setGeocodeError(`Error: ${result.error}. Please adjust the Location Name and try again.`);
      } else {
        setGeocodeError("Coordinates not found. Please enter them manually or check location name formatting.");
      }
    } catch (err) {
      setGeocodeError(`Failed to fetch coordinates: ${err.message}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  const submitApproachChoice = (confirmed, alternative) => {
    if (!approachChoiceNeeded) return;
    const approach = confirmed ? approachChoiceNeeded.recommended_approach : alternative;
    setApproachChoiceNeeded(null);
    setSubjectData(prev => prev ? { ...prev, recommended_approach: approach } : { recommended_approach: approach });
    submitQuestion(`${currentQuestion}. Proceed with the ${approach} approach.`, true, `Proceeding with ${approach} approach`);
  };

  const runSpecialAnalysis = async () => {
    if (isFactorialStreaming) return;

    onClear?.();
    setMessages([]);
    clearInteractiveState();

    // Create the subject and comparables data
    const subj = {
      project_name: specialSubjectName,
      lat: Number(specialSubjectLat),
      lng: Number(specialSubjectLng),
      location_name: "Mumbai",
      currency: "INR"
    };

    const comps = [
      {
        project_name: specialCompName,
        lat: Number(specialCompLat),
        lng: Number(specialCompLng),
        location: "Mumbai"
      }
    ];

    // Set state so map updates
    setSubjectData(subj);
    setComparableData(comps.map(c => ({
      ...c,
      map_search_lat: String(c.lat),
      map_search_lng: String(c.lng)
    })));
    setSelectedComps(new Set([0]));

    // Create mock cleaned data
    const mockCleaned = [];

    // Subject mock listings
    for (let i = 0; i < 5; i++) {
      mockCleaned.push({
        cleaned_match_project: subj.project_name,
        cleaned_relevant_for_valuation: true,
        cleaned_price_value: 12000000 + (i * 500000),
        final_super_builtup_area: 1000 + (i * 10),
        cleaned_area_type: "super_built_up",
        stat_flag: "ok"
      });
    }

    // Comp mock listings
    for (let i = 0; i < 5; i++) {
      mockCleaned.push({
        cleaned_match_project: comps[0].project_name,
        cleaned_relevant_for_valuation: true,
        cleaned_price_value: 10000000 + (i * 300000),
        final_super_builtup_area: 1000 + (i * 20),
        cleaned_area_type: "super_built_up",
        stat_flag: "ok"
      });
    }

    setCleanedData(mockCleaned);
    setPipelineDone(true);

    // Run factorial stream directly
    setIsFactorialStreaming(true);
    setStreamingNote("Computing factorial rate table with custom coordinates...");
    setCurrentStage("Stage 4: Factorial Rate Table (Special Analysis)");

    setMessages([
      { role: "user", content: `Run Special Factorial Analysis for Subject: ${subj.project_name} and Comp: ${comps[0].project_name}.`, meta: "Now" },
      { role: "assistant", content: "Computing rate statistics and mapping amenities based on coordinates...", meta: "Live" },
    ]);

    try {
      const response = await fetch(apiUrl("/factorial_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaned_listings: mockCleaned,
          subject: subj,
          comparables: comps,
          currency: subj.currency,
          area_unit: subj.area_unit || "sqft",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Factorial request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
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
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "factorial_start") summary = event.content?.message || "Computing factorial table...";
          else if (event.type === "factorial_results") summary = `📈 Factorial table ready — ${event.content?.table?.length || 0} projects.`;
          else if (event.type === "factorial_done") summary = "Factorial rate table generated.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "factorial_results") {
            setFactorialData(event.content);
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "factorial results",
                  factorial_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "factorial_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta?.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "factorial done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Factorial table error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsFactorialStreaming(false);
      setStreamingNote("");
    }
  };

  // ── Gate Wizard Helpers ───────────────────────────────────────────
  const IDENTITY_FIELDS = ["project_name", "coordinates", "lat", "lng", "location_name", "city_name", "city", "country"];
  const PROP_TYPE_FIELDS = ["property_type"];
  const APPROACH_FIELDS = ["approach", "recommended_approach", "valuation_approach"];

  // Fields that belong to Gate 4 (property-specific attributes, not identity/type/approach)
  const isGate4Field = (f) =>
    !IDENTITY_FIELDS.includes(f.field) &&
    !PROP_TYPE_FIELDS.includes(f.field) &&
    !APPROACH_FIELDS.includes(f.field);

  const gate1Fields = gateAllFields.filter(f => IDENTITY_FIELDS.includes(f.field));
  const gate2Fields = gateAllFields.filter(f => PROP_TYPE_FIELDS.includes(f.field));
  const gate3Fields = gateAllFields.filter(f => APPROACH_FIELDS.includes(f.field));
  const gate4Fields = gateAllFields.filter(isGate4Field);

  // Current property type from wizard values (or already-known subject data)
  const wizardPropType = (gateValues["property_type"] || subjectData?.property_type || "").toLowerCase().trim();
  const isVilla = wizardPropType === "villa";

  // Compute effective max step (skip gate 3 if not villa)
  const gateMax = isVilla ? 5 : 4;   // 1=Identity,2=PropType,3=Approach(villa only),4=Fields,5=Verify

  const advanceGate = () => {
    setGateStep(prev => {
      let next = prev + 1;
      // Skip approach gate (3) if not villa
      if (next === 3 && !isVilla) next = 4;
      return next;
    });
  };

  const closeGate = () => {
    setGateActive(false);
    setGateStep(1);
    setGateMode(null);
  };

  const gateSubmitFinal = () => {
    // Merge gateValues back into clarificationValues / extractionVerification path
    setClarificationValues(gateValues);
    closeGate();

    // Prepare values to send, ensuring coordinates are formatted and verification flags are true
    const finalVals = {
      ...gateValues,
      extraction_verified: "true",
      coordinates_confirmed: "true"
    };
    if (finalVals.lat && finalVals.lng) {
      finalVals.coordinates = `${finalVals.lat}, ${finalVals.lng}`;
    }

    if (gateMode === 'verification') {
      // Compute changed fields vs original extraction
      const ents = extractionVerification?.entities || subjectData || {};
      const changedFieldKeys = [];

      const normVal = (val) => {
        if (val === undefined || val === null) return "";
        return String(val).trim().toLowerCase();
      };

      Object.entries(gateValues).forEach(([field, value]) => {
        // Skip comparing coordinates directly since we verify separate lat/lng fields
        if (field === "coordinates") return;

        let isChanged = false;
        if (field === "lat" || field === "lng") {
          const originalVal = ents[field] || (
            typeof ents.coordinates === 'object' && ents.coordinates
              ? ents.coordinates[field]
              : (typeof ents.coordinates === 'string'
                ? ents.coordinates.split(',')[field === "lat" ? 0 : 1]?.trim()
                : undefined)
          );
          isChanged = normVal(value) !== normVal(originalVal);
        } else {
          isChanged = normVal(value) !== normVal(ents[field]);
        }

        if (isChanged) changedFieldKeys.push(field);
      });

      // ── Fast path: only area / age changed ─────────────────────────────────
      // If the valuation pipeline has already completed (factorialAnalysisData present)
      // and the only edits are to area or age fields, skip the full pipeline re-run
      // and recalculate the final value client-side.
      const isAreaAgeOnly =
        changedFieldKeys.length > 0 &&
        changedFieldKeys.every((f) => AREA_AGE_FIELDS.has(f)) &&
        factorialAnalysisData !== null;

      if (isAreaAgeOnly) {
        // Build an updated copy of subjectData with the new values merged in
        const updatedSubject = { ...subjectData };
        changedFieldKeys.forEach((f) => {
          const rawVal = gateValues[f];
          updatedSubject[f] = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
        });
        applyAreaAgeRecalculation(updatedSubject, changedFieldKeys);
        setExtractionVerification(null);
        setClarificationFields([]);
        setClarificationPrompt("");
        return; // skip full pipeline
      }

      // ── Normal path: full pipeline re-run ────────────────────────────────
      // Clear parent state since this is a re-run of profiling wizard
      onClear?.();

      const changes = changedFieldKeys.map((field) => {
        const value = gateValues[field];
        if (field === "recommended_approach" || field === "valuation_approach" || field === "approach") {
          return `Use ${value} approach`;
        }
        return `${humanizeFieldName(field)}: ${value}`;
      });

      let response = "The extracted details are confirmed to be correct. Extraction Verified: true, Coordinates Confirmed: true";
      if (changes.length > 0) {
        response = `The extracted details are confirmed with the following corrections: ${changes.join(", ")}. Please use these values. Extraction Verified: true, Coordinates Confirmed: true`;
        if (changedFieldKeys.some(f => f === "lat" || f === "lng")) {
          response += " Also update the coordinates to the new latitude and longitude.";
        }
      }
      setExtractionVerification(null);
      setClarificationFields([]);
      setClarificationPrompt("");
      submitQuestion(`${currentQuestion}. ${response}`, true, changes.length > 0 ? `Confirmed with corrections: ${changes.join(", ")}` : "Details confirmed");
    } else {
      // clarification flow
      const entries = Object.entries(finalVals).filter(([k, v]) => {
        if (k === "coordinates" && typeof v === "object") return false;
        return String(v).trim();
      });
      const response = entries.map(([f, v]) => {
        if (f === "recommended_approach" || f === "valuation_approach" || f === "approach") {
          return `Use ${v} approach`;
        }
        return `${humanizeFieldName(f)}: ${v}`;
      }).join(", ");
      setClarificationPrompt("");
      setClarificationFields([]);
      submitQuestion(`${currentQuestion}. ${response}`, true, response);
    }
  };

  // ── Stage1GateWizard render ───────────────────────────────────────
  const renderGateField = (schema) => {
    const val = gateValues[schema.field] ?? "";
    const update = (v) => {
      setGateValues(prev => {
        const next = { ...prev, [schema.field]: v };
        if (schema.field === "project_name" || schema.field === "location_name" || schema.field === "city_name" || schema.field === "country") {
          next.lat = "";
          next.lng = "";
          next.coordinates = "";
        }
        return next;
      });
    };
    const isFilled = String(val).trim() !== "";

    if (schema.type === "select" || (schema.options && schema.options.length > 0)) {
      return (
        <label key={schema.field} className="flex flex-col gap-1.5 min-w-[170px] flex-1">
          <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">
            {schema.label || humanizeFieldName(schema.field)}
            {isFilled && <span className="ml-1.5 inline-flex items-center rounded-full bg-success/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-success">Autofilled</span>}
          </span>
          <select
            value={val}
            onChange={e => update(e.target.value)}
            className="rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-warning focus:bg-warning/5"
          >
            <option value="" disabled style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Select {schema.label}...</option>
            {schema.options?.map(opt => {
              const isObj = typeof opt === 'object';
              const optValue = isObj ? opt.value : opt;
              const optLabel = isObj ? opt.label : humanizeFieldName(opt);
              return <option key={optValue} value={optValue} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>{optLabel}</option>;
            })}
          </select>
        </label>
      );
    }

    return (
      <label key={schema.field} className="flex flex-col gap-1.5 min-w-[170px] flex-1">
        <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim flex items-center gap-1.5">
          {schema.label || humanizeFieldName(schema.field)}
          {isFilled && <span className="inline-flex items-center rounded-full bg-success/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-success">Autofilled</span>}
        </span>
        <input
          type={schema.type === "number" ? "number" : "text"}
          value={val}
          onChange={e => update(e.target.value)}
          placeholder={PLACEHOLDER_MAP[schema.field] || `Enter ${schema.label || humanizeFieldName(schema.field)}`}
          className="rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-warning/5"
        />
        {schema.field === "age_years" && String(val) === "0" && (
          <span className="mt-1 px-1 text-[10px] font-medium text-warning tracking-wide">* Property marked as Under Construction</span>
        )}
      </label>
    );
  };

  const GATE_META = [
    { step: 1, label: "Property Identification", icon: "📍", desc: "Project name / coordinates, location & country" },
    { step: 2, label: "Property Type", icon: "🏠", desc: "Select the type of property being valued" },
    { step: 3, label: "Approach Selection", icon: "⚖️", desc: "Choose valuation approach (Villa only)" },
    { step: 4, label: "Property Details", icon: "📋", desc: "Area, age, floor, and other required attributes" },
    { step: 5, label: "Verify & Confirm", icon: "✅", desc: "Review all data before proceeding" },
  ].filter(g => isVilla || g.step !== 3);

  const Stage1GateWizard = gateActive ? (() => {
    const currentMeta = GATE_META.find(g => g.step === gateStep) || GATE_META[0];
    const activeType = wizardPropType;
    const currentProjName = gateValues["project_name"] || subjectData?.project_name || "";
    const isProjectNamePresent = currentProjName && !["subject property", "unknown", "unnamed_project", "unnamed project"].includes(currentProjName.toLowerCase().trim());

    // Dynamically build all fields for the active property type
    const identityFields = [
      ...(activeType !== "plot" || isProjectNamePresent ? [{ field: "project_name", label: "Project Name", type: "text" }] : []),
      { field: "location_name", label: "Location / Locality", type: "text" },
      { field: "city_name", label: "City Name", type: "text" },
      { field: "country", label: "Country", type: "text" },
    ];

    const typeFields = [
      {
        field: "property_type", label: "Property Type", type: "select", options: [
          { value: "apartment", label: "Apartment / Flat" },
          { value: "villa", label: "Villa" },
          { value: "plot", label: "Plot / Land" },
          { value: "retail", label: "Retail / Shop" },
          { value: "commercial_office", label: "Commercial Office" },
          { value: "building_land", label: "Building + Land" },
        ]
      },
      ...(activeType === "building_land" ? [
        {
          field: "building_type", label: "Building Type", type: "select", options: [
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" },
            { value: "industrial", label: "Industrial" }
          ]
        }
      ] : [])
    ];

    const approachFields = activeType === "villa" ? [
      {
        field: "recommended_approach", label: "Valuation Approach", type: "select", options: [
          { value: "market", label: "Market Approach" },
          { value: "cost", label: "Cost Approach" },
        ]
      }
    ] : [];

    let detailFields = [];
    if (activeType === "apartment") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
      ];
    } else if (activeType === "villa" || activeType === "building_land") {
      detailFields = [
        { field: "plot_area_sqft", label: "Plot Area (sqft)", type: "number" },
        { field: "builtup_area_sqft", label: "Built-up Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
      ];
    } else if (activeType === "plot") {
      detailFields = [
        { field: "plot_area_sqft", label: "Plot Area (sqft)", type: "number" },
        {
          field: "land_type", label: "Land Type", type: "select", options: [
            { value: "agricultural", label: "Agricultural" },
            { value: "non_agricultural", label: "Non Agricultural" },
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" }
          ]
        },
      ];
    } else if (activeType === "retail") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "frontage", label: "Road Frontage (ft)", type: "number" },
      ];
    } else if (activeType === "commercial_office") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        {
          field: "occupancy_status", label: "Occupancy Status", type: "select", options: [
            { value: "vacant", label: "Vacant" },
            { value: "leased", label: "Leased" },
            { value: "self_use", label: "Self Use" }
          ]
        },
      ];
    } else {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
      ];
    }

    // Build step-specific fields
    let stepFields = [];
    if (gateStep === 1) stepFields = identityFields;
    else if (gateStep === 2) stepFields = typeFields;
    else if (gateStep === 3 && activeType === "villa") stepFields = approachFields;
    else if (gateStep === 4) stepFields = detailFields;

    // Validate mandatory for current step
    const mandatoryStep = gateStep === 1
      ? (gateValues["project_name"] || activeType === "plot" || gateValues["location_name"])
      : gateStep === 2
        ? (gateValues["property_type"] && (gateValues["property_type"] !== "building_land" || gateValues["building_type"]))
        : gateStep === 3
          ? gateValues["recommended_approach"]
          : gateStep === 4
            ? detailFields.every(f => {
              const val = gateValues[f.field];
              return val !== undefined && val !== null && String(val).trim() !== "";
            })
            : true;

    const visualStep = GATE_META.findIndex(g => g.step === gateStep) + 1;
    const canAdvance = Boolean(mandatoryStep);

    return (
      <div className="mb-3 overflow-hidden rounded-2xl border border-warning/30 bg-bg-card/95 backdrop-blur-md shadow-panel animate-in slide-in-from-bottom-2 duration-300 flex flex-col min-h-0">
        {/* Header */}
        <div
          onClick={() => setGateCollapsed(!gateCollapsed)}
          className="border-b border-warning/15 bg-warning/5 px-4 py-3 cursor-pointer select-none shrink-0"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warning/20 bg-warning/10 text-base">
                {currentMeta.icon}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-warning">
                    Gate {visualStep} of {GATE_META.length} — {currentMeta.label}
                  </p>
                  {gateCollapsed ? <ChevronRight className="h-4 w-4 text-warning" /> : <ChevronDown className="h-4 w-4 text-warning" />}
                </div>
                <p className="mt-0.5 text-[10px] text-text-secondary">{currentMeta.desc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeGate();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 transition cursor-pointer"
              title="Close Wizard"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step progress pills */}
          {!gateCollapsed && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
              {GATE_META.map((g, idx) => (
                <button
                  key={g.step}
                  onClick={() => gateStep > g.step && setGateStep(g.step)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition
                    ${g.step === gateStep
                      ? "bg-warning text-bg-deep shadow"
                      : g.step < gateStep
                        ? "bg-success/20 text-success border border-success/30 cursor-pointer hover:bg-success/30"
                        : "bg-border/20 text-text-dim cursor-default"
                    }`}
                >
                  {g.step < gateStep ? "✓" : (idx + 1)} {g.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Gate body */}
        {!gateCollapsed && (
          <div className="flex flex-col min-h-0">
            {/* Scrollable Content Container */}
            <div className="overflow-y-auto custom-scrollbar p-4 space-y-4 max-h-[30vh] min-h-0">
              {/* Show prompt/question from the agent if available */}
              {gateStep === 3 && approachChoiceNeeded?.question && (
                <div className="rounded-xl bg-warning/5 border border-warning/15 px-3.5 py-2.5 text-xs text-text-secondary leading-relaxed animate-in fade-in duration-200">
                  <span className="font-semibold text-warning">Agent Recommendation:</span> {approachChoiceNeeded.question}
                </div>
              )}
              {gateStep !== 3 && clarificationPrompt && (
                <div className="rounded-xl bg-warning/5 border border-warning/15 px-3.5 py-2.5 text-xs text-text-secondary leading-relaxed animate-in fade-in duration-200">
                  <span className="font-semibold text-warning">Clarification Requested:</span> {clarificationPrompt}
                </div>
              )}

              {/* Gate 5 = full review */}
              {gateStep === 5 ? (
                <div className="space-y-4">
                  <p className="text-xs text-text-secondary">Review all extracted details. Edit any field before confirming.</p>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const standardFields = [...identityFields, ...typeFields, ...approachFields, ...detailFields];
                      const extraFields = gateAllFields.filter(gf => !standardFields.some(sf => sf.field === gf.field));
                      const finalFields = [...standardFields, ...extraFields].map(f => {
                        if (f.field === "lat" || f.field === "lng") {
                          return { ...f, type: "text" };
                        }
                        return f;
                      });
                      if (!finalFields.some(f => f.field === "lat")) {
                        finalFields.push({ field: "lat", label: "Latitude", type: "text" });
                      }
                      if (!finalFields.some(f => f.field === "lng")) {
                        finalFields.push({ field: "lng", label: "Longitude", type: "text" });
                      }
                      return finalFields.map(f => renderGateField(f));
                    })()}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {stepFields.map(f => renderGateField(f))}
                    {stepFields.length === 0 && (
                      <p className="text-xs text-text-dim italic">No additional fields required for this step.</p>
                    )}
                  </div>

                  {/* Gate 1 Coordinate Verification */}
                  {gateStep === 1 && (
                    <div className="mt-4 border-t border-border/40 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-warning flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> Coordinate Verification
                        </span>
                        <div className="flex gap-3 items-center">
                          {mapConfirmation && (
                            <button
                              type="button"
                              onClick={() => {
                                const latVal = mapConfirmation.lat || "";
                                const lngVal = mapConfirmation.lng || "";
                                setGateValues(prev => ({
                                  ...prev,
                                  lat: latVal,
                                  lng: lngVal,
                                  coordinates: latVal && lngVal ? `${latVal}, ${lngVal}` : prev.coordinates
                                }));
                              }}
                              className="text-[9px] font-black uppercase tracking-wider text-accent hover:underline cursor-pointer"
                            >
                              Pull from Map Confirmation
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isGeocoding}
                            onClick={handleGeocodeRefresh}
                            className="text-[9px] font-black uppercase tracking-wider text-warning hover:underline cursor-pointer disabled:opacity-50"
                          >
                            {isGeocoding ? "Refreshing..." : "🔄 Refresh from Location"}
                          </button>
                        </div>
                      </div>

                      {/* Geocode Tip Remark & Errors */}
                      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 space-y-1.5">
                        <p className="text-[10px] text-text-dim leading-relaxed">
                          <span className="font-semibold text-warning">💡 Tip:</span> Please add the exact locality and city name in the location field (e.g. <span className="text-warning font-mono">&quot;Sus, Pune&quot;</span>) then click <span className="text-warning font-semibold">🔄 Refresh from Location</span> to extract coordinates automatically. If auto-detection is not satisfactory or fails, please type the correct coordinates manually.
                        </p>
                        {geocodeError && (
                          <p className="text-[9px] font-bold text-danger leading-relaxed animate-in fade-in duration-200">
                            ⚠️ {geocodeError}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                          <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">Latitude</span>
                          <input
                            type="text"
                            value={gateValues["lat"] ?? ""}
                            onChange={e => {
                              const val = e.target.value;
                              setGateValues(prev => ({
                                ...prev,
                                lat: val,
                                coordinates: val && prev.lng ? `${val}, ${prev.lng}` : prev.coordinates
                              }));
                            }}
                            placeholder="e.g. 19.0760"
                            className="rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-warning focus:bg-warning/5"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                          <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">Longitude</span>
                          <input
                            type="text"
                            value={gateValues["lng"] ?? ""}
                            onChange={e => {
                              const val = e.target.value;
                              setGateValues(prev => ({
                                ...prev,
                                lng: val,
                                coordinates: prev.lat && val ? `${prev.lat}, ${val}` : prev.coordinates
                              }));
                            }}
                            placeholder="e.g. 72.8777"
                            className="rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-warning focus:bg-warning/5"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky footer buttons */}
            <div className="border-t border-border/40 bg-bg-card/90 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={closeGate}
                className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/20"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                {gateStep === 5 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setGateStep(4)}
                      className="rounded-xl border border-border bg-bg-input px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-warning hover:text-warning"
                    >← Back</button>
                    <button
                      type="button"
                      onClick={gateSubmitFinal}
                      className="rounded-xl bg-success px-5 py-2.5 text-sm font-bold text-bg-deep transition hover:brightness-110"
                    >Confirm & Proceed →</button>
                  </>
                ) : (
                  <>
                    {gateStep > 1 ? (
                      <button
                        type="button"
                        onClick={() => setGateStep(prev => {
                          let back = prev - 1;
                          if (back === 3 && !isVilla) back = 2;
                          return back;
                        })}
                        className="rounded-xl border border-border bg-bg-input px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-warning hover:text-warning"
                      >← Back</button>
                    ) : null}

                    {gateStep < (isVilla ? 4 : 4) ? (
                      <button
                        type="button"
                        disabled={!canAdvance}
                        onClick={advanceGate}
                        className="rounded-xl bg-warning px-5 py-2.5 text-sm font-bold text-bg-deep transition hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
                      >Next →</button>
                    ) : (
                      // Last data-entry gate → go to review (gate 5)
                      <button
                        type="button"
                        disabled={!canAdvance}
                        onClick={() => setGateStep(5)}
                        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-bg-deep transition hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
                      >Review & Confirm →</button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  })() : null;

  const anyStreaming = isStreaming || isListingStreaming || isCleaningStreaming || isFactorialStreaming || isFactorialAnalysisStreaming;

  return (
    <section className="panel-shell border border-border/80 shadow-lg bg-bg-card/50 backdrop-blur-sm">
      <div className="panel-header-shell border-b border-border/60">
        <div className="panel-title-shell">
          <div className="icon-chip bg-accent/10 border border-accent/20 p-2 rounded-xl">
            <MessageSquareCode className="h-5 w-5 text-accent" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary m-0">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          {subjectData && !anyStreaming && (
            <button
              type="button"
              onClick={handleEditPropertyDetails}
              className="flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-warning hover:bg-warning/20 transition cursor-pointer"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Edit Details
            </button>
          )}
          <div className="panel-pill bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{anyStreaming ? "LIVE" : "READY"}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-6">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border/85 bg-bg-card text-3xl shadow-panel animate-pulse bg-accent/5 border-accent/25">
              <Bot className="h-8 w-8 text-accent" />
            </div>
            <h3 className="font-display text-base font-bold uppercase tracking-[0.14em] text-text-primary">
              Start A Valuation Conversation
            </h3>
            <p className="mt-2.5 max-w-sm text-sm text-text-secondary leading-relaxed">
              Ask about a property and the pipeline will stream entity extraction updates into the workflow view.
            </p>
            <div className="mt-6 grid gap-3 w-full max-w-lg">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitQuestion(prompt)}
                  className="rounded-2xl border border-border bg-bg-card px-4 py-3.5 text-left text-xs text-text-secondary transition hover:-translate-y-0.5 hover:border-border-glow hover:bg-bg-input hover:text-text-primary font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>


          </div>
        ) : (
          <div className="space-y-4">
            {revertNotice && (
              <div className="flex items-center gap-2.5 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-xs font-semibold text-warning shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <span>{revertNotice}</span>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`animate-slide-in ${message.role === "user" ? "ml-8" : "mr-8"}`}
              >
                <p className="mb-1.5 px-1 text-[10px] uppercase tracking-[0.22em] text-text-dim">
                  {message.role === "user" ? "You" : `Assistant · ${message.meta}`}
                </p>
                <div
                  className={
                    message.role === "user"
                      ? "rounded-[18px] rounded-br-md bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] px-4 py-3 text-sm text-white shadow-panel"
                      : "rounded-[18px] rounded-bl-md border border-border bg-bg-card px-4 py-3 text-sm text-text-primary shadow-panel"
                  }
                >
                  {message.content}
                  {message.comparables && (
                    <div className="space-y-3">
                      <ComparableTable
                        comparables={message.comparables}
                        selectedComps={selectedComps}
                        onToggle={handleCompToggle}
                        selectable={pipelineDone && !isListingStreaming && !listingData}
                      />
                      {listingData && (
                        <div className="flex items-center justify-between border-t border-border/20 pt-2.5">
                          <span className="text-[10px] text-text-dim font-medium">Comparable selection is locked.</span>
                          <button
                            type="button"
                            onClick={handleBackToComparables}
                            className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-warning hover:bg-warning/20 transition cursor-pointer"
                          >
                            Modify Selection
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* DB found nothing but web results exist - amber warning */}
                  {message.db_no_results && message.comparables && (
                    <div className="mt-2.5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 animate-in slide-in-from-bottom-2 duration-300">
                      <Database className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">No Project Found in Transaction Database</p>
                        <p className="text-[10px] text-text-dim mt-1 leading-relaxed">The internal database returned no matching projects for this location and property type. Results above are from web search only.</p>
                      </div>
                    </div>
                  )}
                  {/* DB found nothing AND no web comparables either — interactive fallback prompt */}
                  {message.db_no_results && message.web_comparable_search_done && !message.comparables && (
                    <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                      {/* Warning header */}
                      <div className="flex items-start gap-3">
                        <Database className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-red-400">No Comparable Projects Found</p>
                          <p className="text-[10px] text-text-dim mt-1 leading-relaxed">
                            No matching projects were found in the Transaction Database or via web search for this location and property type.
                          </p>
                        </div>
                      </div>

                      {/* Offer options only while listing hasn't started */}
                      {!listingData && !cleanedData && !isListingStreaming && (
                        <>
                          <p className="text-sm text-text-secondary leading-relaxed">
                            Would you like to continue the valuation using only the{" "}
                            <span className="font-semibold text-accent-light">subject property's own listings</span>?{" "}
                            The system will derive a market rate from available signals for the subject alone
                            (Subject-Only Mode).
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={submitSubjectOnlyListingFetch}
                              disabled={isListingStreaming}
                              className="rounded-xl bg-accent/10 border border-accent/30 text-accent px-4 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-accent/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Yes, Continue Without Comparables →
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                clearInteractiveState();
                                setMessages([]);
                              }}
                              className="rounded-xl border border-border bg-bg-input text-text-dim px-4 py-2 text-[11px] font-bold uppercase tracking-wider hover:text-text-primary hover:border-border/80 transition"
                            >
                              No, Start a New Query
                            </button>
                          </div>
                        </>
                      )}

                      {/* After the user confirmed, show a soft status note */}
                      {(listingData || cleanedData || isListingStreaming) && (
                        <p className="text-[10px] text-text-dim italic pt-1">
                          Proceeding in Subject-Only Mode — valuation is based exclusively on the subject property's listings.
                        </p>
                      )}
                    </div>
                  )}
                  {(message.listings || message.db_transactions) && (
                    <ListingTable
                      listings={message.listings || []}
                      dbTransactions={message.db_transactions || []}
                    />
                  )}
                  {message.cleaned_listings && <CleanedTable listings={message.cleaned_listings} reviewListings={message.review_listings || []} droppedListings={message.dropped_listings || []} onRecalculate={handleRecalculatePlotRates} subjectPropertyType={subjectData?.property_type} valuationApproach={subjectData?.recommended_approach} />}
                  {message.factorial_data && (
                    <div className="flex flex-col gap-3">
                      <FactorialTable
                        data={message.factorial_data}
                        onCalculateRate={() => handleCalculateRate(message.factorial_data)}
                        isCalculatingRate={isFactorialAnalysisStreaming}
                        canCalculateRate={Boolean(subjectData && (selectedComparablePayload().length > 0 || (message.factorial_data?.table || []).some(r => r.is_subject && r.avg_rate > 0)))}
                      />
                    </div>
                  )}
                  {message.factorial_analysis_data && (
                    <FactoringResultCard
                      data={message.factorial_analysis_data}
                      area_unit={subjectData?.area_unit || "sqft"}
                      subjectData={subjectData}
                      onUpdateData={handleUpdateFactoringData}
                    />
                  )}
                  {message.cost_calculation_data && <CostResultCard data={message.cost_calculation_data} subjectData={subjectData} />}

                  {message.factorial_analysis_data && subjectData?.recommended_approach === "cost" && (
                    <>
                      {costCalculationData && (
                        <div className="mt-8 rounded-2xl border border-success/20 bg-[#0f172a]/95 p-5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20 text-success border border-success/30 text-sm">
                            <CheckCircle className="h-4.5 w-4.5 text-success" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-white">Cost Approach Calculated</p>
                            <p className="text-[9px] text-text-dim mt-0.5">Update the cost parameters below and recalculate if needed.</p>
                          </div>
                        </div>
                      )}
                      {costInputsSchema && (
                        <CostInputsForm
                          schema={costInputsSchema}
                          values={costInputsValues}
                          onChange={(field, val) => setCostInputsValues(prev => ({ ...prev, [field]: val }))}
                          onSubmit={handleCostCalculate}
                          isCalculating={isCostCalculating}
                          subjectData={subjectData}
                          submitLabel={costCalculationData ? "Recalculate Cost Approach" : "Execute Cost Approach Calculation"}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {streamingNote ? (
              <div className="mr-8 animate-slide-in">
                <p className="mb-1 px-1 text-[10px] uppercase tracking-[0.22em] text-text-dim">
                  Assistant · Streaming
                </p>
                <div className="rounded-[18px] rounded-bl-md border border-border bg-bg-card px-4 py-3 text-sm text-text-secondary shadow-panel">
                  {streamingNote}
                </div>
              </div>
            ) : null}

            {/* ── Proceed to Listing Fetch CTA ────────────────── */}
            {pipelineDone && comparableData && comparableData.length > 0 && !listingData && dbTransactions.length === 0 && !cleanedData && !factorialData && !isListingStreaming && (
              <div className="mb-3 overflow-hidden rounded-2xl border border-accent-light/30 bg-bg-card/95 shadow-panel">
                <div
                  onClick={() => setCtaListingCollapsed(!ctaListingCollapsed)}
                  className="border-b border-accent-light/15 bg-accent-light/5 px-4 py-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-light/20 bg-accent-light/10 text-base font-semibold text-accent-light">
                      <FileSearch className="h-5 w-5 text-accent-light" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-light">
                          Step 2 — Fetch Listings
                        </p>
                        {ctaListingCollapsed ? <ChevronRight className="h-4 w-4 text-accent-light" /> : <ChevronDown className="h-4 w-4 text-accent-light" />}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {selectedComps.size > 0
                          ? (() => {
                            const selected = Array.from(selectedComps).map(i => comparableData[i]);
                            const getCompId = c => String(c.project_id || c.id || c.project_name || "").trim();
                            const skipCount = selected.filter(c => fetchedCompIds.has(getCompId(c))).length;
                            const newCount = selected.length - skipCount;
                            if (skipCount > 0) {
                              return `${selected.length} comparable(s) selected — ${newCount} new (will fetch) · ${skipCount} already fetched (will skip).`;
                            }
                            return `${selected.length} of ${comparableData.length} comparable(s) selected. Click below to fetch real sale/rent listings.`;
                          })()
                          : "Select at least one comparable from the table above to proceed."}
                      </p>
                    </div>
                  </div>
                </div>
                {!ctaListingCollapsed && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 animate-in fade-in duration-200">
                    <p className="text-xs text-text-dim">
                      {fetchedCompIds.size > 0
                        ? "Only new comparables will be fetched. Previously fetched listings are preserved and merged."
                        : "The listing pipeline will search for real listings for the subject property + your selected comparables."}
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                      {backupValuationState && (
                        <button
                          type="button"
                          onClick={handleCancelModification}
                          className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm font-semibold text-warning transition hover:bg-warning/20 cursor-pointer animate-in fade-in duration-300"
                        >
                          Cancel Modification
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={submitListingFetch}
                        disabled={selectedComps.size === 0}
                        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg-deep transition hover:scale-[1.02] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      >
                        {fetchedCompIds.size > 0 ? "Fetch New Comparables →" : "Proceed to Next Step →"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Proceed to Data Cleaning CTA ────────────────── */}
            {(listingData !== null || dbTransactions.length > 0) && !cleanedData && !isCleaningStreaming && !isListingStreaming && (listingData?.length > 0 || dbTransactions.length > 0) && (
              <div className="mb-3 overflow-hidden rounded-2xl border border-[#fb923c]/30 bg-bg-card/95 shadow-panel">
                <div
                  onClick={() => setCtaCleanCollapsed(!ctaCleanCollapsed)}
                  className="border-b border-[#fb923c]/15 bg-[#fb923c]/5 px-4 py-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#fb923c]/20 bg-[#fb923c]/10 text-base font-semibold text-[#fb923c]">
                      <Sparkles className="h-5 w-5 text-[#fb923c]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fb923c]">
                          Step 3 — Clean Raw Listings
                        </p>
                        {ctaCleanCollapsed ? <ChevronRight className="h-4 w-4 text-[#fb923c]" /> : <ChevronDown className="h-4 w-4 text-[#fb923c]" />}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {(listingData || []).length} web listing(s) and {dbTransactions?.length || 0} DB transaction(s) found. Proceed to intelligently clean, deduct duplicates, and normalize prices/areas.
                      </p>
                    </div>
                  </div>
                </div>
                {!ctaCleanCollapsed && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 animate-in fade-in duration-200">
                    <p className="text-xs text-text-dim">
                      The smart cleaning engine will apply area-type multipliers and statistical outlier flagging.
                    </p>
                    <button
                      type="button"
                      onClick={submitCleaning}
                      className="shrink-0 rounded-xl bg-[#fb923c] px-5 py-2.5 text-sm font-semibold text-bg-deep transition hover:scale-[1.02] hover:brightness-110 cursor-pointer"
                    >
                      Start Data Cleaning →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Proceed to Factorial Table CTA ────────────────── */}
            {cleanedData && cleanedData.length > 0 && (!factorialData || needsFactorialRegeneration) && !isFactorialStreaming && (
              <div className="mb-3 overflow-hidden rounded-2xl border border-[#a78bfa]/30 bg-bg-card/95 shadow-panel">
                <div
                  onClick={() => setCtaFactorialCollapsed(!ctaFactorialCollapsed)}
                  className="border-b border-[#a78bfa]/15 bg-[#a78bfa]/5 px-4 py-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#a78bfa]/20 bg-[#a78bfa]/10 text-base font-semibold text-[#a78bfa]">
                      <TrendingUp className="h-5 w-5 text-[#a78bfa]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a78bfa]">
                          Step 4 — Generate Factorial Table
                        </p>
                        {ctaFactorialCollapsed ? <ChevronRight className="h-4 w-4 text-[#a78bfa]" /> : <ChevronDown className="h-4 w-4 text-[#a78bfa]" />}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {needsFactorialRegeneration
                          ? "Plot-rate inputs changed. Regenerate the factorial summary table before calculating the final rate."
                          : `${cleanedData.length} cleaned listings ready. Generate the factorial summary table (Avg/Median/P90) per project.`}
                      </p>
                    </div>
                  </div>
                </div>
                {!ctaFactorialCollapsed && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 animate-in fade-in duration-200">
                    <p className="text-xs text-text-dim">
                      This will group data by project and calculate key rate statistics for valuation.
                    </p>
                    <button
                      type="button"
                      onClick={submitFactorial}
                      className="shrink-0 rounded-xl bg-[#a78bfa] px-5 py-2.5 text-sm font-semibold text-bg-deep transition hover:scale-[1.02] hover:brightness-110 cursor-pointer"
                    >
                      Generate Factorial Table →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Stage 1 Gate Wizard (replaces flat clarification/verification panels) */}
            {Stage1GateWizard}

            {/* ── Map Confirmation (standalone — not part of wizard) */}
            {mapConfirmation && !gateActive && (
              <div className="mb-3 overflow-hidden rounded-2xl border border-warning/30 bg-bg-card/95 backdrop-blur-md shadow-panel flex flex-col min-h-0">
                <div
                  onClick={() => setMapCollapsed(!mapCollapsed)}
                  className="border-b border-warning/15 bg-warning/5 px-4 py-3 cursor-pointer select-none shrink-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warning/20 bg-warning/10 text-base font-semibold text-warning">
                        <MapPin className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-warning">Map Confirmation</p>
                          {mapCollapsed ? <ChevronRight className="h-4 w-4 text-warning" /> : <ChevronDown className="h-4 w-4 text-warning" />}
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">{mapConfirmation.message}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMapConfirmation(null);
                      }}
                      className="text-sm text-text-dim transition hover:text-danger cursor-pointer font-bold px-1.5"
                    >×</button>
                  </div>
                </div>
                {!mapCollapsed && (
                  <div className="overflow-y-auto custom-scrollbar max-h-[25vh] p-4 flex flex-col gap-4 animate-in fade-in duration-200 min-h-0">
                    <div className="flex flex-wrap items-end gap-3">
                      <button
                        type="button"
                        onClick={() => submitMapConfirmation(true)}
                        className="rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-110 shrink-0"
                      >Location Is Correct</button>
                      <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
                        <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">Correct Lat, Lng</span>
                        <input
                          type="text"
                          value={clarificationValues.coordinates || ""}
                          onChange={(e) => setClarificationValues(prev => ({ ...prev, coordinates: e.target.value }))}
                          placeholder={PLACEHOLDER_MAP.coordinates}
                          className="rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-warning/5"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => submitMapConfirmation(false)}
                        className="rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-105 shrink-0"
                      >Apply Fix</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Approach Choice (standalone fallback if wizard not active) */}
            {approachChoiceNeeded && !gateActive && (
              <div className="mb-3 overflow-hidden rounded-2xl border border-warning/30 bg-bg-card/95 backdrop-blur-md shadow-panel flex flex-col min-h-0">
                <div
                  onClick={() => setApproachCollapsed(!approachCollapsed)}
                  className="border-b border-warning/15 bg-warning/5 px-4 py-3 cursor-pointer select-none shrink-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warning/20 bg-warning/10">
                      <SlidersHorizontal className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-warning">Approach Selection</p>
                        {approachCollapsed ? <ChevronRight className="h-4 w-4 text-warning" /> : <ChevronDown className="h-4 w-4 text-warning" />}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">{approachChoiceNeeded.question}</p>
                    </div>
                  </div>
                </div>
                {!approachCollapsed && (
                  <div className="overflow-y-auto custom-scrollbar max-h-[25vh] p-4 flex flex-wrap items-end gap-3 animate-in fade-in duration-200 min-h-0">
                    <button
                      type="button"
                      onClick={() => submitApproachChoice(true)}
                      className="rounded-xl border border-warning bg-warning/10 px-4 py-2.5 text-sm font-semibold text-warning transition hover:bg-warning/20 shrink-0"
                    >Proceed with {humanizeFieldName(approachChoiceNeeded.recommended_approach)} Approach</button>
                    <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                      <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-dim">Or Override Approach</span>
                      <select
                        value={clarificationValues.override_approach || ""}
                        onChange={(e) => setClarificationValues({ ...clarificationValues, override_approach: e.target.value })}
                        className="rounded-xl border border-border bg-bg-input px-3 py-2 text-sm text-text-primary outline-none transition focus:border-warning focus:bg-warning/5"
                      >
                        <option value="" disabled style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Select approach...</option>
                        <option value="market" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Market Approach</option>
                        <option value="cost" disabled={subjectData?.property_type !== "villa" && subjectData?.property_type !== "building_land"} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                          Cost Approach{(subjectData?.property_type !== "villa" && subjectData?.property_type !== "building_land") ? " (Villa / Building + Land Only)" : ""}
                        </option>
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={!clarificationValues.override_approach}
                      onClick={() => submitApproachChoice(false, clarificationValues.override_approach)}
                      className="rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-105 disabled:opacity-50 shrink-0"
                    >Apply Override</button>
                  </div>
                )}
              </div>
            )}

            {/* ── Token Breakdown UI ────────────────── */}
            {showTokenBreakdown && (
              <div className="mb-4 overflow-y-auto custom-scrollbar max-h-[30vh] rounded-2xl border border-border bg-bg-card p-4 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 shadow-2xl">
                <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-primary">Token Intelligence</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">Estimated Cost</p>
                    <p className="text-sm font-mono font-bold text-success">${calculatedCostUsd.toFixed(4)}</p>
                    {tokenStats.last_stage_tokens && (
                      <p className="text-[8px] text-accent-light font-bold mt-0.5">
                        +{tokenStats.last_stage_tokens.toLocaleString()} ({tokenStats.last_stage_name})
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim opacity-70">Model Breakdown</p>
                    {Object.entries(tokenStats.model_breakdown).filter(([model, usage]) => (usage.total || 0) > 0 && model.toLowerCase() !== "unknown").length === 0 ? (
                      <p className="text-[11px] text-text-dim italic">No model data yet...</p>
                    ) : (
                      Object.entries(tokenStats.model_breakdown)
                        .filter(([model, usage]) => (usage.total || 0) > 0 && model.toLowerCase() !== "unknown")
                        .map(([model, usage]) => (
                          <div key={model} className="rounded-xl bg-bg-input p-2.5 border border-border/40">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-accent-light">{model}</span>
                              <span className="text-[10px] font-mono text-text-primary">{usage.total?.toLocaleString()}</span>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <div className="h-1 w-full bg-border/20 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent"
                                    style={{ width: `${(usage.prompt / (usage.total || 1)) * 100}%` }}
                                  />
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[8px] uppercase text-text-dim">Input</span>
                                  <span className="text-[8px] font-mono text-text-dim">{usage.prompt?.toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="h-1 w-full bg-border/20 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent-purple"
                                    style={{ width: `${(usage.completion / (usage.total || 1)) * 100}%` }}
                                  />
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[8px] uppercase text-text-dim">Output</span>
                                  <span className="text-[8px] font-mono text-text-dim">{usage.completion?.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim opacity-70">Tool Intelligence</p>
                    {Object.entries(tokenStats.tool_breakdown).length === 0 ? (
                      <div className="rounded-xl bg-bg-input p-3 text-center border border-dashed border-border/40">
                        <p className="text-[10px] text-text-dim">No tools called in this run.</p>
                      </div>
                    ) : (
                      Object.entries(tokenStats.tool_breakdown).map(([tool, data]) => (
                        <div key={tool} className="rounded-xl border border-border-glow bg-accent-glow p-2.5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <SlidersHorizontal className="h-4 w-4 text-accent" />
                              <div>
                                <p className="text-[10px] font-bold text-text-primary">{tool}</p>
                                <p className="text-[9px] text-text-dim">{data.calls} {data.calls === 1 ? 'Call' : 'Calls'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-mono font-bold text-accent-light">${data.cost_usd.toFixed(3)}</p>
                              <p className="text-[8px] uppercase tracking-tighter text-text-dim">Direct Cost</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="mt-4 rounded-xl bg-bg-input p-3 border border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">Efficiency</span>
                        <span className="text-[10px] font-bold text-success">Optimal</span>
                      </div>
                      <div className="mt-2 text-[10px] text-text-secondary leading-relaxed">
                        Agent 1 & 2 are using <span className="text-accent-light">gpt-4o-mini</span> to minimize costs, while Stage 3 utilizes <span className="text-warning">web_search</span> for real-time market accuracy.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-bg-card px-4 py-2.5 backdrop-blur shrink-0">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-text-dim">
          <span className="truncate pr-4">{currentStage}</span>
          <button
            type="button"
            onClick={() => setShowTokenBreakdown(!showTokenBreakdown)}
            className={`flex items-center gap-1.5 transition hover:text-accent-light ${showTokenBreakdown ? "text-accent-light" : ""}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)] animate-pulse" />
            {calculatedTotalTokens > 0 ? `${calculatedTotalTokens.toLocaleString()} tokens` : "No usage yet"}
            <span className="ml-1 opacity-50">{showTokenBreakdown ? "▲" : "▼"}</span>
          </button>
        </div>

        {messages.length === 0 && (
          <div className="relative mt-2.5">
            <div className="absolute inset-[-1px] rounded-2xl bg-[linear-gradient(90deg,var(--accent),var(--accent-purple),var(--accent))] bg-[length:200%_100%] opacity-30 blur-sm animate-flow-bg" />
            <div className="relative flex items-end gap-3 rounded-2xl border border-border bg-bg-dark px-4 py-3">
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitQuestion(input);
                  }
                }}
                disabled={anyStreaming}
                placeholder="Describe the property to value..."
                className="max-h-28 min-h-[28px] flex-1 resize-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-dim"
              />
              <button
                type="button"
                onClick={() => (anyStreaming ? abortRef.current?.abort?.() : submitQuestion(input))}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-bg-deep transition hover:scale-[1.03] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!anyStreaming && !input.trim()}
              >
                {anyStreaming ? "■" : "➜"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
