import { useState } from "react";

export default function ValuationResult({ data, currency = "INR" }) {
  const [confLevel, setConfLevel] = useState("95");
  const [showCalc, setShowCalc] = useState(false);

  if (!data) return null;

  const { mean_rate, std_dev, sample_size, sem, moe, critical_values } = data;
  const currentMoe = moe[confLevel] || 0;
  const currentCv = critical_values[confLevel] || 0;

  const lower = mean_rate - currentMoe;
  const upper = mean_rate + currentMoe;

  const locale = currency === "INR" ? "en-IN" : "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  });

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[rgba(16,185,129,0.28)] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(11,14,20,0.92))] shadow-[0_20px_40px_rgba(0,0,0,0.35)] animate-in slide-in-from-bottom-2">
      <div className="border-b border-[rgba(16,185,129,0.16)] bg-[rgba(16,185,129,0.06)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.12)] text-lg text-[#10b981]">
              🎯
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#10b981]">
                Final Valuation
              </p>
              <p className="text-[10px] text-text-dim">
                Based on {sample_size} pooled comparable listings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-text-dim hidden sm:inline">Confidence:</span>
            <select
              value={confLevel}
              onChange={(e) => setConfLevel(e.target.value)}
              className="rounded-lg border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] px-2 py-1 text-xs font-bold text-[#10b981] outline-none cursor-pointer hover:bg-[rgba(16,185,129,0.15)] transition"
            >
              <option value="90" style={{ backgroundColor: 'var(--bg-dark, #0b0e14)', color: 'var(--text-primary, #f8fafc)' }}>90%</option>
              <option value="95" style={{ backgroundColor: 'var(--bg-dark, #0b0e14)', color: 'var(--text-primary, #f8fafc)' }}>95%</option>
              <option value="99" style={{ backgroundColor: 'var(--bg-dark, #0b0e14)', color: 'var(--text-primary, #f8fafc)' }}>99%</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-5 text-center">
        <p className="mb-1 text-xs text-text-secondary uppercase tracking-widest">Estimated Value / Sqft</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span className="text-3xl font-black tracking-tight text-white">{formatter.format(mean_rate)}</span>
          <span className="text-lg font-bold text-text-dim">± {formatter.format(currentMoe)}</span>
        </div>
        <p className="mt-3 text-sm font-bold text-[#10b981]">
          {formatter.format(lower)} <span className="text-text-dim mx-2 font-normal">—</span> {formatter.format(upper)}
        </p>
      </div>

      <div className="border-t border-white/5 bg-bg-deep/50 px-4 py-3">
        <button
          onClick={() => setShowCalc(!showCalc)}
          className="flex w-full items-center justify-between text-xs font-semibold text-text-dim hover:text-[#10b981] transition"
        >
          <span>View Calculation Breakdown</span>
          <span>{showCalc ? "▲" : "▼"}</span>
        </button>
        {showCalc && (
          <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-black/20 p-4 text-xs font-mono text-text-secondary animate-in fade-in duration-200">
            <div className="flex justify-between"><span className="text-text-dim">Sample Mean (x̄)</span> <span className="text-white">{formatter.format(mean_rate)}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Standard Deviation (s)</span> <span className="text-white">{formatter.format(std_dev)}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Sample Size (n)</span> <span className="text-white">{sample_size}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Standard Error (s / √n)</span> <span className="text-white">{formatter.format(sem)}</span></div>
            <div className="my-2 border-t border-dashed border-white/10" />
            <div className="flex justify-between"><span className="text-text-dim">{sample_size < 30 ? "T-Score" : "Z-Score"} ({confLevel}%)</span> <span className="text-white">{currentCv}</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Margin of Error (CV × SE)</span> <span className="text-white">{formatter.format(currentMoe)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
