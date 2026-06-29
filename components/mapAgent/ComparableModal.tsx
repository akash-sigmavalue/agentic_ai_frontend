"use client";

import { Table2, X } from "lucide-react";
import type { SetStateAction, Dispatch } from "react";

type ComparableModalProps = {
  comparables: any[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  onOpenDetails: (comp: any) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ComparableModal({
  comparables,
  selectedIndices,
  onToggle,
  onOpenDetails,
  onClose,
  onConfirm,
}: ComparableModalProps) {
  const allSelected = comparables.length > 0 && selectedIndices.size === comparables.length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0e14] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/20">
              <Table2 className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Select Comparable Projects</h3>
              <p className="text-[10px] text-slate-400">{comparables.length} results found for selection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <X />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          <div className="min-w-max border border-white/5 rounded-2xl overflow-hidden bg-white/5">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#0b0e14] border-b border-white/5">
                <tr className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-white/10 bg-white/5 accent-cyan-400"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) {
                          comparables.forEach((_, i) => { if (selectedIndices.has(i)) onToggle(i); });
                        } else {
                          comparables.forEach((_, i) => { if (!selectedIndices.has(i)) onToggle(i); });
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comparables.map((comp, i) => (
                  <tr key={i} className={`hover:bg-cyan-400/5 transition ${selectedIndices.has(i) ? "bg-cyan-400/10" : ""}`}>
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-white/10 bg-white/5 accent-cyan-400"
                        checked={selectedIndices.has(i)}
                        onChange={() => onToggle(i)}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{comp.project_name || "Comparable"}</td>
                    <td className="px-4 py-3 text-slate-300">{comp.location || comp.location_name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{comp.distance_from_subject_km ? `${comp.distance_from_subject_km} km` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (comp.confidence_score || 0) > 80 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {comp.confidence_score ?? comp.confidence_tier ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] uppercase text-slate-500">{comp.possession_status || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => onOpenDetails(comp)}
                        className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="border-t border-white/5 bg-white/5 p-6 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            <strong className="text-cyan-400">{selectedIndices.size}</strong> projects selected for listing analysis
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={selectedIndices.size === 0}
              className="rounded-xl bg-cyan-400 px-8 py-2.5 text-sm font-bold text-black shadow-lg hover:brightness-110 disabled:opacity-50 transition"
            >
              Confirm Selection & Proceed →
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
