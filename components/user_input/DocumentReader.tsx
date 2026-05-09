  "use client";

import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  API_BASE_URL,
  askQuestionStreamRequest,
  parseApiError,
  uploadDocumentRequest,
} from "../../lib/user_input/api-client";
import type { GraphNodeId, PipelineDurations } from "../../types/agents";
import type { AskResult, Chunk, TokenUsage, UploadResult } from "../../types/api";
import { useRouter } from "next/navigation";

function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="text-[#243044] text-[15px] leading-[1.68] overflow-wrap-break-word prose prose-sm max-w-none
      prose-h3:text-[#101828] prose-h3:font-bold prose-h3:text-[19px] prose-h3:leading-[1.3] prose-h3:mt-6 prose-h3:mb-2 prose-h3:first:mt-0
      prose-h4:text-[#101828] prose-h4:font-bold prose-h4:text-base prose-h4:leading-[1.3] prose-h4:mt-5 prose-h4:mb-2 prose-h4:first:mt-0
      prose-p:text-[#243044] prose-p:mb-[14px] prose-p:last:mb-0
      prose-strong:text-[#111827] prose-strong:font-bold
      prose-ul:my-4 prose-ul:pl-6 prose-ol:my-4 prose-ol:pl-6
      prose-li:my-[6px] prose-li:pl-0.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            if (!src) {
              return null;
            }
            return <img src={src} alt={alt || ""} className="my-4 border border-[#d8dee8] rounded-lg bg-white p-2.5 max-h-[560px] object-contain" />;
          },
          table: ({ children }) => (
            <div className="w-full my-4 border border-[#c2cada] rounded-lg overflow-x-auto bg-white">
              <table className="w-full border-collapse text-sm leading-[1.45]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-r border-[#d8dee8] last:border-r-0 p-[11px] text-left align-top bg-[#eef2f6] text-[#202939] font-bold whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-r border-[#d8dee8] last:border-r-0 p-[11px] text-left align-top">
              {children}
            </td>
          ),
        }}
      >
        {content}
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

  function PipelineGraph({
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
      { id: "end", label: "Complete", sub: "Answer delivered" },
    ];
    const activeIndex = active ? nodes.findIndex((node) => node.id === active) : -1;

    return (
      <div className="mt-6 pt-5 border-t border-[#d8dee8]" aria-label="LangGraph execution pipeline">
        <div className="flex items-center justify-between gap-3 mb-[14px]">
          <p className="m-0 text-[#0a0a0a] text-xs font-bold tracking-wider uppercase">LangGraph Pipeline</p>
          <span className="border border-[#d9e2f2] rounded-full bg-[#f8fafc] text-[#475467] text-xs font-bold leading-none py-1.5 px-2">
            {totalDuration ? `Total ${formatDuration(totalDuration)}` : active ? "Running" : ready ? "Ready" : "Idle"}
          </span>
        </div>
        <div className="relative grid gap-3">
          <div className="absolute top-[18px] bottom-[18px] left-[15px] w-0.5 rounded-full bg-[#dfe6f0]"></div>
          {nodes.map((node, index) => {
            const isActive = active === node.id;
            const duration = durations[node.id];
            const isComplete = duration != null || activeIndex > index;
            const isReadyStart = !active && ready && node.id === "start";
            const status = isActive && !isComplete ? "In progress" : isComplete ? "Complete" : isReadyStart ? "Ready" : "Waiting";

            return (
              <div key={node.id} className="relative grid grid-cols-[32px_1fr] gap-3 items-start">
                <span
                  className={`relative z-10 flex w-8 h-8 items-center justify-center border rounded-full font-bold text-xs shadow-[0_0_0_4px_white]
                    ${isActive ? "border-[#1f5eff] bg-[#1f5eff] text-white shadow-[0_0_0_4px_white,0_0_0_8px_rgba(31,94,255,0.12)]" : ""}
                    ${isComplete && !isActive ? "border-[#98a8c0] bg-[#253044] text-white" : ""}
                    ${!isComplete && !isActive && isReadyStart ? "border-[#8ba4d6] bg-[#edf3ff] text-[#1f5eff]" : ""}
                    ${!isComplete && !isActive && !isReadyStart ? "border-[#cbd5e1] bg-white text-[#667085]" : ""}`}
                >
                  {isComplete && !isActive ? "✓" : (!isComplete ? index + 1 : "")}
                </span>
                <div
                  className={`w-full border rounded-lg p-3 flex flex-col gap-[7px] transition-all
                    ${isActive ? "border-[#1f5eff] bg-gradient-to-b from-white to-[#f2f6ff] shadow-[0_10px_24px_rgba(31,94,255,0.14)] -translate-y-0.5" : ""}
                    ${isComplete && !isActive ? "border-[#cbd5e1] bg-white" : ""}
                    ${isReadyStart ? "border-[#b8c9ef] bg-[#f7faff]" : ""}
                    ${!isComplete && !isActive && !isReadyStart ? "border-[#d9e2f2] bg-gradient-to-b from-white to-[#f9fbfd] shadow-[0_8px_18px_rgba(16,24,40,0.04)]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <span className={`text-sm font-bold leading-[1.2] ${isActive ? "text-[#1f5eff]" : "text-[#182230]"}`}>
                      {node.label}
                    </span>
                    <span className={`flex-shrink-0 text-[10px] font-bold tracking-wider uppercase
                      ${isActive ? "text-[#1f5eff]" : ""}
                      ${isComplete ? "text-[#475467]" : ""}
                      ${isReadyStart ? "text-[#1f5eff]" : !isComplete && !isActive ? "text-[#667085]" : ""}`}
                    >
                      {duration != null ? formatDuration(duration) : status}
                    </span>
                  </div>
                  <span className="text-[#0a0a0a] text-[11.5px] font-medium leading-[1.4] overflow-wrap-anywhere">
                    {node.sub}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  export default function Home() {
    const [file, setFile] = useState<File | null>(null);
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
      if (!file) {
        setError("Choose a PDF or DOCX file first.");
        return;
      }

      setBusy("upload");
      setError("");
      setAskResult(null);
      setActiveNode(null);
      setStageDurations({});
      setTotalDuration(null);

      const formData = new FormData();
      formData.append("file", file);

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

    async function askQuestion(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!question.trim()) {
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

        const response = await askQuestionStreamRequest(question);

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

        setAskResult({ answer: "", chunks: [], token_usage: { input: 0, output: 0 } });

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

                try {
                  const data = JSON.parse(dataStr);
                  if (data.type === "token") {
                    fullAnswer += data.content;
                    setAskResult((prev) => prev ? { ...prev, answer: fullAnswer } : null);
                  } else if (data.type === "done") {
                    const completeStartedAt = performance.now();
                    setAskResult({
                      answer: fullAnswer,
                      chunks: data.chunks,
                      token_usage: data.token_usage,
                    });
                    const completedAt = performance.now();
                    setStageDurations((prev) => ({
                      ...prev,
                      generate: completeStartedAt - generateStartedAt,
                      end: completedAt - completeStartedAt,
                    }));
                    setTotalDuration(completedAt - totalStartedAt);
                    setActiveNode("end");
                    completed = true;
                  }
                } catch (e) {
                  console.error("Failed to parse SSE line", dataStr);
                }
              }
            }
            
            boundary = buffer.indexOf("\n\n");
          }
        }

        if (!completed) {
          const completedAt = performance.now();
          setStageDurations((prev) => ({ ...prev, generate: completedAt - generateStartedAt, end: 0 }));
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
                Upload a PDF or DOCX, then ask questions against hybrid FAISS and BM25 retrieval.
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
              <label htmlFor="document" className="text-[#344054] text-xs font-bold">Document</label>
              <input
                id="document"
                type="file"
                accept=".pdf,.docx"
                className="w-full border-2 border-dashed border-[#c2cada] rounded-lg bg-[#f8fafc] text-[#172033] cursor-pointer p-3 hover:border-[#1f5eff] hover:bg-[#f3f6ff]"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <button 
                type="submit" 
                disabled={busy === "upload"}
                className="min-h-[42px] border border-[#1f5eff] rounded-lg bg-[#1f5eff] text-white font-bold px-[18px] cursor-pointer transition-all hover:enabled:bg-[#174bd2] hover:enabled:border-[#174bd2] hover:enabled:shadow-[0_8px_18px_rgba(31,94,255,0.22)] disabled:bg-[#e5eaf2] disabled:border-[#d7dee9] disabled:text-[#7a8597] disabled:cursor-not-allowed"
              >
                {busy === "upload" ? "Processing..." : "Process document"}
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

            <PipelineGraph
              active={activeNode}
              ready={Boolean(uploadResult)}
              durations={stageDurations}
              totalDuration={totalDuration}
            />
          </aside>

          {/* Main Content Panel */}
          <section className="border border-[#d8dee8] rounded-lg bg-[#e4d6d6] shadow-[0_18px_45px_rgba(22,32,51,0.08)] p-5 min-h-[560px]">
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
                <h2 className="m-0 mb-[14px] text-[#101828] text-[21px] leading-[1.3]">Answer</h2>
                <MarkdownAnswer content={askResult.answer} />

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
                            {chunk.source} · Page {chunk.page}
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
                            Page {chunk.page}
                          </span>
                        </div>
                        {chunk.type === "image" && chunk.image_base64 ? (
                          <figure className="m-0">
                            <img
                              src={chunkImageSrc(chunk)}
                              alt={`Retrieved image from page ${chunk.page}`}
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
