import { useMemo } from "react";

export default function ReActReasoningReport({ report }) {
  const renderedLines = useMemo(() => {
    if (!report) return [];

    const lines = report.split('\n');
    return lines.map((line) => {
      let trimmed = line.trim();
      if (!trimmed) {
        return { type: 'empty', content: '' };
      }

      // Clean up markdown hashes & asterisks
      trimmed = trimmed.replace(/^#+\s*/, "");
      trimmed = trimmed.replace(/^\*\*+\s*/, "").replace(/\s*\*\*+$/, "");
      trimmed = trimmed.replaceAll("**", "");

      const upper = trimmed.toUpperCase();

      // 1. Stage Header Match
      if (upper.startsWith('STAGE ')) {
        return {
          type: 'stage-header',
          content: trimmed
        };
      }

      // 2. Step Header Match
      if (upper.startsWith('STEP ')) {
        return {
          type: 'step-header',
          content: trimmed
        };
      }

      // 3. Keyword matches
      const keywords = ['THOUGHT:', 'ACTION:', 'OBSERVATION:', 'CRITIQUE:', 'REVISE:'];
      for (const kw of keywords) {
        if (upper.startsWith(kw)) {
          return {
            type: kw.toLowerCase().slice(0, -1),
            label: trimmed.substring(0, kw.length),
            value: trimmed.substring(kw.length).trim()
          };
        }
      }

      // 4. Bullet points
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return {
          type: 'bullet',
          content: trimmed.substring(1).trim()
        };
      }

      // 5. Default line
      return {
        type: 'text',
        content: trimmed
      };
    });
  }, [report]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-panel p-6">
      <div className="max-h-[720px] overflow-y-auto custom-scrollbar space-y-3.5 font-mono text-xs sm:text-[13px] leading-relaxed pr-2">
        {renderedLines.map((line, idx) => {
          switch (line.type) {
            case 'empty':
              return <div key={idx} className="h-1" />;

            case 'stage-header':
              return (
                <div key={idx} className="border-b border-border/60 pb-2 pt-4 first:pt-0">
                  <h4 className="text-accent text-xs sm:text-[14px] font-black tracking-wider uppercase">
                    {line.content}
                  </h4>
                </div>
              );

            case 'step-header':
              return (
                <div key={idx} className="pt-2">
                  <h5 className="text-text-primary text-xs sm:text-[13px] font-bold tracking-wide uppercase">
                    {line.content}
                  </h5>
                </div>
              );

            case 'thought':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-accent-purple/40 text-text-dim italic">
                  <span className="text-accent-purple font-bold not-italic">{line.label}</span> {line.value}
                </div>
              );

            case 'action':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-accent/40 text-text-secondary">
                  <span className="text-accent font-bold">{line.label}</span> <code className="bg-bg-deep/40 px-1 py-0.5 rounded text-accent-light">{line.value}</code>
                </div>
              );

            case 'observation':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-success/40 text-text-secondary">
                  <span className="text-success font-bold">{line.label}</span> {line.value}
                </div>
              );

            case 'critique':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-warning/40 text-text-secondary">
                  <span className="text-warning font-bold">{line.label}</span> {line.value}
                </div>
              );

            case 'revise':
              return (
                <div key={idx} className="pl-3.5 border-l-2 border-accent-purple/40 text-text-secondary">
                  <span className="text-accent-purple font-bold">{line.label}</span> {line.value}
                </div>
              );

            case 'bullet':
              return (
                <div key={idx} className="pl-8 flex items-start gap-2 text-text-muted">
                  <span className="text-accent-light select-none">•</span>
                  <span>{line.content}</span>
                </div>
              );

            default:
              return (
                <div key={idx} className="text-text-secondary pl-3.5">
                  {line.content}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}
