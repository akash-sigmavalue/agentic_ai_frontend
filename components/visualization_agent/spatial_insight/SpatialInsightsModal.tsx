'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Satellite, X } from 'lucide-react';
import SpatialMapSelector, { type SpatialMapMarker } from '@/components/visualization_agent/spatial_insight/SpatialMapSelector';
import {
  SpatialInsightGisEvidence,
  SpatialInsightStructuredDataPanels,
} from '@/components/visualization_agent/spatial_insight/SpatialInsightResultTables';
import {
  createSpatialInsightSession,
  fetchSpatialInsightOsm,
  generateSpatialInsight,
  loadSpatialInsightExcel,
  previewSpatialInsightFile,
  querySpatialInsight,
  setSpatialInsightImageSource,
  spatialInsightDownloadUrl,
  takeSpatialInsightSnapshot,
  uploadSpatialInsightImage,
  type SpatialInsightResultSummary,
  type SpatialInsightSession,
  type SpatialInsightState,
} from '@/lib/visualization-agent-spatial-insight';

interface SpatialInsightsModalProps {
  open: boolean;
  onClose: () => void;
}

function Notice({ level, message, dark = false }: { level?: string; message?: string; dark?: boolean }) {
  if (!message) return null;
  const styles = dark
    ? level === 'error'
      ? 'border-red-500/40 bg-red-950/40 text-red-200'
      : level === 'warning'
        ? 'border-amber-500/40 bg-amber-950/40 text-amber-100'
        : level === 'success'
          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100'
          : 'border-slate-600 bg-slate-900/60 text-slate-200'
    : level === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : level === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : level === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-700';
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>{message}</div>;
}

function imageSrcFromBase64(base64?: string | null) {
  if (!base64) return null;
  return `data:image/png;base64,${base64}`;
}

export default function SpatialInsightsModal({ open, onClose }: SpatialInsightsModalProps) {
  const [session, setSession] = useState<SpatialInsightSession | null>(null);
  const [state, setState] = useState<SpatialInsightState>({});
  const [resultSummary, setResultSummary] = useState<SpatialInsightResultSummary | null>(null);
  const [notice, setNotice] = useState<{ level: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fitExcelMarkers, setFitExcelMarkers] = useState(false);
  const [fitOsmFeatures, setFitOsmFeatures] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [previewKey, setPreviewKey] = useState('');
  const [previewContent, setPreviewContent] = useState<{ type: string; payload: unknown } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const markers = useMemo(
    () =>
      (state.excel_map_markers || []).map((row) => ({
        name: String(row.name || row.Name || ''),
        lat: Number(row.lat),
        lng: Number(row.lng),
        rate: String(row.rate || row.rate_value || ''),
      })) as SpatialMapMarker[],
    [state.excel_map_markers],
  );

  const availableSources = useMemo(() => {
    const sources: string[] = [];
    if (state.has_snapshot_image) sources.push('Map snapshot');
    if (state.has_uploaded_image) sources.push('Uploaded image');
    return sources;
  }, [state.has_snapshot_image, state.has_uploaded_image]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setInitError(null);
    setNotice(null);
    setResultSummary(null);
    setPreviewContent(null);
    setPreviewKey('');
    setQueryText('');

    createSpatialInsightSession()
      .then((payload) => {
        if (cancelled) return;
        setSession(payload);
        setState(payload.state);
      })
      .catch((error: Error) => {
        if (!cancelled) setInitError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const applyAction = useCallback((response: { level: string; message: string; state: SpatialInsightState; result_summary?: SpatialInsightResultSummary }) => {
    setState(response.state);
    setNotice({ level: response.level, message: response.message });
    if (response.result_summary) setResultSummary(response.result_summary);
  }, []);

  const runAction = useCallback(async (action: () => Promise<{ level: string; message: string; state: SpatialInsightState; result_summary?: SpatialInsightResultSummary }>) => {
    setBusy(true);
    try {
      applyAction(await action());
    } catch (error) {
      setNotice({ level: 'error', message: error instanceof Error ? error.message : 'Request failed.' });
    } finally {
      setBusy(false);
    }
  }, [applyAction]);

  const handleFetchExcel = () => {
    if (!session) return;
    setFitExcelMarkers(true);
    void runAction(() => loadSpatialInsightExcel(session.session_id));
  };

  const handleFetchOsm = (payload: {
    bounds: { south: number; west: number; north: number; east: number };
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  }) => {
    if (!session) return;
    setFitOsmFeatures(true);
    void runAction(() => fetchSpatialInsightOsm(session.session_id, payload));
  };

  const handleSnapshot = (payload: {
    lat: number;
    lng: number;
    zoom: number;
    maptype: 'hybrid' | 'satellite';
    name?: string;
    address?: string;
    placeId?: string;
    eventId: string;
  }) => {
    if (!session) return;
    void runAction(() => takeSpatialInsightSnapshot(session.session_id, payload));
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session) return;
    await runAction(() => uploadSpatialInsightImage(session.session_id, file));
    event.target.value = '';
  };

  const handleSourceChange = async (source: string) => {
    if (!session) return;
    await runAction(() => setSpatialInsightImageSource(session.session_id, source));
  };

  const handleGenerate = async () => {
    if (!session) return;
    setGenerating(true);
    setNotice({ level: 'info', message: 'Generating refined spatial insight outputs...' });
    try {
      applyAction(await generateSpatialInsight(session.session_id));
    } catch (error) {
      setNotice({ level: 'error', message: error instanceof Error ? error.message : 'Generation failed.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleQuery = async () => {
    if (!session || !queryText.trim()) return;
    setBusy(true);
    try {
      const response = await querySpatialInsight(session.session_id, queryText.trim());
      setState(response.state);
      setResultSummary(response.result_summary);
      setNotice({ level: 'success', message: 'Query answer generated.' });
    } catch (error) {
      setNotice({ level: 'error', message: error instanceof Error ? error.message : 'Query failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handlePreviewChange = async (fileKey: string) => {
    setPreviewKey(fileKey);
    if (!session || !fileKey) {
      setPreviewContent(null);
      return;
    }
    try {
      const response = await previewSpatialInsightFile(session.session_id, fileKey);
      setPreviewContent({ type: response.content_type, payload: response.payload });
    } catch (error) {
      setPreviewContent(null);
      setNotice({ level: 'error', message: error instanceof Error ? error.message : 'Preview failed.' });
    }
  };

  if (!open) return null;

  const defaultMap = session?.default_map || {};
  const selectedImageBase64 =
    state.analysis_image_source === 'Uploaded image'
      ? state.uploaded_image_base64
      : state.snapshot_image_base64;

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-screen flex-col bg-[#0b1220] text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#111827] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
            <Satellite className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-indigo-300">
              Spatial Insights
            </p>
            <h2 className="text-lg font-extrabold text-white">
              {session?.app_title || 'Spatial Insight POC'}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          aria-label="Close spatial insights"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-800 bg-[#111827] p-4 lg:block">
          <h3 className="text-sm font-bold text-white">Configuration</h3>
          {initError ? (
            <p className="mt-4 text-xs leading-5 text-slate-400">
              Session could not start. Fix the backend connection, then close and reopen Spatial Insight.
            </p>
          ) : !session ? (
            <p className="mt-4 text-xs text-slate-400">Connecting to backend...</p>
          ) : (
            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <p>Google Maps browser API: {session.google_maps_browser_api_key ? '✅ Loaded' : '❌ Missing'}</p>
              <p>Google Maps Static API: {session.google_maps_static_configured ? '✅ Loaded' : '❌ Missing'}</p>
              <p>OSM Overpass layer: {session.osm_configured ? '✅ Configured' : '❌ Missing endpoint'}</p>
              <p>Bedrock bearer token: {session.bedrock_configured ? '✅ Loaded' : '⚠️ Not set'}</p>
            </div>
          )}
          {session ? (
            <>
              <div className="mt-6 border-t border-slate-700 pt-4 text-xs text-slate-400">
                <p className="font-bold text-slate-300">Models</p>
                <p className="mt-2">Visual: {session.models?.visual_analysis}</p>
                <p>Layout: {session.models?.layout_critique}</p>
                <p>Query: {session.models?.query_answer}</p>
              </div>
              <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">
                Nova 2 Lite analyzes and critiques. Final PNG/PDF is Python-composited on the untouched original image.
              </div>
            </>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          {initError && <Notice dark level="error" message={initError} />}
          {notice && <div className="mb-4"><Notice dark level={notice.level} message={notice.message} /></div>}

          {initError ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-base font-bold text-white">Spatial Insight could not load</p>
              <p className="text-sm leading-6 text-slate-400">
                The UI needs the FastAPI backend running. In a terminal, start:
              </p>
              <pre className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-left text-xs text-slate-200">
                cd agentic_ai_backend{'\n'}uvicorn main:app --reload
              </pre>
            </div>
          ) : !session ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="mx-auto max-w-6xl space-y-8">
              <section className="space-y-3">
                <h3 className="text-base font-bold text-white">1. Search Location and Take Snapshot</h3>
                <p className="text-sm text-slate-400">
                  Search inside the map, pan and zoom to the exact required area, choose Hybrid or Satellite, and click Take Snapshot.
                </p>
                <SpatialMapSelector
                  apiKey={session.google_maps_browser_api_key}
                  initialLat={Number(defaultMap.lat ?? 18.5204)}
                  initialLng={Number(defaultMap.lng ?? 73.8567)}
                  initialZoom={Number(defaultMap.zoom ?? 17)}
                  initialMapType={(defaultMap.maptype as 'hybrid' | 'satellite') || 'hybrid'}
                  markers={markers}
                  fitExcelMarkers={fitExcelMarkers}
                  fitOsmFeatures={fitOsmFeatures}
                  osmGeoJson={state.osm_geojson || null}
                  onSnapshot={handleSnapshot}
                  onFetchExcel={handleFetchExcel}
                  onFetchOsm={handleFetchOsm}
                  busy={busy || generating}
                />
                {state.selected_place && (
                  <p className="text-xs text-slate-400">
                    Selected map center: {String((state.selected_place as Record<string, unknown>).lat)},{' '}
                    {String((state.selected_place as Record<string, unknown>).lng)}
                  </p>
                )}
                {!!state.excel_marker_count && (
                  <p className="text-xs text-slate-300">
                    Excel markers on map: <strong>{state.excel_marker_count}</strong>
                    {state.excel_marker_file_path ? ` from ${String(state.excel_marker_file_path).split(/[/\\]/).pop()}` : ''}
                  </p>
                )}
                {!!state.osm_amenity_count && (
                  <p className="text-xs text-slate-300">
                    OSM supporting layer on map: <strong>{state.osm_amenity_count}</strong> features. Data © OpenStreetMap contributors.
                  </p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white">2. Snapshot / Image Input</h3>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUpload}
                  className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-600"
                />
                {availableSources.length === 0 ? (
                  <p className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
                    Take a map snapshot above or upload an image to continue.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availableSources.length > 1 ? (
                      <div className="flex flex-wrap gap-3">
                        {availableSources.map((source) => (
                          <label key={source} className="inline-flex items-center gap-2 text-sm text-slate-300">
                            <input
                              type="radio"
                              name="analysis-source"
                              checked={state.analysis_image_source === source}
                              onChange={() => void handleSourceChange(source)}
                            />
                            {source}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-300">Analysis source: <strong>{availableSources[0]}</strong></p>
                    )}
                    {selectedImageBase64 && (
                      <img
                        src={imageSrcFromBase64(selectedImageBase64) || undefined}
                        alt="Selected analysis image"
                        className="max-h-[420px] w-full rounded-xl border border-slate-700 object-contain bg-black"
                      />
                    )}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white">3. Generate Spatial Insight</h3>
                <p className="text-sm text-slate-400">
                  Creates debug detection overlay and final original-preserving refined client overlay using Python compositing only.
                </p>
                <button
                  type="button"
                  disabled={generating || availableSources.length === 0}
                  onClick={() => void handleGenerate()}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? 'Generating Spatial Insight...' : 'Generate Spatial Insight'}
                </button>
              </section>

              {resultSummary && (
                <>
                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-white">4. Downloads</h3>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                      {(resultSummary.downloads || []).map((item) => (
                        <a
                          key={item.file_key}
                          href={spatialInsightDownloadUrl(session.session_id, item.file_key)}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center text-xs font-bold text-slate-200 hover:border-indigo-400 hover:text-white"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-white">5. Preview</h3>
                    <select
                      value={previewKey}
                      onChange={(event) => void handlePreviewChange(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select preview</option>
                      {(resultSummary.previews || []).map((item) => (
                        <option key={item.file_key} value={item.file_key}>{item.label}</option>
                      ))}
                    </select>
                    {previewContent?.type === 'image' && typeof previewContent.payload === 'string' && (
                      <img
                        src={`data:image/png;base64,${previewContent.payload}`}
                        alt="Preview"
                        className="max-h-[480px] w-full rounded-xl border border-slate-700 object-contain bg-black"
                      />
                    )}
                    {previewContent?.type === 'svg' && typeof previewContent.payload === 'string' && (
                      <div className="overflow-auto rounded-xl border border-slate-700 bg-white p-2" dangerouslySetInnerHTML={{ __html: previewContent.payload }} />
                    )}
                    {previewContent?.type === 'json' && (
                      <pre className="max-h-[480px] overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-200">
                        {JSON.stringify(previewContent.payload, null, 2)}
                      </pre>
                    )}

                    <SpatialInsightStructuredDataPanels resultSummary={resultSummary} />
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-white">6. Ask Real Estate Spatial Query</h3>
                    <p className="text-sm text-slate-400">
                      Queries use all loaded Excel and OSM records, including features outside the saved snapshot. The GIS engine calculates first; Nova explains the result.
                    </p>
                    <textarea
                      value={queryText}
                      onChange={(event) => setQueryText(event.target.value)}
                      rows={4}
                      placeholder="Examples: What is the distance of each project from Jagtap Dairy-Wakad Road?"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
                    />
                    <button
                      type="button"
                      disabled={busy || !queryText.trim()}
                      onClick={() => void handleQuery()}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Generate Answer
                    </button>
                    {state.query_answer && (
                      <div className="prose prose-sm prose-invert max-w-none rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Answer</p>
                        <ReactMarkdown>{state.query_answer}</ReactMarkdown>
                      </div>
                    )}
                    <SpatialInsightGisEvidence queryGisResult={state.query_gis_result} />
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-base font-bold text-white">7. Token Ledger</h3>
                    <pre className="max-h-72 overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-300">
                      {JSON.stringify(resultSummary.token_summary || {}, null, 2)}
                    </pre>
                    {(resultSummary.token_entries || []).length > 0 && (
                      <div className="overflow-x-auto rounded-xl border border-slate-700">
                        <table className="min-w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-900 text-slate-400">
                            <tr>
                              {Object.keys(resultSummary.token_entries![0]).slice(0, 6).map((key) => (
                                <th key={key} className="px-3 py-2 font-bold uppercase tracking-wider">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {resultSummary.token_entries!.map((row, index) => (
                              <tr key={index} className="border-t border-slate-800">
                                {Object.keys(resultSummary.token_entries![0]).slice(0, 6).map((key) => (
                                  <td key={key} className="px-3 py-2">{String(row[key] ?? '')}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
