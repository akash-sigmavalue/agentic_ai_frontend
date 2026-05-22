"use client";

import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check } from "lucide-react";

import {
  API_BASE_URL,
  askQuestionStreamRequest,
  parseApiError,
  uploadDocumentRequest,
} from "../../lib/user_input/api-client";
import type { GraphNodeId, PipelineDurations } from "../../types/agents";
import type { AskResult, Chunk, TokenUsage, UploadResult } from "../../types/api";
import { useRouter } from "next/navigation";

function normalizeAnswerMarkdown(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\n(?=\d+\.\s+)/g, "\n\n")
    .replace(/\n(?=(?:Reference|Source):)/gi, "\n\n")
    .replace(/^(Reference|Source):/gim, "**$1:**");
}

function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="text-[#243044] text-[15px] leading-[1.75] overflow-wrap-break-word">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="m-0 mb-4 text-[#101828] text-[25px] leading-[1.2] font-bold">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-7 mb-3 first:mt-0 text-[#101828] text-[21px] leading-[1.25] font-bold pb-2 border-b border-[#e5eaf2]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-2 first:mt-0 text-[#182230] text-[18px] leading-[1.3] font-bold">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-5 mb-2 first:mt-0 text-[#182230] text-base leading-[1.35] font-bold">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="m-0 mb-4 last:mb-0 text-[#243044]">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-[#101828]">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="my-4 grid gap-2 pl-0 list-none">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 grid gap-3 pl-6 list-decimal marker:text-[#1f5eff] marker:font-bold">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 text-[#243044] leading-[1.65]">
              {children}
            </li>
          ),
          img: ({ src, alt }) => {
            if (!src) {
              return null;
            }
            return <img src={src} alt={alt || ""} className="my-5 border border-[#d8dee8] rounded-lg bg-white p-2.5 max-h-[560px] object-contain shadow-sm" />;
          },
          table: ({ children }) => (
            <div className="w-full my-5 border border-[#c9d4e4] rounded-lg overflow-x-auto bg-white shadow-sm">
              <table className="w-full border-collapse text-sm leading-[1.5]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-r border-[#d8dee8] last:border-r-0 p-3 text-left align-top bg-[#eef3fb] text-[#182230] font-bold whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-r border-[#edf1f7] last:border-r-0 p-3 text-left align-top text-[#243044]">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-5 border-l-4 border-[#1f5eff] bg-[#f5f8ff] text-[#243044] rounded-r-lg px-4 py-3">
              {children}
            </blockquote>
          ),
        }}
      >
        {normalizeAnswerMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

function chunkImageSrc(chunk: Chunk) {
  if (!chunk.image_base64) {
    return "";
  }

  return `data:${chunk.image_mime || "image/png"};base64,${chunk.image_base64}`;
}

function formatDuration(ms?: number | null) {
  if (ms == null) {
    return "";
  }

  const seconds = ms / 1000;
  if (seconds < 1) {
    return "< 1s";
  }

  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
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
    { id: "start", label: "Start", sub: "Document ready" },
    { id: "retrieve", label: "Retrieve", sub: "FAISS / BM25 / Rerank" },
    { id: "generate", label: "Generate", sub: "gpt-4o-mini / temperature 0.2" },
    // { id: "check_answer", label: "Verify", sub: "Answer grounding / applicability check" },
    { id: "end", label: "Complete", sub: "Answer delivered" },
  ];
  const activeIndex = active ? nodes.findIndex((node) => node.id === active) : -1;

  return (
    <div className="mt-6 rounded-xl border border-[#e5eaf2] bg-white p-5 shadow-[0_12px_32px_rgba(16,24,40,0.06)]" aria-label="LangGraph execution pipeline">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#1d2939]">LANGGRAPH PIPELINE</p>
        <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-[11px] font-bold text-[#475467]">
          {totalDuration ? `Total ${formatDuration(totalDuration)}` : active ? "Running" : ready ? "Ready" : "Idle"}
        </span>
      </div>

      <div className="grid gap-3">
        {nodes.map((node, index) => {
          const isActive = active === node.id;
          const duration = durations[node.id];
          const isComplete = duration != null || (activeIndex !== -1 && activeIndex > index);
          const progress = isComplete ? 100 : isActive ? 75 : 0;
          
          let ringColor = "#e4e7ec"; // Waiting
          let textColor = "#667085";
          let contentBg = "bg-white border-[#f2f4f7]";

          if (isComplete) {
            ringColor = "#22c55e"; // Green
            textColor = "#16a34a";
            contentBg = "bg-white border-[#f2f4f7]";
          } else if (isActive) {
            ringColor = "#2563eb"; // Blue
            textColor = "#2563eb";
            contentBg = "bg-[#f5faff] border-[#d1e9ff]";
          }

          return (
            <div key={node.id} className="grid grid-cols-[56px_1fr] items-center gap-4">
              <div
                className="relative grid h-12 w-12 place-items-center rounded-full p-[3px]"
                style={{
                  background: `conic-gradient(${ringColor} ${progress * 3.6}deg, #f2f4f7 0deg)`,
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-white text-[11px] font-bold shadow-sm">
                  {isComplete ? (
                    <Check className="h-5 w-5 text-[#22c55e]" strokeWidth={3} />
                  ) : (
                    <span style={{ color: textColor }}>{progress}%</span>
                  )}
                </div>
              </div>

              <div className={`rounded-xl border p-3.5 transition-all duration-300 ${contentBg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`m-0 text-[14px] font-bold leading-tight ${isActive ? "text-[#2563eb]" : "text-[#101828]"}`}>
                      {node.label}
                    </p>
                    <p className={`m-0 mt-1 text-[11.5px] font-medium leading-relaxed ${isActive ? "text-[#2563eb]/80" : "text-[#667085]"}`}>
                      {node.sub}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold ${isActive ? "text-[#2563eb]" : "text-[#667085]"}`}>
                    {duration != null ? formatDuration(duration) : (isActive ? "..." : "< 1s")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [question, setQuestion] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState<"upload" | "ask" | null>(null);
  const [error, setError] = useState("");
  const [activeNode, setActiveNode] = useState<GraphNodeId | null>(null);
  const [stageDurations, setStageDurations] = useState<PipelineDurations>({});
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const router = useRouter();

  const tokenUsage = useMemo<TokenUsage>(() => {
    return askResult?.token_usage || uploadResult?.token_usage || { input: 0, output: 0 };
  }, [askResult, uploadResult]);

  const answerImages = useMemo(() => {
    return askResult?.chunks.filter((chunk) => chunk.type === "image" && chunk.image_base64) || [];
  }, [askResult]);

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Choose at least one PDF, DOCX or Image file first.");
      return;
    }

    setBusy("upload");
    setError("");
    setAskResult(null);
    setActiveNode(null);
    setStageDurations({});
    setTotalDuration(null);

    const formData = new FormData();
    files.forEach((f) => {
      formData.append("files", f);
    });

    try {
      const response = await uploadDocumentRequest(formData);

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      setUploadResult(await response.json());
    } catch (err) {
      setError(err instanceof Error ? `${err.message} (${API_BASE_URL})` : `Upload failed. (${API_BASE_URL})`);
    } finally {
      setBusy(null);
    }
  }

  async function handleAsk(questionText: string) {
    if (!questionText.trim()) {
      setError("Enter a question.");
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

      const response = await askQuestionStreamRequest(questionText);

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

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
                console.error("Failed to parse SSE line", dataStr);
                continue;
              }

              if (data.type === "token") {
                // if (checkStartedAt == null) {
                //   checkStartedAt = performance.now();
                //   setStageDurations((prev) => ({ ...prev, generate: checkStartedAt! - generateStartedAt }));
                //   setActiveNode("check_answer");
                // }
                fullAnswer += data.content;
                setAskResult((prev) => prev ? { ...prev, answer: fullAnswer } : null);
              } else if (data.type === "status") {
                if (data.stage === "retrieve" || data.stage === "generate" /* || data.stage === "check_answer" */) {
                  setActiveNode(data.stage);
                }
              } else if (data.type === "done") {
                const completeStartedAt = performance.now();
                // const verifyStartedAt = checkStartedAt ?? completeStartedAt;
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
                  // check_answer: completeStartedAt - verifyStartedAt,
                  end: completedAt - completeStartedAt,
                }));
                setTotalDuration(completedAt - totalStartedAt);
                setActiveNode("end");
                completed = true;
              } else if (data.type === "error") {
                throw new Error(data.content || "Streaming failed.");
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
          // check_answer: checkStartedAt ? completedAt - checkStartedAt : 0,
          end: 0,
        }));
        setTotalDuration(completedAt - totalStartedAt);
        setActiveNode("end");
      }
    } catch (err) {
      setError(err instanceof Error ? `${err.message} (${API_BASE_URL})` : `Question failed. (${API_BASE_URL})`);
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

  return (
    <main className="w-min(320px, calc(100vw - 32px)) max-w-[1220px] mx-auto px-4 pb-8 pt-28" style={{width: 'min(1220px, calc(100vw - 32px))'}}>
      {/* Topbar */}
      <section className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
        <div className="flex items-center gap-2.5">
          <img 
            onClick={() => router.push('/')} 
            src="user_input/DS.jpeg" 
            alt="Logo" 
            className="w-[220px] h-12 object-contain cursor-pointer" 
          />
          <div>
            <h1 className="m-0 text-[30px] font-white tracking-tight leading-[1.2] mb-2">User Input Data Agent</h1>
            <p className="m-0 max-w-[680px] text-[15px] leading-[1.55]">
              Upload a PDF, DOCX or Image, then ask questions against hybrid FAISS and BM25 retrieval.
            </p>
          </div>
        </div>
        <div className="grid gap-2 min-w-[210px] border border-[#d8dee8] rounded-lg bg-[#e4d6d6] p-3.5 text-[#0a0a0a] text-xs">
          <span className="flex justify-between gap-4"><span>Input tokens:</span> <span>{tokenUsage.input}</span></span>
          <span className="flex justify-between gap-4"><span>Output tokens:</span> <span>{tokenUsage.output}</span></span>
        </div>
      </section>

      {/* Error Alert */}
      {error ? (
        <div className="mb-[18px] border border-[rgba(194,65,59,0.28)] rounded-lg bg-[#fff1f0] text-[#c2413b] p-[13px_14px]">
          {error}
        </div>
      ) : null}

      {/* Workspace */}
      <section className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-5 items-start">
        {/* Sidebar Panel */}
        <aside className="border border-[#d8dee8] rounded-lg bg-[#e4d6d6] shadow-[0_18px_45px_rgba(22,32,51,0.08)] p-5">
          <form onSubmit={uploadDocument} className="grid gap-[14px]">
            <label htmlFor="document" className="text-[#344054] text-xs font-bold">Documents</label>
            <input
              id="document"
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.bmp"
              multiple
              className="w-full border-2 border-dashed border-[#c2cada] rounded-lg bg-[#f8fafc] text-[#172033] cursor-pointer p-3 hover:border-[#1f5eff] hover:bg-[#f3f6ff]"
              onChange={(event) => setFiles(event.target.files ? Array.from(event.target.files) : [])}
            />
            {files.length > 0 && (
              <div className="text-xs text-[#0a0a0a] font-semibold mt-1">
                Selected:
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="truncate max-w-[280px]">
                      {f.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button 
              type="submit" 
              disabled={busy === "upload" || files.length === 0}
              className="min-h-[42px] border border-[#1f5eff] rounded-lg bg-[#1f5eff] text-white font-bold px-[18px] cursor-pointer transition-all hover:enabled:bg-[#174bd2] hover:enabled:border-[#174bd2] hover:enabled:shadow-[0_8px_18px_rgba(31,94,255,0.22)] disabled:bg-[#e5eaf2] disabled:border-[#d7dee9] disabled:text-[#7a8597] disabled:cursor-not-allowed"
            >
              {busy === "upload" ? "Processing..." : "Process documents"}
            </button>
          </form>

          {uploadResult ? (
            <dl className="grid gap-[14px] mt-6 pt-5 border-t border-[#d8dee8]">
              <div>
                <dt className="text-[#0a0a0a] text-xs font-bold tracking-wider uppercase">File</dt>
                <dd className="m-0 text-[#172033] text-[15px] font-semibold overflow-wrap-break-word">{uploadResult.document_name}</dd>
              </div>
              <div>
                <dt className="text-[#0a0a0a] text-xs font-bold tracking-wider uppercase">Pages/sections</dt>
                <dd className="m-0 text-[#172033] text-[15px] font-semibold">{uploadResult.pages_or_sections}</dd>
              </div>
              <div>
                <dt className="text-[#0a0a0a] text-xs font-bold tracking-wider uppercase">Chunks</dt>
                <dd className="m-0 text-[#172033] text-[15px] font-semibold">{uploadResult.chunk_count}</dd>
              </div>
            </dl>
          ) : null}

          <StepperPipelineGraph
            active={activeNode}
            ready={Boolean(uploadResult)}
            durations={stageDurations}
            totalDuration={totalDuration}
          />
        </aside>

        {/* Main Content Panel */}
        <section className="border border-[#d8dee8] rounded-lg bg-[#f6f8fb] shadow-[0_18px_45px_rgba(22,32,51,0.08)] p-5 min-h-[560px]">
          <form onSubmit={askQuestion} className="grid gap-[14px]">
            <label htmlFor="question" className="text-[#344054] text-xs font-bold">Question</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about definitions, clauses, calculations, or document conclusions..."
              rows={4}
              className="w-full min-h-[112px] border border-[#d8dee8] rounded-lg bg-white text-[#172033] p-[13px_14px] resize-vertical focus:border-[#1f5eff] focus:shadow-[0_0_0_3px_rgba(31,94,255,0.12)] focus:outline-none"
            />
            <button 
              type="submit" 
              disabled={busy === "ask" || !uploadResult}
              className="min-h-[42px] border border-[#1f5eff] rounded-lg bg-[#1f5eff] text-white font-bold px-[18px] cursor-pointer transition-all hover:enabled:bg-[#174bd2] hover:enabled:border-[#174bd2] hover:enabled:shadow-[0_8px_18px_rgba(31,94,255,0.22)] disabled:bg-[#e5eaf2] disabled:border-[#d7dee9] disabled:text-[#7a8597] disabled:cursor-not-allowed"
            >
              {busy === "ask" ? "Thinking..." : "Get answer"}
            </button>
          </form>

          {askResult ? (
            <div className="mt-[26px] pt-[22px] border-t border-[#d8dee8]">
              <article className="overflow-hidden border border-[#d8dee8] rounded-lg bg-white shadow-[0_14px_32px_rgba(16,24,40,0.08)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e5eaf2] bg-[#fbfcff] px-5 py-4">
                  <div>
                    <p className="m-0 text-[11px] font-bold tracking-wider uppercase text-[#1f5eff]">
                      Verified Response
                    </p>
                    <h2 className="m-0 mt-1 text-[#101828] text-[22px] leading-[1.25] font-bold">
                      Answer
                    </h2>
                  </div>
                  <span className="w-fit rounded-full border border-[#c9d7f5] bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#174bd2]">
                    {askResult.verified ? "Verified" : "Document-grounded"}
                  </span>
                </div>
                <div className="px-5 py-5 sm:px-6 sm:py-6">
                  <MarkdownAnswer content={askResult.answer} />
                </div>
              </article>

              {askResult.suggested_questions && askResult.suggested_questions.length > 0 ? (
                <section className="mt-5" aria-label="Suggested follow-up questions">
                  <h3 className="m-0 mb-3 text-[#101828] text-sm font-bold uppercase tracking-wider text-[#475467]">
                    Suggested Questions
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {askResult.suggested_questions.map((suggestedQ, index) => (
                      <button
                        key={index}
                        onClick={() => onSelectSuggestedQuestion(suggestedQ)}
                        disabled={busy === "ask"}
                        className="rounded-full border border-[#d1e9ff] bg-[#f5faff] text-[#174bd2] text-[13px] font-semibold px-4 py-2 hover:bg-[#e0f0ff] hover:border-[#b2ddff] transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-left max-w-full"
                      >
                        {suggestedQ}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {answerImages.length ? (
                <section className="mt-5" aria-label="Visual references">
                  <h3 className="m-0 mb-3 text-[#101828] text-[18px] leading-[1.3]">Supporting Images</h3>
                  <div className="grid gap-[14px]">
                    {answerImages.map((chunk, index) => (
                      <figure key={`${chunk.page}-${index}`} className="m-0 border border-[#d8dee8] rounded-lg bg-white p-2.5">
                        <img
                          src={chunkImageSrc(chunk)}
                          alt={`Supporting image from page ${chunk.page}`}
                          className="block w-full max-h-[560px] object-contain rounded-md bg-[#f8fafc]"
                        />
                        <figcaption className="mt-2 text-[#0a0a0a] text-xs text-center">
                          {chunk.source} · Page {chunk.page_range || chunk.page}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              ) : null}

              <details className="mt-5 border border-[#d8dee8] rounded-lg bg-white overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer list-none p-[14px_16px] text-[#202939] font-bold hover:bg-[#f9fbfd]">
                  <span>Retrieved Source Chunks</span>
                  <span className="text-[12px] transition-transform">▼</span>
                </summary>
                <div className="grid gap-3 max-h-[420px] overflow-y-auto p-[14px] bg-[#f8fafc]">
                  {askResult.chunks.map((chunk, index) => (
                    <div key={index} className="border border-[#d8dee8] rounded-lg bg-white p-[14px]">
                      <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-[#d8dee8]">
                        <span className="max-w-[70%] overflow-hidden text-[#174bd2] text-xs font-bold text-ellipsis whitespace-nowrap">
                          {chunk.source}
                        </span>
                        <span className="border border-[#d8dee8] rounded-full bg-[#f8fafc] text-[#0a0a0a] text-xs font-bold px-2 py-0.5 whitespace-nowrap">
                          Page {chunk.page_range || chunk.page}
                        </span>
                      </div>
                      {chunk.type === "image" && chunk.image_base64 ? (
                        <figure className="m-0">
                          <img
                            src={chunkImageSrc(chunk)}
                            alt={`Retrieved image from page ${chunk.page_range || chunk.page}`}
                            className="block w-full max-h-[300px] object-contain border border-[#d8dee8] rounded-md bg-[#f8fafc] p-2"
                          />
                        </figure>
                      ) : (
                        <p className="m-0 text-[#344054] font-mono text-xs leading-[1.55] whitespace-pre-wrap">
                          {chunk.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : (
            <div className="grid min-h-[300px] place-items-center text-[#0a0a0a] text-[15px] text-center">
              Process a document to start asking questions.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
