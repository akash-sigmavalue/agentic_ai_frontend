"use client";

import {
  Archive,
  BarChart3,
  CheckCircle2,
  FileText,
  Flag,
  Trash2,
  Users,
  Workflow,
} from "lucide-react";
import type { WorkflowResponse } from "./types";

type CardProps = {
  result?: any;
};

function getData(result: any) {
  if (!result) return null;
  return result.data || result.output || result.raw_mcp_results || result;
}

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function getCount(data: any) {
  if (!data) return 0;
  if (typeof data.count === "number") return data.count;
  if (typeof data.deleted_count === "number") return data.deleted_count;
  if (Array.isArray(data.message_ids)) return data.message_ids.length;
  if (Array.isArray(data.drafts)) return data.drafts.length;
  if (Array.isArray(data.data)) return data.data.length;
  if (data.success) return 1;
  return 0;
}

function CardShell({
  title,
  subtitle,
  icon,
  borderClassName,
  bgClassName,
  titleClassName,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  borderClassName: string;
  bgClassName: string;
  titleClassName: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mb-8 rounded-2xl border p-5 ${borderClassName} ${bgClassName}`}>
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className={`text-xs font-black uppercase tracking-wider ${titleClassName}`}>
            {title}
          </h4>

          {subtitle ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {children}
    </div>
  );
}

export function LabelResultCard({ result }: CardProps) {
  const data = getData(result);
  if (!data) return null;

  const count = getCount(data);

  return (
    <CardShell
      title="Label / Organize Result"
      subtitle={data.summary || `Processed ${count} email(s) for label action.`}
      icon={<Archive size={20} className="text-violet-600" />}
      borderClassName="border-violet-200"
      bgClassName="bg-violet-50/60"
      titleClassName="text-violet-700"
    >
      <div className="grid gap-3 rounded-xl border border-violet-100 bg-white p-4 text-sm text-slate-700">
        <div className="flex justify-between gap-4">
          <span className="font-semibold text-slate-500">Action</span>
          <span className="font-bold text-slate-800">{data.action || "apply"}</span>
        </div>

        {data.label_applied ? (
          <div className="flex justify-between gap-4">
            <span className="font-semibold text-slate-500">Label</span>
            <span className="font-bold text-violet-700">{data.label_applied}</span>
          </div>
        ) : null}

        <div className="flex justify-between gap-4">
          <span className="font-semibold text-slate-500">Emails Processed</span>
          <span className="font-bold text-slate-800">{count}</span>
        </div>
      </div>
    </CardShell>
  );
}

export function DraftResultCard({ result }: CardProps) {
  const data = getData(result);
  if (!data) return null;

  const drafts = safeArray(data.drafts);
  const count = getCount(data);

  return (
    <CardShell
      title="Draft Result"
      subtitle={
        data.summary ||
        (drafts.length ? `Found ${drafts.length} draft(s).` : "Draft operation completed.")
      }
      icon={<FileText size={20} className="text-amber-600" />}
      borderClassName="border-amber-200"
      bgClassName="bg-amber-50/60"
      titleClassName="text-amber-700"
    >
      <div className="rounded-xl border border-amber-100 bg-white p-4">
        <div className="flex justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-500">Draft Count</span>
          <span className="font-bold text-slate-800">{count}</span>
        </div>

        {data.draft_id || data.id ? (
          <div className="mt-3 flex justify-between gap-4 text-sm">
            <span className="font-semibold text-slate-500">Draft ID</span>
            <span className="max-w-[260px] truncate font-bold text-slate-800">
              {data.draft_id || data.id}
            </span>
          </div>
        ) : null}

        {drafts.length ? (
          <div className="mt-4 space-y-2">
            {drafts.slice(0, 5).map((draft: any, index: number) => (
              <div
                key={draft.id || index}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              >
                <span className="font-bold">Draft {index + 1}</span>
                {draft.message?.snippet ? (
                  <span className="ml-2">{draft.message.snippet}</span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </CardShell>
  );
}

export function PeopleReportCard({ result }: CardProps) {
  const data = getData(result);
  if (!data) return null;

  const rows = safeArray(data.data);

  return (
    <CardShell
      title="People / Contact Report"
      subtitle={data.summary || `Prepared report for ${rows.length} sender(s).`}
      icon={<Users size={20} className="text-sky-600" />}
      borderClassName="border-sky-200"
      bgClassName="bg-sky-50/60"
      titleClassName="text-sky-700"
    >
      {rows.length ? (
        <div className="overflow-hidden rounded-xl border border-sky-100 bg-white">
          {rows.slice(0, 10).map((row: any, index: number) => (
            <div
              key={`${row.sender_email || row.display_name || index}`}
              className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">
                  {row.display_name || row.sender_email || "Unknown sender"}
                </p>

                {row.sender_email && row.sender_email !== row.display_name ? (
                  <p className="truncate text-xs text-slate-500">
                    {row.sender_email}
                  </p>
                ) : null}
              </div>

              <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
                {row.count || 0}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-sky-100 bg-white p-4 text-sm text-slate-500">
          No people data found.
        </p>
      )}
    </CardShell>
  );
}

export function StatusResultCard({ result }: CardProps) {
  const data = getData(result);
  if (!data) return null;

  const count = getCount(data);

  return (
    <CardShell
      title="Status / Flag Result"
      subtitle={data.summary || `Updated status for ${count} email(s).`}
      icon={<Flag size={20} className="text-indigo-600" />}
      borderClassName="border-indigo-200"
      bgClassName="bg-indigo-50/60"
      titleClassName="text-indigo-700"
    >
      <div className="grid gap-3 rounded-xl border border-indigo-100 bg-white p-4 text-sm text-slate-700">
        <div className="flex justify-between gap-4">
          <span className="font-semibold text-slate-500">Action</span>
          <span className="font-bold text-indigo-700">
            {data.action || "status_update"}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="font-semibold text-slate-500">Emails Updated</span>
          <span className="font-bold text-slate-800">{count}</span>
        </div>
      </div>
    </CardShell>
  );
}

export function DeleteResultCard({ result }: CardProps) {
  const data = getData(result);
  if (!data) return null;

  const deletedCount = getCount(data);

  return (
    <CardShell
      title="Delete / Clean Result"
      subtitle={data.summary || `Moved ${deletedCount} email(s) to Trash.`}
      icon={<Trash2 size={20} className="text-rose-600" />}
      borderClassName="border-rose-200"
      bgClassName="bg-rose-50/60"
      titleClassName="text-rose-700"
    >
      <div className="rounded-xl border border-rose-100 bg-white p-4">
        <div className="flex justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-500">Action</span>
          <span className="font-bold text-rose-700">{data.action || "trash"}</span>
        </div>

        <div className="mt-3 flex justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-500">Deleted Count</span>
          <span className="font-bold text-slate-800">{deletedCount}</span>
        </div>

        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          Emails are moved to Gmail Trash, not permanently deleted.
        </p>
      </div>
    </CardShell>
  );
}

export function InsightReportCard({ result }: CardProps) {
  const data = getData(result);
  if (!data) return null;

  const rows = safeArray(data.data);

  return (
    <CardShell
      title="Insight Report"
      subtitle={data.summary || data.title || "Email insight report generated."}
      icon={<BarChart3 size={20} className="text-emerald-600" />}
      borderClassName="border-emerald-200"
      bgClassName="bg-emerald-50/60"
      titleClassName="text-emerald-700"
    >
      {rows.length ? (
        <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white">
          {rows.slice(0, 10).map((row: any, index: number) => (
            <div
              key={`${row.label || index}`}
              className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <span className="truncate text-sm font-bold text-slate-800">
                {row.label || row.name || "Item"}
              </span>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                {row.value || row.count || 0}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-emerald-100 bg-white p-4 text-sm text-slate-500">
          No report rows available.
        </p>
      )}
    </CardShell>
  );
}

export function WorkflowStepResultCard({
  response,
}: {
  response: WorkflowResponse;
}) {
  const steps = response.step_results || [];

  if (!steps.length) return null;

  return (
    <CardShell
      title="Multi-Step Workflow"
      subtitle={`Completed ${steps.length} workflow step(s).`}
      icon={<Workflow size={20} className="text-slate-700" />}
      borderClassName="border-slate-200"
      bgClassName="bg-slate-50/70"
      titleClassName="text-slate-700"
    >
      <div className="space-y-3">
        {steps.map((step, index) => {
          const completed = step.status === "completed";
          const output =
            typeof step.output === "string"
              ? step.output
              : step.output?.summary ||
                step.output?.message ||
                step.output?.error ||
                "";

          return (
            <div
              key={`${step.step_id || index}`}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-800">
                  {index + 1}. {step.tool || step.kind || step.step_id}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                    completed
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  <CheckCircle2 size={12} />
                  {step.status}
                </span>
              </div>

              {output ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {output}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}