import type { Badge } from "./types";

type BadgeListProps = {
  badges: Badge[];
};

export default function BadgeList({ badges }: BadgeListProps) {
  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.id}
          className={`flex max-w-full items-center gap-2 rounded-xl border border-border-glow bg-accent-glow px-3 py-2 text-xs font-semibold text-accent-light ${
            badge.variant === "url" ? "font-mono" : ""
          }`}
        >
          <b className="font-black uppercase tracking-[0.14em]">{badge.label}</b>
          <span className="truncate text-text-secondary">{badge.value}</span>
        </span>
      ))}
    </div>
  );
}
