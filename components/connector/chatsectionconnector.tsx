"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ConvMessage, ConvStep } from "./types";
import AiEmptyState from "./AiEmptyState";
import AiPanelHeader from "./AiPanelHeader";

type ChatSectionConnectorProps = {
  prompt: string;
  setPrompt: (value: string) => void;
  isLoading: boolean;
  statusMessage: string;
  handleRunWorkflow: () => void;
  convStep: ConvStep;
  convMessages: ConvMessage[];
  handleConvUserReply: (input: string) => void;
  currentFieldName?: string | null;
  currentFieldType?: "email" | "choice" | "text" | "text_optional";
  currentFieldOptions?: string[];
  currentFieldSkippable?: boolean;
  currentFieldQuestion?: string | null;
};

const promptChips = [
  "📩 Summarize all unread emails from this week",
  "✍️ Draft a reply to the last email from my manager",
  "🧾 Find every invoice attachment from October",
  "🏷️ Label all newsletters and archive promotions",
];

function cleanChipPrompt(value: string) {
  return value.replace(/^[^A-Za-z]+/, "").trim();
}

export default function ChatSectionConnector({
  prompt,
  setPrompt,
  isLoading,
  statusMessage,
  handleRunWorkflow,
  convStep,
  convMessages,
  handleConvUserReply,
  currentFieldName = null,
  currentFieldType = "text",
  currentFieldOptions = [],
  currentFieldSkippable = false,
  currentFieldQuestion = null,
}: ChatSectionConnectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [showTyping, setShowTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const assistantStatus = useMemo(() => {
    if (isLoading || convStep === "submitting" || convStep === "streaming") return "Running";
    if (convStep === "done") return "Completed";
    if (convStep.startsWith("waiting")) return "Needs Input";
    return "Ready";
  }, [convStep, isLoading]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;

    if (!scrollContainer) {
      return;
    }

    const hasOverflow = scrollContainer.scrollHeight > scrollContainer.clientHeight;
    scrollContainer.scrollTop = hasOverflow ? scrollContainer.scrollHeight : 0;
  }, [convMessages, showTyping]);

  useEffect(() => {
    if (convStep === "waiting_email" || convStep === "waiting_frequency" || convStep === "waiting_field") {
      setShowTyping(true);
      const t = setTimeout(() => setShowTyping(false), 650);
      return () => clearTimeout(t);
    }
    setShowTyping(false);
    return undefined;
  }, [convStep]);

  const submitFieldReply = (value?: string) => {
    const finalValue = (value ?? inputValue).trim();
    if (!finalValue && !currentFieldSkippable) return;
    handleConvUserReply(finalValue || "skip");
    setInputValue("");
  };

  const fieldLabel = currentFieldName ? currentFieldName.replace(/_/g, " ") : "required detail";
  const isFieldMode = convStep === "waiting_email" || convStep === "waiting_frequency" || convStep === "waiting_field";
  const hasConversation = convMessages.length > 0 || isFieldMode || isLoading;

  return (
    <section className="connector-panel flex h-full min-h-[520px] max-h-full flex-col overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/85 shadow-[0_18px_54px_rgba(15,23,42,.10)] dark:border-slate-700/80 dark:bg-slate-900/85 lg:min-h-0">
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
      `}</style>

      <AiPanelHeader
        icon="🤖"
        kicker="Workflow Assistant"
        title={assistantStatus}
        right={
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            gmail-agent
          </span>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 pb-0">
        {!hasConversation ? (
          <>
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          🔎 <span>Try a prompt</span>
        </div>
        <div className="flex flex-col gap-2 border-b border-dashed border-slate-300 pb-3 dark:border-slate-700">
          {promptChips.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPrompt(cleanChipPrompt(item))}
                  className="connector-chip w-fit max-w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-[13px] font-semibold text-slate-800 transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              {item}
            </button>
          ))}
        </div>
          </>
        ) : null}

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pr-1 custom-scrollbar">
          {convMessages.length === 0 && !isFieldMode && !isLoading ? (
            <AiEmptyState
              icon="🧠"
              title="Describe your AI Gmail workflow"
              text="The agent will understand your prompt, plan the workflow, call Gmail tools, and generate clean summaries."
            />
          ) : (
            <div className="space-y-3">
              {convMessages.map((message, index) =>
                message.role === "agent" || message.role === "assistant" ? (
                  <div key={`${message.role}-${index}`} className="flex items-end gap-2 justify-start">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-500/15 text-xs font-black text-blue-500">
                      AI
                    </div>
                    <div className="connector-card max-w-[82%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white/80 px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100" style={{ animation: "fadeSlideUp 0.2s ease" }}>
                      {message.text || message.content}
                    </div>
                  </div>
                ) : (
                  <div key={`${message.role}-${index}`} className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-red-500 px-4 py-3 text-sm font-semibold leading-relaxed text-white shadow-[0_10px_22px_rgba(234,67,53,.24)]" style={{ animation: "fadeSlideUp 0.2s ease" }}>
                      {message.text || message.content}
                    </div>
                  </div>
                ),
              )}

              {showTyping ? (
                <div className="flex items-end gap-2 justify-start">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-500/15 text-xs font-black text-blue-500">AI</div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                    {[0, 1, 2].map((dot) => (
                      <span key={dot} className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animation: "typingBounce 0.9s ease infinite", animationDelay: `${dot * 0.12}s` }} />
                    ))}
                  </div>
                </div>
              ) : null}

              {isLoading ? (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                  🧠 Got it — the AI agent is converting your prompt into a live Gmail workflow.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="connector-panel-footer shrink-0 border-t border-slate-200 p-4 dark:border-slate-700">
        {isFieldMode ? (
          <div className="connector-card rounded-[20px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {currentFieldQuestion || `Provide ${fieldLabel}`}
            </div>

            {currentFieldType === "choice" || convStep === "waiting_frequency" ? (
              <div className="flex flex-wrap gap-2">
                {(currentFieldOptions.length ? currentFieldOptions : ["one_time", "automated"]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => submitFieldReply(option)}
                    className="rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white shadow-[0_10px_22px_rgba(234,67,53,.28)]"
                  >
                    {option.replace(/_/g, " ")}
                  </button>
                ))}
                {currentFieldSkippable ? (
                  <button type="button" onClick={() => submitFieldReply("skip")} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    Skip
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitFieldReply();
                  }}
                  type={currentFieldType === "email" || convStep === "waiting_email" ? "email" : "text"}
                  placeholder={currentFieldType === "email" || convStep === "waiting_email" ? "name@example.com" : `Enter ${fieldLabel}`}
                  className="connector-input min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button type="button" onClick={() => submitFieldReply()} className="rounded-full bg-red-500 px-5 py-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(234,67,53,.28)]">
                  Send
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="connector-input-wrap flex h-28 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleRunWorkflow();
                }
              }}
              disabled={isLoading}
              className="connector-input flex-1 resize-none bg-transparent p-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-white"
              placeholder="Type your Gmail workflow here..."
            />
            <div className="flex h-11 items-center justify-between border-t border-slate-200 px-3 dark:border-slate-800">
              <div className="hidden items-center gap-2 text-sm text-slate-500 dark:text-slate-400 sm:flex">
                <span>📎</span><span>🏷️</span><span>🔽</span><span className="text-xs">to: <b className="text-slate-950 dark:text-white">gmail-agent</b></span>
              </div>
              <button onClick={handleRunWorkflow} disabled={isLoading} className="ml-auto rounded-full bg-red-500 px-4 py-2 text-xs font-black text-white shadow-[0_10px_22px_rgba(234,67,53,.28)] disabled:opacity-70">
                {isLoading ? "⏳ Running..." : "🚀 Run workflow"}
              </button>
            </div>
          </div>
        )}
        <div className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">{statusMessage}</div>
      </div>
    </section>
  );
}
