"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useRef, useCallback } from "react";
import { Building2 } from "lucide-react";
import ThemeToggle from "@/components/valuation/shared/ThemeToggle";
import ChatSection from "@/components/valuation/agent-one/ChatSectionNext";
import WorkflowSection from "@/components/valuation/agent-one/WorkflowSectionNext";
import TokenAccessGate from "@/components/shared/TokenAccessGate";

const MapSection = dynamic(() => import("@/components/valuation/shared/MapSection"), { ssr: false });

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [markers, setMarkers] = useState([]);

  const statusText = useMemo(() => {
    if (events.length === 0) return "Agent Synchronized";
    const latest = events[events.length - 1];
    if (latest.type === "done") return "Pipeline Complete";
    if (latest.type === "error") return "Pipeline Error";
    if (latest.type === "clarification_needed") return "Awaiting Clarification";
    return "Agents Executing";
  }, [events]);

  const [densityUpdates, setDensityUpdates] = useState(null);
  const [amenityUpdates, setAmenityUpdates] = useState(null);
  const [roadUpdates, setRoadUpdates] = useState(null);

  // Valuation result state lifted from ChatSection for the Report tab in MapSection
  const [valuationResult, setValuationResult] = useState(null);

  // Resize split panel widths (percentages)
  const [leftWidth, setLeftWidth] = useState(33); // 33%
  const [middleWidth, setMiddleWidth] = useState(34); // 34%
  const containerRef = useRef(null);

  const handleEventsReset = useCallback((keepUpToEventType) => {
    setEvents((prev) => {
      const idx = [...prev].reverse().findIndex(e => e.type === keepUpToEventType);
      if (idx === -1) return prev;
      const cutPoint = prev.length - idx; // keep events up to and including that event
      return prev.slice(0, cutPoint);
    });
  }, []);

  const handleMouseDown = (dividerIndex) => (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startLeft = leftWidth;
    const startMiddle = middleWidth;
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 1200;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      if (dividerIndex === 0) {
        // Chat to Workflow divider
        const newLeft = Math.max(22, Math.min(45, startLeft + deltaPercent));
        setLeftWidth(newLeft);
      } else {
        // Workflow to Map divider
        const newMiddle = Math.max(22, Math.min(50, startMiddle + deltaPercent));
        if (leftWidth + newMiddle < 82) {
          setMiddleWidth(newMiddle);
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const factorialData = useMemo(() => {
    const ev = [...events].reverse().find(e => e.type === "factorial_results");
    if (!ev || !ev.content) return null;

    // Deep clone to avoid mutating the original event
    let data = JSON.parse(JSON.stringify(ev.content));

    if (densityUpdates && data.table) {
      data.table = data.table.map(row => {
        const update = densityUpdates.find(d => d.project_name === row.project_name);
        if (update && update.data) {
          row.builtup_density = update.data;
        }
        return row;
      });
    }

    if (amenityUpdates && data.table) {
      data.table = data.table.map(row => {
        const update = amenityUpdates.find(d => d.project_name === row.project_name);
        if (update) {
          if (update.amenity_summary) {
            row.amenity_summary = update.amenity_summary;
          } else if (update.amenities) {
            row.amenities = update.amenities;
          }
        }
        return row;
      });
    }

    if (roadUpdates && data.table) {
      data.table = data.table.map(row => {
        const update = roadUpdates.find(d => d.project_name === row.project_name);
        if (update) {
          row.road_type = update.road_type;
        }
        return row;
      });
    }

    return data;
  }, [events, densityUpdates, amenityUpdates, roadUpdates]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-deep text-text-primary">
      <div className="bg-grid" />
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />

      {/* Responsive panel width overrides */}
      <style>{`
        @media (min-width: 1280px) {
          .resize-panel-left { width: calc(${leftWidth}% - 6px) !important; }
          .resize-panel-middle { width: calc(${middleWidth}% - 6px) !important; }
          .resize-panel-right { width: calc(${100 - leftWidth - middleWidth}% - 12px) !important; }
        }
      `}</style>

      <div className="relative z-10 mt-20 flex h-[calc(100vh-5rem)] flex-col">
        <header className="border-b border-border bg-bg-header backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] text-white shadow-[0_0_24px_rgba(34,211,238,0.35)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-sm uppercase tracking-[0.22em] text-text-primary">
                  PropVal India
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-text-dim">
                  AI Property Valuation
                </p>
              </div>
              <span className="hidden rounded-md border border-border-glow bg-accent-glow px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-light md:inline-flex">
                v1.1 Agentic
              </span>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-xs font-semibold text-text-secondary md:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_16px_var(--success)] animate-pulse-glow" />
              <span>{statusText}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-lg border border-border bg-bg-card px-3 py-2 font-mono text-xs text-text-secondary md:block">
                <span className="text-text-dim">CORE:</span> GPT-4O
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6">
          <section ref={containerRef} className="flex flex-col xl:flex-row h-full min-h-0 flex-1 gap-4 xl:gap-0">
            {/* Chat section */}
            <div className="resize-panel-left w-full xl:h-full min-h-0 relative">
              <TokenAccessGate featureName="Valuation Agent">
                <ChatSection
                  onClear={() => {
                    setEvents([]);
                    setMarkers([]);
                    setValuationResult(null);
                  }}
                  onEvent={(event) => setEvents((prev) => [...prev, event])}
                  onEventsReset={handleEventsReset}
                  onMarkersUpdate={(m) => {
                    setMarkers(m);
                  }}
                  factorialData={factorialData}
                  onValuationResult={setValuationResult}
                  events={events}
                  setEvents={setEvents}
                />
              </TokenAccessGate>
            </div>

            {/* Splitter 1 */}
            <div 
              onMouseDown={handleMouseDown(0)}
              className="hidden xl:flex w-3 hover:w-3.5 bg-transparent cursor-col-resize items-center justify-center z-20 group relative h-full self-stretch"
            >
              <div className="w-[1px] h-20 bg-white/10 group-hover:bg-cyan-500/40 group-active:bg-cyan-500 transition-colors" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              </div>
            </div>

            {/* Workflow Section */}
            <div className="resize-panel-middle w-full xl:h-full min-h-0">
              <WorkflowSection events={events} />
            </div>

            {/* Splitter 2 */}
            <div 
              onMouseDown={handleMouseDown(1)}
              className="hidden xl:flex w-3 hover:w-3.5 bg-transparent cursor-col-resize items-center justify-center z-20 group relative h-full self-stretch"
            >
              <div className="w-[1px] h-20 bg-white/10 group-hover:bg-cyan-500/40 group-active:bg-cyan-500 transition-colors" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              </div>
            </div>

            {/* Map Section */}
            <div className="resize-panel-right w-full xl:h-full min-h-0">
              <MapSection
                markers={markers}
                factorialData={factorialData}
                onDensityUpdate={setDensityUpdates}
                onAmenityUpdate={setAmenityUpdates}
                onRoadUpdate={setRoadUpdates}
                valuationResult={valuationResult}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
