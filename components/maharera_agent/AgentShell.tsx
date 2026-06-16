import type { ReactNode } from "react";
import { Building2, ShieldCheck } from "lucide-react";

type AgentShellProps = {
  children: ReactNode;
};

export default function AgentShell({ children }: AgentShellProps) {
  return (
    <main className="maharera-agent-page relative min-h-screen overflow-hidden bg-bg-deep pt-20 text-text-primary">
      <div className="bg-grid" />

      <div className="relative z-10 flex h-[calc(100vh-5rem)] flex-col">
        <header className="border-b border-border bg-bg-header backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] text-white shadow-[0_0_24px_rgba(34,211,238,0.35)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-sm font-black uppercase tracking-[0.22em] text-text-primary">
                  MahaRERA Agent
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-dim">
                  Universal RERA Intelligence
                </p>
              </div>
              <span className="hidden rounded-md border border-border-glow bg-accent-glow px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-light md:inline-flex">
                All India
              </span>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-xs font-semibold text-text-secondary md:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_16px_var(--success)] animate-pulse" />
              <span>Agent Synchronized</span>
            </div>

            <div className="hidden items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2 font-mono text-xs text-text-secondary sm:flex">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span className="text-text-dim">PORTAL:</span> AUTO
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6">
          {children}
        </div>
      </div>
    </main>
  );
}
