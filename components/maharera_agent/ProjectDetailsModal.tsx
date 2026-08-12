"use client";

import { useEffect, useState } from "react";
import {
  X,
  Copy,
  Download,
  Building2,
  MapPin,
  User,
  Scale,
  FileText,
  Layers,
  ExternalLink,
  Braces,
  Calendar,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

type ProjectDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
};

export default function ProjectDetailsModal({ isOpen, onClose, data }: ProjectDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [openDocument, setOpenDocument] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    if (!openDocument) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDocument(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [openDocument]);

  if (!isOpen || !data) return null;

  // Safe structures
  const overview = data.project_overview || {};
  const developer = data.developer_information || {};
  const location = data.location_information || {};
  const config = data.project_configuration || {};
  const legal = data.legal_compliance || {};
  const deepScrape = data.deep_scrape || {};
  const documents = [
    ...(Array.isArray(data.documents) ? data.documents : []),
    ...(Array.isArray(deepScrape.documents) ? deepScrape.documents : []),
  ].filter((doc: any, index: number, all: any[]) => {
    const url = doc?.url || doc?.href;
    return Boolean(url) && all.findIndex((item) => (item?.url || item?.href) === url) === index;
  });
  const additional = data.additional_fields || {};
  const sourceUrl = data.source_url || data.SourceUrl || data["Source URL"] || "";

  // Grab deep scrape tables/sections
  const rawSections = deepScrape.sections || deepScrape.tables || {};

  type TableSection = { title: string; rows: Record<string, unknown>[] };
  const scrapedTableSections: TableSection[] = [];
  const collectSections = (value: unknown, path: string[] = []) => {
    if (Array.isArray(value)) {
      scrapedTableSections.push({
        title: path.filter(Boolean).join(" > ") || "Project Details",
        rows: value.filter(
          (row): row is Record<string, unknown> =>
            Boolean(row) && typeof row === "object" && !Array.isArray(row)
        ),
      });
      return;
    }
    if (!value || typeof value !== "object") return;
    Object.entries(value).forEach(([key, child]) =>
      collectSections(child, [...path, key])
    );
  };
  collectSections(rawSections);

  // Normalize key names for checking
  const cleanKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Helper to scan all keys/sections to extract numerical highlights dynamically
  const findMetric = (keywords: string[]): string | number | null => {
    // 1. Check flat fields on top-level
    for (const key of Object.keys(data)) {
      const kClean = cleanKey(key);
      if (keywords.every(kw => kClean.includes(kw))) {
        if (typeof data[key] === "string" || typeof data[key] === "number") return data[key];
      }
    }
    // 2. Check flat summary fields
    const summary = deepScrape.summary || {};
    for (const key of Object.keys(summary)) {
      const kClean = cleanKey(key);
      if (keywords.every(kw => kClean.includes(kw))) {
        return summary[key];
      }
    }
    // 3. Check within sections
    for (const section of scrapedTableSections) {
      for (const row of section.rows) {
          if (row && typeof row === "object") {
            for (const key of Object.keys(row)) {
              const kClean = cleanKey(key);
              if (keywords.every(kw => kClean.includes(kw))) {
                const value = row[key];
                if (typeof value === "string" || typeof value === "number") {
                  return value;
                }
              }
            }
          }
      }
    }
    return null;
  };

  // Find highlights
  const totalUnits = findMetric(["total", "unit"]) || findMetric(["number", "apartment"]) || findMetric(["total", "apartment"]);
  const sanctionedUnits = findMetric(["sanctioned"]);
  const notSanctionedUnits = findMetric(["notsanctioned"]) || findMetric(["mortgage"]);
  const totalArea = findMetric(["total", "area"]) || findMetric(["phase", "area"]);

  // Calculate sanction progress percentage
  const numSanctioned = parseFloat(String(sanctionedUnits).replace(/[^0-9.]/g, ""));
  const numTotal = parseFloat(String(totalUnits).replace(/[^0-9.]/g, ""));
  const sanctionProgress = !isNaN(numSanctioned) && !isNaN(numTotal) && numTotal > 0
    ? Math.min(100, Math.round((numSanctioned / numTotal) * 100))
    : null;

  // Filter sections into standard tabs or dynamic tabs
  const mappedSections: Record<string, { title: string; rows: any[] }[]> = {
    overview: [],
    location: [],
    developer: [],
    specs: [],
    complaints: [],
    agents: [],
    documents: [],
  };
  const dynamicTabs: Record<string, { title: string; rows: any[] }[]> = {};

  const portalTabNames = [
    "Uploaded Documents",
    "Enquired Documents",
    "Quarterly Updates",
    "Completion Details",
  ];

  scrapedTableSections.forEach(({ title: sectionName, rows }) => {
    const nameLow = sectionName.toLowerCase();

    const sectionData = { title: sectionName, rows };
    const portalTab = portalTabNames.find((name) =>
      nameLow.includes(name.toLowerCase())
    );

    if (portalTab) {
      const tabKey = cleanKey(portalTab);
      if (!dynamicTabs[tabKey]) dynamicTabs[tabKey] = [];
      dynamicTabs[tabKey].push(sectionData);
    } else if (nameLow.includes("complaint")) {
      mappedSections.complaints.push(sectionData);
    } else if (nameLow.includes("agent")) {
      mappedSections.agents.push(sectionData);
    } else if (nameLow.includes("location") || nameLow.includes("address")) {
      mappedSections.location.push(sectionData);
    } else if (nameLow.includes("promoter") || nameLow.includes("developer") || nameLow.includes("organization")) {
      mappedSections.developer.push(sectionData);
    } else if (nameLow.includes("document") || nameLow.includes("noc") || nameLow.includes("declaration")) {
      mappedSections.documents.push(sectionData);
    } else if (
      nameLow.includes("unit") ||
      nameLow.includes("area") ||
      nameLow.includes("plot") ||
      nameLow.includes("parking")
    ) {
      mappedSections.specs.push(sectionData);
    } else if (nameLow.includes("project") || nameLow.includes("general") || nameLow.includes("registration")) {
      mappedSections.overview.push(sectionData);
    } else {
      // Dynamic tab based on cleaned section name
      const tabTitle = sectionName
        .split(">")
        .pop()!
        .trim();
      const tabKey = tabTitle.toLowerCase().replace(/[^a-z0-9]/g, "-");
      if (!dynamicTabs[tabKey]) {
        dynamicTabs[tabKey] = [];
      }
      dynamicTabs[tabKey].push({ title: tabTitle, rows });
    }
  });

  const structuredTableSections = [
    { title: "Project Overview", value: overview },
    { title: "Developer Information", value: developer },
    { title: "Location Information", value: location },
    { title: "Project Configuration", value: config },
    { title: "Legal Compliance", value: legal },
    { title: "Additional Fields", value: additional },
  ]
    .filter(({ value }) => value && typeof value === "object" && Object.keys(value).length > 0)
    .map(({ title, value }) => ({ title, rows: [value] }));

  const documentTableSections = documents.length > 0
    ? [{ title: "Documents", rows: documents }]
    : [];

  const allTableSections = [
    ...structuredTableSections,
    ...documentTableSections,
    ...scrapedTableSections,
  ];

  // Safe formatting function
  const formatVal = (val: any) => {
    if (val === null || val === undefined || val === "") return <span className="text-text-dim/60 italic">Not available</span>;
    if (typeof val === "boolean") {
      return val ? (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
          <CheckCircle className="h-3.5 w-3.5" /> Yes
        </span>
      ) : (
        <span className="text-xs font-bold text-text-dim">No</span>
      );
    }
    return <span className="text-text-secondary font-medium">{String(val)}</span>;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rera_project_${overview.rera_number || "details"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const showDocument = (name: string, url: string) => {
    if (url) setOpenDocument({ name: name || "Project document", url });
  };

  // Compile Tab List
  const tabsList = [
    { id: "all", label: "All Tables", icon: Layers, count: allTableSections.length },
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "location", label: "Location", icon: MapPin },
    { id: "developer", label: "Promoter", icon: User },
    { id: "specs", label: "Units & Area", icon: Layers },
    { id: "complaints", label: "Complaints", icon: Scale, count: mappedSections.complaints.reduce((acc, s) => acc + s.rows.length, 0) },
    { id: "agents", label: "Agents", icon: User, count: mappedSections.agents.reduce((acc, s) => acc + s.rows.length, 0) },
    { id: "documents", label: "Documents", icon: FileText, count: documents.length + mappedSections.documents.reduce((acc, s) => acc + s.rows.length, 0) },
  ];

  // Add dynamic tabs
  Object.keys(dynamicTabs).forEach((tabKey) => {
    const tabList = dynamicTabs[tabKey];
    tabsList.push({
      id: tabKey,
      label: tabList[0].title,
      icon: HelpCircle,
      count: tabList.reduce((acc, s) => acc + s.rows.length, 0),
    });
  });

  // Add Raw tab
  tabsList.push({ id: "raw", label: "Raw Data", icon: Braces });

  // Get active sections
  const getActiveTabSections = () => {
    if (activeTab === "all") return allTableSections;
    if (activeTab === "overview") return mappedSections.overview;
    if (activeTab === "location") return mappedSections.location;
    if (activeTab === "developer") return mappedSections.developer;
    if (activeTab === "specs") return mappedSections.specs;
    if (activeTab === "complaints") return mappedSections.complaints;
    if (activeTab === "agents") return mappedSections.agents;
    if (activeTab === "documents") return mappedSections.documents;
    return dynamicTabs[activeTab] || [];
  };

  const activeSections = getActiveTabSections();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/85 p-4 backdrop-blur-md">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-3xl border border-border bg-bg-panel shadow-2xl backdrop-blur-xl">
        {/* Header Section */}
        <div className="border-b border-border px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                  RERA Project Profile
                </span>
                <span className="rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-light">
                  {data.record_type || "detail"}
                </span>
              </div>
              <h2 className="mt-1 truncate text-xl font-black uppercase tracking-[0.1em] text-text-primary">
                {overview.project_name || data["Project Name"] || data.project_name || data.Name || "Project Details"}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {findMetric(["district"]) && (
                  <span className="rounded-xl border border-border bg-bg-card/40 px-2.5 py-1 text-xs font-bold text-text-secondary">
                    📍 {String(findMetric(["district"]))}
                    {(findMetric(["state"]) || data.state) ? `, ${String(findMetric(["state"]) || data.state)}` : ""}
                  </span>
                )}
                {findMetric(["project", "type"]) && (
                  <span className="rounded-xl border border-border bg-bg-card/40 px-2.5 py-1 text-xs font-bold text-text-secondary">
                    🏢 {String(findMetric(["project", "type"]))}
                  </span>
                )}
                {findMetric(["status"]) && (
                  <span className="rounded-xl bg-warning/10 border border-warning/20 px-2.5 py-1 text-xs font-bold text-warning uppercase">
                    {String(findMetric(["status"]))}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-bg-card px-3.5 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-text-secondary transition hover:border-border-glow hover:text-text-primary"
                >
                  <ExternalLink className="h-4 w-4 text-accent" />
                  Source Portal
                </a>
              )}
              <button
                onClick={onClose}
                type="button"
                className="rounded-xl border border-border bg-bg-card p-2.5 text-text-secondary transition hover:border-border-glow hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Metric Highlights */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
            <HighlightCard label="Total Units" value={totalUnits} />
            <HighlightCard label="Sanctioned" value={sanctionedUnits} colorClass="text-success" />
            <HighlightCard label="Not Sanctioned" value={notSanctionedUnits} colorClass="text-danger" />
            <HighlightCard label="Total Area" value={totalArea} />
            <div className="col-span-2 rounded-2xl border border-border bg-bg-card/40 px-4 py-3 sm:col-span-2 md:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-dim">Sanction Progress</p>
                <p className="font-mono text-xs font-bold text-success">
                  {sanctionProgress === null ? "N/A" : `${sanctionProgress}%`}
                </p>
              </div>
              <div className="mt-2.5 h-2 w-full rounded-full bg-bg-deep">
                <div
                  className="h-full rounded-full bg-success transition-all duration-500"
                  style={{ width: `${sanctionProgress || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="custom-scrollbar flex items-center gap-1 overflow-x-auto border-b border-border/60 bg-bg-deep/20 px-6 py-2">
          {tabsList.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                  active
                    ? "bg-accent text-bg-deep"
                    : "text-text-secondary hover:bg-bg-card/50 hover:text-text-primary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-bg-deep text-accent" : "bg-bg-card text-text-dim"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-8">
          {activeTab === "overview" && activeSections.length === 0 && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoBlock label="Project Name" value={overview.project_name || data["Project Name"] || data.project_name} />
              <InfoBlock label="RERA Registration No" value={overview.rera_number || data["Registration No."] || data.rera_number} />
              <InfoBlock label="Application No" value={overview.application_no || data["Application No."] || data.application_no} />
              <InfoBlock label="Project Status" value={overview.registration_status || data.Status || data.status} />
              <InfoBlock label="Project Type" value={overview.project_type || data["Project Type"] || data.type} />
              <InfoBlock label="Registration Date" value={overview.registration_date} icon={Calendar} />
              <InfoBlock label="Completion Date" value={overview.completion_date || overview.expected_completion_date} icon={Calendar} />
            </div>
          )}

          {/* Tab: Documents Fallback */}
          {activeTab === "documents" && documents.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-text-dim mb-4">
                Primary Project Documents
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                {documents.map((doc: any, i: number) => {
                  const text = doc.text || doc.name || doc.title || `Document ${i + 1}`;
                  const href = doc.href || doc.url || "";
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-card/40 p-4 transition hover:border-border-glow"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-dim">
                          {doc.field || "Project document"}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-text-secondary" title={text}>
                          {text}
                        </p>
                      </div>
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${text} in a new tab`}
                          onClick={(event) => {
                            if (event.altKey) {
                              event.preventDefault();
                              showDocument(text, href);
                            }
                          }}
                          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 text-[10px] font-black uppercase tracking-[0.1em] text-bg-deep transition hover:bg-accent-light"
                        >
                          <ExternalLink className="h-4 w-4" /> View
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Table Sections */}
          {activeSections.length > 0 ? (
            <div className="space-y-8">
              {activeSections.map((sec, idx) => (
                <div key={idx} className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-[0.18em] text-accent-light border-b border-border/60 pb-2">
                    {sec.title}
                  </h4>
                  <div className="custom-scrollbar overflow-x-auto rounded-2xl border border-border bg-bg-card/20">
                    <TableGrid rows={sec.rows} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            activeTab !== "raw" && activeTab !== "overview" && activeTab !== "documents" && activeTab !== "all" && (
              <div className="flex min-h-60 flex-col items-center justify-center text-center text-text-dim">
                <HelpCircle className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No structured data found for this category.</p>
              </div>
            )
          )}

          {activeTab === "all" && allTableSections.length === 0 && (
            <div className="flex min-h-60 flex-col items-center justify-center text-center text-text-dim">
              <HelpCircle className="mb-2 h-10 w-10 opacity-50" />
              <p className="text-sm">No table data is available for this record.</p>
            </div>
          )}

          {/* Tab: Raw JSON */}
          {activeTab === "raw" && (
            <div className="relative h-full">
              <div className="absolute right-4 top-4 flex gap-2">
                <button
                  onClick={copyToClipboard}
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-card px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary transition hover:border-border-glow hover:text-text-primary"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied" : "Copy JSON"}
                </button>
                <button
                  onClick={downloadJson}
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-card px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary transition hover:border-border-glow hover:text-text-primary"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
              <pre className="custom-scrollbar overflow-auto rounded-2xl border border-border bg-bg-deep/60 p-4 font-mono text-xs leading-5 text-accent-light max-h-[50vh]">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}

          {/* Fallback for general unmapped keys if overview tab is selected */}
          {activeTab === "overview" && Object.keys(additional).length > 0 && (
            <div className="pt-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-text-dim mb-4">
                Additional Extracted Fields
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {Object.entries(additional).map(([key, val]) => (
                  <InfoBlock key={key} label={key.replace(/_/g, " ")} value={val} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {openDocument && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpenDocument(null);
          }}
          role="presentation"
        >
          <div
            className="flex h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-border bg-bg-panel shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Document viewer: ${openDocument.name}`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="min-w-0 truncate text-sm font-bold text-text-primary" title={openDocument.name}>{openDocument.name}</p>
              <div className="flex shrink-0 items-center gap-2">
                <a href={openDocument.url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-black uppercase text-bg-deep">
                  <Download className="h-4 w-4" /> Download
                </a>
                <button type="button" onClick={() => setOpenDocument(null)} aria-label="Close document viewer" className="flex items-center gap-1.5 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs font-black uppercase text-text-primary">
                  <X className="h-4 w-4" /> Close
                </button>
              </div>
            </div>
            <iframe src={openDocument.url} title={openDocument.name} className="min-h-0 flex-1 bg-white" />
            <p className="border-t border-border px-4 py-2 text-center text-[10px] text-text-dim">
              If the RERA portal blocks embedded viewing, use Download to open the original document.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Sub-component for individual info blocks
  function InfoBlock({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card/40 px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-dim truncate" title={label}>
          {label}
        </p>
        <div className="mt-1.5 flex items-start gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 mt-0.5 text-accent" />}
          <div className="min-w-0 text-sm leading-relaxed">{formatVal(value)}</div>
        </div>
      </div>
    );
  }

  // Highlight metric cards
  function HighlightCard({ label, value, colorClass }: { label: string; value: any; colorClass?: string }) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card/40 px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-text-dim truncate">{label}</p>
        <p className={`mt-1 text-base font-black tracking-tight ${colorClass || "text-text-primary"}`}>
          {String(value || "-")}
        </p>
      </div>
    );
  }

  // Dynamic Table Renderer
  function TableGrid({ rows }: { rows: any[] }) {
    if (!rows.length) return <p className="p-4 text-xs italic text-text-dim">No records</p>;

    // Get all column keys
    const cols: string[] = Array.from(
      rows.reduce<Set<string>>((acc, row) => {
        if (row && typeof row === "object") {
          Object.keys(row).forEach((k) => acc.add(k));
        }
        return acc;
      }, new Set<string>())
    );

    return (
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-bg-deep/45">
            {cols.map((col) => (
              <th key={col} className="border-b border-border px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-accent-light whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-white/[0.02] border-b border-border/40">
              {cols.map((col) => {
                const cellVal = row[col];
                const linkedValue =
                  cellVal && typeof cellVal === "object" && !Array.isArray(cellVal)
                    ? cellVal
                    : null;
                if (linkedValue?.url || linkedValue?.href) {
                  const url = String(linkedValue.url || linkedValue.href);
                  const label = String(linkedValue.text || col || "View document");
                  return (
                    <td key={col} className="px-4 py-3 whitespace-nowrap">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${label} in a new tab`}
                        onClick={(event) => {
                          if (event.altKey) {
                            event.preventDefault();
                            showDocument(label, url);
                          }
                        }}
                        className="font-bold text-accent transition hover:text-accent-light hover:underline"
                      >
                        👁️ View Document
                      </a>
                    </td>
                  );
                }
                // Render view details links
                if (String(cellVal).toLowerCase() === "view" || String(cellVal).toLowerCase() === "view photo") {
                  return (
                    <td key={col} className="px-4 py-3 text-accent font-bold cursor-pointer whitespace-nowrap">
                      👁️ View Document
                    </td>
                  );
                }
                return (
                  <td key={col} className="px-4 py-3 text-text-secondary whitespace-normal max-w-xs leading-relaxed">
                    {formatVal(cellVal)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
