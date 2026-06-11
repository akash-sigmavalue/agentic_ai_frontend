"use client";

import { useMemo, useState } from "react";

type EditableReplyDraftProps = {
  initialBody: string;
  threadId?: string | null;
  draftId?: string | null;
  subject?: string | null;
  recipient?: string | null;
  fromEmail?: string | null;
  isSending?: boolean;
  onSend: (editedBody: string) => void;
  onSaveDraft?: (editedBody: string) => void;
  onRegenerate?: () => void;
  onCancel?: () => void;
};

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function hasValue(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0;
}

export default function EditableReplyDraft({
  initialBody,
  threadId,
  draftId,
  subject,
  recipient,
  fromEmail,
  isSending = false,
  onSend,
  onSaveDraft,
  onRegenerate,
  onCancel,
}: EditableReplyDraftProps) {
  const [body, setBody] = useState(initialBody || "");
  const [copied, setCopied] = useState(false);

  const wordCount = useMemo(() => countWords(body), [body]);
  const canSend = body.trim().length > 0 && !isSending;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-[24px] border border-emerald-400/30 bg-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.12)] dark:border-emerald-400/20 dark:bg-slate-950/70">
      <div className="border-b border-slate-200/70 bg-gradient-to-r from-emerald-500/15 via-blue-500/10 to-red-500/10 p-4 dark:border-slate-800/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 w-fit rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
              Editable Gmail Draft
            </div>
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              Review and send reply
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300">
              AI prepared this reply. Edit anything below, then send it to Gmail after review.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-black">
            <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-blue-600 dark:text-blue-300">
              {wordCount} words
            </span>
            {hasValue(threadId) ? (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-emerald-600 dark:text-emerald-300">
                Thread ready
              </span>
            ) : (
              <span className="rounded-full bg-yellow-500/15 px-3 py-1.5 text-yellow-700 dark:text-yellow-300">
                Thread pending
              </span>
            )}
          </div>
        </div>

        {(subject || recipient || fromEmail || draftId) ? (
          <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200/60 bg-white/65 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
            {subject ? (
              <div className="break-words">
                <span className="font-black text-slate-500 dark:text-slate-400">Subject:</span> {subject}
              </div>
            ) : null}
            {recipient || fromEmail ? (
              <div className="break-words">
                <span className="font-black text-slate-500 dark:text-slate-400">To:</span> {recipient || fromEmail}
              </div>
            ) : null}
            {threadId ? (
              <div className="break-words">
                <span className="font-black text-slate-500 dark:text-slate-400">Thread:</span> {threadId}
              </div>
            ) : null}
            {draftId ? (
              <div className="break-words">
                <span className="font-black text-slate-500 dark:text-slate-400">Draft:</span> {draftId}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Reply body
        </label>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          spellCheck
          className="min-h-[330px] w-full resize-y rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-blue-500"
          placeholder="Write or edit the reply here..."
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSend(body)}
              disabled={!canSend}
              className="rounded-full bg-gradient-to-r from-red-500 to-red-400 px-5 py-2.5 text-xs font-black text-white shadow-[0_12px_35px_rgba(239,68,68,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isSending ? "Sending..." : "🚀 Send Email"}
            </button>

            {onSaveDraft ? (
              <button
                type="button"
                onClick={() => onSaveDraft(body)}
                disabled={!body.trim() || isSending}
                className="rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2.5 text-xs font-black text-blue-600 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-300"
              >
                💾 Save Draft
              </button>
            ) : null}

            {onRegenerate ? (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isSending}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                ✨ Regenerate
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {copied ? "✅ Copied" : "📋 Copy"}
            </button>

            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSending}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>

        {!hasValue(threadId) ? (
          <p className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3 text-xs leading-5 text-yellow-800 dark:text-yellow-200">
            Thread ID was not found in the frontend response. The send button will still pass the edited body to backend, but replying in the same Gmail thread needs backend to return <span className="font-black">thread_id</span>.
          </p>
        ) : null}
      </div>
    </article>
  );
}
