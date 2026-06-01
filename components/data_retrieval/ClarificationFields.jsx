"use client";

import { useEffect, useRef, useState } from "react";

function formatStageLabel(stage) {
  if (!stage) {
    return "";
  }
  return stage.replaceAll("_", ".").replace(/^stage\./, "Stage ");
}

function ClarificationSelect({ schema, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const placeholder = schema.placeholder || `Select ${schema.label}`;
  const options = Array.isArray(schema.options) ? schema.options : [];
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm outline-none transition focus-visible:ring-2"
        style={{
          borderColor: open ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border-soft)",
          background: "var(--bg-input)",
          color: selectedOption ? "var(--text-primary)" : "var(--text-muted)",
          boxShadow: open ? "0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent)" : "none",
        }}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute z-[80] mt-2 max-h-52 w-full overflow-y-auto rounded-2xl border py-1 shadow-2xl execution-flow-scroll"
          style={{
            borderColor: "var(--border-soft)",
            background: "var(--bg-deep)",
          }}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(schema.field, option.value);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm transition"
                  style={{
                    color: "var(--text-primary)",
                    background: active
                      ? "color-mix(in srgb, var(--accent) 18%, transparent)"
                      : "transparent",
                  }}
                  onMouseEnter={(event) => {
                    if (!active) {
                      event.currentTarget.style.background = "var(--bg-card-strong)";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (!active) {
                      event.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function FieldControl({ schema, value, onChange }) {
  const inputStyle = {
    borderColor: "var(--border-soft)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
  };

  if (schema.type === "select") {
    return <ClarificationSelect schema={schema} value={value} onChange={onChange} />;
  }

  if (schema.type === "textarea") {
    return (
      <textarea
        value={value || ""}
        onChange={(event) => onChange(schema.field, event.target.value)}
        className="min-h-[88px] w-full resize-y rounded-2xl border px-4 py-3 text-sm outline-none transition"
        style={inputStyle}
        placeholder={schema.placeholder || ""}
        rows={3}
      />
    );
  }

  return (
    <input
      type="text"
      value={value || ""}
      onChange={(event) => onChange(schema.field, event.target.value)}
      className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
      style={inputStyle}
      placeholder={schema.placeholder || ""}
    />
  );
}

export default function ClarificationFields({
  clarification,
  fieldValues,
  onFieldChange,
  selectedOptions,
  onToggleOption,
  otherText,
  onOtherTextChange,
  interactive = true,
}) {
  if (!clarification) {
    return null;
  }

  const stageLabel = formatStageLabel(clarification.stopped_at_stage);
  const primaryQuestion =
    clarification.clarification_question ||
    clarification.questions?.[0] ||
    clarification.message ||
    "More detail is needed before the agent can continue.";

  const fields = Array.isArray(clarification.fields) ? clarification.fields : [];
  const isSpaceFilter = clarification.clarification_type === "space_filter";
  const isV2Pipeline = clarification.clarification_type === "v2_pipeline";

  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: "color-mix(in srgb, var(--warning) 18%, transparent)" }}>
      <div className="mb-3 flex items-start gap-2">
        <span className="text-base" aria-hidden>❓</span>
        <div className="min-w-0 flex-1">
          {stageLabel ? (
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--warning)" }}>
              {stageLabel}
            </p>
          ) : null}
          <p className="m-0 text-sm font-medium leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {primaryQuestion}
          </p>
          {clarification.next_action ? (
            <p className="mt-2 m-0 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {clarification.next_action}
            </p>
          ) : null}
        </div>
      </div>

      {interactive && isV2Pipeline && fields.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {fields.map((schema) => (
            <label key={schema.field} className={`flex flex-col gap-1.5 ${schema.type === "textarea" ? "sm:col-span-2" : ""}`}>
              <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
                {schema.label || schema.field}
              </span>
              {schema.help_text ? (
                <span className="px-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {schema.help_text}
                </span>
              ) : null}
              {Array.isArray(schema.options) && schema.options.length > 0 && schema.type === "textarea" ? (
                <div className="flex flex-wrap gap-2 px-1">
                  {schema.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onFieldChange?.(schema.field, option.value)}
                      className="rounded-full border px-3 py-1 text-xs transition"
                      style={{
                        borderColor: "var(--border-soft)",
                        background: valueMatches(fieldValues?.[schema.field], option.value)
                          ? "color-mix(in srgb, var(--accent) 18%, transparent)"
                          : "var(--bg-card)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <FieldControl schema={schema} value={fieldValues?.[schema.field] || ""} onChange={onFieldChange} />
            </label>
          ))}
        </div>
      ) : null}

      {interactive && isSpaceFilter ? (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(clarification.options || []).map((option) => {
              const checked = (selectedOptions || []).includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
                  style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-primary)" }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleOption?.(option.id)}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
          {(selectedOptions || []).includes("other") ? (
            <div className="mt-4">
              <label className="mb-2 block text-xs uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
                Other details
              </label>
              <input
                value={otherText || ""}
                onChange={(event) => onOtherTextChange?.(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                placeholder="Add the space detail you have..."
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {!isV2Pipeline && !isSpaceFilter && Array.isArray(clarification.questions) && clarification.questions.length > 1 ? (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {clarification.questions.map((line, questionIndex) => (
            <li key={questionIndex}>{line}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function valueMatches(current, candidate) {
  return String(current || "").trim().toLowerCase() === String(candidate || "").trim().toLowerCase();
}
