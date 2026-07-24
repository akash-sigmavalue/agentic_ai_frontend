'use client';

import { useState, useRef, useEffect } from 'react';
import { parse } from 'marked';
import Link from 'next/link';
import { apiUrl } from '@/lib/api-client';
import "./web_search.css"

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: string;
  sources?: {
    url: string;
    title: string;
    time_ago?: string;
    trust_score?: number;
    verification_status?: string;
  }[];
  planningSections?: Record<string, PlanningSectionResult[]>;
  accuracy?: {
    accuracy_score: number;
    confidence_level: string;
    recommendation: string;
    validated_claims: { claim: string; source_count: number }[];
  };
  isStreaming?: boolean;
  generatedAt?: string;
  tokenUsage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    total_cost: number;
  };
};

type SourceResult = {
  url: string;
  title: string;
  time_ago?: string;
  source_trust?: number;
  trust_score?: number;
  verification_status?: string;
};

type LinkSelectionReason = {
  url?: string;
  label?: string;
  reason?: string;
  selection_reason?: string;
  reason_for_selection?: string;
  description?: string;
};

type PlanningSectionResult = {
  document_title?: string;
  plan_title?: string;
  notification_title?: string;
  document_type?: string;
  plan_type?: string;
  notification_type?: string;
  document_status?: string;
  plan_status?: string;
  exact_document_url?: string;
  direct_document_url?: string;
  notification_url?: string;
  source_page_url?: string;
  official_source?: boolean;
  trust_score?: number;
  relevance_score?: number;
  rank_score?: number;
  confidence_score?: number;
  planning_authority?: string;
  jurisdiction?: string;
  applicability?: string;
  applicability_to_location?: string;
  coordinate_coverage_status?: string;
  map_or_gis_url?: string;
  issuing_authority?: string;
  related_planning_authority?: string;
  notification_date?: string;
  reason_for_selection?: string;
  source_page_reason_for_selection?: string;
  exact_document_reason_for_selection?: string;
  direct_document_reason_for_selection?: string;
  notification_reason_for_selection?: string;
  map_or_gis_reason_for_selection?: string;
  link_selection_reasons?: Record<string, string> | LinkSelectionReason[];
  document_url_reasons?: Record<string, string> | LinkSelectionReason[];
  url_selection_reasons?: Record<string, string> | LinkSelectionReason[];
  summary?: string;
};

type DocumentUrlStatus = 'direct_pdf' | 'downloadable' | 'webpage' | 'unknown';

type SourceRowInput = {
  label: string;
  url?: string;
  reason?: string;
};

const perLinkReasonInstruction = `

Planning document link explanation requirement:
For every PDF link or document URL included in each planning_sections section, generate a separate Reason for Selection for that exact URL. Do not provide one common reason for all links.
Return URL-specific reasons using fields such as source_page_reason_for_selection, exact_document_reason_for_selection, direct_document_reason_for_selection, notification_reason_for_selection, map_or_gis_reason_for_selection, or a link_selection_reasons map keyed by URL.
Each reason must explain official source reliability, match with the user's location and coordinates, planning authority or jurisdiction match, section type fit (regulation, development plan, notification, map/GIS, or source page), title/content relevance, current applicability or document status, and confidence that the link is useful and valid.
`;

const planningSectionTitles: Record<string, string> = {
  section_1: 'Section 1: Building, Development and Zoning Regulations',
  section_2: 'Section 2: Master Plan or Development Plan',
  section_3: 'Section 3: Planning Authority Notifications',
};

const sectionResultTitle: Record<string, string> = {
  section_1: 'Applicable Document',
  section_2: 'Applicable Development Plan',
  section_3: 'Relevant Notification',
};

const normalizeScore = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value <= 1 ? value * 100 : value));
};

const scorePercent = (value?: number) => `${normalizeScore(value).toFixed(0)}/100`;

const confidencePercent = (sections?: Record<string, PlanningSectionResult[]>) => {
  const scores = Object.values(sections || {})
    .flat()
    .map((item) => normalizeScore(item.confidence_score))
    .filter((score) => score > 0);

  if (!scores.length) return 0;
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
};

const getSectionSummary = (sectionKey: string) => {
  if (sectionKey === 'section_1') return 'Applicable statutory regulations and development controls.';
  if (sectionKey === 'section_2') return 'Applicable planning documents and spatial development information.';
  if (sectionKey === 'section_3') return 'Official notifications, circulars, amendments and government directions.';
  return 'Verified planning information from ranked sources.';
};

const getReportTitle = (sections?: Record<string, PlanningSectionResult[]>) => {
  const firstItem = Object.values(sections || {}).flat()[0];
  const location = firstItem?.jurisdiction?.split(',')[0] || firstItem?.applicability_to_location || 'Selected Location';
  return `${location} Planning & Development Review`;
};

const getLocationDetails = (sections?: Record<string, PlanningSectionResult[]>) => {
  const firstItem = Object.values(sections || {}).flat()[0];
  return [
    ['Location', firstItem?.jurisdiction?.split(',')[0] || firstItem?.applicability_to_location || 'Selected location'],
    ['Authority', firstItem?.planning_authority || firstItem?.related_planning_authority || firstItem?.issuing_authority || 'Authority to verify'],
    ['Jurisdiction', firstItem?.jurisdiction || 'Planning jurisdiction to verify'],
    ['Status', firstItem?.document_status || firstItem?.plan_status || 'Subject to latest official source'],
  ];
};

const getSectionLabel = (sectionKey: string, item: PlanningSectionResult) => {
  if (sectionKey === 'section_2') return item.plan_status || 'Status to be verified';
  if (sectionKey === 'section_3') return item.notification_type || 'Official Source';
  return item.document_status || 'Applicable';
};

const scoreItems = (item: PlanningSectionResult): [string, number | undefined][] => [
  ['Trust Score', item.trust_score],
  ['Relevance Score', item.relevance_score],
  ['Rank Score', item.rank_score],
  ['Confidence Score', item.confidence_score],
];

const downloadableDocumentExtensions = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
  '.rtf',
  '.txt',
  '.zip',
];

const normalizeUrlForExtensionCheck = (url: string) => {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.split(/[?#]/)[0].toLowerCase();
  }
};

const getUrlExtensionStatus = (url?: string): DocumentUrlStatus => {
  if (!url) return 'unknown';
  const pathname = normalizeUrlForExtensionCheck(url);
  if (pathname.endsWith('.pdf')) return 'direct_pdf';
  if (downloadableDocumentExtensions.some((extension) => pathname.endsWith(extension))) return 'downloadable';
  return 'unknown';
};

const getDocumentCandidateUrl = (item: PlanningSectionResult) =>
  item.exact_document_url || item.direct_document_url || item.notification_url || '';

const getDocumentFileName = (url: string) => {
  try {
    const pathname = new URL(url).pathname;
    const fileName = pathname.split('/').filter(Boolean).pop();
    return fileName ? decodeURIComponent(fileName) : undefined;
  } catch {
    return undefined;
  }
};

const downloadExactDocument = async (url: string) => {
  const fileName = getDocumentFileName(url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed with ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    if (fileName) link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    const link = document.createElement('a');
    link.href = url;
    if (fileName) link.download = fileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};

const normalizeReasonText = (value?: string) => value?.replace(/\s+/g, ' ').trim();

const reasonFromCollection = (
  collection: PlanningSectionResult['link_selection_reasons'],
  label: string,
  url: string
) => {
  if (!collection) return undefined;

  if (Array.isArray(collection)) {
    const match = collection.find((entry) => entry.url === url || entry.label === label);
    return normalizeReasonText(match?.reason || match?.selection_reason || match?.reason_for_selection || match?.description);
  }

  return normalizeReasonText(collection[url] || collection[label]);
};

const getFallbackLinkReason = (sectionKey: string, item: PlanningSectionResult, label: string, url: string) => {
  const title = item.document_title || item.plan_title || item.notification_title || 'this planning document';
  const authority = item.planning_authority || item.related_planning_authority || item.issuing_authority || 'the relevant planning authority';
  const jurisdiction = item.jurisdiction || item.applicability_to_location || 'the selected location';
  const status = item.plan_status || item.document_status || item.applicability || 'current applicability must be verified from the official source';
  const sectionType = planningSectionTitles[sectionKey]?.replace(/^Section \d+:\s*/, '').toLowerCase() || 'planning source';
  const trust = normalizeScore(item.trust_score);
  const relevance = normalizeScore(item.relevance_score);
  const confidence = normalizeScore(item.confidence_score || item.rank_score);
  const officialReliability = item.official_source
    ? 'an official source'
    : trust >= 80
      ? 'a high-trust source associated with the planning record'
      : 'a source that should be cross-checked against the issuing authority';
  const confidenceText = Math.round(Math.max(confidence, relevance, trust)) || 'available';

  return `${label} was selected for ${title} because it is ${officialReliability}, aligns with ${jurisdiction} and ${authority}, and fits the ${sectionType} section. Its title/content signals planning relevance, its status is ${status}, and the link is treated as useful with ${confidenceText} confidence for validation: ${url}`;
};

const getLinkSelectionReason = (sectionKey: string, item: PlanningSectionResult, label: string, url?: string) => {
  if (!url) return undefined;

  const fieldReasons: Record<string, string | undefined> = {
    'Official Source Page': item.source_page_reason_for_selection,
    'Exact Document URL': item.exact_document_reason_for_selection,
    'Direct Document URL': item.direct_document_reason_for_selection,
    'Notification URL': item.notification_reason_for_selection,
    'Map or GIS URL': item.map_or_gis_reason_for_selection,
  };

  return normalizeReasonText(fieldReasons[label])
    || reasonFromCollection(item.link_selection_reasons, label, url)
    || reasonFromCollection(item.document_url_reasons, label, url)
    || reasonFromCollection(item.url_selection_reasons, label, url)
    || getFallbackLinkReason(sectionKey, item, label, url);
};

const buildSourceRows = (sectionKey: string, item: PlanningSectionResult): SourceRowInput[] => [
  {
    label: 'Official Source Page',
    url: item.source_page_url,
    reason: getLinkSelectionReason(sectionKey, item, 'Official Source Page', item.source_page_url),
  },
  {
    label: 'Exact Document URL',
    url: item.exact_document_url,
    reason: getLinkSelectionReason(sectionKey, item, 'Exact Document URL', item.exact_document_url),
  },
  {
    label: 'Direct Document URL',
    url: item.direct_document_url,
    reason: getLinkSelectionReason(sectionKey, item, 'Direct Document URL', item.direct_document_url),
  },
  {
    label: 'Notification URL',
    url: item.notification_url,
    reason: getLinkSelectionReason(sectionKey, item, 'Notification URL', item.notification_url),
  },
  {
    label: 'Map or GIS URL',
    url: item.map_or_gis_url,
    reason: getLinkSelectionReason(sectionKey, item, 'Map or GIS URL', item.map_or_gis_url),
  },
];

const renderSourceRow = ({ label, url, reason }: SourceRowInput) => (
  <div className="planning-source-row">
    <span>{label}</span>
    {url ? (
      <>
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        <div className="planning-link-reason">
          <strong>Reason for Selection</strong>
          <p>{reason}</p>
        </div>
      </>
    ) : (
      <em>Exact source not found</em>
    )}
  </div>
);

function PlanningReport({ sections }: { sections: Record<string, PlanningSectionResult[]> }) {
  const sectionEntries = Object.entries(sections).sort(([a], [b]) => a.localeCompare(b));
  const totalItems = sectionEntries.reduce((total, [, items]) => total + (items?.length || 0), 0);
  const locationDetails = getLocationDetails(sections);
  const confidence = confidencePercent(sections);
  const [documentUrlStatuses, setDocumentUrlStatuses] = useState<Record<string, DocumentUrlStatus>>({});

  useEffect(() => {
    const urls = Array.from(new Set(
      Object.values(sections)
        .flat()
        .flatMap((item) => [item.exact_document_url, item.direct_document_url, item.notification_url])
        .filter((url): url is string => Boolean(url))
    ));

    urls.forEach((url) => {
      const extensionStatus = getUrlExtensionStatus(url);
      if (extensionStatus !== 'unknown') {
        setDocumentUrlStatuses((previous) => ({ ...previous, [url]: extensionStatus }));
        return;
      }

      setDocumentUrlStatuses((previous) => ({ ...previous, [url]: previous[url] || 'unknown' }));

      fetch(url, { method: 'HEAD' })
        .then((response) => {
          const contentType = response.headers.get('content-type')?.toLowerCase() || '';
          setDocumentUrlStatuses((previous) => ({
            ...previous,
            [url]: contentType.includes('application/pdf') ? 'direct_pdf' : 'webpage',
          }));
        })
        .catch(() => {
          setDocumentUrlStatuses((previous) => ({ ...previous, [url]: 'webpage' }));
        });
    });
  }, [sections]);

  return (
    <div className="planning-report">
      <section className="planning-report-hero">
        <div className="planning-hero-grid">
          <div>
            <p className="planning-eyebrow">Planning Intelligence Report</p>
            <h2>{getReportTitle(sections)}</h2>
            <p>Applicable regulations, development plans, and planning authority notifications identified for the selected location.</p>
          </div>
          <div className="planning-location-box">
            <strong>Location Details</strong>
            {locationDetails.map(([label, value]) => (
              <div className="planning-location-row" key={label}>
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="planning-summary-grid">
        <div className="planning-summary-card"><span>Regulation Documents</span><strong>{sections.section_1?.length || 0}</strong></div>
        <div className="planning-summary-card"><span>Development Plans</span><strong>{sections.section_2?.length || 0}</strong></div>
        <div className="planning-summary-card"><span>Notifications</span><strong>{sections.section_3?.length || 0}</strong></div>
        <div className="planning-summary-card"><span>Overall Confidence</span><strong>{confidence || totalItems ? `${confidence}%` : 'N/A'}</strong></div>
      </section>

      <div className="planning-report-sections">
        {sectionEntries.map(([sectionKey, items], sectionIndex) => (
          <section key={sectionKey} className="planning-section">
            <div className="planning-section-header">
              <div className="planning-section-number">{sectionIndex + 1}</div>
              <div className="planning-section-title">
                <h3>{(planningSectionTitles[sectionKey] || sectionKey).replace(/^Section \d+:\s*/, '')}</h3>
                <p>{getSectionSummary(sectionKey)}</p>
              </div>
            </div>

            <div className="planning-document-list">
              {(items || []).map((item, index) => {
                const title = item.document_title || item.plan_title || item.notification_title || 'Untitled document';
                const type = item.document_type || item.plan_type || item.notification_type || 'Document';
                const authority = item.planning_authority || item.related_planning_authority || item.issuing_authority || 'Authority not verified';
                const status = item.plan_status || item.document_status || 'Status to be verified';
                const applicability = item.applicability || item.applicability_to_location || item.jurisdiction || 'Applicability must be verified from official source';
                const exactUrl = item.exact_document_url || '';
                const documentUrl = getDocumentCandidateUrl(item);
                const documentStatus = documentUrl ? (documentUrlStatuses[documentUrl] || getUrlExtensionStatus(documentUrl)) : 'unknown';
                const isDirectDocument = documentStatus === 'direct_pdf' || documentStatus === 'downloadable';
                const sourceUrl = item.source_page_url || '';
                const mapUrl = item.map_or_gis_url || '';

                return (
                  <article className="planning-document-card" key={`${sectionKey}-${index}-${exactUrl || sourceUrl || title}`}>
                    <div className="planning-card-top">
                      <div className="planning-card-kicker">{sectionResultTitle[sectionKey] || 'Applicable Document'}</div>
                      <h4>{title}</h4>
                      <div className="planning-badge-row">
                        <span>{authority}</span>
                        <span className={sectionKey === 'section_2' ? 'warning' : 'success'}>{getSectionLabel(sectionKey, item)}</span>
                        <span>{type}</span>
                      </div>
                    </div>

                    <div className="planning-card-body">
                      <div className="planning-info-grid">
                        <div><span>{sectionKey === 'section_3' ? 'Issuing Authority' : 'Planning Authority'}</span><strong>{authority}</strong></div>
                        <div><span>{sectionKey === 'section_2' ? 'Plan Status' : sectionKey === 'section_3' ? 'Notification Date' : 'Document Status'}</span><strong>{sectionKey === 'section_3' ? (item.notification_date || 'Date to verify') : status}</strong></div>
                        <div><span>{sectionKey === 'section_2' ? 'Coordinate Coverage' : 'Applicability'}</span><strong>{sectionKey === 'section_2' ? (item.coordinate_coverage_status || applicability) : applicability}</strong></div>
                        <div><span>Jurisdiction</span><strong>{item.jurisdiction || 'Jurisdiction to verify'}</strong></div>
                      </div>

                      <div className="planning-actions">
                        {documentUrl ? (
                          <a
                            className="planning-btn primary"
                            href={documentUrl}
                            rel="noopener noreferrer"
                            download={isDirectDocument ? getDocumentFileName(documentUrl) || true : undefined}
                            target={isDirectDocument ? undefined : '_blank'}
                            onClick={(event) => {
                              if (!isDirectDocument) return;
                              event.preventDefault();
                              void downloadExactDocument(documentUrl);
                            }}
                          >
                            {isDirectDocument ? (documentStatus === 'direct_pdf' ? 'Download PDF' : 'Download Exact Document') : 'Open Source Page'}
                          </a>
                        ) : (
                          <span className="planning-document-access-missing">
                            <strong>Document Access</strong>
                            <span>Download Exact Document</span>
                          </span>
                        )}
                        {sourceUrl && <a className="planning-btn secondary" href={sourceUrl} target="_blank" rel="noopener noreferrer">Open Source Page</a>}
                        {mapUrl && <a className="planning-btn secondary" href={mapUrl} target="_blank" rel="noopener noreferrer">Open Development Plan Map</a>}
                      </div>

                      <div className="planning-subsection">
                        <h5>Source Details</h5>
                        <div className="planning-source-box">
                          {buildSourceRows(sectionKey, item).map((row) => (
                            <div key={`${row.label}-${row.url || 'missing'}`}>
                              {renderSourceRow(row)}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="planning-subsection">
                        <h5>Source Scores</h5>
                        <div className="planning-score-grid">
                          {scoreItems(item).map(([label, score]) => {
                            const percent = normalizeScore(score);
                            return (
                              <div className="planning-score-card" key={label}>
                                <span>{label}</span>
                                <strong>{scorePercent(score)}</strong>
                                <div className="planning-progress"><i style={{ width: `${percent}%` }} /></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="planning-subsection">
                        <h5>Reason for Selection</h5>
                        <div className="planning-reason-box">
                          <p>{item.reason_for_selection || item.summary || 'Selected because this result was ranked as one of the most relevant available official sources for the supplied planning query.'}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}


export default function Home() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am an AI agent with access to live web search. Ask me anything, and I'll search the web, read the best articles, and give you a beautifully formatted answer with verified sources."
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      status: 'Starting agent...',
      isStreaming: true
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const agentQuery = `${userMessage.content}${perLinkReasonInstruction}`;
      const response = await fetch(apiUrl(`/api/web_search_v2/chat_stream?query=${encodeURIComponent(agentQuery)}&no_cache=true`));

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          if (chunk.startsWith('data: ')) {
            try {
              const data = JSON.parse(chunk.slice(6));

              setMessages(prev => prev.map(msg => {
                if (msg.id === assistantMessageId) {
                  if (data.type === 'status') {
                    return { ...msg, status: data.content };
                  } else if (data.type === 'chunk') {
                    return { ...msg, content: msg.content + data.content, status: '' };
                  } else if (data.type === 'error') {
                    return { ...msg, status: '❌ Agent Error: ' + data.content, isStreaming: false };
                  } else if (data.type === 'done') {
                    const sources = data.result?.results?.slice(0, 10)?.map((r: SourceResult) => ({
                      url: r.url,
                      title: r.title,
                      time_ago: r.time_ago || 'Recently',
                      trust_score: r.source_trust || r.trust_score,
                      verification_status: r.verification_status
                    })) || data.sources || [];

                    const planningSections = (data.result?.planning_sections || {}) as Record<string, PlanningSectionResult[]>;

                    const fallbackContent = (!msg.content && data.result?.analysis) ? data.result.analysis : msg.content;
                    const generatedAt = data.result?.timestamp ? new Date(data.result.timestamp).toLocaleString() : new Date().toLocaleString();
                    const accuracy = data.result?.accuracy;

                    const tu = data.result?.token_usage || {};
                    const du = data.result?.discovery_token_usage || {};
                    const tokenUsage = {
                      input_tokens: (tu.input_tokens || 0) + (du.input_tokens || 0),
                      output_tokens: (tu.output_tokens || 0) + (du.output_tokens || 0),
                      total_tokens: (tu.total_tokens || 0) + (du.total_tokens || 0),
                      total_cost: (tu.total_cost || 0) + (du.total_cost || 0),
                    };

                    return {
                      ...msg,
                      content: fallbackContent,
                      sources,
                      planningSections,
                      accuracy,
                      isStreaming: false,
                      status: '',
                      generatedAt,
                      tokenUsage
                    };
                  }
                }
                return msg;
              }));
            } catch (err) {
              console.error('JSON parse error:', err);
            }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, status: '❌ Network Error: ' + errorMessage, isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-20 font-sans text-slate-200 selection:bg-cyan-500/30">
      {/* Premium Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-slate-950/60 border-b border-slate-800/50 p-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
              Nexus Search
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-medium px-3 py-1 rounded-full bg-slate-800/50 text-slate-400 border border-slate-700/50">
              High Accuracy Agent
            </div>
            <Link
              href="/web_search"
              className="rounded-lg border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-cyan-300 hover:bg-cyan-500 hover:text-white hover:shadow-lg hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Web Agent V1
            </Link>
            <button
              type="button"
              disabled
              aria-current="page"
              className="cursor-not-allowed rounded-lg border border-cyan-300 bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30"
            >
              Web Agent V2
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
            >
              <div
                className={`flex flex-col ${
                  msg.planningSections && Object.keys(msg.planningSections).length > 0
                    ? 'w-full'
                    : `max-w-[90%] sm:max-w-[85%] rounded-2xl p-5 sm:p-6 shadow-xl ${
                        msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-tr-sm border border-blue-500/30 shadow-blue-900/20'
                    : 'bg-slate-800/60 backdrop-blur-sm text-slate-200 rounded-tl-sm border border-slate-700/50 shadow-slate-950/50'
                      }`
                }`}
              >
                {/* Assistant Header / Status */}
                {msg.role === 'assistant' && !(msg.planningSections && Object.keys(msg.planningSections).length > 0) && (
                  <div className="flex items-center gap-3 mb-4 border-b border-slate-700/50 pb-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 flex flex-wrap items-center gap-2 justify-between">
                      {msg.status ? (
                        <div className={`text-sm font-medium flex items-center ${msg.status.includes('❌') ? 'text-red-400' : 'text-cyan-400'}`}>
                          {!msg.status.includes('❌') && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {msg.status}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-300">Verified Answer</span>
                          {msg.accuracy && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              msg.accuracy.accuracy_score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              msg.accuracy.accuracy_score >= 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {msg.accuracy.confidence_level.split(' - ')[0]}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {msg.tokenUsage && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700/50">
                            Tokens: <b className="text-cyan-400">{msg.tokenUsage.total_tokens}</b>
                            <span className="mx-1 text-slate-700">|</span>
                            Cost: <b className="text-emerald-400">${msg.tokenUsage.total_cost.toFixed(4)}</b>
                          </span>
                        )}
                        {msg.generatedAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                            {msg.generatedAt}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}


                {/* Message Content */}
                {!(msg.planningSections && Object.keys(msg.planningSections).length > 0) && (
                  <div
                    className={`markdown-body ${msg.role === 'user' ? 'text-white' : 'text-slate-200'} prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-slate-700/50 prose-a:text-cyan-400 hover:prose-a:text-cyan-300`}
                    dangerouslySetInnerHTML={{ __html: parse(msg.content) as string }}
                  />
                )}

                {/* Blinking Cursor for Streaming */}
                {msg.isStreaming && !msg.status && (
                  <span className="inline-block w-2.5 h-5 bg-cyan-400 animate-pulse ml-1 align-middle rounded-sm shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                )}

                {/* Planning Report */}
                {msg.planningSections && Object.keys(msg.planningSections).length > 0 && (
                  <PlanningReport sections={msg.planningSections} />
                )}
                {/* Sources Area */}
                {!(msg.planningSections && Object.keys(msg.planningSections).length > 0) && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 mb-3 text-slate-300 font-medium">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
                      </svg>
                      Verified Sources
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {msg.sources.map((s, i) => (
                        <a
                          key={i}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex flex-col p-3 rounded-xl bg-slate-900/40 border border-slate-700/50 hover:bg-slate-800/80 hover:border-cyan-500/50 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                              {new URL(s.url).hostname.replace('www.', '')}
                            </span>
                            {s.trust_score !== undefined && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                s.trust_score >= 0.9 ? 'bg-emerald-500/20 text-emerald-400' :
                                s.trust_score >= 0.8 ? 'bg-cyan-500/20 text-cyan-400' :
                                'bg-slate-700 text-slate-400'
                              }`}>
                                {(s.trust_score * 100).toFixed(0)}% Trust
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-slate-200 group-hover:text-cyan-400 line-clamp-1 transition-colors">
                            {s.title}
                          </span>
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <div className="flex items-center gap-1.5">
                              {s.verification_status === 'verified_indicator' && (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400">
                                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"></path></svg>
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                                {s.time_ago}
                              </span>
                            </div>
                            <svg className="w-3 h-3 text-slate-600 group-hover:text-cyan-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} className="h-4" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 sm:p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20 transition-opacity duration-500"></div>
            <div className="relative flex w-full items-center bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50 rounded-2xl shadow-2xl transition-all duration-300">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything..."
                required
                autoComplete="off"
                disabled={isLoading}
                className="w-full py-4 pl-6 pr-20 bg-transparent text-slate-100 placeholder-slate-400 text-base outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-2 p-2.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl disabled:opacity-50 disabled:hover:bg-cyan-500 transition-all duration-200 shadow-lg shadow-cyan-500/20"
              >
                <svg className="w-5 h-5 translate-x-[1px] translate-y-[-1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
          <div className="text-center mt-3 text-xs text-slate-500 font-medium">
            Results are generated by AI and may vary.
          </div>
        </div>
      </footer>
    </div>
  );
}
