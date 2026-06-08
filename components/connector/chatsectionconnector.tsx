"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, Send } from "lucide-react";
import {
  extractEmailsFromText,
  inferExecutionType,
} from "./types";
import type { ConvMessage, ConvStep, WorkflowResponse } from "./types";

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
  response?: Pick<
    WorkflowResponse,
    "from_email" | "to" | "execution_type" | "analysis" | "final_answer" | "reply_draft" | "reply"
  > | null;
  partialIntent?: {
    to?: string | null;
  } | null;
};

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
  response = null,
  partialIntent = null,
}: ChatSectionConnectorProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  void statusMessage;
  const showTyping =
    convStep === "waiting_email" ||
    convStep === "waiting_frequency" ||
    convStep === "waiting_field";

  const skippedEmail =
    extractEmailsFromText(prompt)[0] ||
    response?.from_email ||
    response?.to ||
    partialIntent?.to ||
    "";
  const skippedFrequency = inferExecutionType(prompt, response?.execution_type);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convMessages, showTyping]);

  useEffect(() => {
    if (convStep === "waiting_email" && skippedEmail) {
      handleConvUserReply(skippedEmail);
      return;
    }

    if (convStep === "waiting_frequency" && skippedFrequency) {
      handleConvUserReply(skippedFrequency);
    }
  }, [convStep, handleConvUserReply, skippedEmail, skippedFrequency]);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      style={{ height: "100%" }}
    >
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#525ceb] text-sm font-semibold text-white">
          AI
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Workflow Assistant</p>
          <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
            {convStep === "idle" ? (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>Ready</span>
              </>
            ) : convStep === "submitting" ? (
              <>
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                <span>Processing...</span>
              </>
            ) : convStep === "streaming" ? (
              <>
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                <span>Executing steps...</span>
              </>
            ) : convStep === "done" ? (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Done</span>
              </>
            ) : (
              <>
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                <span>Thinking...</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4"
      >
        {convStep === "idle" && convMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-center text-sm text-slate-400">
              Describe your Gmail workflow above
            </p>
          </div>
        ) : (
          <>
            {convMessages.map((message, index) =>
              message.role === "agent" || message.role === "assistant" ? (
                <div
                  key={`${message.role}-${index}`}
                  className="flex items-end justify-start gap-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#525ceb] text-[10px] font-semibold text-white">
                    AI
                  </div>
                  <div
                    className="max-w-[78%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-800"
                    style={{ animation: "fadeSlideUp 0.2s ease" }}
                  >
                    {message.text || message.content}
                  </div>
                </div>
              ) : (
                <div key={`${message.role}-${index}`} className="flex justify-end">
                  <div
                    className="max-w-[78%] rounded-2xl rounded-br-sm bg-[#525ceb] px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm shadow-indigo-200"
                    style={{ animation: "fadeSlideUp 0.2s ease" }}
                  >
                    {message.text || message.content}
                  </div>
                </div>
              ),
            )}

            {showTyping && (
              <div className="flex items-end justify-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#525ceb] text-[10px] font-semibold text-white">
                  AI
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"
                    style={{ animation: "typingBounce 0.9s ease infinite" }}
                  />
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"
                    style={{ animation: "typingBounce 0.9s ease infinite 0.15s" }}
                  />
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"
                    style={{ animation: "typingBounce 0.9s ease infinite 0.3s" }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        {convStep === "waiting_field" ||
        convStep === "waiting_email" ||
        convStep === "waiting_frequency" ? (
          convStep === "waiting_email" && skippedEmail ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              <span>✓</span> Email skipped: Using {skippedEmail}
            </div>
          ) : convStep === "waiting_frequency" && skippedFrequency ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              <span>✓</span> Frequency skipped: Running as {skippedFrequency.replace("_", "-")}
            </div>
          ) : currentFieldType === "choice" ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                {(currentFieldOptions.length > 0
                  ? currentFieldOptions
                  : convStep === "waiting_frequency"
                    ? ["one_time", "automated"]
                    : []
                ).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleConvUserReply(option)}
                    disabled={isLoading}
                    className="flex-1 rounded-2xl border border-[#525ceb] px-4 py-2.5 text-sm font-semibold text-[#525ceb] transition hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {currentFieldName === "action_mode"
                      ? option === "send"
                        ? "Send automatically"
                        : option === "draft"
                          ? "Save as draft"
                          : option === "one_time"
                            ? "Run once now"
                            : option === "automated"
                              ? "Automate (every new email)"
                              : option
                      : option === "one_time"
                        ? "Run once now"
                        : option === "automated"
                          ? "Automate (every new email)"
                          : option}
                  </button>
                ))}
              </div>

              {currentFieldSkippable && (
                <button
                  type="button"
                  onClick={() => handleConvUserReply("skip")}
                  disabled={isLoading}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Skip
                </button>
              )}
            </div>
          ) : currentFieldType === "email" || convStep === "waiting_email" ? (
            <div className="space-y-2">
              {currentFieldQuestion ? (
                <p className="text-xs font-medium leading-relaxed text-slate-500">
                  {currentFieldQuestion}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputValue.trim()) {
                      handleConvUserReply(inputValue.trim());
                      setInputValue("");
                    }
                  }}
                  placeholder="email@example.com"
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-300 focus:bg-white"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (inputValue.trim()) {
                      handleConvUserReply(inputValue.trim());
                      setInputValue("");
                    }
                  }}
                  disabled={!inputValue.trim() || isLoading}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#525ceb] text-white transition hover:bg-[#434dd8] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : currentFieldType === "text_optional" ? (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (inputValue.trim()) {
                        handleConvUserReply(inputValue.trim());
                        setInputValue("");
                      }
                    }
                  }}
                  className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white"
                  placeholder="Type your answer or skip..."
                  rows={2}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (inputValue.trim()) {
                      handleConvUserReply(inputValue.trim());
                      setInputValue("");
                    }
                  }}
                  disabled={!inputValue.trim() || isLoading}
                  className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#525ceb] text-white transition hover:bg-[#434dd8] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleConvUserReply("skip")}
                disabled={isLoading || !currentFieldSkippable}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputValue.trim()) {
                    handleConvUserReply(inputValue.trim());
                    setInputValue("");
                  }
                }}
                placeholder={currentFieldQuestion || "Type your answer..."}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-300 focus:bg-white"
                autoFocus
              />
              <button
                onClick={() => {
                  if (inputValue.trim()) {
                    handleConvUserReply(inputValue.trim());
                    setInputValue("");
                  }
                }}
                disabled={!inputValue.trim() || isLoading}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#525ceb] text-white transition hover:bg-[#434dd8] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )
        ) : convStep === "submitting" || convStep === "streaming" ? (
          <div className="flex items-center gap-2 px-1 text-sm text-slate-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
            {convStep === "streaming"
              ? "Watching agent steps live..."
              : "Setting up your workflow..."}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleRunWorkflow();
                }
              }}
              className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white"
              placeholder={
                convStep === "done"
                  ? "Ask another question or describe a new workflow..."
                  : "Describe your Gmail workflow... (e.g. when John sends me email analyze and reply)"
              }
              rows={3}
            />
            <button
              onClick={() => handleRunWorkflow()}
              disabled={isLoading}
              className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#525ceb] text-white transition hover:bg-[#434dd8] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
