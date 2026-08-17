import { useTokenLedger } from "../contexts/TokenLedgerContext";

// Per-token pricing (USD). Input pricing per 1M tokens, output per 1M tokens.
// Based on AWS Bedrock Mantle published rates — update here only when pricing changes.
const MODEL_PRICING = {
  "moonshotai.kimi-k2-thinking":              { input: 15.0 / 1_000_000, output: 15.0  / 1_000_000 },
  "moonshotai.kimi-k2.5":                     { input: 15.0 / 1_000_000, output: 15.0  / 1_000_000 },
  "mistral.mistral-large-3-675b-instruct":    { input:  2.0 / 1_000_000, output:  6.0  / 1_000_000 },
  "deepseek.v3.2":                            { input:  2.7 / 1_000_000, output: 11.0  / 1_000_000 },
  "amazon.nova-pro-v1:0":                     { input:  0.8 / 1_000_000, output:  3.2  / 1_000_000 },
  "apac.amazon.nova-pro-v1:0":                { input:  0.8 / 1_000_000, output:  3.2  / 1_000_000 },
  "qwen.qwen3-coder-next":                    { input:  3.0 / 1_000_000, output: 12.0  / 1_000_000 },
};

function calcCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return pricing.input * (inputTokens ?? 0) + pricing.output * (outputTokens ?? 0);
}

export function useLedger() {
  const { addEntry, resetLedger, summary } = useTokenLedger();

  /**
   * Record an LLM API call.
   * @param {string} model - model id (e.g. "moonshotai.kimi-k2-thinking")
   * @param {string} section - section label (e.g. "Comparable Projects")
   * @param {{ inputTokens?, outputTokens?, totalTokens?, apiCalls? }} tokenData
   */
  const recordLlmCall = (model, section, tokenData = {}) => {
    const inputTokens  = tokenData.inputTokens  ?? tokenData.input_tokens  ?? 0;
    const outputTokens = tokenData.outputTokens ?? tokenData.output_tokens ?? 0;
    const totalTokens  = tokenData.totalTokens  ?? tokenData.total_tokens  ?? (inputTokens + outputTokens);
    const apiCalls     = tokenData.apiCalls     ?? 1;
    const costUsd      = calcCost(model, inputTokens, outputTokens);
    addEntry({ model, section, isDbCall: false, apiCalls, inputTokens, outputTokens, totalTokens, costUsd });
  };

  /**
   * Record a DB call (no tokens, no cost).
   * @param {string} dbLabel - e.g. "Transaction DB", "Project DB"
   * @param {string} section - section label
   * @param {number} apiCalls - number of DB calls made
   */
  const recordDbCall = (dbLabel, section, apiCalls = 1) => {
    addEntry({ model: dbLabel, section, isDbCall: true, apiCalls, inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 });
  };

  return { recordLlmCall, recordDbCall, resetLedger, summary };
}
