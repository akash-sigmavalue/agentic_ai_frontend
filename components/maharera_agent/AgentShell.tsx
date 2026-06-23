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

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6">
          {children}
        </div>
      </div>
    </main>
  );
}
