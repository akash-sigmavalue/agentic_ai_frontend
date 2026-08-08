"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Upload, Send, FileText, Image, Loader2, Download, CloudUpload, X, Trash2, FileSpreadsheet, Sparkles, HelpCircle, AlertCircle, CheckCircle2 } from "lucide-react";

import {
  API_BASE_URL,
  askQuestionStreamRequest,
  highlightRectsRequest,
  parseApiError,
  uploadDocumentRequest,
  validateDocumentsRequest,
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

const CustomDocxViewer = dynamic(() => import("./CustomDocxViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center p-10 text-slate-400">
      Loading DOCX viewer...
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

function parseChunkPages(chunk: Chunk | null): number[] {
  if (!chunk) return [1];

  // page_range from backend: "1-5, 10-15, 20" (comma-separated ranges/single pages)
  // page from backend: a single page number (string or number)
  const raw = chunk.page_range || chunk.page || "1";
  const rawStr = String(raw).trim();

  if (!rawStr || rawStr === "unknown") return [1];

  const pages: number[] = [];

  // Split by commas first, then handle each segment as either a range or single page
  for (const segment of rawStr.split(",")) {
    const s = segment.trim();
    if (!s) continue;

    // Range segment: "10-15"
    const dashIdx = s.indexOf("-");
    if (dashIdx > 0) {
      const start = parseInt(s.slice(0, dashIdx).trim(), 10);
      const end   = parseInt(s.slice(dashIdx + 1).trim(), 10);
      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        // Cap range to MAX_PAGES_PER_CHUNK to prevent rendering explosions on
        // large merged chunks (e.g. a 576-page merged document)
        const MAX_PAGES_PER_CHUNK = 10;
        for (let i = start; i <= Math.min(end, start + MAX_PAGES_PER_CHUNK - 1); i++) {
          pages.push(i);
        }
        continue;
      }
    }

    // Single page segment
    const p = parseInt(s, 10);
    if (!isNaN(p) && p > 0) {
      pages.push(p);
    }
  }

  return pages.length > 0 ? [...new Set(pages)].sort((a, b) => a - b) : [1];
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

function highlightChunkText(text: string, searchTerm: string) {
  if (!searchTerm || !text) return text;
  
  // Find the exact match or fall back to returning text
  // Since searchTerm is a cleaned version, we do a simple case-insensitive match for words if possible
  // For robustness, we will just use a simple regex for now.
  const term = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${term})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === searchTerm.toLowerCase() 
      ? <mark key={i} className="bg-yellow-200 text-black px-1 rounded">{part}</mark> 
      : part
  );
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isDocxFile(file: File) {
  return file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith(".docx");
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
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
  const [busyMode, setBusyMode] = useState<"standard" | "vlm" | null>(null);
  const [error, setError] = useState("");
  const [activeNode, setActiveNode] = useState<GraphNodeId | null>(null);
  const [stageDurations, setStageDurations] = useState<PipelineDurations>({});
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileUrlsBySource, setFileUrlsBySource] = useState<Record<string, string>>({});
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);
  const [highlightLoading, setHighlightLoading] = useState(false);
  const [highlightError, setHighlightError] = useState<string | null>(null);
  const highlightRequestIdRef = useRef(0);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const answerContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [initialSuggestions, setInitialSuggestions] = useState<string[]>([]);
  const [vlmModal, setVlmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "error" | "verify";
    detectedElements?: string[];
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "error",
  });

  const [leftWidth, setLeftWidth] = useState(24);
  const [rightWidth, setRightWidth] = useState(30);
  const leftResizingRef = useRef(false);
  const rightResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!leftResizingRef.current && !rightResizingRef.current) return;
      const windowWidth = window.innerWidth;
      if (leftResizingRef.current) {
        let newWidth = (e.clientX / windowWidth) * 100;
        if (newWidth < 15) newWidth = 15;
        if (newWidth > 40) newWidth = 40;
        setLeftWidth(newWidth);
      }
      if (rightResizingRef.current) {
        let newWidth = ((windowWidth - e.clientX) / windowWidth) * 100;
        if (newWidth < 20) newWidth = 20;
        if (newWidth > 50) newWidth = 50;
        setRightWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      leftResizingRef.current = false;
      rightResizingRef.current = false;
      document.body.style.cursor = '';
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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
  const activeFileSource = activeChunk ? activeChunk.source : Object.keys(fileUrlsBySource)[0];
  const activeFileUrl = activeChunk ? fileUrlsBySource[activeChunk.source] || fileUrl : fileUrl;
  const isActiveDocx = activeFileSource?.toLowerCase().endsWith(".docx");
  const isActiveImage = activeFileSource && /\.(png|jpe?g|webp|bmp)$/i.test(activeFileSource);

  async function handleProcessWithMode(mode: "standard" | "vlm", skipValidation = false) {
    if (files.length === 0) {
      setError("Please select at least one file (PDF, DOCX, or image).");
      return;
    }

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    if (mode === "vlm" && !skipValidation) {
      setBusy("upload");
      setBusyMode("vlm");
      setError("");
      try {
        const valRes = await validateDocumentsRequest(formData);
        if (!valRes.ok) {
          const errMsg = await parseApiError(valRes);
          setVlmModal({
            isOpen: true,
            title: "Plain Text Document Detected",
            message: errMsg || "This document contains plain text only and can be processed via standard OCR. Please use the 'Process Documents' button.",
            type: "error",
          });
          setBusy(null);
          setBusyMode(null);
          return;
        }
        const valData = await valRes.json();
        if (!valData.can_process_vlm || valData.only_plain_text) {
          setVlmModal({
            isOpen: true,
            title: "VLM Processing Guardrail",
            message: valData.reason || "This document contains plain text only and can be processed via standard OCR. Please use the 'Process Documents' button.",
            type: "error",
          });
          setBusy(null);
          setBusyMode(null);
          return;
        }

        setVlmModal({
          isOpen: true,
          title: "Verify VLM Document Processing",
          message: "The document contains visual drawings or figures suitable for VLM embedding. Would you like to proceed with VLM Processing?",
          type: "verify",
          detectedElements: valData.detected_visual_elements || [],
        });
        setBusy(null);
        setBusyMode(null);
        return;
      } catch (err: any) {
        console.warn("Validation check error:", err);
      }
    }

    setBusy("upload");
    setBusyMode(mode);
    setError("");
    setAskResult(null);
    setActiveNode(null);
    setStageDurations({});
    setTotalDuration(null);

    formData.append("processing_mode", mode);

    try {
      const response = await uploadDocumentRequest(formData);
      if (!response.ok) throw new Error(await parseApiError(response));
      const result = await response.json();
      setUploadResult(result);
      if ((result as any).suggested_questions) {
        setInitialSuggestions((result as any).suggested_questions);
      } else {
        setInitialSuggestions([]);
      }
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      Object.values(fileUrlsBySource).forEach((url) => URL.revokeObjectURL(url));

      const nextFileUrlsBySource: Record<string, string> = {};
      files.filter(f => isPdfFile(f) || isDocxFile(f) || isImageFile(f)).forEach((file) => {
        nextFileUrlsBySource[file.name] = URL.createObjectURL(file);
      });
      setFileUrlsBySource(nextFileUrlsBySource);
      setFileUrl(Object.values(nextFileUrlsBySource)[0] || null);
      setMessages([]);
      setActiveChunkIndex(null);
      setHighlightRects([]);
      setHighlightError(null);
    } catch (err) {
      setError(err instanceof Error ? `${err.message} (${API_BASE_URL})` : "Upload failed.");
    } finally {
      setBusy(null);
      setBusyMode(null);
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleProcessWithMode("standard");
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

  const onInitialSuggestionClick = (suggestedQ: string) => {
    setInitialSuggestions([]);
    setQuestion(suggestedQ);
    handleAsk(suggestedQ);
  };

  async function handleChunkSelect(chunk: Chunk, idx: number) {
    setActiveChunkIndex(idx);
    setHighlightRects([]);
    setHighlightError(null);

    const requestId = highlightRequestIdRef.current + 1;
    highlightRequestIdRef.current = requestId;

    const pages = parseChunkPages(chunk);
    const primaryPage = pages[0];
    const chunkText = chunk.text || chunk.content || "";

    if (!chunk.document_id || !chunkText.trim()) {
      setHighlightError("Page opened, but exact text highlight could not be matched.");
      return;
    }

    const isDocx = chunk.source?.toLowerCase().endsWith(".docx");
    if (isDocx) {
      setHighlightLoading(false);
      setHighlightError(null);
      return;
    }

    try {
      setHighlightLoading(true);
      const response = await highlightRectsRequest(chunk.document_id, primaryPage, chunkText);
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

  const handleDownloadPdf = () => {
    if (!answerContainerRef.current) {
      alert("No answer to download yet. Ask a question first.");
      return;
    }
    setIsExporting(true);
    try {
      const docName = uploadResult?.document_name || files.map(f => f.name).join(", ") || "Document";
      const timestamp = new Date().toLocaleString();
      const userQuestion = messages.filter(m => m.role === "user").slice(-1)[0]?.content || "Document Analysis";

      // Clone rendered DOM for static extraction
      const clone = answerContainerRef.current.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("button, script, style, hr").forEach(el => el.remove());

      // 1. Remove standalone "Question" and "Answer" label headings only (keep all answer paragraphs and content intact!)
      clone.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(h => {
        const text = h.textContent?.trim().toLowerCase() || "";
        if (text === "question" || text === "answer" || text === "user question" || text === "user query") {
          h.remove();
        }
      });

      // 2. Format and clean tables
      clone.querySelectorAll("table").forEach(table => {
        const rows = Array.from(table.querySelectorAll("tr"));
        rows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll("td, th"));
          if (cells.length >= 2) {
            const valText = cells[1].textContent?.trim().toLowerCase() || "";
            if (!valText || valText === "-" || valText === "—" || valText === "n/a" || valText === "not available" || valText === "none" || valText === "null" || valText === "[not specified]") {
              tr.remove();
            }
          }
        });

        if (table.querySelectorAll("td, th").length === 0) {
          table.remove();
          return;
        }

        table.classList.add("report-table");

        // Calculate max columns across rows
        const maxCols = Math.max(...Array.from(table.querySelectorAll("tr")).map(tr => tr.querySelectorAll("th, td").length));

        if (maxCols === 2) {
          table.classList.add("kv-table");
          table.querySelectorAll("tr").forEach(tr => {
            const tds = tr.querySelectorAll("td");
            if (tds.length >= 1) {
              tds[0].classList.add("kv-key");
            }
          });
        } else {
          table.classList.add("data-table");
          table.querySelectorAll("tr").forEach(tr => {
            const cells = tr.querySelectorAll("td, th");
            if (cells.length > 0) {
              const firstText = cells[0].textContent?.trim() || "";
              if (/^#$|^\d{1,3}$/.test(firstText)) {
                cells[0].classList.add("col-index");
              }
            }
          });
        }
      });

      // 3. Format images into a clean Supporting Evidence grid
      const images = Array.from(clone.querySelectorAll("img"));
      let evidenceCardsHtml = "";
      if (images.length > 0) {
        evidenceCardsHtml = `
          <div class="report-section-header">🖼 Supporting Evidence (Source Images)</div>
          <div class="evidence-grid">
        `;
        images.forEach((img, idx) => {
          const src = img.getAttribute("src") || "";
          const alt = img.getAttribute("alt") || `Source Image ${idx + 1}`;
          evidenceCardsHtml += `
            <div class="evidence-card">
              <img src="${src}" alt="${alt}" class="evidence-img" />
              <div class="evidence-caption">📌 ${alt.includes("Image") || alt.includes("Source") ? alt : `Source Image ${idx + 1}: ${alt}`}</div>
            </div>
          `;
          img.remove();
        });
        evidenceCardsHtml += `</div>`;
      }

      // 4. Clean up empty/duplicate headings at the end
      clone.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(h => {
        const text = h.textContent?.trim() || "";
        if (!text || /^(supporting images|suggested follow-ups|supporting evidence)$/i.test(text)) {
          const next = h.nextElementSibling;
          if (!next || next.tagName.startsWith("H")) {
            h.remove();
            return;
          }
        }
      });

      // 5. Apply clean icons & styles to all section headings
      clone.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(h => {
        let text = h.textContent?.trim() || "";
        if (!text) {
          h.remove();
          return;
        }

        if (/buyer/i.test(text)) {
          h.innerHTML = `👤 ${text}`;
        } else if (/seller|vendor/i.test(text)) {
          h.innerHTML = `🏢 ${text}`;
        } else if (/living room|dimensions|layout plan|flat d-301|area/i.test(text)) {
          h.innerHTML = `📏 ${text}`;
        } else if (/property|land|plot|flat|unit/i.test(text)) {
          h.innerHTML = `🏠 ${text}`;
        } else if (/visual|floor plan|architectural|drawing/i.test(text)) {
          h.innerHTML = `📐 ${text}`;
        } else if (/image \d+|figure \d+|diagram \d+/i.test(text)) {
          h.innerHTML = `🖼 ${text}`;
        } else if (/verification|verify|check|confirm/i.test(text)) {
          h.innerHTML = `✅ ${text}`;
        } else if (/cross-reference|reference|citation/i.test(text)) {
          h.innerHTML = `🔗 ${text}`;
        } else if (/final answer|conclusion|answer/i.test(text)) {
          h.innerHTML = `🎯 ${text}`;
        } else if (/document|registration|meta/i.test(text)) {
          h.innerHTML = `📄 ${text}`;
        } else if (/financial|fee|stamp|consideration|amount|duty/i.test(text)) {
          h.innerHTML = `📊 ${text}`;
        } else if (/summary|overview/i.test(text)) {
          h.innerHTML = `📋 ${text}`;
        } else if (/note|observation|additional/i.test(text)) {
          h.innerHTML = `💡 ${text}`;
        } else {
          h.innerHTML = `📌 ${text}`;
        }
        h.classList.add("report-section-header");
      });

      const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/user_input/sigma_value_logo.jpg` : "/user_input/sigma_value_logo.jpg";

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AI Document Analysis Report — ${docName.replace(/</g, "&lt;")}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 22mm 15mm 20mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #FFFFFF;
      margin: 0;
      padding: 32px;
      font-size: 13px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* Executive Brand Header */
    .report-brand-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 18px;
      border-bottom: 2.5px solid #0F172A;
      margin-bottom: 22px;
    }
    .brand-logo-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      height: 56px;
      width: auto;
      object-fit: contain;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.4px;
      line-height: 1.1;
    }
    .brand-tagline {
      font-size: 11px;
      font-weight: 600;
      color: #0D9488;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-top: 3px;
    }
    .report-meta-right {
      text-align: right;
    }
    .report-type-title {
      font-size: 15px;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .report-date {
      font-size: 11px;
      color: #6B7280;
      margin-top: 3px;
    }

    /* Metadata Bar */
    .doc-info-bar {
      display: flex;
      justify-content: space-between;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #0D9488;
      border-radius: 6px;
      padding: 10px 16px;
      margin-bottom: 22px;
      font-size: 11.5px;
      color: #334155;
    }
    .doc-info-item {
      display: flex;
      gap: 6px;
    }
    .doc-info-label {
      font-weight: 700;
      color: #0F172A;
    }

    /* User Query Box */
    .user-query-card {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .user-query-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
      margin-bottom: 4px;
    }
    .user-query-text {
      font-size: 13.5px;
      font-weight: 600;
      color: #0F172A;
      margin: 0;
    }

    /* Section Headings */
    .report-section-header, h1, h2, h3, h4 {
      font-size: 14.5px;
      font-weight: 700;
      color: #0F172A;
      margin-top: 24px;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 1.5px solid #E2E8F0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Professional Executive Report Tables */
    .report-table, table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 16px 0 24px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      page-break-inside: avoid;
    }

    /* Table Headers — Forced High Contrast Dark Navy Header */
    .report-table th, .data-table th, .kv-table th, table th, th {
      background-color: #0F172A !important;
      background: #0F172A !important;
      color: #FFFFFF !important;
      font-weight: 800 !important;
      font-size: 11.5px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.8px !important;
      padding: 11px 14px !important;
      text-align: left !important;
      border-bottom: 2px solid #0F172A !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* Table Body Cells */
    .report-table td, table td {
      padding: 10px 14px;
      font-size: 12.5px;
      color: #1E293B;
      line-height: 1.5;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
    }

    /* Alternating Row Striping for Data Tables */
    .data-table tr:nth-child(even) td {
      background-color: #F8FAFC !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .report-table tr:last-child td {
      border-bottom: none;
    }

    /* Key Column for 2-column KV Tables */
    .kv-key {
      font-weight: 600;
      color: #334155;
      width: 32%;
      background-color: #F8FAFC !important;
      border-right: 1px solid #E2E8F0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Index Column for Multi-Column Data Tables */
    .col-index {
      width: 44px;
      text-align: center;
      font-weight: 700;
      color: #475569;
      background-color: #F8FAFC !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Paragraphs and Lists */
    p { margin: 0 0 12px; color: #334155; }
    ul, ol { margin: 10px 0 16px; padding-left: 20px; }
    li { margin-bottom: 6px; color: #334155; }
    strong { color: #0F172A; font-weight: 600; }

    /* Evidence Grid */
    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-top: 14px;
    }
    .evidence-card {
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px;
      background: #FAFAFA;
      page-break-inside: avoid;
    }
    .evidence-img {
      width: 100%;
      height: auto;
      max-height: 320px;
      object-fit: contain;
      border-radius: 4px;
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
    }
    .evidence-caption {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-top: 6px;
    }

    /* Footer */
    .report-footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94A3B8;
    }

    @media print {
      @page {
        margin: 22mm 15mm 20mm 15mm;
      }
      *, *::before, *::after, body, table, th, td, div {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { padding: 0; background: white; }
      .no-print { display: none !important; }
      .report-section-header, h1, h2, h3, h4 {
        page-break-after: avoid;
        margin-top: 24px !important;
        padding-top: 8px !important;
      }
      .evidence-card, .report-table, table, .user-query-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Executive Header -->
  <div class="report-brand-header">
    <div class="brand-logo-wrap">
      <img src="${logoUrl}" alt="Sigma Value" class="brand-logo" />
      <div class="brand-text">
        <span class="brand-name">Sigma Value</span>
        <span class="brand-tagline">AI Document Intelligence</span>
      </div>
    </div>
    <div class="report-meta-right">
      <div class="report-type-title">AI Document Analysis Report</div>
      <div class="report-date">Generated on ${timestamp}</div>
    </div>
  </div>

  <!-- Document Meta Bar -->
  <div class="doc-info-bar">
    <div class="doc-info-item"><span class="doc-info-label">Document:</span> ${docName.replace(/</g, "&lt;")}</div>
    <div class="doc-info-item"><span class="doc-info-label">Analysis Engine:</span> Sigma Value RAG Intelligence</div>
    <div class="doc-info-item"><span class="doc-info-label">Status:</span> Verified Extraction</div>
  </div>

  <!-- User Query -->
  <div class="user-query-card">
    <div class="user-query-label">User Query</div>
    <div class="user-query-text">${userQuestion.replace(/</g, "&lt;")}</div>
  </div>

  <!-- Report Body -->
  <div class="report-body">
    ${clone.innerHTML}
    ${evidenceCardsHtml}
  </div>

  <!-- Report Footer -->
  <div class="report-footer">
    <div>Confidential — For Internal Document Analysis Only</div>
    <div>Sigma Value AI System</div>
  </div>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      } else {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SigmaValue-AI-Analysis-Report-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error("Export failed:", err);
      alert(`Export failed: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };



  return (
    <main className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 to-white p-5 font-sans antialiased">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/70 px-6 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <img
            onClick={() => router.push("/")}
            src="user_input/sigma_value_logo.jpg"
            alt="SigmaValue Logo"
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

      {/* 3-pane flex layout */}
      <div className="flex h-[calc(100%-80px)] w-full gap-2 min-h-0">
        {/* LEFT PANEL: Upload & Chat */}
        <div className="flex flex-col gap-5 min-h-0" style={{ width: `${leftWidth}%` }}>
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <form onSubmit={uploadDocument} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Upload</label>
                <div className="flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200 shadow-2xs">
                  <span>⭐ Dual Engine</span>
                </div>
              </div>
              
              <div className="flex flex-col xl:flex-row gap-4">
                {/* Left Drop Zone */}
                <div className="relative flex-1 min-h-[140px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 transition-colors hover:bg-blue-50">
                  <input
                    type="file"
                    accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.bmp"
                    multiple
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    onChange={(event) => setFiles(event.target.files ? Array.from(event.target.files) : [])}
                  />
                  <CloudUpload className="mb-2 h-8 w-8 text-blue-500" />
                  <p className="text-sm font-medium text-slate-600">Drop files here</p>
                  <p className="text-xs text-slate-400 my-1">or</p>
                  <p className="text-sm font-semibold text-blue-600">Choose Files</p>
                </div>

                {/* Right Files List */}
                <div className="flex-1 min-h-[140px] max-h-[140px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                  {files.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      No files selected
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {files.map((file, idx) => {
                        const isPdf = file.name.toLowerCase().endsWith('.pdf');
                        const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.csv');
                        
                        return (
                          <div key={idx} className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100">
                            <div className="flex items-center gap-3 overflow-hidden">
                              {isPdf ? (
                                <FileText className="h-5 w-5 shrink-0 text-red-500" />
                              ) : isExcel ? (
                                <FileSpreadsheet className="h-5 w-5 shrink-0 text-green-600" />
                              ) : (
                                <Image className="h-5 w-5 shrink-0 text-purple-500" />
                              )}
                              <span className="truncate text-sm font-medium text-slate-700" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              {busy === "upload" ? (
                                <div className="flex items-center gap-1.5 text-blue-600">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-xs font-medium">Uploading...</span>
                                </div>
                              ) : uploadResult ? (
                                <div className="flex items-center gap-1.5 text-green-600">
                                  <div className="flex h-4 w-4 items-center justify-center rounded-full border border-green-600">
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                  </div>
                                  <span className="text-xs font-medium">Uploaded</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <span className="text-xs font-medium">Selected</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setFiles(files.filter((_, i) => i !== idx));
                                }}
                                className="rounded text-slate-400 hover:text-slate-600 focus:outline-none"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  disabled={files.length === 0 || busy === "upload"}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All
                </button>

                <div className="flex items-center gap-2">
                  {/* Button 1: Process VLM (Hidden/Commented Out) */}
                  {/* <div className="relative group">
                    <button
                      type="button"
                      onClick={() => handleProcessWithMode("vlm")}
                      disabled={busy === "upload" || files.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                      title="Process VLM: Specially designed for visual documents (images, floor plans, graphs, charts, diagrams)."
                    >
                      {busy === "upload" && busyMode === "vlm" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {busy === "upload" && busyMode === "vlm" ? "Processing VLM..." : "Process VLM"}
                    </button>
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-50 pointer-events-none">
                      <span className="font-bold text-purple-300">✨ Process VLM Mode</span>
                      <span className="text-slate-300">Specially designed for VLM (Visual Language Models). Processes visual documents such as images, floor plans, graphs, charts, and diagrams.</span>
                    </div>
                  </div> */}

                  {/* Button 2: Process Documents */}
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => handleProcessWithMode("standard")}
                      disabled={busy === "upload" || files.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      title="Process Documents: Processes text documents, scanned PDFs, and text with normal context via OCR & standard embedding."
                    >
                      {busy === "upload" && busyMode === "standard" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {busy === "upload" && busyMode === "standard" ? "Processing..." : "Process Documents"}
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-50 pointer-events-none">
                      <span className="font-bold text-blue-300">⚙️ Process Documents Mode</span>
                      <span className="text-slate-300">Processes text documents, scanned PDFs, and text with normal context via OCR & standard embedding.</span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            {uploadResult && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  {uploadResult.processing_mode === "vlm" ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 font-bold text-purple-800 border border-purple-200">
                      ✨ VLM Engine
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-800 border border-blue-200">
                      ⚙️ Standard Engine
                    </span>
                  )}
                  <span className="font-medium text-slate-700">✓ Indexed {uploadResult.chunk_count} chunks</span>
                </div>
                {uploadResult.processing_mode === "vlm" && uploadResult.vlm_cost_usd !== undefined && (
                  <div className="flex items-center gap-1.5 text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    <span>💰 VLM Cost: ${uploadResult.vlm_cost_usd} USD</span>
                    <span className="text-[10px] text-purple-500">({uploadResult.vlm_tokens} Tokens)</span>
                  </div>
                )}
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
                <div className="mt-12 flex flex-col items-center gap-6">
                  <p className="text-sm text-slate-400">Ask a question to start the conversation</p>
                  {initialSuggestions.length > 0 && (
                    <div className="flex w-full flex-col items-center gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Suggested Questions</p>
                      <div className="flex w-full max-w-sm flex-col gap-2">
                        {initialSuggestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => onInitialSuggestionClick(q)}
                            disabled={busy === "ask"}
                            className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-left text-sm font-medium text-blue-800 transition-all hover:border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
              <div ref={messagesEndRef} />
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

        <div 
          className="w-1.5 cursor-col-resize hover:bg-blue-400 bg-slate-200/50 rounded transition-colors self-stretch"
          onMouseDown={() => {
            leftResizingRef.current = true;
            document.body.style.cursor = 'col-resize';
          }}
        />

        {/* MIDDLE PANEL: Chunks + Output */}
        <div className="flex flex-col gap-5 min-h-0 flex-1">
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
              <div className="flex items-center gap-3">
                {askResult?.token_usage && (askResult.token_usage.input > 0 || askResult.token_usage.output > 0) && (
                  <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 shadow-sm">
                    Tokens: {askResult.token_usage.input} in / {askResult.token_usage.output} out
                  </span>
                )}
                {askResult?.verified && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Verified</span>
                )}
                {askResult && (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-200 disabled:opacity-50"
                  >
                    <Download className="h-3 w-3" />
                    {isExporting ? "Exporting..." : "Download"}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {askResult ? (
                <div className="space-y-6" ref={answerContainerRef}>
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Question</h4>
                    <p className="text-[#1e293b] text-[15px]">{messages.filter(m => m.role === "user").pop()?.content}</p>
                  </div>
                  <div className="mb-2 border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Answer</h4>
                  </div>
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

        <div 
          className="w-1.5 cursor-col-resize hover:bg-blue-400 bg-slate-200/50 rounded transition-colors self-stretch"
          onMouseDown={() => {
            rightResizingRef.current = true;
            document.body.style.cursor = 'col-resize';
          }}
        />

        {/* RIGHT PANEL: Document Viewer */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm min-h-0" style={{ width: `${rightWidth}%` }}>
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Viewer</h3>
              {activeChunk && activeFileUrl && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  Page {activeChunk.page_range || activeChunk.page}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden rounded-b-2xl bg-slate-100">
            {(highlightLoading || highlightError) && activeFileUrl && !isActiveImage && (
              <div className="border-b border-slate-200 bg-white/90 px-4 py-2 text-xs font-medium text-slate-600">
                {highlightLoading ? "Finding text highlight..." : highlightError}
              </div>
            )}
            {activeFileUrl ? (
              <div className="min-h-0 flex-1 flex flex-col">
                {isActiveDocx ? (
                  <CustomDocxViewer 
                    url={activeFileUrl} 
                    searchText={getSearchTerm(activeChunk?.content || activeChunk?.text)}
                  />
                ) : isActiveImage ? (
                  <div className="flex-1 overflow-auto bg-slate-50 p-6 flex items-center justify-center">
                    {activeChunk?.type === "image" && activeChunk?.image_base64 ? (
                       <img src={chunkImageSrc(activeChunk)} alt="Document chunk visual" className="max-w-full object-contain shadow-sm border border-slate-200 rounded-lg" />
                    ) : (
                       <img src={activeFileUrl} alt="Document visual" className="max-w-full object-contain shadow-sm border border-slate-200 rounded-lg" />
                    )}
                  </div>
                ) : (
                    <CustomPdfViewer
                      key={`${activeChunkIndex ?? "none"}-${activeChunk ? parseChunkPages(activeChunk).join(",") : "1"}`}
                      pdfUrl={activeFileUrl}
                      pageNumbers={activeChunk ? parseChunkPages(activeChunk) : [1]}
                    searchText={getSearchTerm(activeChunk?.content || activeChunk?.text)}
                    highlightRects={highlightRects}
                  />
                )}
              </div>
            ) : activeChunk ? (
              <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    Document Text (Text Extraction)
                  </h4>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {highlightChunkText(
                      activeChunk.content || activeChunk.text || "", 
                      getSearchTerm(activeChunk.content || activeChunk.text)
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-slate-400">
                <Image className="mb-2 h-10 w-10 opacity-40" />
                {uploadResult
                  ? "Document preview is available for PDF and DOCX uploads. Upload a supported file to preview."
                  : "Upload a document to preview it here."}
                <br />
                Click on any chunk to jump to its page.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VLM Verification & Guardrail Modal (Hidden/Commented Out) */}
      {/* {vlmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-3">
              {vlmModal.type === "error" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-slate-800">{vlmModal.title}</h3>
                <p className="text-xs text-slate-500">Document Processing Guardrail</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {vlmModal.message}
            </p>

            {vlmModal.detectedElements && vlmModal.detectedElements.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-700 mb-2">Detected Visual Elements:</p>
                <div className="flex flex-wrap gap-1.5">
                  {vlmModal.detectedElements.map((el, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                      <CheckCircle2 className="h-3 w-3 text-purple-500" />
                      {el}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {vlmModal.type === "error" ? (
                <button
                  type="button"
                  onClick={() => setVlmModal({ ...vlmModal, isOpen: false })}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors"
                >
                  Understood
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setVlmModal({ ...vlmModal, isOpen: false })}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVlmModal({ ...vlmModal, isOpen: false });
                      handleProcessWithMode("vlm", true);
                    }}
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Confirm & Process VLM
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )} */}
    </main>
  );
}
