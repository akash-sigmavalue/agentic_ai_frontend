// components/connector/ConfirmationActions.jsx

"use client";

export default function ConfirmationActions({ response, onSendPrompt }) {
  if (!response || response.status !== "needs_confirmation") {
    return null;
  }

  const partialIntent = response.partial_intent || {};
  const originalPrompt =
    partialIntent.original_prompt ||
    response.message ||
    response.summary ||
    "";

  const handleSendReply = () => {
    onSendPrompt({
      prompt: `[confirmed] ${originalPrompt}`,
      confirmed: true,
      user_confirmed: true,
      partial_intent: {
        ...partialIntent,
        confirmed: true,
        user_confirmed: true,
        send_directly: true,
        draft_only: false,
      },
      team_context: {
        partial_intent: {
          ...partialIntent,
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
      prompt: "Create draft instead of sending",
      confirmed: false,
      user_confirmed: false,
      partial_intent: {
        ...partialIntent,
        draft_only: true,
        send_directly: false,
      },
      team_context: {
        partial_intent: {
          ...partialIntent,
          draft_only: true,
          send_directly: false,
        },
      },
    });
  };

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleSendReply}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
      >
        Send Reply
      </button>

      <button
        type="button"
        onClick={handleCreateDraft}
        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
      >
        Create Draft
      </button>
    </div>
  );
}