import type { CortexAgent } from './agents';

type Props = {
  agent: CortexAgent;
  active: boolean;
  mobile?: boolean;
  onSelect: () => void;
};

export default function CortexAgentCard({ agent, active, mobile = false, onSelect }: Props) {
  const Icon = agent.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ '--agent-color': agent.color } as React.CSSProperties}
      className={`group text-left transition duration-300 hover:-translate-y-1 ${mobile ? 'w-full' : 'absolute z-20 w-[190px] xl:w-[210px]'} ${agent.position} ${active ? 'scale-[1.025]' : ''}`}
    >
      <span className={`flex min-h-23 gap-3 rounded-2xl border p-3.5 backdrop-blur-xl transition ${active ? 'border-[var(--agent-color)] bg-white shadow-[0_18px_55px_color-mix(in_srgb,var(--agent-color)_22%,transparent)] dark:bg-slate-900/95' : 'border-indigo-200 bg-white/80 shadow-lg hover:border-[var(--agent-color)] dark:border-indigo-400/20 dark:bg-slate-950/75'}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--agent-color)_14%,transparent)] text-[var(--agent-color)]">
          <Icon className="size-5 transition-transform group-hover:scale-110" />
        </span>
        <span className="min-w-0">
          <strong className="block text-xs leading-tight text-slate-950 dark:text-white">{agent.name}</strong>
          <span className="mt-1 block text-[10px] leading-4 text-slate-500 dark:text-slate-300">{agent.summary}</span>
          <em className="mt-1.5 flex items-center gap-1.5 text-[8px] font-black tracking-widest text-emerald-600 not-italic uppercase dark:text-emerald-400"><i className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />Active node</em>
        </span>
      </span>
    </button>
  );
}
