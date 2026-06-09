"use client";

import { useState } from "react";
import type { ReplyCustomizerValues } from "./types";

interface ReplyCustomizerPanelProps {
  draftReply: string | null;
  values: ReplyCustomizerValues;
  onChange: (v: ReplyCustomizerValues) => void;
  onApply: (v: ReplyCustomizerValues) => void;
  onSkip: () => void;
  isLoading: boolean;
}

export default function ReplyCustomizerPanel({
  draftReply,
  values,
  onChange,
  onApply,
  onSkip,
  isLoading,
}: ReplyCustomizerPanelProps) {
  const tones = ["professional", "friendly", "formal", "casual", "assertive"];
  const [isConfirming, setIsConfirming] = useState(false);
  const promptText = `Reapply with tone: ${values.tone}${values.customInstruction ? `, instructions: ${values.customInstruction}` : ""}${values.rewrittenMessage ? `, using this message instead: ${values.rewrittenMessage}` : ""}`;

  return (
    <div className="mb-6 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <h4 className="flex items-center gap-2 text-sm font-black tracking-tight text-slate-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-sm">
            AI
          </span>
          Customize AI Response
        </h4>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Fine-tune the draft before confirming.
        </p>
      </div>

      <div className="space-y-6 p-5">
        {draftReply && (
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              AI Draft
            </label>
            <blockquote className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {draftReply}
            </blockquote>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Tone
          </label>
          <div className="flex flex-wrap gap-2">
            {tones.map((t) => (
              <button
                key={t}
                onClick={() => onChange({ ...values, tone: t })}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold capitalize transition-colors ${
                  values.tone === t
                    ? "border-[#525ceb] bg-[#525ceb] text-white shadow-sm shadow-[#525ceb]/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {t}
              </button>
            ))}
            <input
              type="text"
              placeholder="Custom tone..."
              value={tones.includes(values.tone) ? "" : values.tone}
              onChange={(e) => onChange({ ...values, tone: e.target.value })}
              className="min-w-[120px] flex-1 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-[#525ceb] focus:ring-1 focus:ring-[#525ceb]/30"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Custom Instructions
          </label>
          <textarea
            placeholder="Add context, constraints, or special instructions for the AI..."
            value={values.customInstruction}
            onChange={(e) => onChange({ ...values, customInstruction: e.target.value })}
            className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Rewrite yourself (Optional)
          </label>
          <textarea
            placeholder="Or write your own reply here. Leave blank to let AI use your tone + instructions."
            value={values.rewrittenMessage}
            onChange={(e) => onChange({ ...values, rewrittenMessage: e.target.value })}
            className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/20"
          />
        </div>

        {isConfirming ? (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <p className="mb-4 text-xs font-medium leading-relaxed text-slate-600">
              <span className="font-bold text-indigo-700">Prompt: </span>
              {promptText}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onApply(values)}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center rounded-xl bg-[#525ceb] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#525ceb]/20 transition hover:bg-[#434bca] hover:shadow-lg hover:shadow-[#525ceb]/30 disabled:opacity-50 disabled:shadow-none"
              >
                {isLoading ? "Sending..." : "Confirm & Send"}
              </button>
              <button
                onClick={() => setIsConfirming(false)}
                disabled={isLoading}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:shadow-none"
              >
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setIsConfirming(true)}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center rounded-xl bg-[#525ceb] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#525ceb]/20 transition hover:bg-[#434bca] hover:shadow-lg hover:shadow-[#525ceb]/30 disabled:opacity-50 disabled:shadow-none"
            >
              Apply & Continue
            </button>
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:shadow-none"
            >
              Skip / Use as-is
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
