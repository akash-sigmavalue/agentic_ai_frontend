"use client";

import { useEffect, useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { HighlightRect } from "../../types/api";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const safePage = Math.min(Math.max(1, pageNumber), numPages ?? pageNumber);
  const renderedPageWidth = containerWidth ? Math.max(containerWidth - 32, 0) : 0;
  const firstRect = highlightRects[0];
  const renderedPageHeight =
    renderedPageWidth && firstRect ? renderedPageWidth * (firstRect.page_height / firstRect.page_width) : undefined;

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
          <div
            className="relative shadow-md rounded-sm overflow-hidden"
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
            />
            {renderedPageWidth > 0 &&
              highlightRects.map((rect, index) => {
                const scaleX = renderedPageWidth / rect.page_width;
                const scaleY = (renderedPageHeight || rect.page_height) / rect.page_height;

                return (
                  <div
                    key={`${index}-${rect.x0}-${rect.y0}`}
                    className="absolute pointer-events-none rounded-[3px]"
                    style={{
                      left: rect.x0 * scaleX,
                      top: rect.y0 * scaleY,
                      width: (rect.x1 - rect.x0) * scaleX,
                      height: (rect.y1 - rect.y0) * scaleY,
                      background: "rgba(255, 230, 0, 0.45)",
                      mixBlendMode: "multiply",
                      zIndex: 20,
                    }}
                  />
                );
              })}
          </div>
        </Document>
      )}
    </div>
  );
}
