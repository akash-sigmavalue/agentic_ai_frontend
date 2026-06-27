"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Building2, CircleAlert, ExternalLink, FileText, MapPin, ShieldCheck, Sparkles, TrendingUp, X } from "lucide-react";
import type { MapAgentAnalyzeResponse, MapAgentSelection, PricingRecord } from "./data";

type FullReportModalProps = {
  selection: MapAgentSelection;
  analysisResult: MapAgentAnalyzeResponse;
  reportType: "valuation" | "market";
  onClose: () => void;
};

export default function FullReportModal({ selection, analysisResult, reportType, onClose }: FullReportModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openAiRecords = useMemo(() => analysisResult.data.openai_intelligence || [], [analysisResult.data.openai_intelligence]);
  const groqRecords = useMemo(() => analysisResult.data.gemini_intelligence || [], [analysisResult.data.gemini_intelligence]);
  const allRecords = useMemo(() => [...openAiRecords, ...groqRecords], [openAiRecords, groqRecords]);
  const highConfidenceCount = allRecords.filter((record) => record.confidence?.toLowerCase() === "high").length;
  const uniquePortals = useMemo(() => new Set(allRecords.map((record) => record.portal).filter(Boolean)).size, [allRecords]);
  const rateSummary = useMemo(() => buildRateSummary(allRecords), [allRecords]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="map-agent-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="full-report-title" className="map-agent-modal">
        <header className="map-agent-modal-header">
          <div>
            <span className={reportType === "valuation" ? "indigo" : "emerald"}>MARKET INTELLIGENCE</span>
            <h2 id="full-report-title">{analysisResult.data.project_name || selection.projectName || "Location Intelligence Report"}</h2>
            <p><MapPin /> {analysisResult.data.location || selection.location || `${selection.coordinates.lat.toFixed(5)}, ${selection.coordinates.lng.toFixed(5)}`}</p>
          </div>
          <button type="button" aria-label="Close full report" title="Close report" onClick={onClose} className="map-agent-icon-button"><X /></button>
        </header>

        <div className="map-agent-modal-body">
          <section className="map-agent-report-hero">
            <div>
              <span><Sparkles /> AI market scan</span>
              <h3>{allRecords.length ? "Pricing evidence found for this selection" : "No pricing evidence found yet"}</h3>
              <p>
                {allRecords.length
                  ? `Found ${allRecords.length} source-backed record${allRecords.length === 1 ? "" : "s"} across ${uniquePortals || "multiple"} source${uniquePortals === 1 ? "" : "s"}. Review each rate and open the original source before using it in a decision.`
                  : "Try a more specific project name, nearby landmark, or property type to improve source discovery."}
              </p>
            </div>
            <div className="map-agent-rate-chip">
              <span>Observed rate</span>
              <strong>{rateSummary || "N/A"}</strong>
            </div>
          </section>

          <section className="map-agent-summary-grid">
            <div><span>Property type</span><strong>{selection.propertyType}</strong></div>
            <div><span>Total records</span><strong>{allRecords.length}</strong></div>
            <div><span>High confidence</span><strong>{highConfidenceCount}</strong></div>
          </section>

          <section className="map-agent-report-grid">
            <div><span>OpenAI records</span><strong>{openAiRecords.length}</strong></div>
            <div><span>Groq records</span><strong>{groqRecords.length}</strong></div>
            <div><span>Tokens used</span><strong>{analysisResult.tokens_used ?? 0}</strong></div>
            <div><span>Estimated cost</span><strong>{analysisResult.estimated_cost != null ? `$${analysisResult.estimated_cost}` : "N/A"}</strong></div>
          </section>

          <section>
            <h3><TrendingUp /> Pricing intelligence</h3>
            {allRecords.length ? (
              <div className="map-agent-record-list">
                <RecordGroup title="OpenAI web intelligence" records={openAiRecords} startIndex={1} />
                <RecordGroup title="Groq search intelligence" records={groqRecords} startIndex={openAiRecords.length + 1} />
              </div>
            ) : (
              <div className="map-agent-empty-state">
                <CircleAlert />
                <strong>No pricing records returned</strong>
                <p>The analysis completed, but no source-backed pricing evidence was found for this project and location.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RecordGroup({ title, records, startIndex }: { title: string; records: PricingRecord[]; startIndex: number }) {
  if (!records.length) return null;

  return (
    <div className="map-agent-record-group">
      <h4><Building2 />{title}</h4>
      {records.map((record, index) => (
        <article key={`${record.source_url}-${index}`} className="map-agent-record-card">
          <div className="map-agent-record-card-top">
            <div>
              <span className="map-agent-record-index">#{startIndex + index}</span>
              <span>{record.portal || "Unknown source"}</span>
            </div>
            <strong>{record.price_range || record.rate || "Rate unavailable"}</strong>
          </div>
          <dl className="map-agent-record-meta">
            <div><dt>Area type</dt><dd>{record.area_type || "N/A"}</dd></div>
            <div><dt>Confidence</dt><dd><ConfidenceBadge value={record.confidence} /></dd></div>
            {record.website_authenticity_score != null && <div><dt>Source score</dt><dd><ShieldCheck /> {record.website_authenticity_score}/100</dd></div>}
          </dl>
          <div className="map-agent-evidence-box">
            <span>Why this rate was captured</span>
            <p>{record.evidence || "No evidence text returned."}</p>
          </div>
          {record.confidence_rationale && <p className="map-agent-record-muted">{record.confidence_rationale}</p>}
          {record.source_url && (
            <a href={record.source_url} target="_blank" rel="noreferrer">
              <FileText /> View source <ExternalLink />
            </a>
          )}
        </article>
      ))}
    </div>
  );
}

function ConfidenceBadge({ value }: { value?: string }) {
  const normalized = (value || "N/A").toLowerCase();
  const className = normalized === "high" ? "high" : normalized === "medium" ? "medium" : normalized === "low" ? "low" : "";
  return <span className={`map-agent-confidence-badge ${className}`}>{value || "N/A"}</span>;
}

function buildRateSummary(records: PricingRecord[]): string {
  const rates = records
    .flatMap((record) => String(record.price_range || record.rate || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/g) || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!rates.length) return "";
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  if (min === max) return `₹${formatter.format(min)} / sq.ft`;
  return `₹${formatter.format(min)} - ₹${formatter.format(max)} / sq.ft`;
}
