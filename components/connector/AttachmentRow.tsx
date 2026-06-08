"use client";

import { useState } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import { fetchAttachment } from "./api";

type AttachmentRowProps = {
  messageId: string;
  attachment: {
    attachmentId: string;
    name: string;
    mimeType: string;
    sizeLabel?: string;
  };
};

type AttachmentStatus = "idle" | "loading" | "done" | "error";

export default function AttachmentRow({ messageId, attachment }: AttachmentRowProps) {
  const [status, setStatus] = useState<AttachmentStatus>("idle");
  const [expanded, setExpanded] = useState(true);
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fileType = getAttachmentBadge(attachment.mimeType);
  const canView = Boolean(messageId && attachment.attachmentId);

  const handleViewContent = async () => {
    if (!canView) {
      setStatus("error");
      setErrorMessage("Attachment metadata is incomplete.");
      return;
    }

    if (status === "done") {
      setExpanded((value) => !value);
      return;
    }

    if (status === "loading") {
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetchAttachment(
        messageId,
        attachment.attachmentId,
        attachment.name || undefined,
        attachment.mimeType || undefined,
      );
      const text = extractAttachmentText(response);
      if (!text) {
        throw new Error("No extracted text was returned for this attachment.");
      }
      setContent(text);
      setExpanded(true);
      setStatus("done");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Attachment could not be loaded.");
      setStatus("error");
    }
  };

  const buttonLabel =
    status === "loading"
      ? "Loading..."
      : status === "done"
        ? expanded
          ? "Hide content"
          : "View content"
        : status === "error"
          ? "Try again"
          : "View content";

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
                fileType.className,
              ].join(" ")}
            >
              {fileType.label}
            </span>
            <h6 className="truncate text-sm font-semibold text-slate-800">
              {attachment.name || "Unnamed attachment"}
            </h6>
          </div>

          {attachment.sizeLabel ? (
            <p className="mt-1 text-xs font-medium text-slate-500">{attachment.sizeLabel}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleViewContent}
          disabled={status === "loading"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? (
            <>
              <FileText size={12} />
              Loading...
            </>
          ) : (
            <>
              <FileText size={12} />
              {buttonLabel}
            </>
          )}
        </button>
      </div>

      {status === "error" ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {status === "done" && expanded ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            Extracted text
          </div>
          <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
            {content}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getAttachmentBadge(mimeType: string) {
  const value = mimeType.toLowerCase();

  if (value.includes("pdf")) {
    return { label: "PDF", className: "border-red-200 bg-red-50 text-red-700" };
  }

  if (value.includes("wordprocessingml.document") || value.includes("docx")) {
    return { label: "DOCX", className: "border-blue-200 bg-blue-50 text-blue-700" };
  }

  if (value.includes("spreadsheetml.sheet") || value.includes("xlsx") || value.includes("xls")) {
    return { label: "XLSX", className: "border-teal-200 bg-teal-50 text-teal-700" };
  }

  if (value.includes("csv")) {
    return { label: "CSV", className: "border-purple-200 bg-purple-50 text-purple-700" };
  }

  return { label: "FILE", className: "border-slate-200 bg-slate-100 text-slate-700" };
}

function extractAttachmentText(response: Record<string, unknown>): string {
  const preview = firstString(
    response["extracted_text_preview"],
    response["extracted_text"],
    response["text"],
    response["body"],
  );
  if (preview) {
    return preview;
  }

  const chunks = Array.isArray(response["chunks"])
    ? response["chunks"].filter(
        (chunk): chunk is string => typeof chunk === "string" && chunk.trim().length > 0,
      )
    : [];
  if (chunks.length > 0) {
    return chunks.join("\n\n");
  }

  return firstString(response["warning"], response["message"]);
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}
