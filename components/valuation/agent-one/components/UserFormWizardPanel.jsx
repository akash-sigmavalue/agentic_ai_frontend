import { useState, useMemo, useEffect } from "react";
import { Zap } from "lucide-react";
import { QUICK_FIELD_CONFIG, QUICK_ESTIMATE_DEFAULTS } from "../chat-utils";

export default function UserFormWizardPanel({ values, onChange, onSubmit, disabled, apiUrl }) {
  const [activeSection, setActiveSection] = useState(0);
  const [maxReachedSection, setMaxReachedSection] = useState(0);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [geocodeFetched, setGeocodeFetched] = useState(false);
  const propertyType = values.property_type || "apartment";
  const isCostCapable = propertyType === "villa" || propertyType === "building_land";

  const fetchCoordinates = async () => {
    const locName = values.location_name?.trim() || "";
    const projName = values.project_name?.trim() || "";
    const country = values.country?.trim() || "India";

    if (!locName) {
      setGeocodeError("Please enter a locality name first (e.g. Sus, Pune).");
      return;
    }

    setIsGeocoding(true);
    setGeocodeError("");

    try {
      const response = await fetch(apiUrl("/geocode"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_name: locName, project_name: projName, country }),
      });

      if (!response.ok) throw new Error("Failed to contact geocoder API.");

      const result = await response.json();
      if (result.lat && result.lng) {
        onChange({
          ...values,
          lat: String(result.lat),
          lng: String(result.lng),
          coordinates: `${result.lat}, ${result.lng}`,
        });
        setGeocodeError("");
        setGeocodeFetched(true);
      } else if (result.error) {
        setGeocodeError(`Error: ${result.error}. Please adjust the Location Name and try again.`);
      } else {
        setGeocodeError("Coordinates not found. Please enter them manually or check location name.");
      }
    } catch (err) {
      setGeocodeError(`Failed to fetch coordinates: ${err.message}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Auto-fetch when user reaches the Coordinates section
  useEffect(() => {
    if (activeSection === 1 && !geocodeFetched && !values.lat) {
      fetchCoordinates();
    }
  }, [activeSection]);

  const updateField = (field, value) => {
    const next = { ...values, [field]: value };
    if (field === "property_type") {
      next.recommended_approach = value === "building_land" ? "cost" : "market";
    }
    onChange(next);
  };

  const sections = useMemo(() => {
    const dynamicSpecFields = {
      apartment: ["salable_area_sqft", "configuration", "floor", "age_of_property"],
      villa: ["plot_area_sqft", "builtup_area_sqft", "construction_rate_per_sqft", "age_of_property"],
      plot: ["plot_area_sqft", "land_type", "frontage"],
      commercial_office: ["salable_area_sqft", "occupancy_status", "floor"],
      retail: ["salable_area_sqft", "frontage", "occupancy_status"],
      building_land: ["plot_area_sqft", "builtup_area_sqft", "building_type", "age_of_property"],
    };

    const specFields = dynamicSpecFields[propertyType] || dynamicSpecFields.apartment;

    return [
      {
        title: "Section 1 • Project Details",
        items: ["property_type", "project_name", "location_name", "city_name", "country"],
      },
      {
        title: "Section 2 • Coordinates",
        items: [],
      },
      {
        title: "Section 3 • Property Specifications",
        items: specFields,
      },
      {
        title: "Section 4 • Valuation Settings",
        items: ["recommended_approach", "facing", "quality"],
      },
      {
        title: "Section 5 • Review",
        items: [],
      },
      {
        title: "Section 6 • Generate",
        items: [],
      },
    ];
  }, [propertyType]);

  const sectionRequirements = [
    ["property_type", "project_name", "location_name", "city_name", "country"],
    [], // Coordinates — optional, no hard requirements
    propertyType === "plot" ? sections[2].items.filter(f => f !== "frontage") : sections[2].items,
    ["recommended_approach", "facing", "quality"],
    [],
    [],
  ];

  const isSectionComplete = (index) => {
    // Last section (Generate) is never "complete" — never show a tick
    if (index === sections.length - 1) return false;
    // Coordinates section — complete only when lat+lng are filled
    if (index === 1) return !!(values.lat && values.lng);
    return sectionRequirements[index].every((field) => {
      const value = values[field];
      return value !== undefined && value !== null && String(value).trim() !== "";
    });
  };

  // A section is openable only if the user has reached it via Next clicks
  const canOpenSection = (index) => index <= maxReachedSection;
  const currentFields = sections[activeSection]?.items || [];

  const renderField = (field) => {
    const config = QUICK_FIELD_CONFIG[field];
    if (!config && field !== "recommended_approach") return null;
    const isRequired = sectionRequirements[activeSection].includes(field);
    if (field === "recommended_approach") {
      return (
        <label key={field} className="flex min-w-[145px] flex-1 flex-col gap-1.5">
          <span className="pl-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.05em] text-text-dim">Approach *</span>
          <select
            value={values.recommended_approach}
            onChange={(event) => updateField("recommended_approach", event.target.value)}
            disabled={!isCostCapable && values.recommended_approach === "market"}
            className="h-10 rounded-xl border border-border bg-bg-input px-3 text-xs sm:text-sm text-text-primary outline-none transition focus:border-accent focus:bg-accent/5 disabled:opacity-70"
          >
            <option value="market">Market Approach</option>
            {isCostCapable && <option value="cost">Cost Approach</option>}
          </select>
        </label>
      );
    }

    return (
      <label key={field} className="flex min-w-[145px] flex-1 flex-col gap-1.5">
        <span className="pl-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.05em] text-text-dim">
          {config.label}{isRequired ? " *" : ""}
        </span>
        {config.type === "select" ? (
          <select
            value={values[field] ?? ""}
            onChange={(event) => updateField(field, event.target.value)}
            className="h-10 rounded-xl border border-border bg-bg-input px-3 text-xs sm:text-sm text-text-primary outline-none transition focus:border-accent focus:bg-accent/5"
          >
            <option value="" disabled>Select...</option>
            {(config.options || []).map((option) => (
              <option key={option} value={option} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={config.type}
            value={values[field] ?? ""}
            onChange={(event) => updateField(field, event.target.value)}
            placeholder={config.placeholder}
            className="h-10 rounded-xl border border-border bg-bg-input px-3 text-xs sm:text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-accent focus:bg-accent/5"
          />
        )}
      </label>
    );
  };

  const reviewSummary = [
    ["Property Type", values.property_type],
    ["Project Name", values.project_name],
    ["Location", values.location_name],
    ["City", values.city_name],
    ["Country", values.country],
    ["Approach", values.recommended_approach],
    ["Facing", values.facing],
    ["Quality", values.quality],
  ];

  return (
    <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-hidden rounded-2xl border border-accent/25 bg-bg-card/95 text-left shadow-panel md:max-h-[calc(100dvh-4rem)]">
      <div className="w-[240px] shrink-0 border-r border-border/70 bg-bg-deep/40 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.05em] text-accent">Sections</p>
        <div className="mt-4 space-y-2">
          {sections.map((section, index) => {
            const locked = !canOpenSection(index);
            const current = index === activeSection;
            const complete = isSectionComplete(index);
            const prefix = current ? "➜" : complete ? "✓" : "○";
            return (
              <button
                key={section.title}
                type="button"
                onClick={() => {
                  if (!locked) setActiveSection(index);
                }}
                disabled={locked}
                className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left transition ${current
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : locked
                    ? "border-border/40 bg-bg-input/40 text-text-dim opacity-60 cursor-not-allowed"
                    : "border-border/60 bg-bg-card text-text-secondary hover:border-accent/30 hover:text-text-primary"
                  }`}
              >
                <span className="mt-0.5 text-[10px] sm:text-[11px] font-black">{prefix}</span>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.04em] leading-relaxed">
                  {section.title.replace(/^Section \d+ • /, "")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-accent/15 bg-accent/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.05em] text-accent">{sections[activeSection].title}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Step-by-step wizard for structured property input.
              </p>
            </div>
            <div className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-accent">
              {activeSection + 1} / {sections.length}
            </div>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {activeSection === 0 && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-bg-deep/30 p-3.5">
                <div className="mb-3">
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.05em] text-accent">Property Type</p>
                  <p className="mt-1 text-[11px] sm:text-xs text-text-dim">Choose the property category first to unlock relevant fields.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {renderField("property_type")}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {["project_name", "location_name", "city_name", "country"].map(renderField)}
              </div>
            </div>
          )}

          {activeSection === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-bg-deep/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.05em] text-accent">Auto-detected Coordinates</p>
                    <p className="mt-1 text-[11px] sm:text-xs text-text-dim leading-relaxed">
                      Coordinates are auto-fetched from the location you entered. You can edit them manually or refresh.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchCoordinates}
                    disabled={isGeocoding}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-warning transition hover:bg-warning/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeocoding ? (
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {isGeocoding ? "Fetching…" : "🔄 Refresh"}
                  </button>
                </div>

                {isGeocoding && (
                  <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
                    <svg className="h-3.5 w-3.5 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-xs text-accent font-semibold">Fetching coordinates from location…</p>
                  </div>
                )}

                {geocodeError && (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5">
                    <p className="text-xs font-bold text-red-400 leading-relaxed">⚠️ {geocodeError}</p>
                    <p className="mt-1 text-[10px] text-text-dim">You can enter coordinates manually below.</p>
                  </div>
                )}

                {values.lat && values.lng && !isGeocoding && !geocodeError && (
                  <div className="flex items-center gap-2 rounded-xl border border-green-500/25 bg-green-500/10 px-3 py-2">
                    <span className="text-green-400 text-sm">✓</span>
                    <p className="text-xs font-semibold text-green-400">Coordinates found: {values.lat}, {values.lng}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="pl-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.05em] text-text-dim">Latitude</span>
                    <input
                      type="text"
                      value={values.lat ?? ""}
                      onChange={(e) => onChange({ ...values, lat: e.target.value, coordinates: e.target.value && values.lng ? `${e.target.value}, ${values.lng}` : values.coordinates })}
                      placeholder="e.g. 19.0760"
                      className="h-10 rounded-xl border border-border bg-bg-input px-3 text-xs sm:text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-warning/5"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="pl-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.05em] text-text-dim">Longitude</span>
                    <input
                      type="text"
                      value={values.lng ?? ""}
                      onChange={(e) => onChange({ ...values, lng: e.target.value, coordinates: values.lat && e.target.value ? `${values.lat}, ${e.target.value}` : values.coordinates })}
                      placeholder="e.g. 72.8777"
                      className="h-10 rounded-xl border border-border bg-bg-input px-3 text-xs sm:text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-warning/5"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentFields.map(renderField)}
            </div>
          )}

          {activeSection === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentFields.map(renderField)}
            </div>
          )}

          {activeSection === 4 && (
            <div className="space-y-2 rounded-2xl border border-border/70 bg-bg-deep/30 p-4">
              {reviewSummary.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-0">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.05em] text-text-dim">{label}</span>
                  <span className="text-sm font-semibold text-text-primary text-right">{value || "—"}</span>
                </div>
              ))}
            </div>
          )}

          {activeSection === 5 && (
            <div className="rounded-2xl border border-border/70 bg-bg-deep/30 p-4">
              <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">
                Review is complete. Click the button below to generate the valuation.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/40 bg-bg-card/90 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onChange({ ...QUICK_ESTIMATE_DEFAULTS });
                  setActiveSection(0);
                  setMaxReachedSection(0);
                  setGeocodeError("");
                  setGeocodeFetched(false);
                }}
                className="rounded-xl border border-border/40 bg-bg-input/20 px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-text-dim transition hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setActiveSection((prev) => Math.max(0, prev - 1))}
                disabled={activeSection === 0}
                className="rounded-xl border border-border bg-bg-input px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-text-secondary transition hover:border-accent/30 hover:text-text-primary disabled:opacity-40"
              >
                Previous
              </button>
            </div>
            {activeSection < 5 ? (
              <button
                type="button"
                disabled={!isSectionComplete(activeSection)}
                className="rounded-xl bg-accent px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-bg-deep transition hover:scale-[1.02] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                onClick={() => {
                  if (isSectionComplete(activeSection)) {
                    const next = Math.min(5, activeSection + 1);
                    setActiveSection(next);
                    setMaxReachedSection(prev => Math.max(prev, next));
                  }
                }}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-bg-deep transition hover:scale-[1.02] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Zap className="h-4 w-4" />
                Get Valuation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
