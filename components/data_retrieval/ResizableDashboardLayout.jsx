"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "reai-dashboard-column-widths";
const MIN_LEFT = 300;
const MIN_CENTER = 360;
const MIN_RIGHT = 280;
// Set default width percentages: left 40%, center 30%, right 20%
const DEFAULT_LEFT_PERCENT = 0.4;
const DEFAULT_RIGHT_PERCENT = 0.2;

function readStoredWidths(containerWidth) {
  if (typeof window === "undefined") {
    return { left: Math.round(containerWidth * DEFAULT_LEFT_PERCENT), right: Math.round(containerWidth * DEFAULT_RIGHT_PERCENT) };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { left: Math.round(containerWidth * DEFAULT_LEFT_PERCENT), right: Math.round(containerWidth * DEFAULT_RIGHT_PERCENT) };
    }
    const parsed = JSON.parse(raw);
    return {
      left: Number(parsed.left) || Math.round(containerWidth * DEFAULT_LEFT_PERCENT),
      right: Number(parsed.right) || Math.round(containerWidth * DEFAULT_RIGHT_PERCENT),
    };
  } catch {
    return { left: Math.round(containerWidth * DEFAULT_LEFT_PERCENT), right: Math.round(containerWidth * DEFAULT_RIGHT_PERCENT) };
  }
}

function ResizeHandle({ onMouseDown, label }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onMouseDown={onMouseDown}
      className="group relative z-20 flex w-2 shrink-0 cursor-col-resize items-center justify-center"
    >
      <div
        className="h-14 w-1 rounded-full transition-all group-hover:h-20 group-active:scale-110"
        style={{ background: "color-mix(in srgb, var(--accent) 35%, var(--border-soft))" }}
      />
    </div>
  );
}

export default function ResizableDashboardLayout({ left, center, right }) {
  const containerRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(null);
  const [rightWidth, setRightWidth] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    
    const stored = readStoredWidths(containerWidth);
    setLeftWidth(stored.left);
    setRightWidth(stored.right);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: leftWidth, right: rightWidth }));
  }, [leftWidth, rightWidth]);

  const onMove = useCallback((event) => {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag || !container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const total = rect.width - 16;
    if (drag.side === "left") {
      const next = Math.min(Math.max(event.clientX - rect.left, MIN_LEFT), total - MIN_CENTER - MIN_RIGHT);
      setLeftWidth(next);
    } else {
      const next = Math.min(Math.max(rect.right - event.clientX, MIN_RIGHT), total - MIN_CENTER - MIN_LEFT);
      setRightWidth(next);
    }
  }, []);

  const onUp = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }, [onMove]);

  const startDrag = useCallback(
    (side) => (event) => {
      event.preventDefault();
      dragRef.current = { side };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onMove, onUp],
  );

  return (
    <div
      ref={containerRef}
      className="mx-auto flex h-[calc(100vh-5.75rem)] w-full max-w-[1920px] min-h-0 gap-0 px-4 py-4 lg:px-6 lg:py-5"
    >
      <div className="flex h-full min-h-0 min-w-0 shrink-0 flex-col" style={{ width: leftWidth ? `${leftWidth}px` : "40%" }}>
        {left}
      </div>

      <ResizeHandle onMouseDown={startDrag("left")} label="Resize chat panel" />

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{center}</div>

      <ResizeHandle onMouseDown={startDrag("right")} label="Resize visualization panel" />

      <div className="flex h-full min-h-0 min-w-0 shrink-0 flex-col" style={{ width: rightWidth ? `${rightWidth}px` : "20%" }}>
        {right}
      </div>
    </div>
  );
}
