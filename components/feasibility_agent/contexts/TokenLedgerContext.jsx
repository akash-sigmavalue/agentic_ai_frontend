import { createContext, useContext, useState, useCallback, useMemo } from "react";

export const TokenLedgerContext = createContext(null);

export function TokenLedgerProvider({ children }) {
  const [entries, setEntries] = useState([]);

  const addEntry = useCallback((entry) => {
    setEntries((prev) => [...prev, { ...entry, timestamp: new Date().toISOString() }]);
  }, []);

  const resetLedger = useCallback(() => setEntries([]), []);

  const summary = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const key = `${e.model}||${e.section}`;
      if (map.has(key)) {
        const ex = map.get(key);
        ex.apiCalls += e.apiCalls ?? 0;
        ex.inputTokens += e.inputTokens ?? 0;
        ex.outputTokens += e.outputTokens ?? 0;
        ex.totalTokens += e.totalTokens ?? 0;
        ex.costUsd += e.costUsd ?? 0;
      } else {
        map.set(key, {
          model: e.model,
          section: e.section,
          isDbCall: e.isDbCall ?? false,
          apiCalls: e.apiCalls ?? 0,
          inputTokens: e.inputTokens ?? 0,
          outputTokens: e.outputTokens ?? 0,
          totalTokens: e.totalTokens ?? 0,
          costUsd: e.costUsd ?? 0,
        });
      }
    });
    return Array.from(map.values());
  }, [entries]);

  return (
    <TokenLedgerContext.Provider value={{ entries, addEntry, resetLedger, summary }}>
      {children}
    </TokenLedgerContext.Provider>
  );
}

export function useTokenLedger() {
  const ctx = useContext(TokenLedgerContext);
  if (!ctx) throw new Error("useTokenLedger must be used inside TokenLedgerProvider");
  return ctx;
}
