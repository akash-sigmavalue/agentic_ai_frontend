"use client";

import { useMemo, useState } from "react";
import type { GmailFormField, GmailFormSchema } from "./types";

type GmailActionFormProps = {
  schema: GmailFormSchema;
  originalPrompt?: string;
  partialIntent?: Record<string, unknown> | null;
  isLoading?: boolean;
  onSubmit: (nextPrompt: string) => void;
};

function getDefaultValue(field: GmailFormField): string {
  if (typeof field.default === "boolean") return field.default ? "Yes" : "No";
  if (typeof field.default === "string") return field.default;
  if (field.options?.length) return field.options[0] || "";
  return "";
}

function buildOriginalPrompt(schema: GmailFormSchema, originalPrompt?: string, partialIntent?: Record<string, unknown> | null) {
  const fromProp = String(originalPrompt || "").trim();
  if (fromProp) return fromProp;

  const fromSchema = String(schema.partial_intent?.original_prompt || "").trim();
  if (fromSchema) return fromSchema;

  const fromPartial = String(partialIntent?.original_prompt || "").trim();
  if (fromPartial) return fromPartial;

  return "Continue the Gmail workflow using the completed form details.";
}

function buildPromptFromValues(
  schema: GmailFormSchema,
  values: Record<string, string>,
  originalPrompt?: string,
  partialIntent?: Record<string, unknown> | null,
) {
  const basePrompt = buildOriginalPrompt(schema, originalPrompt, partialIntent);

  const lines = [
    `Original prompt: ${basePrompt}`,
    "",
    "Use the following completed Gmail action details and continue the workflow:",
  ];

  for (const field of schema.fields || []) {
    const value = String(values[field.name] || "").trim();
    if (!value) continue;
    lines.push(`${field.label}: ${value}`);
  }

  const partial = schema.partial_intent || partialIntent;
  if (partial && Object.keys(partial).length) {
    lines.push("", "Existing partial intent context is available in the previous workflow response. Use the new form details as final user input.");
  }

  return lines.join("\n");
}

function validateRequiredFields(schema: GmailFormSchema, values: Record<string, string>) {
  const missing: string[] = [];

  for (const field of schema.fields || []) {
    if (!field.required) continue;
    if (!String(values[field.name] || "").trim()) {
      missing.push(field.label || field.name);
    }
  }

  return missing;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: GmailFormField;
  value: string;
  onChange: (value: string) => void;
}) {
  const commonClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500";

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder || "Enter details..."}
        rows={4}
        className={`${commonClass} resize-none leading-6`}
      />
    );
  }

  if (field.type === "select" || field.type === "boolean") {
    const options = field.type === "boolean" ? ["Yes", "No"] : field.options || [];
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className={commonClass}>
        {!value ? <option value="">Select...</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder || "Enter value..."}
      type={field.type === "email" ? "email" : "text"}
      className={commonClass}
    />
  );
}

export default function GmailActionForm({
  schema,
  originalPrompt,
  partialIntent = null,
  isLoading = false,
  onSubmit,
}: GmailActionFormProps) {
  const fields = schema.fields || [];
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      initial[field.name] = getDefaultValue(field);
    }
    return initial;
  });

  const missingFieldLabel = useMemo(() => {
    const missingName = schema.missing_field;
    if (!missingName) return null;
    const match = fields.find((field) => field.name === missingName);
    return match?.label || missingName.replace(/_/g, " ");
  }, [fields, schema.missing_field]);

  const handleSubmit = () => {
    const missing = validateRequiredFields(schema, values);
    if (missing.length) {
      setError(`Please fill required field: ${missing.join(", ")}`);
      return;
    }

    setError(null);
    onSubmit(buildPromptFromValues(schema, values, originalPrompt, partialIntent));
  };

  return (
    <article className="overflow-hidden rounded-[22px] border border-blue-200/70 bg-white/90 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-blue-500/20 dark:bg-slate-950/60">
      <div className="border-b border-slate-200/70 bg-gradient-to-r from-blue-50 via-white to-red-50 p-5 dark:border-slate-800 dark:from-blue-950/30 dark:via-slate-950/50 dark:to-red-950/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex w-fit items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-300">
              <span>📋</span>
              <span>Required Details</span>
            </div>
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              {schema.title || "Complete Gmail Action Details"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {schema.description || "Fill the details below so the agent can continue safely."}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-yellow-500/15 px-3 py-1.5 text-xs font-black text-yellow-700 dark:text-yellow-300">
            Needs input
          </span>
        </div>

        {missingFieldLabel ? (
          <div className="mt-4 rounded-2xl border border-yellow-300/70 bg-yellow-50 p-3 text-xs font-bold text-yellow-800 dark:border-yellow-500/25 dark:bg-yellow-500/10 dark:text-yellow-200">
            Missing: {missingFieldLabel}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => {
            const isWide = field.type === "textarea" || ["message_instruction", "search_filter", "trigger_condition"].includes(field.name);
            return (
              <label key={field.name} className={isWide ? "md:col-span-2" : undefined}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    {field.label}
                    {field.required ? <span className="ml-1 text-red-500">*</span> : null}
                  </span>
                  {field.required_for?.length ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {field.required_for.join(" / ")}
                    </span>
                  ) : null}
                </div>
                <FieldInput
                  field={field}
                  value={values[field.name] || ""}
                  onChange={(nextValue) => setValues((prev) => ({ ...prev, [field.name]: nextValue }))}
                />
              </label>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">Continue with these details</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              The form will be converted into a structured prompt and sent back to the workflow.
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleSubmit}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(37,99,235,.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {isLoading ? "Submitting..." : "Submit details"}
          </button>
        </div>
      </div>
    </article>
  );
}
