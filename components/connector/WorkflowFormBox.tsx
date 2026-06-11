"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { WorkflowResponse } from "./types";

type WorkflowOperationType =
  | "reply"
  | "reply_to_thread"
  | "send"
  | "automate"
  | "fetch"
  | "search"
  | "read"
  | "read_attachment"
  | "analyze"
  | "classify"
  | "label"
  | "flag"
  | "delete"
  | "contact"
  | "insight"
  | "chain";

type WorkflowFormBoxProps = {
  response: WorkflowResponse;
  partialIntent?: Record<string, unknown> | null;
  operationType: WorkflowOperationType;
  onRerun: (prompt: string) => void;
};

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function toNumberValue(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export default function WorkflowFormBox({
  response,
  partialIntent,
  operationType,
  onRerun,
}: WorkflowFormBoxProps) {
  const [senderEmail, setSenderEmail] = useState(() => toStringValue(response.from_email));
  const [toEmail, setToEmail] = useState(() =>
    toStringValue(partialIntent?.to || response.from_email)
  );
  const [subject, setSubject] = useState(() => toStringValue(response.subject));
  const [emailBody, setEmailBody] = useState(() => toStringValue(partialIntent?.body));
  const [maxEmails, setMaxEmails] = useState(() =>
    String(toNumberValue(partialIntent?.max_results, 10))
  );
  const [execType, setExecType] = useState(() =>
    toStringValue(response.execution_type, "one_time") || "one_time"
  );
  const [replyTone, setReplyTone] = useState(() =>
    toStringValue(partialIntent?.reply_tone, "professional") || "professional"
  );

  const isReadSideOperation = [
    "fetch",
    "search",
    "read",
    "read_attachment",
    "analyze",
    "classify",
    "label",
    "flag",
    "delete",
    "contact",
    "insight",
    "chain",
  ].includes(operationType);

  const senderValue = senderEmail.trim();
  const toValue = toEmail.trim();
  const subjectValue = subject.trim();
  const emailBodyValue = emailBody.trim();
  const replyToneValue = replyTone.trim() || "professional";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let prompt = "send email";

    if (operationType === "reply" || operationType === "reply_to_thread") {
      prompt = `reply to ${toValue || toEmail} with subject "${subjectValue}" saying "${emailBodyValue}" in a ${replyToneValue} tone`;
    } else if (operationType === "send") {
      prompt = `send email to ${toValue || toEmail} with subject "${subjectValue}" saying "${emailBodyValue}"`;
    } else if (operationType === "automate") {
      prompt = `when ${senderValue} emails me, automatically reply saying "${emailBodyValue}" in a ${replyToneValue} tone`;
    } else if (operationType === "fetch" || operationType === "search") {
      prompt = `show emails from ${senderValue}`;
    } else if (operationType === "read") {
      prompt = `show full thread from ${senderValue}`;
    } else if (operationType === "read_attachment") {
      prompt = `read the attachment in the last email from ${senderValue}`;
    } else if (operationType === "analyze" || operationType === "classify") {
      prompt = `extract key details from the last email from ${senderValue}`;
    }

    onRerun(prompt);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <h4 className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
          RERUN DETAILS
        </h4>
        <p className="text-sm leading-relaxed text-slate-600">
          Adjust the workflow inputs and rerun the prompt with the updated values.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 lg:col-span-2">
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
            Sender Email
          </span>
          {isReadSideOperation ? (
            <p className="text-sm leading-relaxed text-slate-500">
              We found the name but need the email address to search Gmail accurately.
            </p>
          ) : null}
          <input
            value={senderEmail}
            onChange={(event) => setSenderEmail(event.target.value)}
            type="email"
            placeholder="sender@example.com"
            required={isReadSideOperation}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
          />
        </label>

        {!isReadSideOperation ? (
          <>
            <div className="flex flex-col gap-2">
              <label className="mb-1 block text-xs text-slate-500">To (recipient)</label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300"
              />
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                Subject
              </span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                type="text"
                placeholder="Email subject"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              />
            </label>

            <div className="flex flex-col gap-2 lg:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Message body</label>
              <textarea
                rows={4}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300"
              />
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                Max Emails
              </span>
              <input
                value={maxEmails}
                onChange={(event) => setMaxEmails(event.target.value)}
                type="number"
                min={1}
                step={1}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                Execution Type
              </span>
              <select
                value={execType}
                onChange={(event) => setExecType(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              >
                <option value="one_time">One time</option>
                <option value="automated">Automated</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 lg:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                Reply Tone
              </span>
              <input
                value={replyTone}
                onChange={(event) => setReplyTone(event.target.value)}
                type="text"
                placeholder="professional"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-medium leading-relaxed text-slate-500">
          The rerun prompt is rebuilt from the form values when you submit.
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-2xl bg-[#525ceb] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#464fd7] focus:outline-none focus:ring-2 focus:ring-[#525ceb]/30"
        >
          Rerun workflow
        </button>
      </div>
    </form>
  );
}
