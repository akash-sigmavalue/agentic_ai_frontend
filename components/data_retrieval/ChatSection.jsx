"use client";

import { useEffect, useRef } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function ResultTable({ resultSet }) {
  const columns = Array.isArray(resultSet?.columns) ? resultSet.columns : [];
  const rows = Array.isArray(resultSet?.rows) ? resultSet.rows : [];

  if (!columns.length) {
    return null;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)" }}>
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2 text-[11px]" style={{ borderColor: "var(--border-soft)", color: "var(--text-muted)" }}>
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{resultSet?.title || "Database Rows"}</span>
        <span>{rows.length} rows</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left">
          <thead className="text-[11px] uppercase" style={{ background: "var(--bg-card-strong)", color: "var(--text-primary)" }}>
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${resultSet?.domain || "result"}-${rowIndex}`}>
                {columns.map((column) => (
                  <td
                    key={`${column}-${rowIndex}`}
                    className="max-w-[240px] border-t px-3 py-2 align-top text-xs"
                    style={{ borderColor: "var(--border-dim)", color: "var(--text-secondary)", wordBreak: "break-word" }}
                  >
                    {formatCellValue(row?.[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ChatSection({
  messages,
  input,
  onInputChange,
  onSubmit,
  isStreaming,
  metricsText,
  clarificationState,
  onClarificationToggle,
  onClarificationOtherChange,
  onClear,
  backendLabel = "Backend SSE",
}) {
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const canSubmit =
    clarificationState.awaiting
      ? clarificationState.selectedOptions.length > 0 || Boolean(clarificationState.otherText.trim()) || Boolean(input.trim())
      : Boolean(input.trim());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [input]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit?.();
    }
  }

  return (
    <section className="app-panel h-full min-h-0 lg:max-h-[calc(100vh-11rem)] transition-shadow duration-200 hover:shadow-[0_0_0_1px_var(--accent),0_18px_48px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-3 border-b px-[18px] py-3.5" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[15px]" style={{ background: "var(--accent-glow)", color: "var(--accent-light)" }}>💬</div>
        <div>
          <h2 className="m-0 text-[13px] font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>AI Assistant</h2>
          <p className="m-0 text-[10px]" style={{ color: "var(--text-muted)" }}>Live backend conversation</p>
        </div>
        <small className="ml-auto text-[10px]" style={{ color: "var(--text-muted)" }}>{backendLabel}</small>
      </div>

      <div className="panel-scroll flex flex-col gap-3.5">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-2xl" style={{ background: "var(--accent-glow)", color: "var(--accent-light)" }}>🤖</div>
            <h3 className="m-0 text-[15px] font-semibold" style={{ color: "var(--text-secondary)" }}>How can I help you?</h3>
            <p className="m-0 max-w-[220px] text-xs leading-6" style={{ color: "var(--text-muted)" }}>
              Ask a real-estate question and this panel will stream the answer from your FastAPI backend.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"}`}>
                <span className="px-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {message.role === "user" ? "You" : "Agent"} · {formatTime(message.time)}
                </span>
                <div
                  className="max-w-[88%] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={{
                    background: message.role === "user" ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))" : "var(--bg-card)",
                    color: "var(--text-primary)",
                    border: `1px solid ${message.role === "user" ? "color-mix(in srgb, var(--accent) 28%, transparent)" : "var(--border-soft)"}`,
                  }}
                >
                  {message.role === "user" ? (
                    message.content
                  ) : (
                    <>
                      {message.content ? <MarkdownRenderer>{message.content}</MarkdownRenderer> : isStreaming ? <span className="cursor-blink" /> : null}
                      {Array.isArray(message.resultSets) ? message.resultSets.map((resultSet, resultIndex) => (
                        <ResultTable
                          key={`${message.id || index}-result-${resultSet?.domain || "domain"}-${resultIndex}`}
                          resultSet={resultSet}
                        />
                      )) : null}
                      {message.clarification ? (
                        <div className="mt-4 border-t pt-4" style={{ borderColor: "color-mix(in srgb, var(--warning) 18%, transparent)" }}>
                          <p className="m-0 text-sm" style={{ color: "var(--text-primary)" }}>{message.clarification.message}</p>
                          {Array.isArray(message.clarification.questions) && message.clarification.questions.length > 0 ? (
                            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
                              {message.clarification.questions.map((line, questionIndex) => (
                                <li key={questionIndex}>{line}</li>
                              ))}
                            </ol>
                          ) : null}
                          {message.clarification.clarification_type === "space_filter" ? (
                            <div className="mt-4">
                              <div className="grid gap-3 sm:grid-cols-2">
                                {(message.clarification.options || []).map((option) => {
                                  const checked = clarificationState.selectedOptions.includes(option.id);
                                  return (
                                    <label
                                      key={option.id}
                                      className="flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
                                      style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-primary)" }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onClarificationToggle?.(option.id)}
                                        className="h-4 w-4"
                                      />
                                      <span>{option.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                              {clarificationState.selectedOptions.includes("other") ? (
                                <div className="mt-4">
                                  <label className="mb-2 block text-xs uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
                                    Other details
                                  </label>
                                  <input
                                    value={clarificationState.otherText}
                                    onChange={(event) => onClarificationOtherChange?.(event.target.value)}
                                    className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
                                    style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                                    placeholder="Add the space detail you have..."
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center justify-between px-4 pb-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
        <div className="flex items-center gap-2.5">{messages.length > 0 ? <span>{messages.filter((message) => message.role === "user").length} turns</span> : null}</div>
        <div className="flex items-center gap-2">
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md border px-2.5 py-[3px] text-[10px]"
              style={{ borderColor: "var(--border-soft)", color: "var(--text-muted)" }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-t p-3" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
        <div className="flex items-end gap-2 rounded-xl border px-3.5 py-2 transition-all duration-200" style={{ borderColor: "var(--border-soft)", background: "var(--bg-input)" }}>
          <textarea
            ref={textareaRef}
            className="min-h-[22px] max-h-[120px] flex-1 resize-none bg-transparent text-[13px] leading-normal outline-none"
            style={{ color: "var(--text-primary)" }}
            placeholder={clarificationState.awaiting ? "Answer the clarification and press Execute..." : "Type your real-estate query..."}
            value={input}
            onChange={(event) => onInputChange?.(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
          />
          <button
            type="button"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border-none text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--accent)" }}
            onClick={onSubmit}
            disabled={isStreaming || !canSubmit}
            title="Send message"
          >
            <SendIcon />
          </button>
        </div>
        <div className="mt-1.5 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
          {metricsText}
        </div>
      </div>
    </section>
  );
}
