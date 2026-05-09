"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

let mermaidInitialized = false;

function MermaidBlock({ chart }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let active = true;

    async function renderChart() {
      if (!mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          themeVariables: {
            darkMode: true,
            background: "#0f172a",
            primaryColor: "#38bdf8",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#38bdf8",
            lineColor: "#64748b",
            fontFamily: "Inter, sans-serif",
          },
        });
        mermaidInitialized = true;
      }

      try {
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, chart);
        if (active) {
          setSvg(rendered);
        }
      } catch {
        if (active) {
          setSvg("");
        }
      }
    }

    renderChart();
    return () => {
      active = false;
    };
  }, [chart, id]);

  if (!svg) {
    return (
      <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-300">
        <code>{chart}</code>
      </pre>
    );
  }

  return <div className="mermaid-shell" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function MarkdownRenderer({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition"
            style={{ color: "var(--accent-light)", textDecorationColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }}
          >
            {children}
          </a>
        ),
        code: ({ inline, className, children, ...props }) => {
          const language = /language-(\w+)/.exec(className || "")?.[1];
          const content = String(children).replace(/\n$/, "");

          if (!inline && language === "mermaid") {
            return <MermaidBlock chart={content} />;
          }

          if (!inline) {
            return (
              <pre
                className="overflow-x-auto rounded-2xl p-4 text-xs"
                style={{ border: "1px solid var(--border-soft)", background: "var(--bg-input)", color: "var(--text-secondary)" }}
              >
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          }

          return (
            <code
              className="rounded px-1.5 py-0.5 text-[0.85em]"
              style={{ background: "var(--bg-card-strong)", color: "var(--accent-light)" }}
              {...props}
            >
              {children}
            </code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 pl-4 italic" style={{ borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)", color: "var(--text-secondary)" }}>
            {children}
          </blockquote>
        ),
        h1: ({ children }) => <h1 className="font-orbitron mt-6 border-b pb-2 text-xl font-black uppercase tracking-[0.14em] first:mt-0" style={{ borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent-light)" }}>{children}</h1>,
        h2: ({ children }) => <h2 className="mt-5 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{children}</h2>,
        h3: ({ children }) => <h3 className="mt-4 text-base font-semibold" style={{ color: "var(--accent-secondary)" }}>{children}</h3>,
        p: ({ children }) => <p className="my-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{children}</p>,
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>{children}</ol>,
        table: ({ children }) => <div className="overflow-x-auto"><table className="w-full overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border-soft)" }}>{children}</table></div>,
        thead: ({ children }) => <thead className="text-left text-xs uppercase tracking-[0.12em]" style={{ background: "var(--bg-card-strong)", color: "var(--text-primary)" }}>{children}</thead>,
        th: ({ children }) => <th className="px-4 py-3">{children}</th>,
        td: ({ children }) => <td className="border-t px-4 py-3 text-sm" style={{ borderColor: "var(--border-dim)", color: "var(--text-secondary)" }}>{children}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
