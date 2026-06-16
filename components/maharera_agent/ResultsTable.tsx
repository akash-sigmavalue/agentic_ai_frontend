import { Download } from "lucide-react";
import AgentCard from "./AgentCard";
import type { DataRow } from "./types";

type ResultsTableProps = {
  data: DataRow[];
  onExportCsv: () => void;
  onExportJson: () => void;
};

export default function ResultsTable({ data, onExportCsv, onExportJson }: ResultsTableProps) {
  const columns = Array.from(
    data.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  return (
    <AgentCard title="Results">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-text-secondary">
          {data.length} record{data.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap gap-2">
          <ExportButton label="Export CSV" onClick={onExportCsv} />
          <ExportButton label="Export JSON" onClick={onExportJson} />
        </div>
      </div>

      <div className="custom-scrollbar h-full min-h-72 overflow-auto rounded-2xl border border-border bg-bg-deep/45">
        {!data.length ? (
          <div className="flex min-h-72 items-center justify-center px-5 py-12 text-center text-sm text-text-dim">
            No records yet. Run the agent to populate results here.
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-bg-card px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-accent-light">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-white/[0.03]">
                  {columns.map((column) => (
                    <td key={column} className="whitespace-nowrap border-b border-border/60 px-3 py-2 text-text-secondary">
                      {String(row[column] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AgentCard>
  );
}

type ExportButtonProps = {
  label: string;
  onClick: () => void;
};

function ExportButton({ label, onClick }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-9 items-center gap-2 rounded-xl border border-border bg-bg-card px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary transition hover:border-border-glow hover:text-text-primary"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
