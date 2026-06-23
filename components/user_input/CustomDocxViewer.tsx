"use client";

import { useEffect, useState, useRef } from "react";
import mammoth from "mammoth";

interface CustomDocxViewerProps {
  url: string;
  searchText?: string;
}

export default function CustomDocxViewer({ url, searchText }: CustomDocxViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDocx() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtmlContent(result.value);
      } catch (err) {
        console.error("Error loading docx:", err);
        setError("Failed to load document preview.");
      } finally {
        setLoading(false);
      }
    }

    if (url) {
      loadDocx();
    }
  }, [url]);

  useEffect(() => {
    if (!containerRef.current || !htmlContent) return;
    
    // Reset HTML to unhighlighted state before applying new highlights
    containerRef.current.innerHTML = htmlContent;

    if (!searchText) return;

    // Use a simple heuristic: grab a meaningful substring to search for
    const searchLower = searchText.toLowerCase();
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 4).slice(0, 5); // Take up to 5 significant words
    if (searchWords.length === 0) return;

    const walker = document.createTreeWalker(containerRef.current, NodeFilter.SHOW_TEXT, null);
    const nodesToReplace: { node: Node; parent: Node }[] = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && searchWords.some(w => node.nodeValue!.toLowerCase().includes(w))) {
        nodesToReplace.push({ node, parent: node.parentNode! });
      }
    }

    let firstHighlight: HTMLElement | null = null;
    nodesToReplace.forEach(({ node, parent }) => {
      const span = document.createElement("span");
      span.style.backgroundColor = "rgba(255, 255, 0, 0.45)";
      span.textContent = node.nodeValue;
      parent.replaceChild(span, node);
      if (!firstHighlight) firstHighlight = span;
    });

    if (firstHighlight) {
      firstHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchText, htmlContent]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-slate-400">
        Loading Document preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-10 text-red-500">
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-slate-50 p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div
          ref={containerRef}
          className="prose prose-slate max-w-none text-[#1e293b]"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}
