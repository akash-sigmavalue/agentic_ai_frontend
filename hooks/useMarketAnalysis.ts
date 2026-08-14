import { useState } from "react";
import {
  AnalyzeResponse,
  TrendResponse,
  AppreciationResponse,
  FinalAnalysisResponse,
  TokenUsage,
} from "@/types/market_research";
import {
  fetchAnalysis,
  fetchTrend,
  fetchAppreciation,
  fetchFinalAnalysis,
} from "@/lib/market_research_api";

export function useMarketAnalysis() {
  const [formData, setFormData] = useState({
    latitude: "",
    longitude: "",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showOptions, setShowOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<"pricePoint" | "trend" | "appreciation" | "analysis" | null>(null);

  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [trendResults, setTrendResults] = useState<TrendResponse | null>(null);
  const [appreciationResults, setAppreciationResults] = useState<AppreciationResponse | null>(null);
  const [analysisResults, setAnalysisResults] = useState<FinalAnalysisResponse | null>(null);

  const [extractionTokens, setExtractionTokens] = useState<Record<string, TokenUsage>>({
    openai: { input_tokens: 0, output_tokens: 0, total_tokens: 0, call_count: 0 },
    bedrock: { input_tokens: 0, output_tokens: 0, total_tokens: 0, call_count: 0 },
  });

  const [clickedOptions, setClickedOptions] = useState({
    pricePoint: false,
    trend: false,
    appreciation: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOptions(true);
    setActiveTab(null);
    setResults(null);
    setTrendResults(null);
    setAppreciationResults(null);
    setAnalysisResults(null);
  };

  const runPricePoint = async () => {
    setActiveTab("pricePoint");
    setClickedOptions((prev) => ({ ...prev, pricePoint: true }));
    if (results) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalysis(formData);
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrendClick = async () => {
    setActiveTab("trend");
    setClickedOptions((prev) => ({ ...prev, trend: true }));
    if (trendResults) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrend(formData);
      setTrendResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppreciationClick = async () => {
    setActiveTab("appreciation");
    setClickedOptions((prev) => ({ ...prev, appreciation: true }));
    if (appreciationResults) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppreciation(formData);
      setAppreciationResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisClick = async () => {
    setActiveTab("analysis");
    if (analysisResults) return;

    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      price_point_data: results ? results : {},
      trend_data: trendResults ? trendResults : {},
      appreciation_data: appreciationResults ? appreciationResults : {},
    };

    try {
      const data = await fetchFinalAnalysis(payload);
      setAnalysisResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtractionTokens = (provider: string, usage: TokenUsage) => {
    setExtractionTokens((prev) => ({
      ...prev,
      [provider]: {
        input_tokens: (prev[provider]?.input_tokens || 0) + (usage.input_tokens || 0),
        output_tokens: (prev[provider]?.output_tokens || 0) + (usage.output_tokens || 0),
        total_tokens: (prev[provider]?.total_tokens || 0) + (usage.total_tokens || 0),
        call_count: (prev[provider]?.call_count || 0) + (usage.call_count || 1),
      },
    }));
  };

  return {
    formData,
    setFormData,
    loading,
    error,
    showOptions,
    activeTab,
    results,
    trendResults,
    appreciationResults,
    analysisResults,
    extractionTokens,
    clickedOptions,
    handleSubmit,
    runPricePoint,
    handleTrendClick,
    handleAppreciationClick,
    handleAnalysisClick,
    handleExtractionTokens,
  };
}
