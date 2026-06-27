"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { HighlightRect } from "../../types/api";
import React from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import { Document, Page, pdfjs } from "react-pdf";
interface CustomPdfViewerProps {
  pdfUrl: string;
  pageNumbers?: number[] | "all";
  searchText: string;
  highlightRects?: HighlightRect[];
}

export default function CustomPdfViewer({
  pdfUrl,
  pageNumbers = "all",
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

  const safePages = useMemo(() => {
    if (pageNumbers === "all") {
      return numPages ? Array.from({ length: numPages }, (_, i) => i + 1) : [1];
    }
    return pageNumbers.map(p => Math.min(Math.max(1, p), numPages ?? p));
  }, [pageNumbers, numPages]);

  const safePage = safePages[0] || 1;
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
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    <div ref={containerRef} className="relative flex h-full w-full flex-col bg-slate-100 p-4 overflow-hidden">
      {pdfUrl ? (
        <TransformWrapper
          initialScale={1}
          minScale={0.4}
          maxScale={3}
          centerOnInit={true}
          wheel={{ step: 0.04 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-6 right-6 z-[100] self-end flex gap-1 mb-2 bg-white/90 p-1.5 rounded-lg shadow-sm backdrop-blur-sm border border-slate-200">
                <button onClick={() => zoomOut()} className="px-2.5 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded">-</button>
                <button onClick={() => zoomIn()} className="px-2.5 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded">+</button>
                <button onClick={() => resetTransform()} className="px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded ml-1">Reset</button>
              </div>

              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", justifyContent: "center" }}>
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={<div className="flex items-center justify-center p-10 text-slate-400">Loading PDF...</div>}
                  error={<div className="flex items-center justify-center p-10 text-red-500">Failed to load PDF.</div>}
                >
                  <div className="flex w-max min-w-full flex-col gap-6 items-center select-none bg-slate-100">
                    {safePages.map(page => (
                      <div
                        key={`page-wrapper-${page}`}
                        className="relative overflow-visible rounded-sm shadow-md bg-white"
                        style={{
                          width: renderedPageWidth || undefined,
                          height: page === safePage ? renderedPageHeight : undefined,
                        }}
                      >
                        <Page
                          key={`page-${page}-${searchText.slice(0, 32)}`}
                          pageNumber={page}
                          width={renderedPageWidth || undefined}
                          renderAnnotationLayer={false}
                          renderTextLayer={true}
                          customTextRenderer={customTextRenderer as any}
                          devicePixelRatio={typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 1, 2.5) : 2.5}
                        />
                        {renderedPageWidth > 0 && page === safePage &&
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
                    ))}
                  </div>
                </Document>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
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
