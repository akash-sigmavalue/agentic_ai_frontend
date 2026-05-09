"use client";

const VISUALIZATION_IDEAS = [
  { label: "Charts", icon: "📊" },
  { label: "Graphs", icon: "🧭" },
  { label: "Maps", icon: "🗺️" },
];

export default function MapSection() {
  return (
    <section className="app-panel relative h-full min-h-[620px] overflow-hidden transition-shadow duration-200 hover:shadow-[0_0_0_1px_var(--accent),0_18px_48px_rgba(0,0,0,0.18)]">
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

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
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
