"use client";

import { useEffect, useRef, useState, Fragment, useMemo } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  MessageSquareCode,
  Bot,
  FileSearch,
  Sparkles,
  TrendingUp,
  MapPin,
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle,
  Database,
  CheckCircle,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Info,
  ArrowUp,
  ArrowDown,
  Filter,
  Search,
  X,
  Zap,
  Loader2,
  Terminal,
  Cpu,
  Maximize2,
  Minimize2
} from "lucide-react";

import {
  QUICK_PROMPTS,
  QUICK_ESTIMATE_DEFAULTS,
  QUICK_FIELD_CONFIG,
  PLACEHOLDER_MAP,
  getCurrencySymbol,
  humanizeFieldName,
  getSubjectSublocalityList,
  getSublocalityItems,
  formatSublocalities,
  getRowKey,
  needsPlotConversionInputs,
  summarizeEvent,
} from "./chat-utils";

import ReActReasoningReport from "./components/ReActReasoningReport";
import TableHeaderCell from "./components/TableHeaderCell";
import RoadTypeBadge from "./components/RoadTypeBadge";
import { ListingTable, TransactionTable } from "./components/ListingTable";
import CleanedTable from "./components/CleanedTable";
import ComparableTable, { DroppedComparableTable } from "./components/ComparableTable";
import FactorialTable from "./components/FactorialTable";
import FactoringResultCard from "./components/FactoringResultCard";
import { CostInputsForm } from "./components/CostResultCard";
import CostResultCard from "./components/CostResultCard";
import QuickEstimatePanel, { QuickEstimateProgressPanel, getQuickEstimateStages, resolveQuickEstimateStageIndex } from "./components/QuickEstimatePanel";
import { PropertyProfilingLiveCard, StageDetailCard, STAGE_PROFILING_TITLE, STAGE_DETAIL_FIELDS, parseStageDetailMessage } from "./components/PropertyProfilingLiveCard";
import UserFormWizardPanel from "./components/UserFormWizardPanel";

export default function ChatSectionNext({ onEvent, onClear, onEventsReset, onMarkersUpdate, factorialData: externalFactorialData, onValuationResult, events, setEvents, isMaximized, onToggleMaximize }) {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [valuationResult, setValuationResult] = useState(null);
  const [input, setInput] = useState("");
  const [revertNotice, setRevertNotice] = useState("");
  const [backupValuationState, setBackupValuationState] = useState(null);

  // Auto-restore and execute pending query after login redirect
  useEffect(() => {
    if (user) {
      const pendingQuery = sessionStorage.getItem("sigmavalue_pending_query");
      if (pendingQuery) {
        sessionStorage.removeItem("sigmavalue_pending_query");
        setInput(pendingQuery);
        setTimeout(() => {
          submitQuestion(pendingQuery);
        }, 400);
      }
    }
  }, [user]);

  // Clear revert notice after 3 seconds
  useEffect(() => {
    if (revertNotice) {
      const timer = setTimeout(() => {
        setRevertNotice("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [revertNotice]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isQuickEstimateStreaming, setIsQuickEstimateStreaming] = useState(false);
  const [quickEstimateValues, setQuickEstimateValues] = useState(QUICK_ESTIMATE_DEFAULTS);
  const [quickEstimateProgress, setQuickEstimateProgress] = useState({
    activeIndex: 0,
    message: "Connecting to quick estimate stream...",
    detail: {},
    done: false,
    startedAt: null,
  });
  const [showQuickEstimateModal, setShowQuickEstimateModal] = useState(false);
  const [showUserFormModal, setShowUserFormModal] = useState(false);
  const [inputMode, setInputMode] = useState("user_form");
  const [userFormValues, setUserFormValues] = useState({ ...QUICK_ESTIMATE_DEFAULTS });
  const [streamingNote, setStreamingNote] = useState("");
  const [listingStatusNote, setListingStatusNote] = useState("");
  const [cleaningStatusNote, setCleaningStatusNote] = useState("");
  const [factorialStatusNote, setFactorialStatusNote] = useState("");
  const [analysisStatusNote, setAnalysisStatusNote] = useState("");
  // Streaming execution log terminal
  const [executionLogs, setExecutionLogs] = useState([]); // [{level, text, ts}]
  const addLog = (text, level = "info") => {
    setExecutionLogs(prev => [...prev, { text, level, ts: Date.now() }]);
  };
  // Live project-wise fetch status: { [projectName]: "pending"|"fetching"|"done"|"error"|"skipping" }
  const [projectFetchStatuses, setProjectFetchStatuses] = useState({});
  const [tokenStats, setTokenStats] = useState({
    total_tokens: 0,
    cost_usd: 0,
    model_breakdown: {},
    tool_breakdown: {},
    stage_breakdown: {}
  });
  const [showTokenBreakdown, setShowTokenBreakdown] = useState(false);

  // Helper for model-wise pricing:
  // Mistral Large 3: Input $0.50/1M, Output $1.50/1M
  // Kimi: Input $0.60/1M, Output $3.00/1M (commented out)
  // GPT-4o: Input $5.00/1M, Output $15.00/1M
  // GPT-4o-mini/others: Input $0.15/1M, Output $0.60/1M
  const getModelCost = (model, prompt, completion) => {
    const modelLower = model.toLowerCase();
    if (modelLower.includes("mistral.mistral-large-3-675b-instruct") || modelLower.includes("mistral-large-3")) {
      return (prompt / 1000000 * 0.50) + (completion / 1000000 * 1.50);
    } else if (modelLower.includes("gpt-4o") && !modelLower.includes("mini")) {
      return (prompt / 1000000 * 5.00) + (completion / 1000000 * 15.00);
    } else {
      return (prompt / 1000000 * 0.15) + (completion / 1000000 * 0.60);
    }
  };

  const calculatedTotalTokens = useMemo(() => {
    return Object.entries(tokenStats.model_breakdown)
      .filter(([model]) => model.toLowerCase() !== "unknown")
      .reduce((sum, [_, usage]) => sum + (usage.total || 0), 0);
  }, [tokenStats.model_breakdown]);

  const calculatedCostUsd = useMemo(() => {
    const modelCost = Object.entries(tokenStats.model_breakdown).reduce(
      (sum, [model, usage]) => sum + getModelCost(model, usage.prompt || 0, usage.completion || 0),
      0
    );
    const toolCost = Object.values(tokenStats.tool_breakdown).reduce(
      (sum, tool) => sum + (tool.cost_usd || 0),
      0
    );
    return modelCost + toolCost;
  }, [tokenStats.model_breakdown, tokenStats.tool_breakdown]);

  const stageBreakdownEntries = useMemo(() => {
    return Object.entries(tokenStats.stage_breakdown || {})
      .filter(([, usage]) => (usage.total || 0) > 0)
      .sort((a, b) => (a[0] || "").localeCompare(b[0] || ""));
  }, [tokenStats.stage_breakdown]);

  const [currentQuestion, setCurrentQuestion] = useState("");
  const [clarificationPrompt, setClarificationPrompt] = useState("");
  const [clarificationFields, setClarificationFields] = useState([]);
  const [clarificationValues, setClarificationValues] = useState({});
  const [mapConfirmation, setMapConfirmation] = useState(null);
  const [approachChoiceNeeded, setApproachChoiceNeeded] = useState(null);
  const [extractionVerification, setExtractionVerification] = useState(null);

  // ── Stage 1 Gate Wizard ────────────────────────────────────────
  const [gateActive, setGateActive] = useState(false);
  const [gateStep, setGateStep] = useState(1);
  const [gateMode, setGateMode] = useState(null);
  const [gateAllFields, setGateAllFields] = useState([]);
  const [gateValues, setGateValues] = useState({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [showActionRequiredInfo, setShowActionRequiredInfo] = useState(false);
  const [showGeocodeTipInfo, setShowGeocodeTipInfo] = useState(false);
  const [showComparableActionInfo, setShowComparableActionInfo] = useState(false);
  const [showListingFetchInfo, setShowListingFetchInfo] = useState(false);
  const [showCleaningInfo, setShowCleaningInfo] = useState(false);
  const [showFactorialInfo, setShowFactorialInfo] = useState(false);

  // ── Gate Wizard Helper ─────────────────────────────────────────
  // Builds a flat { field: value } map for the gate wizard.
  // Strategy:
  //   1. Seed ALL scalar, non-null values from subjectObj into vals
  //      (covers project_name, location_name, city_name, property_type,
  //       area fields, etc. — regardless of what `fields` schema contains)
  //   2. Overlay field.default for any schema field still missing a value
  //   3. Inject lat/lng from mapConfirmation if not already set
  const buildGateInitialValues = (fields, subjectObj, mapConf) => {
    const vals = {};

    // Pass 1 – full subject seed: write every known scalar value from subjectObj
    if (subjectObj && typeof subjectObj === 'object') {
      const oq = subjectObj._original_query || originalQuestion || "";
      const oqLow = oq.toLowerCase().trim();
      Object.entries(subjectObj).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '') return;
        if (typeof v === 'object') return; // skip nested objects / arrays
        if (typeof v === 'string') {
          const vLow = v.toLowerCase().trim();
          if (vLow && oqLow && (vLow === oqLow || (vLow.length > 30 && oqLow.includes(vLow)))) return;
        }
        vals[k] = v;
      });
    }

    // Pass 2 – schema defaults: fill in anything still missing from field.default
    if (Array.isArray(fields)) {
      fields.forEach(({ field, default: defaultVal }) => {
        if (!field) return;
        if (vals[field] === undefined && defaultVal !== undefined && defaultVal !== null) {
          vals[field] = defaultVal;
        }
      });
    }

    // Pass 3 – geocoded coordinates from mapConfirmation
    if (mapConf?.lat && mapConf?.lng) {
      if (vals.lat === undefined) vals.lat = mapConf.lat;
      if (vals.lng === undefined) vals.lng = mapConf.lng;
      if (vals.coordinates === undefined) vals.coordinates = `${mapConf.lat}, ${mapConf.lng}`;
    }

    return vals;
  };

  const publishValuationResult = (payload) => {
    setValuationResult(payload);
    onValuationResult?.(payload);
  };

  const downloadValuationReport = async () => {
    if (!valuationResult || typeof window === "undefined") return;
    const { downloadPDF } = await import("@/components/valuation/shared/ValuationReport");
    downloadPDF(valuationResult);
  };

  const [marketSignalCollapsed, setMarketSignalCollapsed] = useState(false);
  const [cleanedTableCollapsed, setCleanedTableCollapsed] = useState(false);
  const [stageDetailForceCollapsed, setStageDetailForceCollapsed] = useState(false);
  // ── Collapse states for all interactive panels ────────────────
  const [gateCollapsed, setGateCollapsed] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [approachCollapsed, setApproachCollapsed] = useState(false);
  const [ctaListingCollapsed, setCtaListingCollapsed] = useState(false);
  const [ctaCleanCollapsed, setCtaCleanCollapsed] = useState(false);
  const [ctaFactorialCollapsed, setCtaFactorialCollapsed] = useState(false);
  const [comparableData, setComparableData] = useState(null);
  const [droppedComparableData, setDroppedComparableData] = useState(null);
  const [selectedComps, setSelectedComps] = useState(new Set());
  const [dbNoResults, setDbNoResults] = useState(false);
  const [isComparableSearchActive, setIsComparableSearchActive] = useState(false);
  const [comparableSearchStatus, setComparableSearchStatus] = useState("");
  const [subjectData, setSubjectData] = useState(null);
  const [listingData, setListingData] = useState(null);
  const [dbTransactions, setDbTransactions] = useState([]); // transactions from Internal DB comparables
  const [isListingStreaming, setIsListingStreaming] = useState(false);
  const [cleanedData, setCleanedData] = useState(null);
  const [isCleaningStreaming, setIsCleaningStreaming] = useState(false);
  const pendingCleaningResultRef = useRef(null);
  const [factorialData, setFactorialData] = useState(null);
  const [isFactorialStreaming, setIsFactorialStreaming] = useState(false);
  const [factorialAnalysisData, setFactorialAnalysisData] = useState(null);
  const [isFactorialAnalysisStreaming, setIsFactorialAnalysisStreaming] = useState(false);
  const [needsFactorialRegeneration, setNeedsFactorialRegeneration] = useState(false);
  const [pipelineDone, setPipelineDone] = useState(false);
  const [currentStage, setCurrentStage] = useState("Stage 0: Initialization");
  const [originalQuestion, setOriginalQuestion] = useState("");

  // Cost Approach States
  const [costInputsSchema, setCostInputsSchema] = useState(null);
  const [costInputsValues, setCostInputsValues] = useState({});
  const [costCalculationData, setCostCalculationData] = useState(null);
  const [isCostCalculating, setIsCostCalculating] = useState(false);
  // Tracks which comparable IDs have already been fetched (for incremental addition)
  const [fetchedCompIds, setFetchedCompIds] = useState(new Set());

  const hasPendingFetch = useMemo(() => {
    if (!comparableData || !subjectData) return false;
    const selected = Array.from(selectedComps).map(i => comparableData[i]);
    const getCompId = c => String(c.project_id || c.id || c.project_name || "").trim();

    // Check if any selected comparable is not fetched yet
    const hasUnfetchedComp = selected.some(c => !fetchedCompIds.has(getCompId(c)));
    if (hasUnfetchedComp) return true;

    // Check if subject DB transactions need fetching
    const subjectDbProject = subjectData?.subject_db_project || null;
    const shouldFetchSubjectTx = subjectDbProject && !fetchedCompIds.has("__subject__");
    if (shouldFetchSubjectTx) return true;

    // Check if subject web listings need fetching
    const webComps = selected.filter(c => (c.data_source || "Web") !== "Internal DB");
    const shouldFetchWebListings = webComps.length > 0 || !fetchedCompIds.has("__subject_web__");
    if (shouldFetchWebListings && !fetchedCompIds.has("__subject_web__")) return true;

    return false;
  }, [selectedComps, fetchedCompIds, comparableData, subjectData]);

  // Special Factorial Analysis State
  const [showSpecialForm, setShowSpecialForm] = useState(false);
  const [specialSubjectName, setSpecialSubjectName] = useState("Lodha Altamount");
  const [specialSubjectLat, setSpecialSubjectLat] = useState("18.974");
  const [specialSubjectLng, setSpecialSubjectLng] = useState("72.810");
  const [specialCompName, setSpecialCompName] = useState("Rustomjee Crown");
  const [specialCompLat, setSpecialCompLat] = useState("19.018");
  const [specialCompLng, setSpecialCompLng] = useState("72.827");

  // Auto-collapse completed steps when new data arrives
  const prevListingDataRef = useRef(null);
  const prevCleanedDataRef = useRef(null);
  const prevFactorialDataRef = useRef(null);
  const autoVerifyFormRef = useRef(false);
  const subjectDataRef = useRef(null);

  useEffect(() => {
    if (listingData && !prevListingDataRef.current) {
      setCtaListingCollapsed(true);
    }
    prevListingDataRef.current = listingData;
  }, [listingData]);

  useEffect(() => {
    if (cleanedData && !prevCleanedDataRef.current) {
      setCtaCleanCollapsed(true);
    }
    prevCleanedDataRef.current = cleanedData;
  }, [cleanedData]);

  useEffect(() => {
    if (factorialData && !prevFactorialDataRef.current) {
      setCtaFactorialCollapsed(true);
    }
    prevFactorialDataRef.current = factorialData;
  }, [factorialData]);

  useEffect(() => {
    setShowActionRequiredInfo(false);
  }, [gateStep, gateCollapsed]);

  useEffect(() => {
    setShowGeocodeTipInfo(false);
  }, [gateStep, gateCollapsed]);

  useEffect(() => {
    setShowComparableActionInfo(false);
  }, [pipelineDone, comparableData, listingData, isComparableSearchActive]);

  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const markersRef = useRef([]);

  const selectedComparablePayload = () => {
    if (!comparableData) return [];
    return Array.from(selectedComps).map((i) => comparableData[i]).filter(Boolean);
  };

  const handleCalculateRate = (factData) => {
    submitFactorialAnalysis(factData || factorialData, subjectData, selectedComparablePayload());
  };

  const submitFactorialAnalysis = async (factData, subject, comparables) => {
    if (!factData || !subject || isFactorialAnalysisStreaming) return;

    setIsFactorialAnalysisStreaming(true);
    setStreamingNote("Analyzing factorial data...");
    setAnalysisStatusNote("Analyzing factorial data...");
    setCurrentStage("Stage 5: Rate Analysis");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Calculate final subject rate from factorial table (${factData?.table?.length || 0} projects).`,
        meta: "Now",
      },
      {
        role: "assistant",
        content: "Analyzing factorial data...",
        meta: "Live",
      },
    ]);

    try {
      const response = await fetch(apiUrl("/factorial_analysis_stream"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorial_data: factData,
          subject,
          comparables,
          currency: subject.currency,
          area_unit: subject.area_unit || "sqft",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Rate analysis failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Rate analysis update received.";
          if (event.type === "factorial_analysis_start") summary = event.content?.message || "Analyzing factorial data...";
          else if (event.type === "factorial_analysis_result") summary = `✅ Rate analysis complete — subject rate calculated.`;
          else if (event.type === "factorial_analysis_done") summary = "Rate analysis finished.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);
          setAnalysisStatusNote(summary);
          addLog(summary, event.type === "error" ? "error" : "info");

          if (event.type === "factorial_analysis_result") {
            const analysis = {
              ...event.content,
              subject_final_rate: event.content?.subject_final_rate ?? event.content?.subject_final_plot_rate,
            };
            setFactorialAnalysisData(analysis);
            publishValuationResult({
              type: subject?.recommended_approach === "cost" ? "cost" : "market",
              factorialAnalysis: analysis,
              subjectData: subjectDataRef.current || subject,
              factorialData: factData,
              costCalculation: null,
              timestamp: new Date().toISOString(),
            });
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "rate analysis results",
                  factorial_analysis_data: analysis,
                };
              }
              return next;
            });
          }

          if (event.type === "factorial_analysis_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta?.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "rate analysis done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Rate analysis error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsFactorialAnalysisStreaming(false);
      setStreamingNote("");
      setAnalysisStatusNote("");
    }
  };

  const handleCostCalculate = async () => {
    if (isCostCalculating || !subjectData || !factorialAnalysisData) return;

    const isRecalculation = Boolean(costCalculationData);
    setIsCostCalculating(true);
    setStreamingNote("Sending inputs to Traditional Cost Approach Engine...");

    const derivedRate = factorialAnalysisData.subject_final_rate || 0;
    const plotArea = subjectData?.plot_area_sqft || 0;
    const builtupArea = subjectData?.builtup_area_sqft || 0;
    const ageYears = subjectData?.age_years || 0;

    const payload = {
      derived_plot_rate_per_sqft: Number(derivedRate),
      plot_area_sqft: Number(plotArea),
      builtup_area_sqft: Number(builtupArea),
      property_type: subjectData?.property_type || "villa",
      construction_rate_per_sqft: Number(costInputsValues.construction_rate_per_sqft || 0),
      total_life_of_building: Number(costInputsValues.total_life_of_building || 60),
      age_of_property: Number(ageYears),
    };

    if (!isRecalculation) {
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: `Run Traditional Cost Approach calculation. Construction Rate: ₹${payload.construction_rate_per_sqft}/sqft, Economic Life: ${payload.total_life_of_building} yrs. Plot Area: ${payload.plot_area_sqft} sqft, Built-up Area: ${payload.builtup_area_sqft} sqft, Age: ${payload.age_of_property} yrs.`,
          meta: "Now"
        },
        { role: "assistant", content: "Calculating depreciated property value...", meta: "Live" },
      ]);
    } else {
      setMessages((prev) => {
        const costResultIndex = prev.findIndex((msg) => msg.cost_calculation_data);
        if (costResultIndex === -1) return prev;
        return prev.map((msg, idx) =>
          idx === costResultIndex
            ? {
              ...msg,
              content: "Recalculating Cost Approach with updated parameters...",
              meta: "Live",
            }
            : msg
        );
      });
    }

    try {
      const response = await fetch(apiUrl("/cost_calculation_stream"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Cost calculation failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Valuation update received.";
          if (event.type === "cost_calculation_start") summary = event.content?.message || "Running Cost Approach calculations...";
          else if (event.type === "cost_calculation_result") summary = `🛡️ Cost Approach calculated.`;
          else if (event.type === "cost_calculation_done") summary = "Cost Approach calculation complete.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);
          addLog(summary, event.type === "error" ? "error" : "info");

          if (event.type === "cost_calculation_result") {
            setCostCalculationData(event.content);
            // Bubble cost valuation result up for the Report tab in Visual Layer
            publishValuationResult({
              type: "cost",
              factorialAnalysis: factorialAnalysisData,
              costCalculation: event.content,
              subjectData: subjectDataRef.current || subjectData,
              factorialData: factorialData,
              timestamp: new Date().toISOString(),
            });
            setMessages((prev) => {
              if (isRecalculation) {
                const costResultIndex = prev.findIndex((msg) => msg.cost_calculation_data || msg.meta === "Live");
                if (costResultIndex !== -1) {
                  return prev.map((msg, idx) =>
                    idx === costResultIndex
                      ? {
                        ...msg,
                        role: "assistant",
                        content: summary,
                        meta: "cost calculation results",
                        cost_calculation_data: event.content,
                      }
                      : msg
                  );
                }
              }

              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "cost calculation results",
                  cost_calculation_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "cost_calculation_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = isRecalculation
                ? next.findIndex((msg) => msg.cost_calculation_data || msg.meta === "Live")
                : next.length - 1;
              if (targetIndex >= 0 && !next[targetIndex].meta?.includes("results")) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "cost calculation done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        const targetIndex = isRecalculation
          ? next.findIndex((msg) => msg.cost_calculation_data || msg.meta === "Live")
          : next.length - 1;
        if (targetIndex >= 0) {
          next[targetIndex] = {
            ...next[targetIndex],
            role: "assistant",
            content: `Cost calculation error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsCostCalculating(false);
      setStreamingNote("");
    }
  };

  useEffect(() => {
    setFactorialData(externalFactorialData);
    if (externalFactorialData) {
      setMessages(prev => prev.map(msg => {
        if (msg.meta === "factorial results" || (msg.factorial_data && msg.factorial_data.table)) {
          return { ...msg, factorial_data: externalFactorialData };
        }
        return msg;
      }));
    }
  }, [externalFactorialData]);

  useEffect(() => {
    // Only auto-scroll to bottom while the pipeline is actively streaming.
    // Firing on every state change (gateActive, mapConfirmation, etc.) caused
    // the window to jump upward when stable UI panels were toggled.
    const isAnyStreaming = isStreaming || isListingStreaming || isCleaningStreaming || isFactorialStreaming || isFactorialAnalysisStreaming || isCostCalculating || isQuickEstimateStreaming;
    if (isAnyStreaming || streamingNote) {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages, streamingNote, isStreaming, isListingStreaming, isCleaningStreaming, isFactorialStreaming, isFactorialAnalysisStreaming, isCostCalculating, isQuickEstimateStreaming]);

  const clearInteractiveState = () => {
    setClarificationPrompt("");
    setClarificationFields([]);
    setClarificationValues({});
    setMapConfirmation(null);
    setApproachChoiceNeeded(null);
    setExtractionVerification(null);
    setComparableData(null);
    setSelectedComps(new Set());
    setDbNoResults(false);
    setIsComparableSearchActive(false);
    setComparableSearchStatus("");
    setSubjectData(null);
    setListingData(null);
    setDbTransactions([]);
    setCleanedData(null);
    setFactorialData(null);
    setFactorialAnalysisData(null);
    setCostInputsSchema(null);
    setCostInputsValues({});
    setCostCalculationData(null);
    setIsCostCalculating(false);
    setPipelineDone(false);
    setCurrentStage("Stage 0: Initialization");
    // Reset gate wizard
    setGateActive(false);
    setGateStep(1);
    setGateMode(null);
    setGateAllFields([]);
    setGateValues({});
    // Reset collapse states
    setGateCollapsed(false);
    setMapCollapsed(false);
    setApproachCollapsed(false);
    setCtaListingCollapsed(false);
    setCtaCleanCollapsed(false);
    setCtaFactorialCollapsed(false);
    markersRef.current = [];
    onMarkersUpdate?.([]);
    setBackupValuationState(null);
    setFetchedCompIds(new Set());
    setExecutionLogs([]);
    setProjectFetchStatuses({});
  };

  const buildQuickEstimatePayload = (sourceValues = quickEstimateValues) => {
    const numericFields = [
      "salable_area_sqft",
      "builtup_area_sqft",
      "plot_area_sqft",
      "age_of_property",
      "floor",
      "total_floors",
      "frontage",
      "clear_height",
      "construction_rate_per_sqft",
      "total_life_of_building",
    ];

    const payload = {
      ...sourceValues,
      age_years: sourceValues.age_of_property,
      construction_quality: sourceValues.quality,
      listing_type: "sale",
      area_unit: "sqft",
    };

    numericFields.forEach((field) => {
      if (payload[field] === "" || payload[field] === null || payload[field] === undefined) {
        delete payload[field];
      } else {
        payload[field] = Number(payload[field]);
      }
    });

    Object.keys(payload).forEach((key) => {
      if (payload[key] === "" || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    return payload;
  };

  const submitQuickEstimate = async () => {
    if (isQuickEstimateStreaming) return;

    const payload = buildQuickEstimatePayload();
    const propertyLabel = String(payload.property_type || "property").replaceAll("_", " ");
    const locationLabel = payload.location_name || payload.city_name || "selected location";
    const summary = `Research quick estimate for ${propertyLabel} in ${locationLabel}`;

    if (!user) {
      sessionStorage.setItem("sigmavalue_pending_query", summary);
      sessionStorage.setItem("sigmavalue_redirect", "/valuation");
      router.push("/auth");
      return;
    }
    const includeCost = payload.recommended_approach === "cost"
      && ["villa", "building_land"].includes(String(payload.property_type || "").toLowerCase());
    const startedAt = Date.now();

    onClear?.();
    clearInteractiveState();
    setMessages([
      { role: "user", content: summary, meta: "Now" },
    ]);
    setCurrentQuestion(summary);
    setOriginalQuestion(summary);
    setCurrentStage("AI Quick Estimate: Starting");
    setStreamingNote("");
    setQuickEstimateProgress({
      activeIndex: 0,
      message: "Connecting to quick estimate stream...",
      detail: {},
      done: false,
      startedAt,
    });
    setIsQuickEstimateStreaming(true);

    const updateQuickEstimateProgress = (stageName, message, detail = {}) => {
      const stages = getQuickEstimateStages(includeCost);
      let activeIndex = resolveQuickEstimateStageIndex(stageName, includeCost);
      if (stageName.endsWith("_done")) {
        activeIndex = Math.min(activeIndex + 1, stages.length - 1);
      }
      setQuickEstimateProgress((prev) => ({
        ...prev,
        activeIndex,
        message: message || prev.message,
        detail: { ...prev.detail, ...detail },
        done: stageName === "complete",
      }));
    };

    try {
      const response = await fetch(apiUrl("/quick_estimate_stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortRef?.current?.signal,
      });

      if (!response.ok || !response.body) {
        if (response.status === 402) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("sigmavalue-tokens-exhausted"));
          }
          throw new Error("Your token balance has been exhausted. Please view pricing plans to purchase a token pack.");
        }
        throw new Error(`Quick Estimate request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let resolvedCoords = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));
          onEvent?.(event);

          if (event.type === "quick_estimate_start") {
            setCurrentStage("AI Quick Estimate: Running");
            updateQuickEstimateProgress("geocoding", event.content?.message || "Starting quick estimate...");
          } else if (event.type === "quick_estimate_progress") {
            const stage = event.stage || "quick_estimate";
            const message = event.content?.message || "Quick estimate update received.";
            const detail = {};
            if (event.content?.lat && event.content?.lng) {
              resolvedCoords = {
                lat: Number(event.content.lat),
                lng: Number(event.content.lng),
              };
              detail.lat = event.content.lat;
              detail.lng = event.content.lng;
            }
            if (event.content?.count) {
              detail.count = event.content.count;
            }
            if (Array.isArray(event.content?.comparables) && event.content.comparables.length > 0) {
              detail.count = event.content.comparables.length;
              detail.comparables = event.content.comparables;
            }
            updateQuickEstimateProgress(stage, message, detail);
            setCurrentStage(`AI Quick Estimate: ${stage.replaceAll("_", " ")}`);
          } else if (event.type === "quick_estimate_validation_error") {
            const missing = event.content?.missing_fields?.join(", ") || "required fields";
            updateQuickEstimateProgress("geocoding", event.content?.message || `Missing required fields: ${missing}`);
            setIsQuickEstimateStreaming(false);
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: event.content?.message || `Missing required fields: ${missing}`,
                meta: "error",
              },
            ]);
          } else if (event.type === "quick_estimate_result") {
            const result = event.content || {};
            const analysis = {
              ...result,
              subject_final_rate: result.subject_final_rate ?? result.subject_final_plot_rate,
            };
            const resultSubject = result.subject || {};
            const subjectObj = {
              ...payload,
              ...resultSubject,
              project_name: payload.project_name || "Subject Property",
              location_name: resultSubject.location_name || payload.location_name || "",
              country: payload.country || "India",
              currency: payload.currency || "INR",
              property_type: payload.property_type || "apartment",
              recommended_approach: payload.recommended_approach || "market",
              age_years: payload.age_of_property,
              lat: result.lat || payload.lat || resolvedCoords?.lat || 0,
              lng: result.lng || payload.lng || resolvedCoords?.lng || 0,
            };
            const comparables = Array.isArray(result.comparables) ? result.comparables : [];
            const selected = new Set(comparables.map((_, index) => index));
            const valuationPayload = {
              type: subjectObj.recommended_approach || "market",
              subjectData: subjectObj,
              factorialAnalysis: analysis,
              costCalculation: result.cost_calculation_data || null,
              factorialData: null,
              timestamp: new Date().toISOString(),
            };

            setSubjectData(subjectObj);
            subjectDataRef.current = subjectObj;
            setComparableData(comparables.length > 0 ? comparables : null);
            setSelectedComps(selected);
            setFactorialAnalysisData(analysis);
            setCostCalculationData(result.cost_calculation_data || null);
            setPipelineDone(true);
            publishValuationResult(valuationPayload);
            updateQuickEstimateProgress("complete", "Quick estimate valuation complete.");
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "Quick estimate valuation is ready.",
                meta: "quick estimate result",
                factorial_analysis_data: analysis,
                cost_calculation_data: result.cost_calculation_data || null,
                sub_locality: result.sub_locality || resultSubject.sub_locality || null,
                sub_locality_list: result["sub-locality"] || resultSubject["sub-locality"] || [],
                location_details: result.location_details || resultSubject.location_details || null,
              },
            ]);
          } else if (event.type === "error") {
            setIsQuickEstimateStreaming(false);
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `AI Quick Estimate failed: ${event.content}`,
                meta: "error",
              },
            ]);
          } else if (event.type === "quick_estimate_done") {
            setCurrentStage("AI Quick Estimate: Complete");
            setQuickEstimateProgress((prev) => ({ ...prev, done: true }));
            window.setTimeout(() => setIsQuickEstimateStreaming(false), 900);
          }
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setIsQuickEstimateStreaming(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `AI Quick Estimate failed: ${error.message}`,
            meta: "error",
          },
        ]);
      }
    } finally {
      setStreamingNote("");
    }
  };

  // ── Subject-Only Listing Fetch (no comparables found anywhere) ───
  const submitUserFormEstimate = async () => {
    setShowUserFormModal(false);

    const payload = buildQuickEstimatePayload(userFormValues);

    autoVerifyFormRef.current = true;
    setSubjectData(payload);
    subjectDataRef.current = payload;

    const details = Object.entries(payload)
      .filter(([_, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => {
        const label = k.replaceAll("_", " ");
        const titleCaseLabel = label.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        return `${titleCaseLabel}: ${v}`;
      })
      .join(", ");

    const prompt = `[SYSTEM: USER_FORM_SUBMISSION] Here are the verified property details: ${details}. The user has already verified these details. Do NOT ask for extraction verification. Proceed immediately to comparable search or cost calculation.`;

    submitQuestion(prompt, false, "Submitted property details via User Form.", true);
  };

  const submitSubjectOnlyListingFetch = async () => {
    if (!subjectData || isListingStreaming) return;

    setIsListingStreaming(true);
    setStreamingNote("🔍 Searching for listings for the subject property (no comparables)...");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Continue valuation using subject-only data (no comparables).", meta: "Now" },
      { role: "assistant", content: "Searching for listings for the subject project only...", meta: "Live" },
    ]);

    try {
      const response = await fetch(apiUrl("/listing_stream"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectData,
          selected_comparables: [],          // no comparables — subject only
          property_type: subjectData.property_type || "apartment",
          listing_type: "sale",
        }),
      });

      if (!response.ok || !response.body)
        throw new Error(`Listing request failed: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          if (event.type === "listing_progress") {
            setStreamingNote(
              `🔍 ${event.content?.project || "Subject"}: ${event.content?.detail || event.content?.status || ""}`
            );
          }

          if (event.type === "listing_results") {
            const allListings = event.content?.listings || [];
            setListingData(allListings);
            setMessages((prev) => {
              const next = [...prev];
              const lastIdx = next.length - 1;
              if (lastIdx >= 0) {
                next[lastIdx] = {
                  ...next[lastIdx],
                  role: "assistant",
                  content: `✅ Found ${allListings.length} listing(s) for the subject property.`,
                  meta: "listing results",
                  listings: allListings,
                  db_transactions: [],
                };
              }
              return next;
            });
          }

          if (event.type === "error") {
            setStreamingNote(`Error: ${event.content}`);
          }
        }
      }
    } catch (error) {
      setStreamingNote(`Subject-only listing search failed: ${error.message}`);
    } finally {
      setIsListingStreaming(false);
      setStreamingNote("");
      setListingStatusNote("");
    }
  };

  // ── Toggle comparable selection ────────────────────────────────
  const handleCompToggle = (index, checked) => {
    setSelectedComps((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  // ── Restore dropped comparables into active set ────────────────
  const handleRestoreDroppedComps = (compsToRestore) => {
    if (!compsToRestore || compsToRestore.length === 0) return;

    // Clean drop metadata and assign fallback coordinates if geocoding had failed
    const cleaned = compsToRestore.map((c, idx) => {
      const { drop_stage, drop_reason, drop_detail, isDropped, ...rest } = c;

      let lat = c.map_search_lat;
      let lng = c.map_search_lng;

      // If coordinates are missing or invalid, assign fallback coordinates near subject
      if ((!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) && subjectData?.lat && subjectData?.lng) {
        const angle = (idx / compsToRestore.length) * 2 * Math.PI;
        const radius = 0.015 + (Math.random() * 0.01); // ~1.5 - 2.5 km away
        lat = Number((subjectData.lat + radius * Math.cos(angle)).toFixed(6));
        lng = Number((subjectData.lng + radius * Math.sin(angle)).toFixed(6));
      }

      const validLat = Number(lat) || subjectData?.lat || 18.5204;
      const validLng = Number(lng) || subjectData?.lng || 73.8567;

      // Recalculate exact distance from subject using Haversine
      const distanceKm = c.distance_from_subject_km ?? (
        (subjectData?.lat && subjectData?.lng)
          ? (() => {
            const R = 6371;
            const dLat = (validLat - subjectData.lat) * Math.PI / 180;
            const dLng = (validLng - subjectData.lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(subjectData.lat * Math.PI / 180) * Math.cos(validLat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
            return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
          })()
          : 2.0
      );

      return {
        ...rest,
        project_name: c.project_name || "Comparable Project",
        location: c.location || subjectData?.location_name || "Local Vicinity",
        country: c.country || subjectData?.country || "India",
        property_type: c.property_type || subjectData?.property_type || "apartment",
        project_category: c.project_category || subjectData?.project_category || "Residential",
        map_search_lat: validLat,
        map_search_lng: validLng,
        geocode_source: c.geocode_source || (c.data_source === "Internal DB" ? "internal_db" : "nominatim"),
        distance_from_subject_km: distanceKm,
        data_source: c.data_source || "Web",
        possession_status: c.possession_status || "Ready to Move",
        reason: c.reason || c.drop_reason || "Restored from dropped section",
        restored: true,
      };
    });

    const existingComps = comparableData || [];
    const startIndex = existingComps.length;
    const newIndices = cleaned.map((_, i) => startIndex + i);
    const updatedComps = [...existingComps, ...cleaned];

    // 1. Update active comparable list
    setComparableData(updatedComps);

    // 2. Auto-select the newly restored comparables for listing fetch & map display
    setSelectedComps(prevSel => {
      const next = new Set(prevSel);
      newIndices.forEach(idx => next.add(idx));
      return next;
    });

    // 3. Remove restored items from droppedComparableData
    const restoreNames = new Set(compsToRestore.map(c => (c.project_name || "").toLowerCase().trim()));
    setDroppedComparableData(prev => {
      if (!prev) return null;
      const remaining = prev.filter(c => !restoreNames.has((c.project_name || "").toLowerCase().trim()));
      return remaining.length > 0 ? remaining : null;
    });

    // 4. Update the message objects so UI state stays consistent
    setMessages(prev => {
      const next = [...prev];
      const compMsgIdx = next.findIndex(m => m.comparables || m.dropped_comparables);
      if (compMsgIdx !== -1) {
        const msg = { ...next[compMsgIdx] };
        msg.comparables = [...(msg.comparables || []), ...cleaned];
        if (msg.dropped_comparables) {
          msg.dropped_comparables = msg.dropped_comparables.filter(
            c => !restoreNames.has((c.project_name || "").toLowerCase().trim())
          );
          if (msg.dropped_comparables.length === 0) msg.dropped_comparables = null;
        }
        next[compMsgIdx] = msg;
      }
      return next;
    });
  };

  // ── Update coordinates for an active comparable ───────────────
  const handleUpdateComparableCoords = (index, newLatStr, newLngStr, isDropped = false) => {
    if (isDropped) {
      handleUpdateDroppedCoords(index, newLatStr, newLngStr);
      return;
    }
    const lat = newLatStr !== "" && !isNaN(Number(newLatStr)) ? Number(newLatStr) : null;
    const lng = newLngStr !== "" && !isNaN(Number(newLngStr)) ? Number(newLngStr) : null;

    setComparableData(prev => {
      if (!prev || !prev[index]) return prev;
      const next = [...prev];
      const comp = { ...next[index] };

      if (comp.original_map_search_lat === undefined) {
        comp.original_map_search_lat = comp.map_search_lat;
        comp.original_map_search_lng = comp.map_search_lng;
        comp.original_geocode_source = comp.geocode_source;
        comp.original_distance_from_subject_km = comp.distance_from_subject_km;
      }

      comp.map_search_lat = lat;
      comp.map_search_lng = lng;
      comp.geocode_source = "user_override";

      if (lat && lng && subjectData?.lat && subjectData?.lng) {
        const R = 6371;
        const dLat = (lat - subjectData.lat) * Math.PI / 180;
        const dLng = (lng - subjectData.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(subjectData.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        comp.distance_from_subject_km = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
      }

      next[index] = comp;

      // Update message object
      setMessages(prevMsgs => {
        const msgs = [...prevMsgs];
        const compMsgIdx = msgs.findIndex(m => m.comparables);
        if (compMsgIdx !== -1) {
          const msg = { ...msgs[compMsgIdx] };
          msg.comparables = [...next];
          msgs[compMsgIdx] = msg;
        }
        return msgs;
      });

      return next;
    });
  };

  // ── Reset coordinates for an active comparable ───────────────
  const handleResetComparableCoords = (index, isDropped = false) => {
    if (isDropped) {
      handleResetDroppedCoords(index);
      return;
    }
    setComparableData(prev => {
      if (!prev || !prev[index]) return prev;
      const next = [...prev];
      const comp = { ...next[index] };

      if (comp.original_map_search_lat !== undefined) {
        comp.map_search_lat = comp.original_map_search_lat;
        comp.map_search_lng = comp.original_map_search_lng;
        comp.geocode_source = comp.original_geocode_source;
        comp.distance_from_subject_km = comp.original_distance_from_subject_km;
        delete comp.original_map_search_lat;
        delete comp.original_map_search_lng;
        delete comp.original_geocode_source;
        delete comp.original_distance_from_subject_km;
      } else {
        comp.geocode_source = comp.data_source === "Internal DB" ? "internal_db" : null;
      }

      next[index] = comp;

      setMessages(prevMsgs => {
        const msgs = [...prevMsgs];
        const compMsgIdx = msgs.findIndex(m => m.comparables);
        if (compMsgIdx !== -1) {
          const msg = { ...msgs[compMsgIdx] };
          msg.comparables = [...next];
          msgs[compMsgIdx] = msg;
        }
        return msgs;
      });

      return next;
    });
  };

  // ── Update coordinates for a dropped comparable ────────────────
  const handleUpdateDroppedCoords = (index, newLatStr, newLngStr) => {
    const lat = newLatStr !== "" && !isNaN(Number(newLatStr)) ? Number(newLatStr) : null;
    const lng = newLngStr !== "" && !isNaN(Number(newLngStr)) ? Number(newLngStr) : null;

    setDroppedComparableData(prev => {
      if (!prev || !prev[index]) return prev;
      const next = [...prev];
      const comp = { ...next[index] };

      if (comp.original_map_search_lat === undefined) {
        comp.original_map_search_lat = comp.map_search_lat;
        comp.original_map_search_lng = comp.map_search_lng;
        comp.original_geocode_source = comp.geocode_source;
        comp.original_distance_from_subject_km = comp.distance_from_subject_km;
      }

      comp.map_search_lat = lat;
      comp.map_search_lng = lng;
      comp.geocode_source = "user_override";

      if (lat && lng && subjectData?.lat && subjectData?.lng) {
        const R = 6371;
        const dLat = (lat - subjectData.lat) * Math.PI / 180;
        const dLng = (lng - subjectData.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(subjectData.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        comp.distance_from_subject_km = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
      }

      next[index] = comp;

      // Update message object
      setMessages(prevMsgs => {
        const msgs = [...prevMsgs];
        const compMsgIdx = msgs.findIndex(m => m.dropped_comparables);
        if (compMsgIdx !== -1) {
          const msg = { ...msgs[compMsgIdx] };
          msg.dropped_comparables = [...next];
          msgs[compMsgIdx] = msg;
        }
        return msgs;
      });

      return next;
    });
  };

  // ── Reset coordinates for a dropped comparable ────────────────
  const handleResetDroppedCoords = (index) => {
    setDroppedComparableData(prev => {
      if (!prev || !prev[index]) return prev;
      const next = [...prev];
      const comp = { ...next[index] };

      if (comp.original_map_search_lat !== undefined) {
        comp.map_search_lat = comp.original_map_search_lat;
        comp.map_search_lng = comp.original_map_search_lng;
        comp.geocode_source = comp.original_geocode_source;
        comp.distance_from_subject_km = comp.original_distance_from_subject_km;
        delete comp.original_map_search_lat;
        delete comp.original_map_search_lng;
        delete comp.original_geocode_source;
        delete comp.original_distance_from_subject_km;
      } else {
        comp.geocode_source = null;
      }

      next[index] = comp;

      setMessages(prevMsgs => {
        const msgs = [...prevMsgs];
        const compMsgIdx = msgs.findIndex(m => m.dropped_comparables);
        if (compMsgIdx !== -1) {
          const msg = { ...msgs[compMsgIdx] };
          msg.dropped_comparables = [...next];
          msgs[compMsgIdx] = msg;
        }
        return msgs;
      });

      return next;
    });
  };

  // ── Synchronize markers when state changes ────────────────────
  useEffect(() => {
    let allMarkers = [];

    // 1. Subject from subjectData
    if (subjectData?.lat && subjectData?.lng) {
      allMarkers.push({
        lat: subjectData.lat,
        lng: subjectData.lng,
        label: subjectData.project_name || "Subject",
        source: "subject"
      });
    }

    // 2. Comparables from comparableData
    if (comparableData) {
      const toolMarkers = comparableData
        .filter((c, index) => selectedComps.has(index))
        .filter(c => c.map_search_lat && c.map_search_lng && !isNaN(Number(c.map_search_lat)))
        .map(c => ({
          lat: Number(c.map_search_lat),
          lng: Number(c.map_search_lng),
          label: c.project_name || "Comparable",
          source: "comparable",
          data_source: c.data_source || "Web"
        }));

      // Deduplicate comparables by label (project name), prioritizing Web source coordinate
      const seen = new Map();
      for (const m of toolMarkers) {
        const name = (m.label || "").toLowerCase().trim();
        const existing = seen.get(name);
        if (!existing) {
          seen.set(name, m);
        } else {
          const currentIsWeb = String(m.data_source).toLowerCase() === "web";
          const existingIsWeb = String(existing.data_source).toLowerCase() === "web";
          if (currentIsWeb && !existingIsWeb) {
            seen.set(name, m);
          }
        }
      }
      allMarkers = [...allMarkers, ...Array.from(seen.values())];
    }

    // 3. Dropped comparables with valid coordinates
    if (droppedComparableData) {
      droppedComparableData.forEach(c => {
        if (c.map_search_lat && c.map_search_lng && !isNaN(Number(c.map_search_lat)) && !isNaN(Number(c.map_search_lng))) {
          const name = (c.project_name || "").toLowerCase().trim();
          const alreadyMapped = allMarkers.some(m => (m.label || "").toLowerCase().trim() === name);
          if (!alreadyMapped) {
            allMarkers.push({
              lat: Number(c.map_search_lat),
              lng: Number(c.map_search_lng),
              label: `${c.project_name || "Comparable"} (Dropped)`,
              source: "dropped",
              data_source: "Dropped"
            });
          }
        }
      });
    }

    markersRef.current = allMarkers;
    onMarkersUpdate?.(allMarkers);
  }, [subjectData, comparableData, selectedComps, droppedComparableData, factorialData]);

  // ── Go Back to Comparable Selection (Step 2) ──────────────────
  const handleBackToComparables = () => {
    // Save current state as backup so user can revert/cancel this action
    setBackupValuationState({
      messages: [...messages],
      listingData,
      dbTransactions,
      cleanedData,
      factorialData,
      factorialAnalysisData,
      costCalculationData,
      selectedComps: new Set(selectedComps),
      events: events ? [...events] : [],
    });

    setListingData(null);
    setDbTransactions([]);
    setCleanedData(null);
    setFactorialData(null);
    setFactorialAnalysisData(null);
    setCostCalculationData(null);
    // Keep selected comps so they remain selected by default in the selection table/map

    // Truncate chat messages after the comparable results message
    setMessages((prev) => {
      const compResultsIdx = prev.findIndex((m) => m.meta === "comparable results" || m.comparables);
      if (compResultsIdx !== -1) {
        return prev.slice(0, compResultsIdx + 1);
      }
      return prev;
    });

    // Pipeline sync and visual feedback
    onEventsReset?.("comparable_results");
    setValuationResult(null);
    onValuationResult?.(null);
    setRevertNotice("⏪ Pipeline rewound to comparable selection");
  };

  const handleCancelModification = () => {
    if (!backupValuationState) return;

    const {
      messages: backupMessages,
      listingData: backupListingData,
      dbTransactions: backupDbTransactions,
      cleanedData: backupCleanedData,
      factorialData: backupFactorialData,
      factorialAnalysisData: backupFactorialAnalysisData,
      costCalculationData: backupCostCalculationData,
      selectedComps: backupSelectedComps,
      events: backupEvents,
    } = backupValuationState;

    setMessages(backupMessages);
    setListingData(backupListingData);
    setDbTransactions(backupDbTransactions);
    setCleanedData(backupCleanedData);
    setFactorialData(backupFactorialData);
    setFactorialAnalysisData(backupFactorialAnalysisData);
    setCostCalculationData(backupCostCalculationData);
    setSelectedComps(backupSelectedComps);

    if (setEvents && backupEvents) {
      setEvents(backupEvents);
    }

    // Reconstruct and restore valuationResult
    if (backupFactorialAnalysisData) {
      publishValuationResult({
        type: subjectData?.recommended_approach === "cost" ? "cost" : "market",
        factorialAnalysis: backupFactorialAnalysisData,
        subjectData: subjectDataRef.current || subjectData,
        factorialData: backupFactorialData,
        costCalculation: backupCostCalculationData,
        timestamp: new Date().toISOString(),
      });
    }

    setBackupValuationState(null);
    setRevertNotice("🔄 Modification cancelled, previous valuation restored");
  };

  // ── Edit Past Profiling Inputs (Stage 1 / 2) ───────────────────
  const handleEditPropertyDetails = () => {
    const activeType = (subjectData?.property_type || "").toLowerCase().trim();

    // Construct identity, type, approach, and detail fields matching current property type
    const identityFields = [
      ...(activeType !== "plot" ? [{ field: "project_name", label: "Project Name", type: "text", required: false }] : []),
      { field: "location_name", label: "Location / Locality", type: "text", required: true },
      { field: "city_name", label: "City Name", type: "text", required: false },
      { field: "country", label: "Country", type: "text", required: false },
    ];
    const typeFields = [
      {
        field: "property_type", label: "Property Type", type: "select", options: [
          { value: "apartment", label: "Apartment / Flat" },
          { value: "villa", label: "Villa" },
          { value: "plot", label: "Plot / Land" },
          { value: "retail", label: "Retail / Shop" },
          { value: "commercial_office", label: "Commercial Office" },
          { value: "building_land", label: "Building + Land" },
        ]
      },
      ...(activeType === "building_land" ? [
        {
          field: "building_type", label: "Building Type", type: "select", options: [
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" },
            { value: "industrial", label: "Industrial" }
          ]
        }
      ] : [])
    ];
    const approachFields = activeType === "villa" ? [
      {
        field: "recommended_approach", label: "Valuation Approach", type: "select", options: [
          { value: "market", label: "Market Approach" },
          { value: "cost", label: "Cost Approach" },
        ]
      }
    ] : [];

    let detailFields = [];
    if (activeType === "apartment") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
      ];
    } else if (activeType === "villa" || activeType === "building_land") {
      detailFields = [
        { field: "plot_area_sqft", label: "Plot Area (sqft)", type: "number" },
        ...(formatSublocalities(subjectData || extractionVerification?.entities) ? [{ field: "sub-locality", label: "Sub-locality", type: "text", required: false, readOnly: true }] : []),
        { field: "builtup_area_sqft", label: "Built-up Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
      ];
    } else if (activeType === "plot") {
      detailFields = [
        { field: "plot_area_sqft", label: "Plot Area (sqft)", type: "number" },
        ...(formatSublocalities(subjectData || extractionVerification?.entities) ? [{ field: "sub-locality", label: "Sub-locality", type: "text", required: false, readOnly: true }] : []),
        {
          field: "land_type", label: "Land Type", type: "select", options: [
            { value: "agricultural", label: "Agricultural" },
            { value: "non_agricultural", label: "Non Agricultural" },
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" }
          ]
        },
      ];
    } else if (activeType === "retail") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "frontage", label: "Road Frontage (ft)", type: "number" },
      ];
    } else if (activeType === "commercial_office") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        {
          field: "occupancy_status", label: "Occupancy Status", type: "select", options: [
            { value: "vacant", label: "Vacant" },
            { value: "leased", label: "Leased" },
            { value: "self_use", label: "Self Use" }
          ]
        },
      ];
    } else {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
      ];
    }

    const allFields = [...identityFields, ...typeFields, ...approachFields, ...detailFields];
    const initialVals = buildGateInitialValues(allFields, subjectData, mapConfirmation);

    setGateAllFields(allFields);
    setGateValues(initialVals);
    setGateMode('verification'); // lets user edit and verify
    setGateStep(5); // start directly at Gate 5 Review step for convenience
    setGateActive(true);
  };

  // ── Recalculate Cost Value (Client-side Math for Realtime Updates) ──
  const recalculateCostValue = (derivedRate, subject, costInputs) => {
    const plotArea = Number(subject?.plot_area_sqft || 0);
    const builtupArea = Number(subject?.builtup_area_sqft || 0);
    const age = Number(subject?.age_years || 0);
    const constRate = Number(costInputs.construction_rate_per_sqft || 0);
    const totalLife = Number(costInputs.total_life_of_building || 60);
    const sym = getCurrencySymbol(subject?.currency);

    const landValue = derivedRate * plotArea;
    const constructionCost = constRate * builtupArea;
    const depreciationRate = Math.min(age / totalLife, 1.0);
    const depreciatedBuilding = constructionCost * (1.0 - depreciationRate);
    const costValue = landValue + depreciatedBuilding;

    return {
      success: true,
      property_type: subject?.property_type || "villa",
      inputs: {
        derived_plot_rate_per_sqft: derivedRate,
        plot_area_sqft: plotArea,
        builtup_area_sqft: builtupArea,
        construction_rate_per_sqft: constRate,
        age_of_property: age,
        total_life_of_building: totalLife,
      },
      calculations: {
        land_value: landValue,
        construction_cost: constructionCost,
        depreciation_rate_pct: depreciationRate * 100,
        depreciated_building_value: depreciatedBuilding,
      },
      result: {
        cost_value: costValue,
      },
      formula_audit: {
        step_1: `Land Value = ${derivedRate} ${sym}/sqft × ${plotArea} sqft (Plot Area) = ${sym}${Math.round(landValue).toLocaleString()}`,
        step_2: `Replacement Construction Cost = ${constRate} ${sym}/sqft × ${builtupArea} sqft (Built-up Area) = ${sym}${Math.round(constructionCost).toLocaleString()}`,
        step_3: `Depreciation = ${age} yrs / ${totalLife} yrs = ${(depreciationRate * 100).toFixed(2)}%`,
        step_4: `Depreciated Building Value = ${sym}${Math.round(constructionCost).toLocaleString()} × (100% − ${(depreciationRate * 100).toFixed(2)}%) = ${sym}${Math.round(depreciatedBuilding).toLocaleString()}`,
        step_5: `Cost Value = ${sym}${Math.round(landValue).toLocaleString()} (Land) + ${sym}${Math.round(depreciatedBuilding).toLocaleString()} (Building) = ${sym}${Math.round(costValue).toLocaleString()}`,
      }
    };
  };

  // ── Area/Age-Only Fast Recalculation (skip full pipeline re-run) ──────────
  // Called from gateSubmitFinal when user edited Stage 1 but only changed area or age.
  // Performs a client-side value update without any API calls.
  const AREA_AGE_FIELDS = new Set([
    "salable_area_sqft", "carpet_area_sqft", "builtup_area_sqft",
    "plot_area_sqft", "age_years",
  ]);

  const applyAreaAgeRecalculation = (updatedSubjectData, changedFields) => {
    // Persist updated subject data
    setSubjectData(updatedSubjectData);
    subjectDataRef.current = updatedSubjectData;

    const approach = updatedSubjectData.recommended_approach || "market";
    const sym = getCurrencySymbol(updatedSubjectData.currency);

    let newFactorialAnalysis = factorialAnalysisData ? { ...factorialAnalysisData } : null;
    let newCostCalc = costCalculationData;

    if (approach === "cost" && factorialAnalysisData && costInputsValues) {
      // Recalculate cost approach: land value + depreciated building
      const derivedRate = factorialAnalysisData.subject_final_rate || 0;
      newCostCalc = recalculateCostValue(derivedRate, updatedSubjectData, costInputsValues);
      setCostCalculationData(newCostCalc);

      // Stamp updated cost result into the relevant chat message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.cost_calculation_data ? { ...msg, cost_calculation_data: newCostCalc } : msg
        )
      );
    } else if (approach !== "cost" && factorialAnalysisData) {
      // Market approach: new market value = final_rate × new_area
      const finalRate = Number(factorialAnalysisData.subject_final_rate || 0);
      const newArea = Number(
        updatedSubjectData.salable_area_sqft ||
        updatedSubjectData.carpet_area_sqft ||
        updatedSubjectData.builtup_area_sqft ||
        0
      );
      const newMarketValue = Math.round(finalRate * newArea);
      newFactorialAnalysis = {
        ...factorialAnalysisData,
        market_value: newMarketValue,
        market_value_computed: true,
        subject_area_used: newArea,
      };
      setFactorialAnalysisData(newFactorialAnalysis);

      // Stamp updated analysis into the relevant chat message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.factorial_analysis_data
            ? { ...msg, factorial_analysis_data: newFactorialAnalysis }
            : msg
        )
      );
    }

    // Build a readable change summary
    const changeLabels = changedFields.map((f) => {
      const val = updatedSubjectData[f];
      if (f === "age_years") return `Age: ${val} yrs`;
      if (f.includes("area")) return `${f.replace(/_/g, " ").replace(/sqft/, "sqft")}: ${val}`;
      return `${f}: ${val}`;
    });

    const summaryMsg = `⚡ Quick update applied — ${changeLabels.join(", ")}. Valuation recalculated instantly without re-running the pipeline.`;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Updated: ${changeLabels.join(", ")}`, meta: "Now" },
      { role: "assistant", content: summaryMsg, meta: "Instant Update" },
    ]);

    // Emit a synthetic event to the workflow/execution panel
    onEvent?.({
      type: "area_age_recalc",
      content: {
        changed_fields: changedFields,
        updated_subject: updatedSubjectData,
        approach,
        new_market_value: approach !== "cost" ? newFactorialAnalysis?.market_value : null,
        new_cost_value: approach === "cost" ? newCostCalc?.result?.cost_value : null,
      },
    });

    // Notify parent with updated valuation result
    publishValuationResult({
      type: approach === "cost" ? "cost" : "market",
      factorialAnalysis: newFactorialAnalysis,
      subjectData: updatedSubjectData,
      factorialData: factorialData,
      costCalculation: newCostCalc,
      timestamp: new Date().toISOString(),
    });

    setRevertNotice(`⚡ Instant recalc — ${changeLabels.join(", ")} updated`);
  };

  // ── Handle Custom Override Factoring Updates ─────────────────
  const handleUpdateFactoringData = (updatedData) => {
    setFactorialAnalysisData(updatedData);
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.factorial_analysis_data) {
          return { ...msg, factorial_analysis_data: updatedData };
        }
        return msg;
      })
    );

    // If Cost Approach has already been executed, also recalculate cost approach details locally
    let updatedCost = costCalculationData;
    if (costCalculationData && subjectData?.recommended_approach === "cost") {
      updatedCost = recalculateCostValue(
        updatedData.subject_final_rate,
        subjectData,
        costInputsValues
      );
      setCostCalculationData(updatedCost);
    }

    publishValuationResult({
      type: subjectData?.recommended_approach === "cost" ? "cost" : "market",
      factorialAnalysis: updatedData,
      subjectData: subjectDataRef.current || subjectData,
      factorialData: factorialData,
      costCalculation: updatedCost,
      timestamp: new Date().toISOString(),
    });
  };

  // ── Proceed to Listing Fetch (Step 2) ──────────────────────────
  const submitListingFetch = async () => {
    if (!comparableData || selectedComps.size === 0 || !subjectData || isListingStreaming) return;

    minimizeGate();
    setCtaListingCollapsed(true);
    const selected = Array.from(selectedComps).map((i) => comparableData[i]);

    // ── Incremental Fetch: skip comps already fetched ──────────────────────────
    // Build a stable ID for each comparable (project_id > id > project_name)
    const getCompId = (c) => String(c.project_id || c.id || c.project_name || "").trim();

    const newComps = selected.filter(c => !fetchedCompIds.has(getCompId(c)));
    const skipComps = selected.filter(c => fetchedCompIds.has(getCompId(c)));

    const isIncremental = skipComps.length > 0;

    console.log("submitListingFetch starts:", {
      selected: selected.map(c => ({ name: c.project_name, source: c.data_source, id: getCompId(c) })),
      fetchedCompIds: Array.from(fetchedCompIds),
      newComps: newComps.map(c => c.project_name),
      skipComps: skipComps.map(c => c.project_name),
      isIncremental,
    });

    // Build stable sets for filtering previously fetched data to carry over
    const selectedProjectNames = new Set(
      selected.map(c => String(c.project_name || "").trim().toLowerCase())
    );
    const selectedProjectIds = new Set(
      selected.map(c => String(c.project_id || c.id || "").trim().toLowerCase()).filter(Boolean)
    );
    const subjectProjectName = String(subjectData?.project_name || "").trim().toLowerCase();

    // Split new comps by source
    const dbComps = newComps.filter(c => (c.data_source || "Web") === "Internal DB");
    const webComps = newComps.filter(c => (c.data_source || "Web") !== "Internal DB");

    // If subject project exists in internal DB, also fetch its transactions (first time only)
    const subjectDbProject = subjectData?.subject_db_project || null;
    const shouldFetchSubjectTx = subjectDbProject && !fetchedCompIds.has("__subject__");
    const shouldFetchWebListings = webComps.length > 0 || !fetchedCompIds.has("__subject_web__");
    const subjectDisplayName = `Subject Project (${subjectData?.project_name || "Subject"})`;

    // Filter previous records from backup state
    const isPrevListingToKeep = (lst) => {
      if (!lst) return false;
      const lstProj = String(lst.project_name || lst.cleaned_match_project || "").trim().toLowerCase();
      const lstProjId = String(lst.project_id || lst.cleaned_match_id || "").trim().toLowerCase();
      if (lst.is_subject || lstProj === subjectProjectName) {
        return true;
      }
      if (selectedProjectNames.has(lstProj)) {
        return true;
      }
      if (lstProjId && selectedProjectIds.has(lstProjId)) {
        return true;
      }
      return false;
    };

    const isPrevTxToKeep = (tx) => {
      if (!tx) return false;
      const txProj = String(tx.project_name || tx.cleaned_match_project || "").trim().toLowerCase();
      const txProjId = String(tx.project_id || tx.cleaned_match_id || "").trim().toLowerCase();
      if (tx.is_subject || txProj === subjectProjectName) {
        return !shouldFetchSubjectTx;
      }
      if (selectedProjectNames.has(txProj)) {
        return true;
      }
      if (txProjId && selectedProjectIds.has(txProjId)) {
        return true;
      }
      return false;
    };

    const activePreviousListings = (backupValuationState?.listingData || []).filter(isPrevListingToKeep);
    const activePreviousDbTransactions = (backupValuationState?.dbTransactions || []).filter(isPrevTxToKeep);

    setBackupValuationState(null);
    setListingData(activePreviousListings);
    setDbTransactions(activePreviousDbTransactions);

    // If nothing new to fetch, nothing to do
    if (newComps.length === 0 && !shouldFetchSubjectTx && !shouldFetchWebListings) {
      setRevertNotice("⏩ All selected comparables already fetched — nothing new to process");
      return;
    }

    setIsListingStreaming(true);
    const initMsg = isIncremental
      ? `⏩ Skipping ${skipComps.length} already-fetched comparable(s). Fetching ${newComps.length} new one(s)...`
      : "Starting listing fetch pipeline...";
    setStreamingNote(initMsg);
    setListingStatusNote(initMsg);
    addLog(initMsg);
    setCurrentStage("Stage 3: Market Approach (Listing Fetch)");
    // Initialise per-project statuses
    const allFetchProjects = [
      ...(shouldFetchSubjectTx ? [{ name: "db:__subject__", type: "db" }] : []),
      ...dbComps.map(c => ({ name: `db:${c.project_name}`, type: "db" })),
      ...(shouldFetchWebListings ? [{ name: "web:__subject__", type: "web" }] : []),
      ...webComps.map(c => ({ name: `web:${c.project_name}`, type: "web" })),
    ];
    setProjectFetchStatuses(Object.fromEntries(allFetchProjects.map(p => [p.name, "pending"])));

    const totalDbFetches = dbComps.length + (shouldFetchSubjectTx ? 1 : 0);
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: isIncremental
          ? `Adding ${newComps.length} new comparable(s). Skipping ${skipComps.length} already fetched (${skipComps.map(c => c.project_name).join(", ")}).`
          : `Proceed with ${selected.length} selected comparable(s) — ${totalDbFetches} from Transaction DB, ${webComps.length} from Web.`,
        meta: "Now",
      },
      // Placeholder assistant message — DB/web results will be stamped here so
      // the Market Signal table always appears in the dark-card assistant bubble.
      {
        role: "assistant",
        content: "Running listing pipeline...",
        meta: "Live",
      },
    ]);

    try {
      // ── 1. Fetch transactions for each Internal DB comparable in parallel ──
      const fetchProjectTransactions = async (comp, isSubject = false) => {
        const projId = comp.project_id || comp.id || comp.project_name;
        const propType = comp.property_type || subjectData.property_type || "apartment";
        if (!projId) return [];
        const statusName = isSubject ? subjectDisplayName : comp.project_name;
        const statusKey = isSubject ? "db:__subject__" : `db:${comp.project_name}`;

        setStreamingNote(`🗄️ Searching transaction database for "${statusName}"...`);
        addLog(`Searching transaction database for "${statusName}"...`, "info");
        setProjectFetchStatuses(prev => ({ ...prev, [statusKey]: "fetching" }));
        const projectTx = [];
        try {
          const res = await fetch(apiUrl("/transaction_stream"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: String(projId),
              property_type: propType,
              project_name: comp.project_name || "",
            }),
          });
          if (!res.ok || !res.body) return [];

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const chunks = buf.split("\n\n");
            buf = chunks.pop() || "";
            for (const chunk of chunks) {
              if (!chunk.startsWith("data: ")) continue;
              const ev = JSON.parse(chunk.slice(6));
              onEvent?.(ev);
              if (ev.type === "transaction_results") {
                const txs = ev.content?.transactions || [];
                const mapped = isSubject ? txs.map(t => ({ ...t, is_subject: true })) : txs;
                projectTx.push(...mapped);
                if (mapped.length > 0) {
                  setDbTransactions(prev => {
                    const nextTx = [...prev, ...mapped];
                    setMessages(prevMsgs => {
                      const nextMsgs = [...prevMsgs];
                      // Target the assistant placeholder (last assistant message),
                      // never the user bubble — so the table always appears with the dark-card style.
                      const assistantIdx = nextMsgs.findLastIndex((m) => m.role === "assistant");
                      const targetIdx = assistantIdx !== -1 ? assistantIdx : nextMsgs.length - 1;
                      if (targetIdx >= 0) {
                        nextMsgs[targetIdx] = {
                          ...nextMsgs[targetIdx],
                          db_transactions: nextTx,
                        };
                      }
                      return nextMsgs;
                    });
                    return nextTx;
                  });
                }
                const txCount = ev.content?.total || 0;
                setStreamingNote(`✅ DB search complete for "${statusName}" (${txCount} transaction(s))`);
                addLog(`DB search complete for "${statusName}" (${txCount} transaction(s))`, txCount > 0 ? "success" : "warn");
                setProjectFetchStatuses(prev => ({ ...prev, [statusKey]: txCount > 0 ? "done" : "error" }));
              }
            }
          }
        } catch (e) {
          console.warn("DB transaction fetch failed for", comp.project_name, e);
          setProjectFetchStatuses(prev => ({ ...prev, [statusKey]: "error" }));
        }
        return projectTx;
      };

      const fetchWebListings = async () => {
        const webFetchNote = webComps.length > 0
          ? `🌐 Searching web listings for Subject Project & ${webComps.length} web comparable(s)...`
          : `🌐 Searching web listings for Subject Project...`;
        setStreamingNote(webFetchNote);
        addLog(webFetchNote, "info");

        setProjectFetchStatuses(prev => {
          const next = { ...prev };
          if (shouldFetchWebListings) {
            next["web:__subject__"] = "fetching";
          }
          webComps.forEach(c => {
            next[`web:${c.project_name}`] = "fetching";
          });
          return next;
        });

        try {
          const response = await fetch(apiUrl("/listing_stream"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: subjectData,
              selected_comparables: webComps,
              property_type: subjectData.property_type || "apartment",
            }),
          });

          if (!response.ok || !response.body) return [];

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let listings = [];

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
              if (!chunk.startsWith("data: ")) continue;
              const event = JSON.parse(chunk.slice(6));
              onEvent?.(event);
              const summary = summarizeEvent(event);
              setStreamingNote(summary);

              if (event.type === "listing_progress") {
                const p = event.content;
                if (p && p.project && p.status === "scraped") {
                  const isSubj = String(p.project).toLowerCase().trim() === subjectProjectName;
                  const key = isSubj ? "web:__subject__" : `web:${p.project}`;
                  setProjectFetchStatuses(prev => ({
                    ...prev,
                    [key]: "done"
                  }));
                }
              }

              if (event.type === "listing_results") {
                listings = event.content?.listings || [];
                const newUsage = event.content?.token_usage || {};
                const total = newUsage.total_tokens || 0;
                const model = newUsage.model || "gpt-4o-mini";
                // Filter out subject listings from the fresh stream results only if they are already in the backup listings
                const hasPreviousSubjectListing = activePreviousListings.some(l =>
                  l && (l.is_subject || String(l.project_name || l.cleaned_match_project || "").trim().toLowerCase() === subjectProjectName)
                );
                const freshListings = hasPreviousSubjectListing
                  ? listings.filter(l => {
                    if (!l) return false;
                    const lProj = String(l.project_name || l.cleaned_match_project || "").trim().toLowerCase();
                    return !(l.is_subject || lProj === subjectProjectName);
                  })
                  : listings;
                // Merge with existing listingData (incremental addition)
                const mergedListings = isIncremental
                  ? [...activePreviousListings, ...freshListings]
                  : listings;
                setListingData(mergedListings);
                setTokenStats((prev) => {
                  const nextModelBreakdown = { ...prev.model_breakdown };
                  const currentModelStats = nextModelBreakdown[model] || { prompt: 0, completion: 0, total: 0 };

                  const promptDiff = (newUsage.prompt_tokens || 0);
                  const completionDiff = (newUsage.completion_tokens || 0);

                  nextModelBreakdown[model] = {
                    prompt: currentModelStats.prompt + promptDiff,
                    completion: currentModelStats.completion + completionDiff,
                    total: currentModelStats.total + total
                  };

                  const nextStageBreakdown = { ...prev.stage_breakdown };
                  const stageName = "Listing Search";
                  const currentStageStats = nextStageBreakdown[stageName] || { prompt: 0, completion: 0, total: 0 };
                  nextStageBreakdown[stageName] = {
                    prompt: currentStageStats.prompt + promptDiff,
                    completion: currentStageStats.completion + completionDiff,
                    total: currentStageStats.total + total
                  };

                  const addedCost = getModelCost(model, promptDiff, completionDiff);

                  return {
                    ...prev,
                    total_tokens: prev.total_tokens + total,
                    model_breakdown: nextModelBreakdown,
                    stage_breakdown: nextStageBreakdown,
                    cost_usd: (prev.cost_usd || 0) + addedCost
                  };
                });
                setMessages((prev) => {
                  const next = [...prev];
                  // 1st priority: find the "Live" placeholder created for listing pipeline
                  let targetIndex = next.findLastIndex((m) => m.meta === "Live" && String(m.content || "").startsWith("Running listing pipeline"));
                  // 2nd priority: find the most recent message that already has db_transactions
                  //   stamped on it (DB fetch ran in parallel and completed first) — merge into it
                  //   so we don't push a second Market Signal table.
                  if (targetIndex === -1) {
                    targetIndex = next.findLastIndex((m) => m.db_transactions && m.db_transactions.length >= 0);
                  }
                  // 3rd priority: use the last assistant message in the list
                  if (targetIndex === -1) {
                    targetIndex = next.length - 1;
                  }
                  const payload = {
                    role: "assistant",
                    content: summary,
                    meta: "listing results",
                    listings: mergedListings,
                    db_transactions: next[targetIndex]?.db_transactions || [],
                  };
                  if (targetIndex !== -1) {
                    next[targetIndex] = {
                      ...next[targetIndex],
                      ...payload,
                    };
                  } else {
                    next.push(payload);
                  }
                  return next;
                });

                // Mark all web fetch statuses as done
                setProjectFetchStatuses(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(k => {
                    if (k.startsWith("web:") && (next[k] === "fetching" || next[k] === "pending")) {
                      next[k] = "done";
                    }
                  });
                  return next;
                });
              }

              if (event.type === "listing_done" || event.type === "error") {
                setMessages((prev) => {
                  const next = [...prev];
                  const targetIndex = next.findLastIndex((m) => m.meta === "listing results");
                  if (targetIndex !== -1) {
                    next[targetIndex] = {
                      ...next[targetIndex],
                      role: "assistant",
                      content: event.type === "error" ? summary : "",
                      meta: event.type === "error" ? "error" : "listing done",
                    };
                  }
                  return next;
                });
                if (event.type === "error") {
                  setProjectFetchStatuses(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(k => {
                      if (k.startsWith("web:") && next[k] === "fetching") {
                        next[k] = "error";
                      }
                    });
                    return next;
                  });
                }
              }
            }
          }
          return listings;
        } catch (error) {
          console.warn("Web listing fetch failed", error);
          setProjectFetchStatuses(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => {
              if (k.startsWith("web:") && next[k] === "fetching") {
                next[k] = "error";
              }
            });
            return next;
          });
          throw error;
        }
      };

      const fetchPromises = [];
      for (const comp of dbComps) {
        fetchPromises.push(fetchProjectTransactions(comp, false));
      }
      if (shouldFetchSubjectTx) {
        fetchPromises.push(fetchProjectTransactions(subjectDbProject, true));
      }

      // Execute all DB fetches and Web listings fetch concurrently in parallel
      let dbResults = [];
      if (shouldFetchWebListings) {
        const [dbRes, _] = await Promise.all([
          Promise.all(fetchPromises),
          fetchWebListings()
        ]);
        dbResults = dbRes;
      } else {
        // No web listings to fetch. Use active previous listings as is, and just fetch DB transactions
        setListingData(activePreviousListings);
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0) {
            next[lastIndex] = {
              ...next[lastIndex],
              role: "assistant",
              content: "⏩ Listings carried over from previous run.",
              meta: "listing done",
              listings: activePreviousListings,
            };
          }
          return next;
        });
        dbResults = await Promise.all(fetchPromises);
      }

      const newDbTransactions = dbResults.flat();

      // ── No-evidence guard: if BOTH web listings AND DB transactions are empty, show a clear error ──
      const finalWebListings = listingData || [];
      if (finalWebListings.length === 0 && newDbTransactions.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "No market evidence was found for the selected property. We are unable to generate a reliable valuation using the Sales Comparison Approach. Please verify the property details or expand the search criteria and try again.",
            meta: "error",
          },
        ]);
      }

      // Merge new DB transactions with existing ones (incremental case)
      const mergedDbTransactions = isIncremental
        ? [...activePreviousDbTransactions, ...newDbTransactions]
        : newDbTransactions;

      // Store merged DB transactions and stamp on the message
      if (mergedDbTransactions.length > 0) {
        setDbTransactions(mergedDbTransactions);
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0) {
            next[lastIndex] = {
              ...next[lastIndex],
              db_transactions: mergedDbTransactions,
            };
          }
          return next;
        });
      }

      // Mark newly fetched comp IDs so they won't be re-fetched next time
      setFetchedCompIds((prev) => {
        const next = new Set(prev);
        newComps.forEach(c => next.add(getCompId(c)));
        if (shouldFetchSubjectTx) next.add("__subject__");
        if (shouldFetchWebListings) next.add("__subject_web__");
        return next;
      });

      // Emit synthetic event to workflow panel for incremental fetch
      if (isIncremental) {
        onEvent?.({
          type: "incremental_listing",
          content: {
            new_count: newComps.length,
            skipped_count: skipComps.length,
            skipped_names: skipComps.map(c => c.project_name),
          },
        });
      }

    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = { ...next[next.length - 1], role: "assistant", content: `Listing fetch error: ${error.message}`, meta: "Error" };
        }
        return next;
      });
    } finally {
      setIsListingStreaming(false);
      setStreamingNote("");
    }
  };

  // ── Proceed to Data Cleaning (Step 3) ──────────────────────────
  const submitCleaning = async () => {
    // Trigger if we have web listings OR db transactions (or both)
    const hasWebListings = listingData && listingData.length > 0;
    const hasDbTx = dbTransactions && dbTransactions.length > 0;
    if ((!hasWebListings && !hasDbTx) || !subjectData || isCleaningStreaming) return;

    const selected = Array.from(selectedComps).map((i) => comparableData[i]);
    const webCount = (listingData || []).length;
    const dbCount = dbTransactions.length;

    setIsCleaningStreaming(true);
    pendingCleaningResultRef.current = null;
    setStreamingNote("Starting data cleaning pipeline...");
    setCleaningStatusNote("Starting data cleaning pipeline...");
    setCurrentStage("Stage 3: Market Approach (Data Cleaning)");
    setProjectFetchStatuses({});
    setMarketSignalCollapsed(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Proceed to clean ${webCount} web listing(s) and merge with ${dbCount} Internal DB transaction(s).`,
        meta: "Now",
      },
    ]);


    try {
      const response = await fetch(apiUrl("/cleaning_stream"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listings: listingData || [],          // web listings only — cleaning applies here
          subject: subjectData,
          comparables: selected,
          property_type: subjectData.property_type || "apartment",
          db_transactions: dbTransactions,      // passed through as-is, merged after cleaning
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Cleaning request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "cleaning_start") summary = event.content?.message || "Starting data cleaning...";
          else if (event.type === "cleaning_progress") summary = `🧹 Cleaning: ${event.content?.detail || event.content?.stage}`;
          else if (event.type === "cleaning_results") {
            const webCnt = event.content?.web_count ?? (event.content?.cleaned_listings?.length || 0);
            const dbCnt = event.content?.db_count ?? 0;
            summary = `✅ Cleaning complete: ${webCnt} web listing(s) + ${dbCnt} Internal DB transaction(s) merged.`;
          }
          else if (event.type === "cleaning_done") summary = "Data cleaning pipeline finished.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);
          setCleaningStatusNote(summary);
          setListingStatusNote(summary);

          if (event.type === "cleaning_results") {
            const cleanedListings = event.content?.cleaned_listings || [];
            const reviewListings = event.content?.review_listings || [];
            const droppedListings = event.content?.dropped_listings || [];
            const auditStats = event.content?.audit_stats || {};
            const newUsage = auditStats.token_usage || {};
            const total = newUsage.total_tokens || 0;
            const model = newUsage.model || "gpt-4o-mini";

            pendingCleaningResultRef.current = {
              cleanedListings,
              reviewListings,
              droppedListings,
              summary,
              auditStats,
              tokenUsage: newUsage,
              total,
              model,
            };
            setTokenStats((prev) => {
              const nextModelBreakdown = { ...prev.model_breakdown };
              const currentModelStats = nextModelBreakdown[model] || { prompt: 0, completion: 0, total: 0 };

              const promptDiff = (newUsage.prompt_tokens || 0);
              const completionDiff = (newUsage.completion_tokens || 0);

              nextModelBreakdown[model] = {
                prompt: currentModelStats.prompt + promptDiff,
                completion: currentModelStats.completion + completionDiff,
                total: currentModelStats.total + total
              };

              const addedCost = getModelCost(model, promptDiff, completionDiff);

              return {
                ...prev,
                total_tokens: prev.total_tokens + total,
                model_breakdown: nextModelBreakdown,
                cost_usd: (prev.cost_usd || 0) + addedCost
              };
            });

            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: "Cleaning in progress... waiting for the final completion signal.",
                  meta: "cleaning live",
                  cleaned_listings: cleanedListings,
                  review_listings: reviewListings,
                  dropped_listings: droppedListings,
                };
              }
              return next;
            });
          }

          if (event.type === "cleaning_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                const pending = pendingCleaningResultRef.current;
                if (event.type === "cleaning_done" && pending?.cleanedListings) {
                  setCleanedData(pending.cleanedListings);
                  next[lastIndex] = {
                    ...next[lastIndex],
                    role: "assistant",
                    content: pending.summary || summary,
                    meta: "cleaning results",
                    cleaned_listings: pending.cleanedListings,
                    review_listings: pending.reviewListings,
                    dropped_listings: pending.droppedListings,
                  };
                  pendingCleaningResultRef.current = null;
                  return next;
                }

                if (!next[lastIndex].meta.includes("results")) {
                  next[lastIndex] = {
                    ...next[lastIndex],
                    role: "assistant",
                    content: summary,
                    meta: event.type === "error" ? "error" : "cleaning done",
                  };
                }
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Cleaning fetch error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      if (pendingCleaningResultRef.current?.cleanedListings && !cleanedData) {
        setCleanedData(pendingCleaningResultRef.current.cleanedListings);
      }
      pendingCleaningResultRef.current = null;
      setIsCleaningStreaming(false);
      setStreamingNote("");
      setCleaningStatusNote("");
    }
  };


  // ── Handle Plot Rate Recalculation (Overrides) ─────────────────
  const handleRecalculatePlotRates = async (fsiGlobal, ccGlobal, rowOverrides = {}, mode = "global") => {
    if (!cleanedData || cleanedData.length === 0 || !subjectData || isCleaningStreaming) return;

    setIsCleaningStreaming(true);
    setStreamingNote("Recalculating plot rates with overrides...");

    const getCleanedListingsMessageIndex = (messages) => {
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i]?.cleaned_listings) return i;
      }
      return messages.length - 1;
    };

    try {
      const parsedFsiGlobal = parseFloat(fsiGlobal);
      const parsedCcGlobal = parseFloat(ccGlobal);
      const hasFsiGlobal = fsiGlobal !== "" && !isNaN(parsedFsiGlobal);
      const hasCcGlobal = ccGlobal !== "" && !isNaN(parsedCcGlobal);
      const shouldUseGlobalOverrides = mode === "global";
      const mappedOverrides = {};
      cleanedData.forEach((lst, origIdx) => {
        const rowNeedsPlotConversion = needsPlotConversionInputs(
          lst,
          subjectData.property_type || "plot",
          subjectData.recommended_approach
        );
        const overrideAvailability = {
          fsi: rowNeedsPlotConversion,
          cc: rowNeedsPlotConversion,
        };
        if (!overrideAvailability.fsi && !overrideAvailability.cc) return;

        const uniqueKey = getRowKey(lst, origIdx);
        const ov = rowOverrides[uniqueKey];
        const hasRowFsiOverride = overrideAvailability.fsi && ov?.fsi_best !== undefined && ov.fsi_best !== "";
        const hasRowCcOverride = overrideAvailability.cc && ov?.const_cost_best !== undefined && ov.const_cost_best !== "";
        const shouldApplyFsiGlobal = shouldUseGlobalOverrides && overrideAvailability.fsi && hasFsiGlobal;
        const shouldApplyCcGlobal = shouldUseGlobalOverrides && overrideAvailability.cc && hasCcGlobal;

        if (hasRowFsiOverride || hasRowCcOverride || shouldApplyFsiGlobal || shouldApplyCcGlobal) {
          mappedOverrides[origIdx] = {};
          if (shouldApplyFsiGlobal) {
            mappedOverrides[origIdx].fsi_low = parsedFsiGlobal;
            mappedOverrides[origIdx].fsi_high = parsedFsiGlobal;
          }
          if (shouldApplyCcGlobal) {
            mappedOverrides[origIdx].cc_low = parsedCcGlobal;
            mappedOverrides[origIdx].cc_high = parsedCcGlobal;
          }
          if (hasRowFsiOverride) {
            mappedOverrides[origIdx].fsi_low = ov.fsi_best;
            mappedOverrides[origIdx].fsi_high = ov.fsi_best;
          }
          if (hasRowCcOverride) {
            mappedOverrides[origIdx].cc_low = ov.const_cost_best;
            mappedOverrides[origIdx].cc_high = ov.const_cost_best;
          }
        }
      });
      const overriddenIndices = new Set(Object.keys(mappedOverrides).map((idx) => Number(idx)));

      const payload = {
        cleaned_listings: cleanedData,
        subject: subjectData,
        property_type: subjectData.property_type || "plot",
        overrides: mappedOverrides,
      };

      const response = await fetch(apiUrl("/recalculate_plot_rates_stream"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Recalculate request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newCleanedListings = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "recalculate_start") summary = event.content || "Recalculating plot rates...";
          else if (event.type === "recalculate_results") {
            summary = `Recalculation ready — ${event.content?.listings?.length || 0} listings.`;
            newCleanedListings = event.content.listings;
          }
          else if (event.type === "recalculate_done") summary = "Plot rate recalculation complete.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "recalculate_results" && event.content?.listings) {
            const updatedListings = cleanedData.map((listing, idx) =>
              overriddenIndices.has(idx)
                ? (event.content.listings[idx] || listing)
                : listing
            );
            setCleanedData(updatedListings);
            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = getCleanedListingsMessageIndex(next);
              if (targetIndex >= 0) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: "cleaning results",
                  cleaned_listings: updatedListings,
                  // Backend returns the authoritative full set after segregating
                  // negative-rate listings — update both tabs in one shot.
                  dropped_listings: event.content.dropped_listings ?? next[targetIndex].dropped_listings ?? [],
                  review_listings: event.content.review_listings ?? next[targetIndex].review_listings ?? [],
                };
              }
              return next;
            });
          }

          if (event.type === "recalculate_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const targetIndex = getCleanedListingsMessageIndex(next);
              if (targetIndex >= 0 && !next[targetIndex].meta?.includes("results")) {
                next[targetIndex] = {
                  ...next[targetIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "recalculation done",
                };
              }
              return next;
            });
          }
        }
      }

      if (newCleanedListings) {
        setFactorialData(null);
        setFactorialAnalysisData(null);
        setCostCalculationData(null);
        setNeedsFactorialRegeneration(true);
        setCtaFactorialCollapsed(false);
        setValuationResult(null);
        onValuationResult?.(null);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          const targetIndex = getCleanedListingsMessageIndex(next);
          if (targetIndex >= 0 && !next[targetIndex].meta?.includes("results")) {
            next[targetIndex] = {
              ...next[targetIndex],
              role: "assistant",
              content: `Connection error: ${error.message}`,
              meta: "Error",
            };
          }
          return next;
        });
      }
    } finally {
      setIsCleaningStreaming(false);
      setStreamingNote("");
    }
  };

  const submitFactorial = async () => {
    if (!cleanedData || cleanedData.length === 0 || !subjectData || isFactorialStreaming) return;

    const selected = Array.from(selectedComps).map((i) => comparableData[i]).filter(Boolean);

    setIsFactorialStreaming(true);
    setNeedsFactorialRegeneration(false);
    setCtaFactorialCollapsed(true);
    setStreamingNote("Building factorial rate table...");
    setFactorialStatusNote("Building factorial rate table...");
    setCurrentStage("Stage 4: Factorial Rate Table");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Generate factorial rate table from ${cleanedData.length} cleaned listing(s).`,
        meta: "Now",
      },
      {
        role: "assistant",
        content: "Computing rate statistics per project...",
        meta: "Live",
      },
    ]);

    try {
      const response = await fetch(apiUrl("/factorial_stream"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaned_listings: cleanedData,
          subject: subjectData,
          comparables: selected,
          currency: subjectData.currency,
          area_unit: subjectData.area_unit || "sqft",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Factorial request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "factorial_start") summary = event.content?.message || "Computing factorial table...";
          else if (event.type === "factorial_results") summary = `📈 Factorial table ready — ${event.content?.table?.length || 0} projects.`;
          else if (event.type === "factorial_done") summary = "Factorial rate table generated.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);
          setFactorialStatusNote(summary);

          if (event.type === "factorial_results") {
            setFactorialData(event.content);
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "factorial results",
                  factorial_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "factorial_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta?.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "factorial done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Factorial table error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsFactorialStreaming(false);
      setStreamingNote("");
      setFactorialStatusNote("");
    }
  };

  const submitQuestion = async (question, isContinuation = false, uiDisplayOverride = null, isUserFormSubmission = false) => {
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;

    if (!user) {
      sessionStorage.setItem("sigmavalue_pending_query", trimmed);
      sessionStorage.setItem("sigmavalue_redirect", "/valuation");
      router.push("/auth");
      return;
    }

    abortRef.current?.abort?.();
    abortRef.current = new AbortController();
    setCurrentQuestion(trimmed);
    clearInteractiveState();

    if (!isContinuation) {
      onClear?.();
      setMessages([]);
      setOriginalQuestion(trimmed);
      setStageDetailForceCollapsed(false);
    }

    setCurrentStage("Stage 1: Property Profiling");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: uiDisplayOverride || trimmed, meta: "Now" },
      { role: "assistant", content: "Running property profiling...", meta: "Live" },
    ]);
    setInput("");
    setStreamingNote("Connecting to backend stream...");
    setIsStreaming(true);

    let currentSubjectObj = null;
    let currentMapConf = null;

    try {
      const response = await fetch(apiUrl(`/ask_stream_valuation?question=${encodeURIComponent(trimmed)}&comparable_source=both`), {
        credentials: "include",
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        if (response.status === 402) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("sigmavalue-tokens-exhausted"));
          }
          throw new Error("Your token balance has been exhausted. Please view pricing plans to purchase a token pack.");
        }
        throw new Error(`Backend request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;

          const event = JSON.parse(chunk.slice(6));
          onEvent?.(event);

          if (event.type === "token_usage") {
            const content = event.content || {};
            setTokenStats((prev) => ({
              ...prev,
              total_tokens: content.cumulative_total_tokens || prev.total_tokens || 0,
              cost_usd: content.cumulative_cost_usd || prev.cost_usd || 0,
              model_breakdown: content.model_breakdown || prev.model_breakdown || {},
              tool_breakdown: content.tool_breakdown || prev.tool_breakdown || {},
              stage_breakdown: content.stage_breakdown || prev.stage_breakdown || {}
            }));
          }


          if (event.type === "stage") {
            setCurrentStage(event.content || "Processing...");
          }

          if (event.type === "entities") {
            const ents = event.content;
            const coords = ents?.coordinates;

            // Store subject data for later use in listing fetch
            const subjectObj = {
              ...ents,
              project_name: ents?.project_name || "Subject Property",
              location_name: ents?.location_name || "",
              country: ents?.country || "India",
              currency: ents?.currency || "INR",
              property_type: ents?.property_type || "apartment",
              recommended_approach: ents?.recommended_approach || "market",
              lat: coords?.lat || 0,
              lng: coords?.lng || 0,
            };
            setSubjectData(subjectObj);
            subjectDataRef.current = subjectObj;
            currentSubjectObj = subjectObj;

            if (coords?.lat && coords?.lng && !isNaN(Number(coords.lat)) && !isNaN(Number(coords.lng)) && Number(coords.lat) !== 0 && Number(coords.lng) !== 0) {
              // useEffect will handle marker update
            }
          }

          if (event.type === "cost_inputs_required") {
            const normalizedSchema = normalizeCostInputSchema(event.content);
            setCostInputsSchema(normalizedSchema);
            setCostInputsValues((prev) =>
              buildCostInputDefaults(normalizedSchema, subjectDataRef.current, prev)
            );
          }

          if (event.type === "clarification_needed") {
            const inputs = event.content?.user_inputs_required || [];
            const fields = event.content?.missing_fields || [];
            const schemas = inputs.length > 0 ? inputs : fields.map(f => ({
              field: f, label: f.replaceAll("_", " "), type: "text"
            }));
            const initVals = buildGateInitialValues(schemas, currentSubjectObj, currentMapConf);
            // Legacy path kept for non-gate flows
            setClarificationPrompt(event.content?.question || event.content?.message || "");
            setClarificationFields(schemas);
            setClarificationValues(initVals);
            // Open gate wizard
            setGateAllFields(schemas);
            setGateValues(initVals);
            setGateMode('clarification');
            setGateStep(1);
            setGateActive(true);
          }

          if (event.type === "map_confirmation") {
            const lat = Number(event.content?.lat);
            const lng = Number(event.content?.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
              const conf = {
                lat,
                lng,
                label: event.content?.location_name || "Subject Property",
                source: "map_confirmation",
                message: event.content?.message || "Please confirm this location.",
              };
              setMapConfirmation(conf);
              currentMapConf = conf;
              setClarificationValues(prev => ({
                ...prev,
                coordinates: `${lat}, ${lng}`,
                lat: lat,
                lng: lng
              }));
              setGateValues(prev => ({
                ...prev,
                coordinates: `${lat}, ${lng}`,
                lat: lat,
                lng: lng
              }));
            }
          }

          if (event.type === "approach_choice_needed") {
            setApproachChoiceNeeded(event.content);
            // Open the 5-step wizard at Step 3 (Approach Selection)
            const schemas = [
              {
                field: "recommended_approach",
                label: "Valuation Approach",
                type: "select",
                options: [
                  { value: "market", label: "Market Approach" },
                  { value: "cost", label: "Cost Approach" }
                ],
                default: event.content.recommended_approach
              }
            ];
            const initVals = buildGateInitialValues(schemas, currentSubjectObj || subjectDataRef.current, currentMapConf || mapConfirmation);
            if (event.content.recommended_approach) {
              initVals["recommended_approach"] = event.content.recommended_approach;
            }
            setGateAllFields(schemas);
            setGateValues(initVals);
            setGateMode('clarification');
            setGateStep(3); // Start directly at Step 3: Approach Selection
            setGateActive(true);
          }

          if (event.type === "extraction_verification") {
            setExtractionVerification(event.content);
            const ents = event.content?.entities || {};
            const sublocalityText = formatSublocalities(ents);
            const sublocalityList = getSublocalityItems(ents);
            if (Object.keys(ents).length > 0) {
              const nextSubject = {
                ...currentSubjectObj,
                ...subjectDataRef.current,
                ...ents,
                sub_locality: sublocalityText || ents.sub_locality || null,
                "sub-locality": sublocalityList.length > 0 ? sublocalityList : (ents["sub-locality"] || []),
              };
              setSubjectData(nextSubject);
              subjectDataRef.current = nextSubject;
              currentSubjectObj = nextSubject;
            }
            const ignoreKeys = [
              "intent", "extraction_verified", "coordinates_confirmed",
              "user_requested_approach", "_original_query", "missing_mandatory",
              "clarification_needed", "recommended_approach", "coordinates",
              "property_type_missing", "pt_clarification", "others_clarification",
              "location_details", "nearby_sublocalities", "location_details_error"
            ];
            const propType = ents?.property_type;
            const projectNameTypes = ["apartment", "villa", "retail", "commercial_office"];
            const fields = Object.entries(ents)
              .filter(([k, v]) => {
                if (ignoreKeys.includes(k) || k.startsWith("_")) return false;
                if (v === null || v === "" || typeof v === 'object') return false;
                if (k === "project_name" && propType && !projectNameTypes.includes(propType)) {
                  const valStr = String(v).trim().toLowerCase();
                  if (!valStr || ["subject property", "unknown", "unnamed_project", "unnamed project"].includes(valStr)) {
                    return false;
                  }
                }
                return true;
              })
              .map(([k, v]) => {
                let defVal = v;
                if (typeof v === 'string') {
                  const oq = ents?._original_query || originalQuestion || "";
                  const oqLow = oq.toLowerCase().trim();
                  const vLow = v.toLowerCase().trim();
                  if (vLow && oqLow && (vLow === oqLow || (vLow.length > 30 && oqLow.includes(vLow)))) {
                    defVal = "";
                  }
                }
                return { field: k, label: k.replaceAll("_", " "), type: typeof v === "number" ? "number" : "text", default: defVal };
              });
            if (ents.coordinates && typeof ents.coordinates === 'object') {
              if (ents.coordinates.lat) fields.push({ field: "lat", label: "Latitude", type: "number", default: ents.coordinates.lat });
              if (ents.coordinates.lng) fields.push({ field: "lng", label: "Longitude", type: "number", default: ents.coordinates.lng });
            }
            if (sublocalityText) {
              fields.push({ field: "sub-locality", label: "Sub-locality", type: "text", default: sublocalityText, required: false, readOnly: true });
              fields.push({ field: "sub-locality-list", label: "Sub-locality List", type: "text", default: getSublocalityItems(ents).join(", "), required: false, readOnly: true });
            }
            const initVals = buildGateInitialValues(fields, currentSubjectObj || ents, currentMapConf);
            setClarificationFields(fields);
            setClarificationValues(initVals);
            setClarificationPrompt(event.content?.message || "Please review and confirm the extracted property details.");
            // Open gate wizard at verification step
            setGateAllFields(fields);
            setGateValues(initVals);
            setGateMode('verification');
            setGateStep(1);
            setGateActive(true);
          }

          if (event.type === "comparable_results") {
            setIsComparableSearchActive(false);
            setComparableSearchStatus("");
            setCurrentStage("Stage 3A: Comparable Identification");
            setStreamingNote("Running comparable identification...");
            const comps = event.content?.comparables || [];
            const dropped = event.content?.dropped_comparables || [];
            // Only set comparableData when there are actual results
            // (empty array means no comparables found — leave it null so the fallback card fires)
            if (comps.length > 0) {
              setComparableData(comps);
            }
            if (dropped.length > 0) {
              setDroppedComparableData(dropped);
            } else {
              setDroppedComparableData(null);
            }
            // Store subject's DB entry (if found) for listing fetch
            const subjectDbProject = event.content?.subject_db_project || null;
            if (subjectDbProject) {
              setSubjectData(prev => prev ? { ...prev, subject_db_project: subjectDbProject } : prev);
              subjectDataRef.current = subjectDataRef.current
                ? { ...subjectDataRef.current, subject_db_project: subjectDbProject }
                : subjectDataRef.current;
            }
            // Do not auto-select comparables by default to prevent accidental massive token consumption.
            // But we show them all on the map by default.
            setSelectedComps(new Set());
          }

          if (event.type === "db_comparable_status") {
            if (event.content?.status === "no_results" || event.content?.status === "error") {
              setDbNoResults(true);
              // Also stamp it onto the current last message so the flag survives the 'done' meta overwrite
              setMessages((prev) => {
                const next = [...prev];
                const lastIndex = next.length - 1;
                if (lastIndex >= 0) {
                  next[lastIndex] = { ...next[lastIndex], db_no_results: true };
                }
                return next;
              });
            }
          }

          if (event.type === "comparable_search_progress") {
            const progress = event.content || {};
            setIsComparableSearchActive(true);
            setComparableSearchStatus(
              progress.message ||
              `Searching radius ${progress.radius_km || "?"}km, iteration ${progress.iteration || "?"}...`
            );
            minimizeGate();
          }

          if (event.type === "done") {
            setIsComparableSearchActive(false);
            setComparableSearchStatus("");
            setPipelineDone(true);
          }

          const summary = summarizeEvent(event);
          setStreamingNote(summary);
          if (summary && summary !== "Pipeline update received.") {
            addLog(summary, event.type === "error" ? "error" : event.type === "done" ? "success" : "info");
          }

          if (event.type === "workflow") {
            setStageDetailForceCollapsed(true);
          }

          if (["clarification_needed", "map_confirmation", "approach", "approach_choice_needed", "comparable_results", "extraction_verification", "done", "error"].includes(event.type)) {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type.replaceAll("_", " "),
                  ...(event.type === "comparable_results"
                    ? {
                      // Store null (not []) when no comparables found so the fallback card
                      // condition `!message.comparables` remains truthy
                      comparables: (event.content?.comparables?.length > 0)
                        ? event.content.comparables
                        : null,
                      dropped_comparables: (event.content?.dropped_comparables?.length > 0)
                        ? event.content.dropped_comparables
                        : null,
                    }
                    : {}),
                  // Preserve db_no_results flag across meta overwrites
                  db_no_results: next[lastIndex]?.db_no_results || false,
                  web_comparable_search_done: next[lastIndex]?.web_comparable_search_done || event.type === "done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: `Connection error: ${error.message}`,
            meta: "Error",
          };
          return next;
        });
      }
    } finally {
      setIsStreaming(false);
      setStreamingNote("");
      abortRef.current = null;
    }
  };

  const submitClarification = () => {
    const entries = Object.entries(clarificationValues).filter(([, value]) => value.trim());
    if (entries.length === 0) return;

    const response = entries
      .map(([field, value]) => `${humanizeFieldName(field)}: ${value.trim()}`)
      .join(", ");

    setClarificationPrompt("");
    setClarificationFields([]);
    setClarificationValues({});
    submitQuestion(`${currentQuestion}. ${response}`, true, response);
  };

  const submitExtractionVerification = () => {
    if (!extractionVerification) return;

    const entries = Object.entries(clarificationValues).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
    const changes = [];
    const ents = extractionVerification.entities || {};
    const entsCoords = ents.coordinates || {};

    entries.forEach(([field, value]) => {
      let isChanged = false;
      if (field === "lat" || field === "lng") {
        isChanged = String(value).trim() !== String(entsCoords[field]);
      } else {
        isChanged = String(value).trim() !== String(ents[field]);
      }

      if (isChanged) {
        changes.push(`${humanizeFieldName(field)}: ${value}`);
      }
    });

    let response = "The extracted details are confirmed to be correct.";
    if (changes.length > 0) {
      response = `The extracted details are confirmed with the following corrections: ${changes.join(", ")}. Please use these values.`;
      if (changes.some(c => c.startsWith("Lat") || c.startsWith("Lng"))) {
        response += " Also update the coordinates to the new latitude and longitude.";
      }
    }

    setExtractionVerification(null);
    setClarificationFields([]);
    setClarificationValues({});
    setClarificationPrompt("");
    submitQuestion(`${currentQuestion}. ${response}`, true, changes.length > 0 ? `Confirmed with corrections: ${changes.join(", ")}` : "Details confirmed");
  };

  const submitMapConfirmation = (confirmed) => {
    if (!mapConfirmation) return;

    if (confirmed) {
      setMapConfirmation(null);
      submitQuestion(`${currentQuestion}. The map location is confirmed to be correct. Coordinates Confirmed: true. Latitude: ${mapConfirmation.lat}. Longitude: ${mapConfirmation.lng}.`, true, "Location confirmed");
      return;
    }

    const corrected = clarificationValues.coordinates?.trim();
    if (!corrected) return;

    setMapConfirmation(null);
    setClarificationValues((prev) => ({ ...prev, coordinates: "" }));
    submitQuestion(`${currentQuestion}. The correct coordinates are ${corrected}. Coordinates Confirmed: true.`, true, `Updated coordinates to ${corrected}`);
  };

  const handleGeocodeRefresh = async () => {
    const locName = gateValues["location_name"] || "";
    const projName = gateValues["project_name"] || "";
    const country = gateValues["country"] || "India";

    if (!locName.trim()) {
      setGeocodeError("Please enter a locality name first (e.g. Sus, Pune).");
      return;
    }

    setIsGeocoding(true);
    setGeocodeError("");

    try {
      const response = await fetch(apiUrl("/geocode"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_name: locName,
          project_name: projName,
          country: country
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact geocoder API.");
      }

      const result = await response.json();
      if (result.lat && result.lng) {
        setGateValues(prev => ({
          ...prev,
          lat: String(result.lat),
          lng: String(result.lng),
          coordinates: `${result.lat}, ${result.lng}`
        }));
        setGeocodeError("");
      } else if (result.error) {
        setGeocodeError(`Error: ${result.error}. Please adjust the Location Name and try again.`);
      } else {
        setGeocodeError("Coordinates not found. Please enter them manually or check location name formatting.");
      }
    } catch (err) {
      setGeocodeError(`Failed to fetch coordinates: ${err.message}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  const submitApproachChoice = (confirmed, alternative) => {
    if (!approachChoiceNeeded) return;
    const approach = confirmed ? approachChoiceNeeded.recommended_approach : alternative;
    setApproachChoiceNeeded(null);
    setSubjectData(prev => prev ? { ...prev, recommended_approach: approach } : { recommended_approach: approach });
    submitQuestion(`${currentQuestion}. Proceed with the ${approach} approach.`, true, `Proceeding with ${approach} approach`);
  };

  const runSpecialAnalysis = async () => {
    if (isFactorialStreaming) return;

    onClear?.();
    setMessages([]);
    clearInteractiveState();

    // Create the subject and comparables data
    const subj = {
      project_name: specialSubjectName,
      lat: Number(specialSubjectLat),
      lng: Number(specialSubjectLng),
      location_name: "Mumbai",
      currency: "INR"
    };

    const comps = [
      {
        project_name: specialCompName,
        lat: Number(specialCompLat),
        lng: Number(specialCompLng),
        location: "Mumbai"
      }
    ];

    // Set state so map updates
    setSubjectData(subj);
    setComparableData(comps.map(c => ({
      ...c,
      map_search_lat: String(c.lat),
      map_search_lng: String(c.lng)
    })));
    setSelectedComps(new Set([0]));

    // Create mock cleaned data
    const mockCleaned = [];

    // Subject mock listings
    for (let i = 0; i < 5; i++) {
      mockCleaned.push({
        cleaned_match_project: subj.project_name,
        cleaned_relevant_for_valuation: true,
        cleaned_price_value: 12000000 + (i * 500000),
        final_super_builtup_area: 1000 + (i * 10),
        cleaned_area_type: "super_built_up",
        stat_flag: "ok"
      });
    }

    // Comp mock listings
    for (let i = 0; i < 5; i++) {
      mockCleaned.push({
        cleaned_match_project: comps[0].project_name,
        cleaned_relevant_for_valuation: true,
        cleaned_price_value: 10000000 + (i * 300000),
        final_super_builtup_area: 1000 + (i * 20),
        cleaned_area_type: "super_built_up",
        stat_flag: "ok"
      });
    }

    setCleanedData(mockCleaned);
    setPipelineDone(true);

    // Run factorial stream directly
    setIsFactorialStreaming(true);
    setStreamingNote("Computing factorial rate table with custom coordinates...");
    setCurrentStage("Stage 4: Factorial Rate Table (Special Analysis)");

    setMessages([
      { role: "user", content: `Run Special Factorial Analysis for Subject: ${subj.project_name} and Comp: ${comps[0].project_name}.`, meta: "Now" },
      { role: "assistant", content: "Computing rate statistics and mapping amenities based on coordinates...", meta: "Live" },
    ]);

    try {
      const response = await fetch(apiUrl("/factorial_stream"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaned_listings: mockCleaned,
          subject: subj,
          comparables: comps,
          currency: subj.currency,
          area_unit: subj.area_unit || "sqft",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Factorial request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          onEvent?.(event);
          let summary = "Pipeline update received.";
          if (event.type === "factorial_start") summary = event.content?.message || "Computing factorial table...";
          else if (event.type === "factorial_results") summary = `📈 Factorial table ready — ${event.content?.table?.length || 0} projects.`;
          else if (event.type === "factorial_done") summary = "Factorial rate table generated.";
          else if (event.type === "error") summary = `Error: ${event.content}`;

          setStreamingNote(summary);

          if (event.type === "factorial_results") {
            setFactorialData(event.content);
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: "factorial results",
                  factorial_data: event.content,
                };
              }
              return next;
            });
          }

          if (event.type === "factorial_done" || event.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && !next[lastIndex].meta?.includes("results")) {
                next[lastIndex] = {
                  ...next[lastIndex],
                  role: "assistant",
                  content: summary,
                  meta: event.type === "error" ? "error" : "factorial done",
                };
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            role: "assistant",
            content: `Factorial table error: ${error.message}`,
            meta: "Error",
          };
        }
        return next;
      });
    } finally {
      setIsFactorialStreaming(false);
      setStreamingNote("");
    }
  };

  // ── Gate Wizard Helpers ───────────────────────────────────────────
  const IDENTITY_FIELDS = ["project_name", "coordinates", "lat", "lng", "location_name", "city_name", "city", "country"];
  const PROP_TYPE_FIELDS = ["property_type"];
  const APPROACH_FIELDS = ["approach", "recommended_approach", "valuation_approach"];

  // Fields that belong to Gate 4 (property-specific attributes, not identity/type/approach)
  const isGate4Field = (f) =>
    !IDENTITY_FIELDS.includes(f.field) &&
    !PROP_TYPE_FIELDS.includes(f.field) &&
    !APPROACH_FIELDS.includes(f.field);

  const gate1Fields = gateAllFields.filter(f => IDENTITY_FIELDS.includes(f.field));
  const gate2Fields = gateAllFields.filter(f => PROP_TYPE_FIELDS.includes(f.field));
  const gate3Fields = gateAllFields.filter(f => APPROACH_FIELDS.includes(f.field));
  const gate4Fields = gateAllFields.filter(isGate4Field);

  // Current property type from wizard values (or already-known subject data)
  const wizardPropType = (gateValues["property_type"] || subjectData?.property_type || "").toLowerCase().trim();
  const isVilla = wizardPropType === "villa";

  // Compute effective max step (skip gate 3 if not villa)
  const gateMax = isVilla ? 5 : 4;   // 1=Identity,2=PropType,3=Approach(villa only),4=Fields,5=Verify

  const advanceGate = () => {
    setGateStep(prev => {
      let next = prev + 1;
      // Skip approach gate (3) if not villa
      if (next === 3 && !isVilla) next = 4;
      return next;
    });
  };

  const closeGate = () => {
    setGateActive(false);
    setGateStep(1);
    setGateMode(null);
  };

  const minimizeGate = () => {
    setGateStep(5);
    setGateCollapsed(true);
    setShowActionRequiredInfo(false);
    setShowGeocodeTipInfo(false);
  };

  const gateSubmitFinal = () => {
    // Merge gateValues back into clarificationValues / extractionVerification path
    setClarificationValues(gateValues);

    // Prepare values to send, ensuring coordinates are formatted and verification flags are true
    const finalVals = {
      ...gateValues,
      extraction_verified: "true",
      coordinates_confirmed: "true"
    };
    if (finalVals.lat && finalVals.lng) {
      finalVals.coordinates = `${finalVals.lat}, ${finalVals.lng}`;
    }

    if (gateMode === 'verification') {
      // Compute changed fields vs original extraction
      const ents = extractionVerification?.entities || subjectData || {};
      const changedFieldKeys = [];

      const normVal = (val) => {
        if (val === undefined || val === null) return "";
        if (Array.isArray(val)) return val.map((item) => typeof item === "object" ? item?.name : item).filter(Boolean).join(", ").trim().toLowerCase();
        if (typeof val === "object") return formatSublocalities(val) || JSON.stringify(val);
        return String(val).trim().toLowerCase();
      };

      Object.entries(gateValues).forEach(([field, value]) => {
        // Skip comparing coordinates directly since we verify separate lat/lng fields
        if (field === "coordinates") return;

        let isChanged = false;
        if (field === "lat" || field === "lng") {
          const originalVal = ents[field] || (
            typeof ents.coordinates === 'object' && ents.coordinates
              ? ents.coordinates[field]
              : (typeof ents.coordinates === 'string'
                ? ents.coordinates.split(',')[field === "lat" ? 0 : 1]?.trim()
                : undefined)
          );
          isChanged = normVal(value) !== normVal(originalVal);
        } else {
          isChanged = normVal(value) !== normVal(ents[field]);
        }

        if (isChanged) changedFieldKeys.push(field);
      });

      // ── Fast path: only area / age changed ─────────────────────────────────
      // If the valuation pipeline has already completed (factorialAnalysisData present)
      // and the only edits are to area or age fields, skip the full pipeline re-run
      // and recalculate the final value client-side.
      const isAreaAgeOnly =
        changedFieldKeys.length > 0 &&
        changedFieldKeys.every((f) => AREA_AGE_FIELDS.has(f)) &&
        factorialAnalysisData !== null;

      if (isAreaAgeOnly) {
        // Build an updated copy of subjectData with the new values merged in
        const updatedSubject = { ...subjectData };
        changedFieldKeys.forEach((f) => {
          const rawVal = gateValues[f];
          updatedSubject[f] = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
        });
        applyAreaAgeRecalculation(updatedSubject, changedFieldKeys);
        setExtractionVerification(null);
        setClarificationFields([]);
        setClarificationPrompt("");
        minimizeGate();
        return; // skip full pipeline
      }

      // ── Normal path: full pipeline re-run ────────────────────────────────
      // Clear parent state since this is a re-run of profiling wizard
      onClear?.();

      const changes = changedFieldKeys.map((field) => {
        const value = gateValues[field];
        if (field === "recommended_approach" || field === "valuation_approach" || field === "approach") {
          return `Use ${value} approach`;
        }
        return `${humanizeFieldName(field)}: ${value}`;
      });

      let response = "The extracted details are confirmed to be correct. Extraction Verified: true, Coordinates Confirmed: true";
      if (changes.length > 0) {
        response = `The extracted details are confirmed with the following corrections: ${changes.join(", ")}. Please use these values. Extraction Verified: true, Coordinates Confirmed: true`;
        if (changedFieldKeys.some(f => f === "lat" || f === "lng")) {
          response += " Also update the coordinates to the new latitude and longitude.";
        }
      }
      setExtractionVerification(null);
      setClarificationFields([]);
      setClarificationPrompt("");
      minimizeGate();
      submitQuestion(`${currentQuestion}. ${response}`, true, changes.length > 0 ? `Confirmed with corrections: ${changes.join(", ")}` : "Details confirmed");
    } else {
      // clarification flow
      const entries = Object.entries(finalVals).filter(([k, v]) => {
        if (k === "coordinates" && typeof v === "object") return false;
        return String(v).trim();
      });
      const response = entries.map(([f, v]) => {
        if (f === "recommended_approach" || f === "valuation_approach" || f === "approach") {
          return `Use ${v} approach`;
        }
        return `${humanizeFieldName(f)}: ${v}`;
      }).join(", ");
      setClarificationPrompt("");
      setClarificationFields([]);
      minimizeGate();
      submitQuestion(`${currentQuestion}. ${response}`, true, response);
    }
  };

  // ── Stage1GateWizard render ───────────────────────────────────────
  const renderGateField = (schema) => {
    const val = gateValues[schema.field] ?? "";
    const update = (v) => {
      setGateValues(prev => {
        const next = { ...prev, [schema.field]: v };
        if (schema.field === "project_name" || schema.field === "location_name" || schema.field === "city_name" || schema.field === "country") {
          next.lat = "";
          next.lng = "";
          next.coordinates = "";
        }
        return next;
      });
    };
    const isFilled = String(val).trim() !== "";
    const isRequired = schema.required !== false;
    const isReadOnly = schema.readOnly === true;
    const sublocalityItems = schema.field === "sub-locality"
      ? getSubjectSublocalityList(gateValues)
      : [];

    if (schema.type === "select" || (schema.options && schema.options.length > 0)) {
      return (
        <label key={schema.field} className="flex flex-col gap-1 sm:gap-1.5 min-w-[140px] sm:min-w-[170px] flex-1">
          <span className="pl-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-[0.05em] text-text-dim leading-tight">
            {schema.label || humanizeFieldName(schema.field)}
            {isRequired && <span className="text-danger ml-0.5">*</span>}
            {isFilled && <span className="ml-1 inline-flex items-center rounded-full bg-success/20 px-1 sm:px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-success"><span className="sm:hidden">✓</span><span className="hidden sm:inline">Autofilled</span></span>}
          </span>
          <select
            value={val}
            onChange={e => update(e.target.value)}
            disabled={isReadOnly}
            className={`rounded-xl border border-border bg-bg-input px-2 sm:px-3 py-1.5 sm:py-2.5 text-xs sm:text-sm text-text-primary outline-none transition focus:border-warning focus:bg-warning/5 ${isReadOnly ? "cursor-not-allowed opacity-75" : ""}`}
          >
            <option value="" disabled style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Select {schema.label}...</option>
            {schema.options?.map(opt => {
              const isObj = typeof opt === 'object';
              const optValue = isObj ? opt.value : opt;
              const optLabel = isObj ? opt.label : humanizeFieldName(opt);
              return <option key={optValue} value={optValue} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>{optLabel}</option>;
            })}
          </select>
        </label>
      );
    }

    return (
      <label key={schema.field} className="flex flex-col gap-1 sm:gap-1.5 min-w-[140px] sm:min-w-[170px] flex-1">
        <span className="pl-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-[0.05em] text-text-dim flex items-center gap-1 leading-tight">
          {schema.label || humanizeFieldName(schema.field)}
          {isRequired && <span className="text-danger ml-0.5">*</span>}
          {isFilled && <span className="inline-flex items-center rounded-full bg-success/20 px-1 sm:px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-success"><span className="sm:hidden">✓</span><span className="hidden sm:inline">Autofilled</span></span>}
        </span>
        <input
          type={schema.type === "number" ? "number" : "text"}
          value={val}
          readOnly={isReadOnly}
          onChange={e => !isReadOnly && update(e.target.value)}
          placeholder={PLACEHOLDER_MAP[schema.field] || `Enter ${schema.label || humanizeFieldName(schema.field)}`}
          className={`rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-warning/5 ${isReadOnly ? "cursor-not-allowed opacity-75" : ""}`}
        />
        {schema.field === "sub-locality" && sublocalityItems.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {sublocalityItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-info/20 bg-info/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] text-info"
              >
                {item}
              </span>
            ))}
          </div>
        )}
        {schema.field === "age_years" && String(val) === "0" && (
          <span className="mt-1 px-1 text-[10px] font-medium text-warning tracking-wide">* Property marked as Under Construction</span>
        )}
      </label>
    );
  };

  const GATE_META = [
    { step: 1, label: "Property Identification", icon: "📍", desc: "Project name / coordinates, location & country" },
    { step: 2, label: "Property Type", icon: "🏠", desc: "Select the type of property being valued" },
    { step: 3, label: "Approach Selection", icon: "⚖️", desc: "Choose valuation approach (Villa only)" },
    { step: 4, label: "Property Details", icon: "📋", desc: "Area, age, floor, and other required attributes" },
    { step: 5, label: "Verify & Confirm", icon: "✅", desc: "Review all data before proceeding" },
  ].filter(g => isVilla || g.step !== 3);

  const Stage1GateWizard = gateActive ? (() => {
    const currentMeta = GATE_META.find(g => g.step === gateStep) || GATE_META[0];
    const activeType = wizardPropType;
    const currentProjName = gateValues["project_name"] || subjectData?.project_name || "";
    const isProjectNamePresent = currentProjName && !["subject property", "unknown", "unnamed_project", "unnamed project"].includes(currentProjName.toLowerCase().trim());

    // Dynamically build all fields for the active property type
    const identityFields = [
      ...(activeType !== "plot" || isProjectNamePresent ? [{ field: "project_name", label: "Project Name", type: "text", required: false }] : []),
      { field: "location_name", label: "Location / Locality", type: "text", required: true },
      { field: "city_name", label: "City Name", type: "text", required: false },
      { field: "country", label: "Country", type: "text", required: false },
    ];

    const typeFields = [
      {
        field: "property_type", label: "Property Type", type: "select", options: [
          { value: "apartment", label: "Apartment / Flat" },
          { value: "villa", label: "Villa" },
          { value: "plot", label: "Plot / Land" },
          { value: "retail", label: "Retail / Shop" },
          { value: "commercial_office", label: "Commercial Office" },
          { value: "building_land", label: "Building + Land" },
        ]
      },
      ...(activeType === "building_land" ? [
        {
          field: "building_type", label: "Building Type", type: "select", options: [
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" },
            { value: "industrial", label: "Industrial" }
          ]
        }
      ] : [])
    ];

    const approachFields = activeType === "villa" ? [
      {
        field: "recommended_approach", label: "Valuation Approach", type: "select", options: [
          { value: "market", label: "Market Approach" },
          { value: "cost", label: "Cost Approach" },
        ]
      }
    ] : [];

    let detailFields = [];
    if (activeType === "apartment") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
        { field: "subject_floor", label: "Floor", type: "number", required: false },
        { field: "total_floors", label: "Total Floors", type: "number", required: false },
        { field: "facing", label: "Facing", type: "text", required: false },
      ];
    } else if (activeType === "villa" || activeType === "building_land") {
      detailFields = [
        { field: "plot_area_sqft", label: "Plot Area (sqft)", type: "number" },
        ...(formatSublocalities(subjectData || extractionVerification?.entities) ? [{ field: "sub-locality", label: "Sub-locality", type: "text", required: false, readOnly: true }] : []),
        { field: "builtup_area_sqft", label: "Built-up Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
        { field: "facing", label: "Facing", type: "text", required: false },
      ];
    } else if (activeType === "plot") {
      detailFields = [
        { field: "plot_area_sqft", label: "Plot Area (sqft)", type: "number" },
        ...(formatSublocalities(subjectData || extractionVerification?.entities) ? [{ field: "sub-locality", label: "Sub-locality", type: "text", required: false, readOnly: true }] : []),
        {
          field: "land_type", label: "Land Type", type: "select", options: [
            { value: "agricultural", label: "Agricultural" },
            { value: "non_agricultural", label: "Non Agricultural" },
            { value: "residential", label: "Residential" },
            { value: "commercial", label: "Commercial" }
          ]
        },
      ];
    } else if (activeType === "retail") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "frontage", label: "Road Frontage (ft)", type: "number" },
        { field: "subject_floor", label: "Floor", type: "number", required: false },
        { field: "facing", label: "Facing", type: "text", required: false },
      ];
    } else if (activeType === "commercial_office") {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        {
          field: "occupancy_status", label: "Occupancy Status", type: "select", options: [
            { value: "vacant", label: "Vacant" },
            { value: "leased", label: "Leased" },
            { value: "self_use", label: "Self Use" }
          ]
        },
        { field: "subject_floor", label: "Floor", type: "number", required: false },
        { field: "total_floors", label: "Total Floors", type: "number", required: false },
        { field: "facing", label: "Facing", type: "text", required: false },
      ];
    } else {
      detailFields = [
        { field: "salable_area_sqft", label: "Salable Area (sqft)", type: "number" },
        { field: "age_years", label: "Age of Building (yrs)", type: "number" },
        { field: "subject_floor", label: "Floor", type: "number", required: false },
        { field: "total_floors", label: "Total Floors", type: "number", required: false },
        { field: "facing", label: "Facing", type: "text", required: false },
      ];
    }

    // Build step-specific fields
    let stepFields = [];
    if (gateStep === 1) stepFields = identityFields;
    else if (gateStep === 2) stepFields = typeFields;
    else if (gateStep === 3 && activeType === "villa") stepFields = approachFields;
    else if (gateStep === 4) stepFields = detailFields;

    // Validate mandatory for current step
    const mandatoryStep = gateStep === 1
      ? (gateValues["location_name"] && String(gateValues["location_name"]).trim() !== "")
      : gateStep === 2
        ? (gateValues["property_type"] && (gateValues["property_type"] !== "building_land" || gateValues["building_type"]))
        : gateStep === 3
          ? gateValues["recommended_approach"]
          : gateStep === 4
            ? detailFields.filter(f => f.required !== false).every(f => {
              const val = gateValues[f.field];
              return val !== undefined && val !== null && String(val).trim() !== "";
            })
            : true;

    const visualStep = GATE_META.findIndex(g => g.step === gateStep) + 1;
    const canAdvance = Boolean(mandatoryStep);
    const gateTitle = "Stage 1 - Property Profiling";

    return (
      <div className="mb-3 overflow-hidden rounded-2xl border border-warning/30 bg-bg-card/95 backdrop-blur-md shadow-panel animate-in slide-in-from-bottom-2 duration-300 flex flex-col min-h-0 max-h-[75vh] sm:max-h-none">
        {/* Header */}
        <div
          onClick={() => setGateCollapsed(!gateCollapsed)}
          className="border-b border-warning/15 bg-warning/5 px-3 py-2 sm:px-4 sm:py-3 cursor-pointer select-none shrink-0"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-warning/20 bg-warning/10 text-sm sm:text-base">
                {currentMeta.icon}
              </div>
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-warning">
                    {gateTitle}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActionRequiredInfo((prev) => !prev);
                    }}
                    className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-[9px] font-black text-warning leading-none transition hover:bg-warning/20"
                    aria-label="Show action required details"
                    title="Show action required details"
                  >
                    i
                  </button>
                  {gateCollapsed ? <ChevronRight className="h-4 w-4 text-warning" /> : <ChevronDown className="h-4 w-4 text-warning" />}
                </div>
                <div
                  className={`absolute left-0 top-full z-30 mt-2 w-[280px] rounded-xl border border-warning/25 bg-bg-card/98 p-3 shadow-lg backdrop-blur-md transition-all duration-200 ${showActionRequiredInfo ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
                    }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.05em] text-warning block">Action Required</span>
                  <span className="mt-1 block text-[10px] text-text-secondary leading-relaxed">
                    Please review and verify the subject property parameters for Gate {visualStep} to proceed.
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeGate();
              }}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 transition cursor-pointer"
              title="Close Wizard"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step progress pills */}
          {!gateCollapsed && (
            <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
              {GATE_META.map((g, idx) => (
                <button
                  key={g.step}
                  onClick={() => gateStep > g.step && setGateStep(g.step)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.04em] transition
                    ${g.step === gateStep
                      ? "bg-warning text-bg-deep shadow"
                      : g.step < gateStep
                        ? "bg-success/20 text-success border border-success/30 cursor-pointer hover:bg-success/30"
                        : "bg-border/20 text-text-dim cursor-default"
                    }`}
                >
                  {g.step < gateStep ? "✓" : (idx + 1)} {g.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Gate body */}
        {!gateCollapsed && (
          <div className="flex flex-col min-h-0">
            {/* Scrollable Content Container */}
            <div className="overflow-y-auto custom-scrollbar p-2.5 sm:p-4 space-y-3 max-h-[42vh] sm:max-h-[30vh] min-h-0">
              {/* Show prompt/question from the agent if available */}
              {gateStep === 3 && approachChoiceNeeded?.question && (
                <div className="rounded-xl bg-warning/5 border border-warning/15 px-3.5 py-2.5 text-xs text-text-secondary leading-relaxed animate-in fade-in duration-200">
                  <span className="font-semibold text-warning">Agent Recommendation:</span> {approachChoiceNeeded.question}
                </div>
              )}
              {/* Gate 5 = full review */}
              {gateStep === 5 ? (
                <div className="space-y-4">
                  <p className="text-xs text-text-secondary">Review all extracted details. Edit any field before confirming.</p>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                    {(() => {
                      const standardFields = [...identityFields, ...typeFields, ...approachFields, ...detailFields];
                      const extraFields = gateAllFields.filter(gf => !standardFields.some(sf => sf.field === gf.field));
                      const finalFields = [...standardFields, ...extraFields].map(f => {
                        if (f.field === "lat" || f.field === "lng") {
                          return { ...f, type: "text" };
                        }
                        return f;
                      });
                      if (!finalFields.some(f => f.field === "lat")) {
                        finalFields.push({ field: "lat", label: "Latitude", type: "text" });
                      }
                      if (!finalFields.some(f => f.field === "lng")) {
                        finalFields.push({ field: "lng", label: "Longitude", type: "text" });
                      }
                      return finalFields.map(f => renderGateField(f));
                    })()}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                    {stepFields.map(f => renderGateField(f))}
                    {stepFields.length === 0 && (
                      <p className="text-xs text-text-dim italic">No additional fields required for this step.</p>
                    )}
                  </div>

                  {/* Gate 1 Coordinate Verification */}
                  {gateStep === 1 && (
                    <div className="mt-4 border-t border-border/40 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-warning flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> Coordinate Verification
                        </span>
                        <div className="relative flex gap-3 items-center">
                          {mapConfirmation && (
                            <button
                              type="button"
                              onClick={() => {
                                const latVal = mapConfirmation.lat || "";
                                const lngVal = mapConfirmation.lng || "";
                                setGateValues(prev => ({
                                  ...prev,
                                  lat: latVal,
                                  lng: lngVal,
                                  coordinates: latVal && lngVal ? `${latVal}, ${lngVal}` : prev.coordinates
                                }));
                              }}
                              className="text-[9px] font-black uppercase tracking-wider text-accent hover:underline cursor-pointer"
                            >
                              Pull from Map Confirmation
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isGeocoding}
                            onClick={handleGeocodeRefresh}
                            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-warning hover:underline cursor-pointer disabled:opacity-50"
                          >
                            {isGeocoding ? "Refreshing..." : "🔄 Refresh from Location"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowGeocodeTipInfo((prev) => !prev);
                            }}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-[9px] font-black text-warning transition hover:bg-warning/20"
                            aria-label="Show refresh tip"
                            title="Show tip"
                          >
                            i
                          </button>
                          <div
                            className={`absolute right-0 top-full z-30 mt-2 w-[320px] rounded-xl border border-warning/25 bg-bg-card/98 p-3 shadow-lg backdrop-blur-md transition-all duration-200 ${showGeocodeTipInfo ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
                              }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-[10px] text-text-dim leading-relaxed">
                              <span className="font-semibold text-warning">💡 Tip:</span> Please add the exact locality and city name in the location field (e.g. <span className="text-warning font-mono">&quot;Sus, Pune&quot;</span>) then click <span className="text-warning font-semibold">🔄 Refresh from Location</span> to extract coordinates automatically. If auto-detection is not satisfactory or fails, please type the correct coordinates manually.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Geocode Tip Remark & Errors */}
                      <div className="space-y-1.5">
                        {geocodeError && (
                          <p className="text-[9px] font-bold text-danger leading-relaxed animate-in fade-in duration-200">
                            ⚠️ {geocodeError}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                        <label className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                          <span className="pl-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-[0.05em] text-text-dim leading-tight">Latitude</span>
                          <input
                            type="text"
                            value={gateValues["lat"] ?? ""}
                            onChange={e => {
                              const val = e.target.value;
                              setGateValues(prev => ({
                                ...prev,
                                lat: val,
                                coordinates: val && prev.lng ? `${val}, ${prev.lng}` : prev.coordinates
                              }));
                            }}
                            placeholder="e.g. 19.0760"
                            className="rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-warning focus:bg-warning/5"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                          <span className="pl-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-[0.05em] text-text-dim leading-tight">Longitude</span>
                          <input
                            type="text"
                            value={gateValues["lng"] ?? ""}
                            onChange={e => {
                              const val = e.target.value;
                              setGateValues(prev => ({
                                ...prev,
                                lng: val,
                                coordinates: prev.lat && val ? `${prev.lat}, ${val}` : prev.coordinates
                              }));
                            }}
                            placeholder="e.g. 72.8777"
                            className="rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-warning focus:bg-warning/5"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky footer buttons — mobile-friendly */}
            <div className="shrink-0 border-t border-border/40 bg-bg-card/90 px-2 py-2 sm:px-3 sm:py-3 backdrop-blur">
              {gateStep === 5 ? (
                /* Review step: Cancel | Back | Confirm — strictly equal 1/3 width each */
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                  <button
                    type="button"
                    onClick={closeGate}
                    className="inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 px-1.5 sm:px-2 py-2 text-xs sm:text-sm font-semibold text-danger transition hover:bg-danger/20 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setGateStep(4)}
                    className="inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-xl border border-border bg-bg-input px-1.5 sm:px-2 py-2 text-xs sm:text-sm font-semibold text-text-secondary transition hover:border-warning hover:text-warning active:scale-[0.98]"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={!gateValues["location_name"] || String(gateValues["location_name"]).trim() === ""}
                    onClick={gateSubmitFinal}
                    className="inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-xl bg-success px-1.5 sm:px-2 py-2 text-center text-xs sm:text-sm font-bold text-bg-deep transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="hidden sm:inline">Confirm & Proceed →</span>
                    <span className="sm:hidden">Confirm →</span>
                  </button>
                </div>
              ) : (
                /* Data-entry steps: Strictly equal columns (3 columns when Back exists, 2 columns on Gate 1) */
                <div className={`grid ${gateStep > 1 ? "grid-cols-3" : "grid-cols-2"} gap-1.5 sm:gap-2 w-full`}>
                  <button
                    type="button"
                    onClick={closeGate}
                    className="inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 px-1.5 sm:px-2 py-2 text-xs sm:text-sm font-semibold text-danger transition hover:bg-danger/20 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  {gateStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setGateStep(prev => {
                        let back = prev - 1;
                        if (back === 3 && !isVilla) back = 2;
                        return back;
                      })}
                      className="inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-xl border border-border bg-bg-input px-1.5 sm:px-2 py-2 text-xs sm:text-sm font-semibold text-text-secondary transition hover:border-warning hover:text-warning active:scale-[0.98]"
                    >
                      ← Back
                    </button>
                  )}
                  {gateStep < (isVilla ? 4 : 4) ? (
                    <button
                      type="button"
                      disabled={!canAdvance}
                      onClick={advanceGate}
                      className="inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-xl bg-warning px-1.5 sm:px-2 py-2 text-xs sm:text-sm font-bold text-bg-deep transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next →
                    </button>
                  ) : (
                    // Last data-entry gate → go to review (gate 5)
                    <button
                      type="button"
                      disabled={!canAdvance}
                      onClick={() => setGateStep(5)}
                      className="inline-flex min-h-[44px] w-full min-w-0 items-center justify-center rounded-xl bg-accent px-1.5 sm:px-2 py-2 text-center text-xs sm:text-sm font-bold text-bg-deep transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="hidden sm:inline">Review & Confirm →</span>
                      <span className="sm:hidden">Review →</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  })() : null;

  const anyStreaming = isStreaming || isQuickEstimateStreaming || isListingStreaming || isCleaningStreaming || isFactorialStreaming || isFactorialAnalysisStreaming;
  const visibleMessages = messages.filter((message) => {
    const text = typeof message.content === "string" ? message.content.trim() : "";
    if (
      message.role === "assistant" &&
      message.meta === "listing done" &&
      !message.listings &&
      !message.db_transactions
    ) return false;
    if (
      message.role === "assistant" &&
      message.meta === "Live" &&
      text.toLowerCase().startsWith("analyzing factorial data")
    ) return false;
    return text !== "Pipeline paused for data clarification.";
  });

  const quickEstimateModal = showQuickEstimateModal && typeof document !== "undefined" ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-bg-deep/80 p-4 backdrop-blur-md animate-in fade-in duration-300 md:p-8"
      onClick={() => setShowQuickEstimateModal(false)}
    >

      <div
        className="relative w-full max-w-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setShowQuickEstimateModal(false)}
          className="absolute right-4 top-3 z-10 rounded-xl border border-border bg-bg-input p-2 text-text-secondary transition hover:bg-accent/10 hover:text-accent cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
        <QuickEstimatePanel
          values={quickEstimateValues}
          onChange={setQuickEstimateValues}
          onSubmit={submitQuickEstimate}
          disabled={anyStreaming}
        />
      </div>
    </div>,
    document.body
  ) : null;

  const userFormModal = showUserFormModal && typeof document !== "undefined" ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-bg-deep/80 p-4 backdrop-blur-md animate-in fade-in duration-300 md:p-8"
      onClick={() => setShowUserFormModal(false)}
    >
      <div
        className="relative w-full max-w-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setShowUserFormModal(false)}
          className="absolute right-4 top-3 z-10 rounded-xl border border-border bg-bg-input p-2 text-text-secondary transition hover:bg-accent/10 hover:text-accent cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
        <UserFormWizardPanel
          values={userFormValues}
          onChange={setUserFormValues}
          onSubmit={submitUserFormEstimate}
          disabled={anyStreaming}
          apiUrl={apiUrl}
        />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <section className="panel-shell border border-border/80 shadow-lg bg-bg-card/50 backdrop-blur-sm flex flex-col h-full">
        <div className="panel-header-shell min-h-[68px] shrink-0 border-b border-border/60">
          <div className="panel-title-shell">
            <div className="icon-chip bg-accent/10 border border-accent/20 p-2 rounded-xl">
              <MessageSquareCode className="h-5 w-5 text-accent" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary m-0">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {!anyStreaming && (
              <button
                type="button"
                onClick={() => setShowQuickEstimateModal(true)}
                className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-accent hover:bg-accent/20 transition cursor-pointer whitespace-nowrap"
              >
                <Zap className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">AI Quick Estimate</span>
              </button>
            )}
            {subjectData && !anyStreaming && (
              <button
                type="button"
                onClick={handleEditPropertyDetails}
                className="flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-warning hover:bg-warning/20 transition cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">Edit Details</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleMaximize}
              className="flex items-center justify-center rounded-lg p-1.5 text-text-dim hover:bg-white/5 hover:text-text-primary transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-6">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border/85 bg-bg-card text-3xl shadow-panel animate-pulse bg-accent/5 border-accent/25">
                <Bot className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-display text-base font-bold uppercase tracking-[0.04em] text-text-primary">
                Start A Valuation Conversation
              </h3>
              <p className="mt-2.5 max-w-sm text-sm text-text-secondary leading-relaxed">
                Ask about a property and the Valuation pipeline will stream entity extraction updates into the workflow view.
              </p>
              <button
                type="button"
                onClick={() => setShowQuickEstimateModal(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] px-6 py-3 text-xs font-bold uppercase tracking-wider text-bg-deep shadow-lg shadow-accent/20 transition hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                AI Quick Estimate Valuation
              </button>
              <div className="mt-6 grid gap-3 w-full max-w-lg">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitQuestion(prompt)}
                    className="rounded-2xl border border-border bg-bg-card px-4 py-3.5 text-left text-xs text-text-secondary transition hover:-translate-y-0.5 hover:border-border-glow hover:bg-bg-input hover:text-text-primary font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex w-full max-w-lg flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowUserFormModal(true)}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-wider transition ${inputMode === "user_form"
                    ? "border-accent/40 bg-accent/15 text-accent shadow-[0_0_14px_rgba(34,211,238,0.12)]"
                    : "border-border bg-bg-card text-text-secondary hover:border-accent/30 hover:text-text-primary"
                    }`}
                >
                  User Form
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("describe_ai")}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-wider transition ${inputMode === "describe_ai"
                    ? "border-warning/40 bg-warning/15 text-warning shadow-[0_0_14px_rgba(251,146,60,0.12)]"
                    : "border-border bg-bg-card text-text-secondary hover:border-warning/30 hover:text-text-primary"
                    }`}
                >
                  Describe with AI
                </button>
              </div>


            </div>
          ) : (
            <div className="space-y-4">
              {revertNotice && (
                <div className="flex items-center gap-2.5 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-xs font-semibold text-warning shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <span>{revertNotice}</span>
                </div>
              )}
              {visibleMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`animate-slide-in ${(message.role === "user" && parseStageDetailMessage(message.content)) ||
                    message.meta === "comparable results" ||
                    message.content === "Running property profiling..." ||
                    (message.role === "assistant" && message.meta === "Live" && message.content?.toLowerCase()?.includes("property profiling"))
                    ? ""
                    : message.role === "user" ? "ml-8" : "mr-8"
                    }`}
                >
                  <p className="mb-1.5 px-1 text-[10px] uppercase tracking-[0.05em] text-text-dim">
                    {message.role === "user" && parseStageDetailMessage(message.content)
                      ? STAGE_PROFILING_TITLE
                      : message.role === "user"
                        ? "You"
                        : `Assistant · ${message.meta}`}
                  </p>
                  <div
                    className={
                      message.role === "user" && parseStageDetailMessage(message.content)
                        ? "p-0 bg-transparent border-0 shadow-none"
                        : message.role === "user"
                          ? "rounded-[18px] rounded-br-md bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] px-4 py-3 text-sm text-white shadow-panel"
                          : message.content === "Running property profiling..." || (message.role === "assistant" && message.meta === "Live" && (message.content === "Running property profiling..." || message.content?.toLowerCase()?.includes("property profiling")))
                            ? "p-0 bg-transparent border-0 shadow-none"
                            : "rounded-[18px] rounded-bl-md border border-border bg-bg-card px-4 py-3 text-sm text-text-primary shadow-panel"
                    }
                  >
                    {message.role === "user" && parseStageDetailMessage(message.content) ? (
                      <StageDetailCard
                        content={message.content}
                        forceCollapsed={stageDetailForceCollapsed || isComparableSearchActive || isListingStreaming}
                      />
                    ) : message.meta === "comparable results" ? (
                      null
                    ) : message.content === "Running property profiling..." || (message.role === "assistant" && message.meta === "Live" && (message.content === "Running property profiling..." || message.content?.toLowerCase()?.includes("property profiling"))) ? (
                      <PropertyProfilingLiveCard
                        streamingNote={streamingNote}
                        subjectData={subjectDataRef.current || subjectData}
                        isStreaming={isStreaming}
                      />
                    ) : (
                      message.content
                    )}
                    {message.meta === "quick estimate result" && (message.sub_locality || (Array.isArray(message.sub_locality_list) && message.sub_locality_list.length > 0)) && (
                      <div className="mt-3 rounded-2xl border border-info/20 bg-info/5 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-info">Fetched Sub-locality</p>
                        {message.sub_locality && (
                          <p className="mt-1 text-sm font-medium text-text-primary">{message.sub_locality}</p>
                        )}
                        {Array.isArray(message.sub_locality_list) && message.sub_locality_list.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {message.sub_locality_list.map((item) => (
                              <span
                                key={item}
                                className="inline-flex items-center rounded-full border border-info/20 bg-info/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] text-info"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {(message.comparables || message.dropped_comparables) && (
                      <div className="space-y-3">
                        <ComparableTable
                          comparables={message.comparables || []}
                          droppedComparables={message.dropped_comparables}
                          selectedComps={selectedComps}
                          onToggle={handleCompToggle}
                          onRestoreDropped={handleRestoreDroppedComps}
                          onUpdateCoordinates={handleUpdateComparableCoords}
                          onResetCoordinates={handleResetComparableCoords}
                          selectable={pipelineDone && !isListingStreaming && !listingData}
                          showComparableActionInfo={showComparableActionInfo}
                          onToggleComparableActionInfo={() => setShowComparableActionInfo((prev) => !prev)}
                          listingCollapsed={ctaListingCollapsed}
                          onToggleListingCollapsed={setCtaListingCollapsed}
                        />
                        {comparableData && (
                          <div className="flex items-center justify-between border-t border-border/20 pt-2.5">
                            <span className="text-[10px] text-text-dim font-medium">
                              {listingData ? "Comparable selection is locked." : "Review and adjust your comparable selection."}
                            </span>
                            <button
                              type="button"
                              onClick={handleBackToComparables}
                              className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-warning hover:bg-warning/20 transition cursor-pointer"
                            >
                              Modify Selection
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {/* DB found nothing but web results exist - amber warning */}
                    {message.db_no_results && message.comparables && (
                      <div className="mt-2.5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 animate-in slide-in-from-bottom-2 duration-300">
                        <Database className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">No Project Found in Transaction Database</p>
                          <p className="text-[10px] text-text-dim mt-1 leading-relaxed">The internal database returned no matching projects for this location and property type. Results above are from web search only.</p>
                        </div>
                      </div>
                    )}
                    {/* DB found nothing AND no web comparables either — interactive fallback prompt */}
                    {message.db_no_results && message.web_comparable_search_done && !message.comparables && (
                      <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Warning header */}
                        <div className="flex items-start gap-3">
                          <Database className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-red-400">No Comparable Projects Found</p>
                            <p className="text-[10px] text-text-dim mt-1 leading-relaxed">
                              No matching projects were found in the Transaction Database or via web search for this location and property type.
                            </p>
                          </div>
                        </div>

                        {/* Offer options only while listing hasn't started */}
                        {!listingData && !cleanedData && !isListingStreaming && (
                          <>
                            <p className="text-sm text-text-secondary leading-relaxed">
                              Would you like to continue the valuation using only the{" "}
                              <span className="font-semibold text-accent-light">subject property&apos;s own listings</span>?{" "}
                              The system will derive a market rate from available signals for the subject alone
                              (Subject-Only Mode).
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="button"
                                onClick={submitSubjectOnlyListingFetch}
                                disabled={isListingStreaming}
                                className="rounded-xl bg-accent/10 border border-accent/30 text-accent px-4 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-accent/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Yes, Continue Without Comparables →
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  clearInteractiveState();
                                  setMessages([]);
                                }}
                                className="rounded-xl border border-border bg-bg-input text-text-dim px-4 py-2 text-[11px] font-bold uppercase tracking-wider hover:text-text-primary hover:border-border/80 transition"
                              >
                                No, Start a New Query
                              </button>
                            </div>
                          </>
                        )}

                        {/* After the user confirmed, show a soft status note */}
                        {(listingData || cleanedData || isListingStreaming) && (
                          <p className="text-[10px] text-text-dim italic pt-1">
                            Proceeding in Subject-Only Mode — valuation is based exclusively on the subject property&apos;s listings.
                          </p>
                        )}
                      </div>
                    )}
                    {(message.listings || message.db_transactions) && (
                      <ListingTable
                        listings={message.listings || []}
                        dbTransactions={message.db_transactions || []}
                        collapsed={marketSignalCollapsed}
                        onToggleCollapsed={setMarketSignalCollapsed}
                      />
                    )}
                    {message.cleaned_listings && <CleanedTable listings={message.cleaned_listings} reviewListings={message.review_listings || []} droppedListings={message.dropped_listings || []} onRecalculate={handleRecalculatePlotRates} subjectPropertyType={subjectData?.property_type} valuationApproach={subjectData?.recommended_approach} collapsed={cleanedTableCollapsed} onToggleCollapsed={setCleanedTableCollapsed} />}
                    {message.factorial_data && (
                      <div className="flex flex-col gap-3">
                        <FactorialTable
                          data={message.factorial_data}
                          onCalculateRate={() => handleCalculateRate(message.factorial_data)}
                          isCalculatingRate={isFactorialAnalysisStreaming}
                          canCalculateRate={Boolean(subjectData && (selectedComparablePayload().length > 0 || (message.factorial_data?.table || []).some(r => r.is_subject && r.avg_rate > 0)))}
                        />
                      </div>
                    )}
                    {message.factorial_analysis_data && (
                      <FactoringResultCard
                        data={message.factorial_analysis_data}
                        area_unit={subjectData?.area_unit || "sqft"}
                        subjectData={subjectData}
                        onUpdateData={handleUpdateFactoringData}
                      />
                    )}
                    {message.cost_calculation_data && <CostResultCard data={message.cost_calculation_data} subjectData={subjectData} />}

                    {message.factorial_analysis_data && subjectData?.recommended_approach === "cost" && (
                      <>
                        {costCalculationData && (
                          <div className="mt-8 rounded-2xl border border-success/20 bg-[#0f172a]/95 p-5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20 text-success border border-success/30 text-sm">
                              <CheckCircle className="h-4.5 w-4.5 text-success" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-white">Cost Approach Calculated</p>
                              <p className="text-[9px] text-text-dim mt-0.5">Update the cost parameters below and recalculate if needed.</p>
                            </div>
                          </div>
                        )}
                        {costInputsSchema && (
                          <CostInputsForm
                            schema={costInputsSchema}
                            values={costInputsValues}
                            onChange={(field, val) => setCostInputsValues(prev => ({ ...prev, [field]: val }))}
                            onSubmit={handleCostCalculate}
                            isCalculating={isCostCalculating}
                            subjectData={subjectData}
                            submitLabel={costCalculationData ? "Recalculate Cost Approach" : "Execute Cost Approach Calculation"}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* ── Execution Terminal Log ─────────────────────────── */}
              {(isStreaming || isListingStreaming || isCleaningStreaming || isFactorialStreaming || isFactorialAnalysisStreaming || streamingNote) && !isQuickEstimateStreaming && (
                <div className="mr-2 animate-slide-in space-y-2">
                  {isStreaming && !messages.some(m => m.content === "Running property profiling...") && (
                    <PropertyProfilingLiveCard
                      streamingNote={streamingNote}
                      subjectData={subjectDataRef.current || subjectData}
                      isStreaming={isStreaming}
                    />
                  )}
                  {isListingStreaming && (
                    <div className="rounded-2xl border border-border/60 bg-slate-950/90 shadow-xl overflow-hidden backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500/70" />
                            <span className="h-2.5 w-2.5 rounded-full bg-sky-500/70" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                          </div>
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.05em] text-slate-500 ml-1">Listing Fetch Status</span>
                        </div>
                        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400 mr-2 select-none">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                          Processing
                        </span>
                      </div>
                      <div className="p-4 font-mono text-[11px] leading-relaxed">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 font-bold text-cyan-400">›</span>
                          <span className="text-slate-300 font-semibold break-words">{listingStatusNote || streamingNote || "Waiting for listing fetch..."}</span>
                          <span className="animate-pulse text-emerald-400">█</span>
                        </div>
                      </div>
                      {Object.keys(projectFetchStatuses).length > 0 && (() => {
                        const dbStatuses = [];
                        const webStatuses = [];

                        Object.entries(projectFetchStatuses).forEach(([key, status]) => {
                          if (key.startsWith("db:")) {
                            const rawName = key.slice(3);
                            const displayName = rawName === "__subject__"
                              ? `${subjectData?.project_name || "Subject Project"}`
                              : rawName;
                            dbStatuses.push({ name: displayName, status, isSubject: rawName === "__subject__" });
                          } else if (key.startsWith("web:")) {
                            const rawName = key.slice(4);
                            const displayName = rawName === "__subject__"
                              ? `${subjectData?.project_name || "Subject Project"}`
                              : rawName;
                            webStatuses.push({ name: displayName, status, isSubject: rawName === "__subject__" });
                          } else {
                            // fallback for any other keys
                            webStatuses.push({ name: key, status, isSubject: false });
                          }
                        });

                        return (
                          <div className="border-t border-border/30 bg-bg-card/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
                            <div className="border-b border-border/30 bg-accent-light/5 px-3 py-2 flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-[0.05em] text-accent-light font-mono">Live Fetch Status</span>
                              <span className="text-[9px] text-text-dim font-mono">
                                ({Object.values(projectFetchStatuses).filter(s => s === "done").length}/{Object.keys(projectFetchStatuses).length} done)
                              </span>
                            </div>

                            <div className="p-3 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                              {/* DB Search Group */}
                              {dbStatuses.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 px-1 pb-1 border-b border-white/[0.04]">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 font-mono">🗄️ DB Search -</span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1">
                                    {dbStatuses.map(({ name, status, isSubject }) => {
                                      const icons = { pending: "⏳", fetching: "🔄", done: "✅", error: "❌", skipping: "⏩" };
                                      const colors = { pending: "text-text-dim", fetching: "text-emerald-400 animate-pulse", done: "text-emerald-400", error: "text-red-400", skipping: "text-amber-400" };
                                      return (
                                        <div key={`db-${name}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-bg-deep/50">
                                          <span className={`text-[11px] ${status === "fetching" ? "animate-spin" : ""}`}>{icons[status] || "⏳"}</span>
                                          <span className={`text-[10px] font-medium truncate flex-1 font-mono ${colors[status] || "text-text-dim"}`}>
                                            {name}
                                            {isSubject && (
                                              <span className="ml-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400 font-sans">
                                                Subject
                                              </span>
                                            )}
                                          </span>
                                          <span className={`text-[9px] uppercase font-bold tracking-wider font-mono ${colors[status] || "text-text-dim"}`}>{status}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Web Search Group */}
                              {webStatuses.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 px-1 pb-1 border-b border-white/[0.04]">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 font-mono">🌐 Web Search -</span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1">
                                    {webStatuses.map(({ name, status, isSubject }) => {
                                      const icons = { pending: "⏳", fetching: "🔄", done: "✅", error: "❌", skipping: "⏩" };
                                      const colors = { pending: "text-text-dim", fetching: "text-cyan-400 animate-pulse", done: "text-cyan-400", error: "text-red-400", skipping: "text-amber-400" };
                                      return (
                                        <div key={`web-${name}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-bg-deep/50">
                                          <span className={`text-[11px] ${status === "fetching" ? "animate-spin" : ""}`}>{icons[status] || "⏳"}</span>
                                          <span className={`text-[10px] font-medium truncate flex-1 font-mono ${colors[status] || "text-text-dim"}`}>
                                            {name}
                                            {isSubject && (
                                              <span className="ml-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-400 font-sans">
                                                Subject
                                              </span>
                                            )}
                                          </span>
                                          <span className={`text-[9px] uppercase font-bold tracking-wider font-mono ${colors[status] || "text-text-dim"}`}>{status}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {isCleaningStreaming && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-xl overflow-hidden backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3 border-b border-emerald-500/10 bg-emerald-500/5 px-4 py-2.5">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.05em] text-emerald-300">Cleaning Status</span>
                        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-300 select-none">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse shadow-[0_0_6px_#86efac]" />
                          Processing
                        </span>
                      </div>
                      <div className="p-4 font-mono text-[11px] leading-relaxed text-emerald-100">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 font-bold text-emerald-300">›</span>
                          <span className="font-semibold break-words">{cleaningStatusNote || streamingNote || "Cleaning listings..."}</span>
                          <span className="animate-pulse text-emerald-300">█</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {isFactorialStreaming && (
                    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 shadow-xl overflow-hidden backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3 border-b border-purple-500/10 bg-purple-500/5 px-4 py-2.5">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.05em] text-purple-300">Factorial Table Status</span>
                        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-purple-300 select-none">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-300 animate-pulse shadow-[0_0_6px_#c084fc]" />
                          Processing
                        </span>
                      </div>
                      <div className="p-4 font-mono text-[11px] leading-relaxed text-purple-100">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 font-bold text-purple-300">›</span>
                          <span className="font-semibold break-words">{factorialStatusNote || streamingNote || "Building factorial table..."}</span>
                          <span className="animate-pulse text-purple-300">█</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {isFactorialAnalysisStreaming && (
                    <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 shadow-xl overflow-hidden backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3 border-b border-pink-500/10 bg-pink-500/5 px-4 py-2.5">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.05em] text-pink-300">Factorial Analysis Status</span>
                        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-pink-300 select-none">
                          <span className="h-1.5 w-1.5 rounded-full bg-pink-300 animate-pulse shadow-[0_0_6px_#f9a8d4]" />
                          Processing
                        </span>
                      </div>
                      <div className="p-4 font-mono text-[11px] leading-relaxed text-pink-100">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 font-bold text-pink-300">›</span>
                          <span className="font-semibold break-words">{analysisStatusNote || streamingNote || "Running valuation synthesis..."}</span>
                          <span className="animate-pulse text-pink-300">█</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isQuickEstimateStreaming && (
                <QuickEstimateProgressPanel
                  progress={quickEstimateProgress}
                  includeCost={
                    quickEstimateValues.recommended_approach === "cost"
                    && ["villa", "building_land"].includes(String(quickEstimateValues.property_type || "").toLowerCase())
                  }
                  propertyLabel={String(quickEstimateValues.property_type || "property").replaceAll("_", " ")}
                  locationLabel={quickEstimateValues.location_name || quickEstimateValues.city_name || "selected location"}
                />
              )}

              {/* ── Proceed to Listing Fetch CTA ────────────────── */}
              {pipelineDone && comparableData && comparableData.length > 0 && !listingData && dbTransactions.length === 0 && !cleanedData && !factorialData && !factorialAnalysisData && !isListingStreaming && (
                <div className="relative mb-3 overflow-hidden rounded-2xl border border-accent-light/30 bg-bg-card/95 shadow-panel">
                  <div
                    onClick={() => setCtaListingCollapsed(!ctaListingCollapsed)}
                    className="border-b border-accent-light/15 bg-accent-light/5 px-4 py-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start justify-between w-full gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-light/20 bg-accent-light/10 text-base font-semibold text-accent-light">
                          <FileSearch className="h-5 w-5 text-accent-light" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent-light">
                              Step 2 — Fetch Listings
                            </p>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowListingFetchInfo((prev) => !prev);
                                }}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-accent-light/30 bg-accent-light/10 text-[10px] font-black text-accent-light leading-none transition hover:bg-accent-light/20 focus:outline-none focus:ring-2 focus:ring-accent-light/40"
                                aria-label="Show listing fetch info"
                                title="Show listing fetch info"
                              >
                                i
                              </button>
                              {showListingFetchInfo && (
                                <div className="absolute left-1/2 top-full z-30 mt-2 w-[280px] -translate-x-1/2 rounded-xl border border-accent-light/35 bg-[#11161f] px-3 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
                                  <p className="text-xs leading-relaxed text-slate-100">
                                    The listing pipeline will search for realtimelistings for the subject property + your selected comparables.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-text-secondary">
                            {selectedComps.size > 0
                              ? (() => {
                                const selected = Array.from(selectedComps).map(i => comparableData[i]);
                                const getCompId = c => String(c.project_id || c.id || c.project_name || "").trim();
                                const skipCount = selected.filter(c => fetchedCompIds.has(getCompId(c))).length;
                                const newCount = selected.length - skipCount;
                                if (skipCount > 0) {
                                  return `${selected.length} comparable(s) selected — ${newCount} new (will fetch) · ${skipCount} already fetched (will skip).`;
                                }
                                return `${selected.length} of ${comparableData.length} comparable(s) selected. Click below to fetch realtime sale/rent listings.`;
                              })()
                              : "Select at least one comparable from the table above to proceed."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0 mt-0.5">
                        {ctaListingCollapsed ? <ChevronRight className="h-4 w-4 text-accent-light" /> : <ChevronDown className="h-4 w-4 text-accent-light" />}
                      </div>
                    </div>
                    {!ctaListingCollapsed && null}
                  </div>
                  {!ctaListingCollapsed && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 animate-in fade-in duration-200">
                      <div className="ml-auto flex items-center gap-3 shrink-0">
                        {backupValuationState && (
                          <button
                            type="button"
                            onClick={handleCancelModification}
                            className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm font-semibold text-warning transition hover:bg-warning/20 cursor-pointer animate-in fade-in duration-300"
                          >
                            Cancel Modification
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={submitListingFetch}
                          disabled={selectedComps.size === 0}
                          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg-deep transition hover:scale-[1.02] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                        >
                          {fetchedCompIds.size > 0 ? "Fetch New Comparables →" : "Proceed to Next Step →"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Proceed to Data Cleaning CTA ────────────────── */}
              {(listingData !== null || dbTransactions.length > 0) && !cleanedData && !isCleaningStreaming && !isListingStreaming && !hasPendingFetch && (listingData?.length > 0 || dbTransactions.length > 0) && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-[#fb923c]/30 bg-bg-card/95 shadow-panel">
                  <div
                    onClick={() => setCtaCleanCollapsed(!ctaCleanCollapsed)}
                    className="border-b border-[#fb923c]/15 bg-[#fb923c]/5 px-4 py-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start justify-between w-full gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#fb923c]/20 bg-[#fb923c]/10 text-base font-semibold text-[#fb923c]">
                          <Sparkles className="h-5 w-5 text-[#fb923c]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#fb923c]">
                              Step 3 — Clean Raw Listings
                            </p>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCleaningInfo((prev) => !prev);
                                }}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#fb923c]/30 bg-[#fb923c]/10 text-[10px] font-black text-[#fb923c] leading-none transition hover:bg-[#fb923c]/20 focus:outline-none focus:ring-2 focus:ring-[#fb923c]/40"
                                aria-label="Show cleaning info"
                                title="Show cleaning info"
                              >
                                i
                              </button>
                              {showCleaningInfo && (
                                <div className="absolute left-1/2 top-full z-30 mt-2 w-[280px] -translate-x-1/2 rounded-xl border border-[#fb923c]/35 bg-[#11161f] px-3 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
                                  <p className="text-xs leading-relaxed text-slate-100">
                                    The smart cleaning engine will apply area-type multipliers and statistical outlier flagging.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-text-secondary">
                            {(listingData || []).length} web listing(s) and {dbTransactions?.length || 0} DB transaction(s) found. Proceed to intelligently clean, deduct duplicates, and normalize prices/areas.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0 mt-0.5">
                        {ctaCleanCollapsed ? <ChevronRight className="h-4 w-4 text-[#fb923c]" /> : <ChevronDown className="h-4 w-4 text-[#fb923c]" />}
                      </div>
                    </div>
                  </div>
                  {!ctaCleanCollapsed && (
                    <div className="flex items-center gap-3 px-4 py-3 animate-in fade-in duration-200">
                      <button
                        type="button"
                        onClick={submitCleaning}
                        className="ml-auto shrink-0 rounded-xl bg-[#fb923c] px-5 py-2.5 text-sm font-semibold text-bg-deep transition hover:scale-[1.02] hover:brightness-110 cursor-pointer"
                      >
                        Start Data Cleaning →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Proceed to Factorial Table CTA ────────────────── */}
              {cleanedData && cleanedData.length > 0 && (!factorialData || needsFactorialRegeneration) && !isFactorialStreaming && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-[#a78bfa]/30 bg-bg-card/95 shadow-panel">
                  <div
                    onClick={() => setCtaFactorialCollapsed(!ctaFactorialCollapsed)}
                    className="border-b border-[#a78bfa]/15 bg-[#a78bfa]/5 px-4 py-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start justify-between w-full gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#a78bfa]/20 bg-[#a78bfa]/10 text-base font-semibold text-[#a78bfa]">
                          <TrendingUp className="h-5 w-5 text-[#a78bfa]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#a78bfa]">
                              Step 4 — Generate Factorial Table
                            </p>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowFactorialInfo((prev) => !prev);
                                }}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[10px] font-black text-[#a78bfa] leading-none transition hover:bg-[#a78bfa]/20 focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/40"
                                aria-label="Show factorial info"
                                title="Show factorial info"
                              >
                                i
                              </button>
                              {showFactorialInfo && (
                                <div className="absolute left-1/2 top-full z-30 mt-2 w-[340px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-[#a78bfa]/35 bg-[#11161f] px-3 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
                                  <p className="whitespace-normal text-xs leading-relaxed text-slate-100">
                                    This will group data by project and calculate key rate statistics for valuation.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-text-secondary">
                            {needsFactorialRegeneration
                              ? "Plot-rate inputs changed. Regenerate the factorial summary table before calculating the final rate."
                              : `${cleanedData.length} cleaned listings ready. Generate the factorial summary table (Avg/Median/P90) per project.`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0 mt-0.5">
                        {ctaFactorialCollapsed ? <ChevronRight className="h-4 w-4 text-[#a78bfa]" /> : <ChevronDown className="h-4 w-4 text-[#a78bfa]" />}
                      </div>
                    </div>
                  </div>
                  {!ctaFactorialCollapsed && (
                    <div className="flex items-center justify-end gap-3 px-4 py-3 animate-in fade-in duration-200">
                      <button
                        type="button"
                        onClick={submitFactorial}
                        className="shrink-0 rounded-xl bg-[#a78bfa] px-5 py-2.5 text-sm font-semibold text-bg-deep transition hover:scale-[1.02] hover:brightness-110 cursor-pointer"
                      >
                        Generate Factorial Table →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Start New Valuation CTA ─────────────────────── */}
              {factorialAnalysisData && pipelineDone && !anyStreaming && (
                <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {valuationResult && (
                    <div className="mb-3 flex justify-center">
                      <button
                        type="button"
                        onClick={downloadValuationReport}
                        className="inline-flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-accent transition hover:bg-accent/20 hover:scale-[1.02] cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                        Report Download
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="rounded-2xl border border-success/30 bg-[linear-gradient(135deg,rgba(16,185,129,0.05),rgba(52,211,153,0.03))] p-5 flex flex-col items-center gap-4 shadow-panel text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 border border-success/30 text-2xl">🎉</div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-widest text-success">Valuation Complete</p>
                      <p className="text-[11px] text-text-dim mt-1">Your valuation report is ready. You can start a new valuation or review the results in the panels above.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearInteractiveState();
                        setMessages([]);
                        setInput("");
                        onClear?.();
                      }}
                      className="inline-flex items-center gap-2.5 rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-purple))] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-accent/20 transition hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    >
                      <span>✦</span>
                      Start New Valuation
                    </button>
                  </div>
                </div>
              )}

              {/* ── Stage 1 Gate Wizard (replaces flat clarification/verification panels) */}
              {Stage1GateWizard}

              {/* ── Map Confirmation (standalone — not part of wizard) */}
              {mapConfirmation && !gateActive && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-warning/30 bg-bg-card/95 backdrop-blur-md shadow-panel flex flex-col min-h-0">
                  <div
                    onClick={() => setMapCollapsed(!mapCollapsed)}
                    className="border-b border-warning/15 bg-warning/5 px-4 py-3 cursor-pointer select-none shrink-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warning/20 bg-warning/10 text-base font-semibold text-warning">
                          <MapPin className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-warning">Map Confirmation</p>
                            {mapCollapsed ? <ChevronRight className="h-4 w-4 text-warning" /> : <ChevronDown className="h-4 w-4 text-warning" />}
                          </div>
                          <p className="mt-1 text-sm text-text-secondary">{mapConfirmation.message}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapConfirmation(null);
                        }}
                        className="text-sm text-text-dim transition hover:text-danger cursor-pointer font-bold px-1.5"
                      >×</button>
                    </div>
                  </div>
                  {!mapCollapsed && (
                    <div className="overflow-y-auto custom-scrollbar max-h-[30vh] p-4 flex flex-col gap-4 animate-in fade-in duration-200 min-h-0">
                      <div className="rounded-xl border border-warning/35 bg-warning/5 px-3 py-2.5 flex items-start gap-2.5 animate-pulse shadow-[inset_0_1px_1px_rgba(251,146,60,0.1)] shrink-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning text-xs">⚠️</span>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-[0.05em] text-warning block">Action Required</span>
                          <span className="text-[10px] text-text-secondary leading-relaxed">
                            Verify the marked location of the subject property on the Map panel. Choose 'Location Is Correct' or input coordinates to adjust.
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <button
                          type="button"
                          onClick={() => submitMapConfirmation(true)}
                          className="rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-110 shrink-0"
                        >Location Is Correct</button>
                        <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
                          <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.05em] text-text-dim">Correct Lat, Lng</span>
                          <input
                            type="text"
                            value={clarificationValues.coordinates || ""}
                            onChange={(e) => setClarificationValues(prev => ({ ...prev, coordinates: e.target.value }))}
                            placeholder={PLACEHOLDER_MAP.coordinates}
                            className="rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-dim focus:border-warning focus:bg-warning/5"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => submitMapConfirmation(false)}
                          className="rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-105 shrink-0"
                        >Apply Fix</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Approach Choice (standalone fallback if wizard not active) */}
              {approachChoiceNeeded && !gateActive && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-warning/30 bg-bg-card/95 backdrop-blur-md shadow-panel flex flex-col min-h-0">
                  <div
                    onClick={() => setApproachCollapsed(!approachCollapsed)}
                    className="border-b border-warning/15 bg-warning/5 px-4 py-3 cursor-pointer select-none shrink-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warning/20 bg-warning/10">
                        <SlidersHorizontal className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-warning">Approach Selection</p>
                          {approachCollapsed ? <ChevronRight className="h-4 w-4 text-warning" /> : <ChevronDown className="h-4 w-4 text-warning" />}
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">{approachChoiceNeeded.question}</p>
                      </div>
                    </div>
                  </div>
                  {!approachCollapsed && (
                    <div className="overflow-y-auto custom-scrollbar max-h-[30vh] p-4 flex flex-col gap-4 animate-in fade-in duration-200 min-h-0">
                      <div className="rounded-xl border border-warning/35 bg-warning/5 px-3 py-2.5 flex items-start gap-2.5 animate-pulse shadow-[inset_0_1px_1px_rgba(251,146,60,0.1)] shrink-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning text-xs">⚠️</span>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-[0.05em] text-warning block">Action Required</span>
                          <span className="text-[10px] text-text-secondary leading-relaxed">
                            Select the recommended valuation methodology or choose a custom approach override to proceed.
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <button
                          type="button"
                          onClick={() => submitApproachChoice(true)}
                          className="rounded-xl border border-warning bg-warning/10 px-4 py-2.5 text-sm font-semibold text-warning transition hover:bg-warning/20 shrink-0"
                        >Proceed with {humanizeFieldName(approachChoiceNeeded.recommended_approach)} Approach</button>
                        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                          <span className="pl-1 text-[10px] font-bold uppercase tracking-[0.05em] text-text-dim">Or Override Approach</span>
                          <select
                            value={clarificationValues.override_approach || ""}
                            onChange={(e) => setClarificationValues({ ...clarificationValues, override_approach: e.target.value })}
                            className="rounded-xl border border-border bg-bg-input px-3 py-2 text-sm text-text-primary outline-none transition focus:border-warning focus:bg-warning/5"
                          >
                            <option value="" disabled style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Select approach...</option>
                            <option value="market" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Market Approach</option>
                            <option value="cost" disabled={subjectData?.property_type !== "villa" && subjectData?.property_type !== "building_land"} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                              Cost Approach{(subjectData?.property_type !== "villa" && subjectData?.property_type !== "building_land") ? " (Villa / Building + Land Only)" : ""}
                            </option>
                          </select>
                        </label>
                        <button
                          type="button"
                          disabled={!clarificationValues.override_approach}
                          onClick={() => submitApproachChoice(false, clarificationValues.override_approach)}
                          className="rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-bg-deep transition hover:brightness-105 disabled:opacity-50 shrink-0"
                        >Apply Override</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Token Breakdown UI ────────────────── */}
              {showTokenBreakdown && (
                <div className="mb-4 overflow-y-auto custom-scrollbar max-h-[30vh] rounded-2xl border border-border bg-bg-card p-4 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                      <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-text-primary">Token Intelligence</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">Estimated Cost</p>
                      <p className="text-sm font-mono font-bold text-success">${calculatedCostUsd.toFixed(4)}</p>
                      {tokenStats.last_stage_tokens && (
                        <p className="text-[8px] text-accent-light font-bold mt-0.5">
                          +{tokenStats.last_stage_tokens.toLocaleString()} ({tokenStats.last_stage_name})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim opacity-70">Model Breakdown</p>
                      {Object.entries(tokenStats.model_breakdown).filter(([model, usage]) => (usage.total || 0) > 0 && model.toLowerCase() !== "unknown").length === 0 ? (
                        <p className="text-[11px] text-text-dim italic">No model data yet...</p>
                      ) : (
                        Object.entries(tokenStats.model_breakdown)
                          .filter(([model, usage]) => (usage.total || 0) > 0 && model.toLowerCase() !== "unknown")
                          .map(([model, usage]) => (
                            <div key={model} className="rounded-xl bg-bg-input p-2.5 border border-border/40">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-accent-light">{model}</span>
                                <span className="text-[10px] font-mono text-text-primary">{usage.total?.toLocaleString()}</span>
                              </div>
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <div className="h-1 w-full bg-border/20 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-accent"
                                      style={{ width: `${(usage.prompt / (usage.total || 1)) * 100}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-[8px] uppercase text-text-dim">Input</span>
                                    <span className="text-[8px] font-mono text-text-dim">{usage.prompt?.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="h-1 w-full bg-border/20 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-accent-purple"
                                      style={{ width: `${(usage.completion / (usage.total || 1)) * 100}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-[8px] uppercase text-text-dim">Output</span>
                                    <span className="text-[8px] font-mono text-text-dim">{usage.completion?.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                      )}

                      <div className="rounded-xl bg-bg-input p-3 border border-border/40">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">Stage Breakdown</span>
                          <span className="text-[10px] font-bold text-accent-light">{stageBreakdownEntries.length} stages</span>
                        </div>
                        {stageBreakdownEntries.length === 0 ? (
                          <p className="text-[10px] text-text-dim italic">No stage usage yet...</p>
                        ) : (
                          <div className="space-y-2">
                            {stageBreakdownEntries.map(([stage, usage]) => (
                              <div key={stage} className="rounded-lg border border-border/30 bg-bg-card/70 px-2.5 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-semibold text-text-primary">{stage}</span>
                                  <span className="text-[10px] font-mono text-text-primary">{usage.total?.toLocaleString()}</span>
                                </div>
                                <div className="mt-1 flex gap-3">
                                  <span className="text-[8px] uppercase text-text-dim">Input {usage.prompt?.toLocaleString()}</span>
                                  <span className="text-[8px] uppercase text-text-dim">Output {usage.completion?.toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim opacity-70">Tool Intelligence</p>
                      {Object.entries(tokenStats.tool_breakdown).length === 0 ? (
                        <div className="rounded-xl bg-bg-input p-3 text-center border border-dashed border-border/40">
                          <p className="text-[10px] text-text-dim">No tools called in this run.</p>
                        </div>
                      ) : (
                        Object.entries(tokenStats.tool_breakdown).map(([tool, data]) => (
                          <div key={tool} className="rounded-xl border border-border-glow bg-accent-glow p-2.5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <SlidersHorizontal className="h-4 w-4 text-accent" />
                                <div>
                                  <p className="text-[10px] font-bold text-text-primary">{tool}</p>
                                  <p className="text-[9px] text-text-dim">{data.calls} {data.calls === 1 ? 'Call' : 'Calls'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-mono font-bold text-accent-light">${data.cost_usd.toFixed(3)}</p>
                                <p className="text-[8px] uppercase tracking-tighter text-text-dim">Direct Cost</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}

                      <div className="mt-4 rounded-xl bg-bg-input p-3 border border-border/40">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-widest text-text-dim font-semibold">Efficiency</span>
                          <span className="text-[10px] font-bold text-success">Optimal</span>
                        </div>
                        <div className="mt-2 text-[10px] text-text-secondary leading-relaxed">
                          Stage 1 profiles the property, Stage 2 plans the workflow, Stage 3 finds comparables and listings, and Stage 4/5 handle cleaning and valuation using the models and tools shown above.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-bg-card px-4 py-2.5 backdrop-blur shrink-0">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.05em] text-text-dim">
            <span className="truncate pr-4">{currentStage}</span>
            <button
              type="button"
              onClick={() => calculatedTotalTokens > 0 && setShowTokenBreakdown(!showTokenBreakdown)}
              disabled={calculatedTotalTokens === 0}
              className={`flex items-center gap-1.5 transition text-text-dim ${calculatedTotalTokens > 0
                ? "hover:text-accent-light cursor-pointer"
                : "cursor-not-allowed opacity-50"
                }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)] ${calculatedTotalTokens > 0 ? "animate-pulse" : "opacity-40"}`} />
              {calculatedTotalTokens > 0 ? `${calculatedTotalTokens.toLocaleString()} tokens` : "No usage yet"}
              {calculatedTotalTokens > 0 && <span className="ml-1 opacity-50">{showTokenBreakdown ? "▲" : "▼"}</span>}
            </button>
          </div>

          {messages.length === 0 && inputMode === "describe_ai" && (
            <div className="relative mt-2.5">
              <div className="absolute inset-[-1px] rounded-2xl bg-[linear-gradient(90deg,var(--accent),var(--accent-purple),var(--accent))] bg-[length:200%_100%] opacity-30 blur-sm animate-flow-bg" />
              <div className="relative flex items-end gap-3 rounded-2xl border border-border bg-bg-dark px-4 py-3">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitQuestion(input);
                    }
                  }}
                  disabled={anyStreaming}
                  placeholder="Describe the property to value..."
                  className="max-h-28 min-h-[28px] flex-1 resize-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-dim"
                />
                <button
                  type="button"
                  onClick={() => (anyStreaming ? abortRef.current?.abort?.() : submitQuestion(input))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-bg-deep transition hover:scale-[1.03] hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!anyStreaming && !input.trim()}
                >
                  {anyStreaming ? "■" : "➜"}
                </button>
              </div>
            </div>
          )}
          {messages.length === 0 && inputMode === "user_form" && (
            <div className="relative mt-2.5 overflow-hidden rounded-2xl border border-warning/25 bg-gradient-to-br from-warning/10 via-bg-card to-bg-deep px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warning/30 bg-warning/15 text-warning">
                  ✨
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.05em] text-warning">User Form</p>
                  <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                    Chat input is disabled in this mode. Switch to Describe with AI to enable the conversational composer.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      {quickEstimateModal}
      {userFormModal}
    </>
  );
}
