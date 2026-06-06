"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { HighlightRect } from "../../types/api";
import React, { useCallback } from "react";

import { Document, Page, pdfjs } from "react-pdf";
interface CustomPdfViewerProps {
  pdfUrl: string;
  pageNumber: number;
  searchText: string;
  highlightRects?: HighlightRect[];
}

export default function CustomPdfViewer({
  pdfUrl,
  pageNumber,
  searchText,
  highlightRects = [],
}: CustomPdfViewerProps) {
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && pdfjs && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }
    } catch (e) {
      console.error("Failed to set workerSrc:", e);
    }
  }, []);
  const [numPages, setNumPages] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [pdfModuleError, setPdfModuleError] = useState<string | null>(null);

  const safePage = Math.min(Math.max(1, pageNumber), numPages ?? pageNumber);
  const renderedPageWidth = containerWidth ? Math.max(containerWidth - 32, 0) : 0;
  const firstRect = highlightRects[0];
  const renderedPageHeight =
    renderedPageWidth && firstRect ? renderedPageWidth * (firstRect.page_height / firstRect.page_width) : undefined;
  const nativePdfViewerSrc = useMemo(() => {
    if (!pdfUrl) return "";
    const fragment = `#page=${safePage}`;
    return pdfUrl.includes("#") ? pdfUrl : `${pdfUrl}${fragment}`;
  }, [pdfUrl, safePage]);

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
    // Only scroll to top if we don't have text or highlights to scroll to
    if (!searchText && (!highlightRects || highlightRects.length === 0)) {
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [safePage, searchText, highlightRects]);

  useEffect(() => {
    const scrollToHighlight = () => {
      if (highlightRects && highlightRects.length > 0) {
        const el = containerRef.current?.querySelector("#highlight-rect-first");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (searchText) {
        const mark = containerRef.current?.querySelector("mark.highlighted-text-fallback");
        if (mark) mark.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    // We delay the scroll to ensure the PDF page and text layer have fully rendered
    const timer = setTimeout(scrollToHighlight, 800);
    return () => clearTimeout(timer);
  }, [highlightRects, searchText, safePage, renderedPageWidth]);

  const customTextRenderer = useCallback(
    ({ str }: { str: string }) => {
      if (!searchText) return str;
      const normalizedStr = str.replace(/\s+/g, " ").trim().toLowerCase();
      const normalizedSearch = searchText.replace(/\s+/g, " ").trim().toLowerCase();

      if (!normalizedStr || !normalizedSearch) return str;

      if (
        normalizedStr.length > 10 &&
        (normalizedSearch.includes(normalizedStr) || normalizedStr.includes(normalizedSearch))
      ) {
        return (
          <mark
            className="highlighted-text-fallback"
            style={{ backgroundColor: "rgba(255, 255, 0, 0.45)", color: "inherit", borderRadius: "2px" }}
          >
            {str}
          </mark>
        );
      }
      return str;
    },
    [searchText]
  );

  useEffect(() => {
    // If pdfjs fails to load for any reason, we can catch it here though static import usually throws at module level
    if (!pdfjs || !pdfjs.version) {
      setPdfModuleError("Failed to load PDF renderer.");
    }
  }, []);

  function onDocumentLoadSuccess({ numPages: total }: { numPages: number }) {
    setNumPages(total);
  }

  function onDocumentLoadError(error: Error) {
    setPdfModuleError(error.message || "Failed to load PDF.");
  }

  if (pdfModuleError) {
    return (
      <div ref={containerRef} className="flex h-full w-full flex-col overflow-hidden bg-slate-100">
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          PDF preview is using the browser fallback because the PDF viewer could not initialize.
          {/* <br /> Error: {pdfModuleError} */}
        </div>
        <iframe
          title="PDF preview"
          src={nativePdfViewerSrc}
          className="h-full w-full border-0 bg-white"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col items-center overflow-auto bg-slate-100 p-4">
      {pdfUrl ? (
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="flex items-center justify-center p-10 text-slate-400">Loading PDF...</div>}
          error={<div className="flex items-center justify-center p-10 text-red-500">Failed to load PDF.</div>}
        >
          <div
            className="relative overflow-hidden rounded-sm shadow-md"
            style={{
              width: renderedPageWidth || undefined,
              height: renderedPageHeight,
            }}
          >
            <Page
              key={`page-${safePage}-${searchText.slice(0, 32)}`}
              pageNumber={safePage}
              width={renderedPageWidth || undefined}
              renderAnnotationLayer={false}
              renderTextLayer={true}
              customTextRenderer={customTextRenderer as any}
            />
            {renderedPageWidth > 0 &&
              highlightRects.map((rect, index) => {
                const scaleX = renderedPageWidth / rect.page_width;
                const scaleY = (renderedPageHeight || rect.page_height) / rect.page_height;

                return (
                  <div
                    key={`${index}-${rect.x0}-${rect.y0}`}
                    id={index === 0 ? "highlight-rect-first" : undefined}
                    className="pointer-events-none absolute rounded-[3px]"
                    style={{
                      left: rect.x0 * scaleX,
                      top: rect.y0 * scaleY,
                      width: (rect.x1 - rect.x0) * scaleX,
                      height: (rect.y1 - rect.y0) * scaleY,
                      background: "rgba(255, 255, 0, 0.45)",
                      mixBlendMode: "multiply",
                      zIndex: 20,
                    }}
                  />
                );
              })}
          </div>
        </Document>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center justify-center p-10 text-slate-400">
            Loading PDF viewer...
          </div>
          {pdfUrl && (
            <iframe
              title="PDF preview"
              src={nativePdfViewerSrc}
              className="h-full w-full min-h-[480px] rounded-md border border-slate-200 bg-white"
            />
          )}
        </div>
      )}
    </div>
  );
}
