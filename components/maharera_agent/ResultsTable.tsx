import { useState } from "react";
import { Download, Eye } from "lucide-react";
import AgentCard from "./AgentCard";
import ProjectDetailsModal from "./ProjectDetailsModal";
import type { DataRow } from "./types";

type ResultsTableProps = {
  data: DataRow[];
  onExportCsv: () => void;
  onExportJson: () => void;
};

const EXCLUDED_GRID_COLUMNS = [
  "project_overview",
  "developer_information",
  "location_information",
  "project_configuration",
  "legal_compliance",
  "documents",
  "additional_fields",
  "conflicts",
  "sources",
  "links",
  "raw_summary",
  "source_url",
  "record_type"
];

export default function ResultsTable({ data, onExportCsv, onExportJson }: ResultsTableProps) {
  const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null);

  // Compute normal columns, excluding nested structures
  const baseColumns = Array.from(
    data.reduce((set, row) => {
      Object.keys(row).forEach((key) => {
        if (!EXCLUDED_GRID_COLUMNS.includes(key)) {
          set.add(key);
        }
      });
      return set;
    }, new Set<string>()),
  );

  // Check if we have structured detail records
  const hasNestedDetails = data.some(
    (row) => row && (row.project_overview || row.developer_information)
  );

  // Add projection columns for a cleaner summary of structured detail rows
  const displayColumns = [...baseColumns];
  if (hasNestedDetails) {
    if (!displayColumns.includes("Project Name")) displayColumns.unshift("Project Name");
    if (!displayColumns.includes("RERA Number")) displayColumns.push("RERA Number");
    if (!displayColumns.includes("Status")) displayColumns.push("Status");
  }

  const getCellValue = (row: any, column: string) => {
    if (column === "Project Name") {
      return row.project_overview?.project_name || row.project_name || row.Name || "";
    }
    if (column === "RERA Number") {
      return row.project_overview?.rera_number || row.rera_number || row.ReraNumber || "";
    }
    if (column === "Status") {
      return row.project_overview?.registration_status || row.Status || row.status || "";
    }
    const val = row[column];
    if (val && typeof val === "object") {
      return "[Nested Details]";
    }
    return String(val ?? "");
  };

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
                <th className="sticky top-0 z-10 w-12 border-b border-border bg-bg-card px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-accent-light">
                  View
                </th>
                {displayColumns.map((column) => (
                  <th
                    key={column}
                    className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-bg-card px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-accent-light"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => setSelectedRow(row as Record<string, any>)}
                  className="group cursor-pointer hover:bg-white/[0.03] transition"
                >
                  <td className="border-b border-border/60 px-3 py-2 text-text-dim group-hover:text-accent-light">
                    <Eye className="h-4 w-4" />
                  </td>
                  {displayColumns.map((column) => (
                    <td
                      key={column}
                      className="whitespace-nowrap border-b border-border/60 px-3 py-2 text-text-secondary font-medium"
                    >
                      {getCellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProjectDetailsModal
        isOpen={selectedRow !== null}
        onClose={() => setSelectedRow(null)}
        data={selectedRow}
      />
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
