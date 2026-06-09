"use client";

import { useMemo, useState } from "react";
import { Paperclip } from "lucide-react";
import AttachmentRow from "./AttachmentRow";
import { formatEmailDate } from "./EmailCard";

type ThreadViewProps = {
  thread: any;
  onClose?: () => void;
};

export default function ThreadView({ thread, onClose }: ThreadViewProps) {
  const [showOlder, setShowOlder] = useState(false);

  const messages = useMemo(() => normalizeMessages(thread), [thread]);
  const visibleMessages = useMemo(() => {
    if (showOlder || messages.length <= 3) {
      return messages;
    }
    return messages.slice(-3);
  }, [messages, showOlder]);

  const hasOlder = messages.length > 3;

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-black uppercase tracking-[0.15em] text-slate-500">
            Thread View
          </h4>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {messages.length} message{messages.length === 1 ? "" : "s"}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {visibleMessages.map((message, index) => {
          const isLatest = index === visibleMessages.length - 1;
          const attachmentList = getAttachmentList(message);

          return (
            <article
              key={message.id || message.message_id || message.gmail_id || `${index}`}
              className={`rounded-2xl border p-4 transition ${
                isLatest
                  ? "border-slate-200 bg-white shadow-sm"
                  : "border-slate-200/70 bg-slate-50/70 text-slate-500"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h5 className="truncate text-sm font-black tracking-tight text-slate-900">
                      {getSender(message) || "unknown sender"}
                    </h5>
                    {getReceiver(message) ? (
                      <span className="text-xs font-medium text-slate-400">
                        {"\u2192"} {getReceiver(message)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                    {formatEmailDate(message) ? <span>{formatEmailDate(message)}</span> : null}
                    {getSubject(message) ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                        {getSubject(message)}
                      </span>
                    ) : null}
                    {getAttachmentCount(message) > 0 ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                        <span className="inline-flex items-center gap-1">
                          <Paperclip size={11} />
                          {getAttachmentCount(message)} file
                          {getAttachmentCount(message) === 1 ? "" : "s"}
                        </span>
                      </span>
                    ) : null}
                    {attachmentList.length > 0 ? (
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">
                        {attachmentList.length} attachment detail
                        {attachmentList.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                </div>

                {isLatest ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">
                    Latest
                  </span>
                ) : null}
              </div>

              <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                {getBody(message)}
              </div>

              {attachmentList.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    Attachments
                  </div>
                  <div className="mt-3 space-y-2">
                    {attachmentList.map((attachment, attachmentIndex) => (
                      <AttachmentRow
                        key={attachment.attachmentId || `${attachment.name || attachmentIndex}`}
                        messageId={getMessageId(message)}
                        attachment={attachment}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {hasOlder ? (
        <button
          type="button"
          onClick={() => setShowOlder((value) => !value)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {showOlder ? "Hide older messages" : "Show older messages"}
        </button>
      ) : null}
    </div>
  );
}

function normalizeMessages(thread: any): any[] {
  const source = extractMessagesSource(thread);
  const dedup = new Map<string, any>();

  for (const message of source) {
    const normalized = normalizeMessage(message);
    const key = getMessageKey(normalized);
    if (!dedup.has(key)) {
      dedup.set(key, normalized);
    }
  }

  return Array.from(dedup.values()).sort(compareMessagesAsc);
}

function extractMessagesSource(thread: any): any[] {
  if (Array.isArray(thread)) {
    return thread.flatMap((item) => extractMessagesSource(item));
  }

  if (!thread || typeof thread !== "object") {
    return [];
  }

  const candidates = [
    thread.messages,
    thread.data?.messages,
    thread.output?.messages,
    thread.thread?.messages,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((message) => message && typeof message === "object");
    }
  }

  return [thread];
}

function normalizeMessage(message: any) {
  const payload = message?.data && typeof message.data === "object" ? message.data : message;
  return {
    ...payload,
    id: firstString(payload?.id, payload?.message_id, payload?.gmail_id),
    message_id: firstString(payload?.message_id, payload?.id, payload?.gmail_id),
    thread_id: firstString(payload?.thread_id, payload?.threadId),
    internalDate: payload?.internalDate ?? payload?.internal_date,
  };
}

function compareMessagesAsc(a: any, b: any) {
  const aValue = getSortTime(a);
  const bValue = getSortTime(b);
  if (aValue !== bValue) {
    return aValue - bValue;
  }
  return String(a.id || a.message_id || "").localeCompare(String(b.id || b.message_id || ""));
}

function getSortTime(message: any) {
  const internalRaw = firstString(message?.internalDate, message?.internal_date);
  const internalValue = internalRaw ? Number.parseInt(internalRaw, 10) : Number.NaN;
  if (Number.isFinite(internalValue)) {
    return internalValue;
  }
  const parsed = Date.parse(firstString(message?.date_str, message?.date));
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return 0;
}

function getMessageKey(message: any) {
  return (
    firstString(message?.id, message?.message_id, message?.gmail_id) ||
    `${getSender(message)}|${getSubject(message)}|${getBody(message)}|${firstString(message?.date_str, message?.date)}`
  );
}

function getSender(message: any) {
  return firstString(message?.from_email, message?.from, message?.sender, message?.sender_email);
}

function getReceiver(message: any) {
  return firstString(message?.to, message?.receiver, message?.to_email);
}

function getSubject(message: any) {
  return firstString(message?.subject, message?.title);
}

function getMessageId(message: any) {
  return firstString(message?.id, message?.message_id, message?.gmail_id);
}

function getAttachmentCount(message: any) {
  if (typeof message?.attachment_count === "number") {
    return message.attachment_count;
  }
  if (Array.isArray(message?.attachments)) {
    return message.attachments.length;
  }
  return message?.has_attachments ? 1 : 0;
}

function getAttachmentList(
  message: any,
): Array<{ attachmentId: string; name: string; mimeType: string; sizeLabel: string }> {
  const attachments = Array.isArray(message?.attachments) ? message.attachments : [];

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

function getBody(message: any): string {
  return (
    firstString(
      message?.body,
      message?.text,
      message?.plain_text,
      message?.snippet
    ) || "No message content available."
  );
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

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
