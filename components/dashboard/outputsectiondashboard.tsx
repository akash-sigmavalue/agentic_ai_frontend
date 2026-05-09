import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Activity, LayoutDashboard, Maximize2, Minimize2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { MarkerData } from '../../types/agents';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface OutputSectionProps {
  markers: MarkerData[];
  analyticalOutput?: {
    jsx?: string;
    html?: string;
    data_summary?: string;
    insights?: Array<Record<string, unknown>>;
  } | null;
  responseText?: string;
  onToggle?: () => void;
  isCollapsed?: boolean;
}

type BabelStandalone = {
  transform: (
    code: string,
    options: Record<string, unknown>
  ) => { code?: string | null };
};

type DynamicComponentContext = Record<string, unknown>;

type GeneratedComponentProps = {
  onError: (message: string) => void;
};

type RenderBoundaryProps = {
  children: React.ReactNode;
  onError: (message: string) => void;
};

type RenderBoundaryState = {
  error: string | null;
};

class RenderBoundary extends React.Component<RenderBoundaryProps, RenderBoundaryState> {
  state: RenderBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): RenderBoundaryState {
    return { error: error instanceof Error ? error.message : 'Generated component render failed' };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error instanceof Error ? error.message : 'Generated component render failed');
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

const getDatasetValue = (runtimeData: DynamicComponentContext, index: number) => {
  const direct = runtimeData[`dataset_${index}`];
  if (direct !== undefined) return direct;

  const datasets = runtimeData.datasets;
  if (Array.isArray(datasets)) return datasets[index] ?? [];

  const nestedData = runtimeData.data;
  if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
    const nestedValue = (nestedData as Record<string, unknown>)[`dataset_${index}`];
    if (nestedValue !== undefined) return nestedValue;
  }

  return [];
};

const createComponentFromJsx = (
  jsxString: string,
  Babel: BabelStandalone,
  runtimeData: DynamicComponentContext = {}
): React.ComponentType<GeneratedComponentProps> | null => {
  try {
    const cleaned = jsxString
      .replace(/import\s+.*?;?\n/g, '')
      .replace(/import\s+{[\s\S]*?}\s+from\s+['"].*?['"];?\n/g, '');

    let componentName: string | null = null;
    const funcMatch = cleaned.match(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/);
    const constMatch = cleaned.match(/export\s+default\s+const\s+([A-Za-z0-9_$]+)\s*=/);
    if (funcMatch) componentName = funcMatch[1];
    else if (constMatch) componentName = constMatch[1];
    else return null;

    const codeWithoutExport = cleaned.replace(/export\s+default\s+/, '');
    const transformed = Babel.transform(codeWithoutExport, {
      presets: ['react'],
      filename: 'dynamicComponent.jsx',
    }).code;
    if (!transformed) return null;

    const chartComponents = {
      BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
      CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
      ScatterChart, Scatter
    };

    const datasetNames = Array.from({ length: 10 }, (_, index) => `dataset_${index}`);
    const datasetValues = datasetNames.map((_, index) => getDatasetValue(runtimeData, index));
    const paramNames = ['React', ...Object.keys(chartComponents), 'runtimeData', ...datasetNames];
    const paramValues = [React, ...Object.values(chartComponents), runtimeData, ...datasetValues];

    const factory = new Function(...paramNames, `
      ${transformed};
      return ${componentName};
    `);

    const Component = factory(...paramValues) as unknown;
    if (typeof Component !== 'function') return null;

    const SafeGeneratedComponent: React.FC<GeneratedComponentProps> = ({ onError }) => {
      try {
        return React.createElement(Component as React.ComponentType);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generated component render failed';
        onError(message);
        return null;
      }
    };

    return SafeGeneratedComponent;
  } catch (error) {
    console.error('Failed to create component from JSX:', error);
    return null;
  }
};

const OutputSectionDashboard: React.FC<OutputSectionProps> = ({
  markers,
  analyticalOutput
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const [RenderedComponent, setRenderedComponent] = useState<React.ComponentType<GeneratedComponentProps> | null>(null);
  const [Babel, setBabel] = useState<BabelStandalone | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [isOutputFullscreen, setIsOutputFullscreen] = useState(false);
  const hasOutput = Boolean(analyticalOutput?.jsx);

  useEffect(() => {
    setIsMounted(true);
    import('leaflet').then((leaflet) => {
      setL(leaflet);
      const iconPrototype = leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
      delete iconPrototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    });
  }, []);

  useEffect(() => {
    import('@babel/standalone')
      .then((mod) => {
        const candidate = (mod as unknown as { default?: BabelStandalone }).default ?? (mod as unknown as BabelStandalone);
        setBabel(candidate);
      })
      .catch((err) => console.error('Failed to load Babel:', err));
  }, []);

  useEffect(() => {
    if (!analyticalOutput?.jsx || !Babel) {
      setRenderedComponent(null);
      setComponentError(null);
      return;
    }

    try {
      const component = createComponentFromJsx(analyticalOutput.jsx, Babel, analyticalOutput);
      setRenderedComponent(() => component);
      setComponentError(component ? null : 'Component creation returned null');
    } catch (err) {
      console.error('Component creation error:', err);
      setComponentError(err instanceof Error ? err.message : 'Unknown error');
      setRenderedComponent(null);
    }
  }, [analyticalOutput, analyticalOutput?.jsx, Babel]);

  useEffect(() => {
    if (!isOutputFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOutputFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOutputFullscreen]);

  const renderOutputContent = (fullscreen = false) => (
    <div
      className={`dashboard-output relative z-20 overflow-y-auto custom-scrollbar ${
        fullscreen
          ? 'h-full bg-white px-8 py-6'
          : 'min-h-0 flex-1 bg-white/80 p-8 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500'
      }`}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-sm" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Live Output</span>
        </div>

        {fullscreen && <div className="h-8" />}
      </div>

      {RenderedComponent && !componentError ? (
        <div className="mb-6">
          <RenderBoundary onError={setComponentError}>
            <RenderedComponent onError={setComponentError} />
          </RenderBoundary>
        </div>
      ) : analyticalOutput?.jsx ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-bold">Unable to render the generated UI.</p>
          <p className="mt-1 font-mono text-xs">Reason: {componentError || 'Component creation failed'}</p>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-amber-700">Show generated JSX (first 500 chars)</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs">
              {analyticalOutput.jsx.slice(0, 500)}...
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );

  if (!isMounted || !L) {
    return (
      <div className="dashboard-panel flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-xl shadow-slate-200/20">
        <div className="relative mb-4">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
          <div className="relative h-12 w-12 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
        <p className="animate-pulse text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Initializing Engine</p>
      </div>
    );
  }

  return (
    <div className="dashboard-panel flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 transition-all duration-300">
      <div className="dashboard-panel-header flex items-center justify-between border-b border-slate-100 bg-[#f8fafc] px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
            <LayoutDashboard className="h-5 w-5 text-[#525ceb]" />
          </div>
          <div>
            <h2 className="text-[13px] font-black uppercase tracking-tight text-[#1a1c3d]">Dashboard Output</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {markers.length > 0 ? `${markers.length} Points` : 'Ready'}
          </div>
          {hasOutput && (
            <button
              onClick={() => setIsOutputFullscreen(true)}
              className="p-1 text-slate-400 transition-colors hover:text-indigo-500"
              title="Fullscreen output"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="relative flex flex-1 flex-col bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {hasOutput ? (
          renderOutputContent()
        ) : (
          <div className="relative flex-1">
            {markers.length > 0 ? (
              <MapContainer
                center={[markers[0].lat, markers[0].lng]}
                zoom={12}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; CARTO'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {markers.map((marker, idx) => {
                  const markerKey = marker.id ?? `${marker.lat}-${marker.lng}-${idx}`;
                  return (
                    <Marker key={markerKey} position={[marker.lat, marker.lng]}>
                      <Popup>
                        <div className="min-w-[140px] p-2 text-slate-900">
                          <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#525ceb]">{marker.label || 'Location'}</p>
                          <div className="flex flex-col gap-1 text-[10px] font-black text-slate-400">
                            <span>Lat: {marker.lat.toFixed(5)}</span>
                            <span>Lng: {marker.lng.toFixed(5)}</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="relative z-10 flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
                <div className="relative mb-8">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-slate-100 blur-2xl" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-slate-100 bg-white shadow-2xl transition-transform hover:scale-110">
                    <Activity className="h-10 w-10 text-slate-800" />
                  </div>
                </div>
                <h3 className="text-xl font-black tracking-tight text-[#1a1c3d]">Dashboard Intelligence</h3>
                <p className="mx-auto mt-4 max-w-[280px] text-sm font-bold leading-relaxed text-slate-400">
                  Generated charts, KPIs, and analytical summaries will appear here as they are created.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {isOutputFullscreen && (
        <div className="fixed bottom-10 left-20 right-0 top-20 z-[99999] bg-[#f1f5f9] p-4">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-300/50">
            <div className="dashboard-panel-header flex items-center justify-between border-b border-slate-100 bg-[#f8fafc] px-8 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                  <LayoutDashboard className="h-5 w-5 text-[#525ceb]" />
                </div>
                <div>
                  <h2 className="text-[13px] font-black uppercase tracking-tight text-[#1a1c3d]">Dashboard Output</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Press Escape to return</p>
                </div>
              </div>
              <button
                onClick={() => setIsOutputFullscreen(false)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
                title="Exit fullscreen"
              >
                <Minimize2 className="h-4 w-4" />
                Exit
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {renderOutputContent(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutputSectionDashboard;
