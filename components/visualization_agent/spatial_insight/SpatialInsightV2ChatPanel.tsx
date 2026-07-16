'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2 } from 'lucide-react';
import {
  getDefaultPreviewKey,
  previewSpatialInsightV2File,
  spatialInsightV2DownloadUrl,
  type SpatialInsightV2State,
} from '@/lib/visualization-agent-spatial-insight-v2';
import type { SpatialInsightResultSummary } from '@/lib/visualization-agent-spatial-insight';
import {
  SpatialInsightGisEvidence,
  SpatialInsightStructuredDataPanels,
} from '@/components/visualization_agent/spatial_insight/SpatialInsightResultTables';

function LightAccordion({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-slate-400 transition group-open:rotate-90">›</span>
          {title}
        </span>
      </summary>
      <div className="space-y-2 border-t border-slate-100 px-3 py-2.5">
        {children}
        {caption ? <p className="text-[10px] leading-4 text-slate-500">{caption}</p> : null}
      </div>
    </details>
  );
}

function SpatialInsightV2DataGrid({ resultSummary }: { resultSummary: SpatialInsightResultSummary }) {
  const featureRows = useMemo(
    () =>
      (resultSummary.features || []).map((feature) => ({
        id: String(feature.id ?? ''),
        label: String(feature.label ?? ''),
        category: String(feature.category ?? ''),
        confidence: String(feature.confidence ?? ''),
      })),
    [resultSummary.features],
  );
  const realEstateRows = useMemo(
    () =>
      (resultSummary.real_estate_points || []).map((point) => ({
        Name: String(point.name ?? ''),
        lat: String(point.lat ?? ''),
        lng: String(point.lng ?? ''),
        rate: String(point.rate ?? ''),
      })),
    [resultSummary.real_estate_points],
  );
  const osmRows = useMemo(
    () =>
      (resultSummary.osm_features || []).slice(0, 50).map((feature) => {
        const props = (feature.properties || {}) as Record<string, unknown>;
        return {
          category: String(props.category_label || props.category || ''),
          name: String(props.name || ''),
          geometry: String((feature.geometry as Record<string, unknown> | undefined)?.type || ''),
        };
      }),
    [resultSummary.osm_features],
  );
  const projectRows = useMemo(() => {
    const profiles = ((resultSummary.project_spatial_analysis || {}) as Record<string, unknown>).profiles;
    if (!Array.isArray(profiles)) return [];
    return profiles.slice(0, 20).map((profile) => {
      const row = profile as Record<string, unknown>;
      const land500 = (((row.surrounding_land_use as Record<string, unknown> | undefined)?.['500m']) ||
        {}) as Record<string, unknown>;
      const road = (row.road_frontage_and_visibility || {}) as Record<string, unknown>;
      const nearestRoad = (road.nearest_road || {}) as Record<string, unknown>;
      return {
        Project: String(row.project_name || ''),
        Rate: String(row.rate || ''),
        'Land use (500m)': String(land500.dominant_land_use || ''),
        'Nearest road': String(nearestRoad.name || ''),
        'Road distance m': String(nearestRoad.distance_m ?? ''),
      };
    });
  }, [resultSummary.project_spatial_analysis]);

  const panels = [
    featureRows.length > 0
      ? {
          key: 'features',
          title: 'Feature table',
          content: (
            <div className="max-h-40 overflow-auto text-[10px] text-slate-600">
              {featureRows.map((row, index) => (
                <div key={index} className="border-b border-slate-100 py-1">
                  {row.label || row.id} · {row.category}
                </div>
              ))}
            </div>
          ),
        }
      : null,
    realEstateRows.length > 0
      ? {
          key: 'real-estate',
          title: 'Real-estate points',
          caption: 'One row equals one plotted Module 2 record.',
          content: (
            <div className="max-h-40 overflow-auto text-[10px] text-slate-600">
              {realEstateRows.map((row, index) => (
                <div key={index} className="border-b border-slate-100 py-1">
                  {row.Name} · {row.rate || '—'} · {row.lat}, {row.lng}
                </div>
              ))}
            </div>
          ),
        }
      : null,
    osmRows.length > 0
      ? {
          key: 'osm',
          title: 'OSM infrastructure',
          caption: 'Expanded OSM fetch results.',
          content: (
            <div className="max-h-40 overflow-auto text-[10px] text-slate-600">
              {osmRows.map((row, index) => (
                <div key={index} className="border-b border-slate-100 py-1">
                  {row.name || row.category} · {row.geometry}
                </div>
              ))}
            </div>
          ),
        }
      : null,
    projectRows.length > 0
      ? {
          key: 'profiles',
          title: 'Project GIS profiles',
          content: (
            <div className="max-h-40 overflow-auto text-[10px] text-slate-600">
              {projectRows.map((row, index) => (
                <div key={index} className="border-b border-slate-100 py-1">
                  {row.Project} · {row['Nearest road'] || '—'} · {row['Road distance m'] || '—'} m
                </div>
              ))}
            </div>
          ),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; title: string; caption?: string; content: React.ReactNode }>;

  if (panels.length === 0) return null;

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {panels.map((panel) => (
        <LightAccordion key={panel.key} title={panel.title} caption={panel.caption}>
          {panel.content}
        </LightAccordion>
      ))}
    </div>
  );
}

interface SpatialInsightV2ChatPanelProps {
  spatialV2: SpatialInsightV2State;
  onPreviewKeyChange: (fileKey: string) => void;
}

export default function SpatialInsightV2ChatPanel({
  spatialV2,
  onPreviewKeyChange,
}: SpatialInsightV2ChatPanelProps) {
  const { resultSummary, sessionId, previewKey, isRunning, statusMessage, statusLevel } = spatialV2;
  const [previewContent, setPreviewContent] = useState<{ type: string; payload: unknown } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const onPreviewKeyChangeRef = useRef(onPreviewKeyChange);
  const previewFetchKeyRef = useRef('');

  useEffect(() => {
    onPreviewKeyChangeRef.current = onPreviewKeyChange;
  }, [onPreviewKeyChange]);

  useEffect(() => {
    previewFetchKeyRef.current = '';
  }, [resultSummary]);

  useEffect(() => {
    if (!sessionId || !previewKey) {
      previewFetchKeyRef.current = '';
      setPreviewContent(null);
      setPreviewLoading(false);
      return;
    }

    const fetchKey = `${sessionId}:${previewKey}`;
    if (previewFetchKeyRef.current === fetchKey) return;
    previewFetchKeyRef.current = fetchKey;

    let cancelled = false;
    setPreviewLoading(true);
    previewSpatialInsightV2File(sessionId, previewKey)
      .then((response) => {
        if (cancelled) return;
        setPreviewContent({ type: response.content_type, payload: response.payload });
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewContent(null);
          previewFetchKeyRef.current = '';
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, previewKey]);

  useEffect(() => {
    if (!resultSummary) return;
    const defaultKey = getDefaultPreviewKey(resultSummary);
    if (defaultKey && !previewKey) {
      onPreviewKeyChangeRef.current(defaultKey);
    }
  }, [resultSummary, previewKey]);

  if (isRunning) {
    return (
      <section className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-6 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" />
        <p className="mt-3 text-sm font-bold text-violet-900">Running Spatial Insight v2</p>
        <p className="mt-1 text-xs text-violet-700">
          Capturing snapshot, fetching expanded OSM, and generating vectorized previews...
        </p>
      </section>
    );
  }

  if (!resultSummary || !sessionId) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
        <p className="text-sm font-bold text-slate-700">Spatial Insights v2</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Open Interactive Map or Interactive Map 3D, then click <strong>Take Snapshot</strong> in the map toolbar.
          Results, previews, and data tables will appear here.
        </p>
        {statusMessage ? (
          <p
            className={`mt-3 text-xs font-semibold ${
              statusLevel === 'error' ? 'text-red-600' : statusLevel === 'success' ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            {statusMessage}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-600">Spatial Insights v2</p>
          <h3 className="mt-1 text-sm font-extrabold text-slate-950">Generated map intelligence</h3>
        </div>
        {statusMessage ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            {statusMessage}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          Preview
          <select
            value={previewKey}
            onChange={(event) => {
              previewFetchKeyRef.current = '';
              onPreviewKeyChange(event.target.value);
            }}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
          >
            {(resultSummary.previews || []).map((item) => (
              <option key={item.file_key} value={item.file_key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {previewLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-10">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          </div>
        ) : null}
        {!previewLoading && previewContent?.type === 'image' && typeof previewContent.payload === 'string' ? (
          <img
            src={`data:image/png;base64,${previewContent.payload}`}
            alt="Spatial insight preview"
            className="max-h-[360px] w-full rounded-xl border border-slate-200 object-contain bg-slate-50"
          />
        ) : null}
        {!previewLoading && previewContent?.type === 'svg' && typeof previewContent.payload === 'string' ? (
          <div
            className="max-h-[360px] overflow-auto rounded-xl border border-slate-200 bg-white p-2"
            dangerouslySetInnerHTML={{ __html: previewContent.payload }}
          />
        ) : null}
        {!previewLoading && previewContent?.type === 'json' ? (
          <pre className="max-h-[280px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-700">
            {JSON.stringify(previewContent.payload, null, 2)}
          </pre>
        ) : null}
      </div>

      <SpatialInsightV2DataGrid resultSummary={resultSummary} />

      <details className="rounded-xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
          Expanded data tables
        </summary>
        <div className="border-t border-slate-200 p-3 [&_details]:border-slate-200 [&_summary]:text-slate-700 [&_td]:text-slate-700 [&_th]:text-slate-500">
          <SpatialInsightStructuredDataPanels resultSummary={resultSummary} />
        </div>
      </details>

      {(resultSummary.downloads || []).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {(resultSummary.downloads || []).slice(0, 6).map((item) => (
            <a
              key={item.file_key}
              href={spatialInsightV2DownloadUrl(sessionId, item.file_key)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:border-violet-200 hover:text-violet-700"
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}

      {spatialV2.queryAnswer ? (
        <article className="prose prose-sm max-w-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-table:text-xs prose-table:w-full prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1 prose-thead:bg-slate-100 prose-tr:border-b prose-tr:border-slate-200">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Answer</p>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{spatialV2.queryAnswer}</ReactMarkdown>
        </article>
      ) : null}

      {spatialV2.queryGisResult ? (
        <div className="[&_details]:border-slate-200 [&_h4]:text-slate-800 [&_p]:text-slate-600 [&_td]:text-slate-700 [&_th]:text-slate-500">
          <SpatialInsightGisEvidence queryGisResult={spatialV2.queryGisResult} />
        </div>
      ) : null}
    </section>
  );
}
