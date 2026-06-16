import type { StatusKind } from "./types";

type StatusChipProps = {
  text: string;
  kind: StatusKind;
};

const styles: Record<NonNullable<StatusKind>, string> = {
  busy: "border-warning/30 bg-warning/10 text-warning",
  done: "border-success/30 bg-success/10 text-success",
  err: "border-danger/30 bg-danger/10 text-danger",
};

export default function StatusChip({ text, kind }: StatusChipProps) {
  return (
    <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.14em] ${kind ? styles[kind] : "border-accent/30 bg-accent/10 text-accent"}`}>
      {text}
    </span>
  );
}
