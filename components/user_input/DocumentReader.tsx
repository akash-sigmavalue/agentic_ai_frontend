"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Upload, Send, FileText, Image, Loader2, Download, CloudUpload, X, Trash2, FileSpreadsheet } from "lucide-react";

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
  const raw = chunk.page_range || chunk.page || "1";
  if (raw === "unknown") return [1];
  
  const parts = raw.split("-").map(s => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const pages = [];
    for (let i = parts[0]; i <= parts[1]; i++) {
      pages.push(i);
    }
    return pages;
  }
  
  const page = parseInt(parts[0], 10);
  return Number.isFinite(page) && page > 0 ? [page] : [1];
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

  const handleDownloadPdf = async () => {
    if (!answerContainerRef.current) return;
    setIsExporting(true);
    try {
      const originalTitle = document.title;
      document.title = `QA-Export-${Date.now()}`;
      
      const printWrapper = document.createElement('div');
      printWrapper.className = 'print-wrapper';
      const clone = answerContainerRef.current.cloneNode(true) as HTMLElement;
      
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      printWrapper.appendChild(clone);
      
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          html, body {
            background-color: white !important;
          }
          body > :not(.print-wrapper) {
            display: none !important;
          }
          .print-wrapper {
            display: block !important;
            padding: 20px;
            background-color: white !important;
            color: black !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media screen {
          .print-wrapper {
            display: none !important;
          }
        }
      `;
      
      document.body.appendChild(printWrapper);
      document.head.appendChild(style);
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      window.print();
      
      document.body.removeChild(printWrapper);
      document.head.removeChild(style);
      document.title = originalTitle;
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      alert(`Failed to generate PDF: ${err?.message || err}. Please try again.`);
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

      {/* 3-pane flex layout */}
      <div className="flex h-[calc(100%-80px)] w-full gap-2 min-h-0">
        {/* LEFT PANEL: Upload & Chat */}
        <div className="flex flex-col gap-5 min-h-0" style={{ width: `${leftWidth}%` }}>
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <form onSubmit={uploadDocument} className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Upload</label>
              
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

              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  disabled={files.length === 0 || busy === "upload"}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </button>
                <button
                  type="submit"
                  disabled={busy === "upload" || files.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {busy === "upload" ? "Processing..." : "Process Documents"}
                </button>
              </div>
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
                    key={`${activeChunkIndex ?? "none"}-${activeChunk ? parseChunkPages(activeChunk).join(",") : "all"}`}
                    pdfUrl={activeFileUrl}
                    pageNumbers={activeChunk ? parseChunkPages(activeChunk) : "all"}
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
    </main>
  );
}
