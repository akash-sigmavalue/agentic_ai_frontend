"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Upload, Send, FileText, Image, Loader2 } from "lucide-react";

import {
  API_BASE_URL,
  askQuestionStreamRequest,
  highlightRectsRequest,
  parseApiError,
  uploadDocumentRequest,
} from "../../lib/user_input/api-client";
import type { GraphNodeId, PipelineDurations } from "../../types/agents";
import type { AskResult, Chunk, HighlightRect, HighlightResponse, TokenUsage, UploadResult } from "../../types/api";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const CustomPdfViewer = dynamic(() => import("./CustomPdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center p-10 text-slate-400">
      Loading PDF viewer...
    </div>
  ),
});

function normalizeAnswerMarkdown(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\n(?=\d+\.\s+)/g, "\n\n")
    .replace(/\n(?=(?:Reference|Source):)/gi, "\n\n")
    .replace(/^(Reference|Source):/gim, "**$1:**");
}

function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none text-[#1e293b] text-[15px] leading-[1.7]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 text-[#0f172a] tracking-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-8 mb-3 pb-1 border-b border-slate-200 text-[#0f172a]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-6 mb-2 text-[#0f172a]">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-5 mb-2 text-[#0f172a]">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-4 leading-relaxed text-slate-700">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          ul: ({ children }) => (
            <ul className="my-4 space-y-1.5 pl-5 list-disc marker:text-blue-500">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 space-y-1.5 pl-5 list-decimal marker:font-semibold marker:text-blue-600">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1 text-slate-700">{children}</li>,
          img: ({ src, alt }) =>
            src ? (
              <img
                src={src}
                alt={alt || ""}
                className="my-5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm max-h-[480px] object-contain"
              />
            ) : null,
          table: ({ children }) => (
            <div className="my-5 w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-r border-slate-200 bg-slate-50 px-4 py-2.5 text-left font-semibold text-slate-700 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-r border-slate-100 px-4 py-2.5 text-left text-slate-600 last:border-r-0">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-5 rounded-r-xl border-l-4 border-blue-500 bg-blue-50/50 px-5 py-3 italic text-slate-700">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }: any) =>
            !className?.includes('language-') ? (
              <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-rose-600" {...props}>
                {children}
              </code>
            ) : (
              <code className={`block rounded-lg bg-slate-800 p-4 font-mono text-sm text-slate-100 overflow-x-auto ${className || ''}`} {...props}>
                {children}
              </code>
            ),
        }}
      >
        {normalizeAnswerMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

function chunkImageSrc(chunk: Chunk) {
  if (!chunk.image_base64) return "";
  return `data:${chunk.image_mime || "image/png"};base64,${chunk.image_base64}`;
}

function formatDuration(ms?: number | null) {
  if (ms == null) return "";
  const seconds = ms / 1000;
  if (seconds < 1) return "< 1s";
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
}

function parseChunkPage(chunk: Chunk | null): number {
  if (!chunk) return 1;
  const raw = chunk.page_range?.split("-")[0]?.trim() || chunk.page?.trim() || "1";
  if (raw === "unknown") return 1;
  const page = parseInt(raw, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function getSearchTerm(chunkContent?: string) {
  if (!chunkContent) return "";
  const cleaned = chunkContent
    .replace(/\[\[PAGE_BREAK:\d+\]\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // PDF text layers use small fragments; a shorter snippet matches more reliably
  return cleaned;  //cleaned.slice(0, 100);
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function StepperPipelineGraph({
  active,
  ready,
  durations,
  totalDuration,
}: {
  active: GraphNodeId | null;
  ready: boolean;
  durations: PipelineDurations;
  totalDuration: number | null;
}) {
  const nodes: { id: GraphNodeId; label: string; sub?: string }[] = [
    { id: "start", label: "Load", sub: "Document ready" },
    { id: "retrieve", label: "Retrieve", sub: "FAISS + BM25 + Rerank" },
    { id: "generate", label: "Generate", sub: "Kimi 2.5 · temp 0.1" },
    { id: "end", label: "Complete", sub: "Answer delivered" },
  ];
  const activeIndex = active ? nodes.findIndex((node) => node.id === active) : -1;

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          LangGraph Pipeline
        </p>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {totalDuration ? `Total ${formatDuration(totalDuration)}` : active ? "Running" : ready ? "Ready" : "Idle"}
        </span>
      </div>

      <div className="flex items-start justify-between gap-1">
        {nodes.map((node, idx) => {
          const isActive = active === node.id;
          const duration = durations[node.id];
          const isComplete = duration != null || (activeIndex !== -1 && activeIndex > idx);
          const status = isComplete ? "complete" : isActive ? "active" : "pending";

          return (
            <div key={node.id} className="flex flex-1 flex-col items-center text-center">
              <div
                className={`relative mb-2 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${status === "complete"
                    ? "border-green-500 bg-green-50"
                    : status === "active"
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-slate-200 bg-white"
                  }`}
              >
                {status === "complete" ? (
                  <Check className="h-4 w-4 text-green-600" strokeWidth={2.5} />
                ) : status === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                )}
              </div>
              <p className={`text-xs font-semibold ${status === "active" ? "text-blue-600" : "text-slate-700"}`}>
                {node.label}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                {duration != null ? formatDuration(duration) : status === "active" ? "in progress" : node.sub}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DocumentReader() {
  const [files, setFiles] = useState<File[]>([]);
  const [question, setQuestion] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState<"upload" | "ask" | null>(null);
  const [error, setError] = useState("");
  const [activeNode, setActiveNode] = useState<GraphNodeId | null>(null);
  const [stageDurations, setStageDurations] = useState<PipelineDurations>({});
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfUrlsBySource, setPdfUrlsBySource] = useState<Record<string, string>>({});
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);
  const [highlightLoading, setHighlightLoading] = useState(false);
  const [highlightError, setHighlightError] = useState<string | null>(null);
  const highlightRequestIdRef = useRef(0);
  const router = useRouter();

  const tokenUsage = useMemo<TokenUsage>(
    () => askResult?.token_usage || uploadResult?.token_usage || { input: 0, output: 0 },
    [askResult, uploadResult]
  );

  const answerImages = useMemo(
    () => askResult?.chunks.filter((chunk) => chunk.type === "image" && chunk.image_base64) || [],
    [askResult]
  );

  const activeChunk = useMemo(
    () => (activeChunkIndex != null ? askResult?.chunks[activeChunkIndex] ?? null : null),
    [activeChunkIndex, askResult]
  );
  const activePdfUrl = activeChunk ? pdfUrlsBySource[activeChunk.source] || pdfUrl : pdfUrl;

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Please select at least one file (PDF, DOCX, or image).");
      return;
    }

    setBusy("upload");
    setError("");
    setAskResult(null);
    setActiveNode(null);
    setStageDurations({});
    setTotalDuration(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const response = await uploadDocumentRequest(formData);
      if (!response.ok) throw new Error(await parseApiError(response));
      const result = await response.json();
      setUploadResult(result);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      Object.values(pdfUrlsBySource).forEach((url) => URL.revokeObjectURL(url));

      const nextPdfUrlsBySource: Record<string, string> = {};
      files.filter(isPdfFile).forEach((file) => {
        nextPdfUrlsBySource[file.name] = URL.createObjectURL(file);
      });
      setPdfUrlsBySource(nextPdfUrlsBySource);
      setPdfUrl(Object.values(nextPdfUrlsBySource)[0] || null);
      setMessages([]);
      setActiveChunkIndex(null);
      setHighlightRects([]);
      setHighlightError(null);
    } catch (err) {
      setError(err instanceof Error ? `${err.message} (${API_BASE_URL})` : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleAsk(questionText: string) {
    if (!questionText.trim()) {
      setError("Please enter a question.");
      return;
    }

    setBusy("ask");
    setError("");
    setStageDurations({});
    setTotalDuration(null);
    setActiveNode("start");

    try {
      const totalStartedAt = performance.now();
      const retrieveStartedAt = performance.now();
      setStageDurations((prev) => ({ ...prev, start: retrieveStartedAt - totalStartedAt }));
      setActiveNode("retrieve");

      setMessages((prev) => [...prev, { role: "user", content: questionText }]);
      setQuestion("");
      setActiveChunkIndex(null);
      setHighlightRects([]);
      setHighlightError(null);

      const response = await askQuestionStreamRequest(questionText, sessionId);
      if (!response.ok) throw new Error(await parseApiError(response));

      const generateStartedAt = performance.now();
      setStageDurations((prev) => ({ ...prev, retrieve: generateStartedAt - retrieveStartedAt }));

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No response body");

      setActiveNode("generate");
      let fullAnswer = "";
      setAskResult({ answer: "", chunks: [], token_usage: { input: 0, output: 0 }, verified: false, suggested_questions: [] });

      let buffer = "";
      let completed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const lines = message.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (!dataStr) continue;
              let data;
              try {
                data = JSON.parse(dataStr);
              } catch {
                continue;
              }

              if (data.type === "token") {
                fullAnswer += data.content;
                setAskResult((prev) => (prev ? { ...prev, answer: fullAnswer } : null));
              } else if (data.type === "status") {
                if (data.stage === "retrieve" || data.stage === "generate") {
                  setActiveNode(data.stage);
                }
              } else if (data.type === "done") {
                const completeStartedAt = performance.now();
                const finalAnswer = data.answer || fullAnswer;
                fullAnswer = finalAnswer;
                setAskResult({
                  answer: finalAnswer,
                  chunks: data.chunks,
                  token_usage: data.token_usage,
                  verified: Boolean(data.verified),
                  suggested_questions: data.suggested_questions || [],
                });
                const completedAt = performance.now();
                setStageDurations((prev) => ({
                  ...prev,
                  generate: prev.generate ?? completeStartedAt - generateStartedAt,
                  end: completedAt - completeStartedAt,
                }));
                setTotalDuration(completedAt - totalStartedAt);
                setActiveNode("end");
                setMessages((prev) => [...prev, { role: "assistant", content: finalAnswer }]);
                completed = true;
              } else if (data.type === "error") {
                throw new Error(data.content || "Streaming error.");
              }
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
      }

      if (!completed) {
        const completedAt = performance.now();
        setStageDurations((prev) => ({
          ...prev,
          generate: prev.generate ?? completedAt - generateStartedAt,
          end: 0,
        }));
        setTotalDuration(completedAt - totalStartedAt);
        setActiveNode("end");
      }
    } catch (err) {
      setError(err instanceof Error ? `${err.message} (${API_BASE_URL})` : "Request failed.");
      setActiveNode(null);
    } finally {
      setBusy(null);
    }
  }

  async function askQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAsk(question);
  }

  const onSelectSuggestedQuestion = (suggestedQ: string) => {
    setQuestion(suggestedQ);
    handleAsk(suggestedQ);
  };

  async function handleChunkSelect(chunk: Chunk, idx: number) {
    setActiveChunkIndex(idx);
    setHighlightRects([]);
    setHighlightError(null);

    const requestId = highlightRequestIdRef.current + 1;
    highlightRequestIdRef.current = requestId;

    const pageNumber = parseChunkPage(chunk);
    const chunkText = chunk.text || chunk.content || "";

    if (!chunk.document_id || !chunkText.trim()) {
      setHighlightError("Page opened, but exact text highlight could not be matched.");
      return;
    }

    try {
      setHighlightLoading(true);
      const response = await highlightRectsRequest(chunk.document_id, pageNumber, chunkText);
      const data = (await response.json()) as HighlightResponse;

      if (highlightRequestIdRef.current !== requestId) return;

      if (!response.ok || !data.success) {
        setHighlightRects([]);
        setHighlightError(data.message || "Page opened, but exact text highlight could not be matched.");
        return;
      }

      setHighlightRects(data.rects || []);
      setHighlightError(null);
    } catch {
      if (highlightRequestIdRef.current !== requestId) return;
      setHighlightRects([]);
      setHighlightError("Page opened, but highlight request failed.");
    } finally {
      if (highlightRequestIdRef.current === requestId) {
        setHighlightLoading(false);
      }
    }
  }

  return (
    <main className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 to-white p-5 font-sans antialiased">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/70 px-6 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <img
            onClick={() => router.push("/")}
            src="user_input/DS.jpeg"
            alt="Logo"
            className="h-10 w-auto cursor-pointer rounded-lg object-contain transition-opacity hover:opacity-80"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">User Input Data Agent</h1>
            <p className="text-sm text-slate-500">Upload a document and ask anything</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 shadow-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
          <span>🔤 Input: {tokenUsage.input}</span>
          <span>💬 Output: {tokenUsage.output}</span>
        </div>
      </div>

      {/* 3-pane grid */}
      <div className="grid h-[calc(100%-80px)] grid-cols-[24%_44%_30%] gap-5 min-h-0">
        {/* LEFT PANEL: Upload & Chat */}
        <div className="flex flex-col gap-5 min-h-0">
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <form onSubmit={uploadDocument} className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Upload</label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.bmp"
                  multiple
                  className="w-full cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(event) => setFiles(event.target.files ? Array.from(event.target.files) : [])}
                />
              </div>
              <button
                type="submit"
                disabled={busy === "upload" || files.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {busy === "upload" ? "Processing..." : "Process Documents"}
              </button>
            </form>
            {uploadResult && (
              <div className="mt-4 rounded-lg bg-green-50 p-2 text-center text-xs font-medium text-green-700">
                ✓ Processed {uploadResult.chunk_count} chunks
              </div>
            )}
            {busy === "ask" && <StepperPipelineGraph active={activeNode} ready={Boolean(uploadResult)} durations={stageDurations} totalDuration={totalDuration} />}
          </div>

          <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm min-h-0">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Chat History</h3>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="mt-20 text-center text-sm text-slate-400">Ask a question to start the conversation</p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.role === "user"
                    ? "ml-auto bg-blue-600 text-black"
                    : "bg-slate-100 text-slate-800"
                    }`}
                >
                  {m.role === "assistant" ? <MarkdownAnswer content={m.content} /> : m.content}
                </div>
              ))}
              {busy === "ask" && (
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 p-3">
              <form onSubmit={askQuestion} className="flex gap-2">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about your document..."
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-black focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!busy && uploadResult && question.trim()) askQuestion(e as any);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={busy === "ask" || !uploadResult || !question.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 text-black shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* MIDDLE PANEL: Chunks + Output */}
        <div className="flex flex-col gap-5 min-h-0">
          <div className="flex h-2/5 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm min-h-0">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Retrieved Chunks</h3>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {!askResult?.chunks.length && (
                <p className="mt-12 text-center text-sm text-slate-400">Relevant excerpts will appear here</p>
              )}
              {askResult?.chunks.slice(0, 10).map((chunk, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleChunkSelect(chunk, idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleChunkSelect(chunk, idx);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-3 transition-all hover:shadow-md ${activeChunkIndex === idx ? "border-blue-400 bg-blue-50/50 shadow-sm ring-1 ring-blue-200" : "border-slate-200 hover:border-blue-200"
                    }`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      <FileText className="h-3 w-3" />
                      {chunk.source}
                    </span>
                    <div className="flex gap-2">
                      {chunk.confidence_score !== undefined && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Score: {chunk.confidence_score.toFixed(2)}
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Page {chunk.page_range || chunk.page}
                      </span>
                    </div>
                  </div>
                  {chunk.type === "image" && chunk.image_base64 ? (
                    <img src={chunkImageSrc(chunk)} alt="chunk visual" className="max-h-32 w-full rounded-lg border object-contain bg-white" />
                  ) : (
                    <div className="max-h-[180px] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-600">{chunk.content}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex h-3/5 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm min-h-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Latest Answer</h3>
              {askResult?.verified && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Verified</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {askResult ? (
                <div className="space-y-6">
                  <MarkdownAnswer content={askResult.answer} />
                  {answerImages.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-700">Supporting Images</h4>
                      <div className="grid gap-3">
                        {answerImages.map((chunk, idx) => (
                          <figure key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                            <img src={chunkImageSrc(chunk)} alt="supporting" className="max-h-64 w-full rounded-lg object-contain" />
                          </figure>
                        ))}
                      </div>
                    </div>
                  )}
                  {(askResult.suggested_questions?.length ?? 0) > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Suggested Follow‑ups</h4>
                      <div className="flex flex-wrap gap-2">
                        {askResult.suggested_questions?.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => onSelectSuggestedQuestion(q)}
                            disabled={busy === "ask"}
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                  Upload a document and ask a question to see the answer
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Document Viewer */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm min-h-0">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Viewer</h3>
              {activeChunk && activePdfUrl && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  Page {activeChunk.page_range || activeChunk.page}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden rounded-b-2xl bg-slate-100">
            {(highlightLoading || highlightError) && activePdfUrl && (
              <div className="border-b border-slate-200 bg-white/90 px-4 py-2 text-xs font-medium text-slate-600">
                {highlightLoading ? "Finding text highlight..." : highlightError}
              </div>
            )}
            {activePdfUrl ? (
              <div className="min-h-0 flex-1">
                <CustomPdfViewer
                  key={`${activeChunkIndex ?? "none"}-${parseChunkPage(activeChunk)}`}
                  pdfUrl={activePdfUrl}
                  pageNumber={parseChunkPage(activeChunk)}
                  searchText={getSearchTerm(activeChunk?.content)}
                  highlightRects={highlightRects}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-slate-400">
                <Image className="mb-2 h-10 w-10 opacity-40" />
                {uploadResult
                  ? "PDF preview is available for PDF uploads. Upload a PDF to jump to chunk pages."
                  : "Upload a document to preview it here."}
                <br />
                Click on any chunk to jump to its page.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
