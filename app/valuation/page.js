"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useRef, useCallback } from "react";
import { Building2, Bot, Map, Workflow } from "lucide-react";

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
  const [compactPanel, setCompactPanel] = useState(null);

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

  const renderCompactNavigation = (activePanel = "assistant") => {
    const items = [
      { id: "assistant", label: "AI Assistant", icon: Bot, panel: null },
      { id: "workflow", label: "Execution Flow", icon: Workflow, panel: "workflow" },
      { id: "visual", label: "Visual / Report", icon: Map, panel: "visual" },
    ];

    return (
      <nav
        className="grid shrink-0 grid-cols-3 gap-1.5 rounded-2xl border border-border bg-bg-card/95 p-1.5 shadow-panel backdrop-blur min-[1071px]:hidden"
        aria-label="Valuation workspace navigation"
      >
        {items.map(({ id, label, icon: Icon, panel }) => {
          const isActive = activePanel === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCompactPanel(panel)}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 text-center transition active:scale-[0.97] ${
                isActive
                  ? "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]"
                  : "text-text-dim hover:bg-bg-input hover:text-text-primary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="max-w-full truncate text-[8px] font-bold uppercase tracking-[0.08em]">{label}</span>
            </button>
          );
        })}
      </nav>
    );
  };

  const renderCompactBrandHeader = () => (
    <div className="mb-3 flex shrink-0 items-center gap-4 border-b border-border bg-bg-header px-4 py-3 min-[1071px]:hidden">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] text-white shadow-[0_0_24px_rgba(34,211,238,0.35)]">
        <Building2 className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-sm uppercase tracking-[0.22em] text-text-primary">
          PropVal India
        </p>
        <p className="truncate text-xs uppercase tracking-[0.18em] text-text-dim">
          AI Property Valuation
        </p>
      </div>
    </div>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-deep text-text-primary">
      <div className="bg-grid" />
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />

      {/* Responsive panel width overrides */}
      <style>{`
        @media (min-width: 1071px) {
          .resize-panel-left { width: calc(${leftWidth}% - 6px) !important; }
          .resize-panel-middle { width: calc(${middleWidth}% - 6px) !important; }
          .resize-panel-right { width: calc(${100 - leftWidth - middleWidth}% - 12px) !important; }
        }
      `}</style>

      <div className="relative z-10 mt-20 flex h-[calc(100vh-5rem)] flex-col">
       

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6">
          <div className="mb-3 shrink-0 min-[1071px]:hidden">
            {renderCompactNavigation("assistant")}
          </div>

          <section ref={containerRef} className="grid h-full min-h-0 flex-1 grid-cols-1 gap-4 min-[1071px]:grid-cols-3">
            {/* Chat section */}
            <div className="min-h-0 min-w-0 relative">
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

            {/* Workflow Section */}
            <div className={`${compactPanel === "workflow" ? "fixed inset-0 z-[10000] flex" : "hidden"} min-h-0 min-w-0 flex-col bg-bg-deep p-3 min-[1071px]:static min-[1071px]:z-auto min-[1071px]:flex min-[1071px]:h-full min-[1071px]:bg-transparent min-[1071px]:p-0`}>
              {renderCompactBrandHeader()}
              <div className="mb-3 shrink-0 min-[1071px]:hidden">{renderCompactNavigation("workflow")}</div>
              <div className="min-h-0 flex-1">
                <WorkflowSection events={events} />
              </div>
            </div>

            {/* Map Section */}
            <div className={`${compactPanel === "visual" ? "fixed inset-0 z-[10000] flex" : "hidden"} min-h-0 min-w-0 flex-col bg-bg-deep p-3 min-[1071px]:static min-[1071px]:z-auto min-[1071px]:flex min-[1071px]:h-full min-[1071px]:bg-transparent min-[1071px]:p-0`}>
              {renderCompactBrandHeader()}
              <div className="mb-3 shrink-0 min-[1071px]:hidden">{renderCompactNavigation("visual")}</div>
              <div className="min-h-0 flex-1">
                <MapSection
                  markers={markers}
                  factorialData={factorialData}
                  onDensityUpdate={setDensityUpdates}
                  onAmenityUpdate={setAmenityUpdates}
                  onRoadUpdate={setRoadUpdates}
                  valuationResult={valuationResult}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
