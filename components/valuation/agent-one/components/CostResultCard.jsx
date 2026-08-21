import { useState } from "react";
import { createPortal } from "react-dom";
import { getCurrencySymbol } from "../chat-utils";

// Helper functions and defaults for Cost Approach parameters

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

export function normalizeCostInputSchema(schema) {
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

export function buildCostInputDefaults(schema, subjectData, currentValues = {}) {
  const defaults = {};
  if (!schema || !schema.inputs) return defaults;

  schema.inputs.forEach((inp) => {
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

export function CostInputsForm({ schema, values, onChange, onSubmit, isCalculating, subjectData, submitLabel }) {
  if (!schema) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-[2rem] border border-warning/30 bg-bg-card shadow-2xl backdrop-blur-3xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/20 text-warning text-xl border border-warning/30">
          🏗️
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.05em] text-text-primary">Cost Approach Parameters</h3>
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
              <span className="pl-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-[0.05em] text-text-dim leading-tight">
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
        className="w-full rounded-2xl bg-gradient-to-r from-warning to-amber-500 py-3.5 text-xs font-black uppercase tracking-[0.05em] text-bg-deep shadow-lg shadow-warning/10 transition duration-300 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
      >
        {isCalculating ? "Calculating Cost Valuation..." : (submitLabel || "Execute Cost Approach Calculation")}
      </button>
    </div>
  );
}

export default function CostResultCard({ data, subjectData }) {
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

  const fmtCurrencyInUnits = (val) => {
    if (val == null || Number.isNaN(Number(val))) return "—";
    const num = Number(val);
    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 2)} Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 2)} Lakh`;
    return formatter.format(num);
  };

  const fmt = fmtCurrencyInUnits;
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
              <h2 className="text-[10px] font-black uppercase tracking-[0.05em] text-text-primary">Cost Approach Valuation Appraisal</h2>
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
              <span className="text-[9px] font-black uppercase tracking-[0.04em] text-success">Verified Audit</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <section className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.05em] text-text-primary">Appraisal Step Calculation Audit</h3>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Step 1 */}
            <div className="rounded-2xl border border-border-soft bg-bg-input/30 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 1: Land component Valuation</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-text-muted">Land Value</p>
                  <p className="text-2xl font-black text-sky-500 dark:text-sky-400 font-mono leading-none">{fmt(land_value)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-bg-deep/60 border border-border/50 p-3 text-[10px] text-text-secondary space-y-1">
                <p className="font-semibold text-text-muted">Valuation Base:</p>
                <p className="font-mono text-text-primary leading-relaxed font-bold">
                  {audit_trail?.land_value_formula || `Land Value = ${fmtRate(derived_plot_rate_per_sqft)}/sqft × ${plot_area_sqft} sqft (Plot Area)`}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-border-soft bg-bg-input/30 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Step 2: Replacement Construction Cost</span>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] uppercase font-black tracking-wider text-text-muted">Construction Cost</p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono leading-none">{fmt(construction_cost)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-bg-deep/60 border border-border/50 p-3 text-[10px] text-text-secondary space-y-1">
                <p className="font-semibold text-text-muted">Formula &amp; Inputs:</p>
                <p className="font-mono text-text-primary leading-relaxed font-bold">
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
                  <p className="text-2xl font-black text-amber-600 dark:text-warning font-mono leading-none">{(depreciation_rate * 100).toFixed(2)}%</p>
                </div>
              </div>
              <div className="rounded-xl bg-bg-deep/60 border border-border/50 p-3 text-[10px] text-text-secondary space-y-1">
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
                  <p className="text-[10px] uppercase font-black tracking-wider text-text-muted">Structure Value</p>
                  <p className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono leading-none">{fmt(depreciated_building_value)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-bg-deep/60 border border-border/50 p-3 text-[10px] text-text-secondary space-y-2">
                <div>
                  <p className="font-mono text-teal-700 dark:text-teal-400 leading-relaxed font-bold">
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

          <div
            style={{
              background: "var(--cost-hero-bg)",
              borderColor: "var(--cost-hero-border)"
            }}
            className="relative overflow-hidden rounded-[2rem] border p-8 text-center space-y-4 shadow-2xl"
          >
            <span className="text-[9px] font-black uppercase tracking-[0.05em] text-success">Final Cost Approach Villa Value</span>

            <div className="space-y-1">
              <h1
                style={{ color: "var(--cost-hero-text)" }}
                className="font-mono text-5xl font-black dark:drop-shadow-[0_0_24px_rgba(34,197,94,0.5)]"
              >
                {fmt(final_property_value)}
              </h1>
              <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest">
                Land Value + Depreciated Structure Value
              </p>
            </div>

            <div className="border-t border-success/20 pt-4 max-w-lg mx-auto">
              <p className="text-[9px] font-mono text-text-secondary leading-relaxed">
                Appraisal Audit Trail:<br />
                <span className="text-text-primary font-bold">{audit_trail?.final_value_formula || `Cost Value = ${fmt(land_value)} (Land) + ${fmt(depreciated_building_value)} (Structure) = ${fmt(final_property_value)}`}</span>
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
