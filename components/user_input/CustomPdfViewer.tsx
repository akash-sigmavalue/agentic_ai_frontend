"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface CustomPdfViewerProps {
  pdfUrl: string;
  pageNumber: number;
  searchText: string;
  highlightColor?: "blue" | "yellow";
}

function buildHighlightTerms(searchText: string): { words: Set<string>; normalized: string } {
  const normalized = searchText.replace(/\s+/g, " ").trim().toLowerCase();
  const words = new Set<string>();
  if (!normalized) return { words, normalized };

  normalized
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length >= 4)
    .slice(0, 40)
    .forEach((w) => words.add(w));

  return { words, normalized };
}

function shouldHighlight(
  itemText: string,
  { words, normalized }: { words: Set<string>; normalized: string }
): boolean {
  const itemNorm = itemText.replace(/\s+/g, " ").trim().toLowerCase();
  if (!itemNorm) return false;

  if (itemNorm.length > 6 && normalized.includes(itemNorm)) return true;
  if (itemNorm.length > 4 && words.has(itemNorm)) return true;

  for (const word of words) {
    if (word.length >= 5 && itemNorm.includes(word)) return true;
    if (itemNorm.length >= 5 && word.includes(itemNorm)) return true;
  }

  return false;
}

export default function CustomPdfViewer({
  pdfUrl,
  pageNumber,
  searchText,
  highlightColor = "blue",
}: CustomPdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const highlightTerms = useMemo(() => buildHighlightTerms(searchText), [searchText]);
  const safePage = Math.min(Math.max(1, pageNumber), numPages ?? pageNumber);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [safePage, searchText]);

  function onDocumentLoadSuccess({ numPages: total }: { numPages: number }) {
    setNumPages(total);
  }

  const textRenderer = useMemo(() => {
    const colorClass =
      highlightColor === "blue" ? "bg-blue-300 text-black" : "bg-yellow-300 text-black";

    return (textItem: { str: string }) => {
      if (!searchText.trim()) return textItem.str;
      if (!shouldHighlight(textItem.str, highlightTerms)) return textItem.str;
      return <mark className={`${colorClass} px-0.5 rounded-sm`}>{textItem.str}</mark>;
    };
  }, [searchText, highlightTerms, highlightColor]);

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col items-center overflow-auto bg-slate-100 p-4">
      {pdfUrl && (
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-10 text-slate-400">
              Loading PDF...
            </div>
          }
          error={
            <div className="flex items-center justify-center p-10 text-red-500">
              Failed to load PDF.
            </div>
          }
        >
          <Page
            key={`page-${safePage}-${searchText.slice(0, 32)}`}
            pageNumber={safePage}
            width={containerWidth ? containerWidth - 32 : undefined}
            customTextRenderer={textRenderer}
            className="shadow-md rounded-sm overflow-hidden"
            renderAnnotationLayer={false}
            renderTextLayer={true}
          />
        </Document>
      )}
    </div>
  );
}
