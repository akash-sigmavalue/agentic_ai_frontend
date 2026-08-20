export const QUICK_PROMPTS = [
  "Value a 2BHK flat in Hiranandani Gardens, Powai, Mumbai. 1100 sqft, 5 years old, floor 15/25, West facing",
  "what is the value of a 500 sqft retail shop on the ground floor of MGF Metropolitan Mall, MG Road, Gurgaon? Currently self-used. Market Approach.. Frontage: 18",
  "What is the market value of a 3BHK flat in Godrej Infinity, Keshav Nagar, Pune, 1100 sqft, floor 12/20, East facing",
];

export const QUICK_ESTIMATE_DEFAULTS = {
  mode: "research",
  property_type: "apartment",
  recommended_approach: "market",
  project_name: "",
  location_name: "",
  city_name: "",
  country: "India",
  salable_area_sqft: "",
  builtup_area_sqft: "",
  plot_area_sqft: "",
  age_of_property: "",
  configuration: "",
  floor: "",
  total_floors: "",
  facing: "",
  quality: "",
  building_type: "residential",
  land_type: "residential",
  frontage: "",
  occupancy_status: "vacant",
  clear_height: "",
  water_availability: "good",
  construction_rate_per_sqft: "",
  total_life_of_building: "",
  currency: "INR",
};

export const QUICK_FIELD_CONFIG = {
  property_type: { label: "Property Type", type: "select", options: ["apartment", "villa", "plot", "commercial_office", "retail", "building_land"] },
  project_name: { label: "Project", type: "text", placeholder: "Project or society name" },
  location_name: { label: "Location", type: "text", placeholder: "Locality or micro-market" },
  "sub-locality": { label: "Sub-locality", type: "text", placeholder: "Fetched micro-market pockets" },
  city_name: { label: "City", type: "text", placeholder: "City" },
  country: { label: "Country", type: "text", placeholder: "Country" },
  salable_area_sqft: { label: "Saleable Area", type: "number", placeholder: "sqft" },
  builtup_area_sqft: { label: "Built-up Area", type: "number", placeholder: "sqft" },
  plot_area_sqft: { label: "Plot Area", type: "number", placeholder: "sqft" },
  age_of_property: { label: "Age", type: "number", placeholder: "years" },
  configuration: { label: "Config", type: "text", placeholder: "2BHK, 3BHK, etc." },
  floor: { label: "Floor", type: "number", placeholder: "Floor" },
  total_floors: { label: "Total Floors", type: "number", placeholder: "Total" },
  facing: { label: "Facing", type: "text", placeholder: "East, West..." },
  quality: { label: "Quality", type: "select", options: ["standard", "premium", "luxury"] },
  building_type: { label: "Building Type", type: "select", options: ["residential", "commercial", "industrial"] },
  land_type: { label: "Land Type", type: "select", options: ["agricultural", "non_agricultural", "residential", "commercial"] },
  frontage: { label: "Frontage", type: "number", placeholder: "ft" },
  occupancy_status: { label: "Occupancy", type: "select", options: ["vacant", "leased", "self_use"] },
  clear_height: { label: "Clear Height", type: "number", placeholder: "ft" },
  water_availability: { label: "Water", type: "select", options: ["good", "moderate", "poor"] },
  construction_rate_per_sqft: { label: "Construction Rate", type: "number", placeholder: "per sqft" },
  total_life_of_building: { label: "Building Life", type: "number", placeholder: "years" },
};

export const QUICK_REQUIRED_FIELDS = {
  apartment: ["location_name", "country", "salable_area_sqft", "age_of_property"],
  villa: ["location_name", "country", "plot_area_sqft", "builtup_area_sqft", "age_of_property"],
  plot: ["location_name", "country", "plot_area_sqft", "land_type"],
  retail: ["location_name", "country", "salable_area_sqft", "frontage"],
  commercial_office: ["location_name", "country", "salable_area_sqft", "occupancy_status"],
  industrial: ["location_name", "country", "plot_area_sqft", "builtup_area_sqft", "clear_height"],
  agricultural: ["location_name", "country", "plot_area_sqft", "water_availability"],
  building_land: ["location_name", "country", "building_type", "plot_area_sqft", "builtup_area_sqft", "age_of_property"],
};

export const QUICK_OPTIONAL_FIELDS = {
  apartment: ["project_name", "city_name", "configuration", "floor", "total_floors", "facing", "quality"],
  villa: ["project_name", "city_name", "configuration", "quality", "construction_rate_per_sqft", "total_life_of_building"],
  plot: ["project_name", "city_name", "frontage"],
  retail: ["project_name", "city_name", "floor", "total_floors", "occupancy_status"],
  commercial_office: ["project_name", "city_name", "floor", "total_floors", "frontage"],
  industrial: ["project_name", "city_name", "occupancy_status", "frontage"],
  agricultural: ["project_name", "city_name"],
  building_land: ["project_name", "city_name", "quality", "construction_rate_per_sqft", "total_life_of_building"],
};

export const PLACEHOLDER_MAP = {
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
  subject_floor: "e.g. 15",
  total_floors: "e.g. 25",
  facing: "e.g. East, West, North-East",
};

export const getCurrencySymbol = (currencyCode) => {
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

export const humanizeFieldName = (field) => {
  return field.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
};

export const getSubjectSublocalityList = (data) => {
  if (!data) return [];
  const values = [];
  const pushValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    if (typeof value === "object") {
      if (value.name) pushValue(value.name);
      return;
    }
    const text = String(value).trim();
    if (text) values.push(text);
  };

  pushValue(data["sub-locality"]);
  pushValue(data.sub_locality);
  pushValue(data.sub_localities);
  pushValue(data.nearby_sublocalities);
  pushValue(data.location_details?.sublocality);
  pushValue(data.location_details?.nearby_sublocalities);

  const seen = new Set();
  return values.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getSublocalityItems = (data) => {
  if (!data) return [];
  const values = [];
  const pushValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    if (typeof value === "object") {
      if (value.name) pushValue(value.name);
      return;
    }
    const text = String(value).trim();
    if (text) values.push(text);
  };

  pushValue(data["sub-locality"]);
  pushValue(data.sub_locality);
  pushValue(data.sub_localities);
  pushValue(data.nearby_sublocalities);
  pushValue(data.location_details?.sublocality);
  pushValue(data.location_details?.nearby_sublocalities);

  const seen = new Set();
  return values.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const formatSublocalities = (data) => {
  const names = getSubjectSublocalityList(data);
  return names.length > 0 ? names.join(", ") : "";
};

export const getRowKey = (lst, rowIndex = "") => {
  if (!lst) return "";
  const explicitId = lst.id || lst.listing_id || lst.transaction_id || lst.source_id || lst.url || lst.listing_url || "";
  const project = lst.cleaned_match_project || lst.project_name || "";
  const date = lst.transaction_date || lst.posted_date_raw || "";
  const area = lst.final_super_builtup_area || lst.cleaned_area_sqft || lst.area_sqft || "";
  const price = lst.cleaned_price_value || lst.price_value || "";
  return `${explicitId}_${project}_${date}_${area}_${price}_${rowIndex}`;
};

export const hasPlotOverrideValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "object") {
    return ["best", "low", "high"].some((key) => value[key] !== null && value[key] !== undefined && value[key] !== "");
  }
  return true;
};

export const getPlotOverrideAvailability = (lst) => {
  const derivedBy = (lst?.plot_derived_by || "").toLowerCase().trim();
  const wasDerivedFromFsiCc = derivedBy === "llm" || derivedBy === "user";
  return {
    fsi: wasDerivedFromFsiCc || hasPlotOverrideValue(lst?.plot_fsi_range),
    cc: wasDerivedFromFsiCc || hasPlotOverrideValue(lst?.plot_construction_cost_range),
  };
};

export const getListingCategory = (lst) => (lst?.project_category || lst?.property_type || "").toLowerCase().trim();

export const isPlotListingRow = (lst) => {
  const category = getListingCategory(lst);
  return ["plot", "land"].includes(category)
    || (!category && lst?.plot_area_sqft != null && Number(lst.plot_area_sqft) > 0);
};

export const isBuiltFormListingRow = (lst) => {
  const category = getListingCategory(lst);
  return ["villa", "building_land", "house", "bungalow"].includes(category);
};

export const needsPlotConversionInputs = (lst, subjectPropertyType, valuationApproach) => {
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

export const parseNumericValue = (val) => {
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

export const getRowValue = (row, columnKey) => {
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
      return Object.entries(counts)
        .filter(([, v]) => Number(v) > 0)
        .map(([k, v]) => `${String(k).replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase())} - ${v}`)
        .join("\n");
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

export const isNumericColumn = (col) => {
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

export const filterAndSortList = (rows, sortConfig, filterConfig) => {
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

export const formatGeocodeSource = (source) => {
  if (!source) return { label: "Not Geocoded", color: "bg-red-500/15 text-red-400 border-red-500/30" };
  const s = String(source).toLowerCase();
  if (s.includes("google_places")) return { label: "Google Places API", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (s.includes("google_geocoding") || s.includes("google")) return { label: "Google Geocoding", color: "bg-sky-500/15 text-sky-400 border-sky-500/30" };
  if (s.includes("nominatim") || s.includes("osm") || s.includes("open_street")) return { label: "OSM (Nominatim)", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  if (s.includes("internal_db") || s.includes("db")) return { label: "Internal DB", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" };
  if (s.includes("user_override") || s.includes("user")) return { label: "User Override", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
  return { label: source, color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
};

export const formatPrice = (value, currency = "INR") => {
  if (!value && value !== 0) return "—";

  const curr = currency === "\u20B9" ? "INR" : (currency || "INR");
  const isIndian = curr === "INR";

  if (isIndian) {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
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
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return String(dateStr).split(/[T ]/)[0];
};

export const summarizeEvent = (event) => {
  if (typeof event.content === "string") return event.content;
  if (event.type === "entities") {
    const sublocalities = formatSublocalities(event.content);
    return sublocalities
      ? `I extracted the structured property details and fetched sub-localities for the plot: ${sublocalities}.`
      : "I extracted the structured property details and pushed them into the workflow panel.";
  }
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
    let baseMsg = `[SUCCESS] Found ${c?.total_found || 0} comparable projects in db . Wait for our Web Agent to find more comparables...`;
    if (c?.web_error) {
      baseMsg += ` (Note: Web search failed due to a technical issue: ${c.web_error}. Sourced results from internal database instead.)`;
    }
    return baseMsg;
  }
  if (event.type === "comparables_empty") {
    return event.content?.message || "No comparables were found. Continuing with the original valuation flow.";
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
  if (event.type === "listing_done") return "";
  if (event.type === "extraction_verification") return event.content?.message || "Please verify the extracted attributes.";
  if (event.type === "factorial_start") return event.content?.message || "Analyzing project metrics...";
  if (event.type === "factorial_results") {
    const t = event.content?.table || [];
    return `[METRICS] Project metrics ready — ${t.length} projects, ${event.content?.total_valid || 0} valid listings.`;
  }
  if (event.type === "factorial_done") return "Valuation analytics generated.";
  if (event.type === "done") return "Valuation Pipeline execution completed or artificially frozen.";
  if (event.type === "token_usage") return `Token usage updated: ${event.content?.cumulative_total_tokens || 0} tokens so far.`;
  return "Valuation Pipeline update received.";
};
