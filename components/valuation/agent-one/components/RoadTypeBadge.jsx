export default function RoadTypeBadge({ type }) {
  if (!type) return <span className="text-text-dim">—</span>;

  const config = {
    'D': { label: 'Expressway', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    'B': { label: 'Primary', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'C': { label: 'Secondary', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    'A': { label: 'Residential', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  };

  const c = config[type] || { label: type, color: 'bg-border/20 text-text-secondary border-border/30' };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.color}`} title={`${c.label} Road`}>
      {type}
    </span>
  );
}
