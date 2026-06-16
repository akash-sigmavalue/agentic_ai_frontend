import type { ReactNode } from "react";

type AgentCardProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function AgentCard({ title, action, children }: AgentCardProps) {
  return (
    <section className="panel-shell h-full min-h-0">
      <div className="panel-header-shell shrink-0">
        <div className="panel-title-shell">
          <div>
            <p className="panel-kicker">Universal RERA</p>
            <h2 className="panel-heading">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-4">{children}</div>
    </section>
  );
}
