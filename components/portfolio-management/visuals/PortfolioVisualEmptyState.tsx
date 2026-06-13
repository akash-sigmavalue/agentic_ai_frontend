type PortfolioVisualEmptyStateProps = {
  message?: string;
};

export default function PortfolioVisualEmptyState({ message = 'Visual data is not available for this response.' }: PortfolioVisualEmptyStateProps) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div>
        <div className="mx-auto mb-3 h-2 w-24 rounded-full bg-slate-200" />
        <p className="m-0 text-sm font-black text-slate-900">{message}</p>
        <p className="m-0 mt-1 text-xs font-semibold text-slate-500">Ask a broader portfolio question or include comparable rows to generate a visual.</p>
      </div>
    </div>
  );
}
