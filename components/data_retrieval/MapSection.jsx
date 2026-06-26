"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, Label, LabelList
} from "recharts";

const VISUALIZATION_IDEAS = [
  { label: "Charts", icon: "📊" },
  { label: "Graphs", icon: "🧭" },
  { label: "Maps", icon: "🗺️" },
];

class RenderBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error: error instanceof Error ? error.message : "Generated component render failed" };
  }

  componentDidCatch(error) {
    if (this.props.onError) {
      this.props.onError(error instanceof Error ? error.message : "Generated component render failed");
    }
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

const getDatasetValue = (runtimeData, index) => {
  const direct = runtimeData[`dataset_${index}`];
  if (direct !== undefined) return direct;

  const datasets = runtimeData.datasets;
  if (Array.isArray(datasets)) return datasets[index] ?? [];

  const nestedData = runtimeData.data;
  if (nestedData && typeof nestedData === "object" && !Array.isArray(nestedData)) {
    const nestedValue = nestedData[`dataset_${index}`];
    if (nestedValue !== undefined) return nestedValue;
  }

  return [];
};

const createComponentFromJsx = (
  jsxString,
  Babel,
  runtimeData = {}
) => {
  try {
    const cleaned = jsxString
      .replace(/import\s+.*?;?\n/g, "")
      .replace(/import\s+{[\s\S]*?}\s+from\s+['"].*?['"];?\n/g, "");

    let componentName = null;
    const funcMatch = cleaned.match(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/);
    const constMatch = cleaned.match(/export\s+default\s+const\s+([A-Za-z0-9_$]+)\s*=/);
    if (funcMatch) componentName = funcMatch[1];
    else if (constMatch) componentName = constMatch[1];
    else {
      console.error("No export default function/const found in JSX.");
      return null;
    }

    const codeWithoutExport = cleaned.replace(/export\s+default\s+/, "");
    const transformed = Babel.transform(codeWithoutExport, {
      presets: [["react", { runtime: "classic" }]],
      filename: "dynamicComponent.jsx",
    }).code;
    if (!transformed) {
      return null;
    }

    const chartComponents = {
      BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
      CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
      ScatterChart, Scatter, Label, LabelList
    };

    const backendColors = runtimeData?.colors || runtimeData?.COLORS;
    const datasetNames = Array.from({ length: 10 }, (_, index) => `dataset_${index}`);
    const datasetValues = datasetNames.map((_, index) => getDatasetValue(runtimeData, index));
    const paramNames = backendColors 
      ? ["React", ...Object.keys(chartComponents), "runtimeData", "COLORS", ...datasetNames]
      : ["React", ...Object.keys(chartComponents), "runtimeData", ...datasetNames];
    const paramValues = backendColors
      ? [React, ...Object.values(chartComponents), runtimeData, backendColors, ...datasetValues]
      : [React, ...Object.values(chartComponents), runtimeData, ...datasetValues];

    const factory = new Function(...paramNames, `
      ${transformed};
      return ${componentName};
    `);

    const Component = factory(...paramValues);
    if (typeof Component !== "function") {
      return null;
    }

    const SafeGeneratedComponent = ({ onError }) => {
      try {
        return React.createElement(Component);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Generated component render failed";
        onError(message);
        return null;
      }
    };

    return SafeGeneratedComponent;
  } catch (error) {
    console.error("Failed to create component from JSX:", error);
    return null;
  }
};

export default function MapSection({ jsx, dataset }) {
  const [RenderedComponent, setRenderedComponent] = useState(null);
  const [Babel, setBabel] = useState(null);
  const [componentError, setComponentError] = useState(null);

  useEffect(() => {
    import("@babel/standalone")
      .then((mod) => {
        const candidate = mod.default ?? mod;
        setBabel(candidate);
      })
      .catch((err) => console.error("Failed to load Babel:", err));
  }, []);

  useEffect(() => {
    if (!jsx || !Babel) {
      setRenderedComponent(null);
      setComponentError(null);
      return;
    }

    try {
      const component = createComponentFromJsx(jsx, Babel, {
        dataset_0: dataset || [],
        datasets: [dataset || []],
      });
      setRenderedComponent(() => component);
      setComponentError(component ? null : "Component creation returned null");
    } catch (err) {
      console.error("Component creation error:", err);
      setComponentError(err instanceof Error ? err.message : "Unknown error");
      setRenderedComponent(null);
    }
  }, [jsx, Babel, dataset]);

  if (jsx) {
    return (
      <section className="app-panel relative flex h-full min-h-0 flex-col overflow-hidden transition-shadow duration-200 hover:shadow-[0_0_0_1px_var(--accent),0_18px_48px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3 border-b px-[18px] py-3.5" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[15px]" style={{ background: "var(--accent-glow)", color: "var(--accent-light)" }}>📊</div>
          <div>
            <h2 className="m-0 text-[13px] font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>Dynamic Visualization</h2>
            <p className="m-0 text-[10px]" style={{ color: "var(--text-muted)" }}>Agent-generated dynamic React chart component</p>
          </div>
          <span className="ml-auto rounded-full px-2 py-[3px] text-[10px] font-medium tracking-wide" style={{ background: "var(--accent-glow)", color: "var(--accent-light)" }}>
            Rendered
          </span>
        </div>

        <div className="execution-flow-scroll relative flex min-h-0 flex-1 flex-col overflow-y-auto p-6 bg-transparent">
          {RenderedComponent && !componentError ? (
            <div className="w-full h-full flex flex-col justify-center">
              <RenderBoundary onError={setComponentError}>
                <RenderedComponent onError={setComponentError} />
              </RenderBoundary>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              <p className="font-bold">Unable to render the generated chart.</p>
              <p className="mt-1 font-mono text-xs">Reason: {componentError || "Component compiling..."}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="app-panel relative flex h-full min-h-0 flex-col overflow-hidden transition-shadow duration-200 hover:shadow-[0_0_0_1px_var(--accent),0_18px_48px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-3 border-b px-[18px] py-3.5" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[15px]" style={{ background: "var(--accent-glow)", color: "var(--accent-light)" }}>🗺️</div>
        <div>
          <h2 className="m-0 text-[13px] font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>Visualization</h2>
          <p className="m-0 text-[10px]" style={{ color: "var(--text-muted)" }}>Reserved for maps, charts, and graph outputs</p>
        </div>
        <span className="ml-auto rounded-full px-2 py-[3px] text-[10px] font-medium tracking-wide" style={{ background: "var(--warning-glow)", color: "var(--warning)" }}>
          Empty for now
        </span>
      </div>

      <div className="execution-flow-scroll relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 24%), radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--accent-secondary) 8%, transparent), transparent 28%)",
          }}
        />

        <div className="relative z-10 flex h-[64px] w-[64px] items-center justify-center rounded-full border-2 border-dashed text-[28px]" style={{ borderColor: "color-mix(in srgb, var(--accent) 34%, transparent)", background: "var(--accent-glow)", color: "var(--accent-light)" }}>
          📡
        </div>
        <h3 className="relative z-10 m-0 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Visualization Workspace</h3>
        <p className="relative z-10 m-0 max-w-[220px] text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          This panel is intentionally kept empty for now and ready for future charts, graphs, maps, and spatial views.
        </p>

        <div className="relative z-10 mt-4 flex flex-wrap justify-center gap-2.5">
          {VISUALIZATION_IDEAS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px]"
              style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-muted)" }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
