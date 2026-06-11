"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { Mail, Paperclip } from "lucide-react";
import AttachmentRow from "./AttachmentRow";

export type EmailCardProps = {
  email: any;
  index?: number;
  onReadEmail?: (id: string) => void;
  onViewThread?: (threadId: string, email?: any) => void;
  onSendPrompt?: (prompt: string) => void;
};

export default function EmailCard({
  email,
  index,
  onReadEmail,
  onViewThread,
  onSendPrompt,
}: EmailCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [entitiesExpanded, setEntitiesExpanded] = useState(false);
  const [recipientsExpanded, setRecipientsExpanded] = useState(false);

  const id = getEmailId(email);
  const threadId = getThreadId(email);
  const sender = getSender(email);
  const receiver = getReceiver(email);
  const subject = firstString(email?.subject, email?.title) || "Email interaction";
  const dateLabel = formatEmailDate(email);
  const preview = getPreviewText(email);
  const unread = isUnreadEmail(email);
  const attachmentCount = getAttachmentCount(email);
  const threadCount = getThreadMessageCount(email);
  const classification = email?.classification;
  const classificationCategory = firstString(classification?.category);
  const classificationPriority = firstString(classification?.priority).toLowerCase();
  const classificationIntent = firstString(classification?.intent);
  const classificationConfidence = getConfidenceValue(classification);
  const entities = getEmailEntities(email);
  const recipients = getEmailRecipients(email);
  const attachments = getAttachmentList(email);
  const hasDetails = Boolean(
    email?.snippet ||
      email?.body_preview ||
      email?.body ||
      email?.text ||
      email?.message_id ||
      email?.thread_id ||
      email?.threadId ||
      classification ||
      entities.length > 0 ||
      recipients.length > 0 ||
      attachments.length > 0 ||
      attachmentCount > 0 ||
      receiver ||
      dateLabel,
  );

  const handleToggle = () => setExpanded((value) => !value);

  const handleReadEmail = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!id) return;
    onReadEmail?.(id);
  };

  const handleViewThread = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!threadId) return;
    onViewThread?.(threadId, email);
  };

  const handleSendPrompt = (event: MouseEvent<HTMLButtonElement>, prompt: string) => {
    event.stopPropagation();
    onSendPrompt?.(prompt);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleToggle();
        }
      }}
      className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 shadow-sm">
          <Mail size={17} strokeWidth={2.4} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {unread ? (
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-500 shadow-sm shadow-sky-200"
                    aria-label="Unread email"
                  />
                ) : (
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-slate-300 bg-white"
                    aria-label="Read email"
                  />
                )}

                <h5 className="truncate text-sm font-black tracking-tight text-slate-900">
                  {subject}
                </h5>

                {classification && classificationCategory ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
                        getClassificationPriorityClass(classificationPriority),
                      ].join(" ")}
                    >
                      {classificationCategory}
                    </span>
                    {classificationConfidence ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {(classificationConfidence * 100).toFixed(0)}% confidence
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <p className="mt-1 truncate text-sm font-medium text-slate-700">
                {sender || "unknown sender"}
                {sender && receiver ? (
                  <span className="font-normal text-slate-400"> {"\u2192"} {receiver}</span>
                ) : null}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                {dateLabel ? <span>{dateLabel}</span> : null}
                {attachmentCount > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                    Attachments: {attachmentCount} file{attachmentCount === 1 ? "" : "s"}
                  </span>
                ) : null}
                {threadCount > 1 ? (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                    {threadCount} messages
                  </span>
                ) : null}
                {typeof index === "number" ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    Email {index + 1}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={handleReadEmail}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              Read email
            </button>
            <button
              type="button"
              onClick={(event) => handleSendPrompt(event, `reply to email ${id}`)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              Reply
            </button>
            <button
              type="button"
              onClick={(event) => handleSendPrompt(event, `extract details from email ${id}`)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              Extract
            </button>
            <button
              type="button"
              onClick={(event) => handleSendPrompt(event, `classify email ${id}`)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              Classify
            </button>
            {threadId ? (
              <button
                type="button"
                onClick={handleViewThread}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                View thread
              </button>
            ) : null}
          </div>

          <div className="mt-3 text-sm leading-relaxed text-slate-600">
            <p className="line-clamp-2">{preview}</p>
          </div>

          {expanded && hasDetails ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <DetailRow label="Message ID" value={firstString(email?.message_id, email?.id)} />
                <DetailRow label="Thread ID" value={firstString(email?.thread_id, email?.threadId)} />
                <DetailRow label="Receiver" value={receiver || "Unknown"} />
                <DetailRow label="Date" value={dateLabel || "Unknown"} />
                <DetailRow
                  label="Attachments"
                  value={
                    attachmentCount > 0
                      ? `${attachmentCount} file${attachmentCount === 1 ? "" : "s"}`
                      : "None"
                  }
                />
                <DetailRow
                  label="Messages in thread"
                  value={`${threadCount} message${threadCount === 1 ? "" : "s"}`}
                />
              </div>

              {entities.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEntitiesExpanded((value) => !value);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                        Entity panel
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-700">
                        Extracted entities
                      </div>
                    </div>
                    <span className="text-lg font-black leading-none text-slate-400">
                      {entitiesExpanded ? "-" : "+"}
                    </span>
                  </button>

                  {entitiesExpanded ? (
                    <div className="border-t border-slate-200 p-4">
                      <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                        {entities.map((entry) => (
                          <DetailRow key={entry.label} label={entry.label} value={entry.value} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {recipients.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRecipientsExpanded((value) => !value);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                        Recipients
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-700">
                        To and CC addresses
                      </div>
                    </div>
                    <span className="text-lg font-black leading-none text-slate-400">
                      {recipientsExpanded ? "-" : "+"}
                    </span>
                  </button>

                  {recipientsExpanded ? (
                    <div className="border-t border-slate-200 p-4">
                      <div className="grid gap-3 text-sm text-slate-700">
                        {recipients.map((entry) => (
                          <DetailRow key={entry.label} label={entry.label} value={entry.value} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {preview ? (
                <div className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                    Full preview
                  </div>
                  <div className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700">
                    {getExpandedBody(email) || preview}
                  </div>
                </div>
              ) : null}

              {classificationIntent ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                    Intent
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-slate-700">
                    {classificationIntent}
                  </div>
                </div>
              ) : null}

              {attachments.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                    <Paperclip size={13} />
                    Attachments
                  </div>
                  <div className="mt-3 space-y-2">
                    {attachments.map((attachment, attachmentIndex) => (
                      <AttachmentRow
                        key={attachment.attachmentId || `${attachment.name || attachmentIndex}`}
                        messageId={id}
                        attachment={attachment}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-slate-700">{value}</div>
    </div>
  );
}

function getEmailId(email: any) {
  return firstString(email?.id, email?.message_id, email?.thread_id, email?.threadId);
}

function getThreadId(email: any) {
  return firstString(email?.thread_id, email?.threadId, email?.id, email?.message_id);
}

function getSender(email: any) {
  return firstString(email?.from_email, email?.from, email?.sender, email?.sender_email);
}

function getReceiver(email: any) {
  return firstString(email?.to, email?.receiver, email?.to_email);
}

function getExpandedBody(email: any) {
  return firstString(email?.snippet, email?.body_preview, email?.body, email?.text);
}

function getPreviewText(email: any) {
  const text = getExpandedBody(email);
  if (!text) return "No preview available.";

  const flattened = text.replace(/\s+/g, " ").trim();
  if (flattened.length <= 150) {
    return flattened;
  }

  return `${flattened.slice(0, 150).trimEnd()}...`;
}

function getThreadMessageCount(email: any) {
  const value =
    email?.thread_message_count ??
    email?.message_count ??
    (Array.isArray(email?.messages) ? email.messages.length : null);

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return 1;
}

function getAttachmentCount(email: any) {
  if (typeof email?.attachment_count === "number" && Number.isFinite(email.attachment_count)) {
    return email.attachment_count;
  }

  if (Array.isArray(email?.attachments)) {
    return email.attachments.length;
  }

  if (email?.has_attachments === true) {
    return 1;
  }

  return 0;
}

function getAttachmentList(
  email: any,
): Array<{ attachmentId: string; name: string; mimeType: string; sizeLabel: string }> {
  const attachments = Array.isArray(email?.attachments) ? email.attachments : [];

  return attachments
    .filter((attachment: any) => attachment && typeof attachment === "object")
    .map((attachment: any) => {
      const sizeBytes = typeof attachment.size === "number" ? attachment.size : null;
      return {
        attachmentId: firstString(attachment.attachment_id, attachment.attachmentId, attachment.id),
        name: firstString(attachment.filename, attachment.name, attachment.original_name),
        mimeType: firstString(attachment.mime_type, attachment.mimeType, attachment.content_type),
        sizeLabel:
          sizeBytes != null
            ? `${formatBytes(sizeBytes)}`
            : firstString(attachment.size_label, attachment.sizeText),
      };
    });
}

function getConfidenceValue(classification: any): number {
  const value = classification?.confidence ?? classification?.score ?? classification?.confidence_score;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function getEmailEntities(email: any) {
  const source = email?.entities;
  if (!source || typeof source !== "object") {
    return [];
  }

  const fields = [
    ["Bank", source.bank],
    ["Branch", source.branch],
    ["Borrower", source.borrower],
    ["Deadline", source.deadline],
    ["Property Type", source.property_type ?? source.propertyType],
    ["Loan Amount", source.loan_amount ?? source.loanAmount],
  ] as const;

  return fields
    .filter(([, value]) => hasRenderableValue(value))
    .map(([label, value]) => ({
      label,
      value: formatDisplayValue(value),
    }));
}

function getEmailRecipients(email: any) {
  const items: Array<{ label: string; value: string }> = [];

  if (hasRenderableValue(email?.to)) {
    items.push({
      label: "To",
      value: formatDisplayValue(email.to),
    });
  }

  if (hasRenderableValue(email?.cc)) {
    items.push({
      label: "CC",
      value: formatDisplayValue(email.cc),
    });
  }

  return items;
}

function getClassificationPriorityClass(priority: string): string {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    case "low":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function hasRenderableValue(value: any): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasRenderableValue);
  if (typeof value === "number") return Number.isFinite(value);
  return Boolean(value);
}

function formatDisplayValue(value: any): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatDisplayValue(item)).filter(Boolean).join(", ");
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value ?? "");
}

function isUnreadEmail(email: any): boolean {
  if (typeof email?.is_read === "boolean") {
    return !email.is_read;
  }

  if (typeof email?.read === "boolean") {
    return !email.read;
  }

  const labels = Array.isArray(email?.labelIds)
    ? email.labelIds
    : Array.isArray(email?.labels)
      ? email.labels
      : [];

  return labels.some((label: any) => String(label).toUpperCase() === "UNREAD");
}

export function formatEmailDate(email: any): string {
  const rawDate = firstString(email?.date_str, email?.date);
  const parsedFromHeader = rawDate ? Date.parse(rawDate) : Number.NaN;

  let date = Number.isFinite(parsedFromHeader) ? new Date(parsedFromHeader) : null;

  if (!date || Number.isNaN(date.getTime())) {
    const internalDateRaw = firstString(email?.internalDate, email?.internal_date);
    const internalDateValue = internalDateRaw ? Number.parseInt(internalDateRaw, 10) : Number.NaN;
    if (Number.isFinite(internalDateValue)) {
      const fallback = new Date(internalDateValue);
      if (!Number.isNaN(fallback.getTime())) {
        date = fallback;
      }
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart}, ${timePart}`;
}

function firstString(...values: any[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}
