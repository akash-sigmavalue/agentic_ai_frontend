"use client";

import { useMarketAnalysis } from "@/hooks/useMarketAnalysis";
import PriceTable from "@/components/market_research/PriceTable";
import LocationForm from "@/components/market_research/LocationForm";
import { PropertyCategories, TokenUsage } from "@/types/market_research";

export default function MarketResearchPage() {
  const {
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
  } = useMarketAnalysis();

  const getCumulativeTokens = (provider: "openai" | "bedrock") => {
    let input = 0, output = 0, total = 0, calls = 0;
    
    if (results) {
      const t = provider === "openai" ? results.openai_tokens : results.bedrock_tokens;
      if (t) { input += t.input_tokens; output += t.output_tokens; total += t.total_tokens; calls += (t.call_count || 1); }
    }
    if (trendResults) {
      const t = provider === "openai" ? trendResults.openai_tokens : trendResults.bedrock_tokens;
      if (t) { input += t.input_tokens; output += t.output_tokens; total += t.total_tokens; calls += (t.call_count || 1); }
    }
    if (appreciationResults) {
      const t = provider === "openai" ? appreciationResults.openai_tokens : appreciationResults.bedrock_tokens;
      if (t) { input += t.input_tokens; output += t.output_tokens; total += t.total_tokens; calls += (t.call_count || 1); }
    }
    if (analysisResults) {
      const t = provider === "openai" ? analysisResults.openai_tokens : analysisResults.bedrock_tokens;
      if (t) { input += t.input_tokens; output += t.output_tokens; total += t.total_tokens; calls += (t.call_count || 1); }
    }
    
    if (extractionTokens && extractionTokens[provider]) {
      input += extractionTokens[provider].input_tokens; 
      output += extractionTokens[provider].output_tokens; 
      total += extractionTokens[provider].total_tokens; 
      calls += (extractionTokens[provider].call_count || 0);
    }
    
    return { input_tokens: input, output_tokens: output, total_tokens: total, call_count: calls };
  };

  const renderTokenUsage = (current: TokenUsage | undefined, provider: "openai" | "bedrock") => {
    if (!current) return null;
    const cumulative = getCumulativeTokens(provider);
    return (
      <div className="mt-4 p-3 bg-[#11131c] border border-[#334155] rounded-lg text-xs font-mono text-gray-400 shadow-inner">
        <div className="flex justify-between border-b border-[#334155] pb-2 mb-2">
          <span>Current Section:</span>
          <span className="text-[#3b82f6]">IN: {current.input_tokens} | OUT: {current.output_tokens} | TOT: {current.total_tokens} | CALLS: {current.call_count || 1}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Cumulative:</span>
          <span className="text-[#10b981]">IN: {cumulative.input_tokens} | OUT: {cumulative.output_tokens} | TOT: {cumulative.total_tokens} | CALLS: {cumulative.call_count}</span>
        </div>
      </div>
    );
  };

  const renderCategoryTables = (categories: PropertyCategories, provider: "openai" | "bedrock" = "openai") => {
    if (!categories) return null;
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏠 Residential Flats</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.residential} location={results?.location || ""} provider={provider} onTokensUsed={(t) => handleExtractionTokens(provider, t)} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏢 Office Spaces</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.office} location={results?.location || ""} provider={provider} onTokensUsed={(t) => handleExtractionTokens(provider, t)} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏬 Retail/Shops</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.retail} location={results?.location || ""} provider={provider} onTokensUsed={(t) => handleExtractionTokens(provider, t)} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏞️ Land / Plots</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.land} location={results?.location || ""} provider={provider} onTokensUsed={(t) => handleExtractionTokens(provider, t)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0f111a] text-gray-100 font-sans p-6 md:p-10 selection:bg-[#6366f1] selection:text-white">
      <header className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-3">
          Data Lake Market Research
        </h1>
        <p className="text-gray-400 text-lg">4-Stage Modular Pipeline via OpenAI & Bedrock</p>
      </header>

      <section className={`mx-auto bg-[#1a1d29] border border-[#334155] rounded-xl p-6 md:p-8 shadow-2xl mb-12 relative overflow-hidden transition-all duration-500 ${showOptions ? 'w-full max-w-[1800px]' : 'max-w-3xl'}`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        
        <div className={showOptions ? "max-w-3xl mx-auto mb-8" : ""}>
          <LocationForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>

        {showOptions && (
          <div className="mt-8 border-t border-[#334155] pt-8">
            <div className="flex flex-col lg:flex-row gap-6 w-full">
              <div className="w-full lg:w-[15%] xl:w-[12%] flex flex-col gap-3 shrink-0">
                <h3 className="text-sm uppercase tracking-wider font-semibold text-gray-400 mb-2">Options</h3>
                <button
                  type="button"
                  onClick={runPricePoint}
                  disabled={loading && !results}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex justify-center items-center text-center ${
                    activeTab === "pricePoint"
                      ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                      : clickedOptions.pricePoint 
                        ? "bg-[#2a2f42] text-[#8b5cf6] border border-[#334155] hover:bg-[#32384f]"
                        : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                  }`}
                >
                  Property Rate
                </button>
                <button
                  type="button"
                  onClick={handleTrendClick}
                  disabled={loading && !trendResults}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex justify-center items-center text-center ${
                    activeTab === "trend"
                      ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                      : clickedOptions.trend 
                        ? "bg-[#2a2f42] text-[#8b5cf6] border border-[#334155] hover:bg-[#32384f]"
                        : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                  }`}
                >
                  Rate Trend Micromarket
                </button>
                <button
                  type="button"
                  onClick={handleAppreciationClick}
                  disabled={loading && !appreciationResults}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex justify-center items-center text-center ${
                    activeTab === "appreciation"
                      ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                      : clickedOptions.appreciation 
                        ? "bg-[#2a2f42] text-[#8b5cf6] border border-[#334155] hover:bg-[#32384f]"
                        : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                  }`}
                >
                  Appreciation Potential
                </button>
                <button
                  type="button"
                  onClick={handleAnalysisClick}
                  disabled={!clickedOptions.pricePoint || !clickedOptions.trend || !clickedOptions.appreciation}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex justify-center items-center text-center ${
                    activeTab === "analysis"
                      ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                      : (!clickedOptions.pricePoint || !clickedOptions.trend || !clickedOptions.appreciation)
                        ? "bg-[#181a24] text-gray-600 border border-[#262a38] cursor-not-allowed opacity-50"
                        : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                  }`}
                >
                  Final Synthesis
                </button>
              </div>

              <div className="w-full lg:w-[85%] xl:w-[88%] bg-[#11131c] border border-[#334155] rounded-xl p-6 min-h-[500px]">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 animate-pulse">Running AI Market Analysis...</p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-950/40 border border-red-800 rounded-lg text-red-300 mb-6">
                    {error}
                  </div>
                )}

                {!loading && activeTab === "pricePoint" && results && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h2 className="text-xl font-bold text-blue-400 mb-4 border-b border-[#334155] pb-2">OpenAI Results</h2>
                      {renderCategoryTables(results.openai_result.property_categories, "openai")}
                      {renderTokenUsage(results.openai_tokens, "openai")}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-purple-400 mb-4 border-b border-[#334155] pb-2">AWS Bedrock Results</h2>
                      {renderCategoryTables(results.bedrock_result.property_categories, "bedrock")}
                      {renderTokenUsage(results.bedrock_tokens, "bedrock")}
                    </div>
                  </div>
                )}

                {!loading && activeTab === "trend" && trendResults && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h2 className="text-xl font-bold text-blue-400 mb-4 border-b border-[#334155] pb-2">OpenAI Trend</h2>
                      <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: trendResults.openai_trend }} />
                      {renderTokenUsage(trendResults.openai_tokens, "openai")}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-purple-400 mb-4 border-b border-[#334155] pb-2">Bedrock Trend</h2>
                      <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: trendResults.bedrock_trend }} />
                      {renderTokenUsage(trendResults.bedrock_tokens, "bedrock")}
                    </div>
                  </div>
                )}

                {!loading && activeTab === "appreciation" && appreciationResults && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h2 className="text-xl font-bold text-blue-400 mb-4 border-b border-[#334155] pb-2">OpenAI Appreciation</h2>
                      <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: appreciationResults.openai_appreciation }} />
                      {renderTokenUsage(appreciationResults.openai_tokens, "openai")}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-purple-400 mb-4 border-b border-[#334155] pb-2">Bedrock Appreciation</h2>
                      <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: appreciationResults.bedrock_appreciation }} />
                      {renderTokenUsage(appreciationResults.bedrock_tokens, "bedrock")}
                    </div>
                  </div>
                )}

                {!loading && activeTab === "analysis" && analysisResults && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h2 className="text-xl font-bold text-blue-400 mb-4 border-b border-[#334155] pb-2">OpenAI Final Synthesis</h2>
                      <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: analysisResults.openai_analysis }} />
                      {renderTokenUsage(analysisResults.openai_tokens, "openai")}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-purple-400 mb-4 border-b border-[#334155] pb-2">Bedrock Final Synthesis</h2>
                      <div className="prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: analysisResults.bedrock_analysis }} />
                      {renderTokenUsage(analysisResults.bedrock_tokens, "bedrock")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
