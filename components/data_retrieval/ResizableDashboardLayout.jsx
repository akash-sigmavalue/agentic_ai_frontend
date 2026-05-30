"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "reai-dashboard-column-widths";
const MIN_LEFT = 300;
const MIN_CENTER = 360;
const MIN_RIGHT = 280;
const DEFAULT_LEFT = 380;
const DEFAULT_RIGHT = 360;

function readStoredWidths() {
  if (typeof window === "undefined") {
    return { left: DEFAULT_LEFT, right: DEFAULT_RIGHT };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { left: DEFAULT_LEFT, right: DEFAULT_RIGHT };
    }
    const parsed = JSON.parse(raw);
    return {
      left: Number(parsed.left) || DEFAULT_LEFT,
      right: Number(parsed.right) || DEFAULT_RIGHT,
    };
  } catch {
    return { left: DEFAULT_LEFT, right: DEFAULT_RIGHT };
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
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT);
  const dragRef = useRef(null);

  useEffect(() => {
    const stored = readStoredWidths();
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
      <div className="flex h-full min-h-0 min-w-0 shrink-0 flex-col" style={{ width: leftWidth }}>
        {left}
      </div>

      <ResizeHandle onMouseDown={startDrag("left")} label="Resize chat panel" />

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">{center}</div>

      <ResizeHandle onMouseDown={startDrag("right")} label="Resize visualization panel" />

      <div className="flex h-full min-h-0 min-w-0 shrink-0 flex-col" style={{ width: rightWidth }}>
        {right}
      </div>
    </div>
  );
}
