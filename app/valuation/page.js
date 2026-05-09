"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import ThemeToggle from "@/components/valuation/shared/ThemeToggle";
import ChatSection from "@/components/valuation/agent-one/ChatSectionNext";
import WorkflowSection from "@/components/valuation/agent-one/WorkflowSectionNext";

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
          // Preserve existing summary if update doesn't have a new one, 
          // or construct a new one from the updated amenities list
          if (update.amenity_summary) {
            row.amenity_summary = update.amenity_summary;
          } else if (update.amenities) {
            // If the map only sends a list of amenities, we could calculate counts here,
            // but for now, let's just make sure we don't break the existing one with a null/undefined score.
            // We'll update MapSection to send the summary too.
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

      <div className="relative z-10 mt-20 flex h-[calc(100vh-5rem)] flex-col">
        <header className="border-b border-border bg-bg-header backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] text-white shadow-[0_0_24px_rgba(34,211,238,0.35)]">
                🏢
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
          <section className="grid h-full min-h-0 flex-1 gap-4 xl:grid-cols-[1.05fr_1.2fr_0.95fr]">
            <ChatSection
              onClear={() => {
                setEvents([]);
                setMarkers([]);
                setMarkers([]);
              }}
              onEvent={(event) => setEvents((prev) => [...prev, event])}
              onMarkersUpdate={(m) => {
                setMarkers(m);
              }}
              backendUrl="http://localhost:8000"
              factorialData={factorialData}
            />
            <WorkflowSection events={events} />
            <MapSection markers={markers} factorialData={factorialData} onDensityUpdate={setDensityUpdates} onAmenityUpdate={setAmenityUpdates} onRoadUpdate={setRoadUpdates} backendUrl="http://localhost:8000" />
          </section>
        </div>
      </div>
    </main>
  );
}
