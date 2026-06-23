// components/connector/ConfirmationActions.jsx

"use client";

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getOriginalPrompt(response, partialIntent) {
  return firstString(
    partialIntent?.original_prompt,
    response?.plan?.goal,
    response?.message,
    response?.summary,
    "Send the prepared Gmail reply",
  );
}

function getReplyText(response) {
  return firstString(
    response?.reply,
    response?.reply_draft,
    response?.partial_intent?.reply,
    response?.partial_intent?.reply_draft,
    response?.partial_intent?.generated_reply,
    response?.partial_intent?.reply_body,
    response?.step_results?.find?.((step) => step?.tool === "llm.generate_reply")?.output?.reply,
    response?.step_results?.find?.((step) => step?.tool === "llm.generate_reply")?.output?.reply_draft,
    response?.step_results?.find?.((step) => step?.tool === "llm.generate_reply")?.output?.generated_reply,
    response?.step_results?.find?.((step) => step?.tool === "llm.generate_reply")?.output?.reply_body,
  );
}

function buildConfirmedPrompt(originalPrompt, replyText) {
  return [
    `[confirmed] ${originalPrompt}`,
    "Operation: send_reply",
    "Send Directly: true",
    replyText ? "" : "",
    replyText ? "Reply Body:" : "",
    replyText || "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function buildDraftPrompt(originalPrompt, replyText) {
  return [
    `Create draft instead of sending: ${originalPrompt}`,
    "Operation: draft_reply",
    "Send Directly: false",
    replyText ? "" : "",
    replyText ? "Draft Reply Body:" : "",
    replyText || "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export default function ConfirmationActions({ response, onSendPrompt, onCancel }) {
  if (!response || String(response.status || "").toLowerCase() !== "needs_confirmation") {
    return null;
  }

  const partialIntent = response.partial_intent || {};
  const originalPrompt = getOriginalPrompt(response, partialIntent);
  const replyText = getReplyText(response);

  const commonContext = {
    original_prompt: originalPrompt,
    operation: "send_reply",
    status: response.status,
    policy_decision: response.policy_decision || null,
    reply_text: replyText || undefined,
  };

  const handleSendReply = () => {
    onSendPrompt({
      prompt: buildConfirmedPrompt(originalPrompt, replyText),
      confirmed: true,
      user_confirmed: true,
      send_directly: true,
      draft_only: false,
      partial_intent: {
        ...partialIntent,
        ...commonContext,
        confirmed: true,
        user_confirmed: true,
        send_directly: true,
        draft_only: false,
      },
      team_context: {
        confirmed: true,
        user_confirmed: true,
        send_directly: true,
        draft_only: false,
        partial_intent: {
          ...partialIntent,
          ...commonContext,
          confirmed: true,
          user_confirmed: true,
          send_directly: true,
          draft_only: false,
        },
      },
    });
  };

  const handleCreateDraft = () => {
    onSendPrompt({
      prompt: buildDraftPrompt(originalPrompt, replyText),
      confirmed: false,
      user_confirmed: false,
      send_directly: false,
      draft_only: true,
      partial_intent: {
        ...partialIntent,
        ...commonContext,
        confirmed: false,
        user_confirmed: false,
        draft_only: true,
        send_directly: false,
      },
      team_context: {
        confirmed: false,
        user_confirmed: false,
        send_directly: false,
        draft_only: true,
        partial_intent: {
          ...partialIntent,
          ...commonContext,
          confirmed: false,
          user_confirmed: false,
          draft_only: true,
          send_directly: false,
        },
      },
    });
  };

  const handleCancel = () => {
    if (typeof onCancel === "function") {
      onCancel();
      return;
    }

    onSendPrompt({
      prompt: "Cancel this Gmail reply workflow",
      confirmed: false,
      user_confirmed: false,
      cancelled: true,
      partial_intent: {
        ...partialIntent,
        ...commonContext,
        confirmed: false,
        user_confirmed: false,
        cancelled: true,
      },
      team_context: {
        confirmed: false,
        user_confirmed: false,
        cancelled: true,
        partial_intent: {
          ...partialIntent,
          ...commonContext,
          confirmed: false,
          user_confirmed: false,
          cancelled: true,
        },
      },
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
      <div className="text-sm font-black text-slate-950 dark:text-white">
        Confirmation required
      </div>

      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Review the generated reply before sending. Gmail replies will only be sent after your confirmation.
      </p>

      {replyText ? (
        <div className="mt-3 max-h-48 overflow-auto rounded-xl border border-slate-200/70 bg-white/80 p-3 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
          <pre className="whitespace-pre-wrap font-sans">{replyText}</pre>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm leading-6 text-orange-700 dark:text-orange-200">
          Reply body is not visible in this response. You can create a draft first and review it before sending.
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSendReply}
          disabled={!replyText}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send Reply
        </button>

        <button
          type="button"
          onClick={handleCreateDraft}
          className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Create Draft
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
